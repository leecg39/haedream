#!/usr/bin/env node
/**
 * 백업 DB를 별도 경로에 열어 스키마·인증 자료·업체·한전 요약 무결성을 검사한다.
 * 사용: node scripts/restore-db-verify.mjs <backup.db> [--demo]
 *
 * 비밀번호 원문은 출력하지 않는다. hash 존재·형식만 기본 검증한다.
 * --demo / RESTORE_VERIFY_DEMO=true 일 때만 시드 operator/"demo" 해시 대조를 수행한다.
 * 운영 백업에 demo 계정이 있다고 가정하지 않는다.
 *
 * 실패는 process.exit 로 즉시 종료하지 않고 throw/exitCode 로 처리해 finally 에서 db.close 를 보장한다.
 */
import Database from "better-sqlite3";
import { compareSync } from "bcryptjs";
import path from "node:path";

class VerifyError extends Error {
  constructor(message, exitCode = 1) {
    super(message);
    this.exitCode = exitCode;
  }
}

const positional = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const flags = new Set(process.argv.slice(2).filter((arg) => arg.startsWith("--")));
const backupArg = positional[0];

if (!backupArg || !String(backupArg).trim()) {
  console.error("usage: node scripts/restore-db-verify.mjs <backup.db> [--demo]");
  process.exitCode = 1;
} else {
  const backupPath = path.resolve(backupArg);
  const demoMode =
    flags.has("--demo") || process.env.RESTORE_VERIFY_DEMO === "true";

  let exitCode = 0;
  const db = new Database(backupPath, { readonly: true, fileMustExist: true });

  try {
    const required = [
      "firms",
      "users",
      "tenants",
      "tenant_firm_access",
      "sessions",
      "kepco_summary",
    ];
    for (const table of required) {
      const row = db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name = ?`)
        .get(table);
      if (!row) {
        throw new VerifyError(`[restore-verify] missing table ${table}`);
      }
    }

    const counts = Object.fromEntries(
      ["firms", "users", "tenants", "tenant_firm_access", "kepco_summary", "sessions"].map(
        (table) => [
          table,
          db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count,
        ],
      ),
    );

    const authUsers = db
      .prepare(
        `SELECT username, role, active, password_hash,
                length(password_hash) AS hash_len
         FROM users
         WHERE active = 1
         ORDER BY username`,
      )
      .all();

    if (authUsers.length < 1) {
      throw new VerifyError("[restore-verify] no active users");
    }

    for (const user of authUsers) {
      if (!user.password_hash || user.hash_len < 20) {
        throw new VerifyError(
          `[restore-verify] auth material incomplete for role=${user.role}`,
        );
      }
      if (!String(user.password_hash).startsWith("$2")) {
        throw new VerifyError(
          `[restore-verify] unexpected password hash format for role=${user.role}`,
        );
      }
    }

    let demoPasswordOk = null;
    if (demoMode) {
      const demoOperator = authUsers.find((row) => row.username === "operator");
      if (!demoOperator) {
        throw new VerifyError(
          "[restore-verify] demo mode requires active username=operator",
        );
      }
      demoPasswordOk = compareSync("demo", demoOperator.password_hash);
      if (!demoPasswordOk) {
        throw new VerifyError(
          "[restore-verify] operator password hash failed integrity check",
        );
      }
    }

    const firmSample = db
      .prepare(
        `SELECT f.fid, f.firm_name AS firmName
         FROM firms f
         LIMIT 3`,
      )
      .all();
    const firmQueryOk =
      counts.firms === 0 ? firmSample.length === 0 : firmSample.length >= 1;
    if (!firmQueryOk) {
      throw new VerifyError(
        "[restore-verify] firm query failed despite non-zero count",
      );
    }

    const kepcoSample = db
      .prepare(
        `SELECT fid, collected_at AS collectedAt
         FROM kepco_summary
         ORDER BY collected_at DESC
         LIMIT 3`,
      )
      .all();

    if (counts.firms < 1 || counts.users < 1) {
      throw new VerifyError(
        `[restore-verify] empty core tables ${JSON.stringify(counts)}`,
      );
    }

    const integrity = db.pragma("integrity_check");
    const integrityOk =
      Array.isArray(integrity) &&
      integrity.length === 1 &&
      integrity[0]?.integrity_check === "ok";
    if (!integrityOk) {
      throw new VerifyError(
        `[restore-verify] integrity_check failed ${JSON.stringify(integrity)}`,
      );
    }

    console.log(
      "[restore-verify] ok",
      JSON.stringify({
        counts,
        activeUsers: authUsers.length,
        authHashFormatOk: true,
        demoMode,
        demoPasswordOk,
        firmQueryOk,
        firmSampleCount: firmSample.length,
        kepcoSummaryQueryOk: true,
        kepcoSummaryRows: kepcoSample.length,
        integrityOk,
      }),
    );
  } catch (error) {
    exitCode = error instanceof VerifyError ? error.exitCode : 1;
    const message = error instanceof Error ? error.message : String(error);
    if (!(error instanceof VerifyError) || !message.startsWith("[restore-verify]")) {
      console.error(`[restore-verify] ${message}`);
    } else {
      console.error(message);
    }
    process.exitCode = exitCode;
  } finally {
    db.close();
  }
}
