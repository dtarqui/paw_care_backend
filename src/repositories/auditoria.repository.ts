import { prisma } from "../lib/prisma";
import { AccionAuditoria, Paginado, RegistroAuditoria } from "../types";
import { dateToLiteral } from "../utils/date";

export interface NuevoRegistroAuditoria {
  actorId?: number;
  accion: AccionAuditoria;
  entidadTipo: string;
  entidadId?: number;
  detalle?: string;
}

export const auditoriaRepository = {
  async registrar(input: NuevoRegistroAuditoria): Promise<void> {
    await prisma.registroAuditoria.create({ data: input });
  },

  async findAllPaginado(page: number, pageSize: number): Promise<Paginado<RegistroAuditoria>> {
    const [rows, total] = await Promise.all([
      prisma.registroAuditoria.findMany({
        orderBy: { fecha: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { actor: { select: { nombre: true, apellidoPaterno: true } } },
      }),
      prisma.registroAuditoria.count(),
    ]);
    return {
      items: rows.map((row) => ({
        id: row.id,
        actor: row.actor ? { nombre: row.actor.nombre, apellidoPaterno: row.actor.apellidoPaterno } : undefined,
        accion: row.accion,
        entidadTipo: row.entidadTipo,
        entidadId: row.entidadId ?? undefined,
        detalle: row.detalle ?? undefined,
        fecha: dateToLiteral(row.fecha),
      })),
      total,
      page,
      pageSize,
    };
  },
};
