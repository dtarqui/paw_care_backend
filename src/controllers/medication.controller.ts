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
    const { quantity, batchNumber, expiresOn } = req.body as {
      quantity?: number;
      batchNumber?: string;
      expiresOn?: string;
    };
    const medication = await medicationService.registerStockIn(id, Number(quantity), {
      batchNumber,
      expiresOn,
    });
    res.status(201).json({ medication });
  }),

  batches: asyncHandler(async (req: Request, res: Response) => {
    res.json({ batches: await medicationService.batches(Number(req.params.id)) });
  }),

  /** Lo vencido y lo que vence pronto. 60 días por defecto: es el horizonte con el
   * que todavía se alcanza a usar la caja o a devolverla al proveedor. */
  expiring: asyncHandler(async (req: Request, res: Response) => {
    const days = Number(req.query.days) || 60;
    res.json({ batches: await medicationService.expiring(days) });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const { name, minimumStock, initialStock, batchNumber, expiresOn } = req.body as {
      name?: string;
      minimumStock?: number;
      initialStock?: number;
      batchNumber?: string;
      expiresOn?: string;
    };
    const medication = await medicationService.create({
      name: name ?? "",
      minimumStock: Number(minimumStock),
      initialStock: initialStock ? Number(initialStock) : undefined,
      batchNumber,
      expiresOn,
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
