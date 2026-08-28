/**
 * FROZEN METRIC — 원본 인터랙션 커버리지
 *
 * 이 파일은 고정 인프라다. 실험 에이전트는 절대 수정하지 않는다.
 * 메트릭을 통과시키려 이 파일을 고치는 것은 루프를 무의미하게 만든다.
 *
 * 정의:
 *   분모 = 원본 fit.rfenms.com 의 페이지별 JS 가 addEventListener 를 붙이는 DOM id 전체
 *   분자 = 그중 클론의 렌더 결과에 실제로 존재하는 id 수
 *
 * 분모는 `docs/research/fit.rfenms.com/assets/js/*.js`(원본 사이트 아카이브)에서
 * 매 실행마다 파싱한다. 원본 아카이브는 읽기 전용 참조이므로 조작할 수 없다.
 *
 * 실행: node autoresearch/eval/interaction_coverage.mjs [baseUrl]
 * 출력 마지막 줄: COVERAGE <hit> <total> <percent>
 */
import { readFileSync, existsSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const JS_DIR = 'docs/research/fit.rfenms.com/assets/js';

/** 원본 page JS 파일명 → 클론 라우트 */
const PAGE_ROUTES = {
  stat: 'stat',
  firm: 'firm',
  research: 'research',
  peak: 'peak',
  peakPanel: 'peak-panel',
  peakSet: 'peak-set',
  peakHis: 'peak-his',
  powerUsage: 'power-usage',
  peakUsage: 'peak-usage',
  controlHis: 'control-his',
  acp: 'acp',
  ratePlan: 'rate-plan',
  reduce: 'reduce',
  report: 'report',
};

const NEAR = 160; // getElementById 와 addEventListener 사이 허용 거리(문자)

function requiredIds(pageKey) {
  const path = `${JS_DIR}/${pageKey}.js`;

  if (!existsSync(path)) return [];

  const js = readFileSync(path, 'utf8');
  const ids = new Set();
  const patterns = [
    new RegExp(String.raw`getElementById\(\s*['"]([\w-]+)['"]\s*\)[\s\S]{0,${NEAR}}?addEventListener`, 'g'),
    new RegExp(String.raw`querySelector(?:All)?\(\s*['"]#([\w-]+)['"]\s*\)[\s\S]{0,${NEAR}}?addEventListener`, 'g'),
  ];

  for (const re of patterns) {
    for (const m of js.matchAll(re)) ids.add(m[1]);
  }

  return [...ids].sort();
}

async function fetchPage(route) {
  const res = await fetch(`${BASE}/fit/${route}`, { signal: AbortSignal.timeout(60_000) });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  return res.text();
}

async function main() {
  let hit = 0;
  let total = 0;
  const report = [];

  for (const [pageKey, route] of Object.entries(PAGE_ROUTES)) {
    const ids = requiredIds(pageKey);

    if (ids.length === 0) continue;

    let html = '';

    try {
      html = await fetchPage(route);
    } catch (error) {
      total += ids.length;
      report.push({ route, hit: 0, total: ids.length, missing: ids, error: String(error) });
      continue;
    }

    const present = ids.filter((id) => new RegExp(`id="${id}"`).test(html));
    hit += present.length;
    total += ids.length;
    report.push({ route, hit: present.length, total: ids.length, missing: ids.filter((i) => !present.includes(i)) });
  }

  for (const row of report) {
    const miss = row.error ? `ERROR ${row.error}` : row.missing.join(' ');
    console.log(`${row.route.padEnd(13)} ${String(row.hit).padStart(3)}/${String(row.total).padEnd(3)} ${miss}`);
  }

  const pct = total === 0 ? 0 : (100 * hit) / total;
  console.log(`COVERAGE ${hit} ${total} ${pct.toFixed(2)}`);
}

main().catch((error) => {
  console.error('metric failed:', error);
  process.exitCode = 1;
});
