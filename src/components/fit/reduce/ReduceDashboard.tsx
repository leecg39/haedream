"use client";

import { LIB_STYLES, PageStyles } from "@/components/fit/shared/PageStyles";
import { REDUCE_DATA_TYPES, REDUCE_INITIAL_QUERY, buildReduceDataset, formatReduceDate, type ReduceDataType, type ReduceQuery } from "@/lib/fit-mocks/reduce";
import { ReduceChart } from "@/components/fit/reduce/ReduceChart";
import { ReduceGauge } from "@/components/fit/reduce/ReduceGauge";
import { caretClass, echoNumber } from "@/components/fit/reduce/format";
import { useMemo, useState } from "react";

const REDUCE_LABEL_ICONS: Readonly<Record<string, string>> = {
  "저압 전력 요금": "bi bi-lightning-charge-fill",
  "사용 전력량": "bi bi-plug-fill",
  "최고 전력 요금": "bi bi-chevron-bar-up",
  "평균 사용 전력량": "bi bi-align-center",
  "평균 저압 전력 요금": "bi bi-align-center",
  "평균 절감 금액": "bi bi-align-center",
  "평균 절감률": "bi bi-align-center",
};

/**
 * 원본 `#low` 박스의 값 span 에 붙는 클래스. JS 값 주입 훅이라 CSS 규칙은 없지만
 * 원본 DOM 과 동일하게 유지한다. `#compare` 박스는 `.beforValue` 계열을 쓴다.
 */
const REDUCE_VALUE_CLASSES: Readonly<Record<string, string>> = {
  "저압 전력 요금": "billTotal",
  "사용 전력량": "wattTotal",
  "최고 전력 요금": "billMax",
  "평균 사용 전력량": "avgWatt",
  "평균 저압 전력 요금": "avgLow",
};

function SummaryBox({
  title,
  className,
  values,
}: {
  readonly title: string;
  readonly className: string;
  readonly values: readonly { readonly label: string; readonly value: number; readonly unit: string }[];
}) {
  return (
    <div className={`lowBox ${className}`}>
      <div className={className === "lowPay" ? "lineBlue lineE" : "linePuple lineE"} />
      <h2>{title}</h2>
      <div className="dataBox" id={className === "lowPay" ? "low" : "compare"}>
        {values.map((item) => (
          <div key={item.label}>
            <h3>
              {REDUCE_LABEL_ICONS[item.label] ? (
                <i className={REDUCE_LABEL_ICONS[item.label]} />
              ) : null}{" "}
              {item.label}
            </h3>
            <div className={className === "lowBefore" ? (item.value > 0 ? "beforValue bad" : "beforValue") : undefined}>
              {className === "lowBefore" ? <i className={caretClass(item.value)} /> : null}
              <span className={className === "lowPay" ? REDUCE_VALUE_CLASSES[item.label] : undefined}>
                {echoNumber(Math.abs(item.value))}
              </span>
            </div>
            <span>{item.unit}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReduceDashboard() {
  const [draft, setDraft] = useState<ReduceQuery>(REDUCE_INITIAL_QUERY);
  const [query, setQuery] = useState<ReduceQuery>(REDUCE_INITIAL_QUERY);
  const dataset = useMemo(() => buildReduceDataset(query), [query]);
  const update = <K extends keyof ReduceQuery>(key: K, value: ReduceQuery[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  return (
    <>
      <PageStyles files={[...LIB_STYLES, "/fit/assets/css/reduce.css"]} />
      <main className="contents" id="contentsArea">
        <div className="topTitle">
          <h1 className="deskTitle">저압 절감 분석</h1>
          <div className="selectContainer"><select className="selectbox" id="dataType" value={draft.dataType} onChange={(event) => update("dataType", event.target.value as ReduceDataType)}>{REDUCE_DATA_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
          <div className="datePicker">
            <div className="tui-datepicker-input tui-datetime-input tui-has-focus">
              <input
                type="text"
                className="inputDate"
                id="sDate"
                aria-label="Date-Time"
                value={formatReduceDate(draft.sDate, draft.dataType)}
                onChange={(event) => update("sDate", event.target.value)}
              />
              <i className="bi bi-calendar" />
            </div>
            <div id="wrapper" />
          </div>
          <button className="searchBtn" id="search" onClick={() => setQuery(draft)}><i className="bi bi-search" />조회</button>
          <label htmlFor="isBaseCost" className="isBaseCost">기본요금 포함</label><input type="checkbox" id="isBaseCost" role="switch" checked={draft.isBaseCost} onChange={(event) => update("isBaseCost", event.target.checked)} />
          <label htmlFor="isCheckDay" className="isCheckDay">검침일 적용</label><input type="checkbox" id="isCheckDay" role="switch" checked={draft.isCheckDay} disabled />
        </div>
        <div className="basicTop">
          <div className="lowBox chartBox"><div className="chart" id="chart"><ReduceChart rows={dataset.rows} /></div></div>
          <ReduceGauge frugal={dataset.frugal} />
        </div>
        <div className="basicBottom">
          <div className="lowBox tableBox"><table><thead><tr><th>일시</th><th>사용전력량(kWh)</th><th>고압 전력 요금</th><th>저압 전력 요금</th><th>절감 금액</th><th>절감률</th></tr></thead><tbody id="itemList">{dataset.rows.map((row) => <tr key={row.seq} className={row.isMax ? "high" : undefined}><td>{row.seq}</td><td>{echoNumber(row.watt)}</td><td>{echoNumber(row.high)}</td><td>{echoNumber(row.low)}</td><td>{echoNumber(row.frugal)}</td><td>{row.frugalRate}%</td></tr>)}</tbody></table></div>
          <SummaryBox title="저압 전력 요금" className="lowPay" values={[{ label: "저압 전력 요금", value: dataset.low.billTotal, unit: "원" }, { label: "사용 전력량", value: dataset.low.wattTotal, unit: "kWh" }, { label: "최고 전력 요금", value: dataset.low.billMax, unit: "원" }, { label: "평균 사용 전력량", value: dataset.low.avgWatt, unit: "kWh" }, { label: "평균 저압 전력 요금", value: dataset.low.avgLow, unit: "원" }]} />
          <SummaryBox title="직전 동일 기간 대비" className="lowBefore" values={[{ label: "저압 전력 요금", value: dataset.compare.billTotal, unit: "원" }, { label: "사용 전력량", value: dataset.compare.wattTotal, unit: "kWh" }, { label: "최고 전력 요금", value: dataset.compare.billMax, unit: "원" }, { label: "평균 절감 금액", value: dataset.compare.avgWatt, unit: "원" }, { label: "평균 절감률", value: dataset.compare.avgLow, unit: "%" }]} />
        </div>
      </main>
    </>
  );
}
