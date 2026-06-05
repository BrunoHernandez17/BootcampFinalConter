import React, { useState } from "react";
import { Shield, Eye, EyeOff, LogIn, Mail, Lock } from "lucide-react";
import { UserRole } from "../types";
import duocMaipuCampus from "../assets/images/duoc_maipu_campus_1780694262046.png";

interface LoginViewProps {
  onLogin: (email: string, role: UserRole, name: string) => void;
}

export default function LoginView({ onLogin }: LoginViewProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Por favor ingresa tu correo institucional");
      return;
    }
    
    // Simple verification
    if (!email.endsWith("@duocuc.cl") && !email.endsWith("@duoc.cl")) {
      setError("Por favor ingresa un correo con dominio institucional (@duocuc.cl)");
      return;
    }

    setLoading(true);
    setError("");

    setTimeout(() => {
      setLoading(false);
      // Auto-assign role based on chosen email prefix for quick login or defaults
      let role: UserRole = "conductor";
      let name = "Sebastián Conductor";
      
      const lowerEmail = email.toLowerCase();
      if (lowerEmail.includes("admin")) {
        role = "admin";
        name = "Ing. Bruno Hernández (Jefe Servicios Griegos)";
      } else if (lowerEmail.includes("guardia") || lowerEmail.includes("portero")) {
        role = "guardia";
        name = "Guardia de Turno - Don Carlos";
      } else if (lowerEmail.includes("super")) {
        role = "superadmin";
        name = "Super Admin Central";
      }

      onLogin(email, role, name);
    }, 1200);
  };

  const handleQuickLogin = (demoEmail: string, demoRole: UserRole, demoName: string) => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLogin(demoEmail, demoRole, demoName);
    }, 600);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 py-12 relative overflow-hidden bg-[#f8f9ff]">
      {/* Abstract Animated Ambient Gradients */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute -top-[10%] -left-[5%] w-[45%] h-[45%] bg-[#2170e4]/8 rounded-full blur-[140px]" />
        <div className="absolute top-[60%] -right-[10%] w-[55%] h-[55%] bg-[#091426]/10 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-5xl grid md:grid-cols-2 overflow-hidden rounded-2xl shadow-xl border border-[#c5c6cd]/50 z-10 bg-white">
        {/* Left Side: Branding, Mission, and Image Backing */}
        <div className="hidden md:flex flex-col justify-between p-8 xl:p-12 bg-[#091426] text-white relative overflow-hidden">
          <div className="z-20">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#002f6c] to-[#ffa400] flex items-center justify-center text-white font-black text-xl shadow-md border border-[#ffa400]/40">
                D
              </div>
              <h1 className="text-xl font-bold tracking-tight">Duoc UC Parking</h1>
            </div>
            
            <h2 className="text-3xl font-bold mb-4 leading-tight tracking-tight">
              Gestión inteligente para la comunidad.
            </h2>
            <p className="text-[#8590a6] text-sm leading-relaxed max-w-sm">
              Accede a la red de estacionamientos más avanzada de Duoc UC con tu cuenta institucional de manera segura y eficiente.
            </p>
          </div>

          <div className="mt-12 relative z-20">
            <div className="p-5 bg-white/5 rounded-xl border border-white/10 backdrop-blur-md">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="h-5 w-5 text-[#d8e2ff]" />
                <p className="text-xs uppercase tracking-widest font-bold text-[#d8e2ff]">Acceso Seguro</p>
              </div>
              <p className="text-xs text-white/70 leading-relaxed">
                Sistema integrado con autenticación centralizada y control de acceso por roles para mayor seguridad de tus datos.
              </p>
            </div>
          </div>

          {/* Underlay Campus architecture simulated style */}
          <div className="absolute inset-0 z-0 opacity-25">
            <img 
              alt="Duoc UC Sede Maipú" 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer"
              src={duocMaipuCampus}
            />
          </div>
          {/* Cover gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#091426] via-[#091426]/90 to-transparent z-10" />
        </div>

        {/* Right Side: Form Intake */}
        <div className="p-8 lg:p-16 flex flex-col justify-center bg-white">
          <div className="mb-8">
            <div className="md:hidden flex items-center gap-2 mb-6">
              <div className="h-8 w-8 rounded-lg bg-[#002f6c] flex items-center justify-center text-[#ffa400] font-black text-lg border border-[#ffa400]/40">D</div>
              <span className="text-lg font-bold text-[#091426]">Duoc UC Parking</span>
            </div>
            <h3 className="text-2xl font-bold text-[#0b1c30] mb-2 font-sans tracking-tight">Iniciar Sesión</h3>
            <p className="text-sm text-[#45474c]">Bienvenido de vuelta. Ingresa tus credenciales Duoc UC para continuar.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 text-xs rounded-xl border border-red-100 flex items-center gap-2">
              <span className="font-bold">Error:</span> {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#45474c] uppercase tracking-wider block" htmlFor="email">
                Correo Institucional
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#75777d]" />
                <input 
                  className="w-full pl-11 pr-4 py-3 bg-[#f8f9ff] border border-[#c5c6cd] rounded-xl focus:ring-2 focus:ring-[#2170e4] focus:border-[#2170e4] text-sm text-[#0b1c30] placeholder-gray-400 outline-none transition-all"
                  id="email"
                  placeholder="nombre@duocuc.cl"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-[#45474c] uppercase tracking-wider block" htmlFor="password">
                  Contraseña
                </label>
                <a className="text-xs font-semibold text-[#2170e4] hover:underline" href="#forgot" onClick={(e) => e.preventDefault()}>
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#75777d]" />
                <input 
                  className="w-full pl-11 pr-11 py-3 bg-[#f8f9ff] border border-[#c5c6cd] rounded-xl focus:ring-2 focus:ring-[#2170e4] focus:border-[#2170e4] text-sm text-[#0b1c30] placeholder-gray-400 outline-none transition-all"
                  id="password"
                  placeholder="••••••••"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button 
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#75777d] hover:text-[#0b1c30] transition-colors"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 py-1">
              <input 
                className="w-4 h-4 rounded border-[#c5c6cd] text-[#2170e4] focus:ring-[#2170e4] cursor-pointer" 
                id="remember" 
                type="checkbox" 
              />
              <label className="text-xs text-[#45474c] cursor-pointer select-none" htmlFor="remember">
                Recordar mi sesión en este dispositivo
              </label>
            </div>

            <button 
              className="w-full py-3.5 bg-[#091426] hover:bg-[#1e293b] text-white font-semibold text-sm rounded-xl shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              disabled={loading}
              type="submit"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <span>Ingresar</span>
                  <LogIn className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Institutional SSO Multi-Roll Fast Track Accounts */}
          <div className="mt-8 pt-6 border-t border-[#c5c6cd]/50">
            <p className="text-xs text-[#45474c] font-semibold uppercase tracking-wider text-center mb-4">
              Ingreso Rápido de Pruebas (Selecciona un Rol)
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button 
                className="flex flex-col items-center justify-center p-2.5 bg-[#f8f9ff] border border-[#c5c6cd]/50 rounded-xl hover:bg-[#eff4ff] hover:border-[#2170e4] transition-all"
                onClick={() => handleQuickLogin("pe.conduc@duocuc.cl", "conductor", "Sebastián Conductor")}
              >
                <span className="font-bold text-[#091426]">Conductor</span>
                <span className="text-[10px] text-gray-500">Vista Móvil</span>
              </button>
              <button 
                className="flex flex-col items-center justify-center p-2.5 bg-[#f8f9ff] border border-[#c5c6cd]/50 rounded-xl hover:bg-[#eff4ff] hover:border-[#2170e4] transition-all"
                onClick={() => handleQuickLogin("carlos.guardia@duocuc.cl", "guardia", "Don Carlos (Portería)")}
              >
                <span className="font-bold text-[#091426]">Guardia / Portera</span>
                <span className="text-[10px] text-gray-500">110 Cupos Grid</span>
              </button>
              <button 
                className="flex flex-col items-center justify-center p-2.5 bg-[#f8f9ff] border border-[#c5c6cd]/50 rounded-xl hover:bg-[#eff4ff] hover:border-[#2170e4] transition-all"
                onClick={() => handleQuickLogin("bruno.admin@duocuc.cl", "admin", "Ing. Bruno Hernández (Admin)")}
              >
                <span className="font-bold text-[#091426]">Administrador</span>
                <span className="text-[10px] text-gray-500">Virtual Map & IA</span>
              </button>
              <button 
                className="flex flex-col items-center justify-center p-2.5 bg-[#f8f9ff] border border-[#c5c6cd]/50 rounded-xl hover:bg-[#eff4ff] hover:border-[#2170e4] transition-all"
                onClick={() => handleQuickLogin("super.admin@duocuc.cl", "superadmin", "Super Administrador")}
              >
                <span className="font-bold text-[#091426]">Super Admin</span>
                <span className="text-[10px] text-gray-500">Control Total</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Links */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 text-xs text-[#45474c]/80 z-10 font-sans">
        <a className="hover:text-[#2170e4] transition-colors" href="#privacy">Privacidad</a>
        <span className="opacity-40">•</span>
        <a className="hover:text-[#2170e4] transition-colors" href="#terms">Términos</a>
        <span className="opacity-40">•</span>
        <a className="hover:text-[#2170e4] transition-colors" href="#support">Ayuda Duoc UC</a>
      </div>
    </div>
  );
}
