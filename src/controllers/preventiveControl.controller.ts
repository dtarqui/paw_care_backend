import { Request, Response } from "express";
import { preventiveControlService } from "../services/preventiveControl.service";
import { asyncHandler } from "../utils/asyncHandler";

export const preventiveControlController = {
  history: asyncHandler(async (req: Request, res: Response) => {
    const petId = Number(req.params.id);
    res.json({ controls: await preventiveControlService.petHistory(petId) });
  }),

  upcoming: asyncHandler(async (req: Request, res: Response) => {
    const days = Number(req.query.days) || 30;
    res.json({ controls: await preventiveControlService.upcoming(days) });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const control = await preventiveControlService.create(req.body);
    res.status(201).json({ control });
  }),
};
