"use client";

import type { FitFirmOption, FitPermissions, FitStatusBadge } from "@/types/fit";
import { FitLeftNav } from "./FitLeftNav";
import { FitShellProvider, useFitShell } from "./FitShellContext";
import { FitTopBar } from "./FitTopBar";

interface FitShellProps {
  readonly children: React.ReactNode;
  readonly firms?: readonly FitFirmOption[];
  readonly status?: FitStatusBadge;
  readonly permissions?: FitPermissions;
}

/**
 * 원본 대시보드 페이지들의 공통 셸.
 *
 * body#dashboard
 *   .mobileOverlay > .mobileBg + .mobileNavbg
 *   .container > .bdRight#leftnav + .contentsArea > .topBar#topBar + <main>
 *
 * <main> 은 페이지마다 클래스가 달라(예: peak 은 `peakGrid contents`)
 * 각 페이지가 직접 렌더링한다.
 */
function FitShellInner({ children, firms, status, permissions }: FitShellProps) {
  const { mobileOpen, closeMobile, desktopCollapsed, toggleDesktop } = useFitShell();

  const containerClass = desktopCollapsed ? "container deskCollapsed" : "container";

  return (
    <>
      <div className={mobileOpen ? "mobileOverlay active" : "mobileOverlay"}>
        <div className="mobileBg" onClick={closeMobile} />
        <div className={mobileOpen ? "mobileNavbg active" : "mobileNavbg"} />
      </div>
      <div className={containerClass}>
        <div className={mobileOpen ? "bdRight active" : "bdRight"} id="leftnav">
          <FitLeftNav permissions={permissions} />
          {/* 데스크톱 전용: 왼쪽 패널을 접는 버튼 */}
          <button
            type="button"
            className="deskNavToggle"
            onClick={toggleDesktop}
            aria-label="왼쪽 메뉴 접기"
            aria-expanded={!desktopCollapsed}
            title="메뉴 접기"
          >
            <i className="bi bi-chevron-left" aria-hidden="true" />
          </button>
        </div>
        {/* 데스크톱 전용: 패널이 접혔을 때 다시 여는 버튼 */}
        <button
          type="button"
          className="deskNavReopen"
          onClick={toggleDesktop}
          aria-label="왼쪽 메뉴 펼치기"
          aria-expanded={!desktopCollapsed}
          title="메뉴 펼치기"
        >
          <i className="bi bi-list" aria-hidden="true" />
        </button>
        <div className="contentsArea">
          <div className="topBar" id="topBar">
            <FitTopBar firms={firms} status={status} />
          </div>
          {children}
        </div>
      </div>
    </>
  );
}

export function FitShell(props: FitShellProps) {
  return (
    <FitShellProvider>
      <FitShellInner {...props} />
    </FitShellProvider>
  );
}
