import "server-only";

import type {
  FirmDetailDto,
  FirmListItemDto,
  FirmOptionDto,
  PublicFirm,
} from "@/features/firms/types";

export function toFirmOption(firm: Pick<PublicFirm, "fid" | "firmName">): FirmOptionDto {
  return { fid: firm.fid, name: firm.firmName };
}

export function toFirmListItem(firm: PublicFirm): FirmListItemDto {
  return {
    fid: firm.fid,
    firmName: firm.firmName,
    registTime: firm.registTime,
    contract: firm.contract,
    kepcoNo: firm.kepcoNo,
    eoiTime: firm.eoiTime,
    pct_ratio: firm.pct_ratio,
    peakLast: firm.peakLast,
    powerLimit: firm.powerLimit,
    peakRunMode: firm.peakRunMode,
    peakControlMode: firm.peakControlMode,
    isDisable: firm.isDisable,
    serviceType: firm.serviceType,
    memo: firm.memo,
    frugal: firm.frugal,
    contractLimit: firm.contractLimit,
    ableLowPower: firm.ableLowPower,
    maxAbleWatt: firm.maxAbleWatt,
    maxAbleDate: firm.maxAbleDate,
    pass: firm.pass,
    degreeCity: firm.degreeCity,
    bone: firm.bone,
    checkDay: firm.checkDay,
    ableLimit: firm.ableLimit,
    ableLimitTime: firm.ableLimitTime,
    pulse_num: firm.pulse_num,
    frugalTime: firm.frugalTime,
    investGold: firm.investGold,
    kepcoContract: firm.kepcoContract,
  };
}

export function toFirmDetail(firm: PublicFirm): FirmDetailDto {
  const { kepcoPasswd: _ignored, ...detail } = firm as PublicFirm & {
    kepcoPasswd?: string;
  };
  void _ignored;
  return detail;
}

export function assertNoSecretFields(payload: unknown): void {
  const text = JSON.stringify(payload);
  if (text.includes("kepcoPasswd") || text.includes("raw_json")) {
    throw new Error("forbidden secret field leaked into firm DTO");
  }
}
