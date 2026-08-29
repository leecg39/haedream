import type { AbcDeskConfig } from "@/components/abc/AbcDeskTable";

/** 원본 watt gateway.html — 컬럼은 원본 그대로, 값은 데모 목데이터. */
export const GATEWAY_CONFIG: AbcDeskConfig = {
  title: "복합제어기 관리",
  columns: [{ label: "GATE", sortKey: "gid" }, { label: "이름", sortKey: "controlName" }, { label: "모드", sortKey: "controlMode" }, { label: "순위", sortKey: "controlPriority" }, { label: "노드", sortKey: "nodeIndex" }, { label: "제어계측", sortKey: "measureType" }, { label: "전압", tip: "전력계측 요구" }, { label: "전류", tip: "전력계측 요구" }, { label: "온도", tip: "온도계측 요구" }, { label: "상태", sortKey: "controlStat" }, { label: "제어" }, { label: "현재값", tip: "단위(mA)" }, { label: "출력", tip: "제어때 적용되는 현재 설정된 출력값(%)" }, { label: "피크", tip: "피크제어때 적용될 출력값(%)" }, { label: "마지막수신", sortKey: "rTime" }, { label: "CID", tip: "제어 고유아이디" }, { label: "메모" }],
  rows: [["4107", "1호기 제어기", "자동", "1", "N01", "계측", "382", "540", "41.2", "운전", "제어", "1,196", "4.2", "1,600", "2026-08-29 09:15", "C-101", "터보냉동기"], ["4108", "2호기 제어기", "수동", "2", "N02", "제어", "379", "0", "39.8", "정지", "미제어", "0", "0", "1,600", "2026-08-29 09:14", "C-102", "예비기"], ["4109", "공조 제어기", "자동", "3", "N03", "계측", "381", "218", "36.5", "운전", "제어", "842", "2.8", "1,600", "2026-08-29 09:15", "C-103", "AHU-1"]],
  toolbar: [
    { act: "add", icon: "bi bi-node-plus", label: "추가" },
    { act: "excel", icon: "bi bi-file-earmark-excel-fill excel", label: "엑셀로 다운" },
    { act: "print", icon: "bi bi-printer", label: "프린트" },
    { act: "switch", icon: "bi bi-toggles", label: "일괄전환" },
  ],
};
