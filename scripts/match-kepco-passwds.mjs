#!/usr/bin/env node
/**
 * data/kepco-passwds.json(export-kepco-passwds.mjs 수집 결과)의 한전 비밀번호를
 * firm-rows.json 의 업체와 매칭해 src/lib/fit-mocks/kepco-passwds.json 을 만든다.
 *
 * 출력은 `fid → 한전비밀번호` 맵이며 .gitignore 처리된 로컬 전용 파일이다
 * (비밀번호가 저장소에 올라가지 않도록). src/lib/fit-mocks/firm.ts 가
 * 이 맵을 FIRM_ROWS 에 병합해 /fit/firm 화면에 비밀번호를 노출한다.
 *
 * 매칭 키는 fid 다. 수집 데이터의 id 와 firm-rows 의 fid 는 1:1 이고,
 * 한전고객번호는 26개 키가 중복이라 키로 쓸 수 없다. 대신 양쪽 한전고객번호가
 * 모두 존재하는데 일치하지 않으면 충돌로 보고 그 행은 제외한다.
 *
 * 재생성: node scripts/match-kepco-passwds.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const firmRowsPath = join(root, "src", "lib", "fit-mocks", "firm-rows.json");
const passwdsPath = join(root, "data", "kepco-passwds.json");
const outPath = join(root, "src", "lib", "fit-mocks", "kepco-passwds.json");

const firmRows = JSON.parse(readFileSync(firmRowsPath, "utf8"));
const collected = JSON.parse(readFileSync(passwdsPath, "utf8")).rows;

const byFid = new Map(firmRows.map((row) => [row.fid, row]));

/** 숫자만 남기고, 전부 0(미등록)이면 빈값. import-firm-csv.mjs 의 toKepcoNo 와 동일 기준. */
const toKepcoNo = (value) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  return /^0*$/.test(digits) ? "" : digits;
};

const map = {};
let unknownFid = 0;
let conflicts = 0;
for (const entry of collected) {
  const row = byFid.get(Number(entry.id));
  if (!row) {
    unknownFid += 1;
    continue;
  }
  const collectedNo = toKepcoNo(entry["한전고객번호"]);
  if (collectedNo && row.kepcoNo && collectedNo !== row.kepcoNo) {
    conflicts += 1;
    console.warn(`충돌: fid=${row.fid} 수집=${collectedNo} rows=${row.kepcoNo}`);
    continue;
  }
  const passwd = String(entry["한전비밀번호"] ?? "").trim();
  if (passwd) map[String(row.fid)] = passwd;
}

writeFileSync(outPath, `${JSON.stringify(map, null, 1)}\n`);
console.log(
  `kepco-passwds.json: ${Object.keys(map).length}개 비밀번호 매칭` +
    ` (수집 ${collected.length}건, fid 불일치 ${unknownFid}건, 고객번호 충돌 ${conflicts}건)`,
);
