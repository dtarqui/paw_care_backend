import { MascotaRegistro } from "../data/mascotas.data";
import { mascotaRepository } from "../repositories/mascota.repository";
import { propietarioRepository } from "../repositories/propietario.repository";
import { Mascota } from "../types";

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

export const mascotaService = {
  listar(): Mascota[] {
    return mascotaRepository.findAll();
  },

  buscarPorCiPropietario(ci: string): Mascota[] {
    return mascotaRepository.findByPropietarioCi(ci);
  },

  crear(input: NuevaMascotaInput): Mascota {
    if (!input.nombre || !input.especie || !input.sexo || !input.propietario?.ci) {
      throw new DatosDeMascotaInvalidosError("Faltan datos obligatorios de la mascota o el propietario");
    }

    // Dado que existe dueño registrado (mismo CI), se reutiliza en vez de duplicarlo.
    let propietario = propietarioRepository.findByCi(input.propietario.ci);
    if (!propietario) {
      if (!input.propietario.nombre || !input.propietario.apellidoPaterno) {
        throw new DatosDeMascotaInvalidosError("Faltan datos del propietario nuevo (nombre y apellido paterno)");
      }
      propietario = propietarioRepository.create({
        id: propietarioRepository.nextId(),
        ci: input.propietario.ci,
        nombre: input.propietario.nombre,
        apellidoPaterno: input.propietario.apellidoPaterno,
        telefono: input.propietario.telefono ?? "",
      });
    }

    if (mascotaRepository.existeParaPropietario(propietario.id, input.nombre, input.especie)) {
      throw new MascotaDuplicadaError();
    }

    const registro: MascotaRegistro = {
      id: mascotaRepository.nextId(),
      propietarioId: propietario.id,
      nombre: input.nombre,
      especie: input.especie,
      raza: input.raza ?? "",
      sexo: input.sexo,
      fechaNacimiento: input.fechaNacimiento ?? "",
      peso: input.peso ?? 0,
    };
    return mascotaRepository.create(registro);
  },
};
