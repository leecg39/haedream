#!/usr/bin/env node
/**
 * 빈 DB와 시드 DB에 마이그레이션을 적용해 재실행 안전성을 확인한다.
 * 사용: node scripts/migrate-rehearsal.mjs
 */
import { mkdtempSync, rmSync, copyFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

function run(label, env) {
  const started = Date.now();
  const result = spawnSync("node", ["scripts/migrate.mjs"], {
    cwd: root,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
  const elapsedMs = Date.now() - started;
  if (result.status !== 0) {
    console.error(`[migrate-rehearsal] ${label} failed`, result.stderr || result.stdout);
    process.exit(result.status ?? 1);
  }
  console.log(`[migrate-rehearsal] ${label} ok in ${elapsedMs}ms`);
  return elapsedMs;
}

const directory = mkdtempSync(path.join(tmpdir(), "solarsimz-migrate-"));
try {
  const emptyDb = path.join(directory, "empty.db");
  run("empty-db", { DATABASE_PATH: emptyDb });
  run("empty-db-rerun", { DATABASE_PATH: emptyDb });

  const seededDb = path.join(directory, "seeded.db");
  process.env.DATABASE_PATH = seededDb;
  process.env.ALLOW_DEMO_SEED = "true";
  // open via migrate then seed
  run("seeded-migrate", { DATABASE_PATH: seededDb });
  const seed = spawnSync("node", ["scripts/seed.mjs"], {
    cwd: root,
    env: { ...process.env, DATABASE_PATH: seededDb, ALLOW_DEMO_SEED: "true" },
    encoding: "utf8",
  });
  if (seed.status !== 0) {
    console.error("[migrate-rehearsal] seed failed", seed.stderr || seed.stdout);
    process.exit(seed.status ?? 1);
  }
  run("seeded-rerun", { DATABASE_PATH: seededDb });

  const sourceAppDb = path.join(root, "data/app.db");
  if (existsSync(sourceAppDb)) {
    const copyPath = path.join(directory, "app-copy.db");
    copyFileSync(sourceAppDb, copyPath);
    run("app-db-copy", { DATABASE_PATH: copyPath });
  } else {
    console.log("[migrate-rehearsal] skip app-db-copy (data/app.db absent)");
  }
  console.log("[migrate-rehearsal] complete");
} finally {
  rmSync(directory, { recursive: true, force: true });
}
