# Phase 8 — 운영 준비: 측정 CSV 도구 · webhook alert sink

작성일: 2026-09-07  
브랜치: `phase/8-operational-readiness`  
기준: `origin/feat/fit-clone` @ `b363fdfa2afc75693db50c50c054ecb456cb710e`

## 상태 구분

| 항목 | 상태 | 의미 |
|---|---|---|
| 승인 측정 CSV dry-run/apply/reconcile **도구** | **내부 준비** | 합성 fixture·temp SQLite 자동 검증 |
| 승인 **실데이터** 원본 대조 (P5-T1) | **외부 blocker** | 승인 원본 제공 후 |
| 수집 monitor **webhook sink 코드** | **내부 준비** | loopback·HMAC·로컬 TLS pin 경로 자동 검증 |
| 실 webhook endpoint · 7일 관찰 (P7-T3) | **외부 blocker** | 운영 URL/비밀·관찰 기간 |
| ≥1GB migrate rehearsal | **외부 blocker** | `largeDbRehearsal=unverified` (합성 크기 도구: `db:synthetic-large`, offline: `db:offline-snapshot`) |

P5/P7 체크박스는 외부 검증 없이 `[x]` 로 바꾸지 않는다.

---

## A. 승인 측정 CSV

### DB open

| mode | 동작 |
|---|---|
| dry-run / reconcile | **leaf** symlink 거부 (중간 dir symlink 예: macOS `/var` 허용). hot `-wal`/`-shm`/`-journal` 거부. `O_RDONLY`(+`O_NOFOLLOW`)로 FD open → fstat 전후(dev/ino/size/mtime/ctime) 불변 → mode `0600` temp 복사 → **fsync 후 FD close** → hash 대조 → 복사본만 readonly open. **원본 옆 sidecar 생성 없음**. |
| apply | leaf `lstat` regular/non-symlink → `openSync(O_RDWR\|O_NOFOLLOW)` guard FD + `fstat` → better-sqlite3 `fileMustExist` → **PRAGMA/쿼리/쓰기 전** path `lstat`와 guard `fstat`로 regular·dev/ino 재확인 → mismatch 시 `DB_SYMLINK_REJECTED`/`DB_FILE_CHANGED` 로 connection·guard 즉시 close. 확인 후 guard FD close. **SQLite 는 열린 inode 를 유지**하므로 검증 이후 pathname 교체는 write target 을 바꾸지 않는다. 자동 migrate 없음. |

운영 계약: **오프라인/checkpointed snapshot** 을 넘긴다. 라이브 WAL DB는 거부한다.  
1GB급에서는 동일 크기 temp 디스크·복사 시간이 든다.  
외부 writer 가 복사 중 원본을 바꾸는 race 는 코드만으로 제거할 수 없다 — fstat/hash 로 감지해 실패할 뿐 “완전 fail-closed”로 과장하지 않는다.

오류 보고서의 `sourceSha256` 은 CSV를 **한 번 읽은 hash** 를 보존해 쓰고, 오류 경로에서 파일을 다시 읽어 교체 race로 왜곡하지 않는다. 절대경로·원시값 미노출.

### CLI

- `--fid`: `[1-9]\d*` (leading zero·0 거부)
- `tenant` / `actor` / `calculation-version` / `expected-sha256` 형식은 **DB open 전** 검증
- unknown/duplicate/값 누락/`--apply`+`--reconcile` → exit 1, DB 무변경
- `--report`: symlink 거부, `O_EXCL` temp, finally cleanup

CSV: fatal UTF-8, header-only 거부, 엄격 quoting. unchanged reapply는 write skip.

---

## B. Webhook alert sink

### 동기 시작 검증 (DNS/TCP 없음)

URL shape, secret 길이, timeout, HTTPS allowlist, literal blocked IP, HTTP loopback opt-in.

### 전달 시 (alerting=true 만)

1. DNS lookup (모든 entry: non-null object, `address` string, `family` 4|6, `net.isIP(address)===family`)  
2. 이상 entry → `WEBHOOK_DNS_FAILED`; 비공인 주소 → `WEBHOOK_BLOCKED_IP`  
3. **모든** 결과가 공인일 때만 주소 1개 선택  
4. `https.request` + **custom lookup** (`createPinnedLookup`):  
   - `opts.all === true` → `callback(null, [{address, family}])`  
   - 그 외 → `callback(null, address, family)`  
   - `family` 고정, `autoSelectFamily: false`  
5. TLS: `rejectUnauthorized` 기본 **true**(운영 CA 검증). `servername`·HTTP `Host` = allowlisted 원 hostname  
6. redirect 수동 거부, HMAC-SHA256, timeout  

`fetch(hostname)` 재해석은 사용하지 않는다.  
IPv4 embedding: mapped/compatible, NAT64 `64:ff9b::/96`, IPv4-translated `::ffff:0:0:0/96` → IPv4 규칙.  
IPv6 special/transition block table: 6to4 `2002::/16`, Teredo `2001:0000::/32`, local-use NAT64 `64:ff9b:1::/48`, site-local `fec0::/10`, ULA/link-local/multicast/documentation 등. 정상 global unicast(예: `2001:4860::`, `2606:4700::`)는 통과. hostname allowlist만으로 사설·transition 경로가 우회되지 않는다.

**TCP pin 보장 (로컬 TLS fixture로 production `postWebhookHttpsPinned` 경로 검증):**  
pin IP로만 TCP peer가 열리고, 서버가 받은 `Host`·TLS SNI는 allowlisted hostname과 일치한다.  
egress ACL·운영 endpoint 관찰은 별도. “네트워크 전체 SSRF 불가능”이라고 쓰지 않는다.

`no-alert` → DNS/TCP/HTTP **0회**.

### 확장점 (테스트·프로세스 제어자)

| env | 용도 |
|---|---|
| `KEPCO_ALERT_DNS_LOOKUP_MODULE` | `lookupAll` 주입 (절대 경로) |
| `KEPCO_ALERT_INJECT_MODULE` | injectable sink 모듈 (절대 경로) |
| `KEPCO_ALERT_ALLOW_INJECT=1` | 위 모듈 로드 허용 (또는 `VITEST`/`NODE_ENV=test`) |

운영 기본 경로에서는 주입 모듈을 쓰지 않는다.

### 종료 코드

| code | 의미 |
|---|---|
| 0 | 임계 위반 없음 |
| 1 | 설정/DB 오류 (stack·절대경로·URL·secret 미노출) |
| 2 | 임계 위반 (전달 실패와 무관) |

file sink 결과의 `path` 는 **basename** 만.

정책 구현: `scripts/lib/kepco-webhook-policy.mjs`

---

## 검증

- `tests/measurement-csv-and-webhook.test.ts` (로컬 TLS pin·Host·SNI, apply TOCTOU hook 포함)
- **CI prerequisite:** Node.js 22+ 와 `openssl version` 이 성공하며 `openssl req -addext` 를 지원할 것. TLS pin 테스트는 openssl 이 없거나 `-addext` 미지원이면 **명확히 실패**하며 조용히 skip 하지 않는다.
- UI 미변경 → 로컬 전체 E2E 생략. 원격 `e2e-core` 확인.
