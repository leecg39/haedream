"use client";

import { useEffect, useState } from "react";
import type { AcpConfig } from "@/lib/fit-mocks/acp";

/** 원본 #acpRatePeak 게이지는 0~100 을 5 단위로 끊은 21칸이다. */
const RATE_STEPS = Array.from({ length: 21 }, (_, index) => index * 5);

const ACP_TYPE_OPTIONS = [
  { value: "0", label: "피크제어 사용안함" },
  { value: "1", label: "엘지 ACP4" },
  { value: "2", label: "엘지 ACP5" },
  { value: "3", label: "삼성 DMS 2.5" },
] as const;

const CONTROL_MODE_OPTIONS = [
  { value: "0", label: "수동(피크자동제어동작안함)" },
  { value: "1", label: "자동" },
] as const;

interface AcpConfigModalProps {
  readonly open: boolean;
  readonly config: AcpConfig;
  readonly onClose: () => void;
}

/**
 * 원본 acp.html 의 `#modal` — 시스템에어컨 피크제어설정.
 *
 * 원본은 모달을 DOM 에 두고 `.disable` 만 토글해 열고 닫는다
 * (`.disable { display:none !important }`). 조건부 렌더가 아니라 같은 방식을 쓴다.
 */
export function AcpConfigModal({ open, config, onClose }: AcpConfigModalProps) {
  const [draft, setDraft] = useState<AcpConfig>(config);

  // 설비를 바꾸면 원본도 해당 설비 설정을 다시 불러온다.
  useEffect(() => {
    setDraft(config);
  }, [config]);

  const update = <K extends keyof AcpConfig>(key: K, value: AcpConfig[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  return (
    <div className={open ? undefined : "disable"} id="modal">
      <div className="modal">
        <div className="modalBox">
          <i className="modalClose" id="modalActClose" role="button" aria-label="닫기" onClick={onClose} />
          <div className="modalContent">
            <div className="editTitle">시스템에어컨 피크제어설정</div>
            <div className="inBody">
              <div>에어컨 종류</div>
              <div>
                <select
                  className="eSelect"
                  id="acpType"
                  value={draft.acpType}
                  onChange={(event) => update("acpType", event.target.value)}
                >
                  {ACP_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="tip" data-tip="IP/PORT 변경시 최소 20초후 적용됩니다.">접속 아이피</div>
              <div>
                <input className="eInput" id="acpIp" value={draft.ip} onChange={(event) => update("ip", event.target.value)} />
              </div>

              <div>접속 포트</div>
              <div>
                <input className="eInput" id="acpPort" value={draft.portNo} onChange={(event) => update("portNo", event.target.value)} />
              </div>

              <div>접속 아이디</div>
              <div>
                <input className="eInput" id="acpId" value={draft.id} onChange={(event) => update("id", event.target.value)} />
              </div>

              <div>접속 패스워드</div>
              <div>
                <input className="eInput" id="acpPasswd" value={draft.passwd} onChange={(event) => update("passwd", event.target.value)} />
              </div>

              <div>내부연결 전용</div>
              <div>
                <input
                  type="checkbox"
                  id="acpIsLocal"
                  checked={draft.isLocal}
                  onChange={(event) => update("isLocal", event.target.checked)}
                />
              </div>

              <div className="tip" data-tip="피크제어시 목표 운전율">제어시 희망운전율</div>
              <div className="gaugeForm">
                <ul className="gaugeArea" id="acpRatePeak">
                  {RATE_STEPS.map((rate) => (
                    <li
                      className={rate === 0 || rate > draft.ratePeak ? "gauge off" : "gauge"}
                      data-rate={rate}
                      key={rate}
                      role="button"
                      aria-label={`${rate}%`}
                      onClick={() => update("ratePeak", rate)}
                    />
                  ))}
                </ul>
                <input type="number" className="eInput" value={draft.ratePeak} readOnly />
                <em>%</em>
              </div>

              <div>제어모드</div>
              <div>
                <select
                  className="eSelect"
                  id="acpControlMode"
                  value={draft.controlMode}
                  onChange={(event) => update("controlMode", event.target.value)}
                >
                  {CONTROL_MODE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="tip" data-tip="제어모드가 수동일때 상태변경을 할 수 있습니다.">동작상태 수동제어</div>
              <div>
                <span className="statBad">정지（미제어）</span>
                <span
                  className={draft.statPeak ? "toggle on" : "toggle"}
                  id="acpStatPeak"
                  role="button"
                  aria-pressed={draft.statPeak}
                  aria-label="동작상태 수동제어"
                  onClick={() => {
                    // 원본은 제어모드가 수동(0)일 때만 상태변경을 허용한다.
                    if (draft.controlMode === "0") update("statPeak", !draft.statPeak);
                  }}
                />
                <span className="statGood">운전（제어）</span>
              </div>
            </div>
          </div>
          <div className="modalTool">
            <span className="modalAct" id="modalActDone" role="button" onClick={onClose}>
              확인
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
