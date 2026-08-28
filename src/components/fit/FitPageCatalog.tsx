"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PowerUsageReport } from "@/components/fit/power-usage/PowerUsageReport";
import { RatePlanCompare } from "@/components/fit/rate-plan/RatePlanCompare";
import { ReduceChart } from "@/components/fit/reduce/ReduceChart";
import { ReduceGauge } from "@/components/fit/reduce/ReduceGauge";
import { caretClass, echoNumber } from "@/components/fit/reduce/format";
import { ReportChart } from "@/components/fit/report/ReportChart";
import { ReportSavings } from "@/components/fit/report/ReportSavings";
import { ReportSummary } from "@/components/fit/report/ReportSummary";
import { ReportTable } from "@/components/fit/report/ReportTable";
import { StatFirmList } from "@/components/fit/stat/StatFirmList";
import {
  ACP_CONN_COLORS,
  ACP_DEFAULT_IDN,
  ACP_GAUGE_OFF_COLOR,
  ACP_UNITS,
  driveModeLabel,
  fanSpeedLabel,
  findAcpConfig,
  findAcpStat,
  statusLabel,
  type AcpFacility,
} from "@/lib/fit-mocks/acp";
import {
  CONTROL_HIS_FACILITIES,
  CONTROL_HIS_LAST_DAY,
  CONTROL_HIS_MONTH,
  CONTROL_HIS_PAGE_SIZE,
  CONTROL_HIS_RECORDS,
  CONTROL_HIS_ROWS,
  buildSummary as buildControlSummary,
} from "@/lib/fit-mocks/control-his";
import {
  FIRM_CONTRACT_LABELS,
  FIRM_PAGE_LIMIT,
  FIRM_ROWS,
  FIRM_SERVICE_TYPE_LABELS,
  type FirmRow,
  type FirmSortKey,
} from "@/lib/fit-mocks/firm";
import {
  PEAK_USAGE_CONTRACT_KW,
  PEAK_USAGE_LATEST_MONTH,
  PEAK_USAGE_MIN_MONTH,
  buildPeakUsageMonth,
  formatKw,
} from "@/lib/fit-mocks/peak-usage";
import {
  REDUCE_DATA_TYPES,
  REDUCE_INITIAL_QUERY,
  buildReduceDataset,
  formatReduceDate,
  type ReduceDataType,
  type ReduceQuery,
} from "@/lib/fit-mocks/reduce";
import {
  REPORT_DEFAULT_PERIOD,
  REPORT_MONTHLY_ROWS,
  computeRows,
  computeTotals,
  filterByPeriod,
} from "@/lib/fit-mocks/report";
import {
  STAT_ALARMS,
  STAT_FIRMS,
  STAT_RANKING,
  STAT_ROWS_PER_PAGE,
  STAT_SUMMARY,
  buildPeakDetail,
  type StatOrderBy,
  type StatRankingPeriod,
} from "@/lib/fit-mocks/stat";
import {
  buildPageItems,
  echoMoneyAxis,
  echoNumber as echoStatNumber,
  pageRows,
  sortFirms,
  totalPages,
} from "@/components/fit/stat/statUtils";

export type FitCatalogPage =
  | "stat"
  | "firm"
  | "research"
  | "peak-panel"
  | "peak-set"
  | "power-usage"
  | "peak-usage"
  | "control-his"
  | "acp"
  | "rate-plan"
  | "reduce"
  | "report";

const LIB_STYLES = [
  "/fit/assets/css/lib/tom-select.css",
  "/fit/assets/css/lib/tui-date-picker.css",
] as const;

function PageStyles({ files }: { readonly files: readonly string[] }) {
  return (
    <>
      {files.map((href) => (
        <link key={href} rel="stylesheet" href={href} precedence="fit-page" />
      ))}
    </>
  );
}

function Pagination({
  page,
  pages,
  onChange,
}: {
  readonly page: number;
  readonly pages: number;
  readonly onChange: (page: number) => void;
}) {
  return (
    <div className="deskPages" id="deskPages">
      <button
        type="button"
        className="deskPage act"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        prev
      </button>
      {buildPageItems(page, pages).map((item, index) =>
        item === "…" ? (
          <span className="deskPage" key={`ellipsis-${index}`}>
            …
          </span>
        ) : (
          <button
            type="button"
            className={item === page ? "deskPage act active" : "deskPage act"}
            key={item}
            onClick={() => onChange(item)}
          >
            {item}
          </button>
        ),
      )}
      <button
        type="button"
        className="deskPage act"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        next
      </button>
    </div>
  );
}

function StatDashboard() {
  const [orderBy, setOrderBy] = useState<StatOrderBy>("");
  const [page, setPage] = useState(1);
  const [selectedFid, setSelectedFid] = useState<number | null>(null);
  const [period, setPeriod] = useState<StatRankingPeriod>("month");
  const sorted = useMemo(() => sortFirms(STAT_FIRMS, orderBy), [orderBy]);
  const pages = totalPages(sorted.length, STAT_ROWS_PER_PAGE);
  const rows = pageRows(sorted, page, STAT_ROWS_PER_PAGE);
  const selected = STAT_FIRMS.find((firm) => firm.fid === selectedFid);
  const detail = selected ? buildPeakDetail(selected) : null;
  const ranking = STAT_RANKING[period];
  const rankingMax = Math.max(...ranking.map((item) => item.frugal), 1);

  const handleOrder = (next: StatOrderBy) => {
    setOrderBy(next);
    setPage(1);
  };

  return (
    <>
      <PageStyles files={[...LIB_STYLES, "/fit/assets/css/stat.css"]} />
      <main className="contents" id="contentsArea">
        <section className="widget firmData">
          <StatFirmList
            rows={rows}
            orderBy={orderBy}
            selectedFid={selectedFid}
            onOrderByChange={handleOrder}
            onSelect={setSelectedFid}
          />
          <Pagination page={page} pages={pages} onChange={setPage} />
        </section>

        <section className="rightsection">
          <div className="widget until">
            <div className="title">참여 업체 수</div>
            <div className="untilData">
              <span className="label">제안</span>
              <div><span className="value countNumber" id="preCount">{STAT_SUMMARY.preCount}</span> <span className="unit">개</span></div>
            </div>
            <div className="untilData">
              <span className="label">설치</span>
              <div><span className="value countNumber" id="frugalCount">{STAT_SUMMARY.frugalCount}</span> <span className="unit">개</span></div>
            </div>
            <div className="title">총 누적 절감 금액</div>
            <div className="untilData">
              <span className="label">제안</span>
              <div><span className="value countNumber" id="preTotal">{echoStatNumber(STAT_SUMMARY.preTotal)}</span> <span className="unit">원</span></div>
            </div>
            <div className="untilData">
              <span className="label">설치</span>
              <div><span className="value countNumber" id="frugalTotal">{echoStatNumber(STAT_SUMMARY.frugalTotal)}</span> <span className="unit">원</span></div>
            </div>
            <hr />
            <div className="upday">
              <i className="bi bi-flag-fill" />
              <span id="updateTime">{STAT_SUMMARY.updateTime}</span> 업데이트
              <span>[D+<span id="elapsedTime">{STAT_SUMMARY.elapsedTime}</span>, <span id="startDate">{STAT_SUMMARY.startDate}</span> ~ ]</span>
            </div>
          </div>

          <div className="widget ranking">
            <div className="rankingTop">
              <div className="title">절감금액 랭킹 TOP 5</div>
              <div className="rankingFilter">
                <select
                  id="rankingFilter"
                  value={period}
                  onChange={(event) => setPeriod(event.target.value as StatRankingPeriod)}
                >
                  <option value="today">오늘</option>
                  <option value="week">이번주</option>
                  <option value="month">이번달</option>
                  <option value="year">올해</option>
                </select>
              </div>
            </div>
            <div className="rankingChart" id="rankingChart">
              {ranking.map((item) => (
                <div
                  key={item.firmName}
                  style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: 8, alignItems: "center", margin: "10px 0", fontSize: 12 }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.firmName}</span>
                  <span style={{ height: 8, borderRadius: 8, background: "rgba(255,255,255,.1)" }}>
                    <span style={{ display: "block", width: `${(item.frugal / rankingMax) * 100}%`, height: "100%", borderRadius: 8, background: "linear-gradient(90deg,#0041ff,#00ffff)" }} />
                  </span>
                  <span>{echoMoneyAxis(item.frugal)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="widget csBox">
            <div className="title">알림</div>
            <div className="cs" id="cs">
              {STAT_ALARMS.map((alarm) => (
                <div className="alarmItem" key={alarm.id}>
                  <div className="alarmCategory">{alarm.category}<span className="date">{alarm.date}</span></div>
                  <div className="alarmTitle"><span className="title">{alarm.title}</span></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div
          className="map"
          id="map"
          aria-label="업체 위치 지도 데모"
          style={{ background: "radial-gradient(circle at 46% 40%,rgba(0,255,255,.16),transparent 28%),linear-gradient(135deg,#101b31,#07101e)" }}
        />

        {detail ? (
          <div className="peakDetailWrap" id="peakDetailWrap" style={{ top: 90, right: 24, zIndex: 3 }}>
            <div className="peakDetail">
              <div className="kfeContent peakDetailData">
                <div className="peakFirmNameHeader">
                  <div className="peakDetailFirmName">{detail.firmName}</div>
                  <button className="overlayCloseButton" onClick={() => setSelectedFid(null)} aria-label="닫기"><i className="bi bi-x-lg" /></button>
                </div>
                <div className="peakDetailHead">
                  <div className="peakDetailColumn" />
                  <div className="peakDetailColumn">오늘</div><div className="peakDetailColumn">이번주</div>
                  <div className="peakDetailColumn">이번달</div><div className="peakDetailColumn">올해</div>
                </div>
                <div className="peakDetailContent">
                  {[
                    ["사용 전력", detail.usedWatt, "kW"],
                    ["절감률", detail.frugalRatio, "%"],
                    ["절감금액", detail.frugalAmount, "만원"],
                  ].map(([label, values, unit]) => {
                    const value = values as { today: number; week: number; month: number; year: number };
                    return (
                      <div className="peakDetailRow" key={label as string}>
                        <div className="peakDetailLabel">{label as string}<span className="peakDetailUnit">({unit as string})</span></div>
                        <div className="peakDetailRowValue">{echoStatNumber(value.today)}</div>
                        <div className="peakDetailRowValue">{echoStatNumber(value.week)}</div>
                        <div className="peakDetailRowValue">{echoStatNumber(value.month)}</div>
                        <div className="peakDetailRowValue">{echoStatNumber(value.year)}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="peakDetailFirmInfo">
                  <div className="peakDetailInfoItem">
                    <div className="peakDetailItemWrap"><div className="peakDetailItemLabel">총 절감금액</div><div className="peakDetailItemValue">{echoStatNumber(detail.frugalTotal)}원</div></div>
                    <div className="peakDetailItemWrap"><div className="peakDetailItemLabel">계약전력</div><div className="peakDetailItemValue">{echoStatNumber(detail.contractLimit)}kW</div></div>
                    <div className="peakDetailItemWrap"><div className="peakDetailItemLabel">검침일</div><div className="peakDetailItemValue">{detail.checkDay}일</div></div>
                  </div>
                  <div className="peakDetailInfoItem">
                    <div className="peakDetailItemWrap"><i className="bi bi-person" /><div className="peakDetailItemValue">{detail.manager}</div></div>
                    <div className="peakDetailItemWrap"><i className="bi bi-telephone" /><div className="peakDetailItemValue">{detail.phone}</div></div>
                    <div className="peakDetailItemWrap"><i className="bi bi-geo-alt" /><div className="peakDetailItemValue">{detail.addressText}</div></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </>
  );
}

const FIRM_SORT_OPTIONS: readonly { readonly key: FirmSortKey; readonly label: string }[] = [
  { key: "fid", label: "ID" },
  { key: "firmName", label: "이름" },
  { key: "contract", label: "전력타입" },
  { key: "kepcoNo", label: "한전고객번호" },
  { key: "registTime", label: "메모" },
];

function FirmManager() {
  const [serviceType, setServiceType] = useState(0);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<FirmSortKey>("fid");
  const [descending, setDescending] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<FirmRow | null>(null);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ko");
    const rows = FIRM_ROWS.filter((row) => {
      const serviceMatches = serviceType === 0 || row.serviceType === serviceType;
      const queryMatches =
        normalized.length === 0 ||
        row.firmName.toLocaleLowerCase("ko").includes(normalized) ||
        String(row.fid).includes(normalized) ||
        String(row.kepcoNo).includes(normalized);
      return serviceMatches && queryMatches;
    });
    return [...rows].sort((a, b) => {
      const left = a[sortKey];
      const right = b[sortKey];
      const result = typeof left === "number" && typeof right === "number"
        ? left - right
        : String(left).localeCompare(String(right), "ko");
      return descending ? -result : result;
    });
  }, [descending, query, serviceType, sortKey]);

  const pages = totalPages(filtered.length, FIRM_PAGE_LIMIT);
  const safePage = Math.min(page, pages);
  const visible = filtered.slice((safePage - 1) * FIRM_PAGE_LIMIT, safePage * FIRM_PAGE_LIMIT);
  const first = filtered.length === 0 ? 0 : (safePage - 1) * FIRM_PAGE_LIMIT + 1;
  const last = Math.min(safePage * FIRM_PAGE_LIMIT, filtered.length);

  const changeSort = (key: FirmSortKey) => {
    if (sortKey === key) setDescending((value) => !value);
    else {
      setSortKey(key);
      setDescending(false);
    }
  };

  return (
    <>
      <PageStyles files={[...LIB_STYLES, "/fit/assets/css/deskLib.css"]} />
      <main className="contents" id="contentsArea">
        <h1 className="deskTitle">업체관리</h1>
        <div className="sheetArea">
          <div className="deskStat">
            <div className="deskLimit"><span className="deskLabel" id="deskLimit">{first} - {last} / {filtered.length}</span></div>
            <div className="deskTool" id="deskTool">
              <button className="deskAct act" type="button" onClick={() => setSelected(FIRM_ROWS[0])}>추가</button>
              <button className="deskAct act" type="button" onClick={() => window.print()}>프린트</button>
              <Link href="/fit/rate-plan" className="deskAct act" id="chargeLink">요금표</Link>
              <Link href="/fit/research" className="deskAct act" id="researchLink">한전수집</Link>
            </div>
            <div className="deskPages">
              <select
                className="eSelect serviceType"
                id="serviceType"
                value={serviceType}
                onChange={(event) => { setServiceType(Number(event.target.value)); setPage(1); }}
              >
                <option value="0">서비스상태 선택</option>
                {[1, 2, 3, 11, 12, 13, 21, 22, 23].map((value) => (
                  <option value={value} key={value}>{FIRM_SERVICE_TYPE_LABELS[value]}</option>
                ))}
              </select>
              <span className="deskSearch">
                <input
                  className="deskInput"
                  id="deskInput"
                  maxLength={16}
                  aria-label="업체 검색"
                  value={query}
                  onChange={(event) => { setQuery(event.target.value); setPage(1); }}
                />
                <i className="icon iconSearch" />
              </span>
            </div>
          </div>
          <div className="deskArea">
            <table className="desk" id="deskTable">
              <thead>
                <tr id="deskSort">
                  {FIRM_SORT_OPTIONS.map((option) => (
                    <th
                      className={sortKey === option.key ? (descending ? "sort desc" : "sort asc") : "sort"}
                      data-sort={option.key}
                      key={option.key}
                      onClick={() => changeSort(option.key)}
                    >
                      {option.label}
                    </th>
                  ))}
                  <th>EOI</th><th>PCT</th><th>최근전력</th><th>목표전력</th>
                  <th>운전모드</th><th>제어방식</th><th>활성</th><th>서비스</th>
                </tr>
              </thead>
              <tbody id="deskList">
                {visible.map((row) => (
                  <tr key={row.fid} onClick={() => setSelected(row)}>
                    <td>{row.fid}</td>
                    <td>{row.firmName}</td>
                    <td title={FIRM_CONTRACT_LABELS[row.contract]}>{FIRM_CONTRACT_LABELS[row.contract] ?? row.contract}</td>
                    <td>{row.kepcoNo || "-"}</td>
                    <td>{row.eoiTime || "-"}</td>
                    <td>{row.pct_ratio}</td>
                    <td>{echoNumber(row.peakLast)}</td>
                    <td>{echoNumber(row.powerLimit)}</td>
                    <td>{row.peakRunMode ? "자동" : "수동"}</td>
                    <td>{row.peakControlMode ? "순차" : "우선"}</td>
                    <td>{row.isDisable ? "비활성" : "활성"}</td>
                    <td>{FIRM_SERVICE_TYPE_LABELS[row.serviceType]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="deskStat">
            <div className="deskLimit"><span className="deskLabel" id="deskStat">{first} - {last} / {filtered.length}</span></div>
            <Pagination page={safePage} pages={pages} onChange={setPage} />
          </div>
        </div>

        {selected ? (
          <div className="modal" role="dialog" aria-modal="true" aria-label="업체 상세">
            <div className="modalBox" style={{ width: "min(720px, calc(100vw - 40px))" }}>
              <button type="button" className="modalClose" aria-label="닫기" onClick={() => setSelected(null)} />
              <div className="modalContent" style={{ padding: 32 }}>
                <h2 className="editTitle">{selected.firmName}</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12 }}>
                  <span>업체 ID</span><strong>{selected.fid}</strong>
                  <span>담당자</span><strong>{selected.manager}</strong>
                  <span>연락처</span><strong>{selected.phone}</strong>
                  <span>주소</span><strong>{selected.addressText}</strong>
                  <span>계약전력</span><strong>{echoNumber(selected.contractLimit)} kW</strong>
                  <span>메모</span><strong>{selected.memo || "-"}</strong>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </>
  );
}

const RESEARCH_CHARGES = [
  ["2026-08", "15일", "1,420 kW", "8,914,000", "42,868,000", "56,142,000", "108,420", "152,318", "84,112", "95%", "100%"],
  ["2026-07", "15일", "1,398 kW", "8,776,000", "45,902,000", "59,886,000", "111,205", "161,482", "91,306", "96%", "100%"],
  ["2026-06", "15일", "1,365 kW", "8,568,000", "39,451,000", "52,233,000", "102,118", "142,665", "77,018", "95%", "100%"],
] as const;

const RESEARCH_QUARTERS = Array.from({ length: 16 }, (_, index) => [
  `2026-08-${String(index + 1).padStart(2, "0")}`,
  `${String(9 + Math.floor(index / 4)).padStart(2, "0")}:${String((index % 4) * 15).padStart(2, "0")}`,
  echoNumber(1050 + index * 23),
]);

function ResearchPanel() {
  const [tab, setTab] = useState<"charges" | "quarter">("charges");
  const [requested, setRequested] = useState(false);
  return (
    <>
      <PageStyles files={[...LIB_STYLES, "/fit/assets/css/deskLib.css", "/fit/assets/css/research.css"]} />
      <main className="contents" id="contentsArea">
        <h1 className="deskTitle">한전데이터 수집</h1>
        <div className="researchHead" id="researchInfo">
          <span className="researchLabel">전력타입</span><span className="researchInfoText" data-name="contract">산업용(을)고압A 선택Ⅱ</span>
          <span className="researchLabel">고객번호</span><span className="researchInfoText" data-name="kepcoCyber">1234567890</span>
          <span className="researchLabel">한전비번</span><span className="researchInfoText" data-name="kepcoPasswd">••••••••</span>
          <span className="researchLabel">스케줄 상태</span><span className="researchInfoText" data-name="kepcoStatus">{requested ? "수집 완료" : "매일 02:00"}</span>
          <span className="researchInfoText" data-name="kepcoTime">{requested ? "방금 업데이트" : "2026-08-28 02:04 업데이트"}</span>
          <button className={requested ? "researchAct" : "researchAct"} id="researchRequest" type="button" onClick={() => setRequested(true)}>
            {requested ? "수집 완료" : "수집 요청"}
          </button>
        </div>
        <div className="researchNav">
          <button className={tab === "charges" ? "toggleAct active" : "toggleAct"} id="researchCharges" onClick={() => setTab("charges")}>월별 요금정보</button>
          <button className={tab === "quarter" ? "toggleAct active" : "toggleAct"} id="researchQuarter" onClick={() => setTab("quarter")}>시간별 전력사용량 kW</button>
        </div>
        <div
          className="researchData"
          id="researchData"
          style={{ gridTemplateColumns: tab === "charges" ? "repeat(11,minmax(116px,1fr))" : "repeat(3,minmax(150px,1fr))" }}
        >
          {(tab === "charges"
            ? ["일자", "검침일", "요금적용전력", "기본요금", "전력량요금", "청구요금", "경부하전력량", "중부하전력량", "최대부하전력량", "지상역률", "진상역률"]
            : ["일자", "시간", "사용전력(kW)"]
          ).map((label) => <span className="researchDataLabel" key={label}>{label}</span>)}
          {(tab === "charges" ? RESEARCH_CHARGES : RESEARCH_QUARTERS).flatMap((row, rowIndex) =>
            row.map((value, index) => <span key={`${rowIndex}-${index}`}>{value}</span>),
          )}
        </div>
      </main>
    </>
  );
}

const PANEL_ROWS = [
  ["1", "1호기 터보냉동기", true, "1", "24.8", "48", "220", "219", "4.2", "3.9"],
  ["2", "2호기 터보냉동기", false, "2", "25.3", "51", "220", "0", "4.1", "0"],
  ["3", "공조기 AHU-1", true, "3", "26.1", "55", "220", "218", "2.8", "2.5"],
  ["4", "공조기 AHU-2", true, "4", "25.7", "53", "220", "221", "2.7", "2.6"],
  ["5", "냉각탑 송풍팬", false, "5", "28.4", "62", "220", "0", "1.9", "0"],
  ["6", "공기압축기 A동", true, "6", "29.1", "44", "380", "378", "7.4", "7.1"],
] as const;

function PeakPanel() {
  return (
    <>
      <PageStyles files={[...LIB_STYLES, "/fit/assets/css/peakPanel.css"]} />
      <main className="contents" id="contentsArea">
        <h1 className="deskTitle">부하 상황판</h1>
        <div className="sheetArea">
          <table className="sheet">
            <thead><tr><th>No.</th><th>부하이름</th><th>상태</th><th>우선순위</th><th>온도(℃)</th><th>습도(%)</th><th>입력(V)</th><th>출력(V)</th><th>입력(mA)</th><th>출력(mA)</th></tr></thead>
            <tbody id="itemList">
              {PANEL_ROWS.map((row) => (
                <tr key={row[0]}>
                  <td>{row[0]}</td><td>{row[1]}</td>
                  <td><span className={row[2] ? "panelStat active" : "panelStat"}><span className="panelBar" /> {row[2] ? "운전" : "정지"}</span></td>
                  {row.slice(3).map((value, index) => <td key={index}>{value}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}

type PeakSettingState = {
  readonly powerLimit: string;
  readonly pctRatio: string;
  readonly pulseNum: string;
  readonly runMode: string;
  readonly onDelay: string;
  readonly offDelay: string;
  readonly safe: string;
  readonly firstDelay: string;
  readonly alarmTime: string;
  readonly controlMode: string;
};

const PEAK_SETTING_DEFAULTS: PeakSettingState = {
  powerLimit: "1500", pctRatio: "240", pulseNum: "1200", runMode: "1",
  onDelay: "30", offDelay: "60", safe: "5", firstDelay: "120", alarmTime: "30", controlMode: "0",
};

function PeakSettings() {
  const [settings, setSettings] = useState(PEAK_SETTING_DEFAULTS);
  const [saved, setSaved] = useState(false);
  const set = (key: keyof PeakSettingState, value: string) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };
  const fields: readonly [keyof PeakSettingState, string, string, string, string][] = [
    ["powerLimit", "목표전력", "1~100000(kW)", "1", "65000"],
    ["pctRatio", "PCT 비율", "1~65000", "1", "65000"],
    ["pulseNum", "펄스정수", "1~65000", "1", "65000"],
    ["onDelay", "제어 On Delay", "1~900(second)", "1", "900"],
    ["offDelay", "제어 Off Delay", "1~900(second)", "1", "900"],
    ["safe", "안전 퍼센트", "0~50(%)", "0", "50"],
    ["firstDelay", "초기제어금지", "1~900(second)", "1", "900"],
    ["alarmTime", "알람유지시간", "0~900(second)", "0", "900"],
  ];
  return (
    <>
      <PageStyles files={[...LIB_STYLES, "/fit/assets/css/peakSet.css"]} />
      <main className="contents" id="contentsArea">
        <h1 className="deskTitle">피크 제어설정</h1>
        <div className="sheetArea">
          <table className="sheet">
            <thead><tr><th /><th>입력범위(단위)</th><th>현재값</th></tr></thead>
            <tbody>
              {fields.slice(0, 3).map(([key, label, range, min, max]) => (
                <tr key={key}><th>{label}</th><td>{range}</td><td><input className="input" type="number" min={min} max={max} value={settings[key]} onChange={(event) => set(key, event.target.value)} /></td></tr>
              ))}
              <tr><th>운전모드</th><td>수동/자동</td><td><select className="select" value={settings.runMode} onChange={(event) => set("runMode", event.target.value)}><option value="0">수동</option><option value="1">자동</option></select></td></tr>
              {fields.slice(3).map(([key, label, range, min, max]) => (
                <tr key={key}><th>{label}</th><td>{range}</td><td><input className="input" type="number" min={min} max={max} value={settings[key]} onChange={(event) => set(key, event.target.value)} /></td></tr>
              ))}
              <tr><th>제어방식</th><td>우선제어/순차제어</td><td><select className="select" value={settings.controlMode} onChange={(event) => set("controlMode", event.target.value)}><option value="0">우선</option><option value="1">순차</option></select></td></tr>
            </tbody>
          </table>
          <div className="actArea">
            <button className="act" id="actSave" type="button" onClick={() => setSaved(true)}>{saved ? "저장 완료" : "설정 저장"}</button>
          </div>
        </div>
      </main>
    </>
  );
}

function PowerUsagePage() {
  return (
    <>
      <PageStyles files={[...LIB_STYLES, "/fit/assets/css/powerUsage.css"]} />
      <main className="contents" id="contentsArea"><PowerUsageReport /></main>
    </>
  );
}

function PeakUsageChart({ values }: { readonly values: readonly number[] }) {
  const width = 960;
  const height = 250;
  const max = Math.max(...values, PEAK_USAGE_CONTRACT_KW);
  const points = values.map((value, index) => `${(index / Math.max(values.length - 1, 1)) * width},${height - (value / max) * (height - 20)}`).join(" ");
  const contractY = height - (PEAK_USAGE_CONTRACT_KW / max) * (height - 20);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" preserveAspectRatio="none" role="img" aria-label="15분 최대수요 추이">
      {[0.25, 0.5, 0.75].map((ratio) => <line key={ratio} x1="0" x2={width} y1={height * ratio} y2={height * ratio} stroke="rgba(255,255,255,.1)" />)}
      <line x1="0" x2={width} y1={contractY} y2={contractY} stroke="#ff005b" strokeDasharray="7 5" />
      <polyline points={points} fill="none" stroke="#00ffff" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function PeakUsageReport() {
  const [draftMonth, setDraftMonth] = useState(PEAK_USAGE_LATEST_MONTH);
  const [month, setMonth] = useState(PEAK_USAGE_LATEST_MONTH);
  const data = useMemo(() => buildPeakUsageMonth(month), [month]);
  const chartValues = data.days[0]?.slots.map((slot) => slot.usageKw) ?? [];

  return (
    <>
      <PageStyles files={[...LIB_STYLES, "/fit/assets/css/peakUsage.css"]} />
      <main className="contents" id="contentsArea">
        <h1 className="deskTitle" data-lang="report004">피크 15분 전력보고서</h1>
        <div className="chart1" id="chart1"><PeakUsageChart values={chartValues} /></div>
        <div className="deskTool">
          <span className="deskLabel">날짜</span>
          <div className="datePicker"><div className="tui-datepicker-input tui-datetime-input tui-has-focus">
            <input type="month" className="inputDate" id="inputMonth" min={PEAK_USAGE_MIN_MONTH} max={PEAK_USAGE_LATEST_MONTH} value={draftMonth} onChange={(event) => setDraftMonth(event.target.value)} />
            <i className="bi bi-calendar" />
          </div><div id="wrapper" /></div>
          <button className="act actIcon" id="act" type="button" onClick={() => setMonth(draftMonth)}><i className="bi bi-search" /> 조회</button>
          <button className="act actIcon" id="actExcelSave" type="button" onClick={() => window.print()}><i className="bi bi-file-earmark-excel-fill excel" /> 엑셀로 저장</button>
        </div>
        <div className="sheetArea">
          <table className="sheet" id="itemTable">
            <thead className="sticky"><tr><th rowSpan={2}>일자</th><th rowSpan={2}>분단위</th><th colSpan={24}>최대수요 ( <span className="sheetEm">kW</span> )</th></tr>
              <tr>{Array.from({ length: 24 }, (_, index) => <th key={index}>{index}</th>)}</tr>
            </thead>
            <tbody id="itemList">
              {data.days.flatMap((day) => day.quarters.map((quarter, quarterIndex) => (
                <tr key={`${day.date}-${quarter.quarter}`}>
                  {quarterIndex === 0 ? <th rowSpan={4}>{day.date}</th> : null}
                  <td>{quarter.label}</td>
                  {quarter.values.map((value, hour) => (
                    <td className={`${value === day.maxKw ? "wattMax " : ""}${quarter.kepcoHours.includes(hour) ? "underline" : ""}`.trim()} key={hour}>{formatKw(value)}</td>
                  ))}
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}

function ControlHeatChart({ facility }: { readonly facility: number }) {
  const records = facility === 0 ? CONTROL_HIS_RECORDS : CONTROL_HIS_RECORDS.filter((row) => row.cid === facility);
  const byCell = new Map(records.map((row) => [`${row.day}-${row.hour}`, row.goldManwon]));
  const cells = Array.from({ length: CONTROL_HIS_LAST_DAY * 24 }, (_, index) => {
    const day = Math.floor(index / 24) + 1;
    const hour = index % 24;
    return { day, hour, value: byCell.get(`${day}-${hour}`) ?? 0 };
  });
  return (
    <svg viewBox={`0 0 960 ${CONTROL_HIS_LAST_DAY * 13}`} width="100%" height="100%" preserveAspectRatio="none" role="img" aria-label="일자별 제어 히트맵">
      {cells.map((cell) => (
        <rect
          key={`${cell.day}-${cell.hour}`}
          x={cell.hour * 40 + 1}
          y={(cell.day - 1) * 13 + 1}
          width="37"
          height="10"
          rx="2"
          fill={cell.value ? `rgba(0,255,255,${Math.min(0.35 + cell.value / 4, 1)})` : "rgba(255,255,255,.04)"}
        />
      ))}
    </svg>
  );
}

function ControlHistory() {
  const [facility, setFacility] = useState(0);
  const [page, setPage] = useState(1);
  const filteredRows = CONTROL_HIS_ROWS.filter((row) => facility === 0 || row.cid === facility);
  const filteredRecords = CONTROL_HIS_RECORDS.filter((row) => facility === 0 || row.cid === facility);
  const summary = buildControlSummary(filteredRecords);
  const pages = totalPages(filteredRows.length, CONTROL_HIS_PAGE_SIZE);
  const safePage = Math.min(page, pages);
  const rows = filteredRows.slice((safePage - 1) * CONTROL_HIS_PAGE_SIZE, safePage * CONTROL_HIS_PAGE_SIZE);
  const start = filteredRows.length ? (safePage - 1) * CONTROL_HIS_PAGE_SIZE + 1 : 0;
  const end = Math.min(safePage * CONTROL_HIS_PAGE_SIZE, filteredRows.length);

  return (
    <>
      <PageStyles files={[...LIB_STYLES, "/fit/assets/css/controlHis.css"]} />
      <main className="contents" id="contentsArea">
        <h1 className="deskTitle">피크제어이력</h1>
        <div className="chart1" id="chart1"><ControlHeatChart facility={facility} /></div>
        <div className="deskToolWrap">
          <div className="deskPages"><span className="deskLabel">날짜</span><div className="datePicker"><div className="tui-datepicker-input tui-datetime-input tui-has-focus"><input type="month" className="inputDate" id="mDate" value={CONTROL_HIS_MONTH} readOnly /><i className="bi bi-calendar" /></div></div></div>
          <div className="deskLimit"><span className="deskLabel">제어설비</span><select className="deskSelect" id="facList" value={facility} onChange={(event) => { setFacility(Number(event.target.value)); setPage(1); }}><option value="0">설비 선택</option>{CONTROL_HIS_FACILITIES.map((item) => <option value={item.cid} key={item.cid}>{item.controlName}</option>)}</select></div>
          <div className="deskTool" id="deskTool"><button className="deskAct act" type="button" onClick={() => window.print()}><i className="bi bi-file-earmark-excel-fill excel" />엑셀로 다운</button><button className="deskAct act" type="button" onClick={() => window.print()}><i className="bi bi-printer" />프린트</button></div>
        </div>
        <div className="deskArea">
          <div className="tableCaption"><div><span className="captionTitle">총 제어시간</span><span className="splitUnit">:</span><span className="captionMark" id="energyTime">{summary.energyTime}</span></div><span className="splitUnit">/</span><div><span className="captionTitle">총 절감액</span><span className="splitUnit">:</span><span className="captionMark" id="energyGold">{summary.energyGold}</span></div><span className="splitUnit">/</span><div><span className="captionTitle">최대 절감액</span><span className="splitUnit">:</span><span className="captionMark" id="energyGoldMax">{summary.energyGoldMax}</span></div></div>
          <div className="sheetScroll"><table className="desk" id="deskTable"><thead><tr><th>CID</th><th>제어설비</th><th>제어시작</th><th>제어종료</th><th>예측전력</th><th>목표전력</th><th>제어시간</th><th>절감 (<span className="sheetEm">만원</span>)</th></tr></thead><tbody id="deskList">{rows.map((row) => <tr key={row.id}><td>{row.cid}</td><td>{row.facilityName}</td><td>{row.startText}</td><td>{row.endText}</td><td>{row.predictText}</td><td>{row.limitText}</td><td>{row.durationText}</td><td>{row.goldText}</td></tr>)}</tbody></table></div>
        </div>
        <div className="deskStat"><div className="deskLimit"><span className="deskLabel" id="deskStat">{start} - {end} / {filteredRows.length}</span></div><Pagination page={safePage} pages={pages} onChange={setPage} /></div>
      </main>
    </>
  );
}

function Gauge({ active, colors }: { readonly active: number; readonly colors?: readonly string[] }) {
  return (
    <ul className="gaugeArea">
      {Array.from({ length: 20 }, (_, index) => (
        <li
          className={index < active ? "gauge on" : "gauge"}
          key={index}
          style={{ backgroundColor: index < active ? (colors?.[index] ?? "#afff7d") : ACP_GAUGE_OFF_COLOR }}
        />
      ))}
    </ul>
  );
}

function AcpPanel() {
  const [idn, setIdn] = useState(ACP_DEFAULT_IDN);
  const [selected, setSelected] = useState<AcpFacility | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const stat = findAcpStat(idn);
  const config = findAcpConfig(idn);

  return (
    <>
      <PageStyles files={[...LIB_STYLES, "/fit/assets/css/deskLib.css", "/fit/assets/css/acp.css"]} />
      <main className="contents" id="contentsArea">
        <div className="kfeContent">
          <div className="kfeHead"><span className="kfeHeadLabel">시스템에어컨 관리</span><span className="kfeHeadSub"><span className="deskLabel">시스템에어컨</span><select className="eSelect" id="acpIdn" value={idn} onChange={(event) => setIdn(Number(event.target.value))}>{ACP_UNITS.map((unit) => <option key={unit.idn} value={unit.idn}>{unit.nickname}</option>)}</select></span></div>
          <div className="kfeBody">
            <div className="frozen">
              <div className="mapArea">
                <div className="mapHead"><span className="floorTitle" id="floorMapName">{stat.floorMap.floorMapName}</span></div>
                <div className="mapImageArea">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="floorMapImage" id="floorMapImage" src={stat.floorMap.floorFile} alt="냉난방제어 도면" />
                  <div className="mapPoints" id="floorMapPoints" style={{ width: "100%", height: "100%" }}>
                    {stat.facilities.map((facility) => <button key={facility.idn} type="button" className={`mapPoint ${facility.point.kind}`} style={{ top: facility.point.top, left: facility.point.left }} aria-label={facility.airName} onClick={() => setSelected(facility)}><span className="mapIcon" /></button>)}
                  </div>
                </div>
                <div className="mapDesk"><span className="floorLabel" id="floorPlanName">{stat.floorMap.floorName}</span></div>
              </div>
              <div className="deskArea">
                <div className="inBody">
                  <button className="actConfig active" id="actConfig" type="button" onClick={() => setConfigOpen(true)}>설정 <i className="icon iconGear" /></button>
                  <div>운전방식</div><div className="gaugeForm" id="acpPeakType">{stat.peakType}</div>
                  <div className="tip" data-tip="목표 운전율 표시">희망운전율</div><div className="gaugeForm"><Gauge active={Math.round(stat.rateHope / 5)} /><span>{stat.rateHope}%</span></div>
                  <div className="tip" data-tip="ACP5는 우선순위 제어상태 일때만 표시됩니다.">현재운전율</div><div className="gaugeForm"><Gauge active={Math.round(stat.rateCurrent / 5)} /><span>{stat.rateCurrent}%</span></div>
                  <div className="tip" data-tip="미래에너지 서버와 ACP 서버 연결상태 표시">통신상태</div><div className="gaugeForm"><span className="statBad">나쁨</span><Gauge active={stat.statConn} colors={ACP_CONN_COLORS} /><span className="statGood">좋음</span></div>
                  <div>제어동작상태</div><div><span className={stat.isOperation ? "disable tip" : "tip"} id="acpOperation">정지 (미제어)</span><span className={stat.isOperation ? "tip" : "disable tip"}>운전 (제어)</span></div>
                </div>
                <div className="deskTableBox lowBox"><table className="desk" id="deskTable"><thead><tr><th>운전모드</th><th>이름</th><th>동작상태</th><th>현재온도</th><th>설정온도</th><th>풍량</th></tr></thead><tbody id="deskList">{stat.facilities.map((facility) => <tr key={facility.idn} onClick={() => setSelected(facility)}><td>{driveModeLabel(facility.driveMode)}</td><td>{facility.airName}</td><td><span className={`chips ${facility.status === 1 ? "chipStop" : "chipStart"}`}>{statusLabel(facility.status)}</span></td><td>{facility.temperature}℃</td><td>{facility.setTemperature}℃</td><td>{fanSpeedLabel(facility.fanspeed)}</td></tr>)}</tbody></table></div>
              </div>
            </div>
          </div>
        </div>
        {selected ? (
          <div className="modal" role="dialog" aria-modal="true" aria-label="에어컨 상세"><div className="modalBox"><button className="modalClose" aria-label="닫기" onClick={() => setSelected(null)} /><div className="modalContent" style={{ padding: 36, minWidth: 340 }}><h2 className="editTitle">{selected.airName}</h2><p>운전모드: {driveModeLabel(selected.driveMode)}</p><p>동작상태: {statusLabel(selected.status)}</p><p>현재온도: {selected.temperature}℃ / 설정온도: {selected.setTemperature}℃</p><p>풍량: {fanSpeedLabel(selected.fanspeed)}</p></div></div></div>
        ) : null}
        {configOpen ? (
          <div className="modal" role="dialog" aria-modal="true" aria-label="ACP 설정"><div className="modalBox"><button className="modalClose" aria-label="닫기" onClick={() => setConfigOpen(false)} /><div className="modalContent" style={{ padding: 36, minWidth: 380 }}><h2 className="editTitle">ACP 설정</h2><div className="setArea"><span>서버</span><strong>{config.ip}:{config.portNo}</strong><span>운전율</span><strong>{config.ratePeak}%</strong><span>제어모드</span><strong>{config.controlMode === "1" ? "자동" : "수동"}</strong><span>연결방식</span><strong>{config.isLocal ? "로컬" : "원격"}</strong></div></div></div></div>
        ) : null}
      </main>
    </>
  );
}

function RatePlanPage() {
  return (
    <>
      <PageStyles files={[...LIB_STYLES, "/fit/assets/css/ratePlan.css"]} />
      <main className="contents" id="contentsArea"><div className="topTitle"><h1 className="deskTitle">전기 요금 비교</h1></div><RatePlanCompare /></main>
    </>
  );
}

function SummaryBox({
  title,
  className,
  values,
}: {
  readonly title: string;
  readonly className: string;
  readonly values: readonly { readonly label: string; readonly value: number; readonly unit: string }[];
}) {
  return (
    <div className={`lowBox ${className}`}>
      <div className={className === "lowPay" ? "lineBlue lineE" : "linePuple lineE"} />
      <h2>{title}</h2>
      <div className="dataBox">
        {values.map((item) => (
          <div key={item.label}>
            <h3>{item.label}</h3>
            <div className={className === "lowBefore" ? (item.value > 0 ? "beforValue bad" : "beforValue") : undefined}>
              {className === "lowBefore" ? <i className={caretClass(item.value)} /> : null}
              <span>{echoNumber(Math.abs(item.value))}</span>
            </div>
            <span>{item.unit}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReduceDashboard() {
  const [draft, setDraft] = useState<ReduceQuery>(REDUCE_INITIAL_QUERY);
  const [query, setQuery] = useState<ReduceQuery>(REDUCE_INITIAL_QUERY);
  const dataset = useMemo(() => buildReduceDataset(query), [query]);
  const update = <K extends keyof ReduceQuery>(key: K, value: ReduceQuery[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  return (
    <>
      <PageStyles files={[...LIB_STYLES, "/fit/assets/css/reduce.css"]} />
      <main className="contents" id="contentsArea">
        <div className="topTitle">
          <h1 className="deskTitle">저압 절감 분석</h1>
          <div className="selectContainer"><select className="selectbox" id="dataType" value={draft.dataType} onChange={(event) => update("dataType", event.target.value as ReduceDataType)}>{REDUCE_DATA_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
          <div className="datePicker"><input type="text" className="inputDate" id="sDate" value={formatReduceDate(draft.sDate, draft.dataType)} onChange={(event) => update("sDate", event.target.value)} /><i className="bi bi-calendar" /></div>
          <button className="searchBtn" id="search" onClick={() => setQuery(draft)}><i className="bi bi-search" />조회</button>
          <label htmlFor="isBaseCost" className="isBaseCost">기본요금 포함</label><input type="checkbox" id="isBaseCost" role="switch" checked={draft.isBaseCost} onChange={(event) => update("isBaseCost", event.target.checked)} />
          <label htmlFor="isCheckDay" className="isCheckDay">검침일 적용</label><input type="checkbox" id="isCheckDay" role="switch" checked={draft.isCheckDay} disabled />
        </div>
        <div className="basicTop">
          <div className="lowBox chartBox"><div className="chart" id="chart"><ReduceChart rows={dataset.rows} /></div></div>
          <ReduceGauge frugal={dataset.frugal} />
        </div>
        <div className="basicBottom">
          <div className="lowBox tableBox"><table><thead><tr><th>일시</th><th>사용전력량(kWh)</th><th>고압 전력 요금</th><th>저압 전력 요금</th><th>절감 금액</th><th>절감률</th></tr></thead><tbody id="itemList">{dataset.rows.map((row) => <tr key={row.seq} className={row.isMax ? "high" : undefined}><td>{row.seq}</td><td>{echoNumber(row.watt)}</td><td>{echoNumber(row.high)}</td><td>{echoNumber(row.low)}</td><td>{echoNumber(row.frugal)}</td><td>{row.frugalRate}%</td></tr>)}</tbody></table></div>
          <SummaryBox title="저압 전력 요금" className="lowPay" values={[{ label: "저압 전력 요금", value: dataset.low.billTotal, unit: "원" }, { label: "사용 전력량", value: dataset.low.wattTotal, unit: "kWh" }, { label: "최고 전력 요금", value: dataset.low.billMax, unit: "원" }, { label: "평균 사용 전력량", value: dataset.low.avgWatt, unit: "kWh" }, { label: "평균 저압 전력 요금", value: dataset.low.avgLow, unit: "원" }]} />
          <SummaryBox title="직전 동일 기간 대비" className="lowBefore" values={[{ label: "저압 전력 요금", value: dataset.compare.billTotal, unit: "원" }, { label: "사용 전력량", value: dataset.compare.wattTotal, unit: "kWh" }, { label: "최고 전력 요금", value: dataset.compare.billMax, unit: "원" }, { label: "평균 절감 금액", value: dataset.compare.avgWatt, unit: "원" }, { label: "평균 절감률", value: dataset.compare.avgLow, unit: "%" }]} />
        </div>
      </main>
    </>
  );
}

function ReportDashboard() {
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
            <button className="exlBtn" id="truth" onClick={() => window.print()}><i className="bi bi-bag-check-fill" />사업 타당성 검토</button>
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

export function FitPageCatalog({ page }: { readonly page: FitCatalogPage }) {
  switch (page) {
    case "stat": return <StatDashboard />;
    case "firm": return <FirmManager />;
    case "research": return <ResearchPanel />;
    case "peak-panel": return <PeakPanel />;
    case "peak-set": return <PeakSettings />;
    case "power-usage": return <PowerUsagePage />;
    case "peak-usage": return <PeakUsageReport />;
    case "control-his": return <ControlHistory />;
    case "acp": return <AcpPanel />;
    case "rate-plan": return <RatePlanPage />;
    case "reduce": return <ReduceDashboard />;
    case "report": return <ReportDashboard />;
  }
}
