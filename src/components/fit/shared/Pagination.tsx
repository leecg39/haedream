"use client";

import { buildPageItems } from "@/components/fit/stat/statUtils";

export function Pagination({
  page,
  pages,
  onChange,
  className = "deskPages",
}: {
  readonly page: number;
  readonly pages: number;
  readonly onChange: (page: number) => void;
  readonly className?: string;
}) {
  return (
    <div className={className} id="deskPages">
      <button
        type="button"
        className="deskPage act"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        prev
      </button>
      {buildPageItems(page, pages).map((item, index) =>
        item === "…" ? (
          <span className="deskPage" key={`ellipsis-${index}`}>
            …
          </span>
        ) : (
          <button
            type="button"
            className={item === page ? "deskPage act active" : "deskPage act"}
            key={item}
            onClick={() => onChange(item)}
          >
            {item}
          </button>
        ),
      )}
      <button
        type="button"
        className="deskPage act"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        next
      </button>
    </div>
  );
}
