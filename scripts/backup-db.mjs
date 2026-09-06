#!/usr/bin/env node
/**
 * SQLite online backup.
 * 사용: node scripts/backup-db.mjs [source.db] [backup.db]
 */
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";

const sourcePath = path.resolve(
  process.argv[2] ?? process.env.DATABASE_PATH ?? "data/app.db",
);
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = path.resolve(
  process.argv[3] ?? path.join("data/backups", `app-${stamp}.db`),
);

mkdirSync(path.dirname(backupPath), { recursive: true });
const source = new Database(sourcePath, { readonly: true, fileMustExist: true });
await source.backup(backupPath);
source.close();
console.log(`[backup-db] wrote ${backupPath}`);
