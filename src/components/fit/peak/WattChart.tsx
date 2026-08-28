import { BILL_HIGH_LINE, BILL_LOW_LINE, WATT_BARS } from "@/lib/fit-mocks/peak";

const VIEW_W = 960;
const VIEW_H = 320;
const PAD_X = 12;
const PAD_TOP = 14;
const PAD_BOTTOM = 26;

/** 부하대별 막대 색 — 원본 범례(최대부하/중부하/경부하)와 동일하다. */
const BAND_COLOR = {
  max: "#ff005b",
  mid: "#ff8600",
  low: "#0041ff",
} as const;

function plotY(value: number): number {
  return VIEW_H - PAD_BOTTOM - ((VIEW_H - PAD_TOP - PAD_BOTTOM) * value) / 100;
}

function toPolyline(series: readonly number[]): string {
  const step = (VIEW_W - PAD_X * 2) / Math.max(series.length - 1, 1);
  return series
    .map((value, index) => `${(PAD_X + step * index).toFixed(1)},${plotY(value).toFixed(1)}`)
    .join(" ");
}

/**
 * `#wattChart` — 원본은 ECharts 로 시간대별 사용량 막대 + 요금 라인을 그린다.
 * 클론은 라이브러리 없이 동일 색 규약의 인라인 SVG 로 형태만 재현한다.
 */
export function WattChart() {
  const slot = (VIEW_W - PAD_X * 2) / WATT_BARS.length;
  const barWidth = slot * 0.56;

  return (
    <div id="wattChart">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        width="100%"
        height="100%"
        role="img"
        aria-label="실시간 전력 사용 추이 차트"
      >
        {[25, 50, 75, 100].map((value) => (
          <line
            key={value}
            x1={PAD_X}
            x2={VIEW_W - PAD_X}
            y1={plotY(value)}
            y2={plotY(value)}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {WATT_BARS.map((bar, index) => (
          <rect
            key={bar.hour}
            x={PAD_X + slot * index + (slot - barWidth) / 2}
            y={plotY(bar.value)}
            width={barWidth}
            height={VIEW_H - PAD_BOTTOM - plotY(bar.value)}
            rx="2"
            fill={BAND_COLOR[bar.band]}
            opacity="0.85"
          />
        ))}
        <polyline
          points={toPolyline(BILL_LOW_LINE)}
          fill="none"
          stroke="#fdf800"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          points={toPolyline(BILL_HIGH_LINE)}
          fill="none"
          stroke="#00ffff"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={PAD_X}
          x2={VIEW_W - PAD_X}
          y1={VIEW_H - PAD_BOTTOM}
          y2={VIEW_H - PAD_BOTTOM}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
