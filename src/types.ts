// Tipos compartidos del modo demo. Reflejan el modelo de datos real
// documentado en database/MODELO_DATOS.md (versión reducida, sin Prisma).

export interface Paginado<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

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
  autorregistrado: boolean;
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
  direccion?: string;
}

export interface PropietarioConMascotas extends Propietario {
  cantidadMascotas: number;
  mascotas: { id: number; nombre: string }[];
}

export interface Mascota {
  id: number;
  nombre: string;
  especie: string;
  raza: string;
  sexo: "Macho" | "Hembra";
  fechaNacimiento: string;
  peso: number;
  estado: EstadoRegistro;
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

export interface PagoHistorial {
  id: number;
  atencionId: number;
  mascota: Pick<Mascota, "id" | "nombre">;
  propietario: Pick<Propietario, "id" | "nombre" | "apellidoPaterno">;
  metodoPago: MetodoPago;
  monto: number;
  fecha: string;
}

export interface AtencionMedica {
  id: number;
  mascota: Pick<Mascota, "id" | "nombre" | "especie">;
  veterinario: Pick<Veterinario, "id" | "nombre" | "apellidoPaterno">;
  fecha: string;
  tipoServicio: string;
  diagnostico: string;
  tratamiento: string;
  examenesExternos?: string;
  peso?: number;
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

export interface RecordatorioEnviado {
  id: number;
  propietario: { nombre: string; apellidoPaterno: string };
  mensaje: string;
  canal: string;
  enviadoEn: string;
}

export interface CambioMascota {
  id: number;
  campo: string;
  valorAnterior?: string;
  valorNuevo?: string;
  fecha: string;
  usuario?: string; // nombre completo de quien hizo el cambio, si la cuenta sigue existiendo
}

// Ficha individual de mascota: línea de tiempo unificada (atenciones, controles
// preventivos, citas y ediciones manuales), cada evento resuelto a su tipo real
// para que el frontend no tenga que adivinar la forma del payload.
export type EventoHistorialMascota =
  | { tipo: "ATENCION"; fecha: string; atencion: AtencionMedica }
  | { tipo: "CONTROL"; fecha: string; control: ControlPreventivo }
  | { tipo: "CITA"; fecha: string; cita: Cita }
  | { tipo: "CAMBIO"; fecha: string; cambio: CambioMascota };
