import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const script = path.resolve("scripts/check-private-build-inputs.mjs");
describe("private build input gate", () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), "private-build-test-"));
    mkdirSync(path.join(root, "build/server"), { recursive: true });
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));
  function check(files: unknown) {
    writeFileSync(path.join(root, "build/server/route.nft.json"), JSON.stringify({ files }));
    return spawnSync(process.execPath, [script], { cwd: root, encoding: "utf8", env: {
      ...process.env, NEXT_DIST_DIR: "build", FIRM_CREDENTIAL_KEY_PATH: path.join(root, "private/custom.key"),
      DATABASE_PATH: path.join(root, "private/runtime.store"),
    } });
  }
  it("accepts runtime source/migrations without requiring private inputs", () => {
    expect(check(["../../src/lib/db.ts", "../../db/migrations/013_private_firm_import.sql"]).status).toBe(0);
  });
  it.each(["../../data/firm-details.csv", "../../data/solarsimz.db", "../../data/solarsimz.db-wal", "../../private/custom.key", "../../private/firm-credentials.key", "../../private/pre-import.db"])("rejects private file tracing: %s", (file) => {
    const result = check([file]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("route.nft.json");
    expect(result.stderr).not.toContain(file);
    expect(result.stderr).not.toContain(root);
  });
  it("fails closed when the production build or manifest contract is missing", () => {
    expect(spawnSync(process.execPath, [script], { cwd: root, env: { ...process.env, NEXT_DIST_DIR: "build" } }).status).toBe(1);
    expect(check("not-an-array").status).toBe(1);
  });
  it("rejects databases in a symlinked data directory", () => {
    mkdirSync(path.join(root, "private"));
    symlinkSync(path.join(root, "private"), path.join(root, "data"), "dir");
    writeFileSync(path.join(root, "private/customer.db"), "synthetic");
    expect(check(["../../data/customer.db"]).status).toBe(1);
  });
  it.each(["", "-wal", "-shm", "-journal"])("rejects configured external database and sidecars: %s", (suffix) => {
    expect(check([`../../private/runtime.store${suffix}`]).status).toBe(1);
  });
  it("rejects a data file symlink whose target has no database extension", () => {
    mkdirSync(path.join(root, "data"));
    writeFileSync(path.join(root, "opaque-store"), "synthetic");
    symlinkSync(path.join(root, "opaque-store"), path.join(root, "data/customer.db"));
    expect(check(["../../data/customer.db"]).status).toBe(1);
  });
});
