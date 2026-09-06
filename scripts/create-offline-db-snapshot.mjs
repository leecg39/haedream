#!/usr/bin/env node
/**
 * Live SQLite(WAL 포함)에서 일관된 offline snapshot 을 만든다.
 * 대상 경로에는 -wal/-shm/-journal 이 없어야 하며, 생성 후 검증한다.
 * 결과 DB 와 companion meta 는 항상 mode 0600 으로 강제한다.
 *
 * 사용:
 *   node scripts/create-offline-db-snapshot.mjs <source.db> <offline-snapshot.db>
 *
 * 실고객 DB 스냅샷은 승인·비식별 정책을 따른다. 경로/원문을 로그에 과다 노출하지 않는다.
 * migrate-rehearsal 은 이 스크립트가 만든 offline 경로만 --source-db 로 받는다.
 */
import Database from "better-sqlite3";
import {
  chmodSync,
  closeSync,
  createReadStream,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const OWNER_RW = 0o600;

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

/** Force owner-only read/write even if umask/backup created a wider mode. */
function forceOwnerReadWriteOnly(filePath) {
  chmodSync(filePath, OWNER_RW);
  const mode = lstatSync(filePath).mode & 0o777;
  if (mode !== OWNER_RW) {
    throw new Error(
      `failed to enforce 0600 on ${path.basename(filePath)} (got ${mode.toString(8)})`,
    );
  }
}

function writeMetaAtomic(metaPath, payload) {
  if (existsSync(metaPath)) {
    const st = lstatSync(metaPath);
    if (st.isSymbolicLink() || !st.isFile()) {
      throw new Error("meta path must be absent or a regular file");
    }
    // Replace existing meta with a fresh 0600 file.
    rmSync(metaPath, { force: true });
  }
  const tmp = `${metaPath}.${process.pid}.${Date.now()}.tmp`;
  const fd = openSync(tmp, "wx", OWNER_RW);
  try {
    writeFileSync(fd, `${JSON.stringify(payload, null, 2)}\n`);
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  // wx 0o600 can still be masked by umask on some platforms — force after write.
  forceOwnerReadWriteOnly(tmp);
  renameSync(tmp, metaPath);
  forceOwnerReadWriteOnly(metaPath);
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
  const metaPath = `${destPath}.meta.json`;

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

    // Backup may create 0644/0666 under a permissive umask — lock down immediately.
    const modeAfterBackup = lstatSync(destPath).mode & 0o777;
    forceOwnerReadWriteOnly(destPath);
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
    // Re-assert after verify open/close (some platforms may alter mode bits).
    forceOwnerReadWriteOnly(destPath);

    const bytes = statSync(destPath).size;
    const sha256 = await sha256File(destPath);
    const meta = {
      kind: "offline-db-snapshot-meta",
      bytes,
      sha256,
      destBasename: path.basename(destPath),
      mode: "0600",
      modeAfterBackup: modeAfterBackup.toString(8).padStart(3, "0"),
      createdAt: new Date().toISOString(),
    };
    writeMetaAtomic(metaPath, meta);
    forceOwnerReadWriteOnly(destPath);
    forceOwnerReadWriteOnly(metaPath);

    console.log(
      JSON.stringify(
        {
          ok: true,
          bytes,
          sha256,
          destBasename: path.basename(destPath),
          metaBasename: path.basename(metaPath),
          mode: "0600",
        },
        null,
        2,
      ),
    );
  } catch (error) {
    for (const p of [destPath, metaPath]) {
      if (existsSync(p)) {
        try {
          rmSync(p, { force: true });
        } catch {
          // ignore cleanup failure; primary error below
        }
      }
    }
    die(error instanceof Error ? error.message : String(error));
  }
}
