import { Request, Response } from "express";
import { paymentService } from "../services/payment.service";
import { PaymentMethod } from "../types";
import { asyncHandler } from "../utils/asyncHandler";

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
    const payment = await paymentService.register(visitId, method, Number(amount));
    res.status(201).json({ payment });
  }),
};
