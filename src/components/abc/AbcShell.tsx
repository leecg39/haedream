"use client";

import { AbcLeftNav } from "./AbcLeftNav";
import { AbcShellProvider, useAbcShell } from "./AbcShellContext";
import { AbcTopBar } from "./AbcTopBar";

function AbcShellInner({ children }: { children: React.ReactNode }) {
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
            <AbcTopBar />
          </div>
          {children}
        </div>
      </div>
    </>
  );
}

export function AbcShell({ children }: { children: React.ReactNode }) {
  return (
    <AbcShellProvider>
      <AbcShellInner>{children}</AbcShellInner>
    </AbcShellProvider>
  );
}
