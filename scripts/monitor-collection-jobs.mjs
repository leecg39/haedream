#!/usr/bin/env node
/**
 * 수집 작업 감시. 자격증명·원문 응답은 출력하지 않는다.
 *
 * 환경:
 *   DATABASE_PATH
 *   KEPCO_STALE_MINUTES / KEPCO_FAIL_STREAK / KEPCO_QUEUE_STALL_MINUTES
 *   KEPCO_ALERT_SINK=none|file|injectable|webhook
 *   KEPCO_ALERT_PATH (file sink; 결과 JSON 에는 basename 만)
 *   KEPCO_ALERT_WEBHOOK_URL / SECRET / TIMEOUT_MS / HOST_ALLOWLIST
 *   KEPCO_ALERT_ALLOW_HTTP_LOOPBACK=1 (테스트용 HTTP loopback)
 *   KEPCO_ALERT_DNS_LOOKUP_MODULE / KEPCO_ALERT_INJECT_MODULE
 *     — 테스트·운영 프로세스 제어자용 확장점. 절대 경로만.
 *     — 로드 시 KEPCO_ALERT_ALLOW_INJECT=1 또는 VITEST/NODE_ENV=test 필요.
 *
 * HTTPS 전달: DNS 후 검증된 공인 IP 로 TCP pin (https.request custom lookup).
 * no-alert 이면 DNS/TCP/HTTP 0회. 동기 URL/allowlist/secret 검증만 시작 시 수행.
 *
 * 종료 코드: 0 정상, 1 설정/DB 오류, 2 임계 위반(전달 실패와 무관)
 */
import { createHmac } from "node:crypto";
import Database from "better-sqlite3";
import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  assertWebhookUrlShape,
  parseHostAllowlist,
  postWebhookHttpLoopback,
  postWebhookHttpsPinned,
  resolvePinnedHttpsAddress,
} from "./lib/kepco-webhook-policy.mjs";

function requireNonNegativeNumber(name, raw, fallback) {
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    const error = new Error(`invalid ${name}`);
    error.code = "CONFIG_INVALID";
    throw error;
  }
  return value;
}

function requirePositiveInteger(name, raw, fallback) {
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 1) {
    const error = new Error(`invalid ${name}: expected positive integer`);
    error.code = "CONFIG_INVALID";
    throw error;
  }
  return value;
}

const ALLOWED_SINKS = new Set(["none", "file", "injectable", "webhook"]);

function resolveAlertSink() {
  const sink = (process.env.KEPCO_ALERT_SINK ?? "none").toLowerCase().trim();
  if (!ALLOWED_SINKS.has(sink)) {
    const error = new Error("invalid alert sink");
    error.code = "CONFIG_INVALID_SINK";
    throw error;
  }
  return sink;
}

/** 동기 형식 검증만. DNS/TCP 없음. */
function validateWebhookConfigSync() {
  const rawUrl = process.env.KEPCO_ALERT_WEBHOOK_URL?.trim() ?? "";
  const secret = process.env.KEPCO_ALERT_WEBHOOK_SECRET ?? "";
  const timeoutMs = requirePositiveInteger(
    "KEPCO_ALERT_TIMEOUT_MS",
    process.env.KEPCO_ALERT_TIMEOUT_MS,
    5000,
  );
  if (!rawUrl) {
    const error = new Error("missing webhook url");
    error.code = "WEBHOOK_URL_MISSING";
    throw error;
  }
  if (!secret || secret.length < 8) {
    const error = new Error("missing webhook secret");
    error.code = "WEBHOOK_SECRET_MISSING";
    throw error;
  }
  const allowHttpLoopback = process.env.KEPCO_ALERT_ALLOW_HTTP_LOOPBACK === "1";
  const shape = assertWebhookUrlShape(rawUrl, {
    allowHttpLoopback,
    hostAllowlist: parseHostAllowlist(process.env.KEPCO_ALERT_WEBHOOK_HOST_ALLOWLIST),
  });
  return { shape, secret, timeoutMs, allowHttpLoopback };
}

function buildAlertPayload(payload) {
  return {
    type: "kepco_monitor_alert",
    at: payload.checkedAt,
    queueStall: payload.queueStall,
    staleRunning: payload.staleRunning,
    failureStreaks: payload.failureStreaks,
  };
}

function assertInjectableModuleAllowed(envName, rawPath) {
  const allow =
    process.env.KEPCO_ALERT_ALLOW_INJECT === "1" ||
    process.env.VITEST === "true" ||
    process.env.NODE_ENV === "test";
  if (!allow) {
    const error = new Error(`${envName} requires KEPCO_ALERT_ALLOW_INJECT=1`);
    error.code = "CONFIG_INJECT_FORBIDDEN";
    throw error;
  }
  if (!rawPath || !path.isAbsolute(rawPath)) {
    const error = new Error(`${envName} must be an absolute module path`);
    error.code = "CONFIG_INJECT_PATH";
    throw error;
  }
  return rawPath;
}

async function deliverWebhook(webhookConfig, payload) {
  const body = JSON.stringify(buildAlertPayload(payload));
  const signatureHeader = `sha256=${createHmac("sha256", webhookConfig.secret)
    .update(body)
    .digest("hex")}`;

  if (webhookConfig.shape.mode === "http-loopback") {
    return postWebhookHttpLoopback({
      url: webhookConfig.shape.url,
      body,
      signatureHeader,
      timeoutMs: webhookConfig.timeoutMs,
    });
  }

  let pinned;
  try {
    let lookupAll;
    if (process.env.KEPCO_ALERT_DNS_LOOKUP_MODULE) {
      const modulePath = assertInjectableModuleAllowed(
        "KEPCO_ALERT_DNS_LOOKUP_MODULE",
        process.env.KEPCO_ALERT_DNS_LOOKUP_MODULE,
      );
      const mod = await import(pathToFileURL(modulePath).href);
      lookupAll = mod.lookupAll;
    }
    pinned = await resolvePinnedHttpsAddress({
      hostname: webhookConfig.shape.hostname,
      lookupAll,
    });
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "WEBHOOK_DNS_FAILED";
    return { delivered: false, sink: "webhook", errorCode: code };
  }

  return postWebhookHttpsPinned({
    url: webhookConfig.shape.url,
    hostname: webhookConfig.shape.hostname,
    pinnedAddress: pinned.pinnedAddress,
    family: pinned.family,
    body,
    signatureHeader,
    timeoutMs: webhookConfig.timeoutMs,
  });
}

async function emitAlert(sink, webhookConfig, payload, alerting) {
  if (!alerting) {
    return { delivered: false, sink, reason: "no_alert" };
  }
  if (sink === "none") {
    return { delivered: false, sink };
  }
  if (sink === "file") {
    const alertPath = path.resolve(
      process.env.KEPCO_ALERT_PATH ?? "data/alerts/kepco-monitor.jsonl",
    );
    mkdirSync(path.dirname(alertPath), { recursive: true });
    appendFileSync(alertPath, `${JSON.stringify(buildAlertPayload(payload))}\n`, "utf8");
    return { delivered: true, sink, path: path.basename(alertPath) };
  }
  if (sink === "injectable") {
    if (!process.env.KEPCO_ALERT_INJECT_MODULE) {
      return { delivered: false, sink: "injectable", errorCode: "MISSING_INJECT_MODULE" };
    }
    const modulePath = assertInjectableModuleAllowed(
      "KEPCO_ALERT_INJECT_MODULE",
      process.env.KEPCO_ALERT_INJECT_MODULE,
    );
    const mod = await import(pathToFileURL(modulePath).href);
    await mod.default?.(payload);
    return { delivered: true, sink: "injectable" };
  }
  if (sink === "webhook") {
    return deliverWebhook(webhookConfig, payload);
  }
  const error = new Error("invalid alert sink");
  error.code = "CONFIG_INVALID_SINK";
  throw error;
}

function emitConfigFailure(code, message) {
  // DB 오류는 code 만 — stack/절대경로/URL/secret 미노출.
  // CONFIG_* 는 안전한 짧은 메시지(invalid KEPCO_…)를 stderr 에 유지.
  if (
    code === "DB_OPEN_FAILED" ||
    code === "DB_CORRUPT" ||
    code === "DB_SCHEMA"
  ) {
    console.error(`[monitor] ${code}`);
  } else if (message) {
    console.error(`[monitor] ${message}`);
  } else {
    console.error(`[monitor] ${code}`);
  }
  console.log(
    JSON.stringify(
      {
        ok: false,
        errorCode: code,
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
}

async function main() {
  let db = null;
  try {
    const alertSink = resolveAlertSink();
    const webhookConfig =
      alertSink === "webhook" ? validateWebhookConfigSync() : null;

    const dbPath = path.resolve(process.env.DATABASE_PATH ?? "data/app.db");
    const staleMinutes = requireNonNegativeNumber(
      "KEPCO_STALE_MINUTES",
      process.env.KEPCO_STALE_MINUTES,
      30,
    );
    const failStreak = requirePositiveInteger(
      "KEPCO_FAIL_STREAK",
      process.env.KEPCO_FAIL_STREAK,
      3,
    );
    const queueStallMinutes = requireNonNegativeNumber(
      "KEPCO_QUEUE_STALL_MINUTES",
      process.env.KEPCO_QUEUE_STALL_MINUTES,
      20,
    );

    try {
      db = new Database(dbPath, { readonly: true, fileMustExist: true });
    } catch {
      emitConfigFailure("DB_OPEN_FAILED");
      return;
    }

    const now = Date.now();
    const staleCutoff = new Date(now - staleMinutes * 60_000).toISOString();
    const stallCutoff = new Date(now - queueStallMinutes * 60_000).toISOString();

    const queued = db
      .prepare(`SELECT COUNT(*) AS count FROM collection_jobs WHERE status = 'QUEUED'`)
      .get().count;
    const running = db
      .prepare(`SELECT COUNT(*) AS count FROM collection_jobs WHERE status = 'RUNNING'`)
      .get().count;
    const staleRunning = db
      .prepare(
        `SELECT COUNT(*) AS count FROM collection_jobs
         WHERE status = 'RUNNING' AND updated_at < ?`,
      )
      .get(staleCutoff).count;
    const queueStall = db
      .prepare(
        `SELECT COUNT(*) AS count FROM collection_jobs
         WHERE status = 'QUEUED' AND created_at < ?`,
      )
      .get(stallCutoff).count;

    const lastJobActivityAt =
      db
        .prepare(
          `SELECT MAX(COALESCE(started_at, created_at)) AS at
           FROM collection_jobs`,
        )
        .get()?.at ?? null;

    const latestSuccessfulCollection =
      db
        .prepare(
          `SELECT MAX(finished_at) AS at
           FROM collection_jobs
           WHERE status IN ('SUCCEEDED', 'PARTIAL')`,
        )
        .get()?.at ?? null;

    const latestMeasurement =
      db
        .prepare(`SELECT MAX(observed_at) AS at FROM energy_measurements`)
        .get()?.at ??
      db.prepare(`SELECT MAX(collected_at) AS at FROM kepco_summary`).get()?.at ??
      null;

    const recentTerminal = db
      .prepare(
        `SELECT fid, status, error_code, id AS jobId, finished_at
         FROM collection_jobs
         WHERE status IN ('FAILED', 'SUCCEEDED', 'PARTIAL', 'CANCELLED')
           AND finished_at IS NOT NULL
         ORDER BY finished_at DESC
         LIMIT 500`,
      )
      .all();

    const byFid = new Map();
    for (const row of recentTerminal) {
      if (!byFid.has(row.fid)) byFid.set(row.fid, []);
      byFid.get(row.fid).push(row);
    }

    const streaks = [];
    for (const [fid, rows] of byFid.entries()) {
      let streak = 0;
      let lastErrorCode = null;
      let lastJobId = null;
      for (const row of rows) {
        if (row.status === "FAILED") {
          streak += 1;
          if (streak === 1) {
            lastErrorCode = row.error_code ?? null;
            lastJobId = row.jobId ?? null;
          }
          continue;
        }
        break;
      }
      if (streak >= failStreak) {
        streaks.push({ fid, streak, lastErrorCode, lastJobId });
      }
    }

    const report = {
      checkedAt: new Date().toISOString(),
      lastJobActivityAt,
      latestSuccessfulCollection,
      latestMeasurement,
      queued,
      running,
      queueStall,
      staleRunning,
      failureStreaks: streaks,
    };

    const alerting =
      staleRunning > 0 || queueStall > 0 || streaks.length > 0;

    const alert = await emitAlert(alertSink, webhookConfig, report, alerting);
    console.log(JSON.stringify({ ...report, alert }, null, 2));
    if (alerting) {
      process.exitCode = 2;
    }
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "MONITOR_FAILED";
    const message =
      error instanceof Error ? error.message : "monitor failed";
    emitConfigFailure(code, message);
  } finally {
    if (db) {
      try {
        db.close();
      } catch {
        // ignore
      }
    }
  }
}

await main();
