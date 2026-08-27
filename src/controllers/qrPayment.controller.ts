import { Request, Response } from "express";
import { verifyWebhookNotification } from "../lib/qrPayment";
import { qrPaymentService } from "../services/qrPayment.service";
import { asyncHandler } from "../utils/asyncHandler";

export const qrPaymentController = {
  generate: asyncHandler(async (req: Request, res: Response) => {
    const { visitId } = req.body as { visitId?: number };
    if (!visitId) {
      return res.status(400).json({ error: "La atención a cobrar es obligatoria", code: "VisitRequired" });
    }
    const charge = await qrPaymentService.generate(visitId);
    res.status(201).json({ charge });
  }),

  get: asyncHandler(async (req: Request, res: Response) => {
    const charge = await qrPaymentService.get(Number(req.params.id));
    res.json({ charge });
  }),

  // Publico (lo llama el banco, no un usuario logueado) — se autentica con un
  // secreto compartido en vez de JWT. Responde 200 aunque el pago no aplique
  // (referencia desconocida) para no provocar reintentos infinitos del banco;
  // solo el secreto invalido corta con 401.
  webhook: asyncHandler(async (req: Request, res: Response) => {
    const secret = req.header("X-Webhook-Secret");
    if (!verifyWebhookNotification(secret)) {
      return res.status(401).json({ error: "Firma de webhook inválida", code: "InvalidWebhookSignature" });
    }
    const { externalReference } = req.body as { externalReference?: string };
    if (externalReference) {
      await qrPaymentService.confirmByExternalReference(externalReference);
    }
    res.status(200).json({ received: true });
  }),
};
