import { usuarioRepository } from "../repositories/usuario.repository";
import { veterinarioRepository } from "../repositories/veterinario.repository";
import { Rol, Usuario, UsuarioPublico } from "../types";

export class DatosDeUsuarioInvalidosError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "DatosDeUsuarioInvalidosError";
  }
}

export class UsuarioDuplicadoError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "UsuarioDuplicadoError";
  }
}

interface NuevoUsuarioInput {
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno?: string;
  ci: string;
  username: string;
  telefono?: string;
  rol: Rol;
  password: string;
  matricula?: string; // obligatorio si rol = VETERINARIO
  especialidad?: string; // obligatorio si rol = VETERINARIO
}

function aPublico(usuario: Usuario): UsuarioPublico {
  const { password: _password, ...publico } = usuario;
  return publico;
}

export const usuarioService = {
  listar(): UsuarioPublico[] {
    return usuarioRepository.findAll().map(aPublico);
  },

  crear(input: NuevoUsuarioInput): UsuarioPublico {
    if (!input.nombre || !input.apellidoPaterno || !input.ci || !input.username || !input.rol || !input.password) {
      throw new DatosDeUsuarioInvalidosError("Faltan campos obligatorios");
    }
    if (usuarioRepository.findByUsername(input.username)) {
      throw new UsuarioDuplicadoError("Ese nombre de usuario ya está en uso");
    }
    if (usuarioRepository.findByCi(input.ci)) {
      throw new UsuarioDuplicadoError("Ya existe un usuario registrado con ese CI");
    }
    if (input.rol === "VETERINARIO" && (!input.matricula || !input.especialidad)) {
      throw new DatosDeUsuarioInvalidosError("Matrícula y especialidad son obligatorias para un Veterinario");
    }

    const nuevoUsuario: Usuario = {
      id: usuarioRepository.nextId(),
      username: input.username,
      password: input.password,
      nombre: input.nombre,
      apellidoPaterno: input.apellidoPaterno,
      apellidoMaterno: input.apellidoMaterno,
      ci: input.ci,
      telefono: input.telefono,
      rol: input.rol,
      estado: "ACTIVO",
    };
    usuarioRepository.create(nuevoUsuario);

    // Espejo del modelo real: Veterinario.usuarioId 1-a-1 con Usuario (database/MODELO_DATOS.md).
    if (input.rol === "VETERINARIO") {
      veterinarioRepository.create({
        id: veterinarioRepository.nextId(),
        usuarioId: nuevoUsuario.id,
        nombre: nuevoUsuario.nombre,
        apellidoPaterno: nuevoUsuario.apellidoPaterno,
        matricula: input.matricula!,
        especialidad: input.especialidad!,
      });
    }

    return aPublico(nuevoUsuario);
  },
};
