---
phase: 09-equipment-and-weight-steps
fixed_at: 2026-10-12T18:45:30Z
review_path: .planning/phases/09-equipment-and-weight-steps/09-REVIEW.md
iteration: 2
findings_in_scope: 10
fixed: 10
skipped: 0
status: all_fixed
---

# Phase 9: Code Review Fix Report

**Fixed at:** 2026-10-12T18:45:30Z (iteration 1 at 18:25:56Z)
**Source review:** .planning/phases/09-equipment-and-weight-steps/09-REVIEW.md (re-review at 4c62000)
**Iteration:** 2

## Iteration 2

The re-review confirmed CR-01 and WR-01 to WR-05 as fixed. It found two new defects in the WR-01 merge
rules (WR-07, WR-08), reconfirmed IN-02, and raised IN-09. Ian put all four in scope. Each fix shipped
with a test that I watched fail first, and each new guard was mutation-checked (scratchpad copy,
restore, `cmp`).

- **Suite:** 1126 → **1136 passed, 0 failed, 2 skipped**. `npm run csp:check` passes with
  `sha256-c21XVzCcRwMep642eFzbjNWAsgtThZ09OcXShNXTUM8=`.
- **Golden:** unchanged (`git diff --quiet 879fa37 -- test/fixtures/merge-golden.json` exits 0). Ordinary
  rows pass through the merge as the same objects; only rows in an alias contest gain the new fields.
- **No migration and no SCHEMA bump.** The two new optional row fields, `lost` and `autoMerged`, are written
  only by the merge, and no existing reader needs them.
- **Where the gates ran:** this harness worktree, as in iteration 1.

### WR-07: a stale edit of the survivor dropped the merged-away row's spellings

**Status:** fixed: requires human verification · **Commit:** 179e064 · **Files:** `index.html`, `test/app.test.js`
**Applied fix:** `mergeExercises` builds each row's claims as the union of the aliases on every copy of
that id, live or tombstone. A tombstoned id's claims go to the live row its `mergedInto` chain ends at,
and only then does the one-owner pass run. A stale rename or type change of Y can no longer drop "x".
**Tests:** A merges X into Y, and B renames Y (or retypes it, or adds "foo" to the stale X). In both
orders, replayed twice, "X", "Y", "Y2" and "foo" all resolve to y.
**Mutants caught:** claims taken from the winning row only (all three checks fail); a tombstone's claims
not handed to its survivor (the "foo" check fails).

### WR-08: the merge was not associative, and an owner-pass tombstone was permanent

**Status:** fixed: requires human verification · **Commit:** 5f46acf · **Files:** `index.html`, `test/app.test.js`, `CLAUDE.md`
**Applied fix:** I took the reviewer's second option, recomputing the result from the set of copies:
- A row that loses every spelling becomes a tombstone marked `autoMerged: true`, with its claims kept in
  `lost`. On every merge an `autoMerged` copy is read back as the live row it was, so it is recomputed and
  never gets the stickiness of a tombstone made by `exMerge`.
- A live row that loses some spellings keeps them in `lost`. `lost` counts as a claim, so a later edit of
  that row wins them back in any order. The "newer mtime keeps the spelling" rule is unchanged.
- The winning `exMerge` tombstone is chosen from its own fields (mtime, then `deletedAt`, then
  `mergedInto`), never by which side it came from.
- CLAUDE.md now separates the permanent tombstones (`exMerge`) from the recomputed ones (`autoMerged`).

**Tests:**
- The reviewer's P/Q/R fixture agrees in all 12 association orders: x live with k and k2, y with y.
- A seeded property test runs 400 three-replica trials. They mix stale copies, later live edits,
  `exMerge` tombstones and contested spellings, and they reach `autoMerged` rows, rows coming back from
  `autoMerged`, and `lost`. Each trial checks:
  - the merge is commutative;
  - it is associative in all 12 orders;
  - it is idempotent;
  - no row is dropped;
  - no `exMerge` tombstone comes back live;
  - every spelling has exactly one live owner.
- Content is compared per id with `aliases` and `lost` read as sets, because their order means nothing to
  `exIdByName`.

**Mutants caught:** `autoMerged` not read back; `lost` not counted as a claim; `lost` not written for a
partial loser; an `autoMerged` tombstone written without its `lost`. Tombstone precedence removed is now
also caught by the "no `exMerge` tombstone comes back live" law.
**Trade-off for Ian:** a tombstone's `lost` claims go to its survivor too, which associativity requires.
In a rare case this can transfer a spelling. Suppose two devices once both used one name for different
rows, and Ian later merges the row that lost that name into a third row. The third row is newest, so it
takes the name, and the other row moves with it if that name was its only spelling. This follows the
"same name, same lift" identity rule.

### IN-02: an equipAt tie made the merge non-associative

**Status:** fixed: requires human verification · **Commit:** e9dea48 · **Files:** `index.html`, `test/app.test.js`
**Applied fix:** a tie on `equipAt` goes to the type that sorts first, read from the choice alone.
Before, the merge kept the first tied copy it saw and replaced the winning row's type only on a strictly
higher clock. This supersedes 09-02's "a tie keeps the mtime winner's own equip", and that test was
updated (cable now beats machine at 500).
**Tests:** the reviewer's D1/D2/D3 give `cable@50` in all 12 orders. 300 seeded trials draw `equipAt`
from {0, 5}, so ties are the common case, and the merge stays commutative and associative in all 12
orders.
**Mutants caught:** the tie-break removed; the overlay back to "strictly higher only".

### IN-09: Add weight, its prefill and the suggest line keyed the type by name

**Status:** fixed: requires human verification · **Commit:** f8ad36c · **Files:** `index.html`, `test/app.test.js`
**Applied fix:**
- `addWeightInfo` takes the draft entry as an optional fourth argument and reads the step and the ladder
  from it. History is still matched by name.
- The card passes its entry, and the "→ suggest" line gives `translateLoad` the entry.
- `startWorkout` builds each entry first and computes the prefill from it. A new draft entry has no exId
  yet, so today the prefill is the same as before; it now follows whatever identity the card will read.
- `isStalledSlot` reads no equipment (it compares weights and reps by `exKey`), so it is unchanged.

**Tests:** in the split state (exId on an EZ row, a name that spells a dumbbell row), the card says
"→ 40 lb" next to its "EZ bar · +5" tag, not 37.5, and suggests 35 lb, not 37.5.
**Mutants caught:** the card not passing its entry; the suggest line passing the name; `addWeightInfo`
ignoring the entry.

### Still out of scope

IN-08, WR-06, IN-01, IN-03, IN-04, IN-05 and IN-06 are unchanged.

## Iteration 1

**Summary:**
- Findings in scope: 6 (CR-01, WR-01, WR-02, WR-03, WR-04, WR-05, as Ian selected)
- Fixed: 6
- Skipped: 0
- Also fixed: IN-07. The WR-01 fix changed the CLAUDE.md sentence it describes, so the sentence was rewritten in the same commit.
- Out of scope, left as they are: WR-06 (kg only; Ian logs in lb), IN-01 through IN-06.

Each of the six is a logic fix. Each shipped with a test that I watched fail on the code before the fix, and each new guard was mutation-checked. Even so, the tests show only that the behaviour is the one I chose. Whether it is the behaviour Ian wants is his call, so every entry below is marked **fixed: requires human verification**.

## Verification

- **Where the gates ran:** in this harness worktree, `.claude/worktrees/gifted-goodall-706ad7` on branch `claude/gifted-goodall-706ad7`, where the commits are. The caller told me to work here, so the fixer did not create a second, nested worktree. The suite has no dependencies, so the numbers can be reproduced from this tree with `npm test`.
- **Suite:** from `1102 passed, 0 failed, 2 skipped` (baseline) to `1126 passed, 0 failed, 2 skipped`.
- **CSP:** I ran `npm run csp:hash` after every edit to the inline script. `npm run csp:check` passes at the end with `sha256-Pp7uOJjDKEzWir+kYF0jp4LiVKZJN7mpn5XagAs3PYA=`.
- **Merge golden:** not regenerated. `git diff --quiet 879fa37 -- test/fixtures/merge-golden.json` exits 0, and every `merge parity:` and golden-battery line passes. No fix changed merge output for any fixture the golden covers.
- **Migrations:** none added, and SCHEMA stays at 19. Every fix runs at merge time or render time.
- **Mutation checks:** before each mutant I copied index.html to the scratchpad and changed exactly one literal (the script refuses a target that appears more than once). I then ran `npm run csp:hash` and the suite, restored the file from the copy and confirmed the restore with `cmp`. I never used `git checkout`. Every mutant listed below turned at least one named check red.

## Fixed Issues

### CR-01: A merged-away exercise id that arrives from another device becomes a permanent ghost

**Status:** fixed: requires human verification
**Files modified:** `index.html`, `test/app.test.js`
**Commit:** 06aeaa5
**Applied fix:** I added `exResolve(id)`, which follows a tombstone's `mergedInto` to the end of the chain. `exKey()` now resolves through it, for both the entry's `exId` and the id that a name lookup returns. A session the other device finished before it heard about the merge now lists under the survivor, and so does this device's draft, which `adoptMerged` keeps unchanged. Settings → Exercises shows one row, and that row can be renamed and merged. A cycle resolves every member to one id, the smallest, so it cannot loop and does not split the history. A non-string `mergedInto` ends the walk.
**Tests (Phase 9 EQUIP section):** a foreign session with the merged-away id, replayed in both orders and then twice. An adopted draft that is then finished. Every listed row resolves through `exRow`. A hostile chain, a two-row cycle, a self-loop and a non-string `mergedInto`.
**Mutants caught:** `exKey` no longer resolving `exId`; the cycle tie-break removed; the non-string guard removed.

### WR-01: The per-row registry union revives rows hard-deleted before Phase 9, and a later live edit beats a tombstone

**Status:** fixed: requires human verification
**Files modified:** `index.html`, `test/app.test.js`, `CLAUDE.md`
**Commit:** 45fb68b
**Applied fix:** `mergeExercises` now applies three rules after the union. Each rule reads only the set of copies, never which side a copy came from, so the merge gives the same result in either order and gives it again when replayed. No input row is mutated.
1. **A tombstone wins.** If any copy of an id has `deletedAt`, the newest tombstone copy wins, even against a newer live copy. Nothing in the app revives a registry tombstone on purpose: `exEnsure` never reuses a tombstoned id, and exercises have no restore.
2. **A cycle is broken.** Rule 1 alone would turn two devices merging the same pair in opposite directions into two tombstones that point at each other, with no live row left. The old mtime rule handled that case correctly. Now the merge with the latest `deletedAt` decides, and its target is revived from its newest live copy. I wrote this guard test first; it passes on the old code, and it goes red without the revival.
3. **Each alias has one live owner.** When two live rows claim the same alias, it stays on the row with the newer mtime, and the id breaks a tie. A row left with no alias becomes a tombstone `mergedInto` the row that took it. This covers paths 1 and 2: a row that a pre-Phase-9 merge spliced out comes back from a stale device or from Import → Merge of an older backup, and it now tombstones into the survivor.

Trade-off: a rename or type change made on a device that had not yet heard about the merge is dropped with the merged-away row. The merge Ian made wins.

**IN-07:** CLAUDE.md now says that a registry row is never spliced out of `DB.exercises`, that `exKey()` follows `mergedInto`, that a registry tombstone beats a live copy, and that two live rows never share an alias. This also removes the self-contradiction IN-07 pointed out.
**Tests:** all three review paths. Paths 1 and 3 run in both orders, and each result is replayed against both inputs, with a commutativity check. Path 2 runs `mergeDB(backup, DB, true)` twice. A replay of opposite concurrent merges. A live row that loses one shared alias and keeps the others.
**Mutants caught:** tombstone precedence removed (path 3); cycle revival removed (opposite merges); alias clean-up removed (paths 1 and 2, and the shared-alias check); partial alias stripping removed.

### WR-02: Under-bar lifts — a warm-up rung heavier than the working weight, and "already at the empty bar" on a 20 lb preset

**Status:** fixed: requires human verification
**Files modified:** `index.html`, `test/app.test.js`
**Commit:** 2ff094d
**Applied fix, and why it is the honest behaviour (D-07):** in lb, a working weight under the bar is a preset or fixed bar, not the loaded bar.
- **Warm-up:** the ramp treats the lift as having no bar. It drops the "Empty bar — 25 lb" rung, which was heavier than the 20 lb working set, and the plate lines ("Under bar weight" on every rung for a 40 lb barbell curl). It opens with "Bodyweight — no load", the same opening as every other lift without a bar, and every rung is at or under the working weight.
- **Deload:** the at-bar rule applies only from the bar up (`lastW >= bar`). Under the bar the lift steps down its own ladder, so Preacher curl goes 20 → 15 and Barbell curl 40 → 35. It is never raised to the bar, which would make it heavier, and the card says "Deloaded −10%", not "Already at the empty bar".
- **Why 15 and not 10:** D-09 keeps the EZ step at 5 lb even though the preset bars are 10 lb apart, and the app does not know which preset bars Ian's gym has. 15 is the next step down on the ladder the rest of Phase 9 uses. It is strictly lighter and never heavier. At and above the bar nothing changes.

This supersedes 09-03's decision that "an EZ preset logged at 20 stays 20", and that test was updated to match.
**Mutants caught:** the at-bar rule applied under the bar; the raise to the bar applied under the bar (which made the deload heavier: 20 → 25); the warm-up bar override removed.

### WR-03: A deload on a light load blanks every weight while the card says "Deloaded −10%"

**Status:** fixed: requires human verification
**Files modified:** `index.html`, `test/app.test.js`
**Commit:** 955cd5f
**Applied fix:** `deloadPlan` never returns `''` for a real load.
- When 90% floors to nothing, the lightest loadable weight is one step.
- A load at or under that step keeps its weight, with a new `atFloor` flag. Examples are a 2.5 lb dumbbell, a 2.5 lb cable stack and a 5 lb machine.
- A load between one and two steps, such as 5.5 on a 5 lb stack, drops to that step.
- The card says "↓ Already at the lightest weight — cut a set or reps instead." with its undo, never "−10%".
- `deloadExercise` never writes a blank weight. With no load at all, as on a bodyweight lift logged at 0, the sets keep their prefilled weight, and that case is `atFloor` too.
- The `atFloor` copy is derived at render time, so it adds no draft field. The draft still persists with `saveLocal()`.

This supersedes 09-03's "2.5 DB → ''" check, which was updated to match.
**Tests:** direct plans. A sweep of every load from 0.5 to 60 lb, in both units and on seven types, asserts that the deload weight is always a positive number and never above the load. A card-level check on a stalled 2.5 lb DB lateral raise, and another on a bodyweight Pull-up at 0.
**Mutants caught:** a return to `''`; `deloadExercise` writing a blank again; the atFloor coach line removed; the between-steps case removed.

### WR-04: "⬆ Add weight" adds the step to an off-ladder weight

**Status:** fixed: requires human verification
**Files modified:** `index.html`, `test/app.test.js`
**Commit:** b61a959
**Applied fix:** this is the review's simpler variant: `const floor = loadFloor(name, lastW); newW = floor + ladderStep(name, floor)`. That is the next weight on the exercise's ladder above the logged one. A 62 lb dumbbell now suggests 65, 22 lb suggests 22.5, a 47 lb barbell 50 and a 26 lb cable 27.5, and the prefill matches. On-ladder weights move exactly one step, as before (57.5 → 60, 60 → 65, 135 → 140). A bodyweight lift still gets no number.
**Mutant caught:** a return to `lastW + step`.

### WR-05: Settings and the card read the type by name but write it by id

**Status:** fixed: requires human verification
**Files modified:** `index.html`, `test/app.test.js`
**Commit:** 019b4fb
**Applied fix:** every control now reads the type from the row it writes to.
- **Settings → Exercises:** the select reads `exRow(r.id)`'s stored type and falls back to the guess.
- **The first-time picker:** it reads `exRow(id)`, the id its tap writes.
- **The workout card:** instead of a separate `equipOfEntry`, `equipOf` now also accepts a draft entry and resolves it through `exKey(entry)`, its exId. The card's tag (rendered and live in `updPlates`), its plate line, the warm-up ramp and the deload all pass the entry, not its name. `weightStep`, `loadFloor`, `ladderStep` and `deloadPlan` follow automatically, because they only pass the argument on. `barStyle` reads the name off an entry for its sled and landmine lookups.
- **Not changed:** `addWeightInfo` and the history lookups still go by name, because the review did not ask for that and they also drive history matching.

**Tests:** two live rows, where curl-a is still labelled "Curl" after the newer curl row took the "curl" spelling (the WR-01 state). The Settings selects show each row's own type, and a choice made through the dispatcher shows on re-render. The card follows curl-a's type: tag, live tag, plates, ramp and deload. The picker highlights curl-a's type. An entry gets the same loading style as its name.
**Mutants caught:** the Settings read by label; the picker read by name; `equipOf` ignoring the exId; the card tag and the live tag passing the name; the sled and landmine lookups on an entry. That last mutant survived at first, so I added the loading-style check, which now catches it.

## Skipped Issues

None of the in-scope findings were skipped. These were outside the scope Ian set:

### WR-06: The kg warm-up labels the lb bar weight as kg

**File:** `index.html` (`warmRampHTML` first rung)
**Reason:** excluded by the user. Ian logs only in lb (D-10). WR-02 changed `warmRampHTML` but left the kg path exactly as it was.
**Original issue:** `barWeight()` returns the lb constants, and the first rung prints them with `DB.unit`, so kg shows "Empty bar — 45 kg".

### IN-01: `exIdByName` still matches tombstones

**File:** `index.html` (`exIdByName`)
**Reason:** not touched. Neither the CR-01 fix nor the WR-01 fix edits `exIdByName`, so under the rule Ian set it stays. The CR-01 fix does take away most of its effect. `exKey` now passes the id a name lookup returns through `exResolve`, so a tombstone that still carries aliases and has a `mergedInto` resolves to its survivor, not to a ghost. A tombstone with aliases and no `mergedInto`, which needs a hand-edited backup, still resolves to its own id. The `Array.isArray` guard against string aliases is also still open.

### IN-02 to IN-06

**Reason:** outside the selected scope, so I left them unchanged.

---

_Fixed: 2026-10-12T18:45:30Z (iteration 1: 18:25:56Z)_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 2_
