"use client";

import { useEffect, useState } from "react";
import { driveModeLabel, fanSpeedLabel, statusLabel, type AcpFacility } from "@/lib/fit-mocks/acp";

interface AcpFanModalProps {
  readonly facility: AcpFacility | null;
  readonly onClose: () => void;
}

/**
 * 원본 acp.html 의 `#modalFan` — 에어컨 온도설정.
 *
 * 설정온도만 입력 가능하고 나머지는 `eInputReadOnly` 다.
 * 원본과 동일하게 DOM 에 두고 `.disable` 로 토글한다.
 */
export function AcpFanModal({ facility, onClose }: AcpFanModalProps) {
  const [setTemperature, setSetTemperature] = useState("");

  useEffect(() => {
    if (facility) setSetTemperature(String(facility.setTemperature));
  }, [facility]);

  return (
    <div className={facility ? undefined : "disable"} id="modalFan">
      <div className="modal">
        <div className="modalBox">
          <i className="modalClose" id="modalFanActClose" role="button" aria-label="닫기" onClick={onClose} />
          <div className="modalContent">
            <div className="editTitle">에어컨 온도설정</div>
            <div className="inBody">
              <div>운전모드</div>
              <div>
                <input className="eInput eInputReadOnly" id="fanDriveMode" readOnly value={facility ? driveModeLabel(facility.driveMode) : ""} />
              </div>

              <div>설비이름</div>
              <div>
                <input className="eInput eInputReadOnly" id="fanAirName" readOnly value={facility?.airName ?? ""} />
              </div>

              <div>동작상태</div>
              <div>
                <input className="eInput eInputReadOnly" id="fanStatus" readOnly value={facility ? statusLabel(facility.status) : ""} />
              </div>

              <div>현재온도</div>
              <div>
                <input className="eInput eInputReadOnly" id="fanTemperature" readOnly value={facility ? `${facility.temperature}℃` : ""} />
              </div>

              <div>설정온도</div>
              <div>
                <input
                  type="number"
                  className="eInput"
                  id="fanSetTemperature"
                  value={setTemperature}
                  onChange={(event) => setSetTemperature(event.target.value)}
                />
              </div>

              <div>풍량</div>
              <div>
                <input className="eInput eInputReadOnly" id="fanFanspeed" readOnly value={facility ? fanSpeedLabel(facility.fanspeed) : ""} />
              </div>
            </div>
          </div>
          <div className="modalTool">
            <span className="modalAct" id="modalFanActDone" role="button" onClick={onClose}>
              확인
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
