import React, { useState, useEffect } from "react";
import { Bell, Car, HelpCircle, User, CheckCircle, Home, ShieldAlert, Sparkles, LogOut, ChevronRight, Phone, AlertTriangle } from "lucide-react";
import { Spot, SpotStatus } from "../types";

interface DriverViewProps {
  currentUser: { email: string; fullName: string };
  onLogout: () => void;
}

export default function DriverView({ currentUser, onLogout }: DriverViewProps) {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [selectedSector, setSelectedSector] = useState<"A" | "B" | "C" | "D">("A");
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [plateNumber, setPlateNumber] = useState("K-902-LX");
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"home" | "myspot" | "support" | "profile">("home");
  const [logoSpin, setLogoSpin] = useState(false);

  // Estados interactivos para opciones de Soporte y Ayuda
  const [activeModal, setActiveModal] = useState<"guard_call" | "report_sensor" | "rules" | null>(null);
  const [reportingSpotId, setReportingSpotId] = useState("");
  const [reportingDescription, setReportingDescription] = useState("");
  const [guardianCallTimer, setGuardianCallTimer] = useState<string | null>(null);

  // Fetch spots state from backend Express API
  const fetchSpots = async () => {
    try {
      const response = await fetch("/api/spots");
      if (response.ok) {
        const data = await response.json();
        setSpots(data);
      }
    } catch (err) {
      console.error("Error fetching spots on driver client:", err);
    }
  };

  useEffect(() => {
    fetchSpots();
    // Poll every 3 seconds for active synchronization with Guard and Admin locks!
    const pollInterval = setInterval(fetchSpots, 3000);
    return () => clearInterval(pollInterval);
  }, []);

  const handleSelectSpot = (spot: Spot) => {
    if (spot.status !== "available") return;
    setSelectedSpotId(spot.id === selectedSpotId ? null : spot.id);
  };

  const handleConfirmParking = async (isReserveOnly = false) => {
    if (!selectedSpotId) return;
    setLoading(true);

    const targetEndpoint = isReserveOnly ? "reserve" : "park";
    try {
      const response = await fetch(`/api/spots/${selectedSpotId}/${targetEndpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ occupant: `Conductor: ${currentUser.fullName} (${plateNumber})` })
      });

      if (response.ok) {
        // Trigger haptic feedback toast
        setToastMessage(`¡Tu vehículo ha quedado registrado en el cupo con éxito!`);
        setSelectedSpotId(null);
        await fetchSpots();
      } else {
        const errData = await response.json();
        setToastMessage(errData.error || "Ocurrió un error.");
      }
    } catch (e) {
      console.error("Error parking:", e);
    } finally {
      setLoading(false);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleReleaseMySpot = async (spotId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/spots/${spotId}/unpark`, {
        method: "POST"
      });
      if (response.ok) {
        setToastMessage(`El cupo ha sido liberado de manera exitosa.`);
        await fetchSpots();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Sede Maipú Sector names mapped to Quadrant ids (A, B, C, D)
  const sectorDescriptions = {
    A: "Acceso Principal y Portería",
    B: "Talleres y Laboratorios",
    C: "Edificio Central de Aulas",
    D: "Zonas Deportivas y Comunes"
  };

  // Filter spots of the selected quadrant (sector)
  const filteredSpots = spots.filter(s => s.quadrant === selectedSector);

  // Calculate free spots on current selected quadrant and in total
  const selectedSectorSpots = spots.filter(s => s.quadrant === selectedSector);
  const sectorFreeCount = selectedSectorSpots.filter(s => s.status === "available").length;
  
  const totalFreeCount = spots.filter(s => s.status === "available").length;
  const totalOccupiedCount = spots.filter(s => s.status === "occupied").length;
  const totalGuestCount = spots.filter(s => s.status === "guest").length;
  const totalUnavailableCount = totalOccupiedCount + totalGuestCount;
  const occupiedPercentage = spots.length ? Math.round((totalUnavailableCount / spots.length) * 100) : 35;
  const availablePercentage = 100 - occupiedPercentage;

  // Find if user has currently parked in any spot
  const myParkedSpot = spots.find(s => s.occupant?.includes(currentUser.fullName));

  // Determine standard reference design metrics for active selection
  const selectedSpotData = spots.find(s => s.id === selectedSpotId);

  // Active logo interactive triggers
  const handleLogoClick = async () => {
    setLogoSpin(true);
    await fetchSpots();
    setToastMessage("Sincronizado: Datos actualizados de la Sede Maipú");
    setTimeout(() => {
      setLogoSpin(false);
    }, 850);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Simulation handlers for Support tools
  const handleStartGuardCall = () => {
    setActiveModal("guard_call");
    setGuardianCallTimer("Conectando...");
    const t1 = setTimeout(() => setGuardianCallTimer("Llamando a caseta principal..."), 1500);
    const t2 = setTimeout(() => setGuardianCallTimer("Guardia de turno respondiendo: '¡Hola! Control de acceso Sede Maipú, ¿en qué le ayudo?'"), 3500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  };

  const handleSendSensorReport = () => {
    if (!reportingSpotId) return;
    setToastMessage(`¡Reporte enviado para el cupo ${reportingSpotId}!`);
    setActiveModal(null);
    setReportingSpotId("");
    setReportingDescription("");
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-0 md:p-6 bg-[#eff4ff]">
      
      {/* Sleek Mobile Device Container simulator for Desktop, native wrapper for true mobile */}
      <div className="w-full max-w-md md:h-[880px] bg-[#f8f9ff] text-[#0b1c30] md:rounded-[40px] shadow-2xl border-0 md:border-8 md:border-[#091426] relative overflow-hidden flex flex-col flex-1 self-stretch md:self-auto box-border transition-all">
        
        {/* Device Ear Speaker / Camera notch notch only visible on desktop simulator */}
        <div className="hidden md:block absolute top-0 left-1/2 -translate-x-1/2 w-40 h-6 bg-[#091426] rounded-b-2xl z-50 text-center">
          <div className="w-16 h-1.5 bg-gray-700 rounded-full mx-auto mt-2" />
        </div>

        {/* --- Top Header (Sticky) --- */}
        <header className="sticky top-0 bg-[#f8f9ff] z-40 border-b border-[#c5c6cd]/40 px-6 py-4 md:pt-8 flex justify-between items-center shadow-xs">
          <button
            type="button"
            onClick={handleLogoClick}
            className="flex items-center gap-2 group cursor-pointer hover:opacity-90 active:scale-95 transition-all text-left outline-none"
            title="Sincronizar Estado"
          >
            <div className={`h-8 w-8 rounded-lg bg-[#002f6c] border border-[#ffa400]/40 flex items-center justify-center text-[#ffa400] font-black text-sm shadow-sm transition-transform duration-700 ${logoSpin ? "rotate-360 scale-110" : ""}`}>
              D
            </div>
            <span className="font-bold text-lg tracking-tight text-[#091426] group-hover:text-[#002f6c] transition-colors">Duoc UC Parking</span>
          </button>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setToastMessage("No hay alertas ni incidentes en la Sede Maipú en este momento.")}
              className="p-1 text-[#75777d] hover:text-[#0b1c30] relative hover:bg-gray-100 rounded-full transition-all"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[#f8f9ff]" />
            </button>
            <div className="w-8 h-8 rounded-full overflow-hidden border border-[#c5c6cd]">
              <img 
                alt="Foto de perfil del estudiante" 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150"
              />
            </div>
          </div>
        </header>

        {/* --- Main Contents Area (Scrollable) --- */}
        <div className="flex-1 overflow-y-auto pb-24 px-6 pt-5 space-y-6 no-scrollbar">
          
          {activeTab === "home" && (
            <div className="page-enter space-y-6">
              
              {/* --- Available Status Heatmap Header --- */}
              <section className="bg-white p-5 rounded-2xl border border-[#c5c6cd]/30 shadow-xs">
                <div className="flex justify-between items-end mb-3">
                  <div>
                    <h2 className="text-xl font-bold text-[#0b1c30] tracking-tight">Ocupación en Vivo</h2>
                    <p className="text-xs text-[#45474c] font-medium flex items-center gap-1.5 mt-0.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      Sede Maipú: Estacionamiento Único
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-bold text-[#002f6c] font-mono leading-none">{totalFreeCount}</span>
                    <p className="text-[10px] uppercase tracking-wider font-extrabold text-[#002f6c] mt-0.5">Libres Total</p>
                  </div>
                </div>

                {/* Heatmap line */}
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                  <div className="h-full bg-[#002f6c] transition-all duration-1000" style={{ width: `${availablePercentage}%` }} />
                  <div className="h-full bg-red-500 transition-all duration-1000" style={{ width: `${occupiedPercentage}%` }} />
                </div>
                
                <div className="flex justify-between mt-2 text-[10px] font-bold text-[#45474c] tracking-wider uppercase">
                  <span>Disponibles ({availablePercentage}%)</span>
                  <span>Ocupados ({occupiedPercentage}%)</span>
                </div>
              </section>

              {/* Alert If Currently Parked */}
              {myParkedSpot && (
                <div className="p-4 bg-[#eff4ff] border border-[#dce9ff] rounded-2xl flex items-start gap-3 shadow-xs">
                  <div className="p-2 bg-[#002f6c] text-[#ffa400] rounded-lg">
                    <Car className="h-5 w-5" />
                  </div>
                  <div className="flex-1 text-xs">
                    <h4 className="font-bold text-[#091426]">Te encuentras estacionado</h4>
                    <p className="text-gray-600 mt-0.5">Cupo #{myParkedSpot.number} ({myParkedSpot.id}) • {selectedSector === myParkedSpot.quadrant ? "En este sector" : `Sector ${myParkedSpot.quadrant}`}</p>
                    <button 
                      className="mt-2 text-[#002f6c] font-bold hover:underline block text-left"
                      onClick={() => handleReleaseMySpot(myParkedSpot.id)}
                    >
                      Liberar cupo ahora &rarr;
                    </button>
                  </div>
                </div>
              )}

              {/* --- Sector Selection Pills --- */}
              <section className="space-y-2">
                <p className="text-xs font-bold text-[#45474c] uppercase tracking-wider">Filtrar por Sector</p>
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {(["A", "B", "C", "D"] as const).map((sector) => {
                    const isActive = selectedSector === sector;
                    return (
                      <button
                        key={sector}
                        className={`flex-shrink-0 px-4 py-2 mr-0.5 rounded-xl text-xs font-semibold tracking-wide border transition-all cursor-pointer ${
                          isActive 
                            ? "bg-[#002f6c] text-[#ffa400] border-[#002f6c] font-extrabold shadow-sm" 
                            : "bg-white text-[#45474c] border-[#c5c6cd]/50 hover:bg-[#eff4ff]"
                        }`}
                        onClick={() => {
                          setSelectedSector(sector);
                          setSelectedSpotId(null);
                        }}
                      >
                        Sector {sector}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-[#75777d] italic font-medium pt-0.5">
                  Ubicación: {sectorDescriptions[selectedSector]}
                </p>
              </section>

              {/* --- Custom Interactive Selection Grid --- */}
              <section className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-bold text-[#091426] tracking-tight">Buscar Cupo Disponible</h3>
                  
                  <div className="flex flex-wrap gap-2 text-[10px] font-bold text-[#45474c]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500 border border-white" />
                      <span>Disponible</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                      <span>Ocupado</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                      <span>Invitado</span>
                    </div>
                  </div>
                </div>

                {filteredSpots.length === 0 ? (
                  <div className="p-8 text-center bg-white border border-[#c5c6cd]/35 rounded-2xl text-gray-400 text-xs">
                    Sincronizando los cupos con el servidor Duoc UC...
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {filteredSpots.map((spot) => {
                      const isSelected = spot.id === selectedSpotId;
                      const isOccupied = spot.status === "occupied";
                      const isGuest = spot.status === "guest";
                      const isUnavailable = isOccupied || isGuest;
                      
                      let spotBg = "bg-white border-[#c5c6cd]/45 hover:border-[#002f6c]";
                      let statusBadge = "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.4)]";
                      
                      if (isOccupied) {
                        spotBg = "bg-[#ffdad6] border-[#ba1a1a]/20 opacity-70 cursor-not-allowed";
                        statusBadge = "bg-red-500";
                      } else if (isGuest) {
                        spotBg = "bg-[#fef9c3] border-[#ca8a04]/25 opacity-70 cursor-not-allowed";
                        statusBadge = "bg-yellow-400 shadow-[0_0_6px_rgba(234,179,8,0.4)]";
                      } else if (isSelected) {
                        spotBg = "bg-[#dce9ff] border-[#002f6c] scale-[1.02] ring-2 ring-[#002f6c]/10 shadow-sm";
                      }

                      return (
                        <div
                          key={spot.id}
                          className={`relative p-4 border rounded-2xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${spotBg}`}
                          onClick={() => {
                            if (!isUnavailable) {
                              handleSelectSpot(spot);
                            } else {
                              setToastMessage(isGuest ? "Este cupo está reservado para Invitados de la Sede." : "Este cupo se encuentra Ocupado por otro vehículo.");
                            }
                          }}
                        >
                          {/* Top-Right Status Dot Indicator */}
                          <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${statusBadge}`} />

                          <span className="text-[8px] font-mono font-bold tracking-widest text-gray-400">CUPO</span>
                          <span className="text-lg font-extrabold text-[#091426] tracking-tight">#{spot.number}</span>
                          <span className="text-[10px] font-mono font-bold text-[#002f6c] bg-[#eff4ff] px-1.5 py-0.2 rounded-md mt-0.5">{spot.id}</span>
                          
                          {spot.isEV && (
                            <span className="text-[8px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded font-extrabold uppercase mt-1">🔋 Eléctrico</span>
                          )}
                          {isGuest && (
                            <span className="text-[8px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded font-extrabold uppercase mt-1">⭐ Invitado</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

            </div>
          )}

          {activeTab === "myspot" && (
            <div className="page-enter space-y-6">
              <h2 className="text-2xl font-bold tracking-tight text-[#091426]">Mi Auto Estacionado</h2>
              <p className="text-sm text-[#45474c] -mt-4">Gestiona el cupo actualmente registrado para tu vehículo.</p>
              
              {myParkedSpot ? (
                <div className="bg-white rounded-3xl border border-[#c5c6cd]/30 p-6 shadow-md text-center space-y-6">
                  <div className="w-16 h-16 rounded-full bg-[#dce9ff] text-[#002f6c] flex items-center justify-center mx-auto shadow-sm">
                    <Car className="h-8 w-8" />
                  </div>
                  
                  <div>
                    <span className="text-xs tracking-wider uppercase font-extrabold text-[#75777d]">Ubicación Registrada</span>
                    <h3 className="text-3xl font-extrabold tracking-tight text-[#091426] mt-1">Sector {myParkedSpot.quadrant}</h3>
                    <p className="text-[#002f6c] font-mono font-bold text-lg mt-0.5">Cupo #{myParkedSpot.number} ({myParkedSpot.id})</p>
                    <p className="text-indigo-900 text-xs mt-1 italic">{sectorDescriptions[myParkedSpot.quadrant as "A" | "B" | "C" | "D"]}</p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-2xl flex justify-around text-xs border border-[#c5c6cd]/20">
                    <div>
                      <span className="text-gray-400 block mb-1">Patente</span>
                      <strong className="text-sm text-[#091426] tracking-wider font-mono">{plateNumber}</strong>
                    </div>
                    <div className="h-8 w-[1px] bg-gray-200" />
                    <div>
                      <span className="text-gray-400 block mb-1">Permanencia</span>
                      <strong className="text-sm text-[#091426]">~ {myParkedSpot.duration} </strong>
                    </div>
                  </div>

                  <button
                    className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm cursor-pointer transition-all shadow-sm active:scale-95"
                    disabled={loading}
                    onClick={() => handleReleaseMySpot(myParkedSpot.id)}
                  >
                    {loading ? "Liberando..." : "Desocupar Estacionamiento / Salir"}
                  </button>
                  
                  <p className="text-[10px] text-gray-400 leading-normal">
                    Por favor libera tu cupo inmediatamente después de retirar tu vehículo para mantener la exactitud del sistema de sensores inteligente de Duoc UC Maipú.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-[#c5c6cd]/30 p-8 text-center shadow-xs">
                  <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400 mb-4">
                    <ShieldAlert className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-[#091426]">No registras plaza activa</h3>
                  <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto leading-relaxed">
                    Dirígete a la pantalla de Inicio para buscar un cupo disponible e indicar la plaza donde has estacionado tu auto.
                  </p>
                  <button 
                    className="mt-5 px-5 py-2.5 bg-[#002f6c] text-[#ffa400] hover:bg-[#001f4c] rounded-full font-bold text-xs cursor-pointer shadow-xs transition-colors"
                    onClick={() => setActiveTab("home")}
                  >
                    Buscar Cupo Disponible
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "support" && (
            <div className="page-enter space-y-6">
              <h2 className="text-2xl font-bold tracking-tight text-[#091426]">Asistencia y Soporte</h2>
              <p className="text-sm text-[#45474c] -mt-4">Servicios interactivos de asistencia en el estacionamiento de Duoc UC Sede Maipú.</p>
              
              <div className="space-y-4">
                <button 
                  onClick={handleStartGuardCall}
                  className="w-full text-left p-4 bg-white rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between cursor-pointer hover:border-[#002f6c] transition-colors"
                >
                  <div>
                    <h3 className="font-bold text-sm text-[#0b1c30]">Llamar a Guardia / Acceso Portón</h3>
                    <p className="text-xs text-gray-500">Asistencia directa en rampa principal en horario académico.</p>
                  </div>
                  <Phone className="h-5 w-5 text-gray-400 group-hover:text-[#002f6c]" />
                </button>

                <button 
                  onClick={() => setActiveModal("report_sensor")}
                  className="w-full text-left p-4 bg-white rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between cursor-pointer hover:border-[#002f6c] transition-colors"
                >
                  <div>
                    <h3 className="font-bold text-sm text-[#0b1c30]">Reportar Sensor u Obstáculo</h3>
                    <p className="text-xs text-gray-500">Informa si un vehículo ocupa doble espacio o hay un problema físico.</p>
                  </div>
                  <AlertTriangle className="h-5 w-5 text-gray-400 group-hover:text-[#002f6c]" />
                </button>

                <button 
                  onClick={() => setActiveModal("rules")}
                  className="w-full text-left p-4 bg-white rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between cursor-pointer hover:border-[#002f6c] transition-colors"
                >
                  <div>
                    <h3 className="font-bold text-sm text-[#0b1c30]">Reglamentos del Estacionamiento</h3>
                    <p className="text-xs text-gray-500">Tiempos de gracia, velocidad, pases exclusivos y políticas de motos.</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </button>
              </div>

              {/* Minimal contact badge */}
              <div className="bg-gray-50 border border-dashed rounded-2xl p-4 text-center">
                <p className="text-[10px] text-gray-400 tracking-wider font-extrabold uppercase mb-0.5">Teléfono de Emergencia Campus Maipú</p>
                <p className="text-sm font-mono font-bold text-[#002f6c]">+56 2 2999 3000</p>
              </div>
            </div>
          )}

          {activeTab === "profile" && (
            <div className="page-enter bg-white p-6 rounded-3xl border border-[#c5c6cd]/30 shadow-xs space-y-6 text-center">
              <div className="relative w-20 h-20 mx-auto">
                <img 
                  alt="Foto del perfil" 
                  className="rounded-full w-20 h-20 object-cover border-4 border-slate-100 shadow-xs" 
                  referrerPolicy="no-referrer"
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150"
                />
                <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-green-500 border-2 border-white" />
              </div>
              
              <div>
                <h3 className="text-lg font-bold text-[#091426]">{currentUser.fullName}</h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{currentUser.email}</p>
                <span className="inline-block mt-2 bg-[#dce9ff] text-[#002f6c] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  Estudiante Autorizado
                </span>
              </div>

              <div className="py-2 space-y-2 text-left text-xs text-gray-600 border-t border-b border-gray-100 font-medium">
                <div className="flex justify-between py-1">
                  <span>Vehículo Regular:</span>
                  <strong className="text-gray-900">Mazda 3 Hatchback</strong>
                </div>
                <div className="flex justify-between py-1">
                  <span>Patente Configurada:</span>
                  <input 
                    className="text-right text-gray-900 font-mono font-bold max-w-[90px] outline-none border-b border-dashed border-gray-400 focus:border-[#002f6c]"
                    type="text" 
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                  />
                </div>
                <div className="flex justify-between py-1">
                  <span>Suscripción Pase:</span>
                  <strong className="text-green-600 font-bold">Activa (Semestre Actual)</strong>
                </div>
              </div>

              <button
                className="w-full py-3 bg-[#ffdad6] text-red-700 hover:bg-red-100 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                onClick={onLogout}
              >
                <LogOut className="h-4 w-4" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          )}

        </div>

        {/* --- Dynamic Confirmation Drawer (COMPLETELY REMOVED LEGACY DECORATIONS AND RESERVATION BUTTONS) --- */}
        {selectedSpotId && selectedSpotData && (
          <div className="absolute bottom-20 left-4 right-4 bg-white border border-[#c5c6cd]/50 p-4.5 rounded-2xl shadow-xl z-50 transform transition-all duration-300 pointer-events-auto">
            <div className="flex items-center justify-between mb-3.5">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">Cupo Seleccionado</span>
                <h3 className="text-lg font-bold text-[#091426]">Cupo #{selectedSpotData.number}</h3>
                <p className="text-xs text-[#002f6c] font-medium mt-0.5">Sede Maipú • Sector {selectedSpotData.quadrant}</p>
              </div>

              <div className="p-2.5 bg-blue-50 text-[#002f6c] rounded-xl flex items-center justify-center">
                <Car className="h-5.5 w-5.5" />
              </div>
            </div>

            {/* ONLY ONE FUNCTIONAL MINIMALIST CONFIRMATION BUTTON - NO RESERVATION OPTION AT ALL */}
            <div className="mb-2">
              <button 
                type="button"
                className="w-full py-3.5 bg-[#002f6c] hover:bg-[#001f4c] text-[#ffa400] text-center rounded-xl text-xs tracking-wider uppercase font-black transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                disabled={loading}
                onClick={() => handleConfirmParking(false)}
              >
                {loading ? "Registrando vehículo..." : "Confirmar Estacionado / Estacionar Aquí"}
              </button>
            </div>
            
            <button 
              type="button"
              className="w-full text-center text-xs text-gray-400 hover:text-gray-600 hover:underline py-1 cursor-pointer outline-none"
              onClick={() => setSelectedSpotId(null)}
            >
              Cancelar Selección
            </button>
          </div>
        )}

        {/* --- Custom Floating Success Toast Notification --- */}
        {toastMessage && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-[#091426] text-white px-5 py-3 rounded-full shadow-2xl z-50 flex items-center gap-2.5 transition-all w-max max-w-[90%] text-xs">
            <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
            <span className="font-semibold">{toastMessage}</span>
          </div>
        )}

        {/* --- Bottom Navigation TabBar (Mobile Designed) --- */}
        <nav className="absolute bottom-0 left-0 w-full z-40 flex justify-around items-center px-4 py-3 bg-[#ffffff] border-t border-[#c5c6cd]/50 shadow-lg rounded-t-2xl">
          <button 
            className={`flex flex-col items-center justify-center gap-1 cursor-pointer w-14 transition-all ${activeTab === "home" ? "text-[#002f6c]" : "text-gray-400"}`}
            onClick={() => { setActiveTab("home"); setSelectedSpotId(null); }}
          >
            <Home className="h-5 w-5" />
            <span className="text-[10px] font-bold">Inicio</span>
          </button>
          
          <button 
            className={`flex flex-col items-center justify-center gap-1 cursor-pointer w-14 transition-all ${activeTab === "myspot" ? "text-[#002f6c]" : "text-gray-400"}`}
            onClick={() => { setActiveTab("myspot"); setSelectedSpotId(null); }}
          >
            <Car className="h-5 w-5" />
            <span className="text-[10px] font-bold">Mi Plaza</span>
          </button>
          
          <button 
            className={`flex flex-col items-center justify-center gap-1 cursor-pointer w-14 transition-all ${activeTab === "support" ? "text-[#002f6c]" : "text-gray-400"}`}
            onClick={() => { setActiveTab("support"); setSelectedSpotId(null); }}
          >
            <HelpCircle className="h-5 w-5" />
            <span className="text-[10px] font-bold">Ayuda</span>
          </button>
          
          <button 
            className={`flex flex-col items-center justify-center gap-1 cursor-pointer w-14 transition-all ${activeTab === "profile" ? "text-[#002f6c]" : "text-gray-400"}`}
            onClick={() => { setActiveTab("profile"); setSelectedSpotId(null); }}
          >
            <User className="h-5 w-5" />
            <span className="text-[10px] font-bold">Mi Perfil</span>
          </button>
        </nav>

        {/* --- Simulated Dialog Modals for Support section --- */}
        {activeModal === "guard_call" && (
          <div className="absolute inset-0 bg-[#091426]/75 backdrop-blur-xs flex items-center justify-center z-50 p-6 animate-fadeIn">
            <div className="bg-white rounded-3xl p-6 w-full text-center space-y-4 shadow-2xl">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600 animate-pulse">
                <Phone className="h-6 w-6" />
              </div>
              <h4 className="font-bold text-base text-[#091426]">Llamar Caseta de Portería</h4>
              <p className="text-xs text-gray-500 leading-relaxed font-mono bg-gray-50 p-3.5 rounded-xl text-left border">
                {guardianCallTimer}
              </p>
              <button 
                onClick={() => setActiveModal(null)}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-[#091426] rounded-xl font-bold text-xs cursor-pointer"
              >
                Colgar Llamada
              </button>
            </div>
          </div>
        )}

        {activeModal === "report_sensor" && (
          <div className="absolute inset-0 bg-[#091426]/75 backdrop-blur-xs flex items-center justify-center z-50 p-6 animate-fadeIn font-sans">
            <div className="bg-white rounded-3xl p-6 w-full text-center space-y-4 shadow-2xl text-[#0b1c30]">
              <h4 className="font-bold text-base text-[#091426]">Reportar Obstrucción de Sensor</h4>
              <p className="text-xs text-gray-500 -mt-2">Informa a portería si ves un vehículo mal estacionado u obstáculo físico.</p>
              <div className="space-y-3 text-left">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1">Identificador del Cupo</label>
                  <input 
                    type="text" 
                    placeholder="ej: A-12 o B-04" 
                    className="w-full px-3.5 py-2.5 bg-gray-50 border rounded-xl text-xs outline-none focus:border-[#002f6c]"
                    value={reportingSpotId}
                    onChange={(e) => setReportingSpotId(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 block mb-1">Descripción del Incidente</label>
                  <textarea 
                    placeholder="Describe el problema brevemente..." 
                    className="w-full px-3.5 py-2 bg-gray-50 border rounded-xl text-xs outline-none focus:border-[#002f6c] h-16 resize-none"
                    value={reportingDescription}
                    onChange={(e) => setReportingDescription(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button 
                  onClick={() => setActiveModal(null)}
                  className="py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSendSensorReport}
                  disabled={!reportingSpotId}
                  className="py-2.5 bg-[#002f6c] text-white hover:bg-[#001f4c] disabled:opacity-50 rounded-xl font-bold text-xs cursor-pointer"
                >
                  Enviar Reporte
                </button>
              </div>
            </div>
          </div>
        )}

        {activeModal === "rules" && (
          <div className="absolute inset-0 bg-[#091426]/75 backdrop-blur-xs flex items-center justify-center z-50 p-6 animate-fadeIn font-sans">
            <div className="bg-white rounded-3xl p-6 w-full text-left space-y-4 shadow-2xl overflow-y-auto max-h-[80%] text-[#0b1c30]">
              <h4 className="font-bold text-base text-[#091426] text-center border-b pb-2">Reglamento Sede Maipú</h4>
              <div className="text-xs text-gray-600 space-y-2.5 leading-relaxed">
                <p><strong>1. Credencial Vigente:</strong> El estacionamiento es de uso exclusivo para estudiantes, docentes y colaboradores de Duoc UC Sede Maipú con pase activo.</p>
                <p><strong>2. Límites de Velocidad:</strong> La velocidad máxima de circulación en todas las vías interiores y rampas de acceso es de 10 km/h.</p>
                <p><strong>3. Tiempo de Permanencia:</strong> No está permitido dejar vehículos estacionados durante la noche. El horario de operación coincide con las actividades de la sede de 07:30 a 22:45.</p>
                <p><strong>4. Casos Especiales:</strong> Se solicita respetar los cupos exclusivos para personas con movilidad reducida (PMR) y vehículos de carga eléctrica (🔋) en constante carga.</p>
              </div>
              <button 
                onClick={() => setActiveModal(null)}
                className="w-full py-2.5 bg-[#002f6c] text-white hover:bg-[#001f4c] rounded-xl font-bold text-xs text-center cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
