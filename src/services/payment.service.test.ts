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
      date: new Date("2026-08-27T10:30:00"),
      createdAt: new Date(),
      // El alta trae las relaciones porque el comprobante se arma en la misma consulta.
      visit: {
        id: 10,
        serviceType: "Consulta General",
        diagnosis: "Control de rutina",
        date: new Date("2026-08-27T10:00:00"),
        pet: {
          id: 3,
          name: "Luna",
          species: "Perro",
          owner: {
            id: 2,
            firstName: "Roberto",
            paternalLastName: "Vargas",
            nationalId: "5551001",
            phone: "70011122",
          },
        },
        vet: { user: { firstName: "Patricia", paternalLastName: "Mendoza" } },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const receipt = await paymentService.register(10, "CASH", 120);

    expect(prismaMock.medicalVisit.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 10 }, data: { paymentStatus: "PAID" } })
    );
    expect(receipt.visit.id).toBe(10);
    // El número que se le entrega al cliente sale del id del pago, no de un contador.
    expect(receipt.receiptNumber).toBe("R-2026-000001");
    expect(receipt.pet.name).toBe("Luna");
    expect(receipt.owner.phone).toBe("70011122");
  });
});
