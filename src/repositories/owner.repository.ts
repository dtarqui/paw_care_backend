import { prisma } from "../lib/prisma";
import { Owner, OwnerWithPets } from "../types";

type OwnerRow = NonNullable<Awaited<ReturnType<typeof prisma.owner.findUnique>>>;

function toDomain(row: OwnerRow): Owner {
  return {
    id: row.id,
    firstName: row.firstName,
    paternalLastName: row.paternalLastName,
    nationalId: row.nationalId,
    phone: row.phone ?? "",
    address: row.address ?? undefined,
  };
}

export interface NewOwnerRecord {
  firstName: string;
  paternalLastName: string;
  nationalId: string;
  phone?: string;
}

export interface OwnerChanges {
  firstName?: string;
  paternalLastName?: string;
  phone?: string;
  address?: string;
}

export const ownerRepository = {
  async findAll(): Promise<OwnerWithPets[]> {
    const rows = await prisma.owner.findMany({
      orderBy: { id: "asc" },
      include: { pets: { where: { status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" } } },
    });
    return rows.map((row) => ({ ...toDomain(row), petCount: row.pets.length, pets: row.pets }));
  },

  async findById(id: number): Promise<Owner | undefined> {
    const row = await prisma.owner.findUnique({ where: { id } });
    return row ? toDomain(row) : undefined;
  },

  async findByNationalId(nationalId: string): Promise<Owner | undefined> {
    const row = await prisma.owner.findUnique({ where: { nationalId } });
    return row ? toDomain(row) : undefined;
  }, 

  /** Coincidencia parcial por nombre, apellido o CI — las tres formas en que se
   * identifica a un cliente en el mostrador. */
  async searchByNameOrNationalId(term: string, limit: number): Promise<Owner[]> {
    const rows = await prisma.owner.findMany({
      where: {
        OR: [
          { firstName: { contains: term, mode: "insensitive" } },
          { paternalLastName: { contains: term, mode: "insensitive" } },
          { nationalId: { contains: term } },
        ],
      },
      orderBy: [{ paternalLastName: "asc" }, { firstName: "asc" }],
      take: limit,
    });
    return rows.map(toDomain);
  },

  async create(input: NewOwnerRecord): Promise<Owner> {
    const row = await prisma.owner.create({ data: input });
    return toDomain(row);
  },

  async update(id: number, changes: OwnerChanges): Promise<Owner> {
    const row = await prisma.owner.update({ where: { id }, data: changes });
    return toDomain(row);
  },
};
