import { Request } from "express";
import {
  AppointmentStatus,
  PaymentMethod,
  PreventiveControlType,
  RecordStatus,
  Role,
  VisitPaymentStatus,
} from "../types";

/**
 * Texto para los archivos que el backend genera y una persona abre: el Excel de
 * respaldo (HU15) y los reportes en Excel/PDF. Es el único lugar del backend con
 * texto de interfaz — la API JSON sigue devolviendo los enums en inglés y el
 * frontend los traduce por su cuenta (`docs/GLOSARIO_EN_ES.md` §9).
 *
 * El idioma llega en `Accept-Language`, que el cliente HTTP del frontend manda en
 * cada request con el idioma elegido en Configuración. Si falta o no se reconoce,
 * se cae al español: es el idioma base del producto.
 */
export const LANGUAGES = ["es", "en"] as const;
export type Language = (typeof LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = "es";

export function readLanguage(req: Request): Language {
  const header = req.headers["accept-language"];
  if (!header) return DEFAULT_LANGUAGE;
  const first = String(header).split(",")[0]?.trim().toLowerCase() ?? "";
  const base = first.split("-")[0];
  return (LANGUAGES as readonly string[]).includes(base) ? (base as Language) : DEFAULT_LANGUAGE;
}

type Dictionary<T extends string> = Record<Language, Record<T, string>>;

const ROLE: Dictionary<Role> = {
  es: { ADMIN: "Administrador", VET: "Veterinario", RECEPTIONIST: "Recepcionista" },
  en: { ADMIN: "Administrator", VET: "Vet", RECEPTIONIST: "Receptionist" },
};

const RECORD_STATUS: Dictionary<RecordStatus> = {
  es: { ACTIVE: "Activo", INACTIVE: "Inactivo" },
  en: { ACTIVE: "Active", INACTIVE: "Inactive" },
};

const APPOINTMENT_STATUS: Dictionary<AppointmentStatus> = {
  es: { CONFIRMED: "Confirmada", ATTENDED: "Atendida", CANCELLED: "Cancelada" },
  en: { CONFIRMED: "Confirmed", ATTENDED: "Attended", CANCELLED: "Cancelled" },
};

const VISIT_PAYMENT_STATUS: Dictionary<VisitPaymentStatus> = {
  es: { PENDING: "Pendiente", PAID: "Pagado" },
  en: { PENDING: "Pending", PAID: "Paid" },
};

const PAYMENT_METHOD: Dictionary<PaymentMethod> = {
  es: { CASH: "Efectivo", CARD: "Tarjeta", TRANSFER: "Transferencia", QR: "QR" },
  en: { CASH: "Cash", CARD: "Card", TRANSFER: "Transfer", QR: "QR" },
};

const PREVENTIVE_CONTROL_TYPE: Dictionary<PreventiveControlType> = {
  es: { VACCINE: "Vacuna", DEWORMING: "Desparasitación" },
  en: { VACCINE: "Vaccine", DEWORMING: "Deworming" },
};

/** Encabezados de columna, nombres de hoja y títulos de reporte. */
const TEXT = {
  es: {
    id: "ID",
    firstName: "Nombre",
    paternalLastName: "Apellido Paterno",
    nationalId: "CI",
    username: "Usuario",
    role: "Rol",
    status: "Estado",
    licenseNumber: "Matrícula",
    specialty: "Especialidad",
    phone: "Teléfono",
    name: "Nombre",
    species: "Especie",
    breed: "Raza",
    sex: "Sexo",
    owner: "Propietario",
    code: "Código",
    dateTime: "Fecha/Hora",
    pet: "Mascota",
    vet: "Veterinario",
    type: "Tipo",
    date: "Fecha",
    serviceType: "Tipo de servicio",
    diagnosis: "Diagnóstico",
    amountBs: "Monto (Bs.)",
    amount: "Monto",
    paymentStatus: "Estado de pago",
    visit: "Atención",
    paymentMethod: "Método de pago",
    appliedOn: "Fecha aplicación",
    nextDoseOn: "Próxima dosis",
    currentStock: "Stock actual",
    minimumStock: "Stock mínimo",
    quantity: "Cantidad",
    sheetUsers: "Usuarios",
    sheetVets: "Veterinarios",
    sheetOwners: "Propietarios",
    sheetPets: "Mascotas",
    sheetAppointments: "Citas",
    sheetVisits: "AtencionesMedicas",
    sheetPayments: "Pagos",
    sheetPreventive: "ControlesPreventivos",
    sheetMedications: "Medicamentos",
    sheetReport: "Reporte",
    reportTitle: "PawCare — Reporte",
    reportKind: "Tipo",
    reportRevenueByService: "Ingresos por tipo de servicio",
    reportVisits: "Atenciones por período",
    reportTo: "a",
    fileFullExport: "pawcare-exportacion-completa",
    "file-revenue-by-service": "reporte-ingresos-por-servicio",
    "file-visits": "reporte-atenciones",
  },
  en: {
    id: "ID",
    firstName: "First name",
    paternalLastName: "Last name",
    nationalId: "National ID",
    username: "Username",
    role: "Role",
    status: "Status",
    licenseNumber: "License no.",
    specialty: "Specialty",
    phone: "Phone",
    name: "Name",
    species: "Species",
    breed: "Breed",
    sex: "Sex",
    owner: "Owner",
    code: "Code",
    dateTime: "Date/Time",
    pet: "Pet",
    vet: "Vet",
    type: "Type",
    date: "Date",
    serviceType: "Service type",
    diagnosis: "Diagnosis",
    amountBs: "Amount (Bs.)",
    amount: "Amount",
    paymentStatus: "Payment status",
    visit: "Visit",
    paymentMethod: "Payment method",
    appliedOn: "Date given",
    nextDoseOn: "Next dose",
    currentStock: "Current stock",
    minimumStock: "Minimum stock",
    quantity: "Quantity",
    sheetUsers: "Users",
    sheetVets: "Vets",
    sheetOwners: "Owners",
    sheetPets: "Pets",
    sheetAppointments: "Appointments",
    sheetVisits: "MedicalVisits",
    sheetPayments: "Payments",
    sheetPreventive: "PreventiveControls",
    sheetMedications: "Medications",
    sheetReport: "Report",
    reportTitle: "PawCare — Report",
    reportKind: "Type",
    reportRevenueByService: "Revenue by service type",
    reportVisits: "Visits over a period",
    reportTo: "to",
    fileFullExport: "pawcare-full-export",
    "file-revenue-by-service": "report-revenue-by-service",
    "file-visits": "report-visits",
  },
} as const;

export type TextKey = keyof (typeof TEXT)["es"];

function translate<T extends string>(
  dictionary: Dictionary<T>,
  language: Language,
  value: T | null | undefined
): string {
  if (!value) return "—";
  return dictionary[language][value] ?? value;
}

/**
 * Etiquetas ya atadas a un idioma. Devuelve el valor crudo si el enum creció y
 * falta traducirlo: el síntoma se ve, pero la exportación no se rompe.
 */
export function labelsFor(language: Language) {
  return {
    role: (v: Role | null | undefined) => translate(ROLE, language, v),
    recordStatus: (v: RecordStatus | null | undefined) => translate(RECORD_STATUS, language, v),
    appointmentStatus: (v: AppointmentStatus | null | undefined) =>
      translate(APPOINTMENT_STATUS, language, v),
    visitPaymentStatus: (v: VisitPaymentStatus | null | undefined) =>
      translate(VISIT_PAYMENT_STATUS, language, v),
    paymentMethod: (v: PaymentMethod | null | undefined) => translate(PAYMENT_METHOD, language, v),
    preventiveControlType: (v: PreventiveControlType | null | undefined) =>
      translate(PREVENTIVE_CONTROL_TYPE, language, v),
    text: (key: TextKey) => TEXT[language][key],
  };
}

export type Labels = ReturnType<typeof labelsFor>;
