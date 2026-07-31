import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { horarioService } from "../services/horario.service";
import { asyncHandler } from "../utils/asyncHandler";

export const horarioController = {
  listar: asyncHandler(async (req: AuthRequest, res: Response) => {
    const veterinarioId = Number(req.params.id);
    res.json({ horarios: await horarioService.listar(veterinarioId) });
  }),

  actualizar: asyncHandler(async (req: AuthRequest, res: Response) => {
    const veterinarioId = Number(req.params.id);
    const { horarios } = req.body as { horarios?: { diaSemana: number; horaInicio: string; horaFin: string }[] };
    if (!Array.isArray(horarios)) {
      return res.status(400).json({ error: "horarios debe ser un arreglo" });
    }
    const actualizado = await horarioService.actualizar(veterinarioId, horarios, req.usuario!);
    res.json({ horarios: actualizado });
  }),
};
