# Backend — Cola de tareas para construcción

> Extraído de `docs/PLAN_PROYECTO_PAWCARE.md` (referencia, no editar desde aquí). Cada tarea es un prompt autocontenido, en orden de ejecución. Un job/agente debe procesarlas en secuencia, sin saltar una tarea hasta cumplir su Definition of Done.

**Stack:** Node.js + Express + TypeScript + Prisma sobre PostgreSQL. Esquema ya definido en [`prisma/schema.prisma`](prisma/schema.prisma) (copiado de `database/MODELO_DATOS.md`).

**Definition of Done por tarea:** endpoint(s) implementados · validaciones de los criterios de aceptación cubiertas · pruebas Jest + Supertest de los casos éxito/error · sin lógica de frontend mezclada aquí (eso vive en `frontend/TASKS.md`).

---

## Progreso

> **⚠️ Nombres antiguos en el historial:** todo lo que sigue (Progreso y sesiones 1–6) quedó escrito con los nombres en español que el proyecto usaba en ese momento (`Mascota`, `/api/mascotas`, `estado: ACTIVO`, …). En la **sesión 7** el código pasó íntegramente a inglés y las tablas al prefijo `st_` — se dejó el historial tal cual, como registro de lo que se hizo cuándo. Para traducir cualquier nombre viejo al actual, usá [`docs/GLOSARIO_EN_ES.md`](../docs/GLOSARIO_EN_ES.md).

> **Nota de arquitectura (actualizada):** el backend ya corre sobre **Prisma + PostgreSQL (Supabase)**, no sobre datos en memoria. Misma arquitectura en capas (routes → controllers → services → repositories); `repositories/` es la única capa que importa `../lib/prisma`, tal como estaba planeado desde el modo demo — la migración solo tocó esa capa (y volvió `async` a cada service/controller que la usa). `src/data/*.ts` ya no existe. Semilla de datos demo: `npm run db:seed` (o `npm run db:reset` para recrear todo desde cero). Ver también la nota de contraseñas más abajo.

- [x] Tarea 00 — Setup del backend — completo: estructura en capas, Prisma conectado a Supabase, migraciones aplicadas (`prisma/migrations/`)
- [x] Tarea 01 — HU1: Autenticación y Roles — incluye además `GET/POST /api/usuarios` (listado y alta, con creación automática del `Veterinario` vinculado cuando el rol lo requiere)
- [x] Tarea 02 — HU2: Registro de Mascotas y Cliente — incluye `GET /api/propietarios/buscar`
- [x] Tarea 03 — HU3: Gestionar Atención Médica — `GET /api/mascotas/buscar`, `GET /api/mascotas/:id/atenciones`, `POST /api/atenciones`
- [x] Tarea 04 — HU4: Registrar Pagos — reescrito para derivar "pendientes" en vivo de `AtencionMedica.estadoPago`, en vez de una lista separada
- [x] Tarea 05 — HU5: Agendar, Reprogramar y Cancelar Citas — incluye `PUT /api/citas/:id` (reprogramar) con la misma restricción de rol que crear
- [x] Tarea 06 — HU6: Control de Vacunación y Desparasitación
- [x] Tarea 07 — HU7: Reporte de Ingresos Económicos — `GET /api/reportes/ingresos` (filtros: fecha, tipoServicio, metodoPago + totales)
- [x] Tarea 08 — HU8: Reportes Clínicos y Administrativos — `GET /api/reportes` (atenciones | ingresos-por-servicio), `GET /api/reportes/export/excel` y `/export/pdf` (ExcelJS + PDFKit)
- [x] Tarea 09 — HU9: Gestión de Inventario de Medicamentos — `Medicamento` + `MovimientoInventario`; `POST /api/atenciones` acepta medicamentos consumidos y descuenta stock en la misma transacción lógica
- [x] Tarea 10 — HU10: Sistema de Alertas Automáticas — resuelto como el mismo cálculo que usa la Tarea 11 (recordatorios), en vez de un job en segundo plano separado
- [x] Tarea 11 (opcional) — HU11 Track A: WhatsApp manual — `GET /api/recordatorios/pendientes` (citas <24h + controles <7 días, calculado en vivo) y `POST /api/recordatorios/:id/marcar-enviado`
- [ ] Tarea 12 (opcional) — HU11 Track B: WhatsApp Cloud API — **fuera de alcance a propósito**: necesita credenciales reales de Meta, no se puede simular de forma honesta con datos locales
- [x] Tarea 13 (opcional) — HU12: Pago por QR — el enum `MetodoPago` ya incluye `QR`; confirmado que se filtra correctamente en `reporte.service.ts`
- [x] Tarea 14 (opcional) — HU13: Importación desde Excel — `POST /api/importaciones/clientes` (multer + ExcelJS), reutiliza la misma lógica de deduplicación de propietario que HU2
- [x] Tarea 15 (opcional) — HU15: Exportación completa de datos — `GET /api/exportacion/completa`, una hoja por entidad (Usuarios sin password, Veterinarios, Propietarios, Mascotas, Citas, AtencionesMedicas, Pagos, ControlesPreventivos, Medicamentos)

**Todo lo planeado está construido**, salvo HU11 Track B (documentado como fuera de alcance por depender de un servicio externo real).

**Restricción de negocio agregada (no estaba en el prompt original de HU5):** un usuario con rol Veterinario solo puede crear o reprogramar citas para sí mismo — Administrador y Recepcionista pueden hacerlo para cualquier veterinario. Implementado en `cita.service.ts` (`AgendaAjenaError`, 403), usando el vínculo `Veterinario.usuarioId`. La misma idea se reutilizó para bloquear el selector de veterinario en Nueva Atención (HU3) en el frontend.

**Cambio de modelo no previsto en el prompt original:** `AtencionMedica` ganó un campo `tipoServicio` (mismo catálogo que `Cita.tipoConsulta`) — sin él, HU7/HU8 no tenían cómo agrupar ingresos "por tipo de servicio". Ya se propagó a `database/MODELO_DATOS.md` y a `prisma/schema.prisma` (tabla de campos, bloque Prisma e índice `(tipoServicio, fecha)`).

**Cambio de modelo no previsto en el prompt original (2):** el esquema real exige que todo `Veterinario` tenga una cuenta `Usuario` propia (`usuarioId` único y obligatorio — así estaba documentado, pero el modo demo solo le daba cuenta a uno de los tres). Ahora los 3 veterinarios sembrados tienen login: `veterinario/vet123` (Luis, como antes), y además `carlos.andrade/vet123` y `maria.rodriguez/vet123`.

**Autenticación real:** `Usuario.passwordHash` ahora es un hash de `bcryptjs` (no texto plano). `auth.service.ts` compara con `bcrypt.compare`; `usuario.repository.ts` hashea al crear. Las contraseñas demo (`admin123`, `vet123`, `recepcion123`) se mantienen solo como valores de siembra, nunca se guardan en claro.

**Conexión a Supabase:** `backend/.env` define `DATABASE_URL` (pooler, puerto 6543, `pgbouncer=true`) y `DIRECT_URL` (conexión directa, puerto 5432, usada por `prisma migrate`). `GET /health` reporta el estado real de la conexión (`db.status`, `db.latenciaMs`) además de uptime.

**Fechas en columnas `@db.Date` (sin hora):** Prisma normaliza `Mascota.fechaNacimiento`, `ControlPreventivo.fechaAplicacion` y `.proximaDosis` a medianoche UTC del calendario guardado, sin importar la zona horaria del proceso — a diferencia de los `DateTime` normales (`Cita.fechaHora`, `AtencionMedica.fecha`, etc.), que se tratan con getters/constructores LOCALES en todo el resto del código (ver `utils/date.ts`). Por eso existen dos pares de helpers: `literalToDate`/`dateToLiteral` (locales, para `DateTime`) y `literalDateOnlyToDate`/`dateOnlyToLiteral` (UTC, exclusivos para `@db.Date`). Mezclarlos corre la fecha un día — quedó cubierto en `mascota.repository.ts` y `controlPreventivo.repository.ts`.

*(HU14 — PWA instalable — no requiere trabajo de backend; ver `frontend/TASKS.md`.)*

---

## Gaps cerrados (sesión posterior — análisis de brechas contra este documento)

- [x] **Ficha individual de mascota** — `GET/PATCH /api/mascotas/:id`, `GET /api/mascotas/:id/historial` (línea de tiempo unificada: atenciones, controles, citas y ediciones manuales). Modelo nuevo `CambioMascota` (bitácora de ediciones) y campo `AtencionMedica.peso` (opcional, alimenta el historial de peso sin tabla propia).
- [x] **Índice único parcial de Cita** — migración manual aplicada (ver nota más arriba y `database/MODELO_DATOS.md` sección 5); `cita.service.ts` traduce el choque de índice (Prisma `P2002`) a `ConflictoDeAgendaError` en vez de un 500 crudo.
- [x] **Desactivar usuario/veterinario** — `PATCH /api/usuarios/:id/estado`. Se corrigió un bug real: `auth.service.ts` nunca chequeaba `Usuario.estado`, así que una cuenta `INACTIVO` podía seguir logueándose. Ahora se bloquea con el mismo mensaje genérico que una contraseña incorrecta. Al desactivar un Veterinario, su registro `Veterinario.estado` se sincroniza — `GET /api/veterinarios?activos=true` (usado por los selects de Nueva Cita/Nueva Atención/Horarios) ya no lo ofrece.
- [x] **Hardening de producción** — `helmet()`, CORS restringido por `FRONTEND_URL` (abierto si no está configurada), rate-limit de 10 intentos/15min en `POST /api/auth/login` (`middlewares/rateLimit.middleware.ts`).
- [x] **Pruebas automatizadas (Jest + Supertest)** — no existían. Se agregó `jest.config.ts` + mock manual de `lib/prisma.ts` (`jest-mock-extended`, sin tocar Supabase — apto para CI sin secretos). Cubre `auth.service`, `pago.service`, `cita.service` (mockeando repositorios, no Prisma, por la complejidad de los `include` anidados) y un test end-to-end de `POST /api/auth/login` contra `createApp()`. `npm test`.
- [x] **CI básico** — `.github/workflows/ci.yml`: `npm ci` → `prisma generate` → `tsc --noEmit` → `npm test`, en push/PR a `main`.
- [x] **Pantalla de Propietarios (CRUD)** — `GET /api/propietarios` (con conteo de mascotas vía `_count`), `PATCH /api/propietarios/:id`. El `ci` no es editable a propósito (es la clave de búsqueda usada en HU2/HU3).
- [x] **Gestión de Horarios de veterinario** — la tabla `Horario` existía en el schema desde el diseño original pero nunca se usaba; la disponibilidad de citas (HU5) dependía de un bloque horario fijo hardcodeado (`BLOQUES_HORARIO`). Ahora `citaService.disponibilidad` calcula los bloques reales desde `Horario` según el `diaSemana` de la fecha consultada — un veterinario sin horario cargado ese día queda sin disponibilidad. `GET/PUT /api/veterinarios/:id/horarios` (mismo criterio de permisos que citas: un Veterinario solo edita el suyo). Se sembraron horarios Lun-Vie 08:00-12:00 y 14:00-16:30 para los 3 veterinarios demo (reproduce exactamente los bloques que daba el array fijo, para no romper la demo). **Nota técnica:** se comprobó empíricamente que `@db.Time` (a diferencia de `@db.Date`) sí se comporta como un `DateTime` normal con getters locales — ver `horaLiteralToDate`/`dateToHoraLiteral` en `utils/date.ts`.
- [x] **Paginación** — `GET /mascotas`, `GET /citas`, `GET /usuarios` aceptan `?page=&pageSize=` (máx. 100) y devuelven `{ total, page, pageSize }` además del arreglo. `findAll()` sin paginar se mantiene intacto para los consumidores internos que necesitan el set completo (exportación completa, cálculo de recordatorios).

**Todo lo del análisis de gaps está cerrado.**

---

## Correcciones y mejoras (sesión 3 — feedback de uso real)

Tras usar la app en vivo, el usuario reportó un bug y varios huecos de producto. Todo lo siguiente está cerrado y verificado contra Supabase real:

- [x] **Cambio de rol de usuario** — `PATCH /api/usuarios/:id/rol` (`requireRole('ADMINISTRADOR')`). `usuario.service.ts#cambiarRol`: si el nuevo rol es `VETERINARIO` y el usuario no tiene un `Veterinario` vinculado, exige `matricula`/`especialidad` y lo crea; si ya tenía uno (de un cambio de rol anterior), lo reactiva en vez de duplicarlo (`Veterinario.usuarioId` es único). Si deja de ser `VETERINARIO`, el registro `Veterinario` no se borra (FK `Restrict` desde `Cita`/`AtencionMedica`) — se desactiva, igual que ya hacía `cambiarEstado`.
- [x] **CRUD completo de Medicamentos** — el descuento de stock por consumo en atención ya funcionaba (`atencion.service.ts` → `medicamentoService.consumirParaAtencion`); lo que faltaba era el catálogo. `POST /api/medicamentos` (crea, opcionalmente con `stockInicial` que genera un movimiento `ENTRADA`), `PATCH /api/medicamentos/:id` (nombre/stockMinimo — nunca `stockActual` directo, eso solo cambia vía entrada/consumo), `DELETE /api/medicamentos/:id` (bloqueado con 409 si el medicamento ya tiene `MovimientoInventario` asociados — `onDelete: Restrict`).
- [x] **Historial de últimas transacciones** — `GET /api/pagos/historial?limit=5` (`pagoRepository.findRecientes`, con mascota/propietario incluidos) y `GET /api/recordatorios/historial?limit=5` (`notificacionRepository.findRecientesEnviados`, filtrando `Notificacion.estado = ENVIADO`). Antes solo existían las vistas de "pendientes".
- [x] **Eliminar mascota (borrado lógico)** — igual que Usuario/Veterinario, se agregó `Mascota.estado: EstadoRegistro` (migración `20260731053116_mascota_estado`) porque un borrado físico choca con los FK `Restrict` de `Cita`/`AtencionMedica` en cuanto la mascota tiene cualquier historial. `PATCH /api/mascotas/:id/estado`. `GET /mascotas` filtra `ACTIVO` por defecto (`?activas=false` para incluir inactivas); `findByPropietarioCi` (usado por los buscadores de Atención Médica/Citas) también filtra activas; `detalle`/`findById` no filtran, para poder ver y reactivar una mascota inactiva desde su propia ficha.
- [x] **Propietarios — datos completos** — `propietarioRepository.findAll()` ahora incluye `mascotas: {id, nombre}` (antes solo un `_count`) y expone `direccion` (existía en el schema desde el diseño original, pero nunca se leía ni se dejaba editar).

**Bug corregido (solo frontend, sin cambios de API):** la grilla de Horarios reasignaba turno1/turno2 por orden de `horaInicio` al recargar en vez de por franja horaria real, así que un día con solo el turno de tarde activo aparecía marcado en el switch de "mañana". El backend no guarda una etiqueta de turno — sigue siendo una lista plana de bloques por día — el fix fue puramente de reconstrucción en el frontend (ver `frontend/TASKS.md`).

**Datos demo regenerados:** `prisma/seed.ts` ahora empieza con un `deleteMany` en cascada FK-safe (antes asumía base vacía) y siembra el doble de contenido con nombres nuevos — 4 propietarios, 10 mascotas, 8 usuarios (6 veterinarios + admin/recepción, mismas credenciales), 10 citas, 8 controles preventivos, 10 medicamentos, 18 atenciones médicas. `admin`/`recepcion` mantienen username/contraseña documentados; solo cambiaron los nombres de persona.

---

## Correcciones y mejoras (sesión 4 — login, alta de veterinarios y contraseñas)

- [x] **Preregistro público de Veterinario, pendiente de aprobación** — `POST /api/usuarios/preregistro` (sin `requireAuth`, `preregistroRateLimit`: 5/hora por IP). Crea el `Usuario` con `rol: VETERINARIO`, `estado: INACTIVO` y el nuevo campo `autorregistrado: Boolean` (migración `usuario_autorregistrado`) en `true` — más el `Veterinario` vinculado, también `INACTIVO`. No hay endpoint de "aprobar" separado: un Administrador aprueba con el mismo `PATCH /api/usuarios/:id/estado` → `ACTIVO` que ya existía para reactivar cuentas; `autorregistrado` es solo el discriminador que le permite al frontend mostrar "Pendiente de aprobación" en vez de "Inactivo" para estas cuentas.
- [x] **Cambiar/restablecer contraseña** — dos endpoints con permisos distintos, sin ningún envío de email/SMS real (mismo motivo por el que HU11 Track B quedó fuera de alcance): `PATCH /api/usuarios/me/password` (`requireAuth`, cualquier rol, pide la contraseña actual — `PasswordActualIncorrectaError` → 401 si no coincide) y `PATCH /api/usuarios/:id/password` (`requireRole('ADMINISTRADOR')`, sin pedir la actual, para cuando el usuario perdió el acceso y no puede autoservirse). `usuarioRepository.actualizarPassword` hashea con bcrypt igual que en el alta.
- [x] **Bug corregido: contraseña incorrecta recargaba toda la página** — `api-client.ts` trataba *cualquier* 401 como "sesión expirada" y forzaba `window.location.href = "/login"`, incluido el propio intento de login fallido (que nunca lleva token). Ahora el redirect solo dispara si la request llevaba un token (`response.status === 401 && token`); sin token, el error fluye normal para que la pantalla de login lo muestre inline.

---

## Correcciones y mejoras (sesión 5 — recuperación de contraseña, invitación de veterinarios, auditoría)

- [x] **Recuperación de contraseña por email** — `Usuario` ganó un campo `email` (opcional, único). `POST /api/auth/forgot-password` (`forgotPasswordRateLimit`, 5/hora): busca por `username`, y responde éxito genérico tanto si la cuenta no existe como si no tiene email, para no convertir el endpoint en un oráculo de enumeración de cuentas — un fallo de envío (SMTP caído) se loguea server-side y se traga, por el mismo motivo. Si todo encaja, crea un `PasswordResetToken` (expira en 1h, de un solo uso vía `usadoEn`) y manda un email con el link `/restablecer-password?token=...`. `POST /api/auth/reset-password` valida el token (`TokenDeRecuperacionInvalidoError` si no existe/expiró/ya se usó) y actualiza la contraseña. Esto es una **tercera** vía de cambio de contraseña, además de las dos que ya existían (self-service con contraseña actual, y admin-assisted sin ella).
- [x] **Envío de email real (SMTP) queda cableado por primera vez** — `lib/mailer.ts` (`nodemailer`) + `lib/email-templates.ts`. Sigue el mismo criterio de "nunca fingir un envío que no ocurrió" que ya regía HU11 Track B, pero aplicado distinto: en vez de no construir el feature, se construyó y **falla ruidosamente** si `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` no están configuradas (`EmailNoConfiguradoError`, 500) en lugar de simular el envío. Variables nuevas en `.env.example`: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` (opcional), y `FRONTEND_URL` (ya existía para CORS, ahora también arma los links de los emails vía `utils/url.ts#frontendBaseUrl`).
- [x] **Invitación de Veterinario por un Administrador** — segunda vía de alta de Veterinario, coexiste con el preregistro público (no lo reemplaza). Tabla nueva `InvitacionVeterinario` (token único, expira en 1h). `POST /api/usuarios/invitaciones` (Admin) crea la invitación y manda el email; si el envío falla, la invitación se cancela en vez de quedar "pendiente" sin haber llegado a nadie (a diferencia de la recuperación de contraseña, acá el Admin sí debe enterarse del fallo). `GET /api/usuarios/invitaciones` (listar pendientes) y `DELETE /api/usuarios/invitaciones/:id` (cancelar), ambos Admin. `GET /api/usuarios/invitaciones/validar/:token` (público, solo lectura) y `POST /api/usuarios/invitaciones/aceptar/:token` (público, `preregistroRateLimit`) para que la persona invitada complete su registro (datos personales + matrícula/especialidad + contraseña). **Diferencia clave con el preregistro:** la cuenta creada queda `estado: ACTIVO` y `autorregistrado: false` de inmediato — un Administrador ya decidió invitar a esa persona, no hay paso de aprobación.
- [x] **Auditoría de acciones administrativas** — tabla nueva `RegistroAuditoria` + enum `AccionAuditoria` (`ACTIVAR_CUENTA | DESACTIVAR_CUENTA | RESTABLECER_PASSWORD | CAMBIAR_ROL | INVITAR_VETERINARIO`). Registra específicamente acciones de un Administrador **sobre la cuenta de otra persona** — cambiar la propia contraseña no genera fila. `usuario.service.ts` registra desde `cambiarEstado` (incluye aprobar un preregistro, que se distingue en el detalle de texto), `cambiarRol` y `restablecerPassword`; `invitacion.service.ts` registra desde `invitar`. `GET /api/auditoria` (Admin, paginado `?page=&pageSize=`) expone el listado, más reciente primero.
- [x] **Migración** `20260731143925_auditoria_invitaciones_recuperacion` — agrega `Usuario.email`, `PasswordResetToken`, `InvitacionVeterinario`, `RegistroAuditoria` y el enum `AccionAuditoria`. `database/MODELO_DATOS.md` y `prisma/schema.prisma` actualizados en paralelo.

---

## Correcciones y mejoras (sesión 6 — cobro por QR bancario, andamiaje sin banco real conectado)

Tras investigar pasarelas de pago en Bolivia (`docs/COMPARATIVA_MERCADO_VETERINARIO.md`), se decidió construir el andamiaje para cobrar por el riel oficial **QR Simple** (interoperable, 0% comisión) vía la API de un banco comercial — el banco específico todavía no está elegido, y ningún banco boliviano publica documentación técnica de su API sin ser cliente primero. En vez de adivinar un contrato inexistente (lo que rompería el precedente de "nunca fingir una integración externa"), se construyó **todo lo que no depende de conocer ese contrato**, dejando el único punto que sí lo necesita como una falla explícita y documentada:

- [x] **Modelo `CobroQr`** (migración `20260731194201_cobro_qr`) — un intento de cobro por QR ligado a una `AtencionMedica`, con `estado: EstadoCobroQr` (`PENDIENTE | CONFIRMADO | EXPIRADO | ERROR`), `proveedor` (qué banco lo generó), `referenciaExterna` (ID que devuelve el banco, único), `qrPayload` (contenido/imagen a mostrar) y `expiraEn`. Una atención puede tener varios intentos (uno expira, se genera otro), pero solo uno debería llegar a `CONFIRMADO`.
- [x] **`lib/pagoQr.ts`** — el único punto de conexión real con el banco. A diferencia de `lib/mailer.ts` (SMTP es un protocolo estándar, cualquier proveedor sirve igual), cada banco boliviano expone una API propietaria sin doc pública, así que `generarCobroQrBancario()` **siempre** lanza `ProveedorPagoQrNoConfiguradoError` (500) hoy — no es un "si falta configurar, falla", es "esta función no puede llamar a ningún banco real todavía". El comentario en el archivo deja el TODO exacto para cuando lleguen las credenciales/spec reales del banco elegido. `verificarNotificacionWebhook()` sí es funcional ya (secreto compartido vía `PAGO_QR_WEBHOOK_SECRET`), como control de acceso mínimo real para el webhook.
- [x] **Endpoints:** `POST /api/pagos/qr` (`requireAuth`, genera el intento — hoy siempre 500 vía el punto anterior), `GET /api/pagos/qr/:id` (`requireAuth`, consulta estado, usado para polling desde el frontend), `POST /api/pagos/qr/webhook` (**público**, sin `requireAuth` — lo llama el banco, no un usuario logueado; se protege con el header `X-Webhook-Secret` en vez de JWT, responde 200 aunque la referencia no aplique para no provocar reintentos del banco, 401 solo si el secreto no coincide).
- [x] **`pagoQr.service.ts#confirmarPorReferenciaExterna`** — al confirmarse, crea el `Pago` real (mismo efecto que `pago.service.ts#registrar` con `metodoPago: QR`) y marca la atención pagada; idempotente a propósito (no-op si la referencia no existe o el cobro ya no está `PENDIENTE`), porque los webhooks bancarios suelen reintentar la misma notificación.
- [x] **Errores nuevos registrados en `error.middleware.ts`:** `AtencionYaPagadaError` (400), `CobroQrNoEncontradoError` (404), `ProveedorPagoQrNoConfiguradoError` (500, mismo trato que `EmailNoConfiguradoError`).
- [x] **`.env.example`** — `PAGO_QR_BANCO`, `PAGO_QR_API_URL`, `PAGO_QR_API_KEY`, `PAGO_QR_WEBHOOK_SECRET` documentadas, dejando explícito que ninguna conecta nada todavía salvo la última.
- [x] **Probado de punta a punta**: `npm test` (suite completa, incluye `pagoQr.service.test.ts`), `npx tsc --noEmit`, y contra el servidor real vía `curl` — los 6 casos (generar sobre atención pendiente real → 500 con el mensaje esperado, atención inexistente/pagada → 400, sin `atencionId` → 400, consultar cobro inexistente → 404, webhook sin secreto → 401, sin token → 401) responden exactamente como se diseñó.

**Lo que falta para que esto cobre de verdad:** elegir el banco, conseguir sus credenciales/documentación técnica de API, y reemplazar el cuerpo de `generarCobroQrBancario()` — nada más en el sistema (rutas, servicio, frontend) necesita cambiar.

**Trámite investigado para elegir banco (detalle completo en `docs/COMPARATIVA_MERCADO_VETERINARIO.md` sección 11.1):** ambos requieren una cuenta de persona jurídica (NIT + Testimonio de Constitución en FUNDEMPRESA). **BNB es el punto de partida priorizado** — tiene un programa "API Market" que lista explícitamente "Pagos y cobros con QR" y, sobre todo, un **sandbox público y gratuito** (`bnb.com.bo/PortalBNB/Api/Sandbox`) donde se puede empezar a probar la integración ya, sin esperar aprobación de nadie; luego se pide "acceso full" registrándose en su plataforma. BCP, en cambio, solo expone nombres de endpoints sin documentación técnica pública — el único camino ahí es llamar a su línea gratuita (800103060) y pedir acceso a la API de Pagos QR directamente. Ninguna de las dos rutas está verificada todavía contra el contrato técnico real (eso sigue gateado detrás del onboarding de cada banco) — actualizar esta nota y `docs/COMPARATIVA_MERCADO_VETERINARIO.md` en cuanto se entre al sandbox de BNB o se consiga la doc de BCP.

---

## Correcciones y mejoras (sesión 7 — código en inglés, UI en español, tablas con prefijo `st_`)

Refactor transversal de nomenclatura, sin cambios funcionales: **todo identificador pasó a inglés y todo texto visible quedó en español**. El mapa término por término está en [`docs/GLOSARIO_EN_ES.md`](../docs/GLOSARIO_EN_ES.md); la convención resumida vive en `CLAUDE.md`.

- [x] **Esquema Prisma reescrito** — 17 modelos y 12 enums en inglés (`Usuario`→`User`, `Mascota`→`Pet`, `AtencionMedica`→`MedicalVisit`, `CobroQr`→`QrCharge`, …), valores de enum incluidos (`ADMINISTRADOR`→`ADMIN`, `PENDIENTE`→`PENDING`, `VACUNA`→`VACCINE`, …). Cada modelo lleva `@@map("st_…")` en snake_case plural; las columnas quedan en camelCase, igual que el campo.
- [x] **Base recreada en Supabase** — se dropearon las 17 tablas y 11 enums viejos **por nombre** y se aplicó una migración inicial única (`20260824000000_init_english_st_prefix`), que incluye el índice único parcial (ahora `appointment_vet_datetime_active_idx` sobre `st_appointments`). Las 8 migraciones anteriores se eliminaron del repo: referenciaban tablas y valores de enum que ya no existen, y un `migrate reset` habría sido destructivo (ver el punto siguiente).
- [x] **⚠️ Hallazgo importante: el schema `public` está compartido con otro proyecto.** Conviven 9 tablas con prefijo `mt_` (talleres, repuestos, organizaciones) **con datos reales**. Por eso el borrado se hizo tabla por tabla en vez de `prisma migrate reset`, que habría destruido ese otro proyecto. Consecuencias registradas en `CLAUDE.md` y `database/MODELO_DATOS.md` sección 7: **no usar `migrate reset`, `migrate dev` ni `db push`** contra esta base; las migraciones nuevas se generan con `prisma migrate diff` y se aplican con `prisma migrate deploy`.
- [x] **`npm run db:reset` dejó de ser un footgun** — antes era `prisma migrate reset --force` (habría borrado las tablas `mt_*`). Ahora corre `prisma/reset.ts`, que dropea **solo** las tablas `st_*` y los enums de PawCare, y luego indica correr `migrate deploy` + `db seed`. Probado de punta a punta: las 9 tablas `mt_*` sobreviven intactas.
- [x] **`src/` completo migrado** — 15 repositorios, 20 servicios, 18 controladores, middlewares, utils y tipos, con sus archivos renombrados (`mascota.repository.ts`→`pet.repository.ts`, `lib/pagoQr.ts`→`lib/qrPayment.ts`, `services/agenda.errors.ts`→`services/schedule.errors.ts`, …). Las 30+ clases de error de dominio se renombraron a inglés **conservando sus mensajes en español**, porque la UI los muestra tal cual (`PetNotFoundError` sigue diciendo "La mascota solicitada no existe").
- [x] **Contrato HTTP en inglés** — los 61 endpoints y todas las claves del JSON (`/api/mascotas`→`/api/pets`, `{nombre, especie}`→`{name, species}`), más los query params (`?ci=`→`?nationalId=`, `?activas=`→`?active=`, `?desde/hasta`→`?from/to`). Tabla completa de equivalencias en el glosario.
- [x] **Seed y tests reescritos** — mismos datos demo y mismas credenciales (`admin`/`admin123`, etc.), mismos 24 tests en 5 suites. `pago.service.test.ts`→`payment.service.test.ts`, `cita.service.test.ts`→`appointment.service.test.ts`, `pagoQr.service.test.ts`→`qrPayment.service.test.ts`.
- [x] **Links de email actualizados** — `auth.service.ts` y `vetInvitation.service.ts` ahora apuntan a `/reset-password` y `/invitation` (antes `/restablecer-password` y `/invitacion`), acompañando el renombrado de rutas del frontend.
- [x] **Verificado de punta a punta** contra Supabase real: `npx tsc --noEmit` limpio, `npx jest` 24/24 en verde, y con el servidor corriendo — login, los 10 endpoints de lectura principales, creación de cita (201), conflicto de agenda (409 vía el índice parcial), cobro QR (500 con el mensaje honesto de siempre) y webhook sin secreto (401). También se validó el ciclo completo `db:reset` → `migrate deploy` → `db seed`.

**Lo que NO cambió:** ninguna regla de negocio, ningún endpoint agregado o quitado, ningún texto que ve el usuario. Los mensajes de error, las etiquetas, los comentarios del código, los encabezados de los Excel exportados y el cuerpo de los emails siguen en español.

---

## Correcciones y mejoras (sesión 11 — búsqueda global)

- [x] **`GET /api/search?q=`** (`requireAuth`) — una sola caja que resuelve "¿quién es Rocky?" sin saber de antemano en qué pantalla mirar. Los endpoints que ya existían (`/pets/search`, `/owners/search`) solo buscan por CI **exacto**, así que combinarlos desde el frontend no servía: hacía falta coincidencia parcial por nombre.
- [x] **Extensible por composición, no por modificación** — `SearchProvider` (`services/search/searchProvider.ts`) define el contrato (`type`, `search(term, limit)`), `pet.searchProvider.ts` y `owner.searchProvider.ts` lo implementan, y `search.service.ts` los registra en un arreglo y los consulta en paralelo. **Agregar medicamentos o citas a la búsqueda es escribir un proveedor y sumarlo a esa lista** — el servicio, el controlador y la ruta quedan intactos. Cada proveedor mapea su entidad a `SearchResult` (título, subtítulo, ruta del frontend), así que el consumidor no conoce ninguna entidad concreta.
- [x] **Métodos de repositorio nuevos**: `petRepository.searchByName` (parcial, insensible a mayúsculas, solo `ACTIVE`) y `ownerRepository.searchByNameOrNationalId` (nombre, apellido o CI). El acceso a Prisma sigue confinado a la capa de repositorios.
- [x] **Umbral de 2 caracteres y tope de 5 por tipo** — por debajo de 2 no se consulta (cualquier letra traería media base); el tope evita que un término genérico devuelva cientos de filas a un cuadro de salto rápido.
- [x] **Probado contra Supabase real**: mascota por fragmento ("roc" → Rocky), propietario por apellido ("vargas") y por CI ("5551002"), término corto ("a" → vacío), sin coincidencias ("zzz" → vacío), resultados de ambos tipos ordenados con mascotas primero, y 401 sin token.

---

## Correcciones y mejoras (sesión 13 — auditoría completa inglés/español)

Contraparte de la sesión 13 del frontend. Del backend sale texto que el usuario lee tal cual —
mensajes de error y el contenido de los Excel/PDF que descarga — y ahí quedaba inglés.

- [x] **12 mensajes de error nombraban el campo por su clave JSON** en vez de por su etiqueta en pantalla: `"El parámetro nationalId es obligatorio"` → «El CI es obligatorio para buscar», `"currentPassword y newPassword son obligatorios"` → «La contraseña actual y la nueva son obligatorias», `"El estado debe ser ACTIVE o INACTIVE"` → «El estado debe ser activo o inactivo», `"visitId y method son obligatorios"` → «La atención y el método de pago son obligatorios», etc. El **nombre** de la clase de error sigue en inglés (`PetNotFoundError`); solo cambió el texto. El JSON de la API no se tocó.
- [x] **`utils/labels.ts` nuevo** — el Excel de respaldo completo (HU15) y los reportes en Excel/PDF escribían el valor crudo del enum en la celda: `ADMIN`, `ACTIVE`, `CASH`, `CONFIRMED`, `PAID`, `VACCINE`. Ahora `label.role`, `label.recordStatus`, `label.appointmentStatus`, `label.visitPaymentStatus`, `label.paymentMethod` y `label.preventiveControlType` los traducen al escribir el archivo. Es el equivalente de servidor de `StatusBadge.tsx` / `lib/roles.ts`, documentado en `docs/GLOSARIO_EN_ES.md` §9. Devuelve el valor crudo si falta una traducción: si el enum crece y nadie agrega la etiqueta, se nota, pero la exportación no rompe.
- [x] **`report.service.ts`: `paymentStatus` pasó de `string` a `VisitPaymentStatus`** — hacía falta para traducirlo con seguridad de tipos, y de paso el tipo ahora dice la verdad.
- [x] **Correos sin voseo rioplatense** (`lib/email-templates.ts`): «hacé clic» → «haz clic», «podés ignorar» → «puedes ignorar». Es la forma que usa el resto de la aplicación.
- [x] Barrido de todos los identificadores del backend: ya estaban íntegramente en inglés, no hubo nada que renombrar. Verificado con `tsc --noEmit` y `jest` (24/24).

---

## Correcciones y mejoras (sesión 14 — el backend habla los dos idiomas)

Contraparte de la sesión 14 del frontend. Del backend salen dos cosas que una persona lee: los mensajes de error y los archivos que descarga.

- [x] **Cada respuesta de error lleva `code` además de `error`.** `error.middleware.ts` manda el nombre de la clase (`PetNotFoundError`, `ScheduleConflictError`), y los controladores y middlewares mandan un código semántico (`Forbidden`, `NationalIdRequired`, `TooManyLoginAttempts`). El frontend traduce por ese código y **cae al `error` en español** cuando no tiene la traducción, así que un error nuevo se ve legible en vez de mostrar una clave cruda. El contrato no se rompió: `error` sigue viajando igual que antes.
- [x] **`utils/labels.ts` pasó a ser bilingüe.** `readLanguage(req)` lee `Accept-Language` —que el cliente HTTP del frontend manda en cada request con el idioma elegido— y `labelsFor(language)` devuelve las etiquetas de enum más un `text(key)` con encabezados de columna, nombres de hoja, títulos de reporte y **nombres de archivo**. Lo usan `export.service.ts` (respaldo completo, HU15) y `report.controller.ts` (Excel y PDF).
- [x] **El nombre del archivo descargado lo decide el backend**, en el idioma pedido, vía `Content-Disposition` — el frontend solo conserva un respaldo por si ese header no llegara. Antes había dos fuentes para lo mismo.
- [x] **El JSON de la API no cambió**: los enums siguen viajando en inglés y las claves también. Solo se traduce lo que el backend escribe *dentro de un archivo*.

**Lo que se queda en español a propósito:** el texto de los recordatorios de WhatsApp (`reminder.service.ts`) porque lo lee el cliente de la clínica y no el personal; el `details` de la auditoría, que es el registro de lo que pasó y no una etiqueta; y el mensaje variable de las clases `Invalid*DataError`, que nombra el campo que falta — un solo código no puede cubrir muchos mensajes distintos.

Verificado con `tsc --noEmit` y `jest` (24/24).

---

## Correcciones y mejoras (sesión 16 — registro de inicios de sesión)

Hasta acá no quedaba rastro de quién entraba al sistema: la auditoría solo cubría acciones administrativas sobre otras cuentas. Ahora cada intento se registra.

- [x] **Modelo `LoginEvent` (`st_login_events`)** con `userId` (nulo si el usuario tecleado no existe), el `username` tal como se escribió, `outcome`, `ipAddress`, `userAgent` y `date`. Va **aparte de `AuditLog`** a propósito: un intento fallido puede no corresponder a ninguna cuenta —y `AuditLog.actorId` responde "quién lo hizo", que ahí no se sabe—, necesita campos propios, y tiene un volumen que taparía las pocas acciones administrativas que la auditoría existe para mostrar.
- [x] **Se registran los tres resultados**: `SUCCESS`, `INVALID_CREDENTIALS` (contraseña incorrecta o usuario inexistente) e `INACTIVE_ACCOUNT`. **El servidor distingue el motivo; el cliente no**: la respuesta sigue siendo el mismo error genérico, para que el login no sirva para averiguar qué nombres de usuario existen.
- [x] **El registro nunca bloquea el login**: la escritura va en try/catch y, si falla, se anota en el log del servidor y la persona entra igual. Hay un test que lo fija.
- [x] **`GET /api/login-events`** (`requireRole('ADMIN')`, paginado) con filtros `?outcome=success|failed` y `?username=`, más un resumen de las últimas 24 h para la cabecera de la pantalla.
- [x] **`app.set("trust proxy", 1)`**: detrás del proxy de Vercel la IP real llega en `X-Forwarded-For` y sin esto `req.ip` era la del proxy para todo el mundo. **Arregla de paso un bug latente**: el freno anti fuerza-bruta del login (10 intentos por IP) era en producción un cupo único compartido por toda la clínica.
- [x] **5 tests nuevos** sobre el registro de intentos (resultado correcto en cada caso, y que un fallo al registrar no impide entrar). Total: 29.

### ☠️ Incidente: se vació la base de datos

Al generar el SQL de la migración se corrió `prisma migrate diff --from-migrations … --shadow-database-url "<DIRECT_URL>"`. Una *shadow database* es una que Prisma tiene permitido **borrar y rehacer** para calcular el diff; apuntarla a la base real la vacía, sin confirmación, porque eso es literalmente lo que el flag autoriza. `--from-migrations` **exige** una shadow database, y ahí está la trampa: el comando parece de solo lectura y no lo es.

Se perdieron todas las tablas `st_*` —recuperadas con `prisma db seed`, porque eran datos de demostración— y también las `mt_*` del otro proyecto, que **no** son recuperables desde acá.

`CLAUDE.md` quedó con la advertencia y con la forma segura de generar una migración en este proyecto: `migrate diff --from-schema-datamodel <copia previa> --to-schema-datamodel <nuevo> --script`, que no toca ninguna base. Verificado.

---

## Correcciones y mejoras (sesión 17 — comprobante de pago)

`docs/MEJORAS_PRODUCTO.md` 1.2: al cobrar no se generaba ningún documento para el cliente.

- [x] **`POST /api/payments` devuelve el comprobante completo** (`PaymentReceipt`: número, monto, método, mascota, propietario con teléfono, atención y veterinario) en vez de solo el pago. La pantalla de éxito se dibuja sin una segunda vuelta al servidor, y con eso arma también el mensaje de WhatsApp.
- [x] **El número sale del id del pago** (`utils/receiptNumber.ts` → `R-2026-000042`), no de un contador propio. Un contador tiene que leer cuántos hay antes de escribir, y dos cobros simultáneos en el mostrador pueden imprimir el mismo número en dos papeles distintos.
- [x] **`paymentRepository.register` mete el `include` en el mismo `create`**: devuelve el comprobante armado, sin una segunda consulta que pueda no encontrar lo que se acaba de crear.
- [x] **`GET /api/payments/:id/receipt`** genera el PDF con `pdfkit` (`lib/receiptPdf.ts`), traducido con `labelsFor(readLanguage(req))` igual que los reportes — encabezados, método de pago, fechas y hasta el nombre del archivo. Media hoja A4: es un recibo, no un informe.
- [x] **`label.serviceType()` nuevo** en `utils/labels.ts`: el tipo de servicio se guarda en español porque es dato del catálogo, y ahora se traduce al escribirlo en el comprobante **y en los reportes Excel/PDF**, que hasta acá lo sacaban crudo.
- [x] **Fechas legibles en los documentos** (`literalToDisplay`): `dd/mm/aaaa` en español, mes abreviado en inglés — en un papel que se archiva, `03/04` es ambiguo.
- [x] Tests actualizados (el alta de pago ahora devuelve el comprobante) y uno nuevo que fija el formato del número. 29 en verde.

---

## Correcciones y mejoras (sesión 18 — carnet de vacunación y tamaño de hoja configurable)

`docs/MEJORAS_PRODUCTO.md` 1.3, más el ajuste de papel que pidió la misma sesión para el carnet **y** para el comprobante de la 17.

- [x] **`GET /api/pets/:id/vaccination-card`** (`lib/vaccinationCardPdf.ts`): identidad de la mascota (especie · raza · sexo, nacimiento), propietario con CI y teléfono, y el historial completo de dosis **en orden cronológico** — el carnet se lee como una libreta, de lo viejo a lo nuevo, al revés que las listas de la app. Las dosis vencidas salen en rojo con la palabra «Vencida»: el papel se mira de lejos y en un solo golpe de vista.
- [x] **`preventiveControlRepository.findVaccinationCard`** arma el carnet en una consulta, y `vaccinationCardNotFound` distingue «no existe la mascota» de «existe y no tiene dosis» — lo segundo imprime igual, con el aviso «Sin dosis registradas», porque un carnet vacío es un carnet válido recién abierto.
- [x] **`utils/paperSize.ts`**: media carta (por defecto), carta, A4 y rollo térmico de 80 mm, en puntos PostScript. Llega como `?paper=` y **se valida**; cualquier valor desconocido cae al tamaño por defecto en vez de romper la descarga.
- [x] **`lib/pdfPaper.ts` mide antes de imprimir.** El rollo térmico es papel continuo: no tiene alto de hoja. En vez de fijar una altura a ojo —que deja salir medio metro de papel en blanco, o corta el documento— se dibuja una vez en un lienzo alto, se lee dónde terminó el contenido y recién ahí se crea el documento definitivo con ese alto exacto. Los dos PDF pasan por el mismo envoltorio.
- [x] **El comprobante de pago se reacomoda igual**: en papel angosto el número deja de ir a la derecha y se apila bajo la marca, y todas las tipografías bajan de tamaño. Un diseño de dos columnas a 80 mm no se ve mal, se ve ilegible.
- [x] Etiquetas del carnet en `utils/labels.ts` (`cardTitle`, `cardHistory`, `cardOverdue`, `fileCard`, …) y `speciesOrRaw`/`sexOrRaw` para los datos que la clínica escribe a mano en español y no siempre coinciden con el catálogo.
- [x] **`scripts/previewPdfs.ts`**: genera los dos documentos en los cuatro tamaños y los dos idiomas con datos inventados, sin tocar la base. Un carnet de una sola dosis se ve bien siempre; el caso que hay que mirar es el de siete dosis con vencidas en el medio.

**Encontrado al verificar el nombre del archivo descargado:** ninguna descarga llegaba con el nombre que manda el backend. El frontend vive en otro origen, y el navegador solo deja leer un puñado de headers salvo que el servidor los exponga — `Content-Disposition` no estaba en la lista, así que `api-client.ts` caía siempre a su nombre de respaldo (en español, aunque la app estuviera en inglés). Un `exposedHeaders: ["Content-Disposition"]` en el `cors()` de `app.ts` lo arregla **para todas las descargas**, no solo las de esta sesión: comprobantes, carnets, reportes y la exportación completa. Verificado con la app en inglés: el carnet baja como `vaccination-card-Luna.pdf`, antes `carnet-Luna.pdf`.

- [x] **`PaymentHistoryEntry` ahora trae `receiptNumber`.** La fila de «Últimos pagos» fabricaba `R-55` para nombrar el archivo — un número que no existe en ningún comprobante. El formato vive en `utils/receiptNumber.ts` y debe salir de ahí una sola vez, no reimplementarse en el frontend.

### Qué vacuna y qué lote (MEJORAS_PRODUCTO 1.7)

El carnet dejaba esas casillas en blanco porque el sistema no guardaba el dato. Ahora sí, y es lo que un tercero busca: el SENASAG pide marca y lote de la antirrábica para el certificado de viaje.

- [x] **Dos columnas opcionales en `PreventiveControl`**: `productName` (VarChar 80) y `batchNumber` (VarChar 40). Opcionales a propósito — en una campaña masiva no siempre se anota el lote, y exigirlo llevaría a inventarlo o a no cargar el control.
- [x] **Migración generada sin tocar ninguna base**, con la receta de `CLAUDE.md`: copia del schema previo, `migrate diff --from-schema-datamodel … --to-schema-datamodel … --script`, leer el SQL (dos `ADD COLUMN`, ningún `DROP`) y recién ahí `migrate deploy`. Nunca `--shadow-database-url`, que es lo que vació la base en la sesión 16.
- [x] `productName` es **dato en español**, como el catálogo de servicios: lo teclea la clínica y no se traduce.
- [x] Un campo vacío del formulario (`""` o solo espacios) se guarda como `null`, no como cadena vacía: en la base eso es ausencia de dato, y una cadena vacía haría que el carnet imprima un renglón vacío en vez de dejar la casilla libre.
- [x] **El carnet los imprime cuando están** y deja la casilla en blanco cuando no — que es la mitad del historial viejo. La casilla de la firma y el sello sigue en blanco siempre: esa es física.
- [x] También salen en el **respaldo completo en Excel** (hoja ControlesPreventivos) y en la semilla de demostración, con una dosis a propósito sin registrar para que se vea el caso mixto.
- [x] Dos tests nuevos: que se guardan, y que un campo en blanco no se guarda como cadena vacía. 41 en verde.

### Rediseño del carnet contra el carnet boliviano de papel

El primer carnet era el historial de la app puesto en una hoja. Buscando cómo es el carnet real en Bolivia aparecieron tres cosas que lo cambiaban entero:

1. El registro **vale por la firma, el sello y el CI del veterinario** que aplicó la dosis, no por lo que imprima un sistema.
2. El lote se acredita **pegando la etiqueta del frasco** en su casilla — por eso el carnet de papel tiene casillas vacías, no es un descuido.
3. El carnet **no habilita a viajar**: para salir del país hace falta además el certificado zoosanitario del SENASAG, emitido dentro de los 10 días previos.

- [x] **Panel de identificación único** con mascota (especie · raza · sexo, nacimiento, color, peso) y propietario (nombre completo, CI, teléfono, dirección). El carnet lo lee alguien sin acceso al sistema: "Luna, perro" no alcanza para saber que el animal que tiene delante es el del papel. Los datos ya estaban en la base —`Pet.color`, `Pet.weight`, `Owner.address`, `Owner.maternalLastName`—, solo no llegaban al `VaccinationCard`.
- [x] **Dos registros separados**, vacunación y desparasitación, cada uno con su tabla reglada: son dos calendarios distintos y quien revisa busca uno, no una lista mezclada.
- [x] **Casillas en blanco para vacuna/lote y firma/sello**, con el renglón dimensionado (~8 mm) para que entre la etiqueta del frasco.
- [x] **Renglones vacíos hasta el pie**, repartidos entre las dos tablas de una sola vez: el carnet se sigue usando después de imprimirlo, y uno que termina donde termina el historial obliga a reimprimirlo en la visita siguiente.
- [x] **Notas al pie como elemento de hoja** (firma y sello · antirrábica anual · SENASAG), a altura fija y repetidas en cada página.
- [x] En rollo de 80 mm el documento se degrada a un resumen sin casillas: sobre papel térmico no se firma, se borra.

**Tres bugs de maquetación que solo se vieron mirando el PDF**, no compilando: el pie caía en una segunda hoja con dos renglones de letra chica (se dibujaba después de las tablas en vez de a altura fija); el reparto de renglones libres descontaba el pie dos veces y le daba a la desparasitación más lugar que a la vacunación; y `doc.text` del título adelanta `doc.y` por su cuenta, así que cada tabla ocupaba 12pt más de los calculados — lo justo para partir la segunda tabla en dos hojas.

`scripts/previewPdfs.ts` genera ahora tres carnets —historial largo, dos dosis y vacío— porque el que se ve bien siempre es el de una sola dosis.

**Verificado**, no asumido: los ocho PDF abiertos y leídos uno por uno, el `Content-Disposition` traducido (`carnet-Luna.pdf` / `vaccination-card-Luna.pdf`), 404 con una mascota inexistente, y el alto del ticket terminando junto al contenido. 29 tests en verde.

---

## Correcciones y mejoras (sesión 19 — verificación de permisos por rol)

Un reporte de que un Veterinario llegaba a pantallas de Administrador obligaba a comprobar si el backend estaba dejando pasar algo. **No: los 22 endpoints administrativos ya respondían 403** a tokens de VET y de RECEPTIONIST, y 401 sin token. El problema era del frontend (ver `frontend/TASKS.md` sesión 19).

- [x] **`routes/roleGuards.routes.test.ts`** fija ese comportamiento para que no se pierda: la lista completa de rutas exclusivas de Administrador, verificada con los dos roles no administradores y sin token.
- [x] **Con un caso de control que evita un test hueco**: con token de ADMIN esas mismas rutas **no** pueden responder 403. Sin eso, el test seguiría en verde si las rutas empezaran a fallar por cualquier otro motivo, o si dejaran de existir.
- [x] Comprobado que el test detecta la regresión de verdad: quitándole el `requireRole("ADMIN")` a `/api/audit-logs` fallan 2 de los 4 casos; con el guarda puesto, los 4 en verde. 45 tests en total.

**Al agregar un endpoint administrativo nuevo hay que sumarlo a esa lista en la misma tanda que a `routes/index.ts`** — es el único lugar que avisa si alguien olvida el guarda.

---

## Tarea 00 — Setup del backend

**Depende de:** nada (primera tarea).

```
Inicializa el proyecto backend/ con Node.js + Express + TypeScript:
1. package.json con dependencias: express, @prisma/client, bcrypt, jsonwebtoken,
   dotenv, node-cron, nodemailer, exceljs, pdfkit; devDependencies: typescript,
   ts-node-dev, @types/express, @types/node, @types/bcrypt, @types/jsonwebtoken,
   jest, ts-jest, supertest, @types/jest, @types/supertest, prisma.
2. El archivo prisma/schema.prisma ya existe en este folder — NO lo regeneres,
   solo corre `npx prisma generate` y `npx prisma migrate dev --name init` para
   crear la base de datos a partir de él.
3. Agrega la migración manual del índice único parcial de Cita (evita doble-reserva
   exacta), documentada como comentario al final de prisma/schema.prisma o como
   archivo SQL en prisma/migrations/:
   CREATE UNIQUE INDEX cita_vet_fecha_activa_idx ON "Cita" ("veterinarioId", "fechaHora") WHERE estado <> 'CANCELADA';
4. Crea la estructura: src/routes/, src/controllers/, src/middlewares/,
   src/services/, src/index.ts (servidor Express con middleware JSON, CORS, y
   manejo de errores centralizado).
5. Crea un .env.example con DATABASE_URL, DIRECT_URL, JWT_SECRET, SMTP_HOST,
   SMTP_PORT, SMTP_USER, SMTP_PASS.
No implementes lógica de negocio todavía, solo el andamiaje.
```

---

## Tarea 01 — HU1: Autenticación y Roles

**Depende de:** Tarea 00.
**Criterios de aceptación (HU1):** registro válido guarda y confirma · login con credenciales correctas da acceso solo a funciones del rol · credenciales incorrectas dan error específico.

```
Implementa HU1 en el backend: autenticación con 3 roles (ADMINISTRADOR, VETERINARIO,
RECEPCIONISTA) sobre el modelo Usuario ya definido en prisma/schema.prisma.
Requisitos:
- Endpoint POST /api/usuarios: registra un nuevo usuario con nombre, apellidos,
  ci, username, rol y contraseña (hash con bcrypt antes de guardar). Responde 201
  y el usuario creado (sin el hash) si los datos son válidos.
- Endpoint POST /api/auth/login: recibe username y password. Si son correctos,
  responde un JWT firmado con JWT_SECRET que embeba { usuarioId, rol }. Si son
  incorrectos, responde 401 con un mensaje genérico (no revelar si fue el usuario
  o la contraseña lo que falló).
- Middleware `requireAuth` que valide el JWT del header Authorization, y
  `requireRole(...roles)` que rechace con 403 si el rol del token no está en la
  lista permitida. Aplícalos como ejemplo a una ruta protegida de prueba.
Entrega pruebas Jest + Supertest: registro válido, login válido, login con
password incorrecta, acceso a ruta protegida sin token (401) y con rol no
permitido (403).
```

---

## Tarea 02 — HU2: Registro de Mascotas y Cliente

**Depende de:** Tarea 01 (rutas protegidas por rol RECEPCIONISTA/ADMINISTRADOR).
**Criterios de aceptación (HU2):** genera expediente con ID único · rechaza mascota duplicada para el mismo dueño · si el dueño ya existe, se reutiliza en vez de duplicarlo.

```
Implementa HU2 en el backend: registro de propietario y mascota.
Requisitos:
- Endpoint POST /api/mascotas que reciba datos de mascota + datos del propietario
  (incluyendo su ci). Si ya existe un Propietario con ese ci, reutilízalo; si no,
  créalo primero dentro de la misma transacción Prisma.
- La restricción única (propietarioId, nombre, especie) del esquema ya rechaza
  duplicados a nivel de base de datos: captura ese error de Prisma y responde 409
  con un mensaje claro en vez de un error 500 genérico.
- Responde 201 con el id de la Mascota creada.
- Endpoint GET /api/propietarios/buscar?ci=... para que el frontend pueda
  verificar si el propietario ya existe antes de enviar el formulario completo.
Pruebas: creación exitosa, propietario reutilizado, mascota duplicada (409).
```

---

## Tarea 03 — HU3: Gestionar Atención Médica

**Depende de:** Tarea 02 (Mascota/Propietario ya existen).
**Criterios de aceptación (HU3):** búsqueda por cédula muestra historial completo · atención sin diagnóstico/tratamiento se rechaza · atención con monto queda disponible para facturación.

```
Implementa HU3 en el backend: gestión de atención médica.
Requisitos:
- Endpoint GET /api/mascotas/buscar?ci=... que devuelva las mascotas del
  propietario con ese ci.
- Endpoint GET /api/mascotas/:id/atenciones que devuelva el historial médico
  completo de esa mascota, ordenado por fecha descendente.
- Endpoint POST /api/atenciones: crea diagnóstico, tratamiento, examenesExternos
  (opcional) y montoConsulta para una mascotaId/veterinarioId. Si faltan
  diagnóstico o tratamiento, responde 400 sin persistir.
- Al crear una atención con montoConsulta definido, queda con estadoPago =
  PENDIENTE (default del esquema) — no se marca como pagada aquí, eso es HU4.
Pruebas: creación válida, error por campos faltantes, historial ordenado
correctamente.
```

---

## Tarea 04 — HU4: Registrar Pagos

**Depende de:** Tarea 03 (necesita atenciones pendientes de pago).
**Criterios de aceptación (HU4):** guarda pago y confirma · rechaza monto 0/negativo/vacío · actualiza historial de cobros del cliente.

```
Implementa HU4 en el backend: registro de pagos por atención médica.
Requisitos:
- Endpoint GET /api/pagos/pendientes?propietarioId=... que liste AtencionMedica
  con estadoPago = PENDIENTE para ese cliente.
- Endpoint POST /api/pagos: recibe atencionId, metodoPago (EFECTIVO | TARJETA |
  TRANSFERENCIA | QR) y monto. Rechaza (400) monto <= 0 o vacío.
- Al confirmar un pago válido: crea el registro Pago y actualiza la
  AtencionMedica asociada a estadoPago = PAGADO, en una misma transacción.
Pruebas: pago válido actualiza ambos registros, monto inválido rechazado, pago
duplicado sobre la misma atención rechazado (la relación Pago.atencionId es
única en el esquema).
```

---

## Tarea 05 — HU5: Agendar, Reprogramar y Cancelar Citas

**Depende de:** Tarea 02 (Mascota) y Tarea 01 (Veterinario vía Usuario).
**Criterios de aceptación (HU5):** muestra horarios disponibles · notifica al crear/reprogramar/cancelar · previene conflicto de agenda.

```
Implementa HU5 en el backend: gestión completa de citas.
Requisitos:
- Endpoint GET /api/citas/disponibilidad?veterinarioId=&fecha= que cruce el
  Horario semanal del veterinario con las Citas ya CONFIRMADA ese día, y
  devuelva los bloques libres.
- Endpoint POST /api/citas: crea una cita con un codigo generado (formato
  CITA-YYYYMMDD-NNN) solo si el horario sigue disponible; si no, responde 409.
- Endpoint PUT /api/citas/:id: reprograma (nueva fechaHora, validando
  disponibilidad de nuevo) o cancela (estado = CANCELADA), sin crear registros
  duplicados.
- Al crear, reprogramar o cancelar, crea un registro Notificacion (canal EMAIL
  por ahora, estado PENDIENTE) asociado al propietario de la mascota — HU10/HU11
  se encargan de procesarlo y enviarlo.
Pruebas: creación válida, conflicto de horario (409), reprogramación válida,
cancelación, verificar que se crea la Notificacion en cada caso.
```

---

## Tarea 06 — HU6: Control de Vacunación y Desparasitación

**Depende de:** Tarea 02 (Mascota).
**Criterios de aceptación (HU6):** alerta preventiva al aproximarse la fecha · permite registrar nueva aplicación sobre protección vencida · listado priorizado de próximos a vencer.

```
Implementa HU6 en el backend: control preventivo (vacunación y desparasitación).
Requisitos:
- Endpoint POST /api/controles-preventivos: registra tipo (VACUNA |
  DESPARASITACION), fechaAplicacion y proximaDosis para una mascotaId.
- Endpoint GET /api/mascotas/:id/controles-preventivos: historial preventivo de
  la mascota, incluyendo un campo calculado `vencido` (proximaDosis < hoy).
- Endpoint GET /api/controles-preventivos/proximos-a-vencer?dias=30: listado
  priorizado (proximaDosis ascendente) de controles de todas las mascotas que
  vencen dentro del rango de días indicado (default 30).
Pruebas: registro válido, cálculo correcto de `vencido`, listado de próximos a
vencer respeta el orden y el rango de fechas.
```

---

## Tarea 07 — HU7: Reporte de Ingresos Económicos

**Depende de:** Tarea 04 (necesita Pagos existentes).
**Criterios de aceptación (HU7):** filtra por fecha y servicio · incluye totales · restringe acceso a rol ADMINISTRADOR.

```
Implementa HU7 en el backend: reporte de ingresos.
Requisitos:
- Endpoint GET /api/reportes/ingresos?desde=&hasta=&tipoServicio= protegido con
  requireRole('ADMINISTRADOR') (403 para cualquier otro rol).
- Devuelve el listado de Pago que cumplan los filtros, más un objeto de totales
  (cantidad de pagos, monto total sumado).
Pruebas: filtro por rango de fechas, filtro por método de pago (incluyendo QR),
acceso rechazado para rol distinto de ADMINISTRADOR.
```

---

## Tarea 08 — HU8: Reportes Clínicos y Administrativos

**Depende de:** Tarea 03 y Tarea 07.
**Criterios de aceptación (HU8):** genera reporte con registros correspondientes · presenta datos agregados por tipo de servicio · exporta a PDF y Excel.

```
Implementa HU8 en el backend, usando exceljs y pdfkit (ya en las dependencias).
Requisitos:
- Endpoint GET /api/reportes?tipo=atenciones|ingresos&desde=&hasta= (rol
  ADMINISTRADOR) que devuelva los registros correspondientes, agregados por tipo
  de servicio cuando aplique.
- Endpoint GET /api/reportes/export/excel?... que genere un .xlsx con los mismos
  datos usando exceljs, como stream de descarga.
- Endpoint GET /api/reportes/export/pdf?... que genere un PDF equivalente con
  pdfkit.
Pruebas: contenido del reporte JSON coincide con lo esperado; los endpoints de
exportación devuelven el content-type correcto (application/vnd.openxmlformats...
y application/pdf).
```

---

## Tarea 09 — HU9: Gestión de Inventario de Medicamentos

**Depende de:** Tarea 03 (consumo de medicamentos en atención).
**Criterios de aceptación (HU9):** entrada incrementa stock y registra movimiento · consumo en atención decrementa stock automáticamente · alerta de bajo inventario.

```
Implementa HU9 en el backend: inventario de medicamentos.
Requisitos:
- Endpoint POST /api/medicamentos/:id/entradas: recibe cantidad, incrementa
  stockActual y crea un MovimientoInventario tipo ENTRADA, en una transacción.
- Extiende POST /api/atenciones (Tarea 03) para aceptar opcionalmente una lista
  de { medicamentoId, cantidad } consumidos: por cada uno, decrementa
  stockActual y crea un MovimientoInventario tipo SALIDA vinculado a la
  atencionId, todo en la misma transacción que crea la atención.
- Endpoint GET /api/medicamentos/bajo-stock: devuelve los medicamentos donde
  stockActual <= stockMinimo.
Pruebas: entrada incrementa correctamente, consumo en atención decrementa y
falla (400) si no hay stock suficiente, listado de bajo stock correcto.
```

---

## Tarea 10 — HU10: Sistema de Alertas Automáticas

**Depende de:** Tarea 05 (Cita), Tarea 06 (ControlPreventivo).
**Criterios de aceptación (HU10):** recordatorio 24h antes de cita · alerta interna 7 días antes de próxima dosis · tasa de entregabilidad ≥95% monitoreada.

```
Implementa HU10 en el backend: job programado con node-cron que corra cada hora
y:
1. Busque Cita con estado CONFIRMADA cuya fechaHora esté en las próximas 24h y
   no tengan ya una Notificacion ENVIADO para ese propósito; envíe un email
   (Nodemailer, usando las variables SMTP_* del .env) al propietario, y
   actualice o cree el registro Notificacion con estado ENVIADO o FALLIDO según
   el resultado.
2. Busque ControlPreventivo cuya proximaDosis esté en los próximos 7 días y cree
   una Notificacion interna (sin envío externo) visible para el veterinario
   asignado a la mascota.
3. Expón GET /api/notificaciones/metricas (rol ADMINISTRADOR) con la tasa de
   entregabilidad (ENVIADO / (ENVIADO + FALLIDO)) de los últimos 30 días.
Pruebas: el job no duplica notificaciones ya enviadas, marca FALLIDO si
Nodemailer lanza error, el cálculo de métricas es correcto.
```

---

## Tarea 11 (opcional) — HU11 Track A: WhatsApp manual

**Depende de:** Tarea 05, Tarea 06.

```
Implementa el Track A de HU11: recordatorios de WhatsApp semi-manuales, sin
integrarte con ninguna API externa.
Requisitos:
- Endpoint GET /api/recordatorios/pendientes que devuelva, para hoy, las citas
  en las próximas 24h y los controles preventivos con próxima dosis en 7 días,
  cada uno con el teléfono del propietario y un mensaje de texto ya armado.
- Endpoint POST /api/recordatorios/:notificacionId/marcar-enviado que actualice
  la Notificacion correspondiente (canal WHATSAPP_MANUAL) a estado ENVIADO con
  enviadoEn = ahora.
No se requiere cuenta de WhatsApp Business ni credenciales de ninguna API.
```

---

## Tarea 12 (opcional) — HU11 Track B: WhatsApp Cloud API

**Depende de:** Tarea 10, Tarea 11.

```
Implementa el Track B de HU11: automatiza el envío usando la WhatsApp Cloud API
de Meta directamente (sin intermediario tipo Twilio/360dialog).
Requisitos:
- Servicio que llame a POST https://graph.facebook.com/v20.0/<PHONE_NUMBER_ID>/messages
  usando WHATSAPP_TOKEN y WHATSAPP_PHONE_NUMBER_ID del .env, con mensajes de
  plantilla ya aprobados por Meta.
- En el job de la Tarea 10: intenta WhatsApp primero (canal WHATSAPP_API); si
  falla o las credenciales no están configuradas, cae a Nodemailer (canal
  EMAIL) como respaldo. Registra el resultado real en Notificacion.
- Lleva un conteo mensual de conversaciones de WhatsApp y expón una alerta en
  GET /api/notificaciones/metricas si se acerca al límite gratuito de Meta
  (definir el umbral como variable de entorno WHATSAPP_LIMITE_MENSUAL).
No uses librerías no oficiales de automatización de WhatsApp Web
(whatsapp-web.js, Baileys, etc.).
```

---

## Tarea 13 (opcional) — HU12: Pago por QR

**Depende de:** Tarea 04.

```
El enum MetodoPago del esquema ya incluye QR. Verifica que POST /api/pagos
(Tarea 04) y GET /api/reportes/ingresos (Tarea 07) acepten y filtren
correctamente por QR — probablemente no requiera cambios de código, solo
pruebas adicionales que lo confirmen.
```

---

## Tarea 14 (opcional) — HU13: Importación desde Excel

**Depende de:** Tarea 02.

```
Implementa HU13: importación de propietarios y mascotas desde un archivo Excel.
Requisitos:
- Endpoint POST /api/importaciones/clientes que reciba un archivo .xlsx (usa
  exceljs, ya en las dependencias), con columnas: nombre, apellidoPaterno,
  apellidoMaterno, ci, telefono, direccion, mascotaNombre, mascotaEspecie,
  mascotaRaza.
- Por cada fila válida: reutiliza el Propietario si el ci ya existe, crea la
  Mascota asociada (reutilizando la misma lógica/validación de la Tarea 02).
- Por cada fila inválida (campos obligatorios faltantes): la omite y la agrega a
  un resumen de errores devuelto al final (número de fila, motivo).
Pruebas: archivo con filas válidas e inválidas mezcladas, propietario existente
reutilizado correctamente.
```

---

## Tarea 15 (opcional) — HU15: Exportación completa de datos

**Depende de:** todas las tareas anteriores (exporta todas las entidades).

```
Implementa HU15: exportación completa de los datos de la clínica.
Requisitos:
- Endpoint GET /api/exportacion/completa (rol ADMINISTRADOR) que genere un
  archivo Excel con una hoja por entidad: Propietarios, Mascotas, Veterinarios,
  Citas, AtencionesMedicas, Pagos, ControlesPreventivos, Medicamentos — usando
  exceljs, como stream de descarga (no cargar todo en memoria si el volumen es
  grande).
Pruebas: el archivo generado contiene una hoja por entidad con el conteo de
filas esperado.
```
