import type { ReduceRow } from "@/lib/fit-mocks/reduce";
import { echoNumber } from "./format";

/**
 * 원본은 echarts 로 스택 막대(저압 전력 요금 + 저압 절감 금액) + 라인(직전 동일 기간)을 그린다.
 * 클론은 외부 라이브러리 없이 인라인 SVG 로 동일한 구성을 근사한다.
 */

const VIEW = { width: 1000, height: 420 } as const;
const PAD = { top: 14, right: 18, bottom: 76, left: 96 } as const;
const PLOT_W = VIEW.width - PAD.left - PAD.right;
const PLOT_H = VIEW.height - PAD.top - PAD.bottom;
const TICK_COUNT = 4;

const AXIS_COLOR = "#4a5462";
const GRID_COLOR = "#2b323c";
const LABEL_COLOR = "#a9b2bd";

const niceMax = (value: number): number => {
  if (value <= 0) {
    return 1;
  }
  const magnitude = 10 ** (Math.trunc(value).toString().length - 1);
  const step = magnitude / 2;
  return Math.ceil(value / step) * step;
};

type LegendItem = { readonly label: string; readonly color: string; readonly line: boolean };

const LEGEND: readonly LegendItem[] = [
  { label: "저압 전력 요금", color: "#0041ff", line: false },
  { label: "저압 절감 금액", color: "#00ffff", line: false },
  { label: "직전 동일 기간 저압 전력 요금", color: "#ad44ff", line: true },
];

function ChartLegend() {
  const y = VIEW.height - 20;
  const widths = [150, 150, 260];
  const total = widths.reduce((acc, w) => acc + w, 0);
  const start = PAD.left + (PLOT_W - total) / 2;

  return (
    <g>
      {LEGEND.map((item, index) => {
        const offset = start + widths.slice(0, index).reduce((acc, w) => acc + w, 0);
        return (
          <g key={item.label}>
            {item.line ? (
              <>
                <rect x={offset} y={y - 3} width={24} height={2} fill={item.color} />
                <circle cx={offset + 12} cy={y - 2} r={4} fill={item.color} />
              </>
            ) : (
              <rect x={offset} y={y - 9} width={24} height={14} rx={2} fill={item.color} />
            )}
            <text x={offset + 32} y={y + 3} fill={LABEL_COLOR} fontSize={14}>
              {item.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export function ReduceChart({ rows }: { rows: readonly ReduceRow[] }) {
  const peak = rows.reduce((acc, row) => Math.max(acc, row.high, row.last), 0);
  const max = niceMax(peak);
  const slot = PLOT_W / Math.max(rows.length, 1);
  const barWidth = slot * 0.5;
  const labelStep = rows.length > 24 ? 2 : 1;
  const scale = (value: number) => PAD.top + PLOT_H * (1 - value / max);
  const centerOf = (index: number) => PAD.left + slot * index + slot / 2;
  const linePoints = rows.map((row, index) => `${centerOf(index)},${scale(row.last)}`).join(" ");

  return (
    <svg
      className="reduceChartSvg"
      viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "100%" }}
      role="img"
      aria-label="저압 전력 요금과 저압 절감 금액 추이"
    >
      <defs>
        <linearGradient id="reduceLowBar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0041ff" />
          <stop offset="1" stopColor="rgba(3, 3, 5, 0.8)" />
        </linearGradient>
      </defs>

      {Array.from({ length: TICK_COUNT + 1 }, (_, i) => {
        const value = (max / TICK_COUNT) * i;
        const y = scale(value);
        return (
          <g key={value}>
            <line x1={PAD.left} y1={y} x2={PAD.left + PLOT_W} y2={y} stroke={GRID_COLOR} strokeWidth={1} />
            <text x={PAD.left - 10} y={y + 4} fill={LABEL_COLOR} fontSize={13} textAnchor="end">
              {`${echoNumber(Math.round(value))}원`}
            </text>
          </g>
        );
      })}

      {rows.map((row, index) => {
        const lowHeight = (PLOT_H * row.low) / max;
        const frugalHeight = (PLOT_H * row.frugal) / max;
        const x = PAD.left + slot * index + (slot - barWidth) / 2;
        return (
          <g key={row.seq}>
            <rect x={x} y={scale(row.low)} width={barWidth} height={lowHeight} fill="url(#reduceLowBar)" />
            <rect x={x} y={scale(row.high)} width={barWidth} height={frugalHeight} fill="#00ffff" />
          </g>
        );
      })}

      <polyline points={linePoints} fill="none" stroke="#ad44ff" strokeWidth={2} />
      {rows.map((row, index) => (
        <circle key={row.seq} cx={centerOf(index)} cy={scale(row.last)} r={3} fill="#ad44ff" />
      ))}

      <line
        x1={PAD.left}
        y1={PAD.top + PLOT_H}
        x2={PAD.left + PLOT_W}
        y2={PAD.top + PLOT_H}
        stroke={AXIS_COLOR}
        strokeWidth={1}
      />
      {rows.map((row, index) =>
        index % labelStep === 0 ? (
          <text
            key={row.seq}
            x={centerOf(index)}
            y={PAD.top + PLOT_H + 20}
            fill={LABEL_COLOR}
            fontSize={13}
            textAnchor="middle"
          >
            {row.seq}
          </text>
        ) : null,
      )}

      <ChartLegend />
    </svg>
  );
}
