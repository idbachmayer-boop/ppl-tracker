---
phase: 10-log-page-history-and-skip
plan: 01
subsystem: workout-log
status: complete
tags: [skip, draft, finishWorkout, progression, log-tab]
requires: []
provides:
  - "exUnfinished, skipExercise, unskipExercise, skipTailHTML (index.html)"
  - "S1 header skip button and S2 skipped card in viewActive"
  - "finishWorkout strips every `_` draft-only field and keeps a boolean-true skip marker"
  - "lgLat, lgSess, lgRun, lgCard test helpers (reused by 10-02 and 10-03)"
affects: [10-02, 10-03, 10-04]
tech-stack:
  added: []
  patterns:
    - "draft-only fields start with `_` and are stripped generically at finish"
    - "exercise-level skip marker added alongside the per-set flags, which stay the source of truth"
key-files:
  created: []
  modified: [index.html, test/app.test.js, CLAUDE.md]
decisions:
  - "Exercise skip shape is add-alongside: entry gains `skipped: true` + `reason`, per-set `skipped` flags stay the only judgement input (D-09); SCHEMA stays 19"
  - "finishWorkout strips every own key starting with `_` from entries and sets, replacing the lone `delete c._cel`"
  - "The tracer feedback gate ran autonomously (re-verified end to end) rather than as an interactive stop: the plan declares no designed stops and human_verify_mode is end-of-phase (10-04 carries the phone checks)"
metrics:
  duration: "10 min"
  completed: "2026-10-20"
  tasks: 3
  files: 3
actuals:
  tokens: 9100
  tasks: 3
  commits: 4
---

# Phase 10 Plan 01: Skip a Whole Exercise Mid-Workout Summary

Ian can now skip a whole exercise from its header icon. He gives one optional reason, sees a single muted line with Undo, and Undo restores the card exactly, even after a reload. When he finishes, the skip is written into the session as per-set flags plus a `skipped: true` / `reason` marker, and nothing draft-only goes with it. The next card for that exercise no longer offers Add weight.

## What was built

- **index.html**
  - `exUnfinished(e)`: lists the sets that have no reps and are not skipped.
  - `skipExercise(i)` asks for the reason (S7), takes a `_preSkip` snapshot, then marks only the unfinished sets. It clears deload when no set is done (D-22) and saves with `saveLocal()` only.
  - `unskipExercise(i)` restores from the snapshot. With no snapshot (D-25) it un-skips each set that has no reason of its own, refilling the weight from `nearWeight`. It saves with `saveLocal()` only.
  - `skipTailHTML(e, prAt)`: the shared, escaped text after the name. 10-02 and 10-03 reuse it.
  - S1 button first in the `.ex-head` right column. S2 branch ahead of the collapsed branch. The `.ex-skip` CSS rule. `ACTIONS.skipExercise` and `ACTIONS.unskipExercise`.
  - `finishWorkout` strips every `_` key from each entry and set copy, drops a marker that is not exactly `true`, and turns a non-string reason into `''`. It still has its single `save()`.
- **test/app.test.js**
  - New LOG section with the `lg*` helpers: a 6-step tracer, 15 skip-rule checks and 8 finished-session checks.
  - Two DRAFT-05 rows. The pin moved from 25 to 27.
- **CLAUDE.md**: one sentence on draft-only `_` fields.

## Suite lines

- Pre-plan: `1136 passed, 0 failed, 2 skipped`, CSP `sha256-c21XVzCcRwMep642eFzbjNWAsgtThZ09OcXShNXTUM8=`
- Post-plan: `1165 passed, 0 failed, 2 skipped`
- CSP hash after the last task: `sha256-F45WeMURwX/mnNAJyj5+JiHqCs2tcRayiWtbf6EIJH8=` (`npm run csp:check` OK)

## RED lines

**Task 1** (before any index.html change, `1137 passed, 5 failed`):
```
FAIL  DRAFT-05: every draft-only edit is stored on this device with no updatedAt bump and no push  → [{"name":"skipExercise","reason":"not a function"},{"name":"unskipExercise","reason":"setup threw: a.__sandbox.skipExercise is not a function"}]
FAIL  LOG-03 tracer (b): the header skip button skips every unfinished set with the reason, on this device only
FAIL  LOG-03 tracer (c): the skipped card is one note with the name, the reason and an Undo button, and no card shifts
FAIL  LOG-05 tracer (e): the finished session keeps the skip marker and per-set flags, with no draft-only field
FAIL  LOG-05 tracer (f): the next PUSH 1 card offers no Add weight for the skipped exercise and still shows Last time
```
Tracer (d) passed vacuously at RED because no skip had happened yet. Mutation T2-ii below shows it bites.

**Task 2:** there was no RED. All 15 checks passed on Task 1's code, because Task 1 already implemented D-22 to the `<interfaces>` spec, which the plan allows for. Each check was mutation-proved instead (table below).

**Task 3:** there was no natural RED, because Task 1 already added the `skipped !== true` guard. Per the plan, I mutated the guard away:
```
FAIL  T-10-04: a marker that is not the boolean true is dropped with its reason, and a non-string reason is stored as ""  → {"e0":["skipped","reason"],"e1":[true,42]}
```
The first Task 3 run had 4 FAILs from test-side faults. `finishWorkout`'s PR confetti hit the harness's null canvas (a first-time lift counts as a PR), and the export block read an instance that was never assigned. Stubbing `confettiBurst` in those blocks fixed both, the same way the PROG block does it.

## Mutation tables

Each mutation was applied in place, the suite run, then the file restored byte-for-byte (`cmp`), and `csp:check` passed again. The CSP checks always fail while a mutation is in place, so they are left out of this table.

| # | Mutation | Check that went red |
|---|----------|---------------------|
| T1-i | skipExercise calls `save()` | DRAFT-05 row check (pushes 1, updatedAt bumped), DRAFT-05 pushers (`skipExercise` named), tracer (b) |
| T1-ii | entry-level `_` strip removed | tracer (e) (`under: ["_preSkip"]`) |
| T1-iii | S1 condition dropped | nothing in Task 1, as the plan expected. Re-run as T2-iv |
| T2-i | D-22 deload clear removed | D-22 |
| T2-ii | unskipExercise always uses the fallback | tracer (d), D-22, D-13/LOG-04 exact Undo through reload |
| T2-iii | `esc(` removed around the reason | T-10-01 hostile reason |
| T2-iv | S1 condition dropped (T1-iii re-run) | D-12 hidden check (`s0`, `s1` true) |
| T3-red | marker guard removed | T-10-04 |
| T3-i-a | set strip put back as the old `delete c._cel` (plan wording) | nothing. See deviation 3 |
| T3-i-b | set-level strip removed entirely | T-10-02 (`0.sets.0._cel`) |
| T3-ii | entry-level strip removed | tracer (e), T-10-02 (`4._preSkip`) |

## Assumption delta (carried forward)

**add-alongside.** The exercise-level `skipped: true` plus `reason` is a display marker that sits beside the per-set `skipped` flags. The per-set flags are still the only input to every judgement: Add weight, stall, PRs, volume and the export. Two invariant tests hold this:

- Deleting the marker (what an older build sees) changes neither `addWeightInfo` nor `stallStreak` (the D-09 check).
- Every entry this build writes with `skipped === true` holds a skipped set (the D-16 check).

A later promotion would be needed only if some judgement had to treat a whole-exercise skip differently, or if the marker and the per-set flags were seen disagreeing in real data.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The DRAFT-05 runner crashed the whole suite when a row's setup threw**
- **Found during:** Task 1 RED run.
- **Issue:** the `unskipExercise` row's setup calls `skipExercise`. Before that function existed, the setup threw out of the `forEach` and ended the run with a stack trace instead of a named FAIL.
- **Fix:** the runner wraps `setup()` in try/catch and records `setup threw: …` for the row.
- **Files modified:** test/app.test.js
- **Commit:** 10a04d9

**2. [Rule 3 - Blocking] The tracer had to navigate to Train → Log**
- **Found during:** Task 1, while writing the tests.
- **Issue:** `f2Find` reads the rendered `#app`, so the tracer only finds controls when the Log tab is the one rendered.
- **Fix:** none needed. `startWorkout` already calls `goSub('train','log')`, so the tracer reaches the real controls with no extra step.

**3. [Plan wording] Mutation T3-i as written cannot go red**
- **Issue:** the plan says to put back `delete c._cel` in place of the generic set strip and expect the property to fail for `_cel`. But that line still deletes `_cel`, and `_cel` is the only `_` field a set carries, so the property passes.
- **Fix:** I ran it as written (green, recorded above) and added T3-i-b, which removes the set-level strip entirely. T3-i-b goes red for `_cel`, so the set-level half is proved.

**4. [Test harness] Confetti stub in Task 3 blocks**
- **Issue:** a finish that logs a first-time lift fires the PR confetti, which throws in the harness.
- **Fix:** `S.confettiBurst = () => {}` in each Task 3 block that finishes, the pattern the PROG block already uses.
- **Commit:** 1690f5f

## Human checks carried by 10-04

Two checks need Ian's phone and the deployed build: the skip surviving a real reload of the installed PWA, and the S1 header fitting at 380px. Both are part of 10-04 Task 3's `<human-check>`. 10-04 Task 2's blocking human-action stop is also the moment the D-09 marker first reaches synced data.

## Threat Flags

None. The new surface (a prompt answer rendered on the card, and the draft-to-session copy) is the surface T-10-01 through T-10-07 already cover, and each mitigation has a mutation-proved test.

## Known Stubs

None.

## Commits

- 10a04d9 feat(10-01): skip a whole exercise mid-workout, undo it, record it at finish
- c605710 test(10-01): pin the exercise-skip rules mid-workout
- 1690f5f test(10-01): pin the finished session's skip record; document `_` draft fields

## Self-Check: PASSED

- FOUND index.html, test/app.test.js, CLAUDE.md
- FOUND commits 10a04d9, c605710, 1690f5f
- `npm run csp:check` OK, `TZ=America/Chicago npm test` → `1165 passed, 0 failed, 2 skipped`
