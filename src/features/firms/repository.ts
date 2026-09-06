import "server-only";

import { getDb, type AppDatabase } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { firmCreateSchema, type FirmCreateInput } from "@/features/firms/schema";
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

export function createFirm(input: FirmCreateInput, db: AppDatabase = getDb()): PublicFirm {
  const values = firmCreateSchema.parse(input);

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
       frugal_time, invest_gold, kepco_contract, boss, map_geo
     ) VALUES (
       @fid, @seq, @firmName, @registTime, @contract, @kepcoNo, @eoiTime, @pct_ratio,
       @peakLast, @powerLimit, @peakRunMode, @peakControlMode, @isDisable,
       @serviceType, @memo, @frugal, @contractLimit, @ableLowPower, @maxAbleWatt,
       @maxAbleDate, @pass, @degreeCity, @bone, @kepcoCyber, @manager, @phone,
       @addressText, @checkDay, @ableLimit, @ableLimitTime, @pulse_num,
       @frugalTime, @investGold, @kepcoContract, @boss, @mapGeo
     )`,
  ).run({
    ...values,
    fid: next.fid,
    seq: next.seq,
    // 등록일이 비어 있으면 지금 시각을 원본 표기(YYYY-MM-DD HH:mm:ss)로 채운다.
    registTime: values.registTime || new Date().toISOString().slice(0, 19).replace("T", " "),
  });

  const created = findFirm(next.fid, db);
  if (!created) {
    throw new AppError(500, "FIRM_CREATE_FAILED", "업체를 등록하지 못했습니다.");
  }
  return created;
}

/** 업체와 현재 조직의 접근 매핑을 같은 트랜잭션에서 생성한다. */
export function createFirmForUser(
  user: SessionUser,
  input: FirmCreateInput,
  db: AppDatabase = getDb(),
): PublicFirm {
  if (!hasPermission(user.role, "firm:create")) {
    throw new AppError(403, "FORBIDDEN", "이 작업을 수행할 권한이 없습니다.");
  }
  return db.transaction(() => {
    const firm = createFirm(input, db);
    db.prepare(
      `INSERT INTO tenant_firm_access
       (tenant_id, fid, can_view_pii, can_collect, created_at)
       VALUES (?, ?, 0, 0, ?)`,
    ).run(user.tenantId, firm.fid, new Date().toISOString());
    return firm;
  })();
}
