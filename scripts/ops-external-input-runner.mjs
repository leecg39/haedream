#!/usr/bin/env node
/**
 * 외부 승인 입력 매니페스트 실행기.
 * 매니페스트는 저장소 밖 JSON 이어야 하며, secret/URL/실경로를 stdout 에 그대로 찍지 않는다.
 *
 * 예시 스키마: docs/ops/external-input-manifest.example.json
 *
 * 사용:
 *   node scripts/ops-external-input-runner.mjs --manifest /path/outside/manifest.json
 *
 * actions: import-measurements | verify-webhook-config | audit-migration-011 | migrate-rehearsal
 */
import {
  existsSync,
  lstatSync,
  readFileSync,
  mkdirSync,
  openSync,
  closeSync,
  fsyncSync,
  writeFileSync,
  renameSync,
  chmodSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OWNER_RW = 0o600;

function die(message, code = 1) {
  console.error(`[ops-input-runner] ${message}`);
  process.exitCode = code;
}

function force0600(filePath) {
  chmodSync(filePath, OWNER_RW);
}

function writeEvidenceAtomic(filePath, payload) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const fd = openSync(tmp, "wx", OWNER_RW);
  try {
    writeFileSync(fd, `${JSON.stringify(payload, null, 2)}\n`);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  force0600(tmp);
  renameSync(tmp, filePath);
  force0600(filePath);
}

function redactPath(p) {
  if (!p) return null;
  return path.basename(String(p));
}

function loadManifest(manifestPath) {
  const st = lstatSync(manifestPath);
  if (st.isSymbolicLink() || !st.isFile()) {
    throw new Error("manifest must be a regular non-symlink file");
  }
  const resolved = path.resolve(manifestPath);
  const rootResolved = path.resolve(root);
  if (
    resolved === rootResolved ||
    resolved.startsWith(`${rootResolved}${path.sep}`)
  ) {
    throw new Error(
      "manifest must live outside the git worktree (refuse in-repo secrets)",
    );
  }
  const raw = JSON.parse(readFileSync(resolved, "utf8"));
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("manifest must be a JSON object");
  }
  if (!Array.isArray(raw.actions) || raw.actions.length < 1) {
    throw new Error("manifest.actions must be a non-empty array");
  }
  return { resolved, raw };
}

function runNode(args, env = {}) {
  return spawnSync("node", args, {
    cwd: root,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
}

function runAction(action, evidenceDir) {
  const type = action?.type;
  if (type === "import-measurements") {
    const required = [
      "db",
      "tenant",
      "fid",
      "csv",
      "actor",
      "calculationVersion",
      "expectedSha256",
    ];
    for (const key of required) {
      if (!action[key]) throw new Error(`import-measurements missing ${key}`);
    }
    const mode = action.mode === "apply"
      ? "apply"
      : action.mode === "reconcile"
        ? "reconcile"
        : "dry-run";
    const report = path.join(evidenceDir, `import-${mode}.json`);
    const args = [
      "scripts/import-measurement-csv.mjs",
      "--db",
      action.db,
      "--tenant",
      String(action.tenant),
      "--fid",
      String(action.fid),
      "--csv",
      action.csv,
      "--actor",
      String(action.actor),
      "--calculation-version",
      String(action.calculationVersion),
      "--expected-sha256",
      String(action.expectedSha256),
      "--report",
      report,
    ];
    if (mode === "apply") args.push("--apply");
    if (mode === "reconcile") args.push("--reconcile");
    const result = runNode(args);
    let body = {};
    try {
      body = JSON.parse(result.stdout);
    } catch {
      body = {};
    }
    return {
      type,
      mode,
      ok: result.status === 0 && body.ok === true,
      exitStatus: result.status,
      csvBasename: redactPath(action.csv),
      dbBasename: redactPath(action.db),
      counts: body.counts ?? null,
      mismatchCount: body.mismatchCount ?? null,
      reportBasename: path.basename(report),
    };
  }

  if (type === "verify-webhook-config") {
    const env = {
      KEPCO_ALERT_SINK: "webhook",
      KEPCO_ALERT_WEBHOOK_URL: action.url ?? "",
      KEPCO_ALERT_WEBHOOK_SECRET: action.secret ?? "",
      KEPCO_ALERT_WEBHOOK_HOST_ALLOWLIST: action.hostAllowlist ?? "",
    };
    if (action.timeoutMs != null) {
      env.KEPCO_ALERT_TIMEOUT_MS = String(action.timeoutMs);
    }
    const result = runNode(["scripts/verify-webhook-config.mjs"], env);
    let body = {};
    try {
      body = JSON.parse(result.stdout);
    } catch {
      body = {};
    }
    return {
      type,
      ok: result.status === 0 && body.ok === true,
      exitStatus: result.status,
      errorCode: body.errorCode ?? null,
      hostAllowlistCount: body.hostAllowlistCount ?? null,
      secretLength: body.secretLength ?? null,
      // never echo url/secret
    };
  }

  if (type === "audit-migration-011") {
    if (!action.db || !action.envAlias) {
      throw new Error("audit-migration-011 requires db and envAlias");
    }
    const report = path.join(
      evidenceDir,
      `audit-011-${String(action.envAlias).replace(/[^\w.-]+/g, "_")}.json`,
    );
    const result = runNode([
      "scripts/audit-migration-011.mjs",
      "--db",
      action.db,
      "--env-alias",
      String(action.envAlias),
      "--report",
      report,
    ]);
    let body = {};
    try {
      body = JSON.parse(result.stdout);
    } catch {
      body = {};
    }
    return {
      type,
      ok: body.ok === true && (result.status === 0 || result.status === 2),
      exitStatus: result.status,
      envAlias: action.envAlias,
      migration011Applied: body.migration011Applied ?? null,
      orphanCollectionJobs: body.orphanCollectionJobs ?? null,
      orphanEnergyMeasurements: body.orphanEnergyMeasurements ?? null,
      stopRecommended: body.stopRecommended ?? null,
      reportBasename: path.basename(report),
    };
  }

  if (type === "migrate-rehearsal") {
    if (!action.sourceDb) throw new Error("migrate-rehearsal requires sourceDb");
    const result = runNode([
      "scripts/migrate-rehearsal.mjs",
      "--source-db",
      action.sourceDb,
    ]);
    return {
      type,
      ok: result.status === 0,
      exitStatus: result.status,
      sourceBasename: redactPath(action.sourceDb),
    };
  }

  throw new Error(`unknown action type ${type}`);
}

const manifestArgIndex = process.argv.indexOf("--manifest");
const manifestArg =
  manifestArgIndex >= 0 ? process.argv[manifestArgIndex + 1] : "";

if (!manifestArg) {
  die(
    "usage: node scripts/ops-external-input-runner.mjs --manifest /outside/manifest.json",
  );
} else {
  try {
    const { raw } = loadManifest(manifestArg);
    const evidenceDir = path.resolve(
      raw.evidenceDir ||
        path.join(
          path.dirname(path.resolve(manifestArg)),
          "evidence",
          new Date().toISOString().slice(0, 10),
        ),
    );
    mkdirSync(evidenceDir, { recursive: true });
    const results = [];
    for (const action of raw.actions) {
      results.push(runAction(action, evidenceDir));
    }
    const summary = {
      ok: results.every((row) => row.ok),
      checkedAt: new Date().toISOString(),
      envAlias: raw.envAlias ?? "unspecified",
      actionCount: results.length,
      results,
      notes: [
        "stdout omits secrets and absolute paths",
        "does not auto-check docs/planning/06-tasks.md boxes",
      ],
    };
    const summaryPath = path.join(evidenceDir, "runner-summary.json");
    writeEvidenceAtomic(summaryPath, summary);
    console.log(
      JSON.stringify(
        {
          ok: summary.ok,
          envAlias: summary.envAlias,
          actionCount: summary.actionCount,
          evidenceBasename: path.basename(summaryPath),
          results: results.map((row) => ({
            type: row.type,
            ok: row.ok,
            exitStatus: row.exitStatus,
          })),
        },
        null,
        2,
      ),
    );
    if (!summary.ok) process.exitCode = 1;
  } catch (error) {
    die(error instanceof Error ? error.message : String(error));
  }
}
