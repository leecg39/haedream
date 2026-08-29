"use client";

import { useMemo, useState } from "react";

export interface AbcToolAct {
  readonly act: string;
  readonly icon: string;
  readonly label: string;
}

export interface AbcDeskConfig {
  readonly title: string;
  readonly toolbar?: readonly AbcToolAct[];
  readonly columns: readonly string[];
  readonly rows: readonly (readonly string[])[];
  readonly pageSize?: number;
  /** 상단 건수 표시 여부. 원본 user.html 은 주석처리(false), 나머지는 노출(true). */
  readonly showTopCount?: boolean;
}

const DEFAULT_TOOLBAR: readonly AbcToolAct[] = [
  { act: "add", icon: "bi bi-plus-circle-fill", label: "추가" },
  { act: "excel", icon: "bi bi-file-earmark-excel-fill excel", label: "엑셀로 다운" },
  { act: "print", icon: "bi bi-printer", label: "프린트" },
];

function pageItems(current: number, max: number): number[] {
  const start = Math.max(1, current - 4);
  const end = Math.min(max, start + 8);
  const out: number[] = [];
  for (let i = start; i <= end; i += 1) out.push(i);
  return out;
}

/**
 * 원본 watt 관리자 CRUD 페이지 공통 골격.
 * 구조: deskTitle + sheetArea.setSub > (deskStat[toolbar/search] + deskArea>table + deskStat[count/pagination]).
 * 클래스명은 원본(deskLib.css) 그대로 — deskHead/deskFoot 같은 지어낸 이름을 쓰지 않는다.
 */
export function AbcDeskTable({ config }: { readonly config: AbcDeskConfig }) {
  const { title, columns, rows } = config;
  const toolbar = config.toolbar ?? DEFAULT_TOOLBAR;
  const pageSize = config.pageSize ?? 10;
  const showTopCount = config.showTopCount ?? true;
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return rows;
    return rows.filter((r) => r.some((cell) => cell.includes(q)));
  }, [rows, query]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages);
  const start = (safePage - 1) * pageSize;
  const visible = filtered.slice(start, start + pageSize);
  const countLabel = `${filtered.length === 0 ? 0 : start + 1} - ${Math.min(start + pageSize, filtered.length)} / ${filtered.length}`;

  const changePage = (p: number) => setPage(Math.min(Math.max(1, p), pages));

  return (
    <main className="contents" id="contentsArea">
      <h1 className="deskTitle">{title}</h1>
      <div className="sheetArea setSub">
        <div className="deskStat">
          {showTopCount ? (
            <div className="deskLimit">
              <span className="deskLabel" id="deskLimit">{countLabel}</span>
            </div>
          ) : null}
          <div className="deskTool" id="deskTool">
            {toolbar.map((t) => (
              <span className="deskAct act" data-act={t.act} role="button" key={t.act}>
                <i className={t.icon} />
                {t.label}
              </span>
            ))}
          </div>
          <div className="deskPages">
            <span className="deskSearch">
              <input
                className="deskInput"
                id="deskInput"
                maxLength={16}
                placeholder="검색"
                autoComplete="one-time-code"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              />
              <i className="icon iconSearch" />
            </span>
          </div>
        </div>

        <div className="deskArea">
          <table className="desk" id="deskTable">
            <thead>
              <tr id="deskSort">
                {columns.map((c) => <th key={c}>{c}</th>)}
              </tr>
            </thead>
            <tbody id="deskList">
              {visible.map((row, i) => (
                <tr key={start + i}>
                  {row.map((cell, j) => <td key={j}>{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="deskStat">
          <div className="deskLimit">
            <span className="deskLabel" id="deskStat">{countLabel}</span>
          </div>
          <div className="deskPages" id="deskPages">
            <span className="deskPage act" role="button" onClick={() => changePage(safePage - 1)}>prev</span>
            {pageItems(safePage, pages).map((p) => (
              <span
                className={p === safePage ? "deskPage act active" : "deskPage act"}
                role="button"
                key={p}
                onClick={() => changePage(p)}
              >
                {p}
              </span>
            ))}
            <span className="deskPage act" role="button" onClick={() => changePage(safePage + 1)}>next</span>
          </div>
        </div>
      </div>
    </main>
  );
}
