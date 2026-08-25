import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { Vet } from "../types";

const include = { user: { select: { firstName: true, paternalLastName: true } } } satisfies Prisma.VetInclude;
type VetRow = Prisma.VetGetPayload<{ include: typeof include }>;

function toDomain(row: VetRow): Vet {
  return {
    id: row.id,
    userId: row.userId,
    firstName: row.user.firstName,
    paternalLastName: row.user.paternalLastName,
    licenseNumber: row.licenseNumber,
    specialty: row.specialty,
  };
}

export interface NewVetRecord {
  userId: number;
  licenseNumber: string;
  specialty: string;
  status?: "ACTIVE" | "INACTIVE";
}

export const vetRepository = {
  async findAll(): Promise<Vet[]> {
    const rows = await prisma.vet.findMany({ include, orderBy: { id: "asc" } });
    return rows.map(toDomain);
  },

  /** Solo veterinarios ACTIVE — usado en selects de agendar/atender (no tiene sentido ofrecer uno desactivado). */
  async findAllActive(): Promise<Vet[]> {
    const rows = await prisma.vet.findMany({ where: { status: "ACTIVE" }, include, orderBy: { id: "asc" } });
    return rows.map(toDomain);
  },

  async updateStatus(id: number, status: "ACTIVE" | "INACTIVE"): Promise<void> {
    await prisma.vet.update({ where: { id }, data: { status } });
  },

  async findById(id: number): Promise<Vet | undefined> {
    const row = await prisma.vet.findUnique({ where: { id }, include });
    return row ? toDomain(row) : undefined;
  },

  async findByUserId(userId: number): Promise<Vet | undefined> {
    const row = await prisma.vet.findUnique({ where: { userId }, include });
    return row ? toDomain(row) : undefined;
  },

  async create(input: NewVetRecord): Promise<Vet> {
    const row = await prisma.vet.create({ data: input, include });
    return toDomain(row);
  },
};
