---
phase: 10-log-page-history-and-skip
reviewed: 2026-10-20T12:50:38Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - index.html
  - test/app.test.js
  - test/harness.js
  - CLAUDE.md
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
status: issues_found
---

# Phase 10: Code Review Report

**Reviewed:** 2026-10-20T12:50:38Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

I reviewed the Phase 10 diff (`12de235..HEAD`), covering the exercise skip and Undo, the skip display in history, the next card and editSession, and the inline history panel with its chart link and scroll return. I also read the functions it calls: `lastRealEntry`, `lastAttemptEntry`, `addWeightVerdict`, `stallStreak`, `prSetIndex`, `exercisesWithData`, `sessionExercises`, `normalizeDraft`, `finishWorkout`, `editSession`, `go`/`setSub` and `sessionRows`.

The code passes every project rule I checked:
- **Escaping:** every user string goes through `esc()` into text nodes. The new attributes hold only `esc(i)` indexes and static text.
- **Event handlers:** no inline handlers, no names built at runtime, no `stopPropagation`. The five new `ACTIONS` wrappers only decode `data-i` and never touch `DB`.
- **Draft rule:** skip and Undo persist with `saveLocal()`. `_preSkip` is stripped in `finishWorkout`. The panel and return state are module `let`s, never in `DB`.
- **Soft deletes:** `exerciseRecent` reads through `liveSessions()`.
- **Theme:** the new CSS uses only `:root` variables.
- **CSP:** `npm run csp:check` reports the hash is current. `npm test`: 1240 passed, 0 failed, 2 skipped.

I found no blockers. The three warnings are cases where the skip record does not do what LOG-05 promises: Ian is told the wrong thing next time, or a deload is silently lost. I reproduced WR-01 and WR-02 with a harness probe; the observed output is quoted in each.

## Warnings

### WR-01: Editing a past session, the skip note reports the edited session's own skip

**File:** `index.html:2144` (with `lastAttemptEntry` at `index.html:1294`)
**Issue:** `skipNoteHTML(lastAttemptEntry(name, i, entry.name))` never excludes `DB.draft.editRef`. D-05 keeps the edited session out of its own history, and `exhPanelHTML` honours that by passing `DB.draft.editRef` to `exerciseRecent`. The skip note does not.

Repro: open the latest PUSH 1 session, whose lateral raise was skipped "shoulder" on Aug 6, through `editSession`, then tap Undo. The card now reads `Skipped Aug 6: shoulder` under Last time (probe: `skip note on card: true`). That text describes the very skip Ian just undid. Editing an older session has a related problem: the note can name a session dated after the one being edited.

The Last time line's own `lastRealEntry` has the same self-reference (probe: `Last time (Aug 6)`), but that predates this phase. The skip note is new, and it makes a claim the user just reversed.
**Fix:** Pass the edited id through, and skip it in the attempt lookup the same way `exerciseRecent` does:
```js
function lastAttemptEntry(workout, slotIndex, exName, skipId){
  const ls = liveSessions(), key = exKey(exName);
  for(let i=ls.length-1;i>=0;i--){
    const s=ls[i];
    if(s.workout!==workout || s.skipped || !Array.isArray(s.entries)) continue;
    if(skipId && s.id === skipId) continue;
    ...
// viewActive
const skipNote = skipNoteHTML(lastAttemptEntry(name, i, entry.name, DB.draft.editRef));
```
Ideally also limit it to sessions dated on or before `DB.draft.date` when `historical` is set. Add a test that edits the newest skipped session, taps Undo, and asserts no skip note.

### WR-02: A deload plus a partial skip shows "Add weight" next time and drops the skip note

**File:** `index.html:2352` (`skipExercise`) and `index.html:1300` (`lastAttemptEntry`)
**Issue:** `skipExercise` clears `deload` only when no set was done (D-22). When at least one set was done, the session is saved as `deload: true, skipped: true`. Then `lastAttemptEntry` passes over it (`|| e.deload) continue`), so two things go wrong next time:
- **The skip note disappears.** `skipNoteHTML` gets the previous attempt or `null`, so the "Rest skipped …: shoulder" line never shows.
- **Add weight comes back.** `addWeightInfo` judges the session from before the deload, so ⬆ Add weight can return.

Repro (probe): an earlier session at 25×20 ×3. Today: deload, log 1 set, skip the rest with "shoulder", finish. The next PUSH 1 card prints `⬆ Add weight` and no skip note (`Add weight flag: true  skip note: false`).

This is the outcome LOG-05 and D-09/D-17 exist to prevent: Ian stops for a shoulder and the next card tells him to load up. D-22 fixed this only for the no-sets-done case.
**Fix:** Let a skipped entry always count as an attempt, deloaded or not. Then `skipExercise` no longer needs to clear `deload` at all, which also fixes WR-03's lost deload:
```js
// lastAttemptEntry
if(!e || exKey(e)!==key || (e.deload && e.skipped!==true)) continue;
```
`addWeightVerdict` already blocks on any skipped set, so the entry blocks Add weight and `skipNoteHTML` shows it. Then drop `if(!e.sets.some(...)) e.deload = false;` from `skipExercise`. The `_preSkip.deload` snapshot is no longer needed for that purpose. Add a test that replays deload, one set, skip, finish, next card.

### WR-03: Undo after re-editing a session cannot restore a cleared deload, and it un-skips reasonless single-set skips

**File:** `index.html:2361-2377` (`unskipExercise` no-snapshot branch), `index.html:2771` (`editSession`)
**Issue:** `editSession` deliberately brings no `_preSkip`, so Undo there takes the per-set path. That path loses information in two ways:
1. **The deload is lost.** If the original skip cleared `deload` (no done set, D-22), the re-edited entry has `deload:false`. If Ian taps Undo and fills in the sets he actually did at the deload weight, the session is saved as a non-deload session. `lastRealEntry` then takes those lighter numbers as the baseline to beat, and `stallStreak` reads them as "lighter". That breaks the "deloads never reset the baseline" rule (`index.html:1005`).
2. **Deliberate single-set skips are undone too.** A set Ian skipped on its own *without* a reason looks exactly like a set the exercise skip marked. Both come back as live sets refilled with `nearWeight`. Re-saved untouched, they become `blankSets` and the individual skip record is gone.
**Fix:** The WR-02 fix removes cause 1: once `skipExercise` stops clearing `deload`, the saved entry keeps it and `editSession` already carries `deload:!!e.deload`. For cause 2, the per-set path cannot tell the two kinds of skip apart from the saved data. Either accept that and say so in the D-25 comment, or add an additive per-set marker when the exercise skip marks a set (for example `byEx:true`), strip it in `finishWorkout` only if the marker is not wanted in sessions, and un-skip only those sets.

## Info

### IN-01: `skipTailHTML` treats a set with a missing `r` as done

**File:** `index.html:2384`
**Issue:** `done` filters with `x.r!==''`, so a set whose `r` is `undefined` or `null` counts as done and renders `25×undefined`. This can come from a hand-edited backup, which `validateBackup` accepts by shape. `exhRowHTML` on line 2412 guards `x.r != null`, and `workedSets()` already encodes the right rule. The three renderers of the same entry disagree on malformed input.
**Fix:** `const done = all.map((x,k)=>({x,k})).filter(({x})=> x && !x.skipped && x.r!=='' && x.r!=null);` (and the same in `skipNoteHTML`'s `done`).

### IN-02: The history panel label counts rows, not sessions

**File:** `index.html:2428`
**Issue:** `exerciseRecent` pushes one row per matching entry. An exercise logged twice in one session (a main slot plus an accessory, or two slots that resolve to the same `exKey`) gives two rows, and the label reads "Last 2 sessions" for one session.
**Fix:** Count distinct sessions for the label (`new Set(rows.map(r=>r.s)).size`), or word it as entries.

### IN-03: The panel's toggle gate and its rows resolve the exercise differently

**File:** `index.html:2120-2121`, `index.html:2148`, `index.html:2424`, `index.html:2789`
**Issue:** The gate (`ref || alt`) comes from `lastRealEntry(name, i, entry.name)` and `lastAnywhere(entry.name)`. Both resolve a bare *name* through `exIdByName`. The rows (`exerciseRecent(exKey(entry))`) and the chart link (`exKey(e)`) resolve the *entry*, `exId` first. When those disagree (the WR-05 case of an entry whose name spells another row's alias), the line can be a tappable toggle whose panel says "No other sessions of this exercise yet", while Last time shows numbers.
**Fix:** Pass the entry, not `entry.name`, wherever the card asks for its identity, or compute `const key = exKey(entry)` once and use it for the gate as well.

### IN-04: The CLAUDE.md `_`-field invariant is broader than its enforcement

**File:** `CLAUDE.md:61-63`, `index.html:2520-2534`
**Issue:** The new text says a draft-only field "on an entry or a set starts with `_` … `finishWorkout` strips every one". `stripDraftOnly` runs only on main `entries` and their sets. Accessory entries in `extras` are copied into the session as the draft's own objects (`extras:x`, with `x[w].sets` filtered in place), and so is `stairs`. Neither is stripped, and the test at `test/app.test.js:10066` checks only `entries`. No `_` field is written to extras today, so nothing leaks yet. But the next `_cel`-style flag on an accessory set would reach the synced session while the docs say it can't.
**Fix:** Strip extras too (`Object.keys(x).forEach(w=>{ stripDraftOnly(x[w]); x[w].sets = x[w].sets.filter(s=> s.r!=='').map(s=> stripDraftOnly(Object.assign({}, s))); })`) and extend the test, or narrow the CLAUDE.md sentence to "a main entry or its sets".

---

_Reviewed: 2026-10-20T12:50:38Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
