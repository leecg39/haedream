"use client";

import { useMemo, useState } from "react";

export interface AbcToolAct {
  readonly act: string;
  readonly icon: string;
  readonly label: string;
}

export interface AbcColumn {
  readonly label: string;
  /**
   * 원본 `data-sort` 값. 있으면 `<th class="sort">` 로 렌더되어 클릭 정렬이 가능하다.
   * 없으면 원본과 동일하게 정렬 불가능한 일반 헤더로 렌더된다.
   */
  readonly sortKey?: string;
  /**
   * 원본 `data-tip` 값. 있으면 th 에 "tip" 클래스와 `data-tip` 속성이 붙는다.
   * (gateNode/gateway/device 원본에 있음. 미러 CSS 에는 시각 스타일 규칙이 없어
   * 툴팁을 지어내지 않고 DOM 속성만 원본대로 재현한다.)
   */
  readonly tip?: string;
}

export interface AbcDeskConfig {
  readonly title: string;
  readonly toolbar?: readonly AbcToolAct[];
  readonly columns: readonly AbcColumn[];
  readonly rows: readonly (readonly string[])[];
  readonly pageSize?: number;
  /** 상단 건수 표시 여부. 원본 user.html 은 주석처리(false), 나머지는 노출(true). */
  readonly showTopCount?: boolean;
  /** deskTool 에 붙는 추가 클래스. 원본 sequence.html 은 "deskTool onlypci" 를 쓴다. */
  readonly toolClassName?: string;
  /**
   * sheetArea 에 붙는 추가 클래스. 원본 sequence.html 은 "sheetArea setSub seq" 를 쓴다.
   * ".sheetArea.seq .deskTool.onlypci" 규칙이 이 클래스가 있어야만 적용되므로
   * toolClassName="onlypci" 와 함께 세트로 지정해야 3열 그리드 툴바가 나온다.
   */
  readonly areaClassName?: string;
  /**
   * device.html 전용 "전체 보기" 스위치(`.dayCk`). 원본에서 항상 `.disable`(영구 숨김,
   * JS 조건부 노출)로 시작하므로 클론도 동일하게 숨김 상태로만 재현한다.
   */
  readonly showDayCk?: boolean;
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

/** "1,196" 같은 천단위 콤마 숫자를 인식해 수치 비교, 아니면 로케일 문자열 비교. */
function compareCells(a: string, b: string): number {
  const na = Number(a.replace(/,/g, ""));
  const nb = Number(b.replace(/,/g, ""));
  if (a.trim() !== "" && b.trim() !== "" && !Number.isNaN(na) && !Number.isNaN(nb)) {
    return na - nb;
  }
  return a.localeCompare(b, "ko");
}

/**
 * 원본 watt 관리자 CRUD 페이지 공통 골격.
 * 구조: deskTitle + sheetArea.setSub > (deskStat[toolbar/search] + deskArea>table + deskStat[count/pagination]).
 * 클래스명은 원본(deskLib.css) 그대로 — deskHead/deskFoot 같은 지어낸 이름을 쓰지 않는다.
 *
 * 정렬: 원본 deskSort 는 data-sort 가 있는 th 에만 클릭 핸들러를 붙이고,
 * 같은 컬럼 재클릭 시 asc↔desc 토글, 다른 컬럼 클릭 시 이전 컬럼의 asc/desc 클래스를 뗀다
 * (user.js 의 vio._sheet.sortTag/sortAsc 패턴). 여기서는 컬럼 index 기준으로 동일하게 재현한다.
 */
export function AbcDeskTable({ config }: { readonly config: AbcDeskConfig }) {
  const { title, columns, rows } = config;
  const toolbar = config.toolbar ?? DEFAULT_TOOLBAR;
  const pageSize = config.pageSize ?? 10;
  const showTopCount = config.showTopCount ?? true;
  const toolClass = config.toolClassName ? `deskTool ${config.toolClassName}` : "deskTool";
  const areaClass = config.areaClassName ? `sheetArea ${config.areaClassName}` : "sheetArea setSub";
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [sortIndex, setSortIndex] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return rows;
    return rows.filter((r) => r.some((cell) => cell.includes(q)));
  }, [rows, query]);

  const sorted = useMemo(() => {
    if (sortIndex === null) return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const result = compareCells(a[sortIndex] ?? "", b[sortIndex] ?? "");
      return sortAsc ? result : -result;
    });
    return copy;
  }, [filtered, sortIndex, sortAsc]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pages);
  const start = (safePage - 1) * pageSize;
  const visible = sorted.slice(start, start + pageSize);
  const countLabel = `${sorted.length === 0 ? 0 : start + 1} - ${Math.min(start + pageSize, sorted.length)} / ${sorted.length}`;

  const changePage = (p: number) => setPage(Math.min(Math.max(1, p), pages));

  const clickSort = (index: number) => {
    if (sortIndex === index) {
      setSortAsc((v) => !v);
    } else {
      setSortIndex(index);
      setSortAsc(true);
    }
    setPage(1);
  };

  return (
    <main className="contents" id="contentsArea">
      <h1 className="deskTitle">{title}</h1>
      <div className={areaClass}>
        <div className="deskStat">
          {showTopCount ? (
            <div className="deskLimit">
              <span className="deskLabel" id="deskLimit">{countLabel}</span>
            </div>
          ) : null}
          <div className={toolClass} id="deskTool">
            {toolbar.map((t) => (
              <span className="deskAct act" data-act={t.act} role="button" key={t.act}>
                <i className={t.icon} />
                {t.label}
              </span>
            ))}
          </div>
          {config.showDayCk ? (
            <div className="dayCk disable" id="dayCk">
              <label>
                <span>전체 보기</span>
                <input type="checkbox" id="isAll" role="switch" />
              </label>
            </div>
          ) : null}
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
                {columns.map((col, index) => {
                  if (!col.sortKey) {
                    return (
                      <th className={col.tip ? "tip" : undefined} data-tip={col.tip} key={col.label}>
                        {col.label}
                      </th>
                    );
                  }
                  const active = sortIndex === index;
                  const base = active ? `sort ${sortAsc ? "asc" : "desc"}` : "sort";
                  const cls = col.tip ? `${base} tip` : base;
                  return (
                    <th
                      className={cls}
                      data-sort={col.sortKey}
                      data-tip={col.tip}
                      key={col.label}
                      role="button"
                      onClick={() => clickSort(index)}
                    >
                      {col.label}
                    </th>
                  );
                })}
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
