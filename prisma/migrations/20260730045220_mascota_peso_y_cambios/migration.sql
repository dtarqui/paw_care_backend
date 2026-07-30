-- AlterTable
ALTER TABLE "AtencionMedica" ADD COLUMN     "peso" DECIMAL(5,2);

-- CreateTable
CREATE TABLE "CambioMascota" (
    "id" SERIAL NOT NULL,
    "mascotaId" INTEGER NOT NULL,
    "campo" TEXT NOT NULL,
    "valorAnterior" TEXT,
    "valorNuevo" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" INTEGER,

    CONSTRAINT "CambioMascota_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CambioMascota_mascotaId_fecha_idx" ON "CambioMascota"("mascotaId", "fecha");

-- AddForeignKey
ALTER TABLE "CambioMascota" ADD CONSTRAINT "CambioMascota_mascotaId_fkey" FOREIGN KEY ("mascotaId") REFERENCES "Mascota"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CambioMascota" ADD CONSTRAINT "CambioMascota_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
