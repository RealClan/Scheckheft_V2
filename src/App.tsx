import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import LegalPage from './pages/LegalPage';
import CookieConsent from 'react-cookie-consent';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } 
          />
          <Route path="/legal" element={<LegalPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        
        <CookieConsent
          location="bottom"
          buttonText="Akzeptieren"
          declineButtonText="Nur Notwendige"
          enableDeclineButton
          cookieName="subboss_service_consent"
          style={{ 
            background: "#14171C", 
            borderTop: "1px solid rgba(255,255,255,0.1)",
            fontSize: "12px",
            fontFamily: "inherit",
            justifyContent: "center",
            padding: "10px 20px"
          }}
          buttonStyle={{ 
            background: "#2563eb", 
            color: "white", 
            fontSize: "10px", 
            fontWeight: "bold", 
            textTransform: "uppercase", 
            padding: "8px 20px", 
            borderRadius: "8px" 
          }}
          declineButtonStyle={{
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#64748b",
            fontSize: "10px",
            fontWeight: "bold",
            padding: "8px 20px",
            borderRadius: "8px"
          }}
          expires={150}
        >
          <span className="text-slate-300">
            Wir nutzen essentielle Cookies für die Anmeldung. Details findest du in unserer{" "}
            <a href="/legal" className="text-blue-500 hover:underline">Datenschutzerklärung</a>.
          </span>
        </CookieConsent>
      </Router>
    </AuthProvider>
  );
}
