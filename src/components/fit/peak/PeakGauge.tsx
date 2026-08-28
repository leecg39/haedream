import type { PeakRealtimeInfo } from "@/lib/fit-mocks/peak";

interface PeakGaugeProps {
  readonly realtime: PeakRealtimeInfo;
}

/** 피크율(0~100%)을 게이지 바늘 회전각(-90deg ~ 90deg)으로 변환한다. */
function needleAngle(ratio: number): string {
  const clamped = Math.min(Math.max(ratio, 0), 100);
  return `translateX(-50%) rotate(${(-90 + clamped * 1.8).toFixed(1)}deg)`;
}

/** 상태 칩(안정/근접/초과) 중 현재 상태만 색 클래스를 갖는다. */
function statClass(level: PeakRealtimeInfo["level"], own: PeakRealtimeInfo["level"]): string {
  return level === own ? `statClip ${own}` : "statClip";
}

/**
 * `.peakTimeArea` — 실시간 피크 게이지, 상태 칩, 15분 계량주기 진행바, 시간 정보.
 */
export function PeakGauge({ realtime }: PeakGaugeProps) {
  return (
    <div className="peakTimeArea">
      <div className="decotitle">실시간 피크 상태</div>
      <div className="peakWattLimit">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 208.99 104">
          <defs>
            <linearGradient
              id="linear-gradient"
              y1="52"
              x2="208.99"
              y2="52"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor="#0041ff" />
              <stop offset="0.49" stopColor="#eda024" />
              <stop offset="1" stopColor="#ff005b" />
            </linearGradient>
          </defs>
          <g id="Layer_2" data-name="Layer 2">
            <g id="Layer_1-2" data-name="Layer 1">
              <path
                className="cls-1"
                d="M23,104a81.49,81.49,0,0,1,163,0h23A104.5,104.5,0,0,0,0,104Z"
                fill="url(#linear-gradient)"
              />
            </g>
          </g>
        </svg>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="needle realTimePeakGauge"
          id="realTimePeakGauge"
          viewBox="0 0 42.01 104"
          style={{ transform: needleAngle(realtime.ratio) }}
        >
          <path
            id="needle-path"
            d="M24,72.36,21.89,1.24c-.23-1.65-1.55-1.65-1.78,0L18,72.36a10,10,0,1,0,6,0Z"
          />
        </svg>
        <div className="needlePer">
          <span className="realTimePeakRatio" id="realTimePeakRatio">
            {realtime.ratio}
          </span>
          <sub>%</sub>
        </div>
      </div>
      <div className="peakStatusArea" id="peakStatusArea">
        <div className="statCheap">
          <span className={statClass(realtime.level, "blue")} data-alt="안정" />
        </div>
        <hr />
        <div className="statCheap">
          <span className={statClass(realtime.level, "orange")} data-alt="근접" />
        </div>
        <hr />
        <div className="statCheap">
          <span className={statClass(realtime.level, "red")} data-alt="초과" />
        </div>
      </div>
      <div className="peakTimeLimit">
        <div className="peakMeterLine">
          <span className="peakMeter" />
          <span
            className="peakMeterOn"
            id="peakMeterOn"
            style={{ width: `${realtime.timeProgress}%` }}
          />
        </div>
      </div>
      <div className="peakTimeInfo">
        <div className="peakTimeDigit">
          <span id="peakTimeDigit">{realtime.timeDigit}</span>
          <span>15:00</span>
        </div>
        <div className="peakTimeWatch">
          <span className="peakTimeInfoLabel">계기시간</span>
          <span id="peakAbleTime">{realtime.ableTime}</span>
        </div>
        <span className="peakTimeDiffArea">
          <span className="peakTimeText">시간차</span>
          <span className="peakTimeText" id="peakTimeDiff">
            {realtime.timeDiff}
          </span>
          <span>초</span>
        </span>
      </div>
    </div>
  );
}
