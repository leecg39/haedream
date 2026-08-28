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

export type AdminPageKind =
  | "user"
  | "gate-node"
  | "gateway"
  | "sequence"
  | "gate-rtu"
  | "device";

type AdminRow = { id: string } & Record<string, string>;

interface AdminColumn {
  readonly key: string;
  readonly label: string;
}

interface PageConfig {
  readonly title: string;
  readonly columns: readonly AdminColumn[];
  readonly actions: readonly AdminAction[];
  readonly rows: readonly AdminRow[];
}

type AdminAction = "add" | "mode" | "off" | "on" | "excel" | "print";

const COMPANY = "대산금속";
const IP_ADDRESS = "115.94.112.219";
const IP_ATON = "1935569115";
const PAGE_SIZE = 10;

const COMMON_ACTIONS: readonly AdminAction[] = ["add", "excel", "print"];

const ACTION_INFO: Record<
  AdminAction,
  { readonly label: string; readonly icon: string }
> = {
  add: { label: "추가", icon: "bi bi-node-plus" },
  mode: { label: "모드전환", icon: "bi bi-toggles" },
  off: { label: "전체 OFF", icon: "bi bi-toggle-off" },
  on: { label: "전체 ON", icon: "bi bi-toggle-on" },
  excel: {
    label: "엑셀로 다운",
    icon: "bi bi-file-earmark-excel-fill excel",
  },
  print: { label: "프린트", icon: "bi bi-printer" },
};

const USER_COLUMNS: readonly AdminColumn[] = [
  { key: "name", label: "이름" },
  { key: "loginId", label: "아이디" },
  { key: "permission", label: "권한" },
  { key: "department", label: "부서" },
  { key: "phone", label: "연락처" },
  { key: "lastAccess", label: "접속일자" },
];

const GATE_NODE_COLUMNS: readonly AdminColumn[] = [
  { key: "gate", label: "GATE" },
  { key: "company", label: "업체" },
  { key: "name", label: "이름" },
  { key: "ip", label: "IP" },
  { key: "port", label: "PORT" },
  { key: "ipAton", label: "IP AToN" },
  ...Array.from({ length: 10 }, (_, index) => ({
    key: `node${index + 1}`,
    label: `node${index + 1}`,
  })),
  { key: "memo", label: "메모" },
];

const GATEWAY_COLUMNS: readonly AdminColumn[] = [
  { key: "gate", label: "GATE" },
  { key: "name", label: "이름" },
  { key: "mode", label: "모드" },
  { key: "priority", label: "순위" },
  { key: "node", label: "노드" },
  { key: "measure", label: "제어계측" },
  { key: "voltage", label: "전압" },
  { key: "current", label: "전류" },
  { key: "temperature", label: "온도" },
  { key: "status", label: "상태" },
  { key: "control", label: "제어" },
  { key: "present", label: "현재값" },
  { key: "output", label: "출력" },
  { key: "peak", label: "피크" },
  { key: "lastReceived", label: "마지막수신" },
  { key: "cid", label: "CID" },
  { key: "memo", label: "메모" },
];

const SEQUENCE_COLUMNS: readonly AdminColumn[] = [
  { key: "company", label: "업체" },
  { key: "name", label: "제어이름" },
  { key: "mode", label: "제어모드" },
  { key: "priority", label: "우선순위" },
  { key: "control", label: "제어" },
  { key: "status", label: "상태" },
  { key: "available", label: "제어가능여부" },
  { key: "voltage", label: "전압" },
  { key: "current", label: "전류" },
  { key: "memo", label: "메모" },
];

const GATE_RTU_COLUMNS: readonly AdminColumn[] = [
  { key: "rtu", label: "RTU" },
  { key: "company", label: "업체" },
  { key: "name", label: "이름" },
  { key: "ip", label: "IP Address" },
  { key: "port", label: "PORT" },
  { key: "ipAton", label: "IP AToN" },
  { key: "lastReceived", label: "마지막수신" },
  { key: "memo", label: "메모" },
];

const DEVICE_COLUMNS: readonly AdminColumn[] = [
  { key: "loadId", label: "LoadID" },
  { key: "company", label: "업체" },
  { key: "rtu", label: "RTU" },
  { key: "vpn", label: "vpn" },
  { key: "name", label: "이름" },
  { key: "loadNumber", label: "LoadNumber" },
  { key: "device", label: "device" },
  { key: "voltage", label: "전압" },
  { key: "current", label: "전류" },
  { key: "power", label: "전력" },
  { key: "powerCompare", label: "전력비교" },
  { key: "info", label: "정보" },
  { key: "lastReceived", label: "마지막수신" },
  { key: "resource", label: "자원" },
  { key: "resourceId", label: "자원ID" },
  { key: "resourceRange", label: "자원범위" },
  { key: "memo", label: "메모" },
];

const GATE_NODE_ROWS: readonly AdminRow[] = [
  {
    id: "gate-node-4110",
    gate: "4110",
    company: COMPANY,
    name: "다이캐스팅2호",
    ip: IP_ADDRESS,
    port: "52110",
    ipAton: IP_ATON,
    node1: "-",
    node2: "-",
    node3: "-",
    node4: "-",
    node5: "-",
    node6: "-",
    node7: "-",
    node8: "-",
    node9: "-",
    node10: "-",
    memo: "",
  },
  {
    id: "gate-node-4109",
    gate: "4109",
    company: COMPANY,
    name: "8호기단독",
    ip: IP_ADDRESS,
    port: "52109",
    ipAton: IP_ATON,
    node1: "-",
    node2: "-",
    node3: "-",
    node4: "-",
    node5: "-",
    node6: "-",
    node7: "-",
    node8: "-",
    node9: "-",
    node10: "-",
    memo: "",
  },
  {
    id: "gate-node-4108",
    gate: "4108",
    company: COMPANY,
    name: "다이케스팅 9호별도",
    ip: IP_ADDRESS,
    port: "52108",
    ipAton: IP_ATON,
    node1: "-",
    node2: "-",
    node3: "-",
    node4: "-",
    node5: "-",
    node6: "-",
    node7: "-",
    node8: "-",
    node9: "-",
    node10: "-",
    memo: "",
  },
  {
    id: "gate-node-4107",
    gate: "4107",
    company: COMPANY,
    name: "다이캐스팅9 위 4107",
    ip: IP_ADDRESS,
    port: "52107",
    ipAton: IP_ATON,
    node1: "RELAY",
    node2: "RELAY",
    node3: "RELAY",
    node4: "RELAY",
    node5: "RELAY",
    node6: "RELAY",
    node7: "RELAY",
    node8: "RELAY",
    node9: "RELAY",
    node10: "-",
    memo: "",
  },
  {
    id: "gate-node-4100",
    gate: "4100",
    company: COMPANY,
    name: "다이캐스팅9 옆 4100",
    ip: IP_ADDRESS,
    port: "52100",
    ipAton: IP_ATON,
    node1: "POWER",
    node2: "-",
    node3: "-",
    node4: "-",
    node5: "-",
    node6: "-",
    node7: "-",
    node8: "-",
    node9: "-",
    node10: "-",
    memo: "",
  },
];

const GATEWAY_GATES = ["4107", "4110", "4109", "4108"] as const;

const GATEWAY_ROWS: readonly AdminRow[] = Array.from(
  { length: 18 },
  (_, index) => {
    const machine = Math.floor(index / 2) + 1;
    const side = index % 2 === 0 ? "A" : "B";
    return {
      id: `gateway-${machine}${side}`,
      gate: GATEWAY_GATES[index % GATEWAY_GATES.length],
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
      lastReceived: `2026-08-28 16:${String(40 + (index % 9)).padStart(2, "0")}:12`,
      cid: String(5101 + index),
      memo: "",
    };
  },
);

const RTU_PORTS = ["58779", "59276", "49299", "60174", "59452", "56934"] as const;
const RTU_MACHINE = ["9", "9", "7", "7", "4", "4"] as const;

const GATE_RTU_ROWS: readonly AdminRow[] = Array.from(
  { length: 6 },
  (_, index) => {
    const rtu = String(4106 - index);
    return {
      id: `rtu-${rtu}`,
      rtu,
      company: COMPANY,
      name: `다이캐스팅${RTU_MACHINE[index]} 위 ${rtu}`,
      ip: IP_ADDRESS,
      port: RTU_PORTS[index],
      ipAton: IP_ATON,
      lastReceived: `2026-08-28 16:${String(47 - index).padStart(2, "0")}:26`,
      memo: "",
    };
  },
);

const DEVICE_NAMES = [
  "TR1",
  "TR2",
  "TR3",
  ...Array.from({ length: 7 }, (_, index) => [
    `다이캐스팅${index + 1} 메인`,
    `다이캐스팅${index + 1} 온도`,
    `다이캐스팅${index + 1} 용탕`,
  ]).flat(),
] as const;

const DEVICE_ROWS: readonly AdminRow[] = DEVICE_NAMES.map((name, index) => {
  const isTemperature = name.includes("온도") || name.includes("용탕");
  const isMoltenMetal = name.includes("용탕");
  return {
    id: `device-${11701 + index}`,
    loadId: String(11701 + index),
    company: COMPANY,
    rtu: String(4106 - (index % 6)),
    vpn: index < 3 ? String(index + 1) : "0",
    name,
    loadNumber: String(101 + index),
    device: isTemperature ? "온도센서 PT100" : "남전사 3상4선식",
    voltage: isTemperature ? "-" : `${(398.2 + (index % 8) * 0.7).toFixed(1)} V`,
    current: isTemperature ? "-" : `${(14.3 + index * 1.31).toFixed(2)} A`,
    power: isTemperature ? "-" : `${(9.8 + index * 0.91).toFixed(2)} kW`,
    powerCompare: isTemperature ? "-" : `${(9.6 + index * 0.9).toFixed(2)} kW`,
    info: isTemperature
      ? `${isMoltenMetal ? 684 + index : 49 + index} ℃`
      : `${(0.94 + (index % 4) * 0.01).toFixed(2)} PF`,
    lastReceived: `2026-08-28 16:${String(48 - (index % 10)).padStart(2, "0")}:30`,
    resource: isTemperature ? "CH1" : "-",
    resourceId: isTemperature ? String(6101 + index) : "-",
    resourceRange: isTemperature ? (isMoltenMetal ? "0~1200 ℃" : "0~200 ℃") : "-",
    memo: "",
  };
});

const PAGE_CONFIG: Record<AdminPageKind, PageConfig> = {
  user: {
    title: "사용자관리",
    columns: USER_COLUMNS,
    actions: COMMON_ACTIONS,
    rows: [],
  },
  "gate-node": {
    title: "게이트웨이 관리",
    columns: GATE_NODE_COLUMNS,
    actions: COMMON_ACTIONS,
    rows: GATE_NODE_ROWS,
  },
  gateway: {
    title: "복합제어기 관리",
    columns: GATEWAY_COLUMNS,
    actions: ["add", "excel", "print", "mode"],
    rows: GATEWAY_ROWS,
  },
  sequence: {
    title: "시퀀스 제어",
    columns: SEQUENCE_COLUMNS,
    actions: ["add", "mode", "off", "on", "excel", "print"],
    rows: [],
  },
  "gate-rtu": {
    title: "RTU 관리",
    columns: GATE_RTU_COLUMNS,
    actions: COMMON_ACTIONS,
    rows: GATE_RTU_ROWS,
  },
  device: {
    title: "모드버스 계측",
    columns: DEVICE_COLUMNS,
    actions: COMMON_ACTIONS,
    rows: DEVICE_ROWS,
  },
};

function cloneRows(rows: readonly AdminRow[]) {
  return rows.map((row) => ({ ...row }));
}

function createBlankRow(config: PageConfig): AdminRow {
  return config.columns.reduce<AdminRow>(
    (row, column) => {
      row[column.key] = "";
      return row;
    },
    { id: `new-${Date.now()}` },
  );
}

function csvValue(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function Pagination({
  page,
  pages,
  onChange,
}: {
  readonly page: number;
  readonly pages: number;
  readonly onChange: (page: number) => void;
}) {
  return (
    <nav className="deskPages" id="deskPages" aria-label="페이지 이동">
      <button
        type="button"
        className="deskPage act"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        aria-label="이전 페이지"
      >
        prev
      </button>
      {Array.from({ length: pages }, (_, index) => index + 1).map((item) => (
        <button
          type="button"
          className={item === page ? "deskPage act active" : "deskPage act"}
          key={item}
          onClick={() => onChange(item)}
          aria-current={item === page ? "page" : undefined}
          aria-label={`${item} 페이지`}
        >
          {item}
        </button>
      ))}
      <button
        type="button"
        className="deskPage act"
        disabled={page === pages}
        onClick={() => onChange(page + 1)}
        aria-label="다음 페이지"
      >
        next
      </button>
    </nav>
  );
}

export function AdminTablePage({ page: pageKind }: { readonly page: AdminPageKind }) {
  const config = PAGE_CONFIG[pageKind];
  const [rows, setRows] = useState<AdminRow[]>(() => cloneRows(config.rows));
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState(config.columns[0].key);
  const [descending, setDescending] = useState(false);
  const [page, setPage] = useState(1);
  const [allView, setAllView] = useState(false);
  const [draft, setDraft] = useState<AdminRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState("");
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const filteredRows = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase("ko");
    const filtered =
      keyword.length === 0
        ? rows
        : rows.filter((row) =>
            config.columns.some((column) =>
              (row[column.key] ?? "").toLocaleLowerCase("ko").includes(keyword),
            ),
          );

    return [...filtered].sort((left, right) => {
      const compared = (left[sortKey] ?? "").localeCompare(right[sortKey] ?? "", "ko", {
        numeric: true,
        sensitivity: "base",
      });
      return descending ? -compared : compared;
    });
  }, [config.columns, descending, query, rows, sortKey]);

  const pages =
    pageKind === "device" && allView
      ? 1
      : Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const visibleRows =
    pageKind === "device" && allView
      ? filteredRows
      : filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const first = filteredRows.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const last =
    pageKind === "device" && allView
      ? filteredRows.length
      : Math.min(safePage * PAGE_SIZE, filteredRows.length);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!draft) return;
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setDraft(null);
        window.setTimeout(() => returnFocusRef.current?.focus(), 0);
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [draft]);

  const announce = (message: string) => {
    setToast("");
    window.setTimeout(() => setToast(message), 0);
  };

  const openEditor = (row?: AdminRow) => {
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    setAdding(!row);
    setDraft(row ? { ...row } : createBlankRow(config));
  };

  const closeEditor = () => {
    setDraft(null);
    window.setTimeout(() => returnFocusRef.current?.focus(), 0);
  };

  const changeSort = (key: string) => {
    if (sortKey === key) {
      setDescending((value) => !value);
    } else {
      setSortKey(key);
      setDescending(false);
    }
    setPage(1);
  };

  const downloadCsv = () => {
    const lines = [
      config.columns.map((column) => csvValue(column.label)).join(","),
      ...filteredRows.map((row) =>
        config.columns.map((column) => csvValue(row[column.key] ?? "")).join(","),
      ),
    ];
    const blob = new Blob([`\uFEFF${lines.join("\r\n")}`], {
      type: "text/csv;charset=utf-8",
    });
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

  const switchMode = () => {
    const key = "mode";
    const nextMode = rows.some((row) => row[key] === "자동") ? "수동" : "자동";
    setRows((current) => current.map((row) => ({ ...row, [key]: nextMode })));
    announce(`전체 제어모드를 ${nextMode}(으)로 변경했습니다.`);
  };

  const changeSequenceState = (enabled: boolean) => {
    setRows((current) =>
      current.map((row) => ({
        ...row,
        control: enabled ? "ON" : "OFF",
        status: enabled ? "미제어" : "제어",
      })),
    );
    announce(enabled ? "전체 ON 요청을 적용했습니다." : "전체 OFF 요청을 적용했습니다.");
  };

  const runAction = (action: AdminAction) => {
    if (action === "add") openEditor();
    if (action === "excel") downloadCsv();
    if (action === "print") window.print();
    if (action === "mode") switchMode();
    if (action === "off") changeSequenceState(false);
    if (action === "on") changeSequenceState(true);
  };

  const saveDraft = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft) return;

    if (adding) {
      setRows((current) => [...current, { ...draft }]);
    } else {
      setRows((current) =>
        current.map((row) => (row.id === draft.id ? { ...draft } : row)),
      );
    }
    closeEditor();
    announce(adding ? "새 항목을 추가했습니다." : "변경 내용을 저장했습니다.");
  };

  const openRowFromKeyboard = (
    event: KeyboardEvent<HTMLTableRowElement>,
    row: AdminRow,
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openEditor(row);
    }
  };

  return (
    <>
      <PageStyles files={["/fit/assets/css/deskLib.css"]} />
      <main className="contents adminContents" id="contentsArea">
        <h1 className="deskTitle">{config.title}</h1>
        <section
          className={pageKind === "sequence" ? "sheetArea setSub seq" : "sheetArea setSub"}
          aria-label={`${config.title} 목록`}
        >
          <div className="deskStat adminTop">
            <div
              className={pageKind === "sequence" ? "deskTool onlypci" : "deskTool"}
              id="deskTool"
            >
              {config.actions.map((action) => (
                <button
                  className="deskAct act"
                  type="button"
                  key={action}
                  onClick={() => runAction(action)}
                >
                  <i className={ACTION_INFO[action].icon} aria-hidden="true" />
                  {ACTION_INFO[action].label}
                </button>
              ))}
            </div>

            {pageKind === "device" ? (
              <div className="dayCk">
                <label htmlFor="isAll">
                  <span>전체 보기</span>
                  <input
                    type="checkbox"
                    id="isAll"
                    role="switch"
                    checked={allView}
                    onChange={(event) => {
                      setAllView(event.target.checked);
                      setPage(1);
                    }}
                  />
                </label>
              </div>
            ) : null}

            <div className="deskPages">
              <span className="deskSearch">
                <input
                  className="deskInput"
                  id="deskInput"
                  maxLength={16}
                  placeholder="검색"
                  autoComplete="off"
                  aria-label={`${config.title} 검색`}
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                />
                <i className="icon iconSearch" aria-hidden="true" />
              </span>
            </div>
          </div>

          <div className="deskArea" tabIndex={0} aria-label="좌우로 스크롤 가능한 표">
            <table className={`desk adminDesk adminDesk--${pageKind}`} id="deskTable">
              <thead>
                <tr id="deskSort">
                  {config.columns.map((column, index) => (
                    <th
                      className={`${sortKey === column.key ? (descending ? "sort desc" : "sort asc") : "sort"}${index >= 4 ? " mobileSecondary" : ""}`}
                      key={column.key}
                      scope="col"
                      aria-sort={
                        sortKey === column.key
                          ? descending
                            ? "descending"
                            : "ascending"
                          : "none"
                      }
                    >
                      <button
                        type="button"
                        className="adminSortButton"
                        onClick={() => changeSort(column.key)}
                        aria-label={`${column.label} 기준 ${sortKey === column.key && !descending ? "내림차순" : "오름차순"} 정렬`}
                      >
                        {column.label}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody id="deskList">
                {visibleRows.length === 0 ? (
                  <tr>
                    <td className="adminEmpty" colSpan={config.columns.length}>
                      {query ? "검색 결과가 없습니다." : "등록된 데이터가 없습니다."}
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((row) => (
                    <tr
                      key={row.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`${row[config.columns[1]?.key] || row[config.columns[0].key]} 수정`}
                      onClick={() => openEditor(row)}
                      onKeyDown={(event) => openRowFromKeyboard(event, row)}
                    >
                      {config.columns.map((column, index) => {
                        const value = row[column.key] || "-";
                        const safeMode =
                          (pageKind === "gateway" || pageKind === "sequence") &&
                          column.key === "mode" &&
                          value === "자동";
                        return (
                          <td
                            className={`${index >= 4 ? "mobileSecondary" : ""}${safeMode ? " safeText" : ""}`}
                            key={column.key}
                          >
                            {value}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="deskStat adminBottom">
            <div className="deskLimit">
              <span className="deskLabel" id="deskStat">
                {first} - {last} / {filteredRows.length}
              </span>
            </div>
            <Pagination page={safePage} pages={pages} onChange={setPage} />
          </div>
        </section>

        {draft ? (
          <div
            className="modal adminModal"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeEditor();
            }}
          >
            <form
              className="modalBox adminModalBox"
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-edit-title"
              onSubmit={saveDraft}
            >
              <button
                type="button"
                className="modalClose adminModalClose"
                aria-label="편집 창 닫기"
                onClick={closeEditor}
              />
              <div className="modalContent">
                <h2 className="editTitle" id="admin-edit-title">
                  {config.title} {adding ? "추가" : "수정"}
                </h2>
                <div className="adminEditGrid">
                  {config.columns.map((column, index) => (
                    <label className="adminEditField" key={column.key}>
                      <span>{column.label}</span>
                      <input
                        type="text"
                        className="eInput adminEditInput"
                        value={draft[column.key] ?? ""}
                        autoFocus={index === 0}
                        onChange={(event) =>
                          setDraft((current) =>
                            current
                              ? { ...current, [column.key]: event.target.value }
                              : current,
                          )
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>
              <div className="modalTool">
                <button
                  type="button"
                  className="modalAct cancel"
                  onClick={closeEditor}
                >
                  취소
                </button>
                <button type="submit" className="modalAct">
                  저장
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </main>

      {toast ? (
        <div className="toastArea" aria-live="polite">
          <div className="toast toastBlue" role="status">
            {toast}
            <button
              type="button"
              className="close adminToastClose"
              aria-label="알림 닫기"
              onClick={() => setToast("")}
            >
              ×
            </button>
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        .adminContents {
          min-width: 0;
        }
        .adminTop {
          gap: 12px;
        }
        .adminDesk tr[role="button"] {
          cursor: pointer;
        }
        .adminDesk tr[role="button"]:focus {
          outline: 2px solid #69a7f5;
          outline-offset: -2px;
        }
        .adminSortButton {
          width: 100%;
          min-width: max-content;
          height: auto;
          margin: 0;
          padding: 0;
          border: 0;
          border-radius: 0;
          background: transparent;
          color: inherit;
          font: inherit;
          font-weight: inherit;
          line-height: inherit;
        }
        .adminSortButton:hover,
        .adminSortButton:focus {
          background: transparent;
          color: #fff;
        }
        .adminSortButton:focus-visible {
          outline: 2px solid #69a7f5;
          outline-offset: 2px;
        }
        .adminDesk .adminEmpty {
          height: 92px;
          color: rgba(255, 255, 255, 0.55);
        }
        .adminBottom {
          margin-top: 20px;
          margin-bottom: 0;
        }
        .adminModal {
          z-index: 3000;
          padding: 20px;
        }
        .adminModalBox {
          width: min(860px, calc(100vw - 40px));
        }
        .adminModalClose {
          width: 45px;
          height: 45px;
          margin: 0;
          padding: 0;
          border: 0;
          background-color: transparent;
        }
        .adminEditGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px 20px;
          padding: 0 24px 16px;
        }
        .adminEditField {
          display: grid;
          grid-template-columns: minmax(92px, 0.65fr) minmax(0, 1.35fr);
          gap: 10px;
          align-items: center;
          margin: 0;
          color: #c8c8c8;
          font-size: 15px;
        }
        .adminEditInput {
          width: 100%;
          color: #fff;
        }
        .adminToastClose {
          width: 40px;
          height: 40px;
          margin: 0;
          padding: 0;
          border: 0;
          background: transparent;
          color: #fff;
          font-size: 24px;
          font-weight: 400;
          line-height: 1;
        }
        @media print {
          #leftnav,
          #topBar,
          .adminTop,
          .adminBottom {
            display: none !important;
          }
          .contentsArea,
          .adminContents {
            width: 100% !important;
            margin: 0 !important;
          }
          .adminDesk {
            min-width: 100% !important;
          }
        }
        @media screen and (max-width: 768px) {
          .adminTop {
            align-items: stretch;
          }
          .adminTop .deskTool {
            flex-wrap: wrap;
            justify-content: center;
          }
          .adminTop .deskPages,
          .adminTop .dayCk {
            justify-content: center;
          }
          .adminBottom .deskPages {
            justify-content: center;
          }
          .adminEditGrid {
            grid-template-columns: 1fr;
            padding: 0 8px 16px;
          }
        }
        @media screen and (max-width: 480px) {
          .adminDesk {
            min-width: 100% !important;
          }
          .adminDesk .mobileSecondary {
            display: none;
          }
          .adminDesk--gateway td {
            height: 62px;
          }
          .adminTop .deskTool {
            transform-origin: center top;
          }
          .adminEditField {
            grid-template-columns: 1fr;
            gap: 4px;
          }
        }
      `}</style>
    </>
  );
}
