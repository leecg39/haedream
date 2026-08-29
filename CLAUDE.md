@AGENTS.md

## 한전 파워플래너(pp.kepco.co.kr) 연동

- https://pp.kepco.co.kr/intro.do 접속 시 업체관리(`/fit/firm`)의 **한전고객번호(`kepcoNo`) + 한전비밀번호(`kepcoPasswd`)** 를 입력해 데이터를 연동한다.
- 고객번호: `src/lib/fit-mocks/firm-rows.json` / 비밀번호: `src/lib/fit-mocks/kepco-passwds.json` (gitignore 로컬 전용, **커밋 금지**). `src/lib/fit-mocks/firm.ts` 가 `FIRM_ROWS` 에 병합한다.
- 비밀번호 갱신: `node scripts/export-kepco-passwds.mjs` → `node scripts/match-kepco-passwds.mjs`
- 매칭은 fid 기준(한전고객번호는 중복 26개로 키 사용 불가, 검증용으로만 사용).
- 상세: `docs/research/pp.kepco.co.kr/INTEGRATION.md`
