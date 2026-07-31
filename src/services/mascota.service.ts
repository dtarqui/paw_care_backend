import { citaRepository } from "../repositories/cita.repository";
import { mascotaRepository } from "../repositories/mascota.repository";
import { propietarioRepository } from "../repositories/propietario.repository";
import { EstadoRegistro, EventoHistorialMascota, Mascota } from "../types";
import { atencionService } from "./atencion.service";
import { controlPreventivoService } from "./controlPreventivo.service";

export class DatosDeMascotaInvalidosError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "DatosDeMascotaInvalidosError";
  }
}

export class MascotaDuplicadaError extends Error {
  constructor() {
    super("Esta mascota ya está registrada para este propietario");
    this.name = "MascotaDuplicadaError";
  }
}

export class MascotaNoEncontradaError extends Error {
  constructor() {
    super("La mascota solicitada no existe");
    this.name = "MascotaNoEncontradaError";
  }
}

interface NuevaMascotaInput {
  nombre: string;
  especie: string;
  raza?: string;
  sexo: "Macho" | "Hembra";
  fechaNacimiento?: string;
  peso?: number;
  propietario: {
    ci: string;
    nombre?: string;
    apellidoPaterno?: string;
    telefono?: string;
  };
}

interface ActualizarMascotaInput {
  nombre?: string;
  especie?: string;
  raza?: string;
  sexo?: "Macho" | "Hembra";
  fechaNacimiento?: string;
  peso?: number;
}

const ETIQUETAS_CAMPO: Record<keyof ActualizarMascotaInput, string> = {
  nombre: "Nombre",
  especie: "Especie",
  raza: "Raza",
  sexo: "Sexo",
  fechaNacimiento: "Fecha de nacimiento",
  peso: "Peso",
};

export const mascotaService = {
  listar(page = 1, pageSize = 20, soloActivas = true) {
    return mascotaRepository.findAllPaginado(page, pageSize, soloActivas);
  },

  buscarPorCiPropietario(ci: string): Promise<Mascota[]> {
    return mascotaRepository.findByPropietarioCi(ci);
  },

  async crear(input: NuevaMascotaInput): Promise<Mascota> {
    if (!input.nombre || !input.especie || !input.sexo || !input.propietario?.ci) {
      throw new DatosDeMascotaInvalidosError("Faltan datos obligatorios de la mascota o el propietario");
    }

    // Dado que existe dueño registrado (mismo CI), se reutiliza en vez de duplicarlo.
    let propietario = await propietarioRepository.findByCi(input.propietario.ci);
    if (!propietario) {
      if (!input.propietario.nombre || !input.propietario.apellidoPaterno) {
        throw new DatosDeMascotaInvalidosError("Faltan datos del propietario nuevo (nombre y apellido paterno)");
      }
      propietario = await propietarioRepository.create({
        ci: input.propietario.ci,
        nombre: input.propietario.nombre,
        apellidoPaterno: input.propietario.apellidoPaterno,
        telefono: input.propietario.telefono,
      });
    }

    if (await mascotaRepository.existeParaPropietario(propietario.id, input.nombre, input.especie)) {
      throw new MascotaDuplicadaError();
    }

    return mascotaRepository.create({
      propietarioId: propietario.id,
      nombre: input.nombre,
      especie: input.especie,
      raza: input.raza,
      sexo: input.sexo,
      fechaNacimiento: input.fechaNacimiento,
      peso: input.peso,
    });
  },

  async detalle(id: number): Promise<Mascota> {
    const mascota = await mascotaRepository.findById(id);
    if (!mascota) throw new MascotaNoEncontradaError();
    return mascota;
  },

  async actualizar(id: number, input: ActualizarMascotaInput, usuarioId?: number): Promise<Mascota> {
    const actual = await mascotaRepository.findById(id);
    if (!actual) throw new MascotaNoEncontradaError();

    if (input.nombre !== undefined && !input.nombre.trim()) {
      throw new DatosDeMascotaInvalidosError("El nombre no puede quedar vacío");
    }
    if (input.especie !== undefined && !input.especie.trim()) {
      throw new DatosDeMascotaInvalidosError("La especie no puede quedar vacía");
    }

    const cambiosLog: { campo: string; valorAnterior?: string; valorNuevo?: string }[] = [];
    for (const campo of Object.keys(ETIQUETAS_CAMPO) as (keyof ActualizarMascotaInput)[]) {
      if (input[campo] === undefined) continue;
      const valorAnterior = String(actual[campo] ?? "");
      const valorNuevo = String(input[campo] ?? "");
      if (valorAnterior !== valorNuevo) {
        cambiosLog.push({ campo: ETIQUETAS_CAMPO[campo], valorAnterior, valorNuevo });
      }
    }

    const actualizada = await mascotaRepository.actualizar(id, input);
    if (cambiosLog.length > 0) {
      await mascotaRepository.registrarCambios(id, cambiosLog, usuarioId);
    }
    return actualizada;
  },

  async cambiarEstado(id: number, estado: EstadoRegistro): Promise<Mascota> {
    if (!(await mascotaRepository.findById(id))) {
      throw new MascotaNoEncontradaError();
    }
    return mascotaRepository.actualizarEstado(id, estado);
  },

  async historial(id: number): Promise<EventoHistorialMascota[]> {
    if (!(await mascotaRepository.findById(id))) {
      throw new MascotaNoEncontradaError();
    }

    const [atenciones, controles, citas, cambios] = await Promise.all([
      atencionService.historialDeMascota(id),
      controlPreventivoService.historialDeMascota(id),
      citaRepository.findByMascotaId(id),
      mascotaRepository.historialCambios(id),
    ]);

    const eventos: EventoHistorialMascota[] = [
      ...atenciones.map((atencion): EventoHistorialMascota => ({ tipo: "ATENCION", fecha: atencion.fecha, atencion })),
      ...controles.map((control): EventoHistorialMascota => ({ tipo: "CONTROL", fecha: control.fechaAplicacion, control })),
      ...citas.map((cita): EventoHistorialMascota => ({ tipo: "CITA", fecha: cita.fechaHora, cita })),
      ...cambios.map((cambio): EventoHistorialMascota => ({ tipo: "CAMBIO", fecha: cambio.fecha, cambio })),
    ];

    return eventos.sort((a, b) => b.fecha.localeCompare(a.fecha));
  },
};
