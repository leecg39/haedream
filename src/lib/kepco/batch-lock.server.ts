import { readFileSync } from "node:fs";
import path from "node:path";

function pipelineLockPath(): string {
  return process.env.KEPCO_BATCH_LOCK_PATH
    ?? path.join(process.cwd(), "data/kepco-pipeline.lock");
}

/** True only when the lock contains a currently running coordinator PID. */
export function isKepcoBatchActive(): boolean {
  try {
    const raw = readFileSync(/* turbopackIgnore: true */ pipelineLockPath(), "utf8").trim();
    const pids = /^\d+$/.test(raw)
      ? [Number(raw)]
      : (JSON.parse(raw).pids as unknown[]).filter(Number.isInteger) as number[];
    return pids.some((pid) => {
      try {
        process.kill(pid, 0);
        return true;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
}
