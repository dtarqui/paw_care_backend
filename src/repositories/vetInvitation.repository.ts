import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { PendingInvitation } from "../types";
import { dateToLiteral } from "../utils/date";

export interface InvitationRecord {
  id: number;
  email: string;
  name?: string;
  token: string;
  invitedById: number;
}

export const vetInvitationRepository = {
  async create(
    email: string,
    name: string | undefined,
    invitedById: number,
    validityDays = 7
  ): Promise<InvitationRecord> {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + validityDays * 24 * 60 * 60_000);
    const row = await prisma.vetInvitation.create({ data: { email, name, token, invitedById, expiresAt } });
    return {
      id: row.id,
      email: row.email,
      name: row.name ?? undefined,
      token: row.token,
      invitedById: row.invitedById,
    };
  },

  /** Solo devuelve la invitación si sigue vigente (no aceptada y no vencida). */
  async findValidByToken(token: string): Promise<InvitationRecord | undefined> {
    const row = await prisma.vetInvitation.findUnique({ where: { token } });
    if (!row || row.acceptedAt || row.expiresAt < new Date()) return undefined;
    return {
      id: row.id,
      email: row.email,
      name: row.name ?? undefined,
      token: row.token,
      invitedById: row.invitedById,
    };
  },

  async hasPendingForEmail(email: string): Promise<boolean> {
    const row = await prisma.vetInvitation.findFirst({
      where: { email, acceptedAt: null, expiresAt: { gt: new Date() } },
    });
    return !!row;
  },

  async markAccepted(id: number): Promise<void> {
    await prisma.vetInvitation.update({ where: { id }, data: { acceptedAt: new Date() } });
  },

  async findAllPending(): Promise<PendingInvitation[]> {
    const rows = await prisma.vetInvitation.findMany({
      where: { acceptedAt: null, expiresAt: { gt: new Date() } },
      include: { invitedBy: { select: { firstName: true, paternalLastName: true } } },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => ({
      id: row.id,
      email: row.email,
      name: row.name ?? undefined,
      invitedBy: {
        firstName: row.invitedBy.firstName,
        paternalLastName: row.invitedBy.paternalLastName,
      },
      expiresAt: dateToLiteral(row.expiresAt),
      createdAt: dateToLiteral(row.createdAt),
    }));
  },

  async cancel(id: number): Promise<void> {
    await prisma.vetInvitation.delete({ where: { id } });
  },
};
