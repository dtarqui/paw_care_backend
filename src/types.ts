// Tipos compartidos del modo demo. Reflejan el modelo de datos real
// documentado en database/MODELO_DATOS.md (versión reducida, sin Prisma).

export type Rol = "ADMINISTRADOR" | "VETERINARIO" | "RECEPCIONISTA";
export type EstadoRegistro = "ACTIVO" | "INACTIVO";

export interface Usuario {
  id: number;
  username: string;
  password: string; // texto plano SOLO en el modo demo — el real usa bcrypt (ver TASKS.md)
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno?: string;
  ci: string;
  telefono?: string;
  rol: Rol;
  estado: EstadoRegistro;
}

export type UsuarioPublico = Omit<Usuario, "password">;

export interface Veterinario {
  id: number;
  usuarioId?: number; // vincula con Usuario.id cuando el veterinario tiene cuenta de acceso (ver database/MODELO_DATOS.md)
  nombre: string;
  apellidoPaterno: string;
  matricula: string;
  especialidad: string;
}

export interface Propietario {
  id: number;
  nombre: string;
  apellidoPaterno: string;
  ci: string;
  telefono: string;
}

export interface Mascota {
  id: number;
  nombre: string;
  especie: string;
  raza: string;
  sexo: "Macho" | "Hembra";
  fechaNacimiento: string;
  peso: number;
  propietario: Propietario;
}

export type EstadoCita = "CONFIRMADA" | "ATENDIDA" | "CANCELADA";

export interface Cita {
  id: number;
  codigo: string;
  fechaHora: string; // ISO
  duracionMin: number;
  mascota: Pick<Mascota, "id" | "nombre" | "especie">;
  veterinario: Pick<Veterinario, "id" | "nombre" | "apellidoPaterno">;
  tipoConsulta: string;
  motivo: string;
  estado: EstadoCita;
}

export type MetodoPago = "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "QR";

export interface PagoPendiente {
  atencionId: number;
  mascota: Pick<Mascota, "id" | "nombre">;
  propietario: Pick<Propietario, "id" | "nombre" | "apellidoPaterno">;
  motivoConsulta: string;
  monto: number;
  fecha: string;
}

export type EstadoPagoAtencion = "PENDIENTE" | "PAGADO";

export interface AtencionMedica {
  id: number;
  mascota: Pick<Mascota, "id" | "nombre" | "especie">;
  veterinario: Pick<Veterinario, "id" | "nombre" | "apellidoPaterno">;
  fecha: string;
  tipoServicio: string;
  diagnostico: string;
  tratamiento: string;
  examenesExternos?: string;
  montoConsulta: number;
  estadoPago: EstadoPagoAtencion;
}

export type TipoControlPreventivo = "VACUNA" | "DESPARASITACION";

export interface ControlPreventivo {
  id: number;
  mascota: Pick<Mascota, "id" | "nombre" | "especie">;
  tipo: TipoControlPreventivo;
  fechaAplicacion: string;
  proximaDosis: string;
  vencido: boolean;
}

export interface Medicamento {
  id: number;
  nombre: string;
  stockActual: number;
  stockMinimo: number;
}

export type TipoMovimientoInventario = "ENTRADA" | "SALIDA";

export interface MovimientoInventario {
  id: number;
  medicamento: Pick<Medicamento, "id" | "nombre">;
  tipo: TipoMovimientoInventario;
  cantidad: number;
  fecha: string;
  atencionId?: number;
}

export type CanalNotificacion = "WHATSAPP_MANUAL";
export type EstadoNotificacion = "PENDIENTE" | "ENVIADO";
export type TipoRecordatorio = "CITA" | "CONTROL_PREVENTIVO";

export interface RecordatorioPendiente {
  id: string; // compuesto: `${tipo}-${referenciaId}`, no requiere tabla propia
  tipo: TipoRecordatorio;
  propietario: { telefono: string; nombre: string; apellidoPaterno: string };
  mensaje: string;
  referencia: string; // ej. nombre de mascota + fecha, para mostrar en la UI
}
