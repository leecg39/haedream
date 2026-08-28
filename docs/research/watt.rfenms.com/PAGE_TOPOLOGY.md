# PAGE_TOPOLOGY — watt.rfenms.com

- **Source:** https://watt.rfenms.com
- **Clone strategy:** Original multi-page HTML/CSS/JS hosted under Next.js `public/`, with `/api/*` demo mocks. React login at `/` mirrors `login.html`.
- **Auth:** Client checks `sessionStorage.accessToken`; missing token redirects to `login.html`. Demo login accepts any id/pw via `POST /api/tokens`.

## Global shell (all authenticated pages)

| Layer | Source | Notes |
|---|---|---|
| Left nav | `include/leftnav.html` | Loaded into `#leftnav`; accordion d1/d2; `data-nav` + localStorage flags |
| Top bar | `include/top.html` | Firm select, status, clock, settings, logout |
| Widget dashboard | `include/widget.html` | Used by `main.html` only |
| Body theme | `body.darkmode` | Navy gradient `#0e0d2c` → `#00319b` |
| Fonts | Pretendard Variable, Open Sans, bootstrap-icons | `/assets/fonts/` |

## Interaction model

- **Primary:** click-driven navigation (left menu accordion + page links)
- **Secondary:** date pickers, select2, chart libraries (ECharts / amCharts) after API fetch
- **Scroll:** normal document scroll inside `.contentsArea` (not Lenis)
- **Auth gate:** `base.js` redirects to login when no token

## Page map (41 + login)

See `src/lib/watt-demo.ts` `WATT_PAGES` and hub at `/hub`.

### Groups
1. 통합관제 — `stat.html`
2. 업체관리 — `firm.html`
3. 대시보드 — `main.html`, `wattMain.html`, `solar.html`
4. 컨설팅 — `consulting.html` (302 on origin; may be empty)
5. 피크관리 — 8 pages
6. 전력사용량 — 2 pages
7. 절감효과 — `enpi.html`
8. 계통감시 — 2 pages
9. 설비관리 — 11 pages
10. 비교분석 — 4 pages
11. 보고서 — 7 pages

## Known limitations

- Live chart/table data requires real backend; mocks return empty arrays.
- Visual QA against live site needs ego-browser login session.
- `consulting.html` returned HTTP 302 during scrape.
