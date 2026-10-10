---
phase: 08-progression-correctness
fixed_at: 2026-10-10T00:00:00Z
review_path: .planning/phases/08-progression-correctness/08-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 8: Code Review Fix Report

**Fixed at:** 2026-10-10
**Source review:** .planning/phases/08-progression-correctness/08-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope (picked by the user): 3 (WR-01, WR-03, WR-04)
- Fixed: 3
- Skipped: 0 in scope. WR-02 and IN-01..IN-05 are out of scope (see below).

**Verification:** the gates ran in the current working tree
(`.claude/worktrees/gifted-goodall-706ad7`, branch `claude/gifted-goodall-706ad7`), as the orchestrator
asked. No separate review-fix worktree was made, so the numbers can be reproduced from this tree.
Final run: `npm test` 984 passed, 0 failed, 2 skipped (980 before this fix pass); `npm run csp:check` OK.
Each test was written first and failed against the code before its fix. The three WR-04 guards were also
reverted one at a time from a scratchpad copy, and the check failed each time.

## Fixed Issues

### WR-01: `finishWorkout` changes the draft before code that can throw, so a retry erases the blank-set marker

**Files modified:** `index.html`, `test/app.test.js`
**Commit:** 08967bc
**Status:** fixed: requires human verification (it changes save-path logic)
**Applied fix:** `finishWorkout` now builds the session's entries as copies. Each entry and each set is
copied, `_cel` is removed from the copy, and `blankSets` is set on the copy. `exId` is stamped on the
copies, and the session row uses them, so `DB.draft.entries` is not touched until the save commits.
New test: `exercisePRs` throws once. The draft still has its 3 rows and no `blankSets`, and the retry
stores `blankSets: 1` with no ⬆ Add weight next time.
**Not changed:** the draft's `extras` are still filtered in place, as before. They carry no `blankSets`,
so no verdict depends on them.

### WR-03: A blank weight silently counts as bodyweight on added, unskipped and edit-restored sets, so D-02 blocks ⬆ Add weight

**Files modified:** `index.html`, `test/app.test.js`
**Commit:** c6333ee
**Status:** fixed: requires human verification (it changes prefill behaviour)
**Applied fix:** a new `nearWeight(sets, k)` returns the weight of the nearest non-skipped set above that
has one, or else the nearest one below. It follows the way `startWorkout` fills a slot past last time's
sets with the last weight. It is used in three places:
- `addSet` uses it for the new row.
- `unskipSet` uses it when the row's weight is blank. `skipSet` still clears it, and no new field is stored on the set.
- `editSession` uses it for the restored blank rows, which take the last worked weight.

Draft edits still persist with `saveLocal()`. No attribute markup changed: the weight input already
renders `value="${esc(st.w)}"`.

New tests: + Add set, undoing a skip, and an edit-restored row, each with only reps typed, still earn
⬆ Add weight. Two existing checks used to count a blank row as `w === '' && r === ''`: the D-01
editSession check and the T-8-02 1e9 check. They now count `r === ''`, because a restored row carries a
weight now. The property is unchanged: finishWorkout counts a blank set by its empty reps.

### WR-04: The T-8-08 hostile-data test never reaches the code that would crash; a non-array `sets` on the latest entry throws in `lastRealEntry`

**Files modified:** `index.html`, `test/app.test.js`
**Commit:** ccbd4d0
**Applied fix:** an `Array.isArray(e.sets)` guard in `lastRealEntry`, in `lastAnywhere`, and in
`sessionExercises`' accessory filter. `lastRealEntry` changed by that guard only, and DRAFT-05 stays green.
The T-8-08 check also puts `sets: 'not an array'` on the **latest** session and on one of its
accessories. It calls `lastAnywhere` directly and asserts that `sessionExercises` leaves the bad
accessory out.

## Skipped Issues

### WR-02: Total reps compared across different set counts

**File:** `index.html:1194-1205`, `index.html:1216-1227`
**Reason:** out of scope by the user's choice. It needs a product decision from Ian, because it extends D-03 and D-10.
**Original issue:** `rmSet` makes a session read as flat, and `addSet` makes one read as progress, because total reps are compared even when the number of worked sets differs.

### IN-01: The guide's "Tiebreaker" bullet now contradicts the first bullet

**File:** `index.html:473`
**Reason:** out of scope by the user's choice (Info items were not selected).
**Original issue:** total reps is now the rule itself, but the guide still calls it a tiebreaker.

### IN-02: Restored blank rows in `editSession` move to the end of the set list

**File:** `index.html:2334-2337`
**Reason:** out of scope by the user's choice.
**Original issue:** restored blank rows are appended after every stored set, so the set order changes.
For an entry with nothing worked and `blankSets >= 2`, `blankSets` cannot get back to 0 through the editor.

### IN-03: The D-07 `noBlank` assertion checks the input, not the output

**File:** `test/app.test.js:8133`
**Reason:** out of scope by the user's choice.
**Original issue:** `noBlank` is computed on `settled` rather than on `booted.sessions`.

### IN-04: `weightStep` is not the only step seam, and the neighbouring suggestion line prints `DB.unit` unescaped

**File:** `index.html:941`, `index.html:1892`
**Reason:** out of scope by the user's choice.
**Original issue:** `translateLoad` reads `INCREMENT[DB.unit]` directly, and `${sug} ${DB.unit}` is not escaped.

### IN-05: A device on an older build drops `blankSets` when it re-saves an edited session

**File:** `index.html:2321-2343`
**Reason:** out of scope by the user's choice. The review asked for documentation only, no code change.
**Original issue:** a phone on an older build re-saves an edited session without `blankSets` under a newer `mtime`, and that row wins the merge.

---

_Fixed: 2026-10-10_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
