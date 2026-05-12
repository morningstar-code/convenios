/**
 * Enlaza (o recrea) una tienda Vercel Blob al proyecto y crea las variables de entorno.
 *
 * Usa el mismo token que el CLI (~/.vercel auth.json). NO imprime secretos.
 *
 * Opcional: VERCEL_TEAM_ID, VERCEL_PROJECT_ID (por defecto los del proyecto convenios).
 *
 * Ejecutar desde convenios-app: node scripts/vercel-link-blob-store.cjs
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const TEAM_ID = process.env.VERCEL_TEAM_ID || "team_QE7xtoboAQ0BlzSSPWkMayO0";
const PROJECT_ID = process.env.VERCEL_PROJECT_ID || "prj_kpL6MZMrP4x9eMRCov5jL0cKrtEn";

function getToken() {
  if (process.env.VERCEL_TOKEN?.trim()) return process.env.VERCEL_TOKEN.trim();
  const authPath = path.join(process.env.APPDATA || "", "com.vercel.cli", "Data", "auth.json");
  return JSON.parse(fs.readFileSync(authPath, "utf8")).token;
}

function api(method, pathnameWithQuery, bodyObj) {
  const token = getToken();
  const body = bodyObj != null ? JSON.stringify(bodyObj) : null;
  return new Promise((resolve, reject) => {
    const opts = {
      method,
      hostname: "api.vercel.com",
      path: pathnameWithQuery,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } : {}),
      },
    };
    const req = https.request(opts, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => resolve({ status: res.statusCode, body: d }));
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function listStores() {
  const q = new URLSearchParams({ teamId: TEAM_ID });
  const r = await api("GET", `/v1/storage/stores?${q}`);
  if (r.status !== 200) throw new Error(`list stores HTTP ${r.status}: ${r.body.slice(0, 400)}`);
  const j = JSON.parse(r.body);
  return j.stores || [];
}

async function deleteBlobStore(storeId) {
  const q = new URLSearchParams({ teamId: TEAM_ID });
  const r = await api("DELETE", `/v1/storage/stores/blob/${encodeURIComponent(storeId)}?${q}`);
  if (r.status !== 200 && r.status !== 204) {
    throw new Error(`delete ${storeId} HTTP ${r.status}: ${r.body.slice(0, 400)}`);
  }
}

async function createBlobStore(name) {
  const q = new URLSearchParams({ teamId: TEAM_ID });
  const r = await api("POST", `/v1/storage/stores/blob?${q}`, {
    name,
    region: "iad1",
    access: "public",
  });
  if (r.status !== 200) throw new Error(`create store HTTP ${r.status}: ${r.body.slice(0, 600)}`);
  const j = JSON.parse(r.body);
  return j.store?.id || j.storeId || j.id;
}

async function connectStore(storeId) {
  const q = new URLSearchParams({ teamId: TEAM_ID });
  const r = await api(
    "POST",
    `/v1/storage/stores/${encodeURIComponent(storeId)}/connections?${q}`,
    {
      envVarEnvironments: ["production", "preview"],
      projectId: PROJECT_ID,
      type: "integration",
    }
  );
  if (r.status !== 200 && r.status !== 201) {
    throw new Error(`connect HTTP ${r.status}: ${r.body.slice(0, 600)}`);
  }
}

(async () => {
  console.log("[blob-link] Team:", TEAM_ID, "Project:", PROJECT_ID);

  const connectOnly = process.env.CONNECT_EXISTING_STORE_ID?.trim();
  if (connectOnly) {
    console.log("[blob-link] Solo enlazar tienda existente:", connectOnly);
    await connectStore(connectOnly);
    console.log("[blob-link] Enlace aplicado.");
    return;
  }

  let stores = await listStores();
  console.log("[blob-link] Recursos storage en el equipo:", stores.length);

  const blobStores = stores.filter((s) => s.type === "blob");
  console.log("[blob-link] Tiendas Blob (type=blob):", blobStores.length);

  const orphanBlobs = blobStores.filter((s) => /convenios/i.test(s.name || ""));
  if (orphanBlobs.length > 0) {
    console.log(
      "[blob-link] Eliminando Blob huérfanas con nombre convenios:",
      orphanBlobs.map((s) => `${s.name} (${s.id})`).join(", ")
    );
    for (const s of orphanBlobs) {
      try {
        await deleteBlobStore(s.id);
        console.log("[blob-link] Eliminada:", s.id);
      } catch (e) {
        console.warn("[blob-link] Saltando eliminación de", s.id, "-", e.message);
      }
    }
    stores = await listStores();
  }

  const blobCount = stores.filter((s) => s.type === "blob").length;
  console.log("[blob-link] Tiendas Blob tras limpieza:", blobCount);

  if (blobCount >= 5) {
    console.error(
      "[blob-link] Hay 5 tiendas Blob (máximo por equipo). Elimina alguna Blob que no uses en Vercel → Storage → Blob y vuelve a ejecutar este script."
    );
    process.exit(1);
  }

  const name = `convenios-prod-${Date.now().toString(36)}`;
  console.log("[blob-link] Creando tienda:", name);
  const storeId = await createBlobStore(name);
  console.log("[blob-link] Creada:", storeId);

  console.log("[blob-link] Enlazando al proyecto + variables Production/Preview…");
  await connectStore(storeId);

  console.log(
    "[blob-link] Listo. Ejecuta en este repo: vercel env pull .env.vercel.tmp --environment production --yes"
  );
  console.log("[blob-link] Luego: npm run db:sync-uploads-to-blob (con DATABASE_URL + BLOB_READ_WRITE_TOKEN cargados).");
})().catch((e) => {
  console.error("[blob-link] Error:", e.message || e);
  process.exit(1);
});
