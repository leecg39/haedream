import type { PowerUsageHourRow } from "@/lib/fit-mocks/power-usage";

const HOUR_COLUMNS = Array.from({ length: 24 }, (_, index) => index + 1);

interface PowerUsageHoursTableProps {
  readonly rows: readonly PowerUsageHourRow[];
  readonly totalRow: PowerUsageHourRow;
  readonly hidden: boolean;
}

function HoursRow({ row }: { readonly row: PowerUsageHourRow }) {
  return (
    <tr>
      <th data-t="s">{row.label}</th>
      <td data-z="#,##0">{row.total}</td>
      <td data-z="#,##0">{row.average}</td>
      <td data-z="#,##0">{row.max}</td>
      <td data-t="s">{row.maxTime}</td>
      <td data-z="#,##0">{row.peak}</td>
      <td data-t="s">{row.peakTime}</td>
      {row.hours.map((cell, index) => (
        <td key={index} data-z="#,##0" className={cell.className}>
          {cell.value}
        </td>
      ))}
    </tr>
  );
}

/** 원본 `#hoursTable` (구분: 일별). */
export function PowerUsageHoursTable({ rows, totalRow, hidden }: PowerUsageHoursTableProps) {
  return (
    <table className={hidden ? "sheet disable" : "sheet"} id="hoursTable">
      <thead>
        <tr>
          <th rowSpan={2} data-lang="report014">
            일자
          </th>
          <th rowSpan={2} data-lang="report050">
            전체
            <br />
            전력량
            <br />
            (<span className="sheetEm">kWh</span>)
          </th>
          <th rowSpan={2} data-lang="report051">
            평균
            <br />
            전력량
            <br />
            (<span className="sheetEm">kWh</span>)
          </th>
          <th rowSpan={2} data-lang="report052">
            최대
            <br />
            전력량
            <br />
            (<span className="sheetEm">kWh</span>)
          </th>
          <th rowSpan={2} data-lang="report052">
            최대
            <br />
            사용시간
          </th>
          <th rowSpan={2} data-lang="report054">
            피크
            <br />
            전력
            <br />
            (<span className="sheetEm">kW</span>)
          </th>
          <th rowSpan={2} data-lang="report054">
            피크
            <br />
            시간
          </th>
          <th colSpan={24} data-lang="report053">
            시간별 전력 사용량
            <br />
            (<span className="sheetEm">kWh</span>)
          </th>
        </tr>
        <tr>
          {HOUR_COLUMNS.map((hour) => (
            <th key={hour}>{hour}</th>
          ))}
        </tr>
      </thead>
      <tbody id="hoursList">
        {rows.map((row) => (
          <HoursRow key={row.label} row={row} />
        ))}
        <HoursRow row={totalRow} />
      </tbody>
    </table>
  );
}
