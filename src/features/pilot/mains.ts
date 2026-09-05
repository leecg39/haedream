import type { PilotSnapshot, Reading } from "@/features/pilot/types";

export type SerializedPilotSnapshot = ReturnType<typeof serializePilotSnapshot>;

export function serializePilotSnapshot(snapshot: PilotSnapshot) {
  return {
    source: snapshot.source,
    gateway: snapshot.gateway
      ? {
          id: snapshot.gateway.id,
          rtu: snapshot.gateway.rtu,
          lte: snapshot.gateway.lte,
          source: snapshot.gateway.source,
          code: snapshot.gateway.code,
          name: snapshot.gateway.name,
        }
      : null,
    points: snapshot.points.map((point) => ({
      id: point.id,
      tag: point.tag,
      meter: point.meter,
      gatewayId: point.gatewayId,
      enabled: point.enabled,
      source: point.source,
    })),
    latestReading: snapshot.latestReading
      ? serializeReading(snapshot.latestReading)
      : null,
    readings: snapshot.readings.map(serializeReading),
  };
}

export function serializeReading(reading: Reading) {
  return {
    id: reading.id,
    pointId: reading.pointId,
    observedAt: reading.observedAt,
    interval: reading.interval,
    kWh: reading.kWh,
    kW: reading.kW,
    V: reading.V,
    A: reading.A,
    source: reading.source,
  };
}

/** Attach the pilot sidecar without replacing cloned fixture totals. */
export function withPilotSidecar<T extends Record<string, unknown>>(
  payload: T,
  snapshot: PilotSnapshot,
) {
  return {
    ...payload,
    pilot: serializePilotSnapshot(snapshot),
  };
}
