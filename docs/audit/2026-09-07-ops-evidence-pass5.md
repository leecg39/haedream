# Ops evidence pass 5 — 2026-09-07 (operator attestation actions)

Parent tip before this change: `0c3b624f2057e4a49f9e0673353455b6aa60bb97`  
Goal A~E: **still incomplete** (no approved external operator attestation / CSV / webhook / 7-day window yet).

## Why this pass

Hostinger RO (pass4) found **no** SolarSimz/haedream deploy. External inputs for A–E remain missing.  
This pass adds the missing **operator attestation capture path** so B/D/E can be recorded the moment approvals arrive — without auto-checking task boxes or fabricating completion.

## Code

| Change | Role |
|---|---|
| `ops-external-input-runner.mjs` | new actions `attest-large-db`, `register-observation`, `declare-external-env` |
| `OPS_ATTEST_MIN_BYTES` | default `1e9`; tests may lower; production attestation stays ≥1GB |
| `external-input-manifest.example.json` | placeholder schema extended |
| tests | refuse undersized attestation; record B/D/E evidence with `*Complete=false` / `p7t2CheckboxAutoChecked=false` |

## Outside repo (not committed)

- `solarsimz-ops-artifacts/input-templates/` — fillable manifest template + README (mode 0600)
- Does **not** contain webhook secrets or approved customer CSV

## Still blocked

| ID | Need |
|---|---|
| A | approved CSV + meta |
| B | operator runs `attest-large-db` on approved ≥1GB deid/ops snapshot (tooling ready; attestation not yet provided) |
| C | approved webhook URL/secret/allowlist + receiver ack |
| D | `register-observation` + ≥7 calendar daily logs |
| E | `declare-external-env` + offline `audit-migration-011` for each hosting env (or proven other host). Hostinger inventory alone ≠ E complete |

## Mutations / deploy

none.
