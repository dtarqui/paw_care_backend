import cors from "cors";
import express from "express";
import helmet from "helmet";
import { delayMiddleware } from "./middlewares/delay.middleware";
import { errorMiddleware } from "./middlewares/error.middleware";
import { prisma } from "./lib/prisma";
import { router } from "./routes";

export function createApp() {
  const app = express();

  app.use(helmet());

  // Si FRONTEND_URL está configurada, solo ese origen (+ localhost de desarrollo)
  // puede llamar a la API. Sin configurar, queda abierta (comportamiento anterior)
  // para no romper un despliegue que todavía no la haya definido.
  const frontendUrls = (process.env.FRONTEND_URL ?? "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);
  const origenesPermitidos = ["http://localhost:5173", ...frontendUrls];
  app.use(cors({ origin: frontendUrls.length > 0 ? origenesPermitidos : true }));

  app.use(express.json());
  app.use("/api", delayMiddleware, router);

  app.get("/health", async (_req, res) => {
    const inicio = Date.now();
    let db: { status: "ok" | "error"; latenciaMs?: number; error?: string };

    try {
      await prisma.$queryRaw`SELECT 1`;
      db = { status: "ok", latenciaMs: Date.now() - inicio };
    } catch (error) {
      db = { status: "error", error: error instanceof Error ? error.message : "error desconocido" };
    }

    const status = db.status === "ok" ? 200 : 503;
    res.status(status).json({
      status: db.status === "ok" ? "ok" : "degraded",
      uptimeSegundos: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      db,
    });
  });

  app.use(errorMiddleware);

  return app;
}
