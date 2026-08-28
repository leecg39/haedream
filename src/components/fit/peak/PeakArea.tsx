import type { PeakPointValue, PeakRealtimeInfo } from "@/lib/fit-mocks/peak";
import { PeakChart } from "./PeakChart";
import { PeakGauge } from "./PeakGauge";
import { PeakPoint } from "./PeakPoint";

interface PeakAreaProps {
  readonly realtime: PeakRealtimeInfo;
  readonly points: readonly PeakPointValue[];
}

/**
 * `#peakBase` — 상단 부하 제어 바 + 좌측 추이 차트 + 우측 실시간 게이지/전력값.
 *
 * 원본 JS 는 피크 단계에 따라 `.peakArea` 에 `blue`/`orange`/`red` 를 붙이고,
 * 그 클래스가 `.controlEnd`/`.controlWait`/`.controlIng` 중 하나만 노출시킨다.
 */
export function PeakArea({ realtime, points }: PeakAreaProps) {
  return (
    <div className={`peakArea lowBox ${realtime.level}`} id="peakBase">
      <div className="peakControlBar">
        <div>
          <i className="bi bi-exclamation-diamond" />
          현재 부하 <span>{realtime.loadCount}</span> 개
        </div>
        <div className="controlBar controlEnd">
          <i className="bi bi-check-lg" /> 부하 제어 완료
        </div>
        <div className="controlBar controlWait">
          <i className="bi bi-three-dots" /> 부하 제어 대기
        </div>
        <div className="controlBar controlIng">
          <i className="bi bi-wrench-adjustable" /> 부하 제어 중
        </div>
      </div>
      <div className="peakContents">
        <PeakChart />
        <div className="nodeInfo">
          <PeakGauge realtime={realtime} />
          <PeakPoint points={points} />
        </div>
      </div>
    </div>
  );
}
