import type { Metadata } from "next";
import { FitShell } from "@/components/fit/FitShell";
import { WidgetSettings } from "@/components/fit/admin/WidgetSettings";

export const metadata: Metadata = {
  title: "대시보드 화면설정",
};

export default function WidgetSettingsPage() {
  return (
    <FitShell>
      <WidgetSettings />
    </FitShell>
  );
}
