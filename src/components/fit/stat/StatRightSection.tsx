"use client";

import type { StatAlarm, StatRankingPeriod, StatSummary } from "@/lib/fit-mocks/stat";
import { STAT_RANKING } from "@/lib/fit-mocks/stat";
import { StatRankingChart } from "./StatRankingChart";
import { echoNumber } from "./statUtils";

const RANKING_PERIODS: readonly { readonly value: StatRankingPeriod; readonly label: string }[] = [
  { value: "today", label: "오늘" },
  { value: "week", label: "이번주" },
  { value: "month", label: "이번달" },
  { value: "year", label: "올해" },
];

interface StatRightSectionProps {
  readonly summary: StatSummary;
  readonly alarms: readonly StatAlarm[];
  readonly period: StatRankingPeriod;
  readonly onPeriodChange: (period: StatRankingPeriod) => void;
}

/**
 * 원본 stat.html 의 `.rightsection` — 참여 업체 수 / 절감금액 랭킹 / 알림 위젯 3종.
 * `#contentsArea` 의 flex 직계 자식이어야 하므로 바깥을 다른 div 로 감싸지 않는다.
 */
export function StatRightSection({ summary, alarms, period, onPeriodChange }: StatRightSectionProps) {
  return (
    <div className="rightsection">
      <div className="widget until">
        <div className="title">참여 업체 수</div>
        <div className="untilData">
          <span className="label">제안</span>
          <div>
            <span className="value countNumber" id="preCount">{echoNumber(summary.preCount)}</span>
            <span className="unit">개</span>
          </div>
        </div>
        <div className="untilData">
          <span className="label">설치</span>
          <div>
            <span className="value countNumber" id="frugalCount">{echoNumber(summary.frugalCount)}</span>
            <span className="unit">개</span>
          </div>
        </div>
        <div className="title">총 누적 절감 금액</div>
        <div className="untilData">
          <span className="label">제안</span>
          <div>
            <span className="value countNumber" id="preTotal">{echoNumber(summary.preTotal)}</span>
            <span className="unit">원</span>
          </div>
        </div>
        <div className="untilData">
          <span className="label">설치</span>
          <div>
            <span className="value countNumber" id="frugalTotal">{echoNumber(summary.frugalTotal)}</span>
            <span className="unit">원</span>
          </div>
        </div>
        <hr />
        <div className="upday">
          <i className="bi bi-flag-fill" />
          <span id="updateTime">{summary.updateTime}</span> 업데이트
          <span>
            [D+<span id="elapsedTime">{summary.elapsedTime}</span>,{" "}
            <span id="startDate">{summary.startDate}</span> ~ ]
          </span>
        </div>
      </div>

      <div className="widget ranking">
        <div className="rankingTop">
          <div className="title">절감금액 랭킹 TOP 5</div>
          <div className="rankingFilter">
            <select
              id="rankingFilter"
              value={period}
              onChange={(event) => onPeriodChange(event.target.value as StatRankingPeriod)}
            >
              {RANKING_PERIODS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <StatRankingChart items={STAT_RANKING[period]} />
      </div>

      <div className="widget csBox">
        <div className="title">알림</div>
        <div className="cs" id="cs">
          {alarms.map((alarm) => (
            <div className="alarmItem" key={alarm.id}>
              <div className="alarmCategory">
                <span>
                  [ <span className="catName">{alarm.category}</span> ]
                </span>
                <span className="date">{alarm.date}</span>
              </div>
              <div className="alarmTitle">
                <span className="title">{alarm.title}</span>
                <i className="bi bi-three-dots" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
