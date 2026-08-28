import type { PeakSortInfo } from "@/lib/fit-mocks/peak";
import { WattChart } from "./WattChart";

interface LiveUseAreaProps {
  readonly sort: PeakSortInfo;
}

/**
 * `.liveUseArea` — 피크 현황 요약 + 실시간 전력 사용 추이 차트 + 범례.
 */
export function LiveUseArea({ sort }: LiveUseAreaProps) {
  return (
    <div className="liveUseArea lowBox">
      <h2>실시간 전력 사용 추이</h2>
      <div className="peakSort">
        <h3>피크 현황</h3>
        <ul>
          <li>
            <span>계약전력</span>
            <p className="peakContract">
              <span id="peakContract">{sort.contract}</span> kW
            </p>
          </li>
          <li>
            <span>100% 초과</span>
            <p className="peakOver">
              <span id="peakOver">{sort.over}</span> 회
            </p>
          </li>
          <li>
            <span>90 ~ 100%</span>
            <p className="peakNine">
              <span id="peakNine">{sort.nine}</span> 회
            </p>
          </li>
          <li>
            <span>80 ~ 90%</span>
            <p className="peakEight">
              <span id="peakEight">{sort.eight}</span> 회
            </p>
          </li>
        </ul>
      </div>
      <div className="liveUseContent">
        <div className="liveUseChart">
          <div className="useChartData active">
            <WattChart />
          </div>
        </div>
        <div className="liveUseTag">
          <div className="liveUseLabel">
            <div className="useSign">
              <span>전력 사용량</span>
              <div className="UseLabelBox">
                <div className="UseLabelSign" />
                <span>최대부하</span>
              </div>
              <div className="UseLabelBox">
                <div className="UseLabelSign" />
                <span>중부하</span>
              </div>
              <div className="UseLabelBox">
                <div className="UseLabelSign" />
                <span>경부하</span>
              </div>
            </div>
            <div className="billSign">
              <span>전력 요금</span>
              <div className="UseLabelBox">
                <div className="UseLabelSign" />
                <span>산업용(을)고압</span>
              </div>
              <div className="UseLabelBox">
                <div className="UseLabelSign" />
                <span>산업용(갑)저압</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
