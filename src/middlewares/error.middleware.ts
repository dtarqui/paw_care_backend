import { NextFunction, Request, Response } from "express";
import { CredencialesInvalidasError } from "../services/auth.service";
import {
  AgendaAjenaError,
  CitaNoEncontradaError,
  ConflictoDeAgendaError,
  DatosDeCitaInvalidosError,
} from "../services/cita.service";
import { PagoInvalidoError } from "../services/pago.service";
import { DatosDeUsuarioInvalidosError, UsuarioDuplicadoError } from "../services/usuario.service";
import { DatosDeMascotaInvalidosError, MascotaDuplicadaError } from "../services/mascota.service";
import { DatosDeAtencionInvalidosError } from "../services/atencion.service";
import { DatosDeControlInvalidosError } from "../services/controlPreventivo.service";

// Middleware de errores centralizado: cada servicio lanza errores de dominio
// (clases propias) y aquí es el único lugar que los traduce a códigos HTTP.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof CredencialesInvalidasError) {
    return res.status(401).json({ error: err.message });
  }
  if (err instanceof PagoInvalidoError) {
    return res.status(400).json({ error: err.message });
  }
  if (err instanceof CitaNoEncontradaError) {
    return res.status(404).json({ error: err.message });
  }
  if (err instanceof ConflictoDeAgendaError) {
    return res.status(409).json({ error: err.message });
  }
  if (
    err instanceof DatosDeCitaInvalidosError ||
    err instanceof DatosDeUsuarioInvalidosError ||
    err instanceof DatosDeMascotaInvalidosError ||
    err instanceof DatosDeAtencionInvalidosError ||
    err instanceof DatosDeControlInvalidosError
  ) {
    return res.status(400).json({ error: err.message });
  }
  if (err instanceof AgendaAjenaError) {
    return res.status(403).json({ error: err.message });
  }
  if (err instanceof UsuarioDuplicadoError || err instanceof MascotaDuplicadaError) {
    return res.status(409).json({ error: err.message });
  }

  console.error(err);
  return res.status(500).json({ error: "Error interno del servidor" });
}
