---
status: testing
phase: 10-log-page-history-and-skip
source: [10-VERIFICATION.md]
started: 2026-10-20T14:06:07Z
updated: 2026-10-20T14:06:07Z
---

## Current Test

number: 1
name: Inline history on the Log card
expected: |
  Phone first: Settings → This version ends with 9a4e647. Tap Last time on two cards in turn: only one panel is open at a time, up to 5 rows labelled by workout, with deload/skip/PR/note markers.
awaiting: user response

## Tests

### 1. Inline history on the Log card
expected: Settings → This version ends with 9a4e647. Tapping Last time on two cards shows one panel at a time, up to 5 rows labelled by workout, deload/skip/PR/note markers visible.
result: [pending]

### 2. Full chart and the way back
expected: Full chart in Strength opens that exercise's chart. Back to workout, and separately Train → Log, land on Log at the same scroll spot with the panel open, collapsed cards still collapsed, every set unchanged. (If only the scroll lands at the top: known assumption A1, deferred-scroll fix, not a revert.)
result: [pending]

### 3. Skip survives a real restart
expected: Skip an exercise after one logged set (reason optional), swipe the PWA away and reopen: still skipped. Undo restores the sets exactly. Skip again and finish.
result: [pending]

### 4. After the workout
expected: Workout history shows the skip line ("… rest skipped: reason"). Next session's card shows no ⬆ Add weight, the real Last time numbers, and a muted "Rest skipped {date}: {reason}" line.
result: [pending]

### 5. Layout at phone width (~380px)
expected: Exercise header with the skip icon, the open history panel, and a skipped card all fit with no overflow or clipping.
result: [pending]

### 6. Accept the two rules the review fixes bent
expected: Ian accepts that WR-01/WR-02 modified lastAttemptEntry (10-01 said not to) and that WR-02 reads the exercise-level skip marker in one judgement. Both have regression checks; old builds still judge from per-set flags.
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
