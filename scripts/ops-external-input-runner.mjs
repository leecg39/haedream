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
 * actions:
 *   import-measurements | verify-webhook-config | audit-migration-011 | migrate-rehearsal
 *   | attest-large-db | register-observation | declare-external-env
 *
 * 이 runner 는 docs/planning/06-tasks.md 체크박스를 절대 자동으로 바꾸지 않는다.
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
  createReadStream,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OWNER_RW = 0o600;
const DEFAULT_ATTEST_MIN_BYTES = 1_000_000_000;

function attestMinBytes() {
  const raw = process.env.OPS_ATTEST_MIN_BYTES;
  if (raw == null || raw === "") return DEFAULT_ATTEST_MIN_BYTES;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) {
    throw new Error("OPS_ATTEST_MIN_BYTES must be a finite number >= 1");
  }
  return n;
}

function assertOutsideRepo(filePath, label) {
  const resolved = path.resolve(filePath);
  const rootResolved = path.resolve(root);
  if (
    resolved === rootResolved ||
    resolved.startsWith(`${rootResolved}${path.sep}`)
  ) {
    throw new Error(`${label} must live outside the git worktree`);
  }
  return resolved;
}

function assertOfflineLeaf(filePath) {
  const st = lstatSync(filePath);
  if (st.isSymbolicLink() || !st.isFile()) {
    throw new Error("snapshot must be a regular non-symlink file");
  }
  for (const suffix of ["-wal", "-shm", "-journal"]) {
    if (existsSync(`${filePath}${suffix}`)) {
      throw new Error(`snapshot has sidecar ${suffix}; refuse live/hot DB`);
    }
  }
  return st;
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

function requireNonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value.trim();
}

function requireIsoDate(value, label) {
  const s = requireNonEmptyString(value, label);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new Error(`${label} must be YYYY-MM-DD`);
  }
  const t = Date.parse(`${s}T00:00:00Z`);
  if (!Number.isFinite(t)) throw new Error(`${label} is not a valid date`);
  return s;
}

function requireSha256Hex(value, label) {
  const s = requireNonEmptyString(value, label).toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(s)) {
    throw new Error(`${label} must be 64-char lowercase hex sha256`);
  }
  return s;
}

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

async function runAction(action, evidenceDir) {
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

  if (type === "attest-large-db") {
    if (action.iApproveAttestation !== true) {
      throw new Error("attest-large-db requires iApproveAttestation=true");
    }
    const operator = requireNonEmptyString(action.operator, "operator");
    const statement = requireNonEmptyString(action.statement, "statement");
    const expectedSha256 = requireSha256Hex(
      action.expectedSha256,
      "expectedSha256",
    );
    if (!action.snapshotPath) {
      throw new Error("attest-large-db requires snapshotPath (outside repo)");
    }
    const snapshotPath = assertOutsideRepo(action.snapshotPath, "snapshotPath");
    const st = assertOfflineLeaf(snapshotPath);
    const minBytes = attestMinBytes();
    if (st.size < minBytes) {
      throw new Error(
        `snapshot bytes ${st.size} < required minimum ${minBytes}`,
      );
    }
    const actualSha256 = await sha256File(snapshotPath);
    if (actualSha256 !== expectedSha256) {
      throw new Error("snapshot sha256 does not match expectedSha256");
    }
    const mode = (st.mode & 0o777).toString(8).padStart(3, "0");
    const evidence = {
      kind: "operator-attest-large-db",
      checkedAt: new Date().toISOString(),
      operator,
      statement,
      snapshotBasename: path.basename(snapshotPath),
      bytes: st.size,
      sha256: actualSha256,
      mode,
      minBytesRequired: minBytes,
      attestationRecorded: true,
      p7t2CheckboxAutoChecked: false,
      notes: [
        "attestation recorded only; docs/planning/06-tasks.md P7-T2 stays unchecked until human updates with this evidence",
      ],
    };
    const evidencePath = path.join(evidenceDir, "attest-large-db.json");
    writeEvidenceAtomic(evidencePath, evidence);
    return {
      type,
      ok: true,
      exitStatus: 0,
      snapshotBasename: evidence.snapshotBasename,
      bytes: st.size,
      sha256: actualSha256,
      mode,
      reportBasename: path.basename(evidencePath),
      p7t2CheckboxAutoChecked: false,
    };
  }

  if (type === "register-observation") {
    const envAlias = requireNonEmptyString(action.envAlias, "envAlias");
    const startDate = requireIsoDate(action.startDate, "startDate");
    const alertOwner = requireNonEmptyString(action.alertOwner, "alertOwner");
    const plannedDays = Number(action.plannedDays);
    if (!Number.isInteger(plannedDays) || plannedDays < 7) {
      throw new Error("plannedDays must be an integer >= 7");
    }
    if (typeof action.faultInjectApproved !== "boolean") {
      throw new Error("faultInjectApproved must be boolean");
    }
    const registry = {
      kind: "observation-window-registry",
      checkedAt: new Date().toISOString(),
      envAlias,
      startDate,
      plannedDays,
      alertOwner,
      faultInjectApproved: action.faultInjectApproved,
      observationComplete: false,
      calendarDaysRequired: plannedDays,
      notes: [
        "Day0 registry only; D remains incomplete until >= plannedDays calendar daily logs exist",
        "do not fault-inject unless faultInjectApproved=true",
      ],
    };
    const registryPath = path.join(evidenceDir, "observation-registry.json");
    writeEvidenceAtomic(registryPath, registry);
    const mdPath = path.join(evidenceDir, `observation-day-0-${startDate}.md`);
    const md = `# Observation Day 0 registry

- envAlias: ${envAlias}
- startDate: ${startDate}
- plannedDays: ${plannedDays}
- alertOwner: (recorded)
- faultInjectApproved: ${action.faultInjectApproved}
- observationComplete: false
`;
    writeFileSync(mdPath, md, { mode: OWNER_RW });
    force0600(mdPath);
    writeEvidenceAtomic(`${mdPath}.meta.json`, {
      kind: "observation-day-0-meta",
      envAlias,
      startDate,
      plannedDays,
      observationComplete: false,
    });
    return {
      type,
      ok: true,
      exitStatus: 0,
      envAlias,
      startDate,
      plannedDays,
      observationComplete: false,
      reportBasename: path.basename(registryPath),
    };
  }

  if (type === "declare-external-env") {
    if (action.iConfirmInventory !== true) {
      throw new Error("declare-external-env requires iConfirmInventory=true");
    }
    const operator = requireNonEmptyString(action.operator, "operator");
    if (!Array.isArray(action.environments) || action.environments.length < 1) {
      throw new Error("environments must be a non-empty array");
    }
    const environments = action.environments.map((env, index) => {
      const alias = requireNonEmptyString(
        env?.alias,
        `environments[${index}].alias`,
      );
      if (typeof env.hostsSolarSimz !== "boolean") {
        throw new Error(
          `environments[${index}].hostsSolarSimz must be boolean`,
        );
      }
      const pre011BackupProvenance = requireNonEmptyString(
        env.pre011BackupProvenance,
        `environments[${index}].pre011BackupProvenance`,
      );
      const row = {
        alias,
        hostsSolarSimz: env.hostsSolarSimz,
        pre011BackupProvenance,
      };
      if (env.hostsSolarSimz) {
        if (!env.offlineSnapshotPath) {
          throw new Error(
            `environments[${index}] hosts SolarSimz but offlineSnapshotPath missing`,
          );
        }
        const snap = assertOutsideRepo(
          env.offlineSnapshotPath,
          `environments[${index}].offlineSnapshotPath`,
        );
        assertOfflineLeaf(snap);
        row.offlineSnapshotBasename = path.basename(snap);
        row.offlineSnapshotBytes = lstatSync(snap).size;
      }
      return row;
    });
    const hostingCount = environments.filter((e) => e.hostsSolarSimz).length;
    const evidence = {
      kind: "operator-declare-external-env",
      checkedAt: new Date().toISOString(),
      operator,
      environments,
      hostingSolarSimzCount: hostingCount,
      noExternalSolarSimzDeployDeclared: hostingCount === 0,
      migration011AuditComplete: false,
      notes: [
        "inventory attestation only; run audit-migration-011 on each hosting env offline snapshot before claiming E complete",
        "Hostinger RO discovery finding of zero SolarSimz projects is consistent with hostingSolarSimzCount=0 but does not alone close E",
      ],
    };
    const evidencePath = path.join(evidenceDir, "declare-external-env.json");
    writeEvidenceAtomic(evidencePath, evidence);
    return {
      type,
      ok: true,
      exitStatus: 0,
      hostingSolarSimzCount: hostingCount,
      noExternalSolarSimzDeployDeclared: hostingCount === 0,
      migration011AuditComplete: false,
      reportBasename: path.basename(evidencePath),
    };
  }

  throw new Error(`unknown action type ${type}`);
}

async function main() {
  const manifestArgIndex = process.argv.indexOf("--manifest");
  const manifestArg =
    manifestArgIndex >= 0 ? process.argv[manifestArgIndex + 1] : "";

  if (!manifestArg) {
    die(
      "usage: node scripts/ops-external-input-runner.mjs --manifest /outside/manifest.json",
    );
    return;
  }

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
      results.push(await runAction(action, evidenceDir));
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

await main();

