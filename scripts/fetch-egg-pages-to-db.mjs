/**
 * egg_page.md에 나열된 fit.rfenms.com 전체 페이지를 수집해 SQLite DB(data/egg_pages.db)로 저장
 * - Firecrawl이 rfenms.com 방화벽에 차단되어(ERR_TUNNEL_CONNECTION_FAILED) 로컬 직접 fetch로 수집
 * - 각 페이지: HTTP 상태, 최종 URL, 타이틀, HTML 원문, 본문 텍스트, CSS/JS 자산 목록 저장
 *
 * 실행: node scripts/fetch-egg-pages-to-db.mjs
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const BASE = 'https://fit.rfenms.com';
const DB_PATH = path.join(ROOT, 'data', 'egg_pages.db');
const DELAY_MS = 150;

/** egg_page.md 파싱: | # | 메뉴명 | URL | 표 + '## 기타 페이지' 불릿 */
function parseEggPageMd() {
  const md = readFileSync(path.join(ROOT, 'egg_page.md'), 'utf8');
  const categories = [];
  const menu = { ord: 1, name: '메뉴', disabled: false, pages: [] };
  const etc = { ord: 2, name: '기타 페이지', disabled: false, pages: [] };

  let inEtc = false;
  for (const line of md.split('\n')) {
    if (/^##\s+기타 페이지/.test(line)) { inEtc = true; continue; }
    if (/^##\s+/.test(line)) { inEtc = false; continue; }

    if (!inEtc && line.startsWith('|')) {
      if (/^\|[\s-|]+\|$/.test(line) || line.includes('메뉴명')) continue;
      const cells = line.split('|').slice(1, -1).map((s) => s.trim());
      if (cells.length < 3) continue;
      menu.pages.push({
        menu: cells[1],
        file: cells[2].replace(BASE + '/', ''),
        url: cells[2],
      });
      continue;
    }

    if (inEtc) {
      const b = line.match(/^-\s+(.+?):\s+(https?:\/\/\S+)\s*$/);
      if (b) etc.pages.push({ menu: b[1].trim(), file: b[2].replace(BASE + '/', ''), url: b[2] });
    }
  }

  categories.push(menu);
  if (etc.pages.length) categories.push(etc);
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
  const categories = parseEggPageMd();

  // 메뉴 출처인 include 파일도 함께 수집
  categories.push({
    ord: 3, name: 'include (내부 파일)', disabled: false,
    pages: [
      { menu: '좌측 메뉴', file: 'include/leftnav.html', url: `${BASE}/include/leftnav.html` },
      { menu: '상단바', file: 'include/top.html', url: `${BASE}/include/top.html` },
      { menu: '대시보드 위젯', file: 'include/widget.html', url: `${BASE}/include/widget.html` },
      { menu: '푸터', file: 'include/footer.html', url: `${BASE}/include/footer.html` },
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
    (category_id, menu_name, page_file, url, http_status, final_url, title, content_length, styles, scripts, text_content, html)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

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
          catId, p.menu, p.file, p.url,
          status, finalUrl, meta.title, html.length,
          JSON.stringify(meta.styles), JSON.stringify(meta.scripts), meta.text, html,
        );
        if (status === 200) ok++;
        else failures.push(`${p.file}: HTTP ${status}`);
        console.log(`[${done}/${total}] ${status} ${p.file} (${html.length}B) ${meta.title}`);
      } catch (err) {
        insPage.run(catId, p.menu, p.file, p.url, 0, '', '', 0, '[]', '[]', '', '');
        failures.push(`${p.file}: ${err.message}`);
        console.log(`[${done}/${total}] ERR ${p.file} - ${err.message}`);
      }
      await sleep(DELAY_MS);
    }
  }

  const summary = {
    db: DB_PATH,
    site: BASE,
    categories: categories.length,
    pagesTotal: total,
    pagesOk: ok,
    failures,
    fetchedAt: new Date().toISOString(),
  };
  writeFileSync(path.join(ROOT, 'data', 'egg-fetch-summary.json'), JSON.stringify(summary, null, 2));
  console.log(`\n완료: ${ok}/${total} 페이지 수집 → ${DB_PATH}`);
  if (failures.length) console.log('실패/비정상:', failures.join(' | '));
  db.close();
}

main();
