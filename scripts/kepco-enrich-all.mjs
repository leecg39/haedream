#!/usr/bin/env node
/**
 * 기본 KEPCO 수집이 끝난 업체를 대상으로 상세 데이터(계약/일합계/15분/청구)를 보강한다.
 * 로컬 Next API를 호출하므로 앱과 동일한 확장 collectFirm 코드를 사용한다.
 *
 * 실행: node scripts/kepco-enrich-all.mjs [--limit N] [--delay MS] [--force]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { register } from "node:module";
import Database from "better-sqlite3";

register(new URL("./ts-alias-loader.mjs", import.meta.url), import.meta.url);

const root = process.cwd();
const args = { limit: Infinity, delay: 900, force: false, minFid: 0, maxFid: Infinity, worker: "main" };
for (let i = 2; i < process.argv.length; i += 1) {
  if (process.argv[i] === "--limit") args.limit = Number(process.argv[++i]);
  else if (process.argv[i] === "--delay") args.delay = Number(process.argv[++i]);
  else if (process.argv[i] === "--min-fid") args.minFid = Number(process.argv[++i]);
  else if (process.argv[i] === "--max-fid") args.maxFid = Number(process.argv[++i]);
  else if (process.argv[i] === "--worker") args.worker = String(process.argv[++i]).replace(/[^a-zA-Z0-9_-]/g, "_");
  else if (process.argv[i] === "--force") args.force = true;
}

const rows = JSON.parse(readFileSync(join(root, "src/lib/fit-mocks/firm-rows.json"), "utf8"));
const passwords = JSON.parse(readFileSync(join(root, "src/lib/fit-mocks/kepco-passwds.json"), "utf8"));
const firms = new Map(
  rows.map((row) => [row.fid, {
    fid: row.fid,
    firmName: row.firmName,
    kepcoNo: row.kepcoNo,
    kepcoPasswd: passwords[String(row.fid)] || row.kepcoPasswd || "",
    checkDay: row.checkDay,
  }]),
);
const { collectFirm } = await import(join(root, "src/lib/kepco/collect.ts"));
const db = new Database(join(root, "data/solarsimz.db"), { readonly: true, timeout: 15_000 });
const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }).replaceAll("-", "");

let queue = db
  .prepare(
    `SELECT s.fid
     FROM kepco_summary s
     WHERE ? = 1
        OR NOT EXISTS (SELECT 1 FROM kepco_contract c WHERE c.fid = s.fid)
        OR NOT EXISTS (SELECT 1 FROM kepco_daily_total d WHERE d.fid = s.fid AND d.ymd = ?)
        OR (SELECT count(*) FROM kepco_interval i WHERE i.fid = s.fid AND i.ymd = ?) < 96
        OR (SELECT count(*) FROM kepco_billing b WHERE b.fid = s.fid) < 12
     ORDER BY s.fid DESC`,
  )
  .all(args.force ? 1 : 0, today, today)
  .map((row) => row.fid)
  .filter((fid) => fid >= args.minFid && fid <= args.maxFid);
if (Number.isFinite(args.limit)) queue = queue.slice(0, args.limit);
db.close();

const progressPath = join(root, `data/kepco-enrich-progress-${args.worker}.json`);
const progress = { startedAt: new Date().toISOString(), total: queue.length, processed: 0, success: 0, failed: 0, results: {} };
const save = () => writeFileSync(progressPath, JSON.stringify(progress, null, 2));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

console.log(`[kepco-enrich:${args.worker}] 상세 미완료 업체 ${queue.length}곳, fid=${args.minFid}..${args.maxFid === Infinity ? "∞" : args.maxFid}, delay=${args.delay}ms`);
for (let index = 0; index < queue.length; index += 1) {
  const fid = queue[index];
  const firm = firms.get(fid);
  try {
    if (!firm?.kepcoNo || !firm.kepcoPasswd) throw new Error("한전고객번호/비밀번호 미등록");
    const result = await collectFirm({
      fid: firm.fid,
      kepcoNo: firm.kepcoNo,
      kepcoPasswd: firm.kepcoPasswd,
      checkDay: firm.checkDay,
    });
    if (result.status !== "success") throw new Error(result.message);
    progress.success += 1;
    progress.results[fid] = { status: "success", message: result.message, at: new Date().toISOString() };
    console.log(`[${index + 1}/${queue.length}] fid=${fid} ${firm.firmName} → success (${result.message})`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    progress.failed += 1;
    progress.results[fid] = { status: "error", message, at: new Date().toISOString() };
    console.log(`[${index + 1}/${queue.length}] fid=${fid} ${firm?.firmName ?? ""} → error (${message})`);
  }
  progress.processed += 1;
  if (index % 3 === 0) save();
  if (index < queue.length - 1) await sleep(args.delay);
}
save();
console.log(`[kepco-enrich] 완료 success=${progress.success} failed=${progress.failed}`);
