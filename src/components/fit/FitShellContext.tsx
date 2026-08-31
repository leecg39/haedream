"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

interface FitShellState {
  readonly mobileOpen: boolean;
  readonly toggleMobile: () => void;
  readonly closeMobile: () => void;
  /** 데스크톱에서 왼쪽 패널을 접었는지 여부. */
  readonly desktopCollapsed: boolean;
  readonly toggleDesktop: () => void;
}

const FitShellContext = createContext<FitShellState | null>(null);

const DESKTOP_COLLAPSED_KEY = "fit.leftNavCollapsed";

/**
 * 원본 base.js `_mobileMenuClickHandler` 재현.
 * 한 번의 클릭으로 mobileIcon / mobileOverlay / mobileNavbg / leftNav /
 * topRightArea / bdRight 6개 요소의 클래스가 동시에 토글된다.
 *
 * 여기에 더해 데스크톱에서 왼쪽 패널을 접었다 펴는 desktopCollapsed 상태를
 * 추가했다. 이 값은 localStorage 에 저장되어 페이지 이동/새로고침 후에도 유지된다.
 */
export function FitShellProvider({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  const toggleMobile = useCallback(() => setMobileOpen((open) => !open), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const toggleDesktop = useCallback(() => setDesktopCollapsed((collapsed) => !collapsed), []);

  // 저장된 접힘 상태를 마운트 후 복원한다.
  // 서버/클라이언트 렌더 불일치를 피하려 초기값은 false 로 두고 마운트 후 읽는다.
  // 이펙트 내 동기 setState 를 피하려 rAF 로 한 프레임 미룬다(FitTopBar 와 동일 패턴).
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        if (window.localStorage.getItem(DESKTOP_COLLAPSED_KEY) === "1") {
          setDesktopCollapsed(true);
        }
      } catch {
        // localStorage 접근 실패 시 기본값(펼침)을 유지한다.
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  // 접힘 상태 변경을 localStorage 에 저장한다.
  useEffect(() => {
    try {
      window.localStorage.setItem(DESKTOP_COLLAPSED_KEY, desktopCollapsed ? "1" : "0");
    } catch {
      // 저장 실패는 무시한다.
    }
  }, [desktopCollapsed]);

  const value = useMemo(
    () => ({ mobileOpen, toggleMobile, closeMobile, desktopCollapsed, toggleDesktop }),
    [mobileOpen, toggleMobile, closeMobile, desktopCollapsed, toggleDesktop],
  );

  return <FitShellContext.Provider value={value}>{children}</FitShellContext.Provider>;
}

export function useFitShell(): FitShellState {
  const context = useContext(FitShellContext);

  if (!context) {
    throw new Error("useFitShell must be used within a FitShellProvider");
  }

  return context;
}
