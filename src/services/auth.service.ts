import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { plantillaRecuperacionPassword } from "../lib/email-templates";
import { enviarEmail } from "../lib/mailer";
import { passwordResetTokenRepository } from "../repositories/passwordResetToken.repository";
import { usuarioRepository } from "../repositories/usuario.repository";
import { UsuarioPublico } from "../types";
import { frontendBaseUrl } from "../utils/url";

const JWT_SECRET = process.env.JWT_SECRET ?? "demo-secret-cambiar-en-produccion";
const JWT_EXPIRES_IN = "8h";

export class CredencialesInvalidasError extends Error {
  constructor() {
    super("Usuario o contraseña incorrectos");
    this.name = "CredencialesInvalidasError";
  }
}

export class TokenDeRecuperacionInvalidoError extends Error {
  constructor() {
    super("El enlace de recuperación no es válido o ya expiró — solicita uno nuevo");
    this.name = "TokenDeRecuperacionInvalidoError";
  }
}

export class DatosDeRecuperacionInvalidosError extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "DatosDeRecuperacionInvalidosError";
  }
}

function aPublico(usuario: { password: string } & UsuarioPublico): UsuarioPublico {
  const { password: _password, ...publico } = usuario;
  return publico;
}

export const authService = {
  async login(username: string, password: string): Promise<{ token: string; usuario: UsuarioPublico }> {
    const usuario = await usuarioRepository.findByUsername(username);
    if (!usuario || usuario.estado === "INACTIVO" || !(await bcrypt.compare(password, usuario.password))) {
      // Mensaje genérico a propósito: no revela si falló el usuario, la contraseña,
      // o si la cuenta existe pero está desactivada (HU1).
      throw new CredencialesInvalidasError();
    }
    const publico = aPublico(usuario);
    const token = jwt.sign(
      { sub: usuario.id, rol: usuario.rol, nombre: usuario.nombre },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    return { token, usuario: publico };
  },

  verificarToken(token: string) {
    return jwt.verify(token, JWT_SECRET) as unknown as { sub: number; rol: string; nombre: string };
  },

  /** No revela si el username existe ni si tiene email registrado — evita que este
   * endpoint público sirva para enumerar cuentas válidas. Si todo encaja, manda el
   * correo; si no, responde igual de "éxito" sin hacer nada. Un fallo de envío
   * (ej. SMTP mal configurado) se traga acá a propósito: si dejara propagar el error
   * solo para las cuentas que sí tienen email, la diferencia de respuesta (200 vs 500)
   * ya sería una forma de enumeración — se loguea server-side y listo. */
  async solicitarRecuperacion(username: string): Promise<void> {
    const usuario = await usuarioRepository.findByUsername(username);
    if (!usuario || !usuario.email || usuario.estado === "INACTIVO") return;

    const token = await passwordResetTokenRepository.crear(usuario.id);
    const link = `${frontendBaseUrl()}/restablecer-password?token=${token}`;
    try {
      await enviarEmail({
        to: usuario.email,
        subject: "Recupera tu contraseña — PawCare",
        html: plantillaRecuperacionPassword(usuario.nombre, link),
      });
    } catch (err) {
      console.error("No se pudo enviar el email de recuperación de contraseña:", err);
    }
  },

  async restablecerConToken(token: string, passwordNuevo: string): Promise<void> {
    const tokenRow = await passwordResetTokenRepository.findValido(token);
    if (!tokenRow) throw new TokenDeRecuperacionInvalidoError();
    if (passwordNuevo.length < 6) {
      throw new DatosDeRecuperacionInvalidosError("La contraseña nueva debe tener al menos 6 caracteres");
    }
    await usuarioRepository.actualizarPassword(tokenRow.usuarioId, passwordNuevo);
    await passwordResetTokenRepository.marcarUsado(tokenRow.id);
  },
};
