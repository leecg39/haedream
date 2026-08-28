import type { PowerUsageMonthRow } from "@/lib/fit-mocks/power-usage";

const MONTH_COLUMNS = Array.from({ length: 12 }, (_, index) => `${index + 1}월`);

interface PowerUsageMonthsTableProps {
  readonly rows: readonly PowerUsageMonthRow[];
  readonly hidden: boolean;
}

/** 원본 `#monthsTable` (구분: 연도별). thead 의 `colspan=31` 은 원본 그대로다. */
export function PowerUsageMonthsTable({ rows, hidden }: PowerUsageMonthsTableProps) {
  return (
    <table className={hidden ? "sheet disable" : "sheet"} id="monthsTable">
      <thead>
        <tr>
          <th rowSpan={2}>연도</th>
          <th rowSpan={2}>
            전체
            <br />
            전력량
            <br />
            (<span className="sheetEm">kWh</span>)
          </th>
          <th rowSpan={2}>
            평균
            <br />
            전력량
            <br />
            (<span className="sheetEm">kWh</span>)
          </th>
          <th rowSpan={2}>
            최대
            <br />
            전력량
            <br />
            (<span className="sheetEm">kWh</span>)
          </th>
          <th colSpan={31}>
            월별 전력 사용량 (<span className="sheetEm">kWh</span>)
          </th>
        </tr>
        <tr>
          {MONTH_COLUMNS.map((month) => (
            <th key={month}>{month}</th>
          ))}
        </tr>
      </thead>
      <tbody id="monthsList">
        {rows.map((row) => (
          <tr key={row.label}>
            <th>{row.label}</th>
            <td data-z="#,##0">{row.total}</td>
            <td data-z="#,##0">{row.average}</td>
            <td data-z="#,##0">{row.max}</td>
            {row.cells.map((cell, index) => (
              <td key={index} data-z="#,##0">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
