import type { AppDatabase } from "@/lib/db";
import { AppError } from "@/lib/errors";
import {
  DATA_SOURCE_ENV,
  PILOT_DEFAULT_SOURCE,
  PILOT_GATEWAY_ID,
  PILOT_TENANT_ID,
} from "@/features/pilot/constants";
import {
  getPilotGateway,
  getPilotSnapshot,
  listControlPoints,
  listReadings,
} from "@/features/pilot/repository";
import type {
  DataSource,
  DataSourceProvider,
  ReadingsQuery,
} from "@/features/pilot/types";
import { DATA_SOURCES } from "@/features/pilot/types";

export function resolveDataSource(explicit?: string | null): DataSource {
  const raw = (explicit || process.env[DATA_SOURCE_ENV] || PILOT_DEFAULT_SOURCE)
    .trim()
    .toLowerCase();
  if ((DATA_SOURCES as readonly string[]).includes(raw)) {
    return raw as DataSource;
  }
  throw new AppError(
    422,
    "INVALID_DATA_SOURCE",
    "데이터 소스는 mock 또는 rtu 여야 합니다.",
  );
}

function createMockProvider(database?: AppDatabase): DataSourceProvider {
  const source = "mock" as const;
  return {
    source,
    getGateway(id, tenantId) {
      const gateway = getPilotGateway(id, tenantId ?? PILOT_TENANT_ID, database);
      if (!gateway || (gateway.source && gateway.source !== source)) return null;
      return gateway;
    },
    getPoints(query = {}) {
      return listControlPoints({ ...query, source }, database);
    },
    getReadings(query = {}) {
      return listReadings({ ...query, source }, database);
    },
    getSnapshot(query = {}) {
      return getPilotSnapshot({ ...query, source }, database);
    },
  };
}

function createRtuProvider(): DataSourceProvider {
  const source = "rtu" as const;
  const notImplemented = () => {
    // TODO(rtu-cutover): implement the live collector/API adapter only.
    // Do not emulate KFE / Modbus / LTE protocols in this stub.
    throw new AppError(
      501,
      "RTU_NOT_IMPLEMENTED",
      "RTU 데이터 소스는 아직 연결되지 않았습니다. collector/API만 교체하세요.",
    );
  };
  return {
    source,
    getGateway() {
      return null;
    },
    getPoints() {
      return [];
    },
    getReadings() {
      return notImplemented();
    },
    getSnapshot() {
      return notImplemented();
    },
  };
}

export function getDataSourceProvider(
  source?: string | null,
  database?: AppDatabase,
): DataSourceProvider {
  const resolved = resolveDataSource(source);
  return resolved === "rtu" ? createRtuProvider() : createMockProvider(database);
}

export function getReadings(
  query: ReadingsQuery = {},
  database?: AppDatabase,
) {
  return getDataSourceProvider(query.source, database).getReadings({
    tenantId: query.tenantId ?? PILOT_TENANT_ID,
    gatewayId: query.gatewayId ?? PILOT_GATEWAY_ID,
    ...query,
  });
}

export function getPoints(
  query: ReadingsQuery = {},
  database?: AppDatabase,
) {
  return getDataSourceProvider(query.source, database).getPoints(query);
}

export function getPilotDashboardSnapshot(
  query: ReadingsQuery = {},
  database?: AppDatabase,
) {
  return getDataSourceProvider(query.source, database).getSnapshot({
    tenantId: query.tenantId ?? PILOT_TENANT_ID,
    gatewayId: query.gatewayId ?? PILOT_GATEWAY_ID,
    ...query,
  });
}
