"use client";

import { LIB_STYLES, PageStyles } from "@/components/fit/shared/PageStyles";
import { Pagination } from "@/components/fit/shared/Pagination";
import { STAT_ALARMS, STAT_FIRMS, STAT_RANKING, STAT_ROWS_PER_PAGE, STAT_SUMMARY, buildPeakDetail, type StatOrderBy, type StatRankingPeriod } from "@/lib/fit-mocks/stat";
import { StatFirmList } from "@/components/fit/stat/StatFirmList";
import { echoMoneyAxis, echoNumber as echoStatNumber, pageRows, sortFirms, totalPages } from "@/components/fit/stat/statUtils";
import { useMemo, useState } from "react";

function SpriteIcon({ name }: { readonly name: string }) {
  return (
    <div className="peakDetailItemIcon">
      <svg aria-hidden="true">
        <use href={`/fit/assets/img/icons.svg#${name}`} />
      </svg>
    </div>
  );
}

/**
 * 원본은 페이지마다 래퍼 클래스가 다르다.
 * stat.html 은 `.pagination`(display:flex; gap:20px; justify-content:center),
 * firm.html / controlHis.html 은 `.deskPages` 를 쓴다.
 */

export function StatDashboard() {
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
          <Pagination page={page} pages={pages} onChange={setPage} className="pagination" />
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
          <div className="peakDetailWrap" id="peakDetailWrap">
            <div className="peakDetail">
              <div className="kfeContent peakDetailData">
                <div className="peakFirmNameHeader">
                  <div className="peakDetailFirmName">{detail.firmName}</div>
                  <button className="overlayCloseButton" onClick={() => setSelectedFid(null)} aria-label="닫기"><i className="bi bi-x-lg" /></button>
                </div>
                <div className="peakDetailHead">
                  <div className="peakDetailColumn" />
                  <div className="peakDetailColumn peakDetailToday">오늘</div>
                  <div className="peakDetailColumn peakDetailWeek">이번주</div>
                  <div className="peakDetailColumn peakDetailMonth">이번달</div>
                  <div className="peakDetailColumn peakDetailYear">올해</div>
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
                    <div className="peakDetailItemWrap"><SpriteIcon name="icon-person" /><div className="peakDetailItemValue">{detail.manager}</div></div>
                    <div className="peakDetailItemWrap"><SpriteIcon name="icon-contact" /><div className="peakDetailItemValue">{detail.phone}</div></div>
                    <div className="peakDetailItemWrap"><SpriteIcon name="icon-address" /><div className="peakDetailItemValue">{detail.addressText}</div></div>
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
