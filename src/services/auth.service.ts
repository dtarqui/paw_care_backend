import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { passwordResetTemplate } from "../lib/email-templates";
import { sendEmail } from "../lib/mailer";
import { passwordResetTokenRepository } from "../repositories/passwordResetToken.repository";
import { userRepository } from "../repositories/user.repository";
import { PublicUser, User } from "../types";
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

export const authService = {
  async login(username: string, password: string): Promise<{ token: string; user: PublicUser }> {
    const user = await userRepository.findByUsername(username);
    if (!user || user.status === "INACTIVE" || !(await bcrypt.compare(password, user.passwordHash))) {
      // Mensaje genérico a propósito: no revela si falló el usuario, la contraseña,
      // o si la cuenta existe pero está desactivada (HU1).
      throw new InvalidCredentialsError();
    }
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
