import type { Metadata } from "next";
import { FacilitiesManager } from "@/components/FacilitiesManager";

export const metadata: Metadata = {
  title: "주요설비 관리 · SolarSimz",
  description: "주요설비 등록, 조회, 수정, 삭제 및 복구",
};

export default function FacilitiesPage() {
  return <FacilitiesManager />;
}
