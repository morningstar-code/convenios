/**
 * Sube secretos de .env / .env.local a Vercel **Production** (CLI Vercel en Windows no deja
 * marcar Preview “todas las ramas” sin rama Git; Replica en Preview desde el dashboard si hace falta).
 * Ejecutar: node scripts/push-env-vercel.cjs
 */
const { execSync } = require("node:child_process");
const crypto = require("node:crypto");
const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
require("dotenv").config({
  path: path.join(__dirname, "..", ".env.local"),
  override: false,
});

const root = path.join(__dirname, "..");
const SCOPE = "diegos-projects-d88486d0";
const PROD_URL = "https://convenios-diegos-projects-d88486d0.vercel.app";

function vercelEnvAddProduction(key, value) {
  const v = String(value).trim();
  if (!v) return;
  execSync(`vercel env add ${key} production --yes --sensitive --force --scope ${SCOPE}`, {
    cwd: root,
    input: v,
    encoding: "utf8",
    stdio: ["pipe", "inherit", "inherit"],
    shell: true,
  });
}

let jwt = process.env.JWT_SECRET?.trim();
if (!jwt || jwt === "change-me-in-production") {
  jwt = crypto.randomBytes(32).toString("hex");
  console.log("[push-env-vercel] JWT_SECRET: generado nuevo (tu .env local no se modifica)");
}

let cron = process.env.CRON_SECRET?.trim();
if (!cron || cron === "change-me-in-production") {
  cron = crypto.randomBytes(24).toString("hex");
  console.log("[push-env-vercel] CRON_SECRET: generado nuevo (tu .env local no se modifica)");
}

vercelEnvAddProduction("JWT_SECRET", jwt);
vercelEnvAddProduction("CRON_SECRET", cron);
vercelEnvAddProduction("OPENAI_API_KEY", process.env.OPENAI_API_KEY);
vercelEnvAddProduction("OPENAI_MODEL_EXTRACT", process.env.OPENAI_MODEL_EXTRACT);
vercelEnvAddProduction("OPENAI_MODEL_SUMMARY", process.env.OPENAI_MODEL_SUMMARY);
vercelEnvAddProduction("OPENAI_MODEL_RECOMMEND", process.env.OPENAI_MODEL_RECOMMEND);
vercelEnvAddProduction("NEXT_PUBLIC_APP_NAME", process.env.NEXT_PUBLIC_APP_NAME);
vercelEnvAddProduction("APP_URL", PROD_URL);

const blob = process.env.BLOB_READ_WRITE_TOKEN?.trim();
if (blob?.startsWith("vercel_blob")) {
  vercelEnvAddProduction("BLOB_READ_WRITE_TOKEN", blob);
} else {
  console.log(
    "[push-env-vercel] Sin BLOB_READ_WRITE_TOKEN en .env — enlaza la tienda Blob al proyecto en Vercel → Storage."
  );
}

if (!process.env.OPENAI_API_KEY?.trim()) {
  console.warn(
    "[push-env-vercel] OPENAI_API_KEY vacío: deploy sí, pero IA fallará hasta configurarla."
  );
}

console.log("[push-env-vercel] Listo (solo Production).");
