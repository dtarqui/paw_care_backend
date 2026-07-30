import { citaRepository } from "../repositories/cita.repository";
import { controlPreventivoRepository } from "../repositories/controlPreventivo.repository";
import { mascotaRepository } from "../repositories/mascota.repository";
import { notificacionRepository } from "../repositories/notificacion.repository";
import { RecordatorioPendiente } from "../types";
import { addDays, ahoraLiteral, sumarHoras, todayISO } from "../utils/date";

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
  pendientes(): RecordatorioPendiente[] {
    const ahora = ahoraLiteral();
    const limite24h = sumarHoras(ahora, 24);
    const resultado: RecordatorioPendiente[] = [];

    for (const cita of citaRepository.findAll()) {
      if (cita.estado !== "CONFIRMADA") continue;
      const marca = cita.fechaHora.slice(0, 16);
      if (marca < ahora || marca > limite24h) continue;

      const id = `CITA-${cita.id}`;
      if (notificacionRepository.yaEnviado(id)) continue;

      const mascota = mascotaRepository.findById(cita.mascota.id);
      if (!mascota) continue;

      resultado.push({
        id,
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
    for (const control of controlPreventivoRepository.findAll()) {
      if (!control.proximaDosis) continue;
      if (control.proximaDosis < todayISO() || control.proximaDosis > limiteControl) continue;

      const id = `CONTROL-${control.id}`;
      if (notificacionRepository.yaEnviado(id)) continue;

      const mascota = mascotaRepository.findById(control.mascotaId);
      if (!mascota) continue;

      resultado.push({
        id,
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

  marcarEnviado(id: string): void {
    notificacionRepository.marcarEnviado(id);
  },
};
