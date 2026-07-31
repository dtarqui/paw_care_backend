import { plantillaInvitacionVeterinario } from "../lib/email-templates";
import { enviarEmail } from "../lib/mailer";
import { auditoriaRepository } from "../repositories/auditoria.repository";
import { invitacionRepository } from "../repositories/invitacionVeterinario.repository";
import { usuarioRepository } from "../repositories/usuario.repository";
import { veterinarioRepository } from "../repositories/veterinario.repository";
import { InvitacionPendiente, UsuarioPublico } from "../types";
import { esEmailValido } from "../utils/validacion";
import { frontendBaseUrl } from "../utils/url";
import { aPublico, DatosDeUsuarioInvalidosError, UsuarioDuplicadoError } from "./usuario.service";

export class InvitacionInvalidaError extends Error {
  constructor() {
    super("La invitación no es válida, ya fue usada o expiró");
    this.name = "InvitacionInvalidaError";
  }
}

export const invitacionService = {
  async invitar(invitadoPorId: number, email: string, nombre?: string): Promise<void> {
    if (!email || !esEmailValido(email)) {
      throw new DatosDeUsuarioInvalidosError("Ingresa un email válido");
    }
    const invitador = await usuarioRepository.findById(invitadoPorId);
    if (!invitador) throw new DatosDeUsuarioInvalidosError("El usuario que invita no existe");
    if (await usuarioRepository.findByEmail(email)) {
      throw new UsuarioDuplicadoError("Ya existe una cuenta con ese email");
    }
    if (await invitacionRepository.findPendientePorEmail(email)) {
      throw new UsuarioDuplicadoError("Ya hay una invitación pendiente para ese email");
    }

    const invitacion = await invitacionRepository.crear(email, nombre, invitadoPorId);
    const link = `${frontendBaseUrl()}/invitacion?token=${invitacion.token}`;
    try {
      await enviarEmail({
        to: email,
        subject: "Te invitaron a PawCare",
        html: plantillaInvitacionVeterinario(nombre, `${invitador.nombre} ${invitador.apellidoPaterno}`, link),
      });
    } catch (err) {
      // A diferencia de la recuperación de contraseña, acá el Admin sí debe enterarse
      // del fallo (para reintentar) — pero no puede quedar una invitación "pendiente"
      // que en realidad nunca llegó a la bandeja de nadie.
      await invitacionRepository.cancelar(invitacion.id);
      throw err;
    }

    await auditoriaRepository.registrar({
      actorId: invitadoPorId,
      accion: "INVITAR_VETERINARIO",
      entidadTipo: "InvitacionVeterinario",
      entidadId: invitacion.id,
      detalle: `Invitación enviada a ${email}`,
    });
  },

  listarPendientes(): Promise<InvitacionPendiente[]> {
    return invitacionRepository.findAllPendientes();
  },

  async cancelar(id: number): Promise<void> {
    await invitacionRepository.cancelar(id);
  },

  async validarToken(token: string): Promise<{ email: string; nombre?: string }> {
    const invitacion = await invitacionRepository.findValidaPorToken(token);
    if (!invitacion) throw new InvitacionInvalidaError();
    return { email: invitacion.email, nombre: invitacion.nombre };
  },

  async aceptar(
    token: string,
    input: {
      nombre: string;
      apellidoPaterno: string;
      apellidoMaterno?: string;
      ci: string;
      username: string;
      telefono?: string;
      password: string;
      matricula: string;
      especialidad: string;
    }
  ): Promise<UsuarioPublico> {
    const invitacion = await invitacionRepository.findValidaPorToken(token);
    if (!invitacion) throw new InvitacionInvalidaError();

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

    // La cuenta queda ACTIVO de una — a diferencia del preregistro público, acá
    // ya fue un Administrador quien decidió invitar a esta persona.
    const nuevoUsuario = await usuarioRepository.create({
      username: input.username,
      password: input.password,
      nombre: input.nombre,
      apellidoPaterno: input.apellidoPaterno,
      apellidoMaterno: input.apellidoMaterno,
      ci: input.ci,
      email: invitacion.email,
      telefono: input.telefono,
      rol: "VETERINARIO",
      estado: "ACTIVO",
      autorregistrado: false,
    });

    await veterinarioRepository.create({
      usuarioId: nuevoUsuario.id,
      matricula: input.matricula,
      especialidad: input.especialidad,
    });

    await invitacionRepository.marcarAceptada(invitacion.id);

    return aPublico(nuevoUsuario);
  },
};
