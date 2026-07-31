import { Request, Response } from "express";
import { veterinarioService } from "../services/veterinario.service";
import { asyncHandler } from "../utils/asyncHandler";

export const veterinarioController = {
  listar: asyncHandler(async (req: Request, res: Response) => {
    const soloActivos = req.query.activos === "true";
    res.json({ veterinarios: await veterinarioService.listar(soloActivos) });
  }),
};
