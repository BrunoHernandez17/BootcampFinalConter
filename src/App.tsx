import React, { useState } from "react";
import LoginView from "./components/LoginView";
import DriverView from "./components/DriverView";
import GuardView from "./components/GuardView";
import AdminView from "./components/AdminView";
import { User, UserRole } from "./types";
import { Sparkles, Users, RefreshCw, Layers, Car, Shield, Settings, Eye } from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(true);

  const handleLogin = (email: string, role: UserRole, fullName: string) => {
    setCurrentUser({
      email,
      role,
      fullName
    });
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  // Helper override role to test multiple client views on the fly
  const handleOverrideRole = (overrideRole: UserRole) => {
    if (!currentUser) {
      // If not logged in, log in with temporary supervisor account
      setCurrentUser({
        email: `demo.${overrideRole}@duocuc.cl`,
        role: overrideRole,
        fullName: `Demo ${overrideRole.toUpperCase()}`
      });
      return;
    }
    
    // update current session
    setCurrentUser({
      ...currentUser,
      role: overrideRole,
      fullName: overrideRole === "conductor" ? "Sebastián Conductor" : (overrideRole === "guardia" ? "Don Carlos (Portería)" : "Ing. Bruno Hernández (Admin)")
    });
  };

  return (
    <div className="min-h-screen relative font-sans text-[#0b1c30]">
      
      {/* Floating Demo Bypass Toolbar (Dev Helper) */}
      <div className="fixed top-3 right-4 z-50 flex items-center gap-2">
        {showRoleSwitcher ? (
          <div className="bg-[#091426] border-2 border-[#ffa400]/80 rounded-2xl shadow-2xl p-2.5 flex items-center gap-3 text-xs text-white">
            <div className="flex items-center gap-1.5 border-r border-[#ffa400]/20 pr-3 mr-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ffa400] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ffa400]"></span>
              </span>
              <span className="text-[10px] uppercase font-black text-[#ffa400] tracking-wider flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-[#ffa400]" /> SIMULADOR DUOC:
              </span>
            </div>
            
            <div className="flex gap-1.5">
              <button 
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                  currentUser?.role === "conductor" 
                    ? "bg-[#ffa400] text-[#091426] shadow-lg shadow-[#ffa400]/20 font-extrabold scale-[1.03]" 
                    : "bg-white/5 text-gray-200 hover:bg-white/10"
                }`}
                onClick={() => handleOverrideRole("conductor")}
              >
                <Car className="h-3.5 w-3.5" />
                <span>Conductor (Móvil)</span>
              </button>

              <button 
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                  currentUser?.role === "guardia" 
                    ? "bg-[#ffa400] text-[#091426] shadow-lg shadow-[#ffa400]/20 font-extrabold scale-[1.03]" 
                    : "bg-white/5 text-gray-200 hover:bg-white/10"
                }`}
                onClick={() => handleOverrideRole("guardia")}
              >
                <Shield className="h-3.5 w-3.5" />
                <span>Guardia (Sede)</span>
              </button>

              <button 
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                  currentUser?.role === "admin" 
                    ? "bg-[#ffa400] text-[#091426] shadow-lg shadow-[#ffa400]/20 font-extrabold scale-[1.03]" 
                    : "bg-white/5 text-gray-200 hover:bg-white/10"
                }`}
                onClick={() => handleOverrideRole("admin")}
              >
                <Settings className="h-3.5 w-3.5" />
                <span>Control Admin (IA)</span>
              </button>
            </div>
            
            <button 
              className="px-2 py-1.5 text-gray-400 hover:text-white border-l border-white/10 pl-3 ml-2 text-[10px] hover:bg-white/10 rounded-lg transition-colors font-semibold"
              title="Ocultar Simulador"
              onClick={() => setShowRoleSwitcher(false)}
            >
              Cerrar
            </button>
          </div>
        ) : (
          <button 
            className="px-3 py-2 bg-[#091426] hover:bg-[#002f6c] hover:border-[#ffa400]/80 text-[#ffa400] rounded-xl shadow-xl border border-[#ffa400]/40 text-[10px] uppercase font-black tracking-wide flex items-center gap-1.5 transition-all active:scale-95"
            onClick={() => setShowRoleSwitcher(true)}
          >
            <Sparkles className="h-3.5 w-3.5 animate-pulse text-[#ffa400]" />
            <span>Simulador de Roles</span>
          </button>
        )}
      </div>

      {/* Renders specific view based on simulation auth state */}
      {!currentUser ? (
        <LoginView onLogin={handleLogin} />
      ) : (
        <div className="w-full h-full">
          {currentUser.role === "conductor" && (
            <DriverView currentUser={currentUser} onLogout={handleLogout} />
          )}
          {currentUser.role === "guardia" && (
            <GuardView currentUser={currentUser} onLogout={handleLogout} />
          )}
          {(currentUser.role === "admin" || currentUser.role === "superadmin") && (
            <AdminView currentUser={currentUser} onLogout={handleLogout} />
          )}
        </div>
      )}
    </div>
  );
}
