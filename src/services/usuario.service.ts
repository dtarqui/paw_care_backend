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

export class UsuarioNoEncontradoError extends Error {
  constructor() {
    super("El usuario solicitado no existe");
    this.name = "UsuarioNoEncontradoError";
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
  async listar(page = 1, pageSize = 20) {
    const paginado = await usuarioRepository.findAllPaginado(page, pageSize);
    return { ...paginado, items: paginado.items.map(aPublico) };
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

  async cambiarEstado(id: number, estado: "ACTIVO" | "INACTIVO"): Promise<UsuarioPublico> {
    if (!(await usuarioRepository.findById(id))) {
      throw new UsuarioNoEncontradoError();
    }
    const actualizado = await usuarioRepository.actualizarEstado(id, estado);

    // Si tiene un Veterinario vinculado, se mantiene sincronizado — desactivar el
    // login también debería sacarlo de los selects de agendar/atender.
    const veterinario = await veterinarioRepository.findByUsuarioId(id);
    if (veterinario) {
      await veterinarioRepository.actualizarEstado(veterinario.id, estado);
    }

    return aPublico(actualizado);
  },

  async cambiarRol(id: number, rol: Rol, datosVeterinario?: { matricula?: string; especialidad?: string }): Promise<UsuarioPublico> {
    const usuario = await usuarioRepository.findById(id);
    if (!usuario) {
      throw new UsuarioNoEncontradoError();
    }

    const veterinarioVinculado = await veterinarioRepository.findByUsuarioId(id);

    if (rol === "VETERINARIO") {
      if (veterinarioVinculado) {
        // Ya tuvo un registro de Veterinario antes (p.ej. se lo cambió de rol y ahora vuelve) — se reactiva
        // en vez de crear uno duplicado (Veterinario.usuarioId es único).
        await veterinarioRepository.actualizarEstado(veterinarioVinculado.id, "ACTIVO");
      } else {
        if (!datosVeterinario?.matricula || !datosVeterinario?.especialidad) {
          throw new DatosDeUsuarioInvalidosError("Matrícula y especialidad son obligatorias para convertir a un usuario en Veterinario");
        }
        await veterinarioRepository.create({
          usuarioId: id,
          matricula: datosVeterinario.matricula,
          especialidad: datosVeterinario.especialidad,
        });
      }
    } else if (veterinarioVinculado) {
      // Deja de ser veterinario: no se borra el registro (Cita/AtencionMedica lo referencian
      // con onDelete Restrict) — se desactiva, igual que cambiarEstado, para sacarlo de los selects.
      await veterinarioRepository.actualizarEstado(veterinarioVinculado.id, "INACTIVO");
    }

    const actualizado = await usuarioRepository.actualizarRol(id, rol);
    return aPublico(actualizado);
  },
};
