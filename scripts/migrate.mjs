import Database from "better-sqlite3";
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export function resolveDatabasePath() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.VERCEL &&
    process.env.ALLOW_EPHEMERAL_SQLITE !== "true"
  ) {
    throw new Error(
      "SQLite migrations require a persistent single-node volume and are disabled on Vercel.",
    );
  }
  if (
    process.env.NODE_ENV === "production" &&
    !process.env.DATABASE_PATH
  ) {
    throw new Error(
      "DATABASE_PATH must point to a persistent volume in production.",
    );
  }
  const configured = process.env.DATABASE_PATH ?? "data/solarsimz.db";
  return path.isAbsolute(configured)
    ? configured
    : path.join(process.cwd(), configured);
}

export function migrate() {
  const databasePath = resolveDatabasePath();
  mkdirSync(path.dirname(databasePath), { recursive: true });
  const db = new Database(databasePath);
  db.pragma("busy_timeout = 10000");
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `);

  const migrationDirectory = path.join(process.cwd(), "db", "migrations");
  const names = readdirSync(migrationDirectory)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  const hasMigration = db.prepare("SELECT 1 FROM _migrations WHERE name = ?");
  const recordMigration = db.prepare(
    "INSERT INTO _migrations (name, applied_at) VALUES (?, ?)",
  );
  const applyMigration = db.transaction((name, sql) => {
    if (hasMigration.get(name)) return false;
    db.exec(sql);
    recordMigration.run(name, new Date().toISOString());
    return true;
  });

  for (const name of names) {
    const sql = readFileSync(path.join(migrationDirectory, name), "utf8");
    if (applyMigration.immediate(name, sql)) {
      console.log(`Applied ${name}`);
    }
  }

  return db;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const db = migrate();
  console.log(`Database ready: ${resolveDatabasePath()}`);
  db.close();
}
