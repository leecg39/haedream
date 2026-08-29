"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FIT_DEMO_PERMISSIONS, FIT_NAV_ITEMS, isNavItemVisible } from "@/lib/fit-nav";
import type { FitPermissions } from "@/types/fit";
import { useFitShell } from "./FitShellContext";

interface FitLeftNavProps {
  readonly permissions?: FitPermissions;
}

type PlatformId = "egfit" | "abc";

const PLATFORM_OPTIONS: ReadonlyArray<{
  readonly id: PlatformId;
  readonly label: string;
  readonly href: string;
  readonly logo: string;
}> = [
  {
    id: "abc",
    label: "ABC EMS PLATFORM",
    href: "/main.html",
    logo: "/fit/assets/img/logo_abc.png",
  },
  {
    id: "egfit",
    label: "에그핏",
    href: "/fit/peak",
    logo: "/fit/assets/img/egfit_top_logo.svg",
  },
];

/**
 * 상단 로고 자리의 플랫폼 전환 드롭다운.
 * 에그핏 셸에서는 #platformLogo(에그핏 로고)를, ABC 셸에서는 ABC 로고를 현재 값으로 보여준다.
 */
function PlatformSwitch({
  current,
  closeMobile,
}: {
  readonly current: PlatformId;
  readonly closeMobile: () => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentPlatform = PLATFORM_OPTIONS.find((option) => option.id === current) ?? PLATFORM_OPTIONS[1];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="platformSwitch" ref={containerRef}>
      <button
        type="button"
        className="platformSwitchButton"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="플랫폼 선택"
        onClick={() => setOpen((value) => !value)}
      >
        {current === "egfit" ? (
          <img src={currentPlatform.logo} id="platformLogo" alt="home" />
        ) : (
          <img src={currentPlatform.logo} alt="ABC EMS Platform" />
        )}
        <i className={`bi bi-chevron-${open ? "up" : "down"}`} aria-hidden="true" />
      </button>
      {open ? (
        <ul className="platformSwitchMenu" aria-label="플랫폼 목록">
          {PLATFORM_OPTIONS.map((option) => {
            const isCurrent = option.id === current;
            const content = (
              <>
                <img src={option.logo} alt="" aria-hidden="true" />
                <span>{option.label}</span>
                {isCurrent ? <i className="bi bi-check2" aria-hidden="true" /> : null}
              </>
            );
            return (
              <li key={option.id}>
                {option.id === "egfit" ? (
                  <Link
                    href={option.href}
                    aria-current={isCurrent ? "page" : undefined}
                    onClick={() => {
                      setOpen(false);
                      closeMobile();
                    }}
                  >
                    {content}
                  </Link>
                ) : (
                  <a
                    href={option.href}
                    aria-current={isCurrent ? "page" : undefined}
                    onClick={() => {
                      setOpen(false);
                      closeMobile();
                    }}
                  >
                    {content}
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

const PLATFORM_SWITCH_STYLES = `
.leftLogo .platformSwitch{position:relative;display:flex;align-items:center;justify-content:center;width:100%}
.platformSwitchButton{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;padding:0;border:0;background:transparent;cursor:pointer}
.platformSwitchButton img{width:130px;object-fit:scale-down;margin:1vh 0}
.platformSwitchButton>i{color:#c6c6c6;font-size:12px;transition:transform .2s}
.platformSwitchButton:hover>i{color:#97b1ff}
.platformSwitchMenu{position:absolute;top:100%;left:50%;transform:translateX(-50%);z-index:1200;min-width:190px;margin:2px 0 0;padding:6px;list-style:none;border:1px solid rgba(255,255,255,.16);border-radius:8px;background:#14143c;box-shadow:0 8px 24px rgba(0,0,0,.45)}
.platformSwitchMenu li a{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:6px;color:#e8e8f2;font-size:13px;text-decoration:none;white-space:nowrap}
.platformSwitchMenu li a:hover{background:rgba(48,126,235,.25);color:#fff}
.platformSwitchMenu li a[aria-current="page"]{background:rgba(48,126,235,.18)}
.platformSwitchMenu li a img{width:22px;height:22px;object-fit:contain}
.platformSwitchMenu li a i{margin-left:auto;color:#7ec8ff}
@media (max-width:1024px){.platformSwitchMenu{left:0;transform:none}}
`;

const WATT_ADMIN_PATHS = new Set(["/widget-set"]);

const WATT_NAV = [
  { id: "stat", label: "통합관제", icon: "bi-globe2", href: "/stat.html" },
  { id: "firm", label: "업체관리", icon: "bi-people-fill", href: "/firm.html" },
  {
    id: "main",
    label: "대시보드",
    icon: "bi-house-door",
    children: [
      ["대시보드 위젯", "/main.html"],
      ["대시보드 전력메인", "/wattMain.html"],
      ["태양광 대시보드", "/solar.html"],
    ],
  },
  {
    id: "peak",
    label: "피크관리",
    icon: "bi-speedometer2",
    children: [
      ["피크상태", "/peak.html"],
      ["부하상황판", "/peakPanel.html"],
      ["피크 제어설정", "/peakSet.html"],
      ["피크 그래프", "/peakHis.html"],
      ["전력 사용 보고서", "/powerUsage.html"],
      ["피크 15분 전력보고서", "/peakUsage.html"],
      ["피크제어이력", "/controlHis.html"],
      ["시스템에어컨", "/acp.html"],
    ],
  },
  {
    id: "watt",
    label: "전력사용량",
    icon: "bi-bar-chart",
    children: [
      ["전력사용량 보기", "/powerPage.html"],
      ["소비량 예측", "/wattPrediction.html"],
    ],
  },
  { id: "enpi", label: "절감효과", icon: "bi-graph-down", href: "/enpi.html" },
  {
    id: "monit",
    label: "계통감시",
    icon: "bi-diagram-3",
    children: [
      ["계통감시", "/monit.html"],
      ["공정별 에너지 계통", "/energyMonit.html"],
    ],
  },
  {
    id: "tech",
    label: "설비관리",
    icon: "bi-sliders",
    children: [
      ["제어설비목록", "/techSettings.html"],
      ["주요설비 이용률", "/techUsage.html"],
      ["주요설비 부하율", "/techOver.html"],
      ["설비 제어", "/techTree.html"],
      ["최적화 제어", "/techPlan.html"],
      ["최적화 제어이력", "/techHis.html"],
      ["콤프레셔", "/compressor.html"],
      ["온도", "/thermos.html"],
      ["가스 사용량", "/gasReports.html"],
      ["냉난방 제어", "/techFrozen.html"],
      ["PLC 제어 관리", "/plc.html"],
    ],
  },
  {
    id: "analysis",
    label: "비교분석",
    icon: "bi-input-cursor",
    children: [
      ["목표대비 비교분석", "/kpi.html"],
      ["개별계측기관리", "/sensor.html"],
      ["전력사용현황", "/reportFine.html"],
      ["가상부하분산", "/loads.html"],
    ],
  },
  {
    id: "report",
    label: "보고서",
    icon: "bi-file-earmark-bar-graph",
    children: [
      ["종합보고서", "/report.html"],
      ["전력요금보고서", "/reportPower.html"],
      ["온실가스배출보고서", "/reportToe.html"],
      ["기간별 전력사용량", "/reportUnit.html"],
      ["설비별 전력상세정보", "/reportFacilities.html"],
      ["공정별 보고서", "/reportTotal.html"],
    ],
  },
] as const;

function WattLeftNav({
  mobileOpen,
  closeMobile,
}: {
  mobileOpen: boolean;
  closeMobile: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className={mobileOpen ? "leftNav mobileActive" : "leftNav"}>
      <style>{PLATFORM_SWITCH_STYLES}</style>
      <div className="leftLogo">
        <PlatformSwitch current="abc" closeMobile={closeMobile} />
      </div>
      <nav aria-label="WATT 주요 메뉴">
        <ul className="d1">
          {WATT_NAV.map((item) => {
            const open = expanded === item.id;
            return (
              <li
                className={`navLi${open ? " active" : ""}`}
                id={item.id}
                key={item.id}
              >
                {"children" in item ? (
                  <>
                    <a
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        setExpanded(open ? null : item.id);
                      }}
                    >
                      <i className={`bi ${item.icon}`} />
                      <span>{item.label}</span>
                      <span className={`leftMArr${open ? " active" : ""}`}>
                        <i className="bi bi-chevron-down" />
                      </span>
                    </a>
                    <div className="d2Nav">
                      <ul className="d2">
                        {item.children.map(([label, href]) => (
                          <li key={href}>
                            <a href={href} onClick={closeMobile}>
                              {label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : (
                  <a href={item.href} onClick={closeMobile}>
                    <i className={`bi ${item.icon}`} />
                    <span>{item.label}</span>
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

/**
 * 원본 include/leftnav.html 재현.
 * 마크업 구조(.leftNav > .leftLogo + nav > ul.d1 > li.navLi > .d2Nav > ul.d2)와
 * 클래스명을 원본 그대로 유지해 common.css 가 그대로 적용되게 한다.
 */
export function FitLeftNav({ permissions = FIT_DEMO_PERMISSIONS }: FitLeftNavProps) {
  const pathname = usePathname();
  const { mobileOpen, closeMobile } = useFitShell();
  if (WATT_ADMIN_PATHS.has(pathname)) {
    return (
      <WattLeftNav mobileOpen={mobileOpen} closeMobile={closeMobile} />
    );
  }
  const visibleItems = FIT_NAV_ITEMS.filter((item) => isNavItemVisible(item, permissions));

  return (
    <div className={mobileOpen ? "leftNav mobileActive" : "leftNav"}>
      <style>{PLATFORM_SWITCH_STYLES}</style>
      <div className="leftLogo">
        <PlatformSwitch current="egfit" closeMobile={closeMobile} />
      </div>
      <nav id="navigation">
        <ul className="d1">
          <li className="navLi active" id="peak">
            <div className="d2Nav">
              <ul className="d2">
                {visibleItems.map((item) => (
                  <li key={item.id} id={item.id}>
                    <Link
                      href={item.href}
                      id={`${item.id}Menu`}
                      className={pathname === item.href ? "active" : undefined}
                      onClick={closeMobile}
                    >
                      <i className={`bi ${item.icon}`} /> {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </li>
        </ul>
      </nav>
    </div>
  );
}
