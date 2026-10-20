---
phase: 10-log-page-history-and-skip
fixed_at: 2026-10-20T00:00:00Z
review_path: .planning/phases/10-log-page-history-and-skip/10-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 10: Code Review Fix Report

**Fixed at:** 2026-10-20
**Source review:** .planning/phases/10-log-page-history-and-skip/10-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 3 (WR-01, WR-02, WR-03)
- Fixed: 3
- Skipped: 0
- Info findings IN-01..IN-04: Ian accepted them, so they were not fixed (listed below)

**Verification:** run in the session worktree `claude/bold-mcclintock-f1c7e4` itself. The caller said
not to switch branches, so no nested review-fix worktree was made, and the numbers can be reproduced from
this tree. After every change to the inline script I ran `npm run csp:hash` and then `npm run csp:check`
(OK). `TZ=America/Chicago npm test` went from 1240 passed to **1245 passed, 0 failed, 2 skipped**. I
proved each new regression test red by reverting that fix's `index.html` change, saw it fail, and
restored the fix.

## Fixed Issues

### WR-01: Editing a past session, the skip note reports the edited session's own skip

**Files modified:** `index.html`, `test/app.test.js`
**Commit:** b22496b
**Applied fix:** `lastAttemptEntry` takes an optional `skipId`. `viewActive` passes
`DB.draft.editRef` when it builds the skip note, the same way `exerciseRecent` keeps the edited session
out of the history panel (D-05).

I did not add the reviewer's optional "dated on or before `DB.draft.date`" limit. The history panel has
no date limit, and neither does the Add weight flag that the note explains. Only the self-reference was
wrong.

`addWeightInfo` still judges from the edited session itself. That is the older self-reference the review
also notes for `lastRealEntry`, and it is out of scope here.

**Test:** `WR-01/D-05: editing the newest skipped session and tapping Undo shows no skip note for that
same session`. The positive control is the same history on a fresh card, which shows the note. With the
fix reverted, the edited card shows `Rest skipped Aug 4: shoulder`.

### WR-02: A deload plus a partial skip shows "Add weight" next time and drops the skip note

**Files modified:** `index.html`, `test/app.test.js`
**Commit:** e9f4caa
**Status:** fixed: requires human verification (logic change)
**Applied fix:** The fix does not follow the review's suggestion, because that suggestion conflicts with
a locked decision. D-22 in 10-CONTEXT.md says: "A skip with no done set clears `deload` … When some sets
were done, the deload stays." The review's fix would have removed that clearing from `skipExercise`. I
kept D-22 exactly as written and changed only the lookup.

`lastAttemptEntry` now passes over a deload only when it lacks the exercise-skip marker:
`(e.deload && e.skipped!==true)`. Here is how each case now behaves:
- **Deload, some sets done, rest skipped:** the deload stays on the saved entry (D-22). The entry now
  counts as the slot's last attempt. `addWeightVerdict` blocks Add weight on its skipped sets, and the next
  card shows "Rest skipped {date}: reason".
- **Deload, nothing done, all skipped:** D-22 still clears the deload, as before.
- **Deload with no skip marker:** still passed over, as before.

The existing check "a deloaded attempt never produces a skip note, even one carrying the marker" pinned
the bug, so it now asserts the opposite. Two checks were added:
- a deload with no marker still gives no note;
- a real-path replay: an earlier 25×20 ×3, then Deload, one set, skip the rest for "shoulder", Finish.
  The next card keeps the saved deload, shows the skip note, and has no ⬆ Add weight. Its positive
  control is the flag before the skip.

With the fix reverted, both WR-02 checks go red (`flag:true, note:null`).

### WR-03: Undo after re-editing a session cannot restore a cleared deload, and it un-skips reasonless single-set skips

**Files modified:** `index.html`, `test/app.test.js`
**Commit:** d410e44
**Status:** fixed: requires human verification (logic change, plus a new additive synced field)
**Applied fix:** The review says the WR-02 fix removes cause 1. That only holds if D-22 is dropped, and
D-22 is kept, so cause 1 needed its own fix. Both causes come down to the same gap: once `_preSkip` is
stripped, the saved session cannot say what the skip did. So the skip now leaves two additive markers,
and they reach the session:
- `exSkip: true` on each set the exercise skip marked;
- `skipClearedDeload: true` on the entry when D-22 cleared a deload.

What changed in each function:
- **`editSession`** carries both markers onto the draft, and only with the boolean-`true` skip marker.
- **`unskipExercise`, no-snapshot path** (D-25) un-skips only the `exSkip` sets, so a set Ian skipped on
  its own stays skipped, with or without a reason. It also restores `deload` when `skipClearedDeload`
  is set.
- **Fallback:** an entry with no `exSkip` set at all keeps the old reason-based rule. That covers a
  hand-edited backup, and the existing D-25 test fixture built without the marker.
- **`unskipExercise`, both paths** remove both markers.
- **`finishWorkout`** keeps each marker only as the boolean `true`, and only while the entry is still a
  skip.

The data rules hold: `SCHEMA` stays 19, and `mergeDB`, `validateBackup` and the merge golden fixture are
unchanged. The markers are additive (D-09). An older build ignores them, and it still judges Add weight
from the per-set `skipped` flags. The export does not print either marker: the D-18/D-23 export check
now lists `exSkip` and `skipClearedDeload` among the strings that must not appear.

One existing check pinned the exact shape of a skipped set (`D-08/D-11 … rest skipped: shoulder`). Its
expected object now includes `exSkip: true`.

**Tests:**
- `WR-03/D-22`: Deload, skip with nothing done, Finish. The session is saved with `deload:false`, which
  confirms D-22 still holds. Re-edit and Undo: the draft gets the deload back. Fill 22.5×20 ×3 and
  re-save: the session saves as a deload with no leftover markers, and `lastRealEntry` still returns the
  25 lb session from a week before.
- `WR-03`: One set done, set 2 skipped on its own with no reason, then the exercise skip for "shoulder".
  Only set 3 carries `exSkip`. Re-edit and Undo bring back only set 3. Re-saving keeps set 2 skipped and
  stores `blankSets: 1`.

With the fix reverted, all three affected checks go red.

## Accepted, Not Fixed (Info, out of scope)

Ian accepted these. Their fixes are not in this pass.

### IN-01: `skipTailHTML` treats a set with a missing `r` as done
**File:** `index.html` (`skipTailHTML`, `skipNoteHTML`)
**Reason:** accepted by Ian, not fixed.

### IN-02: The history panel label counts rows, not sessions
**File:** `index.html` (`exhPanelHTML` label)
**Reason:** accepted by Ian, not fixed.

### IN-03: The panel's toggle gate and its rows resolve the exercise differently
**File:** `index.html` (`viewActive` gate, `exerciseRecent`, `openExerciseChart`)
**Reason:** accepted by Ian, not fixed.

### IN-04: The CLAUDE.md `_`-field invariant is broader than its enforcement
**File:** `CLAUDE.md`, `index.html` (`finishWorkout` `stripDraftOnly`)
**Reason:** accepted by Ian, not fixed.

---

_Fixed: 2026-10-20_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
