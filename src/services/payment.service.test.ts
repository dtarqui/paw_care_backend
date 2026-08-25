import type { DeepMockProxy } from "jest-mock-extended";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { InvalidPaymentError, paymentService } from "./payment.service";

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

describe("paymentService.register", () => {
  it("rechaza un monto menor o igual a 0", async () => {
    await expect(paymentService.register(10, "CASH", 0)).rejects.toThrow(InvalidPaymentError);
    expect(prismaMock.medicalVisit.findUnique).not.toHaveBeenCalled();
  });

  it("rechaza si la atención no existe", async () => {
    prismaMock.medicalVisit.findUnique.mockResolvedValue(null);

    await expect(paymentService.register(999, "CASH", 50)).rejects.toThrow(InvalidPaymentError);
  });

  it("rechaza si la atención ya fue pagada", async () => {
    prismaMock.medicalVisit.findUnique.mockResolvedValue(fakeVisit({ paymentStatus: "PAID" }));

    await expect(paymentService.register(10, "CASH", 50)).rejects.toThrow(InvalidPaymentError);
    expect(prismaMock.medicalVisit.update).not.toHaveBeenCalled();
  });

  it("registra el pago y marca la atención como pagada", async () => {
    prismaMock.medicalVisit.findUnique.mockResolvedValue(fakeVisit());
    prismaMock.medicalVisit.update.mockResolvedValue(fakeVisit({ paymentStatus: "PAID" }));
    prismaMock.payment.create.mockResolvedValue({
      id: 1,
      visitId: 10,
      method: "CASH",
      amount: 120,
      date: new Date(),
      createdAt: new Date(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const payment = await paymentService.register(10, "CASH", 120);

    expect(prismaMock.medicalVisit.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 10 }, data: { paymentStatus: "PAID" } })
    );
    expect(payment.visitId).toBe(10);
  });
});
