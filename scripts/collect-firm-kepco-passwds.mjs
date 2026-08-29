'use strict';

/**
 * fit.rfenms.com 업체관리(firm.html)의 각 업체 ID 클릭 → 팝업(modal)의
 * 한전 비밀번호(kepcoPasswd)를 수집해 JSONL 체크포인트와 엑셀로 저장한다.
 *
 * 사용법:
 *   node scripts/collect-firm-kepco-passwds.mjs --id <아이디> --pw '<비밀번호>'
 *   node scripts/collect-firm-kepco-passwds.mjs --token <accessToken> [--fid <fid>]
 *   node scripts/collect-firm-kepco-passwds.mjs --excel-only   (체크포인트로 엑셀만 생성)
 *
 * 옵션:
 *   --url  _fit 기준 URL (기본 https://fit.rfenms.com)
 *   --api   API 오리진 (기본 https://watt.rfenms.com)
 *   --out   출력 디렉터리 (기본 data)
 *   --limit N  이번 실행에서 최대 N건만 추가 수집(테스트용)
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from '@playwright/test';

const require = createRequire(import.meta.url);

function parseArgs(argv) {
    const out = { url: 'https://fit.rfenms.com', api: 'https://watt.rfenms.com', out: 'data' };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--id') out.id = argv[++i];
        else if (a === '--pw') out.pw = argv[++i];
        else if (a === '--token') out.token = argv[++i];
        else if (a === '--fid') out.fid = argv[++i];
        else if (a === '--url') out.url = argv[++i];
        else if (a === '--api') out.api = argv[++i];
        else if (a === '--out') out.out = argv[++i];
        else if (a === '--limit') out.limit = Number(argv[++i]);
        else if (a === '--excel-only') out.excelOnly = true;
        else throw new Error(`알 수 없는 인자: ${a}`);
    }
    return out;
}

const args = parseArgs(process.argv.slice(2));
const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const outDir = path.isAbsolute(args.out) ? args.out : path.join(rootDir, args.out);
fs.mkdirSync(outDir, { recursive: true });
const jsonlPath = path.join(outDir, 'firm-kepco-passwds.jsonl');
const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const xlsxPath = path.join(outDir, `한전비밀번호_${stamp}.xlsx`);

function loadCheckpoint() {
    const rows = new Map();
    if (fs.existsSync(jsonlPath)) {
        for (const line of fs.readFileSync(jsonlPath, 'utf8').split('\n')) {
            const t = line.trim();
            if (!t) continue;
            try {
                const j = JSON.parse(t);
                rows.set(String(j.fid), j);
            } catch { /* 깨진 라인 무시 */ }
        }
    }
    return rows;
}

function appendCheckpoint(row) {
    fs.appendFileSync(jsonlPath, JSON.stringify(row) + '\n');
}

async function login() {
    const res = await fetch(`${args.api}/api/tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json;charset=utf-8' },
        body: JSON.stringify({ cf: 'login', id: args.id, pw: args.pw }),
    });
    if (!res.ok) throw new Error(`로그인 HTTP ${res.status}`);
    const j = await res.json();
    if (!j.token) throw new Error(`로그인 실패: ${j.msg ?? JSON.stringify(j)}`);
    return j;
}

function buildXlsx(collected) {
    const XLSX = require(path.join(rootDir, 'scripts', 'vendor', 'xlsx.full.min.js'));
    const sorted = [...collected.values()].sort((a, b) => Number(a.fid) - Number(b.fid));
    const aoa = [['fid', '업체명', '한전고객번호', '한전비밀번호', '수집시각']];
    for (const r of sorted) {
        aoa.push([r.fid, r.firmName, r.kepcoNo, r.kepcoPasswd, r.collectedAt]);
    }
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{ wch: 8 }, { wch: 40 }, { wch: 14 }, { wch: 20 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '한전비밀번호');
    XLSX.writeFile(wb, xlsxPath);
}

// ---------- 엑셀만 생성 모드 ----------
const checkpoint = loadCheckpoint();
if (args.excelOnly) {
    if (!checkpoint.size) throw new Error('체크포인트가 없습니다. 먼저 수집을 실행하세요.');
    buildXlsx(checkpoint);
    console.log(`엑셀 생성 완료: ${xlsxPath} (${checkpoint.size}건)`);
    process.exit(0);
}

// ---------- 세션 준비 ----------
let session;
if (args.token) {
    session = { token: args.token, fid: args.fid ?? '', members: [] };
    if (!session.fid) throw new Error('--token 사용 시 --fid 를 함께 지정하세요.');
} else if (args.id && args.pw) {
    session = await login();
    console.log(`로그인 성공: id=${args.id} fid=${session.fid} firmName=${session.firmName}`);
} else {
    throw new Error('--id/--pw 또는 --token/--fid 가 필요합니다.');
}

// ---------- 브라우저 실행 ----------
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });

const membersJson = JSON.stringify(session.members ?? []);
const menuPairs = Object.entries(session.menu ?? {});
await context.addInitScript(([token, fid, membersJson, menuPairs, authId]) => {
    sessionStorage.setItem('accessToken', token);
    localStorage.setItem('authId', authId ?? '');
    localStorage.setItem('authIdn', '');
    localStorage.setItem('authName', '');
    localStorage.setItem('fid', fid);
    localStorage.setItem('firmName', '');
    localStorage.setItem('language', 'ko');
    localStorage.setItem('members', membersJson);
    localStorage.setItem('peakInfo', '');
    localStorage.setItem('permit', '');
    for (const [k, v] of menuPairs) localStorage.setItem(k, v);
}, [session.token, String(session.fid), membersJson, menuPairs, args.id ?? '']);

const page = await context.newPage();
page.setDefaultTimeout(15000);

// 세션 만료 등으로 로그인 페이지로 튕기는 경우 즉시 중단
page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame() && /login\.html/.test(frame.url())) {
        console.error('세션이 만료되어 로그인 페이지로 이동했습니다. 토큰을 갱신하세요.');
        process.exit(2);
    }
});

console.log(`페이지 진입: ${args.url}/firm.html`);
await page.goto(`${args.url}/firm.html`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('tr[data-idn]', { timeout: 30000 });

// 총 건수/페이지 수 파악 ("1 - 20 / 1661")
const limitText = await page.locator('#deskLimit').first().textContent();
const totalMatch = (limitText ?? '').match(/\/\s*(\d+)/);
if (!totalMatch) throw new Error(`총 건수를 파악할 수 없습니다: "${limitText}"`);
const total = Number(totalMatch[1]);
console.log(`총 ${total}건`);

// 리스트가 렌더되는 tbody 찾기
const listSel = (await page.locator('#lowDeskList tr[data-idn]').count()) > 0
    ? '#lowDeskList tr[data-idn]'
    : '#deskList tr[data-idn]';

let done = 0, skipped = 0;
const failures = [];

async function collectRow(row, pageIndex) {
    const fid = await row.getAttribute('data-idn');
    if (checkpoint.has(String(fid))) { skipped++; return; }

    // 업체명은 행에서 바로 읽고, 나머지는 팝업에서 읽는다
    const firmNameInRow = (await row.locator('td').nth(1).innerText()).trim();

    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            await row.locator('td.textAct, td.editAct').first().click();
            await page.waitForSelector('#modal:not(.disable)', { timeout: 8000 });
            const rec = {
                fid: String(fid),
                firmName: (await page.locator('#edit-firmName').inputValue()).trim() || firmNameInRow,
                kepcoNo: await page.locator('#edit-kepcoNo').inputValue(),
                kepcoPasswd: await page.locator('#edit-kepcoPasswd').inputValue(),
                collectedAt: new Date().toISOString(),
            };
            await page.locator('#modalActClose').click();
            await page.waitForSelector('#modal.disable', { timeout: 8000 });
            appendCheckpoint(rec);
            checkpoint.set(String(fid), rec);
            done++;
            if (done % 50 === 0) {
                console.log(`진행: ${done}건 수집 / 건너뜀 ${skipped} / 총 ${total}`);
            }
            return;
        } catch (e) {
            if (attempt === 2) {
                failures.push({ fid, error: String(e).slice(0, 200) });
                console.error(`수집 실패 fid=${fid}: ${String(e).slice(0, 120)}`);
                // 모달이 열려 있으면 닫고 다음 행으로
                const modalOpen = await page.locator('#modal:not(.disable)').count();
                if (modalOpen) await page.locator('#modalActClose').click().catch(() => {});
            } else {
                await page.waitForTimeout(500);
            }
        }
    }
}

// 페이지 단위 순회: 페이지 이동은 사이트 자체 함수로, 각 행은 실제 클릭으로 수집
const pageSize = (await page.locator(listSel).count()) || 1;
const totalPages = Math.ceil(total / pageSize);
console.log(`페이지 크기 ${pageSize}, 총 ${totalPages}페이지 (행 클릭 방식)`);

for (let p = 1; p <= totalPages; p++) {
    if (p > 1) {
        await page.evaluate((n) => window.vio.getData(n), p);
    }
    await page.waitForSelector(`${listSel}`, { timeout: 30000 });
    await page.waitForTimeout(300); // 렌더 안정화

    const rows = await page.locator(listSel).all();
    for (const row of rows) {
        if (args.limit && done >= args.limit) break;
        await collectRow(row, p);
    }
    if (args.limit && done >= args.limit) {
        console.log(`--limit ${args.limit} 도달, 중단`);
        break;
    }
}

await browser.close();

console.log('='.repeat(50));
console.log(`수집 완료: 이번 실행 ${done}건, 누적 ${checkpoint.size}/${total}건, 건너뜀(기존) ${skipped}건`);
if (failures.length) {
    console.log('실패 목록:');
    for (const f of failures) console.log(`  fid=${f.fid}: ${f.error}`);
    console.log('스크립트를 다시 실행하면 실패한 건만 재수집합니다.');
}

if (checkpoint.size) {
    buildXlsx(checkpoint);
    console.log(`엑셀 생성 완료: ${xlsxPath}`);
}
