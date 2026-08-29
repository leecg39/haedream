import { FitShell } from "@/components/fit/FitShell";
import { FIT_DEMO_STATUS } from "@/lib/fit-demo";
import { FIRM_ROWS } from "@/lib/fit-mocks/firm";
import type { FitFirmOption } from "@/types/fit";

// 업체관리(FIRM_ROWS) 전체를 상단 바 업체 선택에 연동한다.
// 클라이언트로는 fid·이름만 내보낸다(한전비밀번호 등 민감정보 제외).
const FIRM_OPTIONS: readonly FitFirmOption[] = FIRM_ROWS.map((row) => ({
  fid: row.fid,
  name: row.firmName,
}));

export default function FitDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <FitShell firms={FIRM_OPTIONS} status={FIT_DEMO_STATUS}>
      {children}
    </FitShell>
  );
}
