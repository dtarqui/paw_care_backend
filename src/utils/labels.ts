// Traducción de los valores de enum al español, para lo que sale del backend y
// lo lee una persona: las celdas del Excel de respaldo (HU15) y los reportes.
// En el frontend el equivalente son StatusBadge.tsx y lib/roles.ts — si agregas
// un valor a un enum del schema, agrega su etiqueta acá y allá en el mismo commit.
import {
  AppointmentStatus,
  PaymentMethod,
  PreventiveControlType,
  RecordStatus,
  Role,
  VisitPaymentStatus,
} from "../types";

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrador",
  VET: "Veterinario",
  RECEPTIONIST: "Recepcionista",
};

const RECORD_STATUS_LABEL: Record<RecordStatus, string> = {
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
};

const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  CONFIRMED: "Confirmada",
  ATTENDED: "Atendida",
  CANCELLED: "Cancelada",
};

const VISIT_PAYMENT_STATUS_LABEL: Record<VisitPaymentStatus, string> = {
  PENDING: "Pendiente",
  PAID: "Pagado",
};

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: "Efectivo",
  CARD: "Tarjeta",
  TRANSFER: "Transferencia",
  QR: "QR",
};

const PREVENTIVE_CONTROL_TYPE_LABEL: Record<PreventiveControlType, string> = {
  VACCINE: "Vacuna",
  DEWORMING: "Desparasitación",
};

/** Devuelve la etiqueta en español, o el valor crudo si el enum creció y falta traducirlo. */
function translate<T extends string>(map: Record<T, string>, value: T | null | undefined): string {
  if (!value) return "—";
  return map[value] ?? value;
}

export const label = {
  role: (v: Role | null | undefined) => translate(ROLE_LABEL, v),
  recordStatus: (v: RecordStatus | null | undefined) => translate(RECORD_STATUS_LABEL, v),
  appointmentStatus: (v: AppointmentStatus | null | undefined) =>
    translate(APPOINTMENT_STATUS_LABEL, v),
  visitPaymentStatus: (v: VisitPaymentStatus | null | undefined) =>
    translate(VISIT_PAYMENT_STATUS_LABEL, v),
  paymentMethod: (v: PaymentMethod | null | undefined) => translate(PAYMENT_METHOD_LABEL, v),
  preventiveControlType: (v: PreventiveControlType | null | undefined) =>
    translate(PREVENTIVE_CONTROL_TYPE_LABEL, v),
};
