"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ABC_SETTINGS_LINKS } from "@/lib/abc/settings-nav";
import { useAbcShell } from "./AbcShellContext";

const DEMO_FIRMS = [
  { fid: 1, name: "대산금속 본사" },
  { fid: 121, name: "제1공장" },
];

function padZero(v: number): string {
  return v < 10 ? `0${v}` : String(v);
}

function formatNow(now: Date): { ymd: string; dtime: string } {
  const raw = now.getHours();
  const ampm = raw < 12 ? "오전" : "오후";
  const hours = raw % 12 || 12;
  return {
    ymd: `${now.getFullYear()}-${padZero(now.getMonth() + 1)}-${padZero(now.getDate())}`,
    dtime: `${ampm} ${hours}:${padZero(now.getMinutes())}`,
  };
}

/** 원본 watt include/top.html 재현 — ABC EMS 상단바. */
export function AbcTopBar() {
  const { mobileOpen, toggleMobile } = useAbcShell();
  const [clock, setClock] = useState<{ ymd: string; dtime: string } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const tick = () => setClock(formatNow(new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const openSettings = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setSettingsOpen(true);
  };
  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setSettingsOpen(false), 80);
  };

  return (
    <>
      <div className="topArea">
        <div className="left">
          <select name="" id="firmSelect" className="firmSelect" defaultValue={DEMO_FIRMS[0].fid}>
            {DEMO_FIRMS.map((f) => (
              <option key={f.fid} value={f.fid}>{f.name}</option>
            ))}
          </select>
          <i className="bi bi-person-circle" role="button" aria-label="프로필" />
          <div className="day">
            <i className="bi bi-clock" />
            <span className="ymd" id="ymd">{clock?.ymd ?? ""}</span>
            <span className="dtime" id="dtime">{clock?.dtime ?? ""}</span>
          </div>
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
        <ul className="topBtn">
          <li className="tb-set" onMouseEnter={openSettings} onMouseLeave={scheduleClose} onClick={openSettings}>
            <a href="#" className="bluebtn" onClick={(e) => e.preventDefault()}>
              <i className="bi bi-gear" role="img" aria-label="환경설정" />
              <span className="text">환경설정</span>
            </a>
            <div className="tbSetNav" style={{ display: settingsOpen ? "block" : "none" }} onMouseEnter={openSettings}>
              <ul>
                {ABC_SETTINGS_LINKS.map((link) => (
                  <li key={link.href}>
                    {link.cloned ? (
                      <Link href={link.href}>{link.label}</Link>
                    ) : (
                      <a href={link.href}>{link.label}</a>
                    )}
                  </li>
                ))}
                <li><a href="/abc/login">업데이트</a></li>
              </ul>
            </div>
          </li>
          <li className="tb-refresh">
            <a href="#" onClick={(e) => { e.preventDefault(); window.location.reload(); }}>
              <i className="bi bi-arrow-clockwise" role="img" aria-label="새로고침" />
              <span className="text">새로고침</span>
            </a>
          </li>
          <li className="tb-logout" id="appLogout">
            <a href="/abc/login">
              <i className="bi bi-door-open" role="img" aria-label="로그아웃" />
              <span className="text">로그아웃</span>
            </a>
          </li>
        </ul>
      </div>
    </>
  );
}
