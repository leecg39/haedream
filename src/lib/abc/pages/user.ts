import type { AbcDeskConfig } from "@/components/abc/AbcDeskTable";

/** 원본 watt user.html — 컬럼은 원본 그대로, 값은 데모 목데이터. */
export const USER_CONFIG: AbcDeskConfig = {
  title: "사용자관리",
  columns: [{ label: "이름", sortKey: "firmName" }, { label: "아이디", sortKey: "bone" }, { label: "권한" }, { label: "부서", sortKey: "part" }, { label: "연락처" }, { label: "접속일자" }],
  showTopCount: false,
  rows: [["김관리", "admin01", "관리자", "전력관리팀", "010-1234-5678", "2026-08-29 08:41"], ["이운영", "oper02", "일반사용자", "시설운영팀", "010-2345-6789", "2026-08-28 17:12"], ["박저압", "low03", "저압관리자", "에너지진단팀", "010-3456-7890", "2026-08-29 09:03"], ["최현장", "field04", "일반사용자", "현장지원팀", "010-4567-8901", "2026-08-27 14:55"], ["정보안", "sec05", "관리자", "보안관리팀", "010-5678-9012", "2026-08-29 07:22"]],
  toolbar: [
    { act: "add", icon: "bi bi-person-plus-fill", label: "추가" },
    { act: "excel", icon: "bi bi-file-earmark-excel-fill excel", label: "엑셀로 다운" },
    { act: "print", icon: "bi bi-printer", label: "프린트" },
  ],
};
