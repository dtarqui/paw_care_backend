import { Request, Response } from "express";
import { verificarNotificacionWebhook } from "../lib/pagoQr";
import { pagoQrService } from "../services/pagoQr.service";
import { asyncHandler } from "../utils/asyncHandler";

export const pagoQrController = {
  generar: asyncHandler(async (req: Request, res: Response) => {
    const { atencionId } = req.body as { atencionId?: number };
    if (!atencionId) {
      return res.status(400).json({ error: "atencionId es obligatorio" });
    }
    const cobro = await pagoQrService.generar(atencionId);
    res.status(201).json({ cobro });
  }),

  consultar: asyncHandler(async (req: Request, res: Response) => {
    const cobro = await pagoQrService.consultar(Number(req.params.id));
    res.json({ cobro });
  }),

  // Público (lo llama el banco, no un usuario logueado) — se autentica con un
  // secreto compartido en vez de JWT. Responde 200 aunque el pago no aplique
  // (referencia desconocida) para no provocar reintentos infinitos del banco;
  // solo el secreto inválido corta con 401.
  webhook: asyncHandler(async (req: Request, res: Response) => {
    const secreto = req.header("X-Webhook-Secret");
    if (!verificarNotificacionWebhook(secreto)) {
      return res.status(401).json({ error: "Firma de webhook inválida" });
    }
    const { referenciaExterna } = req.body as { referenciaExterna?: string };
    if (referenciaExterna) {
      await pagoQrService.confirmarPorReferenciaExterna(referenciaExterna);
    }
    res.status(200).json({ recibido: true });
  }),
};
