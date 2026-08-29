/**
 * ABC EMS(watt) 상단 환경설정(tbSetNav) 메뉴.
 * 원본 watt top.html 순서 그대로. 이번에 클론한 7개는 /abc/* 라우트로,
 * 아직 클론하지 않은 항목(widgetSet/sequence/net/업데이트)은 원본 파일명 유지(데모).
 */
export interface AbcSettingsLink {
  readonly href: string;
  readonly label: string;
  /** 이번 클론 범위(라우트 존재) 여부 */
  readonly cloned: boolean;
}

export const ABC_SETTINGS_LINKS: readonly AbcSettingsLink[] = [
  { href: "/abc/widget-set", label: "대시보드 화면설정", cloned: false },
  { href: "/abc/user", label: "사용자관리", cloned: true },
  { href: "/abc/notify", label: "알람설정", cloned: true },
  { href: "/abc/gate-node", label: "게이트웨이 관리", cloned: true },
  { href: "/abc/gateway", label: "복합제어기 관리", cloned: true },
  { href: "/abc/sequence", label: "시퀀스제어", cloned: false },
  { href: "/abc/gate-rtu", label: "RTU관리", cloned: true },
  { href: "/abc/device", label: "모드버스 계측", cloned: true },
  { href: "/abc/net", label: "실시간데이터", cloned: false },
  { href: "/abc/bad", label: "통신상태 불량", cloned: true },
];
