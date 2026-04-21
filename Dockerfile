# Build Stage
FROM node:20-slim AS build

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production Stage
FROM node:20-slim

WORKDIR /app
# better-sqlite3 needs build tools for native compilation during npm install
# We'll install them briefly and then clean up to keep the image small
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
# Install only production dependencies
RUN npm install --production

# Copy built assets and server file
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.ts ./server.ts

# We use tsx to run the server.ts directly, as we configured it in package.json dev
# But for production in Docker, we ensure tsx is available or compile to JS.
# Let's keep it simple and install tsx globally or in the image.
RUN npm install -g tsx

EXPOSE 3000

ENV NODE_ENV=production

# Command to start the server
CMD ["tsx", "server.ts"]
