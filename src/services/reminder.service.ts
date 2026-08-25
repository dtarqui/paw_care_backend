import { appointmentRepository } from "../repositories/appointment.repository";
import { notificationRepository } from "../repositories/notification.repository";
import { petRepository } from "../repositories/pet.repository";
import { preventiveControlRepository } from "../repositories/preventiveControl.repository";
import { PendingReminder } from "../types";
import { addDays, addHours, nowLiteral, todayISO } from "../utils/date";

export class ReminderNotFoundError extends Error {
  constructor() {
    super("El recordatorio solicitado no existe");
    this.name = "ReminderNotFoundError";
  }
}

// Los mensajes van en español: se envían tal cual al propietario por WhatsApp.
function appointmentMessage(petName: string, dateTime: string): string {
  const [date, time] = dateTime.split("T");
  const [yyyy, mm, dd] = date.split("-");
  return `Hola, te recordamos la cita de ${petName} el ${dd}/${mm}/${yyyy} a las ${time.slice(0, 5)} en PawCare.`;
}

function preventiveControlMessage(petName: string, type: string, nextDoseOn: string): string {
  const [yyyy, mm, dd] = nextDoseOn.split("-");
  const typeText = type === "VACCINE" ? "la vacuna" : "la desparasitación";
  return `Hola, te recordamos que ${typeText} de ${petName} vence el ${dd}/${mm}/${yyyy}. Agenda su control en PawCare.`;
}

export const reminderService = {
  // HU10/HU11 Track A: recordatorios de citas en las próximas 24h + controles
  // preventivos que vencen en 7 días, excluyendo los ya marcados como enviados.
  async pending(): Promise<PendingReminder[]> {
    const now = nowLiteral();
    const limit24h = addHours(now, 24);
    const result: PendingReminder[] = [];

    for (const appointment of await appointmentRepository.findAll()) {
      if (appointment.status !== "CONFIRMED") continue;
      const mark = appointment.dateTime.slice(0, 16);
      if (mark < now || mark > limit24h) continue;
      if (await notificationRepository.alreadySentForAppointment(appointment.id)) continue;

      const pet = await petRepository.findById(appointment.pet.id);
      if (!pet) continue;

      result.push({
        id: `APPOINTMENT-${appointment.id}`,
        type: "APPOINTMENT",
        owner: {
          phone: pet.owner.phone,
          firstName: pet.owner.firstName,
          paternalLastName: pet.owner.paternalLastName,
        },
        message: appointmentMessage(pet.name, appointment.dateTime),
        reference: `Cita de ${pet.name} — ${appointment.dateTime.slice(0, 10)} ${appointment.dateTime.slice(11, 16)}`,
      });
    }

    const controlLimit = addDays(todayISO(), 7);
    for (const control of await preventiveControlRepository.findAll()) {
      if (!control.nextDoseOn) continue;
      if (control.nextDoseOn < todayISO() || control.nextDoseOn > controlLimit) continue;
      if (await notificationRepository.alreadySentForPreventiveControl(control.id)) continue;

      const pet = await petRepository.findById(control.petId);
      if (!pet) continue;

      result.push({
        id: `PREVENTIVE_CONTROL-${control.id}`,
        type: "PREVENTIVE_CONTROL",
        owner: {
          phone: pet.owner.phone,
          firstName: pet.owner.firstName,
          paternalLastName: pet.owner.paternalLastName,
        },
        message: preventiveControlMessage(pet.name, control.type, control.nextDoseOn),
        reference: `${control.type === "VACCINE" ? "Vacuna" : "Desparasitación"} de ${pet.name} — vence ${control.nextDoseOn}`,
      });
    }

    return result;
  },

  sentHistory(limit = 5) {
    return notificationRepository.findRecentSent(limit);
  },

  async markSent(id: string): Promise<void> {
    // El id compuesto usa "-" como separador y el propio tipo puede contenerlo
    // (PREVENTIVE_CONTROL-12), así que se parte por el ÚLTIMO guion, no el primero.
    const separatorIndex = id.lastIndexOf("-");
    const type = id.slice(0, separatorIndex);
    const referenceId = Number(id.slice(separatorIndex + 1));

    if (type === "APPOINTMENT") {
      const appointment = await appointmentRepository.findById(referenceId);
      if (!appointment) throw new ReminderNotFoundError();
      const pet = await petRepository.findById(appointment.pet.id);
      if (!pet) throw new ReminderNotFoundError();
      await notificationRepository.markSentForAppointment(
        appointment.id,
        pet.owner.id,
        appointmentMessage(pet.name, appointment.dateTime)
      );
      return;
    }

    if (type === "PREVENTIVE_CONTROL") {
      const control = await preventiveControlRepository.findById(referenceId);
      if (!control) throw new ReminderNotFoundError();
      const pet = await petRepository.findById(control.petId);
      if (!pet) throw new ReminderNotFoundError();
      await notificationRepository.markSentForPreventiveControl(
        control.id,
        pet.owner.id,
        preventiveControlMessage(pet.name, control.type, control.nextDoseOn)
      );
      return;
    }

    throw new ReminderNotFoundError();
  },
};
