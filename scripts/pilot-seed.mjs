import mapping from "../src/features/pilot/mapping.json" with { type: "json" };

const TENANT_ID = "121";
const GATEWAY_ID = mapping.gateway.id;
const GATEWAY_CODE = mapping.gateway.id;
const GATEWAY_NAME = mapping.gateway.id;
const POINT_PM_ID = mapping.points[0].id;
const POINT_DIN_ID = mapping.points[1].id;
const READING_HOURS = 48;

function pad(value) {
  return String(value).padStart(2, "0");
}

function seoulParts(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
  };
}

function seoulHourUtc(year, month, day, hour) {
  return new Date(
    `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:00:00.000+09:00`,
  );
}

function listPilotHourStarts(now = new Date(), hours = READING_HOURS) {
  const current = seoulParts(now);
  const end = seoulHourUtc(current.year, current.month, current.day, current.hour);
  const starts = [];
  for (let offset = hours - 1; offset >= 0; offset -= 1) {
    starts.push(new Date(end.getTime() - offset * 60 * 60 * 1000));
  }
  return starts;
}

function mockHourlyFields(observedAt) {
  const { hour } = seoulParts(observedAt);
  const daytime = hour >= 8 && hour < 18;
  const wave = Math.sin(((hour - 6) / 12) * Math.PI);
  const kw = Number(
    (daytime ? 28 + 22 * Math.max(0, wave) : 9 + 6 * Math.max(0, wave)).toFixed(1),
  );
  const V = Number((380 + ((hour * 3) % 7) - 3).toFixed(1));
  const A = Number(((kw * 1000) / (V * Math.sqrt(3))).toFixed(1));
  return { kWh: kw, kW: kw, V, A };
}

function readingId(pointId, observedAt) {
  const { year, month, day, hour } = seoulParts(observedAt);
  return `rd-${pointId}-${year}${pad(month)}${pad(day)}${pad(hour)}`;
}

export function seedPilotData(db, options = {}) {
  const din = mapping.points.find((point) => point.id === POINT_DIN_ID);
  if (!din || din.enabled !== false) {
    throw new Error("pt-din-01 must remain enabled: false");
  }

  const now = options.now ?? new Date();
  const hours = options.hours ?? READING_HOURS;
  const tenantId = options.tenantId ?? TENANT_ID;
  const stamped = now.toISOString();

  db.prepare(
    `INSERT OR IGNORE INTO tenants (id, name, timezone, created_at)
     VALUES (?, ?, 'Asia/Seoul', ?)`,
  ).run(tenantId, "대산금속", stamped);

  db.prepare(
    `INSERT INTO gateways
     (id, tenant_id, code, name, status, rtu, lte, source, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'ACTIVE', ?, 1, 'mock', ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       tenant_id = excluded.tenant_id,
       code = excluded.code,
       name = excluded.name,
       status = excluded.status,
       rtu = excluded.rtu,
       lte = excluded.lte,
       source = excluded.source,
       updated_at = excluded.updated_at`,
  ).run(
    GATEWAY_ID,
    tenantId,
    GATEWAY_CODE,
    GATEWAY_NAME,
    mapping.gateway.rtu,
    stamped,
    stamped,
  );

  const upsertPoint = db.prepare(
    `INSERT INTO control_points
     (id, tenant_id, gateway_id, tag, meter, enabled, source, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'mock', ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       tenant_id = excluded.tenant_id,
       gateway_id = excluded.gateway_id,
       tag = excluded.tag,
       meter = excluded.meter,
       enabled = excluded.enabled,
       source = excluded.source,
       updated_at = excluded.updated_at`,
  );

  for (const point of mapping.points) {
    const enabled = point.id === POINT_DIN_ID ? 0 : point.enabled === false ? 0 : 1;
    upsertPoint.run(
      point.id,
      tenantId,
      point.gatewayId,
      point.tag,
      point.meter,
      enabled,
      stamped,
      stamped,
    );
  }

  db.prepare(
    `DELETE FROM point_readings
     WHERE source = 'mock' AND point_id IN (?, ?)`,
  ).run(POINT_PM_ID, POINT_DIN_ID);

  const insertReading = db.prepare(
    `INSERT INTO point_readings
     (id, tenant_id, point_id, observed_at, interval, kwh, kw, voltage, amperage, source)
     VALUES (?, ?, ?, ?, '1h', ?, ?, ?, ?, 'mock')`,
  );

  for (const start of listPilotHourStarts(now, hours)) {
    const fields = mockHourlyFields(start);
    insertReading.run(
      readingId(POINT_PM_ID, start),
      tenantId,
      POINT_PM_ID,
      start.toISOString(),
      fields.kWh,
      fields.kW,
      fields.V,
      fields.A,
    );
  }
}
