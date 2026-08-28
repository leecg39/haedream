import type { RoiInfo } from "@/lib/fit-mocks/peak";

interface DisMoneyProps {
  readonly roi: RoiInfo;
}

/**
 * `#disMoney` — 투자회수기간(ROI) 진행바 + 투자금 / 누적 절감액.
 */
export function DisMoney({ roi }: DisMoneyProps) {
  const width = Math.min(Math.max(roi.investRatio, 0), 100);

  return (
    <div className="disMoney lowBox" id="disMoney">
      <div>
        <b>투자회수기간(ROI)</b>
        <p>
          <span className="frugalDays">{roi.frugalDays}</span>일 (
          <span className="investRatio">{roi.investRatio}</span>%)
        </p>
      </div>
      <div className="roiGoalLine">
        <span className="roiGoal" />
        <span className="roiGoalOn" id="roiGoalOn" style={{ width: `${width}%` }} />
      </div>
      <div>
        <b>
          <i className="bi bi-cursor-fill" aria-hidden="true" />
          투자금
        </b>
        <p>
          <span className="investGold">{roi.investGold}</span>원
        </p>
      </div>
      <div>
        <b>
          <i className="bi bi-graph-down-arrow" aria-hidden="true" />
          누적 절감액
        </b>
        <p>
          <i className="bi bi-arrow-up-short" aria-hidden="true" />
          <span className="frugal">{roi.frugal}</span>원
        </p>
      </div>
    </div>
  );
}
