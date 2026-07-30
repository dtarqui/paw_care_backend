export interface NotificacionEnviada {
  id: string; // mismo id compuesto del recordatorio, ej. "CITA-3" o "CONTROL-5"
  enviadoEn: string;
}

export const notificacionesEnviadas: NotificacionEnviada[] = [];
