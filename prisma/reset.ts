/**
 * Reset seguro de la base de PawCare.
 *
 * NO usa `prisma migrate reset`: el schema `public` de Supabase está compartido con
 * otro proyecto (tablas con prefijo `mt_`, con datos reales), y `migrate reset` dropea
 * el schema entero. Este script dropea **solo** las tablas y enums de PawCare —
 * las que llevan el prefijo `st_` más los tipos enum del `schema.prisma` — y deja
 * intacto todo lo demás.
 *
 * Después de correrlo hay que aplicar las migraciones y sembrar:
 *   npx prisma migrate deploy && npx prisma db seed
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ENUM_TYPES = [
  "Role",
  "RecordStatus",
  "AppointmentStatus",
  "VisitPaymentStatus",
  "PreventiveControlType",
  "InventoryMoveType",
  "PaymentMethod",
  "QrChargeStatus",
  "NotificationChannel",
  "NotificationStatus",
  "AuditAction",
];

async function main() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename LIKE 'st\\_%'
    ORDER BY tablename
  `;

  if (tables.length === 0) {
    console.log("No hay tablas st_* que borrar.");
  } else {
    const list = tables.map((t) => `"${t.tablename}"`).join(", ");
    await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS ${list} CASCADE`);
    console.log(`Tablas dropeadas (${tables.length}): ${tables.map((t) => t.tablename).join(", ")}`);
  }

  const enumList = ENUM_TYPES.map((e) => `"${e}"`).join(", ");
  await prisma.$executeRawUnsafe(`DROP TYPE IF EXISTS ${enumList} CASCADE`);
  console.log(`Enums dropeados: ${ENUM_TYPES.length}`);

  // El historial de migraciones es solo de PawCare (el otro proyecto no usa Prisma Migrate).
  await prisma.$executeRawUnsafe(`DELETE FROM "_prisma_migrations"`);
  console.log("Historial de migraciones limpiado.");

  const left = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
  `;
  console.log("\nTablas que quedan en public:");
  left.forEach((t) => console.log("  ", t.tablename));
  console.log("\nSiguiente paso: npx prisma migrate deploy && npx prisma db seed");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
