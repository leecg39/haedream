import type { StatFirm, StatOrderBy } from "@/lib/fit-mocks/stat";

/** 원본 base.js 의 echoNumber() 와 동일한 3자리 콤마 포맷 */
export function echoNumber(value: number): string {
  return String(value).replace(/(\d)(?=(?:\d{3})+(?!\d))/g, "$1,");
}

/** 원본 renderRankingChart() 의 yAxis formatter 와 동일한 축약 표기 */
export function echoMoneyAxis(value: number): string {
  if (value >= 100_000_000) return `${Math.round((value / 100_000_000) * 10) / 10}억원`;
  if (value >= 10_000) return `${Math.round(value / 10_000)}만원`;
  if (value >= 1_000) return `${Math.round((value / 1_000) * 10) / 10}천원`;
  return `${value}원`;
}

type Comparator = (a: StatFirm, b: StatFirm) => number;

const byName: Comparator = (a, b) => a.firmName.localeCompare(b.firmName, "ko");
const byPower: Comparator = (a, b) => a.thisPower - b.thisPower;
const byRatio: Comparator = (a, b) => a.frugalRatio - b.frugalRatio;
const byMonth: Comparator = (a, b) => a.frugalMonth - b.frugalMonth;

const descend =
  (compare: Comparator): Comparator =>
  (a, b) =>
    compare(b, a);

const COMPARATORS: Readonly<Partial<Record<StatOrderBy, Comparator>>> = {
  firmNameASC: byName,
  firmNameDESC: descend(byName),
  thisPowerASC: byPower,
  thisPowerDESC: descend(byPower),
  frugalRatioASC: byRatio,
  frugalRatioDESC: descend(byRatio),
  frugalMonthASC: byMonth,
  frugalMonthDESC: descend(byMonth),
};

/** 정렬은 항상 새 배열을 만든다 (원본 배열 불변) */
export function sortFirms(firms: readonly StatFirm[], orderBy: StatOrderBy): readonly StatFirm[] {
  const compare = COMPARATORS[orderBy];
  return compare ? [...firms].sort(compare) : firms;
}

/** 현재 페이지에 표시할 행. 데이터가 모자라면 null 로 채워 고정 행 수를 유지한다. */
export function pageRows(
  firms: readonly StatFirm[],
  page: number,
  rowsPerPage: number,
): readonly (StatFirm | null)[] {
  const start = (page - 1) * rowsPerPage;
  const slice = firms.slice(start, start + rowsPerPage);
  const blanks = Array.from({ length: rowsPerPage - slice.length }, () => null);
  return [...slice, ...blanks];
}

export function totalPages(count: number, rowsPerPage: number): number {
  return Math.max(1, Math.ceil(count / rowsPerPage));
}

/** 원본 vio.deskPaging() 의 페이지 번호 구성 알고리즘 */
export function buildPageItems(current: number, max: number): readonly (number | "…")[] {
  const safeCurrent = current < 1 ? 1 : current;
  const head: readonly (number | "…")[] = safeCurrent > 4 ? [1, "…"] : [1];

  const from = Math.max(safeCurrent - 2, 2);
  const to = Math.min(max, safeCurrent + 2);
  const middle: readonly number[] = Array.from(
    { length: Math.max(0, to - from + 1) },
    (_, i) => from + i,
  );

  const tail: readonly (number | "…")[] =
    safeCurrent + 3 < max ? ["…", max] : safeCurrent + 2 < max ? [max] : [];

  return [...head, ...middle, ...tail];
}
