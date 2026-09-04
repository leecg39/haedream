import mapping from "./mapping.json";
import type { DataSource } from "@/features/pilot/types";

export const PILOT_MAPPING = mapping;

export const PILOT_TENANT_ID = "121";
export const PILOT_GATEWAY_ID = mapping.gateway.id;
export const PILOT_GATEWAY_CODE = "GW-PILOT-01";
export const PILOT_GATEWAY_NAME = "KFE 파일럿 게이트웨이";
export const PILOT_RTU = mapping.gateway.rtu;
export const PILOT_POINT_PM_ID = mapping.points[0].id;
export const PILOT_POINT_DIN_ID = mapping.points[1].id;
export const PILOT_READING_INTERVAL = mapping.readings.interval;
export const PILOT_READING_FIELDS = mapping.readings.fields;
export const PILOT_DEFAULT_SOURCE = mapping.gateway.source as DataSource;
export const PILOT_READING_HOURS = 48;

export const DATA_SOURCE_ENV = "DATA_SOURCE";
