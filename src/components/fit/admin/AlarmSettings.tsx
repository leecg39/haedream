"use client";

import { useState } from "react";

interface AlarmDevice {
  readonly name: string;
  readonly voltage: string;
  readonly current: string;
  readonly power: string;
}

const DEVICE_NAMES = [
  "TR1",
  "TR2",
  "TR3",
  ...Array.from({ length: 9 }, (_, index) => [
    `다이캐스팅${index + 1} 메인`,
    `다이캐스팅${index + 1} 용탕A`,
    `다이캐스팅${index + 1} 용탕B`,
  ]).flat(),
  "컴프레셔1",
  "컴프레셔2",
  "컴프레셔3",
] as const;

const ALARM_DEVICES: readonly AlarmDevice[] = DEVICE_NAMES.map((name, index) => ({
  name,
  voltage: index === 0 ? "225.146 V" : `${(221.824 + (index % 7) * 0.637).toFixed(3)} V`,
  current: index === 0 ? "541.39 A" : `${(84.72 + (index * 37.61) % 473).toFixed(2)} A`,
  power: index === 0 ? "163.09 kW" : `${(25.41 + (index * 11.83) % 146).toFixed(2)} kW`,
}));

export function AlarmSettings() {
  const [enabledRows, setEnabledRows] = useState<ReadonlySet<string>>(
    () => new Set(ALARM_DEVICES.map((device) => device.name)),
  );
  const [savedRows, setSavedRows] = useState<ReadonlySet<string>>(() => new Set());

  const markDirty = (name: string) => {
    setSavedRows((current) => {
      const next = new Set(current);
      next.delete(name);
      return next;
    });
  };

  const toggleAlarm = (name: string) => {
    setEnabledRows((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
    markDirty(name);
  };

  const saveRow = (name: string) => {
    setSavedRows((current) => new Set(current).add(name));
  };

  return (
    <main className="contents alarm-settings" id="contentsArea">
      <h1 className="deskTitle">알람설정</h1>
      <section className="sheetArea setSub admin-panel" aria-labelledby="alarm-table-title">
        <h2 className="sr-only" id="alarm-table-title">설비별 SMS 알람 설정</h2>
        <div className="sheetScroll table-scroll">
          <table className="sheet alarm-table">
            <caption className="sr-only">
              설비의 현재 전기값과 SMS 알람 시간 및 최솟값, 최댓값 설정
            </caption>
            <colgroup>
              <col className="device-column" />
              <col className="current-column" span={3} />
              <col className="time-column" />
              <col className="metric-column" span={6} />
              <col className="alarm-column" />
              <col className="save-column" />
            </colgroup>
            <thead>
              <tr>
                <th rowSpan={2} scope="col">설비명</th>
                <th rowSpan={2} scope="col">현재전압</th>
                <th rowSpan={2} scope="col">현재전류</th>
                <th rowSpan={2} scope="col">현재전력</th>
                <th colSpan={9} scope="colgroup">SMS 알람 설정</th>
              </tr>
              <tr>
                <th scope="col">시간</th>
                <th scope="col">MIN 전압</th>
                <th scope="col">MAX 전압</th>
                <th scope="col">MIN 전류</th>
                <th scope="col">MAX 전류</th>
                <th scope="col">MIN 전력</th>
                <th scope="col">MAX 전력</th>
                <th scope="col">알람</th>
                <th scope="col">저장</th>
              </tr>
            </thead>
            <tbody>
              {ALARM_DEVICES.map((device) => {
                const isSaved = savedRows.has(device.name);
                return (
                  <tr key={device.name}>
                    <th className="device-name" scope="row">{device.name}</th>
                    <td className="current-value">{device.voltage}</td>
                    <td className="current-value">{device.current}</td>
                    <td className="current-value">{device.power}</td>
                    <td>
                      <div className="time-range">
                        <input
                          aria-label={`${device.name} 알람 시작 시간`}
                          defaultValue="09:00"
                          onInput={() => markDirty(device.name)}
                          type="time"
                        />
                        <span aria-hidden="true">~</span>
                        <input
                          aria-label={`${device.name} 알람 종료 시간`}
                          defaultValue="18:00"
                          onInput={() => markDirty(device.name)}
                          type="time"
                        />
                      </div>
                    </td>
                    {(["MIN 전압", "MAX 전압"] as const).map((label) => (
                      <td key={label}>
                        <input
                          aria-label={`${device.name} ${label}`}
                          className="number-input"
                          min="0"
                          onInput={() => markDirty(device.name)}
                          placeholder="0.0"
                          step="0.1"
                          type="number"
                        />
                      </td>
                    ))}
                    {(["MIN 전류", "MAX 전류", "MIN 전력", "MAX 전력"] as const).map((label) => (
                      <td key={label}>
                        <input
                          aria-label={`${device.name} ${label}`}
                          className="number-input"
                          min="0"
                          onInput={() => markDirty(device.name)}
                          placeholder="0"
                          step="0.1"
                          type="number"
                        />
                      </td>
                    ))}
                    <td>
                      <input
                        aria-label={`${device.name} SMS 알람 사용`}
                        checked={enabledRows.has(device.name)}
                        className="alarm-check"
                        onChange={() => toggleAlarm(device.name)}
                        type="checkbox"
                      />
                    </td>
                    <td className="save-cell">
                      <button
                        className={isSaved ? "save-button saved" : "save-button"}
                        onClick={() => saveRow(device.name)}
                        type="button"
                      >
                        {isSaved ? "완료" : "저장"}
                      </button>
                      <span aria-live="polite" className="save-status" role="status">
                        {isSaved ? "저장 완료" : ""}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <style>{`
        .alarm-settings .admin-panel {
          padding: 32px;
          border: 1px solid rgba(255, 255, 255, .15);
          background: rgba(0, 0, 29, .4);
        }
        .alarm-settings .table-scroll {
          width: 100%;
          height: calc(100vh - 230px);
          overflow: auto;
          scrollbar-color: #2b59a2 rgba(19, 21, 24, .5);
        }
        .alarm-settings .alarm-table {
          width: 100%;
          min-width: 1560px;
          border-collapse: collapse;
          table-layout: fixed;
          color: #c8c8c8;
          font-variant-numeric: tabular-nums;
          text-align: center;
        }
        .alarm-settings .alarm-table th,
        .alarm-settings .alarm-table td {
          height: 48px;
          padding: 7px 8px;
          border: 1px solid rgba(255, 255, 255, .1);
          box-sizing: border-box;
        }
        .alarm-settings .alarm-table thead th {
          background: rgba(4, 56, 140, .4);
          color: #fff;
          font-size: 14px;
          font-weight: 500;
          white-space: nowrap;
        }
        .alarm-settings .alarm-table thead {
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .alarm-settings .device-column { width: 148px; }
        .alarm-settings .current-column { width: 116px; }
        .alarm-settings .time-column { width: 238px; }
        .alarm-settings .metric-column { width: 92px; }
        .alarm-settings .alarm-column { width: 70px; }
        .alarm-settings .save-column { width: 92px; }
        .alarm-settings .alarm-table tbody tr {
          background: rgba(18, 18, 30, .58);
        }
        .alarm-settings .alarm-table tbody tr:nth-child(even) {
          background: rgba(25, 30, 55, .58);
        }
        .alarm-settings .alarm-table tbody tr:hover {
          background: rgba(43, 89, 162, .34);
        }
        .alarm-settings .device-name {
          background: rgba(11, 11, 22, .96);
          color: #72bce3;
          font-weight: 500;
          white-space: nowrap;
        }
        .alarm-settings .current-value {
          color: #d5eaf5;
          white-space: nowrap;
        }
        .alarm-settings input[type="time"],
        .alarm-settings .number-input {
          height: 32px;
          padding: 4px 7px;
          border: 1px solid #5190a5;
          border-radius: 4px;
          outline: none;
          background: transparent;
          color: #fff;
          box-sizing: border-box;
          color-scheme: dark;
          font: inherit;
        }
        .alarm-settings input[type="time"]:focus,
        .alarm-settings .number-input:focus {
          border-color: #72bce3;
          box-shadow: 0 0 0 2px rgba(114, 188, 227, .2);
        }
        .alarm-settings input[type="time"] {
          width: 106px;
        }
        .alarm-settings .number-input {
          width: 76px;
          text-align: right;
        }
        .alarm-settings .number-input::placeholder {
          color: rgba(255, 255, 255, .42);
        }
        .alarm-settings .time-range {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          white-space: nowrap;
        }
        .alarm-settings .alarm-check {
          width: 20px;
          height: 20px;
          margin: 0;
          accent-color: #2062bf;
          cursor: pointer;
        }
        .alarm-settings .save-cell {
          width: 92px;
        }
        .alarm-settings .save-button {
          width: 64px;
          height: 32px;
          padding: 0 10px;
          border: 0;
          border-radius: 4px;
          background: #2062bf;
          color: #fff;
          font: inherit;
          cursor: pointer;
        }
        .alarm-settings .save-button:hover,
        .alarm-settings .save-button:focus-visible {
          background: #2b76df;
        }
        .alarm-settings .save-status {
          display: block;
          height: 14px;
          margin-top: 3px;
          color: #73dfcf;
          font-size: 11px;
          line-height: 14px;
          white-space: nowrap;
        }
        .alarm-settings .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        @media (max-width: 768px) {
          .alarm-settings .admin-panel {
            padding: 10px 0;
          }
          .alarm-settings .table-scroll {
            height: auto;
          }
        }
      `}</style>
    </main>
  );
}
