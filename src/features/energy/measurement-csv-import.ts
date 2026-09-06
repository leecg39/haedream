import "server-only";

import { createHash, randomBytes } from "node:crypto";
import {
  closeSync,
  constants,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeSync,
} from "node:fs";
import path from "node:path";
import type { AppDatabase } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type { EnergyUnit } from "@/features/energy/types";
import {
  assertValidMeterPoint,
  canonicalizeObservedAt,
  classifyMeasurementUpsert,
  findExistingMeasurement,
  measurementValuesEqual,
  upsertMeasurement,
  type UpsertMeasurementOutcome,
} from "@/features/energy/measurements.repository";

/** CSV 계약: 정확히 이 네 열만. value 빈 칸 = null 허용. */
export const MEASUREMENT_CSV_COLUMNS = [
  "meterPoint",
  "observedAt",
  "unit",
  "value",
] as const;

export const MEASUREMENT_CSV_MAX_BYTES = 8 * 1024 * 1024;
export const MEASUREMENT_CSV_MAX_ROWS = 50_000;

const SHA256_HEX_RE = /^[a-f0-9]{64}$/i;
const CALC_VERSION_RE = /^[A-Za-z0-9._-]{1,64}$/;
const ACTOR_RE = /^[A-Za-z0-9._:@/-]{1,128}$/;

export type MeasurementImportMode = "dry-run" | "apply" | "reconcile";

export interface ParsedMeasurementCsvRow {
  readonly meterPoint: string;
  readonly observedAt: string;
  readonly unit: EnergyUnit;
  readonly value: number | null;
  readonly rowNumber: number;
}

export interface MeasurementImportCounts {
  readonly inserted: number;
  readonly unchanged: number;
  readonly corrected: number;
  readonly rejected: number;
}

export interface MeasurementImportReport {
  readonly mode: MeasurementImportMode;
  readonly applied: boolean;
  readonly sourceSha256: string;
  readonly rowCount: number;
  readonly period: { readonly minObservedAt: string | null; readonly maxObservedAt: string | null };
  readonly counts: MeasurementImportCounts;
  readonly mismatchCount: number;
  readonly tenantId: string;
  readonly fid: number;
  readonly actor: string;
  readonly calculationVersion: string;
  readonly ok: boolean;
  readonly errorCode?: string;
  readonly errorMessage?: string;
}

export interface RunMeasurementCsvImportOptions {
  readonly db: AppDatabase;
  readonly csvPath: string;
  readonly tenantId: string;
  readonly fid: number;
  readonly actor: string;
  readonly calculationVersion: string;
  readonly mode: MeasurementImportMode;
  readonly expectedSha256?: string;
  readonly reportPath?: string;
}

type CsvParseState = "field_start" | "unquoted" | "quoted" | "after_close";

/**
 * 엄격 CSV 상태기.
 * - quote 는 필드 시작에서만 허용 (unquoted 중간 quote 거부)
 * - closing quote 뒤는 `,` / CR / LF / EOF 만 허용 (garbage 거부)
 * - escaped `""` 와 quoted 내부 newline/CRLF 는 유지
 */
export function parseCsvRecords(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let record: string[] = [];
  let state: CsvParseState = "field_start";
  let i = 0;

  const pushField = () => {
    record.push(field);
    field = "";
  };
  const pushRecord = () => {
    if (record.length > 1 || record[0] !== "") rows.push(record);
    record = [];
    state = "field_start";
  };

  while (i < text.length) {
    const ch = text[i]!;
    if (state === "field_start") {
      if (ch === '"') {
        state = "quoted";
        i += 1;
        continue;
      }
      if (ch === ",") {
        pushField();
        state = "field_start";
        i += 1;
        continue;
      }
      if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i += 1;
        pushField();
        pushRecord();
        i += 1;
        continue;
      }
      field += ch;
      state = "unquoted";
      i += 1;
      continue;
    }
    if (state === "unquoted") {
      if (ch === '"') {
        throw new AppError(
          422,
          "CSV_BAD_QUOTING",
          "CSV unquoted 필드 중간 quote 는 허용되지 않습니다.",
        );
      }
      if (ch === ",") {
        pushField();
        state = "field_start";
        i += 1;
        continue;
      }
      if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i += 1;
        pushField();
        pushRecord();
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (state === "quoted") {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        state = "after_close";
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    // after_close
    if (ch === ",") {
      pushField();
      state = "field_start";
      i += 1;
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      pushField();
      pushRecord();
      i += 1;
      continue;
    }
    throw new AppError(
      422,
      "CSV_BAD_QUOTING",
      "CSV closing quote 뒤에 허용되지 않은 문자가 있습니다.",
    );
  }

  if (state === "quoted") {
    throw new AppError(422, "CSV_BAD_QUOTING", "CSV quoting 이 닫히지 않았습니다.");
  }
  if (state === "after_close" || state === "unquoted" || field !== "" || record.length > 0) {
    pushField();
    pushRecord();
  }
  return rows;
}

function parseValueField(raw: string, rowNumber: number): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  if (/^null$/i.test(trimmed)) {
    throw new AppError(
      422,
      "CSV_INVALID_VALUE",
      `행 ${rowNumber}: null 은 빈 value 칸으로만 표현합니다.`,
    );
  }
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(trimmed)) {
    throw new AppError(
      422,
      "CSV_INVALID_VALUE",
      `행 ${rowNumber}: value 가 숫자가 아닙니다.`,
    );
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    throw new AppError(
      422,
      "CSV_INVALID_VALUE",
      `행 ${rowNumber}: value 가 유한 수가 아닙니다.`,
    );
  }
  return value;
}

export function decodeCsvUtf8(buffer: Buffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    throw new AppError(422, "CSV_INVALID_UTF8", "CSV 가 유효한 UTF-8 이 아닙니다.");
  }
}

export function parseMeasurementCsv(
  raw: Buffer | string,
): { rows: ParsedMeasurementCsvRow[]; sha256: string } {
  const buffer = typeof raw === "string" ? Buffer.from(raw, "utf8") : raw;
  if (buffer.byteLength > MEASUREMENT_CSV_MAX_BYTES) {
    throw new AppError(
      413,
      "CSV_TOO_LARGE",
      `CSV 가 ${MEASUREMENT_CSV_MAX_BYTES} 바이트를 초과합니다.`,
    );
  }
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const text = decodeCsvUtf8(buffer).replace(/^\uFEFF/, "");
  const records = parseCsvRecords(text);
  if (records.length === 0) {
    throw new AppError(422, "CSV_EMPTY", "CSV 가 비어 있습니다.");
  }
  if (records.length === 1) {
    throw new AppError(422, "CSV_HEADER_ONLY", "CSV 데이터 행이 없습니다.");
  }
  const header = records[0]!.map((cell) => cell.trim());
  if (header.length !== MEASUREMENT_CSV_COLUMNS.length) {
    throw new AppError(
      422,
      "CSV_HEADER_INVALID",
      `CSV 헤더는 정확히 ${MEASUREMENT_CSV_COLUMNS.join(",")} 이어야 합니다.`,
    );
  }
  const seenHeaders = new Set<string>();
  for (const name of header) {
    if (seenHeaders.has(name)) {
      throw new AppError(422, "CSV_DUPLICATE_HEADER", "CSV 헤더가 중복됩니다.");
    }
    seenHeaders.add(name);
  }
  for (let index = 0; index < MEASUREMENT_CSV_COLUMNS.length; index += 1) {
    if (header[index] !== MEASUREMENT_CSV_COLUMNS[index]) {
      throw new AppError(
        422,
        "CSV_HEADER_INVALID",
        `CSV 헤더는 정확히 ${MEASUREMENT_CSV_COLUMNS.join(",")} 이어야 합니다.`,
      );
    }
  }

  const dataRecords = records.slice(1);
  if (dataRecords.length > MEASUREMENT_CSV_MAX_ROWS) {
    throw new AppError(
      413,
      "CSV_TOO_MANY_ROWS",
      `CSV 행 수가 ${MEASUREMENT_CSV_MAX_ROWS} 를 초과합니다.`,
    );
  }

  const rows: ParsedMeasurementCsvRow[] = [];
  const keys = new Set<string>();
  for (let index = 0; index < dataRecords.length; index += 1) {
    const record = dataRecords[index]!;
    const rowNumber = index + 2;
    if (record.length !== MEASUREMENT_CSV_COLUMNS.length) {
      throw new AppError(
        422,
        "CSV_ROW_WIDTH",
        `행 ${rowNumber}: 열 수가 헤더와 다릅니다.`,
      );
    }
    if (record.some((cell) => cell.includes("\0"))) {
      throw new AppError(422, "CSV_NUL", `행 ${rowNumber}: NUL 문자는 허용되지 않습니다.`);
    }
    let meterPoint: string;
    let observedAt: string;
    try {
      meterPoint = assertValidMeterPoint(record[0]!);
      observedAt = canonicalizeObservedAt(record[1]!);
    } catch (error) {
      if (error instanceof AppError) {
        throw new AppError(error.status, error.code, `행 ${rowNumber}: ${error.message}`);
      }
      throw error;
    }
    const unitRaw = record[2]!.trim();
    if (unitRaw !== "kW" && unitRaw !== "kWh") {
      throw new AppError(
        422,
        "CSV_INVALID_UNIT",
        `행 ${rowNumber}: unit 은 kW 또는 kWh 만 허용됩니다.`,
      );
    }
    const value = parseValueField(record[3]!, rowNumber);
    const key = `${meterPoint}\0${observedAt}\0${unitRaw}`;
    if (keys.has(key)) {
      throw new AppError(
        422,
        "CSV_DUPLICATE_KEY",
        `행 ${rowNumber}: meterPoint+observedAt(canonical)+unit 이 중복됩니다.`,
      );
    }
    keys.add(key);
    rows.push({
      meterPoint,
      observedAt,
      unit: unitRaw,
      value,
      rowNumber,
    });
  }
  return { rows, sha256 };
}

export function assertTenantFirmAccess(
  db: AppDatabase,
  tenantId: string,
  fid: number,
): void {
  const access = db
    .prepare(
      `SELECT 1 AS ok FROM tenant_firm_access WHERE tenant_id = ? AND fid = ?`,
    )
    .get(tenantId, fid) as { ok: number } | undefined;
  if (!access) {
    throw new AppError(
      403,
      "FIRM_ACCESS_DENIED",
      "해당 조직에 연결되지 않은 업체에는 계측값을 저장할 수 없습니다.",
    );
  }
  const firm = db.prepare(`SELECT 1 AS ok FROM firms WHERE fid = ?`).get(fid) as
    | { ok: number }
    | undefined;
  if (!firm) {
    throw new AppError(404, "FIRM_NOT_FOUND", "업체를 찾을 수 없습니다.");
  }
}

function emptyCounts(rejected = 0): MeasurementImportCounts {
  return { inserted: 0, unchanged: 0, corrected: 0, rejected };
}

function bump(
  counts: MeasurementImportCounts,
  outcome: UpsertMeasurementOutcome,
): MeasurementImportCounts {
  return {
    inserted: counts.inserted + (outcome === "inserted" ? 1 : 0),
    unchanged: counts.unchanged + (outcome === "unchanged" ? 1 : 0),
    corrected: counts.corrected + (outcome === "corrected" ? 1 : 0),
    rejected: counts.rejected,
  };
}

/** CSV 기대값과 DB 현재값을 canonical 키로 대조. 원시 값은 반환하지 않는다. */
export function countMeasurementMismatches(
  db: AppDatabase,
  tenantId: string,
  fid: number,
  rows: readonly ParsedMeasurementCsvRow[],
  calculationVersion: string,
): number {
  let mismatches = 0;
  for (const row of rows) {
    const existing = findExistingMeasurement(
      tenantId,
      fid,
      row.meterPoint,
      row.observedAt,
      row.unit,
      db,
    );
    if (
      !existing ||
      !measurementValuesEqual(existing.value, row.value) ||
      existing.source !== "MEASURED" ||
      existing.calculationVersion !== calculationVersion
    ) {
      mismatches += 1;
    }
  }
  return mismatches;
}

function periodOf(rows: readonly ParsedMeasurementCsvRow[]) {
  if (rows.length === 0) {
    return { minObservedAt: null, maxObservedAt: null };
  }
  let min = rows[0]!.observedAt;
  let max = rows[0]!.observedAt;
  for (const row of rows) {
    if (row.observedAt < min) min = row.observedAt;
    if (row.observedAt > max) max = row.observedAt;
  }
  return { minObservedAt: min, maxObservedAt: max };
}

/**
 * Atomic report write.
 * - destination 이 symlink 이면 거부 (따라가지 않음)
 * - temp 는 O_CREAT|O_EXCL (wx) 로만 생성
 * - rename 실패 포함 finally 에서 temp cleanup
 */
export function writeReportAtomic(
  reportPath: string,
  report: MeasurementImportReport,
): void {
  const absolute = path.resolve(reportPath);
  try {
    const existing = lstatSync(absolute);
    if (existing.isSymbolicLink()) {
      throw new AppError(
        422,
        "REPORT_SYMLINK",
        "보고서 경로가 symlink 이면 쓸 수 없습니다.",
      );
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "";
    if (code !== "ENOENT") {
      throw new AppError(422, "REPORT_PATH_INVALID", "보고서 경로를 사용할 수 없습니다.");
    }
  }

  mkdirSync(path.dirname(absolute), { recursive: true });
  const tempPath = `${absolute}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`;
  const body = `${JSON.stringify(report, null, 2)}\n`;
  let fd: number | null = null;
  let renamed = false;
  try {
    fd = openSync(
      tempPath,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL,
      0o600,
    );
    writeSync(fd, body, undefined, "utf8");
    closeSync(fd);
    fd = null;
    renameSync(tempPath, absolute);
    renamed = true;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, "REPORT_WRITE_FAILED", "보고서 기록에 실패했습니다.");
  } finally {
    if (fd != null) {
      try {
        closeSync(fd);
      } catch {
        // ignore
      }
    }
    if (!renamed) {
      try {
        unlinkSync(tempPath);
      } catch {
        // ignore
      }
    }
  }
}

export function runMeasurementCsvImport(
  options: RunMeasurementCsvImportOptions,
): MeasurementImportReport {
  const {
    db,
    csvPath,
    tenantId,
    fid,
    actor,
    calculationVersion,
    mode,
    expectedSha256,
    reportPath,
  } = options;

  if (!ACTOR_RE.test(actor)) {
    throw new AppError(422, "INVALID_ACTOR", "actor/importer 식별자가 올바르지 않습니다.");
  }
  if (!CALC_VERSION_RE.test(calculationVersion)) {
    throw new AppError(
      422,
      "INVALID_CALCULATION_VERSION",
      "calculation version 이 올바르지 않습니다.",
    );
  }
  if (!Number.isSafeInteger(fid) || fid < 1) {
    throw new AppError(422, "INVALID_FID", "fid 가 올바르지 않습니다.");
  }
  if (expectedSha256 !== undefined && !SHA256_HEX_RE.test(expectedSha256)) {
    throw new AppError(
      422,
      "INVALID_EXPECTED_SHA256",
      "expected-sha256 은 64자 hex 여야 합니다.",
    );
  }

  const absoluteCsv = path.resolve(csvPath);
  let buffer: Buffer;
  try {
    buffer = readFileSync(absoluteCsv);
  } catch {
    throw new AppError(404, "CSV_NOT_FOUND", "CSV 파일을 읽을 수 없습니다.");
  }

  const { rows, sha256 } = parseMeasurementCsv(buffer);
  if (
    expectedSha256 !== undefined &&
    expectedSha256.toLowerCase() !== sha256.toLowerCase()
  ) {
    throw new AppError(
      409,
      "CSV_SHA256_MISMATCH",
      "CSV SHA-256 이 승인 원본 해시와 일치하지 않습니다.",
    );
  }

  assertTenantFirmAccess(db, tenantId, fid);

  let counts = emptyCounts(0);
  if (mode === "apply") {
    db.transaction(() => {
      for (const row of rows) {
        const result = upsertMeasurement(
          {
            tenantId,
            fid,
            meterPoint: row.meterPoint,
            observedAt: row.observedAt,
            source: "MEASURED",
            unit: row.unit,
            value: row.value,
            calculationVersion,
            correctedBy: actor,
            correctionReason: "approved measurement csv import",
          },
          db,
        );
        counts = bump(counts, result.outcome);
      }
    })();
  } else {
    for (const row of rows) {
      const outcome = classifyMeasurementUpsert(
        {
          tenantId,
          fid,
          meterPoint: row.meterPoint,
          observedAt: row.observedAt,
          source: "MEASURED",
          unit: row.unit,
          value: row.value,
          calculationVersion,
        },
        db,
      );
      counts = bump(counts, outcome);
    }
  }

  const mismatchCount = countMeasurementMismatches(
    db,
    tenantId,
    fid,
    rows,
    calculationVersion,
  );

  const report: MeasurementImportReport = {
    mode,
    applied: mode === "apply",
    sourceSha256: sha256,
    rowCount: rows.length,
    period: periodOf(rows),
    counts,
    mismatchCount,
    tenantId,
    fid,
    actor,
    calculationVersion,
    ok: mode === "apply" ? mismatchCount === 0 : true,
  };

  if (reportPath) {
    writeReportAtomic(reportPath, report);
  }
  return report;
}

export function measurementImportErrorReport(
  partial: Omit<
    MeasurementImportReport,
    "ok" | "counts" | "mismatchCount" | "period" | "rowCount" | "applied"
  > & {
    rowCount?: number;
    period?: MeasurementImportReport["period"];
    counts?: MeasurementImportCounts;
    mismatchCount?: number;
    errorCode: string;
    errorMessage: string;
  },
): MeasurementImportReport {
  return {
    mode: partial.mode,
    applied: false,
    sourceSha256: partial.sourceSha256,
    rowCount: partial.rowCount ?? 0,
    period: partial.period ?? { minObservedAt: null, maxObservedAt: null },
    counts: partial.counts ?? emptyCounts(1),
    mismatchCount: partial.mismatchCount ?? 0,
    tenantId: partial.tenantId,
    fid: partial.fid,
    actor: partial.actor,
    calculationVersion: partial.calculationVersion,
    ok: false,
    errorCode: partial.errorCode,
    errorMessage: partial.errorMessage,
  };
}
