/**
 * firm-rows.json(정적 업체 덤프)을 firms 테이블로 시드한다.
 *
 * `INSERT OR IGNORE` 라 fid 가 이미 있으면 건너뛴다 — 재실행해도 안전하고,
 * 화면에서 추가한 업체를 덮어쓰지 않는다.
 *
 * 사용: node scripts/seed-firms.mjs [--db data/solarsimz.db]
 *
 * 보안: 원본 JSON 의 kepcoPasswd 는 읽지 않는다. firms 테이블에 해당 컬럼이 없다.
 */
import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const dbArgIndex = process.argv.indexOf("--db");
const dbPath =
  dbArgIndex !== -1 && process.argv[dbArgIndex + 1]
    ? process.argv[dbArgIndex + 1]
    : process.env.DATABASE_PATH || "data/solarsimz.db";

const rows = JSON.parse(
  readFileSync(path.join(process.cwd(), "src/lib/fit-mocks/firm-rows.json"), "utf8"),
);

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

// firms 테이블만 보장한다. 006 은 CREATE TABLE IF NOT EXISTS 라 재실행이 안전하다.
// 다른 마이그레이션은 건드리지 않는다 — 005 의 ALTER TABLE 처럼 재실행이 불가한
// 구문이 있고, 적용 이력은 src/lib/db.ts 의 _migrations 러너가 관리한다.
db.exec(readFileSync(path.join(process.cwd(), "db", "migrations", "006_firms.sql"), "utf8"));

const insert = db.prepare(`
  INSERT OR IGNORE INTO firms (
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
  )
`);

const text = (value) => (value === undefined || value === null ? "" : String(value));
const num = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);

const seedAll = db.transaction((list) => {
  let inserted = 0;
  list.forEach((row, index) => {
    const result = insert.run({
      fid: num(row.fid),
      seq: index,
      firmName: text(row.firmName),
      registTime: text(row.registTime),
      contract: text(row.contract),
      kepcoNo: text(row.kepcoNo),
      eoiTime: num(row.eoiTime),
      pct_ratio: num(row.pct_ratio),
      peakLast: num(row.peakLast),
      powerLimit: num(row.powerLimit),
      peakRunMode: num(row.peakRunMode),
      peakControlMode: num(row.peakControlMode),
      isDisable: num(row.isDisable),
      serviceType: num(row.serviceType),
      memo: text(row.memo),
      frugal: num(row.frugal),
      contractLimit: num(row.contractLimit),
      ableLowPower: num(row.ableLowPower),
      maxAbleWatt: num(row.maxAbleWatt),
      maxAbleDate: num(row.maxAbleDate),
      pass: text(row.pass),
      degreeCity: num(row.degreeCity),
      bone: text(row.bone),
      kepcoCyber: text(row.kepcoCyber),
      manager: text(row.manager),
      phone: text(row.phone),
      addressText: text(row.addressText),
      checkDay: num(row.checkDay),
      ableLimit: num(row.ableLimit),
      ableLimitTime: text(row.ableLimitTime),
      pulse_num: num(row.pulse_num),
      frugalTime: text(row.frugalTime),
      investGold: num(row.investGold),
      kepcoContract: text(row.kepcoContract),
      boss: text(row.boss),
      mapGeo: text(row.mapGeo),
    });
    inserted += result.changes;
  });
  return inserted;
});

const inserted = seedAll(rows);
const total = db.prepare("SELECT COUNT(*) AS total FROM firms").get().total;
console.log(`[seed-firms] ${dbPath}: 새로 넣음 ${inserted}건 / 전체 ${total}건 (원본 ${rows.length}건)`);
db.close();
