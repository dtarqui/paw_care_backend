import cors from "cors";
import express from "express";
import { delayMiddleware } from "./middlewares/delay.middleware";
import { errorMiddleware } from "./middlewares/error.middleware";
import { router } from "./routes";

export function createApp() {
  const app = express();

  // Modo demo: sin restricción de origen (acepta cualquier frontend que lo consuma).
  app.use(cors());
  app.use(express.json());
  app.use("/api", delayMiddleware, router);

  app.get("/health", (_req, res) => res.json({ status: "ok", modo: "demo" }));

  app.use(errorMiddleware);

  return app;
}
