"use client";

import { useState } from "react";
import type { PeakHeaderInfo } from "@/lib/fit-mocks/peak";

interface PeakTopInfoProps {
  readonly header: PeakHeaderInfo;
}

/**
 * `.topInfo` — 페이지 제목 + 검침일/데이터정확도/스위치 2종.
 *
 * 원본은 `#isMeterDate` 변경 시 API 를 다시 호출하고, `#peakMediaAlarm` 변경 시
 * 피크 알람 사운드를 켜고 끈다. 클론은 목 데이터를 쓰므로 토글 상태만 유지한다.
 */
export function PeakTopInfo({ header }: PeakTopInfoProps) {
  const [meterDateApplied, setMeterDateApplied] = useState(header.meterDateApplied);
  const [alarmEnabled, setAlarmEnabled] = useState(header.alarmEnabled);

  return (
    <div className="topInfo">
      <h1 className="title">피크상태</h1>
      <div className="topInfoRt">
        <div className="day">
          검침일&nbsp;
          <span className="blue" id="meterDate">
            {header.meterDate}
          </span>
        </div>
        <div className="dayCk">
          <label>
            <span>검침일 기준 적용</span>
            <input
              type="checkbox"
              id="isMeterDate"
              role="switch"
              checked={meterDateApplied}
              onChange={(event) => setMeterDateApplied(event.target.checked)}
            />
          </label>
        </div>
        <div>
          데이터정확도
          <span className="blue" id="dataVerifyRate">
            {header.dataVerifyRate}
          </span>
        </div>
        <div className="dayCk">
          <label>
            <span>알림</span>
            <input
              role="switch"
              type="checkbox"
              id="peakMediaAlarm"
              checked={alarmEnabled}
              onChange={(event) => setAlarmEnabled(event.target.checked)}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
