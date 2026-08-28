import type { Metadata } from "next";
import { FirmManager } from "@/components/fit/firm/FirmManager";
import { findFitMockPageByRoute } from "@/lib/fit-mock-db";

/** 제목은 MockDB(원본 사이트가 실제로 응답한 <title>)에서 가져온다. */
export const metadata: Metadata = {
  title: findFitMockPageByRoute("/fit/firm")?.title ?? "",
};

export default function Page() {
  return <FirmManager />;
}
