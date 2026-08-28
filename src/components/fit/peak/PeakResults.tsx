import type { GoalItem, RoiInfo } from "@/lib/fit-mocks/peak";
import { DisMoney } from "./DisMoney";
import { GoalAccordion } from "./GoalAccordion";

interface PeakResultsProps {
  readonly goals: readonly GoalItem[];
  readonly roi: RoiInfo;
}

/**
 * `#results` — 우측 컬럼(목표 절감액 달성 현황 + 투자회수기간).
 */
export function PeakResults({ goals, roi }: PeakResultsProps) {
  return (
    <div className="peakRight" id="results">
      <div className="goal lowBox">
        <h2>목표 절감액 달성 현황</h2>
        <GoalAccordion goals={goals} />
      </div>
      <DisMoney roi={roi} />
    </div>
  );
}
