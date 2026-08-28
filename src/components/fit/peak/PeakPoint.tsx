import type { PeakPointValue } from "@/lib/fit-mocks/peak";

interface PeakPointProps {
  readonly points: readonly PeakPointValue[];
}

/** 원본 마크업의 박스 접미사(A=예측, B=목표, C=현재, D=기준) */
const SUFFIXES = ["A", "B", "C", "D"] as const;

/**
 * `#peakPointArea` — 예측/목표/현재/기준 전력 4개 박스.
 * 클래스명(`peakPointBoxA` 등)에 색상 CSS 가 걸려 있으므로 순서를 바꾸지 않는다.
 */
export function PeakPoint({ points }: PeakPointProps) {
  return (
    <div className="peakPointArea" id="peakPointArea">
      {points.slice(0, SUFFIXES.length).map((point, index) => {
        const suffix = SUFFIXES[index];
        return (
          <div className={`peakPointBox${suffix} pointBox`} key={suffix}>
            <span className={`peakPointLabel peakPoint${suffix}`}>{point.label}</span>
            <span className={`peakPoint peakPoint${suffix}`}>{point.value}</span>
            <div className="decoDot" />
          </div>
        );
      })}
      {/* <div className="peakPointBoxE">
                <span className="peakPointLabel peakPointE disable">순간 전력</span>
                <span className="peakPoint peakPointE disable">0</span>
                <div className="decoDot"></div>
            </div> */}
    </div>
  );
}
