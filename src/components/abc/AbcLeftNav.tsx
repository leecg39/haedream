"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { ABC_NAV } from "@/lib/abc/nav";
import { useAbcShell } from "./AbcShellContext";

/**
 * 원본 watt include/leftnav.html 재현 — ABC EMS 다중 그룹 좌측 내비.
 * 클래스명(.leftNav/.d1/.navLi/.d2Nav/.d2/.leftMArr)을 원본대로 유지해 common.css 적용.
 * 그룹 클릭 시 .navLi.active 토글로 하위메뉴(.d2Nav)를 펼친다.
 */
export function AbcLeftNav() {
  const { mobileOpen, closeMobile } = useAbcShell();
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<string | null>("peak");

  return (
    <div className={mobileOpen ? "leftNav mobileActive" : "leftNav"}>
      <div className="leftLogo">
        <a href="/abc/main.html">
          <img src="/abc/assets/img/logo_abc.png" id="platformLogo" alt="home" />
        </a>
      </div>
      <nav id="navigation">
        <ul className="d1">
          {ABC_NAV.map((group) => {
            if (group.disabled) {
              return (
                <li className="navLi disable" id={group.id} key={group.id}>
                  <a href="#" onClick={(e) => e.preventDefault()}>
                    <i className={group.icon} />
                    <span>{group.label}</span>
                  </a>
                </li>
              );
            }
            if (!group.items) {
              return (
                <li className="navLi" id={group.id} key={group.id}>
                  <a href={group.href} onClick={closeMobile}>
                    <i className={group.icon} />
                    <span>{group.label}</span>
                  </a>
                </li>
              );
            }
            const open = expanded === group.id;
            return (
              <li className={open ? "navLi active" : "navLi"} id={group.id} key={group.id}>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setExpanded(open ? null : group.id);
                  }}
                >
                  <i className={group.icon} />
                  <span>{group.label}</span>
                  <span className={open ? "leftMArr active" : "leftMArr"}>
                    <i className="bi bi-chevron-down" />
                  </span>
                </a>
                <div className="d2Nav">
                  <ul className="d2">
                    {group.items.map((item) => (
                      <li key={item.href}>
                        <a
                          href={item.href}
                          className={pathname === item.href ? "active" : undefined}
                          onClick={closeMobile}
                        >
                          {item.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="eggOnLogo">
          <a href="/fit/peak" id="eggOnLink">
            <img src="/abc/assets/img/egfit_top_logo.svg" id="footerLogo" alt="에그핏" />
          </a>
        </div>
      </nav>
    </div>
  );
}
