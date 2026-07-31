import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { citaService } from "../services/cita.service";
import { EstadoCita } from "../types";
import { asyncHandler } from "../utils/asyncHandler";
import { leerPaginacion } from "../utils/pagination";

export const citaController = {
  listar: asyncHandler(async (req: Request, res: Response) => {
    const { page, pageSize } = leerPaginacion(req);
    const { items, total } = await citaService.listar(page, pageSize);
    res.json({ citas: items, total, page, pageSize });
  }),

  disponibilidad: asyncHandler(async (req: Request, res: Response) => {
    const veterinarioId = Number(req.query.veterinarioId);
    const fecha = String(req.query.fecha ?? "");
    if (!veterinarioId || !fecha) {
      return res.status(400).json({ error: "veterinarioId y fecha son obligatorios" });
    }
    res.json({ bloques: await citaService.disponibilidad(veterinarioId, fecha) });
  }),

  cambiarEstado: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { estado } = req.body as { estado?: EstadoCita };
    if (!estado) {
      return res.status(400).json({ error: "El nuevo estado es obligatorio" });
    }
    const cita = await citaService.cambiarEstado(id, estado);
    res.json({ cita });
  }),

  crear: asyncHandler(async (req: AuthRequest, res: Response) => {
    const cita = await citaService.crear(req.body, req.usuario!);
    res.status(201).json({ cita });
  }),

  reprogramar: asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = Number(req.params.id);
    const cita = await citaService.reprogramar(id, req.body, req.usuario!);
    res.json({ cita });
  }),
};
