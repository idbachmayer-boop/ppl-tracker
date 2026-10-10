---
phase: 08-progression-correctness
plan: 02
subsystem: training-progression
status: complete
tags: [progression, stall, PROG-02, PROG-03, PROG-04, PROG-05]
requires:
  - "08-01: setWeightNum(x), workedSets(e), the PROG test builders latSess / latRun / latCard"
provides:
  - "sessionSummary(e), compareSessions(prev, cur), slotHistory(workout, slotIndex, exName), stallStreak(workout, slotIndex, exName), isStalledSlot(name, workout, slotIndex)"
  - "the stall banner: ⚠ Stalled — no extra rep or weight for 3 sessions in a row on {workout}"
  - "the How to progress guide entry, matching the add-weight and stall rules"
affects: [08-03, phase-10-LOG-05]
tech-stack:
  added: []
  patterns:
    - "Render-time streak walk over liveSessions(), matched by exKey per workout and slot, with pauses that leave the comparison point unchanged"
key-files:
  created: []
  modified: [index.html, test/app.test.js]
decisions:
  - "Stall is judged session to session: heavier, or the same weight with +1 total rep, is progress; lighter restarts; 3 flat in a row after a baseline is stalled. Never compared with an all-time best (D-06)"
  - "A deload, a skipped day, an entry with nothing worked, and an entry with a skipped set or blankSets > 0 all pause the streak; the next counted session is compared with the last counted one (D-05, D-10)"
  - "A blank set (blankSets > 0) pauses the stall streak the same way a skipped set does: the planner's reading of D-10 with D-01, to be confirmed on the phone in 08-03"
  - "Tracer gate run in its autonomous variant (human_verify_mode end-of-phase): verify re-run and passed, no checkpoint returned"
metrics:
  duration: "~8 min"
  completed: 2026-10-10
  tasks: 3
  files: 2
actuals:
  tokens: 4400
  tasks: 3
  commits: 5
---

# Phase 8 Plan 02: Stall judged session to session Summary

The ⚠ Stalled warning now compares each session with the one before it, in the same workout and slot,
for the same exercise identity. Extra reps on sets 2 and 3 count, so the DB lateral raise that gained
reps only on later sets is no longer flagged. An old PR can no longer make the warning repeat forever,
and bodyweight exercises can stall now. The rule runs at render time over every past session and
stores nothing.

## Suite counts

- Pre-plan: `951 passed, 0 failed, 2 skipped`
- Post-plan: `980 passed, 0 failed, 2 skipped` (29 new checks in the PROG section)
- `npm run csp:check`: OK, `sha256-B00JKvY5YExrWss26Qpe/jr/VuxWjevL64PhOKrTjfY=`

## Final stall helpers (all `function` declarations in index.html)

| Signature | Contract |
|-----------|----------|
| `sessionSummary(e)` | null when `workedSets(e)` is empty. Otherwise `{W, reps}`: `W` is the heaviest `setWeightNum` over worked sets (0 for bodyweight), `reps` the sum of finite reps. |
| `compareSessions(prev, cur)` | `'progress'` if `cur.W > prev.W`; `'lighter'` if `cur.W < prev.W`; otherwise `'progress'` when `cur.reps >= prev.reps + 1`, else `'flat'`. |
| `slotHistory(workout, slotIndex, exName)` | `liveSessions()` of that workout, not a skipped day, with an entries array and an entry at `slotIndex` whose `exKey` equals `exKey(exName)`. `{entry, date}` oldest first. |
| `stallStreak(workout, slotIndex, exName)` | Walks `slotHistory`. A deload, a skipped set, `+blankSets > 0` or a null summary pauses (skipped, `prev` unchanged). Otherwise flat adds 1, and progress or lighter resets to 0. Returns the streak. |
| `isStalledSlot(name, workout, slotIndex)` | `stallStreak(workout, slotIndex, name) >= 3`. Signature unchanged, so viewActive's banner and the F2 `busyStalled` test caller are untouched. |

The old e1RM series helper (`slotE1rmSeries`) is deleted. `e1rm` itself stays for charts, strength,
exerciseHistory and translateLoad. The stall path does not call it.

## Banner wording

`⚠ Stalled — no extra rep or weight for 3 sessions in a row on ${esc(name)}.` followed by the unchanged
`Deload −10%` button (`data-action="deloadExercise" data-i="${esc(i)}"`) and "or swap the exercise above".

## Guide text (GUIDE → How to progress)

- **Each session:** beat the last one by at least **1 rep** in total at the same weight, or lift more weight.
- **Tiebreaker:** total reps, 10+9+8 (27) → 10+10+8 (28) still counts as progress. (kept)
- **Add weight** once **every set** reaches the top of the range, with no set skipped or left blank, all at the same weight. Add the smallest plate and start the range over. The app flags this with the green **⬆ Add weight** tag.
- **Stalled:** 3 sessions in a row without an extra rep or more weight, each compared with the session before. Deloads, skipped days and sessions with a skipped or blank set don't count, and a lighter session starts the count again. The app shows **⚠ Stalled** with a Deload −10% button.
- **Bodyweight:** at the top of the range on every set, add a belt or move to a harder variation.

## Task commits

| Task | Name | Commits |
|------|------|---------|
| 1 (tracer) | Session-to-session stall rule, banner, f2Stall rewrite, PROG-02/03 checks | `8ecaab4` |
| 2 (tdd) | Skipped or blank set pauses; D-03/D-05/D-06/D-10 sequences | `5aeb923` (RED), `5233674` (GREEN) |
| 3 (tdd) | Identity, bodyweight, soft delete, hostile data, D-07, guide copy | `39f2024` (RED), `4f07f12` (GREEN) |

No REFACTOR commits were needed.

## Tracer gate

The plan is `autonomous: true` and `human_verify_mode` is `end-of-phase`, so the tracer gate ran in its
autonomous variant. After the Task 1 commit, its `<verify>` (`csp:check` plus the suite) was re-run and
passed (957/0), and the F2 check `DELEG-02: every active-workout control calls its function with exactly
the arguments the inline handler passed` (which asserts `busyStalled === true`) passed with the rewritten
`f2Stall`. Execution went on to Task 2 without a checkpoint. The phone check stays with 08-03.

## TDD Gate Compliance

Tasks 2 and 3 each have a `test(...)` commit followed by a `feat(...)` commit.
- Task 2 RED: the four D-10 checks failed (skipped-set pause, the 2-flat case, the comparison against
  the last counted session, the blankSets pause). The D-03, D-05 and D-06 sequences already passed,
  because Task 1's walk already paused on deloads, skipped days and empty entries and restarted on lighter.
- Task 3 RED: the guide check failed. The D-04, alias, merge, bodyweight, soft-delete, hostile-data and
  D-07 checks already passed, as the plan expected ("no other app code changes are expected").

Mutation checks, each restored from a scratchpad copy of index.html (never `git checkout`):
- Counting only the best set's reps instead of the total turns the PROG-03 lateral-raise replay red
  (`stalled: true, streak: 3`), which is the reported false warning.
- Dropping the `blankSets` half of the pause turns the D-10/D-01 blank-set check red.
- Matching history by exact name instead of `exKey` turns the alias and rename checks red. The merge
  check stays green under that mutation because `exMerge` re-stamps entry names as well as ids.

## Deviations from Plan

### Test-construction choices

**1. Alias spelling uses case and spacing, not a plural.**
- **Found during:** Task 3
- **Issue:** the plan suggested 'DB lateral raises'. `normEx` folds only case and whitespace, and the
  registry migration folds just one known typo pair ('Seated Flys' to 'Seated Fly'). A plural of the
  lateral raise is a different exKey, so it would not share a streak, and that is correct app behaviour.
- **Fix:** the alias fixture alternates 'DB lateral raise' with `'  db LATERAL   Raise '`, and the check
  asserts with `P.exKey` that the two match, as the plan asked.
- **Files modified:** test/app.test.js. **Commit:** `39f2024`

**2. Rename fixture is seeded on settled data.**
- **Found during:** Task 3 (first RED run)
- **Issue:** seeding the older entries with a preset `exId` at `_schema:16` does not survive boot. The
  registry migration re-stamps `exId` from the typed name, so the old name became its own exercise.
- **Fix:** run `latRun` on the plain history, then give the two older entries an old typed name while
  keeping their stamped `exId`, and rename the registry row the way `renameExercise` does (new `name`,
  new alias pushed). The check queries under the new name ('Side raise'). No app code changed.
- **Files modified:** test/app.test.js. **Commit:** `39f2024`

### Guide copy

**3. [Rule 1 - Accuracy] The "Each session" bullet was reworded.**
- **Found during:** Task 3
- **Issue:** "beat the last one by at least 1 rep on any set" contradicts the rule now in code. +1 on
  one set and −1 on another is flat, and more weight is progress even with fewer reps.
- **Fix:** "beat the last one by at least 1 rep in total at the same weight, or lift more weight." The
  tiebreaker line is kept as the plan required.
- **Commit:** `4f07f12`

No `<behavior>` case needed a helper fix.

## Note for Ian

A set left blank pauses the stall count the way a skipped set does. That is the planner's reading of
D-10 together with D-01: dropping a set for time should never push you toward a deload warning. The
phone check in 08-03 is the place to confirm it.

## Verification

- `grep -cE "^function (sessionSummary|compareSessions|slotHistory|stallStreak|isStalledSlot)\(" index.html`: 5
- `grep -c "function slotE1rmSeries" index.html`: 0
- The `coach stall` line has `esc(name)` and `data-action="deloadExercise"`
- `stallStreak` contains `skipped` and `blankSets`
- The How to progress line contains "3 sessions", "left blank" and "belt" (1 each)
- `git diff 39f69e5 -- index.html | grep -c '^[-+]const SCHEMA'`: 0. MIGRATIONS untouched.
- The stall block between `sessionSummary` and `isStalledSlot` calls `e1rm` 0 times

## Known Stubs

None.

## Threat Flags

None. No new data surface. The banner's workout name is escaped (T-8-09), history is read only through
`liveSessions()` (T-8-10), and garbage values are covered by T-8-08.

## Self-Check: PASSED

- FOUND: index.html, test/app.test.js (modified), this SUMMARY
- FOUND commits: 8ecaab4, 5aeb923, 5233674, 39f2024, 4f07f12
