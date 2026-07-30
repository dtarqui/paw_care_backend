import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { Mascota } from "../types";
import { dateOnlyToLiteral, literalDateOnlyToDate } from "../utils/date";

const include = { propietario: true } satisfies Prisma.MascotaInclude;
type MascotaRow = Prisma.MascotaGetPayload<{ include: typeof include }>;

function aDominio(row: MascotaRow): Mascota {
  return {
    id: row.id,
    nombre: row.nombre,
    especie: row.especie,
    raza: row.raza ?? "",
    sexo: (row.sexo as "Macho" | "Hembra") ?? "Macho",
    fechaNacimiento: row.fechaNacimiento ? dateOnlyToLiteral(row.fechaNacimiento) : "",
    peso: row.peso ? Number(row.peso) : 0,
    propietario: {
      id: row.propietario.id,
      nombre: row.propietario.nombre,
      apellidoPaterno: row.propietario.apellidoPaterno,
      ci: row.propietario.ci,
      telefono: row.propietario.telefono ?? "",
    },
  };
}

export interface NuevaMascotaRegistro {
  propietarioId: number;
  nombre: string;
  especie: string;
  raza?: string;
  sexo: "Macho" | "Hembra";
  fechaNacimiento?: string;
  peso?: number;
}

export const mascotaRepository = {
  async findAll(): Promise<Mascota[]> {
    const rows = await prisma.mascota.findMany({ include, orderBy: { id: "asc" } });
    return rows.map(aDominio);
  },

  async findById(id: number): Promise<Mascota | undefined> {
    const row = await prisma.mascota.findUnique({ where: { id }, include });
    return row ? aDominio(row) : undefined;
  },

  async findByPropietarioCi(ci: string): Promise<Mascota[]> {
    const rows = await prisma.mascota.findMany({ where: { propietario: { ci } }, include, orderBy: { id: "asc" } });
    return rows.map(aDominio);
  },

  async existeParaPropietario(propietarioId: number, nombre: string, especie: string): Promise<boolean> {
    const row = await prisma.mascota.findFirst({
      where: {
        propietarioId,
        nombre: { equals: nombre, mode: "insensitive" },
        especie: { equals: especie, mode: "insensitive" },
      },
    });
    return !!row;
  },

  async create(input: NuevaMascotaRegistro): Promise<Mascota> {
    const row = await prisma.mascota.create({
      data: {
        propietarioId: input.propietarioId,
        nombre: input.nombre,
        especie: input.especie,
        raza: input.raza || null,
        sexo: input.sexo,
        fechaNacimiento: input.fechaNacimiento ? literalDateOnlyToDate(input.fechaNacimiento) : null,
        peso: input.peso || null,
      },
      include,
    });
    return aDominio(row);
  },
};
