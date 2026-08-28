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

/**
 * Los tipos de servicio se guardan en español porque son **datos** del catálogo de la
 * clínica, no etiquetas de interfaz (ver `frontend/src/lib/service-types.ts`). Se
 * traducen al mostrarlos, igual que en la pantalla, y si alguien cargó uno a mano que
 * no está acá se muestra tal cual — es preferible a esconderlo.
 */
const SERVICE_TYPE: Record<Language, Record<string, string>> = {
  es: {
    "Consulta General": "Consulta General",
    "Vacunación": "Vacunación",
    Control: "Control",
    "Cirugía": "Cirugía",
    "Desparasitación": "Desparasitación",
  },
  en: {
    "Consulta General": "General consultation",
    "Vacunación": "Vaccination",
    Control: "Check-up",
    "Cirugía": "Surgery",
    "Desparasitación": "Deworming",
  },
};

/** Especie y sexo también son datos en español (los teclea la clínica), así que se
 * traducen al mostrarlos y caen al valor crudo si no están en la lista. */
const SPECIES: Record<Language, Record<string, string>> = {
  es: { Perro: "Perro", Gato: "Gato", Otro: "Otro" },
  en: { Perro: "Dog", Gato: "Cat", Otro: "Other" },
};

const SEX: Record<Language, Record<string, string>> = {
  es: { Macho: "Macho", Hembra: "Hembra" },
  en: { Macho: "Male", Hembra: "Female" },
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
    productName: "Producto",
    batchNumber: "Lote",
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
    receiptClinic: "Clínica veterinaria",
    receiptNumber: "Comprobante N.º",
    receiptAmountPaid: "Monto cobrado",
    receiptReceivedFrom: "Recibimos de",
    receiptConcept: "Concepto",
    receiptVisitDate: "Fecha de la atención",
    receiptFooter: "Comprobante interno de la clínica. No constituye factura fiscal.",
    cardTitle: "Carnet de vacunación y desparasitación",
    cardBirthDate: "Fecha de nacimiento",
    cardHistory: "Historial de dosis",
    cardApplied: "Aplicada",
    cardNextDose: "Próxima dosis",
    cardOverdue: "Vencida",
    cardEmpty: "Todavía no hay dosis registradas para esta mascota.",
    cardFooter: "Emitido por PawCare el",
    cardPetData: "Datos de la mascota",
    cardOwnerData: "Datos del propietario",
    cardVaccines: "Registro de vacunación",
    cardDewormings: "Registro de desparasitación",
    cardColor: "Color",
    cardWeight: "Peso",
    cardAddress: "Dirección",
    cardVaccineAndBatch: "Vacuna y lote",
    cardProductAndDose: "Producto y dosis",
    cardSignature: "Firma y sello",
    cardNoteSignature:
      "Cada dosis vale con la firma y el sello del veterinario, y la etiqueta del frasco en su casilla.",
    cardNoteRabies: "La antirrábica se refuerza cada año (Programa Nacional de Zoonosis).",
    cardNoteTravel:
      "Para salir del país hace falta además el certificado zoosanitario del SENASAG.",
    fileCard: "carnet",
    fileReceipt: "recibo",
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
    productName: "Product",
    batchNumber: "Batch",
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
    receiptClinic: "Veterinary clinic",
    receiptNumber: "Receipt no.",
    receiptAmountPaid: "Amount paid",
    receiptReceivedFrom: "Received from",
    receiptConcept: "For",
    receiptVisitDate: "Visit date",
    receiptFooter: "Internal clinic receipt. Not a tax invoice.",
    cardTitle: "Vaccination and deworming card",
    cardBirthDate: "Date of birth",
    cardHistory: "Dose history",
    cardApplied: "Given",
    cardNextDose: "Next dose",
    cardOverdue: "Overdue",
    cardEmpty: "No doses recorded for this pet yet.",
    cardFooter: "Issued by PawCare on",
    cardPetData: "Pet details",
    cardOwnerData: "Owner details",
    cardVaccines: "Vaccination record",
    cardDewormings: "Deworming record",
    cardColor: "Colour",
    cardWeight: "Weight",
    cardAddress: "Address",
    cardVaccineAndBatch: "Vaccine and batch",
    cardProductAndDose: "Product and dose",
    cardSignature: "Signature and stamp",
    cardNoteSignature:
      "A dose counts with the vet's signature and stamp, and the vial label in its box.",
    cardNoteRabies: "Rabies is boosted every year (Bolivia's National Zoonosis Programme).",
    cardNoteTravel: "Leaving the country also requires SENASAG's zoosanitary certificate.",
    fileCard: "vaccination-card",
    fileReceipt: "receipt",
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
    serviceType: (v: string | null | undefined) => (v ? SERVICE_TYPE[language][v] ?? v : "—"),
    speciesOrRaw: (v: string | null | undefined) => (v ? SPECIES[language][v] ?? v : ""),
    sexOrRaw: (v: string | null | undefined) => (v ? SEX[language][v] ?? v : ""),
    text: (key: TextKey) => TEXT[language][key],
  };
}

export type Labels = ReturnType<typeof labelsFor>;
