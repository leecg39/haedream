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
 * 이 runner 는 docs/planning/06-tasks.md 체크박스를 절대 자동으로 바꾸지 않는다.
 */
import {
  ATTEST_MIN_BYTES,
  SafeInputError,
  safeInputErrorMessage,
  assertMode0600,
  assertOpsSqliteSnapshot,
  assertOutsideRepoPath,
  ensureEvidenceDir,
  force0600,
  immutableEvidencePath,
  requireIsoDate,
  requireNonEmptyString,
  requireSafeAlias,
  requireSha256Hex,
  writeEvidenceAtomic,
  writeEvidenceTextAtomic,
} from "./lib/ops-external-input-guard.mjs";
import {
  createReadStream,
  existsSync,
  readFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";

const ACTION_TYPES = new Set([
  "import-measurements", "verify-webhook-config", "audit-migration-011",
  "migrate-rehearsal", "attest-large-db", "register-observation", "declare-external-env",
]);

// Child tools inherit private creation permissions as well.
process.umask(0o077);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function die(message, code = 1) {
  console.error(`[ops-input-runner] ${message}`);
  process.exitCode = code;
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

function redactPath(p) {
  if (!p) return null;
  return path.basename(String(p));
}

function loadManifest(manifestPath) {
  const { resolved, st } = assertOutsideRepoPath(manifestPath, "manifest", {
    mustExist: true,
  });
  if (!st.isFile()) {
    throw new SafeInputError("manifest must be a regular non-symlink file");
  }
  assertMode0600(st, "manifest");
  let raw;
  const manifestText = readFileSync(resolved, "utf8");
  try {
    raw = JSON.parse(manifestText);
  } catch {
    throw new SafeInputError("manifest must contain valid JSON");
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new SafeInputError("manifest must be a JSON object");
  }
  if (!Array.isArray(raw.actions) || raw.actions.length < 1) {
    throw new SafeInputError("manifest.actions must be a non-empty array");
  }
  for (const action of raw.actions) {
    if (!ACTION_TYPES.has(action?.type)) {
      throw new SafeInputError("unknown action type");
    }
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

async function runAction(action, evidenceDir, runId) {
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
      if (!action[key]) throw new SafeInputError(`import-measurements missing ${key}`);
    }
    const dbLeaf = assertOpsSqliteSnapshot(action.db, "import-measurements.db", {
      require0600: true,
    });
    const csvInfo = assertOutsideRepoPath(action.csv, "import-measurements.csv", {
      mustExist: true,
    });
    if (!csvInfo.st.isFile()) {
      throw new SafeInputError("import-measurements.csv must be a regular file");
    }
    assertMode0600(csvInfo.st, "import-measurements.csv");
    const mode = action.mode === "apply"
      ? "apply"
      : action.mode === "reconcile"
        ? "reconcile"
        : "dry-run";
    const report = immutableEvidencePath(
      evidenceDir,
      `import-${mode}.${runId}`,
    );
    const args = [
      "scripts/import-measurement-csv.mjs",
      "--db",
      dbLeaf.real,
      "--tenant",
      String(action.tenant),
      "--fid",
      String(action.fid),
      "--csv",
      csvInfo.real,
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
    if (existsSync(report)) {
      force0600(report);
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
    };
  }

  if (type === "audit-migration-011") {
    if (!action.db || !action.envAlias) {
      throw new SafeInputError("audit-migration-011 requires db and envAlias");
    }
    const alias = requireSafeAlias(action.envAlias, "envAlias");
    const dbLeaf = assertOpsSqliteSnapshot(action.db, "audit-migration-011.db", {
      require0600: true,
    });
    const report = immutableEvidencePath(
      evidenceDir,
      `audit-011-${alias}.${runId}`,
    );
    const result = runNode([
      "scripts/audit-migration-011.mjs",
      "--db",
      dbLeaf.real,
      "--env-alias",
      alias,
      "--report",
      report,
    ]);
    let body = {};
    try {
      body = JSON.parse(result.stdout);
    } catch {
      body = {};
    }
    if (existsSync(report)) {
      force0600(report);
    }
    return {
      type,
      ok: body.ok === true && result.status === 0 && body.stopRecommended === false,
      exitStatus: result.status,
      envAlias: alias,
      migration011Applied: body.migration011Applied ?? null,
      orphanCollectionJobs: body.orphanCollectionJobs ?? null,
      orphanEnergyMeasurements: body.orphanEnergyMeasurements ?? null,
      stopRecommended: body.stopRecommended ?? null,
      reportBasename: path.basename(report),
    };
  }

  if (type === "migrate-rehearsal") {
    if (!action.sourceDb) throw new SafeInputError("migrate-rehearsal requires sourceDb");
    const source = assertOpsSqliteSnapshot(
      action.sourceDb,
      "migrate-rehearsal.sourceDb",
      { require0600: true },
    );
    const report = immutableEvidencePath(evidenceDir, `migrate-rehearsal.${runId}`);
    const result = runNode([
      "scripts/migrate-rehearsal.mjs",
      "--source-db",
      source.real,
      "--report",
      report,
    ]);
    return {
      type,
      ok: result.status === 0,
      exitStatus: result.status,
      sourceBasename: redactPath(action.sourceDb),
      reportBasename: path.basename(report),
    };
  }

  if (type === "attest-large-db") {
    if (action.iApproveAttestation !== true) {
      throw new SafeInputError("attest-large-db requires iApproveAttestation=true");
    }
    if (process.env.OPS_ATTEST_MIN_BYTES != null) {
      throw new SafeInputError(
        "OPS_ATTEST_MIN_BYTES override is forbidden; minimum is fixed at 1000000000",
      );
    }
    const operator = requireNonEmptyString(action.operator, "operator");
    const statement = requireNonEmptyString(action.statement, "statement");
    const expectedSha256 = requireSha256Hex(
      action.expectedSha256,
      "expectedSha256",
    );
    if (!action.snapshotPath) {
      throw new SafeInputError("attest-large-db requires snapshotPath (outside repo)");
    }
    const leaf = assertOpsSqliteSnapshot(
      action.snapshotPath,
      "attest-large-db.snapshotPath",
      { require0600: true },
    );
    if (leaf.st.size < ATTEST_MIN_BYTES) {
      throw new SafeInputError(
        `snapshot bytes ${leaf.st.size} < required minimum ${ATTEST_MIN_BYTES}`,
      );
    }
    const actualSha256 = await sha256File(leaf.real);
    if (actualSha256 !== expectedSha256) {
      throw new SafeInputError("snapshot sha256 does not match expectedSha256");
    }
    const mode = (leaf.st.mode & 0o777).toString(8).padStart(3, "0");
    const evidence = {
      kind: "operator-attest-large-db",
      checkedAt: new Date().toISOString(),
      operator,
      statement,
      snapshotBasename: path.basename(leaf.real),
      bytes: leaf.st.size,
      sha256: actualSha256,
      mode,
      minBytesRequired: ATTEST_MIN_BYTES,
      sqliteIntegrityOk: true,
      attestationRecorded: true,
      p7t2CheckboxAutoChecked: false,
      notes: [
        "attestation recorded only; docs/planning/06-tasks.md P7-T2 stays unchecked until human updates with this evidence",
      ],
    };
    const evidencePath = immutableEvidencePath(
      evidenceDir,
      `attest-large-db.${runId}`,
    );
    writeEvidenceAtomic(evidencePath, evidence);
    return {
      type,
      ok: true,
      exitStatus: 0,
      snapshotBasename: evidence.snapshotBasename,
      bytes: leaf.st.size,
      sha256: actualSha256,
      mode,
      reportBasename: path.basename(evidencePath),
      p7t2CheckboxAutoChecked: false,
    };
  }

  if (type === "register-observation") {
    const envAlias = requireSafeAlias(action.envAlias, "envAlias");
    const startDate = requireIsoDate(action.startDate, "startDate");
    const alertOwner = requireSafeAlias(action.alertOwner, "alertOwner");
    const plannedDays = Number(action.plannedDays);
    if (!Number.isInteger(plannedDays) || plannedDays < 7) {
      throw new SafeInputError("plannedDays must be an integer >= 7");
    }
    if (typeof action.faultInjectApproved !== "boolean") {
      throw new SafeInputError("faultInjectApproved must be boolean");
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
    const registryPath = immutableEvidencePath(
      evidenceDir,
      `observation-registry.${runId}`,
    );
    writeEvidenceAtomic(registryPath, registry);
    const mdPath = immutableEvidencePath(
      evidenceDir,
      `observation-day-0-${startDate}.${runId}`,
      ".md",
    );
    const md = `# Observation Day 0 registry

- envAlias: ${envAlias}
- startDate: ${startDate}
- plannedDays: ${plannedDays}
- alertOwner: (recorded)
- faultInjectApproved: ${action.faultInjectApproved}
- observationComplete: false
`;
    writeEvidenceTextAtomic(mdPath, md);
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
      throw new SafeInputError("declare-external-env requires iConfirmInventory=true");
    }
    const operator = requireNonEmptyString(action.operator, "operator");
    if (!Array.isArray(action.environments) || action.environments.length < 1) {
      throw new SafeInputError("environments must be a non-empty array");
    }
    const environments = action.environments.map((env, index) => {
      const alias = requireSafeAlias(
        env?.alias,
        `environments[${index}].alias`,
      );
      if (typeof env.hostsSolarSimz !== "boolean") {
        throw new SafeInputError(
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
          throw new SafeInputError(
            `environments[${index}] hosts SolarSimz but offlineSnapshotPath missing`,
          );
        }
        const snap = assertOpsSqliteSnapshot(
          env.offlineSnapshotPath,
          `environments[${index}].offlineSnapshotPath`,
          { require0600: true },
        );
        row.offlineSnapshotBasename = path.basename(snap.real);
        row.offlineSnapshotBytes = snap.st.size;
        row.sqliteIntegrityOk = true;
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
    const evidencePath = immutableEvidencePath(
      evidenceDir,
      `declare-external-env.${runId}`,
    );
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

  throw new SafeInputError("unknown action type");
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

  const runId = randomBytes(4).toString("hex");
  const results = [];
  let failedEarly = null;

  try {
    const { raw } = loadManifest(manifestArg);
    const envAlias = raw.envAlias == null
      ? null
      : requireSafeAlias(raw.envAlias, "envAlias");
    const evidenceDir = ensureEvidenceDir(
      raw.evidenceDir ||
        path.join(
          path.dirname(path.resolve(manifestArg)),
          "evidence",
          new Date().toISOString().slice(0, 10),
        ),
    );

    for (let i = 0; i < raw.actions.length; i += 1) {
      try {
        const result = await runAction(raw.actions[i], evidenceDir, `${runId}-${i}`);
        results.push(result);
        if (result.ok !== true) {
          failedEarly = { index: i, type: result.type, error: "action failed; subsequent actions skipped" };
          break;
        }
      } catch (actionError) {
        failedEarly = {
          index: i,
          type: raw.actions[i]?.type ?? "unknown",
          error: safeInputErrorMessage(actionError),
        };
        results.push({
          type: raw.actions[i]?.type ?? "unknown",
          ok: false,
          exitStatus: 1,
          error: failedEarly.error,
          partial: true,
        });
        break;
      }
    }

    const summary = {
      ok: results.length > 0 && results.every((row) => row.ok === true),
      checkedAt: new Date().toISOString(),
      envAliasPresent: Boolean(envAlias),
      actionCount: results.length,
      plannedActionCount: raw.actions.length,
      partial: Boolean(failedEarly),
      failedEarly,
      results,
      notes: [
        "stdout omits secrets, absolute paths, and raw envAlias",
        "does not auto-check docs/planning/06-tasks.md boxes",
        "evidence files are immutable (no overwrite)",
      ],
    };
    const summaryPath = immutableEvidencePath(
      evidenceDir,
      `runner-summary.${runId}`,
    );
    writeEvidenceAtomic(summaryPath, summary);
    console.log(
      JSON.stringify(
        {
          ok: summary.ok,
          envAliasPresent: summary.envAliasPresent,
          actionCount: summary.actionCount,
          plannedActionCount: summary.plannedActionCount,
          partial: summary.partial,
          evidenceBasename: path.basename(summaryPath),
          results: results.map((row) => ({
            type: row.type,
            ok: row.ok,
            exitStatus: row.exitStatus,
            partial: row.partial === true,
            error: typeof row.error === "string" ? row.error : undefined,
          })),
        },
        null,
        2,
      ),
    );
    if (!summary.ok) process.exitCode = 1;
  } catch (error) {
    die(safeInputErrorMessage(error));
  }
}

await main();
