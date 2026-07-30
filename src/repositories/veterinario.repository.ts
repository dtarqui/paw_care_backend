import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { Veterinario } from "../types";

const include = { usuario: { select: { nombre: true, apellidoPaterno: true } } } satisfies Prisma.VeterinarioInclude;
type VeterinarioRow = Prisma.VeterinarioGetPayload<{ include: typeof include }>;

function aDominio(row: VeterinarioRow): Veterinario {
  return {
    id: row.id,
    usuarioId: row.usuarioId,
    nombre: row.usuario.nombre,
    apellidoPaterno: row.usuario.apellidoPaterno,
    matricula: row.matricula,
    especialidad: row.especialidad,
  };
}

export interface NuevoVeterinarioRegistro {
  usuarioId: number;
  matricula: string;
  especialidad: string;
}

export const veterinarioRepository = {
  async findAll(): Promise<Veterinario[]> {
    const rows = await prisma.veterinario.findMany({ include, orderBy: { id: "asc" } });
    return rows.map(aDominio);
  },

  async findById(id: number): Promise<Veterinario | undefined> {
    const row = await prisma.veterinario.findUnique({ where: { id }, include });
    return row ? aDominio(row) : undefined;
  },

  async findByUsuarioId(usuarioId: number): Promise<Veterinario | undefined> {
    const row = await prisma.veterinario.findUnique({ where: { usuarioId }, include });
    return row ? aDominio(row) : undefined;
  },

  async create(input: NuevoVeterinarioRegistro): Promise<Veterinario> {
    const row = await prisma.veterinario.create({ data: input, include });
    return aDominio(row);
  },
};
