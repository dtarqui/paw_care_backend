import { propietarioRepository } from "../repositories/propietario.repository";
import { PropietarioConMascotas } from "../types";

export class PropietarioNoEncontradoError extends Error {
  constructor() {
    super("El propietario solicitado no existe");
    this.name = "PropietarioNoEncontradoError";
  }
}

export class DatosDePropietarioInvalidosError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "DatosDePropietarioInvalidosError";
  }
}

interface ActualizarPropietarioInput {
  nombre?: string;
  apellidoPaterno?: string;
  telefono?: string;
  direccion?: string;
}

export const propietarioService = {
  buscarPorCi(ci: string) {
    return propietarioRepository.findByCi(ci);
  },

  listar(): Promise<PropietarioConMascotas[]> {
    return propietarioRepository.findAll();
  },

  async actualizar(id: number, input: ActualizarPropietarioInput) {
    if (!(await propietarioRepository.findById(id))) {
      throw new PropietarioNoEncontradoError();
    }
    if (input.nombre !== undefined && !input.nombre.trim()) {
      throw new DatosDePropietarioInvalidosError("El nombre no puede quedar vacío");
    }
    if (input.apellidoPaterno !== undefined && !input.apellidoPaterno.trim()) {
      throw new DatosDePropietarioInvalidosError("El apellido paterno no puede quedar vacío");
    }

    // El CI es la clave usada para buscar propietarios en toda la app (HU2/HU3) —
    // no se expone como editable a propósito, para no romper esas búsquedas.
    return propietarioRepository.actualizar(id, {
      nombre: input.nombre,
      apellidoPaterno: input.apellidoPaterno,
      telefono: input.telefono,
      direccion: input.direccion,
    });
  },
};
