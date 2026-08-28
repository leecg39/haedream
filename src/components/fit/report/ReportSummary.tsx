import { REPORT_SUMMARY } from "@/lib/fit-mocks/report";

/** `.titleLabel` — 페이지 제목 + 계약 요약 + 차트 범례. */
export function ReportSummary() {
  return (
    <div className="titleLabel">
      <div className="topfivBox">
        <h1 className="deskTitle">저압 절감 보고서</h1>
        <div className="fiveHigh">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/fit/assets/img/fiveup.svg" alt="" />
            전력타입
          </div>
          <div className="fiveHighDate">
            <span id="lastContract">{REPORT_SUMMARY.lastContract}</span>
          </div>
        </div>
        <div className="fiveHigh">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/fit/assets/img/fiveup.svg" alt="" />
            기본요금단가
          </div>
          <div className="fiveHighDate">
            <span id="lastContractCost">{REPORT_SUMMARY.lastContractCost}</span>
          </div>
        </div>
        <div className="fiveHigh">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/fit/assets/img/fiveup.svg" alt="" />
            최근 5개년 피크
          </div>
          <div className="fiveHighDate">
            <span id="maxAbleWatt">{REPORT_SUMMARY.maxAbleWatt}</span>kw /{" "}
            <span id="maxAbleDate">{REPORT_SUMMARY.maxAbleDate}</span>년
          </div>
        </div>
      </div>
      <div className="reportLabel">
        <div className="labelBox">
          <div className="labelSign"></div>
          <span>누적 절감 요금</span>
        </div>
        <div className="labelBox">
          <div className="labelSign"></div>
          <span>저압 전력 요금</span>
        </div>
        <div className="labelBox">
          <div className="labelSign"></div>
          <span>고압 전력 요금</span>
        </div>
      </div>
    </div>
  );
}
