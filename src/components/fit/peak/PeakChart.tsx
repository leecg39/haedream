import { PEAK_TREND } from "@/lib/fit-mocks/peak";

const VIEW_W = 600;
const VIEW_H = 300;
const PAD_X = 8;
const PAD_Y = 12;

/** 0~100 스케일 값 배열을 viewBox 좌표 문자열로 바꾼다. */
function toPoints(series: readonly number[]): readonly string[] {
  const step = (VIEW_W - PAD_X * 2) / Math.max(series.length - 1, 1);
  return series.map((value, index) => {
    const x = PAD_X + step * index;
    const y = VIEW_H - PAD_Y - ((VIEW_H - PAD_Y * 2) * value) / 100;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
}

/** 기준선 y 좌표 (0~100 스케일) */
function levelY(value: number): number {
  return VIEW_H - PAD_Y - ((VIEW_H - PAD_Y * 2) * value) / 100;
}

/**
 * `#chartPeak` — 원본은 amCharts4 로 실시간 피크 추이를 그린다.
 * 클론은 차트 라이브러리를 번들하지 않고 동일한 색 규약(예측=#fdf800,
 * 목표=#ff8600, 현재=#00ffff, 기준=#ad44ff)의 인라인 SVG 로 대체한다.
 */
export function PeakChart() {
  const points = toPoints(PEAK_TREND);
  const line = points.join(" ");
  const area = `${PAD_X},${VIEW_H - PAD_Y} ${line} ${VIEW_W - PAD_X},${VIEW_H - PAD_Y}`;
  const forecast = toPoints(PEAK_TREND.map((value) => Math.min(value * 1.06 + 3, 100))).join(" ");

  return (
    <div className="nodePowerChart" id="chartPeak">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        width="100%"
        height="100%"
        role="img"
        aria-label="실시간 피크 추이 차트"
      >
        <defs>
          <linearGradient id="peakChartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#00ffff" stopOpacity="0.45" />
            <stop offset="1" stopColor="#00ffff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[20, 40, 60, 80].map((value) => (
          <line
            key={value}
            x1={PAD_X}
            x2={VIEW_W - PAD_X}
            y1={levelY(value)}
            y2={levelY(value)}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <polygon points={area} fill="url(#peakChartFill)" />
        <polyline
          points={line}
          fill="none"
          stroke="#00ffff"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          points={forecast}
          fill="none"
          stroke="#fdf800"
          strokeWidth="2"
          strokeDasharray="1 0"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={PAD_X}
          x2={VIEW_W - PAD_X}
          y1={levelY(94)}
          y2={levelY(94)}
          stroke="#ff8600"
          strokeWidth="2"
          strokeDasharray="6 5"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1={PAD_X}
          x2={VIEW_W - PAD_X}
          y1={levelY(100)}
          y2={levelY(100)}
          stroke="#ad44ff"
          strokeWidth="2"
          strokeDasharray="6 5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
