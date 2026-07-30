import { Request, Response } from "express";
import { controlPreventivoService } from "../services/controlPreventivo.service";
import { asyncHandler } from "../utils/asyncHandler";

export const controlPreventivoController = {
  historial: asyncHandler(async (req: Request, res: Response) => {
    const mascotaId = Number(req.params.id);
    res.json({ controles: await controlPreventivoService.historialDeMascota(mascotaId) });
  }),

  proximosAVencer: asyncHandler(async (req: Request, res: Response) => {
    const dias = Number(req.query.dias) || 30;
    res.json({ controles: await controlPreventivoService.proximosAVencer(dias) });
  }),

  crear: asyncHandler(async (req: Request, res: Response) => {
    const control = await controlPreventivoService.crear(req.body);
    res.status(201).json({ control });
  }),
};
