"use client";

import { LIB_STYLES, PageStyles } from "@/components/fit/shared/PageStyles";
import { echoNumber } from "@/components/fit/reduce/format";
import { useState } from "react";

const RESEARCH_CHARGES = [
  ["2026-08", "15일", "1,420 kW", "8,914,000", "42,868,000", "56,142,000", "108,420", "152,318", "84,112", "95%", "100%"],
  ["2026-07", "15일", "1,398 kW", "8,776,000", "45,902,000", "59,886,000", "111,205", "161,482", "91,306", "96%", "100%"],
  ["2026-06", "15일", "1,365 kW", "8,568,000", "39,451,000", "52,233,000", "102,118", "142,665", "77,018", "95%", "100%"],
] as const;

const RESEARCH_QUARTERS = Array.from({ length: 16 }, (_, index) => [
  `2026-08-${String(index + 1).padStart(2, "0")}`,
  `${String(9 + Math.floor(index / 4)).padStart(2, "0")}:${String((index % 4) * 15).padStart(2, "0")}`,
  echoNumber(1050 + index * 23),
]);

export function ResearchPanel() {
  const [tab, setTab] = useState<"charges" | "quarter">("charges");
  const [requested, setRequested] = useState(false);
  return (
    <>
      <PageStyles files={[...LIB_STYLES, "/fit/assets/css/deskLib.css", "/fit/assets/css/research.css"]} />
      <main className="contents" id="contentsArea">
        <h1 className="deskTitle">한전데이터 수집</h1>
        <div className="researchHead" id="researchInfo">
          <span className="researchLabel">전력타입</span><span className="researchInfoText" data-name="contract">산업용(을)고압A 선택Ⅱ</span>
          <span className="researchLabel">고객번호</span><span className="researchInfoText" data-name="kepcoCyber">1234567890</span>
          <span className="researchLabel">한전비번</span><span className="researchInfoText" data-name="kepcoPasswd">••••••••</span>
          <span className="researchLabel">스케줄 상태</span><span className="researchInfoText" data-name="kepcoStatus">{requested ? "수집 완료" : "매일 02:00"}</span>
          <span className="researchInfoText" data-name="kepcoTime">{requested ? "방금 업데이트" : "2026-08-28 02:04 업데이트"}</span>
          <button className={requested ? "researchAct" : "researchAct"} id="researchRequest" type="button" onClick={() => setRequested(true)}>
            {requested ? "수집 완료" : "수집 요청"}
          </button>
        </div>
        <div className="researchNav">
          <button className={tab === "charges" ? "toggleAct active" : "toggleAct"} id="researchCharges" onClick={() => setTab("charges")}>월별 요금정보</button>
          <button className={tab === "quarter" ? "toggleAct active" : "toggleAct"} id="researchQuarter" onClick={() => setTab("quarter")}>시간별 전력사용량 kW</button>
        </div>
        <div
          className="researchData"
          id="researchData"
          style={{ gridTemplateColumns: tab === "charges" ? "repeat(11,minmax(116px,1fr))" : "repeat(3,minmax(150px,1fr))" }}
        >
          {(tab === "charges"
            ? ["일자", "검침일", "요금적용전력", "기본요금", "전력량요금", "청구요금", "경부하전력량", "중부하전력량", "최대부하전력량", "지상역률", "진상역률"]
            : ["일자", "시간", "사용전력(kW)"]
          ).map((label) => <span className="researchDataLabel" key={label}>{label}</span>)}
          {(tab === "charges" ? RESEARCH_CHARGES : RESEARCH_QUARTERS).flatMap((row, rowIndex) =>
            row.map((value, index) => <span key={`${rowIndex}-${index}`}>{value}</span>),
          )}
        </div>
      </main>
    </>
  );
}
