import { Request, Response } from "express";
import { veterinarioService } from "../services/veterinario.service";
import { asyncHandler } from "../utils/asyncHandler";

export const veterinarioController = {
  listar: asyncHandler(async (_req: Request, res: Response) => {
    res.json({ veterinarios: veterinarioService.listar() });
  }),
};
