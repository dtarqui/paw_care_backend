import { Request, Response } from "express";
import { reminderService } from "../services/reminder.service";
import { asyncHandler } from "../utils/asyncHandler";

export const reminderController = {
  pending: asyncHandler(async (_req: Request, res: Response) => {
    res.json({ reminders: await reminderService.pending() });
  }),

  history: asyncHandler(async (req: Request, res: Response) => {
    const limit = Number(req.query.limit) || 5;
    res.json({ sent: await reminderService.sentHistory(limit) });
  }),

  markSent: asyncHandler(async (req: Request, res: Response) => {
    await reminderService.markSent(req.params.id);
    res.json({ ok: true });
  }),
};
