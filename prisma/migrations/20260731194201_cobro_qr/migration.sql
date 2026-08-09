-- CreateEnum
CREATE TYPE "EstadoCobroQr" AS ENUM ('PENDIENTE', 'CONFIRMADO', 'EXPIRADO', 'ERROR');

-- CreateTable
CREATE TABLE "CobroQr" (
    "id" SERIAL NOT NULL,
    "atencionId" INTEGER NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "estado" "EstadoCobroQr" NOT NULL DEFAULT 'PENDIENTE',
    "proveedor" VARCHAR(40) NOT NULL,
    "referenciaExterna" VARCHAR(100),
    "qrPayload" TEXT,
    "expiraEn" TIMESTAMP(3),
    "confirmadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CobroQr_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CobroQr_referenciaExterna_key" ON "CobroQr"("referenciaExterna");

-- CreateIndex
CREATE INDEX "CobroQr_atencionId_idx" ON "CobroQr"("atencionId");

-- CreateIndex
CREATE INDEX "CobroQr_estado_idx" ON "CobroQr"("estado");

-- AddForeignKey
ALTER TABLE "CobroQr" ADD CONSTRAINT "CobroQr_atencionId_fkey" FOREIGN KEY ("atencionId") REFERENCES "AtencionMedica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
