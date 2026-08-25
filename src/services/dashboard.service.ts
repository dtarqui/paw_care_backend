import { Role } from "../types";

export interface DashboardModule {
  id: string;
  title: string; // texto visible — en español, como todo lo que ve el usuario
  description: string; // idem
  route: string;
  icon: string; // nombre de ícono lucide-react, resuelto en el frontend
}

// Coincide con el mapa de navegación por rol de frontend/PANTALLAS.md (sección 1).
// Los textos van en español a propósito: son lo que se muestra en el sidebar y el
// dashboard. Los identificadores y rutas van en inglés, como el resto del código.
const MODULES_BY_ROLE: Record<Role, DashboardModule[]> = {
  ADMIN: [
    { id: "owners", title: "Propietarios", description: "Registro y gestión de dueños de mascotas", route: "/app/owners", icon: "User" },
    { id: "pets", title: "Mascotas", description: "Gestión de mascotas y expedientes", route: "/app/pets", icon: "PawPrint" },
    { id: "medical-visits", title: "Atención Médica", description: "Historial médico y nuevas atenciones", route: "/app/medical-visits", icon: "Stethoscope" },
    { id: "appointments", title: "Citas", description: "Gestión de citas médicas", route: "/app/appointments", icon: "CalendarDays" },
    { id: "preventive-controls", title: "Control Preventivo", description: "Vacunación y desparasitación", route: "/app/preventive-controls", icon: "ShieldPlus" },
    { id: "payments", title: "Pagos", description: "Gestión de pagos y facturación", route: "/app/payments", icon: "Wallet" },
    { id: "reminders", title: "Recordatorios", description: "Avisos de citas y controles por WhatsApp", route: "/app/reminders", icon: "MessageCircle" },
    { id: "reports", title: "Reportes", description: "Ingresos y reportes clínicos", route: "/app/reports", icon: "BarChart3" },
    { id: "inventory", title: "Inventario", description: "Stock de medicamentos", route: "/app/inventory", icon: "Package" },
    { id: "users", title: "Usuarios", description: "Registro y gestión de cuentas", route: "/app/users", icon: "Users" },
    { id: "schedules", title: "Horarios", description: "Horario semanal de atención por veterinario", route: "/app/schedules", icon: "Clock" },
    { id: "audit-log", title: "Auditoría", description: "Registro de acciones administrativas sensibles", route: "/app/audit-log", icon: "History" },
  ],
  VET: [
    { id: "pets", title: "Mascotas", description: "Buscar mascotas y ver historial", route: "/app/pets", icon: "PawPrint" },
    { id: "medical-visits", title: "Atención Médica", description: "Registrar diagnóstico y tratamiento", route: "/app/medical-visits", icon: "Stethoscope" },
    { id: "appointments", title: "Citas", description: "Agenda de atenciones del día", route: "/app/appointments", icon: "CalendarDays" },
    { id: "preventive-controls", title: "Control Preventivo", description: "Vacunación y desparasitación", route: "/app/preventive-controls", icon: "ShieldPlus" },
    { id: "schedules", title: "Mi Horario", description: "Tu horario semanal de atención", route: "/app/schedules", icon: "Clock" },
  ],
  RECEPTIONIST: [
    { id: "owners", title: "Propietarios", description: "Registro y gestión de dueños de mascotas", route: "/app/owners", icon: "User" },
    { id: "pets", title: "Mascotas", description: "Registro de clientes y mascotas", route: "/app/pets", icon: "PawPrint" },
    { id: "appointments", title: "Citas", description: "Agendar, reprogramar y cancelar citas", route: "/app/appointments", icon: "CalendarDays" },
    { id: "payments", title: "Pagos", description: "Registrar cobros por atención", route: "/app/payments", icon: "Wallet" },
    { id: "reminders", title: "Recordatorios", description: "Avisos de citas y controles por WhatsApp", route: "/app/reminders", icon: "MessageCircle" },
  ],
};

export const dashboardService = {
  modulesFor(role: Role): DashboardModule[] {
    return MODULES_BY_ROLE[role];
  },
};
