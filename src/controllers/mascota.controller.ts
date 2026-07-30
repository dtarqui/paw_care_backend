import { Request, Response } from "express";
import { mascotaService } from "../services/mascota.service";
import { asyncHandler } from "../utils/asyncHandler";

export const mascotaController = {
  listar: asyncHandler(async (_req: Request, res: Response) => {
    res.json({ mascotas: mascotaService.listar() });
  }),

  buscar: asyncHandler(async (req: Request, res: Response) => {
    const ci = String(req.query.ci ?? "");
    if (!ci) {
      return res.status(400).json({ error: "El parámetro ci es obligatorio" });
    }
    res.json({ mascotas: mascotaService.buscarPorCiPropietario(ci) });
  }),

  crear: asyncHandler(async (req: Request, res: Response) => {
    const mascota = mascotaService.crear(req.body);
    res.status(201).json({ mascota });
  }),
};
