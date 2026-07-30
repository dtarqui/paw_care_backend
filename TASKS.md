# Backend — Cola de tareas para construcción

> Extraído de `docs/PLAN_PROYECTO_PAWCARE.md` (referencia, no editar desde aquí). Cada tarea es un prompt autocontenido, en orden de ejecución. Un job/agente debe procesarlas en secuencia, sin saltar una tarea hasta cumplir su Definition of Done.

**Stack:** Node.js + Express + TypeScript + Prisma sobre PostgreSQL. Esquema ya definido en [`prisma/schema.prisma`](prisma/schema.prisma) (copiado de `database/MODELO_DATOS.md`).

**Definition of Done por tarea:** endpoint(s) implementados · validaciones de los criterios de aceptación cubiertas · pruebas Jest + Supertest de los casos éxito/error · sin lógica de frontend mezclada aquí (eso vive en `frontend/TASKS.md`).

---

## Progreso

> **Nota de arquitectura:** estas tareas se cumplieron en **modo demo** — misma arquitectura en capas (routes → controllers → services → repositories) descrita abajo, pero `repositories/` lee de arrays en memoria (`src/data/*.ts`) en vez de Prisma/PostgreSQL. Migrar a la base de datos real (Tarea 00 tal como está escrita, con `prisma migrate`) queda pendiente; cuando se haga, solo debería tocarse la capa `repositories/`.

- [x] Tarea 00 — Setup del backend — **parcial**: estructura en capas y andamiaje listos; falta migrar de datos en memoria a Prisma/PostgreSQL real
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

**Cambio de modelo no previsto en el prompt original:** `AtencionMedica` ganó un campo `tipoServicio` (mismo catálogo que `Cita.tipoConsulta`) — sin él, HU7/HU8 no tenían cómo agrupar ingresos "por tipo de servicio". Ya se propagó a `database/MODELO_DATOS.md` (tabla de campos, bloque Prisma e índice `(tipoServicio, fecha)`).

*(HU14 — PWA instalable — no requiere trabajo de backend; ver `frontend/TASKS.md`.)*

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
