import { Request, Response } from "express";
import { atencionService } from "../services/atencion.service";
import { asyncHandler } from "../utils/asyncHandler";

export const atencionController = {
  historial: asyncHandler(async (req: Request, res: Response) => {
    const mascotaId = Number(req.params.id);
    res.json({ atenciones: await atencionService.historialDeMascota(mascotaId) });
  }),

  crear: asyncHandler(async (req: Request, res: Response) => {
    const atencion = await atencionService.crear(req.body);
    res.status(201).json({ atencion });
  }),
};
