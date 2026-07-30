import { prisma } from "../lib/prisma";
import { TipoControlPreventivo } from "../types";
import { dateOnlyToLiteral, literalDateOnlyToDate } from "../utils/date";

export interface ControlRegistro {
  id: number;
  mascotaId: number;
  tipo: TipoControlPreventivo;
  fechaAplicacion: string; // YYYY-MM-DD
  proximaDosis: string; // YYYY-MM-DD
}

type ControlRow = NonNullable<Awaited<ReturnType<typeof prisma.controlPreventivo.findUnique>>>;

function aDominio(row: ControlRow): ControlRegistro {
  return {
    id: row.id,
    mascotaId: row.mascotaId,
    tipo: row.tipo,
    fechaAplicacion: dateOnlyToLiteral(row.fechaAplicacion),
    proximaDosis: row.proximaDosis ? dateOnlyToLiteral(row.proximaDosis) : "",
  };
}

export interface NuevoControlRegistro {
  mascotaId: number;
  tipo: TipoControlPreventivo;
  fechaAplicacion: string;
  proximaDosis?: string;
}

export const controlPreventivoRepository = {
  async findByMascotaId(mascotaId: number): Promise<ControlRegistro[]> {
    const rows = await prisma.controlPreventivo.findMany({ where: { mascotaId }, orderBy: { proximaDosis: "desc" } });
    return rows.map(aDominio);
  },

  async findAll(): Promise<ControlRegistro[]> {
    const rows = await prisma.controlPreventivo.findMany();
    return rows.map(aDominio);
  },

  async findById(id: number): Promise<ControlRegistro | undefined> {
    const row = await prisma.controlPreventivo.findUnique({ where: { id } });
    return row ? aDominio(row) : undefined;
  },

  async create(input: NuevoControlRegistro): Promise<ControlRegistro> {
    const row = await prisma.controlPreventivo.create({
      data: {
        mascotaId: input.mascotaId,
        tipo: input.tipo,
        fechaAplicacion: literalDateOnlyToDate(input.fechaAplicacion),
        proximaDosis: input.proximaDosis ? literalDateOnlyToDate(input.proximaDosis) : null,
      },
    });
    return aDominio(row);
  },
};
