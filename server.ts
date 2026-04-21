import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Robust DB path handling: prioritize DB_PATH env, then handle production vs development
const dbPath = process.env.DB_PATH || (
  process.env.NODE_ENV === 'production' 
    ? path.join(__dirname, 'data', 'subboss_service.db')
    : 'subboss_service.db'
);

const JWT_SECRET = process.env.JWT_SECRET || 'subboss-secret-key-123';

// Ensure the directory for the database exists
const dbDir = path.dirname(dbPath);
if (dbDir !== '.' && !fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    displayName TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    name TEXT NOT NULL,
    model TEXT NOT NULL,
    year TEXT NOT NULL,
    currentMileage INTEGER NOT NULL,
    type TEXT NOT NULL,
    tasks TEXT, -- JSON array
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS history (
    id TEXT PRIMARY KEY,
    vehicleId TEXT NOT NULL,
    userId TEXT NOT NULL,
    date TEXT NOT NULL,
    mileage INTEGER NOT NULL,
    roundedMileage INTEGER NOT NULL,
    tasks TEXT NOT NULL, -- JSON array
    notes TEXT,
    attachments TEXT, -- JSON array
    FOREIGN KEY (vehicleId) REFERENCES vehicles(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );
`);

// Migrations
const info = db.prepare("PRAGMA table_info(vehicles)").all() as any[];
if (!info.some(col => col.name === 'tasks')) {
  db.exec("ALTER TABLE vehicles ADD COLUMN tasks TEXT");
}
if (!info.some(col => col.name === 'userId')) {
  // Simple migration for existing data if any (associating with a dummy user or just adding column)
  db.exec("ALTER TABLE vehicles ADD COLUMN userId TEXT DEFAULT 'anonymous'");
}

const historyInfo = db.prepare("PRAGMA table_info(history)").all() as any[];
if (!historyInfo.some(col => col.name === 'userId')) {
  db.exec("ALTER TABLE history ADD COLUMN userId TEXT DEFAULT 'anonymous'");
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(cors({
    origin: true,
    credentials: true
  }));
  app.use(express.json({ limit: '50mb' }));
  app.use(cookieParser());

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.userId = decoded.id;
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // Auth Routes
  app.post('/api/auth/register', async (req, res) => {
    const { email, password, displayName } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const id = crypto.randomUUID();
      db.prepare('INSERT INTO users (id, email, password, displayName) VALUES (?, ?, ?, ?)')
        .run(id, email, hashedPassword, displayName);
      
      const token = jwt.sign({ id }, JWT_SECRET, { expiresIn: '7d' });
      res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
      res.status(201).json({ id, email, displayName });
    } catch (err: any) {
      if (err.code === 'SQLITE_CONSTRAINT') {
        return res.status(400).json({ error: 'Email already exists' });
      }
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
      res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
      res.json({ id: user.id, email: user.email, displayName: user.displayName });
    } catch (err) {
      res.status(500).json({ error: 'Login failed' });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.sendStatus(200);
  });

  app.get('/api/auth/me', (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Not logged in' });

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const user = db.prepare('SELECT id, email, displayName FROM users WHERE id = ?').get(decoded.id) as any;
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json(user);
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  // Protected API Routes
  app.get('/api/vehicles', authenticate, (req: any, res) => {
    try {
      const vehicles = db.prepare('SELECT * FROM vehicles WHERE userId = ?').all(req.userId);
      const history = db.prepare('SELECT * FROM history WHERE userId = ?').all(req.userId);
      
      const combined = (vehicles as any[]).map(v => ({
        ...v,
        tasks: JSON.parse(v.tasks || '[]'),
        history: (history as any[])
          .filter(h => h.vehicleId === v.id)
          .map(h => ({
            ...h,
            tasks: JSON.parse(h.tasks),
            attachments: JSON.parse(h.attachments || '[]')
          }))
      }));
      
      res.json(combined);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to fetch' });
    }
  });

  app.post('/api/vehicles', authenticate, (req: any, res) => {
    const { id, name, model, year, currentMileage, type, tasks } = req.body;
    try {
      db.prepare('INSERT INTO vehicles (id, userId, name, model, year, currentMileage, type, tasks) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .run(id, req.userId, name, model, year, currentMileage, type, JSON.stringify(tasks || []));
      res.status(201).json({ id });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Save failed' });
    }
  });

  app.patch('/api/vehicles/:id', authenticate, (req: any, res) => {
    const { name, model, year, currentMileage, type, tasks } = req.body;
    try {
      db.prepare('UPDATE vehicles SET name = ?, model = ?, year = ?, currentMileage = ?, type = ?, tasks = ? WHERE id = ? AND userId = ?')
        .run(name, model, year, currentMileage, type, JSON.stringify(tasks || []), req.params.id, req.userId);
      res.sendStatus(200);
    } catch (err) {
      res.status(500).json({ error: 'Update failed' });
    }
  });

  app.delete('/api/vehicles/:id', authenticate, (req: any, res) => {
    try {
      db.prepare('DELETE FROM vehicles WHERE id = ? AND userId = ?').run(req.params.id, req.userId);
      res.sendStatus(204);
    } catch (err) {
      res.status(500).json({ error: 'Delete failed' });
    }
  });

  app.post('/api/history', authenticate, (req: any, res) => {
    const { id, vehicleId, date, mileage, roundedMileage, tasks, notes, attachments } = req.body;
    try {
      db.prepare('INSERT INTO history (id, vehicleId, userId, date, mileage, roundedMileage, tasks, notes, attachments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(id, vehicleId, req.userId, date, mileage, roundedMileage, JSON.stringify(tasks), notes, JSON.stringify(attachments || []));
      res.status(201).json({ id });
    } catch (err) {
      res.status(500).json({ error: 'Log entry failed' });
    }
  });

  app.patch('/api/history/:id', authenticate, (req: any, res) => {
    const { date, mileage, roundedMileage, tasks, notes, attachments } = req.body;
    try {
      db.prepare('UPDATE history SET date = ?, mileage = ?, roundedMileage = ?, tasks = ?, notes = ?, attachments = ? WHERE id = ? AND userId = ?')
        .run(date, mileage, roundedMileage, JSON.stringify(tasks), notes, JSON.stringify(attachments || []), req.params.id, req.userId);
      res.sendStatus(200);
    } catch (err) {
      res.status(500).json({ error: 'Update failed' });
    }
  });

  app.delete('/api/history/:id', authenticate, (req: any, res) => {
    try {
      db.prepare('DELETE FROM history WHERE id = ? AND userId = ?').run(req.params.id, req.userId);
      res.sendStatus(204);
    } catch (err) {
      res.status(500).json({ error: 'Delete failed' });
    }
  });

  app.patch('/api/vehicles/:id/mileage', authenticate, (req: any, res) => {
    const { currentMileage } = req.body;
    try {
      db.prepare('UPDATE vehicles SET currentMileage = ? WHERE id = ? AND userId = ?').run(currentMileage, req.params.id, req.userId);
      res.sendStatus(200);
    } catch (err) {
      res.status(500).json({ error: 'Update failed' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
