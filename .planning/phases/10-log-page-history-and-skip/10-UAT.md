---
status: complete
phase: 10-log-page-history-and-skip
source: [10-VERIFICATION.md]
started: 2026-10-20T14:06:07Z
updated: 2026-10-22T11:40:33Z
---

## Current Test

[testing complete]

## Tests

### 1. Inline history on the Log card
expected: Settings → This version ends with 9a4e647. Tapping Last time on two cards shows one panel at a time, up to 5 rows labelled by workout, deload/skip/PR/note markers visible.
result: pass

### 2. Full chart and the way back
expected: Full chart in Strength opens that exercise's chart. Back to workout, and separately Train → Log, land on Log at the same scroll spot with the panel open, collapsed cards still collapsed, every set unchanged. (If only the scroll lands at the top: known assumption A1, deferred-scroll fix, not a revert.)
result: pass

### 3. Skip survives a real restart
expected: Skip an exercise after one logged set (reason optional), swipe the PWA away and reopen: still skipped. Undo restores the sets exactly. Skip again and finish.
result: pass

### 4. After the workout
expected: Workout history shows the skip line ("… rest skipped: reason"). Next session's card shows no ⬆ Add weight, the real Last time numbers, and a muted "Rest skipped {date}: {reason}" line.
result: pass

### 5. Layout at phone width (~380px)
expected: Exercise header with the skip icon, the open history panel, and a skipped card all fit with no overflow or clipping.
result: issue
reported: "There is awkward spacing for the skip, history, and other buttons on the workout screen - can those be cleaned up so that they are all either on one line or separate lines?" (screenshot, Android ~412px: the card header wraps; the chart/external-link icon drops to a second line under "Biceps · Normal curl · how-to", the skip icon and collapse chevron float mid-row with wide gaps before the rep-range pill, and on the next card the ⬆ Add weight badge wraps onto its own line)
severity: cosmetic

### 6. Accept the two rules the review fixes bent
expected: Ian accepts that WR-01/WR-02 modified lastAttemptEntry (10-01 said not to) and that WR-02 reads the exercise-level skip marker in one judgement. Both have regression checks; old builds still judge from per-set flags.
result: pass

## Summary

total: 6
passed: 5
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps
- gap_id: G-10-5
  truth: "Exercise header with the skip icon, the open history panel, and a skipped card all fit with no overflow or clipping."
  status: failed
  reason: "User reported: awkward spacing for the skip, history and other header buttons on the workout card; wants them all on one line or on clearly separate lines (screenshot: chart icon wraps under the muscle/pattern/how-to text, skip + collapse icons float with uneven gaps before the rep pill, Add weight badge wraps to its own line)"
  severity: cosmetic
  test: 5
  artifacts: []
  missing: []
