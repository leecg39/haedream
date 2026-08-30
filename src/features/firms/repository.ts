import { getDb, type AppDatabase } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { firmCreateSchema, type FirmCreateInput } from "@/features/firms/schema";
import type { PublicFirm } from "@/features/firms/types";

/**
 * 업체 마스터 조회/등록.
 *
 * 컬럼은 snake_case, 응답은 정적 JSON(firm-rows.json)이 쓰던 키를 그대로 쓴다.
 * 정적 firm.html(public/assets/js/firm-demo.js)이 이 형태를 그대로 소비하므로
 * 별칭을 임의로 바꾸면 안 된다.
 *
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

export function countFirms(db: AppDatabase = getDb()): number {
  const row = db.prepare("SELECT COUNT(*) AS total FROM firms").get() as { total: number };
  return row.total;
}

export function findFirm(fid: number, db: AppDatabase = getDb()): PublicFirm | null {
  const row = db.prepare(`${firmSelect} WHERE fid = ?`).get(fid);
  return (row as PublicFirm | undefined) ?? null;
}

export function createFirm(input: FirmCreateInput, db: AppDatabase = getDb()): PublicFirm {
  const values = firmCreateSchema.parse(input);

  const next = db
    .prepare("SELECT COALESCE(MAX(fid), 0) + 1 AS fid, COALESCE(MAX(seq), 0) + 1 AS seq FROM firms")
    .get() as { fid: number; seq: number };

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
