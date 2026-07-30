import { prisma } from "../lib/prisma";

// HU10/HU11 Track A: cada envío marcado desde la UI queda registrado como una fila
// real en Notificacion (canal WHATSAPP_MANUAL, estado ENVIADO), en vez del arreglo
// en memoria que se usaba en el modo demo — así "ya enviado" sobrevive un reinicio.
export const notificacionRepository = {
  async yaEnviadoParaCita(citaId: number): Promise<boolean> {
    const row = await prisma.notificacion.findFirst({ where: { citaId, estado: "ENVIADO" } });
    return !!row;
  },

  async yaEnviadoParaControl(controlPreventivoId: number): Promise<boolean> {
    const row = await prisma.notificacion.findFirst({ where: { controlPreventivoId, estado: "ENVIADO" } });
    return !!row;
  },

  async marcarEnviadoCita(citaId: number, propietarioId: number, mensaje: string): Promise<void> {
    if (await this.yaEnviadoParaCita(citaId)) return;
    await prisma.notificacion.create({
      data: { propietarioId, citaId, canal: "WHATSAPP_MANUAL", mensaje, estado: "ENVIADO", enviadoEn: new Date() },
    });
  },

  async marcarEnviadoControl(controlPreventivoId: number, propietarioId: number, mensaje: string): Promise<void> {
    if (await this.yaEnviadoParaControl(controlPreventivoId)) return;
    await prisma.notificacion.create({
      data: { propietarioId, controlPreventivoId, canal: "WHATSAPP_MANUAL", mensaje, estado: "ENVIADO", enviadoEn: new Date() },
    });
  },
};
