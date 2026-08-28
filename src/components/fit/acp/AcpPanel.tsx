"use client";

import { ACP_CONN_COLORS, ACP_DEFAULT_IDN, ACP_GAUGE_OFF_COLOR, ACP_UNITS, driveModeLabel, fanSpeedLabel, findAcpConfig, findAcpStat, statusLabel, type AcpFacility } from "@/lib/fit-mocks/acp";
import { AcpConfigModal } from "@/components/fit/acp/AcpConfigModal";
import { LIB_STYLES, PageStyles } from "@/components/fit/shared/PageStyles";
import { useState } from "react";

function Gauge({ active, colors }: { readonly active: number; readonly colors?: readonly string[] }) {
  return (
    <ul className="gaugeArea">
      {Array.from({ length: 20 }, (_, index) => (
        <li
          className={index < active ? "gauge on" : "gauge"}
          key={index}
          style={{ backgroundColor: index < active ? (colors?.[index] ?? "#afff7d") : ACP_GAUGE_OFF_COLOR }}
        />
      ))}
    </ul>
  );
}

export function AcpPanel() {
  const [idn, setIdn] = useState(ACP_DEFAULT_IDN);
  const [selected, setSelected] = useState<AcpFacility | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const stat = findAcpStat(idn);
  const config = findAcpConfig(idn);

  return (
    <>
      <PageStyles files={[...LIB_STYLES, "/fit/assets/css/deskLib.css", "/fit/assets/css/acp.css"]} />
      <main className="contents" id="contentsArea">
        <div className="kfeContent">
          <div className="kfeHead"><span className="kfeHeadLabel">시스템에어컨 관리</span><span className="kfeHeadSub"><span className="deskLabel">시스템에어컨</span><select className="eSelect" id="acpIdn" value={idn} onChange={(event) => setIdn(Number(event.target.value))}>{ACP_UNITS.map((unit) => <option key={unit.idn} value={unit.idn}>{unit.nickname}</option>)}</select></span></div>
          <div className="kfeBody">
            <div className="frozen">
              <div className="mapArea">
                <div className="mapHead"><span className="floorTitle" id="floorMapName">{stat.floorMap.floorMapName}</span></div>
                <div className="mapImageArea">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="floorMapImage" id="floorMapImage" src={stat.floorMap.floorFile} alt="냉난방제어 도면" />
                  <div className="mapPoints" id="floorMapPoints" style={{ width: "100%", height: "100%" }}>
                    {stat.facilities.map((facility) => <button key={facility.idn} type="button" className={`mapPoint ${facility.point.kind}`} style={{ top: facility.point.top, left: facility.point.left }} aria-label={facility.airName} onClick={() => setSelected(facility)}><span className="mapIcon" /></button>)}
                  </div>
                </div>
                <div className="mapDesk"><span className="floorLabel" id="floorPlanName">{stat.floorMap.floorName}</span></div>
              </div>
              <div className="deskArea">
                <div className="inBody">
                  <button className="actConfig active" id="actConfig" type="button" onClick={() => setConfigOpen(true)}>설정 <i className="icon iconGear" /></button>
                  <div>운전방식</div><div className="gaugeForm" id="acpPeakType">{stat.peakType}</div>
                  <div className="tip" data-tip="목표 운전율 표시">희망운전율</div><div className="gaugeForm"><Gauge active={Math.round(stat.rateHope / 5)} /><span>{stat.rateHope}%</span></div>
                  <div className="tip" data-tip="ACP5는 우선순위 제어상태 일때만 표시됩니다.">현재운전율</div><div className="gaugeForm"><Gauge active={Math.round(stat.rateCurrent / 5)} /><span>{stat.rateCurrent}%</span></div>
                  <div className="tip" data-tip="미래에너지 서버와 ACP 서버 연결상태 표시">통신상태</div><div className="gaugeForm"><span className="statBad">나쁨</span><Gauge active={stat.statConn} colors={ACP_CONN_COLORS} /><span className="statGood">좋음</span></div>
                  <div>제어동작상태</div><div><span className={stat.isOperation ? "disable tip" : "tip"} id="acpOperation">정지 (미제어)</span><span className={stat.isOperation ? "tip" : "disable tip"}>운전 (제어)</span></div>
                </div>
                <div className="deskTableBox lowBox"><table className="desk" id="deskTable"><thead><tr><th>운전모드</th><th>이름</th><th>동작상태</th><th>현재온도</th><th>설정온도</th><th>풍량</th></tr></thead><tbody id="deskList">{stat.facilities.map((facility) => <tr key={facility.idn} onClick={() => setSelected(facility)}><td>{driveModeLabel(facility.driveMode)}</td><td>{facility.airName}</td><td><span className={`chips ${facility.status === 1 ? "chipStop" : "chipStart"}`}>{statusLabel(facility.status)}</span></td><td>{facility.temperature}℃</td><td>{facility.setTemperature}℃</td><td>{fanSpeedLabel(facility.fanspeed)}</td></tr>)}</tbody></table></div>
              </div>
            </div>
          </div>
        </div>
        {selected ? (
          <div className="modal" role="dialog" aria-modal="true" aria-label="에어컨 상세"><div className="modalBox"><button className="modalClose" aria-label="닫기" onClick={() => setSelected(null)} /><div className="modalContent" style={{ padding: 36, minWidth: 340 }}><h2 className="editTitle">{selected.airName}</h2><p>운전모드: {driveModeLabel(selected.driveMode)}</p><p>동작상태: {statusLabel(selected.status)}</p><p>현재온도: {selected.temperature}℃ / 설정온도: {selected.setTemperature}℃</p><p>풍량: {fanSpeedLabel(selected.fanspeed)}</p></div></div></div>
        ) : null}
        <AcpConfigModal open={configOpen} config={config} onClose={() => setConfigOpen(false)} />
      </main>
    </>
  );
}
