import { Router } from "express";
import { atencionController } from "../controllers/atencion.controller";
import { authController } from "../controllers/auth.controller";
import { citaController } from "../controllers/cita.controller";
import { controlPreventivoController } from "../controllers/controlPreventivo.controller";
import { dashboardController } from "../controllers/dashboard.controller";
import { mascotaController } from "../controllers/mascota.controller";
import { pagoController } from "../controllers/pago.controller";
import { propietarioController } from "../controllers/propietario.controller";
import { usuarioController } from "../controllers/usuario.controller";
import { veterinarioController } from "../controllers/veterinario.controller";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";

export const router = Router();

// Auth (HU1) — sin requireAuth, es el punto de entrada.
router.post("/auth/login", authController.login);

// Usuarios (HU1 · P02) — solo Administrador gestiona cuentas.
router.get("/usuarios", requireAuth, requireRole("ADMINISTRADOR"), usuarioController.listar);
router.post("/usuarios", requireAuth, requireRole("ADMINISTRADOR"), usuarioController.crear);

// Dashboard (P01)
router.get("/dashboard/modulos", requireAuth, dashboardController.modulos);

// Propietarios (HU2 · P03)
router.get("/propietarios/buscar", requireAuth, propietarioController.buscar);

// Mascotas (HU2 · P04)
router.get("/mascotas", requireAuth, mascotaController.listar);
router.get("/mascotas/buscar", requireAuth, mascotaController.buscar);
router.post("/mascotas", requireAuth, mascotaController.crear);

// Atención Médica (HU3 · P05)
router.get("/mascotas/:id/atenciones", requireAuth, atencionController.historial);
router.post("/atenciones", requireAuth, atencionController.crear);

// Veterinarios (soporte para selects de Nueva Cita / Nueva Atención)
router.get("/veterinarios", requireAuth, veterinarioController.listar);

// Citas (HU5 · P07)
router.get("/citas", requireAuth, citaController.listar);
router.get("/citas/disponibilidad", requireAuth, citaController.disponibilidad);
router.post("/citas", requireAuth, citaController.crear);
router.patch("/citas/:id/estado", requireAuth, citaController.cambiarEstado);
router.put("/citas/:id", requireAuth, citaController.reprogramar);

// Pagos (HU4 · P06)
router.get("/pagos/pendientes", requireAuth, pagoController.listarPendientes);
router.post("/pagos", requireAuth, pagoController.registrar);

// Control Preventivo (HU6 · P08)
router.get("/mascotas/:id/controles-preventivos", requireAuth, controlPreventivoController.historial);
router.get("/controles-preventivos/proximos-a-vencer", requireAuth, controlPreventivoController.proximosAVencer);
router.post("/controles-preventivos", requireAuth, controlPreventivoController.crear);
