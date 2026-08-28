"use client";

import { Fragment, useMemo, useState } from "react";
import {
  DEFAULT_CONTRACT,
  DEFAULT_KEPCO_CONTRACT,
  RATE_PLAN_OPTIONS,
  findRatePlanCost,
  type CostKey,
  type LoadPrefix,
  type RatePlanCost,
  type SeasonSuffix,
} from "@/lib/fit-mocks/rate-plan";

/** 원본 셀렉트의 빈 옵션 텍스트. 미선택 시 `<th>` 에도 이 값이 들어간다. */
const EMPTY_OPTION_LABEL = "요금제 선택";

const SEASONS: readonly { readonly name: string; readonly suffix: SeasonSuffix }[] = [
  { name: "여름철", suffix: "S" },
  { name: "봄·가을철", suffix: "F" },
  { name: "겨울철", suffix: "W" },
];

const LOADS: readonly { readonly name: string; readonly prefix: LoadPrefix }[] = [
  { name: "경부하", prefix: "L" },
  { name: "중부하", prefix: "M" },
  { name: "최대부하", prefix: "H" },
];

interface CostRow {
  /** `LS` ~ `HW` — 원본 `data-cost` 속성 접미사 */
  readonly type: string;
  readonly plan1: number;
  readonly plan2: number;
}

/** base.js `vio.echoNumber` — 천 단위 콤마 */
function echoNumber(n: number): string {
  return `${n}`.replace(/(\d)(?=(?:\d{3})+(?!\d))/g, "$1,");
}

/** ratePlan.js 와 동일하게 소수 둘째 자리에서 반올림한 절감액 */
function roundGap(p1: number, p2: number): number {
  return Math.round((p1 - p2) * 100) / 100;
}

/** ratePlan.js 와 동일한 절감률 문자열 */
function rateText(p1: number, p2: number): string {
  return p1 !== 0 ? `${Math.round(((p1 - p2) / p1) * 10000) / 100}%` : "0%";
}

function planLabel(value: string): string {
  return RATE_PLAN_OPTIONS.find((option) => option.value === value)?.label ?? EMPTY_OPTION_LABEL;
}

function buildRows(plan1: RatePlanCost | undefined, plan2: RatePlanCost | undefined): readonly CostRow[] {
  return SEASONS.flatMap((season) =>
    LOADS.map((load) => {
      const key = `cost${load.prefix}${season.suffix}` as CostKey;
      return { type: `${load.prefix}${season.suffix}`, plan1: plan1?.[key] ?? 0, plan2: plan2?.[key] ?? 0 };
    }),
  );
}

/** 9개 시간대 평균 단가와 그 차이(평균 절감액·절감률) */
function buildSummary(rows: readonly CostRow[]) {
  const total1 = rows.reduce((acc, row) => acc + row.plan1, 0);
  const total2 = rows.reduce((acc, row) => acc + row.plan2, 0);
  const plan1Sum = total1 ? Math.round((total1 / 9) * 10) / 10 : 0;
  const plan2Sum = total2 ? Math.round((total2 / 9) * 10) / 10 : 0;

  return {
    plan1Sum,
    plan2Sum,
    planFrugal: Math.round((plan1Sum - plan2Sum) * 10) / 10,
    planFrugalRate: plan1Sum !== 0 ? Math.round(((plan1Sum - plan2Sum) / plan1Sum) * 10000) / 100 : 0,
  } as const;
}

interface PlanSelectProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
}

function PlanSelect({ id, label, value, onChange }: PlanSelectProps) {
  return (
    <>
      <label htmlFor={id} className="deskLabel">
        {label}
      </label>
      <select
        className="selectbox"
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{EMPTY_OPTION_LABEL}</option>
        {RATE_PLAN_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        {/* <option value="EHAS2">일반용전력(을)-고압A-선택II</option> */}
        {/* <option value="GL1">일반용전력(갑I)-저압</option> */}
      </select>
    </>
  );
}

interface PlanTableProps {
  readonly plan1Name: string;
  readonly plan2Name: string;
  readonly rows: readonly CostRow[];
}

function PlanTable({ plan1Name, plan2Name, rows }: PlanTableProps) {
  const summary = buildSummary(rows);

  return (
    <table className="sheet" id="planTable">
      <thead>
        <tr>
          <th>계절</th>
          <th>부하구분</th>
          <th id="ratePlan1Name">{plan1Name}</th>
          <th id="ratePlan2Name">{plan2Name}</th>
          <th>절감액</th>
          <th>절감률</th>
        </tr>
      </thead>
      <tbody id="hoursList">
        {SEASONS.map((season, seasonIndex) => (
          <Fragment key={season.suffix}>
            {LOADS.map((load, loadIndex) => {
              const row = rows[seasonIndex * LOADS.length + loadIndex];
              return (
                <tr key={row.type}>
                  {loadIndex === 0 ? <th rowSpan={3}>{season.name}</th> : null}
                  <td>{load.name}</td>
                  <td data-cost={`plan1Cost${row.type}`}>{row.plan1}</td>
                  <td data-cost={`plan2Cost${row.type}`}>{row.plan2}</td>
                  <td data-cost={`cost${row.type}Gap`}>{roundGap(row.plan1, row.plan2)}</td>
                  <td data-cost={`cost${row.type}Rate`}>{rateText(row.plan1, row.plan2)}</td>
                </tr>
              );
            })}
          </Fragment>
        ))}
        <tr>
          <th>평균</th>
          <td></td>
          <td data-cost="plan1Sum">{echoNumber(summary.plan1Sum)}</td>
          <td data-cost="plan2Sum">{echoNumber(summary.plan2Sum)}</td>
          <td data-cost="planFrugal">{echoNumber(summary.planFrugal)}</td>
          <td data-cost="planFrugalRate">{`${summary.planFrugalRate}%`}</td>
        </tr>
      </tbody>
    </table>
  );
}

export function RatePlanCompare() {
  const [ratePlan1, setRatePlan1] = useState(DEFAULT_KEPCO_CONTRACT);
  const [ratePlan2, setRatePlan2] = useState(DEFAULT_CONTRACT);

  const rows = useMemo(
    () => buildRows(findRatePlanCost(ratePlan1), findRatePlanCost(ratePlan2)),
    [ratePlan1, ratePlan2],
  );

  return (
    <>
      <div className="deskTool">
        <PlanSelect id="ratePlan1" label="요금제1" value={ratePlan1} onChange={setRatePlan1} />
        <PlanSelect id="ratePlan2" label="요금제2" value={ratePlan2} onChange={setRatePlan2} />
      </div>
      <div className="sheetArea">
        <PlanTable plan1Name={planLabel(ratePlan1)} plan2Name={planLabel(ratePlan2)} rows={rows} />
      </div>
    </>
  );
}
