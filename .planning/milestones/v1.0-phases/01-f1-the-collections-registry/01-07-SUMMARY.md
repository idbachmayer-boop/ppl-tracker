---
phase: 01-f1-the-collections-registry
plan: 07
subsystem: testing
tags: [goldens, differential, legacy-retirement, deferred-by-decision]

# Dependency graph
requires:
  - phase: 01-f1-the-collections-registry (plan 04)
    provides: "the seeded random battery and synthetic legacy-vs-derived differential the goldens are recorded from"
  - phase: 01-f1-the-collections-registry (plan 06)
    provides: "the 'Real-backup differential: PASS' record that unblocks Task 2's precondition"
provides:
  - "540 golden hashes of the legacy data-layer functions' outputs, committed in test/fixtures/merge-golden.json while the legacy code still exists to produce them"
  - "golden() checks wired into every synthetic legacy-vs-derived comparison, so the derived code stays pinned to legacy behaviour once the legacy twins are eventually deleted"
affects: [phase-1-verification, future-legacy-deletion]

actuals:
  tokens: 142000
  tasks: 1
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Record goldens from the legacy implementation, never from its replacement — goldens regenerated from derived code are tautological"
    - "When a derived structure legitimately grows (a new collection), compare it to its legacy counterpart restricted to the legacy key set, not whole"

key-files:
  created:
    - test/fixtures/merge-golden.json
  modified:
    - test/app.test.js

key-decisions:
  - "Task 2 (REG-14: delete the ten legacy functions) was DEFERRED by Ian on 2026-09-14 — 'keep for now' — even though its precondition is met (01-06 recorded 'Real-backup differential: PASS'). The legacy twins stay until SCHEMA 18 has shipped and run on the phone for a few days. This is a user decision, not a failure or a blocked gate."
  - "REG-14 is a constraint on WHEN legacy code may be deleted (only in a commit later than its replacement, never the same one). With nothing deleted, it holds. The plan's own flagged assumption anticipated exactly this close: 'the phase can close with the legacy twins still present. REG-14 still holds in that case, because nothing was deleted early.'"
  - "Deviation (auto-corrected, Rule 1): a whole-object golden of blank() failed because the derived blank() now includes `sleep` (plan 01-05) and blank_legacy() does not. Fixed by hashing the derived output restricted to the legacy key set (legacyPortion), matching how legacyView() already restricts comparisons. This does not weaken the check — every key the legacy function produced is still pinned."

patterns-established:
  - "Goldens before deletion: freeze a legacy implementation's observable outputs as committed hashes before the implementation is removed, so the differential outlives the code it compared against"

requirements-completed: [REG-14]

coverage:
  - id: D1
    description: "Every synthetic legacy-vs-derived comparison (blank, the seven liveX wrappers, the 20 merge incidents, the 12 named validate cases, the 70-case generated validate battery, the 400-case random merge battery) is recorded as a golden from the legacy code and re-checked on every run"
    requirement: "REG-13"
    verification:
      - kind: other
        ref: "TZ=America/Chicago node test/app.test.js -> 72 lines matching 'PASS  golden: '; test/fixtures/merge-golden.json holds 540 values, all ^[0-9a-f]{8}$"
        status: pass
    human_judgment: false
  - id: D2
    description: "No legacy function was deleted before the real-data differential passed, and none was deleted at all: Ian deferred the deletion"
    requirement: "REG-14"
    verification:
      - kind: other
        ref: "grep -cE '_legacy\\(' index.html -> 12 (all legacy references intact at close)"
        status: pass
    human_judgment: true

duration: ~7min (Task 1)
completed: 2026-09-14
status: partial
---

# Phase 1 Plan 7: Retire the Legacy Scaffolding — Goldens Recorded, Deletion Deferred by Decision Summary

**The legacy data-layer functions' outputs are frozen as 540 committed golden hashes and checked on every run; the deletion itself (Task 2) was deferred by Ian on 2026-09-14, so all ten legacy functions remain in index.html.**

## Performance

- **Duration:** ~7 min (Task 1)
- **Completed:** 2026-09-14
- **Tasks:** 1 of 2 executed. Task 2 deferred by user decision.
- **Files modified:** 2 (test/app.test.js modified, test/fixtures/merge-golden.json created)

## Accomplishments

- **Task 1: complete** (`c5463bd` — `test(01-07): record legacy outputs as committed goldens before the legacy code goes`). Added `fnv1a()`, `golden()`, and `GOLDEN_PATH`/`WRITE`/`GOLDEN_IN`/`GOLDEN_OUT`, and wired `golden()` into every synthetic legacy-vs-derived comparison: `blank`, all seven `live:` wrappers, all 20 `merge:` incidents (inside `sameMerge`), the 12 named `validate:` cases, the 70-case generated `validate:gen:` battery (one aggregated ok), and the 400-case `random:` battery (one aggregated ok). The real-backup block got an explanatory comment and no golden call — it holds real data and must never be recorded.
- **Task 2: deferred.** Its precondition is satisfied — `01-06-SUMMARY.md` records `Real-backup differential: PASS` (653 passed, 0 failed, 0 skipped; 30 real-backup checks). Ian chose "keep for now": the ten legacy functions stay until SCHEMA 18 has shipped and been used on the phone for a few days. Nothing was deleted, renamed or stubbed, and the real-backup block was not retargeted to invariants.

## Deviations from Plan

**1. [Rule 1 — bug] blank() golden compared whole objects that legitimately differ**
- **Found during:** Task 1, on the check pass
- **Issue:** `golden('blank', canon(bl), canon(bn))` failed: `app.blank()` now includes `sleep` (added in plan 01-05) and `blank_legacy()` does not, so the hashes differed for an expected reason, not a divergence.
- **Fix:** hash the derived output restricted to the legacy key set (`legacyPortion`, test/app.test.js:500), consistent with `legacyView()` elsewhere in the file.
- **Effect on the check:** none weakened — every key the legacy function produces is still pinned.

**2. [Scope — user decision] Task 2 not executed**
- Recorded under Key Decisions. Not a failure; the plan anticipated this close.

## Verification

- Task 1's commit is on the branch; `test/fixtures/merge-golden.json` holds 540 values, all well-formed, and is committable (not git-ignored).
- `grep -cE '_legacy\(' index.html` → **12**: every legacy reference intact.
- Suite with Ian's real backup present: **653 passed, 0 failed, 0 skipped**, including 72 golden checks and 30 real-backup checks.

## Follow-up (tracked in STATE.md Pending Todos)

Re-run 01-07 Task 2 once SCHEMA 18 has shipped and run on the phone for a few days. Its precondition is already met. When it runs it must: delete the ten legacy functions in their own commit (`refactor(01-07): delete the legacy data-layer functions — REG-14`), retarget the synthetic differentials to the committed goldens, make `golden()` refuse to regenerate once legacy is gone, convert the real-backup block to invariants, and add the "REG-14: the legacy scaffolding is gone" check.

## Self-Check: PASSED

- Task 1 commit `c5463bd` present in `git log`.
- `test/fixtures/merge-golden.json` exists and is tracked.
- No legacy function deleted; nothing under `test/local/` tracked (`git ls-files test/local | wc -l` → 0).
