-- AlterTable
ALTER TABLE "Mascota" ADD COLUMN     "estado" "EstadoRegistro" NOT NULL DEFAULT 'ACTIVO';

-- CreateIndex
CREATE INDEX "Mascota_estado_idx" ON "Mascota"("estado");
