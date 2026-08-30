/**
 * 파워플래너 월별 상세요금 페이지(/cc/cc0103.do)의 서버 렌더 HTML 파서.
 * 외부 HTML을 실행하지 않고 id 기반 텍스트만 추출한다.
 */

export interface KepcoBillDetail {
  readonly billYm: string;
  readonly baseBill: string;
  readonly kwhBill: string;
  readonly reqBill: string;
  readonly lloadUsekwh: string;
  readonly mloadUsekwh: string;
  readonly maxloadUsekwh: string;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeText(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractKepcoElementText(html: string, id: string): string {
  const escaped = escapeRegExp(id);
  const pattern = new RegExp(
    `<([a-zA-Z][\\w:-]*)\\b[^>]*\\bid=["']${escaped}["'][^>]*>([\\s\\S]*?)<\\/\\1>`,
    "i",
  );
  return decodeText(pattern.exec(html)?.[2] ?? "");
}

function extractInputValue(html: string, id: string): string {
  const escaped = escapeRegExp(id);
  const tag = new RegExp(`<input\\b[^>]*\\bid=["']${escaped}["'][^>]*>`, "i").exec(html)?.[0] ?? "";
  return /\bvalue=["']([^"']*)["']/i.exec(tag)?.[1]?.trim() ?? "";
}

/** 표시용 쉼표와 괄호를 제거한 DB 저장 문자열. */
export function normalizeKepcoNumber(value: unknown): string {
  if (value == null) return "";
  return String(value).replace(/[(),\s]/g, "").trim();
}

export function parseKepcoBillDetail(html: string): KepcoBillDetail {
  return {
    billYm: extractInputValue(html, "JOJ_YM").replaceAll(".", ""),
    baseBill: normalizeKepcoNumber(extractKepcoElementText(html, "td_BSCHR")),
    kwhBill: normalizeKepcoNumber(extractKepcoElementText(html, "td_USKI_CHRG")),
    reqBill: normalizeKepcoNumber(extractKepcoElementText(html, "td_REQ_AMT")),
    // 경부하=night, 중부하=allow, 최대부하=peak WHM 사용전력량
    lloadUsekwh: normalizeKepcoNumber(extractKepcoElementText(html, "tot_whm_ngt")),
    mloadUsekwh: normalizeKepcoNumber(extractKepcoElementText(html, "tot_whm_alw")),
    maxloadUsekwh: normalizeKepcoNumber(extractKepcoElementText(html, "tot_whm_pk")),
  };
}
