import { prisma } from "../lib/prisma";
import { ExpiringBatch, InventoryMoveType, Medication, MedicationBatch } from "../types";
import { addDays, dateOnlyToLiteral, literalDateOnlyToDate, todayISO } from "../utils/date";

type MedicationRow = NonNullable<Awaited<ReturnType<typeof prisma.medication.findUnique>>>;
type BatchRow = NonNullable<Awaited<ReturnType<typeof prisma.medicationBatch.findUnique>>>;

function toBatch(row: BatchRow, today: string): MedicationBatch {
  const expiresOn = row.expiresOn ? dateOnlyToLiteral(row.expiresOn) : undefined;
  return {
    id: row.id,
    medicationId: row.medicationId,
    batchNumber: row.batchNumber ?? undefined,
    expiresOn,
    quantity: row.quantity,
    receivedOn: dateOnlyToLiteral(row.receivedOn),
    // Un lote vence al terminar su fecha: el que vence hoy todavía sirve hoy.
    expired: !!expiresOn && expiresOn < today,
  };
}

/**
 * El stock de un medicamento es la suma de sus lotes — no hay un total guardado
 * aparte que pueda desincronizarse. El catálogo de una clínica son decenas de
 * medicamentos, así que sumar en memoria sale más barato que una consulta agregada
 * por cada uno (mismo criterio que ya usaba `findLowStock`).
 */
function summarize(batches: MedicationBatch[]) {
  const usable = batches.filter((b) => !b.expired);
  const nextExpiry = usable
    .filter((b) => b.expiresOn)
    .map((b) => b.expiresOn!)
    .sort()[0];
  return {
    currentStock: batches.reduce((total, b) => total + b.quantity, 0),
    availableStock: usable.reduce((total, b) => total + b.quantity, 0),
    expiredStock: batches.filter((b) => b.expired).reduce((total, b) => total + b.quantity, 0),
    nextExpiryOn: nextExpiry,
  };
}

function toDomain(row: MedicationRow, batches: MedicationBatch[]): Medication {
  return { id: row.id, name: row.name, minimumStock: row.minimumStock, ...summarize(batches) };
}

/** Los lotes con existencias, agrupados por medicamento. */
async function stockOnHand(medicationId?: number): Promise<Map<number, MedicationBatch[]>> {
  const today = todayISO();
  const rows = await prisma.medicationBatch.findMany({
    where: { quantity: { gt: 0 }, ...(medicationId ? { medicationId } : {}) },
  });
  const byMedication = new Map<number, MedicationBatch[]>();
  for (const row of rows) {
    const batch = toBatch(row, today);
    byMedication.set(batch.medicationId, [...(byMedication.get(batch.medicationId) ?? []), batch]);
  }
  return byMedication;
}

export interface NewInventoryMoveRecord {
  medicationId: number;
  type: InventoryMoveType;
  quantity: number;
  visitId?: number;
  batchId?: number;
}

export interface NewMedicationRecord {
  name: string;
  minimumStock: number;
}

export interface NewBatchRecord {
  medicationId: number;
  quantity: number;
  batchNumber?: string;
  expiresOn?: string;
}

export interface MedicationChanges {
  name?: string;
  minimumStock?: number;
}

export const medicationRepository = {
  async findByName(name: string): Promise<Medication | undefined> {
    const row = await prisma.medication.findUnique({ where: { name } });
    if (!row) return undefined;
    return toDomain(row, (await stockOnHand(row.id)).get(row.id) ?? []);
  },

  async create(input: NewMedicationRecord): Promise<Medication> {
    const row = await prisma.medication.create({
      data: { name: input.name, minimumStock: input.minimumStock },
    });
    return toDomain(row, []);
  },

  async update(id: number, changes: MedicationChanges): Promise<Medication> {
    const row = await prisma.medication.update({ where: { id }, data: changes });
    return toDomain(row, (await stockOnHand(id)).get(id) ?? []);
  },

  async hasMoves(id: number): Promise<boolean> {
    const row = await prisma.inventoryMove.findFirst({ where: { medicationId: id } });
    return !!row;
  },

  async remove(id: number): Promise<void> {
    await prisma.medication.delete({ where: { id } });
  },

  async findAll(): Promise<Medication[]> {
    const rows = await prisma.medication.findMany({ orderBy: { name: "asc" } });
    const stock = await stockOnHand();
    return rows.map((row) => toDomain(row, stock.get(row.id) ?? []));
  },

  async findById(id: number): Promise<Medication | undefined> {
    const row = await prisma.medication.findUnique({ where: { id } });
    if (!row) return undefined;
    return toDomain(row, (await stockOnHand(id)).get(id) ?? []);
  },

  async findLowStock(): Promise<Medication[]> {
    // Se compara contra el stock **utilizable**: un estante lleno de cajas vencidas
    // no es stock. Prisma tampoco permite comparar dos columnas en el `where`, así
    // que el filtro va en memoria — el catálogo es chico.
    const all = await this.findAll();
    return all.filter((m) => m.availableStock <= m.minimumStock);
  },

  /** Los lotes de un medicamento, incluidos los agotados: son su historia. */
  async findBatches(medicationId: number): Promise<MedicationBatch[]> {
    const today = todayISO();
    const rows = await prisma.medicationBatch.findMany({
      where: { medicationId },
      orderBy: [{ expiresOn: { sort: "asc", nulls: "last" } }, { receivedOn: "asc" }],
    });
    return rows.map((row) => toBatch(row, today));
  },

  /** Lotes con existencias que ya vencieron o vencen dentro de `withinDays`. */
  async findExpiring(withinDays: number): Promise<ExpiringBatch[]> {
    const today = todayISO();
    const rows = await prisma.medicationBatch.findMany({
      where: {
        quantity: { gt: 0 },
        expiresOn: { not: null, lte: literalDateOnlyToDate(addDays(today, withinDays)) },
      },
      include: { medication: true },
      orderBy: { expiresOn: "asc" },
    });
    return rows.map((row) => {
      const batch = toBatch(row, today);
      const dias = Math.round(
        (literalDateOnlyToDate(batch.expiresOn!).getTime() - literalDateOnlyToDate(today).getTime()) / 86_400_000
      );
      return { ...batch, medicationName: row.medication.name, daysToExpiry: dias };
    });
  },

  /** Una entrada de stock: el lote y su movimiento, o ninguno de los dos. */
  async registerBatch(input: NewBatchRecord): Promise<MedicationBatch> {
    const today = todayISO();
    const row = await prisma.$transaction(async (tx) => {
      const batch = await tx.medicationBatch.create({
        data: {
          medicationId: input.medicationId,
          quantity: input.quantity,
          batchNumber: input.batchNumber ?? null,
          expiresOn: input.expiresOn ? literalDateOnlyToDate(input.expiresOn) : null,
          receivedOn: literalDateOnlyToDate(today),
        },
      });
      await tx.inventoryMove.create({
        data: {
          medicationId: input.medicationId,
          batchId: batch.id,
          type: "IN",
          quantity: input.quantity,
        },
      });
      return batch;
    });
    return toBatch(row, today);
  },

  /**
   * Descuenta `quantity` unidades tomando **primero el lote que vence antes** (FEFO),
   * sin tocar los vencidos. Si hace falta más de un lote deja un movimiento por cada
   * uno: sin eso no habría forma de responder después qué lote recibió un paciente.
   *
   * Devuelve cuántas unidades no se pudieron cubrir — debería ser siempre 0, porque
   * el servicio verifica la disponibilidad antes, pero el dato se devuelve en vez de
   * asumirse.
   */
  async consumeFromBatches(medicationId: number, quantity: number, visitId?: number): Promise<number> {
    const today = literalDateOnlyToDate(todayISO());
    return prisma.$transaction(async (tx) => {
      const batches = await tx.medicationBatch.findMany({
        where: {
          medicationId,
          quantity: { gt: 0 },
          OR: [{ expiresOn: null }, { expiresOn: { gte: today } }],
        },
        orderBy: [{ expiresOn: { sort: "asc", nulls: "last" } }, { receivedOn: "asc" }],
      });

      let pending = quantity;
      for (const batch of batches) {
        if (pending <= 0) break;
        const taken = Math.min(batch.quantity, pending);
        await tx.medicationBatch.update({
          where: { id: batch.id },
          data: { quantity: { decrement: taken } },
        });
        await tx.inventoryMove.create({
          data: {
            medicationId,
            batchId: batch.id,
            type: "OUT",
            quantity: taken,
            visitId: visitId ?? null,
          },
        });
        pending -= taken;
      }
      return pending;
    });
  },

  async registerMove(input: NewInventoryMoveRecord): Promise<void> {
    await prisma.inventoryMove.create({
      data: {
        medicationId: input.medicationId,
        type: input.type,
        quantity: input.quantity,
        visitId: input.visitId ?? null,
        batchId: input.batchId ?? null,
      },
    });
  },
};
