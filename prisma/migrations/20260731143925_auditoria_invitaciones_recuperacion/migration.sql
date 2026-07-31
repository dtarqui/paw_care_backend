-- CreateEnum
CREATE TYPE "AccionAuditoria" AS ENUM ('ACTIVAR_CUENTA', 'DESACTIVAR_CUENTA', 'RESTABLECER_PASSWORD', 'CAMBIAR_ROL', 'INVITAR_VETERINARIO');

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "email" VARCHAR(120);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "usadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvitacionVeterinario" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(120) NOT NULL,
    "nombre" VARCHAR(80),
    "token" TEXT NOT NULL,
    "invitadoPorId" INTEGER NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "aceptadaEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvitacionVeterinario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroAuditoria" (
    "id" SERIAL NOT NULL,
    "actorId" INTEGER,
    "accion" "AccionAuditoria" NOT NULL,
    "entidadTipo" VARCHAR(40) NOT NULL,
    "entidadId" INTEGER,
    "detalle" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroAuditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_usuarioId_idx" ON "PasswordResetToken"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "InvitacionVeterinario_token_key" ON "InvitacionVeterinario"("token");

-- CreateIndex
CREATE INDEX "InvitacionVeterinario_invitadoPorId_idx" ON "InvitacionVeterinario"("invitadoPorId");

-- CreateIndex
CREATE INDEX "InvitacionVeterinario_email_idx" ON "InvitacionVeterinario"("email");

-- CreateIndex
CREATE INDEX "RegistroAuditoria_fecha_idx" ON "RegistroAuditoria"("fecha");

-- CreateIndex
CREATE INDEX "RegistroAuditoria_actorId_idx" ON "RegistroAuditoria"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvitacionVeterinario" ADD CONSTRAINT "InvitacionVeterinario_invitadoPorId_fkey" FOREIGN KEY ("invitadoPorId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistroAuditoria" ADD CONSTRAINT "RegistroAuditoria_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

