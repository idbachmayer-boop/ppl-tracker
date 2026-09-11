---
phase: 01-f1-the-collections-registry
plan: 03
subsystem: data-model
tags: [collections-registry, sync-merge, differential-testing, gen-guard, map-collections]

# Dependency graph
requires:
  - phase: 01-f1-the-collections-registry (plan 01)
    provides: "COLLECTIONS registry (10 entries, kind/key/sortBy/merge/soft/required/columns/format), validated at module-eval time"
  - phase: 01-f1-the-collections-registry (plan 02)
    provides: "blank()/liveX()/validateBackup() derived from COLLECTIONS; canon(), LEGACY_COLLECTIONS test helpers; the _legacy-twin + differential-test pattern"
provides:
  - "mergeCollections(r, l, localNewer, out) — the single per-collection merge, dispatched on each COLLECTIONS entry's declared merge strategy, throwing (never defaulting) on an unrecognised or missing one; applies each entry's declared sortBy after merging"
  - "mergeDB() thinned to one mergeCollections() call; the gen-mismatch wholesale replace is textually unchanged and still returns before mergeCollections is ever reached"
  - "mergeDB_legacy(remote, local, localWins) — frozen, calling blank_legacy(), for plan 01-04's real-backup differential and later REG-14 removal"
  - "clone(), legacyView(), sameMerge(), ROW_FOR, GEN_BLOCK test helpers for the REG-13 per-incident differential"
  - "A permanent regression battery replaying the 2026-07-25 blind-write, the Migration-15 revert, explicit-false-vs-absent map days, Erase all data, Import→Replace, delete/re-add races, equal-mtime ties, pre-id sessions, a stale draft, the weather cache, empty inputs, schema-never-backwards and gen off-by-one"
affects: [phase-1-plan-04, phase-1-plan-05, phase-1-plan-07]

actuals:
  tokens: 7214
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "mergeCollections() dispatch: for kind:'list' the strategy must be exactly 'union' (mergeUnion + declared key, then declared sortBy applied after merging); for kind:'map' it must be exactly 'line-union' (mergeJournalEntry) or 'replace-whole' (whole newer object, never a key union); anything else throws, naming the collection — no silent default (REG-05)"
    - "The gen-mismatch wholesale replace is a precondition on mergeDB's body, not part of the per-collection concern — it stays a hard early return above mergeCollections, textually unchanged, so Erase all data and Import→Replace can never be silently folded into the union path (PITFALLS Pitfall 1)"
    - "Sort invariants moved inside mergeCollections (a deliberate departure from 01-PATTERNS.md's 'sorts stay hand-written' note) — a future collection's declared sortBy needs no mergeDB edit"
    - "sameMerge(label, remote, local, localWins) differential harness: runs mergeDB_legacy and mergeDB on separate clone()s of the same fixture, compares legacyView() (canon() with post-baseline collections stripped), and returns the derived output for incident-specific assertions"

key-files:
  created: []
  modified:
    - index.html
    - test/harness.js
    - test/app.test.js

key-decisions:
  - "mergeDB_legacy is copied verbatim from the pre-phase mergeDB with exactly one edit (blank() → blank_legacy()), per REG-13 — every comment and code path preserved so the differential is against the real historical behaviour, not a paraphrase"
  - "Sort invariants (weights/petWeights by date, sessions via sessionSort) moved from mergeDB's hand-written tail into mergeCollections, applied per-entry from each COLLECTIONS spec's declared sortBy — chosen over 01-PATTERNS.md's suggested 'sorts stay hand-written outside the loop' so a future collection (sleep, plan 01-05) needs no mergeDB edit to get its declared order"
  - "ROW_FOR row factories are keyed by exactly the fields each list's key function reads (id for sessions/cardio/ideas, date for weights/petWeights, created+text for todos, date+item+cat for hobbyLog) so two calls with the same tag collide on purpose and two different tags never do, without needing populatedDB()'s full row shape"
  - "The REG-13 incident-replay block builds every fixture with a local populatedLegacyDB() helper rather than reusing populatedDB() (declared later in the file), keeping Task 1 self-contained per the plan's explicit instruction"

patterns-established:
  - "The _legacy-twin + differential-test pattern from plans 01-01/01-02 now covers all four hand-written consumers named in REG-12; mergeDB_legacy is the last one standing before REG-14's cleanup in plan 01-07"

requirements-completed: [REG-05, REG-09, REG-10, REG-12, REG-13]

coverage:
  - id: D1
    description: "mergeDB_legacy is a frozen, verbatim copy of the pre-phase mergeDB (calling blank_legacy() instead of blank()); every sync incident in CLAUDE.md's data-loss rules is replayed as a synthetic two-device fixture through both mergeDB_legacy and mergeDB, with identical output (legacyView-compared) — a characterisation baseline Task 2 must keep green"
    requirement: "REG-13"
    verification:
      - kind: unit
        ref: "test/app.test.js#merge parity: <50 cases> — legacyView(mergeDB_legacy) === legacyView(mergeDB) on every incident fixture"
        status: pass
      - kind: unit
        ref: "test/app.test.js#merge incident: <50 cases> — incident-specific assertions on the derived output"
        status: pass
    human_judgment: false
  - id: D2
    description: "mergeCollections(r, l, localNewer, out) is the only per-collection merge; it dispatches strictly on each COLLECTIONS entry's declared merge value and throws naming the collection on anything unrecognised or missing, never defaulting (REG-05); declared sortBy is applied per-entry after merging"
    requirement: "REG-05"
    verification:
      - kind: unit
        ref: "test/app.test.js#merge: an unrecognised map strategy throws, never defaults"
        status: pass
      - kind: unit
        ref: "test/app.test.js#merge: a list with a map strategy throws, never defaults"
        status: pass
      - kind: unit
        ref: "test/app.test.js#merge: declared sortBy is applied, undeclared lists keep merge order"
        status: pass
    human_judgment: false
  - id: D3
    description: "The gen-mismatch wholesale replace in mergeDB is textually unchanged (byte-identical modulo whitespace) and returns before mergeCollections is ever reached; Erase all data and Import→Replace leave zero unioned survivors from the losing side, in both argument positions"
    requirement: "REG-10"
    verification:
      - kind: unit
        ref: "test/app.test.js#merge: the gen-mismatch block is byte-for-byte the pre-phase block"
        status: pass
      - kind: unit
        ref: "test/app.test.js#merge: the gen early return comes before mergeCollections"
        status: pass
      - kind: unit
        ref: "test/app.test.js#merge: derived mergeDB still short-circuits wholesale-replace on gen mismatch — Erase all and Import→Replace leave zero survivors"
        status: pass
      - kind: unit
        ref: "test/app.test.js#merge incident: Erase all data: the erased side wins wholesale (+ swapped), gen off by one: 3 vs 4 replaces wholesale"
        status: pass
    human_judgment: false
  - id: D4
    description: "mergeDB delegates every per-collection merge to mergeCollections (contains neither mergeUnion( nor mergeDateMap( in its own source); the derived output matches the frozen mergeDB_legacy output on every REG-13 incident fixture, proving the derivation is behaviourally equivalent"
    requirement: "REG-09"
    verification:
      - kind: unit
        ref: "test/app.test.js#merge: mergeDB delegates every per-collection merge"
        status: pass
      - kind: unit
        ref: "test/app.test.js#merge parity: <50 cases, re-run unmodified from Task 1>"
        status: pass
    human_judgment: false
  - id: D5
    description: "Each of the two tasks lands in its own commit, tagged 'REG-12 step 4/4' for the derivation; mergeDB is replaced last and on its own, differential-tested against its frozen twin over every per-incident synthetic fixture"
    requirement: "REG-12"
    verification:
      - kind: other
        ref: "git log --reverse --format=%s | grep -o 'REG-12 step [0-9]/4' -> steps 1/4 through 4/4 in order, mergeDB last"
        status: pass
    human_judgment: false

duration: ~20min
completed: 2026-09-11
status: complete
---

# Phase 1 Plan 3: Deriving mergeDB()'s per-collection merge from COLLECTIONS Summary

**`mergeDB()`'s ten hand-written per-collection assignments collapsed into `mergeCollections()`, dispatched on each `COLLECTIONS` entry's declared merge strategy — with the `gen`-mismatch wholesale replace left textually untouched, and every 2026-07-25/Migration-15-class incident replayed as a synthetic two-device fixture proving the derived merge matches its frozen twin.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-09-11 (immediately following plan 01-02)
- **Completed:** 2026-09-11
- **Tasks:** 2 of 2
- **Files modified:** 3 (index.html, test/harness.js, test/app.test.js)

## Accomplishments

- `mergeDB_legacy(remote, local, localWins)` is a verbatim frozen copy of the pre-phase `mergeDB`, with exactly one edit — `blank()` → `blank_legacy()` — so the differential is against the real historical behaviour, comments and all.
- A 50-fixture, two-part regression battery (`test/app.test.js`, "── every sync incident, replayed ──") replays every named incident from `CLAUDE.md`'s data-loss rules and `01-RESEARCH.md`'s REG-13 table as synthetic two-device pairs — the 2026-07-25 blind-write, the Migration-15 silent revert, `mobilityLog`/`lawnLog` explicit-false-vs-absent-vs-inner-key-union, journal line-union ordering, Erase all data (both argument orders), Import→Replace, per-list delete-never-resurrected and delete-here-re-add-there races, equal-mtime/equal-updatedAt tie-breaks, pre-id session identity (Pitfall 3), a finished workout's null draft beating a stale one, the weather cache never syncing, empty-input pairs, schema-never-backwards, and gen off-by-one — each run through both `mergeDB_legacy` and `mergeDB` via a `sameMerge()` harness, plus the PITFALLS Pitfall 1 hazard-named check asserted directly on `mergeDB`.
- `mergeCollections(r, l, localNewer, out)` is now the only per-collection merge: it loops `COLLECTIONS`, requires `merge:'union'` for every list (else throws naming the collection), requires `'line-union'` or `'replace-whole'` for every map (else throws), and applies each entry's declared `sortBy` right after merging — a deliberate departure from `01-PATTERNS.md`'s note that sorts stay hand-written, so a future collection's declared order needs no `mergeDB` edit.
- `mergeDB` is thinned to the gen-mismatch block (byte-identical, still the first `return`), the scalar `Object.assign`, one `mergeCollections(r, l, localNewer, out);` call, the draft repair, and the `_schema`/`updatedAt`/`wx` invariants — the three hand-written sort lines are gone, since `mergeCollections` now applies them.
- Suite grew from the plan 01-02 baseline of 386 passed to 495 passed, 0 failed after Task 1, and stayed at 495 passed, 0 failed after Task 2's derivation — every "merge parity: " and "merge incident: " check from the Task 1 baseline held unmodified through the refactor.
- `git log --reverse` shows `REG-12 step 1/4` through `4/4` in order — `mergeDB` replaced last and on its own, per REG-12.

## Task Commits

Each task was committed atomically:

1. **Task 1: Freeze mergeDB as mergeDB_legacy and replay every sync incident through both (characterisation baseline)** - `97d37f4` (test)
2. **Task 2: Write mergeCollections() and thin mergeDB to call it; the gen early return stays untouched (REG-12 step 4/4)** - `04c127b` (refactor)

## Files Created/Modified

- `index.html` - Adds `mergeDB_legacy` (frozen, calling `blank_legacy()`) directly after `mergeDB`; adds `mergeCollections(r, l, localNewer, out)` directly above `mergeDB`; thins `mergeDB`'s per-collection section to a single `mergeCollections(r, l, localNewer, out);` call and removes the three now-redundant hand-written sort lines
- `test/harness.js` - Appends `mergeDB_legacy` and `mergeCollections` to `loadApp`'s `names` array
- `test/app.test.js` - Appends the two new names to `REQUIRED_EXPORTS`; adds `clone()`, `legacyView()`, `sameMerge()`, `ROW_FOR`, `LEGACY_LISTS`/`LEGACY_MAPS`, and `populatedLegacyDB()` helpers; adds the 50-fixture "── every sync incident, replayed ──" block (REG-13) plus the Pitfall 1 hazard check; adds `GEN_BLOCK` and the "── mergeDB() is derived from COLLECTIONS (REG-09/REG-10/REG-05) ──" block (6 checks: byte-identical gen block, ordering, delegation, two throw-on-unrecognised-strategy cases, sortBy application)

## Decisions Made

- `mergeDB_legacy` copies the pre-phase `mergeDB` verbatim, comments included, with the single sanctioned edit (`blank()` → `blank_legacy()`) — preserving the exact historical code the incidents were fixed against, not a paraphrase of it
- Sort invariants moved into `mergeCollections`, dispatched from each entry's declared `sortBy` (function or string field name), rather than staying as three hand-written lines in `mergeDB` — chosen over `01-PATTERNS.md`'s suggestion specifically so plan 01-05's `sleep` collection needs no `mergeDB` edit to sort correctly
- `ROW_FOR`'s seven row factories are keyed by exactly the fields each list's real key function reads, not by a generic `{id: tag}` shape, so the fixtures exercise the actual `sessKey`/`cardioKey`/`ideaKey`/`todoKey`/`hobbyKey` composite-key logic rather than bypassing it
- Built a local `populatedLegacyDB()` helper for the incident-replay block instead of reusing `populatedDB()` (declared later in the file), per the plan's explicit instruction to keep Task 1 self-contained

## Deviations from Plan

None - plan executed exactly as written. No Rule 1-4 auto-fixes were needed; all `must_haves.truths` and acceptance criteria passed on first implementation, including the REG-05/REG-09/REG-10 dispatch, ordering, and empty-input checks.

## Issues Encountered

None.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `mergeCollections`, the thinned `mergeDB`, and `mergeDB_legacy` are in place and differential-tested, ready for plan 01-04's real-backup differential (which can run `mergeDB_legacy` immediately, since it is untouched) and plan 01-05's `sleep` collection (which needs no `mergeDB` edit for its merge or sort behaviour, only a `COLLECTIONS` entry)
- Plan 01-07 (REG-14) can delete `mergeDB_legacy` — the last of the four `_legacy` twins from plans 01-01/01-02/01-03 — once plan 01-04's real-backup differential also lands
- No consumer *behavior* changed in this plan beyond the intentional throw-on-unrecognised-strategy failure mode (a new, loud failure, not a behavior change to any existing collection) — every pre-existing check (386 baseline before this plan) still passes unmodified alongside the 109 new checks this plan added

## Self-Check: PASSED

All claimed files exist (index.html, test/harness.js, test/app.test.js, this SUMMARY.md) and both task commits (97d37f4, 04c127b) are present in git log.

---
*Phase: 01-f1-the-collections-registry*
*Completed: 2026-09-11*
