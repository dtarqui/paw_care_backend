import { NextFunction, Request, Response } from "express";
import { EmailNoConfiguradoError } from "../lib/mailer";
import {
  CredencialesInvalidasError,
  DatosDeRecuperacionInvalidosError,
  TokenDeRecuperacionInvalidoError,
} from "../services/auth.service";
import {
  AgendaAjenaError,
  CitaNoEncontradaError,
  ConflictoDeAgendaError,
  DatosDeCitaInvalidosError,
} from "../services/cita.service";
import { InvitacionInvalidaError } from "../services/invitacion.service";
import { PagoInvalidoError } from "../services/pago.service";
import { AtencionYaPagadaError, CobroQrNoEncontradoError } from "../services/pagoQr.service";
import { ProveedorPagoQrNoConfiguradoError } from "../lib/pagoQr";
import {
  DatosDeUsuarioInvalidosError,
  PasswordActualIncorrectaError,
  UsuarioDuplicadoError,
  UsuarioNoEncontradoError,
} from "../services/usuario.service";
import { DatosDeMascotaInvalidosError, MascotaDuplicadaError, MascotaNoEncontradaError } from "../services/mascota.service";
import { DatosDeAtencionInvalidosError } from "../services/atencion.service";
import { DatosDeControlInvalidosError } from "../services/controlPreventivo.service";
import {
  DatosDeMedicamentoInvalidosError,
  MedicamentoConMovimientosError,
  MedicamentoDuplicadoError,
  MedicamentoNoEncontradoError,
  StockInsuficienteError,
} from "../services/medicamento.service";
import { DatosDeImportacionInvalidosError } from "../services/importacion.service";
import { RecordatorioNoEncontradoError } from "../services/recordatorio.service";
import { DatosDePropietarioInvalidosError, PropietarioNoEncontradoError } from "../services/propietario.service";
import { DatosDeHorarioInvalidosError } from "../services/horario.service";

// Middleware de errores centralizado: cada servicio lanza errores de dominio
// (clases propias) y aquí es el único lugar que los traduce a códigos HTTP.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof CredencialesInvalidasError || err instanceof PasswordActualIncorrectaError) {
    return res.status(401).json({ error: err.message });
  }
  if (err instanceof PagoInvalidoError || err instanceof AtencionYaPagadaError) {
    return res.status(400).json({ error: err.message });
  }
  if (
    err instanceof CitaNoEncontradaError ||
    err instanceof RecordatorioNoEncontradoError ||
    err instanceof MascotaNoEncontradaError ||
    err instanceof UsuarioNoEncontradoError ||
    err instanceof PropietarioNoEncontradoError ||
    err instanceof MedicamentoNoEncontradoError ||
    err instanceof CobroQrNoEncontradoError
  ) {
    return res.status(404).json({ error: err.message });
  }
  if (err instanceof ConflictoDeAgendaError || err instanceof MedicamentoConMovimientosError) {
    return res.status(409).json({ error: err.message });
  }
  if (
    err instanceof DatosDeCitaInvalidosError ||
    err instanceof DatosDeUsuarioInvalidosError ||
    err instanceof DatosDeMascotaInvalidosError ||
    err instanceof DatosDeAtencionInvalidosError ||
    err instanceof DatosDeControlInvalidosError ||
    err instanceof DatosDeMedicamentoInvalidosError ||
    err instanceof DatosDeImportacionInvalidosError ||
    err instanceof DatosDePropietarioInvalidosError ||
    err instanceof DatosDeHorarioInvalidosError ||
    err instanceof DatosDeRecuperacionInvalidosError ||
    err instanceof TokenDeRecuperacionInvalidoError ||
    err instanceof InvitacionInvalidaError
  ) {
    return res.status(400).json({ error: err.message });
  }
  if (err instanceof AgendaAjenaError) {
    return res.status(403).json({ error: err.message });
  }
  if (
    err instanceof UsuarioDuplicadoError ||
    err instanceof MascotaDuplicadaError ||
    err instanceof StockInsuficienteError ||
    err instanceof MedicamentoDuplicadoError
  ) {
    return res.status(409).json({ error: err.message });
  }
  if (err instanceof EmailNoConfiguradoError || err instanceof ProveedorPagoQrNoConfiguradoError) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }

  console.error(err);
  return res.status(500).json({ error: "Error interno del servidor" });
}
