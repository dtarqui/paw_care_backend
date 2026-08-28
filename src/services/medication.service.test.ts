import type { DeepMockProxy } from "jest-mock-extended";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "../lib/prisma";
import {
  ExpiredBatchError,
  InsufficientStockError,
  medicationService,
} from "./medication.service";
import { addDays, todayISO } from "../utils/date";

jest.mock("../lib/prisma");

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

function utcDate(literal: string) {
  return new Date(`${literal}T00:00:00.000Z`);
}

/** `dias` negativo = ya vencido; `null` = lote sin fecha de vencimiento. */
function fakeBatch(id: number, quantity: number, dias: number | null, medicationId = 1) {
  return {
    id,
    medicationId,
    batchNumber: `L-${id}`,
    expiresOn: dias === null ? null : utcDate(addDays(todayISO(), dias)),
    quantity,
    receivedOn: utcDate(addDays(todayISO(), -30)),
    createdAt: new Date(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

function fakeMedication(minimumStock = 5) {
  return {
    id: 1,
    name: "Amoxicilina 500mg",
    minimumStock,
    createdAt: new Date(),
    updatedAt: new Date(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  prismaMock.medication.findUnique.mockResolvedValue(fakeMedication());
  prismaMock.medication.findMany.mockResolvedValue([fakeMedication()]);
  // `$transaction` con callback: se le pasa el mismo mock como cliente transaccional.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (prismaMock.$transaction as any).mockImplementation((fn: any) => fn(prismaMock));
});

describe("El stock sale de los lotes", () => {
  it("suma los lotes y separa lo vencido de lo utilizable", async () => {
    prismaMock.medicationBatch.findMany.mockResolvedValue([
      fakeBatch(1, 10, 30), // vence en un mes
      fakeBatch(2, 5, -3), // ya vencido
      fakeBatch(3, 7, null), // sin fecha
    ]);

    const [medication] = await medicationService.list();

    expect(medication.currentStock).toBe(22); // lo que hay en el estante
    expect(medication.availableStock).toBe(17); // sin contar el lote vencido
    expect(medication.expiredStock).toBe(5);
    expect(medication.nextExpiryOn).toBe(addDays(todayISO(), 30));
  });

  it("el lote que vence hoy todavía cuenta como utilizable", async () => {
    prismaMock.medicationBatch.findMany.mockResolvedValue([fakeBatch(1, 4, 0)]);

    const [medication] = await medicationService.list();

    expect(medication.availableStock).toBe(4);
    expect(medication.expiredStock).toBe(0);
  });

  it("el stock mínimo se compara contra lo utilizable, no contra el estante", async () => {
    // 10 unidades en total, pero 8 vencidas: con un mínimo de 5, faltan.
    prismaMock.medicationBatch.findMany.mockResolvedValue([fakeBatch(1, 2, 60), fakeBatch(2, 8, -1)]);

    expect(await medicationService.lowStock()).toHaveLength(1);
  });
});

describe("Consumo por vencimiento más próximo primero (FEFO)", () => {
  it("reparte entre lotes y deja un movimiento por cada uno", async () => {
    // Prisma los devuelve ya ordenados por vencimiento; acá se verifica el reparto.
    prismaMock.medicationBatch.findMany.mockResolvedValue([fakeBatch(1, 4, 10), fakeBatch(2, 20, 200)]);

    await medicationService.consumeForVisit(99, [{ medicationId: 1, quantity: 6 }]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates = (prismaMock.medicationBatch.update as any).mock.calls.map((c: any) => c[0]);
    expect(updates).toEqual([
      { where: { id: 1 }, data: { quantity: { decrement: 4 } } }, // se agota el que vence antes
      { where: { id: 2 }, data: { quantity: { decrement: 2 } } },
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const moves = (prismaMock.inventoryMove.create as any).mock.calls.map((c: any) => c[0].data);
    expect(moves).toEqual([
      { medicationId: 1, batchId: 1, type: "OUT", quantity: 4, visitId: 99 },
      { medicationId: 1, batchId: 2, type: "OUT", quantity: 2, visitId: 99 },
    ]);
  });

  it("nunca toma un lote vencido: la consulta los excluye", async () => {
    prismaMock.medicationBatch.findMany.mockResolvedValue([fakeBatch(1, 5, 30)]);

    await medicationService.consumeForVisit(99, [{ medicationId: 1, quantity: 1 }]);

    // El orden y el filtro los resuelve la base; lo que se puede fijar acá es que se
    // le piden. Que ordene bien de verdad se verifica contra el servidor real.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query = (prismaMock.medicationBatch.findMany as any).mock.calls.at(-1)[0];
    expect(query.where.OR).toEqual([
      { expiresOn: null },
      { expiresOn: { gte: utcDate(todayISO()) } },
    ]);
    expect(query.orderBy).toEqual([
      { expiresOn: { sort: "asc", nulls: "last" } },
      { receivedOn: "asc" },
    ]);
  });

  it("corta si el stock cambió entre la verificación y el descuento", async () => {
    prismaMock.medicationBatch.findMany.mockResolvedValue([fakeBatch(1, 2, 30)]);

    await expect(
      medicationService.consumeForVisit(99, [{ medicationId: 1, quantity: 5 }])
    ).rejects.toThrow(InsufficientStockError);
  });
});

describe("Disponibilidad", () => {
  it("un estante lleno de vencidos no alcanza, y el aviso lo dice", async () => {
    prismaMock.medicationBatch.findMany.mockResolvedValue([fakeBatch(1, 1, 30), fakeBatch(2, 40, -5)]);

    await expect(
      medicationService.checkAvailability([{ medicationId: 1, quantity: 3 }])
    ).rejects.toThrow(/40 unidades vencidas/);
  });
});

describe("Entrada de stock", () => {
  it("rechaza registrar un lote que ya venció", async () => {
    prismaMock.medicationBatch.findMany.mockResolvedValue([]);

    await expect(
      medicationService.registerStockIn(1, 10, { expiresOn: addDays(todayISO(), -1) })
    ).rejects.toThrow(ExpiredBatchError);
    expect(prismaMock.medicationBatch.create).not.toHaveBeenCalled();
  });

  it("guarda la entrada como un lote nuevo, con su movimiento", async () => {
    prismaMock.medicationBatch.findMany.mockResolvedValue([]);
    prismaMock.medicationBatch.create.mockResolvedValue(fakeBatch(7, 10, 90));

    await medicationService.registerStockIn(1, 10, {
      batchNumber: "AMX-999",
      expiresOn: addDays(todayISO(), 90),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((prismaMock.medicationBatch.create as any).mock.calls[0][0].data).toMatchObject({
      medicationId: 1,
      quantity: 10,
      batchNumber: "AMX-999",
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((prismaMock.inventoryMove.create as any).mock.calls[0][0].data).toMatchObject({
      type: "IN",
      quantity: 10,
      batchId: 7,
    });
  });
});
