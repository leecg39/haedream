# 7일 운영 관찰 — 일별 로그 템플릿

복제본을 `docs/audit/YYYY-MM-DD-ops-observation.md` 로 저장한다.  
**금지:** 실고객 원문, secret, 절대 URL, 절대 파일경로, tenant/fid 원문 과다 노출.  
**허용:** 환경 별칭, 시각(UTC/KST), commit SHA, count, status, artifact basename.

## 메타

| 항목 | 값 |
|---|---|
| 환경 별칭 | |
| 관찰 Day N / 총 일수 | / 7+ |
| 날짜 (달력) | |
| 기준 배포 SHA | |
| 기록자 | |

## 점검 표

| 항목 | 결과 | count/status | 비고 |
|---|---|---|---|
| scheduled vs actual jobs | | | |
| latest measurement vs collection completion | | | |
| queue stall | | | |
| stale running | | | |
| failure streak | | | |
| alert delivery | | delivered / failed / no_alert | ack 여부만 |
| 실패 후 recovery / backfill | | | |

## 장애·복구 (해당 시)

- 증상(비민감):
- 감지 시각:
- 복구 시각:
- 조치 요약(비민감):
- 관찰 기간 연장 여부:

## 서명

- 운영 확인:
- 다음 Day 예정:
