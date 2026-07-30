import { Request, Response } from "express";
import { pagoService } from "../services/pago.service";
import { MetodoPago } from "../types";
import { asyncHandler } from "../utils/asyncHandler";

export const pagoController = {
  listarPendientes: asyncHandler(async (_req: Request, res: Response) => {
    res.json({ pendientes: pagoService.listarPendientes() });
  }),

  registrar: asyncHandler(async (req: Request, res: Response) => {
    const { atencionId, metodoPago, monto } = req.body as {
      atencionId?: number;
      metodoPago?: MetodoPago;
      monto?: number;
    };
    if (!atencionId || !metodoPago) {
      return res.status(400).json({ error: "atencionId y metodoPago son obligatorios" });
    }
    const pago = pagoService.registrar(atencionId, metodoPago, Number(monto));
    res.status(201).json({ pago });
  }),
};
