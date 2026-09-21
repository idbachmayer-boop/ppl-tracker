---
phase: 03-f3-adding-a-new-tracked-thing-recipe
plan: 02
subsystem: testing
tags: [test-suite, registry-contract, map-collection, merge-semantics]

# Dependency graph
requires:
  - phase: 01-f1-collections-registry
    provides: COLLECTIONS registry, blank(), liveOf(), validateBackup(), mergeDB()/mergeCollections(), collectionProblems() that this plan's probe reaches
  - phase: 02-f1-export-for-claude
    provides: buildMarkdownExport()/exportRows()/mdSections() that this plan's probe's export assertion reads through
provides:
  - "test/app.test.js block (DRY-RUN-A, DOC-04) proving a map-shaped collection declared in one injected line is picked up by blank(), collectionProblems(), liveOf(), validateBackup(), mergeDB()/mergeCollections() and buildMarkdownExport() with zero further code"
  - "A machine-checked replay of the mobilityLog incident: mergeDB() replaces the whole day from the newer side, an explicit false survives the merge, and an absent key is never resurrected from the older side"
affects: [03-03, 03-04, 03-05]

actuals:
  tokens: 1818
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Dry Run A: a second declaration-alone probe (recipeProbe), map-shaped and independent of SLEEP-05's probe/probeList/probeMap, riding the same test/harness.js opts.transform mechanism — reusable for any future map-only registry proof"

key-files:
  modified:
    - test/app.test.js

key-decisions:
  - "recipeProbeMap is injected as the sole line replacing 'const COLLECTIONS = {' rather than reusing or extending SLEEP-05's PROBE_LIST_LINE/PROBE_MAP_LINE/probeTransform/probe — keeps SLEEP-05's own 'two lines added' reconstruction assertion intact and gives Dry Run A an instance nothing else mutates."
  - "The mergeDB() assertions use two blanked instances with different top-level updatedAt (mirroring SLEEP-05's own map assertion), not a per-day mtime — mergeDateMap()'s replace-whole branch is driven by which whole DB object is newer, not by anything stored inside the day."
  - "The explicit-false and absence-is-not-off checks are combined into one ok() label ('an explicit false survives the merge, and absence does not mean off') per the plan's action spec, covering both merge orderings for each of the two fixture pairs in a single assertion."

requirements-completed: [DOC-04]

coverage:
  - id: D1
    description: "A map-shaped collection declared in one injected registry line is picked up by blank(), collectionProblems(), liveOf() (which refuses it by name), and validateBackup() with no change to any derived consumer or to test/harness.js"
    requirement: "DOC-04"
    verification:
      - kind: unit
        ref: "test/app.test.js#DRY-RUN-A: the recipe probe transform applied (one line added, nothing else changed)"
        status: pass
      - kind: unit
        ref: "test/app.test.js#DRY-RUN-A: the declaration is valid"
        status: pass
      - kind: unit
        ref: "test/app.test.js#DRY-RUN-A: blank() creates the recipe probe empty"
        status: pass
      - kind: unit
        ref: "test/app.test.js#DRY-RUN-A: liveOf refuses a map collection by name"
        status: pass
      - kind: unit
        ref: "test/app.test.js#DRY-RUN-A: validateBackup checks the recipe probe's shape"
        status: pass
    human_judgment: false
  - id: D2
    description: "mergeDB() replaces the whole day from the newer side (never a union of inner keys), an explicit false survives the merge, and a key absent on the newer side is not resurrected from the older side"
    requirement: "DOC-04"
    verification:
      - kind: unit
        ref: "test/app.test.js#DRY-RUN-A: mergeDB replaces the whole day from the newer side"
        status: pass
      - kind: unit
        ref: "test/app.test.js#DRY-RUN-A: an explicit false survives the merge, and absence does not mean off"
        status: pass
    human_judgment: false
  - id: D3
    description: "The recipe probe exports its own Markdown section via buildMarkdownExport() with no exporter edit, and no derived consumer's source names recipeProbeMap"
    requirement: "DOC-04"
    verification:
      - kind: unit
        ref: "test/app.test.js#DRY-RUN-A: the recipe probe exports its own section with no exporter edit"
        status: pass
      - kind: unit
        ref: "test/app.test.js#DRY-RUN-A: no derived consumer mentions recipeProbeMap"
        status: pass
    human_judgment: false
  - id: D4
    description: "SLEEP-05's own transform-reconstruction assertion and EXP-02's probe-export assertions are unaffected by the new recipeProbeMap probe"
    requirement: "DOC-04"
    verification:
      - kind: unit
        ref: "test/app.test.js#SLEEP-05: the probe transform applied (two lines added, nothing else changed)"
        status: pass
      - kind: unit
        ref: "test/app.test.js#export: a probe collection declared in one line exports its own section with no exporter edit (EXP-02)"
        status: pass
    human_judgment: false

duration: ~10min
completed: 2026-09-21
status: complete
---

# Phase 3 Plan 02: Dry Run A — the map-shaped collection rehearsal Summary

**A new `test/app.test.js` block injects a single `recipeProbeMap` registry line (`kind:'map', merge:'replace-whole', explicitFalse:true`) via `test/harness.js`'s existing `opts.transform`, and proves it is picked up by `blank()`, `collectionProblems()`, `liveOf()`, `validateBackup()`, `mergeDB()`/`mergeCollections()` and `buildMarkdownExport()` with zero further code — including the exact `mobilityLog` merge trap, stated as a test.**

## Performance

- **Duration:** ~10 min
- **Completed:** 2026-09-21T11:59:13Z
- **Tasks:** 2
- **Files modified:** 1 (`test/app.test.js`)

## Accomplishments

- Declared `RECIPE_PROBE_MAP_LINE` — one registry line shaped like `mobilityLog` (`kind:'map'`, `merge:'replace-whole'`, `soft:false`, `required:false`, `explicitFalse:true`, `label:'Recipe probe map'`, two-column `columns`, `format:dayFlagRows`) — and injected it via a fresh `recipeProbeTransform`/`recipeProbe` pair, independent of SLEEP-05's `probe`/`PROBE_LIST_LINE`/`PROBE_MAP_LINE`.
- Task 1 proved the declaration-alone claim for the collection's static shape: the transform adds exactly one line and reconstructs `app.__src` byte for byte; `collectionProblems()` accepts the declaration; `blank()` creates `recipeProbeMap` as an empty plain object (on both the fresh blank and the booted `DB`); `liveOf('recipeProbeMap')` throws, naming the collection, because it is a map, not a declared soft-delete list; `validateBackup()` accepts a backup with the key absent and refuses one whose `recipeProbeMap` is an array with the exact `The recipeProbeMap section is damaged.` message.
- Task 2 proved the dynamic/merge claim, which is the actual point of using a map probe instead of another list one: `mergeDB()` replaces a day's whole inner object from the newer side in both merge orderings (never unioning `{a:'old'}` and `{b:'new'}`); an inner key explicitly set to `false` on the newer side survives the merge over an older `true`, in both orderings; a key present on the older side but absent on the newer side is not resurrected — the merged day matches the newer side's object exactly; the probe's own Markdown section appears in `buildMarkdownExport()`'s output with no exporter code touched; and stripped-of-comments source scans of `blank`, `liveOf`, `validateBackup`, `mergeCollections`, `mergeDB`, `exportRows` and `buildMarkdownExport` never mention `recipeProbeMap`.
- Verified the two "must not break" constraints from the plan by name: `SLEEP-05: the probe transform applied (two lines added, nothing else changed)` and `export: a probe collection declared in one line exports its own section with no exporter edit (EXP-02)` both still pass after the new block landed.
- Suite went from 731 passed / 0 failed / 2 skipped (03-01 baseline) to 740 passed / 0 failed / 2 skipped — nine new `DRY-RUN-A:` PASS lines, skipped count unchanged.

## Task Commits

Each task was committed atomically:

1. **Task 1: Inject a map-shaped probe and prove every derived consumer picks it up** - `ef00489` (test)
2. **Task 2: Prove the merge trap and the export, and that nothing names the probe** - `b9dd6a5` (test)

## Files Created/Modified

- `test/app.test.js` - New block under the banner `── DRY-RUN-A: a map-shaped collection declared in one line is picked up everywhere (DOC-04) ──`, placed immediately after the SLEEP-04 block, holding 9 assertions plus a trailing "what this does and does not prove" comment.

## Decisions Made

- `recipeProbeMap` is its own independent probe (own transform, own line, own instance) rather than a third line added to SLEEP-05's existing `probeTransform` — SLEEP-05 asserts its own transform added exactly two lines, so extending it would have turned that assertion red.
- The merge assertions build fixtures with a top-level `updatedAt` difference, matching how `mergeDateMap()`'s `replace-whole` branch is actually driven (by which whole `DB` object is newer, not a per-day timestamp) — consistent with `01-04`'s prior finding that date-keyed maps have no per-day mtime.
- The explicit-false and absence-is-not-off claims are one combined assertion (`DRY-RUN-A: an explicit false survives the merge, and absence does not mean off`) rather than two separate ones, per the plan's action text, checking both merge orderings for both fixture pairs.

## Deviations from Plan

None - plan executed exactly as written. Both tasks' `<action>` specifications were followed directly; all `<acceptance_criteria>` were verified (exact PASS-line greps, `git diff --name-only`, `grep -c recipeProbeMap index.html` returning 0, suite counts before/after).

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `03-VALIDATION.md`'s Dry Run A Wave 0 gap is closed, without the harness change it had predicted (`test/harness.js` was not touched).
- DOC-04's data-layer half is now machine-proven for a map-shaped collection; the plan's trailing comment records that Dry Run A cannot reach the hand-written logging/viewing UI step, which is Dry Run B's job in plan 03-05.
- Plans 03-03 and 03-04 can proceed; both depend only on the tracer path from 03-01, which was already green, plus this plan's independent probe adds no coupling.
- No blockers.

---
*Phase: 03-f3-adding-a-new-tracked-thing-recipe*
*Completed: 2026-09-21*

## Self-Check: PASSED

- FOUND: .planning/phases/03-f3-adding-a-new-tracked-thing-recipe/03-02-SUMMARY.md
- FOUND: ef00489 (Task 1 commit)
- FOUND: b9dd6a5 (Task 2 commit)
