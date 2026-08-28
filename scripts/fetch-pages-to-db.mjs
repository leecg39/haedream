/**
 * page.md에 나열된 watt.rfenms.com 전체 페이지를 수집해 SQLite DB(data/pages.db)로 저장
 * - 카테고리/메뉴 구조는 page.md의 마크다운 표를 파싱해 구성
 * - 각 페이지: HTTP 상태, 최종 URL, 타이틀, HTML 원문, 본문 텍스트, CSS/JS 자산 목록 저장
 *
 * 실행: node scripts/fetch-pages-to-db.mjs
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const BASE = 'https://watt.rfenms.com';
const DB_PATH = path.join(ROOT, 'data', 'pages.db');
const DELAY_MS = 150;

/** page.md 파싱: ## N. 카테고리 섹션 + 표 행(메뉴명|페이지|URL|타이틀) */
function parsePageMd() {
  const md = readFileSync(path.join(ROOT, 'page.md'), 'utf8');
  const categories = [];
  let current = null;

  for (const line of md.split('\n')) {
    const h = line.match(/^##\s+(\d+)\.\s+(.+)$/);
    if (h) {
      const raw = h[2].trim();
      current = {
        ord: Number(h[1]),
        name: raw.replace(/\s*\(비활성 메뉴\)\s*$/, '').trim(),
        disabled: /\(비활성 메뉴\)/.test(raw),
        pages: [],
      };
      categories.push(current);
      continue;
    }
    if (!current || !line.startsWith('|')) continue;
    if (/^\|[\s-|]+\|$/.test(line) || line.includes('메뉴명')) continue;

    const cells = line.split('|').slice(1, -1).map((s) => s.trim());
    if (cells.length < 4) continue;

    current.pages.push({
      menu: cells[0].replace(/\s*\(비활성 링크\)\s*$/, '').trim(),
      menuDisabled: /\(비활성 링크\)/.test(cells[0]),
      file: cells[1],
      url: cells[2],
      expectedTitle: cells[3],
    });
  }
  return categories;
}

function extractMeta(html) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1].trim() ?? '';
  const styles = [...html.matchAll(/<link[^>]*>/gi)]
    .map((m) => m[0].match(/href=["']([^"']+)["']/i)?.[1])
    .filter((h) => h && /\.css(\?|$)/i.test(h));
  const scripts = [...html.matchAll(/<script[^>]*\ssrc=["']([^"']+)["'][^>]*>/gi)].map((m) => m[1]);
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
  return { title, styles, scripts, text };
}

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'ko-KR,ko;q=0.9',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(20000),
  });
  const html = await res.text();
  return { status: res.status, finalUrl: res.url, html };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const categories = parsePageMd();

  // page.md 본문 표 외에 '참고' 섹션에 명시된 로그인 페이지와 내부 include 파일 추가
  categories.push({
    ord: 12, name: '인증', disabled: false,
    pages: [{ menu: '로그인', menuDisabled: false, file: 'login.html', url: `${BASE}/login.html`, expectedTitle: '한국미래에너지' }],
  });
  categories.push({
    ord: 13, name: 'include (내부 파일)', disabled: false,
    pages: [
      { menu: '좌측 메뉴', menuDisabled: false, file: 'include/leftnav.html', url: `${BASE}/include/leftnav.html`, expectedTitle: '' },
      { menu: '상단바', menuDisabled: false, file: 'include/top.html', url: `${BASE}/include/top.html`, expectedTitle: '' },
      { menu: '대시보드 위젯', menuDisabled: false, file: 'include/widget.html', url: `${BASE}/include/widget.html`, expectedTitle: '' },
    ],
  });

  mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec(`
    DROP TABLE IF EXISTS pages;
    DROP TABLE IF EXISTS categories;
    CREATE TABLE categories (
      id INTEGER PRIMARY KEY,
      ord INTEGER NOT NULL,
      name TEXT NOT NULL,
      disabled INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE pages (
      id INTEGER PRIMARY KEY,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      menu_name TEXT NOT NULL,
      page_file TEXT NOT NULL,
      url TEXT NOT NULL,
      menu_disabled INTEGER NOT NULL DEFAULT 0,
      expected_title TEXT,
      http_status INTEGER,
      final_url TEXT,
      title TEXT,
      content_length INTEGER,
      styles TEXT,
      scripts TEXT,
      text_content TEXT,
      html TEXT,
      fetched_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
    CREATE INDEX idx_pages_category ON pages(category_id);
    CREATE INDEX idx_pages_file ON pages(page_file);
  `);

  const insCat = db.prepare('INSERT INTO categories (ord, name, disabled) VALUES (?, ?, ?)');
  const insPage = db.prepare(`INSERT INTO pages
    (category_id, menu_name, page_file, url, menu_disabled, expected_title, http_status, final_url, title, content_length, styles, scripts, text_content, html)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  const total = categories.reduce((n, c) => n + c.pages.length, 0);
  let done = 0, ok = 0;
  const failures = [];

  for (const cat of categories) {
    const catId = Number(insCat.run(cat.ord, cat.name, cat.disabled ? 1 : 0).lastInsertRowid);
    for (const p of cat.pages) {
      done++;
      try {
        const { status, finalUrl, html } = await fetchPage(p.url);
        const meta = extractMeta(html);
        insPage.run(
          catId, p.menu, p.file, p.url, p.menuDisabled ? 1 : 0, p.expectedTitle,
          status, finalUrl, meta.title, html.length,
          JSON.stringify(meta.styles), JSON.stringify(meta.scripts), meta.text, html,
        );
        if (status === 200) ok++;
        else failures.push(`${p.file}: HTTP ${status}`);
        console.log(`[${done}/${total}] ${status} ${p.file} (${html.length}B) ${meta.title}`);
      } catch (err) {
        insPage.run(catId, p.menu, p.file, p.url, p.menuDisabled ? 1 : 0, p.expectedTitle, 0, '', '', 0, '[]', '[]', '', '');
        failures.push(`${p.file}: ${err.message}`);
        console.log(`[${done}/${total}] ERR ${p.file} - ${err.message}`);
      }
      await sleep(DELAY_MS);
    }
  }

  const summary = {
    db: DB_PATH,
    categories: categories.length,
    pagesTotal: total,
    pagesOk: ok,
    failures,
    fetchedAt: new Date().toISOString(),
  };
  writeFileSync(path.join(ROOT, 'data', 'fetch-summary.json'), JSON.stringify(summary, null, 2));
  console.log(`\n완료: ${ok}/${total} 페이지 수집 → ${DB_PATH}`);
  if (failures.length) console.log('실패/비정상:', failures.join(' | '));
  db.close();
}

main();
