/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bike, 
  Car, 
  Plus, 
  Settings, 
  Trash2, 
  LogOut,
  ChevronRight,
  History,
  AlertCircle,
  CheckCircle2,
  Download,
  Info,
  X,
  PlusCircle,
  FileText
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PDFDocument } from 'pdf-lib';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

// --- Types ---

interface ServiceEntry {
  id: string;
  date: string;
  mileage: number;
  roundedMileage: number;
  tasks: string[];
  notes?: string;
  attachments?: string[]; // Base64 data URLs
}

interface Vehicle {
  id: string;
  type: 'bike' | 'car';
  name: string;
  model: string;
  year: string;
  currentMileage: number;
  history: ServiceEntry[];
  tasks: TaskConfig[];
}

interface TaskConfig {
  id: string;
  label: string;
  interval: number;
  hint?: string;
}

// --- Utils ---

const generateUUID = () => {
  try {
    return crypto.randomUUID();
  } catch (e) {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
};

const getServiceAnchor = (m: number): number => {
  const milesInK = Math.floor(m / 1000) * 1000;
  const rem = m % 1000;
  if (rem <= 200) return milesInK;
  if (rem <= 700) return milesInK + 500;
  return milesInK + 1000;
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const isPdfRaw = (dataUrl: string) => {
  return dataUrl.startsWith('data:application/pdf') || dataUrl.includes('JVBERi0');
};

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeVehicleId, setActiveVehicleId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'details'>('dashboard');
  const [isAddingService, setIsAddingService] = useState(false);
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmVehicleDeleteId, setConfirmVehicleDeleteId] = useState<string | null>(null);

  // Vehicle Form State
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [vName, setVName] = useState('');
  const [vModel, setVModel] = useState('');
  const [vYear, setVYear] = useState('');
  const [vMileage, setVMileage] = useState('');
  const [vType, setVType] = useState<'bike' | 'car'>('car');
  const [vTasks, setVTasks] = useState<TaskConfig[]>([]);

  // Service Form State
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [formMileage, setFormMileage] = useState<string>('');
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [formNotes, setFormNotes] = useState('');
  const [formAttachments, setFormAttachments] = useState<string[]>([]);
  const [customTask, setCustomTask] = useState('');

  useEffect(() => {
    if (user) fetchVehicles();
  }, [user]);

  const fetchVehicles = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/vehicles');
      if (res.ok) {
        const data = await res.json();
        setVehicles(data);
      }
    } catch (err) {
      console.error("Fetch vehicles failed", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddVehicle = async () => {
    if (!vName || !vModel || !vMileage) return;
    const mileageNum = parseInt(vMileage) || 0;
    
    const vData = {
      name: vName,
      model: vModel,
      year: vYear || 'N/A',
      currentMileage: mileageNum,
      type: vType,
      tasks: vTasks
    };

    try {
      const url = editingVehicleId ? `/api/vehicles/${editingVehicleId}` : '/api/vehicles';
      const method = editingVehicleId ? 'PATCH' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingVehicleId ? vData : { ...vData, id: generateUUID() })
      });

      if (res.ok) {
        await fetchVehicles();
        setIsAddingVehicle(false);
        resetVForm();
      }
    } catch (err) {
      console.error("Save vehicle failed", err);
    }
  };

  const deleteVehicle = async (id: string) => {
    try {
      const res = await fetch(`/api/vehicles/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchVehicles();
        if (activeVehicleId === id) {
          setActiveVehicleId(null);
          setCurrentView('dashboard');
        }
        setConfirmVehicleDeleteId(null);
      }
    } catch (err) {
      console.error("Delete vehicle failed", err);
    }
  };

  const handleAddService = async () => {
    if (!formMileage || selectedTasks.length === 0 || !activeVehicleId) return;
    const mileageNum = parseInt(formMileage);
    
    const entryData = {
      vehicleId: activeVehicleId,
      date: formDate,
      mileage: mileageNum,
      roundedMileage: getServiceAnchor(mileageNum),
      tasks: selectedTasks,
      notes: formNotes,
      attachments: formAttachments,
    };

    try {
      const url = editingServiceId ? `/api/history/${editingServiceId}` : '/api/history';
      const method = editingServiceId ? 'PATCH' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingServiceId ? entryData : { ...entryData, id: generateUUID() })
      });

      if (res.ok) {
        // Update vehicle mileage if higher
        const activeV = vehicles.find(v => v.id === activeVehicleId);
        if (activeV && mileageNum > activeV.currentMileage) {
          await fetch(`/api/vehicles/${activeVehicleId}/mileage`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentMileage: mileageNum })
          });
        }

        await fetchVehicles();
        setIsAddingService(false);
        resetSForm();
      }
    } catch (err) {
      console.error("Save service log failed", err);
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      const res = await fetch(`/api/history/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchVehicles();
        setConfirmDeleteId(null);
      }
    } catch (err) {
      console.error("Delete history failed", err);
    }
  };

  const updateCurrentMileage = async (m: number) => {
    if (!activeVehicleId) return;
    try {
      const res = await fetch(`/api/vehicles/${activeVehicleId}/mileage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentMileage: m })
      });
      if (res.ok) await fetchVehicles();
    } catch (err) {
      console.error("Update mileage failed", err);
    }
  };

  const resetVForm = () => {
    setVName('');
    setVModel('');
    setVYear('');
    setVMileage('');
    setVType('car');
    setVTasks([{ id: generateUUID(), label: 'Ölwechsel', interval: 10000 }]);
    setEditingVehicleId(null);
  };

  const resetSForm = () => {
    setFormMileage('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setSelectedTasks([]);
    setFormNotes('');
    setFormAttachments([]);
    setEditingServiceId(null);
    setCustomTask('');
  };

  const activeVehicle = vehicles.find(v => v.id === activeVehicleId);

  const getUpcomingServices = (v: Vehicle) => {
    if (!v.tasks || !Array.isArray(v.tasks)) return [];
    return v.tasks
      .map(task => {
        const searchLabel = task.label.toLowerCase().trim();
        const sortedHistory = [...(v.history || [])].sort((a, b) => b.mileage - a.mileage);
        const lastEntry = sortedHistory.find(e => 
          e.tasks.some(t => t.toLowerCase().trim() === searchLabel)
        );
        const anchor = lastEntry ? lastEntry.roundedMileage : 0;
        return {
          label: task.label,
          km: anchor + task.interval
        };
      })
      .sort((a, b) => a.km - b.km);
  };

  const nextServices = activeVehicle ? getUpcomingServices(activeVehicle) : [];

  const handleExportPDF = async (vehicle: Vehicle) => {
    const mainDoc = new jsPDF();
    const history = (vehicle.history || []).sort((a, b) => b.mileage - a.mileage);

    mainDoc.setFontSize(22);
    mainDoc.setTextColor(30, 41, 59);
    mainDoc.text('Digitales Scheckheft', 14, 20);
    
    mainDoc.setFontSize(14);
    mainDoc.setTextColor(71, 85, 105);
    mainDoc.text(`${vehicle.name} - Service Historie`, 14, 30);
    
    mainDoc.setFontSize(9);
    mainDoc.setTextColor(100);
    mainDoc.text(`Modell: ${vehicle.model} | Aktueller Stand: ${vehicle.currentMileage.toLocaleString()} km`, 14, 40);

    const tableData = history.map(entry => [
      formatDate(entry.date),
      entry.tasks.join('\n'),
      `${entry.mileage.toLocaleString()} km`,
      entry.notes || '-'
    ]);

    autoTable(mainDoc, {
      startY: 50,
      head: [['Datum', 'Arbeiten', 'Stand (km)', 'Notizen']],
      body: tableData,
      theme: 'striped',
    });

    try {
      const mainPdfBytes = mainDoc.output('arraybuffer');
      const finalPdf = await PDFDocument.create();
      const sourceMainPdf = await PDFDocument.load(mainPdfBytes);
      const copiedMainPages = await finalPdf.copyPages(sourceMainPdf, sourceMainPdf.getPageIndices());
      copiedMainPages.forEach((page) => finalPdf.addPage(page));

      // Append Attachments as new pages
      for (const entry of history) {
        if (entry.attachments && entry.attachments.length > 0) {
          for (let i = 0; i < entry.attachments.length; i++) {
            const dataUrl = entry.attachments[i];
            try {
              // PHASE 2: Advanced Merging
              const response = await fetch(dataUrl);
              const fileBytes = await response.arrayBuffer();

              if (isPdfRaw(dataUrl)) {
                // Handle PDF merging
                const attachedPdf = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
                
                // Add separator text in a clean way before appending pages
                const separatorPage = finalPdf.addPage();
                separatorPage.drawText(`ANHANG: Beleg vom ${formatDate(entry.date)}`, { 
                  x: 50, 
                  y: separatorPage.getHeight() - 50, 
                  size: 16 
                });
                separatorPage.drawText(`Fahrzeug: ${vehicle.name} | KM: ${entry.mileage.toLocaleString()}`, { 
                  x: 50, 
                  y: separatorPage.getHeight() - 75, 
                  size: 12 
                });

                const attachedPages = await finalPdf.copyPages(attachedPdf, attachedPdf.getPageIndices());
                attachedPages.forEach((page) => finalPdf.addPage(page));
              } else {
                // Handle Image embedding
                let image;
                try {
                  image = await finalPdf.embedJpg(fileBytes);
                } catch (jpgError) {
                  try {
                    image = await finalPdf.embedPng(fileBytes);
                  } catch (pngError) {
                    console.error("Format not supported", pngError);
                    continue; 
                  }
                }

                const page = finalPdf.addPage();
                const { width, height } = image.scale(1);
                const pageWidth = page.getWidth() - 40;
                const pageHeight = page.getHeight() - 100;
                const scale = Math.min(pageWidth / width, pageHeight / height);
                const finalWidth = width * scale;
                const finalHeight = height * scale;

                page.drawText(`BELEG: ${entry.tasks[0] || 'Service'}`, { x: 40, y: page.getHeight() - 40, size: 14 });
                page.drawText(`Datum: ${formatDate(entry.date)} | KM: ${entry.mileage.toLocaleString()}`, { x: 40, y: page.getHeight() - 60, size: 10 });
                
                page.drawImage(image, {
                  x: (page.getWidth() - finalWidth) / 2,
                  y: (page.getHeight() - 80 - finalHeight) / 2,
                  width: finalWidth,
                  height: finalHeight,
                });
              }
            } catch (error) {
              console.error("Merging attachment failed", error);
            }
          }
        }
      }

      const finalPdfBytes = await finalPdf.save();
      const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Service_Historie_${vehicle.name.replace(/\s+/g, '_')}.pdf`;
      link.click();
    } catch (e) {
      mainDoc.save(`Service_Historie_${vehicle.name}.pdf`);
    }
  };

  const startEditVehicle = (v: Vehicle) => {
    setEditingVehicleId(v.id);
    setVName(v.name);
    setVModel(v.model);
    setVYear(v.year);
    setVMileage(v.currentMileage.toString());
    setVType(v.type);
    setVTasks(Array.isArray(v.tasks) ? v.tasks.map(t => ({ ...t, id: t.id || generateUUID() })) : [{ id: generateUUID(), label: 'Ölwechsel', interval: 10000 }]);
    setIsAddingVehicle(true);
  };

  const startEditService = (entry: ServiceEntry) => {
    setEditingServiceId(entry.id);
    setFormMileage(entry.mileage.toString());
    setFormDate(entry.date);
    setSelectedTasks([...entry.tasks]);
    setFormNotes(entry.notes || '');
    setFormAttachments([...(entry.attachments || [])]);
    setIsAddingService(true);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 1 * 1024 * 1024) { alert(`Datei ${file.name} ist zu groß (max 1MB)`); continue; }
      const reader = new FileReader();
      reader.onloadend = () => setFormAttachments(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    }
  };

  // Task/Interval Management
  const addTask = () => {
    setVTasks([...vTasks, { id: generateUUID(), label: '', interval: 10000 }]);
  };

  const removeTask = (id: string) => {
    if (vTasks.length <= 1) return;
    setVTasks(vTasks.filter(t => t.id !== id));
  };

  const updateTask = (id: string, field: keyof TaskConfig, value: any) => {
    setVTasks(vTasks.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B0D0F] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Service Desk lädt...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0D0F] text-slate-200 font-sans selection:bg-blue-500/30">
      <nav className="fixed top-0 left-0 right-0 h-16 bg-[#0B0D0F]/80 backdrop-blur-md border-b border-white/5 z-40 px-6 flex items-center justify-between">
        <div className="flex flex-col cursor-pointer" onClick={() => { setCurrentView('dashboard'); setActiveVehicleId(null); }}>
          <h1 className="text-xl font-bold tracking-tighter text-white leading-none">
            SUBBOSS <span className="text-blue-500 font-black">SERVICE</span>
          </h1>
          {user && (
            <div className="flex items-center gap-1.5 mt-1 opacity-40">
              <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse"></div>
              <p className="text-[8px] text-white uppercase tracking-[0.2em] font-medium">{user.email}</p>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {currentView === 'details' && (
            <button 
              onClick={() => { setCurrentView('dashboard'); setActiveVehicleId(null); }}
              className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
            >
              Garage
            </button>
          )}
          <button onClick={signOut} className="p-2 text-slate-500 hover:text-red-500 transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      <main className="pt-24 pb-40 px-6 max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          {currentView === 'dashboard' ? (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12">
              <div className="flex justify-between items-end">
                <div className="flex flex-col gap-1">
                  <h2 className="text-5xl font-black text-white uppercase tracking-tighter leading-none italic">Garage</h2>
                  <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-bold ml-1">Fleet Management</p>
                </div>
                <button 
                  onClick={() => { resetVForm(); setIsAddingVehicle(true); }}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/10 transition-all flex items-center gap-2"
                >
                  <Plus size={16} strokeWidth={3} /> Neu
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {vehicles.map(v => (
                  <div 
                    key={v.id} 
                    className="group bg-[#111318] border border-white/5 rounded-[2.5rem] p-10 hover:border-blue-500/50 transition-all cursor-pointer relative overflow-hidden active:scale-[0.98]"
                    onClick={() => { setActiveVehicleId(v.id); setCurrentView('details'); }}
                  >
                    <div className="absolute top-0 right-0 p-12 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity grayscale group-hover:grayscale-0">
                      {v.type === 'bike' ? <Bike size={160} /> : <Car size={160} />}
                    </div>
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-14 h-14 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center text-blue-500">
                          {v.type === 'bike' ? <Bike size={24} strokeWidth={2.5} /> : <Car size={24} strokeWidth={2.5} />}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={(e) => { e.stopPropagation(); startEditVehicle(v); }} className="p-3 bg-white/5 rounded-xl text-slate-600 hover:text-white hover:bg-white/10 transition-all"><Settings size={14}/></button>
                          <button onClick={(e) => { e.stopPropagation(); setConfirmVehicleDeleteId(v.id); }} className="p-3 bg-white/5 rounded-xl text-slate-600 hover:text-red-500 hover:bg-white/10 transition-all"><Trash2 size={14}/></button>
                        </div>
                      </div>
                      <h3 className="text-4xl font-black text-white tracking-tighter mb-1 uppercase italic leading-none">{v.name}</h3>
                      <p className="text-xs text-slate-600 uppercase tracking-[0.2em] font-bold mb-14">{v.model} <span className="opacity-20 mx-2">|</span> {v.year || 'N/A'}</p>
                      
                      <div className="flex justify-between items-end border-t border-white/[0.03] pt-10">
                        <div>
                          <p className="text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-1">Stand</p>
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-mono font-black text-white tracking-tighter">{v.currentMileage.toLocaleString()}</span>
                            <span className="text-xs font-bold text-slate-700 uppercase">km</span>
                          </div>
                        </div>
                        <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-lg shadow-blue-900/40">
                          <ChevronRight size={18} strokeWidth={3} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              {activeVehicle && (
                <div className="space-y-8">
                  <div className="flex justify-between items-end mb-10">
                    <div>
                      <h2 className="text-3xl font-bold text-white uppercase tracking-tighter mb-2">{activeVehicle.name}</h2>
                      <p className="text-xs font-mono tracking-widest uppercase text-blue-500">{activeVehicle.model} • {activeVehicle.year}</p>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => handleExportPDF(activeVehicle)}
                        className="bg-white/5 text-slate-400 hover:text-white px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-white/10 transition-colors flex items-center gap-2"
                      >
                        <Download size={14} /> PDF
                      </button>
                      <button 
                        onClick={() => { resetSForm(); setIsAddingService(true); }}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-blue-900/40 transition-all flex items-center gap-2"
                      >
                        <Plus size={14} /> Service
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#111318] border border-white/5 rounded-[2.5rem] p-12 relative overflow-hidden group shadow-2xl">
                    <div className="flex justify-between items-end relative z-10">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 block mb-6 px-1">Global Odometer</p>
                        <div className="flex items-baseline gap-6">
                          <span className="text-8xl font-mono tracking-tighter text-white tabular-nums leading-none font-black drop-shadow-2xl">
                            {activeVehicle.currentMileage.toLocaleString()}
                          </span>
                          <span className="text-xl font-black text-slate-600 uppercase tracking-[0.2em]">km</span>
                        </div>
                      </div>
                      <div className="bg-white/5 rounded-3xl border border-white/5 p-8 text-right hidden lg:block backdrop-blur-sm">
                        <p className="block text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em] mb-3 leading-none">Last Service</p>
                        <p className="text-3xl font-mono font-black text-white tracking-tighter leading-none">
                          {activeVehicle.history[0] ? activeVehicle.history[0].mileage.toLocaleString() : '---'}
                          <span className="text-sm text-slate-600 ml-2 font-black uppercase">KM</span>
                        </p>
                      </div>
                    </div>
                    <div className="mt-12 flex items-center gap-4">
                       <input 
                        type="number"
                        placeholder="Aktualisieren..."
                        className="w-full max-w-[240px] bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-mono text-white placeholder:text-slate-700 outline-none focus:border-blue-500/50 transition-all shadow-inner uppercase tracking-widest"
                        onBlur={(e) => { const val = parseInt(e.target.value); if (!isNaN(val)) updateCurrentMileage(val); e.target.value = ''; }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { const val = parseInt((e.target as HTMLInputElement).value); if (!isNaN(val)) updateCurrentMileage(val); (e.target as HTMLInputElement).value = ''; } }}
                      />
                      <p className="text-[9px] text-slate-700 uppercase tracking-widest font-bold max-w-[140px] leading-relaxed">Letzten Stand eingeben & Bestätigen</p>
                    </div>
                    <div className="absolute top-0 right-0 p-20 opacity-[0.02] transform -translate-y-10 translate-x-10">
                      {activeVehicle.type === 'bike' ? <Bike size={240} /> : <Car size={240} />}
                    </div>
                  </div>

                  {/* Upcoming Services List */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {nextServices.map((service, i) => {
                      const diff = service.km - activeVehicle.currentMileage;
                      const isOverdue = diff <= 200;
                      return (
                        <div key={i} className={`p-6 rounded-2xl border ${isOverdue ? 'bg-red-500/5 border-red-500/20' : 'bg-[#14171C] border-white/5'}`}>
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{service.label}</span>
                            <span className={`text-[10px] font-mono font-bold ${isOverdue ? 'text-red-500' : 'text-slate-400'}`}>
                              {diff <= 0 ? 'FÄLLIG' : `IN ${diff.toLocaleString()} KM`}
                            </span>
                          </div>
                          <div className="text-lg font-mono font-bold text-white">{service.km.toLocaleString()} <span className="text-xs text-slate-600">KM</span></div>
                        </div>
                      );
                    })}
                  </div>

                  {/* History List */}
                  <div className="space-y-4 pt-10">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600 mb-6 flex items-center gap-2">
                       <History size={14} /> Service-Historie
                    </h3>
                    {activeVehicle.history.length === 0 ? (
                      <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
                        <p className="text-xs text-slate-700 uppercase tracking-widest">Noch keine Einträge vorhanden</p>
                      </div>
                    ) : (
                      activeVehicle.history.map(entry => (
                        <div key={entry.id} className="bg-[#14171C] border border-white/5 rounded-2xl p-6 hover:bg-[#181B21] transition-all group">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                              <div className="bg-green-500/10 text-green-500 p-2 rounded-xl">
                                <CheckCircle2 size={16} />
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-600 block leading-none mb-1 uppercase tracking-widest font-mono">{formatDate(entry.date)}</span>
                                <span className="text-lg font-mono font-bold text-white">{entry.mileage.toLocaleString()} KM</span>
                              </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => startEditService(entry)} className="p-2 text-slate-700 hover:text-blue-500 transition-colors"><Settings size={14}/></button>
                              <button onClick={() => setConfirmDeleteId(entry.id)} className="p-2 text-slate-700 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {entry.tasks.map((t, idx) => (
                              <span key={idx} className="bg-blue-500/10 text-blue-400 text-[9px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-widest">{t}</span>
                            ))}
                          </div>
                          
                          {entry.attachments && entry.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4 pt-2">
                              {entry.attachments.map((file, idx) => (
                                <a 
                                  key={idx} 
                                  href={file} 
                                  download={`Beleg_${entry.date}_${idx}.${isPdfRaw(file) ? 'pdf' : 'jpg'}`}
                                  className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-2xl text-[11px] font-black text-slate-300 hover:text-white hover:bg-white/10 transition-all uppercase tracking-[0.15em] group/file shadow-lg"
                                >
                                  <FileText size={16} className="text-blue-500" />
                                  {isPdfRaw(file) ? 'PDF RECHNUNG' : `BELEG ${entry.attachments.length > 1 ? (idx + 1) : ''}`}
                                  <Download size={12} className="ml-2 opacity-50" />
                                </a>
                              ))}
                            </div>
                          )}

                          {entry.notes && <p className="text-xs text-slate-500 italic font-sans border-l-2 border-white/10 pl-4 py-1">{entry.notes}</p>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* --- Modals Overlay --- */}
      <AnimatePresence>
        {(isAddingVehicle || isAddingService || confirmDeleteId || confirmVehicleDeleteId) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-[#0B0D0F]/90 backdrop-blur-md z-50 flex items-center justify-center p-6">
             <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#14171C] border border-white/10 rounded-3xl w-full max-w-2xl p-8 shadow-2xl relative overflow-hidden">
                <button onClick={() => { setIsAddingVehicle(false); setIsAddingService(false); setConfirmDeleteId(null); setConfirmVehicleDeleteId(null); resetVForm(); resetSForm(); }} className="absolute top-6 right-6 text-slate-600 hover:text-white transition-colors"><X size={20}/></button>
                
                {/* Add/Edit Vehicle Modal Content */}
                {isAddingVehicle && (
                  <div className="space-y-6 max-h-[85vh] overflow-y-auto pr-2 custom-scrollbar">
                    <h3 className="text-2xl font-bold text-white uppercase tracking-tighter">{editingVehicleId ? 'Fahrzeug bearbeiten' : 'Neues Fahrzeug'}</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Anzeige-Name</label>
                        <input value={vName} onChange={e => setVName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white focus:border-blue-500/50 outline-none transition-all" placeholder="z.B. Mein Honda" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Modellbezeichnung</label>
                        <input value={vModel} onChange={e => setVModel(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white focus:border-blue-500/50 outline-none transition-all" placeholder="z.B. CBR 125R" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Baujahr</label>
                        <input value={vYear} onChange={e => setVYear(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white focus:border-blue-500/50 outline-none transition-all" placeholder="2005" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Aktueller KM-Stand</label>
                        <input type="number" value={vMileage} onChange={e => setVMileage(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white font-mono focus:border-blue-500/50 outline-none transition-all" placeholder="0" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Typ</label>
                        <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10 h-[52px]">
                          <button onClick={() => setVType('car')} className={`flex-1 flex items-center justify-center gap-2 text-[10px] font-bold uppercase rounded-xl transition-all ${vType === 'car' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                            <Car size={14}/>
                          </button>
                          <button onClick={() => setVType('bike')} className={`flex-1 flex items-center justify-center gap-2 text-[10px] font-bold uppercase rounded-xl transition-all ${vType === 'bike' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                            <Bike size={14}/>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Service Intervals Section */}
                    <div className="pt-4 border-t border-white/5">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex flex-col">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Service-Intervalle</label>
                          <p className="text-[9px] text-slate-600 uppercase tracking-widest">Wann stehen die nächsten Arbeiten an?</p>
                        </div>
                        <button 
                          onClick={addTask}
                          className="flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                        >
                          <PlusCircle size={14} /> Hinzufügen
                        </button>
                      </div>

                      <div className="space-y-3">
                        {vTasks.map((task) => (
                          <div key={task.id} className="flex gap-3 items-end group/task bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                            <div className="flex-1 space-y-1.5">
                              <label className="text-[9px] font-bold uppercase tracking-widest text-slate-600 ml-1">Bezeichnung</label>
                              <input 
                                value={task.label} 
                                onChange={e => updateTask(task.id, 'label', e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white" 
                                placeholder="z.B. Ölwechsel"
                              />
                            </div>
                            <div className="w-[120px] space-y-1.5">
                              <label className="text-[9px] font-bold uppercase tracking-widest text-slate-600 ml-1">Alle ... KM</label>
                              <input 
                                type="number"
                                value={task.interval} 
                                onChange={e => updateTask(task.id, 'interval', parseInt(e.target.value) || 0)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white font-mono" 
                                placeholder="10000"
                              />
                            </div>
                            <button 
                              onClick={() => removeTask(task.id)}
                              disabled={vTasks.length <= 1}
                              className="p-2.5 text-slate-700 hover:text-red-500 transition-colors disabled:opacity-30"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button onClick={handleAddVehicle} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-bold uppercase tracking-widest transition-all mt-4">
                      {editingVehicleId ? 'Änderungen speichern' : 'Fahrzeug anlegen'}
                    </button>
                  </div>
                )}

                {/* Log Service Modal Content */}
                {isAddingService && (
                   <div className="space-y-6 max-h-[85vh] overflow-y-auto custom-scrollbar pr-2">
                      <h3 className="text-2xl font-bold text-white uppercase tracking-tighter">Service Loggen</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Datum</label>
                            <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white focus:border-blue-500/50 outline-none" />
                         </div>
                         <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Kilometerstand</label>
                            <input type="number" value={formMileage} onChange={e => setFormMileage(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white font-mono focus:border-blue-500/50 outline-none" placeholder="0" />
                         </div>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Arbeiten</label>
                         <div className="grid grid-cols-2 gap-2 mb-3">
                            {activeVehicle?.tasks.map(t => (
                              <button key={t.id} onClick={() => setSelectedTasks(prev => prev.includes(t.label) ? prev.filter(x => x !== t.label) : [...prev, t.label])} className={`text-left p-3.5 rounded-xl border text-[11px] font-bold uppercase transition-all ${selectedTasks.includes(t.label) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/20'}`}>{t.label}</button>
                            ))}
                         </div>
                         
                         {/* One-off custom task input */}
                         <div className="flex gap-2">
                           <input 
                             type="text" 
                             value={customTask}
                             onChange={e => setCustomTask(e.target.value)}
                             placeholder="Eigene Arbeit hinzufügen..."
                             className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-blue-500/50 outline-none"
                             onKeyDown={(e) => {
                               if (e.key === 'Enter' && customTask.trim()) {
                                 e.preventDefault();
                                 if (!selectedTasks.includes(customTask.trim())) {
                                   setSelectedTasks([...selectedTasks, customTask.trim()]);
                                 }
                                 setCustomTask('');
                               }
                             }}
                           />
                           <button 
                             onClick={() => {
                               if (customTask.trim()) {
                                 if (!selectedTasks.includes(customTask.trim())) {
                                   setSelectedTasks([...selectedTasks, customTask.trim()]);
                                 }
                                 setCustomTask('');
                               }
                             }}
                             className="bg-blue-600/10 text-blue-500 p-3 rounded-xl hover:bg-blue-600/20 transition-all border border-blue-500/20"
                           >
                             <Plus size={16} />
                           </button>
                         </div>
                         
                         {/* Show custom tasks as chips if they are not in the vehicle's default tasks */}
                         <div className="flex flex-wrap gap-2 mt-3">
                            {selectedTasks.filter(st => !activeVehicle?.tasks.some(t => t.label === st)).map((ct, idx) => (
                              <span key={idx} className="bg-blue-600 text-white text-[9px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-widest flex items-center gap-2">
                                {ct}
                                <button onClick={() => setSelectedTasks(selectedTasks.filter(t => t !== ct))}><X size={10}/></button>
                              </span>
                            ))}
                         </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Notizen</label>
                        <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white h-24 outline-none focus:border-blue-500/50" placeholder="Zusätzliche Infos..." />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Anhänge (Max 3, je 1MB)</label>
                        <input type="file" multiple accept="image/*,application/pdf" onChange={handleFileChange} className="w-full text-xs text-slate-600 file:mr-4 file:py-2.5 file:px-6 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:uppercase file:bg-blue-600/10 file:text-blue-500 hover:file:bg-blue-600/20 transition-all cursor-pointer" />
                        <div className="flex gap-3 flex-wrap mt-4">
                          {formAttachments.map((att, idx) => (
                            <div key={idx} className="relative group/att w-20 h-20 rounded-2xl bg-white/5 overflow-hidden border border-white/10 transition-all hover:scale-105">
                              {isPdfRaw(att) ? (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-blue-500/10 text-blue-500">
                                  <FileText size={24} />
                                  <span className="text-[8px] font-black mt-1">PDF</span>
                                </div>
                              ) : (
                                <img src={att} className="w-full h-full object-cover" />
                              )}
                              <button onClick={() => setFormAttachments(prev => prev.filter((_, i) => i !== idx))} className="absolute inset-0 bg-red-600/80 items-center justify-center hidden group-hover/att:flex text-white transition-all">
                                <Trash2 size={20}/>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                      <button onClick={handleAddService} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-bold uppercase tracking-widest transition-all">Speichern</button>
                   </div>
                )}

                {/* Confirm Delete Modals */}
                {(confirmDeleteId || confirmVehicleDeleteId) && (
                   <div className="text-center py-6">
                      <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6"><AlertCircle size={32}/></div>
                      <h3 className="text-2xl font-bold text-white uppercase tracking-tighter mb-2">Sicher?</h3>
                      <p className="text-slate-400 text-sm mb-10 leading-relaxed">Diese Aktion kann nicht rückgängig gemacht werden. Alle Daten gehen dauerhaft verloren.</p>
                      <div className="flex gap-4">
                        <button onClick={() => { setConfirmDeleteId(null); setConfirmVehicleDeleteId(null); }} className="flex-1 bg-white/5 hover:bg-white/10 text-slate-500 py-4 rounded-2xl font-bold uppercase tracking-widest transition-all">Abbrechen</button>
                        <button onClick={() => confirmDeleteId ? deleteEntry(confirmDeleteId) : deleteVehicle(confirmVehicleDeleteId!)} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-4 rounded-2xl font-bold uppercase tracking-widest transition-all">Endgültig Löschen</button>
                      </div>
                   </div>
                )}

             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="fixed bottom-0 left-0 right-0 py-6 bg-[#0B0D0F]/90 backdrop-blur-sm border-t border-white/5 z-40 text-center">
        <div className="flex justify-center gap-6 mb-2">
           <Link to="/legal" className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-white transition-colors">Datenschutz</Link>
        </div>
        <p className="text-[9px] text-slate-700 uppercase tracking-widest">&copy; {new Date().getFullYear()} SubBoss Service Desk • Private Edition</p>
      </footer>
    </div>
  );
}
