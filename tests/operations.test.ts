import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function runMigration(databasePath: string) {
  return new Promise<{ code: number | null; stderr: string }>((resolve) => {
    const child = spawn(process.execPath, ["scripts/migrate.mjs"], {
      cwd: root,
      env: { ...process.env, DATABASE_PATH: databasePath },
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("close", (code) => resolve({ code, stderr }));
  });
}

describe("database operations", () => {
  it("serializes concurrent migration processes", async () => {
    const directory = mkdtempSync(path.join(tmpdir(), "solarsimz-migrate-"));
    const databasePath = path.join(directory, "concurrent.db");
    try {
      const [first, second] = await Promise.all([
        runMigration(databasePath),
        runMigration(databasePath),
      ]);
      expect(first).toMatchObject({ code: 0, stderr: "" });
      expect(second).toMatchObject({ code: 0, stderr: "" });
      const db = new Database(databasePath, { readonly: true });
      const count = db
        .prepare("SELECT COUNT(*) AS count FROM _migrations")
        .get() as { count: number };
      db.close();
      const migrationCount = readdirSync(path.join(root, "db", "migrations"))
        .filter((name) => name.endsWith(".sql")).length;
      expect(count.count).toBe(migrationCount);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("refuses demo seeding without explicit opt-in", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "solarsimz-seed-"));
    const databasePath = path.join(directory, "seed.db");
    try {
      const result = spawnSync(process.execPath, ["scripts/seed.mjs"], {
        cwd: root,
        env: {
          ...process.env,
          DATABASE_PATH: databasePath,
          ALLOW_DEMO_SEED: "",
        },
        encoding: "utf8",
      });
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("Demo seeding is opt-in");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("requires an explicit persistent database path in production", () => {
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      NODE_ENV: "production",
    };
    delete env["DATABASE_PATH"];
    const result = spawnSync(process.execPath, ["scripts/migrate.mjs"], {
      cwd: root,
      env,
      encoding: "utf8",
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("DATABASE_PATH must point");
  });
});
