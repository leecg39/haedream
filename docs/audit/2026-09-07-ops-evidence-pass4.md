# Ops evidence pass 4 — 2026-09-07 (Hostinger read-only)

기준 HEAD: `05cff53a1b1b587b9ba96bd47b58c1862aa85b04`  
CI: `34067660483` — `quality` ✓, `e2e-core` ✓ (exact SHA)  
Goal A~E: **still incomplete** for approved external evidence.

## Scope / safety

- Hostinger MCP: **read-only** only (list websites/orders/VMs/projects/domains).
- No deploy, no env/DNS/server file/app/DB mutation, no live write queries, no migration apply.
- Secret/webhook URL/IP/absolute host paths **not** recorded here.
- Outside-repo sanitized JSON (mode 0600): `solarsimz-ops-artifacts/evidence/2026-09-07-pass4-hostinger-ro/hostinger-readonly-discovery.json`

## Hostinger discovery (auth OK)

| Probe | Result |
|---|---|
| Shared hosting websites | 1 site, type `builder` only |
| Node.js websites | **0** |
| JS deployments / Node env / account cron APIs | unavailable for builder site (404 / not applicable) |
| Scheduler config observable | **no** |
| Webhook env key presence observable | **no** (Node env API N/A; values never readable anyway) |
| VPS | 1 VM, state `running` (alias `hostinger-vps-1`) |
| Docker Compose projects | 11 running |
| Project names matching SolarSimz / haedream / FIT / kepco | **none** |
| Spot-check unrelated project `smb` | not SolarSimz |
| Domains portfolio | no SolarSimz/haedream domain |
| Deploy SHA / build metadata for SolarSimz | **not found** via this MCP surface |

Previous pass3 Hostinger timeout is **cleared** for discovery connectivity. External **E audit remains blocked** because no SolarSimz/haedream deploy target was identified on this Hostinger account.

## Local offline 011 (unchanged; not external)

| Field | Value |
|---|---|
| envAlias | `local-dev-post-011` |
| report basename | `audit-011-local-dev-post-011.json` |
| ok | true |
| migration011Applied | true |
| orphans (collection_jobs / energy_measurements) | 0 / 0 |
| stopRecommended | false |

## De-id ≥1GB path (B tooling; attestation still required)

| Field | Value |
|---|---|
| basename | `local-live-post-011.deid.db` |
| bytes | `1149865984` |
| mode | `0600` |
| sha256 | `59501eda1b1a2fa36c7f5df8b20de57897b681529aad41b7079abb99b6422f49` |
| `attestationRequiredForP7T2` | true |
| `largeDbRehearsal` | verified (prior pass) |

## Still blocked (inputs required)

| ID | Need |
|---|---|
| A | approved CSV + meta via outside-repo manifest (`ops:external-input`) |
| B | operator attestation that de-id/ops ≥1GB snapshot is approved for P7-T2 |
| C | approved webhook URL/secret/allowlist + receiver ack (never commit/print values) |
| D | scheduler env alias + calendar start (≥7 days) + alert owner + fault-inject approval |
| E | operator mapping of SolarSimz/haedream external env (this Hostinger account has no matching project) **or** approved offline snapshot + pre-011 backup provenance for the real deploy host |

## Mutations

none.
