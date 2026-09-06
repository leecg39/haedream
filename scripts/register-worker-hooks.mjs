import Module from "node:module";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { register as registerNodeHook } from "node:module";
import { fileURLToPath } from "node:url";
import { register as registerTsx } from "tsx/esm/api";

const root = process.cwd();
const serverOnlyShim = fileURLToPath(new URL("./shims/server-only.cjs", import.meta.url));

function resolveAtAlias(request) {
  if (!request.startsWith("@/")) return null;
  const base = join(root, "src", request.slice(2));
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

// tsx 가 CJS require 로 변환할 때 server-only / @/ 를 해석한다.
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function patchedResolve(request, parent, isMain, options) {
  if (request === "server-only") return serverOnlyShim;
  const aliased = resolveAtAlias(request);
  if (aliased) return aliased;
  return originalResolve.call(this, request, parent, isMain, options);
};

registerTsx();
registerNodeHook("./ts-alias-loader.mjs", import.meta.url);
