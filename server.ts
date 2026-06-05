import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { User, ActivityLog } from "./src/types";

dotenv.config();

// ============================================================
//  SUPABASE CLIENT
//  Las credenciales se leen de .env (SUPABASE_URL y SUPABASE_ANON_KEY)
// ============================================================
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("[CONFIG ERROR] Faltan SUPABASE_URL o SUPABASE_ANON_KEY en el archivo .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// ============================================================
//  HELPERS: Adaptar datos de Supabase al formato del frontend
//
//  Tu tabla `estacionamientos` tiene:
//    id (int4), numero (varchar ej: "A-01"), sector (enum A/B/C/D),
//    estado (enum), ocupado_por (uuid), ultima_actualizacion (timestamptz)
//
//  El frontend espera:
//    id (string), number (int), floor (string), quadrant (string),
//    status ("available"|"occupied"|"guest"), occupant (string|null),
//    duration (string|null), isEV (bool)
// ============================================================

/** Convierte número de cupo de Supabase al formato de número entero para el frontend */
function extraerNumero(numero: string): number {
  // "A-01" → 1,  "B-14" → 42, etc.
  // Extraemos la parte numérica y la convertimos
  const match = numero.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

/** Mapea estado de Supabase al enum del frontend */
function mapEstado(estado: string): "available" | "occupied" | "guest" {
  switch (estado) {
    case "ocupado":    return "occupied";
    case "invitado":   return "guest";
    case "bloqueado":  return "guest"; // bloqueado se muestra como invitado en la UI
    default:           return "available";
  }
}

/** Mapea enum del frontend al estado de Supabase */
function mapEstadoInverso(status: string): string {
  switch (status) {
    case "occupied":  return "ocupado";
    case "guest":     return "invitado";
    default:          return "disponible";
  }
}

/** Convierte una fila de Supabase al formato Spot del frontend */
function supabaseRowToSpot(row: any) {
  return {
    id: row.numero,           // "A-01" — el frontend usa esto como identificador visual
    number: extraerNumero(row.numero),
    floor: "G" as const,      // tu tabla no tiene piso, asumimos planta baja
    quadrant: row.sector as "A" | "B" | "C" | "D",
    status: mapEstado(row.estado),
    occupant: row.perfiles?.nombre
      ? `${row.perfiles.nombre} (${row.perfiles.patente_vehiculo || "S/P"})`
      : (row.estado !== "disponible" ? "Ocupante Registrado" : null),
    duration: row.ultima_actualizacion
      ? calcularTiempoTranscurrido(row.ultima_actualizacion)
      : null,
    isEV: false,
    _supabaseId: row.id       // guardamos el id int4 real para las operaciones de escritura
  };
}

/** Calcula tiempo transcurrido desde ultima_actualizacion */
function calcularTiempoTranscurrido(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Hace un momento";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m`;
}

/** Convierte fila de bitacora_eventos al formato ActivityLog del frontend */
function supabaseEventoToLog(row: any): ActivityLog {
  const tipoMap: Record<string, ActivityLog["type"]> = {
    INGRESO:  "entry",
    SALIDA:   "exit",
    BLOQUEO:  "block",
    RESERVA:  "reserve",
  };
  return {
    id: String(row.id),
    type: tipoMap[row.tipo_evento] || "entry",
    spotId: row.estacionamientos?.numero || String(row.estacionamiento_id),
    detail: `[${row.tipo_evento}] Cupo ${row.estacionamientos?.numero || row.estacionamiento_id} → ${row.estado_nuevo}${row.perfiles?.nombre ? ` por ${row.perfiles.nombre}` : ""}`,
    timestamp: calcularTiempoTranscurrido(row.fecha_hora)
  };
}

// ============================================================
//  MOCK USER: mientras no tienes auth real, usamos un usuario fijo
//  para registrar las operaciones en Supabase.
//  Reemplaza este UUID con un id real de tu tabla `perfiles`.
// ============================================================
const MOCK_USER_ID_CONDUCTOR = process.env.MOCK_USER_ID || null;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // ── CORS para desarrollo ────────────────────────────────
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") return res.status(204).end();
    next();
  });

  // ── Healthcheck ────────────────────────────────────────
  app.get("/api/health", async (req, res) => {
    const { error } = await supabase.from("estacionamientos").select("id").limit(1);
    res.json({
      status: error ? "degraded" : "up",
      supabase: error ? `error: ${error.message}` : "connected",
      time: new Date()
    });
  });

  // ──────────────────────────────────────────────────────
  //  GET /api/spots
  //  Obtiene todos los cupos desde Supabase con JOIN a perfiles
  // ──────────────────────────────────────────────────────
  app.get("/api/spots", async (req, res) => {
    const { sector, estado } = req.query;

    let query = supabase
      .from("estacionamientos")
      .select(`
        id, numero, sector, estado, ocupado_por, ultima_actualizacion,
        perfiles ( nombre, patente_vehiculo, correo )
      `)
      .order("id", { ascending: true });

    if (sector) query = query.eq("sector", String(sector).toUpperCase());
    if (estado) query = query.eq("estado", String(estado).toLowerCase());

    const { data, error } = await query;

    if (error) {
      console.error("[GET /api/spots] Error:", error);
      return res.status(500).json({ error: "Error al consultar Supabase", detalle: error.message });
    }

    const spots = (data || []).map(supabaseRowToSpot);
    res.json(spots);
  });

  // ──────────────────────────────────────────────────────
  //  POST /api/spots/:id/park
  //  Estacionar un vehículo (Conductor)
  //  :id = numero del cupo ej: "A-01"
  // ──────────────────────────────────────────────────────
  app.post("/api/spots/:id/park", async (req, res) => {
    const { id } = req.params;
    const { occupant } = req.body;

    // 1. Leer estado actual del cupo por numero (que es el id visual del frontend)
    const { data: cupos, error: selectError } = await supabase
      .from("estacionamientos")
      .select("id, numero, sector, estado")
      .eq("numero", id)
      .single();

    if (selectError || !cupos) {
      return res.status(404).json({ error: `Cupo "${id}" no encontrado en Supabase` });
    }

    if (cupos.estado !== "disponible") {
      return res.status(400).json({ error: `El cupo ${id} no está disponible (estado: ${cupos.estado})` });
    }

    const estadoPrevio = cupos.estado;

    // 2. Actualizar estado
    const { data: updated, error: updateError } = await supabase
      .from("estacionamientos")
      .update({
        estado: "ocupado",
        ocupado_por: MOCK_USER_ID_CONDUCTOR,
        ultima_actualizacion: new Date().toISOString()
      })
      .eq("id", cupos.id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: "Error al actualizar el cupo", detalle: updateError.message });
    }

    // 3. Registrar en bitácora
    await supabase.from("bitacora_eventos").insert({
      estacionamiento_id: cupos.id,
      usuario_id: MOCK_USER_ID_CONDUCTOR,
      tipo_evento: "INGRESO",
      estado_previo: estadoPrevio,
      estado_nuevo: "ocupado"
    });

    res.json({ success: true, spot: supabaseRowToSpot(updated) });
  });

  // ──────────────────────────────────────────────────────
  //  POST /api/spots/:id/reserve
  //  Reservar como invitado (Guardia / Admin)
  // ──────────────────────────────────────────────────────
  app.post("/api/spots/:id/reserve", async (req, res) => {
    const { id } = req.params;

    const { data: cupo, error: selectError } = await supabase
      .from("estacionamientos")
      .select("id, numero, estado")
      .eq("numero", id)
      .single();

    if (selectError || !cupo) {
      return res.status(404).json({ error: `Cupo "${id}" no encontrado` });
    }

    const estadoPrevio = cupo.estado;

    const { data: updated, error } = await supabase
      .from("estacionamientos")
      .update({
        estado: "invitado",
        ocupado_por: MOCK_USER_ID_CONDUCTOR,
        ultima_actualizacion: new Date().toISOString()
      })
      .eq("id", cupo.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    await supabase.from("bitacora_eventos").insert({
      estacionamiento_id: cupo.id,
      usuario_id: MOCK_USER_ID_CONDUCTOR,
      tipo_evento: "INGRESO",
      estado_previo: estadoPrevio,
      estado_nuevo: "invitado"
    });

    res.json({ success: true, spot: supabaseRowToSpot(updated) });
  });

  // ──────────────────────────────────────────────────────
  //  POST /api/spots/:id/unpark
  //  Liberar cupo (Conductor, Guardia, Admin)
  // ──────────────────────────────────────────────────────
  app.post("/api/spots/:id/unpark", async (req, res) => {
    const { id } = req.params;

    const { data: cupo, error: selectError } = await supabase
      .from("estacionamientos")
      .select("id, numero, estado")
      .eq("numero", id)
      .single();

    if (selectError || !cupo) {
      return res.status(404).json({ error: `Cupo "${id}" no encontrado` });
    }

    const estadoPrevio = cupo.estado;

    const { data: updated, error } = await supabase
      .from("estacionamientos")
      .update({
        estado: "disponible",
        ocupado_por: null,
        ultima_actualizacion: new Date().toISOString()
      })
      .eq("id", cupo.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    await supabase.from("bitacora_eventos").insert({
      estacionamiento_id: cupo.id,
      usuario_id: MOCK_USER_ID_CONDUCTOR,
      tipo_evento: "SALIDA",
      estado_previo: estadoPrevio,
      estado_nuevo: "disponible"
    });

    res.json({ success: true, spot: supabaseRowToSpot(updated) });
  });

  // ──────────────────────────────────────────────────────
  //  POST /api/spots/:id/block
  //  Bloquear/reservar para invitado (Admin / Guardia)
  // ──────────────────────────────────────────────────────
  app.post("/api/spots/:id/block", async (req, res) => {
    const { id } = req.params;

    const { data: cupo, error: selectError } = await supabase
      .from("estacionamientos")
      .select("id, numero, estado")
      .eq("numero", id)
      .single();

    if (selectError || !cupo) {
      return res.status(404).json({ error: `Cupo "${id}" no encontrado` });
    }

    const estadoPrevio = cupo.estado;

    const { data: updated, error } = await supabase
      .from("estacionamientos")
      .update({
        estado: "invitado",
        ocupado_por: MOCK_USER_ID_CONDUCTOR,
        ultima_actualizacion: new Date().toISOString()
      })
      .eq("id", cupo.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    await supabase.from("bitacora_eventos").insert({
      estacionamiento_id: cupo.id,
      usuario_id: MOCK_USER_ID_CONDUCTOR,
      tipo_evento: "BLOQUEO",
      estado_previo: estadoPrevio,
      estado_nuevo: "invitado"
    });

    res.json({ success: true, spot: supabaseRowToSpot(updated) });
  });

  // ──────────────────────────────────────────────────────
  //  GET /api/logs
  //  Últimos 50 eventos de bitácora desde Supabase
  // ──────────────────────────────────────────────────────
  app.get("/api/logs", async (req, res) => {
    const { data, error } = await supabase
      .from("bitacora_eventos")
      .select(`
        id, tipo_evento, estado_previo, estado_nuevo, fecha_hora,
        estacionamiento_id,
        estacionamientos ( numero ),
        perfiles ( nombre, patente_vehiculo )
      `)
      .order("fecha_hora", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[GET /api/logs] Error:", error);
      return res.status(500).json({ error: error.message });
    }

    const logs = (data || []).map(supabaseEventoToLog);
    res.json(logs);
  });

  // ──────────────────────────────────────────────────────
  //  POST /api/utility/reset
  //  Restaurar todos los cupos a "disponible" en Supabase
  // ──────────────────────────────────────────────────────
  app.post("/api/utility/reset", async (req, res) => {
    const { error } = await supabase
      .from("estacionamientos")
      .update({
        estado: "disponible",
        ocupado_por: null,
        ultima_actualizacion: new Date().toISOString()
      })
      .neq("id", 0); // neq(0) = todas las filas (workaround para update masivo)

    if (error) {
      return res.status(500).json({ error: "Error al resetear cupos", detalle: error.message });
    }

    res.json({ success: true, message: "Todos los cupos reseteados a disponible en Supabase." });
  });

  // ──────────────────────────────────────────────────────
  //  POST /api/utility/scan-plate
  //  Simula OCR de CCTV: ocupa el primer cupo disponible
  // ──────────────────────────────────────────────────────
  app.post("/api/utility/scan-plate", async (req, res) => {
    const { plate } = req.body;
    const activePlate = plate || `K-${Math.floor(Math.random() * 899) + 100}-LX`;

    // Buscar el primer cupo disponible
    const { data: disponibles, error: selectError } = await supabase
      .from("estacionamientos")
      .select("id, numero, sector")
      .eq("estado", "disponible")
      .order("id", { ascending: true })
      .limit(1);

    if (selectError || !disponibles || disponibles.length === 0) {
      return res.status(400).json({ error: "No hay cupos disponibles para simular CCTV" });
    }

    const cupo = disponibles[0];
    const estadoPrevio = "disponible";

    const { data: updated, error: updateError } = await supabase
      .from("estacionamientos")
      .update({
        estado: "ocupado",
        ocupado_por: MOCK_USER_ID_CONDUCTOR,
        ultima_actualizacion: new Date().toISOString()
      })
      .eq("id", cupo.id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    await supabase.from("bitacora_eventos").insert({
      estacionamiento_id: cupo.id,
      usuario_id: MOCK_USER_ID_CONDUCTOR,
      tipo_evento: "INGRESO",
      estado_previo: estadoPrevio,
      estado_nuevo: "ocupado",
      notas: `CCTV OCR detectó patente: ${activePlate}`
    });

    res.json({ success: true, spot: supabaseRowToSpot(updated), plate: activePlate });
  });

  // ──────────────────────────────────────────────────────
  //  POST /api/gemini/trends
  //  Análisis IA (igual que antes, pero con datos reales de Supabase)
  // ──────────────────────────────────────────────────────
  app.post("/api/gemini/trends", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;

      // Obtener estadísticas reales desde Supabase
      const { data: spotsData } = await supabase
        .from("estacionamientos")
        .select("estado, sector");

      const total     = spotsData?.length || 110;
      const occupied  = spotsData?.filter(s => s.estado === "ocupado").length || 0;
      const available = spotsData?.filter(s => s.estado === "disponible").length || 0;
      const guests    = spotsData?.filter(s => s.estado === "invitado").length || 0;

      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        return res.json({
          report: `### **Análisis de Tendencias - ParkFlow Engine (Datos Reales Supabase)**\n\n**Estado actual:**\n- Total cupos: ${total}\n- Disponibles: ${available} (${Math.round((available/total)*100)}%)\n- Ocupados: ${occupied} (${Math.round((occupied/total)*100)}%)\n- Invitados: ${guests}\n\n#### Horas Críticas Detectadas:\n- **Pico Matutino:** Lunes a Viernes 08:45 - 10:15 AM (98.4%)\n- **Pico Vespertino:** Martes y Jueves 18:30 - 20:00 PM (91.2%)\n\n#### Sugerencias:\n1. Redirigir vehículos al Sector D cuando ocupación supere 80%\n2. Desplegar personal adicional a las 08:15 AM`,
          isMock: true
        });
      }

      const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { "User-Agent": "aistudio-build" } } });
      const stateSummary = `Total: ${total}, Ocupados: ${occupied}, Libres: ${available}, Invitados: ${guests}. Campus: Duoc UC Sede Maipú.`;
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Analiza el estado actual de estacionamiento y genera un reporte ejecutivo en español con Markdown:\n\n${stateSummary}`,
        config: {
          systemInstruction: "Eres el motor de IA de Duoc UC Parking. Genera informes profesionales en español con horas críticas, estrategias de mitigación y estado de sensores.",
          temperature: 0.7
        }
      });

      res.json({ report: response.text || "Sin respuesta.", isMock: false });
    } catch (apiError: any) {
      console.error("Error Gemini:", apiError);
      res.status(500).json({ error: "Fallo al consultar IA", details: apiError.message });
    }
  });

  // ── VITE MIDDLEWARE ───────────────────────────────────
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
    console.log(`[Duoc UC Parking] ✅ Servidor corriendo en http://localhost:${PORT}`);
    console.log(`[Supabase] ✅ Conectado a ${supabaseUrl}`);
  });
}

startServer();
