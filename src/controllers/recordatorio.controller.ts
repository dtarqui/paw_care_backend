import { Request, Response } from "express";
import { recordatorioService } from "../services/recordatorio.service";
import { asyncHandler } from "../utils/asyncHandler";

export const recordatorioController = {
  pendientes: asyncHandler(async (_req: Request, res: Response) => {
    res.json({ recordatorios: recordatorioService.pendientes() });
  }),

  marcarEnviado: asyncHandler(async (req: Request, res: Response) => {
    recordatorioService.marcarEnviado(req.params.id);
    res.json({ ok: true });
  }),
};
