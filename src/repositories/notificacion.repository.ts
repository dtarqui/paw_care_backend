import { prisma } from "../lib/prisma";
import { RecordatorioEnviado } from "../types";
import { dateToLiteral } from "../utils/date";

// HU10/HU11 Track A: cada envío marcado desde la UI queda registrado como una fila
// real en Notificacion (canal WHATSAPP_MANUAL, estado ENVIADO), en vez del arreglo
// en memoria que se usaba en el modo demo — así "ya enviado" sobrevive un reinicio.
export const notificacionRepository = {
  async findRecientesEnviados(limit: number): Promise<RecordatorioEnviado[]> {
    const rows = await prisma.notificacion.findMany({
      where: { estado: "ENVIADO" },
      orderBy: { enviadoEn: "desc" },
      take: limit,
      include: { propietario: { select: { nombre: true, apellidoPaterno: true } } },
    });
    return rows.map((row) => ({
      id: row.id,
      propietario: { nombre: row.propietario.nombre, apellidoPaterno: row.propietario.apellidoPaterno },
      mensaje: row.mensaje,
      canal: row.canal,
      enviadoEn: row.enviadoEn ? dateToLiteral(row.enviadoEn) : "",
    }));
  },

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
