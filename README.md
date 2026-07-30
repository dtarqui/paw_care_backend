# Backend — PawCare

API REST en Node.js + Express + TypeScript.

## Modo demo (actual)

Este backend corre hoy en **modo demo**: sin base de datos real, con datos estáticos en memoria (`src/data/`) y una latencia artificial (`DEMO_DELAY_MS`, 700ms por defecto) para que el frontend muestre sus estados de carga como lo haría contra un backend real. La arquitectura en capas (rutas → controladores → servicios → repositorios) es la misma que usará el backend definitivo — solo cambia qué hay detrás del repositorio (arrays en memoria hoy, Prisma + PostgreSQL después).

```bash
cp .env.example .env   # o edítalo directamente, ya trae valores de demo
npm install
npm run dev             # http://localhost:4000
```

**Usuarios de demo** (ver `src/data/usuarios.data.ts`):

| Usuario | Contraseña | Rol |
|---|---|---|
| admin | admin123 | ADMINISTRADOR |
| veterinario | vet123 | VETERINARIO |
| recepcion | recepcion123 | RECEPCIONISTA |

Endpoints disponibles: `POST /api/auth/login`, `GET /api/dashboard/modulos`, `GET /api/mascotas`, `GET /api/veterinarios`, `GET/POST/PATCH /api/citas*`, `GET/POST /api/pagos*`.

## Camino a producción

Para reemplazar los datos estáticos por PostgreSQL + Prisma real: ver [TASKS.md](TASKS.md) (cola de tareas por HU) y [prisma/schema.prisma](prisma/schema.prisma) (esquema ya diseñado, ver `database/MODELO_DATOS.md`). La capa de `repositories/` es intencionalmente la única que necesita cambiar — servicios y controladores no deberían tocarse.

Estructura actual:
```
backend/
├── TASKS.md
├── prisma/schema.prisma   Esquema real, listo para cuando se conecte PostgreSQL
└── src/
    ├── data/              "Base de datos" en memoria del modo demo
    ├── repositories/      Acceso a datos — único lugar a reemplazar por Prisma
    ├── services/          Lógica de negocio
    ├── controllers/       Traducen HTTP ↔ servicios
    ├── middlewares/       Auth (JWT + rol), delay simulado, errores centralizados
    └── routes/            Definición de endpoints
```
