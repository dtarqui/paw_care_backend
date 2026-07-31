import { Request, Response } from "express";
import { recordatorioService } from "../services/recordatorio.service";
import { asyncHandler } from "../utils/asyncHandler";

export const recordatorioController = {
  pendientes: asyncHandler(async (_req: Request, res: Response) => {
    res.json({ recordatorios: await recordatorioService.pendientes() });
  }),

  historial: asyncHandler(async (req: Request, res: Response) => {
    const limit = Number(req.query.limit) || 5;
    res.json({ enviados: await recordatorioService.historialEnviados(limit) });
  }),

  marcarEnviado: asyncHandler(async (req: Request, res: Response) => {
    await recordatorioService.marcarEnviado(req.params.id);
    res.json({ ok: true });
  }),
};
