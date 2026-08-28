"use client";

import { LIB_STYLES, PageStyles } from "@/components/fit/shared/PageStyles";

const PANEL_ROWS = [
  ["1", "1호기 터보냉동기", true, "1", "24.8", "48", "220", "219", "4.2", "3.9"],
  ["2", "2호기 터보냉동기", false, "2", "25.3", "51", "220", "0", "4.1", "0"],
  ["3", "공조기 AHU-1", true, "3", "26.1", "55", "220", "218", "2.8", "2.5"],
  ["4", "공조기 AHU-2", true, "4", "25.7", "53", "220", "221", "2.7", "2.6"],
  ["5", "냉각탑 송풍팬", false, "5", "28.4", "62", "220", "0", "1.9", "0"],
  ["6", "공기압축기 A동", true, "6", "29.1", "44", "380", "378", "7.4", "7.1"],
] as const;

export function PeakPanel() {
  return (
    <>
      <PageStyles files={[...LIB_STYLES, "/fit/assets/css/peakPanel.css"]} />
      <main className="contents" id="contentsArea">
        <h1 className="deskTitle">부하 상황판</h1>
        <div className="sheetArea">
          <table className="sheet">
            <thead><tr><th>No.</th><th>부하이름</th><th>상태</th><th>우선순위</th><th>온도(℃)</th><th>습도(%)</th><th>입력(V)</th><th>출력(V)</th><th>입력(mA)</th><th>출력(mA)</th></tr></thead>
            <tbody id="itemList">
              {PANEL_ROWS.map((row) => (
                <tr key={row[0]}>
                  <td>{row[0]}</td><td>{row[1]}</td>
                  <td><span className={row[2] ? "panelStat active" : "panelStat"}><span className="panelBar" /> {row[2] ? "운전" : "정지"}</span></td>
                  {row.slice(3).map((value, index) => <td key={index}>{value}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
