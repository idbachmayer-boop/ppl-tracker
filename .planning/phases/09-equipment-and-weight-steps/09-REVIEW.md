---
phase: 09-equipment-and-weight-steps
reviewed: 2026-10-12T00:00:00Z
re_reviewed: 2026-10-12T00:00:00Z
re_review_range: 4c62000..HEAD
iteration: 3
depth: standard
files_reviewed: 4
files_reviewed_list:
  - index.html
  - test/app.test.js
  - test/harness.js
  - CLAUDE.md
findings:
  critical: 0
  warning: 2
  info: 9
  total: 11
blocking_for_ship: 0
resolved:
  - CR-01
  - WR-01
  - WR-02
  - WR-03
  - WR-04
  - WR-05
  - WR-07
  - WR-08
  - IN-02
  - IN-07
  - IN-09
status: issues_found
---

# Phase 9: Code Review Report (final re-review, iteration 3)

**Reviewed:** 2026-10-12. This pass covers fix commits 179e064, 5f46acf, e9dea48 and f8ad36c (`4c62000..HEAD`).
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found. **Nothing here blocks shipping.**

## Summary

`npm test` is green (1136 passed, 0 failed, 2 skipped).

I tested `mergeExercises` with my own model-based fuzzer, separate from the suite's generator. It
simulates 3 to 5 devices doing creates, renames, type changes, `exMerge` (including the rename-clash
path) and syncs through a cloud replica with a strictly increasing clock. It then checks the merge
laws on random 2-, 3- and 4-replica sets drawn from device, cloud and snapshot states. Across 400
histories and 10,000 law checks:

**Hold everywhere:**
- no row dropped and no duplicate id;
- no spelling with two live owners;
- no spelling with zero live owners;
- no tombstone left dangling;
- idempotent (`M(ab,ab) = ab`) and stable on replay (`M(ab,b) = ab`);
- no `lost` growth beyond the set of spellings that ever existed;
- an `exMerge` tombstone is never revived, except as the documented cycle-breaker target. All 199
  such cases were opposite merges.

**Commutative:** always on content. One case differed only in alias array order, which is cosmetic
because `exIdByName` uses `indexOf` (IN-11).

**Associative:** not universally. All 97 failures fall into two classes. Both need Ian to merge the
**same** exercise on two devices, with conflicting targets, before either device syncs. No other
class appeared (WR-09).

`autoMerged` rows are handled correctly by the views:
- `exRow` returns null (`deletedAt`).
- `exIdByName` never matches them (`aliases: []`, and `lost` is never read outside the merge).
- `exResolve` follows their `mergedInto`, so `exListRows` lists the owner, not a ghost.
- No app path can edit one: rename, type and merge all go through `exRow`.

**IN-09 changed no history matching.** `addWeightInfo` still matches history and range by `name`.
Only the step and ladder read `who`. `startWorkout` passes an entry with no `exId`, which resolves
exactly like the name.

## Resolved

| ID | Commit | Verified |
|----|--------|----------|
| CR-01 | 06aeaa5 | `exResolve` handles chains, cycles, self-loops and bad `mergedInto`, and the ghost repro lists one row. |
| WR-01 | 45fb68b | All three resurrection paths are closed. The fuzzer found no revived `exMerge` tombstone outside cycle-breaking. |
| WR-02 to WR-05 | 2ff094d, 955cd5f, b61a959, 019b4fb | Verified in the previous pass and unchanged since. |
| WR-07 | 179e064 | Claims are now the union of every copy's `aliases` and `lost`, and a tombstone's claims go to its survivor. The repro now resolves "X" to y in both orders. The fuzzer found zero spellings with no owner. |
| WR-08 | 5f46acf | `autoMerged` tombstones are read back as live and recomputed on every merge. The P/Q/R repro gives one result in all orders. The remaining non-associativity is WR-09. |
| IN-02 | e9dea48 | A tie goes to the type that sorts first, and the pair is carried intact. D1/D2/D3 give `cable@50` in all orders. See IN-10 for a side effect. |
| IN-07 | 45fb68b | The CLAUDE.md wording is now consistent, and it is updated again for `autoMerged`. |
| IN-09 | f8ad36c | Add weight, its prefill and the "→ suggest" line step on the entry's row. History matching is unchanged (see Summary). |

## Warnings

### WR-09 (NEW, not blocking): Conflicting concurrent merges of the same exercise are still order-dependent

**File:** `index.html:4607-4712` (`mergeExercises`), `test/app.test.js` (WR-08's "associative over 400 seeded trials" claim)
**Issue:** The fuzzer found two classes of grouping-dependent results, and only these two.

1. **The same row merged into two different targets on two devices** ("multitarget"). A merges Fly→Curl,
   B merges Fly→Row, and C still holds a stale live Fly with an extra spelling. Reproduced:
   - `(A+B)+C` and `A+(B+C)` put `pec fly` on **row**.
   - `(C+A)+B` puts `pec fly` on **curl**.

   In every order, Fly's sessions (`exResolve('fly')`) go to **Row**, but the spelling "fly" is owned
   by **Curl**, because Curl's newer copy carries A's claim. Old Fly history therefore sits under Row,
   while picking "Fly" again logs under Curl.

   Cause: once an intermediate merge has picked a winning tombstone, it copies that tombstone's claims
   into its survivor's `aliases` and drops their origin. When a different tombstone wins later, those
   spellings stay on the first survivor.
2. **Opposite merges (a cycle) plus a later live edit.** P merges x→y, Q merges y→x, and R renames x at
   mtime 300. Reproduced: `(P+Q)+R` and `P+(Q+R)` revive x named "X renamed"@300, but `(R+P)+Q` revives
   it as "X"@200. In R+P, the tombstone beats R's live copy, so the rename's name is gone before the
   cycle revives x. Its spellings survive through claims.

No logged set is lost in either class. Every spelling keeps exactly one live owner. Results are
idempotent and stable on replay, and every device converges through the one cloud doc. What depends
on sync order is which survivor ends up with a stray spelling, or the revived row's name. Both need
Ian to merge the same exercise twice, differently, on two devices before either syncs.

The suite's WR-08 tests pass because their generator never produces two `exMerge` tombstones for one
id with different `mergedInto`. The claim "associative in all 12 orders" is true for that generator,
not for the merge.
**Fix (post-ship):** Either keep provenance for claims routed through a tombstone, for example store
them on the tombstone and re-route them on every merge instead of writing them into the survivor's
`aliases`, or narrow the documented law and the test name to exclude conflicting concurrent merges.
Also add the two repros above as fixed fixtures that assert the documented outcome.
**Ship impact:** not blocking.

### WR-06 (open, not blocking): The kg warm-up labels the lb bar weight as kg

**File:** `index.html:2354`
**Issue:** It still prints "Empty bar — 45 kg". Ian logs only lb (D-10).
**Fix:** Gate the bar label on `DB.unit === 'lb'`.
**Ship impact:** not blocking.

## Info (none blocking)

### IN-01 (open): `exIdByName` still scans tombstones
**File:** `index.html:1458-1463`. This is safe today, because every tombstone path empties `aliases`.
Add `!r.deletedAt && Array.isArray(r.aliases)` as defence in depth.

### IN-03 (open): `translateLoad` can suggest a weight below the bar on a bar lift
**File:** `index.html:1020-1024`. For example, 25 lb on Barbell bench press.

### IN-04 (open): The unit checks are inconsistent
**File:** `index.html:1231`, `1241`, `1265`, `2339`.

### IN-05 (open): Name rules misfile some plausible names
**File:** `index.html:586-592`, `1129`. "Straight bar curl" is read as a landmine, and "Hang clean" as bodyweight.

### IN-06 (open): Some tests pin wording
**File:** `test/app.test.js`. Examples: the no-"kettlebell" grep over the whole file, the literal CSS
values, and the exact coach copy.

### IN-08 (open): An under-bar preset lift's warm-up opens with "Bodyweight — no load, 5–10 reps"
**File:** `index.html:2338-2356`.

### IN-10 (NEW): An `equipAt` tie at 0 now picks the type that sorts first, which can be the stale name's guess
**File:** `index.html:4648-4659` (`typeOver`)
**Issue:** Copies tied at `equipAt` 0 come from migration-19 guesses made on differently named copies.
A tie now goes to the alphabetically first type, not the newest name's guess. So "Machine fly"
(renamed, `machine@0`) merged with a stale "DB fly" (`dumbbell@0`) reads as dumbbell. This is a
default only. Ian's own choice (`equipAt` > 0) always wins, and the D-05 tag shows the type, so a
wrong default is easy to see and change. The pair is carried intact, which is why the fix stays
associative.
**Fix:** Optional. Re-guess from the winning row's name when the winning clock is 0.

### IN-11 (NEW): Alias order can differ by side on an `mtime` tie
**File:** `index.html:4692-4700`
**Issue:** When a recomputed `autoMerged` copy ties on `mtime` with a live copy, `base` comes from
whichever side `mergeUnion` prefers, so `aliases` can come out in a different order. The fuzzer hit
this once in 10,000 checks. It has no behavioural effect.
**Fix:** Optional. Sort `keep` fully.

---

_Reviewed: 2026-10-12 (iteration 3, 4c62000..HEAD)_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
