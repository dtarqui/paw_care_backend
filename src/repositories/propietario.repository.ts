import { prisma } from "../lib/prisma";
import { Propietario, PropietarioConMascotas } from "../types";

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

export interface CambiosPropietario {
  nombre?: string;
  apellidoPaterno?: string;
  telefono?: string;
  direccion?: string;
}

export const propietarioRepository = {
  async findAll(): Promise<PropietarioConMascotas[]> {
    const rows = await prisma.propietario.findMany({
      orderBy: { id: "asc" },
      include: { _count: { select: { mascotas: true } } },
    });
    return rows.map((row) => ({ ...aDominio(row), cantidadMascotas: row._count.mascotas }));
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

  async actualizar(id: number, cambios: CambiosPropietario): Promise<Propietario> {
    const row = await prisma.propietario.update({ where: { id }, data: cambios });
    return aDominio(row);
  },
};
