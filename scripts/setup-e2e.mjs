import { rmSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const databasePath = path.join(process.cwd(), "data", "solarsimz-e2e.db");
for (const suffix of ["", "-wal", "-shm"]) {
  rmSync(`${databasePath}${suffix}`, { force: true });
}

process.env.DATABASE_PATH = databasePath;
process.env.ALLOW_DEMO_SEED = "true";
await import("./seed.mjs");

// 업체관리의 검색·정렬·페이지 이동을 실제 고객 fixture 없이 검증한다.
// 테스트 조직에는 아래 합성 업체만 명시적으로 매핑한다.
const db = new Database(databasePath);
const now = new Date().toISOString();
const insertFirm = db.prepare(
  `INSERT INTO firms
   (fid, seq, firm_name, contract, kepco_no, service_type, memo)
   VALUES (?, ?, ?, ?, '', ?, ?)`,
);
const grantFirm = db.prepare(
  `INSERT INTO tenant_firm_access
   (tenant_id, fid, can_view_pii, can_collect, created_at)
   VALUES ('121', ?, 0, 0, ?)`,
);
db.transaction(() => {
  for (let index = 1; index <= 60; index += 1) {
    const fid = 2_000_001_000 + index;
    const firmName = index === 7 ? "성신금속" : `합성 QA 업체 ${String(index).padStart(3, "0")}`;
    insertFirm.run(
      fid,
      10_000 + index,
      firmName,
      index % 2 === 0 ? "IGL1" : "IGL2",
      index % 3 === 0 ? 3 : 1,
      `합성 데이터 ${index}`,
    );
    grantFirm.run(fid, now);
  }
})();
db.close();
