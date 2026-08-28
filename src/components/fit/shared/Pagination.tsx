"use client";

import { buildPageItems } from "@/components/fit/stat/statUtils";

/**
 * 원본은 페이지마다 페이지네이션 마크업이 다르다. 전부 JS 가 innerHTML 로 그린다.
 *
 * | 페이지 | 래퍼 | 항목 | prev/next |
 * |---|---|---|---|
 * | stat.html | `.pagination` | `<div class="deskPage">` | 없음 |
 * | firm.html / controlHis.html | `.deskPages` | `<span class="deskPage act">` | 있음 |
 *
 * 두 경우 모두 `<button>` 이 아니다. 원본 CSS 가 `.deskPage` 에만 스타일을 주고
 * 버튼 UA 기본 배경/보더를 지우지 않으므로, button 으로 만들면 흰 상자로 보인다.
 */
interface PaginationProps {
  readonly page: number;
  readonly pages: number;
  readonly onChange: (page: number) => void;
  /** 래퍼 클래스 — stat 은 "pagination", 나머지는 "deskPages" */
  readonly className?: string;
  /** 항목 태그 — stat 은 div, 나머지는 span */
  readonly itemTag?: "div" | "span";
  /** 항목 기본 클래스 — stat 은 "deskPage", 나머지는 "deskPage act" */
  readonly itemClass?: string;
  /** prev/next 노출 여부 — stat 은 없음 */
  readonly showPrevNext?: boolean;
}

export function Pagination({
  page,
  pages,
  onChange,
  className = "deskPages",
  itemTag = "span",
  itemClass = "deskPage act",
  showPrevNext = true,
}: PaginationProps) {
  const Item = itemTag;

  return (
    <div className={className} id="deskPages">
      {showPrevNext ? (
        <Item className={itemClass} role="button" onClick={() => onChange(Math.max(1, page - 1))}>
          prev
        </Item>
      ) : null}

      {buildPageItems(page, pages).map((item, index) =>
        item === "…" ? (
          <Item className={itemClass.replace(" act", "")} key={`ellipsis-${index}`}>
            …
          </Item>
        ) : (
          <Item
            className={item === page ? `${itemClass} active` : itemClass}
            key={item}
            role="button"
            onClick={() => onChange(item)}
          >
            {item}
          </Item>
        ),
      )}

      {showPrevNext ? (
        <Item className={itemClass} role="button" onClick={() => onChange(Math.min(pages, page + 1))}>
          next
        </Item>
      ) : null}
    </div>
  );
}
