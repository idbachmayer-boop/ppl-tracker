---
phase: 09-equipment-and-weight-steps
plan: 02
subsystem: sync
status: complete
tags: [equipment, registry, merge, tombstone, settings]
requires:
  - "09-01: EQUIP_TYPES, EQUIP_LABEL, equipOf, stampEquipment, the eq* test helpers"
provides:
  - "mergeExercises(r, l, localNewer): a per-row registry union plus the equipAt field clock, called once from mergeDB"
  - "equipClock(x): equipAt when the type is in EQUIP_TYPES and equipAt is finite, else -1"
  - "setExerciseEquip(id, type) and ACTIONS.setExEquip (change)"
  - "The Settings → Exercises equipment select (S1), or a plain type line when the key has no registry row"
  - "exMerge tombstone { deletedAt, mergedInto, aliases: [] }, live-only exRow, exEnsure collision over every row"
  - "test helper eqSelectOf(html, id)"
affects: [09-03, 09-04, 09-05]
tech-stack:
  added: []
  patterns:
    - "field clock: a row's fields from the newest mtime, one field from its own clock, replaced only on a strictly higher clock"
    - "registry rows are tombstoned, never filtered out"
key-files:
  created: []
  modified:
    - index.html
    - test/app.test.js
    - CLAUDE.md
decisions:
  - "[09-02]: equipClock is a hoisted function shared by mergeExercises and exMerge, so the merge and the local fold use one rule"
  - "[09-02]: a tie on equipAt keeps the mtime winner's own equip; the strict comparison is what keeps the merge commutative, and a tie fixture proves it"
  - "[09-02]: setExerciseEquip is reached through a.__sandbox in tests, so no harness export was added"
metrics:
  duration: "14 min"
  completed: "2026-10-12"
  tasks: 3
  files: 3
actuals:
  tokens: 5800
  tasks: 3
  commits: 4
---

# Phase 9 Plan 02: The registry syncs per row Summary

The exercise registry now merges row by row instead of arriving whole from whichever device saved last. An equipment type set in Settings → Exercises reaches the cloud even when the other device is newer. Ian's choice also survives a stale device that never ran migration 19, and a later rename of the same row on the other device. A merged-away exercise stays a tombstone, so a stale device cannot bring it back.

## Suite lines

- Before the plan: `1018 passed, 0 failed, 2 skipped`
- After the plan: `1040 passed, 0 failed, 2 skipped`
- CSP hash after the last task: `sha256-Hr1NJl6poqISCTx+q25KNF2oHK4SSUuNaTPYH2uV6MI=` (`npm run csp:check` OK)
- `test/fixtures/merge-golden.json` is byte-identical to 09-01's. `git diff --quiet HEAD -- test/fixtures/merge-golden.json` exits 0, and its last commit is `feat(09-01): equipment type per exercise, migration 19, and a step that follows the rack`. I regenerated nothing. Every `merge parity:` line passed with no change, and so did the random differential and the golden battery.

## Tasks

| # | Task | Commit |
|---|------|--------|
| 1 | Tracer: Settings select → dispatcher → setExerciseEquip → save → pushNow transaction → mergeDB → written cloud blob | f90fe88 |
| 2 | The equipAt field clock and the two-device replays and laws | 46e21cb |
| 3 | exMerge tombstone, live-only exRow, collision over every row, CLAUDE.md sentence | 68ba36c |

**Tracer gate (autonomous variant):** the plan is `autonomous: true` and `human_verify_mode` is `end-of-phase`. After the Task 1 commit I re-ran its verify (`npm run csp:check` OK, `1022 passed, 0 failed, 2 skipped`) and went on to Tasks 2 and 3. I returned no checkpoint.

## RED lines

**Task 1.** With the test alone, three tracer checks failed because the select did not exist yet. Once the select, setExerciseEquip and the ACTIONS entry were in, but before the mergeDB line, only the written-blob check was red, and it was red because B's whole array won:

```
FAIL  EQUIP-03 tracer: the blob written to the cloud past the newer device says dumbbell for Preacher curl  → {"writes":1,"row":{"id":"preacher-curl","name":"Preacher curl","aliases":["preacher curl"],"mtime":1001,"equip":"ez","equipAt":0},"status":"Synced"}
```

**Task 2.** These ran against Task 1's plain union. The two required REDs:

```
FAIL  D-14: a rename on the un-migrated device with a later mtime wins its name AND keeps a valid type, in both orders, replayed twice  → [{"id":"preacher-curl","name":"EZ preacher curl","aliases":["preacher curl","ez preacher curl"],"mtime":5000}, …×4]
FAIL  EQUIP-03: Ian's choice (dumbbell, equipAt 7000) survives a later rename on the other device: the merged row has the rename AND the choice, both orders, replayed twice  → [{…"mtime":9000,"equip":"ez","equipAt":0}, …×6]
```

The two T-9-10 hostile-clock checks were also red (`'laser'` and `'abc'` won on mtime). The stale-device, new-row, order, tie, law and purity checks already passed under the plain union, as expected.

**Task 3.** This ran against the hard delete:

```
FAIL  EQUIP-03: a stale device whose pec-deck is still live (alias 'pec deck', mtime 1001, newer updatedAt) cannot resurrect it — both orders, replayed twice  → [{"tomb":false,"resolves":"seated-fly","row":{"id":"pec-deck","name":"Pec deck","aliases":["pec deck"],"mtime":1001,"equip":"machine","equipAt":0}}, …]
```

The tombstone-shape, type-carry and foo-2 collision checks were red at the same time.

## Mutation checks

Before each break I copied the file to the scratchpad. I then applied the mutant with a literal-replace script (`mutate.js`, which refuses a target found anything other than once), ran `npm run csp:hash` and the suite, and restored from the copy. `cmp` confirmed every restore was byte-identical. I never used `git checkout`.

| Task | Mutation | Check that went red |
|------|----------|---------------------|
| 1 | Comment out `out.exercises = mergeExercises(r, l, localNewer);` in mergeDB | `EQUIP-03 tracer: the blob written to the cloud past the newer device says dumbbell…` (written row `ez`, equipAt 0) |
| 2 | Field clock "strictly higher" changed to "higher or equal" | `EQUIP-03: two copies at the same equipAt keep the mtime winner's own equip, in both orders` (merged `cable`, not `machine`). The commutativity law stayed green because its fixtures have distinct equipAts. The tie fixture, which the plan allowed for, is the check that catches this mutant. |
| 2 | EQUIP_TYPES test dropped from equipClock | `T-9-10: an equip of 'laser' at equipAt 9e15 never replaces the other device's valid ez…` |
| 2 | Clock writes onto the union's row in place (`Object.assign(row, …)`) | `T-9-13: no registry merge above mutated either of its inputs` |
| 3 | exMerge's old hard delete (`DB.exercises = exRows().filter(…)`) restored | the stale-resurrection replay, the tombstone shape, and the foo-2 collision |
| 3 | `!x.deletedAt` dropped from exRow | `EQUIP-03: exRow reads live rows only…`, the resurrection replay (`exRow('pec-deck')` non-null), `T-9-10: setExerciseEquip refuses a tombstoned id…` (wrote, pushed and toasted), and the older `merging two exercises keeps every set` |
| 3 (extra) | exEnsure's collision loop back to `while(exRow(id))` | `EQUIP-03: after foo is merged into bar, exEnsure('Foo!') makes a new row foo-2…` (returned `foo`, giving two `foo` rows) |
| 3 (extra) | The equip carry in exMerge removed | `EQUIP-03: exMerge carries the higher-equipAt type into the survivor…` |

## Deviations from Plan

None that change behaviour. Small additions:
- I added a tie fixture (two copies at equipAt 500, different types) to Task 2. The plan allows one if the `>=` mutant survives the laws, and it did.
- I added two extra mutations in Task 3 (collision loop, equip carry), beyond the two the plan names.
- I added an `eqSelectOf(html, id)` test helper that parses the setExEquip select's options and its selected value.
- The CLAUDE.md addition is one sentence. The plan's two clauses ("… reads live rows only. Never filter a registry row out.") are joined into it as "…, and a registry row is never filtered out." I changed no other CLAUDE.md wording, and the DOC-02 verbatim-quote check still passes.

## Known Stubs

None. As the plan says, the Settings intro paragraph and the empty-state copy stay as they were. 09-04 changes them.

## Threat Flags

None beyond the plan's threat model. The tombstone `{ id, name, aliases: [], deletedAt, mergedInto, mtime, equip, equipAt }` is synced registry data. Option labels come from EQUIP_LABEL, and every attribute value goes through esc() inside double quotes.

## Self-Check: PASSED

- FOUND: index.html, test/app.test.js, CLAUDE.md
- FOUND: f90fe88, 46e21cb, 68ba36c
- `grep -cE "^function (mergeExercises|setExerciseEquip)\(" index.html` → 2. The mergeDB line count → 1. `DB.draft` in setExerciseEquip → 0. `mergeUnion(` in mergeDB → 0. `.sort(` in mergeExercises → 0. The exMerge filter → 0, and the region contains `mergedInto`. `takes it whole from the newer side` in the tests → 0. `exMerge` in CLAUDE.md → 1.
