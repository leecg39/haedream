import "server-only";

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { getDb } from "@/lib/db";
import { decryptFirmPassword } from "@/lib/firm-secrets.server";

let cachedPasswords: Readonly<Record<string, string>> | null = null;

function loadKepcoPasswords(): Readonly<Record<string, string>> {
  if (cachedPasswords) return cachedPasswords;
  const credentialsPath = process.env.KEPCO_PASSWORDS_PATH
    ?? path.join(process.cwd(), "src/lib/fit-mocks/kepco-passwds.json");
  if (!existsSync(/* turbopackIgnore: true */ credentialsPath)) {
    cachedPasswords = Object.freeze({});
    return cachedPasswords;
  }
  cachedPasswords = Object.freeze(JSON.parse(
    readFileSync(/* turbopackIgnore: true */ credentialsPath, "utf8"),
  ) as Record<string, string>);
  return cachedPasswords;
}

/** Returns a KEPCO password only inside server modules. Never serialize this value. */
export function getKepcoPassword(fid: number): string {
  const stored = getDb().prepare("SELECT encrypted_password FROM firm_credentials WHERE fid = ?").get(fid) as
    | { encrypted_password: string } | undefined;
  if (stored) return decryptFirmPassword(fid, stored.encrypted_password);
  return loadKepcoPasswords()[String(fid)] ?? "";
}
