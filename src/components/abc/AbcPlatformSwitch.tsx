"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type PlatformId = "abc" | "egfit";

const PLATFORM_OPTIONS: ReadonlyArray<{
  readonly id: PlatformId;
  readonly label: string;
  readonly href: string;
  readonly logo: string;
}> = [
  { id: "abc", label: "ABC EMS PLATFORM", href: "/abc", logo: "/abc/assets/img/logo_abc.png" },
  { id: "egfit", label: "에그핏", href: "/fit/peak", logo: "/abc/assets/img/egfit_top_logo.svg" },
];

export const ABC_PLATFORM_SWITCH_STYLES = `
.leftLogo .platformSwitch{position:relative;display:flex;align-items:center;justify-content:center;width:100%}
.platformSwitchButton{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;padding:0;border:0;background:transparent;cursor:pointer}
.platformSwitchButton img{width:130px;object-fit:scale-down;margin:1vh 0}
.platformSwitchButton>i{color:#c6c6c6;font-size:12px;transition:transform .2s}
.platformSwitchButton:hover>i{color:#97b1ff}
.platformSwitchMenu{position:absolute;top:100%;left:50%;transform:translateX(-50%);z-index:1200;min-width:190px;margin:2px 0 0;padding:6px;list-style:none;border:1px solid rgba(255,255,255,.16);border-radius:8px;background:#14143c;box-shadow:0 8px 24px rgba(0,0,0,.45)}
.platformSwitchMenu li a{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:6px;color:#e8e8f2;font-size:13px;text-decoration:none;white-space:nowrap}
.platformSwitchMenu li a:hover{background:rgba(48,126,235,.25);color:#fff}
.platformSwitchMenu li a[aria-current="page"]{background:rgba(48,126,235,.18)}
.platformSwitchMenu li a img{width:22px;height:22px;object-fit:contain}
.platformSwitchMenu li a i{margin-left:auto;color:#7ec8ff}
@media (max-width:1024px){.platformSwitchMenu{left:0;transform:none}}
`;

/**
 * 상단 로고 자리의 플랫폼 전환 드롭다운 (ABC EMS ↔ 에그핏).
 * fit 셸의 PlatformSwitch 와 동일한 디자인·동작으로 맞춰 일관성을 유지한다.
 * ABC EMS 영역이므로 current="abc".
 */
export function AbcPlatformSwitch({ closeMobile }: { readonly closeMobile: () => void }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const current: PlatformId = "abc";
  const currentPlatform = PLATFORM_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="platformSwitch" ref={containerRef}>
      <button
        type="button"
        className="platformSwitchButton"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="플랫폼 선택"
        onClick={() => setOpen((v) => !v)}
      >
        <img src={currentPlatform.logo} id="platformLogo" alt="ABC EMS Platform" />
        <i className={`bi bi-chevron-${open ? "up" : "down"}`} aria-hidden="true" />
      </button>
      {open ? (
        <ul className="platformSwitchMenu" aria-label="플랫폼 목록">
          {PLATFORM_OPTIONS.map((option) => {
            const isCurrent = option.id === current;
            const content = (
              <>
                <img src={option.logo} alt="" aria-hidden="true" />
                <span>{option.label}</span>
                {isCurrent ? <i className="bi bi-check2" aria-hidden="true" /> : null}
              </>
            );
            return (
              <li key={option.id}>
                {option.id === "egfit" ? (
                  <Link href={option.href} aria-current={isCurrent ? "page" : undefined} onClick={() => { setOpen(false); closeMobile(); }}>
                    {content}
                  </Link>
                ) : (
                  <Link href={option.href} aria-current={isCurrent ? "page" : undefined} onClick={() => { setOpen(false); closeMobile(); }}>
                    {content}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
