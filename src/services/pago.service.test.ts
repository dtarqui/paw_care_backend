import type { DeepMockProxy } from "jest-mock-extended";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { PagoInvalidoError, pagoService } from "./pago.service";

jest.mock("../lib/prisma");

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

function atencionFalsa(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 10,
    mascotaId: 1,
    veterinarioId: 1,
    fecha: new Date(),
    diagnostico: "Dermatitis leve",
    tratamiento: "Shampoo medicado",
    examenesExternos: null,
    tipoServicio: "Consulta General",
    peso: null,
    montoConsulta: 120,
    estadoPago: "PENDIENTE",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("pagoService.registrar", () => {
  it("rechaza un monto menor o igual a 0", async () => {
    await expect(pagoService.registrar(10, "EFECTIVO", 0)).rejects.toThrow(PagoInvalidoError);
    expect(prismaMock.atencionMedica.findUnique).not.toHaveBeenCalled();
  });

  it("rechaza si la atención no existe", async () => {
    prismaMock.atencionMedica.findUnique.mockResolvedValue(null);

    await expect(pagoService.registrar(999, "EFECTIVO", 50)).rejects.toThrow(PagoInvalidoError);
  });

  it("rechaza si la atención ya fue pagada", async () => {
    prismaMock.atencionMedica.findUnique.mockResolvedValue(atencionFalsa({ estadoPago: "PAGADO" }));

    await expect(pagoService.registrar(10, "EFECTIVO", 50)).rejects.toThrow(PagoInvalidoError);
    expect(prismaMock.atencionMedica.update).not.toHaveBeenCalled();
  });

  it("registra el pago y marca la atención como pagada", async () => {
    prismaMock.atencionMedica.findUnique.mockResolvedValue(atencionFalsa());
    prismaMock.atencionMedica.update.mockResolvedValue(atencionFalsa({ estadoPago: "PAGADO" }));
    prismaMock.pago.create.mockResolvedValue({
      id: 1,
      atencionId: 10,
      metodoPago: "EFECTIVO",
      monto: 120,
      fecha: new Date(),
      createdAt: new Date(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const pago = await pagoService.registrar(10, "EFECTIVO", 120);

    expect(prismaMock.atencionMedica.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 10 }, data: { estadoPago: "PAGADO" } })
    );
    expect(pago.atencionId).toBe(10);
  });
});
