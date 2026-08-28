"use client";

import { useState, type ChangeEvent, type KeyboardEvent } from "react";

import { formatNumber, type ReportTotals } from "@/lib/fit-mocks/report";

/**
 * `.lowMoney` — 평균 절감률 / 일·월·연 평균 절감액.
 *
 * 원본과 동일하게 `#frugalAvg` 를 클릭하면 `editMode` 가 붙어 `#edit-frugalRatio`
 * 입력으로 전환되고, Enter 또는 blur 시 값이 반영된다. (서버 저장은 하지 않는다)
 */
export type ReportSavingsProps = {
  readonly totals: ReportTotals;
};

function parseRatio(raw: string): number | null {
  const value = Number(raw.trim());
  return raw.trim() !== "" && Number.isFinite(value) ? value : null;
}

export function ReportSavings({ totals }: ReportSavingsProps) {
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState("");
  const [override, setOverride] = useState<number | null>(null);

  const ratio = override ?? totals.rate;

  const startEdit = () => {
    if (editMode) {
      return;
    }
    setDraft(String(ratio));
    setEditMode(true);
  };

  const commit = () => {
    setOverride(parseRatio(draft));
    setEditMode(false);
  };

  const handleKeyUp = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      commit();
    } else if (event.key === "Escape") {
      setEditMode(false);
    }
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDraft(event.target.value);
  };

  return (
    <div className="lowMoney" id="lowMoney">
      <div className="lowMonyBox">
        <span>
          <i className="bi bi-graph-down-arrow"></i> 평균 절감률
        </span>
        <p
          className={editMode ? "frugalAvg editMode" : "frugalAvg"}
          id="frugalAvg"
          onClick={startEdit}
        >
          <span className="frugalRatio" id="frugalRatio">
            {ratio}
          </span>
          <input
            type="text"
            className="frugalInput"
            id="edit-frugalRatio"
            value={draft}
            onChange={handleChange}
            onKeyUp={handleKeyUp}
            onBlur={commit}
            autoFocus={editMode}
          />
          %
        </p>
      </div>
      <div className="lowMonyBox">
        <span>일간 평균 절감액</span>
        <p>
          <span className="lowDay" id="avgFrugalDaily">
            {formatNumber(totals.avgFrugalDaily)}
          </span>
          원
        </p>
      </div>
      <div className="lowMonyBox">
        <span>월간 평균 절감액</span>
        <p>
          <span className="lowMon" id="avgFrugal">
            {formatNumber(totals.avgFrugal)}
          </span>
          원
        </p>
      </div>
      <div className="lowMonyBox">
        <span>연간 평균 절감액</span>
        <p>
          <span className="lowYear" id="avgFrugalYear">
            {formatNumber(totals.frugal)}
          </span>
          원
        </p>
      </div>
    </div>
  );
}
