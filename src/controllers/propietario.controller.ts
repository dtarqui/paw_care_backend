import { Request, Response } from "express";
import { propietarioService } from "../services/propietario.service";
import { asyncHandler } from "../utils/asyncHandler";

export const propietarioController = {
  buscar: asyncHandler(async (req: Request, res: Response) => {
    const ci = String(req.query.ci ?? "");
    if (!ci) {
      return res.status(400).json({ error: "El parámetro ci es obligatorio" });
    }
    const propietario = propietarioService.buscarPorCi(ci);
    res.json({ propietario: propietario ?? null });
  }),
};
