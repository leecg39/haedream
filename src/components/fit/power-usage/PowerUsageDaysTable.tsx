import type { PowerUsageLabeledRow } from "@/lib/fit-mocks/power-usage";

const MONTH_COLUMNS = Array.from({ length: 12 }, (_, index) => `${index + 1}월`);

interface PowerUsageDaysTableProps {
  readonly summaryRows: readonly PowerUsageLabeledRow[];
  readonly dayRows: readonly PowerUsageLabeledRow[];
  readonly hidden: boolean;
}

function DaysRow({ row }: { readonly row: PowerUsageLabeledRow }) {
  return (
    <tr>
      <th>
        {row.unit ? (
          <>
            {row.label} (<span className="sheetEm">{row.unit}</span>)
          </>
        ) : (
          row.label
        )}
      </th>
      {row.cells.map((cell, index) => (
        <td key={index} data-z="#,##0">
          {cell}
        </td>
      ))}
    </tr>
  );
}

/** 원본 `#daysTable` (구분: 월별). */
export function PowerUsageDaysTable({
  summaryRows,
  dayRows,
  hidden,
}: PowerUsageDaysTableProps) {
  return (
    <table className={hidden ? "sheet disable" : "sheet"} id="daysTable">
      <thead>
        <tr>
          <th rowSpan={2}></th>
          <th colSpan={12}>
            전력 사용량 (<span className="sheetEm">kWh</span>)
          </th>
        </tr>
        <tr>
          {MONTH_COLUMNS.map((month) => (
            <th key={month}>{month}</th>
          ))}
        </tr>
      </thead>
      <tbody id="daysList">
        {summaryRows.map((row) => (
          <DaysRow key={row.label} row={row} />
        ))}
        {dayRows.map((row) => (
          <DaysRow key={row.label} row={row} />
        ))}
      </tbody>
    </table>
  );
}
