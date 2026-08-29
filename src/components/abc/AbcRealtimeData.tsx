"use client";

import { useMemo, useState } from "react";

/** 원본 watt net.html — RTU/노드 실시간 데이터 (2단 그리드). */
const RTU_ROWS = [
  { loadId: "1001", name: "본관 수전", gate: "4107", loadNo: "1", len: "12", data: "382,540,1196,..." },
  { loadId: "1002", name: "압연 MCC", gate: "4108", loadNo: "2", len: "12", data: "381,318,742,..." },
] as const;

const NODE_ROWS = [
  { key: "N01", type: "PLC", name: "1호기 제어기", gate: "4107", node: "N01", len: "8", data: "01,00,FF,A2,..." },
  { key: "N02", type: "PLC", name: "2호기 제어기", gate: "4108", node: "N02", len: "8", data: "00,00,00,00,..." },
] as const;

/**
 * 원본 watt net.html — 실시간 데이터.
 * .note 는 grid-template-columns:1fr 4fr 1fr 1fr 1fr 8fr 인 6열 그리드라
 * 행마다 6개의 개별 span 을 flat 하게 나열해야 한다(합쳐진 텍스트 span 하나면 깨진다).
 * 원본은 실시간 폴링으로 이 grid 에 행을 계속 append 하지만, 클론은 실시간 통신 없이
 * 정적 데모 행으로 레이아웃만 재현한다.
 */
export function AbcRealtimeData() {
  const [filter, setFilter] = useState("");
  const [paused, setPaused] = useState(false);

  const rtuRows = useMemo(
    () => RTU_ROWS.filter((r) => !filter || r.gate.includes(filter)),
    [filter],
  );
  const nodeRows = useMemo(
    () => NODE_ROWS.filter((r) => !filter || r.gate.includes(filter)),
    [filter],
  );

  return (
    <main className="contents" id="contentsArea">
      <h1 className="deskTitle">실시간 데이터</h1>
      <div className="sheetArea">
        <div className="deskTool">
          <span className="deskLabel">필터 </span>
          <input
            className="input"
            id="filterGate"
            maxLength={8}
            placeholder="gate"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <span className="act space" id="togglePause" role="button" onClick={() => setPaused((v) => !v)}>
            <i className={paused ? "bi bi-play-circle" : "bi bi-stop-circle"} />
            {paused ? "업데이트 재개" : "업데이트 멈춤"}
          </span>
        </div>
        <div className="noteTwin">
          <div className="note" id="itemListRTU">
            <span>LoadID</span><span>Name</span><span>Gate</span><span>LoadNo</span><span>Len</span><span>Data</span>
            {rtuRows.map((r) => (
              <>
                <span className="noteText" key={`${r.loadId}-id`}>{r.loadId}</span>
                <span className="noteText" key={`${r.loadId}-name`}>{r.name}</span>
                <span className="noteText" key={`${r.loadId}-gate`}>{r.gate}</span>
                <span className="noteText" key={`${r.loadId}-no`}>{r.loadNo}</span>
                <span className="noteText" key={`${r.loadId}-len`}>{r.len}</span>
                <span className="noteText" key={`${r.loadId}-data`}>{r.data}</span>
              </>
            ))}
          </div>
          <div className="note" id="itemListNODE">
            <span>Type</span><span>Name</span><span>Gate</span><span>Node</span><span>Len</span><span>Data</span>
            {nodeRows.map((r) => (
              <>
                <span className="noteText" key={`${r.key}-type`}>{r.type}</span>
                <span className="noteText" key={`${r.key}-name`}>{r.name}</span>
                <span className="noteText" key={`${r.key}-gate`}>{r.gate}</span>
                <span className="noteText" key={`${r.key}-node`}>{r.node}</span>
                <span className="noteText" key={`${r.key}-len`}>{r.len}</span>
                <span className="noteText" key={`${r.key}-data`}>{r.data}</span>
              </>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
