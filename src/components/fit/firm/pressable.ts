"use client";

import type { KeyboardEvent } from "react";

/** span[role=button] 에 Enter/Space 활성화를 붙인다. */
export function pressableProps(onActivate: () => void, disabled = false) {
  return {
    role: "button" as const,
    tabIndex: disabled ? -1 : 0,
    "aria-disabled": disabled || undefined,
    onClick: () => {
      if (!disabled) onActivate();
    },
    onKeyDown: (event: KeyboardEvent) => {
      if (disabled) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onActivate();
      }
    },
  };
}
