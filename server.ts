import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { Spot, SpotStatus, ActivityLog } from "./src/types";

dotenv.config();

// Initialize dynamic shared states
let spots: Spot[] = [];
let logs: ActivityLog[] = [
  {
    id: "log-1",
    type: "exit",
    spotId: "A-12",
    detail: "Spot A-12 Vacated - Exit processed successfully",
    timestamp: "NOW"
  },
  {
    id: "log-2",
    type: "entry",
    spotId: "B-04",
    detail: "Spot B-04 Occupied - Plate: ABC-1234",
    timestamp: "2m ago"
  },
  {
    id: "log-3",
    type: "maintenance",
    spotId: "C-22",
    detail: "Spot C-22 Maintenance - Sensor calibration in progress",
    timestamp: "8m ago"
  },
  {
    id: "log-4",
    type: "exit",
    spotId: "D-01",
    detail: "Spot D-01 Vacated - Session length: 2h 45m",
    timestamp: "12m ago"
  }
];

// Seed the 110 spots to match the UI visual reference exactly:
// Available: 42, Occupied: 64, Guest: 4. Total = 110
function seedSpots() {
  const seededSpots: Spot[] = [];
  
  // Definimos de forma consistente los pisos y cuadrantes
  // Floor G: Spots 101 - 130 (30 spots)
  // Floor 1: Spots 201 - 230 (30 spots)
  // Floor 2: Spots 301 - 330 (30 spots)
  // Executive: Spots 401 - 420 (20 spots)
  const totalSpots = 110;
  
  // Seed state counts to achieve exact counts:
  // We need exactly 4 guest spots. Let's designate specific spots.
  const guestSpots = [12, 42, 72, 102]; // Exactly 4 spots
  
  // We need exactly 64 occupied spots, meaning the remaining 44 spots will be split:
  // 110 total - 4 guest = 106.
  // We need exactly 64 occupied, and the rest (42) available.
  // Let's create a deterministic/random lookup that satisfies this:
  let occupiedCount = 0;
  const targetOccupied = 64;

  for (let i = 1; i <= totalSpots; i++) {
    // Determinar piso
    let floor: "G" | "1" | "2" | "Executive" = "G";
    let num = 100 + i;
    if (i <= 30) {
      floor = "G";
      num = 100 + i;
    } else if (i <= 60) {
      floor = "1";
      num = 200 + (i - 30);
    } else if (i <= 90) {
      floor = "2";
      num = 300 + (i - 60);
    } else {
      floor = "Executive";
      num = 400 + (i - 90);
    }

    // Determinar cuadrante militarmente uniforme
    let quadrant: "A" | "B" | "C" | "D" = "A";
    if (i <= 28) quadrant = "A";
    else if (i <= 56) quadrant = "B";
    else if (i <= 84) quadrant = "C";
    else quadrant = "D";

    // Formando el identificador del cupo del Guardia panel "A-01", "B-12", "C-09"
    const isone = i % 30 || 30; // 1 to 30 inside each zone index
    const prefix = quadrant;
    const numStr = isone.toString().padStart(2, "0");
    const id = `${prefix}-${numStr}`;

    // Determinar estado basado de la estadística requerida
    let status: SpotStatus = "available";
    let occupant: string | null = null;
    let duration: string | null = null;

    if (guestSpots.includes(i)) {
      status = "guest";
      occupant = "INVITADO SÉDE MAIPÚ";
      duration = "Pase de Visita";
    } else {
      // Determinamos si es ocupado para llegar al target de 64
      // Podemos usar un algoritmo de llenado simple
      if (occupiedCount < targetOccupied && (i % 3 !== 0 || occupiedCount < targetOccupied - 15)) {
        status = "occupied";
        occupiedCount++;
        const plates = ["K-902-LX", "BC-4921", "DL-9081", "XP-3920", "HG-1290", "PL-4422", "TX-2110"];
        const randomPlate = plates[i % plates.length];
        occupant = `Patente: ${randomPlate}`;
        duration = `${Math.floor(Math.random() * 3) + 1}h ${Math.floor(Math.random() * 60)}m`;
      }
    }

    // Algunos cupos particulares con cargadores eléctricos
    const isEV = i % 15 === 0;

    seededSpots.push({
      id,
      number: num,
      floor,
      quadrant,
      status,
      occupant,
      duration,
      isEV
    });
  }
  
  spots = seededSpots;
}

seedSpots();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API ENDPOINTS ---

  // Healthcheck API
  app.get("/api/health", (req, res) => {
    res.json({ status: "up", time: new Date() });
  });

  // Get all spots
  app.get("/api/spots", (req, res) => {
    res.json(spots);
  });

  // Park in a spot (Driver client action)
  app.post("/api/spots/:id/park", (req, res) => {
    const { id } = req.params;
    const { occupant } = req.body; // e.g. license plate or user identifier
    
    const spot = spots.find(s => s.id === id);
    if (!spot) {
      return res.status(404).json({ error: "Cupo no encontrado" });
    }

    if (spot.status !== "available") {
      return res.status(400).json({ error: `El cupo ${id} no está disponible` });
    }

    spot.status = "occupied";
    spot.occupant = occupant || "Conductor Autorizado";
    spot.duration = "0h 01m";

    // Log the activity
    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      type: "entry",
      spotId: id,
      detail: `Cupo #${spot.number} (${id}) fue ocupado por ${spot.occupant}`,
      timestamp: "Hace un momento"
    };
    logs.unshift(newLog);

    res.json({ success: true, spot });
  });

  // Reserve a spot (Driver client action)
  app.post("/api/spots/:id/reserve", (req, res) => {
    const { id } = req.params;
    const { occupant } = req.body;

    const spot = spots.find(s => s.id === id);
    if (!spot) {
      return res.status(404).json({ error: "Cupo no encontrado" });
    }

    spot.status = "occupied";
    spot.occupant = occupant || "Reserva Conductor";
    spot.duration = "Reserva Activa";

    // Log the activity
    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      type: "reserve",
      spotId: id,
      detail: `Cupo #${spot.number} (${id}) reservado manualmente desde App`,
      timestamp: "Hace un momento"
    };
    logs.unshift(newLog);

    res.json({ success: true, spot });
  });

  // Exit/Unpark from a spot
  app.post("/api/spots/:id/unpark", (req, res) => {
    const { id } = req.params;
    const spot = spots.find(s => s.id === id);
    if (!spot) {
      return res.status(404).json({ error: "Cupo no encontrado" });
    }

    spot.status = "available";
    const previousOccupant = spot.occupant;
    spot.occupant = null;
    spot.duration = null;

    // Log the activity
    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      type: "exit",
      spotId: id,
      detail: `Cupo #${spot.number} (${id}) liberado: ${previousOccupant || "vehículo"} salió`,
      timestamp: "Hace un momento"
    };
    logs.unshift(newLog);

    res.json({ success: true, spot });
  });

  // Register a spot for Guest (Admin action)
  app.post("/api/spots/:id/block", (req, res) => {
    const { id } = req.params;
    const spot = spots.find(s => s.id === id);
    if (!spot) {
      return res.status(404).json({ error: "Cupo no encontrado" });
    }

    spot.status = "guest";
    spot.occupant = "INVITADO SÉDE MAIPÚ";
    spot.duration = "Pase de Visita";

    // Log the activity
    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      type: "block",
      spotId: id,
      detail: `Cupo #${spot.number} (${id}) registrado como Invitado por Portería`,
      timestamp: "Hace un momento"
    };
    logs.unshift(newLog);

    res.json({ success: true, spot });
  });

  // Reset/Reset all spots (Restore seeds for debug)
  app.post("/api/utility/reset", (req, res) => {
    seedSpots();
    logs = [
      {
        id: "log-1",
        type: "exit",
        spotId: "A-12",
        detail: "Spot A-12 Vacated - Exit processed successfully",
        timestamp: "NOW"
      },
      {
        id: "log-2",
        type: "entry",
        spotId: "B-04",
        detail: "Spot B-04 Occupied - Plate: ABC-1234",
        timestamp: "2m ago"
      },
      {
        id: "log-3",
        type: "block",
        spotId: "C-22",
        detail: "Cupo C-22 ocupado - Registrado como Invitado por Portería",
        timestamp: "8m ago"
      }
    ];
    res.json({ success: true, message: "Base de datos reseteada a estado mock de referencia." });
  });

  // Get activity logs
  app.get("/api/logs", (req, res) => {
    res.json(logs);
  });

  // Simulate OCR Entrance Plate scan on CCTV
  app.post("/api/utility/scan-plate", (req, res) => {
    const { plate } = req.body;
    const activePlate = plate || `K-${Math.floor(Math.random() * 899) + 100}-${["LX", "XP", "TZ", "HN"][Math.floor(Math.random() * 4)]}`;

    // Encuentra el primer cupo libre para ocuparlo automáticamente
    const freeSpot = spots.find(s => s.status === "available");
    if (freeSpot) {
      freeSpot.status = "occupied";
      freeSpot.occupant = `Patente: ${activePlate}`;
      freeSpot.duration = "0h 01m";

      const newLog: ActivityLog = {
        id: `log-${Date.now()}`,
        type: "entry",
        spotId: freeSpot.id,
        detail: `CCTV detectó ingreso: ${activePlate} se estacionó en cupo #${freeSpot.number} (${freeSpot.id})`,
        timestamp: "NOW"
      };
      logs.unshift(newLog);
      return res.json({ success: true, spot: freeSpot, plate: activePlate });
    }

    res.status(400).json({ error: "No hay cupos disponibles para simular estacionado" });
  });

  // --- GEMINI AI MODEL INTEGRATION ROUTE ---
  app.post("/api/gemini/trends", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        // Fallback robust mock report if no API key is provided
        console.warn("Retornando reporte Gemini mockeado debido a API Key no configurada.");
        return res.json({
          report: `### **Análisis de Tendencias Estructurales - ParkFlow Engine**
*Análisis predictivo generado con simulación avanzada de inteligencia artificial para Duoc UC.*

#### **Horas Críticas Robustas Detectadas:**
- **Pico Matutino:** Lunes a Viernes entre **08:45 AM - 10:15 AM** (Tasa de ocupación proyectada: **98.4%**). Elevada congestión en Accesos G y Piso 1 por llegada del bloque académico principal.
- **Pico Vespertino:** Martes y Jueves entre **18:30 PM - 20:00 PM** (Ocupación proyectada: **91.2%**) debido a programas vespertinos.

#### **Sugerencias de Operación y Mitigaciones:**
1. **Redirección de Flujo:** Canalizar vehículos en ingreso por encima del 80% hacia el **Cuadrante D (VIP/Overflow)** para mitigar embotellamiento en rampa norte.
2. **Ajuste de Turnos en Portería:** Desplegar personal adicional en el ingreso principal del campus a las 08:15 AM con control ágil mediante QR de alumnos.
3. **Mantenimiento Preventivo:** El sensor del **Cupo #102 (A-02)** muestra latencia inusual (posible suciedad en sensor fotoeléctrico). Planificar limpieza técnica entre 14:00 y 16:00 (periodo valle).

*Generación por Gemini Engine 3.5-Flash (Simulado)*`,
          isMock: true
        });
      }

      // Initialize Gemini SDK with custom user-agent header
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });

      // Calculate current states
      const total = spots.length;
      const occupied = spots.filter(s => s.status === "occupied").length;
      const available = spots.filter(s => s.status === "available").length;
      const guests = spots.filter(s => s.status === "guest").length;

      // Construct a tailored state prompt for Gemini
      const stateSummary = `
        Estadísticas actuales de estacionamientos:
        - Total de cupos: ${total}
        - Cupos Ocupados: ${occupied} (${Math.round((occupied/total)*100)}%)
        - Cupos Libres: ${available} (${Math.round((available/total)*100)}%)
        - Cupos de Invitados Sede: ${guests} (${Math.round((guests/total)*100)}%)
        Sectores de Estacionamiento: Sector A (28 cupos), Sector B (28 cupos), Sector C (28 cupos), Sector D (26 cupos).
        Campus: Duoc UC Sede Maipú.
        Hora actual simulada: mañana de un día laboral de alta concurrencia.
      `;

      const systemPrompt = `
        Eres el motor de Inteligencia Artificial (Gemini Engine) integrado en la plataforma de gestión inteligente "Duoc UC Parking" para el campus Duoc UC.
        Debes formular un informe profesional de análisis de tendencias, horas críticas y recomendaciones de optimización arquitectónica en base al estado de ocupación provisto.
        Utiliza lenguaje formal, claro y profesional de un Arquitecto de Software y Gestor Operativo.
        El informe debe estar escrito 100% en Español, estructurado con Markdown y secciones legibles como:
        - Horas Críticas Detectadas (haciendo alusión a horas específicas como 08:45 AM - 10:15 AM).
        - Estrategias de Mitigación y Redirección Operativa (por ej. redirección a cuadrantes B o D, o recarga EV).
        - Estado de Sensores y sugerencias de mantenimiento.
        Sé creativo, pero mantén consistencia con un alto nivel ejecutivo de diseño de UI moderno.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Analiza el siguiente estado actual de la plataforma de estacionamiento y genera el reporte solicitado:\n\n${stateSummary}`,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7
        }
      });

      const reportText = response.text || "No se pudo obtener el reporte de inteligencia artificial.";
      res.json({ report: reportText, isMock: false });
    } catch (apiError: any) {
      console.error("Error calling Gemini API:", apiError);
      res.status(500).json({ error: "Fallo al consultar con el motor de IA", details: apiError.message });
    }
  });


  // --- VITE MIDDLEWARE CONFIGURATION ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Duoc UC Parking Server] running on http://localhost:${PORT}`);
  });
}

startServer();
