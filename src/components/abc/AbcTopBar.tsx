"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ABC_SETTINGS_LINKS } from "@/lib/abc/settings-nav";
import { FirmSelect } from "@/components/fit/FirmSelect";
import { useAbcShell } from "./AbcShellContext";

/** ABC 상단 바 업체 선택 옵션(데이터베이스 고객 정보에서 파생). */
export interface AbcFirmOption {
  readonly fid: number;
  readonly name: string;
}

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

interface AbcTopBarProps {
  readonly firms?: readonly AbcFirmOption[];
}

/** 원본 watt include/top.html 재현 — ABC EMS 상단바. */
export function AbcTopBar({ firms = [] }: AbcTopBarProps) {
  const { mobileOpen, toggleMobile } = useAbcShell();
  const [clock, setClock] = useState<{ ymd: string; dtime: string } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentFid, setCurrentFid] = useState<number | null>(null);
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

  // 현재 선택 업체는 localStorage.fid 기준(에그핏과 동일). 마운트 후 읽는다.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const stored = Number(window.localStorage.getItem("fid"));
      if (stored && firms.some((firm) => firm.fid === stored)) {
        setCurrentFid(stored);
      }
    });
    return () => window.cancelAnimationFrame(frame);
    // firms 는 레이아웃에서 고정된다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeFirm = (fid: number) => {
    setCurrentFid(fid);
    try {
      window.localStorage.setItem("fid", String(fid));
      window.localStorage.setItem("authIdn", String(fid));
    } catch {
      // 로컬 스토리지 접근 실패 시에도 화면 갱신은 진행한다.
    }
    // 업체 변경 시 각 화면이 fid 기준으로 다시 그려지도록 새로고침한다.
    window.location.reload();
  };

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
          <FirmSelect
            firms={firms}
            value={currentFid ?? firms[0]?.fid ?? ""}
            onChange={changeFirm}
          />
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
