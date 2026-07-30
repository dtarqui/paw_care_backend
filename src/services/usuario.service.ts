import { usuarioRepository } from "../repositories/usuario.repository";
import { veterinarioRepository } from "../repositories/veterinario.repository";
import { Rol, UsuarioPublico } from "../types";

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

function aPublico(usuario: { password: string } & UsuarioPublico): UsuarioPublico {
  const { password: _password, ...publico } = usuario;
  return publico;
}

export const usuarioService = {
  async listar(): Promise<UsuarioPublico[]> {
    const usuarios = await usuarioRepository.findAll();
    return usuarios.map(aPublico);
  },

  async crear(input: NuevoUsuarioInput): Promise<UsuarioPublico> {
    if (!input.nombre || !input.apellidoPaterno || !input.ci || !input.username || !input.rol || !input.password) {
      throw new DatosDeUsuarioInvalidosError("Faltan campos obligatorios");
    }
    if (await usuarioRepository.findByUsername(input.username)) {
      throw new UsuarioDuplicadoError("Ese nombre de usuario ya está en uso");
    }
    if (await usuarioRepository.findByCi(input.ci)) {
      throw new UsuarioDuplicadoError("Ya existe un usuario registrado con ese CI");
    }
    if (input.rol === "VETERINARIO" && (!input.matricula || !input.especialidad)) {
      throw new DatosDeUsuarioInvalidosError("Matrícula y especialidad son obligatorias para un Veterinario");
    }

    const nuevoUsuario = await usuarioRepository.create({
      username: input.username,
      password: input.password,
      nombre: input.nombre,
      apellidoPaterno: input.apellidoPaterno,
      apellidoMaterno: input.apellidoMaterno,
      ci: input.ci,
      telefono: input.telefono,
      rol: input.rol,
    });

    // Espejo del modelo real: Veterinario.usuarioId 1-a-1 con Usuario (database/MODELO_DATOS.md).
    if (input.rol === "VETERINARIO") {
      await veterinarioRepository.create({
        usuarioId: nuevoUsuario.id,
        matricula: input.matricula!,
        especialidad: input.especialidad!,
      });
    }

    return aPublico(nuevoUsuario);
  },
};
