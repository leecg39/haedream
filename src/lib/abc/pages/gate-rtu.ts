import type { AbcDeskConfig } from "@/components/abc/AbcDeskTable";

/** 원본 watt gate-rtu.html — 컬럼은 원본 그대로, 값은 데모 목데이터. */
export const GATE_RTU_CONFIG: AbcDeskConfig = {
  title: "RTU 관리",
  columns: [{ label: "RTU", sortKey: "gid" }, { label: "업체" }, { label: "이름", sortKey: "gateName" }, { label: "IP Address", sortKey: "ip" }, { label: "PORT", sortKey: "portNo" }, { label: "IP AToN", sortKey: "ip" }, { label: "마지막수신", sortKey: "rTime" }, { label: "메모" }],
  rows: [["9", "대산금속 본사", "본관 RTU", "115.94.112.219", "58779", "1935569115", "2026-08-29 09:15", "본관"], ["9", "제1공장", "1공장 RTU", "115.94.112.220", "59276", "1935569116", "2026-08-29 09:15", "압연"], ["7", "제2공장", "2공장 RTU", "115.94.112.221", "49299", "1935569117", "2026-08-29 09:14", "용해"], ["4", "제2공장", "용해 RTU", "115.94.112.222", "60174", "1935569118", "2026-08-29 09:15", "전기로"]],
  toolbar: [
    { act: "add", icon: "bi bi-file-plus", label: "추가" },
    { act: "excel", icon: "bi bi-file-earmark-excel-fill excel", label: "엑셀로 다운" },
    { act: "print", icon: "bi bi-printer", label: "프린트" },
  ],
};
