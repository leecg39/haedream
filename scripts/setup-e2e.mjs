import { rmSync } from "node:fs";
import path from "node:path";

const databasePath = path.join(process.cwd(), "data", "solarsimz-e2e.db");
for (const suffix of ["", "-wal", "-shm"]) {
  rmSync(`${databasePath}${suffix}`, { force: true });
}

process.env.DATABASE_PATH = databasePath;
process.env.ALLOW_DEMO_SEED = "true";
await import("./seed.mjs");
