---
phase: 09-equipment-and-weight-steps
plan: 01
subsystem: training-progression
status: complete
tags: [equipment, migration, schema-19, weight-step, registry]
requires: []
provides:
  - "EQUIP_TYPES, EQUIP_LABEL, EQUIP_DEFAULTS (71 keys), equipGuess(name), equipKnown(name) above the migrations table"
  - "SCHEMA 19 with MIGRATIONS[19] = stampEquipment(d)"
  - "exEnsure stamps equip/equipAt on new rows"
  - "equipOf(name), weightStep(name, w) returning a number or null"
  - "test helpers eqNorm, eqSlug, eqRow, eqSeed18, eqSess, eqCard, eqRun, eqFlag and EQ_EXPORT_NAMES"
affects: [09-02, 09-03, 09-04, 09-05]
tech-stack:
  added: []
  patterns:
    - "module-eval-safe literal block above the migrations table, own-key lookup plus enum guard"
    - "D-14 migration stamp: mtime old + 1, never now"
    - "null step means no number; every caller branches on it"
key-files:
  created: []
  modified:
    - index.html
    - test/app.test.js
    - test/harness.js
    - test/fixtures/merge-golden.json
decisions:
  - "weightStep tests bodyweight before the kg branch, so a bodyweight lift gets no number in either unit"
  - "Idempotence is proved by replaying migration 19 on its own output (_schema reset to 18), because a second normalize at 19 runs no migration and is vacuous"
  - "Added a shared eqFlag(card) helper beside the planned eq* helpers; later plans can reuse it"
metrics:
  duration: "13 min"
  completed: "2026-10-12"
  tasks: 3
  files: 4
actuals:
  tokens: 8000
  tasks: 3
  commits: 4
---

# Phase 9 Plan 01: Equipment types and the step seam Summary

Every exercise-registry row now stores one equipment type. Migration 19 sets it from the name and the boot save persists it. ⬆ Add weight moves by the type's step: dumbbells by the rack (2.5 below 60, then 5), cable 2.5, barbell, EZ bar and machine 5, bodyweight never a number, and kg a flat 2.5.

## Suite lines

- Before the plan: `984 passed, 0 failed, 2 skipped`
- After the plan: `1018 passed, 0 failed, 2 skipped`
- CSP hash after the last task: `sha256-8tZwW4E8wuj9fY2A1xJsOLD6NQT1+I/i/bY1SqC0F/0=` (`npm run csp:check` OK). Tasks 2 and 3 changed only the tests, so the hash from Task 1 still holds.

## Interfaces (final)

- `equipGuess(name) → 'barbell'|'ez'|'dumbbell'|'machine'|'cable'|'bodyweight'`. Pure, safe at module-eval time.
- `equipKnown(name) → boolean`. Pure, safe at module-eval time. Own key of EQUIP_DEFAULTS only.
- `stampEquipment(d) → d`. Mutates `d.exercises` rows in place. Skips non-objects, tombstones and rows already typed.
- `equipOf(name) → member of EQUIP_TYPES`. Runtime only: `exRow(exKey(name))`, else the guess.
- `weightStep(name, w) → number | null`. null means bodyweight. Runtime only.
- `addWeightInfo(workout, slotIndex, name) → { allTop, lastW, newW: number|null, hasLoad } | null`.
- Registry row shape: `{ id, name, aliases, mtime, equip, equipAt }`, where `equipAt` 0 means a default.

## Tasks

| # | Task | Commit |
|---|------|--------|
| 1 | Tracer: schema-18 blob → migration 19 → stored row → equipOf → weightStep → card flag and prefill | 7877418 |
| 2 | Default table and migration 19 edge checks | a96fde3 |
| 3 | Rack and stack steps on the card, kg, stored-beats-guess, hostile unit | 0e18449 |

**Tracer gate (autonomous variant):** the plan is `autonomous: true` and `human_verify_mode` is `end-of-phase`. After the Task 1 commit I re-ran its verify (`npm run csp:check` OK, `991 passed, 0 failed, 2 skipped`) and went on to Tasks 2 and 3. I returned no checkpoint.

## First post-change run (before retargeting)

`925 passed, 63 failed`. Every FAIL was expected:
- 51 golden hashes: `golden: blank`, all `golden: merge:*`, `golden: validate:newer app version` and the random battery. All of these embed `_schema`.
- The two schema-18 literals from planner probe 7.
- The eight Phase 8 checks from planner probe 6.

Nothing else failed. I regenerated the golden in the Task 1 commit with `WRITE_MERGE_GOLDEN=1`, and every legacy-parity check stayed green.

## Mutation checks

Each mutation was applied to the working copy from a scratchpad copy taken just before the break. I then ran `npm run csp:hash` and the suite, and restored the file from that copy. A `cmp` confirmed each restore was byte-identical. No mutation was restored with `git checkout`.

| Task | Mutation | Check that went red | Restore |
|------|----------|---------------------|---------|
| 1 | equipGuess normalises with `normEx(name)` (TDZ during the boot load) | `EQUIP-02/D-14: a schema-18 device boots into schema 19, and every STORED registry row carries a valid equip…`: stored rows had no `equip` while `_schema` read 19. The card checks stayed green because equipOf falls back to the runtime guess, which is exactly why only a stored-blob check catches this. | restored from scratchpad copy |
| 2 | Own-key test replaced with a plain `in` lookup in equipGuess and equipKnown | `T-9-04: an empty, whitespace or prototype name…` (`constructor` became a known name) | restored from scratchpad copy |
| 2 | Own-key test and enum guard both dropped in equipGuess | `T-9-04: …` (`constructor` returned a function) | restored from scratchpad copy |
| 2 | Fallback rules 2 (cable) and 4 (EZ) swapped | `EQUIP-01: the name rules run in their fixed order…` (Cable/Machine preacher curl read as ez) | restored from scratchpad copy |
| 2 | stampEquipment re-stamps rows already holding a valid equip | `EQUIP-02/T-9-05: migration 19 is idempotent…` and `EQUIP-02/T-9-05: rows that already hold a valid equip come back byte-identical` | restored from scratchpad copy |
| 2 | stampEquipment skips the `deletedAt` test | `EQUIP-02: a tombstoned row is left exactly as it was` | restored from scratchpad copy |
| 3 | Dumbbell boundary `>= 60` changed to `> 60` | the weightStep table check, `D-17 (A3 reading)…` and `D-08/D-17: on the card… → 65 from 60` (60 showed → 62.5) | restored from scratchpad copy |
| 3 | kg branch replaced by `INCREMENT[DB.unit] \|\| 2.5` for any non-lb unit | `T-9-04: a unit of __proto__ still gives a numeric step…` (step was an object, card showed `100[object Object]`) | restored from scratchpad copy |

**One mutation stayed green: dropping only the own-key test in equipGuess while keeping its enum guard.** That mutant is equivalent. A prototype value (a function, or Object.prototype) is never a member of EQUIP_TYPES, so the enum guard alone already returns 'machine', and no fixture can tell the two versions apart. I proved the own-key guard with the stronger variants above: both functions, and both guards in equipGuess.

I strengthened one fixture before writing the check. A second `normalize` of a schema-19 blob runs no migration, so a plain once/twice comparison could never catch re-stamping. The idempotence check therefore also replays migration 19 on its own output, with `_schema` reset to 18. That replay is what turned red under the re-stamp mutation.

## Deviations from Plan

None that change behaviour. Two small additions:
- I added an `eqFlag(card)` helper beside the planned `eq*` helpers, the same regex as the PROG section's `flagOf`.
- The idempotence check gained the migration-19 replay described above.

I found no bugs. Tasks 2 and 3 needed no change to index.html.

## Known Stubs

None.

## Threat Flags

None. No new network, auth or file surface. The stored `equip` string is never rendered.

## Self-Check: PASSED

- FOUND: index.html, test/app.test.js, test/harness.js, test/fixtures/merge-golden.json
- FOUND: 7877418, a96fde3, 0e18449
- `git log -1 --format=%s -- test/fixtures/merge-golden.json` → `feat(09-01): equipment type per exercise, migration 19, and a step that follows the rack`
