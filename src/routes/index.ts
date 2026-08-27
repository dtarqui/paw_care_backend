import { Router } from "express";
import { appointmentController } from "../controllers/appointment.controller";
import { auditLogController } from "../controllers/auditLog.controller";
import { loginEventController } from "../controllers/loginEvent.controller";
import { authController } from "../controllers/auth.controller";
import { dashboardController } from "../controllers/dashboard.controller";
import { exportController } from "../controllers/export.controller";
import { importController, uploadExcel } from "../controllers/import.controller";
import { medicalVisitController } from "../controllers/medicalVisit.controller";
import { medicationController } from "../controllers/medication.controller";
import { ownerController } from "../controllers/owner.controller";
import { paymentController } from "../controllers/payment.controller";
import { petController } from "../controllers/pet.controller";
import { preventiveControlController } from "../controllers/preventiveControl.controller";
import { qrPaymentController } from "../controllers/qrPayment.controller";
import { reminderController } from "../controllers/reminder.controller";
import { reportController } from "../controllers/report.controller";
import { scheduleController } from "../controllers/schedule.controller";
import { searchController } from "../controllers/search.controller";
import { userController } from "../controllers/user.controller";
import { vetController } from "../controllers/vet.controller";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";
import {
  forgotPasswordRateLimit,
  loginRateLimit,
  preRegistrationRateLimit,
} from "../middlewares/rateLimit.middleware";

export const router = Router();

// Auth (HU1) — sin requireAuth, es el punto de entrada.
router.post("/auth/login", loginRateLimit, authController.login);
router.post("/auth/forgot-password", forgotPasswordRateLimit, authController.requestPasswordRecovery);
router.post("/auth/reset-password", forgotPasswordRateLimit, authController.resetWithToken);

// Preregistro público de Veterinario — sin requireAuth (igual que login); la cuenta
// queda INACTIVE hasta que un Administrador la aprueba desde /app/users.
router.post("/users/pre-register", preRegistrationRateLimit, userController.preRegister);

// Invitación de Veterinario por un Administrador — convive con el preregistro público
// de arriba. Validar/aceptar son públicos (la persona invitada todavía no tiene cuenta).
router.get("/users/invitations", requireAuth, requireRole("ADMIN"), userController.listInvitations);
router.post("/users/invitations", requireAuth, requireRole("ADMIN"), userController.invite);
router.delete("/users/invitations/:id", requireAuth, requireRole("ADMIN"), userController.cancelInvitation);
router.get("/users/invitations/validate/:token", userController.validateInvitation);
router.post("/users/invitations/accept/:token", preRegistrationRateLimit, userController.acceptInvitation);

// Usuarios (HU1 · P02) — solo Administrador gestiona cuentas.
router.get("/users", requireAuth, requireRole("ADMIN"), userController.list);
router.post("/users", requireAuth, requireRole("ADMIN"), userController.create);
router.patch("/users/:id/status", requireAuth, requireRole("ADMIN"), userController.changeStatus);
router.patch("/users/:id/role", requireAuth, requireRole("ADMIN"), userController.changeRole);
// Orden importante: la ruta literal /users/me/password va ANTES de /users/:id/password,
// si no Express hace que :id matchee el string "me".
router.patch("/users/me/password", requireAuth, userController.changePassword);
router.patch("/users/:id/password", requireAuth, requireRole("ADMIN"), userController.resetPassword);

// Auditoría — solo Administrador
router.get("/audit-logs", requireAuth, requireRole("ADMIN"), auditLogController.list);
// Quién entró, cuándo y desde qué IP — incluidos los intentos fallidos.
router.get("/login-events", requireAuth, requireRole("ADMIN"), loginEventController.list);

// Búsqueda global (Ctrl/Cmd+K) — una sola caja que resuelve "¿quién es Rocky?" sin
// saber de antemano en qué pantalla mirar. Qué entidades cubre lo definen los
// proveedores registrados en services/search/search.service.ts.
router.get("/search", requireAuth, searchController.search);

// Dashboard (P01)
router.get("/dashboard/modules", requireAuth, dashboardController.modules);

// Propietarios (HU2 · P03)
router.get("/owners/search", requireAuth, ownerController.search);
router.get("/owners", requireAuth, ownerController.list);
router.patch("/owners/:id", requireAuth, ownerController.update);

// Mascotas (HU2 · P04)
router.get("/pets", requireAuth, petController.list);
router.get("/pets/search", requireAuth, petController.search);
router.post("/pets", requireAuth, petController.create);

// Ficha individual de mascota — datos completos, edición y línea de tiempo unificada
router.get("/pets/:id", requireAuth, petController.detail);
router.patch("/pets/:id", requireAuth, petController.update);
router.get("/pets/:id/history", requireAuth, petController.history);
router.patch("/pets/:id/status", requireAuth, petController.changeStatus);

// Atención Médica (HU3 · P05)
router.get("/pets/:id/visits", requireAuth, medicalVisitController.history);
router.post("/visits", requireAuth, medicalVisitController.create);

// Veterinarios (soporte para selects de Nueva Cita / Nueva Atención)
router.get("/vets", requireAuth, vetController.list);

// Horarios de atención por veterinario (HU1 · soporta la disponibilidad real de HU5)
router.get("/vets/:id/schedules", requireAuth, scheduleController.list);
router.put("/vets/:id/schedules", requireAuth, scheduleController.update);

// Citas (HU5 · P07)
router.get("/appointments", requireAuth, appointmentController.list);
router.get("/appointments/availability", requireAuth, appointmentController.availability);
router.post("/appointments", requireAuth, appointmentController.create);
router.patch("/appointments/:id/status", requireAuth, appointmentController.changeStatus);
router.put("/appointments/:id", requireAuth, appointmentController.reschedule);

// Pagos (HU4 · P06)
router.get("/payments/pending", requireAuth, paymentController.listPending);
router.get("/payments/history", requireAuth, paymentController.history);
router.post("/payments", requireAuth, paymentController.register);

// Cobro por QR bancario (sesión 6) — genera un QR real vía el banco elegido para
// "QR Simple" (ver lib/qrPayment.ts, hoy sin conectar de verdad) y lo confirma cuando
// el banco notifica el pago. El webhook es público: lo llama el banco, no un
// usuario logueado — se protege con un secreto compartido, no con JWT.
router.post("/payments/qr", requireAuth, qrPaymentController.generate);
router.get("/payments/qr/:id", requireAuth, qrPaymentController.get);
router.post("/payments/qr/webhook", qrPaymentController.webhook);

// Control Preventivo (HU6 · P08)
router.get("/pets/:id/preventive-controls", requireAuth, preventiveControlController.history);
router.get("/preventive-controls/upcoming", requireAuth, preventiveControlController.upcoming);
router.post("/preventive-controls", requireAuth, preventiveControlController.create);

// Inventario de Medicamentos (HU9 · P11) — solo Administrador
router.get("/medications", requireAuth, requireRole("ADMIN"), medicationController.list);
router.get("/medications/low-stock", requireAuth, requireRole("ADMIN"), medicationController.lowStock);
router.post("/medications", requireAuth, requireRole("ADMIN"), medicationController.create);
router.patch("/medications/:id", requireAuth, requireRole("ADMIN"), medicationController.update);
router.delete("/medications/:id", requireAuth, requireRole("ADMIN"), medicationController.remove);
router.post("/medications/:id/stock-entries", requireAuth, requireRole("ADMIN"), medicationController.registerStockIn);

// Reportes (HU7 · P09, HU8 · P10) — solo Administrador
router.get("/reports/revenue", requireAuth, requireRole("ADMIN"), reportController.revenue);
router.get("/reports", requireAuth, requireRole("ADMIN"), reportController.general);
router.get("/reports/export/excel", requireAuth, requireRole("ADMIN"), reportController.exportExcel);
router.get("/reports/export/pdf", requireAuth, requireRole("ADMIN"), reportController.exportPdf);

// Recordatorios WhatsApp — Fase 7, HU11 Track A (envío semi-manual vía enlace wa.me)
router.get("/reminders/pending", requireAuth, reminderController.pending);
router.get("/reminders/history", requireAuth, reminderController.history);
router.post("/reminders/:id/mark-sent", requireAuth, reminderController.markSent);

// Exportación completa — Fase 7, HU15 — solo Administrador
router.get("/exports/full", requireAuth, requireRole("ADMIN"), exportController.full);

// Importación desde Excel — Fase 7, HU13 — solo Administrador
router.post("/imports/clients", requireAuth, requireRole("ADMIN"), uploadExcel, importController.clients);
