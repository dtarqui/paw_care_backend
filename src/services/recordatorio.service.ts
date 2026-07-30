import { citaRepository } from "../repositories/cita.repository";
import { controlPreventivoRepository } from "../repositories/controlPreventivo.repository";
import { mascotaRepository } from "../repositories/mascota.repository";
import { notificacionRepository } from "../repositories/notificacion.repository";
import { RecordatorioPendiente } from "../types";
import { addDays, ahoraLiteral, sumarHoras, todayISO } from "../utils/date";

export class RecordatorioNoEncontradoError extends Error {
  constructor() {
    super("El recordatorio solicitado no existe");
    this.name = "RecordatorioNoEncontradoError";
  }
}

function mensajeCita(mascotaNombre: string, fechaHora: string): string {
  const [fecha, hora] = fechaHora.split("T");
  const [yyyy, mm, dd] = fecha.split("-");
  return `Hola, te recordamos la cita de ${mascotaNombre} el ${dd}/${mm}/${yyyy} a las ${hora.slice(0, 5)} en PawCare.`;
}

function mensajeControl(mascotaNombre: string, tipo: string, proximaDosis: string): string {
  const [yyyy, mm, dd] = proximaDosis.split("-");
  const tipoTexto = tipo === "VACUNA" ? "la vacuna" : "la desparasitación";
  return `Hola, te recordamos que ${tipoTexto} de ${mascotaNombre} vence el ${dd}/${mm}/${yyyy}. Agenda su control en PawCare.`;
}

export const recordatorioService = {
  // HU10/HU11 Track A: recordatorios de citas en las próximas 24h + controles
  // preventivos que vencen en 7 días, excluyendo los ya marcados como enviados.
  async pendientes(): Promise<RecordatorioPendiente[]> {
    const ahora = ahoraLiteral();
    const limite24h = sumarHoras(ahora, 24);
    const resultado: RecordatorioPendiente[] = [];

    for (const cita of await citaRepository.findAll()) {
      if (cita.estado !== "CONFIRMADA") continue;
      const marca = cita.fechaHora.slice(0, 16);
      if (marca < ahora || marca > limite24h) continue;
      if (await notificacionRepository.yaEnviadoParaCita(cita.id)) continue;

      const mascota = await mascotaRepository.findById(cita.mascota.id);
      if (!mascota) continue;

      resultado.push({
        id: `CITA-${cita.id}`,
        tipo: "CITA",
        propietario: {
          telefono: mascota.propietario.telefono,
          nombre: mascota.propietario.nombre,
          apellidoPaterno: mascota.propietario.apellidoPaterno,
        },
        mensaje: mensajeCita(mascota.nombre, cita.fechaHora),
        referencia: `Cita de ${mascota.nombre} — ${cita.fechaHora.slice(0, 10)} ${cita.fechaHora.slice(11, 16)}`,
      });
    }

    const limiteControl = addDays(todayISO(), 7);
    for (const control of await controlPreventivoRepository.findAll()) {
      if (!control.proximaDosis) continue;
      if (control.proximaDosis < todayISO() || control.proximaDosis > limiteControl) continue;
      if (await notificacionRepository.yaEnviadoParaControl(control.id)) continue;

      const mascota = await mascotaRepository.findById(control.mascotaId);
      if (!mascota) continue;

      resultado.push({
        id: `CONTROL-${control.id}`,
        tipo: "CONTROL_PREVENTIVO",
        propietario: {
          telefono: mascota.propietario.telefono,
          nombre: mascota.propietario.nombre,
          apellidoPaterno: mascota.propietario.apellidoPaterno,
        },
        mensaje: mensajeControl(mascota.nombre, control.tipo, control.proximaDosis),
        referencia: `${control.tipo === "VACUNA" ? "Vacuna" : "Desparasitación"} de ${mascota.nombre} — vence ${control.proximaDosis}`,
      });
    }

    return resultado;
  },

  async marcarEnviado(id: string): Promise<void> {
    const [tipo, referenciaIdRaw] = id.split("-");
    const referenciaId = Number(referenciaIdRaw);

    if (tipo === "CITA") {
      const cita = await citaRepository.findById(referenciaId);
      if (!cita) throw new RecordatorioNoEncontradoError();
      const mascota = await mascotaRepository.findById(cita.mascota.id);
      if (!mascota) throw new RecordatorioNoEncontradoError();
      await notificacionRepository.marcarEnviadoCita(cita.id, mascota.propietario.id, mensajeCita(mascota.nombre, cita.fechaHora));
      return;
    }

    if (tipo === "CONTROL") {
      const control = await controlPreventivoRepository.findById(referenciaId);
      if (!control) throw new RecordatorioNoEncontradoError();
      const mascota = await mascotaRepository.findById(control.mascotaId);
      if (!mascota) throw new RecordatorioNoEncontradoError();
      await notificacionRepository.marcarEnviadoControl(
        control.id,
        mascota.propietario.id,
        mensajeControl(mascota.nombre, control.tipo, control.proximaDosis)
      );
      return;
    }

    throw new RecordatorioNoEncontradoError();
  },
};
