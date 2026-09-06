import "server-only";

import { randomUUID } from "node:crypto";
import { getDb, type AppDatabase } from "@/lib/db";
import { AppError } from "@/lib/errors";
import {
  firmCreateSchema,
  firmUpdateSchema,
  type FirmCreateInput,
  type FirmUpdateInput,
} from "@/features/firms/schema";
import type { FirmListItemDto, PublicFirm } from "@/features/firms/types";
import { toFirmListItem } from "@/features/firms/dto.server";
import type { SessionUser } from "@/features/facilities/types";
import { hasPermission } from "@/lib/auth";
import { requireFirmAccess } from "@/features/firms/authorization.server";
import { DEMO_FIRM_ID_START } from "@/lib/seed";

/**
 * 업체 마스터 조회/등록.
 *
 * 컬럼은 snake_case, 응답은 정적 EMS(firm-demo.js)가 기대하는 camelCase 키를 쓴다.
 * 어떤 경로로도 한전 비밀번호를 읽거나 쓰지 않는다 — 컬럼 자체가 없다.
 */

const firmSelect = `
  SELECT
    fid,
    version,
    created_at AS createdAt,
    created_by AS createdBy,
    updated_at AS updatedAt,
    updated_by AS updatedBy,
    firm_name AS firmName,
    regist_time AS registTime,
    contract,
    kepco_no AS kepcoNo,
    eoi_time AS eoiTime,
    pct_ratio,
    peak_last AS peakLast,
    power_limit AS powerLimit,
    peak_run_mode AS peakRunMode,
    peak_control_mode AS peakControlMode,
    is_disable AS isDisable,
    service_type AS serviceType,
    memo,
    frugal,
    contract_limit AS contractLimit,
    able_low_power AS ableLowPower,
    max_able_watt AS maxAbleWatt,
    max_able_date AS maxAbleDate,
    pass,
    degree_city AS degreeCity,
    bone,
    kepco_cyber AS kepcoCyber,
    manager,
    phone,
    address_text AS addressText,
    check_day AS checkDay,
    able_limit AS ableLimit,
    able_limit_time AS ableLimitTime,
    pulse_num,
    frugal_time AS frugalTime,
    invest_gold AS investGold,
    kepco_contract AS kepcoContract,
    boss,
    map_geo AS mapGeo
  FROM firms
`;

/**
 * facilities 와 같이 db 를 주입받을 수 있게 열어 둔다(테스트에서 임시 DB 사용).
 * 생략하면 프로세스 공용 DB 를 쓴다.
 */

/** 정적 JSON 이 쓰던 배열 순서(seq)를 그대로 재현한다. */
export function listFirms(db: AppDatabase = getDb()): PublicFirm[] {
  return db.prepare(`${firmSelect} ORDER BY seq`).all() as PublicFirm[];
}

/** 현재 조직에 명시적으로 매핑된 업체만 반환한다. */
export function listFirmsForUser(
  user: SessionUser,
  db: AppDatabase = getDb(),
): PublicFirm[] {
  if (!hasPermission(user.role, "firm:read")) {
    throw new AppError(403, "FORBIDDEN", "이 작업을 수행할 권한이 없습니다.");
  }
  const rows = db
    .prepare(
      `${firmSelect}
       WHERE EXISTS (
         SELECT 1 FROM tenant_firm_access access
         WHERE access.fid = firms.fid AND access.tenant_id = ?
       )
       ORDER BY firms.seq`,
    )
    .all(user.tenantId) as PublicFirm[];
  if (!hasPermission(user.role, "firm:pii:read")) {
    return rows.map(maskFirmPii);
  }
  const piiFids = new Set(
    (db
      .prepare(
        `SELECT fid FROM tenant_firm_access
         WHERE tenant_id = ? AND can_view_pii = 1`,
      )
      .all(user.tenantId) as Array<{ fid: number }>).map((row) => row.fid),
  );
  return rows.map((row) => (piiFids.has(row.fid) ? row : maskFirmPii(row)));
}

/** 목록/표용 최소 DTO. 연락처·주소·지도 좌표를 직렬화하지 않는다. */
export function listFirmItemsForUser(
  user: SessionUser,
  db: AppDatabase = getDb(),
): FirmListItemDto[] {
  return listFirmsForUser(user, db).map(toFirmListItem);
}

function maskFirmPii(firm: PublicFirm): PublicFirm {
  const kepcoNo = firm.kepcoNo
    ? `${"*".repeat(Math.max(0, firm.kepcoNo.length - 4))}${firm.kepcoNo.slice(-4)}`
    : "";
  return {
    ...firm,
    kepcoNo,
    kepcoCyber: "",
    manager: "",
    phone: "",
    addressText: "",
    pass: "",
    boss: "",
    mapGeo: "",
    memo: "",
    bone: "",
  };
}

export function countFirms(db: AppDatabase = getDb()): number {
  const row = db.prepare("SELECT COUNT(*) AS total FROM firms").get() as { total: number };
  return row.total;
}

export function findFirm(fid: number, db: AppDatabase = getDb()): PublicFirm | null {
  const row = db.prepare(`${firmSelect} WHERE fid = ?`).get(fid);
  return (row as PublicFirm | undefined) ?? null;
}

export function findFirmForUser(
  user: SessionUser,
  fid: number,
  db: AppDatabase = getDb(),
): PublicFirm {
  if (!hasPermission(user.role, "firm:read")) {
    throw new AppError(403, "FORBIDDEN", "이 작업을 수행할 권한이 없습니다.");
  }
  const access = requireFirmAccess(user, fid, {}, db);
  const firm = findFirm(fid, db);
  if (!firm) {
    throw new AppError(404, "FIRM_NOT_FOUND", "업체를 찾을 수 없습니다.");
  }
  return hasPermission(user.role, "firm:pii:read") && access.canViewPii
    ? firm
    : maskFirmPii(firm);
}

export function findFirmForCollection(
  user: SessionUser,
  fid: number,
  db: AppDatabase = getDb(),
): PublicFirm {
  if (!hasPermission(user.role, "kepco:collect")) {
    throw new AppError(403, "FORBIDDEN", "이 작업을 수행할 권한이 없습니다.");
  }
  requireFirmAccess(user, fid, { collect: true }, db);
  const firm = findFirm(fid, db);
  if (!firm) {
    throw new AppError(404, "FIRM_NOT_FOUND", "업체를 찾을 수 없습니다.");
  }
  return firm;
}

/** 감사 로그용 최소 스냅샷. 연락처·주소·비밀번호는 복제하지 않는다. */
function firmAuditSnapshot(firm: PublicFirm) {
  return {
    fid: firm.fid,
    version: firm.version,
    firmName: firm.firmName,
    contract: firm.contract,
    kepcoNo: firm.kepcoNo,
    serviceType: firm.serviceType,
    isDisable: firm.isDisable,
    powerLimit: firm.powerLimit,
    contractLimit: firm.contractLimit,
    peakRunMode: firm.peakRunMode,
    peakControlMode: firm.peakControlMode,
    updatedAt: firm.updatedAt,
    updatedBy: firm.updatedBy,
  };
}

function writeFirmAudit(
  db: AppDatabase,
  user: SessionUser,
  fid: number,
  action: "CREATE" | "UPDATE",
  requestId: string,
  before: PublicFirm | null,
  after: PublicFirm | null,
) {
  db.prepare(
    `INSERT INTO audit_logs
     (id, tenant_id, actor_id, entity_type, entity_id, action,
      before_json, after_json, request_id, created_at)
     VALUES (?, ?, ?, 'FIRM', ?, ?, ?, ?, ?, ?)`,
  ).run(
    randomUUID(),
    user.tenantId,
    user.id,
    String(fid),
    action,
    before ? JSON.stringify(firmAuditSnapshot(before)) : null,
    after ? JSON.stringify(firmAuditSnapshot(after)) : null,
    requestId,
    new Date().toISOString(),
  );
}

export function createFirm(
  input: FirmCreateInput,
  db: AppDatabase = getDb(),
  actorId = "",
): PublicFirm {
  const values = firmCreateSchema.parse(input);
  const now = new Date().toISOString();

  const next = db
    .prepare(
      `SELECT COALESCE(MAX(CASE WHEN fid < ? THEN fid END), 0) + 1 AS fid,
              COALESCE(MAX(seq), 0) + 1 AS seq
       FROM firms`,
    )
    .get(DEMO_FIRM_ID_START) as { fid: number; seq: number };

  db.prepare(
    `INSERT INTO firms (
       fid, seq, firm_name, regist_time, contract, kepco_no, eoi_time, pct_ratio,
       peak_last, power_limit, peak_run_mode, peak_control_mode, is_disable,
       service_type, memo, frugal, contract_limit, able_low_power, max_able_watt,
       max_able_date, pass, degree_city, bone, kepco_cyber, manager, phone,
       address_text, check_day, able_limit, able_limit_time, pulse_num,
       frugal_time, invest_gold, kepco_contract, boss, map_geo,
       version, created_at, created_by, updated_at, updated_by
     ) VALUES (
       @fid, @seq, @firmName, @registTime, @contract, @kepcoNo, @eoiTime, @pct_ratio,
       @peakLast, @powerLimit, @peakRunMode, @peakControlMode, @isDisable,
       @serviceType, @memo, @frugal, @contractLimit, @ableLowPower, @maxAbleWatt,
       @maxAbleDate, @pass, @degreeCity, @bone, @kepcoCyber, @manager, @phone,
       @addressText, @checkDay, @ableLimit, @ableLimitTime, @pulse_num,
       @frugalTime, @investGold, @kepcoContract, @boss, @mapGeo,
       1, @createdAt, @createdBy, @updatedAt, @updatedBy
     )`,
  ).run({
    ...values,
    fid: next.fid,
    seq: next.seq,
    // 등록일이 비어 있으면 지금 시각을 원본 표기(YYYY-MM-DD HH:mm:ss)로 채운다.
    registTime: values.registTime || now.slice(0, 19).replace("T", " "),
    createdAt: now,
    createdBy: actorId,
    updatedAt: now,
    updatedBy: actorId,
  });

  const created = findFirm(next.fid, db);
  if (!created) {
    throw new AppError(500, "FIRM_CREATE_FAILED", "업체를 등록하지 못했습니다.");
  }
  return created;
}

const FIRM_PII_CREATE_KEYS = [
  "kepcoNo",
  "kepcoCyber",
  "manager",
  "phone",
  "addressText",
  "pass",
  "boss",
  "mapGeo",
  "memo",
  "bone",
] as const;

function hasNonEmptyPiiFields(input: FirmCreateInput): boolean {
  const values = firmCreateSchema.parse(input);
  return FIRM_PII_CREATE_KEYS.some((key) => {
    const value = values[key];
    return typeof value === "string" && value.trim().length > 0;
  });
}

/** 업체와 현재 조직의 접근 매핑을 같은 트랜잭션에서 생성한다. */
export function createFirmForUser(
  user: SessionUser,
  input: FirmCreateInput,
  requestId: string,
  db: AppDatabase = getDb(),
): PublicFirm {
  if (!hasPermission(user.role, "firm:create")) {
    throw new AppError(403, "FORBIDDEN", "이 작업을 수행할 권한이 없습니다.");
  }

  const writesPii = hasNonEmptyPiiFields(input);
  if (writesPii && !hasPermission(user.role, "firm:pii:read")) {
    throw new AppError(
      403,
      "FIRM_PII_DENIED",
      "고객정보(PII)를 저장할 권한이 없습니다.",
    );
  }
  // 명시적 허용: PII 를 쓰는 생성만 can_view_pii=1.
  // PII 없는 생성은 최소권한(can_view_pii=0)을 유지한다.
  const canViewPii = writesPii ? 1 : 0;

  return db.transaction(() => {
    const firm = createFirm(input, db, user.id);
    db.prepare(
      `INSERT INTO tenant_firm_access
       (tenant_id, fid, can_view_pii, can_collect, created_at)
       VALUES (?, ?, ?, 0, ?)`,
    ).run(user.tenantId, firm.fid, canViewPii, new Date().toISOString());
    writeFirmAudit(db, user, firm.fid, "CREATE", requestId, null, firm);
    return firm;
  })();
}

/** 허용 필드만 갱신한다. fid+version 불일치 시 409. */
export function updateFirmForUser(
  user: SessionUser,
  fid: number,
  input: FirmUpdateInput,
  requestId: string,
  db: AppDatabase = getDb(),
): PublicFirm {
  if (!hasPermission(user.role, "firm:update")) {
    throw new AppError(403, "FORBIDDEN", "이 작업을 수행할 권한이 없습니다.");
  }
  const access = requireFirmAccess(user, fid, {}, db);
  const canWritePii =
    hasPermission(user.role, "firm:pii:read") && access.canViewPii;

  // 마스킹된 상세 폼이 실수로 PII 칸을 실어 보내도 검증·덮어쓰기를 막는다.
  const sanitizedInput: FirmUpdateInput = canWritePii
    ? input
    : (() => {
        const rest = { ...(input as Record<string, unknown>) };
        for (const key of [
          "kepcoNo",
          "kepcoCyber",
          "manager",
          "phone",
          "addressText",
          "pass",
          "boss",
          "mapGeo",
          "memo",
          "bone",
        ] as const) {
          delete rest[key];
        }
        return rest as FirmUpdateInput;
      })();

  const patch = firmUpdateSchema.parse(sanitizedInput);
  const before = findFirm(fid, db);
  if (!before) {
    throw new AppError(404, "FIRM_NOT_FOUND", "업체를 찾을 수 없습니다.");
  }
  if (before.version !== patch.version) {
    throw new AppError(
      409,
      "FIRM_VERSION_CONFLICT",
      "다른 사용자가 먼저 수정했습니다. 다시 불러온 뒤 저장해 주세요.",
    );
  }

  const pii = {
    kepcoNo: canWritePii ? (patch.kepcoNo ?? before.kepcoNo) : before.kepcoNo,
    kepcoCyber: canWritePii
      ? (patch.kepcoCyber ?? before.kepcoCyber)
      : before.kepcoCyber,
    manager: canWritePii ? (patch.manager ?? before.manager) : before.manager,
    phone: canWritePii ? (patch.phone ?? before.phone) : before.phone,
    addressText: canWritePii
      ? (patch.addressText ?? before.addressText)
      : before.addressText,
    pass: canWritePii ? (patch.pass ?? before.pass) : before.pass,
    boss: canWritePii ? (patch.boss ?? before.boss) : before.boss,
    mapGeo: canWritePii ? (patch.mapGeo ?? before.mapGeo) : before.mapGeo,
    memo: canWritePii ? (patch.memo ?? before.memo) : before.memo,
    bone: canWritePii ? (patch.bone ?? before.bone) : before.bone,
  };

  const merged = firmCreateSchema.parse({
    firmName: patch.firmName ?? before.firmName,
    contract: patch.contract ?? before.contract,
    ...pii,
    registTime: patch.registTime ?? before.registTime,
    ableLimitTime: patch.ableLimitTime ?? before.ableLimitTime,
    frugalTime: patch.frugalTime ?? before.frugalTime,
    degreeCity: patch.degreeCity ?? before.degreeCity,
    checkDay: patch.checkDay ?? before.checkDay,
    contractLimit: patch.contractLimit ?? before.contractLimit,
    ableLimit: patch.ableLimit ?? before.ableLimit,
    ableLowPower: patch.ableLowPower ?? before.ableLowPower,
    powerLimit: patch.powerLimit ?? before.powerLimit,
    peakLast: patch.peakLast ?? before.peakLast,
    maxAbleWatt: patch.maxAbleWatt ?? before.maxAbleWatt,
    maxAbleDate: patch.maxAbleDate ?? before.maxAbleDate,
    pct_ratio: patch.pct_ratio ?? before.pct_ratio,
    pulse_num: patch.pulse_num ?? before.pulse_num,
    eoiTime: patch.eoiTime ?? before.eoiTime,
    frugal: patch.frugal ?? before.frugal,
    investGold: patch.investGold ?? before.investGold,
    serviceType: patch.serviceType ?? before.serviceType,
    peakRunMode: patch.peakRunMode ?? before.peakRunMode,
    peakControlMode: patch.peakControlMode ?? before.peakControlMode,
    isDisable: patch.isDisable ?? before.isDisable,
    kepcoContract: patch.kepcoContract ?? before.kepcoContract,
  });

  const now = new Date().toISOString();
  return db.transaction(() => {
    const result = db
      .prepare(
        `UPDATE firms SET
           firm_name = @firmName,
           regist_time = @registTime,
           contract = @contract,
           kepco_no = @kepcoNo,
           eoi_time = @eoiTime,
           pct_ratio = @pct_ratio,
           peak_last = @peakLast,
           power_limit = @powerLimit,
           peak_run_mode = @peakRunMode,
           peak_control_mode = @peakControlMode,
           is_disable = @isDisable,
           service_type = @serviceType,
           memo = @memo,
           frugal = @frugal,
           contract_limit = @contractLimit,
           able_low_power = @ableLowPower,
           max_able_watt = @maxAbleWatt,
           max_able_date = @maxAbleDate,
           pass = @pass,
           degree_city = @degreeCity,
           bone = @bone,
           kepco_cyber = @kepcoCyber,
           manager = @manager,
           phone = @phone,
           address_text = @addressText,
           check_day = @checkDay,
           able_limit = @ableLimit,
           able_limit_time = @ableLimitTime,
           pulse_num = @pulse_num,
           frugal_time = @frugalTime,
           invest_gold = @investGold,
           kepco_contract = @kepcoContract,
           boss = @boss,
           map_geo = @mapGeo,
           version = version + 1,
           updated_at = @updatedAt,
           updated_by = @updatedBy
         WHERE fid = @fid AND version = @expectedVersion`,
      )
      .run({
        ...merged,
        fid,
        expectedVersion: patch.version,
        updatedAt: now,
        updatedBy: user.id,
      });

    if (result.changes !== 1) {
      throw new AppError(
        409,
        "FIRM_VERSION_CONFLICT",
        "다른 사용자가 먼저 수정했습니다. 다시 불러온 뒤 저장해 주세요.",
      );
    }

    const after = findFirm(fid, db);
    if (!after) {
      throw new AppError(500, "FIRM_UPDATE_FAILED", "업체를 수정하지 못했습니다.");
    }
    writeFirmAudit(db, user, fid, "UPDATE", requestId, before, after);
    return after;
  })();
}
