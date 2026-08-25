import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { scheduleService } from "../services/schedule.service";
import { asyncHandler } from "../utils/asyncHandler";

export const scheduleController = {
  list: asyncHandler(async (req: AuthRequest, res: Response) => {
    const vetId = Number(req.params.id);
    res.json({ schedules: await scheduleService.list(vetId) });
  }),

  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const vetId = Number(req.params.id);
    const { schedules } = req.body as {
      schedules?: { dayOfWeek: number; startTime: string; endTime: string }[];
    };
    if (!Array.isArray(schedules)) {
      return res.status(400).json({ error: "schedules debe ser un arreglo" });
    }
    const updated = await scheduleService.update(vetId, schedules, req.user!);
    res.json({ schedules: updated });
  }),
};
