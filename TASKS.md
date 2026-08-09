# Backend — Cola de tareas para construcción

> Extraído de `docs/PLAN_PROYECTO_PAWCARE.md` (referencia, no editar desde aquí). Cada tarea es un prompt autocontenido, en orden de ejecución. Un job/agente debe procesarlas en secuencia, sin saltar una tarea hasta cumplir su Definition of Done.

**Stack:** Node.js + Express + TypeScript + Prisma sobre PostgreSQL. Esquema ya definido en [`prisma/schema.prisma`](prisma/schema.prisma) (copiado de `database/MODELO_DATOS.md`).

**Definition of Done por tarea:** endpoint(s) implementados · validaciones de los criterios de aceptación cubiertas · pruebas Jest + Supertest de los casos éxito/error · sin lógica de frontend mezclada aquí (eso vive en `frontend/TASKS.md`).

---

## Progreso

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
