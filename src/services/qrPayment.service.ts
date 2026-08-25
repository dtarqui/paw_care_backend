import { generateBankQrCharge } from "../lib/qrPayment";
import { medicalVisitRepository } from "../repositories/medicalVisit.repository";
import { paymentRepository } from "../repositories/payment.repository";
import { qrChargeRepository } from "../repositories/qrCharge.repository";
import { QrCharge } from "../types";

export class QrChargeNotFoundError extends Error {
  constructor() {
    super("El cobro QR indicado no existe");
    this.name = "QrChargeNotFoundError";
  }
}

export class VisitAlreadyPaidError extends Error {
  constructor() {
    super("Esta atención ya fue pagada o no existe");
    this.name = "VisitAlreadyPaidError";
  }
}

// Nombre informativo del banco elegido, para mostrarlo en la UI ("Cobro QR vía BCP")
// — no cambia el comportamiento, solo cómo se etiqueta el QrCharge.provider.
const PROVIDER = process.env.PAGO_QR_BANCO ?? "QR Simple";

export const qrPaymentService = {
  async generate(visitId: number): Promise<QrCharge> {
    const visit = await medicalVisitRepository.findById(visitId);
    if (!visit || visit.paymentStatus === "PAID") {
      throw new VisitAlreadyPaidError();
    }

    // generateBankQrCharge lanza QrPaymentProviderNotConfiguredError hasta que se
    // conecte la API real del banco elegido — ver lib/qrPayment.ts.
    const result = await generateBankQrCharge({
      amount: visit.consultationFee,
      reference: `Atencion #${visitId} - PawCare`,
    });

    return qrChargeRepository.create({
      visitId,
      amount: visit.consultationFee,
      provider: PROVIDER,
      externalReference: result.externalReference,
      qrPayload: result.qrPayload,
      expiresAt: result.expiresAt,
    });
  },

  async get(id: number): Promise<QrCharge> {
    const charge = await qrChargeRepository.findById(id);
    if (!charge) throw new QrChargeNotFoundError();
    return charge;
  },

  /**
   * Llamado por el webhook del banco cuando confirma un cobro. Idempotente a
   * propósito (no-op si ya no está PENDING o no existe) porque los webhooks
   * bancarios suelen reintentar la misma notificación. Crea el Payment real — mismo
   * efecto que registrar un pago manual con method QR (payment.service.ts#register),
   * no lo reemplaza — y marca la atención como pagada.
   */
  async confirmByExternalReference(externalReference: string): Promise<void> {
    const charge = await qrChargeRepository.findByExternalReference(externalReference);
    if (!charge || charge.status !== "PENDING") return;

    await qrChargeRepository.updateStatus(charge.id, "CONFIRMED");
    await medicalVisitRepository.markAsPaid(charge.visitId);
    await paymentRepository.register({ visitId: charge.visitId, method: "QR", amount: charge.amount });
  },
};
