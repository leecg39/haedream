import { readFileSync } from "node:fs";
import path from "node:path";

let cachedPasswords: Readonly<Record<string, string>> | null = null;

function loadKepcoPasswords(): Readonly<Record<string, string>> {
  if (cachedPasswords) return cachedPasswords;
  const credentialsPath = process.env.KEPCO_PASSWORDS_PATH
    ?? path.join(process.cwd(), "src/lib/fit-mocks/kepco-passwds.json");
  cachedPasswords = Object.freeze(JSON.parse(
    readFileSync(/* turbopackIgnore: true */ credentialsPath, "utf8"),
  ) as Record<string, string>);
  return cachedPasswords;
}

/** Returns a KEPCO password only inside server modules. Never serialize this value. */
export function getKepcoPassword(fid: number): string {
  return loadKepcoPasswords()[String(fid)] ?? "";
}
