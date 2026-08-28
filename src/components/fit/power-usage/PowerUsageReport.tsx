"use client";

import { useState } from "react";
import {
  getPowerUsageBoardInfo,
  POWER_USAGE_DAY_ROWS,
  POWER_USAGE_DAY_SUMMARY_ROWS,
  POWER_USAGE_DEMO_MONTH,
  POWER_USAGE_HOUR_ROWS,
  POWER_USAGE_HOUR_TOTAL,
  POWER_USAGE_MONTH_ROWS,
  type PowerUsageDataType,
} from "@/lib/fit-mocks/power-usage";
import { PowerUsageDaysTable } from "./PowerUsageDaysTable";
import { PowerUsageHoursTable } from "./PowerUsageHoursTable";
import { PowerUsageMonthsTable } from "./PowerUsageMonthsTable";

const isDataType = (value: string): value is PowerUsageDataType =>
  value === "hours" || value === "days" || value === "months";

/**
 * 원본 `powerUsage.js` 의 화면 동작을 목 데이터로 재현한다.
 *
 * - `#dataType` change → 표 전환 + `#datePickerWrap` / `#boardInfoPanel` 토글
 * - `#act` click → 현재 선택값으로 조회(목 데이터라 즉시 반영)
 * - `#actExcelSave` → XLSX 라이브러리를 쓰지 않으므로 마크업만 렌더(비활성)
 * - `#wrapper` 는 tui-date-picker 가 달라붙던 자리. 라이브러리 없이 표시만 한다.
 */
export function PowerUsageReport() {
  const [selectedType, setSelectedType] = useState<PowerUsageDataType>("hours");
  const [appliedType, setAppliedType] = useState<PowerUsageDataType>("hours");

  const handleTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value;
    if (!isDataType(next)) {
      return;
    }
    setSelectedType(next);
    setAppliedType(next);
  };

  const handleSearch = () => setAppliedType(selectedType);

  const boardInfo = getPowerUsageBoardInfo(appliedType);

  return (
    <>
      <h1 className="deskTitle" data-lang="report005">
        전력 사용 보고서
      </h1>
      <div className="deskTool">
        <span className="deskLabel">구분</span>
        <select
          className="selectbox"
          id="dataType"
          value={selectedType}
          onChange={handleTypeChange}
        >
          <option value="hours">일별</option>
          <option value="days">월별</option>
          <option value="months">연도별</option>
        </select>
        <div
          className={appliedType === "months" ? "datePickerWrap disable" : "datePickerWrap"}
          id="datePickerWrap"
        >
          <span className="deskLabel" data-lang="report014">
            날짜
          </span>
          <div className="datePicker">
            <div className="tui-datepicker-input tui-datetime-input tui-has-focus">
              <input
                type="text"
                className="inputDate"
                id="inputMonth"
                aria-label="Date-Time"
                readOnly
                value={POWER_USAGE_DEMO_MONTH}
              />
              <i className="bi bi-calendar"></i>
            </div>
            <div id="wrapper"></div>
          </div>
        </div>
        <span className="act actIcon" id="act" onClick={handleSearch}>
          <i className="bi bi-search"></i>
          <span data-lang="report012">조회</span>
        </span>
        <span className="act actIcon" id="actExcelSave">
          <i className="bi bi-file-earmark-excel-fill excel"></i>
          <span data-lang="report013">엑셀로 저장</span>
        </span>
        <span
          className={boardInfo ? "boardInfo" : "boardInfo disable"}
          id="boardInfoPanel"
        >
          <span className="boardInfoLabel">최대전력</span>
          <span id="boardInfoPower">{boardInfo?.power ?? ""}</span>
          <span className="boardInfoUnit">kWh</span>
          <span className="boardInfoSlash">/</span>
          <span className="boardInfoPowerDate" id="boardInfoPowerDate">
            {boardInfo?.powerDate ?? ""}
          </span>
          <span className="boardInfoLabel">최대피크</span>
          <span id="boardInfoPeak">{boardInfo?.peak ?? ""}</span>
          <span className="boardInfoUnit">kW</span>
          <span className="boardInfoSlash">/</span>
          <span id="boardInfoPeakDate">{boardInfo?.peakDate ?? ""}</span>
        </span>
      </div>
      <div className="sheetArea">
        <PowerUsageHoursTable
          rows={POWER_USAGE_HOUR_ROWS}
          totalRow={POWER_USAGE_HOUR_TOTAL}
          hidden={appliedType !== "hours"}
        />
        <PowerUsageDaysTable
          summaryRows={POWER_USAGE_DAY_SUMMARY_ROWS}
          dayRows={POWER_USAGE_DAY_ROWS}
          hidden={appliedType !== "days"}
        />
        <PowerUsageMonthsTable
          rows={POWER_USAGE_MONTH_ROWS}
          hidden={appliedType !== "months"}
        />
      </div>
    </>
  );
}
