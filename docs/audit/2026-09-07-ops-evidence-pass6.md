# Ops evidence pass 6 — 2026-09-07 (Hostinger host-rule scan + deid reverify)

기준 HEAD: `ba09f12807e80c724cd8cce7f19742a0a04642bb`  
Goal A~E: **still incomplete**.

## Safety

- Hostinger VPS `getProjectContents` is read-only; **no deploy / no writes**.
- Evidence stores **host aliases and match results only**. Compose `environment` secret values are **not** copied into git or ops evidence files.
- Outside evidence (0600): `solarsimz-ops-artifacts/evidence/2026-09-07-pass6-hostinger-hosts/pass6-discovery.json`

## E — Hostinger host-rule scan

| Check | Result |
|---|---|
| Docker projects scanned | 11 |
| Public host aliases observed | books / botanic / botanic-api / bsa / news / smb / agentos / soverin (+ hermes `*.hstgr` pattern) |
| Hostnames matching solar / haedream / fit / kepco / watt / simz | **none** |
| SolarSimz deploy host on this VPS | **not found** |

This strengthens pass4 inventory: not only project names, but Traefik/`APP_URL` host aliases also lack a SolarSimz target.  
**E remains blocked** until operator `declare-external-env` names the real host (or attests local-only) **and** offline `audit-migration-011` + pre-011 backup provenance exist for each hosting env.

## B — deid artifact reverify (not attestation)

| Field | Result |
|---|---|
| basename | `local-live-post-011.deid.db` |
| bytes | `1149865984` |
| mode | `0600` |
| sha256 matches meta | **true** |
| wal/shm/journal sidecars | none |
| operator `attest-large-db` | **missing** → P7-T2 checkbox still forbidden |

## Input search (this pass)

| Probe | Result |
|---|---|
| Outside filled manifests | none (template only) |
| Process / `.env*` webhook keys | unset / absent |
| Desktop measurement CSV beyond synthetic fixture | none approved |
| Google Drive search | auth unavailable |

## Still blocked

| ID | Need |
|---|---|
| A | approved CSV + meta via outside manifest |
| B | operator `attest-large-db` |
| C | approved HTTPS webhook + secret + allowlist + receiver ack |
| D | `register-observation` + ≥7 calendar daily logs |
| E | operator env declaration + offline 011 audit on real hosting env |

## Mutations

none.
