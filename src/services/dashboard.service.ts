import { Rol } from "../types";

export interface ModuloDashboard {
  id: string;
  titulo: string;
  descripcion: string;
  ruta: string;
  icono: string; // nombre de ícono lucide-react, resuelto en el frontend
}

// Coincide con el mapa de navegación por rol de frontend/PANTALLAS.md (sección 1).
const MODULOS_POR_ROL: Record<Rol, ModuloDashboard[]> = {
  ADMINISTRADOR: [
    { id: "propietarios", titulo: "Propietarios", descripcion: "Registro y gestión de dueños de mascotas", ruta: "/app/propietarios", icono: "User" },
    { id: "mascotas", titulo: "Mascotas", descripcion: "Gestión de mascotas y expedientes", ruta: "/app/mascotas", icono: "PawPrint" },
    { id: "atencion-medica", titulo: "Atención Médica", descripcion: "Historial médico y nuevas atenciones", ruta: "/app/atencion-medica", icono: "Stethoscope" },
    { id: "citas", titulo: "Citas", descripcion: "Gestión de citas médicas", ruta: "/app/citas", icono: "CalendarDays" },
    { id: "control-preventivo", titulo: "Control Preventivo", descripcion: "Vacunación y desparasitación", ruta: "/app/control-preventivo", icono: "ShieldPlus" },
    { id: "pagos", titulo: "Pagos", descripcion: "Gestión de pagos y facturación", ruta: "/app/pagos", icono: "Wallet" },
    { id: "recordatorios", titulo: "Recordatorios", descripcion: "Avisos de citas y controles por WhatsApp", ruta: "/app/recordatorios", icono: "MessageCircle" },
    { id: "reportes", titulo: "Reportes", descripcion: "Ingresos y reportes clínicos", ruta: "/app/reportes", icono: "BarChart3" },
    { id: "inventario", titulo: "Inventario", descripcion: "Stock de medicamentos", ruta: "/app/inventario", icono: "Package" },
    { id: "usuarios", titulo: "Usuarios", descripcion: "Registro y gestión de cuentas", ruta: "/app/usuarios", icono: "Users" },
    { id: "horarios", titulo: "Horarios", descripcion: "Horario semanal de atención por veterinario", ruta: "/app/horarios", icono: "Clock" },
    { id: "auditoria", titulo: "Auditoría", descripcion: "Registro de acciones administrativas sensibles", ruta: "/app/auditoria", icono: "History" },
  ],
  VETERINARIO: [
    { id: "mascotas", titulo: "Mascotas", descripcion: "Buscar mascotas y ver historial", ruta: "/app/mascotas", icono: "PawPrint" },
    { id: "atencion-medica", titulo: "Atención Médica", descripcion: "Registrar diagnóstico y tratamiento", ruta: "/app/atencion-medica", icono: "Stethoscope" },
    { id: "citas", titulo: "Citas", descripcion: "Agenda de atenciones del día", ruta: "/app/citas", icono: "CalendarDays" },
    { id: "control-preventivo", titulo: "Control Preventivo", descripcion: "Vacunación y desparasitación", ruta: "/app/control-preventivo", icono: "ShieldPlus" },
    { id: "horarios", titulo: "Mi Horario", descripcion: "Tu horario semanal de atención", ruta: "/app/horarios", icono: "Clock" },
  ],
  RECEPCIONISTA: [
    { id: "propietarios", titulo: "Propietarios", descripcion: "Registro y gestión de dueños de mascotas", ruta: "/app/propietarios", icono: "User" },
    { id: "mascotas", titulo: "Mascotas", descripcion: "Registro de clientes y mascotas", ruta: "/app/mascotas", icono: "PawPrint" },
    { id: "citas", titulo: "Citas", descripcion: "Agendar, reprogramar y cancelar citas", ruta: "/app/citas", icono: "CalendarDays" },
    { id: "pagos", titulo: "Pagos", descripcion: "Registrar cobros por atención", ruta: "/app/pagos", icono: "Wallet" },
    { id: "recordatorios", titulo: "Recordatorios", descripcion: "Avisos de citas y controles por WhatsApp", ruta: "/app/recordatorios", icono: "MessageCircle" },
  ],
};

export const dashboardService = {
  modulosPara(rol: Rol): ModuloDashboard[] {
    return MODULOS_POR_ROL[rol];
  },
};
