# Local / synthetic ops evidence — 2026-09-07 (pass 2)

기준 HEAD at write: `7fe92c2768b0b18505bab4ec51944b2b97a399d6` (pre-commit of this pass)  
Goal A~E: **still incomplete** for approved external evidence.

## Accidental local migrate note (important, honest)

During prep, `node scripts/migrate.mjs` was invoked once **without** `DATABASE_PATH`, so it targeted the default `data/solarsimz.db`.

| Check (read-only after) | Result |
|---|---|
| integrity_check | ok |
| firms count | 1654 (unchanged class) |
| collection_jobs / energy_measurements orphans | 0 / 0 |
| `_migrations` | 12 applied including `011_…` and `012_…` |
| Live WAL sidecars at audit time | absent after connection close |

Immediate mitigation: offline snapshot (git 밖)

| Item | Value |
|---|---|
| basename | `local-live-post-011.offline.db` |
| bytes | 1149865984 |
| sha256 | `0e44d40fdd3002059af7399c235a2fe38cef1a3162c00cd715e756c72eaff11b` |

Read-only 011 audit on that snapshot (`envAlias=local-dev-post-011`):

| Field | Value |
|---|---|
| migration011Applied | true |
| orphanCollectionJobs | 0 |
| orphanEnergyMeasurements | 0 |
| stopRecommended | false |
| ok | true |

This is **local-dev only**, not an external deploy env. External E remains blocked. Hostinger website list API timed out this pass.

## Synthetic A/D/E rehearsal

Command: `npm run ops:synth-rehearsal`  
Evidence: `docs/audit/2026-09-07-synthetic-ops-rehearsal.json`

| Step | Result (non-sensitive) |
|---|---|
| CSV basename | `sample-approved-synthetic.csv` |
| CSV sha256 | `79faf234dd61048e501b8e47f6d6d1722df5dfe5d25401d9a6bee238cc24eed0` |
| dry-run / apply / reconcile | ok; reconcile mismatchCount 0 |
| reapply | unchanged writes; ingested_at unchanged; measurementCount 4 |
| monitor Day0 (`KEPCO_ALERT_SINK=none`) | exit 0 |
| audit-011 on temp offline DB | 011 applied, orphans 0 |

**Does not** complete P5-T1, P7-T3, or external E.

## Still blocked

| ID | Need |
|---|---|
| A | approved real CSV + meta |
| B | approved de-id **ops** ≥1GB snapshot (synthetic size path already verified earlier) |
| C | approved HTTPS webhook + secret + allowlist + ack |
| D | scheduler env + calendar 7-day window (Day0 synth monitor ≠ 7-day ops) |
| E | external env list + offline snapshots (local-dev audit is supplemental only) |
