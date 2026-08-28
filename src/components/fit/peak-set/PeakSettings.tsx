"use client";

import { LIB_STYLES, PageStyles } from "@/components/fit/shared/PageStyles";
import { useState } from "react";

type PeakSettingState = {
  readonly powerLimit: string;
  readonly pctRatio: string;
  readonly pulseNum: string;
  readonly runMode: string;
  readonly onDelay: string;
  readonly offDelay: string;
  readonly safe: string;
  readonly firstDelay: string;
  readonly alarmTime: string;
  readonly controlMode: string;
};

const PEAK_SETTING_DEFAULTS: PeakSettingState = {
  powerLimit: "1500", pctRatio: "240", pulseNum: "1200", runMode: "1",
  onDelay: "30", offDelay: "60", safe: "5", firstDelay: "120", alarmTime: "30", controlMode: "0",
};

export function PeakSettings() {
  const [settings, setSettings] = useState(PEAK_SETTING_DEFAULTS);
  const [saved, setSaved] = useState(false);
  const set = (key: keyof PeakSettingState, value: string) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };
  const fields: readonly [keyof PeakSettingState, string, string, string, string][] = [
    ["powerLimit", "목표전력", "1~100000(kW)", "1", "65000"],
    ["pctRatio", "PCT 비율", "1~65000", "1", "65000"],
    ["pulseNum", "펄스정수", "1~65000", "1", "65000"],
    ["onDelay", "제어 On Delay", "1~900(second)", "1", "900"],
    ["offDelay", "제어 Off Delay", "1~900(second)", "1", "900"],
    ["safe", "안전 퍼센트", "0~50(%)", "0", "50"],
    ["firstDelay", "초기제어금지", "1~900(second)", "1", "900"],
    ["alarmTime", "알람유지시간", "0~900(second)", "0", "900"],
  ];
  return (
    <>
      <PageStyles files={[...LIB_STYLES, "/fit/assets/css/peakSet.css"]} />
      <main className="contents" id="contentsArea">
        <h1 className="deskTitle">피크 제어설정</h1>
        <div className="sheetArea">
          <table className="sheet">
            <thead><tr><th /><th>입력범위(단위)</th><th>현재값</th></tr></thead>
            <tbody>
              {fields.slice(0, 3).map(([key, label, range, min, max]) => (
                <tr key={key}><th>{label}</th><td>{range}</td><td><input className="input" type="number" min={min} max={max} value={settings[key]} onChange={(event) => set(key, event.target.value)} /></td></tr>
              ))}
              <tr><th>운전모드</th><td>수동/자동</td><td><select className="select" value={settings.runMode} onChange={(event) => set("runMode", event.target.value)}><option value="0">수동</option><option value="1">자동</option></select></td></tr>
              {fields.slice(3).map(([key, label, range, min, max]) => (
                <tr key={key}><th>{label}</th><td>{range}</td><td><input className="input" type="number" min={min} max={max} value={settings[key]} onChange={(event) => set(key, event.target.value)} /></td></tr>
              ))}
              <tr><th>제어방식</th><td>우선제어/순차제어</td><td><select className="select" value={settings.controlMode} onChange={(event) => set("controlMode", event.target.value)}><option value="0">우선</option><option value="1">순차</option></select></td></tr>
            </tbody>
          </table>
          <div className="actArea">
            <button className="act" id="actSave" type="button" onClick={() => setSaved(true)}>{saved ? "저장 완료" : "설정 저장"}</button>
          </div>
        </div>
      </main>
    </>
  );
}
