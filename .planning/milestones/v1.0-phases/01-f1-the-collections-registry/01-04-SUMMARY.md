---
phase: 01-f1-the-collections-registry
plan: 04
subsystem: testing
tags: [sync-merge, differential-testing, property-testing, gitignore, privacy]

# Dependency graph
requires:
  - phase: 01-f1-the-collections-registry (plan 03)
    provides: "mergeDB_legacy (frozen), mergeCollections()/mergeDB derived from COLLECTIONS, clone(), legacyView(), sameMerge(), ROW_FOR, LEGACY_LISTS/LEGACY_MAPS test helpers"
provides:
  - "mulberry32(seed), genDevice(rand, mode), contentOf(db)/contentOfLists(db) — seeded random two-device DB generator and content-comparison helpers"
  - "A 200-pair (400-merge) random differential proving mergeDB_legacy and mergeDB agree under randomized inputs (REG-13 breadth, REG-09 equivalence)"
  - "Merge-law checks at the mergeDB() level (PITFALLS Pitfall 5): idempotence, commutativity, list associativity — plus a documented, non-patched map-associativity counterexample"
  - "The repo's first .gitignore (test/local/, ppl-backup-*.json), keeping Ian's real backup out of git and the Pages upload"
  - "The real-backup differential (validateBackup, all seven liveX filters, the real boot path, five merge scenarios, key counts) — local-only, running when test/local/real-db-snapshot.json is present, skipping loudly (with a separate skip counter) when absent"
affects: [phase-1-plan-06, phase-1-plan-07]

actuals:
  tokens: 4175
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Property tests for the merge (idempotence/commutativity/associativity) are written at the mergeDB(remote, local, localWins) level, never on raw mergeUnion/mergeDateMap — per PITFALLS Pitfall 5, only mergeDB owns recomputing which side is newer"
    - "A law that fails identically on mergeDB_legacy and mergeDB is a pre-existing property to document, not a derivation bug to patch — applied to the map-collection non-associativity finding"
    - "skip is a third, independent counter (never folded into pass or fail); skipLine() prints a loud SKIP line so an absent local fixture reads as a visible, non-blocking skip rather than a silent pass"
    - "Real, sensitive fixture data stays git-ignored (test/local/) and out of the Pages upload; the differential that reads it prints only counts, booleans and names in any ok() extra, never row content"

key-files:
  created:
    - .gitignore
  modified:
    - test/app.test.js

key-decisions:
  - "The .gitignore's two rules (test/local/, ppl-backup-*.json) are the only two lines added — no other repo hygiene (e.g. .gitattributes) bundled in, per the plan's explicit scope boundary (that belongs to Phase 6)"
  - "genDevice(rand, mode) draws tags without replacement in 'laws' mode (distinct per device) but with replacement in 'differential' mode (deliberate same-tag collisions across devices), and uses two independent monotonic counters (mtime, updatedAt) in 'laws' mode so no two rows anywhere in the law battery share a timestamp — ruling out a coincidental tie satisfying a law by accident"
  - "Associativity is checked only over list collections (contentOfLists), because the map-collection counterexample proves map merges are NOT associative today — comparing maps in the associativity check would be asserting a false property"
  - "The real-backup block's merge scenarios and liveX comparisons run against R (the loadApp instance booted from the real file), not the top-level app instance, so every function under test operates on the data it actually parsed and migrated"

patterns-established:
  - "A seeded (mulberry32, fixed seed) two-device random generator plus a canon-based contentOf() comparator gives a reusable pattern for widening a hand-picked differential into a property-based one without a new dependency"

requirements-completed: [REG-09, REG-13]

coverage:
  - id: D1
    description: "A seeded random battery of 200 two-device pairs, merged with localWins false and true (400 total merges), gives identical legacyView output between mergeDB_legacy and mergeDB on every legacy collection and scalar"
    requirement: "REG-13"
    verification:
      - kind: unit
        ref: "test/app.test.js#random differential: 400 seeded merges, legacy and derived identical"
        status: pass
    human_judgment: false
  - id: D2
    description: "mergeDB-level merge laws: merging a device with itself changes nothing (idempotence), argument order does not change the result (commutativity), and merge(merge(A,B),C) === merge(A,merge(B,C)) for every list collection (associativity) — the chain a Firestore transaction retry performs"
    requirement: "REG-09"
    verification:
      - kind: unit
        ref: "test/app.test.js#merge law: merging a device with itself changes nothing (idempotence)"
        status: pass
      - kind: unit
        ref: "test/app.test.js#merge law: argument order does not change the result (commutativity)"
        status: pass
      - kind: unit
        ref: "test/app.test.js#merge law: retried transactions converge for every list collection (associativity)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Map collections (mobilityLog/lawnLog) are documented as not associative today, because a map day carries no per-day mtime; legacy and derived agree on the fixed counterexample instead of the discrepancy being silently patched"
    requirement: "REG-13"
    verification:
      - kind: unit
        ref: "test/app.test.js#merge law: map collections are not associative today (no per-day mtime) — legacy and derived agree on the counterexample"
        status: pass
    human_judgment: false
  - id: D4
    description: "A .gitignore keeps test/local/ and every ppl-backup-*.json out of git, verified by git check-ignore and by two committed suite checks so the rule can never silently drift"
    requirement: "REG-13"
    verification:
      - kind: unit
        ref: "test/app.test.js#gitignore: test/local/ is ignored"
        status: pass
      - kind: unit
        ref: "test/app.test.js#gitignore: exported backups (ppl-backup-*.json) are ignored"
        status: pass
      - kind: other
        ref: "git check-ignore -q test/local/real-db-snapshot.json && git check-ignore -q ppl-backup-2026-09-11.json && git ls-files test/local | wc -l -> 0"
        status: pass
    human_judgment: false
  - id: D5
    description: "The real-backup differential (validateBackup, all seven liveX filters, the real boot path, five merge scenarios × 2 localWins × argument-order variants, and per-collection key counts) runs only when test/local/real-db-snapshot.json is present, and otherwise prints a loud SKIP line plus a non-zero, separately-reported skipped count without affecting the exit code"
    requirement: "REG-13"
    verification:
      - kind: unit
        ref: "test/app.test.js#SKIP real-backup differential — test/local/real-db-snapshot.json is not present (on this machine, absent as expected; PASS path exercised in plan 01-06)"
        status: pass
    human_judgment: false

duration: ~50min
completed: 2026-09-11
status: complete
---

# Phase 1 Plan 4: Widening REG-13's Differential — Random Battery, Merge Laws, and the Real-Backup Leg Summary

**A seeded 200-pair (400-merge) random differential and mergeDB-level idempotence/commutativity/associativity checks widen REG-13/REG-09 beyond hand-picked incidents, plus the repo's first `.gitignore` and a real-backup differential that runs only when Ian's local, git-ignored export is present and otherwise skips loudly.**

## Performance

- **Duration:** ~50 min
- **Started:** 2026-09-11 (following plan 01-03)
- **Completed:** 2026-09-11
- **Tasks:** 2 of 2
- **Files modified:** 2 (test/app.test.js, .gitignore created)

## Accomplishments

- `mulberry32(seed)` (a standard 6-line 32-bit PRNG, seed `20260911`) plus `genDevice(rand, mode)` generate synthetic two-device `DB` pairs: 0–4 rows per legacy list drawn from a 4-tag pool (colliding on purpose in `'differential'` mode, distinct in `'laws'` mode), `mtime`/`updatedAt` drawn from small pools with deliberate ties and missing values in `'differential'` mode or strictly-increasing global counters in `'laws'` mode, ~1-in-5 rows soft-deleted, journal/mobilityLog/lawnLog days drawn from a 3-date pool with explicit-false and sometimes-absent days, and `gen`/`draft`/`wx` varied per the plan's exact probabilities.
- A 200-pair, 400-merge (`localWins` false and true) random battery compares `legacyView(mergeDB_legacy(...))` against `legacyView(mergeDB(...))` and finds them identical on every run — `PASS  random differential: 400 seeded merges, legacy and derived identical`.
- Three merge laws are checked directly on `mergeDB()`, never on the raw `mergeUnion`/`mergeDateMap` functions (PITFALLS Pitfall 5): idempotence (`mergeDB(A,A)` content-equals `A`), commutativity (`mergeDB(A,B)` content-equals `mergeDB(B,A)`), and list-collection associativity (`mergeDB(mergeDB(A,B),C)` content-equals `mergeDB(A,mergeDB(B,C))`) — the exact chain a Firestore transaction retry performs.
- A fourth check documents, rather than patches, that map collections (`mobilityLog`/`lawnLog`) are **not** associative today: a fixed counterexample (A `updatedAt:1` with a day set true, B `updatedAt:3` with no day, C `updatedAt:2` with the same day set false) gives `(A,B)then C` → `true` but `A then (B,C)` → `false` — a real divergence, but `mergeDB_legacy` and `mergeDB` agree on both wrong-looking-but-identical answers, because they run the same `mergeDateMap` code. Per PITFALLS Pitfall 5 and the plan's explicit prohibition, `mergeUnion`/`mergeDateMap` were **not** modified to "fix" this.
- The repo's first `.gitignore` (root) ignores `test/local/` and `ppl-backup-*.json` — the app's own export filename — with a comment block explaining why (public repo, Pages uploads the whole checkout). Verified live by `git check-ignore` and by two committed suite checks that read `.gitignore` directly, so the rule can never silently drift.
- A `skip` counter and `skipLine(msg)` helper were added alongside the existing `pass`/`fail` counters; the final summary line now reads `N passed, N failed, N skipped`, and a skip never changes `process.exit(fail ? 1 : 0)`.
- The real-backup differential (`REAL_PATH = test/local/real-db-snapshot.json`) covers: JSON parseability, `validateBackup`/`validateBackup_legacy` agreement and validity, a full boot with every declared collection shaped, all seven `liveX` wrappers against their `_legacy` twins, five merge scenarios (self, stale copy in both argument orders, deletions elsewhere, fresh device, erase) each run at `localWins` false and true, and per-collection distinct-key-count parity (`sessions`/`weights`/`petWeights`/`cardio`/`ideas`/`todos`/`hobbyLog`). On this machine the file is absent (as expected — Ian places it in plan 01-06), so the suite printed the loud `SKIP  real-backup differential — test/local/real-db-snapshot.json is not present (local only, git-ignored; see .gitignore)` line and a `1 skipped` summary count, never a silent pass.
- Suite grew from the plan 01-03 baseline of 495 passed to 500 passed, 0 failed after Task 1, and to 502 passed, 0 failed, 1 skipped after Task 2.

## Task Commits

Each task was committed atomically:

1. **Task 1: Seeded random merge differential, and merge laws checked at the mergeDB level** - `df47011` (test)
2. **Task 2: .gitignore plus the real-backup differential, local only and skipped loudly when absent** - `ada0773` (test)

## Files Created/Modified

- `.gitignore` (created) - Two rules (`test/local/`, `ppl-backup-*.json`) with a comment block explaining the public-repo/Pages-upload risk; nothing else added, per the plan's explicit scope boundary
- `test/app.test.js` - Adds `path` require, the `skip` counter and `skipLine()` helper, `REAL_PATH`; adds two `.gitignore`-reading checks; adds `mulberry32`, `genDevice`, `contentOf`/`contentOfLists`, the 200-pair random differential, the three mergeDB-level merge-law checks, and the map-associativity counterexample (all after the plan 01-03 blocks); adds the real-backup differential block (after Task 1's block); updates the final summary line to include the skipped count

## Decisions Made

- `genDevice`'s tag draws are without replacement in `'laws'` mode (guaranteeing distinctness within one device, as the laws need clean, non-colliding fixtures) and with replacement in `'differential'` mode (deliberately producing same-tag collisions, ties, and missing mtimes, since the differential's whole point is exercising those edges)
- Associativity is checked only over list collections (`contentOfLists`), not the whole DB, because the map-collection counterexample proves that property does not hold for maps today — asserting it there would be asserting something false
- The real-backup block operates on `R` (the `loadApp` instance booted from the real file's own text), not the earlier `app` instance, for every check downstream of boot (liveX wrappers, merge scenarios, key counts) — the plan's "boot R" step exists precisely so the checks run against data that instance actually parsed and migrated
- `.gitignore`'s comment explicitly names `.github/workflows/deploy.yml`'s `path: '.'` upload as the concrete mechanism a committed backup would be published through, not just an abstract "it's public" warning

## Deviations from Plan

None - plan executed exactly as written. Both tasks' `must_haves.truths` and acceptance criteria passed on first implementation: the 400-merge random differential, the four merge-law checks, the `.gitignore` rules and their live verification, and the real-backup block's loud SKIP path (the file was, as expected, absent on this executor's checkout).

## Issues Encountered

None.

## Known Stubs

None. The real-backup differential's PASS path (validateBackup, liveX parity, merge scenarios, key counts — all written and syntactically exercised via Node's module load, but not run against real data on this machine) is not a stub: it is a fully-implemented code path gated on a file that plan 01-06 is explicitly responsible for placing. Ian's own decision (`STATE.md`, 2026-09-11) requires exactly this local-only, skip-when-absent behavior.

## Findings

**Map collections (`mobilityLog`, `lawnLog`) are not associative today**, because a map day carries no per-day `mtime` — only the whole-DB `updatedAt` decides which side's day object wins on a collision, via `mergeDateMap`. Concretely: `A` (`updatedAt:1`, day `d = {mowed:true}`), `B` (`updatedAt:3`, no `d`), `C` (`updatedAt:2`, day `d = {mowed:false}`). Merging `(A,B)` then `C` keeps `d = {mowed:true}`; merging `A` then `(B,C)` gives `d = {mowed:false}`. Since every remote write goes through a Firestore `runTransaction()` that re-reads and re-merges on retry, a three-way conflict on a map collection's day can converge to either answer depending on which pairwise retry order actually happens over the network — a fact of timing, not application logic. This is a **pre-existing property** of `mergeDateMap` (present before this phase and unrelated to the REG-09/REG-10/REG-05 derivation), not a regression introduced by deriving `mergeCollections` from `COLLECTIONS`; `mergeDB_legacy` and `mergeDB` agree on the same (non-associative) answer for both groupings, proven by `test/app.test.js`'s `merge law: map collections are not associative today` check. Per PITFALLS Pitfall 5 and the plan's explicit prohibition, `mergeUnion`/`mergeDateMap` were **not** modified to "fix" this — it is recorded here as a finding for future sync work, not patched under this phase's differential-testing mandate. This matters for any future date-keyed map collection (the existing `journal` collection is unaffected — it uses `mergeJournalEntry`'s line-union, which has no analogous collision) and for any future sync work that touches three-way conflict resolution.

## User Setup Required

None - no external service configuration required. (Ian's real-backup export for the local differential is plan 01-06's `checkpoint:human-action`, not this plan's.)

## Next Phase Readiness

- The random battery, merge-law checks, `.gitignore`, and the real-backup differential are all in place; plan 01-06 can drop `test/local/real-db-snapshot.json` in place at any time and the suite will automatically switch from the SKIP line to the PASS lines (≥25 `real backup:` checks), with no test-file changes needed
- Plan 01-07's REG-14 legacy-function deletion (including `mergeDB_legacy`, `validateBackup_legacy`, and the six `_legacy` liveX twins) still waits on the real-data PASS per STATE.md's pending todo — this plan supplies the differential that PASS will exercise, but does not itself produce the PASS (the fixture file doesn't exist yet)
- The map-collection non-associativity finding is now on record (`STATE.md`/this SUMMARY) for whoever next touches three-way sync conflict resolution or adds a new `replace-whole` map collection

## Self-Check: PASSED

All claimed files exist (`.gitignore`, `test/app.test.js`, this `SUMMARY.md`) and both task commits (`df47011`, `ada0773`) are present in `git log`.

---
*Phase: 01-f1-the-collections-registry*
*Completed: 2026-09-11*
