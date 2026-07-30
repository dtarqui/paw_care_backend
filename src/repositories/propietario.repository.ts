import { prisma } from "../lib/prisma";
import { Propietario } from "../types";

type PropietarioRow = NonNullable<Awaited<ReturnType<typeof prisma.propietario.findUnique>>>;

function aDominio(row: PropietarioRow): Propietario {
  return {
    id: row.id,
    nombre: row.nombre,
    apellidoPaterno: row.apellidoPaterno,
    ci: row.ci,
    telefono: row.telefono ?? "",
  };
}

export interface NuevoPropietarioRegistro {
  nombre: string;
  apellidoPaterno: string;
  ci: string;
  telefono?: string;
}

export const propietarioRepository = {
  async findAll(): Promise<Propietario[]> {
    const rows = await prisma.propietario.findMany({ orderBy: { id: "asc" } });
    return rows.map(aDominio);
  },

  async findById(id: number): Promise<Propietario | undefined> {
    const row = await prisma.propietario.findUnique({ where: { id } });
    return row ? aDominio(row) : undefined;
  },

  async findByCi(ci: string): Promise<Propietario | undefined> {
    const row = await prisma.propietario.findUnique({ where: { ci } });
    return row ? aDominio(row) : undefined;
  },

  async create(input: NuevoPropietarioRegistro): Promise<Propietario> {
    const row = await prisma.propietario.create({ data: input });
    return aDominio(row);
  },
};
