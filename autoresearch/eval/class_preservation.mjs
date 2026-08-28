/**
 * GUARD — 원본 클래스 보존율 회귀 검사
 *
 * 고정 인프라. 실험 에이전트는 이 파일을 수정하지 않는다.
 *
 * 원본 <main> 안의 클래스 집합이 클론 렌더 결과에 모두 존재하는지 검사한다.
 * 인터랙션을 추가하다 기존 마크업을 깨뜨리는 회귀를 잡는 것이 목적이다.
 *
 * DEAD_CLASSES 는 원본에서 HTML 주석 안에 있거나(peakPointE/peakPointBoxE)
 * .disable 로 영구 숨김이며 CSS 규칙이 0개인(factoring) 죽은 마크업이라 제외한다.
 *
 * 실행: node autoresearch/eval/class_preservation.mjs [baseUrl]
 * exit 0 = pass(100%), exit 1 = 회귀 발생
 */
import { readFileSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const PAGES_DIR = 'docs/research/fit.rfenms.com/pages';

const ROUTES = {
  peak: 'peak', peakHis: 'peak-his', stat: 'stat', firm: 'firm', research: 'research',
  peakPanel: 'peak-panel', peakSet: 'peak-set', powerUsage: 'power-usage',
  peakUsage: 'peak-usage', controlHis: 'control-his', acp: 'acp',
  ratePlan: 'rate-plan', reduce: 'reduce', report: 'report',
};

/** 원본의 죽은 마크업 — 주석 안 또는 영구 숨김 + CSS 규칙 0개 */
const DEAD_CLASSES = new Set(['disable', 'peakPointE', 'peakPointBoxE', 'factoring']);

/** 상태 게이트로 조건부 렌더되는 클래스는 소스에서 보완 확인한다. */
const SOURCE_FALLBACK = { stat: 'src/components/fit/stat/StatDashboard.tsx' };

function mainClasses(html) {
  const m = /<main[^>]*>([\s\S]*?)<\/main>/.exec(html);
  const body = m ? m[1] : html;
  const set = new Set();

  for (const c of body.matchAll(/class="([^"]+)"/g)) {
    for (const token of c[1].split(/\s+/)) if (token) set.add(token);
  }

  return set;
}

function sourceTokens(path) {
  const set = new Set();

  for (const m of readFileSync(path, 'utf8').matchAll(/"([a-zA-Z][\w -]*)"/g)) {
    for (const token of m[1].split(/\s+/)) if (token) set.add(token);
  }

  return set;
}

async function main() {
  let failed = 0;
  let totalMissing = 0;

  for (const [pageKey, route] of Object.entries(ROUTES)) {
    const original = mainClasses(readFileSync(`${PAGES_DIR}/${pageKey}.html`, 'utf8'));
    let clone;

    try {
      const res = await fetch(`${BASE}/fit/${route}`, { signal: AbortSignal.timeout(60_000) });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      clone = mainClasses(await res.text());
    } catch (error) {
      console.log(`FAIL ${route}: fetch 실패 ${error}`);
      failed += 1;
      continue;
    }

    if (SOURCE_FALLBACK[route]) {
      for (const token of sourceTokens(SOURCE_FALLBACK[route])) clone.add(token);
    }

    const missing = [...original].filter((c) => !clone.has(c) && !DEAD_CLASSES.has(c));

    if (missing.length > 0) {
      console.log(`FAIL ${route}: 누락 ${missing.length}개 — ${missing.join(' ')}`);
      failed += 1;
      totalMissing += missing.length;
    }
  }

  if (failed > 0) {
    console.log(`GUARD FAIL — ${failed}개 페이지, 클래스 ${totalMissing}개 누락`);
    process.exitCode = 1;
    return;
  }

  console.log('GUARD PASS — 클래스 보존 100%');
}

main().catch((error) => {
  console.error('guard failed:', error);
  process.exitCode = 1;
});
