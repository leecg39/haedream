#!/usr/bin/env node
/**
 * kepco 로그인 모듈 실사이트 검증 프로브.
 * 실행: node scripts/kepco-probe.mjs <fid>
 * 비밀번호는 gitignore 된 로컬 파일에서만 읽고 출력하지 않는다.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fid = process.argv[2] ?? "2";

const rows = JSON.parse(readFileSync(join(root, "src/lib/fit-mocks/firm-rows.json"), "utf8"));
const passwds = JSON.parse(readFileSync(join(root, "src/lib/fit-mocks/kepco-passwds.json"), "utf8"));
const firm = rows.find((row) => String(row.fid) === String(fid));
const passwd = passwds[String(fid)];
if (!firm?.kepcoNo || !passwd) {
  console.error(`fid=${fid}: 고객번호/비밀번호 없음`);
  process.exit(1);
}

const { kepcoLogin } = await import(join(root, "src/lib/kepco/login.ts"));

console.log(`fid=${fid} ${firm.firmName} (${firm.kepcoNo}) 로그인 시도…`);
const session = await kepcoLogin(firm.kepcoNo, passwd);
console.log("로그인 성공. 세션 쿠키 확보:", session.jar.get("JSESSIONID") ? "JSESSIONID OK" : "없음");

const post = async (path, body) => {
  const res = await fetch(`https://pp.kepco.co.kr${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: session.jar.header(),
      "x-requested-with": "XMLHttpRequest",
    },
    body: JSON.stringify(body),
  });
  session.jar.absorb(res.headers);
  return res.json();
};

const summary = await post("/rm/getRM0101.do", {});
console.log("스마트뷰 요약:", {
  실시간사용량: summary.F_AP_QT,
  실시간요금: summary.TOTAL_CHARGE,
  예상요금: summary.PREDICT_TOTAL_CHARGE,
  요금적용전력: summary.JOJ_KW,
  최대수요: summary.MAX_PWR,
  계약종별: summary.CNTR_KND_NM,
  검침기간: `${summary.START_DT}~${summary.END_DT}`,
});

const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }).replaceAll("-", "");
const hourly = await post("/rs/rs0101N_hour.do", {
  SELECT_DT: today,
  SEL_METER_ID: "",
  TIME_TYPE: "15",
  SEL_REV_USER: "F",
});
console.log(`시간대별 데이터 ${hourly.length}건, 첫 행:`, hourly[0]);
