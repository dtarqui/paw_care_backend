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
    { id: "mascotas", titulo: "Mascotas", descripcion: "Gestión de mascotas y expedientes", ruta: "/app/mascotas", icono: "PawPrint" },
    { id: "atencion-medica", titulo: "Atención Médica", descripcion: "Historial médico y nuevas atenciones", ruta: "/app/atencion-medica", icono: "Stethoscope" },
    { id: "citas", titulo: "Citas", descripcion: "Gestión de citas médicas", ruta: "/app/citas", icono: "CalendarDays" },
    { id: "control-preventivo", titulo: "Control Preventivo", descripcion: "Vacunación y desparasitación", ruta: "/app/control-preventivo", icono: "ShieldPlus" },
    { id: "pagos", titulo: "Pagos", descripcion: "Gestión de pagos y facturación", ruta: "/app/pagos", icono: "Wallet" },
    { id: "usuarios", titulo: "Usuarios", descripcion: "Registro y gestión de cuentas", ruta: "/app/usuarios", icono: "Users" },
  ],
  VETERINARIO: [
    { id: "mascotas", titulo: "Mascotas", descripcion: "Buscar mascotas y ver historial", ruta: "/app/mascotas", icono: "PawPrint" },
    { id: "atencion-medica", titulo: "Atención Médica", descripcion: "Registrar diagnóstico y tratamiento", ruta: "/app/atencion-medica", icono: "Stethoscope" },
    { id: "citas", titulo: "Citas", descripcion: "Agenda de atenciones del día", ruta: "/app/citas", icono: "CalendarDays" },
    { id: "control-preventivo", titulo: "Control Preventivo", descripcion: "Vacunación y desparasitación", ruta: "/app/control-preventivo", icono: "ShieldPlus" },
  ],
  RECEPCIONISTA: [
    { id: "mascotas", titulo: "Mascotas", descripcion: "Registro de clientes y mascotas", ruta: "/app/mascotas", icono: "PawPrint" },
    { id: "citas", titulo: "Citas", descripcion: "Agendar, reprogramar y cancelar citas", ruta: "/app/citas", icono: "CalendarDays" },
    { id: "pagos", titulo: "Pagos", descripcion: "Registrar cobros por atención", ruta: "/app/pagos", icono: "Wallet" },
  ],
};

export const dashboardService = {
  modulosPara(rol: Rol): ModuloDashboard[] {
    return MODULOS_POR_ROL[rol];
  },
};
