"use client";

import Link from "next/link";
import { FIRM_CONTRACT_LABELS, FIRM_PAGE_LIMIT, FIRM_ROWS, FIRM_SERVICE_TYPE_LABELS, type FirmRow, type FirmSortKey } from "@/lib/fit-mocks/firm";
import { LIB_STYLES, PageStyles } from "@/components/fit/shared/PageStyles";
import { Pagination } from "@/components/fit/shared/Pagination";
import { echoNumber } from "@/components/fit/reduce/format";
import { totalPages } from "@/components/fit/stat/statUtils";
import { useMemo, useState } from "react";

const FIRM_SORT_OPTIONS: readonly { readonly key: FirmSortKey; readonly label: string }[] = [
  { key: "fid", label: "ID" },
  { key: "firmName", label: "이름" },
  { key: "contract", label: "전력타입" },
  { key: "kepcoNo", label: "한전고객번호" },
  { key: "registTime", label: "메모" },
];

export function FirmManager() {
  const [serviceType, setServiceType] = useState(0);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<FirmSortKey>("fid");
  const [descending, setDescending] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<FirmRow | null>(null);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ko");
    const rows = FIRM_ROWS.filter((row) => {
      const serviceMatches = serviceType === 0 || row.serviceType === serviceType;
      const queryMatches =
        normalized.length === 0 ||
        row.firmName.toLocaleLowerCase("ko").includes(normalized) ||
        String(row.fid).includes(normalized) ||
        String(row.kepcoNo).includes(normalized);
      return serviceMatches && queryMatches;
    });
    return [...rows].sort((a, b) => {
      const left = a[sortKey];
      const right = b[sortKey];
      const result = typeof left === "number" && typeof right === "number"
        ? left - right
        : String(left).localeCompare(String(right), "ko");
      return descending ? -result : result;
    });
  }, [descending, query, serviceType, sortKey]);

  const pages = totalPages(filtered.length, FIRM_PAGE_LIMIT);
  const safePage = Math.min(page, pages);
  const visible = filtered.slice((safePage - 1) * FIRM_PAGE_LIMIT, safePage * FIRM_PAGE_LIMIT);
  const first = filtered.length === 0 ? 0 : (safePage - 1) * FIRM_PAGE_LIMIT + 1;
  const last = Math.min(safePage * FIRM_PAGE_LIMIT, filtered.length);

  const changeSort = (key: FirmSortKey) => {
    if (sortKey === key) setDescending((value) => !value);
    else {
      setSortKey(key);
      setDescending(false);
    }
  };

  return (
    <>
      <PageStyles files={[...LIB_STYLES, "/fit/assets/css/deskLib.css"]} />
      <main className="contents" id="contentsArea">
        <h1 className="deskTitle">업체관리</h1>
        <div className="sheetArea">
          <div className="deskStat">
            <div className="deskLimit"><span className="deskLabel" id="deskLimit">{first} - {last} / {filtered.length}</span></div>
            <div className="deskTool" id="deskTool">
              <button className="deskAct act" type="button" onClick={() => setSelected(FIRM_ROWS[0])}>추가</button>
              <button className="deskAct act" type="button" onClick={() => window.print()}>프린트</button>
              <Link href="/fit/rate-plan" className="deskAct act" id="chargeLink">요금표</Link>
              <Link href="/fit/research" className="deskAct act" id="researchLink">한전수집</Link>
            </div>
            <div className="deskPages">
              <select
                className="eSelect serviceType"
                id="serviceType"
                value={serviceType}
                onChange={(event) => { setServiceType(Number(event.target.value)); setPage(1); }}
              >
                <option value="0">서비스상태 선택</option>
                {[1, 2, 3, 11, 12, 13, 21, 22, 23].map((value) => (
                  <option value={value} key={value}>{FIRM_SERVICE_TYPE_LABELS[value]}</option>
                ))}
              </select>
              <span className="deskSearch">
                <input
                  className="deskInput"
                  id="deskInput"
                  maxLength={16}
                  aria-label="업체 검색"
                  value={query}
                  onChange={(event) => { setQuery(event.target.value); setPage(1); }}
                />
                <i className="icon iconSearch" />
              </span>
            </div>
          </div>
          <div className="deskArea">
            <table className="desk" id="deskTable">
              <thead>
                <tr id="deskSort">
                  {FIRM_SORT_OPTIONS.map((option) => (
                    <th
                      className={sortKey === option.key ? (descending ? "sort desc" : "sort asc") : "sort"}
                      data-sort={option.key}
                      key={option.key}
                      onClick={() => changeSort(option.key)}
                    >
                      {option.label}
                    </th>
                  ))}
                  <th>EOI</th><th>PCT</th><th>최근전력</th><th>목표전력</th>
                  <th>운전모드</th><th>제어방식</th><th>활성</th><th>서비스</th>
                </tr>
              </thead>
              <tbody id="deskList">
                {visible.map((row) => (
                  <tr key={row.fid} onClick={() => setSelected(row)}>
                    <td>{row.fid}</td>
                    <td>{row.firmName}</td>
                    <td title={FIRM_CONTRACT_LABELS[row.contract]}>{FIRM_CONTRACT_LABELS[row.contract] ?? row.contract}</td>
                    <td>{row.kepcoNo || "-"}</td>
                    <td>{row.eoiTime || "-"}</td>
                    <td>{row.pct_ratio}</td>
                    <td>{echoNumber(row.peakLast)}</td>
                    <td>{echoNumber(row.powerLimit)}</td>
                    <td>{row.peakRunMode ? "자동" : "수동"}</td>
                    <td>{row.peakControlMode ? "순차" : "우선"}</td>
                    <td>{row.isDisable ? "비활성" : "활성"}</td>
                    <td>{FIRM_SERVICE_TYPE_LABELS[row.serviceType]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="deskStat">
            <div className="deskLimit"><span className="deskLabel" id="deskStat">{first} - {last} / {filtered.length}</span></div>
            <Pagination page={safePage} pages={pages} onChange={setPage} />
          </div>
        </div>

        {selected ? (
          <div className="modal" role="dialog" aria-modal="true" aria-label="업체 상세">
            <div className="modalBox" style={{ width: "min(720px, calc(100vw - 40px))" }}>
              <button type="button" className="modalClose" aria-label="닫기" onClick={() => setSelected(null)} />
              <div className="modalContent" style={{ padding: 32 }}>
                <h2 className="editTitle">{selected.firmName}</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 }}>
                  <span>업체 ID</span><strong>{selected.fid}</strong>
                  <span>담당자</span><strong>{selected.manager}</strong>
                  <span>연락처</span><strong>{selected.phone}</strong>
                  <span>주소</span><strong>{selected.addressText}</strong>
                  <span>계약전력</span><strong>{echoNumber(selected.contractLimit)} kW</strong>
                  <span>메모</span><strong>{selected.memo || "-"}</strong>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </>
  );
}
