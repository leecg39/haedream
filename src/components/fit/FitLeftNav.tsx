"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FIT_DEMO_PERMISSIONS, FIT_NAV_ITEMS, isNavItemVisible } from "@/lib/fit-nav";
import type { FitPermissions } from "@/types/fit";
import { useFitShell } from "./FitShellContext";

interface FitLeftNavProps {
  readonly permissions?: FitPermissions;
}

/**
 * 원본 include/leftnav.html 재현.
 * 마크업 구조(.leftNav > .leftLogo + nav > ul.d1 > li.navLi > .d2Nav > ul.d2)와
 * 클래스명을 원본 그대로 유지해 common.css 가 그대로 적용되게 한다.
 */
export function FitLeftNav({ permissions = FIT_DEMO_PERMISSIONS }: FitLeftNavProps) {
  const pathname = usePathname();
  const { mobileOpen, closeMobile } = useFitShell();
  const visibleItems = FIT_NAV_ITEMS.filter((item) => isNavItemVisible(item, permissions));

  return (
    <div className={mobileOpen ? "leftNav mobileActive" : "leftNav"}>
      <div className="leftLogo">
        <Link href="/fit/peak">
          <img src="/fit/assets/img/egfit_top_logo.svg" id="platformLogo" alt="home" />
        </Link>
      </div>
      <nav id="navigation">
        <ul className="d1">
          <li className="navLi active" id="peak">
            <div className="d2Nav">
              <ul className="d2">
                {visibleItems.map((item) => (
                  <li key={item.id} id={item.id}>
                    <Link
                      href={item.href}
                      id={`${item.id}Menu`}
                      className={pathname === item.href ? "active" : undefined}
                      onClick={closeMobile}
                    >
                      <i className={`bi ${item.icon}`} /> {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </li>
        </ul>
        <div className="eggOnLogo">
          <a href="https://watt.rfenms.com/main.html" id="eggOnLink">
            <img src="/fit/assets/img/logo_abc.png" id="footerLogo" alt="하단 로고" />
          </a>
        </div>
      </nav>
    </div>
  );
}
