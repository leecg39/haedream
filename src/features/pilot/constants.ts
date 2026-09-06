import mapping from "./mapping.json";
import bom from "./bom.json";
import type { DataSource, PilotChecklistKey } from "@/features/pilot/types";
import { PILOT_CHECKLIST_KEYS } from "@/features/pilot/types";

export const PILOT_MAPPING = mapping;
export const PILOT_BOM = bom;
export { PILOT_CHECKLIST_KEYS };

export const PILOT_TENANT_ID = "121";
export const PILOT_GATEWAY_ID = mapping.gateway.id;
/** Neutral seed labels only — do not brand as a portal or program. */
export const PILOT_GATEWAY_CODE = mapping.gateway.id;
export const PILOT_GATEWAY_NAME = mapping.gateway.id;
export const PILOT_RTU = mapping.gateway.rtu;
export const PILOT_POINT_PM_ID = mapping.points[0].id;
export const PILOT_POINT_DIN_ID = mapping.points[1].id;
/** Field ops: DIN is a candidate only. Do not enable in seed. */
export const PILOT_POINT_DIN_ENABLED = false;
export const PILOT_READING_INTERVAL = mapping.readings.interval;
export const PILOT_READING_FIELDS = mapping.readings.fields;
export const PILOT_READING_VALUE_KEYS = ["kWh", "kW", "V", "A"] as const;
export const PILOT_DEFAULT_SOURCE = mapping.gateway.source as DataSource;
export const PILOT_READING_HOURS = 48;

export const DATA_SOURCE_ENV = "DATA_SOURCE";

export const PILOT_CHECKLIST_ITEMS: ReadonlyArray<{
  key: PilotChecklistKey;
  label: string;
}> = [
  { key: "rtu_485_led", label: "RTU 485_A / 485_B 통신 LED" },
  { key: "lte_link", label: "LTE 등록·신호·데이터 송출 (안테나·SIM)" },
  { key: "meter_ct", label: "전력계 전압·CT 극성·적산값" },
  {
    key: "gateway_tag_match",
    label: "게이트웨이↔설비 ID · 관제점 태그 일치 (gw-pilot-01 ↔ PANEL_PM)",
  },
  {
    key: "disconnect_alarm_operator",
    label: "끊김·알람 수신 (operator)",
  },
];

/** Not MockDB sources. Do not stub portal APIs for these. */
export const FORBIDDEN_DATA_SOURCE_ALIASES = [
  "kfems",
  "k-fems",
  "k_fems",
  "k-fems-free",
  "power-planner",
  "powerplanner",
  "kepco-planner",
  "kepco",
  "keep+",
  "keepplus",
  "keep",
  "enms",
] as const;

/** Not allowed on readings rows or seed payloads. */
export const FORBIDDEN_READING_FIELDS = [
  "savings",
  "saving",
  "tariff",
  "cost",
  "bill",
  "price",
  "요금",
  "절감",
] as const;

export const FORBIDDEN_LABEL_TERMS = [
  "K-FEMS",
  "KFEMS",
  "한전 파워플래너",
  "파워플래너",
  "KEEP+",
  "EnMS",
] as const;
