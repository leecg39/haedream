"use client";

import type { StatFirm, StatOrderBy } from "@/lib/fit-mocks/stat";
import { echoNumber } from "./statUtils";

interface StatFirmListProps {
  readonly rows: readonly (StatFirm | null)[];
  readonly orderBy: StatOrderBy;
  readonly liveTick: number;
  readonly autoOrderBy: StatOrderBy;
  readonly selectedFid: number | null;
  readonly onOrderByChange: (orderBy: StatOrderBy) => void;
  readonly onSelect: (fid: number) => void;
}

const ORDER_OPTIONS: readonly { readonly value: StatOrderBy; readonly label: string }[] = [
  { value: "", label: "정렬 보기" },
  { value: "firmNameDESC", label: "업체명 내림차순" },
  { value: "firmNameASC", label: "업체명 오름차순" },
  { value: "thisPowerDESC", label: "실시간 전력 내림차순" },
  { value: "thisPowerASC", label: "실시간 전력 오름차순" },
  { value: "frugalRatioDESC", label: "절감률 내림차순" },
  { value: "frugalRatioASC", label: "절감률 오름차순" },
  { value: "frugalMonthDESC", label: "절감금액 내림차순" },
  { value: "frugalMonthASC", label: "절감금액 오름차순" },
];

function StatusIcons({ firm }: { readonly firm: StatFirm }) {
  return (
    <span>
      {firm.peak ? <span className="statusIcon warning" /> : null}
      {firm.netError ? <span className="statusIcon emergency" /> : null}
    </span>
  );
}

function DataRow({
  firm,
  index,
  active,
  onSelect,
}: {
  readonly firm: StatFirm | null;
  readonly index: number;
  readonly active: boolean;
  readonly onSelect: (fid: number) => void;
}) {
  if (!firm) {
    return (
      <li className="dataRow" key={`blank-${index}`}>
        <span />
        <span className="firmName" />
        <span />
        <span />
        <span />
        <span />
      </li>
    );
  }

  return (
    <li
      className={active ? "dataRow active" : "dataRow"}
      data-fid={firm.fid}
      onClick={() => onSelect(firm.fid)}
    >
      <StatusIcons firm={firm} />
      <span className="firmName">{firm.firmName}</span>
      <span>{echoNumber(firm.contractLimit)}</span>
      <span>{echoNumber(firm.thisPower)}</span>
      <span>{firm.frugalRatio}</span>
      <span>{echoNumber(firm.frugalMonth)}</span>
    </li>
  );
}

export function StatFirmList({
  rows,
  orderBy,
  liveTick,
  autoOrderBy,
  selectedFid,
  onOrderByChange,
  onSelect,
}: StatFirmListProps) {
  const autoOrderLabel = ORDER_OPTIONS.find((option) => option.value === autoOrderBy)?.label;

  return (
    <>
      <div className="listFilter">
        <div className="selectIcon">
          <i className="bi bi-justify-left"></i>
          <select
            id="orderBy"
            value={orderBy}
            onChange={(event) => onOrderByChange(event.target.value as StatOrderBy)}
          >
            {ORDER_OPTIONS.map((option) => (
              <option key={option.value || "none"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span
            className="liveUpdateBadge"
            role="status"
            aria-live="polite"
            title={`5초마다 실시간 갱신${autoOrderLabel ? ` · ${autoOrderLabel}` : ""}`}
            data-tick={liveTick}
          >
            <span className="liveUpdateDot" />
            LIVE <strong>5s</strong>
          </span>
        </div>
        <div className="listStatus">
          <span className="statusIcon"></span> 제안 <span className="statusIcon good"></span> 정상{" "}
          <span className="statusIcon emergency"></span> 통신불량{" "}
          <span className="statusIcon warning"></span> 피크발생
        </div>
      </div>
      <div className="listCover">
        <div className="list">
          <ul className="listHeader">
            <li className="headerRow">
              <div className="column"></div>
              <div className="column firmName">업체명</div>
              <div className="column">
                계약전력
                <br />
                (kW)
              </div>
              <div className="column">
                실시간 전력
                <br />
                (kW)
              </div>
              <div className="column">
                절감률
                <br />
                (%/월별)
              </div>
              <div className="column">
                절감금액
                <br />
                (원/월별)
              </div>
            </li>
          </ul>
          <ul className="listBody" id="firmList" key={liveTick}>
            {rows.map((firm, index) => (
              <DataRow
                key={firm ? firm.fid : `blank-${index}`}
                firm={firm}
                index={index}
                active={firm !== null && firm.fid === selectedFid}
                onSelect={onSelect}
              />
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
