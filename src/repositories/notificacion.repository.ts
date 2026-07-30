import { notificacionesEnviadas } from "../data/notificaciones.data";

export const notificacionRepository = {
  yaEnviado(id: string): boolean {
    return notificacionesEnviadas.some((n) => n.id === id);
  },

  marcarEnviado(id: string): void {
    if (!this.yaEnviado(id)) {
      notificacionesEnviadas.push({ id, enviadoEn: new Date().toISOString() });
    }
  },
};
