"use client";

import { useState } from "react";

/** 원본 watt bad.html — 통신상태 불량 (분류 선택 후 조회). */
export function AbcBadStatus() {
  const [dataType, setDataType] = useState("0");
  const [searched, setSearched] = useState(false);

  return (
    <main className="contents" id="contentsArea">
      <h1 className="deskTitle">통신상태 불량</h1>
      <div className="sheetArea">
        <div className="deskTool">
          <span className="deskLabel">분류</span>
          <select className="select" id="dataType" value={dataType} onChange={(e) => setDataType(e.target.value)}>
            <option value="0">계측설비</option>
            <option value="1">제어설비</option>
          </select>
          <span className="act actIcon" id="act" role="button" onClick={() => setSearched(true)}>
            <i className="bi bi-search" />조회
          </span>
        </div>
        <div className="deskArea" id="sheetArea">
          {searched ? (
            <table className="desk">
              <thead>
                <tr><th>업체</th><th>설비</th><th>구분</th><th>마지막수신</th><th>경과</th></tr>
              </thead>
              <tbody>
                <tr><td>제2공장</td><td>용해로 RTU</td><td>{dataType === "0" ? "계측" : "제어"}</td><td>2026-08-29 07:41</td><td>1시간 34분</td></tr>
                <tr><td>제1공장</td><td>2호기 제어기</td><td>{dataType === "0" ? "계측" : "제어"}</td><td>2026-08-29 08:52</td><td>23분</td></tr>
              </tbody>
            </table>
          ) : null}
        </div>
      </div>
    </main>
  );
}
