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
