import { MOCK_FETCH_SUMMARY, MOCK_CATEGORIES, MOCK_PAGES } from "@/lib/mock-db";
import HubDashboard from "@/components/HubDashboard";
import { AppError } from "@/lib/errors";
import { getPilotDashboardSnapshot } from "@/features/pilot/source";
import type { PilotSnapshot } from "@/features/pilot/types";

export const metadata = {
  title: "SolarSimz · 허브 대시보드",
  description: "watt.rfenms.com MockDB 기반 허브 대시보드",
};

function loadPilotSnapshot(): PilotSnapshot | null {
  try {
    return getPilotDashboardSnapshot();
  } catch (error) {
    if (error instanceof AppError && error.code === "RTU_NOT_IMPLEMENTED") {
      return {
        source: "rtu",
        gateway: null,
        points: [],
        latestReading: null,
        readings: [],
      };
    }
    return null;
  }
}

export default function HubPage() {
  // ── 서버 사이드 데이터 집계 ──────────────────────────────────────────
  const groups = MOCK_CATEGORIES.map((category) => {
    const pages = MOCK_PAGES.filter((p) => p.categoryId === category.id);
    const totalBytes = pages.reduce((sum, p) => sum + p.contentLength, 0);
    const activePages = pages.filter((p) => !p.menuDisabled).length;
    return { category, pages, totalBytes, activePages };
  });

  const fetchedAt = new Date(MOCK_FETCH_SUMMARY.fetchedAt).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <HubDashboard
      groups={groups}
      summary={MOCK_FETCH_SUMMARY}
      fetchedAt={fetchedAt}
      pilot={loadPilotSnapshot()}
    />
  );
}
