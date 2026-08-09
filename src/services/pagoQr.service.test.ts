import type { DeepMockProxy } from "jest-mock-extended";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { ProveedorPagoQrNoConfiguradoError } from "../lib/pagoQr";
import { AtencionYaPagadaError, CobroQrNoEncontradoError, pagoQrService } from "./pagoQr.service";

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

function cobroQrFalso(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1,
    atencionId: 10,
    monto: 120,
    estado: "PENDIENTE",
    proveedor: "QR Simple",
    referenciaExterna: "ref-abc",
    qrPayload: "payload-qr",
    expiraEn: new Date(),
    confirmadoEn: null,
    createdAt: new Date(),
    ...overrides,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("pagoQrService.generar", () => {
  it("rechaza si la atención no existe", async () => {
    prismaMock.atencionMedica.findUnique.mockResolvedValue(null);

    await expect(pagoQrService.generar(999)).rejects.toThrow(AtencionYaPagadaError);
  });

  it("rechaza si la atención ya fue pagada", async () => {
    prismaMock.atencionMedica.findUnique.mockResolvedValue(atencionFalsa({ estadoPago: "PAGADO" }));

    await expect(pagoQrService.generar(10)).rejects.toThrow(AtencionYaPagadaError);
  });

  it("propaga ProveedorPagoQrNoConfiguradoError mientras no haya banco real conectado", async () => {
    prismaMock.atencionMedica.findUnique.mockResolvedValue(atencionFalsa());

    await expect(pagoQrService.generar(10)).rejects.toThrow(ProveedorPagoQrNoConfiguradoError);
    expect(prismaMock.cobroQr.create).not.toHaveBeenCalled();
  });
});

describe("pagoQrService.consultar", () => {
  it("lanza CobroQrNoEncontradoError si no existe", async () => {
    prismaMock.cobroQr.findUnique.mockResolvedValue(null);

    await expect(pagoQrService.consultar(999)).rejects.toThrow(CobroQrNoEncontradoError);
  });

  it("devuelve el cobro mapeado a dominio", async () => {
    prismaMock.cobroQr.findUnique.mockResolvedValue(cobroQrFalso());

    const cobro = await pagoQrService.consultar(1);
    expect(cobro.estado).toBe("PENDIENTE");
    expect(cobro.monto).toBe(120);
  });
});

describe("pagoQrService.confirmarPorReferenciaExterna", () => {
  it("no hace nada si la referencia no existe (webhook con datos desconocidos)", async () => {
    prismaMock.cobroQr.findUnique.mockResolvedValue(null);

    await pagoQrService.confirmarPorReferenciaExterna("ref-inexistente");

    expect(prismaMock.cobroQr.update).not.toHaveBeenCalled();
    expect(prismaMock.pago.create).not.toHaveBeenCalled();
  });

  it("no hace nada si el cobro ya no está pendiente (webhook reintentado)", async () => {
    prismaMock.cobroQr.findUnique.mockResolvedValue(cobroQrFalso({ estado: "CONFIRMADO" }));

    await pagoQrService.confirmarPorReferenciaExterna("ref-abc");

    expect(prismaMock.cobroQr.update).not.toHaveBeenCalled();
    expect(prismaMock.pago.create).not.toHaveBeenCalled();
  });

  it("confirma el cobro, marca la atención pagada y crea el Pago real", async () => {
    prismaMock.cobroQr.findUnique.mockResolvedValue(cobroQrFalso());
    prismaMock.cobroQr.update.mockResolvedValue(cobroQrFalso({ estado: "CONFIRMADO" }));
    prismaMock.atencionMedica.update.mockResolvedValue(atencionFalsa({ estadoPago: "PAGADO" }));
    prismaMock.pago.create.mockResolvedValue({
      id: 5,
      atencionId: 10,
      metodoPago: "QR",
      monto: 120,
      fecha: new Date(),
      createdAt: new Date(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    await pagoQrService.confirmarPorReferenciaExterna("ref-abc");

    expect(prismaMock.cobroQr.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 }, data: expect.objectContaining({ estado: "CONFIRMADO" }) })
    );
    expect(prismaMock.atencionMedica.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 10 }, data: { estadoPago: "PAGADO" } })
    );
    expect(prismaMock.pago.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { atencionId: 10, metodoPago: "QR", monto: 120 } })
    );
  });
});
