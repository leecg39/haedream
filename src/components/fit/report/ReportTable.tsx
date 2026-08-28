import {
  REPORT_FRUGAL_YM,
  buildUseText,
  formatNumber,
  type ReportComputedRow,
  type ReportTotals,
} from "@/lib/fit-mocks/report";

/** 저압 전환월은 `change`, 이후는 `low` 마커를 붙인다. (원본 report.js 동일) */
function dateClass(yyyymm: string): string {
  const value = parseInt(yyyymm, 10);
  if (REPORT_FRUGAL_YM <= 0) {
    return "";
  }
  if (REPORT_FRUGAL_YM === value) {
    return "change";
  }
  return REPORT_FRUGAL_YM < value ? "low" : "";
}

function ReportTableRow({ row }: { readonly row: ReportComputedRow }) {
  const useText = buildUseText(
    row.lloadUsekwh,
    row.mloadUsekwh,
    row.maxloadUsekwh,
    row.usePower,
  );
  return (
    <tr>
      <td className={`yyyymm ${dateClass(row.yyyymm)}`}>
        {row.yyyymm.substring(0, 4)}-{row.yyyymm.substring(4, 6)}
      </td>
      <td>{formatNumber(row.powerAble)}</td>
      <td title={useText}>{formatNumber(row.usePower)}</td>
      <td>{formatNumber(row.highBill)}</td>
      <td>{formatNumber(row.highUseBill)}</td>
      <td>{formatNumber(row.high)}</td>
      <td>{formatNumber(row.lowBill)}</td>
      <td>{formatNumber(row.lowUseBill)}</td>
      <td>{formatNumber(row.low)}</td>
      <td>{formatNumber(row.frugal)}</td>
    </tr>
  );
}

function ReportTableFoot({ totals }: { readonly totals: ReportTotals }) {
  const useText = buildUseText(
    totals.lloadUsekwh,
    totals.mloadUsekwh,
    totals.maxloadUsekwh,
    totals.lloadUsekwh + totals.mloadUsekwh + totals.maxloadUsekwh,
  );
  const monthly = totals.monthCount ? Math.round(totals.frugal / totals.monthCount) : 0;

  return (
    <tfoot id="itemFooter">
      <tr className="totalSum">
        <td>총계</td>
        <td>{formatNumber(totals.powerAble)}</td>
        <td title={useText}>{formatNumber(totals.usePower)}</td>
        <td>{formatNumber(totals.highBill)}</td>
        <td>{formatNumber(totals.highUseBill)}</td>
        <td>{formatNumber(totals.highSum)}</td>
        <td>{formatNumber(totals.lowBill)}</td>
        <td>{formatNumber(totals.lowUseBill)}</td>
        <td>{formatNumber(totals.lowSum)}</td>
        <td>{formatNumber(totals.frugal)}</td>
      </tr>
      <tr className="totalYear">
        <th colSpan={3}>연간 절감 금액</th>
        <td colSpan={7}>
          <span>{formatNumber(totals.frugal)}</span>
          (절감률: <span>{totals.rate}%</span>)
        </td>
      </tr>
      <tr className="totalMonth">
        <th colSpan={3}>월간 절감 금액</th>
        <td colSpan={7}>
          <span>{formatNumber(monthly)}</span>원
        </td>
      </tr>
    </tfoot>
  );
}

export type ReportTableProps = {
  /** 오름차순 데이터. 표는 원본과 동일하게 최신순으로 출력한다. */
  readonly rows: readonly ReportComputedRow[];
  readonly totals: ReportTotals;
};

export function ReportTable({ rows, totals }: ReportTableProps) {
  const descending = [...rows].reverse();

  return (
    <div className="tableBodyBox">
      <table id="deskTable">
        <thead>
          <tr>
            <th rowSpan={2}>날짜</th>
            <th rowSpan={2}>요금적용전력&#40;kW&#41;</th>
            <th rowSpan={2}>사용전력량&#40;kWh&#41;</th>
            <th colSpan={3}>전력 요금 &#40;고압&#41;</th>
            <th colSpan={3}>전력 요금 &#40;저압&#41;</th>
            <th rowSpan={2}>절감액</th>
          </tr>
          <tr>
            <th>기본요금</th>
            <th>전력량요금+a</th>
            <th>소계</th>
            <th>기본요금</th>
            <th>전력량요금+a</th>
            <th>소계</th>
          </tr>
        </thead>
        <tbody id="itemList">
          {descending.length === 0 ? (
            <tr>
              <td colSpan={10}>데이터가 없습니다.</td>
            </tr>
          ) : (
            descending.map((row) => <ReportTableRow key={row.yyyymm} row={row} />)
          )}
        </tbody>
        {descending.length === 0 ? (
          <tfoot id="itemFooter"></tfoot>
        ) : (
          <ReportTableFoot totals={totals} />
        )}
      </table>
    </div>
  );
}
