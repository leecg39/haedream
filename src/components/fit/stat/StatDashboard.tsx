"use client";

import { useMemo, useState } from "react";
import { PageStyles } from "@/components/fit/shared/PageStyles";
import { Pagination } from "@/components/fit/shared/Pagination";
import { LIB_STYLES } from "@/lib/fit-styles";
import {
  STAT_ALARMS,
  STAT_FIRMS,
  STAT_ROWS_PER_PAGE,
  STAT_SUMMARY,
  buildPeakDetail,
  type StatOrderBy,
  type StatRankingPeriod,
} from "@/lib/fit-mocks/stat";
import { StatFirmList } from "./StatFirmList";
import { StatPeakDetail } from "./StatPeakDetail";
import { StatRightSection } from "./StatRightSection";
import { pageRows, sortFirms, totalPages } from "./statUtils";

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

  const sorted = useMemo(() => sortFirms(STAT_FIRMS, orderBy), [orderBy]);
  const pages = totalPages(sorted.length, STAT_ROWS_PER_PAGE);
  const rows = pageRows(sorted, page, STAT_ROWS_PER_PAGE);
  const selected = STAT_FIRMS.find((firm) => firm.fid === selectedFid) ?? null;
  const detail = selected ? buildPeakDetail(selected) : null;

  const handleOrderBy = (next: StatOrderBy) => {
    setOrderBy(next);
    setPage(1);
  };

  return (
    <>
      <PageStyles files={[...LIB_STYLES, "/fit/assets/css/stat.css", "/fit/clone-css/stat-extras.css"]} />
      <main className="contents" id="contentsArea">
        <div className="widget firmData">
          <StatFirmList
            rows={rows}
            orderBy={orderBy}
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

        {/* 원본은 Kakao Maps SDK 로 이 컨테이너에 지도를 그린다. 외부 SDK 는 로드하지 않는다. */}
        <div className="map" id="map">
          <div className="mapPlaceholder">데모 환경에서는 지도를 불러오지 않습니다.</div>
        </div>

        <StatPeakDetail detail={detail} onClose={() => setSelectedFid(null)} />
      </main>
    </>
  );
}
