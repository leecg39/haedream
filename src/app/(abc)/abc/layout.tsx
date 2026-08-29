import { AbcShell } from "@/components/abc/AbcShell";
import { FIRM_ROWS } from "@/lib/fit-mocks/firm";
import type { AbcFirmOption } from "@/components/abc/AbcTopBar";

// 데이터베이스 고객(업체) 정보(FIRM_ROWS)를 ABC 상단 바 업체 선택에 연동한다.
// 클라이언트로는 fid·이름만 내보낸다(한전비밀번호 등 민감정보 제외).
const ABC_FIRM_OPTIONS: readonly AbcFirmOption[] = FIRM_ROWS.map((row) => ({
  fid: row.fid,
  name: row.firmName,
}));

export default function AbcDashboardLayout({ children }: { children: React.ReactNode }) {
  return <AbcShell firms={ABC_FIRM_OPTIONS}>{children}</AbcShell>;
}
