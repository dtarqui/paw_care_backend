import { Prisma } from "@prisma/client";
import { appointmentRepository } from "../repositories/appointment.repository";
import { petRepository } from "../repositories/pet.repository";
import { vetRepository } from "../repositories/vet.repository";
import { Appointment, AppointmentStatus, Role } from "../types";
import { literalToDate } from "../utils/date";
import { ForeignScheduleError } from "./schedule.errors";
import { scheduleService } from "./schedule.service";

export { ForeignScheduleError };

export class AppointmentNotFoundError extends Error {
  constructor() {
    super("La cita solicitada no existe");
    this.name = "AppointmentNotFoundError";
  }
}

export class ScheduleConflictError extends Error {
  constructor() {
    super("El veterinario ya tiene una cita en ese horario");
    this.name = "ScheduleConflictError";
  }
}

export class InvalidAppointmentDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAppointmentDataError";
  }
}

/** El índice único parcial `appointment_vet_datetime_active_idx` (ver migración
 * init_english_st_prefix) es el respaldo a nivel de BD contra doble-reserva en
 * condición de carrera — la validación de `bookedSlots` cubre el
 * camino normal, esto solo evita un 500 crudo en el caso raro de choque. */
async function creatingOrRescheduling<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ScheduleConflictError();
    }
    throw error;
  }
}

interface NewAppointmentInput {
  petId: number;
  vetId: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  consultationType: string;
  reason: string;
  durationMin?: number;
}

interface Requester {
  id: number;
  role: Role;
}

async function generateCode(isoDate: string): Promise<string> {
  const yyyymmdd = isoDate.replaceAll("-", "");
  const sequence = (await appointmentRepository.countByCodeFragment(yyyymmdd)) + 1;
  return `CITA-${yyyymmdd}-${String(sequence).padStart(3, "0")}`;
}

export const appointmentService = {
  list(page = 1, pageSize = 20) {
    return appointmentRepository.findAllPaginated(page, pageSize);
  },

  async availability(vetId: number, isoDate: string) {
    const dayOfWeek = literalToDate(isoDate).getDay();
    const [slots, booked] = await Promise.all([
      scheduleService.baseSlots(vetId, dayOfWeek),
      appointmentRepository.findBookedSlotsByVetAndDate(vetId, isoDate).then((h) => new Set(h)),
    ]);
    return slots.map((time) => ({
      time,
      available: !booked.has(time),
    }));
  },

  async changeStatus(id: number, newStatus: AppointmentStatus): Promise<Appointment> {
    const appointment = await appointmentRepository.findById(id);
    if (!appointment) throw new AppointmentNotFoundError();
    return appointmentRepository.updateStatus(id, newStatus);
  },

  async create(input: NewAppointmentInput, requester: Requester): Promise<Appointment> {
    const pet = await petRepository.findById(input.petId);
    const vet = await vetRepository.findById(input.vetId);
    if (!pet || !vet || !input.date || !input.time || !input.consultationType) {
      throw new InvalidAppointmentDataError("Faltan datos obligatorios para agendar la cita");
    }

    // Un veterinario solo gestiona su propia agenda; Administrador y Recepcionista
    // pueden agendar para cualquier veterinario. Se valida acá (no solo en el frontend)
    // porque el frontend no es una barrera de seguridad real.
    if (requester.role === "VET") {
      const ownVet = await vetRepository.findByUserId(requester.id);
      if (!ownVet || ownVet.id !== input.vetId) {
        throw new ForeignScheduleError("Como veterinario solo puedes agendar citas para ti mismo");
      }
    }

    const booked = await appointmentRepository.findBookedSlotsByVetAndDate(input.vetId, input.date);
    if (booked.includes(input.time)) {
      throw new ScheduleConflictError();
    }

    return creatingOrRescheduling(async () =>
      appointmentRepository.create({
        code: await generateCode(input.date),
        dateTime: `${input.date}T${input.time}`,
        durationMin: input.durationMin ?? 30,
        petId: pet.id,
        vetId: vet.id,
        consultationType: input.consultationType,
        reason: input.reason,
      })
    );
  },

  async reschedule(
    id: number,
    input: { date: string; time: string },
    requester: Requester
  ): Promise<Appointment> {
    const appointment = await appointmentRepository.findById(id);
    if (!appointment) throw new AppointmentNotFoundError();
    if (appointment.status === "CANCELLED") {
      throw new InvalidAppointmentDataError("No se puede reprogramar una cita cancelada");
    }
    if (!input.date || !input.time) {
      throw new InvalidAppointmentDataError("Fecha y hora son obligatorias para reprogramar");
    }

    if (requester.role === "VET") {
      const ownVet = await vetRepository.findByUserId(requester.id);
      if (!ownVet || ownVet.id !== appointment.vet.id) {
        throw new ForeignScheduleError("Como veterinario solo puedes agendar citas para ti mismo");
      }
    }

    const booked = await appointmentRepository.findBookedSlotsByVetAndDate(
      appointment.vet.id,
      input.date,
      appointment.id
    );
    if (booked.includes(input.time)) {
      throw new ScheduleConflictError();
    }

    return creatingOrRescheduling(() =>
      appointmentRepository.reschedule(id, `${input.date}T${input.time}`)
    );
  },
};
