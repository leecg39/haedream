"use client";

import { LIB_STYLES, PageStyles } from "@/components/fit/shared/PageStyles";
import { REPORT_DEFAULT_PERIOD, REPORT_MONTHLY_ROWS, computeRows, computeTotals, filterByPeriod } from "@/lib/fit-mocks/report";
import { ReportChart } from "@/components/fit/report/ReportChart";
import { ReportSavings } from "@/components/fit/report/ReportSavings";
import { ReportSummary } from "@/components/fit/report/ReportSummary";
import { ReportTable } from "@/components/fit/report/ReportTable";
import { useMemo, useState } from "react";

export function ReportDashboard() {
  const [draftStart, setDraftStart] = useState<string>(REPORT_DEFAULT_PERIOD.start);
  const [draftEnd, setDraftEnd] = useState<string>(REPORT_DEFAULT_PERIOD.end);
  const [period, setPeriod] = useState<{ start: string; end: string }>(REPORT_DEFAULT_PERIOD);
  const rows = useMemo(
    () => computeRows(filterByPeriod(REPORT_MONTHLY_ROWS, period.start, period.end)),
    [period],
  );
  const totals = useMemo(() => computeTotals(rows), [rows]);

  return (
    <>
      <PageStyles files={[...LIB_STYLES, "/fit/assets/css/report.css"]} />
      <main className="contents" id="contentsArea">
        <div className="lowBox lowTopChart">
          <ReportSummary />
          <ReportChart rows={rows} />
          <ReportSavings totals={totals} />
          <div className="tableBtnBox business">
            <button className="exlBtn" id="print" onClick={() => window.print()}><i className="bi bi-printer-fill" />제안서 A</button>
            <button className="exlBtn" id="print2" onClick={() => window.print()}><i className="bi bi-printer-fill" />제안서 B<span className="disable factoring">(팩토링 선취)</span></button>
            <button className="exlBtn" id="truth" onClick={() => window.print()}><i className="bi bi-bag-check-fill" />사업 타당성 검토</button>
            <button className="exlBtn" id="print3" onClick={() => window.print()}><i className="bi bi-printer-fill" />제안서 C<span className="disable factoring">(팩토링 후취)</span></button>
            <button className="exlBtn" id="truth2" onClick={() => window.print()}><i className="bi bi-bag-check-fill" />사업 타당성 검토</button>
          </div>
        </div>
        <div className="lowBox lowBtmTable">
          <div className="tableInfoBox">
            <div className="tableDateBox"><label htmlFor="lowDateStart">기간</label><div className="lowDateInput"><div className="lowInputStart"><input type="month" className="lowDate" id="lowDateStart" value={draftStart} onChange={(event) => setDraftStart(event.target.value)} /><div>~</div></div><input type="month" className="lowDate" id="lowDateEnd" value={draftEnd} onChange={(event) => setDraftEnd(event.target.value)} /></div></div>
            <div className="tableBtnBox"><button className="searchBtn" id="search" onClick={() => setPeriod({ start: draftStart, end: draftEnd })}><i className="bi bi-search" />조회</button><button className="exlBtn" id="excel" onClick={() => window.print()}><i className="bi bi-file-earmark-arrow-down-fill" />엑셀로 저장</button></div>
          </div>
          <ReportTable rows={rows} totals={totals} />
        </div>
      </main>
    </>
  );
}
