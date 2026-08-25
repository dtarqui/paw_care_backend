import { prisma } from "../lib/prisma";
import { dateToTimeLiteral, timeLiteralToDate } from "../utils/date";

export interface ScheduleRecord {
  id: number;
  vetId: number;
  dayOfWeek: number;
  startTime: string; // literal "HH:mm"
  endTime: string;
}

type ScheduleRow = NonNullable<Awaited<ReturnType<typeof prisma.schedule.findUnique>>>;

function toDomain(row: ScheduleRow): ScheduleRecord {
  return {
    id: row.id,
    vetId: row.vetId,
    dayOfWeek: row.dayOfWeek,
    startTime: dateToTimeLiteral(row.startTime),
    endTime: dateToTimeLiteral(row.endTime),
  };
}

export interface NewScheduleRecord {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export const scheduleRepository = {
  async findByVetId(vetId: number): Promise<ScheduleRecord[]> {
    const rows = await prisma.schedule.findMany({
      where: { vetId },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });
    return rows.map(toDomain);
  },

  async findByVetIdAndDay(vetId: number, dayOfWeek: number): Promise<ScheduleRecord[]> {
    const rows = await prisma.schedule.findMany({
      where: { vetId, dayOfWeek },
      orderBy: { startTime: "asc" },
    });
    return rows.map(toDomain);
  },

  /** Reemplaza toda la semana de un veterinario de una — más simple y predecible
   * que un CRUD fila por fila para una grilla semanal editada de una vez. */
  async replaceAll(vetId: number, schedules: NewScheduleRecord[]): Promise<ScheduleRecord[]> {
    return prisma.$transaction(async (tx) => {
      await tx.schedule.deleteMany({ where: { vetId } });
      if (schedules.length === 0) return [];
      await tx.schedule.createMany({
        data: schedules.map((s) => ({
          vetId,
          dayOfWeek: s.dayOfWeek,
          startTime: timeLiteralToDate(s.startTime),
          endTime: timeLiteralToDate(s.endTime),
        })),
      });
      const rows = await tx.schedule.findMany({
        where: { vetId },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      });
      return rows.map(toDomain);
    });
  },
};
