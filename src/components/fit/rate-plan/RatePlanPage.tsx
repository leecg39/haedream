"use client";

import { LIB_STYLES, PageStyles } from "@/components/fit/shared/PageStyles";
import { RatePlanCompare } from "@/components/fit/rate-plan/RatePlanCompare";

export function RatePlanPage() {
  return (
    <>
      <PageStyles files={[...LIB_STYLES, "/fit/assets/css/ratePlan.css"]} />
      <main className="contents" id="contentsArea"><div className="topTitle"><h1 className="deskTitle">전기 요금 비교</h1></div><RatePlanCompare /></main>
    </>
  );
}

/**
 * 원본 reduce.html 의 `.dataBox h3` 는 각 항목 앞에 부트스트랩 아이콘을 둔다.
 * 라벨과 아이콘 대응은 원본 마크업에서 그대로 옮겼다.
 */
