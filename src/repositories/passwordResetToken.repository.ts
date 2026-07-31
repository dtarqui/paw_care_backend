import crypto from "crypto";
import { prisma } from "../lib/prisma";

export interface TokenRecuperacion {
  id: number;
  usuarioId: number;
  token: string;
}

export const passwordResetTokenRepository = {
  async crear(usuarioId: number, minutosValidez = 60): Promise<string> {
    const token = crypto.randomBytes(32).toString("hex");
    const expiraEn = new Date(Date.now() + minutosValidez * 60_000);
    await prisma.passwordResetToken.create({ data: { usuarioId, token, expiraEn } });
    return token;
  },

  /** Solo devuelve el token si sigue vigente (no usado y no vencido). */
  async findValido(token: string): Promise<TokenRecuperacion | undefined> {
    const row = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!row || row.usadoEn || row.expiraEn < new Date()) return undefined;
    return { id: row.id, usuarioId: row.usuarioId, token: row.token };
  },

  async marcarUsado(id: number): Promise<void> {
    await prisma.passwordResetToken.update({ where: { id }, data: { usadoEn: new Date() } });
  },
};
