import type { DeepMockProxy } from "jest-mock-extended";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { QrPaymentProviderNotConfiguredError } from "../lib/qrPayment";
import { QrChargeNotFoundError, VisitAlreadyPaidError, qrPaymentService } from "./qrPayment.service";

jest.mock("../lib/prisma");

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

function fakeVisit(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 10,
    petId: 1,
    vetId: 1,
    date: new Date(),
    diagnosis: "Dermatitis leve",
    treatment: "Shampoo medicado",
    externalExams: null,
    serviceType: "Consulta General",
    weight: null,
    consultationFee: 120,
    paymentStatus: "PENDING",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

function fakeQrCharge(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1,
    visitId: 10,
    amount: 120,
    status: "PENDING",
    provider: "QR Simple",
    externalReference: "ref-abc",
    qrPayload: "payload-qr",
    expiresAt: new Date(),
    confirmedAt: null,
    createdAt: new Date(),
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("qrPaymentService.generate", () => {
  it("rechaza si la atención no existe", async () => {
    prismaMock.medicalVisit.findUnique.mockResolvedValue(null);

    await expect(qrPaymentService.generate(999)).rejects.toThrow(VisitAlreadyPaidError);
  });

  it("rechaza si la atención ya fue pagada", async () => {
    prismaMock.medicalVisit.findUnique.mockResolvedValue(fakeVisit({ paymentStatus: "PAID" }));

    await expect(qrPaymentService.generate(10)).rejects.toThrow(VisitAlreadyPaidError);
  });

  it("propaga QrPaymentProviderNotConfiguredError mientras no haya banco real conectado", async () => {
    prismaMock.medicalVisit.findUnique.mockResolvedValue(fakeVisit());

    await expect(qrPaymentService.generate(10)).rejects.toThrow(QrPaymentProviderNotConfiguredError);
    expect(prismaMock.qrCharge.create).not.toHaveBeenCalled();
  });
});

describe("qrPaymentService.get", () => {
  it("lanza QrChargeNotFoundError si no existe", async () => {
    prismaMock.qrCharge.findUnique.mockResolvedValue(null);

    await expect(qrPaymentService.get(999)).rejects.toThrow(QrChargeNotFoundError);
  });

  it("devuelve el cobro mapeado a dominio", async () => {
    prismaMock.qrCharge.findUnique.mockResolvedValue(fakeQrCharge());

    const charge = await qrPaymentService.get(1);
    expect(charge.status).toBe("PENDING");
    expect(charge.amount).toBe(120);
  });
});

describe("qrPaymentService.confirmByExternalReference", () => {
  it("no hace nada si la referencia no existe (webhook con datos desconocidos)", async () => {
    prismaMock.qrCharge.findUnique.mockResolvedValue(null);

    await qrPaymentService.confirmByExternalReference("ref-inexistente");

    expect(prismaMock.qrCharge.update).not.toHaveBeenCalled();
    expect(prismaMock.payment.create).not.toHaveBeenCalled();
  });

  it("no hace nada si el cobro ya no está pendiente (webhook reintentado)", async () => {
    prismaMock.qrCharge.findUnique.mockResolvedValue(fakeQrCharge({ status: "CONFIRMED" }));

    await qrPaymentService.confirmByExternalReference("ref-abc");

    expect(prismaMock.qrCharge.update).not.toHaveBeenCalled();
    expect(prismaMock.payment.create).not.toHaveBeenCalled();
  });

  it("confirma el cobro, marca la atención pagada y crea el Payment real", async () => {
    prismaMock.qrCharge.findUnique.mockResolvedValue(fakeQrCharge());
    prismaMock.qrCharge.update.mockResolvedValue(fakeQrCharge({ status: "CONFIRMED" }));
    prismaMock.medicalVisit.update.mockResolvedValue(fakeVisit({ paymentStatus: "PAID" }));
    prismaMock.payment.create.mockResolvedValue({
      id: 5,
      visitId: 10,
      method: "QR",
      amount: 120,
      date: new Date(),
      createdAt: new Date(),
      // El alta de pago devuelve el comprobante, así que trae las relaciones.
      visit: {
        id: 10,
        serviceType: "Consulta General",
        diagnosis: "Control",
        date: new Date(),
        pet: { id: 3, name: "Luna", species: "Perro", owner: { id: 2, firstName: "Roberto", paternalLastName: "Vargas", nationalId: "5551001", phone: null } },
        vet: { user: { firstName: "Patricia", paternalLastName: "Mendoza" } },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    await qrPaymentService.confirmByExternalReference("ref-abc");

    expect(prismaMock.qrCharge.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 }, data: expect.objectContaining({ status: "CONFIRMED" }) })
    );
    expect(prismaMock.medicalVisit.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 10 }, data: { paymentStatus: "PAID" } })
    );
    expect(prismaMock.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { visitId: 10, method: "QR", amount: 120 } })
    );
  });
});
