import { prisma } from "../lib/prisma";
import { PreventiveControlType } from "../types";
import { dateOnlyToLiteral, literalDateOnlyToDate } from "../utils/date";

export interface PreventiveControlRecord {
  id: number;
  petId: number;
  type: PreventiveControlType;
  appliedOn: string; // YYYY-MM-DD
  nextDoseOn: string; // YYYY-MM-DD
}

type PreventiveControlRow = NonNullable<Awaited<ReturnType<typeof prisma.preventiveControl.findUnique>>>;

function toDomain(row: PreventiveControlRow): PreventiveControlRecord {
  return {
    id: row.id,
    petId: row.petId,
    type: row.type,
    appliedOn: dateOnlyToLiteral(row.appliedOn),
    nextDoseOn: row.nextDoseOn ? dateOnlyToLiteral(row.nextDoseOn) : "",
  };
}

export interface NewPreventiveControlRecord {
  petId: number;
  type: PreventiveControlType;
  appliedOn: string;
  nextDoseOn?: string;
}

export const preventiveControlRepository = {
  async findByPetId(petId: number): Promise<PreventiveControlRecord[]> {
    const rows = await prisma.preventiveControl.findMany({ where: { petId }, orderBy: { nextDoseOn: "desc" } });
    return rows.map(toDomain);
  },

  async findAll(): Promise<PreventiveControlRecord[]> {
    const rows = await prisma.preventiveControl.findMany();
    return rows.map(toDomain);
  },

  async findById(id: number): Promise<PreventiveControlRecord | undefined> {
    const row = await prisma.preventiveControl.findUnique({ where: { id } });
    return row ? toDomain(row) : undefined;
  },

  async create(input: NewPreventiveControlRecord): Promise<PreventiveControlRecord> {
    const row = await prisma.preventiveControl.create({
      data: {
        petId: input.petId,
        type: input.type,
        appliedOn: literalDateOnlyToDate(input.appliedOn),
        nextDoseOn: input.nextDoseOn ? literalDateOnlyToDate(input.nextDoseOn) : null,
      },
    });
    return toDomain(row);
  },
};
