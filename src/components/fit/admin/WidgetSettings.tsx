"use client";

import { PageStyles } from "@/components/fit/shared/PageStyles";
import { useEffect, useState } from "react";

type WidgetTone = "blue" | "green" | "purple";

type WidgetDefinition = {
  readonly id: number;
  readonly name: string;
  readonly tone: WidgetTone;
  readonly hasPreview?: boolean;
};

type WidgetSetting = WidgetDefinition & {
  readonly visible: boolean;
  readonly order: string;
};

const ENERGY_LEFT: readonly WidgetDefinition[] = [
  { id: 1, name: "실시간 피크 전력", tone: "blue" },
  { id: 2, name: "실시간 전력 사용량", tone: "blue" },
  { id: 3, name: "오늘의 전력 사용량", tone: "blue" },
  { id: 4, name: "생산량 대비 전력 사용량", tone: "blue" },
  { id: 5, name: "주간 전력 사용량", tone: "blue" },
  { id: 6, name: "오늘의 피크전력", tone: "blue" },
  { id: 7, name: "에너지 절감효과", tone: "blue" },
  { id: 8, name: "월별 최대수요", tone: "blue" },
  { id: 9, name: "설비제어", tone: "blue" },
  { id: 35, name: "현재 요금제", tone: "blue", hasPreview: false },
];

const ENERGY_RIGHT: readonly WidgetDefinition[] = [
  { id: 10, name: "현재 상태", tone: "blue" },
  { id: 11, name: "오늘의 누적 전력 사용량", tone: "blue" },
  { id: 12, name: "오늘의 누적 전력 사용요금", tone: "blue" },
  { id: 13, name: "누적 전력 사용량", tone: "blue" },
  { id: 14, name: "설비별 사용량 TOP", tone: "blue" },
  { id: 15, name: "요금제정보 및 통신상태", tone: "blue" },
  { id: 16, name: "공정별 에너지 사용량", tone: "blue" },
  { id: 32, name: "분야별 에너지 사용량", tone: "blue", hasPreview: false },
  { id: 33, name: "오늘의 가스 사용량", tone: "blue", hasPreview: false },
];

const PRODUCTION: readonly WidgetDefinition[] = [
  { id: 17, name: "이달의 생산현황", tone: "green" },
  { id: 18, name: "이달의 생산목표 달성률", tone: "green" },
  { id: 19, name: "월별 생산량대비 전력 사용량", tone: "green" },
  { id: 20, name: "누적 에너지 절감률", tone: "green" },
  { id: 21, name: "공정별 에너지 원단위", tone: "green" },
  { id: 34, name: "공정별 에너지", tone: "green" },
];

const RE100: readonly WidgetDefinition[] = [
  { id: 22, name: "RE100 이행 현황", tone: "purple" },
  { id: 23, name: "태양광 발전량 그래프", tone: "purple" },
  { id: 24, name: "SMP · REC 그래프", tone: "purple" },
  { id: 25, name: "RE100 이행 가격 동향", tone: "purple" },
  { id: 26, name: "신재생에너지 사용비율", tone: "purple" },
];

const ESG: readonly WidgetDefinition[] = [
  { id: 27, name: "ESG - 환경 1", tone: "blue" },
  { id: 28, name: "ESG - 환경 2", tone: "blue" },
  { id: 29, name: "ESG - 사회 1", tone: "blue" },
  { id: 30, name: "ESG - 사회 2", tone: "blue" },
  { id: 31, name: "ESG - 지배구조", tone: "blue" },
];

const WIDGETS = [
  ...ENERGY_LEFT,
  ...ENERGY_RIGHT,
  ...PRODUCTION,
  ...RE100,
  ...ESG,
] as const;

const INITIAL_SETTINGS: readonly WidgetSetting[] = WIDGETS.map((widget) => ({
  ...widget,
  visible: widget.id !== 32,
  order: String(widget.id),
}));

function GroupTitle({
  id,
  tone,
  children,
}: {
  readonly id: string;
  readonly tone: WidgetTone;
  readonly children: React.ReactNode;
}) {
  return (
    <h2 className="subtitle" id={id}>
      <span className={`colorBar ${tone}`} aria-hidden="true" />
      {children}
    </h2>
  );
}

function WidgetTable({
  label,
  widgets,
  onVisibleChange,
  onOrderChange,
}: {
  readonly label: string;
  readonly widgets: readonly WidgetSetting[];
  readonly onVisibleChange: (id: number, visible: boolean) => void;
  readonly onOrderChange: (id: number, order: string) => void;
}) {
  return (
    <table className="sheet">
      <caption className="visuallyHidden">{label}</caption>
      <colgroup>
        <col className="visibleColumn" />
        <col className="orderColumn" />
        <col />
        <col className="previewColumn" />
      </colgroup>
      <thead>
        <tr>
          <th scope="col">보이기</th>
          <th scope="col">순서</th>
          <th scope="col">항목</th>
          <th scope="col">미리보기</th>
        </tr>
      </thead>
      <tbody>
        {widgets.map((widget) => {
          const visibleLabel = `${widget.name} 보이기`;
          const orderLabel = `${widget.name} 순서`;

          return (
            <tr className="widgetRow" id={`widget${widget.id}`} key={widget.id}>
              <td>
                <label className="fieldLabel">
                  <span className="visuallyHidden">{visibleLabel}</span>
                  <input
                    type="checkbox"
                    checked={widget.visible}
                    onChange={(event) =>
                      onVisibleChange(widget.id, event.target.checked)
                    }
                  />
                </label>
              </td>
              <td>
                <label className="fieldLabel">
                  <span className="visuallyHidden">{orderLabel}</span>
                  <input
                    className="input orderInput"
                    type="number"
                    min="1"
                    max="35"
                    inputMode="numeric"
                    value={widget.order}
                    onChange={(event) =>
                      onOrderChange(widget.id, event.target.value)
                    }
                  />
                </label>
              </td>
              <td>{widget.name}</td>
              <td>
                {widget.hasPreview === false ? (
                  <span className="previewUnavailable" aria-label="미리보기 없음">
                    —
                  </span>
                ) : (
                  <>
                    <button
                      className="previewButton"
                      type="button"
                      aria-label={`${widget.name} 미리보기`}
                    >
                      <i className="bi bi-image" aria-hidden="true" />
                    </button>
                    <span
                      className={`previewCard preview-${widget.tone}`}
                      aria-hidden="true"
                    >
                      <span className="previewCardTitle">{widget.name}</span>
                      <span className="previewMetric">
                        {widget.id.toString().padStart(2, "0")}
                        <small> WIDGET</small>
                      </span>
                      <span className="previewChart">
                        <i />
                        <i />
                        <i />
                        <i />
                        <i />
                      </span>
                      <span className="previewLegend">
                        <i />
                        <i />
                        <i />
                      </span>
                    </span>
                  </>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function WidgetSettings() {
  const [displayNumber, setDisplayNumber] = useState("5");
  const [widgets, setWidgets] =
    useState<readonly WidgetSetting[]>(INITIAL_SETTINGS);
  const [saveVersion, setSaveVersion] = useState(0);

  useEffect(() => {
    if (saveVersion === 0) return;

    const timer = window.setTimeout(() => setSaveVersion(0), 2800);
    return () => window.clearTimeout(timer);
  }, [saveVersion]);

  const updateWidget = (
    id: number,
    change: Partial<Pick<WidgetSetting, "visible" | "order">>,
  ) => {
    setWidgets((current) =>
      current.map((widget) =>
        widget.id === id ? { ...widget, ...change } : widget,
      ),
    );
  };

  const widgetsFor = (definitions: readonly WidgetDefinition[]) => {
    const ids = new Set(definitions.map(({ id }) => id));
    return widgets.filter(({ id }) => ids.has(id));
  };

  return (
    <>
      <PageStyles files={["/fit/assets/css/widgetSet.css"]} />
      <style>{`
        .widgetSettings .subtitle {
          margin: 0;
          color: inherit;
          font-size: 20px;
          font-weight: 500;
        }
        .widgetSettings .colorBar.blue { background-color: #307eeb; }
        .widgetSettings .col1 { gap: 32px; }
        .widgetSettings .col2 {
          gap: 48px;
        }
        .widgetSettings .groupSection {
          min-width: 0;
        }
        .widgetSettings .sheet {
          table-layout: fixed;
        }
        .widgetSettings .sheet th,
        .widgetSettings .sheet td {
          padding: 9.6px 3.2px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
          font-size: 16px;
        }
        .widgetSettings .sheet th {
          background-color: rgb(1, 31, 104);
        }
        .widgetSettings .sheet tbody td:nth-child(3) {
          overflow-wrap: anywhere;
          word-break: keep-all;
        }
        .widgetSettings .visibleColumn { width: 68px; }
        .widgetSettings .orderColumn { width: 64px; }
        .widgetSettings .previewColumn { width: 76px; }
        .widgetSettings .fieldLabel {
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0;
        }
        .widgetSettings .sheet input[type="checkbox"] {
          width: 22px;
          height: 22px;
          border-color: #5190a5;
        }
        .widgetSettings .sheet input[type="checkbox"]::after {
          content: "✓";
          font-family: inherit;
          line-height: 1;
        }
        .widgetSettings .sheet input[type="checkbox"]:checked {
          background-color: #307eeb;
        }
        .widgetSettings .orderInput {
          width: 50px;
          height: 34px;
          padding: 3.2px;
          border: 1px solid #5190a5;
          background-color: transparent;
          color: inherit;
        }
        .widgetSettings .previewButton {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 30px;
          padding: 0;
          border: 0;
          border-radius: 4px;
          background: transparent;
          color: rgba(255, 255, 255, 0.82);
          font-size: 17px;
          font-weight: 400;
        }
        .widgetSettings .previewButton:hover,
        .widgetSettings .previewButton:focus-visible {
          background-color: rgba(48, 126, 235, 0.22);
          color: #fff;
          outline: 2px solid #739de3;
          outline-offset: 1px;
        }
        .widgetSettings .sheet td:last-child {
          position: relative;
        }
        .widgetSettings .previewCard {
          display: none;
          position: absolute;
          z-index: 1030;
          top: 50%;
          right: 50%;
          width: 200px;
          height: 268px;
          padding: 18px 16px;
          border: 2px solid #739de3;
          border-radius: 12px;
          box-sizing: border-box;
          background:
            radial-gradient(circle at 72% 20%, rgba(48,126,235,.28), transparent 35%),
            #09143a;
          color: rgba(255,255,255,.9);
          text-align: left;
          box-shadow: 0 0 1rem rgba(0,0,0,.45);
          transform: translateY(-50%);
          pointer-events: none;
        }
        .widgetSettings .previewButton:hover + .previewCard,
        .widgetSettings .previewButton:focus-visible + .previewCard {
          display: block;
        }
        .widgetSettings .preview-green { border-color: #18b4a7; }
        .widgetSettings .preview-purple { border-color: #845df0; }
        .widgetSettings .previewCardTitle {
          display: block;
          min-height: 46px;
          padding-bottom: 11px;
          border-bottom: 1px solid rgba(255,255,255,.18);
          font-size: 15px;
          font-weight: 500;
        }
        .widgetSettings .previewMetric {
          display: block;
          margin-top: 18px;
          color: #7ec8ff;
          font: 700 30px/1 "Open Sans", sans-serif;
        }
        .widgetSettings .preview-green .previewMetric { color: #43d8ca; }
        .widgetSettings .preview-purple .previewMetric { color: #a88cff; }
        .widgetSettings .previewMetric small {
          font-size: 10px;
          font-weight: 400;
        }
        .widgetSettings .previewChart {
          display: flex;
          align-items: end;
          gap: 8px;
          height: 83px;
          margin-top: 18px;
          padding: 0 9px 8px;
          border-bottom: 1px solid rgba(255,255,255,.2);
        }
        .widgetSettings .previewChart i {
          display: block;
          flex: 1;
          border-radius: 2px 2px 0 0;
          background: linear-gradient(#58b5ff, #205bc2);
        }
        .widgetSettings .preview-green .previewChart i {
          background: linear-gradient(#53ddc9, #087d75);
        }
        .widgetSettings .preview-purple .previewChart i {
          background: linear-gradient(#ac91ff, #5930c7);
        }
        .widgetSettings .previewChart i:nth-child(1) { height: 38%; }
        .widgetSettings .previewChart i:nth-child(2) { height: 68%; }
        .widgetSettings .previewChart i:nth-child(3) { height: 48%; }
        .widgetSettings .previewChart i:nth-child(4) { height: 88%; }
        .widgetSettings .previewChart i:nth-child(5) { height: 64%; }
        .widgetSettings .previewLegend {
          display: flex;
          gap: 6px;
          margin-top: 12px;
        }
        .widgetSettings .previewLegend i {
          display: block;
          width: 36px;
          height: 5px;
          border-radius: 5px;
          background: rgba(255,255,255,.18);
        }
        .widgetSettings .previewUnavailable {
          color: rgba(255, 255, 255, 0.35);
        }
        .widgetSettings .act {
          border: 0;
          background-color: #2062bf;
          color: #fff;
          font-weight: 500;
        }
        .widgetSettings .visuallyHidden {
          overflow: hidden;
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          border: 0;
          clip: rect(0 0 0 0);
          white-space: nowrap;
        }
        .widgetSettingsToast {
          top: 80px;
          right: 30px;
        }
        @media (max-width: 1024px) {
          .widgetSettings .col2 {
            grid-template-columns: 1fr;
            gap: 10px;
          }
        }
        @media (max-width: 480px) {
          .widgetSettings .sheetArea {
            padding: 16px 0;
            border: 0;
          }
          .widgetSettings .col1 {
            align-items: flex-start;
            gap: 8px;
          }
          .widgetSettings .sheet {
            margin: 12px 0 20px;
          }
          .widgetSettings .visibleColumn { width: 54px; }
          .widgetSettings .orderColumn { width: 56px; }
          .widgetSettings .previewColumn { width: 56px; }
          .widgetSettings .previewCard {
            right: 8px;
          }
          .widgetSettingsToast {
            right: 16px;
            width: calc(100vw - 32px);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .widgetSettingsToast { animation: none; }
        }
      `}</style>
      <main className="contents widgetSettings" id="contentsArea">
        <h1 className="deskTitle">대시보드 화면설정</h1>
        <div className="sheetArea">
          <div className="col1">
            <label className="subtitle" htmlFor="displayNumber">
              <span className="colorBar blue" aria-hidden="true" />
              1줄에 보여질 위젯 갯수
            </label>
            <select
              className="select"
              id="displayNumber"
              value={displayNumber}
              onChange={(event) => setDisplayNumber(event.target.value)}
            >
              <option value="5">5개</option>
              <option value="4">4개</option>
              <option value="3">3개</option>
            </select>
          </div>

          <section className="groupSection" aria-labelledby="energy-use-title">
            <GroupTitle id="energy-use-title" tone="blue">
              에너지사용
            </GroupTitle>
            <div className="col2">
              <WidgetTable
                label="에너지사용 위젯 1열"
                widgets={widgetsFor(ENERGY_LEFT)}
                onVisibleChange={(id, visible) =>
                  updateWidget(id, { visible })
                }
                onOrderChange={(id, order) => updateWidget(id, { order })}
              />
              <WidgetTable
                label="에너지사용 위젯 2열"
                widgets={widgetsFor(ENERGY_RIGHT)}
                onVisibleChange={(id, visible) =>
                  updateWidget(id, { visible })
                }
                onOrderChange={(id, order) => updateWidget(id, { order })}
              />
            </div>
          </section>

          <div className="col2">
            <section className="groupSection" aria-labelledby="production-title">
              <GroupTitle id="production-title" tone="green">
                생산현황
              </GroupTitle>
              <WidgetTable
                label="생산현황 위젯"
                widgets={widgetsFor(PRODUCTION)}
                onVisibleChange={(id, visible) =>
                  updateWidget(id, { visible })
                }
                onOrderChange={(id, order) => updateWidget(id, { order })}
              />
            </section>
            <section className="groupSection" aria-labelledby="re100-title">
              <GroupTitle id="re100-title" tone="purple">
                RE100 이행
              </GroupTitle>
              <WidgetTable
                label="RE100 이행 위젯"
                widgets={widgetsFor(RE100)}
                onVisibleChange={(id, visible) =>
                  updateWidget(id, { visible })
                }
                onOrderChange={(id, order) => updateWidget(id, { order })}
              />
            </section>
          </div>

          <div className="col2">
            <section className="groupSection" aria-labelledby="esg-title">
              <GroupTitle id="esg-title" tone="blue">
                ESG 경영
              </GroupTitle>
              <WidgetTable
                label="ESG 경영 위젯"
                widgets={widgetsFor(ESG)}
                onVisibleChange={(id, visible) =>
                  updateWidget(id, { visible })
                }
                onOrderChange={(id, order) => updateWidget(id, { order })}
              />
            </section>
          </div>

          <div className="actArea">
            <button
              className="act"
              id="actSave"
              type="button"
              onClick={() => setSaveVersion((version) => version + 1)}
            >
              설정 저장
            </button>
          </div>
        </div>
      </main>

      {saveVersion > 0 && (
        <div
          className="toast toastBlue widgetSettingsToast fadeIn"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          저장되었습니다.
        </div>
      )}
    </>
  );
}
