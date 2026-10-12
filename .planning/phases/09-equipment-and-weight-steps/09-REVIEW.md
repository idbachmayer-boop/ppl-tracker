---
phase: 09-equipment-and-weight-steps
reviewed: 2026-10-12T00:00:00Z
re_reviewed: 2026-10-12T00:00:00Z
re_review_range: 879fa37..HEAD
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
  info: 8
  total: 11
resolved:
  - CR-01
  - WR-01
  - WR-02
  - WR-03
  - WR-04
  - WR-05
  - IN-07
status: issues_found
---

# Phase 9: Code Review Report (re-review after fixes)

**Reviewed:** 2026-10-12. The first pass covered `19dc8a4..HEAD`. The re-review covers the fix commits `879fa37..HEAD`
(06aeaa5, 45fb68b, 2ff094d, 955cd5f, b61a959, 019b4fb).
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

`npm test` is green (1126 passed, 0 failed, 2 skipped). I checked every fix by running the real app
in the test-harness sandbox from a scratch script that ends with `process.exit`.

**Resolved and verified:**
- **CR-01.** `exKey` now resolves through `exResolve`. The foreign-session repro now lists one row:
  `[{"id":"dumbbell-curl","name":"Dumbbell curl","n":2}]`. Every direct `.exId` reader goes through
  `exKey`.
- **Hop and cycle handling.** `exResolve` stops on a live row, a missing row, or a non-string or
  empty `mergedInto`. On a cycle it returns the ring's smallest id, so it can't loop.
- **WR-01's three paths.** Each is closed:
  - a row hard-deleted before Phase 9 no longer comes back;
  - Import → Merge of an older backup no longer brings it back;
  - a later live edit no longer beats a tombstone.
- **Cycles.** The cycle-breaker is commutative and idempotent, and stable when a side is replayed
  (two devices merging opposite ways resolve to the later merge either way).
- **Rows and inputs.** A row on only one device survives. No row is ever filtered out, and no input
  is mutated.
- **WR-02 to WR-05.** The behaviour is correct:
  - EZ 20 lb deloads to 15;
  - Barbell 40 deloads to 35;
  - a 2.5 lb dumbbell, a 2.5 lb cable and a 5 lb machine stay put and say `atFloor`;
  - 62 DB → 65, 22 → 22.5, 47 BB → 50;
  - Settings, the picker and the card tag read the row they write.
- **IN-07.** The CLAUDE.md sentence is now consistent.

**Still wrong:** the new alias and tombstone rules in `mergeExercises` break two of the invariants
they claim. An alias can end up with **zero** live owners (WR-07). The new rules are not associative,
so whether a row is permanently tombstoned depends on sync order (WR-08). Neither loses a logged set.
Both can silently re-split or fold an exercise's history, and the result is irreversible. IN-02
(equipAt-tie associativity) is unchanged and still reproduces.

## Resolved

| ID | Fix commit | Verified |
|----|-----------|----------|
| CR-01 | 06aeaa5 | `exListRows()` lists one row for the foreign-session repro, and the draft path is covered by a test. `exResolve` handles chains, cycles, self-loops and non-string `mergedInto` safely. |
| WR-01 | 45fb68b | All three paths reproduce as tombstoned now. The two-device cycle comes out the same in both orders and stays stable when replayed. A one-device row is kept. The two new defects in the same function are listed below as WR-07 and WR-08. |
| WR-02 | 2ff094d | `deloadPlan('Preacher curl',20)` → 15. The ramp at 20 no longer has a rung above the working weight. At 25 and above it still opens with "Empty bar — 25 lb". |
| WR-03 | 955cd5f | Light loads keep their weight and say `atFloor`. A 5.5 lb machine load → 5. `deloadExercise` never blanks the sets. |
| WR-04 | b61a959 | `newW = loadFloor(lastW) + ladderStep(floor)`, so off-ladder loads snap up and on-ladder loads move exactly one step. |
| WR-05 | 019b4fb | Settings and the picker read `exRow(id)`, and the card tag, plates, warm-up and deload read the entry. (Some name-keyed readers are left; see IN-09.) |
| IN-07 | 45fb68b | CLAUDE.md now reads "never spliced out of `DB.exercises`". |

## Warnings

### WR-07 (NEW): A merged-away row's aliases can end up with no live owner, so its name stops resolving and the next pick founds a new row

**File:** `index.html:4605` (tombstone beats live), `index.html:4638-4650` (alias owner rule), `index.html:1516,1527` (`exMerge`)
**Issue:** `exMerge` moves X's aliases onto Y and touches Y. Every registry row still merges whole by
`mtime`, so any later edit to Y on a device that hasn't heard of the merge replaces Y's aliases with
a copy that lacks X's. Such an edit is a rename, or a **Settings → Exercises type change**
(`setExerciseEquip` touches the row), which is a primary Phase 9 flow. X itself is now a tombstone
with `aliases: []`. Nothing owns `'x'` any more.

Reproduced:
- Device A: X is a tombstone into Y; Y has aliases `[y, x]` at mtime 100.
- Device B: X is live with `[x]` at 50; Y is renamed, with `[y, y2]` at 200.
- Both orders give `x(T→y)[]  y[y|y2]`, and `exIdByName('X')` → `null`.

Typing or picking "X" then goes `exEnsure` → a new row `x-2`, because the tombstone owns the slug, and
the D-16 picker may ask again. New sessions split from the merged history, which is the outcome CR-01
and WR-01 set out to prevent. The tombstone-beats-live rule drops aliases the same way: B's
rename-only alias on a stale live X (e.g. `'foo'`) disappears with that copy. This predates the fix
(row-level `mtime` wins was already per-row), but WR-01 claims "never leaves an alias with zero live
owners" and the WR-01 tests never edit the survivor on the stale side.
**Fix:** In `mergeExercises`, build each id's aliases as the **union over all copies of that id**,
live or tombstone. A live row never legitimately loses an alias except to the owner rule, which runs
afterwards. For an id that ends as a tombstone, hand the aliases of its live copies to
`exResolve`-style target resolution over the merged `rows` (follow `mergedInto` to the live
survivor), then run the existing one-owner pass. Add a replay test: A merges X→Y, B renames or
retypes Y. Assert that `exIdByName('X') === 'y'` in both orders, replayed twice.

### WR-08 (NEW): The registry merge is not associative, so whether a row is permanently tombstoned depends on sync order

**File:** `index.html:4605`, `index.html:4638-4650`
**Issue:** The owner pass turns a live row that lost all its aliases into a **synthesized tombstone**
(`deletedAt: mt(into)`, keeping the row's old `mtime`). Under tombstone-beats-live, that tombstone is
permanent, even against a later live copy of the same row. So the outcome depends on which copies
met first.

Reproduced with three copies:
- P: `y[y,k]`@100.
- Q: a stale `x[k]`@50, for example an old backup or a device that never synced.
- R: the same `x` renamed later, `x[k,k2]`@300.

| Order | Result |
|-------|--------|
| (P+Q)+R | `x(T→y)[]  y[y,k]`. Ian's later rename is gone, `'k2'` has no owner (WR-07), and x's sessions fold into y. |
| P+(Q+R) | `x[k,k2]  y[y]` |
| (P+R)+Q | `x[k,k2]  y[y]` |

So one ordering of the same three replicas permanently merges two exercises, and the other keeps
them apart. The comment on `mergeExercises` claims "the result is the same in either order and stable
when replayed". That holds pairwise, but not across three replicas, and the suite's law test never
mixes the owner pass with a stale copy.
**Fix:** Don't let a *synthesized* tombstone gain tombstone-beats-live stickiness. Options:
- mark it (`autoMerged: true`) and let a live copy with a strictly newer `mtime` than the tombstone's
  `deletedAt` beat it;
- stamp the synthesized tombstone's `mtime` and `deletedAt` from its *own* row and let the owner rule
  be recomputed on every merge from the union of aliases (WR-07), so it is a pure function of the set
  of copies.

Extend the law test with three replicas that mix a stale copy, a later live edit and an alias
collision, and assert `content(merge(merge(a,b),c)) === content(merge(a,merge(b,c)))`.

### WR-06 (open, unchanged): The kg warm-up labels the lb bar weight as kg

**File:** `index.html:2348`
**Issue:** It still prints `Empty bar — 45 kg`. The WR-02 change only nulls the bar for an under-bar
lb weight. Ian doesn't use kg (D-10), so the impact is low.
**Fix:** Gate `first`'s bar label on `DB.unit === 'lb'`, as `lbBar` already does.

## Info

### IN-01 (open): `exIdByName` still matches tombstones
**File:** `index.html:1455-1460`. Unchanged. Add `!r.deletedAt && Array.isArray(r.aliases)`.

### IN-02 (open, reconfirmed): A tie on `equipAt` makes the registry merge non-associative
**File:** `index.html:4627-4635`. The `best` pass is unchanged and still keeps the first copy seen on
a tie. `(D1+D3)+D2` → `ez`, but `D1+(D2+D3)` → `cable`. Break ties deterministically, for example by
`EQUIP_TYPES.indexOf`, and add a tied three-replica fixture.

### IN-03 (open): `translateLoad` can suggest an unloadable weight on a bar lift
**File:** `index.html:1020-1024`. `translateLoad(30,5,12,'Barbell bench press')` → 25 lb.

### IN-04 (open): The unit checks are inconsistent
**File:** `index.html:1231`, `1241`, `1265`, `2339`. `=== 'kg'`, `!== 'kg'` and `=== 'lb'` are all still mixed.

### IN-05 (open): Name rules misfile some plausible names
**File:** `index.html:586-592`, `1129`. "Straight bar curl" is still read as a landmine, and "Hang
clean" is still read as bodyweight.

### IN-06 (open): Some tests pin wording
**File:** `test/app.test.js` (the no-"kettlebell"-anywhere grep, the literal CSS values, the exact
coach copy). The fix commits add more exact-copy assertions. One example is the new "Already at the
lightest weight — cut a set or reps instead." test.

### IN-08 (NEW): An under-bar preset lift's warm-up opens with "Bodyweight — no load, 5–10 reps"

**File:** `index.html:2336-2350`
**Issue:** With `bar` nulled for a weight under the bar, the ramp for a 20 lb preset Preacher curl
starts with "Bodyweight — no load / 5–10 reps". That's the bodyweight-lift wording, and it is
nonsense on a curl. The note under the ramp says "Rounded to the nearest 5 lb", which is right.
**Fix:** Add a third branch for an under-bar bar type, for example "Lightest preset bar — a few
reps", or omit the first rung.

### IN-09 (NEW): Some readers still key the type by name, not by entry

**File:** `index.html:1307-1317` (`addWeightInfo`, which calls `weightStep(name, …)` and `loadFloor(name, …)`), `index.html:1020` (`translateLoad(…, entry.name)`), `isStalledSlot`
**Issue:** The WR-05 fix moved the tag, plates, warm-up and deload onto the entry. ⬆ Add weight and
its prefill, and the "→ suggest" line, still resolve the type from the name. In the
split-identity state WR-05 covered, the card tag can say "EZ bar · +5" while Add weight steps on the
other row's ladder.
**Fix:** Pass the draft entry (or `{name, exId}`) through `addWeightInfo` and `translateLoad`, as
`deloadPlan` now does.

---

_Reviewed: 2026-10-12 (re-review of 879fa37..HEAD)_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
