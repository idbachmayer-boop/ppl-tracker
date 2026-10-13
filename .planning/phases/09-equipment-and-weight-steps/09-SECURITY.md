---
phase: 09
slug: equipment-and-weight-steps
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-10-12
---

# Phase 09 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| imported backup / cloud blob → registry rows | `equip`, `equipAt`, `aliases`, `mergedInto` are untyped; `validateBackup()` checks shape only | synced training metadata, low sensitivity |
| device ↔ cloud | the exercise registry now merges per row (`mergeExercises`) with an `equipAt` field clock and soft-deleted merges | synced registry |
| boot → migration 19 | rewrites stored registry rows once, at old `mtime` + 1 | stored registry |
| registry/draft → card and Settings HTML | type tags, picker prompt, select labels and aria attributes interpolate names and types | rendered markup |
| inline script ↔ CSP | any script edit invalidates the pinned sha256 | the app's availability |
| branch → `main` → Pages → both devices | a merge ships schema 19 to both devices | the deployed code |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-9-01 | Tampering (integrity) | migration 19 hitting the TDZ | high | mitigate | `EQUIP_DEFAULTS` (L552) and hoisted `equipGuess`/`stampEquipment` sit above `MIGRATIONS` (L601); the boot test asserts the stored blob, mutation-proved | closed |
| T-9-02 | Tampering (integrity) | a migrated row losing to a stale copy | high | mitigate | `stampEquipment` (L721) stamps old `mtime` + 1 (D-14), persisted by the boot save; stored `mtime` asserted; two-device replays | closed |
| T-9-03 | Tampering → XSS | hostile stored `equip` | medium | mitigate | `equipOf` (L1498) returns a stored value only if it is in `EQUIP_TYPES` | closed |
| T-9-04 | Tampering | prototype names (`__proto__`, `constructor`) | medium | mitigate | own-key lookups in `equipGuess`/`equipKnown`; `weightStep` compares the unit with the literal `'kg'` | closed |
| T-9-05 | Denial of Service | non-idempotent migration churning `mtime` | medium | mitigate | rows with a valid `equip` and tombstones skipped; replaying migration 19 on its own output is a mutation-proved check | closed |
| T-9-06 | Denial of Service | stale CSP hash | high | mitigate | `npm run csp:check` passes (`sha256-c21XVzCc…`) | closed |
| T-9-07 | Information disclosure | Ian's export copied into the repo | medium | mitigate | the suite lists names literally; the export is outside the repo and never committed | closed |
| T-9-08 | Tampering (integrity) | whole-array registry merge erasing an equipment choice or a new row | high | mitigate | `mergeExercises` (L4607) per-row union plus the `equipAt` clock; replays in both orders, twice; 400-trial three-replica law test (review iteration 2) | closed |
| T-9-09 | Tampering (integrity) | merged-away exercise resurrected, splitting history | high | mitigate | `exMerge` tombstones; `exResolve` (L1471) follows `mergedInto`; tombstone beats live; alias union and one-owner pass (review CR-01, WR-01, WR-07, WR-08 fixes). Residual WR-09 accepted below | closed |
| T-9-10 | Tampering | hostile `equip`/`equipAt` winning the clock | medium | mitigate | the clock scores −1 unless the type is valid and `equipAt` finite; ties broken deterministically (IN-02 fix) | closed |
| T-9-11 | Tampering → XSS | Settings select attributes and labels | medium | mitigate | `esc()` inside double quotes; labels from `EQUIP_LABEL` | closed |
| T-9-12 | Elevation (draft leaves device) | a new controller reading the draft and saving | high | mitigate | `setExerciseEquip` (L3009) reads only the registry; DRAFT-05/DRAFT_PUSHERS green | closed |
| T-9-13 | Tampering (integrity) | the union changing a legacy merge result | medium | mitigate | no sort, new objects only; parity, random differential and golden unchanged since 09-01 | closed |
| T-9-14 | Elevation | wrapper reaching an inherited action name | low | mitigate | literal `setExEquip`/`pickExEquip` keys; own-key dispatcher; DELEG-04 and F2 green | closed |
| T-9-15 | Denial of Service | stale CSP hash | high | mitigate | as T-9-06 | closed |
| T-9-16 | Tampering → XSS | suggest line's `DB.unit` | medium | mitigate | `esc()` on unit and value; hostile-unit check asserts `&lt;img` | closed |
| T-9-17 | Tampering (advice integrity) | float drift | low | mitigate | epsilon floors and tie tolerance; checks at 0.9 × 70 and the 67.5 tie | closed |
| T-9-18 | Tampering (advice integrity) | a deload heavier than last time, or blanked | medium | mitigate | `deloadPlan` (L1270) never raises a weight; under the bar it steps down the ladder, at the bar or lightest step it holds with a coach line, never blanks (WR-02/WR-03 fixes) | closed |
| T-9-19 | Tampering (logged data) | suggestion becoming a logged number | medium | mitigate | display only; the draft weights stay `''` (test) | closed |
| T-9-20 | Tampering (logged data) | an empty-bar flag copied into a session | medium | mitigate | computed at render; no new draft field (test) | closed |
| T-9-21 | Elevation (draft leaves device) | `deloadExercise` pushing | high | mitigate | keeps `saveLocal()`; DRAFT_PUSHERS green | closed |
| T-9-22 | Denial of Service | stale CSP hash | high | mitigate | as T-9-06 | closed |
| T-9-23 | Tampering → XSS | hostile exercise name in picker/Settings attributes | medium | mitigate | `esc()` everywhere; hostile-name sweep mutation-proved twice | closed |
| T-9-24 | Tampering → XSS | hostile stored `equip` reaching markup | medium | mitigate | values iterate `EQUIP_TYPES` literals; labels from `EQUIP_LABEL`; tag via validated `equipOf` | closed |
| T-9-25 | Tampering | invalid type from a control | low | mitigate | `setExerciseEquip` refuses non-enum values incl. `'toString'`; no write, push or toast | closed |
| T-9-26 | Elevation (draft leaves device) | draft-reading function that pushes | high | mitigate | `exEnsureAsk`/`setExerciseEquip` never read the draft; DRAFT-05 green | closed |
| T-9-27 | Information disclosure | `equipAsk` leaking to storage | low | mitigate | module `let` (L2437) only; stored blob asserted clean | closed |
| T-9-28 | Denial of Service | picker blocking logging | low | accept | inline panel; set rows stay usable; ignoring keeps the guess | closed |
| T-9-29 | Denial of Service | stale CSP hash | high | mitigate | as T-9-06 | closed |
| T-9-30 | Denial of Service | deploy whose script misses its hash | high | mitigate | deploy CSP step passed; live `--check` on `8a20832` passed | closed |
| T-9-31 | Tampering (logged data) | a bad build rewriting rows | high | mitigate | migration 19 rewrites registry rows only and no session; the registry merge never drops a row | closed |
| T-9-32 | Denial of Service (sync) | a revert after schema 19 pausing sync | medium | accept | inherent to a SCHEMA bump; `remoteTooNew` protects data; Ian read the cost before shipping | closed |
| T-9-33 | Repudiation | judging on the old build | medium | mitigate | live stamp matched `8a20832`; UAT started from This version on both devices | closed |
| T-9-34 | Repudiation | squash/rebase losing the revert target | medium | mitigate | `8a20832` has 2 parents (99e10c8, 297bb34) | closed |
| T-9-35 | Elevation | an executor pushing or merging `main` | high | mitigate | executors never pushed; the orchestrator pushed and merged PR #14 only on Ian's explicit in-chat request | closed |
| T-9-36 | Tampering | unreviewed content riding along | medium | mitigate | review precondition (3 iterations), merge-tree equality and file list passed | closed |
| T-9-SC | Tampering | npm installs | low | accept | no dependencies by rule | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-9-01 | T-9-SC | no dependencies by project rule | plan-time register | 2026-10-12 |
| AR-9-02 | T-9-28 | the picker is an inline panel that never blocks logging | plan-time register | 2026-10-12 |
| AR-9-03 | T-9-32 | a revert after schema 19 pauses sync until a ≥19 build ships; data is never lost | Ian (read before shipping) | 2026-10-12 |
| AR-9-04 | T-9-09 residual (review WR-09) | the same exercise merged into two different targets on two devices before either syncs: stray-alias placement depends on sync order. No sets lost; devices converge through one cloud doc | Ian (shipped with it open) | 2026-10-12 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-10-12 | 37 | 37 | 0 | /gsd-secure-phase 9 (orchestrator, ASVS L1 grep-depth; register authored at plan time; merge invariants additionally fuzzed by the code reviewer, iteration 3) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-10-12
