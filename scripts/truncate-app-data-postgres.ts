/**
 * Vacía todas las tablas de la app en PostgreSQL (mantiene el historial de migraciones _prisma_migrations).
 * Útil antes de `npm run db:import-sqlite` si ya había seeds u otros usuarios que chocan por email/IDs.
 *
 * Requiere DATABASE_URL apuntando al Postgres objetivo.
 */
import prisma, { disconnectPrismaAndPool } from "../src/lib/prisma";

async function main() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      convention_ai_outputs,
      convention_audit_logs,
      convention_alerts,
      convention_drafts,
      convention_documents,
      conventions,
      sessions,
      users
    CASCADE;
  `);
  console.log("✅ Tablas de aplicación vaciadas (users, conventions, docs, …).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectPrismaAndPool();
  });
