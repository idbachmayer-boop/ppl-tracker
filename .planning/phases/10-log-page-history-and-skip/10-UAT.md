---
status: diagnosed
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
  root_cause: "Four causes. (1) Global svg{display:block} (index.html:219, the weight-chart rule) leaks into Phosphor .ph icons (index.html:199 never sets display), so the how-to arrow-square-out icon inside the inline <a> starts its own line; the same leak puts the Last time caret and the per-set .skip-note icon on their own lines. (2) .ex-head (index.html:94) is flex with justify-content:space-between and no grow on the meta, so leftover width lands between how-to and the skip button. (3) .ex-skip (index.html:84) is a 32px box with its glyph pinned left by (1), plus margin-right:4px and template whitespace, so gaps are 25px vs 4px. (4) The template puts the Add weight flag after a <br> in the nowrap right column (index.html:2192), so it wraps under the badge and can squeeze the meta to 5 lines with long flags. (1),(2),(4) predate Phase 10; 10-01 widened the rigid column by 40px."
  artifacts:
    - path: "index.html"
      issue: "svg{display:block} at 219 leaks into .ph (199); .ex-head space-between at 94; .ex-skip sizing at 84; header template 2187-2194 (nowrap column, whitespace nodes, <br>+flag)"
    - path: "test/app.test.js"
      issue: "D-12 test at 9817-9824 pins the literal inline-style wording of the right column; must be retargeted to the property"
  missing:
    - "Icons render inline inside text (scoped .ex-meta .ph, or global .ph with a visual check across screens)"
    - "A deliberate header structure at 380 and 412px: either one line, or title+controls row then a targets row (badge + flag) — Ian to choose"
    - "Controls as a tight, evenly spaced group with centred glyphs"
    - "npm run csp:hash (the header template is inside the inline script)"
  debug_session: .planning/debug/log-card-header-spacing.md
  decision: "Ian chose 2026-10-22: TWO ROWS (row 1 = meta/how-to left, skip + collapse as a tight right-pinned pair aligned with the per-set skip/× column; row 2 = rep-range badge + Add weight flag together, flex-wrap, left-aligned, no <br>) and fix the icon display GLOBALLY (.ph inline, so the Last time caret, skip-note icon and Warm-up/Rest icons also sit inline), with a visual check across the affected screens."
