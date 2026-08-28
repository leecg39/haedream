"use client";

import { useEffect, useMemo, useState } from "react";
import { PageStyles } from "@/components/fit/shared/PageStyles";
import { Pagination } from "@/components/fit/shared/Pagination";
import { LIB_STYLES } from "@/lib/fit-styles";
import {
  STAT_ALARMS,
  STAT_FIRMS,
  STAT_ROWS_PER_PAGE,
  STAT_SUMMARY,
  buildPeakDetail,
  type StatFirm,
  type StatOrderBy,
  type StatRankingPeriod,
} from "@/lib/fit-mocks/stat";
import { StatFirmList } from "./StatFirmList";
import { StatMap } from "./StatMap";
import { StatPeakDetail } from "./StatPeakDetail";
import { StatRightSection } from "./StatRightSection";
import { pageRows, sortFirms, totalPages } from "./statUtils";

const LIVE_REFRESH_MS = 5_000;
const AUTO_ORDER_CYCLE: readonly StatOrderBy[] = [
  "thisPowerDESC",
  "frugalRatioDESC",
  "frugalMonthDESC",
  "firmNameDESC",
];

/** 5초마다 원본값 주변에서 작게 움직이는 결정적 실시간 데모 데이터. */
function buildLiveFirms(tick: number): readonly StatFirm[] {
  if (tick === 0) return STAT_FIRMS;

  return STAT_FIRMS.map((firm, index) => {
    const powerWave = Math.sin(tick * 1.87 + index * 0.91);
    const loadPulse = Math.cos(tick * 0.73 + index * 1.31);
    const ratioWave = Math.sin(tick * 1.11 + index * 0.47);
    const savingWave = Math.cos(tick * 0.83 + index * 0.39);

    return {
      ...firm,
      thisPower: Math.max(
        0,
        Math.round(firm.thisPower * (1 + powerWave * 0.11) + loadPulse * 13),
      ),
      frugalRatio: Math.max(0, Math.round((firm.frugalRatio + ratioWave * 0.65) * 10) / 10),
      frugalMonth: Math.max(
        0,
        Math.round((firm.frugalMonth * (1 + savingWave * 0.012)) / 1_000) * 1_000,
      ),
    };
  });
}

/**
 * 원본 stat.html 의 통합관제 화면.
 *
 * `#contentsArea` 는 `display:flex; flex-direction:row; justify-content:space-between` 이고
 * 직계 자식이 정확히 4개다 — .widget.firmData / .rightsection / .map / .peakDetailWrap.
 * `.map` 은 `position:absolute; inset:0; z-index:1` 배경이고 앞의 둘이 `z-index:2` 로 그 위에 뜬다.
 *
 * **래퍼 div 로 감싸면 flex 직계 자식 관계가 깨져 레이아웃이 통째로 무너진다.**
 * 이 4개 구조를 반드시 유지할 것.
 */
export function StatDashboard() {
  const [orderBy, setOrderBy] = useState<StatOrderBy>("");
  const [page, setPage] = useState(1);
  const [selectedFid, setSelectedFid] = useState<number | null>(null);
  const [period, setPeriod] = useState<StatRankingPeriod>("today");
  const [liveTick, setLiveTick] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setLiveTick((current) => current + 1);
    }, LIVE_REFRESH_MS);

    return () => window.clearInterval(interval);
  }, []);

  const liveFirms = useMemo(() => buildLiveFirms(liveTick), [liveTick]);
  const autoOrderBy = liveTick === 0
    ? ""
    : AUTO_ORDER_CYCLE[(liveTick - 1) % AUTO_ORDER_CYCLE.length];
  const effectiveOrderBy = orderBy || autoOrderBy;
  const sorted = useMemo(
    () => sortFirms(liveFirms, effectiveOrderBy),
    [effectiveOrderBy, liveFirms],
  );
  const pages = totalPages(sorted.length, STAT_ROWS_PER_PAGE);
  const rows = pageRows(sorted, page, STAT_ROWS_PER_PAGE);
  const selected = liveFirms.find((firm) => firm.fid === selectedFid) ?? null;
  const detail = selected ? buildPeakDetail(selected) : null;

  const handleOrderBy = (next: StatOrderBy) => {
    setOrderBy(next);
    setPage(1);
  };

  return (
    <>
      <PageStyles files={[...LIB_STYLES, "/fit/assets/css/stat.css", "/fit/clone-css/stat-extras.css"]} />
      <main className="contents" id="contentsArea">
        <div
          className="widget firmData"
          data-live-tick={liveTick}
          data-live-order={effectiveOrderBy || "source"}
        >
          <StatFirmList
            rows={rows}
            orderBy={orderBy}
            liveTick={liveTick}
            autoOrderBy={autoOrderBy}
            selectedFid={selectedFid}
            onOrderByChange={handleOrderBy}
            onSelect={setSelectedFid}
          />
          <Pagination
            page={page}
            pages={pages}
            onChange={setPage}
            className="pagination"
            itemTag="div"
            itemClass="deskPage"
            showPrevNext={false}
          />
        </div>

        <StatRightSection
          summary={STAT_SUMMARY}
          alarms={STAT_ALARMS}
          period={period}
          onPeriodChange={setPeriod}
        />

        <StatMap
          firms={STAT_FIRMS}
          selectedFid={selectedFid}
          onSelect={setSelectedFid}
        />

        <StatPeakDetail detail={detail} onClose={() => setSelectedFid(null)} />
      </main>
    </>
  );
}
