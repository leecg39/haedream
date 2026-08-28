"use client";

import { CONTROL_HIS_FACILITIES, CONTROL_HIS_LAST_DAY, CONTROL_HIS_MONTH, CONTROL_HIS_PAGE_SIZE, CONTROL_HIS_RECORDS, CONTROL_HIS_ROWS, buildSummary as buildControlSummary } from "@/lib/fit-mocks/control-his";
import { LIB_STYLES, PageStyles } from "@/components/fit/shared/PageStyles";
import { Pagination } from "@/components/fit/shared/Pagination";
import { totalPages } from "@/components/fit/stat/statUtils";
import { useState } from "react";

function ControlHeatChart({ facility }: { readonly facility: number }) {
  const records = facility === 0 ? CONTROL_HIS_RECORDS : CONTROL_HIS_RECORDS.filter((row) => row.cid === facility);
  const byCell = new Map(records.map((row) => [`${row.day}-${row.hour}`, row.goldManwon]));
  const cells = Array.from({ length: CONTROL_HIS_LAST_DAY * 24 }, (_, index) => {
    const day = Math.floor(index / 24) + 1;
    const hour = index % 24;
    return { day, hour, value: byCell.get(`${day}-${hour}`) ?? 0 };
  });
  return (
    <svg viewBox={`0 0 960 ${CONTROL_HIS_LAST_DAY * 13}`} width="100%" height="100%" preserveAspectRatio="none" role="img" aria-label="일자별 제어 히트맵">
      {cells.map((cell) => (
        <rect
          key={`${cell.day}-${cell.hour}`}
          x={cell.hour * 40 + 1}
          y={(cell.day - 1) * 13 + 1}
          width="37"
          height="10"
          rx="2"
          fill={cell.value ? `rgba(0,255,255,${Math.min(0.35 + cell.value / 4, 1)})` : "rgba(255,255,255,.04)"}
        />
      ))}
    </svg>
  );
}

export function ControlHistory() {
  const [facility, setFacility] = useState(0);
  const [page, setPage] = useState(1);
  const filteredRows = CONTROL_HIS_ROWS.filter((row) => facility === 0 || row.cid === facility);
  const filteredRecords = CONTROL_HIS_RECORDS.filter((row) => facility === 0 || row.cid === facility);
  const summary = buildControlSummary(filteredRecords);
  const pages = totalPages(filteredRows.length, CONTROL_HIS_PAGE_SIZE);
  const safePage = Math.min(page, pages);
  const rows = filteredRows.slice((safePage - 1) * CONTROL_HIS_PAGE_SIZE, safePage * CONTROL_HIS_PAGE_SIZE);
  const start = filteredRows.length ? (safePage - 1) * CONTROL_HIS_PAGE_SIZE + 1 : 0;
  const end = Math.min(safePage * CONTROL_HIS_PAGE_SIZE, filteredRows.length);

  return (
    <>
      <PageStyles files={[...LIB_STYLES, "/fit/assets/css/controlHis.css"]} />
      <main className="contents" id="contentsArea">
        <h1 className="deskTitle">피크제어이력</h1>
        <div className="chart1" id="chart1"><ControlHeatChart facility={facility} /></div>
        <div className="deskToolWrap">
          <div className="deskPages"><span className="deskLabel">날짜</span><div className="datePicker"><div className="tui-datepicker-input tui-datetime-input tui-has-focus"><input type="month" className="inputDate" id="mDate" value={CONTROL_HIS_MONTH} readOnly /><i className="bi bi-calendar" /></div></div></div>
          <div className="deskLimit"><span className="deskLabel">제어설비</span><select className="deskSelect" id="facList" value={facility} onChange={(event) => { setFacility(Number(event.target.value)); setPage(1); }}><option value="0">설비 선택</option>{CONTROL_HIS_FACILITIES.map((item) => <option value={item.cid} key={item.cid}>{item.controlName}</option>)}</select></div>
          <div className="deskTool" id="deskTool"><button className="deskAct act" type="button" onClick={() => window.print()}><i className="bi bi-file-earmark-excel-fill excel" />엑셀로 다운</button><button className="deskAct act" type="button" onClick={() => window.print()}><i className="bi bi-printer" />프린트</button></div>
        </div>
        <div className="deskArea">
          <div className="tableCaption"><div><span className="captionTitle">총 제어시간</span><span className="splitUnit">:</span><span className="captionMark" id="energyTime">{summary.energyTime}</span></div><span className="splitUnit">/</span><div><span className="captionTitle">총 절감액</span><span className="splitUnit">:</span><span className="captionMark" id="energyGold">{summary.energyGold}</span></div><span className="splitUnit">/</span><div><span className="captionTitle">최대 절감액</span><span className="splitUnit">:</span><span className="captionMark" id="energyGoldMax">{summary.energyGoldMax}</span></div></div>
          <div className="sheetScroll"><table className="desk" id="deskTable"><thead><tr id="deskSort"><th>CID</th><th>제어설비</th><th>제어시작</th><th>제어종료</th><th>예측전력</th><th>목표전력</th><th>제어시간</th><th>절감 (<span className="sheetEm">만원</span>)</th></tr></thead><tbody id="deskList">{rows.map((row) => <tr key={row.id}><td>{row.cid}</td><td>{row.facilityName}</td><td>{row.startText}</td><td>{row.endText}</td><td>{row.predictText}</td><td>{row.limitText}</td><td>{row.durationText}</td><td>{row.goldText}</td></tr>)}</tbody></table></div>
        </div>
        <div className="deskStat"><div className="deskLimit"><span className="deskLabel" id="deskStat">{start} - {end} / {filteredRows.length}</span></div><Pagination page={safePage} pages={pages} onChange={setPage} /></div>
      </main>
    </>
  );
}
