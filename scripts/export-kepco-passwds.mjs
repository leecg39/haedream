/**
 * fit.rfenms.com 업체관리(firm.html) 전체 업체의 한전 비밀번호(kepcoPasswd)를 수집해
 * 마크다운(data/kepco-passwds.md)으로 저장한다.
 *
 * UI 클릭 대신 팝업이 실제로 호출하는 API를 그대로 재현한다 (동일 결과, 훨씬 빠름):
 *   1) POST https://watt.rfenms.com/api/tokens  {"cf":"login","id","pw"}  → token, fid
 *   2) GET  /api/firm/{fid}?cf=get&page=N...                             → 업체 목록(페이징)
 *   3) GET  /api/firm/{fid}/{업체fid}                                     → 상세(kepcoPasswd)
 *
 * 실행:
 *   FIT_TOKEN=토큰 node scripts/export-kepco-passwds.mjs   (브라우저 세션 토큰 사용)
 *   FIT_LOGIN_ID=아이디 FIT_LOGIN_PW=비밀번호 node scripts/export-kepco-passwds.mjs
 *   (기본은 headless. 창을 띄우려면 HEADFUL=1)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const API = 'https://watt.rfenms.com';
const OUT_MD = path.join(ROOT, 'data', 'kepco-passwds.md');
const OUT_JSON = path.join(ROOT, 'data', 'kepco-passwds.json'); // 중간 저장(재시작 대비)
const DELAY_MS = 150;

const LOGIN_ID = process.env.FIT_LOGIN_ID ?? '';
const LOGIN_PW = process.env.FIT_LOGIN_PW ?? '';
const FIT_TOKEN = process.env.FIT_TOKEN ?? ''; // 로그인된 브라우저의 sessionStorage accessToken

if (!FIT_TOKEN && (!LOGIN_ID || !LOGIN_PW)) {
  console.error('사용법: FIT_TOKEN=토큰 node scripts/export-kepco-passwds.mjs');
  console.error('   또는 FIT_LOGIN_ID=아이디 FIT_LOGIN_PW=비밀번호 node scripts/export-kepco-passwds.mjs');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const browser = await chromium.launch({ headless: process.env.HEADFUL !== '1' });
  const context = await browser.newContext();
  const req = context.request; // Playwright API 요청 컨텍스트

  // 1) 토큰 확보: FIT_TOKEN 이 있으면 platform 검증으로 fid 조회, 없으면 로그인
  let token, fid;
  if (FIT_TOKEN) {
    token = FIT_TOKEN;
    const res = await req.post(`${API}/api/tokens`, {
      headers: { Authorization: `x-auth ${token}`, 'Content-Type': 'application/json' },
      data: { cf: 'platform' },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok() || !json.fid) {
      throw new Error(`토큰 검증 실패: HTTP ${res.status()} ${json.msg ?? ''}`);
    }
    fid = json.fid;
    console.log(`토큰 확인: fid=${fid}, firmName=${json.firmName ?? ''}`);
  } else {
    const loginRes = await req.post(`${API}/api/tokens`, {
      headers: { 'Content-Type': 'application/json;charset=utf-8' },
      data: { cf: 'login', id: LOGIN_ID, pw: LOGIN_PW },
    });
    if (!loginRes.ok()) {
      throw new Error(`로그인 HTTP ${loginRes.status()}`);
    }
    const loginJson = await loginRes.json();
    if (!loginJson.token) {
      throw new Error(`로그인 실패: ${loginJson.msg ?? '토큰 없음'}`);
    }
    token = loginJson.token;
    fid = loginJson.fid;
    console.log(`로그인 성공: fid=${fid}, firmName=${loginJson.firmName ?? ''}`);
  }
  const authHeaders = {
    Authorization: `x-auth ${token}`,
    'Content-Type': 'application/json;charset=utf-8',
  };

  // 2) 업체 목록 전체 수집 (페이징)
  const firms = [];
  let page = 1;
  let total = 0;
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
    total = json.paging?.dbNo ?? firms.length;
    const lastPage = json.paging?.dbPageNo ?? 1;
    console.log(`목록 page ${page}/${lastPage} (누적 ${firms.length}/${total})`);
    if (page >= lastPage || (json.data ?? []).length === 0) break;
    page += 1;
    await sleep(DELAY_MS);
  }
  console.log(`업체 총 ${firms.length}개 수집 (서버 집계 ${total})`);

  // 3) 업체별 상세 조회 → kepcoPasswd (팝업이 채우는 값과 동일)
  mkdirSync(path.dirname(OUT_MD), { recursive: true });
  const rows = [];
  const failures = [];
  for (let i = 0; i < firms.length; i++) {
    const f = firms[i];
    try {
      const res = await req.get(`${API}/api/firm/${fid}/${f.fid}`, { headers: authHeaders });
      if (!res.ok()) throw new Error(`HTTP ${res.status()}`);
      const json = await res.json();
      if (json.code) throw new Error(`code=${json.code} ${json.msg ?? ''}`);
      const d = json.data ?? {};
      rows.push({
        id: f.fid,
        업체명: d.firmName ?? f.firmName ?? '',
        한전고객번호: d.kepcoNo ? String(d.kepcoNo).padStart(10, '0') : '',
        한전비밀번호: d.kepcoPasswd ?? '',
        사이트아이디: d.bone ?? '',
        관리자: d.manager ?? '',
        연락처: d.phone ?? '',
      });
    } catch (err) {
      failures.push({ id: f.fid, error: String(err.message ?? err) });
      rows.push({ id: f.fid, 업체명: f.firmName ?? '', 한전고객번호: '', 한전비밀번호: '', 사이트아이디: '', 관리자: '', 연락처: '' });
    }
    if ((i + 1) % 100 === 0 || i + 1 === firms.length) {
      console.log(`상세 ${i + 1}/${firms.length} (실패 ${failures.length})`);
      writeFileSync(OUT_JSON, JSON.stringify({ rows, failures }, null, 2)); // 중간 저장
    }
    await sleep(DELAY_MS);
  }
  writeFileSync(OUT_JSON, JSON.stringify({ rows, failures }, null, 2));

  // 4) 마크다운 저장
  const escMd = (v) => String(v ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
  const filled = rows.filter((r) => r.한전비밀번호).length;
  const md = [
    '# fit.rfenms.com 업체별 한전 비밀번호',
    '',
    `- 수집일시: ${new Date().toLocaleString('ko-KR')}`,
    `- 총 업체: ${rows.length}개 (비밀번호 있음 ${filled}개, 조회 실패 ${failures.length}개)`,
    '',
    '| ID | 업체명 | 한전고객번호 | 한전비밀번호 | 사이트아이디 | 관리자 | 연락처 |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map((r) => `| ${escMd(r.id)} | ${escMd(r.업체명)} | ${escMd(r.한전고객번호)} | ${escMd(r.한전비밀번호)} | ${escMd(r.사이트아이디)} | ${escMd(r.관리자)} | ${escMd(r.연락처)} |`),
    '',
  ].join('\n');
  writeFileSync(OUT_MD, md);

  console.log(`\n완료: ${rows.length}건 수집 (비밀번호 있음 ${filled}건, 실패 ${failures.length}건)`);
  console.log(`마크다운: ${OUT_MD}`);
  if (failures.length) console.log('실패 ID:', failures.map((f) => f.id).join(', '));

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
