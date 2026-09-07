/**
 * Path / mode / SQLite / evidence-write guards for ops-external-input-runner.
 * Kept free of secrets and of any docs/planning checkbox mutation.
 */
import Database from "better-sqlite3";
import {
  existsSync,
  lstatSync,
  realpathSync,
  mkdirSync,
  openSync,
  readSync,
  closeSync,
  fsyncSync,
  writeFileSync,
  linkSync,
  unlinkSync,
  chmodSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

// Only these errors have messages composed from fixed labels, never input values.
export class SafeInputError extends Error {}

export function safeInputErrorMessage(error) {
  return error instanceof SafeInputError
    ? error.message
    : "operation failed; input details omitted";
}

export const OWNER_RW = 0o600;
export const OWNER_RX = 0o700;
export const ATTEST_MIN_BYTES = 1_000_000_000;
export const SAFE_ALIAS_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export function getRepoRoot() {
  return root;
}

export function forceMode(filePath, mode) {
  chmodSync(filePath, mode);
}

export function force0600(filePath) {
  forceMode(filePath, OWNER_RW);
}

export function realPathOrThrow(filePath, label) {
  try {
    return realpathSync(filePath);
  } catch {
    throw new SafeInputError(`${label} realpath failed`);
  }
}

export function isInsideRepo(candidateAbs, repoRoot = root) {
  const rootReal = realPathOrThrow(repoRoot, "repoRoot");
  const rootResolved = path.resolve(repoRoot);
  const normalized = path.resolve(candidateAbs);
  let candidateReal = normalized;
  try {
    candidateReal = realpathSync(normalized);
  } catch {
    let cur = normalized;
    while (cur !== path.dirname(cur)) {
      try {
        const parentReal = realpathSync(path.dirname(cur));
        candidateReal = path.join(parentReal, path.basename(cur));
        break;
      } catch {
        cur = path.dirname(cur);
      }
    }
  }
  return (
    candidateReal === rootReal ||
    candidateReal.startsWith(`${rootReal}${path.sep}`) ||
    normalized === rootResolved ||
    normalized.startsWith(`${rootResolved}${path.sep}`)
  );
}

export function assertOutsideRepoPath(
  filePath,
  label,
  { mustExist = true, repoRoot = root } = {},
) {
  if (typeof filePath !== "string" || filePath.trim() === "") {
    throw new SafeInputError(`${label} must be a non-empty path`);
  }
  const resolved = path.resolve(filePath);
  if (isInsideRepo(resolved, repoRoot)) {
    throw new SafeInputError(`${label} must live outside the git worktree`);
  }
  if (mustExist) {
    let st;
    try {
      st = lstatSync(resolved);
    } catch {
      throw new SafeInputError(`${label} does not exist`);
    }
    if (st.isSymbolicLink()) {
      throw new SafeInputError(`${label} must not be a symlink`);
    }
    const real = realPathOrThrow(resolved, label);
    if (isInsideRepo(real, repoRoot)) {
      throw new SafeInputError(`${label} realpath must live outside the git worktree`);
    }
    return { resolved, real, st };
  }
  let parent = path.dirname(resolved);
  while (!existsSync(parent) && parent !== path.dirname(parent)) {
    parent = path.dirname(parent);
  }
  if (existsSync(parent)) {
    const parentReal = realPathOrThrow(parent, `${label} parent`);
    const rel = path.relative(parent, resolved);
    const projected = path.join(parentReal, rel || path.basename(resolved));
    if (isInsideRepo(parentReal, repoRoot) || isInsideRepo(projected, repoRoot)) {
      throw new SafeInputError(`${label} must live outside the git worktree`);
    }
  } else if (isInsideRepo(resolved, repoRoot)) {
    throw new SafeInputError(`${label} must live outside the git worktree`);
  }
  return { resolved, real: resolved, st: null };
}

export function assertOfflineLeaf(filePath, label = "snapshot", repoRoot = root) {
  const { resolved, real, st } = assertOutsideRepoPath(filePath, label, {
    mustExist: true,
    repoRoot,
  });
  if (!st.isFile()) {
    throw new SafeInputError(`${label} must be a regular non-symlink file`);
  }
  for (const suffix of ["-wal", "-shm", "-journal"]) {
    if (existsSync(`${resolved}${suffix}`) || existsSync(`${real}${suffix}`)) {
      throw new SafeInputError(`${label} has sidecar ${suffix}; refuse live/hot DB`);
    }
  }
  return { resolved, real, st };
}

export function assertMode0600(st, label) {
  const mode = st.mode & 0o777;
  if (mode !== OWNER_RW) {
    throw new SafeInputError(
      `${label} mode must be 0600 (found ${mode.toString(8).padStart(3, "0")})`,
    );
  }
}

export function assertSqliteIntegrity(dbPath, label) {
  // A cold WAL database can create sidecars even when opened readonly.
  // Accept normalized snapshots only; never change the source journal mode here.
  const fd = openSync(dbPath, "r");
  const header = Buffer.alloc(20);
  let bytes;
  try {
    bytes = readSync(fd, header, 0, header.length, 0);
  } finally {
    closeSync(fd);
  }
  if (bytes !== 20 || header.subarray(0, 16).toString() !== "SQLite format 3\0") {
    throw new SafeInputError(`${label} is not a readable SQLite database`);
  }
  if (header[18] !== 1 || header[19] !== 1) {
    throw new SafeInputError(`${label} requires a normalized offline SQLite snapshot; WAL format refused`);
  }
  let db;
  try {
    db = new Database(dbPath, { readonly: true, fileMustExist: true });
    const integrity = db.pragma("integrity_check");
    const ok =
      Array.isArray(integrity) &&
      integrity.length === 1 &&
      integrity[0]?.integrity_check === "ok";
    if (!ok) {
      throw new SafeInputError(
        `${label} integrity_check failed`,
      );
    }
  } catch (error) {
    if (error instanceof SafeInputError) {
      throw error;
    }
    throw new SafeInputError(
      `${label} is not a readable SQLite database`,
    );
  } finally {
    try {
      db?.close();
    } catch {
      // ignore
    }
  }
}

export function assertOpsSqliteSnapshot(
  filePath,
  label,
  { require0600 = true, repoRoot = root } = {},
) {
  const leaf = assertOfflineLeaf(filePath, label, repoRoot);
  if (require0600) {
    assertMode0600(leaf.st, label);
  }
  assertSqliteIntegrity(leaf.real, label);
  return leaf;
}

export function requireNonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new SafeInputError(`${label} must be a non-empty string`);
  }
  return value.trim();
}

export function requireSafeAlias(value, label) {
  const s = requireNonEmptyString(value, label);
  if (!SAFE_ALIAS_RE.test(s)) {
    throw new SafeInputError(
      `${label} must match ${SAFE_ALIAS_RE} (no URLs, paths, or secrets)`,
    );
  }
  if (/[/\\]/.test(s) || s.includes("://") || s.includes("@")) {
    throw new SafeInputError(`${label} contains forbidden characters`);
  }
  return s;
}

export function requireIsoDate(value, label) {
  const s = requireNonEmptyString(value, label);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new SafeInputError(`${label} must be YYYY-MM-DD`);
  }
  const [ys, ms, ds] = s.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    throw new SafeInputError(`${label} is not a real calendar date`);
  }
  const roundTrip = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
  if (roundTrip !== s) {
    throw new SafeInputError(`${label} failed calendar round-trip validation`);
  }
  return s;
}

export function requireSha256Hex(value, label) {
  const s = requireNonEmptyString(value, label).toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(s)) {
    throw new SafeInputError(`${label} must be 64-char lowercase hex sha256`);
  }
  return s;
}

export function ensureEvidenceDir(evidenceDirRaw, repoRoot = root) {
  const { resolved } = assertOutsideRepoPath(evidenceDirRaw, "evidenceDir", {
    mustExist: false,
    repoRoot,
  });
  mkdirSync(resolved, { recursive: true, mode: OWNER_RX });
  const st = lstatSync(resolved);
  if (st.isSymbolicLink() || !st.isDirectory()) {
    throw new SafeInputError("evidenceDir must be a non-symlink directory");
  }
  const real = realPathOrThrow(resolved, "evidenceDir");
  if (isInsideRepo(real, repoRoot)) {
    throw new SafeInputError("evidenceDir realpath must live outside the git worktree");
  }
  if ((st.mode & 0o777) !== OWNER_RX) {
    forceMode(resolved, OWNER_RX);
  }
  return real;
}

export function immutableEvidencePath(evidenceDir, stem, ext = ".json") {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const nonce = randomBytes(4).toString("hex");
  return path.join(evidenceDir, `${stem}.${stamp}.${nonce}${ext}`);
}

export function writeEvidenceAtomic(filePath, payload) {
  writeEvidenceTextAtomic(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

export function writeEvidenceTextAtomic(filePath, text) {
  const tmp = `${filePath}.${randomBytes(8).toString("hex")}.tmp`;
  const fd = openSync(tmp, "wx", OWNER_RW);
  try {
    try {
      writeFileSync(fd, text);
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    // link is atomic and refuses existing entries, including dangling symlinks.
    // rename would silently replace evidence created between the check and publish.
    try {
      linkSync(tmp, filePath);
    } catch (error) {
      if (error?.code === "EEXIST") {
        throw new SafeInputError("refuse to overwrite existing evidence file");
      }
      throw error;
    }
  } finally {
    unlinkSync(tmp);
  }
}
