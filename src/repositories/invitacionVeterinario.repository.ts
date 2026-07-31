import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { InvitacionPendiente } from "../types";
import { dateToLiteral } from "../utils/date";

export interface InvitacionRegistro {
  id: number;
  email: string;
  nombre?: string;
  token: string;
  invitadoPorId: number;
}

export const invitacionRepository = {
  async crear(email: string, nombre: string | undefined, invitadoPorId: number, diasValidez = 7): Promise<InvitacionRegistro> {
    const token = crypto.randomBytes(32).toString("hex");
    const expiraEn = new Date(Date.now() + diasValidez * 24 * 60 * 60_000);
    const row = await prisma.invitacionVeterinario.create({ data: { email, nombre, token, invitadoPorId, expiraEn } });
    return { id: row.id, email: row.email, nombre: row.nombre ?? undefined, token: row.token, invitadoPorId: row.invitadoPorId };
  },

  /** Solo devuelve la invitación si sigue vigente (no aceptada y no vencida). */
  async findValidaPorToken(token: string): Promise<InvitacionRegistro | undefined> {
    const row = await prisma.invitacionVeterinario.findUnique({ where: { token } });
    if (!row || row.aceptadaEn || row.expiraEn < new Date()) return undefined;
    return { id: row.id, email: row.email, nombre: row.nombre ?? undefined, token: row.token, invitadoPorId: row.invitadoPorId };
  },

  async findPendientePorEmail(email: string): Promise<boolean> {
    const row = await prisma.invitacionVeterinario.findFirst({
      where: { email, aceptadaEn: null, expiraEn: { gt: new Date() } },
    });
    return !!row;
  },

  async marcarAceptada(id: number): Promise<void> {
    await prisma.invitacionVeterinario.update({ where: { id }, data: { aceptadaEn: new Date() } });
  },

  async findAllPendientes(): Promise<InvitacionPendiente[]> {
    const rows = await prisma.invitacionVeterinario.findMany({
      where: { aceptadaEn: null, expiraEn: { gt: new Date() } },
      include: { invitadoPor: { select: { nombre: true, apellidoPaterno: true } } },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((row) => ({
      id: row.id,
      email: row.email,
      nombre: row.nombre ?? undefined,
      invitadoPor: { nombre: row.invitadoPor.nombre, apellidoPaterno: row.invitadoPor.apellidoPaterno },
      expiraEn: dateToLiteral(row.expiraEn),
      createdAt: dateToLiteral(row.createdAt),
    }));
  },

  async cancelar(id: number): Promise<void> {
    await prisma.invitacionVeterinario.delete({ where: { id } });
  },
};
