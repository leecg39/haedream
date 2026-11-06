export const DATA_SOURCES = ["mock", "rtu"] as const;
export type DataSource = (typeof DATA_SOURCES)[number];

export interface PilotGateway {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
  rtu: string | null;
  lte: boolean;
  source: DataSource | null;
}

export interface ControlPoint {
  id: string;
  tenantId: string;
  gatewayId: string;
  tag: string;
  meter: string;
  enabled: boolean;
  source: DataSource;
}

export interface Reading {
  id: string;
  tenantId: string;
  pointId: string;
  observedAt: string;
  interval: "1h";
  kWh: number | null;
  kW: number | null;
  V: number | null;
  A: number | null;
  source: DataSource;
}

export interface ReadingsQuery {
  source?: DataSource;
  tenantId?: string;
  gatewayId?: string;
  pointId?: string;
  from?: string;
  to?: string;
  enabledOnly?: boolean;
}

export interface PilotSnapshot {
  source: DataSource;
  gateway: PilotGateway | null;
  points: ControlPoint[];
  latestReading: Reading | null;
  readings: Reading[];
}

export interface DataSourceProvider {
  readonly source: DataSource;
  getGateway(id: string, tenantId?: string): PilotGateway | null;
  getPoints(query?: Pick<ReadingsQuery, "gatewayId" | "enabledOnly" | "tenantId">): ControlPoint[];
  getReadings(query?: ReadingsQuery): Reading[];
  getSnapshot(query?: ReadingsQuery): PilotSnapshot;
}

export const PILOT_ALARM_TYPES = ["DISCONNECT", "ALARM"] as const;
export type PilotAlarmType = (typeof PILOT_ALARM_TYPES)[number];

export const PILOT_ALARM_SEVERITIES = ["INFO", "WARN", "CRITICAL"] as const;
export type PilotAlarmSeverity = (typeof PILOT_ALARM_SEVERITIES)[number];

export interface PilotAlarm {
  id: string;
  tenantId: string;
  gatewayId: string;
  pointId: string | null;
  type: PilotAlarmType;
  severity: PilotAlarmSeverity;
  title: string;
  message: string;
  observedAt: string;
  source: DataSource;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  createdAt: string;
}

export const PILOT_CHECKLIST_KEYS = [
  "rtu_485_led",
  "lte_link",
  "meter_ct",
  "gateway_tag_match",
  "disconnect_alarm_operator",
] as const;
export type PilotChecklistKey = (typeof PILOT_CHECKLIST_KEYS)[number];

export const PILOT_ITEM_RESULTS = ["PASS", "FAIL", "NA"] as const;
export type PilotItemResult = (typeof PILOT_ITEM_RESULTS)[number];

export const PILOT_RUN_STATUSES = ["PASS", "FAIL", "PARTIAL"] as const;
export type PilotRunStatus = (typeof PILOT_RUN_STATUSES)[number];

export interface PilotInspectionItem {
  id: string;
  runId: string;
  itemKey: PilotChecklistKey;
  result: PilotItemResult;
  note: string;
}

export interface PilotInspectionRun {
  id: string;
  tenantId: string;
  gatewayId: string;
  inspectedAt: string;
  inspectorId: string;
  status: PilotRunStatus;
  notes: string;
  createdAt: string;
  items: PilotInspectionItem[];
}

export interface PilotDailyConfirmation {
  id: string;
  tenantId: string;
  gatewayId: string;
  confirmDate: string;
  receptionOk: boolean;
  alarmReviewed: boolean;
  confirmedBy: string;
  confirmedAt: string;
  note: string;
}

export interface PilotBomItem {
  item: string;
  note: string;
}

export interface PilotBom {
  package: "A";
  gatewayId: string;
  standardBom: PilotBomItem[];
  optionalBom: PilotBomItem[];
  checklistKeys: readonly PilotChecklistKey[];
}

export interface PilotOpsSummary {
  unackedAlarmCount: number;
  latestInspection: PilotInspectionRun | null;
  todayConfirmation: PilotDailyConfirmation | null;
  latestReadingAt: string | null;
  mappingOk: boolean;
}
