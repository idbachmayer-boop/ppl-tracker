---
phase: 08-progression-correctness
plan: 01
subsystem: training-progression
status: complete
tags: [progression, add-weight, blankSets, PROG-01, PROG-05]
requires: []
provides:
  - "setWeightNum(x), workedSets(e), weightStep(name), lastAttemptEntry(workout, slotIndex, exName), addWeightVerdict(entry, rng), addWeightInfo(workout, slotIndex, name)"
  - "blankSets: optional positive integer on main entries of sessions finished from now on"
  - "PROG test section with its own loadApp instance and the latSess / latRun / latCard builders"
affects: [08-02, 08-03, phase-09-EQUIP-04, phase-10-LOG-05]
tech-stack:
  added: []
  patterns:
    - "Render-time verdict over the latest attempt on the card, separate from lastRealEntry"
    - "Additive per-entry marker written only on the new row finishWorkout builds (no migration)"
key-files:
  created: []
  modified: [index.html, test/app.test.js]
decisions:
  - "An exercise left untouched in a finished workout now stores blankSets = its prefilled set count, so per D-09 the next card shows no add-weight suggestion for it"
  - "editSession re-expands blankSets into blank draft rows (clamped 0..20); the draft never carries the count itself"
  - "Tracer gate run in its autonomous variant (human_verify_mode end-of-phase): verify re-run and passed, no checkpoint returned"
metrics:
  duration: "~12 min"
  completed: 2026-10-10
  tasks: 3
  files: 2
actuals:
  tokens: 5048
  tasks: 3
  commits: 5
---

# Phase 8 Plan 01: Add-weight judges every set of the latest attempt Summary

⬆ Add weight now needs every set on the card done, at the working weight and at the top of the range.
A skipped set, a set left blank, a lighter set, or a latest attempt with nothing worked blocks it. A
bodyweight slot at the top reads "⬆ Add weight (belt) or harder variation", with no number.

## Suite counts

- Pre-plan: `928 passed, 0 failed, 2 skipped`
- Post-plan: `951 passed, 0 failed, 2 skipped` (23 new PROG checks)
- `npm run csp:check`: OK, `sha256-NMZm/vwV5gWNVtXXQww6FbPEgbIEnoSKMqxuD3aC2sg=`

## Helpers 08-02 builds on (all `function` declarations, reachable as `P.__sandbox.<name>`)

| Signature | Contract |
|-----------|----------|
| `setWeightNum(x)` | Blank, null, non-finite or non-positive weight is 0; otherwise the number. Tolerates a missing set. |
| `workedSets(e)` | Sets that are not skipped and have `r` neither `''` nor null. Missing entry or non-array `sets` gives `[]`. |
| `weightStep(name)` | `INCREMENT[DB.unit] \|\| 5`. `name` is unused; Phase 9 (EQUIP-04) replaces the body only. |
| `lastAttemptEntry(workout, slotIndex, exName)` | Newest live session of that workout, not a skipped day, whose entry at `slotIndex` matches `exKey(exName)`, is not a deload, and was on the card (`sets` non-empty or `+blankSets > 0`). Returns `{entry, date}` or null. |
| `addWeightVerdict(entry, rng)` | null for no entry. Blocked when any set is skipped, `+blankSets > 0`, or nothing worked. `allTop` = not blocked, every worked set at `W` (heaviest) and `r >= rng.hi`. Returns `{allTop, lastW: W, hasLoad: W > 0}`. |
| `addWeightInfo(workout, slotIndex, name)` | Slot from `PROGRAM[workout].slots[slotIndex]`, judged with `effRange(slot, name)`. Returns `{allTop, lastW, newW, hasLoad}` or null. |

`lastRealEntry` is byte-identical to the phase base `39f69e5` and still feeds Last time and the prefill.

Callers: startWorkout's prefill calls `addWeightInfo(name, i, exName)`, viewActive's flag calls
`addWeightInfo(name, i, entry.name)` inside its `if(ref)` branch. The flag passes the new weight and the
unit through `esc()`.

## PROG test builders (test/app.test.js, section `── PROG: add weight and stall follow what was lifted (PROG-01..05) ──`)

The section is one block just before the REG-01 end block, with its own `const P = loadApp(APP_PATH); spyPushes(P);`.
08-02 should add its checks inside that block so the builders stay in scope.

- `LW = 'PUSH 1'`, `LAT` = the PUSH 1 slot whose examples include `'DB lateral raise'`.
- `latSess(date, sets, o = {})`: `sets` are `[w, r, skipped]` triples (a skipped triple stores `w:''`
  and `r:''`). The target slot is `o.slot` (default `LAT`) in `o.workout` (default `LW`); every other
  slot gets `sets: []`. Options: `name`, `deload`, `skippedDay`, `blankSets`, `exId`, `workout`, `slot`.
  The id is `'prog' + n`, unique per call. A `skippedDay` session keeps its entries and sets `skipped:true`.
- `latRun(list)`: `P.DB = P.normalize(Object.assign(P.blank(), { _schema:16, sessions:list, draft:null, unit:'lb' }))`.
- `latCard(i, workout = LW)`: clears the draft, calls `startWorkout(workout)`, returns the i-th
  `<div class="ex-card">` chunk of `P.viewActive()`.
- Also in scope: `flagOf(card)` (the flag span's inner text or null), `draftW(i = LAT)`, `todayRow()`,
  `S = P.__sandbox`, `clone`, `TOP3` (25×20 three times), `finishLat(rows, before)` (baseline TOP3 at
  `dayOff(-7)`, rebuild the draft, run `before()`, fill `[w, r]` per set with `null` for blank, finish,
  return today's row) and `lastTop`.

## Task commits

| Task | Name | Commits |
|------|------|---------|
| 1 (tracer) | Skipped set means no add weight, end to end | `4a5c188` |
| 2 (tdd) | blankSets at finish, through edit and merge; D-09 cases | `681a8c4` (RED), `bfd2d05` (GREEN) |
| 3 (tdd) | Bodyweight wording, mixed weights, escaped flag | `0045618` (RED), `68cac95` (GREEN) |

No REFACTOR commits were needed.

## Tracer gate

The plan is `autonomous: true` and `human_verify_mode` is `end-of-phase`, so the tracer gate ran in its
autonomous variant. Task 1's `<verify>` (`csp:check` plus the suite) passed right before the commit, so
execution went on to Task 2 with no checkpoint. The phone check stays with the end-of-phase verification.

## TDD Gate Compliance

Tasks 2 and 3 each have a `test(...)` commit followed by a `feat(...)` commit. In both RED runs, some
checks passed before GREEN because Task 1's verdict helpers already covered them:
- Task 2: D-09 skipped, blank and legacy, the merge replay, and the garbage-verdict check.
- Task 3: D-02, the escaped flag, and the NaN check.

The checks that need each task's own code failed in RED, as they should:
- Task 2: the blank-set stamp, the edit round trip, the 20-row clamp.
- Task 3: both bodyweight-wording checks.

Mutation checks, each restored afterwards:
- Dropping the skipped-set blocker turns the PROG-01 skip check red.
- Raising the clamp to 25 turns the 1e9 check red.
- Removing `esc()` on the unit turns T-8-01 red.
- Removing the working-weight test turns D-02 red.

## Deviations from Plan

None in the shipped code. Process notes:
- **Finish-flow fixtures did not need `historical = true`.** Every finish logs at or below the
  baseline's 25 lb, so none sets a PR and none reaches `confettiBurst`.
- **One test-construction choice.** `flagOf` matches the flag span lazily (`[\s\S]*?`), not with
  `[^<]*`, so a raw `<img` inside the span is seen instead of cutting the match short.
- **A restore slip during the Task 1 mutation check, recovered.** `git checkout -- index.html` reverted
  the uncommitted Task 1 edits along with the mutation. They were restored byte-for-byte from the `cp`
  backup taken just before, and the suite was re-run green before the commit. Later mutation checks
  restored from a scratchpad copy.

## Behaviour notes for 08-02, 08-03 and Phase 10

- An exercise left completely untouched in a finished workout now stores `blankSets` equal to its
  prefilled set count, with `sets: []`. Under D-09 that is the latest attempt, so the next card shows no
  add-weight suggestion for it, while Last time still shows the last real attempt. This is how the plan
  is written. It shows up as a visible change when Ian skips an exercise by just not logging it.
- Opening such a session with editSession now shows those blank rows, capped at 20. Re-saving them
  unfilled keeps the count, and filling or removing them clears it.
- An older build that edits a new-build session drops `blankSets` (RESEARCH Runtime State Inventory,
  accepted, T-8-04). That loses one blocker and no logged data.
- `blankSets` is not exported by `buildMarkdownExport()` and is not checked by `validateBackup()`.

## Verification

- `grep -cE "^function (setWeightNum|workedSets|weightStep|lastAttemptEntry|addWeightVerdict|addWeightInfo)\(" index.html`: 6
- `addWeightInfo(name, i, exName)`: 1, `addWeightInfo(name, i, entry.name)`: 1, `addWeightInfo(s, ref`: 0
- `lastRealEntry` diff against `39f69e5`: empty
- `grep -c blankSets index.html`: 7. SCHEMA and MIGRATIONS lines changed since `39f69e5`: 0
- `harder variation`: 1, on the viewActive flag line, with `esc(` around the unit and the weight
- DRAFT-05 (only pickEx, exPick and finishWorkout push; draft-only edits stay local): PASS

## Known Stubs

None.

## Threat Flags

None. The only new data surface is `blankSets`, which the plan's threat model covers (T-8-02, T-8-04, T-8-07).

## Self-Check: PASSED

- FOUND: index.html, test/app.test.js (modified), this SUMMARY
- FOUND commits: 4a5c188, 681a8c4, bfd2d05, 0045618, 68cac95
