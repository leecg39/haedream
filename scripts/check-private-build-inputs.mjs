#!/usr/bin/env node
/** 배포 파일 추적에 로컬 원본·DB·암호화 키가 섞이지 않게 검사한다. 원문/키 경로는 출력하지 않는다. */
import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const build = path.resolve(root, process.env.NEXT_DIST_DIR || ".next");
const privateKey = path.resolve(root, process.env.FIRM_CREDENTIAL_KEY_PATH || "data/firm-credentials.key");
function canonical(file) {
  const suffix = [];
  let current = file;
  for (;;) {
    try { return path.join(realpathSync(current), ...suffix); }
    catch (error) {
      if (error.code !== "ENOENT" || path.dirname(current) === current) throw error;
      suffix.unshift(path.basename(current));
      current = path.dirname(current);
    }
  }
}
function* files(directory) {
  if (!existsSync(directory)) return;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* files(file);
    else if (entry.isFile() && entry.name.endsWith(".nft.json")) yield file;
  }
}
let scanned = 0, rejected = 0;
for (const manifest of files(build)) {
  scanned += 1;
  try {
    const trace = JSON.parse(readFileSync(manifest, "utf8"));
    if (!Array.isArray(trace.files) || trace.files.some((file) => typeof file !== "string")) throw new Error();
    const keyPath = canonical(privateKey);
    const dataPath = canonical(path.join(root, "data"));
    const databasePath = path.resolve(root, process.env.DATABASE_PATH || "data/solarsimz.db");
    const databaseFiles = new Set(["", "-wal", "-shm", "-journal"].map((suffix) => canonical(databasePath + suffix)));
    const unsafe = trace.files.some((file) => {
      const traced = path.resolve(path.dirname(manifest), file);
      const resolved = canonical(traced);
      const basename = path.basename(resolved);
      return resolved === keyPath || databaseFiles.has(resolved) ||
        ["firm-details.csv", "firm-credentials.key", "pre-import.db"].includes(basename) ||
        (traced.startsWith(path.join(root, "data") + path.sep) && /\.(?:db|sqlite|sqlite3)(?:-(?:wal|shm|journal))?$/.test(path.basename(traced))) ||
        (resolved.startsWith(dataPath + path.sep) && /\.(?:db|sqlite|sqlite3)(?:-(?:wal|shm|journal))?$/.test(basename));
    });
    if (unsafe) throw new Error();
  } catch {
    rejected += 1;
    console.error(`[check-private-build-inputs] rejected manifest: ${path.relative(build, manifest)}`);
  }
}
if (!scanned) {
  console.error("[check-private-build-inputs] no build manifests; run a production build first");
  process.exitCode = 1;
} else if (rejected) process.exitCode = 1;
else console.log(`[check-private-build-inputs] ok (${scanned} manifests)`);
