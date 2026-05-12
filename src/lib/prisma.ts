import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

function validateDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim() ?? "";
  if (!url) throw new Error("DATABASE_URL no está definida.");
  if (url.startsWith("file:")) {
    throw new Error(
      "DATABASE_URL apunta a SQLite (file:...). Esta versión usa PostgreSQL. " +
        "Consulta .env.example y docker-compose.yml; migra datos con npm run db:import-sqlite."
    );
  }
  if (!url.startsWith("postgres")) {
    throw new Error("DATABASE_URL debe ser postgres:// o postgresql://");
  }
  return url;
}

function getPool(): Pool {
  const connectionString = validateDatabaseUrl();
  if (!globalForPrisma.pgPool) {
    globalForPrisma.pgPool = new Pool({ connectionString });
  }
  return globalForPrisma.pgPool;
}

function createPrismaClient() {
  const adapter = new PrismaPg(getPool());
  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/** Para scripts CLI: cierra Prisma y el pool pg para que el proceso termine sin hang. */
export async function disconnectPrismaAndPool(): Promise<void> {
  await prisma.$disconnect();
  const pool = globalForPrisma.pgPool;
  if (pool) {
    await pool.end();
    globalForPrisma.pgPool = undefined;
  }
}

export default prisma;
