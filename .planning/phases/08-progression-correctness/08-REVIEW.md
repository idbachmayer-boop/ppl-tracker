---
phase: 08-progression-correctness
reviewed: 2026-10-10T12:14:13Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - index.html
  - test/app.test.js
findings:
  critical: 0
  warning: 4
  info: 5
  total: 9
status: issues_found
---

# Phase 8: Code Review Report

**Reviewed:** 2026-10-10T12:14:13Z
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Scope: the phase-8 diff (`235210b..HEAD`) in `index.html` and `test/app.test.js`. That covers the add-weight
verdict (`setWeightNum`, `workedSets`, `weightStep`, `lastAttemptEntry`, `addWeightVerdict`, `addWeightInfo`),
`blankSets` recording in `finishWorkout` and `editSession`, the stall rewrite (`sessionSummary`,
`compareSessions`, `slotHistory`, `stallStreak`, `isStalledSlot`), the two `viewActive` call sites, the
`startWorkout` prefill and the guide text. Callers and neighbours were read too: `lastRealEntry`,
`lastAnywhere`, `addSet`, `rmSet`, `skipSet`, `unskipSet`, `exKey`, `sortSessions` and `mergeDB` row handling.
`npm test` passes: 980 passed, 0 failed, 2 skipped.

The core logic matches D-01..D-10:
- The verdict judges the latest attempt.
- Mixed weights block the increase.
- Deloads, skipped days and sessions with a skipped or blank set pause the streak, and a lighter session restarts it.
- Identity goes through `exKey`.
- Bodyweight is no longer dropped.
- New output is escaped.
- `blankSets` lives on a row and merges by `mtime`.

No blocker was found. The four warnings are about robustness and edge cases:
1. `finishWorkout` changes the draft before code that can throw.
2. The total-reps comparison is unsound when the number of sets changes.
3. Blank weights can quietly turn a set into "bodyweight" now that D-02 is enforced.
4. One hostile-data test never reaches the code path that would crash.

## Warnings

### WR-01: `finishWorkout` changes the draft before code that can throw, so a retry erases the blank-set marker

**File:** `index.html:2110-2144`
**Issue:** The new loop writes to `DB.draft.entries` in place. It drops the blank rows and puts `blankSets` on
the **draft** entry. After that, the save still runs code that can throw: `exEnsure`, `exercisePRs()` (which
walks every session, hostile backups included), `sessionRanges`, `prEligible` and `setLoad`. If any of them
throws, `DB.draft` stays changed in memory:
- the blank rows are gone;
- `blankSets` is on the draft, which contradicts the comment at L2330 ("The draft never carries the count itself").

The next `setVal` or `saveLocal()` writes that state to disk. When Ian taps Finish again, the loop recounts
`blank = 0`, because those rows were already dropped, and reaches `delete e.blankSets`. The marker is lost, so a
workout with a set left blank can earn **⬆ Add weight**, which breaks D-01. Dropping rows before a throw was
already possible; this phase makes it decide the progression verdict.
**Fix:** Build the session entries as copies, and leave `d.entries` untouched until the save is committed:
```js
const entries = d.entries.map(e=>{
  const blank = e.sets.filter(s=> !s.skipped && s.r==='').length;
  const out = Object.assign({}, e, { sets: e.sets.filter(s=> s.skipped || s.r!=='').map(s=>{ const c=Object.assign({},s); delete c._cel; return c; }) });
  if(blank>0) out.blankSets = blank; else delete out.blankSets;
  return out;
});
// ... stamp exId on `entries`, then build sess with entries:entries
```
Add a test: make `exercisePRs` throw once, then retry Finish and assert that `blankSets` survives.

### WR-02: Total reps compared across different set counts: removing a set reads as flat, and the next full session hides a real stall

**File:** `index.html:1194-1205`, `index.html:1216-1227`
**Issue:** `sessionSummary` adds up reps over however many sets were worked, and `compareSessions` treats
`reps >= prev.reps + 1` as progress. D-01 makes `rmSet` the deliberate "I'm doing fewer sets today" action:
the removed set is not missing and is not paused. A session with a removed set therefore always reads as
**flat**: 2 sets give about 36 reps against 54. That pushes Ian toward a deload warning for cutting a set for
time, which is what D-10 says must never happen. The following full session then always reads as
**progress** against the short one, which resets a real stall.
- Example: B, B, B-minus-one-set, B gives a streak of 0. That is a genuine stall that is never shown.
- `addSet` does the reverse. An extra set always reads as progress, and the next normal session reads as flat.

The current rule cannot tell "did more sets" from "got stronger". D-03 fixes total reps as the measure but does
not cover a change in set count, and no test covers it.
**Fix:** When the number of worked sets differs from the last counted session, pause, the way a skipped set
pauses. Keep `prev` and leave the streak alone:
```js
if(prev && cur.n !== prev.n) return;   // set count changed: neither flat nor progress (pause)
```
`sessionSummary` would also return `n: worked.length`. Confirm this with Ian, because it extends D-03 and D-10.
Add one test for `rmSet` and one for `addSet`.

### WR-03: A blank weight silently counts as bodyweight on added, unskipped and edit-restored sets, so D-02 blocks ⬆ Add weight

**File:** `index.html:2033` (`addSet`), `index.html:2038-2041` (`skipSet`/`unskipSet`), `index.html:2337` (`editSession` blank rows), `index.html:1095` (`setWeightNum`)
**Issue:** `setWeightNum` maps `w===''` to 0, and `addWeightVerdict` requires every worked set to equal the
heaviest. Three draft paths create a set with an empty weight, and nothing fills it:
- `addSet` pushes `{w:''}`.
- `skipSet` clears `st.w=''`, and `unskipSet` never puts it back.
- `editSession` appends restored blank rows with `w:''`.

`rollWeight` fills empty weights only below a weight that was just edited. So if Ian taps + Add set, or undoes
an accidental skip, and types only reps (the weight looks "the same"), that set is stored as BW. With D-02, three
25 lb sets plus one blank-weight set at 20 reps never earn **⬆ Add weight**, and no message says why. Before this
phase the verdict ignored weights. The D-01 add-set test (test L7816) dodges this by typing a weight into the new
set.
**Fix:** Prefill the weight when the row is created or restored:
```js
function addSet(i){ const ss=DB.draft.entries[i].sets, last=[...ss].reverse().find(s=>!s.skipped && s.w!=='');
  ss.push({w:last?last.w:'',r:'',skipped:false,reason:''}); saveLocal(); render(); }
```
In `skipSet`, keep the weight that was there (`st._w = st.w`) and restore it in `unskipSet`, or prefill from a
neighbouring set. Do the same for the `editSession` blank rows: use the last worked weight. Add a test: + Add set
with only reps typed still earns the flag.

### WR-04: The T-8-08 hostile-data test never reaches the code that would crash; a non-array `sets` on the latest entry throws in `lastRealEntry`

**File:** `test/app.test.js:8103-8114`; `index.html:916`, `index.html:929`
**Issue:** The test sets `list[1].entries[LAT].sets = 'not an array'`, then asserts that `viewActive` neither
throws nor prints NaN. But `lastRealEntry` scans from the newest session and returns at `list[3]`, so it never
reads the bad entry. If that entry were the **latest** session, both of these would throw
`TypeError: e.sets.some is not a function`:
- `lastRealEntry` (`e.sets && e.sets.some(...)`, L916), reached from `startWorkout` and `viewActive`;
- `lastAnywhere` (L929).

That takes out the Log tab. The new phase-8 helpers guard with `Array.isArray`, and so does `editSession` now.
The old helpers they sit beside do not, and the test reads as if the card path were hardened when it is not.
**Fix:** Put the bad entry last as well, at `list[list.length-1]`, and guard both helpers:
```js
if(e && !e.deload && Array.isArray(e.sets) && e.sets.some(x=> x && !x.skipped && x.r!=='')) return {entry:e, date:s.date};
```
Apply the same `Array.isArray` guard in `lastAnywhere` and `sessionExercises`.

## Info

### IN-01: The guide's "Tiebreaker" bullet now contradicts the first bullet

**File:** `index.html:473`
**Issue:** The first bullet now defines progress as "+1 rep in total at the same weight, or more weight". Total
reps is the rule itself, not a tiebreaker, so the "Tiebreaker: total reps — 10+9+8 (27) → 10+10+8 (28)" bullet
suggests there is still some other main measure.
**Fix:** Fold the example into the first bullet ("e.g. 10+9+8 → 10+10+8 counts") and delete the Tiebreaker bullet.

### IN-02: Restored blank rows in `editSession` move to the end of the set list

**File:** `index.html:2334-2337`
**Issue:** Blank rows are appended after every stored set, so a blank set 2 comes back as set 3, and set 3's
numbers now sit in row 2. For an entry with nothing worked and `blankSets >= 2`, `rmSet` cannot remove the
last row (`length<=1`), so `blankSets` can never get back to 0 through the editor. The verdict does not change,
because an entry with nothing worked is blocked and paused anyway.
**Fix:** Mention it in the toast or leave it; this is cosmetic. If it matters, store the blank positions
(`blankAt:[1]`) rather than a count.

### IN-03: The D-07 `noBlank` assertion checks the input, not the output

**File:** `test/app.test.js:8133`
**Issue:** `noBlank` is computed on `settled`, the fixture, which never has `blankSets`. The comparison against
`booted` happens only through the `canon` equality. `noBlank` proves nothing about what `normalize()` produced.
**Fix:** Compute it on `booted.sessions`.

### IN-04: `weightStep` is not the only step seam, and the neighbouring suggestion line prints `DB.unit` unescaped

**File:** `index.html:941`, `index.html:1892`
**Issue:** `translateLoad` still reads `INCREMENT[DB.unit]` directly, so Phase 9 has two places to change, not
one. In the `alt` branch, two lines below the flag that now escapes, `${sug} ${DB.unit}` goes into HTML
unescaped. CLAUDE.md asks for escaping wherever a line is touched, and the test at L7933 shows `DB.unit` can be
hostile.
**Fix:** Route `translateLoad` through `weightStep(name)` and write `${esc(DB.unit)}` on L1892.

### IN-05: A device on an older build drops `blankSets` when it re-saves an edited session

**File:** `index.html:2321-2343` (behaviour of builds before this phase)
**Issue:** Before this phase, `editSession` copied only `name`, `note`, `deload` and `sets`. A phone that has not
updated yet (about 10 minutes after a deploy) and re-saves an edited session writes a row with no `blankSets`,
under a newer `mtime`, and that row wins the merge. The marker disappears for good, and ⬆ Add weight can show up
for that attempt. This is accepted under D-07, but it is not written down anywhere.
**Fix:** Write it down in the 08-02 summary, or the 08-03 phone check, as a known limit across builds. No code change is needed.

---

_Reviewed: 2026-10-10T12:14:13Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
