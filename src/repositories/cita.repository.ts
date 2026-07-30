import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { Cita, EstadoCita } from "../types";
import { dateToLiteral, literalToDate } from "../utils/date";

// Horario de atención estándar usado para calcular disponibilidad (Horario en el modelo real, database/MODELO_DATOS.md).
const BLOQUES_HORARIO = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00",
];

const include = {
  mascota: { select: { id: true, nombre: true, especie: true } },
  veterinario: { include: { usuario: { select: { nombre: true, apellidoPaterno: true } } } },
} satisfies Prisma.CitaInclude;
type CitaRow = Prisma.CitaGetPayload<{ include: typeof include }>;

function aDominio(row: CitaRow): Cita {
  return {
    id: row.id,
    codigo: row.codigo,
    fechaHora: dateToLiteral(row.fechaHora),
    duracionMin: row.duracionMin,
    mascota: { id: row.mascota.id, nombre: row.mascota.nombre, especie: row.mascota.especie },
    veterinario: {
      id: row.veterinarioId,
      nombre: row.veterinario.usuario.nombre,
      apellidoPaterno: row.veterinario.usuario.apellidoPaterno,
    },
    tipoConsulta: row.tipoConsulta,
    motivo: row.motivo ?? "",
    estado: row.estado,
  };
}

export interface NuevaCitaRegistro {
  codigo: string;
  fechaHora: string; // literal "YYYY-MM-DDTHH:mm"
  duracionMin: number;
  mascotaId: number;
  veterinarioId: number;
  tipoConsulta: string;
  motivo: string;
}

export const citaRepository = {
  async findAll(): Promise<Cita[]> {
    const rows = await prisma.cita.findMany({ include, orderBy: { fechaHora: "asc" } });
    return rows.map(aDominio);
  },

  async findById(id: number): Promise<Cita | undefined> {
    const row = await prisma.cita.findUnique({ where: { id }, include });
    return row ? aDominio(row) : undefined;
  },

  async findOcupadosPorVeterinarioYFecha(veterinarioId: number, fechaISO: string, excluirCitaId?: number): Promise<string[]> {
    const inicio = literalToDate(fechaISO);
    const fin = new Date(inicio);
    fin.setDate(fin.getDate() + 1);

    const rows = await prisma.cita.findMany({
      where: {
        veterinarioId,
        fechaHora: { gte: inicio, lt: fin },
        estado: { not: "CANCELADA" },
        ...(excluirCitaId ? { id: { not: excluirCitaId } } : {}),
      },
      select: { fechaHora: true },
    });
    return rows.map((r) => dateToLiteral(r.fechaHora).slice(11, 16));
  },

  bloquesHorarioBase(): string[] {
    return BLOQUES_HORARIO;
  },

  /** Cuenta citas cuyo código contiene el prefijo YYYYMMDD, para numerar la secuencia diaria (ver cita.service.ts). */
  async contarPorCodigoParcial(yyyymmdd: string): Promise<number> {
    return prisma.cita.count({ where: { codigo: { contains: yyyymmdd } } });
  },

  async create(input: NuevaCitaRegistro): Promise<Cita> {
    const row = await prisma.cita.create({
      data: {
        codigo: input.codigo,
        fechaHora: literalToDate(input.fechaHora),
        duracionMin: input.duracionMin,
        mascotaId: input.mascotaId,
        veterinarioId: input.veterinarioId,
        tipoConsulta: input.tipoConsulta,
        motivo: input.motivo || null,
        estado: "CONFIRMADA",
      },
      include,
    });
    return aDominio(row);
  },

  async actualizarEstado(id: number, estado: EstadoCita): Promise<Cita> {
    const row = await prisma.cita.update({ where: { id }, data: { estado }, include });
    return aDominio(row);
  },

  async reprogramar(id: number, fechaHoraLiteral: string): Promise<Cita> {
    const row = await prisma.cita.update({ where: { id }, data: { fechaHora: literalToDate(fechaHoraLiteral) }, include });
    return aDominio(row);
  },
};
