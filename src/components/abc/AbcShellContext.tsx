"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

interface AbcShellState {
  readonly mobileOpen: boolean;
  readonly toggleMobile: () => void;
  readonly closeMobile: () => void;
}

const AbcShellContext = createContext<AbcShellState | null>(null);

/** 원본 base.js 모바일 메뉴 토글 재현 (mobileIcon/overlay/leftNav/topBtn/bdRight 동시 토글). */
export function AbcShellProvider({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const toggleMobile = useCallback(() => setMobileOpen((o) => !o), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const value = useMemo(
    () => ({ mobileOpen, toggleMobile, closeMobile }),
    [mobileOpen, toggleMobile, closeMobile],
  );
  return <AbcShellContext.Provider value={value}>{children}</AbcShellContext.Provider>;
}

export function useAbcShell(): AbcShellState {
  const ctx = useContext(AbcShellContext);
  if (!ctx) throw new Error("useAbcShell must be used within AbcShellProvider");
  return ctx;
}
