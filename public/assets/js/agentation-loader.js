// Agentation 툴바 로더 (개발 환경 전용).
// public/ 아래 정적 페이지는 프로덕션에서도 그대로 서빙되므로,
// React 레이아웃의 `process.env.NODE_ENV === "development"` 가드를 대신해
// 로컬호스트에서만 번들을 주입한다.
(function () {
  "use strict";

  var DEV_HOSTS = ["localhost", "127.0.0.1", "[::1]", "0.0.0.0"];
  var BUNDLE_SRC = "./assets/js/agentation-standalone.js";

  if (DEV_HOSTS.indexOf(window.location.hostname) === -1) {
    return;
  }

  var script = document.createElement("script");
  script.src = BUNDLE_SRC;
  script.defer = true;
  script.onerror = function () {
    console.warn(
      "Agentation 번들을 찾을 수 없습니다. `npm run agentation:build` 로 생성하세요."
    );
  };

  document.head.appendChild(script);
})();
