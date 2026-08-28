import type { ReduceFrugalSummary } from "@/lib/fit-mocks/reduce";
import { echoNumber } from "./format";

/**
 * basicTop 우측 "저압 절감 금액" 박스.
 * 도넛 게이지(.circleFill)는 원본과 동일하게 순수 CSS 로, 채움 높이만 inline `bottom` 으로 준다.
 */
export function ReduceGauge({ frugal }: { frugal: ReduceFrugalSummary }) {
  return (
    <div className="lowBox reduceBox">
      <div className="lineMint lineE"></div>
      <h2>저압 절감 금액</h2>
      <div className="circleFill" id="goalRatio">
        <div className="wave" style={{ bottom: `${frugal.goalRatio}%` }}></div>
        <div className="waveValue">{`${frugal.goalRatio}%`}</div>
      </div>
      <div className="reduceMoney" id="frugal">
        <h3>목표 절감 금액</h3>
        <div>
          <span className="goal">{echoNumber(frugal.goal)}</span>
          <span>원</span>
        </div>
        <h3>저압 절감 금액</h3>
        <div>
          <span className="frugalTotal">{echoNumber(frugal.frugalTotal)}</span>
          <span>원</span>
        </div>
        <h3>평균 절감 금액</h3>
        <div>
          <span className="frugalAvg">{echoNumber(frugal.frugalAvg)}</span>
          <span>원</span>
        </div>
        <h3>평균 절감률</h3>
        <div>
          <span className="ratioAvg">{echoNumber(frugal.ratioAvg)}</span>
          <span>%</span>
        </div>
      </div>
    </div>
  );
}
