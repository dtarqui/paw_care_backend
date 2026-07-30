import { Request, Response } from "express";
import { usuarioService } from "../services/usuario.service";
import { asyncHandler } from "../utils/asyncHandler";

export const usuarioController = {
  listar: asyncHandler(async (_req: Request, res: Response) => {
    res.json({ usuarios: usuarioService.listar() });
  }),

  crear: asyncHandler(async (req: Request, res: Response) => {
    const usuario = usuarioService.crear(req.body);
    res.status(201).json({ usuario });
  }),
};
