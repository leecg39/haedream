"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { PageStyles } from "@/components/fit/shared/PageStyles";

export type AdminManagerKind =
  | "user"
  | "gate-node"
  | "gateway"
  | "sequence"
  | "gate-rtu"
  | "device";

type AdminRow = { id: string } & Record<string, string>;
type AdminAction = "add" | "mode" | "off" | "on" | "excel" | "print";

type AdminField = {
  readonly key: string;
  readonly label: string;
  readonly required?: boolean;
  readonly options?: readonly string[];
  readonly inputMode?: "numeric" | "tel";
  readonly secret?: boolean;
  readonly table?: boolean;
};

type AdminConfig = {
  readonly title: string;
  readonly editorTitle: string;
  readonly actions: readonly AdminAction[];
  readonly fields: readonly AdminField[];
  readonly rows: readonly AdminRow[];
  readonly companyFilter?: boolean;
  readonly groupSetting?: boolean;
};

const COMPANY = "대산금속";
const IP = "115.94.112.219";
const IP_ATON = "1935569115";
const PAGE_SIZE = 10;
const COMPANIES = [COMPANY, "한국미래에너지 본사", "에그핏 데모사업장"] as const;
const NODE_TYPES = ["-", "RELAY", "POWER", "COM", "AIR"] as const;
const COMMON_ACTIONS: readonly AdminAction[] = ["add", "excel", "print"];

const ACTION_INFO: Record<AdminAction, { label: string; icon: string }> = {
  add: { label: "추가", icon: "bi bi-node-plus" },
  mode: { label: "모드전환", icon: "bi bi-toggles" },
  off: { label: "전체 OFF", icon: "bi bi-toggle-off" },
  on: { label: "전체 ON", icon: "bi bi-toggle-on" },
  excel: { label: "엑셀로 다운", icon: "bi bi-file-earmark-excel-fill excel" },
  print: { label: "프린트", icon: "bi bi-printer" },
};

const field = (
  key: string,
  label: string,
  options?: readonly string[],
  extra: Omit<AdminField, "key" | "label" | "options"> = {},
): AdminField => ({ key, label, options, table: true, ...extra });

const USER_FIELDS: readonly AdminField[] = [
  field("name", "이름", undefined, { required: true }),
  field("loginId", "아이디", undefined, { required: true }),
  field("permission", "권한", ["관리자", "운영자", "조회자"], { required: true }),
  field("department", "부서"),
  field("phone", "연락처", undefined, { inputMode: "tel" }),
  field("lastAccess", "접속일자"),
  field("password", "패스워드", undefined, { secret: true, table: false }),
];

const GATE_NODE_FIELDS: readonly AdminField[] = [
  field("gate", "GATE", undefined, { required: true, inputMode: "numeric" }),
  field("company", "업체", COMPANIES, { required: true }),
  field("name", "이름", undefined, { required: true }),
  field("ip", "IP", undefined, { required: true }),
  field("port", "PORT", undefined, { required: true, inputMode: "numeric" }),
  field("ipAton", "IP AToN"),
  ...Array.from({ length: 10 }, (_, index) =>
    field(`node${index + 1}`, `node${index + 1}`, NODE_TYPES),
  ),
  field("memo", "메모"),
];

const GATEWAY_FIELDS: readonly AdminField[] = [
  field("gate", "GATE", undefined, { required: true, inputMode: "numeric" }),
  field("company", "업체", COMPANIES, { required: true, table: false }),
  field("name", "이름", undefined, { required: true }),
  field("mode", "모드", ["자동", "수동"], { required: true }),
  field("priority", "순위", undefined, { inputMode: "numeric" }),
  field("node", "노드", undefined, { required: true, inputMode: "numeric" }),
  field("measure", "제어계측", ["RELAY", "POWER", "COM", "AIR"]),
  field("voltage", "전압"),
  field("current", "전류"),
  field("temperature", "온도"),
  field("status", "상태", ["미제어", "제어", "정지"]),
  field("control", "제어", ["ON", "OFF"]),
  field("present", "현재값"),
  field("output", "출력"),
  field("peak", "피크"),
  field("lastReceived", "마지막수신"),
  field("cid", "CID"),
  field("memo", "메모"),
];

const SEQUENCE_FIELDS: readonly AdminField[] = [
  field("company", "업체", COMPANIES, { required: true }),
  field("name", "제어이름", undefined, { required: true }),
  field("mode", "제어모드", ["자동", "수동"], { required: true }),
  field("priority", "우선순위", undefined, { inputMode: "numeric" }),
  field("control", "제어", ["ON", "OFF"]),
  field("status", "상태", ["미제어", "제어", "정지"]),
  field("available", "제어가능여부", ["가능", "불가"]),
  field("voltage", "전압"),
  field("current", "전류"),
  field("memo", "메모"),
];

const RTU_FIELDS: readonly AdminField[] = [
  field("rtu", "RTU", undefined, { required: true, inputMode: "numeric" }),
  field("company", "업체", COMPANIES, { required: true }),
  field("name", "이름", undefined, { required: true }),
  field("ip", "IP Address", undefined, { required: true }),
  field("port", "PORT", undefined, { required: true, inputMode: "numeric" }),
  field("ipAton", "IP AToN"),
  field("lastReceived", "마지막수신"),
  field("memo", "메모"),
];

const DEVICE_FIELDS: readonly AdminField[] = [
  field("loadId", "LoadID", undefined, { required: true, inputMode: "numeric" }),
  field("company", "업체", COMPANIES, { required: true }),
  field("rtu", "RTU", undefined, { required: true, inputMode: "numeric" }),
  field("vpn", "vpn", undefined, { inputMode: "numeric" }),
  field("name", "이름", undefined, { required: true }),
  field("loadNumber", "LoadNumber", undefined, { required: true, inputMode: "numeric" }),
  field("device", "device", ["남전사 3상4선식", "온도센서 PT100", "유량계", "가스계량기"], { required: true }),
  field("voltage", "전압"),
  field("current", "전류"),
  field("power", "전력"),
  field("powerCompare", "전력비교"),
  field("info", "정보"),
  field("lastReceived", "마지막수신"),
  field("resource", "자원"),
  field("resourceId", "자원ID"),
  field("resourceRange", "자원범위"),
  field("memo", "메모"),
];

const USER_ROWS: readonly AdminRow[] = [
  {
    id: "user-admin",
    name: "관리자",
    loginId: "admin001",
    permission: "관리자",
    department: "에너지관리팀",
    phone: "010-1234-5678",
    lastAccess: "2026-08-29 05:58",
    password: "",
  },
];

const GATE_NODE_ROWS: readonly AdminRow[] = [4110, 4109, 4108, 4107, 4100].map(
  (gate, index) => ({
    id: `gate-node-${gate}`,
    gate: String(gate),
    company: COMPANY,
    name: ["다이캐스팅2호", "8호기단독", "다이캐스팅 9호별도", "다이캐스팅9 위", "다이캐스팅9 옆"][index],
    ip: IP,
    port: String(48000 + gate),
    ipAton: IP_ATON,
    ...Object.fromEntries(
      Array.from({ length: 10 }, (_, nodeIndex) => [
        `node${nodeIndex + 1}`,
        gate === 4107 && nodeIndex < 9 ? "RELAY" : gate === 4100 && nodeIndex === 0 ? "POWER" : "-",
      ]),
    ),
    memo: "",
  }),
);

const GATEWAY_ROWS: readonly AdminRow[] = Array.from({ length: 18 }, (_, index) => {
  const machine = Math.floor(index / 2) + 1;
  const side = index % 2 === 0 ? "A" : "B";
  return {
    id: `gateway-${machine}-${side}`,
    gate: ["4107", "4110", "4109", "4108"][index % 4],
    company: COMPANY,
    name: `다이캐스팅${machine}${side}`,
    mode: "자동",
    priority: String(index + 1),
    node: String((index % 9) + 1),
    measure: "RELAY",
    voltage: `${380 + (index % 4)}.0 V`,
    current: `${(12.6 + index * 0.7).toFixed(1)} A`,
    temperature: `${58 + (index % 7)} ℃`,
    status: "미제어",
    control: "ON",
    present: "4.00 mA",
    output: "0 %",
    peak: "100 %",
    lastReceived: `2026-08-29 05:${String(39 + (index % 10)).padStart(2, "0")}:12`,
    cid: String(5101 + index),
    memo: "",
  };
});

const SEQUENCE_ROWS: readonly AdminRow[] = [
  {
    id: "sequence-main",
    company: COMPANY,
    name: "다이캐스팅 피크 순차제어",
    mode: "자동",
    priority: "1",
    control: "ON",
    status: "미제어",
    available: "가능",
    voltage: "380.0 V",
    current: "128.4 A",
    memo: "피크 발생 시 순차 제어",
  },
  {
    id: "sequence-air",
    company: COMPANY,
    name: "공조설비 순차제어",
    mode: "자동",
    priority: "2",
    control: "ON",
    status: "미제어",
    available: "가능",
    voltage: "380.0 V",
    current: "48.2 A",
    memo: "",
  },
];

const RTU_ROWS: readonly AdminRow[] = Array.from({ length: 6 }, (_, index) => {
  const rtu = String(4106 - index);
  return {
    id: `rtu-${rtu}`,
    rtu,
    company: COMPANY,
    name: `다이캐스팅${[9, 9, 7, 7, 4, 4][index]} 위 ${rtu}`,
    ip: IP,
    port: ["58779", "59276", "49299", "60174", "59452", "56934"][index],
    ipAton: IP_ATON,
    lastReceived: `2026-08-29 05:${String(47 - index).padStart(2, "0")}:26`,
    memo: "",
  };
});

const DEVICE_NAMES = [
  "TR1",
  "TR2",
  "TR3",
  "다이캐스팅1 메인",
  "다이캐스팅1 온도",
  "다이캐스팅1 용탕",
  "다이캐스팅2 메인",
  "다이캐스팅2 온도",
  "다이캐스팅2 용탕",
  "다이캐스팅3 메인",
  "다이캐스팅3 온도",
  "다이캐스팅3 용탕",
] as const;

const DEVICE_ROWS: readonly AdminRow[] = DEVICE_NAMES.map((name, index) => {
  const temperature = name.includes("온도") || name.includes("용탕");
  return {
    id: `device-${11701 + index}`,
    loadId: String(11701 + index),
    company: COMPANY,
    rtu: String(4106 - (index % 6)),
    vpn: index < 3 ? String(index + 1) : "0",
    name,
    loadNumber: String(101 + index),
    device: temperature ? "온도센서 PT100" : "남전사 3상4선식",
    voltage: temperature ? "-" : `${(398.2 + index * 0.4).toFixed(1)} V`,
    current: temperature ? "-" : `${(14.3 + index * 1.31).toFixed(2)} A`,
    power: temperature ? "-" : `${(9.8 + index * 0.91).toFixed(2)} kW`,
    powerCompare: temperature ? "-" : `${(9.6 + index * 0.9).toFixed(2)} kW`,
    info: temperature ? `${49 + index * 7} ℃` : "0.95 PF",
    lastReceived: `2026-08-29 05:${String(48 - (index % 10)).padStart(2, "0")}:30`,
    resource: temperature ? "CH1" : "-",
    resourceId: temperature ? String(6101 + index) : "-",
    resourceRange: temperature ? "0~1200 ℃" : "-",
    memo: "",
  };
});

const CONFIG: Record<AdminManagerKind, AdminConfig> = {
  user: {
    title: "사용자관리",
    editorTitle: "사용자관리",
    actions: COMMON_ACTIONS,
    fields: USER_FIELDS,
    rows: USER_ROWS,
  },
  "gate-node": {
    title: "게이트웨이 관리",
    editorTitle: "노드 게이트웨이",
    actions: COMMON_ACTIONS,
    fields: GATE_NODE_FIELDS,
    rows: GATE_NODE_ROWS,
    companyFilter: true,
  },
  gateway: {
    title: "복합제어기 관리",
    editorTitle: "게이트웨이 제어",
    actions: ["add", "excel", "print", "mode"],
    fields: GATEWAY_FIELDS,
    rows: GATEWAY_ROWS,
    companyFilter: true,
    groupSetting: true,
  },
  sequence: {
    title: "시퀀스 제어",
    editorTitle: "시퀀스 제어",
    actions: ["add", "mode", "off", "on", "excel", "print"],
    fields: SEQUENCE_FIELDS,
    rows: SEQUENCE_ROWS,
    companyFilter: true,
  },
  "gate-rtu": {
    title: "RTU 관리",
    editorTitle: "RTU",
    actions: COMMON_ACTIONS,
    fields: RTU_FIELDS,
    rows: RTU_ROWS,
    companyFilter: true,
  },
  device: {
    title: "모드버스 계측",
    editorTitle: "모드버스 계측",
    actions: COMMON_ACTIONS,
    fields: DEVICE_FIELDS,
    rows: DEVICE_ROWS,
    companyFilter: true,
  },
};

function blankRow(config: AdminConfig, company: string): AdminRow {
  return config.fields.reduce<AdminRow>(
    (row, item) => {
      row[item.key] = item.key === "company" ? company || COMPANY : item.options?.[0] ?? "";
      return row;
    },
    { id: `new-${Date.now()}` },
  );
}

function csvValue(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function PageButtons({
  page,
  pages,
  onChange,
}: {
  readonly page: number;
  readonly pages: number;
  readonly onChange: (next: number) => void;
}) {
  return (
    <nav className="deskPages" aria-label="페이지 이동">
      <button className="deskPage act" type="button" disabled={page === 1} onClick={() => onChange(page - 1)} aria-label="이전 페이지">prev</button>
      {Array.from({ length: pages }, (_, index) => index + 1).map((item) => (
        <button className={item === page ? "deskPage act active" : "deskPage act"} type="button" key={item} onClick={() => onChange(item)} aria-current={item === page ? "page" : undefined} aria-label={`${item} 페이지`}>{item}</button>
      ))}
      <button className="deskPage act" type="button" disabled={page === pages} onClick={() => onChange(page + 1)} aria-label="다음 페이지">next</button>
    </nav>
  );
}

export function AdminManager({ page: pageKind }: { readonly page: AdminManagerKind }) {
  const config = CONFIG[pageKind];
  const tableFields = useMemo(() => config.fields.filter((item) => item.table !== false), [config.fields]);
  const [rows, setRows] = useState<AdminRow[]>(() => config.rows.map((row) => ({ ...row })));
  const [company, setCompany] = useState(config.companyFilter ? COMPANY : "");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState(tableFields[0].key);
  const [descending, setDescending] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const [draft, setDraft] = useState<AdminRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [errors, setErrors] = useState<readonly string[]>([]);
  const [toast, setToast] = useState("");
  const [groups, setGroups] = useState<readonly string[]>(["기본 제어그룹"]);
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const filteredRows = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase("ko");
    return rows
      .filter((row) => !config.companyFilter || !company || row.company === company)
      .filter((row) => !keyword || tableFields.some((item) => (row[item.key] ?? "").toLocaleLowerCase("ko").includes(keyword)))
      .sort((left, right) => {
        const compared = (left[sortKey] ?? "").localeCompare(right[sortKey] ?? "", "ko", { numeric: true, sensitivity: "base" });
        return descending ? -compared : compared;
      });
  }, [company, config.companyFilter, descending, query, rows, sortKey, tableFields]);

  const pages = pageKind === "device" && showAll ? 1 : Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, pages);
  const visibleRows = pageKind === "device" && showAll
    ? filteredRows
    : filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const first = filteredRows.length ? (safePage - 1) * PAGE_SIZE + 1 : 0;
  const last = pageKind === "device" && showAll ? filteredRows.length : Math.min(safePage * PAGE_SIZE, filteredRows.length);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!draft) return;
    const close = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (groupOpen) {
        setGroupOpen(false);
      } else {
        setDraft(null);
        setErrors([]);
        window.setTimeout(() => returnFocusRef.current?.focus(), 0);
      }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  });

  const announce = (message: string) => {
    setToast("");
    window.setTimeout(() => setToast(message), 0);
  };

  const openEditor = (row?: AdminRow) => {
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    setAdding(!row);
    setErrors([]);
    setDraft(row ? { ...row } : blankRow(config, company));
  };

  const closeEditor = () => {
    setDraft(null);
    setErrors([]);
    setGroupOpen(false);
    window.setTimeout(() => returnFocusRef.current?.focus(), 0);
  };

  const changeSort = (key: string) => {
    if (sortKey === key) setDescending((value) => !value);
    else {
      setSortKey(key);
      setDescending(false);
    }
    setCurrentPage(1);
  };

  const downloadCsv = () => {
    const lines = [
      tableFields.map((item) => csvValue(item.label)).join(","),
      ...filteredRows.map((row) => tableFields.map((item) => csvValue(row[item.key] ?? "")).join(",")),
    ];
    const blob = new Blob([`\uFEFF${lines.join("\r\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${config.title}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    announce("CSV 파일을 다운로드했습니다.");
  };

  const runAction = (action: AdminAction) => {
    if (action === "add") openEditor();
    if (action === "excel") downloadCsv();
    if (action === "print") window.print();
    if (action === "mode") {
      const next = rows.some((row) => row.mode === "자동") ? "수동" : "자동";
      setRows((current) => current.map((row) => ({ ...row, mode: next })));
      announce(`전체 제어모드를 ${next}(으)로 변경했습니다.`);
    }
    if (action === "off" || action === "on") {
      const enabled = action === "on";
      setRows((current) => current.map((row) => ({ ...row, control: enabled ? "ON" : "OFF", status: enabled ? "미제어" : "제어" })));
      announce(enabled ? "전체 ON 요청을 적용했습니다." : "전체 OFF 요청을 적용했습니다.");
    }
  };

  const saveDraft = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft) return;
    const missing = config.fields.filter((item) => item.required && !draft[item.key]?.trim()).map((item) => item.label);
    if (missing.length) {
      setErrors(missing);
      return;
    }
    setRows((current) => adding ? [...current, { ...draft }] : current.map((row) => row.id === draft.id ? { ...draft } : row));
    closeEditor();
    announce(adding ? "새 항목을 추가했습니다." : "변경 내용을 저장했습니다.");
  };

  const addGroup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = groupName.trim();
    if (!value) return;
    setGroups((current) => current.includes(value) ? current : [...current, value]);
    setGroupName("");
    setGroupOpen(false);
    announce("제어 그룹을 추가했습니다.");
  };

  const openRowFromKeyboard = (event: KeyboardEvent<HTMLTableRowElement>, row: AdminRow) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openEditor(row);
    }
  };

  return (
    <>
      <PageStyles files={["/fit/assets/css/deskLib.css", "/fit/clone-css/admin-extras.css"]} />
      <main className="contents videoAdmin" id="contentsArea">
        <h1 className="deskTitle">{config.title}</h1>
        <section className={pageKind === "sequence" ? "sheetArea setSub seq" : "sheetArea setSub"} aria-label={`${config.title} 목록`}>
          <div className="deskStat videoAdminTop">
            <div className={pageKind === "sequence" ? "deskTool onlypci" : "deskTool"} id="deskTool">
              {config.actions.map((action) => (
                <button className="deskAct act" type="button" key={action} onClick={() => runAction(action)}>
                  <i className={ACTION_INFO[action].icon} aria-hidden="true" />{ACTION_INFO[action].label}
                </button>
              ))}
            </div>

            <div className="videoAdminFilters">
              {config.companyFilter ? (
                <label className="companyFilter">
                  <span>업체</span>
                  <select className="deskSelect" aria-label={`${config.title} 업체`} value={company} onChange={(event) => { setCompany(event.target.value); setCurrentPage(1); }}>
                    <option value="">전체 업체</option>
                    {COMPANIES.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
              ) : null}
              {pageKind === "device" ? (
                <div className="dayCk">
                  <label htmlFor="isAll"><span>전체 보기</span><input type="checkbox" id="isAll" role="switch" checked={showAll} onChange={(event) => { setShowAll(event.target.checked); setCurrentPage(1); }} /></label>
                </div>
              ) : null}
              <span className="deskSearch">
                <input className="deskInput" placeholder="검색" autoComplete="off" aria-label={`${config.title} 검색`} value={query} onChange={(event) => { setQuery(event.target.value); setCurrentPage(1); }} />
                <i className="icon iconSearch" aria-hidden="true" />
              </span>
            </div>
          </div>

          <div className="deskArea" tabIndex={0} aria-label="좌우로 스크롤 가능한 표">
            <table className={`desk videoAdminDesk videoAdminDesk--${pageKind}`} id="deskTable">
              <thead><tr>
                {tableFields.map((item, index) => (
                  <th className={`${sortKey === item.key ? (descending ? "sort desc" : "sort asc") : "sort"}${index >= 4 ? " mobileSecondary" : ""}`} key={item.key} scope="col" aria-sort={sortKey === item.key ? (descending ? "descending" : "ascending") : "none"}>
                    <button type="button" className="videoAdminSort" onClick={() => changeSort(item.key)} aria-label={`${item.label} 기준 ${sortKey === item.key && !descending ? "내림차순" : "오름차순"} 정렬`}>{item.label}</button>
                  </th>
                ))}
              </tr></thead>
              <tbody id="deskList">
                {visibleRows.length === 0 ? <tr><td className="videoAdminEmpty" colSpan={tableFields.length}>{query ? "검색 결과가 없습니다." : "등록된 데이터가 없습니다."}</td></tr> : visibleRows.map((row) => (
                  <tr key={row.id} role="button" tabIndex={0} aria-label={`${row.name || row[tableFields[0].key]} 수정`} onClick={() => openEditor(row)} onKeyDown={(event) => openRowFromKeyboard(event, row)}>
                    {tableFields.map((item, index) => <td className={`${index >= 4 ? "mobileSecondary" : ""}${item.key === "mode" && row[item.key] === "자동" ? " safeText" : ""}`} key={item.key}>{row[item.key] || "-"}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="deskStat videoAdminBottom">
            <div className="deskLimit"><span className="deskLabel">{first} - {last} / {filteredRows.length}</span></div>
            <PageButtons page={safePage} pages={pages} onChange={setCurrentPage} />
          </div>
        </section>

        {draft ? (
          <div className="modal videoAdminModal" onMouseDown={(event) => { if (event.target === event.currentTarget) closeEditor(); }}>
            <form className="modalBox videoAdminModalBox" role="dialog" aria-modal="true" aria-labelledby="admin-edit-title" onSubmit={saveDraft}>
              <button type="button" className="modalClose videoAdminModalClose" aria-label="편집 창 닫기" onClick={closeEditor} />
              <div className="modalContent videoAdminModalContent">
                <h2 className="editTitle" id="admin-edit-title">{config.editorTitle}</h2>
                <div className="videoAdminEditGrid">
                  {config.fields.map((item, index) => (
                    <label className="videoAdminEditField" key={item.key}>
                      <span>{item.label}{item.required ? <b aria-hidden="true"> *</b> : null}</span>
                      {item.options ? (
                        <select className="eSelect videoAdminEditInput" value={draft[item.key] ?? ""} autoFocus={index === 0} aria-invalid={errors.includes(item.label)} onChange={(event) => { setDraft((current) => current ? { ...current, [item.key]: event.target.value } : current); setErrors((current) => current.filter((label) => label !== item.label)); }}>
                          {!draft[item.key] ? <option value="">선택</option> : null}
                          {item.options.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                      ) : (
                        <input type={item.secret ? "password" : "text"} inputMode={item.inputMode} className="eInput videoAdminEditInput" value={draft[item.key] ?? ""} autoFocus={index === 0} aria-invalid={errors.includes(item.label)} onChange={(event) => { setDraft((current) => current ? { ...current, [item.key]: event.target.value } : current); setErrors((current) => current.filter((label) => label !== item.label)); }} />
                      )}
                    </label>
                  ))}
                </div>

                {config.groupSetting ? (
                  <div className="videoAdminGroups" aria-label="제어 그룹">
                    <span className="videoAdminGroupsLabel">제어 그룹</span>
                    <div>{groups.map((group) => <span className="groupChip" key={group}>{group}</span>)}</div>
                    <button type="button" className="act groupSettingButton" onClick={() => setGroupOpen(true)}><i className="bi bi-gear" aria-hidden="true" />그룹설정</button>
                  </div>
                ) : null}

                {errors.length ? (
                  <div className="videoAdminErrors" role="alert" aria-label="입력 오류">
                    {errors.map((label) => <p key={label}>{label} 항목은 필수입니다.</p>)}
                  </div>
                ) : null}
              </div>
              <div className="modalTool">
                <button type="button" className="modalAct cancel" onClick={closeEditor}>취소</button>
                <button type="submit" className="modalAct">저장</button>
              </div>
            </form>

            {groupOpen ? (
              <div className="videoAdminGroupLayer" onMouseDown={(event) => { if (event.target === event.currentTarget) setGroupOpen(false); }}>
                <form className="modalBox videoAdminGroupBox" role="dialog" aria-modal="true" aria-labelledby="group-setting-title" onSubmit={addGroup}>
                  <button type="button" className="modalClose videoAdminModalClose" aria-label="그룹설정 창 닫기" onClick={() => setGroupOpen(false)} />
                  <h3 className="editTitle" id="group-setting-title">그룹설정</h3>
                  <label className="videoAdminGroupField"><span>그룹명</span><input className="eInput" value={groupName} autoFocus onChange={(event) => setGroupName(event.target.value)} /></label>
                  <div className="modalTool"><button type="button" className="modalAct cancel" onClick={() => setGroupOpen(false)}>취소</button><button type="submit" className="modalAct">추가</button></div>
                </form>
              </div>
            ) : null}
          </div>
        ) : null}
      </main>

      {toast ? <div className="toastArea" aria-live="polite"><div className="toast toastBlue" role="status">{toast}<button type="button" className="videoAdminToastClose" aria-label="알림 닫기" onClick={() => setToast("")}>×</button></div></div> : null}

      <style jsx global>{`
        .videoAdmin { min-width: 0; }
        .videoAdminTop { gap: 16px; }
        .videoAdminFilters { display: flex; align-items: center; justify-content: flex-end; gap: 12px; }
        .companyFilter { display: flex; align-items: center; gap: 8px; margin: 0; color: #72bce3; white-space: nowrap; }
        .companyFilter .deskSelect { min-width: 180px; color: #fff; }
        .videoAdminDesk tr[role="button"] { cursor: pointer; }
        .videoAdminDesk tr[role="button"]:focus { outline: 2px solid #69a7f5; outline-offset: -2px; }
        .videoAdminSort { width: 100%; min-width: max-content; margin: 0; padding: 0; border: 0; border-radius: 0; background: transparent; color: inherit; font: inherit; }
        .videoAdminSort:hover, .videoAdminSort:focus { background: transparent; color: #fff; }
        .videoAdminSort:focus-visible { outline: 2px solid #69a7f5; outline-offset: 2px; }
        .videoAdminEmpty { height: 92px; color: rgba(255,255,255,.55); }
        .videoAdminBottom { margin: 20px 0 0; }
        .videoAdminModal { z-index: 3000; padding: 20px; }
        .videoAdminModalBox { width: min(920px, calc(100vw - 40px)); max-height: calc(100vh - 40px); background: rgba(2, 19, 66, .94); }
        .videoAdminModalContent { min-height: 0; max-height: calc(100vh - 165px); overflow-y: auto; }
        .videoAdminModalClose { width: 45px; height: 45px; margin: 0; padding: 0; border: 0; background-color: transparent; }
        .videoAdminEditGrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 20px; padding: 0 24px 16px; }
        .videoAdminEditField { display: grid; grid-template-columns: minmax(108px, .7fr) minmax(0, 1.3fr); gap: 10px; align-items: center; margin: 0; color: #c8c8c8; font-size: 14px; }
        .videoAdminEditField b { color: #ff5f82; font-weight: 500; }
        .videoAdminEditInput { width: 100%; min-width: 0; height: 32px; box-sizing: border-box; color: #fff; }
        .videoAdminEditInput[aria-invalid="true"] { border-color: #ff2c63; box-shadow: 0 0 0 1px rgba(255,44,99,.35); }
        .videoAdminErrors { margin: 4px 24px 12px; padding: 8px 12px; border-left: 4px solid #ff2c63; background: rgba(216,0,70,.76); color: #fff; }
        .videoAdminErrors p { margin: 2px 0; font-size: 13px; }
        .videoAdminGroups { display: grid; grid-template-columns: 108px 1fr auto; gap: 10px; align-items: center; margin: 0 24px 12px; padding: 10px 12px; border: 1px solid rgba(81,144,165,.55); background: rgba(1,87,155,.2); }
        .videoAdminGroupsLabel { color: #72bce3; }
        .groupChip { display: inline-block; margin: 2px 6px 2px 0; padding: 4px 8px; border-radius: 4px; background: rgba(32,98,191,.58); color: #fff; }
        .groupSettingButton { height: 34px; padding: 5px 12px; font-size: 14px; }
        .videoAdminGroupLayer { display: flex; align-items: center; justify-content: center; position: fixed; inset: 0; z-index: 3100; background: rgba(2,10,28,.72); }
        .videoAdminGroupBox { width: min(480px, calc(100vw - 48px)); padding: 10px 22px 14px; background: rgba(2,19,66,.98); }
        .videoAdminGroupField { display: grid; grid-template-columns: 80px 1fr; gap: 10px; align-items: center; color: #c8c8c8; }
        .videoAdminGroupField .eInput { width: 100%; color: #fff; }
        .videoAdminToastClose { width: 40px; height: 40px; margin: 0; padding: 0; border: 0; background: transparent; color: #fff; font-size: 24px; }
        @media print { #leftnav, #topBar, .videoAdminTop, .videoAdminBottom { display: none !important; } .videoAdmin { width: 100% !important; margin: 0 !important; } .videoAdminDesk { min-width: 100% !important; } }
        @media (max-width: 1024px) { .videoAdminTop { align-items: stretch; } .videoAdminFilters { flex-wrap: wrap; } }
        @media (max-width: 768px) { .videoAdminTop { flex-direction: column; } .videoAdminTop .deskTool { flex-wrap: wrap; justify-content: center; } .videoAdminFilters { justify-content: center; } .videoAdminEditGrid { grid-template-columns: 1fr; padding: 0 8px 16px; } .videoAdminGroups { margin-inline: 8px; grid-template-columns: 1fr; } }
        @media (max-width: 480px) { .videoAdminDesk { min-width: 100% !important; } .videoAdminDesk .mobileSecondary { display: none; } .videoAdminDesk--gateway td { height: 62px; } .videoAdminEditField { grid-template-columns: 1fr; gap: 4px; } .companyFilter { width: 100%; } .companyFilter .deskSelect { flex: 1; min-width: 0; } }
      `}</style>
    </>
  );
}
