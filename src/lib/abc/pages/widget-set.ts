/**
 * AUTO-DERIVED from watt widgetSet.html (원본 fetch, 35개 위젯).
 * checked 는 원본 기본값(전부 unchecked)을 그대로 따른다.
 */

export interface AbcWidgetRow {
  readonly id: number;
  readonly order: number;
  readonly label: string;
  readonly checked: boolean;
}

export interface AbcWidgetSection {
  readonly label: string;
  readonly colorBar: "blue" | "green" | "purple";
  readonly widgetIds: readonly number[];
}

export const ABC_WIDGET_ROWS: readonly AbcWidgetRow[] = [
  { id: 1, order: 1, label: "실시간 피크 전력", checked: false },
  { id: 2, order: 2, label: "실시간 전력 사용량", checked: false },
  { id: 3, order: 3, label: "오늘의 전력 사용량", checked: false },
  { id: 4, order: 4, label: "생산량 대비 전력 사용량", checked: false },
  { id: 5, order: 5, label: "주간 전력 사용량", checked: false },
  { id: 6, order: 6, label: "오늘의 피크전력", checked: false },
  { id: 7, order: 7, label: "에너지 절감효과", checked: false },
  { id: 8, order: 8, label: "월별 최대수요", checked: false },
  { id: 9, order: 9, label: "설비제어", checked: false },
  { id: 10, order: 10, label: "현재 상태", checked: false },
  { id: 11, order: 11, label: "오늘의 누적 전력 사용량", checked: false },
  { id: 12, order: 12, label: "오늘의 누적 전력 사용요금", checked: false },
  { id: 13, order: 13, label: "누적 전력 사용량", checked: false },
  { id: 14, order: 14, label: "설비별 사용량 TOP", checked: false },
  { id: 15, order: 15, label: "요금제정보 및 통신상태", checked: false },
  { id: 16, order: 16, label: "이달의 생산현황", checked: false },
  { id: 17, order: 17, label: "이달의 생산목표 달성률", checked: false },
  { id: 18, order: 18, label: "월별 생산량대비 전력 사용량", checked: false },
  { id: 19, order: 19, label: "누적 에너지 절감률", checked: false },
  { id: 20, order: 20, label: "공정별 에너지 원단위", checked: false },
  { id: 21, order: 21, label: "RE100 이행 현황", checked: false },
  { id: 22, order: 22, label: "태양광 발전량 그래프", checked: false },
  { id: 23, order: 23, label: "SMP·REC 그래프", checked: false },
  { id: 24, order: 24, label: "RE100 이행 가격 동향", checked: false },
  { id: 25, order: 25, label: "신재생에너지 사용비율", checked: false },
  { id: 26, order: 26, label: "ESG - 환경 1", checked: false },
  { id: 27, order: 27, label: "ESG - 환경 2", checked: false },
  { id: 28, order: 28, label: "ESG - 사회 1", checked: false },
  { id: 29, order: 29, label: "ESG - 사회 2", checked: false },
  { id: 30, order: 30, label: "ESG - 지배구조", checked: false },
  { id: 31, order: 31, label: "공정별 에너지 사용량", checked: false },
  { id: 32, order: 32, label: "분야별 에너지 사용량", checked: false },
  { id: 33, order: 33, label: "오늘의 가스 사용량", checked: false },
  { id: 34, order: 34, label: "공정별 에너지", checked: false },
  { id: 35, order: 35, label: "현재 요금제", checked: false },
];

/** 원본 DOM 순서대로 4개 섹션. 각 섹션 안에서 col2Left/col2Rt 로 절반씩 나뉜다. */
export const ABC_WIDGET_SECTIONS: readonly AbcWidgetSection[] = [
  { label: "에너지사용", colorBar: "blue", widgetIds: [1,2,3,4,5,6,7,8,9,35,10,11,12,13,14,15,31,32,33] },
  { label: "생산현황", colorBar: "green", widgetIds: [16,17,18,19,20,34] },
  { label: "RE100 이행", colorBar: "purple", widgetIds: [21,22,23,24,25] },
  { label: "ESG 경영", colorBar: "blue", widgetIds: [26,27,28,29,30] },
];

export function findWidget(id: number): AbcWidgetRow | undefined {
  return ABC_WIDGET_ROWS.find((w) => w.id === id);
}
