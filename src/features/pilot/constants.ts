import mapping from "./mapping.json";
import type { DataSource } from "@/features/pilot/types";

export const PILOT_MAPPING = mapping;

export const PILOT_TENANT_ID = "121";
export const PILOT_GATEWAY_ID = mapping.gateway.id;
/** Neutral seed labels only — do not brand as a portal or program. */
export const PILOT_GATEWAY_CODE = mapping.gateway.id;
export const PILOT_GATEWAY_NAME = mapping.gateway.id;
export const PILOT_RTU = mapping.gateway.rtu;
export const PILOT_POINT_PM_ID = mapping.points[0].id;
export const PILOT_POINT_DIN_ID = mapping.points[1].id;
export const PILOT_READING_INTERVAL = mapping.readings.interval;
export const PILOT_READING_FIELDS = mapping.readings.fields;
export const PILOT_DEFAULT_SOURCE = mapping.gateway.source as DataSource;
export const PILOT_READING_HOURS = 48;

export const DATA_SOURCE_ENV = "DATA_SOURCE";

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

export const FORBIDDEN_LABEL_TERMS = [
  "K-FEMS",
  "KFEMS",
  "한전 파워플래너",
  "파워플래너",
  "KEEP+",
  "EnMS",
] as const;
