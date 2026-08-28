"use client";

import { useMemo, useState, type CSSProperties } from "react";

import {
  getPeakHisSeries,
  PEAK_HIS_DATE_RANGE,
  PEAK_HIS_INITIAL_TIME,
  PEAK_TIME_OPTIONS,
  type PeakHisSeries,
} from "@/lib/fit-mocks/peak-his";

import { PeakLineChart } from "./PeakLineChart";

/**
 * 원본 peakHis 의 .peakChart 블록.
 * 마크업·클래스명·id 는 원본 그대로이며, tui-date-picker / tom-select / amCharts 대신
 * React state 와 인라인 SVG 로 동작을 근사한다.
 */

/** .datePicker 안에 투명 네이티브 날짜 입력을 겹치기 위한 스타일 (원본 CSS 미변경) */
const datePickerStyle: CSSProperties = { position: "relative" };
const nativeDateStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  opacity: 0,
  cursor: "pointer",
  border: 0,
  padding: 0,
  background: "transparent",
};
const errorStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
  color: "#ff8600",
};

type ChartState = { readonly series: PeakHisSeries | null; readonly error: string | null };

const loadSeries = (date: string): ChartState => {
  try {
    return { series: getPeakHisSeries(date), error: null };
  } catch {
    return { series: null, error: "피크 데이터를 불러오지 못했습니다." };
  }
};

export function PeakHisPanel() {
  const [draftDate, setDraftDate] = useState<string>(PEAK_HIS_DATE_RANGE.initial);
  const [draftTime, setDraftTime] = useState<string>(PEAK_HIS_INITIAL_TIME);
  const [appliedDate, setAppliedDate] = useState<string>(PEAK_HIS_DATE_RANGE.initial);

  const { series, error } = useMemo(() => loadSeries(appliedDate), [appliedDate]);

  const search = () => setAppliedDate(draftDate);

  return (
    <div className="peakChart">
      <div className="deskTool">
        <div className="mTBlock">
          <span className="deskLabel">기록일</span>
          <div className="datePicker" style={datePickerStyle}>
            <div className="tui-datepicker-input tui-datetime-input tui-has-focus">
              <input
                type="text"
                className="inputDate"
                id="sDate"
                aria-label="Date-Time"
                readOnly
                value={draftDate}
              />
              <i className="bi bi-calendar"></i>
            </div>
            <div id="wrapper">
              <input
                type="date"
                aria-label="기록일 선택"
                style={nativeDateStyle}
                min={PEAK_HIS_DATE_RANGE.min}
                max={PEAK_HIS_DATE_RANGE.max}
                value={draftDate}
                onChange={(event) => setDraftDate(event.target.value)}
              />
            </div>
          </div>
          <span className="mNext"></span>
        </div>
        <div className="mTBlock">
          <span className="deskLabel">시간</span>
          <select
            className="select"
            id="sTime"
            aria-label="시간"
            value={draftTime}
            onChange={(event) => setDraftTime(event.target.value)}
          >
            {PEAK_TIME_OPTIONS.map((option) => (
              <option value={option.value} key={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span
            className="act actIcon"
            id="act"
            role="button"
            tabIndex={0}
            onClick={search}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") search();
            }}
          >
            <i className="bi bi-search"></i>조회
          </span>
        </div>
      </div>
      <div className="chart1" id="chart1">
        {series ? <PeakLineChart series={series} /> : <p style={errorStyle}>{error}</p>}
      </div>
    </div>
  );
}
