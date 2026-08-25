import { medicalVisitRepository } from "../repositories/medicalVisit.repository";
import { paymentRepository } from "../repositories/payment.repository";
import { PaymentMethod } from "../types";

export class InvalidPaymentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPaymentError";
  }
}

export const paymentService = {
  listPending() {
    return paymentRepository.findPending();
  },

  recentHistory(limit = 5) {
    return paymentRepository.findRecent(limit);
  },

  async register(visitId: number, method: PaymentMethod, amount: number) {
    if (!amount || amount <= 0) {
      throw new InvalidPaymentError("El monto debe ser mayor a 0");
    }
    const visit = await medicalVisitRepository.findById(visitId);
    if (!visit || visit.paymentStatus === "PAID") {
      throw new InvalidPaymentError("La atención ya fue pagada o no existe");
    }

    await medicalVisitRepository.markAsPaid(visitId);
    return paymentRepository.register({ visitId, method, amount });
  },
};
