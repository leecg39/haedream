import type { AbcDeskConfig } from "@/components/abc/AbcDeskTable";

/** 원본 watt gate-node.html — 컬럼은 원본 그대로, 값은 데모 목데이터. */
export const GATE_NODE_CONFIG: AbcDeskConfig = {
  title: "게이트웨이 관리",
  columns: ["GATE", "업체", "이름", "IP", "PORT", "IP AToN", "node1", "node2", "node3", "node4", "node5", "node6", "node7", "node8", "node9", "node10", "메모"],
  rows: [["4107", "대산금속 본사", "본관 GW", "115.94.112.219", "9000", "1935569115", "ON", "ON", "ON", "OFF", "ON", "-", "-", "-", "-", "-", "본관 통합"], ["4108", "제1공장", "1공장 GW", "115.94.112.220", "9000", "1935569116", "ON", "ON", "OFF", "ON", "-", "-", "-", "-", "-", "-", "압연라인"], ["4109", "제2공장", "2공장 GW", "115.94.112.221", "9001", "1935569117", "ON", "OFF", "-", "-", "-", "-", "-", "-", "-", "-", "용해로"]],
};
