# SolarSimz

ABC 에너지 통합관제 화면을 복제하고 주요설비를 실제로 관리할 수 있는
Next.js 16 기반 데모 프로젝트입니다.

## 시작하기

```shell
npm install
npm run db:setup:demo
npm run dev -- -p 3456
```

- 로그인: `http://localhost:3456`
- 대시보드: `http://localhost:3456/main.html`
- 주요설비 CRUD: `http://localhost:3456/admin/facilities`

데모 계정은 `admin`, `operator`, `viewer`이며 비밀번호는 모두 `demo`입니다.

## 주요설비 CRUD

- SQLite 마이그레이션과 시드
- HttpOnly DB 세션, 관리자·운영자·조회자 권한
- 테넌트 격리와 게이트웨이 관계 검사
- 목록, 상세, 등록, 부분 수정
- 검색, 다중 필터, 정렬, 페이지네이션
- 버전 기반 동시 수정 충돌 감지
- 소프트 삭제, 복구, 관리자 영구 삭제
- 변경 전후 감사 로그
- 한국어 반응형 화면과 접근성 상태
- 단위·저장소·API·브라우저 E2E 테스트

설계와 운영 주의사항은 `docs/facility-crud-design.md`, API 계약은
`docs/openapi/facilities.yaml`을 참고하세요.

## 검증

```shell
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```
