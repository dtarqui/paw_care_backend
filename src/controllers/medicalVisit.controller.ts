import { Request, Response } from "express";
import { medicalVisitService } from "../services/medicalVisit.service";
import { asyncHandler } from "../utils/asyncHandler";

export const medicalVisitController = {
  history: asyncHandler(async (req: Request, res: Response) => {
    const petId = Number(req.params.id);
    res.json({ visits: await medicalVisitService.petHistory(petId) });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const visit = await medicalVisitService.create(req.body);
    res.status(201).json({ visit });
  }),
};
