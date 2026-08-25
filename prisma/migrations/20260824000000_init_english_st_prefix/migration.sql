-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'VET', 'RECEPTIONIST');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('CONFIRMED', 'ATTENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VisitPaymentStatus" AS ENUM ('PENDING', 'PAID');

-- CreateEnum
CREATE TYPE "PreventiveControlType" AS ENUM ('VACCINE', 'DEWORMING');

-- CreateEnum
CREATE TYPE "InventoryMoveType" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'TRANSFER', 'QR');

-- CreateEnum
CREATE TYPE "QrChargeStatus" AS ENUM ('PENDING', 'CONFIRMED', 'EXPIRED', 'ERROR');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'WHATSAPP_MANUAL', 'WHATSAPP_API');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('ACTIVATE_ACCOUNT', 'DEACTIVATE_ACCOUNT', 'RESET_PASSWORD', 'CHANGE_ROLE', 'INVITE_VET');

-- CreateTable
CREATE TABLE "st_users" (
    "id" SERIAL NOT NULL,
    "firstName" VARCHAR(80) NOT NULL,
    "paternalLastName" VARCHAR(80) NOT NULL,
    "maternalLastName" VARCHAR(80),
    "nationalId" VARCHAR(20) NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "email" VARCHAR(120),
    "phone" VARCHAR(20),
    "address" TEXT,
    "role" "Role" NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "selfRegistered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "st_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "st_vets" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "licenseNumber" VARCHAR(20) NOT NULL,
    "specialty" VARCHAR(80) NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "st_vets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "st_schedules" (
    "id" SERIAL NOT NULL,
    "vetId" INTEGER NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TIME NOT NULL,
    "endTime" TIME NOT NULL,

    CONSTRAINT "st_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "st_owners" (
    "id" SERIAL NOT NULL,
    "firstName" VARCHAR(80) NOT NULL,
    "paternalLastName" VARCHAR(80) NOT NULL,
    "maternalLastName" VARCHAR(80),
    "nationalId" VARCHAR(20) NOT NULL,
    "phone" VARCHAR(20),
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "st_owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "st_pets" (
    "id" SERIAL NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "species" VARCHAR(40) NOT NULL,
    "breed" VARCHAR(60),
    "color" VARCHAR(40),
    "sex" VARCHAR(10),
    "birthDate" DATE,
    "weight" DECIMAL(5,2),
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "st_pets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "st_appointments" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "dateTime" TIMESTAMP(3) NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 30,
    "petId" INTEGER NOT NULL,
    "vetId" INTEGER NOT NULL,
    "consultationType" VARCHAR(60) NOT NULL,
    "reason" TEXT,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'CONFIRMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "st_appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "st_medical_visits" (
    "id" SERIAL NOT NULL,
    "petId" INTEGER NOT NULL,
    "vetId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diagnosis" TEXT NOT NULL,
    "treatment" TEXT NOT NULL,
    "externalExams" TEXT,
    "serviceType" TEXT NOT NULL,
    "weight" DECIMAL(5,2),
    "consultationFee" DECIMAL(10,2) NOT NULL,
    "paymentStatus" "VisitPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "st_medical_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "st_payments" (
    "id" SERIAL NOT NULL,
    "visitId" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "st_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "st_qr_charges" (
    "id" SERIAL NOT NULL,
    "visitId" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "QrChargeStatus" NOT NULL DEFAULT 'PENDING',
    "provider" VARCHAR(40) NOT NULL,
    "externalReference" VARCHAR(100),
    "qrPayload" TEXT,
    "expiresAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "st_qr_charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "st_preventive_controls" (
    "id" SERIAL NOT NULL,
    "petId" INTEGER NOT NULL,
    "type" "PreventiveControlType" NOT NULL,
    "appliedOn" DATE NOT NULL,
    "nextDoseOn" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "st_preventive_controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "st_medications" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "currentStock" INTEGER NOT NULL DEFAULT 0,
    "minimumStock" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "st_medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "st_inventory_moves" (
    "id" SERIAL NOT NULL,
    "medicationId" INTEGER NOT NULL,
    "type" "InventoryMoveType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visitId" INTEGER,

    CONSTRAINT "st_inventory_moves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "st_notifications" (
    "id" SERIAL NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "appointmentId" INTEGER,
    "preventiveControlId" INTEGER,
    "channel" "NotificationChannel" NOT NULL,
    "message" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "st_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "st_pet_changes" (
    "id" SERIAL NOT NULL,
    "petId" INTEGER NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER,

    CONSTRAINT "st_pet_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "st_password_reset_tokens" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "st_password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "st_vet_invitations" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(120) NOT NULL,
    "name" VARCHAR(80),
    "token" TEXT NOT NULL,
    "invitedById" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "st_vet_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "st_audit_logs" (
    "id" SERIAL NOT NULL,
    "actorId" INTEGER,
    "action" "AuditAction" NOT NULL,
    "entityType" VARCHAR(40) NOT NULL,
    "entityId" INTEGER,
    "details" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "st_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "st_users_nationalId_key" ON "st_users"("nationalId");

-- CreateIndex
CREATE UNIQUE INDEX "st_users_username_key" ON "st_users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "st_users_email_key" ON "st_users"("email");

-- CreateIndex
CREATE INDEX "st_users_role_idx" ON "st_users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "st_vets_userId_key" ON "st_vets"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "st_vets_licenseNumber_key" ON "st_vets"("licenseNumber");

-- CreateIndex
CREATE INDEX "st_vets_status_idx" ON "st_vets"("status");

-- CreateIndex
CREATE INDEX "st_schedules_vetId_idx" ON "st_schedules"("vetId");

-- CreateIndex
CREATE UNIQUE INDEX "st_schedules_vetId_dayOfWeek_startTime_key" ON "st_schedules"("vetId", "dayOfWeek", "startTime");

-- CreateIndex
CREATE UNIQUE INDEX "st_owners_nationalId_key" ON "st_owners"("nationalId");

-- CreateIndex
CREATE INDEX "st_owners_paternalLastName_firstName_idx" ON "st_owners"("paternalLastName", "firstName");

-- CreateIndex
CREATE INDEX "st_pets_ownerId_idx" ON "st_pets"("ownerId");

-- CreateIndex
CREATE INDEX "st_pets_status_idx" ON "st_pets"("status");

-- CreateIndex
CREATE UNIQUE INDEX "st_pets_ownerId_name_species_key" ON "st_pets"("ownerId", "name", "species");

-- CreateIndex
CREATE UNIQUE INDEX "st_appointments_code_key" ON "st_appointments"("code");

-- CreateIndex
CREATE INDEX "st_appointments_vetId_dateTime_idx" ON "st_appointments"("vetId", "dateTime");

-- CreateIndex
CREATE INDEX "st_appointments_petId_dateTime_idx" ON "st_appointments"("petId", "dateTime");

-- CreateIndex
CREATE INDEX "st_appointments_status_dateTime_idx" ON "st_appointments"("status", "dateTime");

-- CreateIndex
CREATE INDEX "st_medical_visits_petId_date_idx" ON "st_medical_visits"("petId", "date");

-- CreateIndex
CREATE INDEX "st_medical_visits_paymentStatus_idx" ON "st_medical_visits"("paymentStatus");

-- CreateIndex
CREATE INDEX "st_medical_visits_serviceType_date_idx" ON "st_medical_visits"("serviceType", "date");

-- CreateIndex
CREATE UNIQUE INDEX "st_payments_visitId_key" ON "st_payments"("visitId");

-- CreateIndex
CREATE INDEX "st_payments_date_idx" ON "st_payments"("date");

-- CreateIndex
CREATE INDEX "st_payments_method_idx" ON "st_payments"("method");

-- CreateIndex
CREATE UNIQUE INDEX "st_qr_charges_externalReference_key" ON "st_qr_charges"("externalReference");

-- CreateIndex
CREATE INDEX "st_qr_charges_visitId_idx" ON "st_qr_charges"("visitId");

-- CreateIndex
CREATE INDEX "st_qr_charges_status_idx" ON "st_qr_charges"("status");

-- CreateIndex
CREATE INDEX "st_preventive_controls_petId_idx" ON "st_preventive_controls"("petId");

-- CreateIndex
CREATE INDEX "st_preventive_controls_nextDoseOn_idx" ON "st_preventive_controls"("nextDoseOn");

-- CreateIndex
CREATE UNIQUE INDEX "st_medications_name_key" ON "st_medications"("name");

-- CreateIndex
CREATE INDEX "st_inventory_moves_medicationId_date_idx" ON "st_inventory_moves"("medicationId", "date");

-- CreateIndex
CREATE INDEX "st_inventory_moves_visitId_idx" ON "st_inventory_moves"("visitId");

-- CreateIndex
CREATE INDEX "st_notifications_status_idx" ON "st_notifications"("status");

-- CreateIndex
CREATE INDEX "st_notifications_channel_status_idx" ON "st_notifications"("channel", "status");

-- CreateIndex
CREATE INDEX "st_pet_changes_petId_date_idx" ON "st_pet_changes"("petId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "st_password_reset_tokens_token_key" ON "st_password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "st_password_reset_tokens_userId_idx" ON "st_password_reset_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "st_vet_invitations_token_key" ON "st_vet_invitations"("token");

-- CreateIndex
CREATE INDEX "st_vet_invitations_invitedById_idx" ON "st_vet_invitations"("invitedById");

-- CreateIndex
CREATE INDEX "st_vet_invitations_email_idx" ON "st_vet_invitations"("email");

-- CreateIndex
CREATE INDEX "st_audit_logs_date_idx" ON "st_audit_logs"("date");

-- CreateIndex
CREATE INDEX "st_audit_logs_actorId_idx" ON "st_audit_logs"("actorId");

-- AddForeignKey
ALTER TABLE "st_vets" ADD CONSTRAINT "st_vets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "st_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "st_schedules" ADD CONSTRAINT "st_schedules_vetId_fkey" FOREIGN KEY ("vetId") REFERENCES "st_vets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "st_pets" ADD CONSTRAINT "st_pets_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "st_owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "st_appointments" ADD CONSTRAINT "st_appointments_petId_fkey" FOREIGN KEY ("petId") REFERENCES "st_pets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "st_appointments" ADD CONSTRAINT "st_appointments_vetId_fkey" FOREIGN KEY ("vetId") REFERENCES "st_vets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "st_medical_visits" ADD CONSTRAINT "st_medical_visits_petId_fkey" FOREIGN KEY ("petId") REFERENCES "st_pets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "st_medical_visits" ADD CONSTRAINT "st_medical_visits_vetId_fkey" FOREIGN KEY ("vetId") REFERENCES "st_vets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "st_payments" ADD CONSTRAINT "st_payments_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "st_medical_visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "st_qr_charges" ADD CONSTRAINT "st_qr_charges_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "st_medical_visits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "st_preventive_controls" ADD CONSTRAINT "st_preventive_controls_petId_fkey" FOREIGN KEY ("petId") REFERENCES "st_pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "st_inventory_moves" ADD CONSTRAINT "st_inventory_moves_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "st_medications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "st_inventory_moves" ADD CONSTRAINT "st_inventory_moves_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "st_medical_visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "st_notifications" ADD CONSTRAINT "st_notifications_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "st_owners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "st_notifications" ADD CONSTRAINT "st_notifications_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "st_appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "st_notifications" ADD CONSTRAINT "st_notifications_preventiveControlId_fkey" FOREIGN KEY ("preventiveControlId") REFERENCES "st_preventive_controls"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "st_pet_changes" ADD CONSTRAINT "st_pet_changes_petId_fkey" FOREIGN KEY ("petId") REFERENCES "st_pets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "st_pet_changes" ADD CONSTRAINT "st_pet_changes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "st_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "st_password_reset_tokens" ADD CONSTRAINT "st_password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "st_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "st_vet_invitations" ADD CONSTRAINT "st_vet_invitations_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "st_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "st_audit_logs" ADD CONSTRAINT "st_audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "st_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Blindaje a nivel de base de datos contra doble-reserva exacta: un mismo
-- veterinario no puede tener dos citas activas (no CANCELLED) al mismo
-- dateTime. La validación de aplicación (ScheduleConflictError, 409) ya
-- cubre esto en el camino normal; este índice es un respaldo para
-- condiciones de carrera. El DSL de Prisma no soporta índices únicos
-- parciales (WHERE), por eso va como SQL manual dentro de esta migración
-- — ver database/MODELO_DATOS.md sección 5.
CREATE UNIQUE INDEX "appointment_vet_datetime_active_idx"
  ON "st_appointments" ("vetId", "dateTime")
  WHERE status <> 'CANCELLED';
