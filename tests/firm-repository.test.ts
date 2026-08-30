import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openDatabase, type AppDatabase } from "@/lib/db";
import { countFirms, createFirm, findFirm, listFirms } from "@/features/firms/repository";

describe("firms repository", () => {
  let directory: string;
  let db: AppDatabase;

  beforeEach(() => {
    directory = mkdtempSync(path.join(tmpdir(), "solarsimz-firm-"));
    db = openDatabase(path.join(directory, "test.db"));
    db.prepare(
      "INSERT INTO firms (fid, seq, firm_name, contract, kepco_no) VALUES (?, ?, ?, ?, ?)",
    ).run(1661, 0, "(주)알앤텍_2", "IGL1", "0927031098");
    db.prepare("INSERT INTO firms (fid, seq, firm_name) VALUES (?, ?, ?)").run(1200, 1, "성신금속");
  });

  afterEach(() => {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it("정적 JSON 이 쓰던 seq 순서로 반환한다", () => {
    const rows = listFirms(db);
    expect(rows.map((row) => row.fid)).toEqual([1661, 1200]);
    expect(rows[0].firmName).toBe("(주)알앤텍_2");
    expect(rows[0].kepcoNo).toBe("0927031098");
  });

  it("업체를 등록하면 fid 를 이어서 채번하고 목록 끝에 붙인다", () => {
    const created = createFirm({ firmName: "QA 신규 업체", contractLimit: 290 }, db);
    expect(created.fid).toBe(1662);
    expect(created.firmName).toBe("QA 신규 업체");
    expect(created.contractLimit).toBe(290);

    expect(countFirms(db)).toBe(3);
    expect(listFirms(db).at(-1)?.fid).toBe(1662);
    expect(findFirm(1662, db)?.firmName).toBe("QA 신규 업체");
  });

  it("등록일이 비면 현재 시각을 원본 표기로 채운다", () => {
    const created = createFirm({ firmName: "등록일 자동" }, db);
    expect(created.registTime).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it("어떤 반환값에도 한전 비밀번호가 실리지 않는다", () => {
    const created = createFirm({ firmName: "비밀번호 없음" }, db);
    for (const row of [...listFirms(db), created]) {
      expect(row).not.toHaveProperty("kepcoPasswd");
      expect(row).not.toHaveProperty("kepco_passwd");
    }
    // 테이블 스키마 자체에 비밀번호 컬럼이 없어야 한다.
    const columns = db.prepare("PRAGMA table_info(firms)").all() as { name: string }[];
    expect(columns.some((column) => /passwd|password/i.test(column.name))).toBe(false);
  });

  it("잘못된 입력은 저장 전에 거부한다", () => {
    expect(() => createFirm({ firmName: "" }, db)).toThrow();
    expect(countFirms(db)).toBe(2);
  });
});
