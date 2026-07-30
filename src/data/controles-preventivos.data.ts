import { TipoControlPreventivo } from "../types";
import { addDays, todayISO } from "../utils/date";

export interface ControlRegistro {
  id: number;
  mascotaId: number;
  tipo: TipoControlPreventivo;
  fechaAplicacion: string; // YYYY-MM-DD
  proximaDosis: string; // YYYY-MM-DD
}

const hoy = todayISO();

export const controlesPreventivos: ControlRegistro[] = [
  // Coco: vacuna a 5 días de vencer — aparece en "próximos a vencer".
  { id: 1, mascotaId: 1, tipo: "VACUNA", fechaAplicacion: addDays(hoy, -360), proximaDosis: addDays(hoy, 5) },
  { id: 2, mascotaId: 3, tipo: "DESPARASITACION", fechaAplicacion: addDays(hoy, -60), proximaDosis: addDays(hoy, 25) },
  // Billy: vacuna ya vencida hace 15 días — se marca "vencido".
  { id: 3, mascotaId: 2, tipo: "VACUNA", fechaAplicacion: addDays(hoy, -395), proximaDosis: addDays(hoy, -15) },
  { id: 4, mascotaId: 4, tipo: "DESPARASITACION", fechaAplicacion: addDays(hoy, -30), proximaDosis: addDays(hoy, 60) },
];
