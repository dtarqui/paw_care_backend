import { Router } from "express";
import { atencionController } from "../controllers/atencion.controller";
import { authController } from "../controllers/auth.controller";
import { citaController } from "../controllers/cita.controller";
import { controlPreventivoController } from "../controllers/controlPreventivo.controller";
import { dashboardController } from "../controllers/dashboard.controller";
import { exportacionController } from "../controllers/exportacion.controller";
import { horarioController } from "../controllers/horario.controller";
import { importacionController, uploadExcel } from "../controllers/importacion.controller";
import { mascotaController } from "../controllers/mascota.controller";
import { medicamentoController } from "../controllers/medicamento.controller";
import { pagoController } from "../controllers/pago.controller";
import { propietarioController } from "../controllers/propietario.controller";
import { recordatorioController } from "../controllers/recordatorio.controller";
import { reporteController } from "../controllers/reporte.controller";
import { usuarioController } from "../controllers/usuario.controller";
import { veterinarioController } from "../controllers/veterinario.controller";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";
import { loginRateLimit } from "../middlewares/rateLimit.middleware";

export const router = Router();

// Auth (HU1) — sin requireAuth, es el punto de entrada.
router.post("/auth/login", loginRateLimit, authController.login);

// Usuarios (HU1 · P02) — solo Administrador gestiona cuentas.
router.get("/usuarios", requireAuth, requireRole("ADMINISTRADOR"), usuarioController.listar);
router.post("/usuarios", requireAuth, requireRole("ADMINISTRADOR"), usuarioController.crear);
router.patch("/usuarios/:id/estado", requireAuth, requireRole("ADMINISTRADOR"), usuarioController.cambiarEstado);
router.patch("/usuarios/:id/rol", requireAuth, requireRole("ADMINISTRADOR"), usuarioController.cambiarRol);

// Dashboard (P01)
router.get("/dashboard/modulos", requireAuth, dashboardController.modulos);

// Propietarios (HU2 · P03)
router.get("/propietarios/buscar", requireAuth, propietarioController.buscar);
router.get("/propietarios", requireAuth, propietarioController.listar);
router.patch("/propietarios/:id", requireAuth, propietarioController.actualizar);

// Mascotas (HU2 · P04)
router.get("/mascotas", requireAuth, mascotaController.listar);
router.get("/mascotas/buscar", requireAuth, mascotaController.buscar);
router.post("/mascotas", requireAuth, mascotaController.crear);

// Ficha individual de mascota — datos completos, edición y línea de tiempo unificada
router.get("/mascotas/:id", requireAuth, mascotaController.detalle);
router.patch("/mascotas/:id", requireAuth, mascotaController.actualizar);
router.get("/mascotas/:id/historial", requireAuth, mascotaController.historial);
router.patch("/mascotas/:id/estado", requireAuth, mascotaController.cambiarEstado);

// Atención Médica (HU3 · P05)
router.get("/mascotas/:id/atenciones", requireAuth, atencionController.historial);
router.post("/atenciones", requireAuth, atencionController.crear);

// Veterinarios (soporte para selects de Nueva Cita / Nueva Atención)
router.get("/veterinarios", requireAuth, veterinarioController.listar);

// Horarios de atención por veterinario (HU1 · soporta la disponibilidad real de HU5)
router.get("/veterinarios/:id/horarios", requireAuth, horarioController.listar);
router.put("/veterinarios/:id/horarios", requireAuth, horarioController.actualizar);

// Citas (HU5 · P07)
router.get("/citas", requireAuth, citaController.listar);
router.get("/citas/disponibilidad", requireAuth, citaController.disponibilidad);
router.post("/citas", requireAuth, citaController.crear);
router.patch("/citas/:id/estado", requireAuth, citaController.cambiarEstado);
router.put("/citas/:id", requireAuth, citaController.reprogramar);

// Pagos (HU4 · P06)
router.get("/pagos/pendientes", requireAuth, pagoController.listarPendientes);
router.get("/pagos/historial", requireAuth, pagoController.historial);
router.post("/pagos", requireAuth, pagoController.registrar);

// Control Preventivo (HU6 · P08)
router.get("/mascotas/:id/controles-preventivos", requireAuth, controlPreventivoController.historial);
router.get("/controles-preventivos/proximos-a-vencer", requireAuth, controlPreventivoController.proximosAVencer);
router.post("/controles-preventivos", requireAuth, controlPreventivoController.crear);

// Inventario de Medicamentos (HU9 · P11) — solo Administrador
router.get("/medicamentos", requireAuth, requireRole("ADMINISTRADOR"), medicamentoController.listar);
router.get("/medicamentos/bajo-stock", requireAuth, requireRole("ADMINISTRADOR"), medicamentoController.bajoStock);
router.post("/medicamentos", requireAuth, requireRole("ADMINISTRADOR"), medicamentoController.crear);
router.patch("/medicamentos/:id", requireAuth, requireRole("ADMINISTRADOR"), medicamentoController.actualizar);
router.delete("/medicamentos/:id", requireAuth, requireRole("ADMINISTRADOR"), medicamentoController.eliminar);
router.post("/medicamentos/:id/entradas", requireAuth, requireRole("ADMINISTRADOR"), medicamentoController.registrarEntrada);

// Reportes (HU7 · P09, HU8 · P10) — solo Administrador
router.get("/reportes/ingresos", requireAuth, requireRole("ADMINISTRADOR"), reporteController.ingresos);
router.get("/reportes", requireAuth, requireRole("ADMINISTRADOR"), reporteController.general);
router.get("/reportes/export/excel", requireAuth, requireRole("ADMINISTRADOR"), reporteController.exportarExcel);
router.get("/reportes/export/pdf", requireAuth, requireRole("ADMINISTRADOR"), reporteController.exportarPdf);

// Recordatorios WhatsApp — Fase 7, HU11 Track A (envío semi-manual vía enlace wa.me)
router.get("/recordatorios/pendientes", requireAuth, recordatorioController.pendientes);
router.get("/recordatorios/historial", requireAuth, recordatorioController.historial);
router.post("/recordatorios/:id/marcar-enviado", requireAuth, recordatorioController.marcarEnviado);

// Exportación completa — Fase 7, HU15 — solo Administrador
router.get("/exportacion/completa", requireAuth, requireRole("ADMINISTRADOR"), exportacionController.completa);

// Importación desde Excel — Fase 7, HU13 — solo Administrador
router.post("/importaciones/clientes", requireAuth, requireRole("ADMINISTRADOR"), uploadExcel, importacionController.clientes);
