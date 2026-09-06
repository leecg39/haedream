#!/usr/bin/env node
/**
 * 비식별 합성 ≥1GB offline SQLite 를 만든다 (migrate + demo seed + padding blob).
 * 운영 실데이터/승인 사본을 대체하지 않는다. largeDbRehearsal 크기 경로 검증용.
 *
 * 사용:
 *   node scripts/create-synthetic-large-db.mjs <out.db> [--min-bytes 1000000000]
 *
 * 출력 경로에 -wal/-shm 이 남지 않도록 VACUUM INTO / journal DELETE 로 마감한다.
 * 실고객 원문·secret 을 넣지 않는다.
 */
import Database from "better-sqlite3";
import {
  existsSync,
  mkdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_MIN_BYTES = 1_000_000_000;
const CHUNK_BYTES = 4 * 1024 * 1024; // 4MiB

function parseArgs(argv) {
  const positional = [];
  let minBytes = DEFAULT_MIN_BYTES;
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--min-bytes") {
      const raw = argv[++i];
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 1) {
        throw new Error("--min-bytes must be a positive number");
      }
      minBytes = Math.floor(n);
    } else if (argv[i].startsWith("--")) {
      throw new Error(`unknown flag ${argv[i]}`);
    } else {
      positional.push(argv[i]);
    }
  }
  if (positional.length !== 1) {
    throw new Error(
      "usage: node scripts/create-synthetic-large-db.mjs <out.db> [--min-bytes 1000000000]",
    );
  }
  return { outPath: path.resolve(positional[0]), minBytes };
}

function runOrThrow(label, command, args, env = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(
      `${label} failed: ${result.stderr || result.stdout || `exit ${result.status}`}`,
    );
  }
}

function assertNoSidecars(dbPath) {
  for (const suffix of ["-wal", "-shm", "-journal"]) {
    if (existsSync(`${dbPath}${suffix}`)) {
      throw new Error(`sidecar present: ${path.basename(dbPath)}${suffix}`);
    }
  }
}

const { outPath, minBytes } = parseArgs(process.argv);

if (existsSync(outPath)) {
  console.error("[synthetic-large-db] destination already exists; refuse overwrite");
  process.exitCode = 1;
} else {
  const workDir = mkdtempSync(path.join(tmpdir(), "solarsimz-synth-large-"));
  const workDb = path.join(workDir, "work.db");
  try {
    mkdirSync(path.dirname(outPath), { recursive: true });

    runOrThrow("migrate", "node", ["scripts/migrate.mjs"], {
      DATABASE_PATH: workDb,
    });
    runOrThrow("seed", "node", ["scripts/seed.mjs"], {
      DATABASE_PATH: workDb,
      ALLOW_DEMO_SEED: "true",
    });

    const db = new Database(workDb);
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS _synthetic_rehearsal_padding (
          id INTEGER PRIMARY KEY,
          payload BLOB NOT NULL
        );
      `);
      db.pragma("journal_mode = DELETE");
      const insert = db.prepare(
        `INSERT INTO _synthetic_rehearsal_padding (payload) VALUES (?)`,
      );
      // Overshoot slightly so VACUUM INTO output stays >= minBytes after page overhead.
      const targetPayload = Math.ceil(minBytes * 1.05);
      let written = 0;
      const insertMany = db.transaction(() => {
        while (written < targetPayload) {
          const size = Math.min(CHUNK_BYTES, targetPayload - written);
          insert.run(randomBytes(size));
          written += size;
        }
      });
      insertMany();
      // Consistent offline leaf without WAL sidecars.
      db.exec(`VACUUM INTO '${outPath.replaceAll("'", "''")}'`);
    } finally {
      db.close();
    }

    // Drop accidental journal leftovers from work copy only.
    for (const suffix of ["-wal", "-shm", "-journal"]) {
      const p = `${workDb}${suffix}`;
      if (existsSync(p)) rmSync(p, { force: true });
    }

    assertNoSidecars(outPath);
    const verify = new Database(outPath, { readonly: true, fileMustExist: true });
    try {
      const integrity = verify.pragma("integrity_check");
      const ok =
        Array.isArray(integrity) &&
        integrity.length === 1 &&
        integrity[0]?.integrity_check === "ok";
      if (!ok) {
        throw new Error(`integrity_check failed: ${JSON.stringify(integrity)}`);
      }
      const padding = verify
        .prepare(`SELECT COUNT(*) AS c FROM _synthetic_rehearsal_padding`)
        .get().c;
      if (padding < 1) {
        throw new Error("padding table empty");
      }
    } finally {
      verify.close();
    }
    assertNoSidecars(outPath);

    const bytes = statSync(outPath).size;
    if (bytes < minBytes) {
      throw new Error(`output bytes ${bytes} < minBytes ${minBytes}`);
    }

    const metaPath = `${outPath}.meta.json`;
    writeFileSync(
      metaPath,
      `${JSON.stringify(
        {
          kind: "synthetic-non-pii-large-db",
          purpose: "migrate-rehearsal-size-path",
          bytes,
          minBytes,
          createdAt: new Date().toISOString(),
          note: "Not a production or approved customer snapshot.",
        },
        null,
        2,
      )}\n`,
    );

    console.log(
      JSON.stringify(
        {
          ok: true,
          bytes,
          minBytes,
          outBasename: path.basename(outPath),
          metaBasename: path.basename(metaPath),
        },
        null,
        2,
      ),
    );
  } catch (error) {
    if (existsSync(outPath)) rmSync(outPath, { force: true });
    console.error(
      `[synthetic-large-db] ${error instanceof Error ? error.message : error}`,
    );
    process.exitCode = 1;
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}
