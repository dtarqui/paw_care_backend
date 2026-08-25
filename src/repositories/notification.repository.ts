import { prisma } from "../lib/prisma";
import { SentReminder } from "../types";
import { dateToLiteral } from "../utils/date";

// HU10/HU11 Track A: cada envío marcado desde la UI queda registrado como una fila
// real en Notification (canal WHATSAPP_MANUAL, estado SENT), en vez del arreglo
// en memoria que se usaba en el modo demo — así "ya enviado" sobrevive un reinicio.
export const notificationRepository = {
  async findRecentSent(limit: number): Promise<SentReminder[]> {
    const rows = await prisma.notification.findMany({
      where: { status: "SENT" },
      orderBy: { sentAt: "desc" },
      take: limit,
      include: { owner: { select: { firstName: true, paternalLastName: true } } },
    });
    return rows.map((row) => ({
      id: row.id,
      owner: { firstName: row.owner.firstName, paternalLastName: row.owner.paternalLastName },
      message: row.message,
      channel: row.channel,
      sentAt: row.sentAt ? dateToLiteral(row.sentAt) : "",
    }));
  },

  async alreadySentForAppointment(appointmentId: number): Promise<boolean> {
    const row = await prisma.notification.findFirst({ where: { appointmentId, status: "SENT" } });
    return !!row;
  },

  async alreadySentForPreventiveControl(preventiveControlId: number): Promise<boolean> {
    const row = await prisma.notification.findFirst({ where: { preventiveControlId, status: "SENT" } });
    return !!row;
  },

  async markSentForAppointment(appointmentId: number, ownerId: number, message: string): Promise<void> {
    if (await this.alreadySentForAppointment(appointmentId)) return;
    await prisma.notification.create({
      data: { ownerId, appointmentId, channel: "WHATSAPP_MANUAL", message, status: "SENT", sentAt: new Date() },
    });
  },

  async markSentForPreventiveControl(
    preventiveControlId: number,
    ownerId: number,
    message: string
  ): Promise<void> {
    if (await this.alreadySentForPreventiveControl(preventiveControlId)) return;
    await prisma.notification.create({
      data: {
        ownerId,
        preventiveControlId,
        channel: "WHATSAPP_MANUAL",
        message,
        status: "SENT",
        sentAt: new Date(),
      },
    });
  },
};
