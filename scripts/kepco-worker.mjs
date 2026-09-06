#!/usr/bin/env node
/**
 * 한전 수집 작업 worker (Next 요청과 분리된 CLI).
 *
 * 사용: node scripts/kepco-worker.mjs
 * 환경: DATABASE_PATH, KEPCO_INLINE_WORKER=0
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

process.env.KEPCO_INLINE_WORKER = "0";

const here = fileURLToPath(import.meta.url);
const hooks = fileURLToPath(new URL("./register-worker-hooks.mjs", import.meta.url));

if (process.env.KEPCO_WORKER_BOOTSTRAPPED !== "1") {
  const result = spawnSync(
    process.execPath,
    ["--import", pathToFileURL(hooks).href, here],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        KEPCO_WORKER_BOOTSTRAPPED: "1",
        KEPCO_INLINE_WORKER: "0",
      },
    },
  );
  process.exit(result.status ?? 1);
}

const modulePath = fileURLToPath(
  new URL("../src/features/kepco/jobs.repository.ts", import.meta.url),
);
const { recoverStaleRunningJobs, processQueuedJobs } = await import(
  pathToFileURL(modulePath).href
);

const recovered = recoverStaleRunningJobs();
if (recovered > 0) {
  console.log(`[kepco-worker] recovered ${recovered} stale RUNNING job(s)`);
}
const processed = await processQueuedJobs(20);
console.log(`[kepco-worker] processed ${processed} job(s)`);
