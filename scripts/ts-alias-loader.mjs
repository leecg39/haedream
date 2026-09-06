import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const serverOnlyShim = pathToFileURL(
  join(root, "scripts/shims/server-only.mjs"),
).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return { url: serverOnlyShim, shortCircuit: true };
  }
  if (!specifier.startsWith("@/")) return nextResolve(specifier, context);
  const base = join(root, "src", specifier.slice(2));
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) return nextResolve(specifier, context);
  return { url: pathToFileURL(found).href, shortCircuit: true };
}
