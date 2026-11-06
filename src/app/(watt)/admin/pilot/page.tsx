import type { Metadata } from "next";
import { PilotOpsPanel } from "@/components/PilotOpsPanel";

export const metadata: Metadata = {
  title: "파일럿 관제·알람·검수 · SolarSimz",
  description: "패키지 A 끊김·알람, 검수 체크리스트, 일일 확인, 매핑·BOM",
};

export default function PilotOpsPage() {
  return (
    <main className="min-h-screen bg-[#07111f]">
      <PilotOpsPanel />
    </main>
  );
}
