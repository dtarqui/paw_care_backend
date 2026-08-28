// Tipos de transporte de la API (lo que viaja en el JSON hacia el frontend).
// Reflejan el modelo de datos real documentado en database/MODELO_DATOS.md.
//
// Convención del proyecto: identificadores en INGLÉS, textos visibles en ESPAÑOL
// (esos viven en la UI del frontend y en los mensajes de error de los servicios).
// Ver docs/GLOSARIO_EN_ES.md para el mapa completo inglés -> español.

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type Role = "ADMIN" | "VET" | "RECEPTIONIST";
export type RecordStatus = "ACTIVE" | "INACTIVE";

export interface User {
  id: number;
  username: string;
  passwordHash: string; // hash de bcrypt — nunca texto plano (ver auth.service.ts)
  firstName: string;
  paternalLastName: string;
  maternalLastName?: string;
  nationalId: string;
  email?: string;
  phone?: string;
  role: Role;
  status: RecordStatus;
  selfRegistered: boolean;
}

export type PublicUser = Omit<User, "passwordHash">;

export type AuditAction =
  | "ACTIVATE_ACCOUNT"
  | "DEACTIVATE_ACCOUNT"
  | "RESET_PASSWORD"
  | "CHANGE_ROLE"
  | "INVITE_VET";

export interface AuditLog {
  id: number;
  actor?: { firstName: string; paternalLastName: string };
  action: AuditAction;
  entityType: string;
  entityId?: number;
  details?: string;
  date: string;
}

export type LoginOutcome = "SUCCESS" | "INVALID_CREDENTIALS" | "INACTIVE_ACCOUNT";

export interface LoginEvent {
  id: number;
  /** Ausente cuando el usuario tecleado no existe — el intento se guarda igual. */
  user?: { firstName: string; paternalLastName: string; role: Role };
  username: string;
  outcome: LoginOutcome;
  ipAddress?: string;
  userAgent?: string;
  date: string;
}

export interface PendingInvitation {
  id: number;
  email: string;
  name?: string;
  invitedBy: { firstName: string; paternalLastName: string };
  expiresAt: string;
  createdAt: string;
}

export interface Vet {
  id: number;
  userId?: number; // vincula con User.id cuando el veterinario tiene cuenta de acceso
  firstName: string;
  paternalLastName: string;
  licenseNumber: string;
  specialty: string;
}

export interface Owner {
  id: number;
  firstName: string;
  paternalLastName: string;
  nationalId: string;
  phone: string;
  address?: string;
}

export interface OwnerWithPets extends Owner {
  petCount: number;
  pets: { id: number; name: string }[];
}

export interface Pet {
  id: number;
  name: string;
  species: string;
  breed: string;
  sex: "Macho" | "Hembra";
  birthDate: string;
  weight: number;
  status: RecordStatus;
  owner: Owner;
}

export type AppointmentStatus = "CONFIRMED" | "ATTENDED" | "CANCELLED";

export interface Appointment {
  id: number;
  code: string;
  dateTime: string; // ISO
  durationMin: number;
  pet: Pick<Pet, "id" | "name" | "species">;
  vet: Pick<Vet, "id" | "firstName" | "paternalLastName">;
  consultationType: string;
  reason: string;
  status: AppointmentStatus;
}

export type PaymentMethod = "CASH" | "CARD" | "TRANSFER" | "QR";

export interface PendingPayment {
  visitId: number;
  pet: Pick<Pet, "id" | "name">;
  owner: Pick<Owner, "id" | "firstName" | "paternalLastName">;
  consultationReason: string;
  amount: number;
  date: string;
}

export type VisitPaymentStatus = "PENDING" | "PAID";

export interface PaymentHistoryEntry {
  id: number;
  /** El mismo número que lleva impreso el comprobante, ej. `R-2026-000042`. */
  receiptNumber: string;
  visitId: number;
  pet: Pick<Pet, "id" | "name">;
  owner: Pick<Owner, "id" | "firstName" | "paternalLastName">;
  method: PaymentMethod;
  amount: number;
  date: string;
}

/**
 * Todo lo que lleva el comprobante que se le entrega al cliente. Se arma de una sola
 * consulta al registrar el pago, así la pantalla de éxito no necesita ir y volver.
 */
export interface PaymentReceipt {
  id: number;
  /** Número visible del comprobante, ej. `R-2026-000042`. */
  receiptNumber: string;
  date: string;
  method: PaymentMethod;
  amount: number;
  pet: Pick<Pet, "id" | "name" | "species">;
  owner: Pick<Owner, "id" | "firstName" | "paternalLastName" | "nationalId"> & { phone?: string };
  visit: { id: number; serviceType: string; diagnosis: string; date: string };
  vet: { firstName: string; paternalLastName: string };
}

export type QrChargeStatus = "PENDING" | "CONFIRMED" | "EXPIRED" | "ERROR";

export interface QrCharge {
  id: number;
  visitId: number;
  amount: number;
  status: QrChargeStatus;
  provider: string;
  qrPayload?: string;
  expiresAt?: string;
  confirmedAt?: string;
  createdAt: string;
}

export interface MedicalVisit {
  id: number;
  pet: Pick<Pet, "id" | "name" | "species">;
  vet: Pick<Vet, "id" | "firstName" | "paternalLastName">;
  date: string;
  serviceType: string;
  diagnosis: string;
  treatment: string;
  externalExams?: string;
  weight?: number;
  consultationFee: number;
  paymentStatus: VisitPaymentStatus;
}

export type PreventiveControlType = "VACCINE" | "DEWORMING";

export interface PreventiveControl {
  id: number;
  pet: Pick<Pet, "id" | "name" | "species">;
  type: PreventiveControlType;
  /** Qué se aplicó: la vacuna («Quíntuple», «Antirrábica») o el desparasitante. Se
   * teclea, así que es dato en español como el catálogo de servicios. */
  productName?: string;
  /** Lote del frasco. Es lo que pide el SENASAG para el certificado de viaje. */
  batchNumber?: string;
  appliedOn: string;
  nextDoseOn: string;
  overdue: boolean;
}

/**
 * Todo lo que lleva el carnet de vacunación de una mascota.
 *
 * Lleva más datos de identificación que el resto de las pantallas —color, peso,
 * dirección del propietario— porque un carnet lo lee un tercero que no tiene acceso
 * al sistema: otra clínica, una guardería o una aduana. Ahí "Luna, perro" no alcanza
 * para saber que el animal que tienen delante es el del papel.
 */
export interface VaccinationCard {
  pet: Pick<Pet, "id" | "name" | "species" | "breed" | "sex" | "birthDate"> & {
    color: string;
    weight?: number;
  };
  owner: Pick<Owner, "firstName" | "paternalLastName" | "nationalId"> & {
    maternalLastName?: string;
    phone?: string;
    address?: string;
  };
  /** En orden cronológico: el carnet se lee como una libreta, de lo más viejo a lo
   * más nuevo, y así la última fila es siempre la dosis más reciente. */
  controls: {
    type: PreventiveControlType;
    productName?: string;
    batchNumber?: string;
    appliedOn: string;
    nextDoseOn: string;
    overdue: boolean;
  }[];
}

export interface Medication {
  id: number;
  name: string;
  currentStock: number;
  minimumStock: number;
}

export type InventoryMoveType = "IN" | "OUT";

export interface InventoryMove {
  id: number;
  medication: Pick<Medication, "id" | "name">;
  type: InventoryMoveType;
  quantity: number;
  date: string;
  visitId?: number;
}

export type NotificationChannel = "WHATSAPP_MANUAL";
export type NotificationStatus = "PENDING" | "SENT";
export type ReminderType = "APPOINTMENT" | "PREVENTIVE_CONTROL";

export interface PendingReminder {
  id: string; // compuesto: `${type}-${referenceId}`, no requiere tabla propia
  type: ReminderType;
  owner: { phone: string; firstName: string; paternalLastName: string };
  message: string;
  reference: string; // ej. nombre de mascota + fecha, para mostrar en la UI
}

export interface SentReminder {
  id: number;
  owner: { firstName: string; paternalLastName: string };
  message: string;
  channel: string;
  sentAt: string;
}

export interface PetChange {
  id: number;
  field: string;
  oldValue?: string;
  newValue?: string;
  date: string;
  user?: string; // nombre completo de quien hizo el cambio, si la cuenta sigue existiendo
}

// Ficha individual de mascota: línea de tiempo unificada (atenciones, controles
// preventivos, citas y ediciones manuales), cada evento resuelto a su tipo real
// para que el frontend no tenga que adivinar la forma del payload.
export type PetHistoryEvent =
  | { type: "VISIT"; date: string; visit: MedicalVisit }
  | { type: "PREVENTIVE_CONTROL"; date: string; control: PreventiveControl }
  | { type: "APPOINTMENT"; date: string; appointment: Appointment }
  | { type: "CHANGE"; date: string; change: PetChange };
