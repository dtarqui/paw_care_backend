import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { citaService } from "../services/cita.service";
import { EstadoCita } from "../types";
import { asyncHandler } from "../utils/asyncHandler";

export const citaController = {
  listar: asyncHandler(async (_req: Request, res: Response) => {
    res.json({ citas: citaService.listar() });
  }),

  disponibilidad: asyncHandler(async (req: Request, res: Response) => {
    const veterinarioId = Number(req.query.veterinarioId);
    const fecha = String(req.query.fecha ?? "");
    if (!veterinarioId || !fecha) {
      return res.status(400).json({ error: "veterinarioId y fecha son obligatorios" });
    }
    res.json({ bloques: citaService.disponibilidad(veterinarioId, fecha) });
  }),

  cambiarEstado: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { estado } = req.body as { estado?: EstadoCita };
    if (!estado) {
      return res.status(400).json({ error: "El nuevo estado es obligatorio" });
    }
    const cita = citaService.cambiarEstado(id, estado);
    res.json({ cita });
  }),

  crear: asyncHandler(async (req: AuthRequest, res: Response) => {
    const cita = citaService.crear(req.body, req.usuario!);
    res.status(201).json({ cita });
  }),

  reprogramar: asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = Number(req.params.id);
    const cita = citaService.reprogramar(id, req.body, req.usuario!);
    res.json({ cita });
  }),
};
