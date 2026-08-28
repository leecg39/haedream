"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

interface FitShellState {
  readonly mobileOpen: boolean;
  readonly toggleMobile: () => void;
  readonly closeMobile: () => void;
}

const FitShellContext = createContext<FitShellState | null>(null);

/**
 * 원본 base.js `_mobileMenuClickHandler` 재현.
 * 한 번의 클릭으로 mobileIcon / mobileOverlay / mobileNavbg / leftNav /
 * topRightArea / bdRight 6개 요소의 클래스가 동시에 토글된다.
 */
export function FitShellProvider({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleMobile = useCallback(() => setMobileOpen((open) => !open), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const value = useMemo(
    () => ({ mobileOpen, toggleMobile, closeMobile }),
    [mobileOpen, toggleMobile, closeMobile],
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
