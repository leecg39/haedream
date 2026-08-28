import { FitShell } from "@/components/fit/FitShell";
import { FIT_DEMO_FIRMS, FIT_DEMO_STATUS } from "@/lib/fit-demo";

export default function FitDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <FitShell firms={FIT_DEMO_FIRMS} status={FIT_DEMO_STATUS}>
      {children}
    </FitShell>
  );
}
