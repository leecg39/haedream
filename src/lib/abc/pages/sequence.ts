import type { AbcDeskConfig } from "@/components/abc/AbcDeskTable";

/** 원본 watt sequence.html — 컬럼은 원본 그대로, 값은 데모 목데이터. */
export const SEQUENCE_CONFIG: AbcDeskConfig = {
  title: "시퀀스 제어",
  columns: [{ label: "업체" }, { label: "제어이름", sortKey: "controlName" }, { label: "제어모드", sortKey: "controlMode" }, { label: "우선순위", sortKey: "controlPriority" }, { label: "제어" }, { label: "상태" }, { label: "제어가능여부" }, { label: "전압" }, { label: "전류" }, { label: "메모" }],
  rows: [
    ["대산금속 본사", "압연 1구역", "자동", "1", "제어중", "운전", "가능", "382", "540", "1순위 부하"],
    ["제1공장", "압연 2구역", "수동", "2", "미제어", "정지", "가능", "0", "0", "예비"],
    ["제2공장", "용해로 구역", "자동", "1", "제어중", "운전", "불가", "383", "612", "고정부하"],
  ],
  toolClassName: "onlypci",
  areaClassName: "setSub seq",
  toolbar: [
    { act: "add", icon: "bi bi-node-plus", label: "추가" },
    { act: "mode", icon: "bi bi-toggles", label: "모드전환" },
    { act: "off", icon: "bi bi-toggle-off", label: "전체 OFF" },
    { act: "on", icon: "bi bi-toggle-on", label: "전체 ON" },
    { act: "excel", icon: "bi bi-file-earmark-excel-fill excel", label: "엑셀로 다운" },
    { act: "print", icon: "bi bi-printer", label: "프린트" },
  ],
};
