import type { CSSProperties } from "react";

import type { ReportComputedRow } from "@/lib/fit-mocks/report";

/**
 * 원본 `#chart1` 은 amCharts4 로 그린다. 클론은 외부 차트 라이브러리를 로드하지 않고
 * 동일한 컨테이너(`.chart1#chart1`) 안에 인라인 SVG 근사치를 그린다.
 *
 * - 누적 절감 요금: `#002cff → #ad44ff` 세로 그라데이션 area (우측 축)
 * - 저압 전력 요금: `#ffec7d` 라인 (좌측 축)
 * - 고압 전력 요금: `#b8faff` 라인 (좌측 축)
 */

const VIEW_W = 1000;
const VIEW_H = 400;
const GRID_STEPS = 4;

type Point = { readonly x: number; readonly y: number };

function toPoints(values: readonly number[], max: number): readonly Point[] {
  const step = values.length > 1 ? VIEW_W / (values.length - 1) : 0;
  return values.map((value, index) => ({
    x: index * step,
    y: max > 0 ? VIEW_H - (value / max) * VIEW_H : VIEW_H,
  }));
}

function toLinePath(points: readonly Point[]): string {
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(" ");
}

function toAreaPath(points: readonly Point[]): string {
  if (points.length === 0) {
    return "";
  }
  const last = points[points.length - 1];
  return `${toLinePath(points)} L${last.x.toFixed(2)},${VIEW_H} L0,${VIEW_H} Z`;
}

/** amCharts 축 라벨과 같은 단위 축약(천원/만원/억원). */
function formatAxisValue(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 100000000) {
    return `${Math.round((value / 100000000) * 10) / 10}억원`;
  }
  if (abs >= 10000) {
    return `${Math.round((value / 10000) * 10) / 10}만원`;
  }
  if (abs >= 1000) {
    return `${Math.round((value / 1000) * 10) / 10}천원`;
  }
  return `${Math.round(value)}`;
}

function niceMax(value: number): number {
  if (value <= 0) {
    return 1;
  }
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
}

const wrapStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
  minHeight: "inherit",
  padding: "10px 55px 26px 55px",
  boxSizing: "border-box",
};

const svgStyle: CSSProperties = {
  display: "block",
  width: "100%",
  height: "100%",
  overflow: "visible",
};

const axisTextStyle: CSSProperties = {
  position: "absolute",
  color: "#a0a0a0",
  fontSize: "0.7rem",
  whiteSpace: "nowrap",
  pointerEvents: "none",
};

type AxisTickProps = {
  readonly side: "left" | "right";
  readonly ratio: number;
  readonly label: string;
  readonly color: string;
};

function AxisTick({ side, ratio, label, color }: AxisTickProps) {
  const position =
    side === "left"
      ? { left: 0, textAlign: "right" as const, width: "50px" }
      : { right: 0, textAlign: "left" as const, width: "50px" };
  return (
    <span
      style={{
        ...axisTextStyle,
        ...position,
        color,
        top: `calc(10px + (100% - 36px) * ${ratio})`,
        transform: "translateY(-50%)",
      }}
    >
      {label}
    </span>
  );
}

export type ReportChartProps = {
  readonly rows: readonly ReportComputedRow[];
};

export function ReportChart({ rows }: ReportChartProps) {
  const leftMax = niceMax(Math.max(...rows.map((r) => Math.max(r.high, r.low)), 0));
  const rightMax = niceMax(Math.max(...rows.map((r) => r.accFrugal), 0));

  const accPoints = toPoints(
    rows.map((r) => r.accFrugal),
    rightMax,
  );
  const lowPoints = toPoints(
    rows.map((r) => r.low),
    leftMax,
  );
  const highPoints = toPoints(
    rows.map((r) => r.high),
    leftMax,
  );
  const gridRatios = Array.from({ length: GRID_STEPS + 1 }, (_, i) => i / GRID_STEPS);

  return (
    <div className="chart1" id="chart1">
      <div style={wrapStyle}>
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="none"
          style={svgStyle}
          role="img"
          aria-label="월별 고압·저압 전력 요금과 누적 절감 요금 추이"
        >
          <defs>
            <linearGradient id="chart1AccFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#002cff" />
              <stop offset="100%" stopColor="#ad44ff" />
            </linearGradient>
          </defs>
          {gridRatios.map((ratio) => (
            <line
              key={ratio}
              x1="0"
              x2={VIEW_W}
              y1={VIEW_H * ratio}
              y2={VIEW_H * ratio}
              stroke="rgba(238,238,238,0.15)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <path d={toAreaPath(accPoints)} fill="url(#chart1AccFill)" fillOpacity="0.7" />
          <path
            d={toLinePath(highPoints)}
            fill="none"
            stroke="#b8faff"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={toLinePath(lowPoints)}
            fill="none"
            stroke="#ffec7d"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {gridRatios.map((ratio) => (
          <AxisTick
            key={`l-${ratio}`}
            side="left"
            ratio={ratio}
            color="#a0a0a0"
            label={formatAxisValue(leftMax * (1 - ratio))}
          />
        ))}
        {gridRatios.map((ratio) => (
          <AxisTick
            key={`r-${ratio}`}
            side="right"
            ratio={ratio}
            color="#ad44ff"
            label={formatAxisValue(rightMax * (1 - ratio))}
          />
        ))}
        <div
          style={{
            position: "absolute",
            left: "55px",
            right: "55px",
            bottom: 0,
            display: "flex",
            justifyContent: "space-between",
            color: "#a0a0a0",
            fontSize: "0.7rem",
          }}
        >
          {rows.map((row) => (
            <span key={row.yyyymm}>{row.yyyymm.substring(4, 6)}월</span>
          ))}
        </div>
      </div>
    </div>
  );
}
