/** Demo payloads shaped for watt.rfenms.com front-end JS (empty-safe + filled keys). */
import mainsFixture from "./fixtures/mains-121.json";
import widgetsFixture from "./fixtures/widgets-121.json";

function quarters(n = 96, base = 400, amp = 200) {
  return Array.from({ length: n }, (_, i) =>
    Math.round(base + amp * Math.sin((i / n) * Math.PI * 2) + (i % 7) * 3)
  );
}

function seqSeries() {
  const out = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const seq = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const today = 500 + Math.round(200 * Math.sin(h / 24 * Math.PI * 2));
      out.push({
        seq,
        today,
        lDay: today - 40,
        lWeek: today - 80,
        week: today - 60,
        last: today - 30,
        goal: 900,
      });
    }
  }
  return out;
}

export function mockStarsDash() {
  return {
    todayOutput: 1284.5,
    todayHours: 5.2,
    yesterdayOutput: 1102.3,
    yesterdayHours: 4.8,
    monthOutput: 28450,
    monthHours: 112.4,
    yearOutput: 198420,
    yearHours: 890.2,
  };
}

export function mockStarsSeries() {
  const hours = Array.from({ length: 24 }, (_, h) => ({
    time: `${String(h).padStart(2, "0")}:00`,
    value: Math.round(20 + 80 * Math.max(0, Math.sin(((h - 6) / 12) * Math.PI))),
  }));
  return {
    data: hours,
    group: [
      { id: 1, name: "옥상 A" },
      { id: 2, name: "옥상 B" },
    ],
  };
}

export function mockPeakStats() {
  const data = quarters(96, 620, 180);
  const currentPower = quarters(96, 580, 150);
  const now = Math.floor(Date.now() / 1000);
  const maxMonth = Array.from({ length: 12 }, (_, i) => [
    now - (11 - i) * 30 * 86400,
    700 + i * 15,
  ]);
  return {
    firm: [0, 0, 1, 1, 1000], // [?, timeDiff, pct, pulse, powerLimit]
    peakPower: { data, currentPower },
    maxMonth,
    peakTask: {
      year: [12, 8, 5, 3],
      today: [2, 1, 0, 0],
      total: [40, 22, 11, 6],
      month: [5, 3, 2, 1],
    },
  };
}

export function mockWattMain() {
  const q = quarters(96, 650, 120);
  return {
    cat: 1,
    controlList: [
      [1, "칠러 #1"],
      [2, "공조기 A"],
      [3, "콤프레셔"],
    ],
    controlMode: "자동",
    controlStat: [1, 0, 1],
    net: 1,
    power: [q[Math.floor(q.length / 2)]],
    powerLimit: 1000,
    dateTimesLoad: Array.from({ length: 96 }, (_, i) => (i % 3 === 0 ? 2 : i % 3 === 1 ? 1 : 0)),
    eoiTime: Math.floor(Date.now() / 1000),
    todayPeak: { value: 842, time: Math.floor(Date.now() / 1000) - 3600 },
    wattToday: { value: 12450, cost: 1820000 },
    wattLastHour: { value: 620, pct: 62 },
    monthPeak: { value: 980, rate: 12.4 },
    kepco: [842, Math.floor(Date.now() / 1000) - 7200],
    peakTask: { year: [10, 6, 3, 1], today: [1, 0, 0, 0], total: [30, 18, 9, 4], month: [4, 2, 1, 0] },
    facList: [
      [1, "변압기"],
      [2, "칠러"],
      [3, "조명"],
    ],
    topToday: [
      [1, "칠러", 320],
      [2, "공조", 210],
      [3, "조명", 90],
    ],
    topWeek: [
      [1, "칠러", 2100],
      [2, "공조", 1500],
      [3, "조명", 800],
    ],
    topMonth: [
      [1, "칠러", 8200],
      [2, "공조", 6100],
      [3, "조명", 3200],
    ],
    topYear: [
      [1, "칠러", 92000],
      [2, "공조", 71000],
      [3, "조명", 38000],
    ],
    series: seqSeries(),
    powerSeries: q,
  };
}

/** 실제 api/widgets/121 응답 (대산금속 대시보드 위젯 배치) */
export function mockWidgets() {
  return widgetsFixture;
}

/**
 * 실제 api/mains/121 응답 (대산금속, 24개 필드 전체).
 * `fields`를 넘기면 실제 API처럼 해당 필드만 골라 반환한다.
 */
export function mockMains(fields?: string) {
  const data = mainsFixture as Record<string, unknown>;
  if (!fields) {
    return data;
  }
  const wanted = new Set(fields.split(",").map((f) => f.trim()).filter(Boolean));
  return Object.fromEntries(Object.entries(data).filter(([k]) => wanted.has(k)));
}

export function mockGenericList() {
  return {
    data: [],
    list: [],
    rows: [],
    result: [],
    items: [],
    total: 0,
    ok: true,
    code: 0,
  };
}
