#!/usr/bin/env node
/**
 * KEPCO webhook 환경 변수 동기 검증 (DNS/TCP/HTTP 없음).
 * monitor-collection-jobs.mjs 의 validateWebhookConfigSync 와 동일 계약.
 * 실 endpoint URL·secret 을 출력하지 않는다.
 *
 * 사용:
 *   node scripts/verify-webhook-config.mjs
 */
import {
  assertWebhookUrlShape,
  parseHostAllowlist,
} from "./lib/kepco-webhook-policy.mjs";

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
    hostAllowlist: parseHostAllowlist(
      process.env.KEPCO_ALERT_WEBHOOK_HOST_ALLOWLIST,
    ),
  });
  return {
    hostAllowlistCount: parseHostAllowlist(
      process.env.KEPCO_ALERT_WEBHOOK_HOST_ALLOWLIST,
    ).length,
    secretLength: secret.length,
    timeoutMs,
    urlIsHttps: shape.mode === "https",
    mode: shape.mode,
    hasHostname: Boolean(shape.hostname),
  };
}

try {
  const sink = process.env.KEPCO_ALERT_SINK ?? "";
  if (sink !== "webhook") {
    console.log(
      JSON.stringify(
        {
          ok: false,
          errorCode: "SINK_NOT_WEBHOOK",
          message: "set KEPCO_ALERT_SINK=webhook to validate webhook config",
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  } else {
    const summary = validateWebhookConfigSync();
    console.log(
      JSON.stringify({ ok: true, sink: "webhook", ...summary }, null, 2),
    );
  }
} catch (error) {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "WEBHOOK_CONFIG_INVALID";
  console.log(
    JSON.stringify(
      {
        ok: false,
        errorCode: code,
        message: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
}
