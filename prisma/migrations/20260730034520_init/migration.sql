-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMINISTRADOR', 'VETERINARIO', 'RECEPCIONISTA');

-- CreateEnum
CREATE TYPE "EstadoRegistro" AS ENUM ('ACTIVO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "EstadoCita" AS ENUM ('CONFIRMADA', 'ATENDIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoPagoAtencion" AS ENUM ('PENDIENTE', 'PAGADO');

-- CreateEnum
CREATE TYPE "TipoControlPreventivo" AS ENUM ('VACUNA', 'DESPARASITACION');

-- CreateEnum
CREATE TYPE "TipoMovimientoInventario" AS ENUM ('ENTRADA', 'SALIDA');

-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'QR');

-- CreateEnum
CREATE TYPE "CanalNotificacion" AS ENUM ('EMAIL', 'WHATSAPP_MANUAL', 'WHATSAPP_API');

-- CreateEnum
CREATE TYPE "EstadoNotificacion" AS ENUM ('PENDIENTE', 'ENVIADO', 'FALLIDO');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "apellidoPaterno" VARCHAR(80) NOT NULL,
    "apellidoMaterno" VARCHAR(80),
    "ci" VARCHAR(20) NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "telefono" VARCHAR(20),
    "direccion" TEXT,
    "rol" "Rol" NOT NULL,
    "estado" "EstadoRegistro" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Veterinario" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "matricula" VARCHAR(20) NOT NULL,
    "especialidad" VARCHAR(80) NOT NULL,
    "estado" "EstadoRegistro" NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Veterinario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Horario" (
    "id" SERIAL NOT NULL,
    "veterinarioId" INTEGER NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "horaInicio" TIME NOT NULL,
    "horaFin" TIME NOT NULL,

    CONSTRAINT "Horario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Propietario" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "apellidoPaterno" VARCHAR(80) NOT NULL,
    "apellidoMaterno" VARCHAR(80),
    "ci" VARCHAR(20) NOT NULL,
    "telefono" VARCHAR(20),
    "direccion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Propietario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mascota" (
    "id" SERIAL NOT NULL,
    "propietarioId" INTEGER NOT NULL,
    "nombre" VARCHAR(60) NOT NULL,
    "especie" VARCHAR(40) NOT NULL,
    "raza" VARCHAR(60),
    "color" VARCHAR(40),
    "sexo" VARCHAR(10),
    "fechaNacimiento" DATE,
    "peso" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mascota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cita" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "fechaHora" TIMESTAMP(3) NOT NULL,
    "duracionMin" INTEGER NOT NULL DEFAULT 30,
    "mascotaId" INTEGER NOT NULL,
    "veterinarioId" INTEGER NOT NULL,
    "tipoConsulta" VARCHAR(60) NOT NULL,
    "motivo" TEXT,
    "estado" "EstadoCita" NOT NULL DEFAULT 'CONFIRMADA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AtencionMedica" (
    "id" SERIAL NOT NULL,
    "mascotaId" INTEGER NOT NULL,
    "veterinarioId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diagnostico" TEXT NOT NULL,
    "tratamiento" TEXT NOT NULL,
    "examenesExternos" TEXT,
    "montoConsulta" DECIMAL(10,2) NOT NULL,
    "estadoPago" "EstadoPagoAtencion" NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AtencionMedica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pago" (
    "id" SERIAL NOT NULL,
    "atencionId" INTEGER NOT NULL,
    "metodoPago" "MetodoPago" NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ControlPreventivo" (
    "id" SERIAL NOT NULL,
    "mascotaId" INTEGER NOT NULL,
    "tipo" "TipoControlPreventivo" NOT NULL,
    "fechaAplicacion" DATE NOT NULL,
    "proximaDosis" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ControlPreventivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medicamento" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "stockActual" INTEGER NOT NULL DEFAULT 0,
    "stockMinimo" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medicamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoInventario" (
    "id" SERIAL NOT NULL,
    "medicamentoId" INTEGER NOT NULL,
    "tipo" "TipoMovimientoInventario" NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atencionId" INTEGER,

    CONSTRAINT "MovimientoInventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notificacion" (
    "id" SERIAL NOT NULL,
    "propietarioId" INTEGER NOT NULL,
    "citaId" INTEGER,
    "controlPreventivoId" INTEGER,
    "canal" "CanalNotificacion" NOT NULL,
    "mensaje" TEXT NOT NULL,
    "estado" "EstadoNotificacion" NOT NULL DEFAULT 'PENDIENTE',
    "enviadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_ci_key" ON "Usuario"("ci");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_username_key" ON "Usuario"("username");

-- CreateIndex
CREATE INDEX "Usuario_rol_idx" ON "Usuario"("rol");

-- CreateIndex
CREATE UNIQUE INDEX "Veterinario_usuarioId_key" ON "Veterinario"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Veterinario_matricula_key" ON "Veterinario"("matricula");

-- CreateIndex
CREATE INDEX "Veterinario_estado_idx" ON "Veterinario"("estado");

-- CreateIndex
CREATE INDEX "Horario_veterinarioId_idx" ON "Horario"("veterinarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Horario_veterinarioId_diaSemana_horaInicio_key" ON "Horario"("veterinarioId", "diaSemana", "horaInicio");

-- CreateIndex
CREATE UNIQUE INDEX "Propietario_ci_key" ON "Propietario"("ci");

-- CreateIndex
CREATE INDEX "Propietario_apellidoPaterno_nombre_idx" ON "Propietario"("apellidoPaterno", "nombre");

-- CreateIndex
CREATE INDEX "Mascota_propietarioId_idx" ON "Mascota"("propietarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Mascota_propietarioId_nombre_especie_key" ON "Mascota"("propietarioId", "nombre", "especie");

-- CreateIndex
CREATE UNIQUE INDEX "Cita_codigo_key" ON "Cita"("codigo");

-- CreateIndex
CREATE INDEX "Cita_veterinarioId_fechaHora_idx" ON "Cita"("veterinarioId", "fechaHora");

-- CreateIndex
CREATE INDEX "Cita_mascotaId_fechaHora_idx" ON "Cita"("mascotaId", "fechaHora");

-- CreateIndex
CREATE INDEX "Cita_estado_fechaHora_idx" ON "Cita"("estado", "fechaHora");

-- CreateIndex
CREATE INDEX "AtencionMedica_mascotaId_fecha_idx" ON "AtencionMedica"("mascotaId", "fecha");

-- CreateIndex
CREATE INDEX "AtencionMedica_estadoPago_idx" ON "AtencionMedica"("estadoPago");

-- CreateIndex
CREATE UNIQUE INDEX "Pago_atencionId_key" ON "Pago"("atencionId");

-- CreateIndex
CREATE INDEX "Pago_fecha_idx" ON "Pago"("fecha");

-- CreateIndex
CREATE INDEX "Pago_metodoPago_idx" ON "Pago"("metodoPago");

-- CreateIndex
CREATE INDEX "ControlPreventivo_mascotaId_idx" ON "ControlPreventivo"("mascotaId");

-- CreateIndex
CREATE INDEX "ControlPreventivo_proximaDosis_idx" ON "ControlPreventivo"("proximaDosis");

-- CreateIndex
CREATE UNIQUE INDEX "Medicamento_nombre_key" ON "Medicamento"("nombre");

-- CreateIndex
CREATE INDEX "MovimientoInventario_medicamentoId_fecha_idx" ON "MovimientoInventario"("medicamentoId", "fecha");

-- CreateIndex
CREATE INDEX "MovimientoInventario_atencionId_idx" ON "MovimientoInventario"("atencionId");

-- CreateIndex
CREATE INDEX "Notificacion_estado_idx" ON "Notificacion"("estado");

-- CreateIndex
CREATE INDEX "Notificacion_canal_estado_idx" ON "Notificacion"("canal", "estado");

-- AddForeignKey
ALTER TABLE "Veterinario" ADD CONSTRAINT "Veterinario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Horario" ADD CONSTRAINT "Horario_veterinarioId_fkey" FOREIGN KEY ("veterinarioId") REFERENCES "Veterinario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mascota" ADD CONSTRAINT "Mascota_propietarioId_fkey" FOREIGN KEY ("propietarioId") REFERENCES "Propietario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_mascotaId_fkey" FOREIGN KEY ("mascotaId") REFERENCES "Mascota"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_veterinarioId_fkey" FOREIGN KEY ("veterinarioId") REFERENCES "Veterinario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtencionMedica" ADD CONSTRAINT "AtencionMedica_mascotaId_fkey" FOREIGN KEY ("mascotaId") REFERENCES "Mascota"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtencionMedica" ADD CONSTRAINT "AtencionMedica_veterinarioId_fkey" FOREIGN KEY ("veterinarioId") REFERENCES "Veterinario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_atencionId_fkey" FOREIGN KEY ("atencionId") REFERENCES "AtencionMedica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ControlPreventivo" ADD CONSTRAINT "ControlPreventivo_mascotaId_fkey" FOREIGN KEY ("mascotaId") REFERENCES "Mascota"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoInventario" ADD CONSTRAINT "MovimientoInventario_medicamentoId_fkey" FOREIGN KEY ("medicamentoId") REFERENCES "Medicamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoInventario" ADD CONSTRAINT "MovimientoInventario_atencionId_fkey" FOREIGN KEY ("atencionId") REFERENCES "AtencionMedica"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_propietarioId_fkey" FOREIGN KEY ("propietarioId") REFERENCES "Propietario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_citaId_fkey" FOREIGN KEY ("citaId") REFERENCES "Cita"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_controlPreventivoId_fkey" FOREIGN KEY ("controlPreventivoId") REFERENCES "ControlPreventivo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
