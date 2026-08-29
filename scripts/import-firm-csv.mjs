#!/usr/bin/env node
/**
 * data/firm-details.csv → src/lib/fit-mocks/firm-rows.json 변환기.
 *
 * CSV는 실제 운영 DB 덤프(BOM + 전 필드 따옴표)이고,
 * JSON은 `FirmRow`(src/lib/fit-mocks/firm.ts) 모양으로 정규화한다.
 * React(/fit/firm)와 정적 EMS 페이지(firm.html → /api/firm)가 같은 파일을 쓴다.
 *
 * 재생성: node scripts/import-firm-csv.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const csvPath = join(root, "data", "firm-details.csv");
const outPath = join(root, "src", "lib", "fit-mocks", "firm-rows.json");

/** 따옴표 CSV 파서 — "" 이스케이프와 필드 내 개행을 처리한다. */
function parseCsv(text) {
  const rows = [];
  let field = "";
  let record = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      record.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      record.push(field);
      field = "";
      if (record.length > 1 || record[0] !== "") rows.push(record);
      record = [];
    } else {
      field += ch;
    }
  }
  if (field !== "" || record.length > 0) {
    record.push(field);
    rows.push(record);
  }
  return rows;
}

const toInt = (value) => {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** unix 초 → YYYY-MM-DD (Asia/Seoul). 0/빈값은 "". */
const toDate = (value) => {
  const seconds = toInt(value);
  if (seconds <= 0) return "";
  return new Date(seconds * 1000).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
};

/** `POINT(경도 위도)` → `경도, 위도`. 원점(0 0)은 미등록으로 보고 빈값. */
const toGeo = (value) => {
  const match = String(value ?? "").match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);
  if (!match) return "";
  const [, lng, lat] = match;
  if (Number(lng) === 0 && Number(lat) === 0) return "";
  return `${lng}, ${lat}`;
};

const raw = readFileSync(csvPath, "utf8").replace(/^﻿/, "");
const [header, ...records] = parseCsv(raw);
const columns = header.map((name) => name.replace(/^"|"$/g, "").trim());

/** 한전고객번호는 앞자리 0을 보존해야 해서 문자열로 둔다. 전부 0이면 미등록(""). */
const toKepcoNo = (value) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  return /^0*$/.test(digits) ? "" : digits;
};

const rows = records.map((record) => {
  const get = (name) => record[columns.indexOf(name)] ?? "";
  return {
    fid: toInt(get("fid")),
    firmName: get("firmName"),
    registTime: "",
    contract: get("contract"),
    kepcoNo: toKepcoNo(get("kepcoNo")),
    eoiTime: toInt(get("eoiTime")),
    pct_ratio: toInt(get("pct_ratio")),
    peakLast: toInt(get("peakLast")),
    powerLimit: toInt(get("powerLimit")),
    peakRunMode: toInt(get("peakRunMode")) === 1 ? 1 : 0,
    peakControlMode: toInt(get("peakControlMode")) === 1 ? 1 : 0,
    isDisable: toInt(get("isDisable")) === 1 ? 1 : 0,
    serviceType: toInt(get("serviceType")),
    memo: get("memo"),
    frugal: 0,
    contractLimit: toInt(get("contractLimit")),
    ableLowPower: 0,
    maxAbleWatt: 0,
    maxAbleDate: 0,
    pass: "",
    degreeCity: toInt(get("degreeCity")),
    bone: get("bone"),
    kepcoCyber: get("kepcoCyber"),
    // 한전 비밀번호는 저장소에 올리지 않는다(.gitignore가 CSV 원본을 제외하는 이유).
    // 로컬 데모에서도 빈값으로 두며, 필요하면 로컬에서만 CSV를 다시 참조한다.
    kepcoPasswd: "",
    manager: get("manager"),
    phone: get("phone"),
    addressText: get("addressText"),
    checkDay: toInt(get("checkDay")),
    ableLimit: toInt(get("ableLimit")),
    ableLimitTime: toDate(get("ableLimitTime")),
    pulse_num: toInt(get("pulse_num")),
    frugalTime: toDate(get("frugalTime")),
    investGold: toInt(get("investGold")),
    kepcoContract: get("kepcoContract"),
    boss: get("boss"),
    mapGeo: toGeo(get("mapGeo")),
  };
});

// 원본 firm.html 은 최신 업체(fid 내림차순)부터 보여준다.
rows.sort((a, b) => b.fid - a.fid);
writeFileSync(outPath, `${JSON.stringify(rows, null, 1)}\n`);
console.log(`firm-rows.json: ${rows.length} rows written`);
