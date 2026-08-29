"use client";

import { useState } from "react";
import { ABC_WIDGET_ROWS, ABC_WIDGET_SECTIONS, type AbcWidgetRow } from "@/lib/abc/pages/widget-set";

type WidgetState = Record<number, { checked: boolean; order: number }>;

function initialState(): WidgetState {
  const state: WidgetState = {};
  for (const w of ABC_WIDGET_ROWS) state[w.id] = { checked: w.checked, order: w.order };
  return state;
}

function WidgetTable({
  ids,
  rowsById,
  state,
  onToggle,
  onOrderChange,
}: {
  readonly ids: readonly number[];
  readonly rowsById: Map<number, AbcWidgetRow>;
  readonly state: WidgetState;
  readonly onToggle: (id: number) => void;
  readonly onOrderChange: (id: number, value: number) => void;
}) {
  return (
    <table className="sheet">
      <thead>
        <tr>
          <th>보이기</th>
          <th>순서</th>
          <th>항목</th>
          <th>미리보기</th>
        </tr>
      </thead>
      <tbody>
        {ids.map((id) => {
          const row = rowsById.get(id);
          if (!row) return null;
          const s = state[id];
          return (
            <tr className="widgetRow" id={`widget${id}`} key={id}>
              <td>
                <input type="checkbox" checked={s.checked} onChange={() => onToggle(id)} />
              </td>
              <td>
                <input
                  className="input"
                  type="number"
                  value={s.order}
                  onChange={(e) => onOrderChange(id, Number(e.target.value))}
                />
              </td>
              <td>{row.label}</td>
              <td>
                {id === 35 ? null : (
                  <>
                    <i className="bi bi-image" />
                    <span className={`set${id}`} />
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

/**
 * 원본 watt widgetSet.html — 대시보드 화면설정.
 * 4개 섹션(에너지사용/생산현황/RE100 이행/ESG 경영), 섹션마다 좌우 2열 시트.
 * 원본은 id=35(현재 요금제) 만 미리보기 칸이 비어있다.
 */
export function AbcWidgetSet() {
  const [displayNumber, setDisplayNumber] = useState("5");
  const [state, setState] = useState<WidgetState>(initialState);
  const [saved, setSaved] = useState(false);
  const rowsById = new Map(ABC_WIDGET_ROWS.map((w) => [w.id, w]));

  const toggle = (id: number) =>
    setState((prev) => ({ ...prev, [id]: { ...prev[id], checked: !prev[id].checked } }));
  const changeOrder = (id: number, value: number) =>
    setState((prev) => ({ ...prev, [id]: { ...prev[id], order: value } }));

  return (
    <main className="contents" id="contentsArea">
      <h1 className="deskTitle">대시보드 화면설정</h1>
      <div className="sheetArea">
        <div className="col1">
          <div className="subtitle">
            <span className="colorBar blue" />
            1줄에 보여질 위젯 갯수
          </div>
          <select
            id="displayNumber"
            className="select"
            value={displayNumber}
            onChange={(e) => setDisplayNumber(e.target.value)}
          >
            <option value="5">5개</option>
            <option value="4">4개</option>
            <option value="3">3개</option>
          </select>
        </div>

        {ABC_WIDGET_SECTIONS.map((section) => {
          const half = Math.ceil(section.widgetIds.length / 2);
          const left = section.widgetIds.slice(0, half);
          const right = section.widgetIds.slice(half);
          return (
            <div key={section.label}>
              <div className="subtitle">
                <span className={`colorBar ${section.colorBar}`} />
                {section.label}
              </div>
              <div className="col2">
                <div className="col2Left">
                  <WidgetTable ids={left} rowsById={rowsById} state={state} onToggle={toggle} onOrderChange={changeOrder} />
                </div>
                <div className="col2Rt">
                  <WidgetTable ids={right} rowsById={rowsById} state={state} onToggle={toggle} onOrderChange={changeOrder} />
                </div>
              </div>
            </div>
          );
        })}

        <div className="actArea">
          <span className="act" id="actSave" role="button" onClick={() => setSaved(true)}>
            설정 저장
          </span>
        </div>
        {saved ? <p className="saveNotice">저장되었습니다. (데모 — 실제로 반영되지 않습니다)</p> : null}
      </div>
    </main>
  );
}
