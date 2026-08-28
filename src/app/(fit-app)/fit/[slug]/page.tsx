import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FitPageCatalog, type FitCatalogPage } from "@/components/fit/FitPageCatalog";

const PAGE_TITLES: Readonly<Record<FitCatalogPage, string>> = {
  stat: "통합관제",
  firm: "업체관리",
  research: "한전데이터 수집",
  "peak-panel": "부하 상황판",
  "peak-set": "피크 제어설정",
  "power-usage": "전력 사용 보고서",
  "peak-usage": "피크 15분 전력보고서",
  "control-his": "피크제어이력",
  acp: "시스템에어컨 관리",
  "rate-plan": "전기 요금 비교",
  reduce: "저압 절감 분석",
  report: "저압 절감 보고서",
};

function isFitCatalogPage(value: string): value is FitCatalogPage {
  return Object.hasOwn(PAGE_TITLES, value);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: isFitCatalogPage(slug) ? PAGE_TITLES[slug] : "페이지를 찾을 수 없음" };
}

export default async function FitCatalogRoute({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!isFitCatalogPage(slug)) {
    notFound();
  }

  return <FitPageCatalog page={slug} />;
}
