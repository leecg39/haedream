"use client";

/** 원본 watt notify.html — 알람설정 (설비별 SMS 알람 임계값 시트). */
const ALARM_ROWS = [
  { name: "본관 수전", v: "382", a: "540", w: "1,196" },
  { name: "압연 MCC", v: "381", a: "318", w: "742" },
  { name: "용해로 반", v: "383", a: "612", w: "1,318" },
  { name: "공조 AHU-1", v: "381", a: "218", w: "842" },
] as const;

export function AbcAlarmSettings() {
  return (
    <main className="contents" id="contentsArea">
      <h1 className="deskTitle">알람설정</h1>
      <div className="sheetArea setSub">
        <div className="sheetScroll">
          <table className="sheet">
            <thead className="sheetSticky">
              <tr>
                <th className="tLabel" rowSpan={2}>설비명</th>
                <th rowSpan={2}>현재전압</th>
                <th rowSpan={2}>현재전류</th>
                <th rowSpan={2}>현재전력</th>
                <th colSpan={9} title="라인메신저">SMS 알람 설정</th>
              </tr>
              <tr>
                <th>시간</th>
                <th title="미만일때 알림">MIN.전압</th>
                <th title="초과일때 알림">MAX.전압</th>
                <th title="미만일때 알림">MIN.전류</th>
                <th title="초과일때 알림">MAX.전류</th>
                <th title="미만일때 알림">MIN.전력</th>
                <th title="초과일때 알림">MAX.전력</th>
                <th>알람</th>
                <th>저장</th>
              </tr>
            </thead>
            <tbody id="itemList">
              {ALARM_ROWS.map((r) => (
                <tr key={r.name}>
                  <th>{r.name}</th>
                  <td>{r.v}</td>
                  <td>{r.a}</td>
                  <td>{r.w}</td>
                  <td><input className="deskInput" defaultValue="09:00~18:00" size={9} /></td>
                  <td><input className="deskInput" defaultValue="370" size={4} /></td>
                  <td><input className="deskInput" defaultValue="395" size={4} /></td>
                  <td><input className="deskInput" defaultValue="0" size={4} /></td>
                  <td><input className="deskInput" defaultValue="800" size={4} /></td>
                  <td><input className="deskInput" defaultValue="0" size={4} /></td>
                  <td><input className="deskInput" defaultValue="1500" size={5} /></td>
                  <td><input type="checkbox" defaultChecked role="switch" /></td>
                  <td><span className="deskAct act" data-act="save" role="button">저장</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
