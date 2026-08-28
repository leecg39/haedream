import type { Metadata } from "next";
import { ResearchPanel } from "@/components/fit/research/ResearchPanel";
import { findFitMockPageByRoute } from "@/lib/fit-mock-db";

/** 제목은 MockDB(원본 사이트가 실제로 응답한 <title>)에서 가져온다. */
export const metadata: Metadata = {
  title: findFitMockPageByRoute("/fit/research")?.title ?? "",
};

export default function Page() {
  return <ResearchPanel />;
}
