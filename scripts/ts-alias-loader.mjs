import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export async function resolve(specifier, context, nextResolve) {
  if (!specifier.startsWith("@/")) return nextResolve(specifier, context);
  const base = join(process.cwd(), "src", specifier.slice(2));
  const candidates = [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) return nextResolve(specifier, context);
  return { url: pathToFileURL(found).href, shortCircuit: true };
}
