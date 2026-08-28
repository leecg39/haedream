"use client";

import { useState, type FormEvent } from "react";

type DeviceCategory = "meter" | "control";

const CATEGORY_LABELS: Record<DeviceCategory, string> = {
  meter: "계측설비",
  control: "제어설비",
};

export function BadStatus() {
  const [category, setCategory] = useState<DeviceCategory>("meter");
  const [queriedCategory, setQueriedCategory] = useState<DeviceCategory | null>(null);

  const search = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setQueriedCategory(category);
  };

  return (
    <main className="contents bad-status" id="contentsArea">
      <h1 className="deskTitle">통신상태 불량</h1>
      <section className="admin-panel" aria-labelledby="bad-status-table-title">
        <form className="status-tools" onSubmit={search}>
          <label htmlFor="device-category">분류</label>
          <select
            id="device-category"
            onChange={(event) => setCategory(event.target.value as DeviceCategory)}
            value={category}
          >
            <option value="meter">계측설비</option>
            <option value="control">제어설비</option>
          </select>
          <button type="submit">조회</button>
        </form>

        <h2 className="sr-only" id="bad-status-table-title">통신상태 불량 설비 목록</h2>
        <div className="table-scroll">
          <table className="status-table">
            <caption className="sr-only">
              통신상태가 불량한 설비의 장치 번호, 업체, 타입, 이름, 갱신일
            </caption>
            <thead>
              <tr>
                <th scope="col">DEVICE</th>
                <th scope="col">업체</th>
                <th scope="col">타입</th>
                <th scope="col">이름</th>
                <th scope="col">갱신일</th>
              </tr>
            </thead>
            <tbody>
              {queriedCategory ? (
                <tr>
                  <td className="empty-result" colSpan={5}>
                    <span aria-live="polite" role="status">
                      조회된 {CATEGORY_LABELS[queriedCategory]} 통신 불량 설비가 없습니다.
                    </span>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <style>{`
        .bad-status .admin-panel {
          min-height: 171px;
          padding: 32px;
          border: 1px solid rgba(255, 255, 255, .15);
          background: rgba(0, 0, 29, .4);
          box-sizing: border-box;
        }
        .bad-status .status-tools {
          display: flex;
          min-height: 40px;
          margin: 0 0 16px;
          align-items: center;
          gap: 10px;
        }
        .bad-status .status-tools label {
          color: #72bce3;
          font-size: 15px;
          font-weight: 500;
        }
        .bad-status .status-tools select {
          width: 156px;
          height: 40px;
          padding: 0 34px 0 10px;
          border: 1px solid #5190a5;
          border-radius: 4px;
          outline: none;
          background: transparent;
          color: #fff;
          color-scheme: dark;
          font: inherit;
        }
        .bad-status .status-tools select:focus {
          border-color: #72bce3;
          box-shadow: 0 0 0 2px rgba(114, 188, 227, .2);
        }
        .bad-status .status-tools option {
          background: #080818;
        }
        .bad-status .status-tools button {
          height: 40px;
          padding: 0 24px;
          border: 0;
          border-radius: 4px;
          background: #2062bf;
          color: #fff;
          font: inherit;
          cursor: pointer;
        }
        .bad-status .status-tools button:hover,
        .bad-status .status-tools button:focus-visible {
          background: #2b76df;
        }
        .bad-status .table-scroll {
          width: 100%;
          overflow-x: auto;
          scrollbar-color: #2b59a2 rgba(19, 21, 24, .5);
        }
        .bad-status .status-table {
          width: 100%;
          min-width: 590px;
          border-collapse: collapse;
          table-layout: fixed;
          color: #c8c8c8;
          text-align: center;
          font-variant-numeric: tabular-nums;
        }
        .bad-status .status-table th,
        .bad-status .status-table td {
          height: 42px;
          padding: 9px 12px;
          border: 1px solid rgba(255, 255, 255, .1);
          box-sizing: border-box;
        }
        .bad-status .status-table thead th {
          background: rgba(4, 56, 140, .4);
          color: #fff;
          font-size: 14px;
          font-weight: 500;
          white-space: nowrap;
        }
        .bad-status .status-table thead th:nth-child(1) { width: 105px; }
        .bad-status .status-table thead th:nth-child(2) { width: 125px; }
        .bad-status .status-table thead th:nth-child(3) { width: 105px; }
        .bad-status .status-table thead th:nth-child(4) { width: 135px; }
        .bad-status .status-table thead th:nth-child(5) { width: 120px; }
        .bad-status .empty-result {
          height: 48px;
          background: rgba(18, 18, 30, .58);
          color: #9cabbc;
          font-size: 14px;
        }
        .bad-status .sr-only {
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
          main.bad-status {
            padding: 16px;
          }
          .bad-status .admin-panel {
            padding: 16px;
          }
        }
      `}</style>
    </main>
  );
}
