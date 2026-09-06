#!/usr/bin/env node
/**
 * 공개 빌드 산출물에서 고객정보·금지 필드 값·과거 실덤프 탐지 문자열을 검사한다.
 *
 * 사용: npm run build && npm run check:public-data
 *
 * 폼 필드명(`kepcoPasswd` 입력칸 등)은 허용하고, 값이 채워진 직렬화만 실패로 본다.
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const scanRoots = [
  path.join(root, ".next", "static"),
  path.join(root, "public"),
];

/** 과거 운영 덤프에서 가져온 대표 탐지 문자열 — 공개 산출물에 있으면 안 된다. */
const dumpBlacklist = [
  "(주)알앤텍_2",
  "여명로213",
  "0927031098",
];

/** 값이 비어 있지 않은 비밀 필드 JSON 직렬화만 실패로 본다. */
const secretValuePatterns = [
  /"kepcoPasswd"\s*:\s*"[^"\s][^"]*"/,
  /"raw_json"\s*:\s*"[^"\s][^"]*"/,
];

const textExtensions = new Set([
  ".js",
  ".css",
  ".html",
  ".json",
  ".map",
  ".txt",
  ".svg",
]);

function* walk(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) yield* walk(full);
    else yield full;
  }
}

const hits = [];
for (const base of scanRoots) {
  for (const file of walk(base)) {
    const ext = path.extname(file).toLowerCase();
    if (!textExtensions.has(ext)) continue;
    let text;
    try {
      text = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const rel = path.relative(root, file);
    for (const needle of dumpBlacklist) {
      if (text.includes(needle)) {
        hits.push({ file: rel, needle });
      }
    }
    for (const pattern of secretValuePatterns) {
      if (pattern.test(text)) {
        hits.push({ file: rel, needle: pattern.toString() });
      }
    }
  }
}

const firmModule = path.join(root, "src/lib/fit-mocks/firm.ts");
if (existsSync(firmModule)) {
  const firmSource = readFileSync(firmModule, "utf8");
  if (firmSource.includes("firm-rows.json") || /\bFIRM_ROWS\b/.test(firmSource)) {
    hits.push({
      file: "src/lib/fit-mocks/firm.ts",
      needle: "client firm module must not embed firm-rows/FIRM_ROWS",
    });
  }
}

const firmRows = path.join(root, "src/lib/fit-mocks/firm-rows.json");
if (existsSync(firmRows)) {
  const rows = JSON.parse(readFileSync(firmRows, "utf8"));
  if (!Array.isArray(rows) || rows.length > 20) {
    hits.push({
      file: "src/lib/fit-mocks/firm-rows.json",
      needle: `fixture too large (${Array.isArray(rows) ? rows.length : "invalid"}) — keep synthetic only`,
    });
  }
  for (const row of Array.isArray(rows) ? rows : []) {
    for (const needle of dumpBlacklist) {
      if (JSON.stringify(row).includes(needle)) {
        hits.push({ file: "src/lib/fit-mocks/firm-rows.json", needle });
      }
    }
  }
}

if (hits.length > 0) {
  console.error("[check-public-data] forbidden exposure detected:");
  for (const hit of hits) {
    console.error(`  - ${hit.file}: ${hit.needle}`);
  }
  process.exit(1);
}

console.log("[check-public-data] ok");
