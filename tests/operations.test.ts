import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import { openDatabase } from "@/lib/db";
import { seedDatabase } from "@/lib/seed";

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

  it("requires explicit tenant and fid values when granting firm access", () => {
    const result = spawnSync(process.execPath, ["scripts/grant-firm-access.mjs"], {
      cwd: root,
      env: { ...process.env },
      encoding: "utf8",
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("--tenant and --fids are required");
  });

  it("grants only the explicitly listed firms", () => {
    const directory = mkdtempSync(path.join(tmpdir(), "solarsimz-grant-"));
    const databasePath = path.join(directory, "grant.db");
    try {
      const db = openDatabase(databasePath);
      seedDatabase(db);
      db.prepare("DELETE FROM tenant_firm_access WHERE tenant_id = '121'").run();
      db.close();
      const result = spawnSync(
        process.execPath,
        [
          "scripts/grant-firm-access.mjs",
          "--db",
          databasePath,
          "--tenant",
          "121",
          "--fids",
          "0,1662",
          "--can-view-pii",
        ],
        { cwd: root, env: { ...process.env }, encoding: "utf8" },
      );
      expect(result.status, result.stderr).toBe(0);
      const verify = new Database(databasePath, { readonly: true });
      const rows = verify
        .prepare(
          `SELECT fid, can_view_pii, can_collect
           FROM tenant_firm_access WHERE tenant_id = '121' ORDER BY fid`,
        )
        .all();
      verify.close();
      expect(rows).toEqual([
        { fid: 0, can_view_pii: 1, can_collect: 0 },
        { fid: 1662, can_view_pii: 1, can_collect: 0 },
      ]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
