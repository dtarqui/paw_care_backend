import { Request, Response } from "express";
import { ownerService } from "../services/owner.service";
import { asyncHandler } from "../utils/asyncHandler";

export const ownerController = {
  search: asyncHandler(async (req: Request, res: Response) => {
    const nationalId = String(req.query.nationalId ?? "");
    if (!nationalId) {
      return res.status(400).json({ error: "El parámetro nationalId es obligatorio" });
    }
    const owner = await ownerService.findByNationalId(nationalId);
    res.json({ owner: owner ?? null });
  }),

  list: asyncHandler(async (_req: Request, res: Response) => {
    res.json({ owners: await ownerService.list() });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const owner = await ownerService.update(id, req.body);
    res.json({ owner });
  }),
};
