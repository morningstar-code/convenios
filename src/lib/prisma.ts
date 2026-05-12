import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function validateDatabaseUrl(): void {
  const url = process.env.DATABASE_URL?.trim() ?? "";
  if (!url) throw new Error("DATABASE_URL no está definida.");
  if (url.startsWith("file:")) {
    throw new Error(
      "DATABASE_URL apunta a SQLite (file:...). Esta versión usa PostgreSQL. " +
        "Consulta .env.example y docker-compose.yml; migra datos con npm run db:import-sqlite."
    );
  }
  if (!url.startsWith("postgres")) {
    throw new Error('DATABASE_URL debe ser postgres:// o postgresql://');
  }
}

function createPrismaClient() {
  validateDatabaseUrl();
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
