import { ScheduleRecord, scheduleRepository } from "../repositories/schedule.repository";
import { vetRepository } from "../repositories/vet.repository";
import { Role } from "../types";
import { ForeignScheduleError } from "./schedule.errors";

export class InvalidScheduleDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidScheduleDataError";
  }
}

interface Requester {
  id: number;
  role: Role;
}

interface ScheduleBlockInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

const SLOT_DURATION_MIN = 30;

async function checkPermission(vetId: number, requester: Requester) {
  if (requester.role !== "VET") return; // Administrador puede editar cualquiera
  const ownVet = await vetRepository.findByUserId(requester.id);
  if (!ownVet || ownVet.id !== vetId) {
    throw new ForeignScheduleError();
  }
}

/** Genera los bloques reservables de `SLOT_DURATION_MIN` dentro de cada rango
 * startTime–endTime (un veterinario puede tener más de un rango por día, ej.
 * mañana y tarde) — el último bloque generado es el que termina exactamente en
 * endTime, nunca uno que se pase. */
function buildSlots(ranges: { startTime: string; endTime: string }[]): string[] {
  const slots: string[] = [];
  for (const range of ranges) {
    let [hh, mi] = range.startTime.split(":").map(Number);
    const [endHh, endMi] = range.endTime.split(":").map(Number);
    while (hh * 60 + mi + SLOT_DURATION_MIN <= endHh * 60 + endMi) {
      slots.push(`${String(hh).padStart(2, "0")}:${String(mi).padStart(2, "0")}`);
      mi += SLOT_DURATION_MIN;
      if (mi >= 60) {
        mi -= 60;
        hh += 1;
      }
    }
  }
  return slots;
}

export const scheduleService = {
  async list(vetId: number): Promise<ScheduleRecord[]> {
    if (!(await vetRepository.findById(vetId))) {
      throw new InvalidScheduleDataError("El veterinario no existe");
    }
    return scheduleRepository.findByVetId(vetId);
  },

  async update(
    vetId: number,
    schedules: ScheduleBlockInput[],
    requester: Requester
  ): Promise<ScheduleRecord[]> {
    if (!(await vetRepository.findById(vetId))) {
      throw new InvalidScheduleDataError("El veterinario no existe");
    }
    await checkPermission(vetId, requester);

    for (const s of schedules) {
      if (s.dayOfWeek < 0 || s.dayOfWeek > 6) {
        throw new InvalidScheduleDataError("dayOfWeek debe estar entre 0 (domingo) y 6 (sábado)");
      }
      if (!/^\d{2}:\d{2}$/.test(s.startTime) || !/^\d{2}:\d{2}$/.test(s.endTime)) {
        throw new InvalidScheduleDataError("Formato de hora inválido (esperado HH:mm)");
      }
      if (s.startTime >= s.endTime) {
        throw new InvalidScheduleDataError("La hora de inicio debe ser anterior a la hora de fin");
      }
    }

    return scheduleRepository.replaceAll(vetId, schedules);
  },

  /** Usado por appointmentService.availability — bloques reservables de un veterinario
   * en un día de la semana dado, antes de restar los ya ocupados. */
  async baseSlots(vetId: number, dayOfWeek: number): Promise<string[]> {
    const ranges = await scheduleRepository.findByVetIdAndDay(vetId, dayOfWeek);
    return buildSlots(ranges);
  },
};
