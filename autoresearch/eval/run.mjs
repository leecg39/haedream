import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
process.chdir(root);
const manifestPath = "autoresearch/frozen.json";
const digest = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const id = process.argv[2];
if (id === "--freeze") {
  if (existsSync(manifestPath)) throw new Error("평가 기준은 이미 동결되었습니다.");
  const files = git("ls-files").split("\n").filter((file) =>
    /^(src\/|tests\/|e2e\/|db\/migrations\/|autoresearch\/eval\/|autoresearch\/meta_eval\/)/.test(file)
      && file !== "src/features/pilot/ops-repository.ts");
  files.push("package.json", "package-lock.json", "tsconfig.json", "vitest.config.mts", "playwright.config.ts", "eslint.config.mjs", "next.config.ts");
  writeFileSync(manifestPath, JSON.stringify(Object.fromEntries([...new Set(files)].filter(existsSync).sort().map((file) => [file, digest(file)])), null, 2) + "\n");
  console.log(`동결 완료: ${Object.keys(JSON.parse(readFileSync(manifestPath, "utf8"))).length}개 파일`);
} else {
  if (!id || !/^[a-z0-9-]+$/.test(id)) throw new Error("사용법: node autoresearch/eval/run.mjs <실험ID> [--guard]");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  for (const [file, hash] of Object.entries(manifest)) {
    if (digest(file) !== hash) throw new Error(`동결 파일 변경 감지: ${file}`);
  }
  const directory = path.join(root, "autoresearch/artifacts", id);
  if (existsSync(directory)) throw new Error(`기존 실험 기록은 덮어쓸 수 없습니다: ${id}`);
  mkdirSync(directory, { recursive: true });
  function command(label, binary, args, env = {}) {
    const result = spawnSync(binary, args, { cwd: root, encoding: "utf8", timeout: 120000,
      env: { ...process.env, ...env }, maxBuffer: 16 * 1024 * 1024 });
    writeFileSync(path.join(directory, `${label}.log`), `${result.stdout ?? ""}${result.stderr ?? ""}${result.error ? String(result.error) : ""}`);
    console.log(`${label}: ${result.status === 0 ? "pass" : "fail"}`);
    return result.status === 0;
  }
  const verify = command("verify", process.execPath, ["node_modules/vitest/vitest.mjs", "run", "--config", "autoresearch/eval/vitest.config.mts"],
    { AUTORESEARCH_METRICS: path.join(directory, "metrics.json") });
  const guards = {};
  if (verify && process.argv.includes("--guard")) {
    for (const script of ["test", "typecheck", "lint"]) guards[script] = command(script, "npm", ["run", script]);
  }
  const metrics = verify ? JSON.parse(readFileSync(path.join(directory, "metrics.json"), "utf8")) : null;
  const total = (suite) => Object.values(suite).reduce((sum, row) => sum + row.work, 0);
  const result = { id, commit: git("rev-parse", "HEAD"), targetHash: digest("src/features/pilot/ops-repository.ts"),
    frozenHash: digest(manifestPath), verify, guards, inner: metrics ? total(metrics.inner) : null,
    outer: metrics ? total(metrics.outer) : null, metrics };
  writeFileSync(path.join(directory, "result.json"), JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify({ id, inner: result.inner, outer: result.outer, verify, guards }));
  if (!verify || Object.values(guards).includes(false)) process.exitCode = 1;
}
