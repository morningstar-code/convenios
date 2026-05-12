/**
 * Histórico: normalización de enums en SQLite legacy.
 * Con PostgreSQL este proyecto usa solo vigente | cancelado desde el esquema actual.
 */
import "dotenv/config";

async function main() {
  console.log(
    "[migrate-convention-status] Sin efecto en PostgreSQL. Si venías de SQLite antigua, usa npm run db:import-sqlite tras migrate deploy."
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
