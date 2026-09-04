import { migrate, resolveDatabasePath } from "./migrate.mjs";
import { seedPilotData } from "./pilot-seed.mjs";

if (process.env.ALLOW_DEMO_SEED !== "true") {
  throw new Error(
    "Pilot seeding is opt-in. Set ALLOW_DEMO_SEED=true only for an isolated development or demo database.",
  );
}

const db = migrate();
seedPilotData(db);
db.close();
console.log(`Pilot seed complete: ${resolveDatabasePath()}`);
console.log("Gateway gw-pilot-01 · points pt-pm-01 (enabled), pt-din-01 (disabled)");
