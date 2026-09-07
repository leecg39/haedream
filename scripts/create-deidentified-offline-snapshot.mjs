#!/usr/bin/env node
/**
 * Offline SQLite 스냅샷을 비식별 복사본으로 만든다 (라이브 WAL 거부).
 * 실고객 원문·절대경로를 로그/메타에 넣지 않는다.
 *
 * 필수 게이트:
 *   --i-approve-deidentify
 *   ALLOW_DEIDENTIFY=1
 *
 * 사용:
 *   ALLOW_DEIDENTIFY=1 node scripts/create-deidentified-offline-snapshot.mjs \
 *     --source /path/offline.db --out /path/deid.db --i-approve-deidentify
 *
 * 결과 DB·meta 는 항상 mode 0600.
 * P7-T2 체크박스는 운영자 attestation 전 완료 표시 금지.
 */
import Database from "better-sqlite3";
import { hashSync } from "bcryptjs";
import {
  chmodSync,
  closeSync,
  createReadStream,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const OWNER_RW = 0o600;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function die(message, code = 1) {
  console.error(`[deid-snapshot] ${message}`);
  process.exitCode = code;
}

function forceOwnerReadWriteOnly(filePath) {
  chmodSync(filePath, OWNER_RW);
  const mode = lstatSync(filePath).mode & 0o777;
  if (mode !== OWNER_RW) {
    throw new Error(
      `failed to enforce 0600 on ${path.basename(filePath)} (got ${mode.toString(8)})`,
    );
  }
}

function assertOfflineLeaf(dbPath) {
  const st = lstatSync(dbPath);
  if (st.isSymbolicLink() || !st.isFile()) {
    throw new Error("source must be a regular non-symlink file");
  }
  for (const suffix of ["-wal", "-shm", "-journal"]) {
    if (existsSync(`${dbPath}${suffix}`)) {
      throw new Error(
        `source has sidecar ${suffix}; pass offline snapshot first (db:offline-snapshot)`,
      );
    }
  }
}

function writeMetaAtomic(metaPath, payload) {
  if (existsSync(metaPath)) {
    const st = lstatSync(metaPath);
    if (st.isSymbolicLink() || !st.isFile()) {
      throw new Error("meta path must be absent or a regular file");
    }
    rmSync(metaPath, { force: true });
  }
  const tmp = `${metaPath}.${process.pid}.${Date.now()}.tmp`;
  const fd = openSync(tmp, "wx", OWNER_RW);
  try {
    writeFileSync(fd, `${JSON.stringify(payload, null, 2)}\n`);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  forceOwnerReadWriteOnly(tmp);
  renameSync(tmp, metaPath);
  forceOwnerReadWriteOnly(metaPath);
}

async function sha256File(filePath) {
  const hash = createHash("sha256");
  await new Promise((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolve);
  });
  return hash.digest("hex");
}

function tableExists(db, name) {
  return Boolean(
    db
      .prepare(
        `SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = ?`,
      )
      .get(name),
  );
}

function columnNames(db, table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().map((row) => row.name);
}

function parseArgs(argv) {
  let source = "";
  let out = "";
  let approve = false;
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--source") source = argv[++i] ?? "";
    else if (arg === "--out") out = argv[++i] ?? "";
    else if (arg === "--i-approve-deidentify") approve = true;
    else if (arg.startsWith("--")) {
      throw new Error(`unknown flag ${arg}`);
    }
  }
  if (!source || !out) {
    throw new Error(
      "usage: ALLOW_DEIDENTIFY=1 node scripts/create-deidentified-offline-snapshot.mjs --source <offline.db> --out <deid.db> --i-approve-deidentify",
    );
  }
  return {
    sourcePath: path.resolve(source),
    outPath: path.resolve(out),
    approve,
  };
}

function deidentify(db) {
  const actions = [];
  for (const table of ["firm_credentials", "firm_import_runs"]) {
    if (tableExists(db, table)) {
      db.exec(`DELETE FROM ${table}`);
      actions.push(`${table}:cleared`);
    }
  }
  if (tableExists(db, "sessions")) {
    db.exec(`DELETE FROM sessions`);
    actions.push("sessions:cleared");
  }
  if (tableExists(db, "audit_logs")) {
    // append-only triggers block UPDATE/DELETE; drop → purge → restore for de-id copies only.
    db.exec(`DROP TRIGGER IF EXISTS audit_logs_append_only_update`);
    db.exec(`DROP TRIGGER IF EXISTS audit_logs_append_only_delete`);
    db.exec(`DELETE FROM audit_logs`);
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS audit_logs_append_only_update
      BEFORE UPDATE ON audit_logs
      FOR EACH ROW
      BEGIN
        SELECT RAISE(ABORT, 'audit logs are append only');
      END;
    `);
    db.exec(`
      CREATE TRIGGER IF NOT EXISTS audit_logs_append_only_delete
      BEFORE DELETE ON audit_logs
      FOR EACH ROW
      BEGIN
        SELECT RAISE(ABORT, 'audit logs are append only');
      END;
    `);
    actions.push("audit_logs:cleared");
  }
  if (tableExists(db, "tenants")) {
    db.exec(`UPDATE tenants SET name = 'DEID-TENANT-' || id`);
    actions.push("tenants:name-redacted");
  }
  if (tableExists(db, "users")) {
    const deidHash = hashSync("deid-local-only", 8);
    db.prepare(
      `UPDATE users
       SET username = 'deid-' || substr(id, 1, 8),
           name = role || ' DEID',
           password_hash = ?`,
    ).run(deidHash);
    actions.push("users:redacted");
  }
  if (tableExists(db, "firms")) {
    const cols = new Set(columnNames(db, "firms"));
    const sets = [`firm_name = 'DEID-FIRM-' || fid`];
    if (cols.has("kepco_no")) sets.push(`kepco_no = 'KEPCO-' || fid`);
    for (const col of [
      "phone",
      "address_text",
      "manager",
      "boss",
      "memo",
      "pass",
      "bone",
      "kepco_cyber",
      "kepco_contract",
      "map_geo",
      "import_source_sha256",
    ]) {
      if (cols.has(col)) sets.push(`${col} = ''`);
    }
    db.exec(`UPDATE firms SET ${sets.join(", ")}`);
    actions.push("firms:redacted");
  }
  for (const table of [
    "kepco_summary",
    "kepco_hourly",
    "kepco_monthly",
    "kepco_daily_total",
    "kepco_interval",
    "kepco_billing",
    "kepco_contract",
    "kepco_collect_log",
    "collection_jobs",
  ]) {
    if (!tableExists(db, table)) continue;
    const cols = new Set(columnNames(db, table));
    if (cols.has("raw_json")) {
      db.exec(`UPDATE ${table} SET raw_json = '{}'`);
      actions.push(`${table}:raw_json-cleared`);
    }
    if (cols.has("message")) {
      db.exec(`UPDATE ${table} SET message = ''`);
      actions.push(`${table}:message-cleared`);
    }
    if (cols.has("error_message")) {
      db.exec(`UPDATE ${table} SET error_message = NULL`);
      actions.push(`${table}:error_message-cleared`);
    }
    if (cols.has("result_summary")) {
      db.exec(`UPDATE ${table} SET result_summary = NULL`);
      actions.push(`${table}:result_summary-cleared`);
    }
  }
  if (tableExists(db, "energy_measurement_corrections")) {
    const cols = new Set(columnNames(db, "energy_measurement_corrections"));
    const sets = [];
    if (cols.has("reason")) sets.push(`reason = NULL`);
    if (cols.has("corrected_by")) sets.push(`corrected_by = NULL`);
    if (sets.length) {
      db.exec(
        `UPDATE energy_measurement_corrections SET ${sets.join(", ")}`,
      );
      actions.push("energy_measurement_corrections:redacted");
    }
  }
  if (tableExists(db, "gateways")) {
    const cols = new Set(columnNames(db, "gateways"));
    const sets = [];
    if (cols.has("name")) sets.push(`name = 'DEID-GW-' || id`);
    if (cols.has("serial_number")) sets.push(`serial_number = ''`);
    if (sets.length) {
      db.exec(`UPDATE gateways SET ${sets.join(", ")}`);
      actions.push("gateways:redacted");
    }
  }
  if (tableExists(db, "facilities")) {
    const cols = new Set(columnNames(db, "facilities"));
    // facilities_version_increment requires version = old+1 on any UPDATE.
    const sets = [`version = version + 1`];
    if (cols.has("name")) sets.push(`name = 'DEID-FAC-' || id`);
    if (cols.has("process_name")) sets.push(`process_name = 'DEID'`);
    if (cols.has("group_name")) sets.push(`group_name = ''`);
    if (cols.has("updated_at")) sets.push(`updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`);
    db.exec(`UPDATE facilities SET ${sets.join(", ")}`);
    actions.push("facilities:redacted");
  }
  return actions;
}

function probePiiResidues(db) {
  const findings = [];
  for (const table of ["firm_credentials", "firm_import_runs"]) {
    if (tableExists(db, table)) {
      const n = db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get().c;
      if (n > 0) findings.push(`${table}:${n}`);
    }
  }
  if (tableExists(db, "firms")) {
    const cols = new Set(columnNames(db, "firms"));
    if (cols.has("phone")) {
      const n = db
        .prepare(
          `SELECT COUNT(*) AS c FROM firms WHERE length(trim(phone)) > 0`,
        )
        .get().c;
      if (n > 0) findings.push(`firms.phone:${n}`);
    }
    if (cols.has("address_text")) {
      const n = db
        .prepare(
          `SELECT COUNT(*) AS c FROM firms WHERE length(trim(address_text)) > 0`,
        )
        .get().c;
      if (n > 0) findings.push(`firms.address_text:${n}`);
    }
    const named = db
      .prepare(
        `SELECT COUNT(*) AS c FROM firms WHERE firm_name NOT LIKE 'DEID-FIRM-%'`,
      )
      .get().c;
    if (named > 0) findings.push(`firms.firm_name:${named}`);
  }
  if (tableExists(db, "sessions")) {
    const n = db.prepare(`SELECT COUNT(*) AS c FROM sessions`).get().c;
    if (n > 0) findings.push(`sessions:${n}`);
  }
  if (tableExists(db, "collection_jobs")) {
    const cols = new Set(columnNames(db, "collection_jobs"));
    if (cols.has("error_message")) {
      const n = db
        .prepare(
          `SELECT COUNT(*) AS c FROM collection_jobs
           WHERE error_message IS NOT NULL AND length(trim(error_message)) > 0`,
        )
        .get().c;
      if (n > 0) findings.push(`collection_jobs.error_message:${n}`);
    }
    if (cols.has("result_summary")) {
      const n = db
        .prepare(
          `SELECT COUNT(*) AS c FROM collection_jobs
           WHERE result_summary IS NOT NULL AND length(trim(result_summary)) > 0`,
        )
        .get().c;
      if (n > 0) findings.push(`collection_jobs.result_summary:${n}`);
    }
  }
  if (tableExists(db, "energy_measurement_corrections")) {
    const cols = new Set(columnNames(db, "energy_measurement_corrections"));
    if (cols.has("reason")) {
      const n = db
        .prepare(
          `SELECT COUNT(*) AS c FROM energy_measurement_corrections
           WHERE reason IS NOT NULL AND length(trim(reason)) > 0`,
        )
        .get().c;
      if (n > 0) findings.push(`energy_measurement_corrections.reason:${n}`);
    }
    if (cols.has("corrected_by")) {
      const n = db
        .prepare(
          `SELECT COUNT(*) AS c FROM energy_measurement_corrections
           WHERE corrected_by IS NOT NULL AND length(trim(corrected_by)) > 0`,
        )
        .get().c;
      if (n > 0) {
        findings.push(`energy_measurement_corrections.corrected_by:${n}`);
      }
    }
  }
  return findings;
}

const args = (() => {
  try {
    return parseArgs(process.argv);
  } catch (error) {
    die(error instanceof Error ? error.message : String(error));
    return null;
  }
})();

if (!args) {
  // exitCode set
} else if (process.env.ALLOW_DEIDENTIFY !== "1" || !args.approve) {
  die(
    "refusing: set ALLOW_DEIDENTIFY=1 and pass --i-approve-deidentify (operator gate)",
  );
} else {
  const metaPath = `${args.outPath}.meta.json`;
  let ownsSnapshot = false;
  try {
    assertOfflineLeaf(args.sourcePath);
    if (existsSync(args.outPath) || existsSync(metaPath)) {
      throw new Error("destination already exists; refuse overwrite");
    }
    mkdirSync(path.dirname(args.outPath), { recursive: true });

    // Prefer the shared offline snapshot tool so mode/WAL contracts stay unified.
    const snap = spawnSync(
      "node",
      [
        "scripts/create-offline-db-snapshot.mjs",
        args.sourcePath,
        args.outPath,
      ],
      { cwd: root, encoding: "utf8" },
    );
    if (snap.status !== 0) {
      throw new Error(snap.stderr || snap.stdout || "offline snapshot failed");
    }
    ownsSnapshot = true;
    forceOwnerReadWriteOnly(args.outPath);

    const db = new Database(args.outPath);
    let actions;
    try {
      db.pragma("journal_mode = DELETE");
      db.pragma("secure_delete = ON");
      db.exec("BEGIN IMMEDIATE");
      actions = deidentify(db);
      const residues = probePiiResidues(db);
      if (residues.length > 0) {
        db.exec("ROLLBACK");
        throw new Error(`deidentify residue remains: ${residues.join(",")}`);
      }
      db.exec("COMMIT");
      try {
        db.pragma("wal_checkpoint(TRUNCATE)");
      } catch {
        // ignore
      }
    } catch (error) {
      try {
        db.exec("ROLLBACK");
      } catch {
        // ignore
      }
      throw error;
    } finally {
      db.close();
    }
    for (const suffix of ["-wal", "-shm", "-journal"]) {
      const p = `${args.outPath}${suffix}`;
      if (existsSync(p)) rmSync(p, { force: true });
    }
    forceOwnerReadWriteOnly(args.outPath);

    const bytes = statSync(args.outPath).size;
    const sha256 = await sha256File(args.outPath);
    writeMetaAtomic(metaPath, {
      kind: "deidentified-offline-snapshot-meta",
      purpose: "migrate-rehearsal-or-audit",
      bytes,
      sha256,
      destBasename: path.basename(args.outPath),
      sourceBasename: path.basename(args.sourcePath),
      mode: "0600",
      actions,
      operatorGate: "ALLOW_DEIDENTIFY+i-approve-deidentify",
      attestationRequiredForP7T2: true,
      createdAt: new Date().toISOString(),
    });
    forceOwnerReadWriteOnly(args.outPath);
    forceOwnerReadWriteOnly(metaPath);

    console.log(
      JSON.stringify(
        {
          ok: true,
          bytes,
          sha256,
          destBasename: path.basename(args.outPath),
          metaBasename: path.basename(metaPath),
          mode: "0600",
          actionCount: actions.length,
          attestationRequiredForP7T2: true,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    for (const p of ownsSnapshot ? [args.outPath, metaPath] : []) {
      if (p && existsSync(p)) {
        try {
          rmSync(p, { force: true });
        } catch {
          // ignore
        }
      }
    }
    die(error instanceof Error ? error.message : String(error));
  }
}
