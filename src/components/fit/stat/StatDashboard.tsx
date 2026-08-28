"use client";

import { LIB_STYLES, PageStyles } from "@/components/fit/shared/PageStyles";
import { Pagination } from "@/components/fit/shared/Pagination";
import {
  STAT_FIRMS,
  STAT_ROWS_PER_PAGE,
  buildPeakDetail,
  type StatOrderBy,
} from "@/lib/fit-mocks/stat";
import { echoNumber as echoStatNumber, pageRows, sortFirms, totalPages } from "@/components/fit/stat/statUtils";
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
  const [orderBy, setOrderBy] = useState<StatOrderBy>("peakRatio-0");
  const [page, setPage] = useState(1);
  const [selectedFid, setSelectedFid] = useState<number | null>(null);
  const [firmName, setFirmName] = useState("");
  const [peakExcess, setPeakExcess] = useState(false);
  const [peakClose, setPeakClose] = useState(false);
  const [onControl, setOnControl] = useState(false);
  const [emergency, setEmergency] = useState(false);
  const [reviewRequired, setReviewRequired] = useState(false);

  const filtered = useMemo(() => {
    const keyword = firmName.trim();
    return STAT_FIRMS.filter((firm) => {
      if (keyword && !firm.firmName.includes(keyword)) return false;
      if (peakExcess && !firm.peak) return false;
      if (peakClose && firm.frugalRatio < 10) return false;
      if (onControl && firm.netError) return false;
      if (emergency && !firm.netError) return false;
      if (reviewRequired && firm.frugalRatio >= 10) return false;
      return true;
    });
  }, [firmName, peakExcess, peakClose, onControl, emergency, reviewRequired]);

  const sorted = useMemo(() => {
    if (orderBy === "peakRatio-0") {
      return [...filtered].sort((a, b) => b.frugalRatio - a.frugalRatio);
    }
    if (orderBy === "peakRatio-1") {
      return [...filtered].sort((a, b) => a.frugalRatio - b.frugalRatio);
    }
    return sortFirms(filtered, orderBy);
  }, [filtered, orderBy]);
  const pages = totalPages(sorted.length, STAT_ROWS_PER_PAGE);
  const rows = pageRows(sorted, page, STAT_ROWS_PER_PAGE);
  const selected = STAT_FIRMS.find((firm) => firm.fid === selectedFid);
  const detail = selected ? buildPeakDetail(selected) : null;

  const resetFilters = () => {
    setFirmName("");
    setPeakExcess(false);
    setPeakClose(false);
    setOnControl(false);
    setEmergency(false);
    setReviewRequired(false);
    setOrderBy("peakRatio-0");
    setPage(1);
  };

  return (
    <>
      <PageStyles files={[...LIB_STYLES, "/fit/assets/css/stat.css"]} />
      <main className="contents" id="contentsArea">
        <div className="controlCenterGrid">
          <div className="kfeContent peakRealTime">
            <div className="peakRealTimeTitle">피크현황</div>
            <div className="peakRealTimeCountWrap" id="realTimeCountWrap">
              <div className="peakRealTimeCountGroup">
                <div className="peakRealTimeCountLabel">
                  피크초과 <span className="countValue co1">0</span>
                </div>
                <div className="peakRealTimeCountLabel">
                  피크근접 <span className="countValue co2">0</span>
                </div>
                <div className="peakRealTimeCountLabel">
                  피크안정 <span className="countValue co3">0</span>
                </div>
              </div>
              <div className="peakRealTimeCountGroup">
                <div className="peakRealTimeCountLabel">
                  전체제어 <span className="countValue yellow">0</span>
                </div>
                <div className="peakRealTimeCountLabel">
                  일부제어 <span className="countValue yellow">0</span>
                </div>
                <div className="peakRealTimeCountLabel">
                  제어안함 <span className="countValue yellow">0</span>
                </div>
              </div>
              <div className="peakRealTimeCountGroup">
                <div className="peakRealTimeCountLabel">
                  긴급 <span className="countValue co4">0</span>
                </div>
                <div className="peakRealTimeCountLabel">
                  검토 <span className="countValue co5">0</span>
                </div>
              </div>
            </div>
          </div>

          <div className="koreaMap" style={{ pointerEvents: "none" }}>
            <div id="map" className="map" aria-label="업체 위치 지도 데모" />
          </div>

          <div className="firmList">
            <div className="kfeContent" style={{ overflowX: "auto" }}>
              <div className="filterWrap">
                <div className="filterSearchInput">
                  <i className="icon filterSearchIcon" />
                  <input
                    type="search"
                    id="inputFirmName"
                    placeholder="업체명 검색"
                    value={firmName}
                    onChange={(event) => {
                      setFirmName(event.target.value);
                      setPage(1);
                    }}
                  />
                </div>
                <div className="filterRt">
                  <div className="mTBlock">
                    <div className="filterButtonGroup">
                      <div className="filterButtons">
                        <label>
                          <input type="checkbox" id="inputPeakExcess" value="1" checked={peakExcess} onChange={(event) => { setPeakExcess(event.target.checked); setPage(1); }} />
                          <span className="filterButtonLeft">피크초과</span>
                        </label>
                      </div>
                      <div className="filterButtons">
                        <label>
                          <input type="checkbox" id="inputPeakClose" value="1" checked={peakClose} onChange={(event) => { setPeakClose(event.target.checked); setPage(1); }} />
                          <span className="filterButtonRight">피크근접</span>
                        </label>
                      </div>
                    </div>
                    <div className="filterButtonGroup">
                      <div className="filterButtons">
                        <label>
                          <input type="checkbox" id="inputOnControl" value="1" checked={onControl} onChange={(event) => { setOnControl(event.target.checked); setPage(1); }} />
                          <span className="filterButton">제어중</span>
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="mTBlock">
                    <div className="filterButtonGroup">
                      <div className="filterButtons">
                        <label>
                          <input type="checkbox" id="inputEmergency" value="1" checked={emergency} onChange={(event) => { setEmergency(event.target.checked); setPage(1); }} />
                          <span className="filterButtonLeft">긴급</span>
                        </label>
                      </div>
                      <div className="filterButtons">
                        <label>
                          <input type="checkbox" id="inputReviewRequired" value="1" checked={reviewRequired} onChange={(event) => { setReviewRequired(event.target.checked); setPage(1); }} />
                          <span className="filterButtonRight">검토</span>
                        </label>
                      </div>
                    </div>
                    <div className="filterButtonGroup">
                      <button type="button" className="filterButtons reset" onClick={resetFilters}>
                        초기화
                      </button>
                    </div>
                    <div className="filterButtonGroup">
                      <select
                        className="filterSelectOrderBy"
                        id="selectOrderBy"
                        aria-label="정렬"
                        value={orderBy}
                        onChange={(event) => {
                          setOrderBy(event.target.value as StatOrderBy);
                          setPage(1);
                        }}
                      >
                        <option value="peakRatio-0">피크율 높은순</option>
                        <option value="peakRatio-1">피크율 낮은순</option>
                        <option value="eoiTime-0">수요시간 마감순</option>
                        <option value="eoiTime-1">수요시간 시작순</option>
                        <option value="conLen-0">제어기기 많은순</option>
                        <option value="conLen-1">제어기기 적은순</option>
                        <option value="kepcoRatio-0">정확도 높은순</option>
                        <option value="kepcoRatio-1">정확도 낮은순</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="firmListHeader">
                <div className="firmListColumn mobile"></div>
                <div className="firmListColumn mobile">업체명</div>
                <div className="firmListColumn mobile">피크상태</div>
                <div className="firmListColumn">제어상태</div>
                <div className="firmListColumn">제어모드</div>
                <div className="firmListColumn">요금적용전력</div>
                <div className="firmListColumn">목표전력비</div>
                <div className="firmListColumn mobile">예측/목표전력</div>
                <div className="firmListColumn mobile">피크율/소요시간</div>
                <div className="firmListColumn mobile">정확도</div>
              </div>
              <div className="firmListBody">
                <div className="firmListData" id="dataList">
                  {rows.map((firm, index) => (
                    <div
                      className={firm && firm.fid === selectedFid ? "firmListDataRow active selected" : firm ? "firmListDataRow active" : "firmListDataRow"}
                      key={firm ? firm.fid : `blank-${index}`}
                      onClick={() => firm && setSelectedFid(firm.fid)}
                    >
                      <div className="firmListDataValue mobile"></div>
                      <div className="firmListDataValue mobile">
                        <div className="firmListfirmName">{firm?.firmName ?? ""}</div>
                        <span className="firmListSubData"></span>
                      </div>
                      <div className="firmListDataValue mobile">
                        <div></div>
                        <div className="firmListSubData">
                          <span className="firmListPeakWatt"></span>
                          <span className="unit">kW</span>
                        </div>
                      </div>
                      <div className="firmListDataValue">
                        <div></div>
                        <span className="firmListSubData"></span>
                      </div>
                      <div className="firmListDataValue">
                        <div></div>
                        <span className="firmListSubData"></span>
                      </div>
                      <div className="firmListDataValue">
                        <div>
                          <span></span>
                          <span className="unit">kW</span>
                        </div>
                        <span className="firmListSubData"></span>
                      </div>
                      <div className="firmListDataValue">
                        <span></span>
                        <span className="unit">%</span>
                      </div>
                      <div className="firmListDataValue mobile">
                        <div>
                          <span></span>
                          <span className="unit">kW</span>
                        </div>
                        <div>
                          <span></span>
                          <span className="unit">kW</span>
                        </div>
                      </div>
                      <div className="firmListDataValue mobile">
                        <div className="firmListPeakRatioTime">
                          <div className="firmListPeakRatio">
                            <div className="firmListPeakRatioLine">
                              <div className="firmListPeakRatioOn">
                                <div className="firmListPeakRatioPulse"></div>
                              </div>
                              <div className="firmListPeakRatioPoint"></div>
                            </div>
                            <div className="firmListPeakRatioEmpty disable">-</div>
                          </div>
                          <div className="firmListProgressText">
                            <div></div>
                            <span className="unit">%</span>
                          </div>
                        </div>
                        <div className="firmListPeakRatioTime">
                          <div className="firmListPeakTimeLimit">
                            <div className="firmListPeakMeterLine">
                              <span className="firmListPeakMeter"></span>
                              <span className="firmListPeakMeterOn"></span>
                            </div>
                          </div>
                          <div className="firmListProgressText"></div>
                        </div>
                      </div>
                      <div className="firmListDataValue mobile">
                        <span></span>
                        <span className="unit">%</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="deskStat">
                  <Pagination page={page} pages={pages} onChange={setPage} className="deskPages" />
                </div>
              </div>
            </div>
          </div>

          {detail ? (
            <div className="peakDetailWrap" id="peakDetailWrap">
              <div className="peakDetail">
                <div className="kfeContent peakDetailData">
                  <div className="peakFirmNameHeader">
                    <div className="peakDetailFirmName">{detail.firmName}</div>
                    <button className="overlayCloseButton" onClick={() => setSelectedFid(null)} aria-label="닫기">
                      <i className="bi bi-x-lg" />
                    </button>
                  </div>
                  <div className="peakDetailHead">
                    <div className="peakDetailColumn" />
                    <div className="peakDetailColumn peakDetailToday">오늘</div>
                    <div className="peakDetailColumn peakDetailMonth">이번달</div>
                    <div className="peakDetailColumn peakDetailYear">지난 1년</div>
                    <div className="peakDetailColumn peakDetailTotal">총 누적</div>
                  </div>
                  <div className="peakDetailContent">
                    {[
                      ["목표전력", "초과", "회"],
                      ["요금적용전력", "초과", "회"],
                      ["순간목표전력", "초과", "회"],
                      ["피크제어", "횟수", "회"],
                      ["절감전력", "", "kW"],
                      ["절감요금", "", "만원"],
                    ].map(([label, suffix, unit]) => (
                      <div className="peakDetailRow" key={label as string}>
                        <div className="peakDetailLabel">
                          {label as string}
                          <span>{suffix as string}</span> <span className="peakDetailUnit">({unit as string})</span>
                        </div>
                        <div className="peakDetailRowValue"></div>
                        <div className="peakDetailRowValue"></div>
                        <div className="peakDetailRowValue"></div>
                        <div className="peakDetailRowValue"></div>
                      </div>
                    ))}
                  </div>
                  <div className="peakDetailFirmInfo">
                    <div className="peakDetailInfoItem">
                      <div className="peakDetailItemWrap">
                        <div className="peakDetailItemLabel">계약종별</div>
                        <div className="peakDetailItemValue"></div>
                      </div>
                      <div className="peakDetailItemWrap">
                        <div className="peakDetailItemLabel">계약전력</div>
                        <div className="peakDetailItemValue">{echoStatNumber(detail.contractLimit)}kW</div>
                      </div>
                      <div className="peakDetailItemWrap">
                        <div className="peakDetailItemLabel">검침일</div>
                        <div className="peakDetailItemValue">{detail.checkDay}일</div>
                      </div>
                    </div>
                    <div className="peakDetailInfoItem">
                      <div className="peakDetailItemWrap">
                        <SpriteIcon name="icon-person" />
                        <div className="peakDetailItemValue">{detail.manager}</div>
                      </div>
                      <div className="peakDetailItemWrap">
                        <SpriteIcon name="icon-contact" />
                        <div className="peakDetailItemValue">{detail.phone}</div>
                      </div>
                      <div className="peakDetailItemWrap">
                        <SpriteIcon name="icon-address" />
                        <div className="peakDetailItemValue">{detail.addressText}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="kfeContent peakHistory">
            <div className="kfeHead">최근 피크 기록</div>
            <div className="kfeBody">
              <div className="dataList">
                <div className="listBody" id="peakHistory">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div className="dataRow" key={index}>
                      <div className="typeName"></div>
                      <div></div>
                      <div className="controlCount"></div>
                      <div></div>
                    </div>
                  ))}
                </div>
                <div className="deskStat">
                  <div className="deskPages" id="historyPages">
                    <div className="deskPage act active">1</div>
                    <div className="deskPage act">2</div>
                    <div className="deskPage act">3</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="kfeContent chargeReduction">
            <div className="kfeHead">
              <span>요금절감성과</span>
              <span className="chargeReductionHeadUnit">단위: 만원 / 전체업체</span>
            </div>
            <div className="kfeBody chargeReductionInfo">
              <div className="chargeReductionAmount" id="reductionAmount">
                <div className="chargeReductionAmountRow">
                  <div className="chargeReductionRowColumn">오늘</div>
                  <div className="rowValue">0</div>
                </div>
                <div className="chargeReductionAmountRow">
                  <div className="chargeReductionRowColumn">이번달</div>
                  <div className="rowValue">0</div>
                </div>
                <div className="chargeReductionAmountRow">
                  <div className="chargeReductionRowColumn">올해</div>
                  <div className="rowValue">0</div>
                </div>
              </div>
              <div className="chargeReductionRrankTitle">
                요금절감 업체 순위
                <span className="chargeReductionThisMonthText">(이번달)</span>
              </div>
              <div className="chargeReductionPeakRank" id="peakRank">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div className="chargeReductionDataRow" key={index}>
                    <div className="chargeReductionRankNumber"></div>
                    <div className="chargeReductionFirmName">-</div>
                    <div className="chargeReductionPrice">-</div>
                  </div>
                ))}
              </div>
              <div className="deskStat">
                <div className="deskPages" id="RankingPages">
                  <span className="deskPage act active">1</span>
                  <span className="deskPage act">2</span>
                  <span className="deskPage act">3</span>
                </div>
              </div>
            </div>
          </div>

          <div className="kfeContent firmStatus">
            <div className="firmStatusWrap">
              <div className="firmCount">
                <div className="kfeHead">관리업체현황</div>
                <div className="kfeBody">
                  <div className="circle">
                    <svg viewBox="0 0 65 65" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M61.7935 41.8302C67.1078 25.4906 58.1699 7.93659 41.8302 2.62233C25.4906 -2.69193 7.93658 6.24593 2.62232 22.5856C-2.69194 38.9253 6.24592 56.4793 22.5856 61.7935C38.9253 67.1078 56.4792 58.1699 61.7935 41.8302Z" stroke="url(#paint0_linear_201_84)" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"></path>
                      <text x="50%" y="42%" dominantBaseline="middle" textAnchor="middle" className="firmCircleValue" id="clientsCountThisMonth">0</text>
                      <text x="50%" y="70%" dominantBaseline="middle" textAnchor="middle" className="firmCircleLabel">당월 신규</text>
                      <defs>
                        <linearGradient id="paint0_linear_201_84" x1="21.853" y1="64.0299" x2="42.5505" y2="0.391546" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#5fc5ff"></stop>
                          <stop offset="0.1254" stopColor="#2A7EFF"></stop>
                          <stop offset="1" stopColor="#5fc5ff"></stop>
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  <div className="circle">
                    <svg viewBox="0 0 65 65" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M61.7935 41.8302C67.1078 25.4906 58.1699 7.93659 41.8302 2.62233C25.4906 -2.69193 7.93658 6.24593 2.62232 22.5856C-2.69194 38.9253 6.24592 56.4793 22.5856 61.7935C38.9253 67.1078 56.4792 58.1699 61.7935 41.8302Z" stroke="url(#paint0_linear_201_84)" strokeWidth="2" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"></path>
                      <text x="50%" y="42%" dominantBaseline="middle" textAnchor="middle" className="firmCircleValue" id="clientsCountTotal">0</text>
                      <text x="50%" y="70%" dominantBaseline="middle" textAnchor="middle" className="firmCircleLabel">전체</text>
                      <defs>
                        <linearGradient id="paint0_linear_201_84" x1="21.853" y1="64.0299" x2="42.5505" y2="0.391546" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#5fc5ff"></stop>
                          <stop offset="0.1254" stopColor="#2A7EFF"></stop>
                          <stop offset="1" stopColor="#5fc5ff"></stop>
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </div>
              </div>
              <div className="networkStatus">
                <div className="kfeHead">통신상태</div>
                <div className="kfeBody">
                  <div className="circle">
                    <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="125" cy="125" r="100" fill="transparent" stroke="#585858" strokeWidth="25" />
                      <circle id="circle-front" cx="125" cy="125" r="100" fill="transparent" stroke="url('#status-linearGradient')" strokeLinecap="square" strokeWidth="25" strokeDasharray="608" strokeDashoffset="0" transform="rotate(-90, 125, 125)" />
                      <text x="55%" y="55%" dominantBaseline="middle" textAnchor="middle" className="networkStatusCircleText" id="networkStatusCircleText">00%</text>
                      <defs>
                        <linearGradient id="status-linearGradient" gradientTransform="rotate(0)" gradientUnits="userSpaceOnUse">
                          <stop stopColor="#1FAEFF" />
                          <stop offset="0.01" stopColor="#2A7EFF" />
                          <stop offset="1" stopColor="#1FAEFF" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  <div className="networkStatusText" id="statusText">
                    <a href="/fit/bad">
                      <div className="networkStatusLabel">나쁨</div>
                      <div className="networkStatusValue">0</div>
                    </a>
                    <div className="networkStatusLabel">전체</div>
                    <div className="networkStatusValue">0</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
