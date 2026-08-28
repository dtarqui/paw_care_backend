import { NextFunction, Request, Response } from "express";
import { EmailNotConfiguredError } from "../lib/mailer";
import { QrPaymentProviderNotConfiguredError } from "../lib/qrPayment";
import {
  AppointmentNotFoundError,
  InvalidAppointmentDataError,
  ScheduleConflictError,
} from "../services/appointment.service";
import {
  InvalidCredentialsError,
  InvalidResetDataError,
  InvalidResetTokenError,
} from "../services/auth.service";
import { InvalidImportDataError } from "../services/import.service";
import { InvalidVisitDataError } from "../services/medicalVisit.service";
import {
  DuplicateMedicationError,
  InsufficientStockError,
  InvalidMedicationDataError,
  MedicationHasMovesError,
  MedicationNotFoundError,
} from "../services/medication.service";
import { InvalidOwnerDataError, OwnerNotFoundError } from "../services/owner.service";
import { InvalidPaymentError, ReceiptNotFoundError } from "../services/payment.service";
import { DuplicatePetError, InvalidPetDataError, PetNotFoundError } from "../services/pet.service";
import { InvalidPreventiveControlDataError } from "../services/preventiveControl.service";
import { QrChargeNotFoundError, VisitAlreadyPaidError } from "../services/qrPayment.service";
import { ReminderNotFoundError } from "../services/reminder.service";
import { ForeignScheduleError } from "../services/schedule.errors";
import { InvalidScheduleDataError } from "../services/schedule.service";
import {
  DuplicateUserError,
  InvalidUserDataError,
  UserNotFoundError,
  WrongCurrentPasswordError,
} from "../services/user.service";
import { InvalidInvitationError } from "../services/vetInvitation.service";

// Middleware de errores centralizado: cada servicio lanza errores de dominio
// (clases propias) y aquí es el único lugar que los traduce a códigos HTTP.
//
// Cada respuesta lleva además `code` con el nombre de la clase de error. El
// frontend lo usa para mostrar el mensaje en el idioma elegido (`errors.codes.*`),
// y cae al `error` en español que viaja al lado cuando no tiene esa traducción —
// las clases con mensaje variable (los `Invalid*DataError`, que dicen qué campo
// falta) se ven en español, y está bien: siguen siendo legibles.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof InvalidCredentialsError || err instanceof WrongCurrentPasswordError) {
    return res.status(401).json({ error: err.message, code: err.name });
  }
  if (err instanceof InvalidPaymentError || err instanceof VisitAlreadyPaidError) {
    return res.status(400).json({ error: err.message, code: err.name });
  }
  if (
    err instanceof AppointmentNotFoundError ||
    err instanceof ReminderNotFoundError ||
    err instanceof PetNotFoundError ||
    err instanceof UserNotFoundError ||
    err instanceof OwnerNotFoundError ||
    err instanceof MedicationNotFoundError ||
    err instanceof ReceiptNotFoundError ||
    err instanceof QrChargeNotFoundError
  ) {
    return res.status(404).json({ error: err.message, code: err.name });
  }
  if (err instanceof ScheduleConflictError || err instanceof MedicationHasMovesError) {
    return res.status(409).json({ error: err.message, code: err.name });
  }
  if (
    err instanceof InvalidAppointmentDataError ||
    err instanceof InvalidUserDataError ||
    err instanceof InvalidPetDataError ||
    err instanceof InvalidVisitDataError ||
    err instanceof InvalidPreventiveControlDataError ||
    err instanceof InvalidMedicationDataError ||
    err instanceof InvalidImportDataError ||
    err instanceof InvalidOwnerDataError ||
    err instanceof InvalidScheduleDataError ||
    err instanceof InvalidResetDataError ||
    err instanceof InvalidResetTokenError ||
    err instanceof InvalidInvitationError
  ) {
    return res.status(400).json({ error: err.message, code: err.name });
  }
  if (err instanceof ForeignScheduleError) {
    return res.status(403).json({ error: err.message, code: err.name });
  }
  if (
    err instanceof DuplicateUserError ||
    err instanceof DuplicatePetError ||
    err instanceof InsufficientStockError ||
    err instanceof DuplicateMedicationError
  ) {
    return res.status(409).json({ error: err.message, code: err.name });
  }
  if (err instanceof EmailNotConfiguredError || err instanceof QrPaymentProviderNotConfiguredError) {
    console.error(err);
    return res.status(500).json({ error: err.message, code: err.name });
  }

  console.error(err);
  return res.status(500).json({ error: "Error interno del servidor", code: "InternalServerError" });
}
