"use client";

import type { StatPeakDetail as StatPeakDetailData, StatQuarterValues } from "@/lib/fit-mocks/stat";
import { echoNumber } from "./statUtils";

/**
 * 원본 아이콘 스프라이트를 `<use>` 로 참조한다.
 * `.peakDetailItemIcon svg { display:block; width:1rem; height:1rem }` 가 이 구조에
 * 의존하므로 부트스트랩 아이콘으로 대체하면 크기가 어긋난다.
 */
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
 * 원본은 값이 없어도 3개 행을 DOM 에 두고 값 칸만 비워 둔다.
 * (오버레이 전체는 바깥 .peakDetailWrap 의 .disable 로만 숨긴다.)
 */
function DetailRow({
  label,
  unit,
  values,
}: {
  readonly label: string;
  readonly unit: string;
  readonly values: StatQuarterValues | null;
}) {
  return (
    <div className="peakDetailRow">
      <div className="peakDetailLabel">
        {label}
        <span className="peakDetailUnit">({unit})</span>
      </div>
      <div className="peakDetailRowValue">{values ? echoNumber(values.today) : ""}</div>
      <div className="peakDetailRowValue">{values ? echoNumber(values.week) : ""}</div>
      <div className="peakDetailRowValue">{values ? echoNumber(values.month) : ""}</div>
      <div className="peakDetailRowValue">{values ? echoNumber(values.year) : ""}</div>
    </div>
  );
}

interface StatPeakDetailProps {
  readonly detail: StatPeakDetailData | null;
  readonly onClose: () => void;
}

/**
 * 원본 stat.html 의 `#peakDetailWrap` — 업체 상세 오버레이.
 *
 * 원본은 DOM 에 두고 `.disable` 만 토글하며, 위치는 stat.css 의
 * `.peakDetailWrap { position:absolute; top:-265px; right:-220px }` 가 정한다.
 * 인라인 style 로 위치를 덮어쓰면 원본과 어긋난다.
 */
export function StatPeakDetail({ detail, onClose }: StatPeakDetailProps) {
  return (
    <div className={detail ? "peakDetailWrap" : "peakDetailWrap disable"} id="peakDetailWrap">
      <div className="peakDetail">
        <div className="kfeContent peakDetailData">
          <div className="peakFirmNameHeader">
            <div className="peakDetailFirmName">{detail?.firmName ?? ""}</div>
            <div className="overlayCloseButton" role="button" title="닫기" onClick={onClose}>
              <i className="bi bi-x-lg" />
            </div>
          </div>
          <div className="peakDetailHead">
            <div className="peakDetailColumn" />
            <div className="peakDetailColumn peakDetailToday">오늘</div>
            <div className="peakDetailColumn peakDetailWeek">이번주</div>
            <div className="peakDetailColumn peakDetailMonth">이번달</div>
            <div className="peakDetailColumn peakDetailYear">올해</div>
          </div>
          <div className="peakDetailContent">
            <DetailRow label="사용 전력" unit="kW" values={detail?.usedWatt ?? null} />
            <DetailRow label="절감률" unit="%" values={detail?.frugalRatio ?? null} />
            <DetailRow label="절감금액" unit="만원" values={detail?.frugalAmount ?? null} />
          </div>
          <div className="peakDetailFirmInfo">
            <div className="peakDetailInfoItem">
              <div className="peakDetailItemWrap">
                <div className="peakDetailItemLabel">총 절감금액</div>
                <div className="peakDetailItemValue">{detail ? `${echoNumber(detail.frugalTotal)}원` : ""}</div>
              </div>
              <div className="peakDetailItemWrap">
                <div className="peakDetailItemLabel">계약전력</div>
                <div className="peakDetailItemValue">{detail ? `${echoNumber(detail.contractLimit)}kW` : ""}</div>
              </div>
              <div className="peakDetailItemWrap">
                <div className="peakDetailItemLabel">검침일</div>
                <div className="peakDetailItemValue">{detail ? `${detail.checkDay}일` : ""}</div>
              </div>
            </div>
            <div className="peakDetailInfoItem">
              <div className="peakDetailItemWrap">
                <SpriteIcon name="icon-person" />
                <div className="peakDetailItemValue">{detail?.manager ?? ""}</div>
              </div>
              <div className="peakDetailItemWrap">
                <SpriteIcon name="icon-contact" />
                <div className="peakDetailItemValue">{detail?.phone ?? ""}</div>
              </div>
              <div className="peakDetailItemWrap">
                <SpriteIcon name="icon-address" />
                <div className="peakDetailItemValue">{detail?.addressText ?? ""}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
