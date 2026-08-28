"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FitFirmOption, FitStatusBadge } from "@/types/fit";
import { useFitShell } from "./FitShellContext";

/** 원본 include/top.html 의 상태 배지 4종. 실제로는 이 중 하나만 노출된다. */
const STATUS_TEXT: Record<FitStatusBadge["level"], string> = {
  badbad: "주의요함  이번주는 피크관리에 각별한 관심이 필요합니다!",
  bad: "관심필요  이번주 피크 횟수가 평균을 초과하였습니다.",
  normal: "보통  이번주 피크현황이 안정적입니다.",
  good: "좋아요!   이번주 에너지 사용이 원활합니다.",
};

const SETTINGS_LINKS: ReadonlyArray<{ href: string; label: string }> = [
  { href: "/fit/widget-set", label: "대시보드 화면설정" },
  { href: "/fit/user", label: "사용자관리" },
  { href: "/fit/notify", label: "알람설정" },
  { href: "/fit/gate-node", label: "게이트웨이 관리" },
  { href: "/fit/gateway", label: "복합제어기 관리" },
  { href: "/fit/sequence", label: "시퀀스제어" },
  { href: "/fit/gate-rtu", label: "RTU관리" },
  { href: "/fit/device", label: "모드버스 계측" },
  { href: "/fit/net", label: "실시간데이터" },
  { href: "/fit/bad", label: "통신상태 불량" },
];

function padZero(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/**
 * 원본 base.js `syncDate` 와 동일한 포맷.
 * 날짜는 YYYY-MM-DD, 시각은 "오전 9:05" 처럼 시(hour)만 0 패딩이 벗겨진다.
 */
function formatNow(now: Date): { ymd: string; dtime: string } {
  const rawHours = now.getHours();
  const ampm = rawHours < 12 ? "오전" : "오후";
  const hours = rawHours % 12 || 12;

  return {
    ymd: `${now.getFullYear()}-${padZero(now.getMonth() + 1)}-${padZero(now.getDate())}`,
    dtime: `${ampm} ${hours}:${padZero(now.getMinutes())}`,
  };
}

interface FitTopBarProps {
  readonly firms?: readonly FitFirmOption[];
  readonly status?: FitStatusBadge;
}

export function FitTopBar({ firms = [], status }: FitTopBarProps) {
  const pathname = usePathname();
  const { mobileOpen, toggleMobile } = useFitShell();
  const [clock, setClock] = useState<{ ymd: string; dtime: string } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wattAdmin = SETTINGS_LINKS.some((link) => link.href === pathname);
  const displayedFirms = wattAdmin
    ? [{ fid: 121, name: "대산금속" }]
    : firms;
  const displayedStatus = wattAdmin
    ? { level: "good" as const, text: "좋아요!   이번주 에너지 사용이 원활합니다." }
    : status;

  // 원본은 1초 주기 setTimeout 으로 갱신한다. 서버/클라이언트 시각 차이로 인한
  // 하이드레이션 불일치를 피하려 첫 렌더에서는 비워 두고 마운트 후 채운다.
  useEffect(() => {
    const tick = () => setClock(formatNow(new Date()));

    tick();
    const interval = setInterval(tick, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const openSettings = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setSettingsOpen(true);
  };

  // 원본은 .tb-set mouseleave 로 닫되 .tbSetNav mouseenter 로 되살린다.
  // 두 요소 사이 이동 중 깜빡임을 막기 위해 한 틱 지연 후 닫는다.
  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setSettingsOpen(false), 80);
  };

  return (
    <>
      <div className="topArea">
        <div className="left">
          <select name="" id="firmSelect" className="firmSelect" defaultValue={displayedFirms[0]?.fid}>
            {displayedFirms.map((firm) => (
              <option key={firm.fid} value={firm.fid}>
                {firm.name}
              </option>
            ))}
          </select>
          <i className="bi bi-person-circle" role="button" aria-label="프로필" />
          <div className="goodbad">
            <ul id="currentStatus">
              {displayedStatus ? (
                <li>
                  <a href="#">
                    <span className={`state ${displayedStatus.level}`}>
                      {wattAdmin
                        ? "좋아요!"
                        : displayedStatus.text ||
                          STATUS_TEXT[displayedStatus.level]}
                    </span>
                    {wattAdmin ? (
                      <span className="text">
                        이번주 에너지 사용이 원활합니다.
                      </span>
                    ) : null}
                  </a>
                </li>
              ) : null}
            </ul>
          </div>
          {!wattAdmin ? (
            <div className="day">
              <i className="bi bi-clock" />
              <span className="ymd" id="ymd">
                {clock?.ymd ?? ""}
              </span>
              <span className="dtime" id="dtime">
                {clock?.dtime ?? ""}
              </span>
            </div>
          ) : null}
        </div>

        <div
          className={mobileOpen ? "mobileIcon active" : "mobileIcon"}
          onClick={toggleMobile}
          role="button"
          aria-label="메뉴"
          aria-expanded={mobileOpen}
        >
          <div className="line" />
        </div>
      </div>

      <div className={mobileOpen ? "topRightArea mobileActive" : "topRightArea"}>
        {wattAdmin ? (
          <div className="day">
            <i className="bi bi-clock" />
            <span className="ymd" id="ymd">
              {clock?.ymd ?? ""}
            </span>
            <span className="dtime" id="dtime">
              {clock?.dtime ?? ""}
            </span>
          </div>
        ) : null}
        <ul className="topBtn">
          <li
            className="tb-refresh"
            style={{ order: wattAdmin ? 2 : undefined }}
          >
            <a href="#" onClick={(event) => { event.preventDefault(); window.location.reload(); }}>
              <i className="bi bi-arrow-clockwise" role="img" aria-label="새로고침" />
              <span className="text">새로고침</span>
            </a>
          </li>
          {wattAdmin ? (
            <li className="tbHelp" style={{ order: 3 }}>
              <a
                href="https://rfems.com/abc_manual/index.php"
                target="_blank"
                rel="noreferrer"
              >
                <i className="bi bi-question-circle" role="img" aria-label="도움말" />
                <span className="text">도움말</span>
              </a>
            </li>
          ) : null}
          <li
            className="tb-set"
            style={{ order: wattAdmin ? 1 : undefined }}
            onMouseEnter={openSettings}
            onMouseLeave={scheduleClose}
            onClick={openSettings}
          >
            <a href="#" className="bluebtn" onClick={(event) => event.preventDefault()}>
              <i className="bi bi-gear" role="img" aria-label="환경설정" />
              <span className="text">환경설정</span>
            </a>
            <div className="tbSetNav" style={{ display: settingsOpen ? "block" : "none" }} onMouseEnter={openSettings}>
              <ul>
                {SETTINGS_LINKS.map((link) => (
                  <li key={link.href}>
                    <a href={link.href}>{link.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          </li>
          <li
            className="tb-logout"
            id="appLogout"
            style={{ order: wattAdmin ? 4 : undefined }}
          >
            <Link href="/fit/login">
              <i className="bi bi-door-open" role="img" aria-label="로그아웃" />
              <span className="text">로그아웃</span>
            </Link>
          </li>
        </ul>
      </div>
    </>
  );
}
