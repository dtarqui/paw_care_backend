import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { passwordResetTemplate } from "../lib/email-templates";
import { sendEmail } from "../lib/mailer";
import { loginEventRepository } from "../repositories/loginEvent.repository";
import { passwordResetTokenRepository } from "../repositories/passwordResetToken.repository";
import { userRepository } from "../repositories/user.repository";
import { LoginOutcome, PublicUser, User } from "../types";
import { frontendBaseUrl } from "../utils/url";

const JWT_SECRET = process.env.JWT_SECRET ?? "demo-secret-cambiar-en-produccion";
const JWT_EXPIRES_IN = "8h";

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Usuario o contraseña incorrectos");
    this.name = "InvalidCredentialsError";
  }
}

export class InvalidResetTokenError extends Error {
  constructor() {
    super("El enlace de recuperación no es válido o ya expiró — solicita uno nuevo");
    this.name = "InvalidResetTokenError";
  }
}

export class InvalidResetDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidResetDataError";
  }
}

function toPublic(user: User): PublicUser {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}

/** De dónde vino el intento. Lo arma el controlador a partir del request. */
export interface LoginContext {
  ipAddress?: string;
  userAgent?: string;
}

/** El registro del intento nunca debe impedir entrar ni tapar el error real: si
 * falla la escritura, se anota en el log del servidor y el login sigue su curso. */
async function recordAttempt(
  username: string,
  outcome: LoginOutcome,
  context: LoginContext,
  userId?: number
): Promise<void> {
  try {
    await loginEventRepository.record({
      userId,
      username: username.slice(0, 50),
      outcome,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent?.slice(0, 400),
    });
  } catch (err) {
    console.error("No se pudo registrar el intento de inicio de sesión:", err);
  }
}

export const authService = {
  /**
   * Cada intento queda registrado en `st_login_events` — los exitosos y los fallidos.
   *
   * El servidor sí distingue por qué falló (usuario inexistente, cuenta desactivada,
   * contraseña incorrecta) porque esa diferencia es justamente lo que sirve para
   * revisar después qué pasó. Lo que **no** cambia es la respuesta al cliente: sigue
   * siendo el mismo error genérico, para no convertir el login en una forma de
   * averiguar qué nombres de usuario existen.
   */
  async login(
    username: string,
    password: string,
    context: LoginContext = {}
  ): Promise<{ token: string; user: PublicUser }> {
    const user = await userRepository.findByUsername(username);

    if (!user) {
      await recordAttempt(username, "INVALID_CREDENTIALS", context);
      throw new InvalidCredentialsError();
    }
    if (user.status === "INACTIVE") {
      await recordAttempt(username, "INACTIVE_ACCOUNT", context, user.id);
      throw new InvalidCredentialsError();
    }
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      await recordAttempt(username, "INVALID_CREDENTIALS", context, user.id);
      throw new InvalidCredentialsError();
    }

    await recordAttempt(username, "SUCCESS", context, user.id);
    const publicUser = toPublic(user);
    const token = jwt.sign({ sub: user.id, role: user.role, name: user.firstName }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });
    return { token, user: publicUser };
  },

  verifyToken(token: string) {
    return jwt.verify(token, JWT_SECRET) as unknown as { sub: number; role: string; name: string };
  },

  /** No revela si el username existe ni si tiene email registrado — evita que este
   * endpoint público sirva para enumerar cuentas válidas. Si todo encaja, manda el
   * correo; si no, responde igual de "éxito" sin hacer nada. Un fallo de envío
   * (ej. SMTP mal configurado) se traga acá a propósito: si dejara propagar el error
   * solo para las cuentas que sí tienen email, la diferencia de respuesta (200 vs 500)
   * ya sería una forma de enumeración — se loguea server-side y listo. */
  async requestPasswordRecovery(username: string): Promise<void> {
    const user = await userRepository.findByUsername(username);
    if (!user || !user.email || user.status === "INACTIVE") return;

    const token = await passwordResetTokenRepository.create(user.id);
    const link = `${frontendBaseUrl()}/reset-password?token=${token}`;
    try {
      await sendEmail({
        to: user.email,
        subject: "Recupera tu contraseña — PawCare",
        html: passwordResetTemplate(user.firstName, link),
      });
    } catch (err) {
      console.error("No se pudo enviar el email de recuperación de contraseña:", err);
    }
  },

  async resetWithToken(token: string, newPassword: string): Promise<void> {
    const tokenRow = await passwordResetTokenRepository.findValid(token);
    if (!tokenRow) throw new InvalidResetTokenError();
    if (newPassword.length < 6) {
      throw new InvalidResetDataError("La contraseña nueva debe tener al menos 6 caracteres");
    }
    await userRepository.updatePassword(tokenRow.userId, newPassword);
    await passwordResetTokenRepository.markUsed(tokenRow.id);
  },
};
