import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { AppDatabase } from "@/lib/db";
import { firmCreateSchema } from "@/features/firms/schema";
import { decryptFirmPassword, encryptFirmPassword, readFirmCredentialKey } from "@/lib/firm-secrets.server";

export class FirmCsvError extends Error {}

const columns = ["fid", "firmName", "bone", "kepcoNo", "kepcoPasswd", "contract", "kepcoContract",
  "manager", "boss", "phone", "addressText", "mapGeo", "degreeCity", "serviceType", "isDisable",
  "memo", "eoiTime", "pct_ratio", "peakLast", "powerLimit", "peakRunMode", "peakControlMode",
  "pulse_num", "contractLimit", "ableLimit", "ableLimitTime", "checkDay", "kepcoCyber", "frugalTime", "investGold"];
const numeric = new Set(["degreeCity", "serviceType", "isDisable", "eoiTime", "pct_ratio", "peakLast",
  "powerLimit", "peakRunMode", "peakControlMode", "pulse_num", "contractLimit", "ableLimit", "checkDay", "investGold"]);
const dataColumns = columns.filter((key) => key !== "fid" && key !== "kepcoPasswd");
const sqlColumn = (key: string) => key.replace(/[A-Z]/g, (ch) => `_${ch.toLowerCase()}`);

/** 따옴표·쉼표·개행 보존. 잘못된 입력을 조용히 보정하지 않는다. */
function records(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", state = "start";
  const finish = () => { row.push(field); field = ""; state = "start"; };
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (state === "quoted") {
      if (ch !== '"') field += ch;
      else if (text[i + 1] === '"') { field += '"'; i += 1; }
      else state = "closed";
    } else if (ch === ",") finish();
    else if (ch === "\r" || ch === "\n") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      finish();
      if (row.length !== 1 || row[0] !== "") rows.push(row);
      row = [];
    } else if (ch === '"' && state === "start") state = "quoted";
    else {
      if (state === "closed" || ch === '"') throw new FirmCsvError("CSV 따옴표 형식이 올바르지 않습니다.");
      field += ch; state = "plain";
    }
  }
  if (state === "quoted") throw new FirmCsvError("CSV 따옴표가 닫히지 않았습니다.");
  if (row.length || field || state === "closed") { finish(); rows.push(row); }
  return rows;
}

function dateValue(value: string): string {
  if (!value || value === "0") return "";
  if (!/^\d+$/.test(value)) throw new FirmCsvError("CSV 날짜 형식이 올바르지 않습니다.");
  const date = new Date(Number(value) * 1000);
  if (!Number.isFinite(date.getTime())) throw new FirmCsvError("CSV 날짜 범위를 확인해 주세요.");
  return date.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}

function geoValue(value: string): string {
  if (!value) return "";
  const match = /^POINT\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)$/i.exec(value);
  if (!match) throw new FirmCsvError("CSV 좌표 형식이 올바르지 않습니다.");
  return Number(match[1]) === 0 && Number(match[2]) === 0 ? "" : `${match[1]}, ${match[2]}`;
}

export function parseFirmCsv(text: string) {
  if (Buffer.byteLength(text) > 20_000_000) throw new FirmCsvError("CSV는 20MB 이하여야 합니다.");
  const [header, ...body] = records(text.replace(/^\uFEFF/, ""));
  if (!header || header.length !== columns.length || new Set(header).size !== columns.length || columns.some((key) => !header.includes(key))) throw new FirmCsvError("업체 CSV 열 구성이 올바르지 않습니다.");
  if (!body.length) throw new FirmCsvError("CSV에 업체가 없습니다.");
  const ids = new Set<number>();
  return body.map((record, index) => {
    if (record.length !== header.length) throw new FirmCsvError(`CSV ${index + 2}행의 열 개수가 올바르지 않습니다.`);
    const raw = Object.fromEntries(header.map((key, i) => [key, record[i]]));
    if (!/^[1-9]\d*$/.test(raw.fid) || !Number.isSafeInteger(Number(raw.fid))) throw new FirmCsvError(`CSV ${index + 2}행의 업체 ID가 올바르지 않습니다.`);
    const fid = Number(raw.fid);
    if (ids.has(fid)) throw new FirmCsvError("CSV에 중복 업체 ID가 있습니다.");
    ids.add(fid);
    const input: Record<string, unknown> = {};
    for (const key of dataColumns) {
      const value = raw[key].trim();
      input[key] = numeric.has(key) ? (value === "" ? 0 : Number(value)) : value;
    }
    input.mapGeo = geoValue(raw.mapGeo.trim());
    input.ableLimitTime = dateValue(raw.ableLimitTime.trim());
    input.frugalTime = dateValue(raw.frugalTime.trim());
    if (!/^\d*$/.test(raw.kepcoNo.trim())) throw new FirmCsvError(`CSV ${index + 2}행의 고객번호 형식을 확인해 주세요.`);
    const parsed = firmCreateSchema.safeParse(input);
    if (!parsed.success) {
      const fields = [...new Set(parsed.error.issues.map((issue) => issue.path.join(".")))].join(", ");
      throw new FirmCsvError(`CSV ${index + 2}행 입력 오류: ${fields}`);
    }
    const [longitude = 0, latitude = 0] = parsed.data.mapGeo.split(",").map(Number);
    return { fid, values: parsed.data, password: raw.kepcoPasswd,
      coordinateNeedsReview: Math.abs(longitude) > 180 || Math.abs(latitude) > 90 };
  });
}

export function importFirmCsv(options: { db: AppDatabase; text: string; tenantId: string; actorId: string; apply?: boolean }) {
  const { db, text, tenantId, actorId } = options;
  if (!db.prepare("SELECT 1 FROM users WHERE id = ? AND tenant_id = ? AND role = 'ADMIN' AND active = 1").get(actorId, tenantId)) throw new FirmCsvError("활성 ADMIN 계정만 업체 CSV를 반영할 수 있습니다.");
  const rows = parseFirmCsv(text);
  const sha256 = createHash("sha256").update(text).digest("hex");
  const apply = options.apply === true;
  const execute = () => {
    const previous = db.prepare("SELECT id FROM firm_import_runs WHERE tenant_id = ? AND source_sha256 = ?").get(tenantId, sha256);
    if (previous) return { ok: true, applied: false, alreadyImported: true, rows: rows.length, sha256 };
    const existing = db.prepare("SELECT version FROM firms WHERE fid = ?");
    const otherTenant = db.prepare("SELECT 1 FROM tenant_firm_access WHERE fid = ? AND tenant_id <> ? LIMIT 1");
    let created = 0, updated = 0;
    for (const row of rows) {
      if (otherTenant.get(row.fid, tenantId)) throw new FirmCsvError("다른 조직과 연결된 업체가 포함되어 있습니다. 소유 범위를 먼저 확인해 주세요.");
      if (existing.get(row.fid)) updated += 1; else created += 1;
    }
    const credentialCount = rows.filter((row) => row.password !== "").length;
    const coordinateReviewCount = rows.filter((row) => row.coordinateNeedsReview).length;
    if (!apply) return { ok: true, applied: false, rows: rows.length, created, updated, credentialCount, coordinateReviewCount, sha256 };
    let key: Buffer | null = null;
    if (credentialCount) {
      const stored = db.prepare("SELECT fid, encrypted_password FROM firm_credentials").all() as
        { fid: number; encrypted_password: string }[];
      try {
        // 기존 암호문이 있으면 키를 재생성하지 않는다. 다른 키의 혼입도 쓰기 전에 거부한다.
        key = readFirmCredentialKey(stored.length === 0);
        for (const credential of stored) decryptFirmPassword(credential.fid, credential.encrypted_password, key);
      } catch {
        throw new FirmCsvError("자격증명 키를 확인할 수 없습니다. 기존 DB와 일치하는 키를 복원한 뒤 다시 실행해 주세요.");
      }
    }
    const now = new Date().toISOString();
    const names = dataColumns.map(sqlColumn);
    const upsert = db.prepare(`INSERT INTO firms
      (fid, seq, ${names.join(", ")}, admin_only, import_source_sha256, version, created_at, created_by, updated_at, updated_by)
      VALUES (@fid, @seq, ${dataColumns.map((name) => `@${name}`).join(", ")}, 1, @sha256, 1, @now, @actorId, @now, @actorId)
      ON CONFLICT(fid) DO UPDATE SET ${names.map((name) => `${name} = excluded.${name}`).join(", ")},
      admin_only = 1, import_source_sha256 = excluded.import_source_sha256,
      version = firms.version + 1, updated_at = excluded.updated_at, updated_by = excluded.updated_by`);
    const grant = db.prepare(`INSERT INTO tenant_firm_access (tenant_id, fid, can_view_pii, can_collect, created_at)
      VALUES (?, ?, 1, 0, ?) ON CONFLICT(tenant_id, fid) DO UPDATE SET can_view_pii = 1`);
    const secret = db.prepare(`INSERT INTO firm_credentials (fid, encrypted_password, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(fid) DO UPDATE SET encrypted_password = excluded.encrypted_password, updated_at = excluded.updated_at`);
    for (const row of rows) {
      upsert.run({ ...row.values, fid: row.fid, seq: -row.fid, sha256, now, actorId });
      grant.run(tenantId, row.fid, now);
      if (key && row.password) secret.run(row.fid, encryptFirmPassword(row.fid, row.password, key), now);
    }
    const id = randomUUID();
    db.prepare(`INSERT INTO firm_import_runs (id, tenant_id, actor_id, source_sha256, row_count, created_count, updated_count, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, tenantId, actorId, sha256, rows.length, created, updated, now);
    db.prepare(`INSERT INTO audit_logs (id, tenant_id, actor_id, entity_type, entity_id, action, after_json, request_id, created_at)
      VALUES (?, ?, ?, 'FIRM_IMPORT', ?, 'CREATE', ?, ?, ?)`).run(randomUUID(), tenantId, actorId, id,
        JSON.stringify({ sha256, rows: rows.length, created, updated, adminOnly: true }), id, now);
    return { ok: true, applied: true, rows: rows.length, created, updated, credentialCount, coordinateReviewCount, sha256, adminOnly: true };
  };
  return apply ? db.transaction(execute).immediate() : execute();
}
