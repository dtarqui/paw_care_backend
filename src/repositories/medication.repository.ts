import { prisma } from "../lib/prisma";
import { InventoryMoveType, Medication } from "../types";

type MedicationRow = NonNullable<Awaited<ReturnType<typeof prisma.medication.findUnique>>>;

function toDomain(row: MedicationRow): Medication {
  return { id: row.id, name: row.name, currentStock: row.currentStock, minimumStock: row.minimumStock };
}

export interface NewInventoryMoveRecord {
  medicationId: number;
  type: InventoryMoveType;
  quantity: number;
  visitId?: number;
}

export interface NewMedicationRecord {
  name: string;
  minimumStock: number;
  currentStock?: number;
}

export interface MedicationChanges {
  name?: string;
  minimumStock?: number;
}

export const medicationRepository = {
  async findByName(name: string): Promise<Medication | undefined> {
    const row = await prisma.medication.findUnique({ where: { name } });
    return row ? toDomain(row) : undefined;
  },

  async create(input: NewMedicationRecord): Promise<Medication> {
    const row = await prisma.medication.create({
      data: { name: input.name, minimumStock: input.minimumStock, currentStock: input.currentStock ?? 0 },
    });
    return toDomain(row);
  },

  async update(id: number, changes: MedicationChanges): Promise<Medication> {
    const row = await prisma.medication.update({ where: { id }, data: changes });
    return toDomain(row);
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
    return rows.map(toDomain);
  },

  async findById(id: number): Promise<Medication | undefined> {
    const row = await prisma.medication.findUnique({ where: { id } });
    return row ? toDomain(row) : undefined;
  },

  async findLowStock(): Promise<Medication[]> {
    // Prisma no permite comparar dos columnas entre sí en el `where`; el catálogo es
    // chico así que se filtra en memoria en vez de usar $queryRaw.
    const rows = await prisma.medication.findMany({ orderBy: { name: "asc" } });
    return rows.filter((r) => r.currentStock <= r.minimumStock).map(toDomain);
  },

  async adjustStock(id: number, delta: number): Promise<void> {
    await prisma.medication.update({ where: { id }, data: { currentStock: { increment: delta } } });
  },

  async registerMove(input: NewInventoryMoveRecord): Promise<void> {
    await prisma.inventoryMove.create({
      data: {
        medicationId: input.medicationId,
        type: input.type,
        quantity: input.quantity,
        visitId: input.visitId ?? null,
      },
    });
  },
};
