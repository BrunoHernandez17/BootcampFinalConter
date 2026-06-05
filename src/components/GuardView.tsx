import React, { useState, useEffect } from "react";
import { Search, Bell, HelpCircle, Settings, LogOut, Shield, Map, Users, BarChart2, Terminal, Eye, ShieldCheck, Activity, EyeOff, CheckCircle, Car, Wrench, PlayCircle, RefreshCw } from "lucide-react";
import { Spot, ActivityLog } from "../types";

interface GuardViewProps {
  currentUser: { email: string; fullName: string };
  onLogout: () => void;
}

export default function GuardView({ currentUser, onLogout }: GuardViewProps) {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdateSec, setLastUpdateSec] = useState(2);
  const [simulatigCctv, setSimulatingCctv] = useState(false);
  const [currentCctvPlate, setCurrentCctvPlate] = useState("K-902-LX");

  // Custom interactive logo spin & sync notifier
  const [logoSpin, setLogoSpin] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New fully functional states for Guard's sub-panels and modal operations
  const [activeView, setActiveView] = useState<"panel" | "livemap" | "roles" | "analytics" | "logs">("panel");
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [alertsModalOpen, setAlertsModalOpen] = useState(false);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<"all" | "available" | "occupied" | "guest">("all");

  const handleLogoClick = async () => {
    setLogoSpin(true);
    await fetchData();
    setToastMessage("Sincronizado: Base de Datos de Sede Maipú Actualizada");
    setTimeout(() => {
      setLogoSpin(false);
    }, 850);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const [activeZoneFilter, setActiveZoneFilter] = useState<"ALL" | "A" | "B" | "C" | "D">("ALL");

  // Fetch full state from backend
  const fetchData = async () => {
    try {
      const resSpots = await fetch("/api/spots");
      const resLogs = await fetch("/api/logs");
      
      if (resSpots.ok && resLogs.ok) {
        const dataSpots = await resSpots.json();
        const dataLogs = await resLogs.json();
        setSpots(dataSpots);
        setLogs(dataLogs);
      }
    } catch (e) {
      console.error("Error loading guard telemetry:", e);
    }
  };

  useEffect(() => {
    fetchData();
    // Refresh states every 2.5s for real-time monitoring feel!
    const interval = setInterval(fetchData, 2500);

    // Keep dynamic counter updated
    const secTimer = setInterval(() => {
      setLastUpdateSec(prev => {
        if (prev >= 5) {
          return 0; // reset
        }
        return prev + 1;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(secTimer);
    };
  }, []);

  const handleSpotCardClick = (spot: Spot) => {
    setSelectedSpot(spot);
  };

  // Trigger simulated CCTV OCR license plate scan
  const triggerSimulatedOCR = async () => {
    setSimulatingCctv(true);
    try {
      const mockPlates = ["XG-4122", "K-902-LX", "BC-4921", "PL-4422", "TX-2110", "DL-9081", "HG-1290"];
      const nextPlate = mockPlates[Math.floor(Math.random() * mockPlates.length)];
      
      const response = await fetch("/api/utility/scan-plate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plate: nextPlate })
      });

      if (response.ok) {
        const result = await response.json();
        setCurrentCctvPlate(result.plate);
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => {
        setSimulatingCctv(false);
      }, 1000);
    }
  };

  // Unpark a spot (Guard / Portería override release)
  const handleUnparkSpot = async (spotId: string) => {
    if (!spotId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/spots/${spotId}/unpark`, {
        method: "POST"
      });
      if (response.ok) {
        setSelectedSpot(null);
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Send spot to maintenance (Guard override)
  const handleBlockSpot = async (spotId: string) => {
    if (!spotId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/spots/${spotId}/block`, {
        method: "POST"
      });
      if (response.ok) {
        setSelectedSpot(null);
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Perform full system state reset (Utility)
  const handleResetTelemetry = async () => {
    if (!confirm("¿Deseas restaurar la base de datos de estacionamiento al estado inicial de referencia?")) return;
    try {
      const res = await fetch("/api/utility/reset", { method: "POST" });
      if (res.ok) {
        await fetchData();
        setSelectedSpot(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Calculate live statistics
  const totalSpots = spots.length;
  const availableCount = spots.filter(s => s.status === "available").length;
  const occupiedCount = spots.filter(s => s.status === "occupied").length;
  const guestCount = spots.filter(s => s.status === "guest").length;

  // Filter spots on grid based on search bar ID, Quadrant filter, and status filter
  const searchedSpots = spots.filter(spot => {
    const matchesSearch = spot.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          spot.number.toString().includes(searchQuery);
    
    const matchesQuadrant = activeZoneFilter === "ALL" ? true : spot.quadrant === activeZoneFilter;
    const matchesStatus = selectedStatusFilter === "all" ? true : spot.status === selectedStatusFilter;

    return matchesSearch && matchesQuadrant && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex flex-col font-sans">
      
      {/* Dynamic Header */}
      <header className="fixed top-0 left-0 w-full z-50 h-16 bg-white border-b border-[#c5c6cd]/50 flex justify-between items-center px-6 shadow-xs">
        <div className="flex items-center gap-8">
          <button 
            type="button"
            onClick={handleLogoClick}
            className="flex items-center gap-2 text-left focus:outline-none group active:scale-95 transition-transform"
          >
            <div className={`h-8 w-8 rounded-lg bg-[#002f6c] border border-[#ffa400]/40 flex items-center justify-center text-[#ffa400] font-black text-base transition-transform duration-700 ${logoSpin ? "rotate-[360deg] scale-110" : "group-hover:scale-105"}`}>D</div>
            <span className="font-bold text-lg text-[#091426] tracking-tight group-hover:text-[#2170e4] transition-colors">Duoc UC Parking</span>
          </button>

          <nav className="hidden md:flex gap-6 text-sm font-semibold">
            <button 
              type="button"
              className={`py-5 px-1 transition-colors border-b-2 font-semibold ${activeView === "panel" ? "text-[#2170e4] border-[#2170e4]" : "text-[#45474c] hover:text-[#0b1c30] border-transparent"}`} 
              onClick={() => {
                setActiveView("panel");
                setToastMessage("Vista: Monitor en vivo de Estacionamientos");
                setTimeout(() => setToastMessage(null), 2500);
              }}
            >
              Live Monitoring
            </button>
            <button 
              type="button"
              className="text-[#45474c] hover:text-[#0b1c30] transition-colors py-5 px-1 font-semibold" 
              onClick={() => setAlertsModalOpen(true)}
            >
              Alertas
            </button>
            <button 
              type="button"
              className={`py-5 px-1 transition-colors border-b-2 font-semibold ${activeView === "analytics" ? "text-[#2170e4] border-[#2170e4]" : "text-[#45474c] hover:text-[#0b1c30] border-transparent"}`} 
              onClick={() => {
                setActiveView("analytics");
                setToastMessage("Vista: Ocupabilidad histórica de Sede Maipú");
                setTimeout(() => setToastMessage(null), 2500);
              }}
            >
              Ocupabilidad histórica
            </button>
          </nav>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-5">
          <div className="relative hidden lg:block">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#75777d]" />
            <input 
              className="bg-[#eff4ff] border border-[#c5c6cd]/60 rounded-xl pl-10 pr-4 py-2 w-64 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#2170e4] focus:border-[#2170e4] transition-all placeholder-gray-400"
              placeholder="Buscar por ID (ej. A-12, G-102)..."
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (activeView !== "panel") {
                  setActiveView("panel");
                }
              }}
            />
          </div>

          <div className="flex items-center gap-3 text-[#75777d]">
            <button 
              className="p-2 hover:bg-[#eff4ff] rounded-xl transition-all relative"
              onClick={() => setAlertsModalOpen(true)}
              title="Ver bitácora de alertas de seguridad"
            >
              <Bell className="h-5 w-5 text-[#0b1c30]" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 border border-white" />
            </button>
            <button 
              className="p-2 hover:bg-[#eff4ff] rounded-xl transition-all hidden sm:block"
              onClick={() => setHelpModalOpen(true)}
              title="Manual de procedimientos y ayuda rápida"
            >
              <HelpCircle className="h-5 w-5" />
            </button>
            <button 
              className="p-2 hover:bg-red-50 text-red-500 rounded-xl transition-all flex items-center gap-1 text-xs font-bold"
              onClick={onLogout}
            >
              <LogOut className="h-4.5 w-4.5" />
              <span className="hidden md:inline">Salir</span>
            </button>
            
            <div className="h-8 w-8 rounded-full overflow-hidden border border-[#c5c6cd]/80 ml-2">
              <img 
                alt="Supervisor Profile Portrait" 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Screen Layout Container */}
      <div className="flex h-screen pt-16 overflow-hidden">
        
        {/* Persistent Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 bg-[#091426] text-white py-6 flex-shrink-0 z-30">
          <div className="px-6 pb-6 mb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <Shield className="h-5 w-5 text-[#adc6ff]" />
              </div>
              <div>
                <h2 className="text-sm font-bold">Admin Central</h2>
                <p className="text-[10px] text-gray-400">Control de Accesos & CCTVs</p>
              </div>
            </div>
          </div>

          <nav className="flex-grow space-y-1 px-3">
            <button 
              type="button"
              className={`w-full flex items-center gap-3 py-3 px-4 font-semibold text-xs rounded-xl transition-all text-left ${activeView === "panel" ? "bg-[#2170e4] text-white shadow-sm" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
              onClick={() => setActiveView("panel")}
            >
              <Activity className="h-4 w-4" />
              <span>Panel Operativo</span>
            </button>
            <button 
              type="button"
              className={`w-full flex items-center gap-3 py-3 px-4 font-semibold text-xs rounded-xl transition-all text-left ${activeView === "livemap" ? "bg-[#2170e4] text-white shadow-sm" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
              onClick={() => setActiveView("livemap")}
            >
              <Map className="h-4 w-4" />
              <span>Gráfica de Mapa</span>
            </button>
            <button 
              type="button"
              className={`w-full flex items-center gap-3 py-3 px-4 font-semibold text-xs rounded-xl transition-all text-left ${activeView === "roles" ? "bg-[#2170e4] text-white shadow-sm" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
              onClick={() => setActiveView("roles")}
            >
              <Users className="h-4 w-4" />
              <span>Usuarios y Roles</span>
            </button>
            <button 
              type="button"
              className={`w-full flex items-center gap-3 py-3 px-4 font-semibold text-xs rounded-xl transition-all text-left ${activeView === "analytics" ? "bg-[#2170e4] text-white shadow-sm" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
              onClick={() => setActiveView("analytics")}
            >
              <BarChart2 className="h-4 w-4" />
              <span>Estadísticas</span>
            </button>
            <button 
              type="button"
              className={`w-full flex items-center gap-3 py-3 px-4 font-semibold text-xs rounded-xl transition-all text-left ${activeView === "logs" ? "bg-[#2170e4] text-white shadow-sm" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
              onClick={() => setActiveView("logs")}
            >
              <Terminal className="h-4 w-4" />
              <span>Logs del Servidor</span>
            </button>
          </nav>

          <div className="px-4 mt-auto space-y-2">
            <button 
              className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/15 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              onClick={handleResetTelemetry}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Restaurar Datos</span>
            </button>
            <div className="text-[10px] text-center text-gray-400 pt-2 border-t border-white/10">
              Duoc UC Parking • V1.4.0 (AI Shield)
            </div>
          </div>
        </aside>

        {/* --- Central Active Console (Scrollable) --- */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#f8f9ff]">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* Title and live status row */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-[#091426]">Panel de Monitoreo de Seguridad Sede Maipú</h1>
                <p className="text-sm text-[#45474c] mt-0.5">Control de Ramo & Vigilancia Activa • {totalSpots} Cupos Totales</p>
              </div>

              {/* Live Feeds Status */}
              <div className="flex gap-3">
                <div className="bg-white border border-[#c5c6cd]/40 px-4 py-2 rounded-xl flex items-center gap-2.5 shadow-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
                  <span className="font-mono text-xs font-bold text-[#0b1c30]">VIGILANCIA EN VIVO</span>
                </div>
                <div className="bg-white border border-[#c5c6cd]/40 px-4 py-2 rounded-xl flex items-center gap-2 shadow-xs">
                  <RefreshCw className="h-3.5 w-3.5 text-[#2170e4] animate-spin" style={{ animationDuration: '6s' }} />
                  <span className="font-mono text-xs font-bold text-[#45474c]">Actualizado: {lastUpdateSec}s atrás</span>
                </div>
              </div>
            </div>

            {/* Stats Counter Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              
              <button 
                type="button"
                className={`bg-white border p-5 rounded-2xl shadow-xs text-left transition-all active:scale-[0.98] ${selectedStatusFilter === "available" ? "border-green-500 ring-4 ring-green-100" : "border-[#c5c6cd]/40 hover:border-green-400"}`}
                onClick={() => {
                  setSelectedStatusFilter(prev => prev === "available" ? "all" : "available");
                  setActiveView("panel");
                }}
              >
                <div className="flex justify-between items-start text-[#75777d] mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider">DISPONIBLES</span>
                  <CheckCircle className="h-4.5 w-4.5 text-green-500" />
                </div>
                <p className="text-3xl font-extrabold text-green-600 font-mono tracking-tight">{availableCount}</p>
                <span className="text-[10px] text-[#45474c] block mt-1">
                  {selectedStatusFilter === "available" ? "★ Oprimir para resetear" : "Filtrar por Disponibles"}
                </span>
              </button>

              <button 
                type="button"
                className={`bg-white border p-5 rounded-2xl shadow-xs text-left transition-all active:scale-[0.98] ${selectedStatusFilter === "occupied" ? "border-[#2170e4] ring-4 ring-blue-100" : "border-[#c5c6cd]/40 hover:border-blue-400"}`}
                onClick={() => {
                  setSelectedStatusFilter(prev => prev === "occupied" ? "all" : "occupied");
                  setActiveView("panel");
                }}
              >
                <div className="flex justify-between items-start text-[#75777d] mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider">OCUPADOS</span>
                  <Car className="h-4.5 w-4.5 text-[#2170e4]" />
                </div>
                <p className="text-3xl font-extrabold text-[#091426] font-mono tracking-tight">{occupiedCount}</p>
                <span className="text-[10px] text-[#45474c] block mt-1">
                  {selectedStatusFilter === "occupied" ? "★ Oprimir para resetear" : "Filtrar por Ocupados"}
                </span>
              </button>

              <button 
                type="button"
                className={`bg-white border p-5 rounded-2xl shadow-xs text-left transition-all active:scale-[0.98] ${selectedStatusFilter === "guest" ? "border-yellow-400 ring-4 ring-yellow-100" : "border-[#c5c6cd]/40 hover:border-yellow-400"}`}
                onClick={() => {
                  setSelectedStatusFilter(prev => prev === "guest" ? "all" : "guest");
                  setActiveView("panel");
                }}
              >
                <div className="flex justify-between items-start text-[#75777d] mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider">INVITADOS</span>
                  <Users className="h-4.5 w-4.5 text-yellow-500" />
                </div>
                <p className="text-3xl font-extrabold text-yellow-500 font-mono tracking-tight">{guestCount}</p>
                <span className="text-[10px] text-[#45474c] block mt-1">
                  {selectedStatusFilter === "guest" ? "★ Oprimir para resetear" : "Filtrar por Invitados"}
                </span>
              </button>

              <button 
                type="button"
                className="bg-white border border-[#c5c6cd]/40 p-5 rounded-2xl shadow-xs text-left transition-all hover:bg-slate-50 active:scale-[0.98]"
                onClick={() => {
                  setSelectedStatusFilter("all");
                  setActiveZoneFilter("ALL");
                  setSearchQuery("");
                  setActiveView("panel");
                  setToastMessage("Filtros limpiados: mostrando todos los cupos");
                  setTimeout(() => setToastMessage(null), 2500);
                }}
              >
                <div className="flex justify-between items-start text-[#75777d] mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider">CAPACIDAD TOTAL</span>
                  <ShieldCheck className="h-4.5 w-4.5 text-blue-500" />
                </div>
                <p className="text-3xl font-extrabold text-[#091426] font-mono tracking-tight">{totalSpots}</p>
                <span className="text-[10px] text-red-500 font-bold block mt-1">✕ Resetear Filtros</span>
              </button>

            </div>

            {/* Master Content Layout: 110 Grid & Guard Right controls */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Console Element: Dynamic grid representing 110 spots or alternative views */}
              <div className="lg:col-span-8 bg-white border border-[#c5c6cd]/40 rounded-2xl shadow-xs overflow-hidden">
                
                {activeView === "panel" && (
                  <>
                    {/* Grid header filters bar */}
                    <div className="p-4 bg-[#eff4ff] border-b border-[#c5c6cd]/40 flex flex-col sm:flex-row gap-4 justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-[#dce9ff] text-[#2170e4] rounded-lg">
                          <Terminal className="h-4.5 w-4.5 font-bold" />
                        </div>
                        <span className="font-bold text-sm text-[#091426]">Representación Gráfica (110 Cupos)</span>
                      </div>

                      {/* Filter Pills of Quadrants */}
                      <div className="flex gap-1.5 overflow-x-auto max-w-full">
                        {(["ALL", "A", "B", "C", "D"] as const).map(quad => (
                          <button
                            key={quad}
                            type="button"
                            className={`px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-lg border transition-all ${
                              activeZoneFilter === quad 
                                ? "bg-[#091426] text-white border-[#091426]"
                                : "bg-white text-gray-500 border-[#c5c6cd]/40 hover:bg-slate-50"
                            }`}
                            onClick={() => setActiveZoneFilter(quad)}
                          >
                            {quad === "ALL" ? "Todos" : `Zona ${quad}`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Representación de Cupos */}
                    <div className="p-5 overflow-y-auto max-h-[560px] cursor-default custom-scrollbar">
                      <div className="grid grid-cols-5 md:grid-cols-10 xl:grid-cols-11 gap-2.5">
                        {searchedSpots.map(spot => {
                          const isOccupied = spot.status === "occupied";
                          const isGuest = spot.status === "guest";
                          const isSelected = selectedSpot?.id === spot.id;

                          let colorClass = "bg-green-50 border-green-300 text-green-700 hover:border-green-500 hover:bg-green-100/50";
                          let iconLabel = "✓";
                          let indicatorColor = "bg-green-500";
                          
                          if (isOccupied) {
                            colorClass = "bg-red-50 border-red-300 text-red-700 hover:border-red-500 hover:bg-red-100/50";
                            iconLabel = "🚙";
                            indicatorColor = "bg-red-500 animate-pulse";
                          } else if (isGuest) {
                            colorClass = "bg-yellow-50 border-yellow-300 text-yellow-700 hover:border-yellow-500 hover:bg-yellow-105/50";
                            iconLabel = "⭐";
                            indicatorColor = "bg-yellow-400";
                          }

                          if (isSelected) {
                            colorClass += " ring-4 ring-[#2170e4] ring-offset-2 scale-105 z-10 transition-all";
                          }

                          return (
                            <button
                              key={spot.id}
                              type="button"
                              className={`h-16 w-full border rounded-xl flex flex-col items-center justify-center relative group transition-all font-mono shadow-inner text-left focus:outline-none ${colorClass}`}
                              title={`Cupo ${spot.id} • ${spot.status.toUpperCase()}`}
                              onClick={() => handleSpotCardClick(spot)}
                            >
                              <span className="text-[9px] font-bold opacity-60 tracking-tight leading-none mb-1">{spot.id}</span>
                              <span className="text-xs font-bold leading-none">{iconLabel}</span>
                              
                              {/* Indicator badge inner dot */}
                              <span className={`w-1.5 h-1.5 rounded-full absolute top-1 right-1 ${indicatorColor}`} />
                              
                              {/* Custom smart tooltip content */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[9px] py-1 px-2 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 mb-1 leading-snug shadow-md">
                                Cupo: #{spot.number}<br />
                                Sector: {spot.quadrant}<br />
                                {spot.occupant ? `Ocupante: ${spot.occupant}` : 'Estado: Disponible'}
                              </div>
                            </button>
                          );
                        })}

                        {searchedSpots.length === 0 && (
                          <div className="col-span-full py-16 text-center text-gray-400 text-sm">
                            Ningún cupo coincide con tu búsqueda o zona actual.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 border-t border-[#c5c6cd]/40 text-[11px] text-gray-400 flex flex-wrap gap-x-6 gap-y-2 justify-center">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-md bg-green-100 border border-green-300" />
                        <span>Disponible / Liberado (Verde)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-md bg-red-100 border border-red-300" />
                        <span>Vehículo Estacionado / Ocupado (Rojo)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-md bg-yellow-100 border border-yellow-300" />
                        <span>Registrado como Invitado (Amarillo)</span>
                      </div>
                    </div>
                  </>
                )}

                {activeView === "livemap" && (
                  <div className="p-6 space-y-6">
                    <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                      <div>
                        <h3 className="font-bold text-base text-[#091426]">Distribución Espacial de Sede Maipú</h3>
                        <p className="text-xs text-gray-400">Haz clic sobre cualquier sector para filtrar y abrir sus cupos individuales.</p>
                      </div>
                      <span className="text-xs bg-[#eff4ff] text-[#2170e4] font-bold px-3 py-1 rounded-full uppercase">Plano Esquemático</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(["A", "B", "C", "D"] as const).map(zone => {
                        const zoneSpots = spots.filter(s => s.quadrant === zone);
                        const zoneOcc = zoneSpots.filter(s => s.status === "occupied").length;
                        const zoneAvailable = zoneSpots.filter(s => s.status === "available").length;
                        const zoneGuest = zoneSpots.filter(s => s.status === "guest").length;
                        const pct = Math.round((zoneOcc / zoneSpots.length) * 100);

                        return (
                          <button
                            key={zone}
                            type="button"
                            className="bg-slate-50 hover:bg-[#eff4ff] border border-gray-150 hover:border-[#2170e4]/60 p-5 rounded-2xl text-left transition-all group focus:outline-none"
                            onClick={() => {
                              setActiveZoneFilter(zone);
                              setActiveView("panel");
                              setToastMessage(`Filtrado por Sector ${zone}`);
                              setTimeout(() => setToastMessage(null), 2500);
                            }}
                          >
                            <div className="flex justify-between items-center mb-3">
                              <span className="w-8 h-8 rounded-full bg-[#091426] text-white flex items-center justify-center font-bold text-sm">
                                {zone}
                              </span>
                              <span className="text-xs text-[#2170e4] font-bold group-hover:underline">Inspeccionar Sector →</span>
                            </div>

                            <p className="font-bold text-sm text-gray-800">Sector {zone} - Estacionamiento General</p>
                            <p className="text-xs text-gray-400 mb-4">{zoneSpots.length} Cupos Totales de Operación</p>

                            <div className="space-y-1.5 text-xs text-gray-600">
                              <div className="flex justify-between">
                                <span>Disponibles:</span>
                                <span className="font-bold text-green-600 font-mono">{zoneAvailable}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Invitados:</span>
                                <span className="font-bold text-yellow-600 font-mono">{zoneGuest}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Ocupación:</span>
                                <span className="font-bold text-[#091426] font-mono">{zoneOcc} de {zoneSpots.length}</span>
                              </div>
                            </div>

                            {/* Simulated custom bar indicator */}
                            <div className="w-full bg-gray-200 h-2 rounded-full mt-4 overflow-hidden">
                              <div className="bg-[#2170e4] h-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeView === "roles" && (
                  <div className="p-6 space-y-6">
                    <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                      <div>
                        <h3 className="font-bold text-base text-[#091426]">Personal de Seguridad Sede Maipú</h3>
                        <p className="text-xs text-gray-400">Personal activo en turno con canal directo de radio.</p>
                      </div>
                      <span className="text-xs bg-green-50 text-green-600 border border-green-200 font-bold px-3 py-1 rounded-full uppercase">Estación Activa</span>
                    </div>

                    <div className="divide-y divide-gray-100">
                      {[
                        { name: "Patricio Almonacid", role: "Jefe de Grupo / Sede Maipú", phone: "+56 9 8452 1102", radio: "CH-16", status: "En Caseta Principal" },
                        { name: currentUser.fullName, role: "Supervisor del Turno (Tú)", phone: currentUser.email, radio: "CH-09", status: "Sesión Activa" },
                        { name: "Andrés Fuenzalida", role: "Ronda Estacionamiento Sector A/B", phone: "+56 9 7351 9021", radio: "CH-02", status: "Patrullando" },
                        { name: "Camila Vergara", role: "Operador CCTV Portería", phone: "+56 9 9122 0092", radio: "CH-12", status: "En Central" }
                      ].map((u, i) => (
                        <div key={i} className="py-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                          <div>
                            <p className="font-extrabold text-sm text-[#091426] flex items-center gap-2">
                              {u.name}
                              {u.name === currentUser.fullName && (
                                <span className="bg-blue-105 text-blue-800 text-[9px] font-bold px-1.5 py-0.5 rounded-sm">TÚ</span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500">{u.role} • Frecuencia: <span className="font-mono font-bold text-[#2170e4]">{u.radio}</span></p>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] bg-slate-100 font-bold px-2 py-1 rounded text-gray-700">{u.status}</span>
                            <button
                              type="button"
                              className="px-3 py-1.5 bg-[#eff4ff] hover:bg-[#2170e4] text-[#2170e4] hover:text-white rounded-lg text-[11px] font-bold transition-all active:scale-95"
                              onClick={() => {
                                setToastMessage(`Radio Transmisora: Contactando a ${u.name} por ${u.radio}...`);
                                setTimeout(() => setToastMessage(null), 3000);
                              }}
                            >
                              Llamar Radio
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeView === "analytics" && (
                  <div className="p-6 space-y-6">
                    <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                      <div>
                        <h3 className="font-bold text-base text-[#091426]">Estadísticas de Ocupabilidad Sede Maipú</h3>
                        <p className="text-xs text-gray-400">Analítica de rendimiento y picos de tráfico de alumnos.</p>
                      </div>
                      <span className="text-xs bg-purple-50 text-purple-600 font-bold px-3 py-1 rounded-full uppercase">Tendencia Semanal</span>
                    </div>

                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 bg-slate-50 rounded-xl border border-gray-150">
                          <p className="text-xs text-gray-400 font-semibold">Tasa Ocupación Promover</p>
                          <p className="text-2xl font-extrabold mt-1 font-mono tracking-tight text-[#091426]">84.2%</p>
                          <span className="text-[10px] text-green-500 block">✓ Dentro de límite sugerido</span>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl border border-gray-150">
                          <p className="text-xs text-gray-400 font-semibold">Tiempo Medio Estadía</p>
                          <p className="text-2xl font-extrabold mt-1 font-mono tracking-tight text-[#091426]">3h 42m</p>
                          <span className="text-[10px] text-gray-400 block font-semibold">Promedio Alumno Diurno</span>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl border border-gray-150">
                          <p className="text-xs text-gray-400 font-semibold">Previsión Hora Pico</p>
                          <p className="text-2xl font-extrabold mt-1 font-mono tracking-tight text-yellow-600">18:30 hrs</p>
                          <span className="text-[10px] text-red-500 font-bold block">🚨 Llegada Alumnos Vespertinos</span>
                        </div>
                      </div>

                      {/* Manual mock bar graph made beautifully with Tailwind */}
                      <div className="p-4 bg-white border border-gray-150 rounded-2xl">
                        <h4 className="text-xs font-bold text-gray-700 mb-4">Uso de Estacionamiento por Hora (Hoy en Sede Maipú)</h4>
                        <div className="space-y-3.5">
                          {[
                            { hour: "08:00 - Alumnos Diurnos", percentage: 70, label: "70% Ocupado" },
                            { hour: "11:30 - Hora Peak Diurna", percentage: 92, label: "92% Ocupado" },
                            { hour: "14:00 - Cambio de Jornada", percentage: 45, label: "45% Ocupado" },
                            { hour: "18:30 - Alumnos Vespertinos", percentage: 96, label: "96% Ocupado" },
                            { hour: "21:30 - Salida de Clases", percentage: 30, label: "30% Ocupado" }
                          ].map((bar, i) => (
                            <div key={i} className="space-y-1">
                              <div className="flex justify-between text-[11px] font-semibold text-gray-600 font-sans">
                                <span>{bar.hour}</span>
                                <span className="font-mono text-gray-800">{bar.label}</span>
                              </div>
                              <div className="w-full bg-[#eff4ff] h-2.5 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all ${bar.percentage > 90 ? "bg-red-500" : bar.percentage > 60 ? "bg-[#2170e4]" : "bg-green-500"}`}
                                  style={{ width: `${bar.percentage}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {activeView === "logs" && (
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                      <div>
                        <h3 className="font-bold text-base text-[#091426]">Consola Auditoría de Portería</h3>
                        <p className="text-xs text-gray-400">Verificador técnico de ingresos/salidas.</p>
                      </div>
                      <span className="font-mono text-xs bg-gray-900 text-green-400 px-3 py-1 rounded font-bold uppercase">SSH // ACTIVE</span>
                    </div>

                    <div className="bg-gray-900 rounded-xl p-4 font-mono text-[11px] text-gray-300 space-y-2 overflow-y-auto max-h-[350px] custom-scrollbar border border-white/5 shadow-inner">
                      <p className="text-green-400">[SYSTEM] Session initialized successfully at Sede Maipú</p>
                      <p className="text-gray-500">[DB] Loaded 110 spots telemetry in Cache Server</p>
                      <p className="text-gray-500">[CONN] Gateway API connected on secure terminal {window.location.host}</p>
                      {logs.map((log, i) => (
                        <p key={i}>
                          <span className="text-blue-400">[{log.timestamp}]</span> Spot <span className="text-yellow-400">{log.spotId}</span> changed configuration: <span className="text-white">{log.detail}</span>
                        </p>
                      ))}
                      <button
                        type="button"
                        className="text-green-400 hover:underline hover:text-green-300 cursor-pointer text-left block focus:outline-none w-full"
                        onClick={() => {
                          setToastMessage("SSH: Volcado de memoria en proceso...");
                          setTimeout(() => setToastMessage(null), 2500);
                        }}
                      >
                        [CLICK TO EXPORT] {">>"} stdout_dump_maipu_parking.log
                      </button>
                    </div>
                  </div>
                )}

              </div>

              {/* Right Side Column: Actions panel & Logs */}
              <div className="lg:col-span-4 space-y-6">

                {/* Contextual Spot control card (Guard) */}
                {selectedSpot ? (
                  <div className="bg-white border-2 border-[#2170e4] rounded-2xl p-5 shadow-lg space-y-4 animate-fadeIn">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold text-[#75777d] uppercase font-mono">Control de Portería</span>
                        <h4 className="text-lg font-bold text-[#091426] tracking-tight mt-0.5">Control de Cupo #{selectedSpot.number}</h4>
                        <span className="inline-block mt-1 font-mono text-xs font-semibold text-[#2170e4] bg-[#eff4ff] px-2 py-0.5 rounded-md">ID: {selectedSpot.id} • Sector {selectedSpot.quadrant}</span>
                      </div>
                      <button 
                        className="text-xs font-bold text-gray-400 hover:text-gray-600"
                        onClick={() => setSelectedSpot(null)}
                      >
                        Cerrar
                      </button>
                    </div>

                    <div className="text-xs space-y-2.5 py-3 border-t border-b border-gray-100 leading-relaxed text-gray-600">
                      <div className="flex justify-between">
                        <span>Estado Actual:</span>
                        <span className="font-bold uppercase text-gray-900">
                          {selectedSpot.status === "available" && "Disponible / Libre"}
                          {selectedSpot.status === "occupied" && "Ocupado"}
                          {selectedSpot.status === "guest" && "Invitado (Amarillo)"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Vehículo/Ocupante:</span>
                        <span className="font-bold text-[#091426]">{selectedSpot.occupant || "Ninguno"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tiempo de Estacionado:</span>
                        <span className="font-mono text-gray-900 font-bold">{selectedSpot.duration || "---"}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        className="py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 rounded-xl text-xs font-bold transition-all"
                        disabled={selectedSpot.status === "available"}
                        onClick={() => handleUnparkSpot(selectedSpot.id)}
                      >
                        Liberar Cupo
                      </button>
                      <button
                        className="py-2.5 bg-yellow-400 hover:bg-yellow-500 text-yellow-950 rounded-xl text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={selectedSpot.status !== "available"}
                        onClick={() => handleBlockSpot(selectedSpot.id)}
                      >
                        Asignar Invitado
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-[#c5c6cd]/40 rounded-2xl p-5 shadow-xs text-center py-8">
                    <p className="text-xs text-[#75777d]">
                      Haz clic sobre cualquier cupo de la cuadrícula o búscalo con su ID para ver detalles específicos u overriding de portería.
                    </p>
                  </div>
                )}

                {/* Live Activity Logs Container */}
                <div className="bg-white border border-[#c5c6cd]/40 rounded-2xl shadow-xs overflow-hidden">
                  <div className="p-4 bg-[#eff4ff] border-b border-[#c5c6cd]/40 flex justify-between items-center">
                    <span className="font-bold text-xs text-[#091426] uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="h-4 w-4 text-[#2170e4]" />
                      Bitácora de Eventos
                    </span>
                    <span className="bg-[#2170e4] text-white text-[9px] px-2 py-0.5 rounded-full font-bold">REALTIME</span>
                  </div>

                  <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {logs.map((log) => {
                      let typeIcon = "🚙";
                      let iconColor = "bg-green-100 text-green-600";
                      if (log.type === "exit") {
                        typeIcon = "🚪";
                        iconColor = "bg-blue-100 text-blue-600";
                      } else if (log.type === "maintenance" || log.type === "block") {
                        typeIcon = "⭐";
                        iconColor = "bg-yellow-100 text-yellow-600";
                      } else if (log.type === "reserve") {
                        typeIcon = "📁";
                        iconColor = "bg-amber-100 text-amber-600";
                      }

                      return (
                        <div key={log.id} className="p-4 flex items-start gap-3 hover:bg-slate-50 transition-colors">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${iconColor}`}>
                            {typeIcon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-xs text-[#091426] truncate">{log.detail}</p>
                            <span className="text-[10px] text-gray-400 block mt-0.5">Cupo: {log.spotId} • {log.timestamp}</span>
                          </div>
                        </div>
                      );
                    })}

                    {logs.length === 0 && (
                      <div className="p-8 text-center text-gray-400 text-xs">
                        Cargando logs del de bitácora...
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>

          </div>
        </main>

      </div>

      {/* Interactive Portería Help Manual Modal */}
      {helpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-150 animate-scaleUp">
            <div className="bg-[#091426] text-white p-6 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-white/10 rounded-lg text-[#ffa400]">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm uppercase tracking-wider">Manual & Ayuda de Portería</h3>
                  <p className="text-[10px] text-gray-300">Sede Maipú • Consola de Vigilancia</p>
                </div>
              </div>
              <button 
                type="button" 
                className="text-gray-400 hover:text-white font-bold text-sm focus:outline-none"
                onClick={() => setHelpModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-gray-600 leading-relaxed">
              <p className="font-semibold text-[#091426] text-sm">Protocolo Operativo de Emergencias y Control:</p>
              
              <div className="space-y-3">
                <div className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-gray-700 font-mono">1</span>
                  <p className="flex-1"><strong>Asignar Invitados Extraordinarios:</strong> Haz clic sobre cualquier cupo verde libre de la red, luego haz clic en <span className="text-yellow-600 font-bold">Asignar Invitado</span> para registrar un vehículo externo o docente de visita.</p>
                </div>
                <div className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-gray-700 font-mono">2</span>
                  <p className="flex-1"><strong>Liberación Manual (Override):</strong> Si un alumno olvida reportar su salida, puedes seleccionar su cupo rojo en el monitor y oprimir <span className="text-red-500 font-bold">Liberar Cupo</span> para reestablecer la vacante.</p>
                </div>
                <div className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-gray-700 font-mono">3</span>
                  <p className="flex-1"><strong>Simulación OCR CCTV:</strong> Utiliza el módulo CCTV adjunto (en vivo) para probar el reconocimiento automático de patentes con nuestra red neural de prueba.</p>
                </div>
              </div>

              <div className="bg-[#eff4ff] p-4 rounded-2xl space-y-2 border border-blue-50">
                <p className="font-bold text-[#2170e4] text-[11px] uppercase tracking-wider">¿Deseas probar la conexión del panel?</p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    className="py-2 px-3 bg-[#2170e4] hover:bg-blue-700 text-white font-bold rounded-xl text-[10px] transition-all text-center focus:outline-none"
                    onClick={() => {
                      setToastMessage("Prueba de pánico exitosa. Conexiones Duoc UC ok.");
                      setTimeout(() => setToastMessage(null), 3000);
                    }}
                  >
                    Prueba de Enlace Radios
                  </button>
                  <button
                    type="button"
                    className="py-2 px-3 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-[10px] transition-all text-center focus:outline-none"
                    onClick={() => {
                      setToastMessage("Reporte técnico enviado a Soporte General Duoc UC.");
                      setTimeout(() => setToastMessage(null), 3000);
                    }}
                  >
                    Notificar Soporte TI
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition-colors focus:outline-none"
                onClick={() => setHelpModalOpen(false)}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Security Live Alerts Modal */}
      {alertsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-150 animate-scaleUp">
            <div className="bg-red-600 text-white p-6 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-white/10 rounded-lg text-white">
                  <Bell className="h-5 w-5 animate-bounce" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm uppercase tracking-wider">Bitácora Activa de Alertas</h3>
                  <p className="text-[10px] text-red-100">Sede Maipú • Monitoreo Crítico</p>
                </div>
              </div>
              <button 
                type="button" 
                className="text-red-200 hover:text-white font-bold text-sm focus:outline-none"
                onClick={() => setAlertsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">ESTADO DE HARDWARE IOT:</p>
              
              <div className="space-y-2 text-xs">
                {[
                  { name: "Cámara CCTV Zona A (Acceso Principal)", status: "Operativo", color: "text-green-600 font-bold" },
                  { name: "Cámara CCTV Zona B  (Estacio Alumnos)", status: "Operativo", color: "text-green-600 font-bold" },
                  { name: "Barrera Automatizada Entrada", status: "Operativo", color: "text-green-600 font-bold" },
                  { name: "Barrera Automatizada Salida", status: "Operativo", color: "text-green-600 font-bold" },
                  { name: "Sensores Infrarrojos de Tránsito", status: "Excelente", color: "text-green-600 font-bold" },
                  { name: "Enlace DNS de Emergencia Sede", status: "Sincronizado", color: "text-blue-600 font-bold" }
                ].map((item, idx) => (
                  <div key={idx} className="flex justify-between p-2.5 bg-slate-50 rounded-xl border border-gray-100">
                    <span className="text-gray-700 font-semibold">{item.name}</span>
                    <span className={item.color}>✓ {item.status}</span>
                  </div>
                ))}
              </div>

              <div className="bg-red-50 p-4 rounded-2xl border border-red-100 space-y-2">
                <p className="font-bold text-red-700 text-[11px] uppercase tracking-wider">Acciones Rápidas del Supervisor:</p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    className="py-2 px-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-[10px] transition-all text-center focus:outline-none"
                    onClick={() => {
                      setAlertsModalOpen(false);
                      triggerSimulatedOCR();
                      setToastMessage("Simulando OCR en vivo de CCTV...");
                      setTimeout(() => setToastMessage(null), 3000);
                    }}
                  >
                    Simular Patente OCR
                  </button>
                  <button
                    type="button"
                    className="py-2 px-3 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-[10px] transition-all text-center focus:outline-none"
                    onClick={() => {
                      setToastMessage("Excelente: alertas archivadas en bitácora histórica.");
                      setTimeout(() => setToastMessage(null), 3000);
                    }}
                  >
                    Archivar Notificaciones
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition-colors focus:outline-none"
                onClick={() => setAlertsModalOpen(false)}
              >
                Cerrar Bitácora
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#091426] text-white px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 border border-[#ffa400]/25 animate-fadeIn font-sans max-w-sm">
          <div className="h-2 w-2 rounded-full bg-[#ffa400] animate-pulse" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
