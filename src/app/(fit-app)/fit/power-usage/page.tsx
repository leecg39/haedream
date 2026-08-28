import type { Metadata } from "next";
import { PowerUsagePage } from "@/components/fit/power-usage/PowerUsagePage";
import { findFitMockPageByRoute } from "@/lib/fit-mock-db";

/** 제목은 MockDB(원본 사이트가 실제로 응답한 <title>)에서 가져온다. */
export const metadata: Metadata = {
  title: findFitMockPageByRoute("/fit/power-usage")?.title ?? "",
};

export default function Page() {
  return <PowerUsagePage />;
}
