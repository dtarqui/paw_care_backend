import crypto from "crypto";
import { prisma } from "../lib/prisma";

export interface PasswordResetTokenRecord {
  id: number;
  userId: number;
  token: string;
}

export const passwordResetTokenRepository = {
  async create(userId: number, validityMinutes = 60): Promise<string> {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + validityMinutes * 60_000);
    await prisma.passwordResetToken.create({ data: { userId, token, expiresAt } });
    return token;
  },

  /** Solo devuelve el token si sigue vigente (no usado y no vencido). */
  async findValid(token: string): Promise<PasswordResetTokenRecord | undefined> {
    const row = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!row || row.usedAt || row.expiresAt < new Date()) return undefined;
    return { id: row.id, userId: row.userId, token: row.token };
  },

  async markUsed(id: number): Promise<void> {
    await prisma.passwordResetToken.update({ where: { id }, data: { usedAt: new Date() } });
  },
};
