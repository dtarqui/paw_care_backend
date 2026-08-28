import { Request, Response } from "express";
import { buildReceiptPdf } from "../lib/receiptPdf";
import { paymentService } from "../services/payment.service";
import { PaymentMethod } from "../types";
import { asyncHandler } from "../utils/asyncHandler";
import { labelsFor, readLanguage } from "../utils/labels";

export const paymentController = {
  listPending: asyncHandler(async (_req: Request, res: Response) => {
    res.json({ pending: await paymentService.listPending() });
  }),

  history: asyncHandler(async (req: Request, res: Response) => {
    const limit = Number(req.query.limit) || 5;
    res.json({ payments: await paymentService.recentHistory(limit) });
  }),

  register: asyncHandler(async (req: Request, res: Response) => {
    const { visitId, method, amount } = req.body as {
      visitId?: number;
      method?: PaymentMethod;
      amount?: number;
    };
    if (!visitId || !method) {
      return res.status(400).json({ error: "La atención y el método de pago son obligatorios", code: "VisitAndMethodRequired" });
    }
    // Devuelve el comprobante completo: la pantalla de éxito lo muestra sin otra
    // vuelta al servidor, y con eso arma también el mensaje de WhatsApp.
    const receipt = await paymentService.register(visitId, method, Number(amount));
    res.status(201).json({ payment: receipt });
  }),

  /** El comprobante en PDF. Sirve tanto justo después de cobrar como semanas después
   * desde el historial, que es cuando aparece el "no me cobraron eso". */
  receipt: asyncHandler(async (req: Request, res: Response) => {
    const receipt = await paymentService.receipt(Number(req.params.id));
    const language = readLanguage(req);
    const label = labelsFor(language);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${label.text("fileReceipt")}-${receipt.receiptNumber.replace(/^R-/, "")}.pdf"`
    );

    const doc = buildReceiptPdf(receipt, label, language);
    doc.pipe(res);
    doc.end();
  }),
};
