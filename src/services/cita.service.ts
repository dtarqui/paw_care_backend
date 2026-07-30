import { citaRepository } from "../repositories/cita.repository";
import { mascotaRepository } from "../repositories/mascota.repository";
import { veterinarioRepository } from "../repositories/veterinario.repository";
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

async function generarCodigo(fechaISO: string): Promise<string> {
  const yyyymmdd = fechaISO.replaceAll("-", "");
  const secuencia = (await citaRepository.contarPorCodigoParcial(yyyymmdd)) + 1;
  return `CITA-${yyyymmdd}-${String(secuencia).padStart(3, "0")}`;
}

export const citaService = {
  listar(): Promise<Cita[]> {
    return citaRepository.findAll();
  },

  async disponibilidad(veterinarioId: number, fechaISO: string) {
    const ocupados = new Set(await citaRepository.findOcupadosPorVeterinarioYFecha(veterinarioId, fechaISO));
    return citaRepository.bloquesHorarioBase().map((hora) => ({
      hora,
      disponible: !ocupados.has(hora),
    }));
  },

  async cambiarEstado(id: number, nuevoEstado: EstadoCita): Promise<Cita> {
    const cita = await citaRepository.findById(id);
    if (!cita) throw new CitaNoEncontradaError();
    return citaRepository.actualizarEstado(id, nuevoEstado);
  },

  async crear(input: NuevaCitaInput, solicitante: Solicitante): Promise<Cita> {
    const mascota = await mascotaRepository.findById(input.mascotaId);
    const veterinario = await veterinarioRepository.findById(input.veterinarioId);
    if (!mascota || !veterinario || !input.fecha || !input.hora || !input.tipoConsulta) {
      throw new DatosDeCitaInvalidosError("Faltan datos obligatorios para agendar la cita");
    }

    // Un veterinario solo gestiona su propia agenda; Administrador y Recepcionista
    // pueden agendar para cualquier veterinario. Se valida acá (no solo en el frontend)
    // porque el frontend no es una barrera de seguridad real.
    if (solicitante.rol === "VETERINARIO") {
      const propioVeterinario = await veterinarioRepository.findByUsuarioId(solicitante.id);
      if (!propioVeterinario || propioVeterinario.id !== input.veterinarioId) {
        throw new AgendaAjenaError();
      }
    }

    const ocupados = await citaRepository.findOcupadosPorVeterinarioYFecha(input.veterinarioId, input.fecha);
    if (ocupados.includes(input.hora)) {
      throw new ConflictoDeAgendaError();
    }

    return citaRepository.create({
      codigo: await generarCodigo(input.fecha),
      fechaHora: `${input.fecha}T${input.hora}`,
      duracionMin: input.duracionMin ?? 30,
      mascotaId: mascota.id,
      veterinarioId: veterinario.id,
      tipoConsulta: input.tipoConsulta,
      motivo: input.motivo,
    });
  },

  async reprogramar(id: number, input: { fecha: string; hora: string }, solicitante: Solicitante): Promise<Cita> {
    const cita = await citaRepository.findById(id);
    if (!cita) throw new CitaNoEncontradaError();
    if (cita.estado === "CANCELADA") {
      throw new DatosDeCitaInvalidosError("No se puede reprogramar una cita cancelada");
    }
    if (!input.fecha || !input.hora) {
      throw new DatosDeCitaInvalidosError("Fecha y hora son obligatorias para reprogramar");
    }

    if (solicitante.rol === "VETERINARIO") {
      const propioVeterinario = await veterinarioRepository.findByUsuarioId(solicitante.id);
      if (!propioVeterinario || propioVeterinario.id !== cita.veterinario.id) {
        throw new AgendaAjenaError();
      }
    }

    const ocupados = await citaRepository.findOcupadosPorVeterinarioYFecha(cita.veterinario.id, input.fecha, cita.id);
    if (ocupados.includes(input.hora)) {
      throw new ConflictoDeAgendaError();
    }

    return citaRepository.reprogramar(id, `${input.fecha}T${input.hora}`);
  },
};
