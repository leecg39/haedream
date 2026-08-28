# 원본 렌더 하니스 (reference harness)

원본 fit.rfenms.com 은 인증 없이는 login.html 로 리다이렉트되어 렌더된 화면을
직접 볼 수 없다. 이 디렉터리는 원본 HTML 을 **마크업 변경 없이** 로컬에서
렌더하기 위한 하니스다. 클론 결과와 대조해 실제 computed style 을 비교하는 용도.

원본 대비 변경한 것은 다음 4가지뿐이다.

1. `<script>` 전부 제거 — base.js 가 토큰이 없으면 login.html 로 리다이렉트한다
2. 자산 경로를 `./assets/` → `/fit/assets/` 로 (로컬 미러)
3. base.js 가 주입하던 `include/leftnav.html`, `include/top.html` 을 미리 삽입
4. 데이터 로드 후 JS 가 제거하는 `.disable` 을 미리 해제

클래스명·구조·텍스트는 원본 그대로다.
