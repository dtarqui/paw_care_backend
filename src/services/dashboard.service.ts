import { Role } from "../types";

/** Grupos del sidebar. El orden de este arreglo es el orden en que se muestran. */
export const MODULE_GROUPS = [
  { id: "clients", title: "Clientes" },
  { id: "clinic", title: "Clínica" },
  { id: "admin", title: "Administración" },
  { id: "system", title: "Sistema" },
] as const;

export type ModuleGroupId = (typeof MODULE_GROUPS)[number]["id"];

export interface DashboardModule {
  id: string;
  title: string; // texto visible — en español, como todo lo que ve el usuario
  description: string; // idem
  route: string;
  icon: string; // nombre de ícono lucide-react, resuelto en el frontend
  group: ModuleGroupId;
  /** Sub-secciones disponibles dentro del módulo, cuando la pantalla agrupa más de
   * una funcionalidad en pestañas. El frontend traduce cada id a su etiqueta; que la
   * lista venga de acá evita volver a tener una tabla de permisos por rol en la UI. */
  tabs?: string[];
}

// Coincide con el mapa de navegación por rol de docs/PANTALLAS.md (sección 1).
// Los textos van en español a propósito: son lo que se muestra en el sidebar y el
// dashboard. Los identificadores y rutas van en inglés, como el resto del código.
const MODULES_BY_ROLE: Record<Role, DashboardModule[]> = {
  ADMIN: [
    { id: "owners", title: "Propietarios", description: "Registro y gestión de dueños de mascotas", route: "/app/owners", icon: "User", group: "clients" },
    { id: "pets", title: "Mascotas", description: "Gestión de mascotas y expedientes", route: "/app/pets", icon: "PawPrint", group: "clients" },

    // Citas y Horarios viven en la misma pantalla: el horario del veterinario es lo
    // que define qué bloques quedan libres, así que tenerlos separados obligaba a
    // saltar de pantalla para entender la disponibilidad.
    { id: "agenda", title: "Agenda", description: "Citas y horarios de atención", route: "/app/appointments", icon: "CalendarDays", group: "clinic", tabs: ["list", "new", "schedules"] },
    { id: "medical-visits", title: "Atención Médica", description: "Historial médico y nuevas atenciones", route: "/app/medical-visits", icon: "Stethoscope", group: "clinic" },
    { id: "preventive-controls", title: "Control Preventivo", description: "Vacunación y desparasitación", route: "/app/preventive-controls", icon: "ShieldPlus", group: "clinic" },
    { id: "reminders", title: "Recordatorios", description: "Avisos de citas y controles por WhatsApp", route: "/app/reminders", icon: "MessageCircle", group: "clinic" },

    { id: "payments", title: "Pagos", description: "Gestión de pagos y facturación", route: "/app/payments", icon: "Wallet", group: "admin" },
    { id: "inventory", title: "Inventario", description: "Stock de medicamentos", route: "/app/inventory", icon: "Package", group: "admin" },
    { id: "reports", title: "Reportes", description: "Ingresos y reportes clínicos", route: "/app/reports", icon: "BarChart3", group: "admin" },

    // La auditoría es el registro de acciones administrativas sobre cuentas: se lee
    // junto al listado de usuarios, no como una pantalla aparte.
    { id: "users", title: "Usuarios", description: "Cuentas, roles, auditoría e ingresos al sistema", route: "/app/users", icon: "Users", group: "system", tabs: ["list", "audit", "logins"] },
    { id: "info", title: "Información", description: "Manual de uso del sistema", route: "/app/info", icon: "BookOpen", group: "system" },
    { id: "settings", title: "Configuración", description: "Apariencia y datos de tu cuenta", route: "/app/settings", icon: "Settings", group: "system" },
  ],
  VET: [
    { id: "pets", title: "Mascotas", description: "Buscar mascotas y ver historial", route: "/app/pets", icon: "PawPrint", group: "clients" },

    { id: "agenda", title: "Agenda", description: "Tus citas y tu horario de atención", route: "/app/appointments", icon: "CalendarDays", group: "clinic", tabs: ["list", "new", "schedules"] },
    { id: "medical-visits", title: "Atención Médica", description: "Registrar diagnóstico y tratamiento", route: "/app/medical-visits", icon: "Stethoscope", group: "clinic" },
    { id: "preventive-controls", title: "Control Preventivo", description: "Vacunación y desparasitación", route: "/app/preventive-controls", icon: "ShieldPlus", group: "clinic" },

    { id: "info", title: "Información", description: "Manual de uso del sistema", route: "/app/info", icon: "BookOpen", group: "system" },
    { id: "settings", title: "Configuración", description: "Apariencia y datos de tu cuenta", route: "/app/settings", icon: "Settings", group: "system" },
  ],
  RECEPTIONIST: [
    { id: "owners", title: "Propietarios", description: "Registro y gestión de dueños de mascotas", route: "/app/owners", icon: "User", group: "clients" },
    { id: "pets", title: "Mascotas", description: "Registro de clientes y mascotas", route: "/app/pets", icon: "PawPrint", group: "clients" },

    // Sin la pestaña de horarios: una recepcionista agenda citas, pero no edita el
    // horario de atención de los veterinarios.
    { id: "agenda", title: "Agenda", description: "Agendar, reprogramar y cancelar citas", route: "/app/appointments", icon: "CalendarDays", group: "clinic", tabs: ["list", "new"] },
    { id: "reminders", title: "Recordatorios", description: "Avisos de citas y controles por WhatsApp", route: "/app/reminders", icon: "MessageCircle", group: "clinic" },

    { id: "payments", title: "Pagos", description: "Registrar cobros por atención", route: "/app/payments", icon: "Wallet", group: "admin" },

    { id: "info", title: "Información", description: "Manual de uso del sistema", route: "/app/info", icon: "BookOpen", group: "system" },
    { id: "settings", title: "Configuración", description: "Apariencia y datos de tu cuenta", route: "/app/settings", icon: "Settings", group: "system" },
  ],
};

export const dashboardService = {
  modulesFor(role: Role): DashboardModule[] {
    return MODULES_BY_ROLE[role];
  },

  /** Solo los grupos que efectivamente tienen módulos para ese rol, en orden. */
  groupsFor(role: Role) {
    const used = new Set(MODULES_BY_ROLE[role].map((m) => m.group));
    return MODULE_GROUPS.filter((g) => used.has(g.id));
  },
};
