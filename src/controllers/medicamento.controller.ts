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

  crear: asyncHandler(async (req: Request, res: Response) => {
    const { nombre, stockMinimo, stockInicial } = req.body as { nombre?: string; stockMinimo?: number; stockInicial?: number };
    const medicamento = await medicamentoService.crear({ nombre: nombre ?? "", stockMinimo: Number(stockMinimo), stockInicial: stockInicial ? Number(stockInicial) : undefined });
    res.status(201).json({ medicamento });
  }),

  actualizar: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { nombre, stockMinimo } = req.body as { nombre?: string; stockMinimo?: number };
    const medicamento = await medicamentoService.actualizar(id, { nombre, stockMinimo: stockMinimo === undefined ? undefined : Number(stockMinimo) });
    res.json({ medicamento });
  }),

  eliminar: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    await medicamentoService.eliminar(id);
    res.status(204).send();
  }),
};
