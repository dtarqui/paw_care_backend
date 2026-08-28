-- Pasa el inventario de "un stock por medicamento" a "lotes con vencimiento".
--
-- El orden importa: primero se crea la tabla de lotes, después se traspasa a un lote
-- el stock que ya había, y recién entonces se borra la columna vieja. El script que
-- genera `prisma migrate diff` pone el DROP arriba de todo, lo que habría vaciado el
-- inventario existente.

-- CreateTable
CREATE TABLE "st_medication_batches" (
    "id" SERIAL NOT NULL,
    "medicationId" INTEGER NOT NULL,
    "batchNumber" VARCHAR(40),
    "expiresOn" DATE,
    "quantity" INTEGER NOT NULL,
    "receivedOn" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "st_medication_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "st_medication_batches_medicationId_expiresOn_idx" ON "st_medication_batches"("medicationId", "expiresOn");

-- AddForeignKey
ALTER TABLE "st_medication_batches" ADD CONSTRAINT "st_medication_batches_medicationId_fkey" FOREIGN KEY ("medicationId") REFERENCES "st_medications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "st_inventory_moves" ADD COLUMN     "batchId" INTEGER;

-- CreateIndex
CREATE INDEX "st_inventory_moves_batchId_idx" ON "st_inventory_moves"("batchId");

-- AddForeignKey
ALTER TABLE "st_inventory_moves" ADD CONSTRAINT "st_inventory_moves_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "st_medication_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- El stock que ya existía pasa a ser un lote sin número ni vencimiento: es lo que se
-- sabe de él. Sin fecha, no entra en las alertas de vencimiento hasta que alguien
-- registre lotes de verdad.
INSERT INTO "st_medication_batches" ("medicationId", "quantity", "receivedOn")
SELECT "id", "currentStock", CURRENT_DATE FROM "st_medications" WHERE "currentStock" > 0;

-- AlterTable
ALTER TABLE "st_medications" DROP COLUMN "currentStock";
