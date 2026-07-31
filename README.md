# Backend — PawCare

API REST en Node.js + Express + TypeScript, con persistencia real en PostgreSQL (Supabase) vía Prisma. Arquitectura en capas: rutas → controladores → servicios → repositorios — `repositories/` es la única capa que importa el cliente de Prisma (`src/lib/prisma.ts`).

## Correr el proyecto

```bash
cp .env.example .env   # completa DATABASE_URL y DIRECT_URL con tu proyecto Supabase
                        # (Project Settings -> Database -> Connection string)
npm install
npx prisma generate
npx prisma migrate deploy   # aplica las migraciones existentes (o `migrate dev` en desarrollo)
npm run db:seed             # siembra los datos de demo (opcional, pero recomendado)
npm run dev                 # http://localhost:4000
```

`npm run db:reset` borra y recrea todo (migraciones + seed) — útil solo en una base de desarrollo, nunca en producción.

**Usuarios de demo** (creados por `prisma/seed.ts` — se regeneran, con nombres nuevos, cada vez que se corre `npm run db:seed`; esta tabla refleja la siembra actual):

| Usuario | Contraseña | Rol |
|---|---|---|
| admin | admin123 | ADMINISTRADOR |
| recepcion | recepcion123 | RECEPCIONISTA |
| patricia.mendoza | vet123 | VETERINARIO (Medicina General) |
| diego.herrera | vet123 | VETERINARIO (Dermatología) |
| valeria.suarez | vet123 | VETERINARIO (Cirugía) |
| andres.paredes | vet123 | VETERINARIO (Odontología) |
| camila.rocha | vet123 | VETERINARIO (Oftalmología) |
| sebastian.guzman | vet123 | VETERINARIO (Medicina General) |

`GET /health` reporta el estado del servidor y de la conexión a la base de datos (`db.status`, `db.latenciaMs`).

## Estructura

```
backend/
├── TASKS.md
├── prisma/
│   ├── schema.prisma      Esquema real (ver también database/MODELO_DATOS.md)
│   ├── migrations/        Historial de migraciones aplicadas
│   └── seed.ts            Datos de demo (npm run db:seed)
└── src/
    ├── lib/prisma.ts      Cliente de Prisma compartido
    ├── repositories/      Único lugar que consulta la base de datos
    ├── services/          Lógica de negocio y reglas del dominio
    ├── controllers/       Traducen HTTP ↔ servicios
    ├── middlewares/       Auth (JWT + rol), latencia simulada opcional, errores centralizados
    └── routes/            Definición de endpoints
```

Ver [TASKS.md](TASKS.md) para el detalle de qué HU cubre cada endpoint.

## Deploy en Vercel

El servidor Express normal (`src/index.ts`, con `.listen()`) es solo para desarrollo local — Vercel no ejecuta procesos persistentes. El punto de entrada real en producción es [`api/index.ts`](api/index.ts), que exporta la app de Express directamente (sin `.listen()`); [`vercel.json`](vercel.json) reescribe todas las rutas hacia esa función para que Express siga resolviendo `/health` y `/api/*` con su propio router, sin cambios.

Antes de desplegar, en el proyecto de Vercel (Project Settings → Environment Variables) hay que configurar:
- `DATABASE_URL` y `DIRECT_URL` (las mismas del `.env`, apuntando a Supabase)
- `JWT_SECRET` (un valor propio, no el de demo)
- `FRONTEND_URL` (la URL del frontend ya desplegado) — sin esto, CORS queda abierto a cualquier origen
- `DEMO_DELAY_MS=0` (opcional)

## Hardening incluido

- **CORS restringido** vía `FRONTEND_URL` (arriba) — abierto solo si no está configurada.
- **Rate limiting** en `POST /api/auth/login`: 10 intentos cada 15 minutos por IP (`middlewares/rateLimit.middleware.ts`).
- **`helmet`** con la configuración por defecto (cabeceras HTTP de seguridad estándar).
- **Índice único parcial** en `Cita` (`veterinarioId`, `fechaHora` donde `estado <> 'CANCELADA'`) — blindaje a nivel de base de datos contra doble-reserva, además de la validación de aplicación.

`postinstall: prisma generate` ya está en `package.json` — Vercel lo corre automáticamente en cada build, así el cliente de Prisma queda generado con el binario correcto (`binaryTargets` en `prisma/schema.prisma` incluye `rhel-openssl-3.0.x` para el runtime Linux de Vercel).

## Licencia

Todos los derechos reservados — ver [LICENSE](LICENSE).
