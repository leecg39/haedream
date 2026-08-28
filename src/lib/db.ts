import Database from "better-sqlite3";
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export type AppDatabase = Database.Database;

const databases = new Map<string, AppDatabase>();

function retryBusy<T>(operation: () => T, attempts = 100): T {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return operation();
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String(error.code)
          : "";
      if (
        !["SQLITE_BUSY", "SQLITE_LOCKED"].includes(code) ||
        attempt >= attempts
      ) {
        throw error;
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
    }
  }
}

function resolveDatabasePath(databasePath?: string) {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.VERCEL &&
    process.env.ALLOW_EPHEMERAL_SQLITE !== "true"
  ) {
    throw new Error(
      "SQLite CRUD requires a persistent single-node volume and is disabled on Vercel.",
    );
  }
  if (
    process.env.NODE_ENV === "production" &&
    !databasePath &&
    !process.env.DATABASE_PATH
  ) {
    throw new Error(
      "DATABASE_PATH must point to a persistent volume in production.",
    );
  }
  const configured = databasePath ?? process.env.DATABASE_PATH ?? "data/solarsimz.db";
  return path.isAbsolute(configured)
    ? configured
    : path.join(/* turbopackIgnore: true */ process.cwd(), configured);
}

export function migrateDatabase(db: AppDatabase) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `);

  const migrationDirectory = path.join(process.cwd(), "db", "migrations");
  const migrations = readdirSync(migrationDirectory)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  const applied = db.prepare("SELECT 1 FROM _migrations WHERE name = ?");
  const record = db.prepare(
    "INSERT INTO _migrations (name, applied_at) VALUES (?, ?)",
  );
  const applyMigration = db.transaction((name: string, sql: string) => {
    if (applied.get(name)) return;
    db.exec(sql);
    record.run(name, new Date().toISOString());
  });

  for (const name of migrations) {
    const sql = readFileSync(path.join(migrationDirectory, name), "utf8");
    retryBusy(() => applyMigration.immediate(name, sql));
  }
}

export function openDatabase(databasePath?: string) {
  const absolutePath = resolveDatabasePath(databasePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  const db = new Database(absolutePath, { timeout: 10_000 });
  db.pragma("busy_timeout = 10000");
  db.pragma("foreign_keys = ON");
  retryBusy(() => db.pragma("journal_mode = WAL"));
  migrateDatabase(db);
  return db;
}

export function getDb() {
  const databasePath = resolveDatabasePath();
  const existing = databases.get(databasePath);
  if (existing?.open) return existing;

  const db = openDatabase(databasePath);
  databases.set(databasePath, db);
  return db;
}

export function closeDatabasesForTests() {
  for (const db of databases.values()) {
    if (db.open) db.close();
  }
  databases.clear();
}
