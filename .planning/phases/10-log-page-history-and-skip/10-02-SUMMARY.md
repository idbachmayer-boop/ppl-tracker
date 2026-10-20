---
phase: 10-log-page-history-and-skip
plan: 02
subsystem: workout-log
status: complete
tags: [skip, history, last-time, editSession, log-tab]
requires:
  - "10-01: skipTailHTML, unskipExercise's no-snapshot path, the lg* test helpers"
provides:
  - "skipNoteHTML (index.html): the D-17 muted note under Last time"
  - "viewHistory's D-15 branch for an entry with skipped === true"
  - "editSession carrying the skip marker and reason (D-25)"
  - "lgLastTime, lgNote, lgHistLine, lgOpen, lgCase test helpers (10-03 can reuse lgLastTime and lgNote)"
affects: [10-03, 10-04]
tech-stack:
  added: []
  patterns:
    - "display text after an exercise name comes from skipTailHTML everywhere (card, history line)"
    - "only the boolean `true` counts as the exercise skip marker, in every reader"
key-files:
  created: []
  modified: [index.html, test/app.test.js]
decisions:
  - "The D-17 note is fed by lastAttemptEntry and appended after lastLine, so the Last time numbers stay lastRealEntry's, byte for byte"
  - "editSession carries only skipped and reason, never _preSkip, so Undo on a re-edited workout always takes the no-snapshot path"
  - "The tracer feedback gate ran autonomously (re-verified end to end), as in 10-01: the plan is autonomous and human_verify_mode is end-of-phase"
metrics:
  duration: "8 min"
  completed: "2026-10-20"
  tasks: 3
  files: 2
actuals:
  tokens: 5200
  tasks: 3
  commits: 3
---

# Phase 10 Plan 02: The Skip After the Workout Summary

A skipped exercise now reads as skipped wherever Ian looks afterwards. Workout history shows "DB lateral raise — skipped: shoulder", or the done sets with their PR trophy and then "rest skipped: shoulder". The next card for that slot keeps the last real numbers on its Last time line and adds one muted line, "Skipped Oct 13: shoulder", which explains the missing Add weight. Re-opening a finished workout to edit it keeps the skip, and Undo there still gives the sets back.

## What was built

- **index.html**
  - `skipNoteHTML(att)` returns the muted note (skip-forward icon, `Skipped` or `Rest skipped`, the date and the escaped reason in `<em>`), or `''` unless `att.entry.skipped === true`.
  - viewActive computes `skipNoteHTML(lastAttemptEntry(name, i, entry.name))` and renders it inside the `.lasttime` element after `lastLine`. `lastLine` is unchanged.
  - viewHistory: an entry with `skipped === true` reads `<strong>{name}</strong> — <span class="muted">{skipTailHTML(e, k => prIdx.isPR(s, e, k))}</span>` plus the existing deload and note parts. Every other entry keeps today's line.
  - editSession adds `skipped: true` and `reason` (a string, else `''`) to a draft entry whose session entry has `skipped === true`. It adds no `_preSkip` and still saves with `saveLocal()`.
- **test/app.test.js**
  - A 4-check tracer (D-15, D-17, LOG-05), 14 variant checks (D-15, D-17, D-24, T-10-10, T-10-11, long text) and 7 edit-path checks (D-25, LOG-04, T-10-11).
  - Helpers: `lgLastTime` finds the Last time element by class, so it still works when 10-03 turns it into a button. Also `lgNote`, `lgHistLine`, `lgOpen` and `lgCase`.

## Suite lines

- Pre-plan: `1165 passed, 0 failed, 2 skipped`, CSP `sha256-F45WeMURwX/mnNAJyj5+JiHqCs2tcRayiWtbf6EIJH8=`
- After Task 1: `1169 passed, 0 failed, 2 skipped`, CSP `sha256-EXzE1+865LE8hK+QAfJKhhUFxXRANPlPEEUgKYxdOKM=`
- After Task 2: `1183 passed, 0 failed, 2 skipped` (no index.html change)
- Post-plan: `1190 passed, 0 failed, 2 skipped`
- CSP hash after the last task: `sha256-PP7O5aSUm4QAbZZV9jYnDMsf4ZPDW4uzf5xgUPo7Vag=` (`npm run csp:check` OK)

## RED lines

**Task 1** (tests first, before any index.html change, `1167 passed, 2 failed`):
```
FAIL  D-15 tracer (a): Workout history reads the exercise as skipped, with the reason  → ["<strong>DB lateral raise</strong> — ",null]
FAIL  D-17 tracer (c): the Last time element ends with the skip note, its icon and "Skipped {date}: reason"  → "Last time (Jul 31): <strong>25×20,  25×20,  25×20</strong>"
```
(b) and (d) passed at RED, as the plan expected: they pin what must not change.

**Task 2:** no RED. All 14 checks passed on Task 1's code, which already followed `<interfaces>`. Each one was mutation-proved instead (table below).

**Task 3** (tests first, `1184 passed, 5 failed`):
```
FAIL  D-25: editSession carries the skip marker and reason onto the draft, with no _preSkip, and the card shows the skip note with Undo
FAIL  D-25: re-saving without Undo keeps the marker on the same row id  → {"rows":1,"draft":null}
FAIL  D-25/LOG-04: Undo on a re-edited skip takes the no-snapshot path, giving the sets back blank at the nearest weight
FAIL  D-25/LOG-04: re-saving after that Undo writes no marker, and the two empty sets count as blankSets 2  → {"rows":1,"marker":false,"sets":3}
FAIL  D-25: Undo on a re-edited skip keeps a set skipped with its own reason, and brings the others back
```

## Mutation tables

Each mutation was applied in place, the suite run, then the file restored byte for byte (`cmp`), and `csp:check` passed again. The CSP checks always fail while a mutation is in place, so they are left out of this table.

| # | Mutation | Check that went red |
|---|----------|---------------------|
| T1-i | `skipNote` dropped from the Last time element | D-17 tracer (c) |
| T1-ii | viewHistory takes the else branch for every entry | D-15 tracer (a) |
| T2-i | skipNoteHTML tests truthiness instead of `=== true` | T-10-11 mistyped marker |
| T2-ii | `esc(` removed around the reason in skipNoteHTML | T-10-10 hostile reason |
| T2-iii | skipNoteHTML always prints `Skipped` | D-17 "Rest skipped {date}: reason", D-17 "Rest skipped {date}" no colon |
| T2-iv (extra) | viewHistory tests truthiness instead of `=== true` | T-10-11 mistyped marker |
| T2-v (extra) | viewHistory calls `skipTailHTML(e)` with no PR callback | D-15 partial skip with PR trophy |
| T3-i | editSession carry removed | all five Task 3 RED checks above |
| T3-ii (extra) | editSession tests truthiness instead of `=== true` | T-10-11/D-25 string "true" not carried |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing check] The edit path's `=== true` guard had no test**
- **Found during:** Task 3.
- **Issue:** the threat register (T-10-11) names `=== true` in editSession as a mitigation, but no planned check would fail if it became a truthiness test.
- **Fix:** added "T-10-11/D-25: a marker stored as the string "true" is not carried onto the draft by editSession", and proved it with mutation T3-ii.
- **Files modified:** test/app.test.js
- **Commit:** 3507d32

**2. [Test harness] Confetti stub in the tracer and in lgCase**
- **Issue:** a finish or a card that logs a first-time lift can fire the PR confetti, which throws in the harness.
- **Fix:** `confettiBurst = () => {}` in those blocks, the same pattern 10-01 and the PROG block use.

**3. [Process] Task 3's commit type is `fix`**
- The plan calls Task 3 TDD. The RED tests and the fix went into one commit, as in 10-01, so the task stays atomic. The RED lines above are the gate evidence.

## Human checks carried by 10-04

None new. On the phone, the history line and the note should wrap at 380px. 10-04's end-of-phase check covers the Log and History tabs.

## Threat Flags

None. The surface is the one T-10-10 to T-10-13 cover: a synced reason rendered in Workout history and in the note, and synced data re-entering the draft through editSession. Each mitigation has a mutation-proved test.

## Known Stubs

None.

## Commits

- f1b6c70 feat(10-02): show a skipped exercise in Workout history and on the next card
- 192c1be test(10-02): pin every after-workout skip variant
- 3507d32 fix(10-02): keep a skipped exercise skipped when a finished workout is re-edited

## Self-Check: PASSED

- FOUND index.html (`function skipNoteHTML` 1, `skipNoteHTML(lastAttemptEntry(` in viewActive 1, `skipTailHTML(e` in viewHistory 1, `skipped === true` in editSession 1), test/app.test.js
- FOUND commits f1b6c70, 192c1be, 3507d32
- `npm run csp:check` OK, `TZ=America/Chicago npm test` gives `1190 passed, 0 failed, 2 skipped`
