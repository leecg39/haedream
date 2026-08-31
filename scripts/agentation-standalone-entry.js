// public/*.html 정적 페이지용 Agentation 부트스트랩.
// Next.js 레이아웃(src/app/**/layout.tsx)을 거치지 않는 정적 페이지는 React 런타임이
// 없으므로, 이 엔트리를 React·ReactDOM과 함께 IIFE 번들로 묶어 script 태그로 주입한다.
// 번들 생성: node scripts/build-agentation-standalone.mjs (npm run agentation:build)
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { Agentation } from "agentation";

const CONTAINER_ID = "agentation-root";

function mount() {
  try {
    if (document.getElementById(CONTAINER_ID)) {
      return;
    }

    const container = document.createElement("div");
    container.id = CONTAINER_ID;
    document.body.appendChild(container);

    createRoot(container).render(createElement(Agentation));
  } catch (error) {
    console.error("Agentation 툴바 마운트 실패:", error);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount, { once: true });
} else {
  mount();
}
