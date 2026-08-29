"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FitFirmOption } from "@/types/fit";

/**
 * 상단 바 업체 선택.
 *
 * 원본은 native <select> 였으나 운영 DB 업체가 1,600건이 넘어 스크롤·검색이
 * 필요하다. 피드백(/fit/firm topArea):
 *   - 맨 상단에 검색 기능
 *   - 프레임에 5개 업체만 보이고 나머지는 스크롤
 *
 * common.css 는 원본 무변환 미러라 손대지 않고, 인라인 스타일로 원본 select
 * (폭 220 / 높이 43 / 투명 배경 / 옵션 배경 #0e0d2c·선택 #214aa2)의 룩을
 * 맞춘다. 접근성을 위해 combobox/listbox 패턴을 따르고 바깥 클릭·ESC 로 닫는다.
 */

/** 프레임에 한 번에 보이는 업체 수. 나머지는 스크롤된다. */
const VISIBLE_FIRMS = 5;
/** 한 항목의 높이(px). 5개 높이만큼만 목록 프레임을 연다. */
const ITEM_HEIGHT = 40;

const STYLES: Record<string, CSSProperties> = {
  wrap: { position: "relative", width: 220 },
  button: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    width: 220,
    height: 43,
    padding: "0 15px",
    border: "1px solid rgba(255,255,255,0.4)",
    borderRadius: 4,
    backgroundColor: "transparent",
    color: "var(--color-leftNava)",
    fontSize: 16,
    cursor: "pointer",
    textAlign: "left",
  },
  label: { overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" },
  caret: { flex: "0 0 auto", fontSize: 14, color: "var(--color-leftNava)" },
  panel: {
    position: "absolute",
    top: "calc(100% + 4px)",
    left: 0,
    zIndex: 1060,
    width: 260,
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: 4,
    backgroundColor: "#0e0d2c",
    boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
    overflow: "hidden",
  },
  search: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.15)",
  },
  searchIcon: { color: "#6e6e80", fontSize: 16 },
  input: {
    flex: 1,
    width: "100%",
    height: 28,
    padding: "0 4px",
    border: 0,
    backgroundColor: "transparent",
    color: "#fff",
    fontSize: 14,
    outline: "none",
  },
  list: {
    margin: 0,
    padding: 0,
    listStyle: "none",
    overflowY: "auto",
    overflowX: "hidden",
    maxHeight: VISIBLE_FIRMS * ITEM_HEIGHT,
  },
  option: {
    display: "flex",
    alignItems: "center",
    height: ITEM_HEIGHT,
    padding: "0 12px",
    color: "#fff",
    fontSize: 14,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    cursor: "pointer",
  },
  optionActive: { backgroundColor: "#214aa2" },
  empty: { padding: 12, color: "#6e6e80", fontSize: 14, textAlign: "center" },
};

interface FirmSelectProps {
  readonly firms: readonly FitFirmOption[];
  readonly value: number | "";
  readonly onChange: (fid: number) => void;
  /** native select 와 호환되도록 id 를 유지한다(원본 #firmSelect). */
  readonly id?: string;
}

export function FirmSelect({ firms, value, onChange, id = "firmSelect" }: FirmSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  const selected = useMemo(
    () => firms.find((firm) => firm.fid === value) ?? null,
    [firms, value],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ko");
    if (normalized.length === 0) return firms;
    return firms.filter(
      (firm) =>
        firm.name.toLocaleLowerCase("ko").includes(normalized) ||
        String(firm.fid).includes(normalized),
    );
  }, [firms, query]);

  // 열릴 때 검색창에 포커스를 준다(포커스는 외부 시스템 동기화라 effect 가 적절).
  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  // 열고 닫을 때 검색어·활성 항목을 초기화한다(effect 대신 이벤트에서 처리).
  const setOpenState = (next: boolean) => {
    setOpen(next);
    if (next) {
      setQuery("");
      setActiveIndex(0);
    }
  };

  const handleQueryChange = (next: string) => {
    setQuery(next);
    setActiveIndex(0);
  };

  // 바깥 클릭으로 닫기.
  useEffect(() => {
    if (!open) return;
    const handlePointer = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointer);
    return () => document.removeEventListener("mousedown", handlePointer);
  }, [open]);

  // 활성 항목이 프레임 밖이면 스크롤해 보이게 한다.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const node = listRef.current.children[activeIndex] as HTMLElement | undefined;
    node?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const commit = (fid: number) => {
    onChange(fid);
    setOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) setOpenState(true);
        else setActiveIndex((index) => Math.min(index + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
        break;
      case "Enter":
        event.preventDefault();
        if (open && filtered[activeIndex]) commit(filtered[activeIndex].fid);
        break;
      case "Escape":
        event.preventDefault();
        setOpen(false);
        break;
      default:
        break;
    }
  };

  const listId = `${id}-listbox`;

  return (
    <div className="firmSelectWrap" style={STYLES.wrap} ref={rootRef}>
      <button
        type="button"
        id={id}
        className="firmSelect firmSelectButton"
        style={STYLES.button}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpenState(!open)}
        onKeyDown={handleKeyDown}
      >
        <span style={STYLES.label}>
          {selected?.name ?? firms[0]?.name ?? "업체 선택"}
        </span>
        <i className="bi bi-chevron-down" style={STYLES.caret} aria-hidden="true" />
      </button>

      {open ? (
        <div className="firmSelectPanel" style={STYLES.panel} role="presentation">
          <div style={STYLES.search}>
            <i className="bi bi-search" style={STYLES.searchIcon} aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              style={STYLES.input}
              placeholder="업체 검색"
              aria-label="업체 검색"
              value={query}
              onChange={(event) => handleQueryChange(event.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <ul
            ref={listRef}
            id={listId}
            style={STYLES.list}
            role="listbox"
            aria-label="업체 목록"
          >
            {filtered.length === 0 ? (
              <li style={STYLES.empty} role="presentation">
                검색 결과가 없습니다
              </li>
            ) : (
              filtered.map((firm, index) => {
                const isSelected = firm.fid === value;
                const isActive = index === activeIndex;
                return (
                  <li
                    key={firm.fid}
                    role="option"
                    aria-selected={isSelected}
                    style={
                      isActive || isSelected
                        ? { ...STYLES.option, ...STYLES.optionActive }
                        : STYLES.option
                    }
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => commit(firm.fid)}
                  >
                    {firm.name}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
