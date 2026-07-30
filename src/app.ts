import cors from "cors";
import express from "express";
import { delayMiddleware } from "./middlewares/delay.middleware";
import { errorMiddleware } from "./middlewares/error.middleware";
import { prisma } from "./lib/prisma";
import { router } from "./routes";

export function createApp() {
  const app = express();

  // Modo demo: sin restricción de origen (acepta cualquier frontend que lo consuma).
  app.use(cors());
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
      modo: "demo",
      uptimeSegundos: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      db,
    });
  });

  app.use(errorMiddleware);

  return app;
}
