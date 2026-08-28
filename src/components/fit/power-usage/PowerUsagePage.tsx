"use client";

import { LIB_STYLES, PageStyles } from "@/components/fit/shared/PageStyles";
import { PowerUsageReport } from "@/components/fit/power-usage/PowerUsageReport";

export function PowerUsagePage() {
  return (
    <>
      <PageStyles files={[...LIB_STYLES, "/fit/assets/css/powerUsage.css"]} />
      <main className="contents" id="contentsArea"><PowerUsageReport /></main>
    </>
  );
}
