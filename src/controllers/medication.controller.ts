import { Request, Response } from "express";
import { medicationService } from "../services/medication.service";
import { asyncHandler } from "../utils/asyncHandler";

export const medicationController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    res.json({ medications: await medicationService.list() });
  }),

  lowStock: asyncHandler(async (_req: Request, res: Response) => {
    res.json({ medications: await medicationService.lowStock() });
  }),

  registerStockIn: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { quantity } = req.body as { quantity?: number };
    const medication = await medicationService.registerStockIn(id, Number(quantity));
    res.status(201).json({ medication });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const { name, minimumStock, initialStock } = req.body as {
      name?: string;
      minimumStock?: number;
      initialStock?: number;
    };
    const medication = await medicationService.create({
      name: name ?? "",
      minimumStock: Number(minimumStock),
      initialStock: initialStock ? Number(initialStock) : undefined,
    });
    res.status(201).json({ medication });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { name, minimumStock } = req.body as { name?: string; minimumStock?: number };
    const medication = await medicationService.update(id, {
      name,
      minimumStock: minimumStock === undefined ? undefined : Number(minimumStock),
    });
    res.json({ medication });
  }),

  remove: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    await medicationService.remove(id);
    res.status(204).send();
  }),
};
