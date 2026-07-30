import { citas } from "../data/citas.data";
import { mascotas } from "../data/mascotas.data";
import { veterinarios } from "../data/veterinarios.data";
import { citaRepository } from "../repositories/cita.repository";
import { Cita, EstadoCita, Rol } from "../types";

export class CitaNoEncontradaError extends Error {
  constructor() {
    super("La cita solicitada no existe");
    this.name = "CitaNoEncontradaError";
  }
}

export class ConflictoDeAgendaError extends Error {
  constructor() {
    super("El veterinario ya tiene una cita en ese horario");
    this.name = "ConflictoDeAgendaError";
  }
}

export class DatosDeCitaInvalidosError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "DatosDeCitaInvalidosError";
  }
}

export class AgendaAjenaError extends Error {
  constructor() {
    super("Como veterinario solo puedes agendar citas para ti mismo");
    this.name = "AgendaAjenaError";
  }
}

interface NuevaCitaInput {
  mascotaId: number;
  veterinarioId: number;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:mm
  tipoConsulta: string;
  motivo: string;
  duracionMin?: number;
}

interface Solicitante {
  id: number;
  rol: Rol;
}

function generarCodigo(fechaISO: string): string {
  const yyyymmdd = fechaISO.replaceAll("-", "");
  const secuencia = citas.filter((c) => c.codigo.includes(yyyymmdd)).length + 1;
  return `CITA-${yyyymmdd}-${String(secuencia).padStart(3, "0")}`;
}

export const citaService = {
  listar() {
    return citaRepository.findAll();
  },

  disponibilidad(veterinarioId: number, fechaISO: string) {
    const ocupados = new Set(citaRepository.findOcupadosPorVeterinarioYFecha(veterinarioId, fechaISO));
    return citaRepository.bloquesHorarioBase().map((hora) => ({
      hora,
      disponible: !ocupados.has(hora),
    }));
  },

  cambiarEstado(id: number, nuevoEstado: EstadoCita) {
    const cita = citas.find((c) => c.id === id);
    if (!cita) throw new CitaNoEncontradaError();
    cita.estado = nuevoEstado;
    return cita;
  },

  crear(input: NuevaCitaInput, solicitante: Solicitante): Cita {
    const mascota = mascotas.find((m) => m.id === input.mascotaId);
    const veterinario = veterinarios.find((v) => v.id === input.veterinarioId);
    if (!mascota || !veterinario || !input.fecha || !input.hora || !input.tipoConsulta) {
      throw new DatosDeCitaInvalidosError("Faltan datos obligatorios para agendar la cita");
    }

    // Un veterinario solo gestiona su propia agenda; Administrador y Recepcionista
    // pueden agendar para cualquier veterinario. Se valida acá (no solo en el frontend)
    // porque el frontend no es una barrera de seguridad real.
    if (solicitante.rol === "VETERINARIO") {
      const propioVeterinario = veterinarios.find((v) => v.usuarioId === solicitante.id);
      if (!propioVeterinario || propioVeterinario.id !== input.veterinarioId) {
        throw new AgendaAjenaError();
      }
    }

    const ocupados = citaRepository.findOcupadosPorVeterinarioYFecha(input.veterinarioId, input.fecha);
    if (ocupados.includes(input.hora)) {
      throw new ConflictoDeAgendaError();
    }

    const nuevaCita: Cita = {
      id: Math.max(0, ...citas.map((c) => c.id)) + 1,
      codigo: generarCodigo(input.fecha),
      fechaHora: `${input.fecha}T${input.hora}:00.000Z`,
      duracionMin: input.duracionMin ?? 30,
      mascota: { id: mascota.id, nombre: mascota.nombre, especie: mascota.especie },
      veterinario: { id: veterinario.id, nombre: veterinario.nombre, apellidoPaterno: veterinario.apellidoPaterno },
      tipoConsulta: input.tipoConsulta,
      motivo: input.motivo,
      estado: "CONFIRMADA",
    };
    citas.push(nuevaCita);
    return nuevaCita;
  },

  reprogramar(id: number, input: { fecha: string; hora: string }, solicitante: Solicitante): Cita {
    const cita = citas.find((c) => c.id === id);
    if (!cita) throw new CitaNoEncontradaError();
    if (cita.estado === "CANCELADA") {
      throw new DatosDeCitaInvalidosError("No se puede reprogramar una cita cancelada");
    }
    if (!input.fecha || !input.hora) {
      throw new DatosDeCitaInvalidosError("Fecha y hora son obligatorias para reprogramar");
    }

    if (solicitante.rol === "VETERINARIO") {
      const propioVeterinario = veterinarios.find((v) => v.usuarioId === solicitante.id);
      if (!propioVeterinario || propioVeterinario.id !== cita.veterinario.id) {
        throw new AgendaAjenaError();
      }
    }

    const ocupados = citaRepository.findOcupadosPorVeterinarioYFecha(cita.veterinario.id, input.fecha, cita.id);
    if (ocupados.includes(input.hora)) {
      throw new ConflictoDeAgendaError();
    }

    cita.fechaHora = `${input.fecha}T${input.hora}:00.000Z`;
    return cita;
  },
};
