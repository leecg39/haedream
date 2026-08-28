/** Demo session payload matching watt.rfenms.com login /tokens response shape */
import loginFixture from "./fixtures/login-121.json";
import navigationsFixture from "./fixtures/navigations-121.json";

export const DEMO_MENU_KEYS = [
  "_main",
  "_home",
  "_solar",
  "_peak",
  "_peakPanel",
  "_peakSet",
  "_peakHis",
  "_powerUsage",
  "_peakUsage",
  "_controlHis",
  "_acp",
  "_powerPage",
  "_page",
  "_monit",
  "_energyMonit",
  "_tech",
  "_techUsage",
  "_techOver",
  "_techTree",
  "_techPlan",
  "_techHis",
  "_compressor",
  "_thermos",
  "_gas",
  "_frozen",
  "_plc",
  "_kpi",
  "_sensor",
  "_reportFine",
  "_loads",
  "_report",
  "_reportPower",
  "_reportToe",
  "_reportUnit",
  "_reportFacilities",
  "_reportTotal",
] as const;

export function buildDemoMenu(enabled = true): Record<string, string> {
  const value = enabled ? "1" : "0";
  return Object.fromEntries(DEMO_MENU_KEYS.map((k) => [k, value]));
}

/** 실제 watt.rfenms.com navigations 응답 (fid 121, 대산금속) */
export function buildRealMenu(): Record<string, number> {
  return navigationsFixture.data;
}

/**
 * 실제 로그인 응답(admin / fid 121 대산금속) 기반 데모 세션.
 * fixture에는 토큰이 제거되어 있으므로 데모 토큰을 심어 반환한다.
 */
export function buildDemoLoginResponse(
  id: string,
  tenantId = String(loginFixture.fid),
  tenantName = loginFixture.firmName,
) {
  void id;
  const fid = /^\d+$/.test(tenantId) ? Number(tenantId) : tenantId;
  const isFixtureTenant = String(loginFixture.fid) === tenantId;
  return {
    ...loginFixture,
    fid,
    firmName: tenantName,
    members: [{ fid, name: tenantName }],
    widgets: isFixtureTenant ? loginFixture.widgets : [],
    token: "demo-access-token-solarsimz",
  };
}
