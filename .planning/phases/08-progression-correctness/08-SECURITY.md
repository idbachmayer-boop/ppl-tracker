---
phase: 08
slug: progression-correctness
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-10-10
---

# Phase 08 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| imported backup / cloud blob → session rows | `validateBackup()` checks shape only, so `w`, `r`, `sets` and `blankSets` are untyped | training data, low sensitivity |
| session rows → viewActive HTML | the add-weight flag and the stall banner interpolate the unit, a weight, the workout name and a slot index | rendered markup |
| device ↔ cloud | sessions union-merge by row `mtime`; an older build can write a row without `blankSets` | synced training data |
| inline script ↔ CSP | any script edit invalidates the pinned sha256 | the app's availability |
| branch → `main` → GitHub Pages → both devices | a merge changes what both devices run | the deployed code |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-8-01 | Tampering → XSS | add-weight flag (`DB.unit`, `newW`) | medium | mitigate | `esc(aw.newW)` and `esc(DB.unit)` on index.html ~L1881; a hostile-unit test asserts `&lt;img` | closed |
| T-8-02 | Tampering / DoS | `blankSets` from an import or a sync | medium | mitigate | read as `+blankSets > 0`; editSession clamps it to 0..20 behind `isFinite` (~L2348); tests cover `'abc'`, `-2` and `1e9` (test ~L7892) | closed |
| T-8-03 | Tampering (integrity) | garbage `w`/`r` making `Math.max` return NaN | medium | mitigate | `setWeightNum` maps non-finite values to 0; `workedSets` tolerates a non-array `sets` (~L1095–1096) | closed |
| T-8-04 | Tampering (integrity) | a stale device dropping `blankSets` | low | mitigate | whole-row mtime merge; a stale-device replay test. An older build's edit can still drop it (review IN-05); accepted as one possibly wrong hint, with no logged data lost | closed |
| T-8-05 | Elevation (draft leaving the device) | new `save()` from a draft function | high | mitigate | the phase diff adds no `save()` call; the DRAFT_PUSHERS structural check is green | closed |
| T-8-06 | Denial of Service | stale CSP hash | high | mitigate | `npm run csp:check` passes (`sha256-vIizx9pD…`) | closed |
| T-8-07 | Tampering (integrity) | rewriting stored rows to add the marker | high | mitigate | the marker is written only on the new row in finishWorkout; SCHEMA is 18 both at the phase base (235210b) and at HEAD | closed |
| T-8-08 | Tampering (integrity) | garbage values or a non-array `sets` in the stall path | medium | mitigate | `sessionSummary` goes through `workedSets`/`setWeightNum`; WR-04 added `Array.isArray` guards to `lastRealEntry`, `lastAnywhere` and `sessionExercises` | closed |
| T-8-09 | Tampering → XSS | banner workout name and `data-i` | low | mitigate | `esc(name)` and `data-i="${esc(i)}"` on ~L1897 | closed |
| T-8-10 | Information integrity | a deleted row counted in a streak | medium | mitigate | `slotHistory` reads through `liveSessions()`; a soft-delete test | closed |
| T-8-11 | Tampering (integrity) | storing or migrating a verdict | high | mitigate | the verdict is computed at render time; the canon-unchanged test; SCHEMA unchanged | closed |
| T-8-12 | Denial of Service | stale CSP hash | high | mitigate | same as T-8-06 | closed |
| T-8-13 | Repudiation (a false all-clear) | the F2 stalled fixture silently passing | medium | mitigate | `f2Stall` rewritten with the rule; the `busyStalled === true` assertion passes | closed |
| T-8-14 | Denial of Service | a deploy whose script misses its CSP hash | high | mitigate | the deploy job's CSP step passed (run 38052910368); a live `--check` on 99e10c8 passed | closed |
| T-8-15 | Tampering (integrity) | a bad build writing rows | high | mitigate | no stored row rewritten; `blankSets` additive; the revert command was ready before the push | closed |
| T-8-16 | Repudiation | judging the phone on the old build | medium | mitigate | the live stamp matched `99e10c8`; Ian confirmed This version before the UAT passed | closed |
| T-8-17 | Repudiation (revert target lost) | squash or rebase merge | medium | mitigate | `99e10c8` has 2 parents (f71c6e4, 8221d92) | closed |
| T-8-18 | Elevation | an executor pushing or merging `main` | high | mitigate | executors never pushed; Ian pushed and merged PR #13 himself (the orchestrator's merge attempt, made at Ian's request, was refused by the permission classifier) | closed |
| T-8-19 | Tampering | `main` moving, or the PR carrying more than the phase | medium | mitigate | the Task 1 merge-tree equality and file-list checks passed | closed |
| T-8-SC | Tampering | npm installs | low | accept | nothing is installed; `package.json` has no dependencies | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-8-01 | T-8-SC | The project has no dependencies by rule, so there is no supply chain to compromise | plan-time register | 2026-10-10 |
| AR-8-02 | T-8-04 | An older build that re-saves an edited session can drop `blankSets`. Worst case is one add-weight hint shown wrongly; no logged sets are lost | plan-time register (RESEARCH Runtime State Inventory) | 2026-10-10 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-10-10 | 20 | 20 | 0 | /gsd-secure-phase 8 (orchestrator, ASVS L1 grep-depth; the register was authored at plan time) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-10-10
