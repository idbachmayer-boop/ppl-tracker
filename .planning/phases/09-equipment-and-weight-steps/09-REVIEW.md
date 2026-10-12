---
phase: 09-equipment-and-weight-steps
reviewed: 2026-10-12T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - index.html
  - test/app.test.js
  - test/harness.js
  - CLAUDE.md
findings:
  critical: 1
  warning: 6
  info: 7
  total: 14
status: issues_found
---

# Phase 9: Code Review Report

**Reviewed:** 2026-10-12
**Depth:** standard (phase-9 diff `19dc8a4..HEAD`; merge-golden fixture skipped as regenerated data)
**Files Reviewed:** 4
**Status:** issues_found

## Summary

`npm test` is green (1102 passed, 0 failed, 2 skipped). The CSP hash is current.

Migration 19 holds up. `stampEquipment` reads only `EQUIP_TYPES`, `EQUIP_DEFAULTS` and the hoisted
`equipGuess`. All three are declared above `MIGRATIONS` and above `let DB = load()` (index.html:550-599,
801-802), so there is no temporal-dead-zone exposure. It is idempotent: a row with a valid type, a
tombstone or a non-object is skipped. It stamps `mtime + 1`, and the bottom-of-script
`if(migrationRan) save()` persists it at boot. The `esc()` and `data-action` hygiene on the picker,
the tag and the Settings select is clean. `equipAsk` is never persisted, and `setExerciseEquip`
touches only the registry before it calls `save()`.

The defects are in the registry's new per-row identity model and in the bar-weight rounding edges.
`exMerge` now writes `mergedInto`, but nothing reads it. As a result, a session or draft that arrives
carrying a merged-away id becomes a permanent ghost exercise that can't be renamed or merged. I
reproduced this against the real app through the harness sandbox. The per-row union also brings back
registry rows that were hard-deleted before Phase 9, and a later live edit beats a tombstone. The
known EZ-bar suspect is confirmed, and the same root cause also produces a wrong deload message on
Ian's real 20 lb Preacher curl.

## Critical Issues

### CR-01: A merged-away exercise id that arrives from another device becomes a permanent ghost that can't be merged or renamed

**File:** `index.html:1448-1454` (`exKey`, `exLabel`), `index.html:1490` (`mergedInto` written, never read), `index.html:2906-2914` (`exListRows`), `index.html:2970-2976` (`doExMerge`)
**Issue:** `exKey(e)` returns `e.exId` as-is. After `exMerge(from, into)`, any logged entry still
carrying `exId: from` keeps resolving to the tombstoned id. These are the entries `exMerge` could not
restamp:
- a session finished on the other device before it received the merge;
- this device's own in-progress draft. `adoptMerged` reattaches it with `keepLocalDraft` and never
  restamps it, so when Ian finishes the workout, the session is saved with the dead id.

`exRow(from)` now returns null because of the new `!x.deletedAt` filter, so:
- `exLabel(from)` returns the raw slug. Settings → Exercises lists an exercise called `db-curl`.
- `exMerge(from, …)` returns false, and `doExMerge` returns silently with no toast (line 2974).
- `renameExercise(from)` returns at `if(!r) return`.
- Charts and PRs group by `exKey`, so the merged lift's history is split again, and no UI action can
  repair it.

Reproduced in the harness: exEnsure both rows, merge `db-curl` into `dumbbell-curl`, then a foreign
session arrives with `exId:'db-curl'`. The result is
`exListRows()` → `[{"id":"dumbbell-curl","name":"Dumbbell curl","n":2},{"id":"db-curl","name":"db-curl","n":1}]`.

Phase 9 added `mergedInto` specifically so the merge could be followed, but no reader was written.
The new tests only cover a stale device with an older `mtime` and no new sessions (app.test.js:8654-8686).
**Fix:** Resolve through the tombstone wherever an identity is computed. Bound the hops so a hostile
cycle can't loop:
```js
function exResolve(id){
  for(let hop=0; id && hop<8; hop++){
    const r = exRows().find(x=>x && x.id===id);
    if(!r || !r.deletedAt || !r.mergedInto) return id;
    id = r.mergedInto;
  }
  return id;
}
function exKey(e){
  if(!e) return '';
  if(typeof e === 'string') return exIdByName(e) || normEx(e);
  return (e.exId ? exResolve(e.exId) : null) || exIdByName(e.name) || normEx(e.name);
}
```
Also add a test that replays a foreign session (and an adopted draft) with the merged-away `exId`,
and assert that `exListRows()` has one row.

## Warnings

### WR-01: The per-row registry union brings back rows hard-deleted before Phase 9, and a later live edit beats a tombstone

**File:** `index.html:4543-4556` (`mergeExercises`), `index.html:4304-4322` (`mergeUnion`), `index.html:1440-1445` (`exIdByName`)
**Issue:** Before this phase, `exMerge` spliced the row out of `DB.exercises`, and the registry rode
along whole from the newer side, so the deletion propagated. Now every row unions by id. Three paths
bring a merged-away row back as live, with an alias that the survivor also owns:
1. **Old hard deletes.** A pre-Phase-9 merge left no tombstone. Any device whose local blob still
   holds the row, or one that ran the old build's `exMerge` while `remoteTooNew` blocked it, puts the
   row back on its next sync. Reproduced: merging `{db-curl, dumbbell-curl}` with
   `{dumbbell-curl(aliases incl. 'db curl')}` yields both rows live, with `'db curl'` on each.
2. **Import → Merge of any backup older than such a merge** (`importMerge` → `mergeDB(backup, DB, true)`)
   does the same, deterministically.
3. **A later live edit.** Device A tombstones X. Device B, not yet synced, renames X or sets its
   equipment, which gives it a later `mtime`. `mergeUnion` takes the newer `mtime`, so X comes back
   live with its aliases and no `deletedAt`. Reproduced: tombstone at mtime 100 against a live copy
   at 200 gives the live row.

Once two live rows share an alias, `exIdByName` returns whichever comes first in array order, and
that order depends on which side was newer by `updatedAt`. Typed names can then resolve to the ghost
and split history again.
**Fix:** After `mergeUnion`, run a deterministic, commutative clean-up in `mergeExercises`:
- A tombstone wins over a live copy of the same id unless the live copy is a deliberate restore.
  Simplest rule: once a copy has `deletedAt`, keep it.
- When two live rows claim the same alias, keep the alias on the row with the newer `mtime`. Turn the
  other row into a tombstone with `mergedInto` set to the survivor, but only if it is left with no
  aliases.

Add a replay test for each of the three paths, in both orders, run twice.

### WR-02: Under-bar lifts: the warm-up's first rung is heavier than the working weight, and a 20 lb preset EZ bar is told it is "already at the empty bar"

**File:** `index.html:2303-2306` (`warmRampHTML`), `index.html:1262-1268` (`deloadPlan`), `index.html:2087`
**Issue:** The known suspect is confirmed in the harness. `warmRampHTML({name:'Preacher curl', sets:[{w:'20'}]})` renders
`Empty bar — 25 lb / ~50% — 10 lb / ~75% — 15 lb / Working — 20 lb`, with the first rung 5 lb above
the working set. That breaks the comment two lines above ("no rung is ever above the working weight").
`clamp` only applies when `w >= bar`, and `first` is unconditional. The same happens on any
barbell-type lift under 45 (`Barbell curl` at 40 gives "Empty bar — 45 lb" plus "Under bar weight"
on every rung). The ramp is only drawn on slot 0, which limits how often this shows.

The deload has the same root cause and is reachable on every slot. Ian's real 20 lb Preacher curl
(D-07) goes `deloadPlan('Preacher curl', 20)` → `{w:20, atBar:true}`. If the slot stalls, the Deload
button leaves the weight unchanged and says "Already at the empty bar — cut a set or reps instead".
That is false: D-07 records preset EZ bars 10 lb apart below 25, so a lighter bar exists.
**Fix:** When the working weight is below the bar, treat the lift as not bar-loaded. In
`warmRampHTML`, render the first rung as "Bodyweight — no load" or omit it when `w < bar`, and clamp
every rung to `w`. In `deloadPlan`, apply the at-bar rule only when `lastW` is within a step of the
bar from above (`bar <= lastW`). For `lastW < bar` on an EZ lift, fall through to the normal 90%
floor so 20 → 15 (or 10 on the preset ladder).

### WR-03: A deload on a light load blanks every set's weight while the card says "Deloaded −10%"

**File:** `index.html:1268`, `index.html:1407-1412` (`deloadExercise`)
**Issue:** `deloadPlan` returns `{w:''}` whenever 90% floors to 0. Reproduced on a 2.5 lb dumbbell
(`deloadPlan('DB curl', 2.5)` → `w:''`) and a 2.5 lb cable stack. A 5 lb machine does the same
(4.5 floors to 0 on a 5 step). `deloadExercise` then writes `st.w = ''` into every unskipped set,
which wipes the prefilled weights, and the coach line still claims a 10% drop. D-11 says "always at
least one step lighter" but has no lightest-weight floor.
**Fix:** If `x <= 0`, return `{ w:lastW, atBar:true }` (or a separate `atFloor` flag with its own
copy, "Already at the lightest weight — cut a set or reps instead"), so the weights stay and the
message is truthful.

### WR-04: "⬆ Add weight" adds the step to an off-ladder weight instead of moving to the next loadable one

**File:** `index.html:1295-1302` (`addWeightInfo`), consumed at `startWorkout` (prefill) and `viewActive`
**Issue:** `newW = v.lastW + weightStep(name, v.lastW)`. D-17 defines the dumbbell step as "the gap
to the next dumbbell on the rack", but the code adds blindly:
- a logged 62 lb dumbbell suggests 67, which isn't on the rack (the next is 65);
- a 22 lb dumbbell suggests 24.5;
- a 47 lb barbell suggests 52.

`startWorkout` prefills that value into the draft, so it can become a logged number.
`loadFloor` and `loadNearest` already exist for exactly this.
**Fix:** `newW = step == null ? null : loadFloor(name, v.lastW + 1e-9) + ladderStep(name, loadFloor(name, v.lastW))`,
or more simply, the smallest ladder value strictly greater than `lastW`:
`const f = loadFloor(name, v.lastW); newW = f + ladderStep(name, f);`. This is equivalent for
on-ladder weights and snaps off-ladder ones up to the next real weight.

### WR-05: Settings → Exercises shows the type looked up by name but writes it by id; the card tag and picker are split the same way

**File:** `index.html:2931` (`const cur = equipOf(r.name)`), `index.html:1458-1461` (`equipOf`), `index.html:2120-2122`
**Issue:** The select's `selected` option comes from `equipOf(r.name)`, which goes
`exKey(name)` → `exIdByName` → the first row owning that alias. The change handler writes
`setExerciseEquip(r.id, …)`. Likewise, the workout card's tag and step resolve by `entry.name`, while
the picker writes to `exKey(entry)` (the `exId`). When the two identities differ, the control shows
one row's type and stores to another. They differ in the duplicate-alias state from WR-01, and when
a name resolves to a different row than the entry's `exId`. In that case, picking a type appears to
do nothing, because the select re-renders with the other row's value.
**Fix:** Read the type by id where the id is known. In Settings, use
`const row = exRow(r.id); const cur = row && EQUIP_TYPES.indexOf(row.equip)>=0 ? row.equip : equipGuess(r.name);`.
Give `equipOf` an id-aware variant, `equipOfEntry(e)`, built on `exRow(exKey(e))`, and use it for the
card tag, `weightStep`, `barStyle` and the warm-up on draft entries.

### WR-06: The kg warm-up labels the lb bar weight as kg

**File:** `index.html:2306`
**Issue:** `barWeight()` returns the lb constants (45 or 25), and `first` prints them with `DB.unit`.
Reproduced in kg: `Empty bar — 45 kg`, followed by a `~75% — 45 kg` rung. `deloadPlan` was
deliberately written to ignore the bar outside lb (line 1265), and `lbBar` does the same for the
clamp, but the first rung was missed. This predates Phase 9, but this phase rewrote the function.
Ian doesn't use kg (D-10), so the impact is low. It is still a wrong number printed to the user.
**Fix:** `const first = (bar > 0 && DB.unit === 'lb') ? … : bar === 0 ? … : …`, or show
"Empty bar" without a number when the unit is kg.

## Info

### IN-01: `exIdByName` still matches tombstones

**File:** `index.html:1440-1445`
**Issue:** It iterates every row, including `deletedAt` ones, and relies on `exMerge` having emptied
their aliases. A tombstone carrying aliases resolves names to a dead id, which then flows into
`exEnsure` → `e.exId` and turns into CR-01's ghost. That can come from a hand-edited backup, or from
an older copy that loses the alias-emptying through a field-level merge in future.
**Fix:** `if(r && !r.deletedAt && Array.isArray(r.aliases) && r.aliases.indexOf(k)>=0)`. The
`Array.isArray` check also stops a string `aliases` from doing substring matching.

### IN-02: The registry merge is not associative when two copies tie on `equipAt`

**File:** `index.html:4546-4555`
**Issue:** `best` keeps the first-seen copy on a tie. With D1 (`ez@50`, mtime 1), D2 (`cable@50`,
mtime 2) and D3 (`machine@0`, mtime 3), `(D1+D3)+D2` gives `ez`, but `D1+(D2+D3)` gives `cable`
(reproduced). The law test (app.test.js:8637-8651) uses all-distinct `equipAt`, so it can't see this.
In practice it needs two choices made in the same millisecond.
**Fix:** Break `equipAt` ties deterministically, for example by `EQUIP_TYPES.indexOf(equip)`, and add
a tied three-device fixture to the law test.

### IN-03: `translateLoad` can suggest an unloadable weight on a bar lift

**File:** `index.html:1020-1024`
**Issue:** The floor is `ladderStep(name, 0)`, not the bar. Reproduced: `translateLoad(30, 5, 12, 'Barbell bench press')` → 25 lb.
The line is display-only, but it is a number nobody can load.
**Fix:** In lb, `Math.max(barWeight(name) || ladderStep(name,0), loadFloor(name, raw))`.

### IN-04: The unit checks are inconsistent

**File:** `index.html:1231`, `1241`, `1265`, `2302`
**Issue:** `weightStep` tests `=== 'kg'`, `loadFloor` tests `!== 'kg'`, and `deloadPlan` and
`warmRampHTML` test `=== 'lb'`. `normalize()` accepts any string unit, so a value that is neither
gets lb steps, the dumbbell rack, and no bar clamp in the same render.
**Fix:** Derive one `const isLb = DB.unit !== 'kg'` (or validate `unit` in `normalize`) and use it
everywhere.

### IN-05: Name rules misfile some plausible custom names

**File:** `index.html:586-592` (`equipGuess`), `index.html:1129` (`LANDMINE_RE`)
**Issue:**
- `/t-?\s?bar/` matches "straigh**t bar** curl" and "Straigh**t-bar** curl". Both are guessed
  barbell, and then `LANDMINE_RE` gives them one-sleeve landmine plate math.
- `\bhang\b` files "Hang clean" and "Hang power clean" as bodyweight, which gives no step and no
  plate line.

The picker pre-selects the guess for unknown names (D-16), so this is mitigated, but a migration-19
guess for a name already in history is applied silently.
**Fix:** Anchor the landmine test, e.g. `/(^|\s)t-?\s?bar\b|meadows|landmine/`, and exclude
`clean|snatch` from the bodyweight `hang` rule.

### IN-06: Some new tests pin wording rather than properties

**File:** `test/app.test.js:8896-8897`, `9182`, `8764-8765`
**Issue:**
- One test asserts the whole of `index.html` never contains "kettlebell". Any future comment
  mentioning kettlebells would fail it.
- One pins the literal CSS `repeat(auto-fit, minmax(88px, 1fr))` and `min-height: 44px`.
- One pins the exact coach copy and the markup of the button that follows it.

CLAUDE.md asks for property assertions over wording. These will go red on harmless edits.
**Fix:** Assert the rendered warm-up output only, and drop the whole-file grep. Assert the grid's
computed intent (the class is present and the buttons carry `day-btn`) rather than the CSS text.

### IN-07: The new CLAUDE.md sentence contradicts itself

**File:** `CLAUDE.md:32-34`
**Issue:** "…`exRow()` reads live rows only, and a registry row is never filtered out." The second
clause means "never removed from the array", but it reads as the opposite of the first clause.
**Fix:** "…`exRow()` reads live rows only; a registry row is never spliced out of `DB.exercises`."

---

_Reviewed: 2026-10-12_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
