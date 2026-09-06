#!/usr/bin/env node
/**
 * Live SQLite(WAL 포함)에서 일관된 offline snapshot 을 만든다.
 * 대상 경로에는 -wal/-shm/-journal 이 없어야 하며, 생성 후 검증한다.
 *
 * 사용:
 *   node scripts/create-offline-db-snapshot.mjs <source.db> <offline-snapshot.db>
 *
 * 실고객 DB 스냅샷은 승인·비식별 정책을 따른다. 경로/원문을 로그에 과다 노출하지 않는다.
 * migrate-rehearsal 은 이 스크립트가 만든 offline 경로만 --source-db 로 받는다.
 */
import Database from "better-sqlite3";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  rmSync,
  statSync,
} from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";

function die(message, code = 1) {
  console.error(`[offline-snapshot] ${message}`);
  process.exitCode = code;
}

function assertNoSidecars(dbPath) {
  for (const suffix of ["-wal", "-shm", "-journal"]) {
    if (existsSync(`${dbPath}${suffix}`)) {
      throw new Error(`destination still has sidecar ${suffix}`);
    }
  }
}

async function sha256File(filePath) {
  const hash = createHash("sha256");
  await new Promise((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolve);
  });
  return hash.digest("hex");
}

const sourceArg = process.argv[2];
const destArg = process.argv[3];

if (!sourceArg || !destArg) {
  die("usage: node scripts/create-offline-db-snapshot.mjs <source.db> <offline-snapshot.db>");
} else {
  const sourcePath = path.resolve(sourceArg);
  const destPath = path.resolve(destArg);

  try {
    const sourceStat = lstatSync(sourcePath);
    if (!sourceStat.isFile() || sourceStat.isSymbolicLink()) {
      throw new Error("source must be a regular non-symlink file");
    }
    if (existsSync(destPath)) {
      throw new Error("destination already exists; refuse overwrite");
    }
    mkdirSync(path.dirname(destPath), { recursive: true });

    const source = new Database(sourcePath, {
      readonly: true,
      fileMustExist: true,
    });
    try {
      await source.backup(destPath);
    } finally {
      source.close();
    }

    assertNoSidecars(destPath);
    const destStat = lstatSync(destPath);
    if (!destStat.isFile() || destStat.isSymbolicLink()) {
      rmSync(destPath, { force: true });
      throw new Error("destination is not a regular file after backup");
    }

    // Backup of a WAL source can leave the copy in wal journal_mode; opening it
    // would recreate -wal/-shm. Force DELETE mode + truncate before handoff.
    const verify = new Database(destPath, { fileMustExist: true });
    try {
      verify.pragma("journal_mode = DELETE");
      try {
        verify.pragma("wal_checkpoint(TRUNCATE)");
      } catch {
        // Non-WAL copies may reject checkpoint; ignore.
      }
      const integrity = verify.pragma("integrity_check");
      const ok =
        Array.isArray(integrity) &&
        integrity.length === 1 &&
        integrity[0]?.integrity_check === "ok";
      if (!ok) {
        throw new Error(`integrity_check failed: ${JSON.stringify(integrity)}`);
      }
    } finally {
      verify.close();
    }
    // Remove empty leftover sidecars if any remain after mode switch.
    for (const suffix of ["-wal", "-shm", "-journal"]) {
      const sidecar = `${destPath}${suffix}`;
      if (existsSync(sidecar)) {
        rmSync(sidecar, { force: true });
      }
    }
    assertNoSidecars(destPath);

    const bytes = statSync(destPath).size;
    const sha256 = await sha256File(destPath);
    console.log(
      JSON.stringify(
        {
          ok: true,
          bytes,
          sha256,
          destBasename: path.basename(destPath),
        },
        null,
        2,
      ),
    );
  } catch (error) {
    if (existsSync(destPath)) {
      try {
        rmSync(destPath, { force: true });
      } catch {
        // ignore cleanup failure; primary error below
      }
    }
    die(error instanceof Error ? error.message : String(error));
  }
}
