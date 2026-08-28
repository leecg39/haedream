const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function seoulDateBoundary(
  value: string,
  boundary: "start" | "end",
) {
  if (!DATE_PATTERN.test(value)) {
    throw new Error("날짜 형식은 YYYY-MM-DD여야 합니다.");
  }

  const [year, month, day] = value.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (month < 1 || month > 12 || day < 1 || day > lastDay) {
    throw new Error("올바른 날짜를 입력해 주세요.");
  }

  const time = boundary === "start" ? "00:00:00.000" : "23:59:59.999";
  const date = new Date(`${value}T${time}+09:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error("올바른 날짜를 입력해 주세요.");
  }
  return date.toISOString();
}
