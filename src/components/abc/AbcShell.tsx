"use client";

import { AbcLeftNav } from "./AbcLeftNav";
import { AbcShellProvider, useAbcShell } from "./AbcShellContext";
import { AbcTopBar, type AbcFirmOption } from "./AbcTopBar";

interface AbcShellProps {
  readonly children: React.ReactNode;
  readonly firms?: readonly AbcFirmOption[];
}

function AbcShellInner({ children, firms }: AbcShellProps) {
  const { mobileOpen, closeMobile } = useAbcShell();
  return (
    <>
      <div className={mobileOpen ? "mobileOverlay active" : "mobileOverlay"}>
        <div className="mobileBg" onClick={closeMobile} />
        <div className={mobileOpen ? "mobileNavbg active" : "mobileNavbg"} />
      </div>
      <div className="container">
        <div className={mobileOpen ? "bdRight active" : "bdRight"} id="leftnav">
          <AbcLeftNav />
        </div>
        <div className="contentsArea">
          <div className="topBar" id="topBar">
            <AbcTopBar firms={firms} />
          </div>
          {children}
        </div>
      </div>
    </>
  );
}

export function AbcShell({ children, firms }: AbcShellProps) {
  return (
    <AbcShellProvider>
      <AbcShellInner firms={firms}>{children}</AbcShellInner>
    </AbcShellProvider>
  );
}
