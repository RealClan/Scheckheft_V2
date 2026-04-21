import { motion } from 'motion/react';
import { ArrowLeft, Shield, Scale } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LegalPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0B0D0F] text-slate-200 p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors mb-12 group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-widest">Zurück</span>
        </button>

        <header className="mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tighter mb-4">Datenschutz</h1>
          <p className="text-slate-500 uppercase tracking-[0.2em] text-[10px]">Deine Daten gehören dir.</p>
        </header>

        <div className="space-y-20 pb-20">
          {/* Datenschutzerklärung */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="prose prose-invert max-w-none"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                <Shield size={20} />
              </div>
              <h2 className="text-2xl font-bold text-white m-0">Datenschutzerklärung (DSGVO)</h2>
            </div>
            <div className="bg-[#14171C] border border-white/5 rounded-2xl p-8 space-y-6 text-slate-400 leading-relaxed text-sm">
              <div>
                <h3 className="text-white font-bold mb-2">1. Allgemeine Hinweise</h3>
                <p>
                  Diese Datenschutzerklärung informiert dich über die Art, den Umfang und den Zweck der 
                  Verarbeitung von personenbezogenen Daten innerhalb dieser Web-App. Die Nutzung erfolgt 
                  auf Basis der DSGVO.
                </p>
              </div>

              <div>
                <h3 className="text-white font-bold mb-2">2. Datenerfassung in dieser App</h3>
                <p>
                  Diese Anwendung wird selbst gehostet. Deine Daten werden lokal auf der Infrastruktur 
                  des Betreibers verarbeitet und gespeichert. Es werden folgende Daten verarbeitet:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Benutzerdaten (Email, Name, kryptografisch verschlüsseltes Passwort)</li>
                  <li>Von dir eingegebene Fahrzeugdaten (Modell, Jahr, KM-Stand, Service-Intervalle)</li>
                  <li>Service-Historien und hochgeladene Anhänge (z.B. Bilder)</li>
                </ul>
                <p className="mt-2">
                  Alle Daten werden in einer geschützten lokalen Datenbank gespeichert. Es findet keine 
                  Übertragung an externe Cloud-Anbieter oder Dritte statt.
                </p>
              </div>

              <div>
                <h3 className="text-white font-bold mb-2">3. Zweck der Verarbeitung</h3>
                <p>
                  Die Datenverarbeitung dient ausschließlich der Bereitstellung der Funktionalität der App 
                  (Verwaltung deines digitalen Scheckhefts). Eine Weitergabe an Dritte findet nicht statt.
                </p>
              </div>

              <div>
                <h3 className="text-white font-bold mb-2">4. Deine Rechte</h3>
                <p>
                  Du hast jederzeit das Recht auf unentgeltliche Auskunft über deine gespeicherten 
                  personenbezogenen Daten. Du kannst deine Daten jederzeit selbst löschen oder die 
                  Löschung deines Kontos verlangen.
                </p>
              </div>

              <div>
                <h3 className="text-white font-bold mb-2">5. Sicherheit</h3>
                <p>
                  Wir setzen technische und organisatorische Sicherheitsmaßnahmen ein, um deine Daten 
                  gegen Manipulation, Verlust oder unbefugten Zugriff zu schützen. Alle Passwörter 
                  werden gehasht und niemals im Klartext gespeichert.
                </p>
              </div>
            </div>
          </motion.section>
        </div>

        <footer className="pt-20 border-t border-white/5 text-center pb-20">
           <p className="text-[10px] text-slate-600 uppercase tracking-widest leading-relaxed">
            Stand: {new Date().toLocaleDateString('de-DE')} • SubBoss Service Desk
          </p>
        </footer>
      </div>
    </div>
  );
}
