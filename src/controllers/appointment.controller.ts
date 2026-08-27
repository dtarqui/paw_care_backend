import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { appointmentService } from "../services/appointment.service";
import { AppointmentStatus } from "../types";
import { asyncHandler } from "../utils/asyncHandler";
import { readPagination } from "../utils/pagination";

export const appointmentController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { page, pageSize } = readPagination(req);
    const { items, total } = await appointmentService.list(page, pageSize);
    res.json({ appointments: items, total, page, pageSize });
  }),

  availability: asyncHandler(async (req: Request, res: Response) => {
    const vetId = Number(req.query.vetId);
    const date = String(req.query.date ?? "");
    if (!vetId || !date) {
      return res.status(400).json({ error: "El veterinario y la fecha son obligatorios", code: "VetAndDateRequired" });
    }
    res.json({ slots: await appointmentService.availability(vetId, date) });
  }),

  changeStatus: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { status } = req.body as { status?: AppointmentStatus };
    if (!status) {
      return res.status(400).json({ error: "El nuevo estado es obligatorio", code: "StatusRequired" });
    }
    const appointment = await appointmentService.changeStatus(id, status);
    res.json({ appointment });
  }),

  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const appointment = await appointmentService.create(req.body, req.user!);
    res.status(201).json({ appointment });
  }),

  reschedule: asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = Number(req.params.id);
    const appointment = await appointmentService.reschedule(id, req.body, req.user!);
    res.json({ appointment });
  }),
};
