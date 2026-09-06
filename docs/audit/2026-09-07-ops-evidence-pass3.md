# Ops evidence pass 3 — 2026-09-07

기준 HEAD(작성 시점 tip 전): `a1107a7919d29f3f62ed71eb0ede3b4c2dec3514`  
Goal A~E: **still incomplete** for approved external evidence.

## Added tooling

| Script / doc | Role |
|---|---|
| `scripts/create-deidentified-offline-snapshot.mjs` | Offline→de-id copy; gate `ALLOW_DEIDENTIFY=1` + `--i-approve-deidentify`; mode 0600 |
| `scripts/ops-external-input-runner.mjs` | Outside-repo manifest runner for A/C/E/B actions; no secret/URL echo |
| `docs/ops/external-input-manifest.example.json` | Placeholder schema only |

## Hostinger / external env discovery

Hostinger `listWebsites` / `getVirtualMachines` MCP calls **timed out** this pass. External E env list still blocked.

## Local notes (non-sensitive)

- `data/solarsimz.db` again has WAL/SHM (live) — do not pass directly to rehearsal/audit.
- Existing offline `local-live-post-011.offline.db` remains 0600 outside git.
- De-id artifact (outside git): basename `local-live-post-011.deid.db`, bytes `1149865984`, mode 0600, `attestationRequiredForP7T2=true`.
- Adversarial fix: clear `collection_jobs.error_message` / `result_summary` and `energy_measurement_corrections.reason` / `corrected_by`.
- `migrate-rehearsal` on deid basename: `largeDbRehearsal=verified`, `largeDbBytes=1149865984`, `failed=false` (P7-T2 checkbox still open pending attestation).

## Still blocked

| ID | Need |
|---|---|
| A | approved CSV + meta via outside-repo manifest |
| B | operator attestation that de-id/ops ≥1GB snapshot is approved (tooling ready) |
| C | approved webhook URL/secret/allowlist via outside-repo manifest |
| D | scheduler env + calendar ≥7 days |
| E | external env offline snapshots (Hostinger discovery timed out) |
