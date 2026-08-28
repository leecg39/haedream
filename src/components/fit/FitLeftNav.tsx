"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { FIT_DEMO_PERMISSIONS, FIT_NAV_ITEMS, isNavItemVisible } from "@/lib/fit-nav";
import type { FitPermissions } from "@/types/fit";
import { useFitShell } from "./FitShellContext";

interface FitLeftNavProps {
  readonly permissions?: FitPermissions;
}

const WATT_ADMIN_PATHS = new Set([
  "/fit/widget-set",
  "/fit/user",
  "/fit/notify",
  "/fit/gate-node",
  "/fit/gateway",
  "/fit/sequence",
  "/fit/gate-rtu",
  "/fit/device",
  "/fit/net",
  "/fit/bad",
]);

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
      <div className="leftLogo">
        <a href="/main.html">
          <img src="/fit/assets/img/logo_abc.png" alt="ABC EMS Platform" />
        </a>
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
        <div className="eggFitLogo">
          <a href="/fit/peak">
            <img
              src="/fit/assets/img/egfit_top_logo.svg"
              alt="에그핏 한국미래에너지 플랫폼"
            />
          </a>
        </div>
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
      <div className="leftLogo">
        <Link href="/fit/peak">
          <img src="/fit/assets/img/egfit_top_logo.svg" id="platformLogo" alt="home" />
        </Link>
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
        <div className="eggOnLogo">
          <a href="/main.html" id="eggOnLink">
            <img src="/fit/assets/img/logo_abc.png" id="footerLogo" alt="하단 로고" />
          </a>
        </div>
      </nav>
    </div>
  );
}
