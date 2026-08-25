import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { petService } from "../services/pet.service";
import { asyncHandler } from "../utils/asyncHandler";
import { readPagination } from "../utils/pagination";

export const petController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { page, pageSize } = readPagination(req);
    const activeOnly = req.query.active !== "false";
    const { items, total } = await petService.list(page, pageSize, activeOnly);
    res.json({ pets: items, total, page, pageSize });
  }),

  search: asyncHandler(async (req: Request, res: Response) => {
    const nationalId = String(req.query.nationalId ?? "");
    if (!nationalId) {
      return res.status(400).json({ error: "El parámetro nationalId es obligatorio" });
    }
    res.json({ pets: await petService.findByOwnerNationalId(nationalId) });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const pet = await petService.create(req.body);
    res.status(201).json({ pet });
  }),

  detail: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    res.json({ pet: await petService.detail(id) });
  }),

  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = Number(req.params.id);
    const pet = await petService.update(id, req.body, req.user!.id);
    res.json({ pet });
  }),

  history: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    res.json({ events: await petService.history(id) });
  }),

  changeStatus: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { status } = req.body as { status?: "ACTIVE" | "INACTIVE" };
    if (status !== "ACTIVE" && status !== "INACTIVE") {
      return res.status(400).json({ error: "El estado debe ser ACTIVE o INACTIVE" });
    }
    const pet = await petService.changeStatus(id, status);
    res.json({ pet });
  }),
};
