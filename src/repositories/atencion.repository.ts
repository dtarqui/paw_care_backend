import { prisma } from "../lib/prisma";
import { EstadoPagoAtencion } from "../types";
import { dateToLiteral } from "../utils/date";

export interface AtencionRegistro {
  id: number;
  mascotaId: number;
  veterinarioId: number;
  fecha: string; // literal "YYYY-MM-DDTHH:mm"
  tipoServicio: string;
  diagnostico: string;
  tratamiento: string;
  examenesExternos: string;
  peso?: number;
  montoConsulta: number;
  estadoPago: EstadoPagoAtencion;
}

type AtencionRow = NonNullable<Awaited<ReturnType<typeof prisma.atencionMedica.findUnique>>>;

function aDominio(row: AtencionRow): AtencionRegistro {
  return {
    id: row.id,
    mascotaId: row.mascotaId,
    veterinarioId: row.veterinarioId,
    fecha: dateToLiteral(row.fecha),
    tipoServicio: row.tipoServicio,
    diagnostico: row.diagnostico,
    tratamiento: row.tratamiento,
    examenesExternos: row.examenesExternos ?? "",
    peso: row.peso ? Number(row.peso) : undefined,
    montoConsulta: Number(row.montoConsulta),
    estadoPago: row.estadoPago,
  };
}

export interface NuevaAtencionRegistro {
  mascotaId: number;
  veterinarioId: number;
  tipoServicio: string;
  diagnostico: string;
  tratamiento: string;
  examenesExternos: string;
  peso?: number;
  montoConsulta: number;
}

export const atencionRepository = {
  async findAll(): Promise<AtencionRegistro[]> {
    const rows = await prisma.atencionMedica.findMany({ orderBy: { fecha: "desc" } });
    return rows.map(aDominio);
  },

  async findByMascotaId(mascotaId: number): Promise<AtencionRegistro[]> {
    const rows = await prisma.atencionMedica.findMany({ where: { mascotaId }, orderBy: { fecha: "desc" } });
    return rows.map(aDominio);
  },

  async findById(id: number): Promise<AtencionRegistro | undefined> {
    const row = await prisma.atencionMedica.findUnique({ where: { id } });
    return row ? aDominio(row) : undefined;
  },

  async findPendientes(): Promise<AtencionRegistro[]> {
    const rows = await prisma.atencionMedica.findMany({ where: { estadoPago: "PENDIENTE" } });
    return rows.map(aDominio);
  },

  async marcarPagada(id: number): Promise<void> {
    await prisma.atencionMedica.update({ where: { id }, data: { estadoPago: "PAGADO" } });
  },

  async create(input: NuevaAtencionRegistro): Promise<AtencionRegistro> {
    const row = await prisma.atencionMedica.create({ data: { ...input, estadoPago: "PENDIENTE" } });
    return aDominio(row);
  },
};
