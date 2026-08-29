import type { AbcDeskConfig } from "@/components/abc/AbcDeskTable";

/** 원본 watt gate-node.html — 컬럼은 원본 그대로, 값은 데모 목데이터. */
export const GATE_NODE_CONFIG: AbcDeskConfig = {
  title: "게이트웨이 관리",
  columns: [{ label: "GATE", sortKey: "gid", tip: "고유등록번호" }, { label: "업체" }, { label: "이름", sortKey: "gateName" }, { label: "IP", sortKey: "ip" }, { label: "PORT", sortKey: "portNo" }, { label: "IP AToN", sortKey: "ip" }, { label: "node1" }, { label: "node2" }, { label: "node3" }, { label: "node4" }, { label: "node5" }, { label: "node6" }, { label: "node7" }, { label: "node8" }, { label: "node9" }, { label: "node10" }, { label: "메모" }],
  rows: [["4107", "대산금속 본사", "본관 GW", "115.94.112.219", "9000", "1935569115", "ON", "ON", "ON", "OFF", "ON", "-", "-", "-", "-", "-", "본관 통합"], ["4108", "제1공장", "1공장 GW", "115.94.112.220", "9000", "1935569116", "ON", "ON", "OFF", "ON", "-", "-", "-", "-", "-", "-", "압연라인"], ["4109", "제2공장", "2공장 GW", "115.94.112.221", "9001", "1935569117", "ON", "OFF", "-", "-", "-", "-", "-", "-", "-", "-", "용해로"]],
  toolbar: [
    { act: "add", icon: "bi bi-node-plus", label: "추가" },
    { act: "excel", icon: "bi bi-file-earmark-excel-fill excel", label: "엑셀로 다운" },
    { act: "print", icon: "bi bi-printer", label: "프린트" },
  ],
};
