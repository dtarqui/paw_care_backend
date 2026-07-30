import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { dashboardService } from "../services/dashboard.service";
import { asyncHandler } from "../utils/asyncHandler";

export const dashboardController = {
  modulos: asyncHandler(async (req: AuthRequest, res: Response) => {
    const modulos = dashboardService.modulosPara(req.usuario!.rol);
    res.json({ modulos });
  }),
};
