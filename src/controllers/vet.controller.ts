import { Request, Response } from "express";
import { vetService } from "../services/vet.service";
import { asyncHandler } from "../utils/asyncHandler";

export const vetController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const activeOnly = req.query.active === "true";
    res.json({ vets: await vetService.list(activeOnly) });
  }),
};
