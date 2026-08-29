import type { AbcDeskConfig } from "@/components/abc/AbcDeskTable";

/** 원본 watt device.html — 컬럼은 원본 그대로, 값은 데모 목데이터. */
export const DEVICE_CONFIG: AbcDeskConfig = {
  title: "모드버스 계측",
  columns: [{ label: "LoadID", sortKey: "pid" }, { label: "업체" }, { label: "RTU", sortKey: "gid" }, { label: "vpn", sortKey: "vid" }, { label: "이름", sortKey: "lp_name" }, { label: "LoadNumber" }, { label: "device", sortKey: "md_id" }, { label: "전압" }, { label: "전류", tip: "자원사용중일때 mA" }, { label: "전력" }, { label: "전력비교", tip: "전류 x 전압 x 역률 x √3" }, { label: "정보", tip: "전기는 역률표시 이 외는 해당수치" }, { label: "마지막수신", sortKey: "lp_last" }, { label: "자원" }, { label: "자원ID" }, { label: "자원범위" }, { label: "메모", sortKey: "memo" }],
  rows: [["1001", "대산금속 본사", "9", "10.8.0.11", "본관 수전", "1", "PM2200", "382", "540", "1,196", "▲ 2.4%", "3P4W", "2026-08-29 09:15", "전력", "R-01", "0~2000", "수전반"], ["1002", "제1공장", "9", "10.8.0.12", "압연 MCC", "2", "PM5560", "381", "318", "742", "▼ 1.1%", "3P4W", "2026-08-29 09:15", "전력", "R-02", "0~1500", "압연"], ["1003", "제2공장", "7", "10.8.0.13", "용해로 반", "3", "PM2200", "383", "612", "1,318", "▲ 5.8%", "3P4W", "2026-08-29 09:14", "전력", "R-03", "0~2500", "전기로"]],
  toolbar: [
    { act: "add", icon: "bi bi-file-plus", label: "추가" },
    { act: "excel", icon: "bi bi-file-earmark-excel-fill excel", label: "엑셀로 다운" },
    { act: "print", icon: "bi bi-printer", label: "프린트" },
  ],
  showDayCk: true,
};
