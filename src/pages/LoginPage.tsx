import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Bike, Car, ShieldCheck, Mail, Lock, User as UserIcon, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

export default function LoginPage() {
  const { user, login, register, loading } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      if (isRegistering) {
        await register(email, password, displayName);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentifizierung fehlgeschlagen');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0D0F] flex items-center justify-center p-6 text-slate-200">
      <div className="max-w-md w-full">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#14171C] border border-white/5 rounded-3xl p-10 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute -top-10 -right-10 opacity-[0.03] rotate-12">
            <Bike size={200} />
          </div>
          <div className="absolute -bottom-10 -left-10 opacity-[0.03] -rotate-12">
            <Car size={200} />
          </div>

          <div className="relative z-10">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-blue-600/10 text-blue-500 mb-8 border border-white/5 shadow-inner">
                <ShieldCheck size={40} strokeWidth={2.5} />
              </div>
              <h1 className="text-4xl font-black text-white mb-2 tracking-tighter uppercase italic italic-none">
                {isRegistering ? 'Register' : 'Login'}
              </h1>
              <p className="text-slate-500 text-[10px] uppercase tracking-[0.3em] font-bold">
                {isRegistering 
                  ? 'Secure Instance Enrollment' 
                  : 'Dein Weg zu deiner Service Historie'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-4 rounded-xl flex items-center gap-3">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              {isRegistering && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:border-blue-500/50 outline-none transition-all"
                      placeholder="Dein Name"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:border-blue-500/50 outline-none transition-all"
                    placeholder="name@beispiel.de"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Passwort</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:border-blue-500/50 outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-blue-900/20 uppercase tracking-widest text-sm"
              >
                {isSubmitting ? 'Wird verarbeitet...' : (isRegistering ? 'Registrieren' : 'Anmelden')}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
                className="text-xs text-slate-500 hover:text-white transition-colors"
              >
                {isRegistering 
                  ? 'Bereits ein Konto? Hier anmelden' 
                  : 'Noch kein Konto? Jetzt registrieren'}
              </button>
            </div>

            <div className="mt-8 pt-8 border-t border-white/5 text-center">
              <p className="text-[10px] text-slate-700 uppercase tracking-widest font-medium">
                Self-Hosted • Private Infrastructure
              </p>
            </div>
          </div>
        </motion.div>

        <div className="mt-8 text-center">
          <p className="text-slate-600 text-[10px] uppercase tracking-widest leading-relaxed">
            SubBoss Service Desk &copy; {new Date().getFullYear()}<br/>
            Engineered for Precision
          </p>
        </div>
      </div>
    </div>
  );
}
