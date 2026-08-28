"use client";

import { useState } from "react";
import type { GoalItem } from "@/lib/fit-mocks/peak";

interface GoalAccordionProps {
  readonly goals: readonly GoalItem[];
}

/** `.circleFront` 원둘레 (r=30 → 2πr ≈ 188.495). 원본 마크업 값 그대로. */
const CIRCUMFERENCE = 188.495;

function clampRatio(achieved: number): number {
  return Math.min(Math.max(achieved, 0), 100);
}

interface GoalRowProps {
  readonly goal: GoalItem;
  readonly open: boolean;
  readonly onOpen: () => void;
}

function GoalRow({ goal, open, onOpen }: GoalRowProps) {
  const ratio = clampRatio(goal.achieved);
  const offset = (CIRCUMFERENCE * (100 - ratio)) / 100;
  const itemClass = goal.achieved >= 100 ? "item gold" : "item";

  return (
    <li className={itemClass} data-type={goal.type}>
      <div className="mainItemBox" onClick={onOpen}>
        <div className="goalMeterLine">
          <span className="goalMeter" />
          <span className="goalMeterOn" style={{ width: `${ratio}%` }} />
        </div>
        <svg className="goalCircle">
          <circle cx="40" cy="40" r="30" fill="transparent" strokeWidth="13" />
          <circle
            cx="40"
            cy="40"
            r="30"
            className="circleFront"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset.toFixed(3)}
          />
          <text
            x="40"
            y="40"
            dominantBaseline="middle"
            textAnchor="middle"
            className="goalCircleText"
          >
            {goal.achieved}%
          </text>
        </svg>
        <div className="golaCirdleBg" />
        <div className="goalBarTop">
          <b>{goal.title}</b>
          <p>
            <span className={`${goal.prefix}Frugal`}>{goal.frugal}</span>원
          </p>
        </div>
        <div className="goalBarBtm">
          <b>목표 절감액 :</b>
          <p>
            <span className={`${goal.prefix}FrugalGoal`}>{goal.frugalGoal}</span>원
          </p>
        </div>
      </div>
      <div className="subTextBox" style={{ display: open ? "block" : "none" }}>
        <div>
          <b>사용전력</b>
          <p>
            <span className={`${goal.prefix}Watt`}>{goal.watt}</span>kw
          </p>
        </div>
        <div>
          <b>저압 전력 요금</b>
          <p>
            <span className={`${goal.prefix}LowBill`}>{goal.lowBill}</span>원
          </p>
        </div>
        <div>
          <b>고압 전력 요금</b>
          <p>
            <span className={`${goal.prefix}HighBill`}>{goal.highBill}</span>원
          </p>
        </div>
        <div>
          <b>저압 요금 절감률</b>
          <p>
            <i className="bi bi-caret-up-fill" aria-hidden="true" />
            <span className={`${goal.prefix}Ratio`}>{goal.ratio}</span>%
          </p>
        </div>
      </div>
    </li>
  );
}

/**
 * `#goalEffect` — 목표 절감액 달성 현황 아코디언.
 *
 * 원본은 `.mainItemBox` 클릭 시 해당 `.subTextBox` 만 인라인 스타일로 노출하고
 * 나머지는 감춘다. 동일 동작을 상태 하나로 재현한다(기본값: 첫 항목).
 */
export function GoalAccordion({ goals }: GoalAccordionProps) {
  const [openType, setOpenType] = useState<string>(goals[0]?.type ?? "");

  return (
    <ul className="goalAccordion" id="goalEffect">
      {goals.map((goal) => (
        <GoalRow
          key={goal.type}
          goal={goal}
          open={goal.type === openType}
          onOpen={() => setOpenType(goal.type)}
        />
      ))}
    </ul>
  );
}
