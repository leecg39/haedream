/**
 * ABC EMS(watt) 상단 환경설정(tbSetNav) 메뉴.
 * 원본 watt top.html 순서 그대로. 10개 전부 /abc/* 라우트로 연결된다 —
 * 에그핏(/fit/*) 페이지와 서로 교차 링크하지 않는다.
 */
export interface AbcSettingsLink {
  readonly href: string;
  readonly label: string;
  /** 라우트 존재(클론 완료) 여부 — false 면 정적 <a> 로 렌더링한다 */
  readonly cloned: boolean;
}

export const ABC_SETTINGS_LINKS: readonly AbcSettingsLink[] = [
  { href: "/abc/widget-set", label: "대시보드 화면설정", cloned: true },
  { href: "/abc/user", label: "사용자관리", cloned: true },
  { href: "/abc/notify", label: "알람설정", cloned: true },
  { href: "/abc/gate-node", label: "게이트웨이 관리", cloned: true },
  { href: "/abc/gateway", label: "복합제어기 관리", cloned: true },
  { href: "/abc/sequence", label: "시퀀스제어", cloned: true },
  { href: "/abc/gate-rtu", label: "RTU관리", cloned: true },
  { href: "/abc/device", label: "모드버스 계측", cloned: true },
  { href: "/abc/net", label: "실시간데이터", cloned: true },
  { href: "/abc/bad", label: "통신상태 불량", cloned: true },
];
