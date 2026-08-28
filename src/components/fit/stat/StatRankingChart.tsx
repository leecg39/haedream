"use client";

import type { StatRankingItem } from "@/lib/fit-mocks/stat";
import { echoMoneyAxis } from "./statUtils";

/**
 * 원본 `#rankingChart` 는 ECharts(dark 테마) 가로 막대다.
 * 클론은 외부 차트 라이브러리를 로드하지 않고 컨테이너와 id 만 원본대로 두고
 * 내부를 CSS 막대로 근사한다.
 */
export function StatRankingChart({ items }: { readonly items: readonly StatRankingItem[] }) {
  const max = Math.max(...items.map((item) => item.frugal), 1);

  return (
    <div className="rankingChart" id="rankingChart">
      {items.map((item) => (
        <div className="rankingRow" key={item.firmName}>
          <span className="rankingName">{item.firmName}</span>
          <span className="rankingBar">
            <span className="rankingBarFill" style={{ width: `${(item.frugal / max) * 100}%` }} />
          </span>
          <span className="rankingValue">{echoMoneyAxis(item.frugal)}</span>
        </div>
      ))}
    </div>
  );
}
