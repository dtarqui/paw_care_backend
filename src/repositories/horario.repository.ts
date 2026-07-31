import { prisma } from "../lib/prisma";
import { dateToHoraLiteral, horaLiteralToDate } from "../utils/date";

export interface HorarioRegistro {
  id: number;
  veterinarioId: number;
  diaSemana: number;
  horaInicio: string; // literal "HH:mm"
  horaFin: string;
}

type HorarioRow = NonNullable<Awaited<ReturnType<typeof prisma.horario.findUnique>>>;

function aDominio(row: HorarioRow): HorarioRegistro {
  return {
    id: row.id,
    veterinarioId: row.veterinarioId,
    diaSemana: row.diaSemana,
    horaInicio: dateToHoraLiteral(row.horaInicio),
    horaFin: dateToHoraLiteral(row.horaFin),
  };
}

export interface NuevoHorarioRegistro {
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
}

export const horarioRepository = {
  async findByVeterinarioId(veterinarioId: number): Promise<HorarioRegistro[]> {
    const rows = await prisma.horario.findMany({ where: { veterinarioId }, orderBy: [{ diaSemana: "asc" }, { horaInicio: "asc" }] });
    return rows.map(aDominio);
  },

  async findByVeterinarioIdYDia(veterinarioId: number, diaSemana: number): Promise<HorarioRegistro[]> {
    const rows = await prisma.horario.findMany({
      where: { veterinarioId, diaSemana },
      orderBy: { horaInicio: "asc" },
    });
    return rows.map(aDominio);
  },

  /** Reemplaza toda la semana de un veterinario de una — más simple y predecible
   * que un CRUD fila por fila para una grilla semanal editada de una vez. */
  async reemplazarTodos(veterinarioId: number, horarios: NuevoHorarioRegistro[]): Promise<HorarioRegistro[]> {
    return prisma.$transaction(async (tx) => {
      await tx.horario.deleteMany({ where: { veterinarioId } });
      if (horarios.length === 0) return [];
      await tx.horario.createMany({
        data: horarios.map((h) => ({
          veterinarioId,
          diaSemana: h.diaSemana,
          horaInicio: horaLiteralToDate(h.horaInicio),
          horaFin: horaLiteralToDate(h.horaFin),
        })),
      });
      const rows = await tx.horario.findMany({ where: { veterinarioId }, orderBy: [{ diaSemana: "asc" }, { horaInicio: "asc" }] });
      return rows.map(aDominio);
    });
  },
};
