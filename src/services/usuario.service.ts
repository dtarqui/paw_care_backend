import bcrypt from "bcryptjs";
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

export class PasswordActualIncorrectaError extends Error {
  constructor() {
    super("La contraseña actual no es correcta");
    this.name = "PasswordActualIncorrectaError";
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

  /** Preregistro público (sin auth) — un veterinario nuevo pide su cuenta, queda
   * INACTIVO hasta que un Administrador la apruebe (mismo botón "Activar" que ya
   * existe en Gestión de Usuarios). `autorregistrado` lo distingue de una cuenta
   * que un Admin desactivó a propósito, para que la UI pueda mostrar "Pendiente
   * de aprobación" en vez de simplemente "Inactivo". */
  async preregistrarVeterinario(input: {
    nombre: string;
    apellidoPaterno: string;
    apellidoMaterno?: string;
    ci: string;
    username: string;
    telefono?: string;
    password: string;
    matricula: string;
    especialidad: string;
  }): Promise<UsuarioPublico> {
    if (
      !input.nombre ||
      !input.apellidoPaterno ||
      !input.ci ||
      !input.username ||
      !input.password ||
      !input.matricula ||
      !input.especialidad
    ) {
      throw new DatosDeUsuarioInvalidosError("Faltan campos obligatorios");
    }
    if (input.password.length < 6) {
      throw new DatosDeUsuarioInvalidosError("La contraseña debe tener al menos 6 caracteres");
    }
    if (await usuarioRepository.findByUsername(input.username)) {
      throw new UsuarioDuplicadoError("Ese nombre de usuario ya está en uso");
    }
    if (await usuarioRepository.findByCi(input.ci)) {
      throw new UsuarioDuplicadoError("Ya existe un usuario registrado con ese CI");
    }

    const nuevoUsuario = await usuarioRepository.create({
      username: input.username,
      password: input.password,
      nombre: input.nombre,
      apellidoPaterno: input.apellidoPaterno,
      apellidoMaterno: input.apellidoMaterno,
      ci: input.ci,
      telefono: input.telefono,
      rol: "VETERINARIO",
      estado: "INACTIVO",
      autorregistrado: true,
    });

    await veterinarioRepository.create({
      usuarioId: nuevoUsuario.id,
      matricula: input.matricula,
      especialidad: input.especialidad,
      estado: "INACTIVO",
    });

    return aPublico(nuevoUsuario);
  },

  async cambiarPassword(id: number, passwordActual: string, passwordNuevo: string): Promise<void> {
    const usuario = await usuarioRepository.findById(id);
    if (!usuario) {
      throw new UsuarioNoEncontradoError();
    }
    if (!(await bcrypt.compare(passwordActual, usuario.password))) {
      throw new PasswordActualIncorrectaError();
    }
    if (passwordNuevo.length < 6) {
      throw new DatosDeUsuarioInvalidosError("La contraseña nueva debe tener al menos 6 caracteres");
    }
    await usuarioRepository.actualizarPassword(id, passwordNuevo);
  },

  /** Restablecimiento por un Administrador — para cuando un usuario perdió su
   * contraseña y no puede iniciar sesión para cambiarla él mismo. No hay envío de
   * email/SMS real en este proyecto (mismo motivo que HU11 Track B quedó fuera de
   * alcance), así que el Admin le comunica la contraseña nueva directamente. */
  async restablecerPassword(id: number, passwordNuevo: string): Promise<void> {
    if (!(await usuarioRepository.findById(id))) {
      throw new UsuarioNoEncontradoError();
    }
    if (passwordNuevo.length < 6) {
      throw new DatosDeUsuarioInvalidosError("La contraseña nueva debe tener al menos 6 caracteres");
    }
    await usuarioRepository.actualizarPassword(id, passwordNuevo);
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
