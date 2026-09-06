import process from "node:process";
import { migrate, resolveDatabasePath } from "./migrate.mjs";

function valueOf(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const tenantId = valueOf("--tenant")?.trim();
const fidInput = valueOf("--fids")?.trim();
if (!tenantId || !fidInput) {
  throw new Error("--tenant and --fids are required");
}

const fidTokens = fidInput.split(",").map((value) => value.trim());
if (
  fidTokens.length === 0 ||
  fidTokens.some((value) => !/^\d+$/.test(value))
) {
  throw new Error("--fids must be a comma-separated list of non-negative integers");
}
const fids = [...new Set(fidTokens.map(Number))];
if (fids.some((fid) => !Number.isSafeInteger(fid))) {
  throw new Error("--fids contains an unsafe integer");
}

const databasePath = valueOf("--db");
if (databasePath) process.env.DATABASE_PATH = databasePath;

const canViewPii = process.argv.includes("--can-view-pii") ? 1 : 0;
const canCollect = process.argv.includes("--can-collect") ? 1 : 0;
const db = migrate();

try {
  if (!db.prepare("SELECT 1 FROM tenants WHERE id = ?").get(tenantId)) {
    throw new Error(`tenant does not exist: ${tenantId}`);
  }
  const existing = new Set(
    (db
      .prepare(
        `SELECT fid FROM firms WHERE fid IN (${fids.map(() => "?").join(",")})`,
      )
      .all(...fids)).map((row) => row.fid),
  );
  const missing = fids.filter((fid) => !existing.has(fid));
  if (missing.length > 0) {
    throw new Error(`firms do not exist: ${missing.join(",")}`);
  }

  const upsert = db.prepare(
    `INSERT INTO tenant_firm_access
     (tenant_id, fid, can_view_pii, can_collect, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(tenant_id, fid) DO UPDATE SET
       can_view_pii = excluded.can_view_pii,
       can_collect = excluded.can_collect`,
  );
  const now = new Date().toISOString();
  db.transaction(() => {
    for (const fid of fids) {
      upsert.run(tenantId, fid, canViewPii, canCollect, now);
    }
  })();
  console.log(
    `Granted ${fids.length} firm(s) to tenant ${tenantId} in ${resolveDatabasePath()}`,
  );
} finally {
  db.close();
}
