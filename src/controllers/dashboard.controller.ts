import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { dashboardService } from "../services/dashboard.service";
import { asyncHandler } from "../utils/asyncHandler";

export const dashboardController = {
  modules: asyncHandler(async (req: AuthRequest, res: Response) => {
    const modules = dashboardService.modulesFor(req.user!.role);
    res.json({ modules });
  }),
};
