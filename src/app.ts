import cors from "cors";
import express from "express";
import helmet from "helmet";
import { delayMiddleware } from "./middlewares/delay.middleware";
import { errorMiddleware } from "./middlewares/error.middleware";
import { prisma } from "./lib/prisma";
import { router } from "./routes";

export function createApp() {
  const app = express();

  // Detrás del proxy de Vercel la IP del cliente llega en X-Forwarded-For; sin esto
  // `req.ip` sería siempre la del proxy. Importa por partida doble: el registro de
  // ingresos anotaría la misma IP para todo el mundo, y el freno anti fuerza-bruta
  // del login (10 intentos por IP) pasaría a ser un cupo único compartido por toda
  // la clínica. Es 1 salto —el del proxy— y no `true`, que sería confiar en cualquier
  // cabecera que llegue.
  app.set("trust proxy", 1);

  app.use(helmet());

  // Si FRONTEND_URL está configurada, solo ese origen (+ localhost de desarrollo)
  // puede llamar a la API. Sin configurar, queda abierta (comportamiento anterior)
  // para no romper un despliegue que todavía no la haya definido.
  const frontendUrls = (process.env.FRONTEND_URL ?? "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);
  const allowedOrigins = ["http://localhost:5173", ...frontendUrls];
  app.use(cors({ origin: frontendUrls.length > 0 ? allowedOrigins : true }));

  app.use(express.json());
  app.use("/api", delayMiddleware, router);

  app.get("/health", async (_req, res) => {
    const start = Date.now();
    let db: { status: "ok" | "error"; latencyMs?: number; error?: string };

    try {
      await prisma.$queryRaw`SELECT 1`;
      db = { status: "ok", latencyMs: Date.now() - start };
    } catch (error) {
      db = { status: "error", error: error instanceof Error ? error.message : "error desconocido" };
    }

    const status = db.status === "ok" ? 200 : 503;
    res.status(status).json({
      status: db.status === "ok" ? "ok" : "degraded",
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      db,
    });
  });

  app.use(errorMiddleware);

  return app;
}
