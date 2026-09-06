/**
 * Apply-mode DB open with leaf-symlink / pathname TOCTOU guards.
 *
 * SQLite 는 열린 inode 를 유지하므로, 검증 이후 pathname 교체는
 * 이미 열린 connection 의 write target 을 바꾸지 않는다.
 * 검증 전에 symlink/inode 교체가 감지되면 쓰기 없이 거부한다.
 */
import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  openSync,
} from "node:fs";

function assertLeafRegularFile(absolute) {
  let st;
  try {
    st = lstatSync(absolute);
  } catch {
    const error = new Error("database file does not exist");
    error.code = "DB_NOT_FOUND";
    throw error;
  }
  if (st.isSymbolicLink()) {
    const error = new Error("database path must not be a symlink");
    error.code = "DB_SYMLINK";
    throw error;
  }
  if (!st.isFile()) {
    const error = new Error("database path must be a regular file");
    error.code = "DB_NOT_REGULAR";
    throw error;
  }
  return st;
}

/**
 * @param {string} absolute
 * @param {{
 *   Database: typeof import("better-sqlite3"),
 *   onAfterSqliteOpen?: (ctx: { absolute: string, guardFd: number }) => void,
 * }} options
 */
export function openGuardedApplyDatabase(absolute, options) {
  const { Database, onAfterSqliteOpen } = options;
  assertLeafRegularFile(absolute);

  const openFlags =
    constants.O_RDWR |
    (typeof constants.O_NOFOLLOW === "number" ? constants.O_NOFOLLOW : 0);

  let guardFd = null;
  let db = null;
  try {
    guardFd = openSync(absolute, openFlags);
    const guardBefore = fstatSync(guardFd);

    db = new Database(absolute, { fileMustExist: true });

    // Test hook: leaf symlink / inode swap between SQLite open and verify.
    if (typeof onAfterSqliteOpen === "function") {
      onAfterSqliteOpen({ absolute, guardFd });
    }

    // PRAGMA/query/write 전에 pathname 과 guard FD 를 재확인한다.
    let pathStat;
    try {
      pathStat = lstatSync(absolute);
    } catch {
      const error = new Error("database path disappeared during open");
      error.code = "DB_FILE_CHANGED";
      throw error;
    }
    if (pathStat.isSymbolicLink()) {
      const error = new Error("database path became a symlink during open");
      error.code = "DB_SYMLINK_REJECTED";
      throw error;
    }
    if (!pathStat.isFile()) {
      const error = new Error("database path is not a regular file");
      error.code = "DB_NOT_REGULAR";
      throw error;
    }

    const guardAfter = fstatSync(guardFd);
    if (
      guardBefore.dev !== guardAfter.dev ||
      guardBefore.ino !== guardAfter.ino ||
      pathStat.dev !== guardBefore.dev ||
      pathStat.ino !== guardBefore.ino
    ) {
      const error = new Error("database file identity changed during open");
      error.code = "DB_FILE_CHANGED";
      throw error;
    }

    // 검증 완료 — guard FD 해제. SQLite connection 은 열린 inode 를 유지한다.
    closeSync(guardFd);
    guardFd = null;

    db.pragma("foreign_keys = ON");
    return { db, tempDir: null };
  } catch (error) {
    if (db) {
      try {
        db.close();
      } catch {
        // ignore
      }
      db = null;
    }
    if (guardFd != null) {
      try {
        closeSync(guardFd);
      } catch {
        // ignore
      }
      guardFd = null;
    }
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      typeof error.code === "string" &&
      error.code.startsWith("DB_")
    ) {
      throw error;
    }
    const wrapped = new Error("failed to open database");
    wrapped.code = "DB_OPEN_FAILED";
    throw wrapped;
  }
}
