/**
 * fit.rfenms.com 업체관리(firm.html) 전체 업체의 팝업 상세 정보 전체를 수집해
 * 엑셀에서 바로 열리는 CSV(data/firm-details.csv)로 저장한다.
 *
 * UI 클릭 대신 팝업이 실제로 호출하는 API를 그대로 재현한다 (동일 결과, 훨씬 빠름):
 *   1) POST https://watt.rfenms.com/api/tokens  {"cf":"platform"}        → 토큰 검증 + fid
 *   2) GET  /api/firm/{fid}?cf=get&page=N...                            → 업체 목록(페이징)
 *   3) GET  /api/firm/{fid}/{업체fid}                                    → 상세 전체 필드
 *
 * 실행:
 *   FIT_TOKEN=토큰 node scripts/export-firm-details.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const API = 'https://watt.rfenms.com';
const OUT_CSV = path.join(ROOT, 'data', 'firm-details.csv');
const OUT_JSON = path.join(ROOT, 'data', 'firm-details.json'); // 중간 저장(재시작 대비)
const DELAY_MS = 150;

const FIT_TOKEN = process.env.FIT_TOKEN ?? ''; // 로그인된 브라우저의 sessionStorage accessToken

if (!FIT_TOKEN) {
  console.error('사용법: FIT_TOKEN=토큰 node scripts/export-firm-details.mjs');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 컬럼 앞쪽 순서(팝업 표시 순서 기준). 나머지 키는 발견 순서대로 뒤에 붙인다. */
const PREFERRED_ORDER = [
  'fid', 'firmName', 'bone', 'kepcoNo', 'kepcoPasswd', 'contract', 'kepcoContract',
  'manager', 'boss', 'phone', 'addressText', 'mapGeo', 'degreeCity',
  'serviceType', 'isDisable', 'memo',
];

async function main() {
  const browser = await chromium.launch({ headless: process.env.HEADFUL !== '1' });
  const context = await browser.newContext();
  const req = context.request; // Playwright API 요청 컨텍스트

  // 1) 토큰 검증 + fid 조회
  const tokenRes = await req.post(`${API}/api/tokens`, {
    headers: { Authorization: `x-auth ${FIT_TOKEN}`, 'Content-Type': 'application/json' },
    data: { cf: 'platform' },
  });
  const tokenJson = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok() || !tokenJson.fid) {
    throw new Error(`토큰 검증 실패: HTTP ${tokenRes.status()} ${tokenJson.msg ?? ''} — 새 토큰이 필요합니다`);
  }
  const fid = tokenJson.fid;
  console.log(`토큰 확인: fid=${fid}, firmName=${tokenJson.firmName ?? ''}`);
  const authHeaders = {
    Authorization: `x-auth ${FIT_TOKEN}`,
    'Content-Type': 'application/json;charset=utf-8',
  };

  // 2) 업체 목록 전체 수집 (페이징)
  const firms = [];
  let page = 1;
  for (;;) {
    const qs = new URLSearchParams({
      cf: 'get', qs: '', page: String(page),
      qt: 'fid', qa: '1', isLow: '0', serviceType: '0',
    });
    const res = await req.get(`${API}/api/firm/${fid}?${qs}`, { headers: authHeaders });
    if (!res.ok()) throw new Error(`목록 HTTP ${res.status()} (page=${page})`);
    const json = await res.json();
    if (json.code) throw new Error(`목록 오류 code=${json.code}: ${json.msg ?? ''}`);
    for (const row of json.data ?? []) firms.push(row);
    const lastPage = json.paging?.dbPageNo ?? 1;
    console.log(`목록 page ${page}/${lastPage} (누적 ${firms.length}/${json.paging?.dbNo ?? '?'})`);
    if (page >= lastPage || (json.data ?? []).length === 0) break;
    page += 1;
    await sleep(DELAY_MS);
  }
  console.log(`업체 총 ${firms.length}개 수집`);

  // 3) 업체별 상세 조회 — 응답 전체 필드 + 목록에만 있는 필드 병합
  mkdirSync(path.dirname(OUT_CSV), { recursive: true });
  const rows = [];
  const failures = [];
  for (let i = 0; i < firms.length; i++) {
    const f = firms[i];
    try {
      const res = await req.get(`${API}/api/firm/${fid}/${f.fid}`, { headers: authHeaders });
      if (!res.ok()) throw new Error(`HTTP ${res.status()}`);
      const json = await res.json();
      if (json.code) throw new Error(`code=${json.code} ${json.msg ?? ''}`);
      // 목록 행(계산 필드 포함) 위에 상세 필드를 덮어쓴다
      rows.push({ ...f, ...(json.data ?? {}) });
    } catch (err) {
      failures.push({ id: f.fid, error: String(err.message ?? err) });
      rows.push({ ...f, _error: String(err.message ?? err) });
    }
    if ((i + 1) % 100 === 0 || i + 1 === firms.length) {
      console.log(`상세 ${i + 1}/${firms.length} (실패 ${failures.length})`);
      writeFileSync(OUT_JSON, JSON.stringify({ rows, failures }, null, 2)); // 중간 저장
    }
    await sleep(DELAY_MS);
  }
  writeFileSync(OUT_JSON, JSON.stringify({ rows, failures }, null, 2));

  // 4) 컬럼 구성: 선호 순서 → 나머지 발견 순서
  const allKeys = new Set();
  for (const r of rows) for (const k of Object.keys(r)) allKeys.add(k);
  const columns = [
    ...PREFERRED_ORDER.filter((k) => allKeys.has(k)),
    ...[...allKeys].filter((k) => !PREFERRED_ORDER.includes(k)),
  ];

  // 5) CSV 저장 (BOM 포함 — 엑셀에서 한글 깨짐 방지)
  const csvCell = (v) => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') v = JSON.stringify(v);
    return `"${String(v).replace(/"/g, '""')}"`;
  };
  const csv = '﻿'
    + [columns.map(csvCell).join(','), ...rows.map((r) => columns.map((c) => csvCell(r[c])).join(','))].join('\r\n');
  writeFileSync(OUT_CSV, csv);

  const withPw = rows.filter((r) => r.kepcoPasswd).length;
  console.log(`\n완료: ${rows.length}건 수집 (한전비밀번호 있음 ${withPw}건, 실패 ${failures.length}건)`);
  console.log(`컬럼 ${columns.length}개: ${columns.join(', ')}`);
  console.log(`CSV : ${OUT_CSV}`);
  console.log(`JSON: ${OUT_JSON}`);
  if (failures.length) console.log('실패 ID:', failures.map((f) => f.id).join(', '));

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
