import React, { useState, useEffect } from "react";
import { Sparkles, MapPin, CheckCircle, ShieldAlert, BookMarked, ToggleLeft, HelpCircle, Inbox, Lock, Calendar, CircleDollarSign, Zap, RefreshCw, Layers, ShieldCheck, Play } from "lucide-react";
import { Spot } from "../types";

interface AdminViewProps {
  currentUser: { email: string; fullName: string };
  onLogout: () => void;
}

export default function AdminView({ currentUser, onLogout }: AdminViewProps) {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [activeQuadrant, setActiveQuadrant] = useState<"A" | "B" | "C" | "D">("A");
  
  // Custom interactive logo spin & sync notifier
  const [logoSpin, setLogoSpin] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleLogoClick = async () => {
    setLogoSpin(true);
    await fetchSpots();
    setToastMessage("Sincronizado: Base de Datos de Sede Maipú Actualizada");
    setTimeout(() => {
      setLogoSpin(false);
    }, 850);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // AI report states
  const [aiReport, setAiReport] = useState<string>("");
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportStep, setReportStep] = useState("");
  const [isAiMock, setIsAiMock] = useState(false);

  const [loadingAction, setLoadingAction] = useState(false);

  // Fetch full state from backend Express API
  const fetchSpots = async () => {
    try {
      const response = await fetch("/api/spots");
      if (response.ok) {
        const data = await response.json();
        setSpots(data);
      }
    } catch (e) {
      console.error("Error loading admin spots telemetry:", e);
    }
  };

  useEffect(() => {
    fetchSpots();
    // Refresh admin view every 3 seconds
    const interval = setInterval(fetchSpots, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSpotClick = (spotId: string) => {
    setSelectedSpotId(spotId === selectedSpotId ? null : spotId);
  };

  // Perform AI Trend Generation with real-time feedback
  const handleGenerateAiReport = async () => {
    setLoadingReport(true);
    setAiReport("");
    
    // Simulate premium analytical steps
    setReportStep("Analizando distribución espacial y ocupación de sensores...");
    await new Promise(r => setTimeout(r, 1000));
    setReportStep("Proyectando horas de máxima saturación en base a patrones históricos...");
    await new Promise(r => setTimeout(r, 1000));
    setReportStep("Consultando con Gemini Engine en Google AI Studio...");

    try {
      const response = await fetch("/api/gemini/trends", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (response.ok) {
        const data = await response.json();
        setAiReport(data.report);
        setIsAiMock(data.isMock);
      } else {
        setAiReport("### Error analizando datos\nFallo al establecer comunicación con el servidor Gemini AI.");
      }
    } catch (err: any) {
      setAiReport(`### Error de Conexión\n${err?.message || "Ocurrió un error inesperado al consultar el motor de IA."}`);
    } finally {
      setLoadingReport(false);
      setReportStep("");
    }
  };

  // Custom regex markdown formatter for a clean UI presentation
  const renderFormattedReport = (rawText: string) => {
    if (!rawText) return null;

    const lines = rawText.split("\n");
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      
      // Headers ###
      if (trimmed.startsWith("###")) {
        return (
          <h4 key={idx} className="text-sm font-bold text-[#adc6ff] uppercase tracking-wider font-sans mt-5 mb-2 border-b border-white/10 pb-1">
            {trimmed.replace(/^###\s*/, "")}
          </h4>
        );
      }
      // Headers ####
      if (trimmed.startsWith("####")) {
        return (
          <h5 key={idx} className="text-xs font-semibold text-[#adc6ff] mt-4 mb-1.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2170e4]" />
            {trimmed.replace(/^####\s*/, "")}
          </h5>
        );
      }
      // Bold text **
      if (trimmed.startsWith("- **") || trimmed.startsWith("* **")) {
        const parts = trimmed.split(":**");
        if (parts.length > 1) {
          const boldPart = parts[0].replace(/^[-*]\s*\*\*/, "");
          const textPart = parts.slice(1).join(":**");
          return (
            <p key={idx} className="text-xs text-white/80 leading-relaxed pl-4 mb-2">
              <strong className="text-white font-semibold flex-shrink-0">{boldPart}:</strong> {textPart}
            </p>
          );
        }
      }
      // Bullet items - or *
      if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
        return (
          <p key={idx} className="text-xs text-white/80 leading-relaxed pl-4 flex items-start gap-1.5 mb-2">
            <span className="text-blue-400 mt-1">&bull;</span>
            <span>{trimmed.replace(/^[-*]\s*/, "")}</span>
          </p>
        );
      }
      // Regular text
      if (trimmed) {
        return <p key={idx} className="text-xs text-white/70 leading-relaxed mb-3">{trimmed}</p>;
      }
      return <div key={idx} className="h-2" />;
    });
  };

  // Reserve current selected spot (Admin override)
  const handleReserveSpot = async () => {
    if (!selectedSpotId) return;
    setLoadingAction(true);
    try {
      const response = await fetch(`/api/spots/${selectedSpotId}/reserve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ occupant: `Reservado por Admin: ${currentUser.fullName}` })
      });
      if (response.ok) {
        await fetchSpots();
        setToastMessage(`Éxito: Cupo ${selectedSpotId} reservado.`);
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAction(false);
    }
  };

  // Block current selected spot / Assign Guest (Admin override)
  const handleBlockSpot = async () => {
    if (!selectedSpotId) return;
    setLoadingAction(true);
    try {
      const response = await fetch(`/api/spots/${selectedSpotId}/block`, {
        method: "POST"
      });
      if (response.ok) {
        await fetchSpots();
        setToastMessage(`Éxito: Cupo ${selectedSpotId} registrado para Invitado.`);
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAction(false);
    }
  };

  // Release/Unpark current selected spot (Admin override)
  const handleUnparkSpot = async () => {
    if (!selectedSpotId) return;
    setLoadingAction(true);
    try {
      const response = await fetch(`/api/spots/${selectedSpotId}/unpark`, {
        method: "POST"
      });
      if (response.ok) {
        await fetchSpots();
        setToastMessage(`Éxito: Cupo ${selectedSpotId} ha sido liberado.`);
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAction(false);
    }
  };

  // Metrics calculation
  const totalSpots = spots.length;
  const occupiedSpots = spots.filter(s => s.status === "occupied").length;
  const freeSpots = spots.filter(s => s.status === "available").length;
  const guestSpotsCount = spots.filter(s => s.status === "guest").length;

  const currentQuadrantSpots = spots.filter(s => s.quadrant === activeQuadrant);

  // Find currently selected spot detailed data
  const selectedSpotDetails = spots.find(s => s.id === selectedSpotId);

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex flex-col font-sans">
      
      {/* Top Header Panel */}
      <header className="fixed top-0 left-0 w-full z-50 h-16 bg-white border-b border-[#c5c6cd]/50 flex justify-between items-center px-6 shadow-xs">
        <div className="flex items-center gap-6">
          <button 
            type="button"
            onClick={handleLogoClick}
            className="flex items-center gap-2 text-left focus:outline-none group active:scale-95 transition-transform"
          >
            <div className={`h-8 w-8 rounded-lg bg-[#002f6c] border border-[#ffa400]/40 flex items-center justify-center text-[#ffa400] font-black text-base transition-transform duration-700 ${logoSpin ? "rotate-[360deg] scale-110" : "group-hover:scale-105"}`}>D</div>
            <span className="font-bold text-[#091426] tracking-tight group-hover:text-[#2170e4] transition-colors">Duoc UC Parking</span>
          </button>
          <span className="hidden md:inline text-xs font-semibold px-3 py-1 bg-gray-100 rounded-full text-gray-500 uppercase tracking-wider">
            Consola Operaciones
          </span>
        </div>

        <div className="flex items-center gap-5">
          <button className="p-2 hover:bg-slate-50 text-red-500 rounded-xl font-bold text-xs flex items-center gap-1.5" onClick={onLogout}>
            <Lock className="h-4 w-4" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>
          
          <div className="h-8 w-8 rounded-full overflow-hidden border border-gray-200">
            <img 
              alt="Operations Director Profile" 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer"
              src="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=150"
            />
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <div className="flex h-screen pt-16 overflow-hidden">
        
        {/* Left Nav (Simulated matches dashboard style) */}
        <aside className="hidden lg:flex flex-col w-64 bg-[#091426] text-white py-6 flex-shrink-0 z-30">
          <div className="px-6 pb-6 mb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#2170e4] text-white rounded-lg">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold">Admin Central</h2>
                <p className="text-[10px] text-[#adc6ff]">Planificación Estratégica</p>
              </div>
            </div>
          </div>

          <nav className="flex-grow space-y-1 px-3">
            <a className="flex items-center gap-3 py-3 px-4 bg-[#2170e4] text-white rounded-xl font-semibold text-xs transition-all" href="#overview">
              <ToggleLeft className="h-4 w-4" />
              <span>Dashboard General</span>
            </a>
            <div className="p-4 rounded-xl bg-white/5 border border-white/5 mx-2 text-[11px] text-gray-300 leading-relaxed">
              <span className="block font-bold text-[#adc6ff] uppercase tracking-wider mb-1.5">Directrices de Rol:</span>
              Como Administrador, tienes permisos para reservar o bloquear cuadrantes completos y generar reportes predictivos.
            </div>
          </nav>

          <div className="px-6 text-[10px] text-gray-400">
            Último Login: {new Date().toLocaleDateString()}
          </div>
        </aside>

        {/* Dynamic Center Panel */}
        <main className="flex-grow overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#f8f9ff]">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* Dashboard Subheader */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-[#091426] tracking-tight">Dirección General</h1>
                <p className="text-sm text-[#45474c] mt-0.5">Gestión de Operaciones — Sede Maipú (Duoc UC)</p>
              </div>

              <div className="flex gap-3">
                <div className="bg-white border border-[#c5c6cd]/40 px-4 py-2 rounded-xl flex items-center gap-2 shadow-xs">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-extrabold text-[#75777d] uppercase tracking-wider">Estado Sistema</span>
                    <span className="text-xs font-bold text-[#2170e4] flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      OPERATIVO / ONLINE
                    </span>
                  </div>
                </div>

                <div className="bg-white border border-[#c5c6cd]/40 px-4 py-2 rounded-xl flex items-center gap-2 shadow-xs">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-extrabold text-[#75777d] uppercase tracking-wider">Sincronización</span>
                    <span className="text-xs font-bold text-[#091426] mt-0.5">Auto-refresh (3s)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Premium Metrics Overview Panels */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Green Card - Disponibles */}
              <div className="bg-white border border-[#c5c6cd]/30 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-green-600 block mb-1">✓ Disponibles</span>
                  <p className="text-3xl font-extrabold text-green-700 font-mono tracking-tight">{freeSpots}</p>
                </div>
                <span className="text-[10px] text-gray-400 mt-2 block font-medium">Libres para uso alumno</span>
              </div>

              {/* Blue Card - Ocupados */}
              <div className="bg-white border border-[#c5c6cd]/30 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#091426] block mb-1">🚙 Ocupados</span>
                  <p className="text-3xl font-extrabold text-[#091426] font-mono tracking-tight">{occupiedSpots}</p>
                </div>
                <span className="text-[10px] text-gray-400 mt-2 block font-medium">Vehículos detectados</span>
              </div>

              {/* Amber Card - Invitados */}
              <div className="bg-white border border-[#c5c6cd]/30 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-600 block mb-1">⭐ Invitados Activos</span>
                  <p className="text-3xl font-extrabold text-amber-700 font-mono tracking-tight">{guestSpotsCount}</p>
                </div>
                <span className="text-[10px] text-gray-400 mt-2 block font-medium">Pases de visita vigentes</span>
              </div>

              {/* Total Card */}
              <div className="bg-white border border-[#c5c6cd]/30 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#2170e4] block mb-1">📊 Capacidad Total</span>
                  <p className="text-3xl font-extrabold text-[#091426] font-mono tracking-tight">{totalSpots}</p>
                </div>
                <span className="text-[10px] text-[#2170e4] font-bold mt-2 block hover:underline cursor-pointer" onClick={handleLogoClick}>
                  ↻ Forzar Recarga
                </span>
              </div>
            </div>

            {/* Content grids */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Virtual map widget */}
              <div className="lg:col-span-8 space-y-6">
                
                <div className="bg-white border border-[#c5c6cd]/40 rounded-2xl p-6 shadow-xs space-y-6">
                  
                  <div className="flex justify-between items-center pb-4 border-b border-[#c5c6cd]/20">
                    <div className="flex items-center gap-2.5">
                      <Layers className="h-5 w-5 text-[#2170e4]" />
                      <h3 className="font-bold text-sm text-[#091426]">Vigilancia Espacial — Plano Sede Maipú</h3>
                    </div>
 
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-[#45474c]">Filtro de Sector:</span>
                      <select 
                        className="bg-[#eff4ff] border border-[#c5c6cd]/80 rounded-xl px-3 py-1.5 text-xs font-semibold text-[#091426] outline-none"
                        value={activeQuadrant}
                        onChange={(e) => {
                          setActiveQuadrant(e.target.value as any);
                          setSelectedSpotId(null);
                        }}
                      >
                        <option value="A">Sector A (Acceso Norte)</option>
                        <option value="B">Sector B (Campus Central)</option>
                        <option value="C">Sector C (Zona de Entrada)</option>
                        <option value="D">Sector D (Preferencial / EV)</option>
                      </select>
                    </div>
                  </div>
 
                  {/* Visual Map Layout */}
                  <div className="p-6 bg-slate-100 rounded-2xl border border-[#c5c6cd]/30 min-h-[380px] flex flex-col justify-between relative group">
                    
                    {currentQuadrantSpots.length === 0 ? (
                       <div className="flex-1 flex items-center justify-center text-gray-400 text-xs">
                        Cargando cuadrantes...
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-6 md:grid-cols-10 gap-2.5">
                          {currentQuadrantSpots.map(spot => {
                            const isOccupied = spot.status === "occupied";
                            const isGuest = spot.status === "guest";
                            const isSelected = spot.id === selectedSpotId;
 
                            let colorClass = "bg-[#ecfdf5] hover:bg-[#d1fae5] border-[#a7f3d0] text-[#065f46]"; // default available green style
                            if (isOccupied) {
                              colorClass = "bg-[#091426] hover:bg-[#111e30] border-[#091426] text-white opacity-90";
                            } else if (isGuest) {
                              colorClass = "bg-amber-50 hover:bg-amber-100/60 border-amber-300 text-amber-700";
                            }
 
                            if (isSelected) {
                              colorClass += " ring-4 ring-offset-2 ring-[#2170e4] scale-102 transition-all";
                            }
 
                            return (
                              <button
                                key={spot.id}
                                className={`h-11 w-full rounded-lg text-[10px] font-bold border flex flex-col items-center justify-center cursor-pointer transition-all ${colorClass}`}
                                onClick={() => handleSpotClick(spot.id)}
                              >
                                <span>{spot.id.split("-")[1]}</span>
                                <span className="text-[8px] opacity-60 font-mono">
                                  {isOccupied ? "Ocu" : (isGuest ? "Invit" : "Lib")}
                                </span>
                              </button>
                            );
                          })}
                        </div>
 
                        {/* Map bottom legend banner */}
                        <div className="flex flex-wrap gap-4 mt-6 p-3.5 bg-white/90 backdrop-blur-md rounded-xl border border-[#c5c6cd]/30 shadow-xs max-w-max mx-auto text-[10px] font-bold text-gray-600 justify-center">
                          <div className="flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-md border border-[#a7f3d0] bg-[#ecfdf5]" />
                            <span>Disponible (Libre)</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-md border border-[#091426] bg-[#091426]" />
                            <span>Ocupado (Vehículo)</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-md border border-amber-300 bg-amber-50" />
                            <span>Invitado (Pase Sede)</span>
                          </div>
                        </div>
                      </>
                    )}

                  </div>

                </div>

                {/* --- HU-04 AI trends card panel under layout map --- */}
                <div className="bg-[#091426] text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
                  
                  {/* Decorative AI engine element design */}
                  <div className="absolute top-0 right-0 p-8 opacity-15">
                    <Sparkles className="h-32 w-32 text-blue-400" />
                  </div>

                  <div className="relative z-10 space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                      
                      <div className="flex items-center gap-2.5">
                        <Sparkles className="h-5 w-5 text-blue-400" />
                        <h4 className="font-bold text-base tracking-tight">AI Trends & Projections [Gemini Engine]</h4>
                      </div>

                      <button
                        className="px-5 py-2 bg-[#2170e4] hover:bg-blue-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md shadow-blue-500/10 self-start"
                        disabled={loadingReport}
                        onClick={handleGenerateAiReport}
                      >
                        {loadingReport ? (
                          <>
                            <div className="h-3.5 w-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            <span>Procesando...</span>
                          </>
                        ) : (
                          <>
                            <span>Generar Reporte Integral</span>
                            <Play className="h-3.5 w-3.5 fill-current" />
                          </>
                        )}
                      </button>

                    </div>

                    {/* Report Output Content Area */}
                    <div className="bg-[#091426]/60 border border-white/10 rounded-xl p-5 min-h-[220px] shadow-inner">
                      {loadingReport ? (
                        <div className="py-12 text-center space-y-4">
                          <div className="h-8 w-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto" />
                          <p className="text-xs text-blue-400 animate-pulse font-medium">{reportStep}</p>
                        </div>
                      ) : aiReport ? (
                        <div className="space-y-4 prose prose-invert font-sans max-w-none text-white select-text">
                          {renderFormattedReport(aiReport)}
                          {isAiMock && (
                            <div className="mt-4 pt-3 border-t border-white/10 text-[10px] text-gray-400 text-right font-semibold uppercase tracking-wider">
                              * Simulado localmente por seguridad
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="py-12 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
                          <Inbox className="h-8 w-8 text-gray-500" />
                          <p className="text-xs max-w-xs mx-auto leading-relaxed">
                            No se ha generado ningún análisis hoy. Presiona el botón superior para realizar un escaneo en vivo con el motor Gemini AI.
                          </p>
                        </div>
                      )}
                    </div>

                  </div>

                </div>

              </div>

              {/* Right Side bar: Spot Control Manual Actions & Indicators */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Manual control panel card */}
                <div className="bg-white border border-[#c5c6cd]/40 rounded-2xl p-6 shadow-xs space-y-5">
                  <div className="flex justify-between items-center pb-3 border-b border-[#c5c6cd]/25">
                    <h3 className="font-bold text-sm text-[#091426]">Spot Control</h3>
                    <span className="font-mono text-xs font-bold text-[#2170e4] bg-[#eff4ff] px-2.5 py-1 rounded-full uppercase">
                      {selectedSpotDetails ? `#${selectedSpotDetails.id}` : "#SELECT"}
                    </span>
                  </div>

                  {/* Isometric Top-down illustrative area matches references */}
                  <div className="aspect-video w-full rounded-xl bg-slate-300 overflow-hidden relative border border-slate-200">
                    <img 
                      alt="Facility overhead illustration placeholder" 
                      className="w-full h-full object-cover opacity-85" 
                      referrerPolicy="no-referrer"
                      src="https://images.unsplash.com/photo-1506521788701-1e13a7ea0ded?q=80&w=400"
                    />
                    <div className="absolute inset-0 bg-[#091426]/10 flex items-center justify-center">
                      <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-white/80 bg-black/50 px-3 py-1 bg-clip-padding rounded">Overhead Cam - Live</span>
                    </div>
                  </div>

                  {/* Spot attributes details lines */}
                  <div className="text-xs space-y-3 leading-relaxed text-gray-600">
                    <div className="flex justify-between pb-1.5 border-b border-[#c5c6cd]/15">
                      <span>Estado Actual</span>
                      <strong className={`font-bold uppercase ${
                        selectedSpotDetails?.status === "available" 
                          ? "text-green-600" 
                          : selectedSpotDetails?.status === "guest" 
                            ? "text-amber-600" 
                            : selectedSpotDetails?.status === "occupied" 
                              ? "text-slate-900" 
                              : "text-gray-400"
                      }`}>
                        {selectedSpotDetails?.status === "available" 
                          ? "✓ Disponible" 
                          : selectedSpotDetails?.status === "guest" 
                            ? "⭐ Invitado Sede" 
                            : selectedSpotDetails?.status === "occupied" 
                              ? "🚙 Ocupado" 
                              : "Sin Selección"}
                      </strong>
                    </div>
                    <div className="flex justify-between pb-1.5 border-b border-[#c5c6cd]/15">
                      <span>Ocupante</span>
                      <span className="text-gray-900 truncate max-w-[150px] text-right font-semibold">
                        {selectedSpotDetails?.occupant || "Ninguno (Vacante)"}
                      </span>
                    </div>
                    <div className="flex justify-between pb-1.5 border-b border-[#c5c6cd]/15">
                      <span>Tiempo Estadía</span>
                      <span className="text-gray-900 font-mono font-semibold">
                        {selectedSpotDetails?.duration || "---"}
                      </span>
                    </div>
                  </div>

                  {/* Trigger overrides action buttons (Dynamic Based on Spot State) */}
                  <div className="pt-1.5">
                    {!selectedSpotDetails ? (
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          className="flex flex-col items-center justify-center p-3.5 bg-gray-50 text-gray-400 border border-gray-150 rounded-xl font-bold text-xs cursor-not-allowed opacity-50"
                          disabled
                        >
                          <BookMarked className="h-4.5 w-4.5 mb-1.5" />
                          <span>Reservar</span>
                        </button>
                        <button
                          type="button"
                          className="flex flex-col items-center justify-center p-3.5 bg-gray-50 text-gray-400 border border-gray-150 rounded-xl font-bold text-xs cursor-not-allowed opacity-50"
                          disabled
                        >
                          <Sparkles className="h-4.5 w-4.5 mb-1.5" />
                          <span>Invitado</span>
                        </button>
                      </div>
                    ) : selectedSpotDetails.status === "available" ? (
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          className="flex flex-col items-center justify-center p-3.5 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#2170e4] border border-[#dce9ff] rounded-xl font-bold text-xs transition-all active:scale-95 disabled:opacity-40"
                          disabled={loadingAction}
                          onClick={handleReserveSpot}
                        >
                          <BookMarked className="h-4.5 w-4.5 mb-1.5 text-[#2170e4]" />
                          <span>Reservar</span>
                        </button>
                        
                        <button
                          type="button"
                          className="flex flex-col items-center justify-center p-3.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl font-bold text-xs transition-all active:scale-95 disabled:opacity-40"
                          disabled={loadingAction}
                          onClick={handleBlockSpot}
                        >
                          <Sparkles className="h-4.5 w-4.5 mb-1.5 text-amber-600 animate-pulse" />
                          <span>Reg. Invitado</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs transition-all active:scale-95 disabled:opacity-40"
                        disabled={loadingAction}
                        onClick={handleUnparkSpot}
                      >
                        <RefreshCw className="h-4.5 w-4.5 text-rose-600 animate-spin-slow" />
                        <span>Liberar Cupo / Unpark</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick stats panel */}
                <div className="bg-white border border-[#c5c6cd]/40 rounded-2xl p-5 shadow-xs space-y-4">
                  <h4 className="text-[10px] font-extrabold uppercase text-[#75777d] tracking-wider">Quick Monitor</h4>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#eff4ff] flex items-center justify-center text-[#2170e4]">
                        <CircleDollarSign className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-[#75777d] uppercase">Daily Revenue</div>
                        <div className="text-sm font-bold text-[#091426] tracking-tight">$12,450.00 CLP</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
                        <Zap className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-[#75777d] uppercase">EV Stations Active</div>
                        <div className="text-sm font-bold text-[#091426] tracking-tight">12 / 15 Stations</div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </div>
        </main>

      </div>
      
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#091426] text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 border border-[#ffa400]/25 animate-fadeIn font-sans max-w-sm">
          <div className="h-2 w-2 rounded-full bg-[#ffa400] animate-pulse" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
