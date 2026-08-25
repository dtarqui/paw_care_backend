import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { Paginated, Pet, PetChange, RecordStatus } from "../types";
import { dateOnlyToLiteral, dateToLiteral, literalDateOnlyToDate } from "../utils/date";

const include = { owner: true } satisfies Prisma.PetInclude;
type PetRow = Prisma.PetGetPayload<{ include: typeof include }>;

function toDomain(row: PetRow): Pet {
  return {
    id: row.id,
    name: row.name,
    species: row.species,
    breed: row.breed ?? "",
    sex: (row.sex as "Macho" | "Hembra") ?? "Macho",
    birthDate: row.birthDate ? dateOnlyToLiteral(row.birthDate) : "",
    weight: row.weight ? Number(row.weight) : 0,
    status: row.status,
    owner: {
      id: row.owner.id,
      firstName: row.owner.firstName,
      paternalLastName: row.owner.paternalLastName,
      nationalId: row.owner.nationalId,
      phone: row.owner.phone ?? "",
    },
  };
}

export interface NewPetRecord {
  ownerId: number;
  name: string;
  species: string;
  breed?: string;
  sex: "Macho" | "Hembra";
  birthDate?: string;
  weight?: number;
}

export const petRepository = {
  async findAll(): Promise<Pet[]> {
    const rows = await prisma.pet.findMany({ include, orderBy: { id: "asc" } });
    return rows.map(toDomain);
  },

  /** Para la pantalla de listado — a diferencia de findAll(), que se usa para
   * exportación completa y otros cálculos internos que necesitan el set entero.
   * Por defecto solo trae mascotas ACTIVE; activeOnly=false incluye también
   * las eliminadas (borrado lógico) para el toggle "Mostrar inactivas" de la UI. */
  async findAllPaginated(page: number, pageSize: number, activeOnly = true): Promise<Paginated<Pet>> {
    const where = activeOnly ? { status: "ACTIVE" as const } : {};
    const [rows, total] = await Promise.all([
      prisma.pet.findMany({ where, include, orderBy: { id: "asc" }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.pet.count({ where }),
    ]);
    return { items: rows.map(toDomain), total, page, pageSize };
  },

  async updateStatus(id: number, status: RecordStatus): Promise<Pet> {
    const row = await prisma.pet.update({ where: { id }, data: { status }, include });
    return toDomain(row);
  },

  async findById(id: number): Promise<Pet | undefined> {
    const row = await prisma.pet.findUnique({ where: { id }, include });
    return row ? toDomain(row) : undefined;
  },

  async findByOwnerNationalId(nationalId: string): Promise<Pet[]> {
    const rows = await prisma.pet.findMany({
      where: { owner: { nationalId }, status: "ACTIVE" },
      include,
      orderBy: { id: "asc" },
    });
    return rows.map(toDomain);
  },

  /** Coincidencia parcial por nombre, para la búsqueda global. Solo mascotas
   * activas: una mascota dada de baja no es un destino útil al que saltar. */
  async searchByName(term: string, limit: number): Promise<Pet[]> {
    const rows = await prisma.pet.findMany({
      where: { status: "ACTIVE", name: { contains: term, mode: "insensitive" } },
      include,
      orderBy: { name: "asc" },
      take: limit,
    });
    return rows.map(toDomain);
  },

  async existsForOwner(ownerId: number, name: string, species: string): Promise<boolean> {
    const row = await prisma.pet.findFirst({
      where: {
        ownerId,
        name: { equals: name, mode: "insensitive" },
        species: { equals: species, mode: "insensitive" },
      },
    });
    return !!row;
  },

  async create(input: NewPetRecord): Promise<Pet> {
    const row = await prisma.pet.create({
      data: {
        ownerId: input.ownerId,
        name: input.name,
        species: input.species,
        breed: input.breed || null,
        sex: input.sex,
        birthDate: input.birthDate ? literalDateOnlyToDate(input.birthDate) : null,
        weight: input.weight || null,
      },
      include,
    });
    return toDomain(row);
  },

  async update(id: number, changes: Partial<NewPetRecord>): Promise<Pet> {
    const row = await prisma.pet.update({
      where: { id },
      data: {
        ...(changes.name !== undefined ? { name: changes.name } : {}),
        ...(changes.species !== undefined ? { species: changes.species } : {}),
        ...(changes.breed !== undefined ? { breed: changes.breed || null } : {}),
        ...(changes.sex !== undefined ? { sex: changes.sex } : {}),
        ...(changes.birthDate !== undefined
          ? { birthDate: changes.birthDate ? literalDateOnlyToDate(changes.birthDate) : null }
          : {}),
        ...(changes.weight !== undefined ? { weight: changes.weight || null } : {}),
      },
      include,
    });
    return toDomain(row);
  },

  /** Bitácora de ediciones manuales (no incluye los pesos registrados en una
   * atención, ver medicalVisit.repository.ts). */
  async recordChanges(
    petId: number,
    changes: { field: string; oldValue?: string; newValue?: string }[],
    userId?: number
  ): Promise<void> {
    if (changes.length === 0) return;
    await prisma.petChange.createMany({
      data: changes.map((c) => ({
        petId,
        field: c.field,
        oldValue: c.oldValue ?? null,
        newValue: c.newValue ?? null,
        userId: userId ?? null,
      })),
    });
  },

  async changeHistory(petId: number): Promise<PetChange[]> {
    const rows = await prisma.petChange.findMany({
      where: { petId },
      include: { user: { select: { firstName: true, paternalLastName: true } } },
      orderBy: { date: "desc" },
    });
    return rows.map((row) => ({
      id: row.id,
      field: row.field,
      oldValue: row.oldValue ?? undefined,
      newValue: row.newValue ?? undefined,
      date: dateToLiteral(row.date),
      user: row.user ? `${row.user.firstName} ${row.user.paternalLastName}` : undefined,
    }));
  },
};
