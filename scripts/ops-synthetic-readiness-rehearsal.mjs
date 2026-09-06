#!/usr/bin/env node
/**
 * 합성(비실고객) 운영 준비 리허설:
 * A) sample CSV dry-run → apply → reconcile → reapply unchanged
 * D) monitor no-alert (sink=none, 네트워크 0)
 * E) migration 011 read-only audit on the offline DB
 *
 * 실고객 CSV/운영 endpoint/외부 배포를 대체하지 않는다.
 * DATABASE_PATH 기본값(data/solarsimz.db)을 절대 사용하지 않는다 — 항상 temp offline DB.
 *
 * 사용:
 *   node scripts/ops-synthetic-readiness-rehearsal.mjs
 *   node scripts/ops-synthetic-readiness-rehearsal.mjs --report docs/audit/....json
 */
import Database from "better-sqlite3";
import {
  createHash,
  randomUUID,
} from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  openSync,
  closeSync,
  fsyncSync,
  renameSync,
  lstatSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SYNTH_CSV = path.join(
  root,
  "fixtures/measurements/sample-approved-synthetic.csv",
);
const FID = "101";
const ACTOR = "synth-rehearsal@local";
const CALC_VERSION = "synth-v1";

function parseArgs(argv) {
  let reportPath = path.join(
    root,
    "docs/audit",
    `${new Date().toISOString().slice(0, 10)}-synthetic-ops-rehearsal.json`,
  );
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--report") {
      reportPath = path.resolve(argv[++i] ?? "");
    } else if (argv[i].startsWith("--")) {
      throw new Error(`unknown flag ${argv[i]}`);
    }
  }
  return { reportPath };
}

function run(label, command, args, env) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(
      `${label} failed (exit ${result.status}): ${(result.stderr || result.stdout || "").slice(0, 500)}`,
    );
  }
  return result;
}

function sha256File(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function writeReportAtomic(reportPath, payload) {
  mkdirSync(path.dirname(reportPath), { recursive: true });
  if (existsSync(reportPath)) {
    const st = lstatSync(reportPath);
    if (st.isSymbolicLink() || !st.isFile()) {
      throw new Error("report path must be absent or a regular file");
    }
  }
  const tmp = `${reportPath}.${process.pid}.${Date.now()}.tmp`;
  const fd = openSync(tmp, "wx", 0o600);
  try {
    writeFileSync(fd, `${JSON.stringify(payload, null, 2)}\n`);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(tmp, reportPath);
}

function parseImportReport(stdout) {
  try {
    return JSON.parse(stdout);
  } catch {
    return { rawOk: false };
  }
}

function countFields(body) {
  const counts = body?.counts ?? {};
  return {
    inserted: counts.inserted ?? null,
    corrected: counts.corrected ?? null,
    unchanged: counts.unchanged ?? null,
    rejected: counts.rejected ?? null,
    rowCount: body?.rowCount ?? null,
  };
}

const { reportPath } = parseArgs(process.argv);
const workDir = mkdtempSync(path.join(tmpdir(), "solarsimz-synth-ops-"));
const dbPath = path.join(workDir, "offline.db");
const reportDry = path.join(workDir, "dry.json");
const reportApply = path.join(workDir, "apply.json");
const reportReconcile = path.join(workDir, "reconcile.json");
const reportReapply = path.join(workDir, "reapply.json");
const report011 = path.join(workDir, "audit011.json");

const evidence = {
  kind: "synthetic-ops-rehearsal",
  notRealCustomerData: true,
  checkedAt: new Date().toISOString(),
  baseCommitHint: "see git HEAD at run time",
  csvBasename: path.basename(SYNTH_CSV),
  csvSha256: null,
  fid: Number(FID),
  calculationVersion: CALC_VERSION,
  steps: {},
  ok: false,
  notes: [
    "Does not satisfy P5-T1 / P7-T3 / external E; synthetic only",
    "Uses isolated temp offline DB only (never the default live path)",
  ],
};

try {
  if (!existsSync(SYNTH_CSV)) {
    throw new Error("missing synthetic CSV fixture");
  }
  evidence.csvSha256 = sha256File(SYNTH_CSV);

  run("migrate", "node", ["scripts/migrate.mjs"], {
    DATABASE_PATH: dbPath,
  });
  run("seed", "node", ["scripts/seed.mjs"], {
    DATABASE_PATH: dbPath,
    ALLOW_DEMO_SEED: "true",
  });

  const db = new Database(dbPath);
  let tenantId;
  try {
    tenantId = db
      .prepare(`SELECT tenant_id AS t FROM users WHERE username = 'operator'`)
      .get().t;
    db.prepare(
      `INSERT OR REPLACE INTO firms (fid, seq, firm_name) VALUES (?, 1, ?)`,
    ).run(Number(FID), "합성 측정 업체");
    db.prepare(
      `INSERT OR REPLACE INTO tenant_firm_access
       (tenant_id, fid, can_view_pii, can_collect, created_at)
       VALUES (?, ?, 1, 1, ?)`,
    ).run(tenantId, Number(FID), new Date().toISOString());
    db.pragma("journal_mode = DELETE");
    try {
      db.pragma("wal_checkpoint(TRUNCATE)");
    } catch {
      // ignore
    }
  } finally {
    db.close();
  }
  for (const suffix of ["-wal", "-shm", "-journal"]) {
    const p = `${dbPath}${suffix}`;
    if (existsSync(p)) rmSync(p, { force: true });
  }

  const common = [
    "--db",
    dbPath,
    "--tenant",
    tenantId,
    "--fid",
    FID,
    "--csv",
    SYNTH_CSV,
    "--actor",
    ACTOR,
    "--calculation-version",
    CALC_VERSION,
    "--expected-sha256",
    evidence.csvSha256,
  ];

  const dry = run(
    "dry-run",
    "node",
    ["scripts/import-measurement-csv.mjs", ...common, "--report", reportDry],
    {},
  );
  const dryBody = parseImportReport(dry.stdout);
  evidence.steps.dryRun = {
    ok: dryBody.ok === true,
    ...countFields(dryBody),
  };

  const apply = run(
    "apply",
    "node",
    [
      "scripts/import-measurement-csv.mjs",
      ...common,
      "--apply",
      "--report",
      reportApply,
    ],
    {},
  );
  const applyBody = parseImportReport(apply.stdout);
  evidence.steps.apply = {
    ok: applyBody.ok === true,
    ...countFields(applyBody),
  };

  const reconcile = run(
    "reconcile",
    "node",
    [
      "scripts/import-measurement-csv.mjs",
      ...common,
      "--reconcile",
      "--report",
      reportReconcile,
    ],
    {},
  );
  const reconcileBody = parseImportReport(reconcile.stdout);
  evidence.steps.reconcile = {
    ok: reconcileBody.ok === true,
    mismatchCount: reconcileBody.mismatchCount ?? null,
  };

  // Capture ingested_at before reapply.
  const beforeDb = new Database(dbPath, { readonly: true, fileMustExist: true });
  let ingestedBefore;
  try {
    ingestedBefore = beforeDb
      .prepare(
        `SELECT ingested_at AS at FROM energy_measurements
         WHERE fid = ? ORDER BY observed_at LIMIT 1`,
      )
      .get(Number(FID))?.at;
  } finally {
    beforeDb.close();
  }

  const reapply = run(
    "reapply",
    "node",
    [
      "scripts/import-measurement-csv.mjs",
      ...common,
      "--apply",
      "--report",
      reportReapply,
    ],
    {},
  );
  const reapplyBody = parseImportReport(reapply.stdout);
  const afterDb = new Database(dbPath, { readonly: true, fileMustExist: true });
  let ingestedAfter;
  let measurementCount;
  try {
    ingestedAfter = afterDb
      .prepare(
        `SELECT ingested_at AS at FROM energy_measurements
         WHERE fid = ? ORDER BY observed_at LIMIT 1`,
      )
      .get(Number(FID))?.at;
    measurementCount = afterDb
      .prepare(`SELECT COUNT(*) AS c FROM energy_measurements WHERE fid = ?`)
      .get(Number(FID)).c;
  } finally {
    afterDb.close();
  }
  evidence.steps.reapply = {
    ok: reapplyBody.ok === true,
    ...countFields(reapplyBody),
    ingestedAtUnchanged: ingestedBefore === ingestedAfter,
    measurementCount,
  };

  const monitor = run(
    "monitor-no-alert",
    "node",
    ["scripts/monitor-collection-jobs.mjs"],
    {
      DATABASE_PATH: dbPath,
      KEPCO_ALERT_SINK: "none",
    },
  );
  const monitorBody = parseImportReport(monitor.stdout);
  const alert = monitorBody.alert ?? null;
  evidence.steps.monitorDay0 = {
    ok: monitor.status === 0,
    exitStatus: monitor.status,
    alertDelivered: alert?.delivered ?? null,
    alertReason: alert?.reason ?? null,
    queueStall: monitorBody.queueStall ?? null,
    staleRunning: monitorBody.staleRunning ?? null,
    failureStreakCount: Array.isArray(monitorBody.failureStreaks)
      ? monitorBody.failureStreaks.length
      : null,
  };

  const audit = run(
    "audit-011",
    "node",
    [
      "scripts/audit-migration-011.mjs",
      "--db",
      dbPath,
      "--env-alias",
      "synth-local",
      "--report",
      report011,
    ],
    {},
  );
  const auditSummary = parseImportReport(audit.stdout);
  evidence.steps.audit011 = {
    ok: auditSummary.ok === true && audit.status === 0,
    migration011Applied: auditSummary.migration011Applied ?? null,
    orphanCollectionJobs: auditSummary.orphanCollectionJobs ?? null,
    orphanEnergyMeasurements: auditSummary.orphanEnergyMeasurements ?? null,
    stopRecommended: auditSummary.stopRecommended ?? null,
  };

  evidence.ok =
    evidence.steps.dryRun.ok &&
    evidence.steps.apply.ok &&
    (evidence.steps.apply.inserted ?? 0) > 0 &&
    evidence.steps.reconcile.ok &&
    evidence.steps.reconcile.mismatchCount === 0 &&
    evidence.steps.reapply.ok &&
    (evidence.steps.reapply.unchanged ?? 0) > 0 &&
    evidence.steps.reapply.ingestedAtUnchanged === true &&
    evidence.steps.monitorDay0.ok &&
    evidence.steps.audit011.ok;

  evidence.runId = randomUUID();
  writeReportAtomic(reportPath, evidence);
  console.log(
    JSON.stringify(
      {
        ok: evidence.ok,
        reportBasename: path.basename(reportPath),
        csvSha256: evidence.csvSha256,
        measurementCount: evidence.steps.reapply.measurementCount,
        reconcileMismatch: evidence.steps.reconcile.mismatchCount,
        applyInserted: evidence.steps.apply.inserted,
        reapplyUnchanged: evidence.steps.reapply.unchanged,
        monitorOk: evidence.steps.monitorDay0.ok,
        audit011Ok: evidence.steps.audit011.ok,
      },
      null,
      2,
    ),
  );
  if (!evidence.ok) process.exitCode = 1;
} catch (error) {
  evidence.ok = false;
  evidence.error = error instanceof Error ? error.message : String(error);
  try {
    writeReportAtomic(reportPath, evidence);
  } catch {
    // ignore secondary failure
  }
  console.error(
    `[synth-ops-rehearsal] ${error instanceof Error ? error.message : error}`,
  );
  process.exitCode = 1;
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
