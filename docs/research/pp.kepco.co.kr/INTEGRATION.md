# 한전 파워플래너(pp.kepco.co.kr) 데이터 연동

## 개요

- 사이트: https://pp.kepco.co.kr/intro.do (한전 파워플래너)
- 목적: 업체의 전력 사용 데이터를 파워플래너에서 조회해 이 프로젝트와 연동한다.
- 로그인은 **업체관리(`/fit/firm`)에 저장된 한전고객번호 + 한전비밀번호** 를 사용한다.

## 인증 정보 소스

| 항목 | 필드 | 저장 위치 | 비고 |
| --- | --- | --- | --- |
| 한전고객번호 | `FirmRow.kepcoNo` | `src/lib/fit-mocks/firm-rows.json` | 10자리 숫자, 앞자리 0 보존 문자열 |
| 한전비밀번호 | `FirmRow.kepcoPasswd` | `src/lib/fit-mocks/kepco-passwds.json` | **gitignore 로컬 전용. 저장소 커밋 금지** |

- 비밀번호 맵은 `fid → 비밀번호` 형태이며 `src/lib/fit-mocks/firm.ts` 가 `FIRM_ROWS` 에 병합한다.
- 갱신 절차:
  1. `node scripts/export-kepco-passwds.mjs` — fit.rfenms.com 에서 업체 비밀번호 수집 → `data/kepco-passwds.{json,md}`
  2. `node scripts/match-kepco-passwds.mjs` — fid 기준 매칭(한전고객번호 교차 검증) → `src/lib/fit-mocks/kepco-passwds.json`
- 한전고객번호는 26개 키가 중복이라 매칭 키로 쓸 수 없다. 반드시 fid 로 조인하고 고객번호는 검증용으로만 쓴다.
- 비밀번호가 비어 있는 업체(예: fid=5 서원유리)는 파워플래너 로그인 불가.

## 로그인 흐름 (관찰된 범위)

1. `https://pp.kepco.co.kr/intro.do` 접속 → "서비스 가능여부 확인" 고객번호 입력란.
2. 고객번호는 전기요금 청구서의 10자리 숫자. 아파트·공동주택 관리비 포함 개별세대는 이용 불가.
3. `login.do` 등 미인증 경로는 intro.do 로 리다이렉트된다.
4. 이후 비밀번호 입력 단계는 실계정 로그인이 필요해 아직 자동화/검증하지 않았다. 연동 구현 시 실제 흐름을 확인해 이 문서를 갱신한다.

## 기타

- 파워플래너 이용 문의(마케팅 상담센터): 061-345-4533
