import { HorarioRegistro, horarioRepository } from "../repositories/horario.repository";
import { veterinarioRepository } from "../repositories/veterinario.repository";
import { AgendaAjenaError } from "./cita.service";
import { Rol } from "../types";

export class DatosDeHorarioInvalidosError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "DatosDeHorarioInvalidosError";
  }
}

interface Solicitante {
  id: number;
  rol: Rol;
}

interface BloqueHorarioInput {
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
}

const DURACION_BLOQUE_MIN = 30;

async function verificarPermiso(veterinarioId: number, solicitante: Solicitante) {
  if (solicitante.rol !== "VETERINARIO") return; // Administrador puede editar cualquiera
  const propioVeterinario = await veterinarioRepository.findByUsuarioId(solicitante.id);
  if (!propioVeterinario || propioVeterinario.id !== veterinarioId) {
    throw new AgendaAjenaError();
  }
}

/** Genera los bloques reservables de `DURACION_BLOQUE_MIN` dentro de cada rango
 * horaInicio–horaFin (un veterinario puede tener más de un rango por día, ej.
 * mañana y tarde) — el último bloque generado es el que termina exactamente en
 * horaFin, nunca uno que se pase. */
function generarBloques(rangos: { horaInicio: string; horaFin: string }[]): string[] {
  const bloques: string[] = [];
  for (const rango of rangos) {
    let [hh, mi] = rango.horaInicio.split(":").map(Number);
    const [hhFin, miFin] = rango.horaFin.split(":").map(Number);
    while (hh * 60 + mi + DURACION_BLOQUE_MIN <= hhFin * 60 + miFin) {
      bloques.push(`${String(hh).padStart(2, "0")}:${String(mi).padStart(2, "0")}`);
      mi += DURACION_BLOQUE_MIN;
      if (mi >= 60) {
        mi -= 60;
        hh += 1;
      }
    }
  }
  return bloques;
}

export const horarioService = {
  async listar(veterinarioId: number): Promise<HorarioRegistro[]> {
    if (!(await veterinarioRepository.findById(veterinarioId))) {
      throw new DatosDeHorarioInvalidosError("El veterinario no existe");
    }
    return horarioRepository.findByVeterinarioId(veterinarioId);
  },

  async actualizar(veterinarioId: number, horarios: BloqueHorarioInput[], solicitante: Solicitante): Promise<HorarioRegistro[]> {
    if (!(await veterinarioRepository.findById(veterinarioId))) {
      throw new DatosDeHorarioInvalidosError("El veterinario no existe");
    }
    await verificarPermiso(veterinarioId, solicitante);

    for (const h of horarios) {
      if (h.diaSemana < 0 || h.diaSemana > 6) {
        throw new DatosDeHorarioInvalidosError("diaSemana debe estar entre 0 (domingo) y 6 (sábado)");
      }
      if (!/^\d{2}:\d{2}$/.test(h.horaInicio) || !/^\d{2}:\d{2}$/.test(h.horaFin)) {
        throw new DatosDeHorarioInvalidosError("Formato de hora inválido (esperado HH:mm)");
      }
      if (h.horaInicio >= h.horaFin) {
        throw new DatosDeHorarioInvalidosError("La hora de inicio debe ser anterior a la hora de fin");
      }
    }

    return horarioRepository.reemplazarTodos(veterinarioId, horarios);
  },

  /** Usado por citaService.disponibilidad — bloques reservables de un veterinario
   * en un día de la semana dado, antes de restar los ya ocupados. */
  async bloquesBase(veterinarioId: number, diaSemana: number): Promise<string[]> {
    const rangos = await horarioRepository.findByVeterinarioIdYDia(veterinarioId, diaSemana);
    return generarBloques(rangos);
  },
};
