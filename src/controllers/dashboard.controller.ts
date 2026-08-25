import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { dashboardService } from "../services/dashboard.service";
import { asyncHandler } from "../utils/asyncHandler";

export const dashboardController = {
  modules: asyncHandler(async (req: AuthRequest, res: Response) => {
    const role = req.user!.role;
    res.json({
      modules: dashboardService.modulesFor(role),
      groups: dashboardService.groupsFor(role),
    });
  }),
};
