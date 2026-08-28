import type { CSSProperties } from "react";

import {
  PEAK_AXIS_MAX_KW,
  PEAK_AXIS_TICKS,
  PEAK_HIS_LEGENDS,
  type PeakHisSeries,
} from "@/lib/fit-mocks/peak-his";

/**
 * 원본 #chart1 은 amCharts4 로 그려지지만, 클론은 외부 라이브러리 없이
 * 인라인 SVG 로 동일한 4개 시리즈(예측/목표/현재/기준 전력)를 근사한다.
 * 범례는 원본 CSS 의 .chartLableBox/.chartLable 클래스를 그대로 사용한다.
 */

const VIEW_W = 1000;
const VIEW_H = 400;
const HOUR_TICKS = [0, 3, 6, 9, 12, 15, 18, 21, 24];

const SERIES_STROKE: readonly string[] = ["#ffec7d", "#ff8600", "#00ffff", "#ad44ff"];
const SERIES_DASH: readonly (string | undefined)[] = [undefined, "6 5", undefined, "4 6"];

const wrapStyle: CSSProperties = { position: "relative", width: "100%", height: "100%" };
const plotStyle: CSSProperties = { position: "absolute", inset: "44px 18px 30px 62px" };
const svgStyle: CSSProperties = { display: "block", width: "100%", height: "100%" };
const yLabelStyle: CSSProperties = {
  position: "absolute",
  left: 0,
  width: 54,
  textAlign: "right",
  fontSize: "0.8rem",
  color: "#8fa3b5",
  transform: "translateY(-50%)",
};
const xLabelStyle: CSSProperties = {
  position: "absolute",
  bottom: 8,
  fontSize: "0.8rem",
  color: "#8fa3b5",
  transform: "translateX(-50%)",
  whiteSpace: "nowrap",
};

const toY = (value: number): number => VIEW_H - (value / PEAK_AXIS_MAX_KW) * VIEW_H;

const toX = (index: number, count: number): number =>
  count < 2 ? 0 : (index / (count - 1)) * VIEW_W;

const toPath = (values: readonly number[]): string =>
  values
    .map((value, index) => {
      const command = index === 0 ? "M" : "L";
      return `${command}${toX(index, values.length).toFixed(2)} ${toY(value).toFixed(2)}`;
    })
    .join(" ");

type ChartProps = { readonly series: PeakHisSeries };

export function PeakLineChart({ series }: ChartProps) {
  const { points } = series;
  const lines: readonly number[][] = [
    points.map((point) => point.pr),
    points.map((point) => point.pl),
    points.map((point) => point.np),
    points.map((point) => point.op),
  ];
  const peakIndex = points.findIndex((point) => point.m15 === series.maxPeakAt);

  return (
    <div style={wrapStyle}>
      <div className="chartLableBox">
        {PEAK_HIS_LEGENDS.map((label) => (
          <span className="chartLable" key={label}>
            <hr />
            {label}
          </span>
        ))}
      </div>

      {PEAK_AXIS_TICKS.map((tick) => (
        <span
          key={tick}
          style={{ ...yLabelStyle, top: `calc(44px + (100% - 74px) * ${1 - tick / PEAK_AXIS_MAX_KW})` }}
        >
          {tick.toLocaleString("ko-KR")}
        </span>
      ))}

      {HOUR_TICKS.map((hour) => (
        <span key={hour} style={{ ...xLabelStyle, left: `calc(62px + (100% - 80px) * ${hour / 24})` }}>
          {String(hour).padStart(2, "0")}:00
        </span>
      ))}

      <div style={plotStyle}>
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="none"
          style={svgStyle}
          role="img"
          aria-label={`${series.date} 15분 단위 피크 전력 그래프`}
        >
          {PEAK_AXIS_TICKS.map((tick) => (
            <line
              key={`h${tick}`}
              x1={0}
              x2={VIEW_W}
              y1={toY(tick)}
              y2={toY(tick)}
              stroke="rgba(184,250,255,0.14)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {HOUR_TICKS.map((hour) => (
            <line
              key={`v${hour}`}
              x1={(hour / 24) * VIEW_W}
              x2={(hour / 24) * VIEW_W}
              y1={0}
              y2={VIEW_H}
              stroke="rgba(184,250,255,0.08)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {lines.map((values, index) => (
            <path
              key={PEAK_HIS_LEGENDS[index]}
              d={toPath(values)}
              fill="none"
              stroke={SERIES_STROKE[index]}
              strokeDasharray={SERIES_DASH[index]}
              strokeWidth={2}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {peakIndex >= 0 ? (
            <circle
              cx={toX(peakIndex, points.length)}
              cy={toY(series.maxPeak)}
              r={4}
              fill="#001420"
              stroke="#00ffff"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
        </svg>
      </div>
    </div>
  );
}
