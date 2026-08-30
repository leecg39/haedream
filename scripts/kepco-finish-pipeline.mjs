#!/usr/bin/env node
/**
 * 진행 중인 KEPCO 작업이 끝난 뒤 자동으로 안전 재시도 → 상세 보강 → 15분 백필을 마친다.
 * 실행 중 프로세스 PID를 인자로 받는다.
 *
 * 예: node scripts/kepco-finish-pipeline.mjs 68417 68418 66798 69926
 */
import { createWriteStream, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { join } from "node:path";
import Database from "better-sqlite3";

const root = process.cwd();
const watchedPids = process.argv.slice(2).map(Number).filter(Number.isFinite);
const lockPath = process.env.KEPCO_BATCH_LOCK_PATH ?? join(root, "data/kepco-pipeline.lock");
const childPids = new Set();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const alive = (pid) => {
  try { process.kill(pid, 0); return true; } catch { return false; }
};
const stamp = () => new Date().toISOString();
const readLockPids = () => {
  try {
    const raw = readFileSync(lockPath, "utf8").trim();
    if (!raw) return [];
    if (/^\d+$/.test(raw)) return [Number(raw)];
    const value = JSON.parse(raw);
    return Array.isArray(value.pids) ? value.pids.filter(Number.isInteger) : [];
  } catch { return []; }
};
const writeLock = (flag) => writeFileSync(lockPath, JSON.stringify({
  owner: process.pid,
  pids: [process.pid, ...childPids],
  updatedAt: stamp(),
}), { flag });
try {
  writeLock("wx");
} catch (error) {
  if (error?.code !== "EEXIST" || readLockPids().some(alive)) {
    throw new Error(`another KEPCO pipeline is active (${readLockPids().join(",")})`);
  }
  unlinkSync(lockPath);
  writeLock("wx");
}
const releaseLock = () => {
  try {
    const value = JSON.parse(readFileSync(lockPath, "utf8"));
    if (value.owner === process.pid) unlinkSync(lockPath);
  } catch { /* stale/missing lock needs no cleanup */ }
};
process.on("exit", releaseLock);

async function waitForPids(pids) {
  while (pids.some(alive)) {
    console.log(`[${stamp()}] waiting: ${pids.filter(alive).join(",")}`);
    await sleep(30_000);
  }
}

function run(name, scriptArgs, { allowFailure = false } = {}) {
  return new Promise((resolve, reject) => {
    const log = createWriteStream(join(root, `data/${name}.log`), { flags: "a" });
    const child = spawn(process.execPath, scriptArgs, {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, NODE_NO_WARNINGS: "1" },
    });
    child.stdout.pipe(log);
    child.stderr.pipe(log);
    childPids.add(child.pid);
    writeLock("w");
    console.log(`[${stamp()}] started ${name} pid=${child.pid}`);
    child.on("error", (error) => {
      childPids.delete(child.pid);
      writeLock("w");
      log.end();
      reject(error);
    });
    child.on("exit", (code, signal) => {
      childPids.delete(child.pid);
      writeLock("w");
      log.end();
      console.log(`[${stamp()}] finished ${name} code=${code} signal=${signal ?? ""}`);
      const result = { name, code, signal };
      if (!allowFailure && code !== 0) reject(new Error(`${name} failed with code ${code}`));
      else resolve(result);
    });
  });
}

console.log(`[${stamp()}] coordinator watching ${watchedPids.join(",")}`);
await waitForPids(watchedPids);

// 동시 장애가 로그인 실패처럼 보일 수 있어 최초 1회 실패·미적재 업체만 단일 작업자로 재확인한다.
await run("kepco-retry-login", [
  "scripts/kepco-collect-all.mjs",
  "--worker", "retry-login",
  "--retry-login-failed",
  "--delay", "3000",
]);

// 비밀번호 오류 재확인 후에도 남은 네트워크/일시 오류만 한 차례 재시도된다.
await Promise.all([
  run("kepco-retry-high", ["scripts/kepco-collect-all.mjs", "--min-fid", "800", "--max-fid", "2000", "--worker", "retry-high", "--retry-failed", "--delay", "1500"]),
  run("kepco-retry-low", ["scripts/kepco-collect-all.mjs", "--min-fid", "0", "--max-fid", "799", "--worker", "retry-low", "--retry-failed", "--delay", "1500"]),
]);

// 상세 청구 보강을 먼저 끝낸 뒤 15분 백필을 시작해 동일 계정 세션 교체를 방지한다.
await Promise.all([
  run("kepco-enrich-high", ["scripts/kepco-enrich-all.mjs", "--min-fid", "800", "--max-fid", "2000", "--worker", "high", "--delay", "1500"]),
  run("kepco-enrich-low", ["scripts/kepco-enrich-all.mjs", "--min-fid", "0", "--max-fid", "799", "--worker", "low", "--delay", "1500"]),
]);
await Promise.all([
  run("kepco-interval-low", ["scripts/kepco-backfill-interval.mjs", "--min-fid", "0", "--max-fid", "521", "--worker", "low", "--order", "asc", "--request-delay", "1200", "--firm-delay", "1500"]),
  run("kepco-interval-mid", ["scripts/kepco-backfill-interval.mjs", "--min-fid", "522", "--max-fid", "1061", "--worker", "mid", "--order", "asc", "--request-delay", "1200", "--firm-delay", "1500"]),
  run("kepco-interval-high", ["scripts/kepco-backfill-interval.mjs", "--min-fid", "1062", "--max-fid", "2000", "--worker", "high", "--order", "asc", "--request-delay", "1200", "--firm-delay", "1500"]),
]);

// 각 단계에서 일시 실패한 업체만 재선정해 순차적으로 한 번 더 처리한다.
await run("kepco-enrich-final", ["scripts/kepco-enrich-all.mjs", "--worker", "final", "--delay", "1800"]);
await run("kepco-interval-final", ["scripts/kepco-backfill-interval.mjs", "--worker", "final", "--order", "asc", "--request-delay", "1500", "--firm-delay", "1800"]);
await run("kepco-fill-meter-dates", ["scripts/kepco-fill-meter-dates.mjs"]);
await run("kepco-normalize-monthly", ["scripts/kepco-normalize-monthly.mjs"]);

const verification = await run("kepco-verify-final", ["scripts/kepco-verify.mjs"], { allowFailure: true });
const db = new Database(join(root, "data/solarsimz.db"), { readonly: true });
const counts = {};
for (const table of ["kepco_summary", "kepco_hourly", "kepco_monthly", "kepco_daily_total", "kepco_interval", "kepco_billing", "kepco_contract", "kepco_collect_log"]) {
  counts[table] = db.prepare(`SELECT count(*) count FROM ${table}`).get().count;
}
const statuses = db.prepare(`SELECT status, count(*) count FROM kepco_collect_log l WHERE id=(SELECT max(id) FROM kepco_collect_log x WHERE x.fid=l.fid) GROUP BY status`).all();
db.close();
writeFileSync(join(root, "data/kepco-pipeline-complete.json"), JSON.stringify({ finishedAt: stamp(), verification, counts, statuses }, null, 2));
console.log(`[${stamp()}] pipeline finished`, verification, counts, statuses);
if (verification.code !== 0) process.exitCode = 1;
