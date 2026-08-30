import { describe, expect, it } from "vitest";
import { firmCreateSchema } from "@/features/firms/schema";

describe("firmCreateSchema", () => {
  it("업체 이름만 있어도 통과하고 나머지는 기본값으로 채운다", () => {
    const parsed = firmCreateSchema.parse({ firmName: "테스트 업체" });
    expect(parsed.firmName).toBe("테스트 업체");
    expect(parsed.contract).toBe("");
    expect(parsed.contractLimit).toBe(0);
    expect(parsed.serviceType).toBe(0);
  });

  it("폼에서 문자열로 오는 숫자를 숫자로 바꾼다", () => {
    const parsed = firmCreateSchema.parse({
      firmName: "테스트 업체",
      contractLimit: "290",
      checkDay: "15",
      serviceType: "23",
    });
    expect(parsed.contractLimit).toBe(290);
    expect(parsed.checkDay).toBe(15);
    expect(parsed.serviceType).toBe(23);
  });

  it("업체 이름이 비면 거부한다", () => {
    expect(() => firmCreateSchema.parse({ firmName: "   " })).toThrow();
    expect(() => firmCreateSchema.parse({})).toThrow();
  });

  it("업체 이름 32자 상한과 한전고객번호 숫자 형식을 검사한다", () => {
    expect(() => firmCreateSchema.parse({ firmName: "가".repeat(33) })).toThrow();
    expect(() =>
      firmCreateSchema.parse({ firmName: "테스트 업체", kepcoNo: "12A4567890" }),
    ).toThrow();
    // 앞자리 0 이 있는 고객번호는 문자열 그대로 살아 있어야 한다.
    expect(firmCreateSchema.parse({ firmName: "업체", kepcoNo: "0927031098" }).kepcoNo).toBe(
      "0927031098",
    );
  });

  it("검침일·모드 값의 경계를 지킨다", () => {
    expect(firmCreateSchema.parse({ firmName: "업체", checkDay: 31 }).checkDay).toBe(31);
    expect(() => firmCreateSchema.parse({ firmName: "업체", checkDay: 32 })).toThrow();
    expect(() => firmCreateSchema.parse({ firmName: "업체", peakRunMode: 2 })).toThrow();
  });

  it("한전 비밀번호를 실어 보내면 요청 전체를 거부한다", () => {
    // strictObject 라 정의하지 않은 키는 통과하지 못한다. 비밀번호가 실수로
    // 폼에서 딸려와도 서버 경계에서 막히는지 확인한다.
    expect(() =>
      firmCreateSchema.parse({ firmName: "업체", kepcoPasswd: "secret" }),
    ).toThrow();
    expect(() => firmCreateSchema.parse({ firmName: "업체", passwd: "secret" })).toThrow();
  });
});
