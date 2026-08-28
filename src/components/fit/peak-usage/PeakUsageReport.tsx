"use client";

import { LIB_STYLES, PageStyles } from "@/components/fit/shared/PageStyles";
import { PEAK_USAGE_CONTRACT_KW, PEAK_USAGE_LATEST_MONTH, PEAK_USAGE_MIN_MONTH, buildPeakUsageMonth, formatKw } from "@/lib/fit-mocks/peak-usage";
import { useMemo, useState } from "react";

function PeakUsageChart({ values }: { readonly values: readonly number[] }) {
  const width = 960;
  const height = 250;
  const max = Math.max(...values, PEAK_USAGE_CONTRACT_KW);
  const points = values.map((value, index) => `${(index / Math.max(values.length - 1, 1)) * width},${height - (value / max) * (height - 20)}`).join(" ");
  const contractY = height - (PEAK_USAGE_CONTRACT_KW / max) * (height - 20);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" preserveAspectRatio="none" role="img" aria-label="15분 최대수요 추이">
      {[0.25, 0.5, 0.75].map((ratio) => <line key={ratio} x1="0" x2={width} y1={height * ratio} y2={height * ratio} stroke="rgba(255,255,255,.1)" />)}
      <line x1="0" x2={width} y1={contractY} y2={contractY} stroke="#ff005b" strokeDasharray="7 5" />
      <polyline points={points} fill="none" stroke="#00ffff" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function PeakUsageReport() {
  const [draftMonth, setDraftMonth] = useState(PEAK_USAGE_LATEST_MONTH);
  const [month, setMonth] = useState(PEAK_USAGE_LATEST_MONTH);
  const data = useMemo(() => buildPeakUsageMonth(month), [month]);
  const chartValues = data.days[0]?.slots.map((slot) => slot.usageKw) ?? [];

  return (
    <>
      <PageStyles files={[...LIB_STYLES, "/fit/assets/css/peakUsage.css"]} />
      <main className="contents" id="contentsArea">
        <h1 className="deskTitle" data-lang="report004">피크 15분 전력보고서</h1>
        <div className="chart1" id="chart1"><PeakUsageChart values={chartValues} /></div>
        <div className="deskTool">
          <span className="deskLabel">날짜</span>
          <div className="datePicker"><div className="tui-datepicker-input tui-datetime-input tui-has-focus">
            <input type="month" className="inputDate" id="inputMonth" min={PEAK_USAGE_MIN_MONTH} max={PEAK_USAGE_LATEST_MONTH} value={draftMonth} onChange={(event) => setDraftMonth(event.target.value)} />
            <i className="bi bi-calendar" />
          </div><div id="wrapper" /></div>
          <button className="act actIcon" id="act" type="button" onClick={() => setMonth(draftMonth)}><i className="bi bi-search" /> 조회</button>
          <button className="act actIcon" id="actExcelSave" type="button" onClick={() => window.print()}><i className="bi bi-file-earmark-excel-fill excel" /> 엑셀로 저장</button>
        </div>
        <div className="sheetArea">
          <table className="sheet" id="itemTable">
            <thead className="sticky"><tr><th rowSpan={2}>일자</th><th rowSpan={2}>분단위</th><th colSpan={24}>최대수요 ( <span className="sheetEm">kW</span> )</th></tr>
              <tr>{Array.from({ length: 24 }, (_, index) => <th key={index}>{index}</th>)}</tr>
            </thead>
            <tbody id="itemList">
              {data.days.flatMap((day) => day.quarters.map((quarter, quarterIndex) => (
                <tr key={`${day.date}-${quarter.quarter}`}>
                  {quarterIndex === 0 ? <th rowSpan={4}>{day.date}</th> : null}
                  <td>{quarter.label}</td>
                  {quarter.values.map((value, hour) => (
                    <td className={`${value === day.maxKw ? "wattMax " : ""}${quarter.kepcoHours.includes(hour) ? "underline" : ""}`.trim()} key={hour}>{formatKw(value)}</td>
                  ))}
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
