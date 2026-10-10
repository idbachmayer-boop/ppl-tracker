---
phase: 01-f1-the-collections-registry
plan: 01
subsystem: data-model
tags: [collections-registry, migrations, sync-merge, tdz, export-metadata]

# Dependency graph
requires: []
provides:
  - "const COLLECTIONS registry (10 collections) declared after SCHEMA/KEY, before MIGRATIONS and let DB = load()"
  - "collectionProblems(reg) — structural validator enforcing kind/key/sortBy/merge/soft/required/explicitFalse/columns/format, refused at module-eval time"
  - "Promoted key functions as hoisted function declarations: sessKey, todoKey, hobbyKey (promoted from const arrows), cardioKey, ideaKey, sessionSort (new, extracted from mergeDB inline call sites)"
  - "Export row shapers: sessionRows, hobbyRows, journalRows, dayFlagRows — each collection's columns/format metadata for Phase 2's exporter"
  - "test/harness.js loadApp(htmlPath, seed, opts) with opts.transform for source-mutation fixtures"
  - "Boot-order regression across schema 0-17 plus three degenerate stores, proving every declared collection is shaped after boot"
affects: [phase-1-plan-02, phase-1-plan-03, phase-2-exporter]

actuals:
  tokens: 8197
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Registry-declared collection metadata (kind/key/sortBy/merge/soft/required/explicitFalse/columns/format) validated once at module-eval time, replacing hand-written per-collection merge/export logic one collection at a time in later plans"
    - "Promote const-arrow helpers to function declarations when a TDZ-sensitive const literal (COLLECTIONS) needs to reference them by name before their textual position"
    - "harness opts.transform(code) hook for building source-mutation refusal fixtures without maintaining a second copy of index.html"

key-files:
  created: []
  modified:
    - index.html
    - test/harness.js
    - test/app.test.js

key-decisions:
  - "COLLECTIONS is declared as dead data only in this plan — no consumer (blank, liveX, validateBackup, mergeDB) reads it yet; that migration happens one collection per commit in plans 01-02 and 01-03"
  - "cardio, ideas, todos and hobbyLog deliberately have no sortBy — the hand-written merge never sorted them, so declaring one would change stored order"
  - "columns/format rules were deferred from Task 1 to Task 2 by design (per plan), so REG-05's core refusal battery could ship independently of REG-17's export metadata"

patterns-established:
  - "collectionProblems refuses unknown fields, missing/invalid merge strategy, key-union trap on maps, and now non-empty distinct columns plus a required format function on every map"

requirements-completed: [REG-01, REG-02, REG-03, REG-04, REG-05, REG-11, REG-15, REG-17]

coverage:
  - id: D1
    description: "COLLECTIONS registry declared at the TDZ-safe position (after SCHEMA/KEY, before MIGRATIONS and let DB = load()), validated at module-eval time via collectionProblems, with an invalid registry throwing 'COLLECTIONS is invalid: ...'"
    requirement: "REG-01"
    verification:
      - kind: unit
        ref: "test/app.test.js#placement: COLLECTIONS sits after SCHEMA, before MIGRATIONS and before let DB = load()"
        status: pass
      - kind: unit
        ref: "test/app.test.js#registry: never mutated by boot, merge or render (REG-01)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Boot-order regression proves every declared collection is correctly shaped after boot, for every schema version 0 through 17 and for three degenerate stores"
    requirement: "REG-15"
    verification:
      - kind: unit
        ref: "test/app.test.js#boot: schema {v} → every declared collection shaped (18 assertions, v=0..17)"
        status: pass
      - kind: unit
        ref: "test/app.test.js#boot: empty/unparseable/'{}' store → every declared collection shaped"
        status: pass
    human_judgment: false
  - id: D3
    description: "REG-04 promoted key functions (sessKey, todoKey, hobbyKey promoted; cardioKey, ideaKey, sessionSort extracted) are byte-identical in behavior to their pre-phase bodies, proven with composite-key fallbacks and field-order probes"
    requirement: "REG-04"
    verification:
      - kind: unit
        ref: "test/app.test.js#keys: sessKey/todoKey/cardioKey/ideaKey/hobbyKey/sessionSort probes"
        status: pass
    human_judgment: false
  - id: D4
    description: "collectionProblems refuses every data-losing declaration: missing/null/empty merge, key-union trap on maps, wrong merge kind on lists, missing soft, unknown fields, missing/empty/duplicate columns, missing format on maps, explicitFalse true without replace-whole — and the real boot refuses a source copy with mobilityLog's merge field deleted"
    requirement: "REG-05"
    verification:
      - kind: unit
        ref: "test/app.test.js#registry: * refusal battery (14 assertions)"
        status: pass
      - kind: unit
        ref: "test/app.test.js#registry: boot refuses a map with no merge strategy"
        status: pass
    human_judgment: false
  - id: D5
    description: "Every COLLECTIONS entry declares export columns; sessionRows, hobbyRows, journalRows, dayFlagRows format functions emit rows whose keys exactly match their collection's columns, in declared order, for both populated and empty/malformed input"
    requirement: "REG-17"
    verification:
      - kind: unit
        ref: "test/app.test.js#rows: sessionRows/hobbyRows/journalRows/dayFlagRows probes (10 assertions)"
        status: pass
    human_judgment: false
  - id: D6
    description: "MIGRATIONS remains a hand-written object literal with keys exactly 1..SCHEMA and no gap, never generated from or referenced by COLLECTIONS"
    requirement: "REG-11"
    verification:
      - kind: unit
        ref: "test/app.test.js#migrations: MIGRATIONS keys are exactly 1..SCHEMA with no gap"
        status: pass
      - kind: unit
        ref: "test/app.test.js#placement: COLLECTIONS never references MIGRATIONS"
        status: pass
    human_judgment: false

duration: 65min
completed: 2026-09-11
status: complete
---

# Phase 1 Plan 1: The COLLECTIONS Registry — declaration, validation, and export contracts Summary

**A `COLLECTIONS` registry declared as dead data at the TDZ-safe position, validated at module-eval time, proven to survive boot across every schema 0-17, and carrying the export columns/format metadata Phase 2's exporter will read — with zero changes to any existing merge, filter, validation or default behavior.**

## Performance

- **Duration:** 65 min (13:09 → 14:14 CDT, including the tracer-checkpoint pause between tasks)
- **Started:** 2026-09-11T13:09:14-05:00
- **Completed:** 2026-09-11T14:14:14-05:00
- **Tasks:** 2 of 2
- **Files modified:** 3 (index.html, test/harness.js, test/app.test.js)

## Accomplishments

- `COLLECTIONS` declared once, after `SCHEMA`/`KEY`, before `MIGRATIONS` and `let DB = load()` — literal values or hoisted `function` references only, no `const` arrow, no forward `const`
- `collectionProblems(reg)` enforces the full contract: kind, key/sortBy shape rules per list/map, required `merge` with no default (and the key-union trap refused on maps), `soft`/`required`/`explicitFalse` booleans, and now non-empty distinct `columns` plus a required `format` function on every map
- A bad registry (proven with a real source-transform fixture that deletes mobilityLog's `merge` field) throws `COLLECTIONS is invalid: ...` at module-eval time — the exact TDZ trap that shipped Migration 13/17 bugs before
- `sessKey`, `todoKey`, `hobbyKey` promoted from `const` arrows to hoisted `function` declarations with byte-identical bodies; `cardioKey`, `ideaKey`, `sessionSort` extracted from their former inline call sites in `mergeDB` — all six proven with composite-key fallbacks and field-order probes
- Four new export row shapers (`sessionRows`, `hobbyRows`, `journalRows`, `dayFlagRows`) referenced by name from each collection's `format` field; every row's keys match that collection's `columns` array exactly, in declared order
- The real app boots successfully from every schema version 0 through 17, plus three degenerate stores (empty, unparseable, `'{}'`), with every one of the ten declared collections in its correct shape (array for `kind:'list'`, plain object for `kind:'map'`) after boot
- `MIGRATIONS` proven to remain hand-written with keys exactly `1..SCHEMA`, never generated from and never referenced by `COLLECTIONS`
- The registry itself proven never mutated across the whole suite run — snapshotted right after boot and re-compared at the very end
- Suite grew from the pre-phase baseline of 226 passed to 319 passed, 0 failed — every pre-existing check still passes unmodified

## Task Commits

Each task was committed atomically:

1. **Task 1: Tracer — declare COLLECTIONS, validate it at module eval, and boot every schema through it** - `100d90b` (feat)
2. **Task 2: Enforce the registry's contracts — export columns and format rows (REG-17), refusals (REG-05), key parity (REG-04), hand-written MIGRATIONS (REG-11)** - `f8ce045` (feat)

_Task 1 was a `type="tracer"` task; the tracer feedback gate (checkpoint:human-verify) was presented and the user responded "approved" before Task 2 began._

## Files Created/Modified

- `index.html` - Adds `COLLECTIONS` registry (10 entries, all with `columns`; sessions/hobbyLog/journal/mobilityLog/lawnLog also carry `format`), `collectionProblems()`, the module-eval validation throw, promoted/extracted key functions (`sessKey`, `todoKey`, `hobbyKey`, `cardioKey`, `ideaKey`, `sessionSort`), and the four export row shapers (`sessionRows`, `hobbyRows`, `journalRows`, `dayFlagRows`)
- `test/harness.js` - Appends the nine Task-1 exports plus four Task-2 export names to `loadApp`'s `names` array; adds an optional third `opts` parameter with `opts.transform(code)` for source-mutation fixtures
- `test/app.test.js` - Adds `REQUIRED_EXPORTS` guard, `REGISTRY_AT_START` snapshot, `INTRODUCED_AT` boot-order table, the schema 0-17 + degenerate-store boot regression, the REG-02/03/11 placement checks, the REG-05/04/17/11 contract-refusal battery, and the final REG-01 registry-never-mutated check

## Decisions Made

- Columns/format validation was deliberately deferred from Task 1 to Task 2 (per plan) so the module-eval placement contract and merge-strategy refusal could land first, independently of export metadata
- `cardio`, `ideas`, `todos` and `hobbyLog` declare no `sortBy` — preserving pre-phase stored order, since the hand-written merge never sorted them
- The mobilityLog-merge-deletion fixture asserts its own regex matched (`registry: the refusal fixture still finds mobilityLog's merge field`) before asserting the throw, so a future reformatting of the registry fails loudly instead of passing vacuously

## Deviations from Plan

None - plan executed exactly as written. No Rule 1-4 auto-fixes were needed; all behavior-bullet tests passed on first implementation.

## Issues Encountered

None.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `COLLECTIONS`, `collectionProblems`, the promoted key functions, and the export row shapers are all declared, validated, and proven — ready for plans 01-02 and 01-03 to migrate `mergeDB`, `blank`, `liveX` and `validateBackup` to read from the registry one collection at a time
- Phase 2's exporter can build directly on `COLLECTIONS[name].columns` and `.format` without redesigning either
- No consumer behavior changed in this plan — every pre-existing check (226 baseline) still passes unmodified alongside the 93 new checks this plan added

## Self-Check: PASSED

All claimed files exist (index.html, test/harness.js, test/app.test.js, this SUMMARY.md) and both task commits (100d90b, f8ce045) are present in git log.

---
*Phase: 01-f1-the-collections-registry*
*Completed: 2026-09-11*
