import { Request, Response } from "express";
import { medicamentoService } from "../services/medicamento.service";
import { asyncHandler } from "../utils/asyncHandler";

export const medicamentoController = {
  listar: asyncHandler(async (_req: Request, res: Response) => {
    res.json({ medicamentos: await medicamentoService.listar() });
  }),

  bajoStock: asyncHandler(async (_req: Request, res: Response) => {
    res.json({ medicamentos: await medicamentoService.bajoStock() });
  }),

  registrarEntrada: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { cantidad } = req.body as { cantidad?: number };
    const medicamento = await medicamentoService.registrarEntrada(id, Number(cantidad));
    res.status(201).json({ medicamento });
  }),
};
