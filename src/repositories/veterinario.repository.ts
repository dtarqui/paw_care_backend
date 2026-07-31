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
  estado?: "ACTIVO" | "INACTIVO";
}

export const veterinarioRepository = {
  async findAll(): Promise<Veterinario[]> {
    const rows = await prisma.veterinario.findMany({ include, orderBy: { id: "asc" } });
    return rows.map(aDominio);
  },

  /** Solo veterinarios ACTIVO — usado en selects de agendar/atender (no tiene sentido ofrecer uno desactivado). */
  async findAllActivos(): Promise<Veterinario[]> {
    const rows = await prisma.veterinario.findMany({ where: { estado: "ACTIVO" }, include, orderBy: { id: "asc" } });
    return rows.map(aDominio);
  },

  async actualizarEstado(id: number, estado: "ACTIVO" | "INACTIVO"): Promise<void> {
    await prisma.veterinario.update({ where: { id }, data: { estado } });
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
