import { describe, expect, it } from "vitest";
import { toFirmListItem, assertNoSecretFields } from "@/features/firms/dto.server";
import type { PublicFirm } from "@/features/firms/types";

const sample: PublicFirm = {
  fid: 7,
  firmName: "합성 목록 업체",
  registTime: "2026-01-01 00:00:00",
  contract: "IGL1",
  kepcoNo: "0000000007",
  eoiTime: 0,
  pct_ratio: 0,
  peakLast: 1,
  powerLimit: 2,
  peakRunMode: 0,
  peakControlMode: 0,
  isDisable: 0,
  serviceType: 1,
  memo: "SYNTH_FIRM_CANARY_LIST",
  frugal: 0,
  contractLimit: 10,
  ableLowPower: 0,
  maxAbleWatt: 0,
  maxAbleDate: 0,
  pass: "",
  degreeCity: 0,
  bone: "",
  kepcoCyber: "cyber",
  manager: "담당자",
  phone: "010-0000-0000",
  addressText: "합성주소",
  checkDay: 1,
  ableLimit: 0,
  ableLimitTime: "",
  pulse_num: 0,
  frugalTime: "",
  investGold: 0,
  kepcoContract: "",
  boss: "대표",
  mapGeo: "127,36",
};

describe("firm DTO boundary", () => {
  it("목록 DTO는 연락처·주소·지도 좌표를 포함하지 않는다", () => {
    const item = toFirmListItem(sample);
    expect(item.fid).toBe(7);
    expect(item.firmName).toBe("합성 목록 업체");
    expect(item).not.toHaveProperty("phone");
    expect(item).not.toHaveProperty("addressText");
    expect(item).not.toHaveProperty("manager");
    expect(item).not.toHaveProperty("boss");
    expect(item).not.toHaveProperty("mapGeo");
    expect(item).not.toHaveProperty("kepcoCyber");
    expect(item).not.toHaveProperty("kepcoPasswd");
    assertNoSecretFields(item);
  });
});
