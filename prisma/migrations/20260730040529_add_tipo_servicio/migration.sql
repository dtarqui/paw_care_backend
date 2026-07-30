/*
  Warnings:

  - Added the required column `tipoServicio` to the `AtencionMedica` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AtencionMedica" ADD COLUMN     "tipoServicio" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "AtencionMedica_tipoServicio_fecha_idx" ON "AtencionMedica"("tipoServicio", "fecha");
