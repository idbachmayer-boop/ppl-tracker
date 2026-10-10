---
phase: 01-f1-the-collections-registry
plan: 06
subsystem: testing
tags: [real-data-differential, privacy, gitignore, checkpoint-human-action]

# Dependency graph
requires:
  - phase: 01-f1-the-collections-registry (plan 04)
    provides: "the real-backup differential block in test/app.test.js (REAL_PATH, skip-when-absent), plus the .gitignore that keeps test/local/ out of git"
provides:
  - "Ian's real exported backup placed locally at test/local/real-db-snapshot.json, git-ignored and never committed"
  - "The REG-13 real-data differential leg run to completion and recorded PASS, counts only"
affects: [phase-1-plan-07]

actuals:
  tokens: 900
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - "A checkpoint:human-action task's local-only artifact is verified read-only (existence, git-ignore status, absence from the index) before any consumer runs, never opened or printed"

key-files:
  created: []
  modified: []

key-decisions:
  - "No code changed in this plan (files_modified: [] held). The single artifact produced is this counts-only SUMMARY; the real backup itself stays local-only per Ian's decision 3 (2026-09-11) and is never staged or committed."

patterns-established: []

requirements-completed: [REG-13]

coverage:
  - id: D1
    description: "The REG-13 real-data differential (validateBackup parity, all seven liveX wrappers vs their legacy twins, real boot with every declared collection shaped, six merge scenarios at both localWins values, per-collection distinct-key-count parity) ran against Ian's actual exported backup with every check passing and nothing skipped"
    requirement: "REG-13"
    verification:
      - kind: other
        ref: "TZ=America/Chicago node test/app.test.js -> 653 passed, 0 failed, 0 skipped; 30 lines matching 'PASS  real backup: '; 0 lines matching '  SKIP  real-backup differential'"
        status: pass
    human_judgment: false

duration: ~10min
completed: 2026-09-14
status: complete
---

# Phase 1 Plan 6: The REG-13 Real-Backup Differential, Run Over Ian's Actual Data Summary

**Ian's real exported backup ran through the full REG-13 differential (validateBackup parity, all seven liveX wrappers, real boot, six merge scenarios x 2 localWins, per-collection key-count parity) with every check passing and nothing skipped — recorded here counts only, the file itself never leaving the git-ignored local folder.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-09-14
- **Completed:** 2026-09-14
- **Tasks:** 2 of 2 (Task 1 completed in a prior session as a checkpoint:human-action; Task 2 completed this session)
- **Files modified:** 0 (this SUMMARY is the only artifact this plan writes)

## Accomplishments

- Confirmed the precondition read-only: `test/local/real-db-snapshot.json` exists, `git check-ignore -q` exits 0, and the file appears in neither `git ls-files test/local` nor `git status --porcelain -- test/local`.
- Ran one `node -e` counts-only inspection of the file (size, `_schema`, and each collection's row/key count) — no row content, dates, notes or names were read or printed beyond that.
- Ran `TZ=America/Chicago node test/app.test.js` with the file in place: the loud SKIP line for the real-backup block did not appear, 30 lines matched `PASS  real backup: `, 0 `FAIL` lines appeared, and the suite's final line read `653 passed, 0 failed, 0 skipped` (exit 0).
- **Real-backup differential: PASS**

### Counts-only record (REG-13 real-data proof)

- **Date:** 2026-09-14
- **File size:** 225602 bytes
- **`_schema`:** 17
- **Real-backup PASS lines:** 30
- **Suite summary line:** `653 passed, 0 failed, 0 skipped`

| Collection | Count |
|---|---|
| sessions | 45 |
| weights | 69 |
| petWeights | 15 |
| exercises | 60 |
| hobbies | 12 |
| productivity | 20 |
| hobbyLog | 43 |
| journal | 35 |
| mobilityLog | 12 |
| todos | 22 |
| cardio | 35 |
| ideas | 28 |
| lawnLog | 24 |
| lawn | 3 |
| wx | 4 |

(Array collections counted by length; map collections counted by key count. No row, date range, note, journal line or exercise name appears anywhere in this file.)

## Task Commits

1. **Task 1: Ian exports a real backup and places it locally** — no commit (checkpoint:human-action; the artifact is a local, git-ignored file, never staged). Completed in a prior session; verified read-only again at the start of Task 2.
2. **Task 2: Run the real-backup differential and record the result, counts only** — no commit (read-only verification; no tracked files modified).

**Plan metadata:** committed with this SUMMARY (docs: complete plan)

## Files Created/Modified

None tracked. `test/local/real-db-snapshot.json` exists locally, is git-ignored, and was never staged or committed.

## Decisions Made

- No code changes were needed or made — this plan's job was solely to place the real backup (Task 1, prior session) and prove the differential passes over it (Task 2, this session), per the plan's explicit "this plan changes no code" scope boundary.

## Deviations from Plan

None - plan executed exactly as written. The precondition held, the counts-only inspection printed only size/schema/counts, and the suite passed with zero SKIP and zero FAIL lines on the real-backup block on the first run.

## Issues Encountered

None.

## Known Stubs

None.

## User Setup Required

None - Task 1's checkpoint:human-action (Ian exporting and placing the backup) was already completed and verified in a prior session before this continuation began.

## Next Phase Readiness

- REG-13's real-data leg is now proven, alongside the per-incident synthetic fixtures (plan 01-03) and the seeded random battery (plan 01-04). ROADMAP success criterion 4's precondition for deleting the legacy functions is met.
- Plan 01-07 Task 2 (deleting `mergeDB_legacy`, `validateBackup_legacy`, and the six `_legacy` liveX twins) may now proceed — its precondition reads the counts-only PASS record above from this file.
- The real backup itself remains local-only, forever, at `test/local/real-db-snapshot.json`.

## Self-Check: PASSED

`test/local/real-db-snapshot.json` exists locally (confirmed read-only, not printed). No commit hashes to verify for Task 1 or Task 2 (neither modified tracked files); the plan-metadata commit below is verified after it is made.

---
*Phase: 01-f1-the-collections-registry*
*Completed: 2026-09-14*
