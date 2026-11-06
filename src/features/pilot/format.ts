/**
 * 서버(Node ICU)와 브라우저가 ko-KR 오전/오후 표기를 다르게 내므로
 * (Node ICU 78: "PM 10:00", Chrome: "오후 10:00") 숫자 부분만 Intl에서 받고
 * 표기는 직접 조립한다. 하이드레이션 불일치 방지.
 */
const SEOUL_PARTS = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  hourCycle: "h23",
});

function seoulPart(parts: Intl.DateTimeFormatPart[], type: string): number {
  return Number(parts.find((part) => part.type === type)?.value ?? "0");
}

export function formatSeoulDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const parts = SEOUL_PARTS.formatToParts(date);
  const hour = seoulPart(parts, "hour");
  const period = hour < 12 ? "오전" : "오후";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const minute = String(seoulPart(parts, "minute")).padStart(2, "0");

  return `${seoulPart(parts, "year")}. ${seoulPart(parts, "month")}. ${seoulPart(parts, "day")}. ${period} ${hour12}:${minute}`;
}
