#!/usr/bin/env node
/**
 * 한전 수집 작업 worker.
 *
 * 사용: node scripts/kepco-worker.mjs
 * 환경: DATABASE_PATH, KEPCO_INLINE_WORKER=0 (API 인라인 실행 끔)
 */
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.KEPCO_INLINE_WORKER = "0";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

async function loadTs(modulePath) {
  // Next/tsx 없이 동작하도록 빌드된 경로가 있으면 우선하고,
  // 개발 시에는 tsx 레지스터를 시도한다.
  try {
    require("tsx/cjs/api").register();
  } catch {
    // ignore — production may use compiled output later
  }
  return import(pathToFileURL(path.join(root, modulePath)).href);
}

async function main() {
  const { recoverStaleRunningJobs, processQueuedJobs } = await loadTs(
    "src/features/kepco/jobs.repository.ts",
  );
  const recovered = recoverStaleRunningJobs();
  if (recovered > 0) {
    console.log(`[kepco-worker] re-queued ${recovered} stale RUNNING job(s)`);
  }
  const processed = await processQueuedJobs(20);
  console.log(`[kepco-worker] processed ${processed} job(s)`);
}

main().catch((error) => {
  console.error("[kepco-worker] failed", error);
  process.exitCode = 1;
});
