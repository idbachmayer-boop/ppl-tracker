---
phase: 01-f1-the-collections-registry
plan: 02
subsystem: data-model
tags: [collections-registry, soft-delete, backup-validation, differential-testing]

# Dependency graph
requires:
  - phase: 01-f1-the-collections-registry (plan 01)
    provides: "COLLECTIONS registry (10 entries, kind/key/sortBy/merge/soft/required/columns/format), validated at module-eval time"
provides:
  - "blank() derived from COLLECTIONS, reading only spec.kind at module-eval time; blank_legacy() frozen for the REG-13 differential"
  - "liveOf(name) — the single soft-delete filter body, refusing any name that isn't a declared soft-delete list; all seven liveX() wrappers reduced to one-line delegates; seven live*_legacy twins frozen"
  - "validateBackup()'s required/optional list and map shape checks derived from COLLECTIONS in three precedence-preserving passes; validateBackup_legacy() frozen with the byte-identical pre-registry body"
  - "canon(v) and LEGACY_COLLECTIONS test helpers for cross-plan differential blocks (REG-13)"
affects: [phase-1-plan-03, phase-1-plan-04, phase-1-plan-07]

actuals:
  tokens: 5861
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Consumer derivation: replace one hand-written consumer of collection metadata per commit, cheapest first, each paired with a frozen _legacy twin and a differential test proving byte/reference/string identity"
    - "canon(v): recursive key-sorted, array-order-preserving JSON text for deep-equality comparisons that tolerate function-valued fields"
    - "liveOf(name) refuses (throws) on any name not declared as a soft-delete list, rather than defaulting to permissive — closes the exact gap Pitfall 6 warned about"

key-files:
  created: []
  modified:
    - index.html
    - test/harness.js
    - test/app.test.js

key-decisions:
  - "validateBackup's derived shape prologue keeps three separate passes over COLLECTIONS (required lists, then optional lists, then maps) rather than one combined loop, so the legacy list-order precedence is reproduced regardless of COLLECTIONS' own declaration order — chosen over the single-loop sketch in 01-PATTERNS.md because the plan's REG-08 ordering truth requires provable precedence, not just equivalent coverage"
  - "liveOf(name) throws on an undeclared or non-soft-list name instead of falling back to an empty array or the raw collection — a required-field failure mode, not a permissive default (Pitfall 6)"
  - "harness.js's HOBBIES_DEFAULT export was added in Task 1 (not previously exported) because the 'fresh containers on every call' test needs it to assert hobbies length without hand-typing the default array length"

patterns-established:
  - "Every replaced consumer keeps its pre-registry body under a `_legacy` suffix with a 'FROZEN ... Do not edit. Deleted in a later commit (REG-14)' comment, differential-tested against the derived version, and left untouched until plan 01-07"

requirements-completed: [REG-06, REG-07, REG-08, REG-12, REG-13]

coverage:
  - id: D1
    description: "blank() is derived from COLLECTIONS, reading only spec.kind at module-eval time; blank_legacy() is the verbatim pre-registry body, differential-tested for key parity, extra-key shape, fresh-containers-per-call, and unchanged scalar defaults"
    requirement: "REG-06"
    verification:
      - kind: unit
        ref: "test/app.test.js#blank: every key the hand-written blank() had is unchanged"
        status: pass
      - kind: unit
        ref: "test/app.test.js#blank: returns fresh containers on every call"
        status: pass
      - kind: unit
        ref: "test/app.test.js#blank: reads only kind from the registry"
        status: pass
    human_judgment: false
  - id: D2
    description: "liveOf(name) is the only soft-delete filter body; all seven liveX() wrappers delegate to it in one line; liveOf refuses any name not declared as a soft-delete list; the seven live*_legacy twins match output-for-output and reference-for-reference, including under concurrent softDelete"
    requirement: "REG-07"
    verification:
      - kind: unit
        ref: "test/app.test.js#live: liveTodos returns the stored rows, not copies"
        status: pass
      - kind: unit
        ref: "test/app.test.js#live: a delete between two reads shows on the next read"
        status: pass
      - kind: unit
        ref: "test/app.test.js#live: soft collection hobbyLog hides a deleted row"
        status: pass
      - kind: unit
        ref: "test/app.test.js#live: liveOf refuses a name that is not a declared soft list"
        status: pass
    human_judgment: false
  - id: D3
    description: "validateBackup()'s required/optional list and map shape checks come from three precedence-preserving passes over COLLECTIONS; per-row checks stay hand-written; validateBackup_legacy returns the byte-identical string on a named battery, a generated battery of 10 collections x 7 damage kinds, two-fault precedence cases, and non-object inputs"
    requirement: "REG-08"
    verification:
      - kind: unit
        ref: "test/app.test.js#validate: every legacy collection × every damage gives the same answer"
        status: pass
      - kind: unit
        ref: "test/app.test.js#validate: two faults report the same one first"
        status: pass
      - kind: unit
        ref: "test/app.test.js#validate: an empty object is refused with the missing-sessions message"
        status: pass
    human_judgment: false
  - id: D4
    description: "Each of the three consumers (blank, liveX family, validateBackup) is replaced in its own commit tagged 'REG-12 step N/4', in cheapest-first order, with the suite green at every commit"
    requirement: "REG-12"
    verification:
      - kind: other
        ref: "git log --reverse --format=%s | grep -o 'REG-12 step [0-9]/4' -> steps 1/4, 2/4, 3/4 in order"
        status: pass
    human_judgment: false
  - id: D5
    description: "blank_legacy, the seven live*_legacy twins, and validateBackup_legacy remain in index.html, byte-identical to their pre-phase bodies, for plan 01-04's real-backup differential and plan 01-07's later removal"
    requirement: "REG-13"
    verification:
      - kind: unit
        ref: "grep -cE '^function (blank_legacy|validateBackup_legacy)\\(' index.html -> 2; grep -cE '^function live[A-Za-z]+_legacy\\(\\)' index.html -> 7"
        status: pass
    human_judgment: false

duration: ~15min
completed: 2026-09-11
status: complete
---

# Phase 1 Plan 2: Deriving blank(), liveX() and validateBackup() from COLLECTIONS Summary

**Three hand-written consumers — `blank()`, the seven `liveX()` soft-delete filters, and `validateBackup()`'s shape prologue — replaced with COLLECTIONS-derived versions, one commit each in cheapest-first order, each paired with a frozen `_legacy` twin and a differential test proving parity.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-09-11T14:15:00-05:00 (approx, immediately following plan 01-01)
- **Completed:** 2026-09-11T14:29:00-05:00
- **Tasks:** 3 of 3
- **Files modified:** 3 (index.html, test/harness.js, test/app.test.js)

## Accomplishments

- `blank()` now loops `COLLECTIONS`, reading only `spec.kind`, for every list/map default; the eleven hand-written scalar defaults are unchanged. `blank_legacy()` keeps the verbatim pre-registry body. A six-check parity block proves key equality, extra-key shape, fresh-containers-per-call, unchanged scalars, and that `blank()`'s source touches nothing but `COLLECTIONS`/`kind`.
- `liveOf(name)` is now the single soft-delete filter body: it looks up `COLLECTIONS[name]` and throws `liveOf: <name> is not a declared soft-delete list` for any missing, non-list, or non-soft entry — closing the exact "permissive default" gap Pitfall 6 warned about. All seven `liveX()` wrappers (`liveSessions`, `liveWeights`, `livePetWeights`, `liveCardio`, `liveIdeas`, `liveTodos`, `liveHobbyLog`) are now one-line delegates. The seven `live*_legacy` twins are frozen verbatim. A 27-check block proves per-wrapper output and reference-identity parity, missing/null/empty handling, idempotency, a delete-between-two-reads concurrency case, a registry-driven loop covering every declared soft list (so a future collection needs no test edit), `liveOf`'s refusal of undeclared names, and delegation/no-dynamic-generation source checks.
- `validateBackup()`'s required-list/optional-list/map shape checks are now three precedence-preserving passes over `COLLECTIONS` (required lists, then optional lists, then maps), reproducing the legacy list-order precedence regardless of registry declaration order. Message templates were copied byte-for-byte from the legacy body, including the U+2019 in "isn't"/"it's". Deep per-row checks (date format, nested entries/sets, weigh-in numeric check) are untouched. `validateBackup_legacy()` is frozen verbatim. An 18-check block proves string-identical output across a 12-case named battery, a generated battery of 10 legacy collections × 7 damage kinds (70 sub-cases), three two-fault precedence orderings, an empty-object case, an all-optional-absent case, and four non-object inputs.
- Suite grew from the plan 01-01 baseline of 319 passed to 386 passed, 0 failed — every pre-existing check, including the migration/merge/smoke blocks that call `blank()` and the `liveX()` family indirectly, still passes unmodified.
- Every commit leaves `TZ=America/Chicago node test/app.test.js` green; `git log --reverse` shows `REG-12 step 1/4`, `2/4`, `3/4` in order, one consumer per commit.

## Task Commits

Each task was committed atomically:

1. **Task 1: Derive blank() from COLLECTIONS, keeping blank_legacy (REG-12 step 1/4)** - `a044bfd` (refactor)
2. **Task 2: Derive the liveX() family from COLLECTIONS via liveOf(), keeping the seven twins (REG-12 step 2/4)** - `f7818c7` (refactor)
3. **Task 3: Derive validateBackup()'s shape checks from COLLECTIONS, keeping validateBackup_legacy (REG-12 step 3/4)** - `2e37053` (refactor)

## Files Created/Modified

- `index.html` - Adds derived `blank()` and frozen `blank_legacy()`; adds `liveOf(name)` and rewrites the seven `liveX()` wrappers as delegates, with the seven `live*_legacy` twins frozen below them; replaces `validateBackup()`'s four hand-written shape lines with three `COLLECTIONS`-driven passes and adds frozen `validateBackup_legacy()`
- `test/harness.js` - Appends `blank_legacy`, `HOBBIES_DEFAULT`, `liveOf`, the six named `liveX()` wrappers still missing from the export list, `softDelete`, the seven `live*_legacy` names, and `validateBackup_legacy` to `loadApp`'s `names` array (`liveWeights`/`livePetWeights` were already exported)
- `test/app.test.js` - Appends the new names to `REQUIRED_EXPORTS`; adds `canon(v)` and `LEGACY_COLLECTIONS`; adds three new blocks: "blank() is derived from COLLECTIONS (REG-06)" (6 checks), "the soft-delete filters are derived from COLLECTIONS (REG-07)" (27 checks), and "validateBackup() takes its shape checks from COLLECTIONS (REG-08)" (18 checks)

## Decisions Made

- Kept `validateBackup`'s derived shape prologue as three separate passes rather than 01-PATTERNS.md's single combined loop, because the plan's REG-08 ordering truth requires the derived validator to report the same fault first as the legacy one regardless of `COLLECTIONS`' declaration order — a property three ordered passes guarantee and one combined loop does not
- `liveOf` fails loudly (throws) rather than silently returning `[]` or the raw array for an undeclared/non-soft name, per Pitfall 6's explicit warning against a permissive generic filter default
- Added `HOBBIES_DEFAULT` to the test harness export list in Task 1 (previously unexported) so the "fresh containers on every call" check can assert `blank().hobbies.length` against the real default length instead of a hand-typed magic number

## Deviations from Plan

None - plan executed exactly as written. No Rule 1-4 auto-fixes were needed; all behavior-bullet tests passed on first implementation. The only additions beyond the plan's literal text were the `HOBBIES_DEFAULT` harness export (needed to implement the plan's own "fresh containers" check as specified) and folding all three named twins into `test/harness.js`'s `names` array only in the task where each first became relevant, to keep every commit scoped to its own consumer per REG-12.

## Issues Encountered

None.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `liveOf`, the derived `blank()`, the derived `validateBackup()` shape prologue, and all nine `_legacy` twins are in place and differential-tested, ready for plan 01-03 to derive `mergeDB()`/`mergeCollections()` (REG-09, REG-10, REG-12 step 4/4) — the consumer named in the incident history — building on the same pattern
- Plan 01-04's real-backup differential can run against `validateBackup_legacy` immediately, since it is still present and byte-identical
- Plan 01-07 (REG-14) can delete all nine `_legacy` twins once plan 01-03's `mergeDB` differential also lands
- No consumer *behavior* changed in this plan beyond the intentional `liveOf` refusal for undeclared names (a new failure mode, not a behavior change to any existing collection) — every pre-existing check (319 baseline) still passes unmodified alongside the 51 new checks this plan added

## Self-Check: PASSED

All claimed files exist (index.html, test/harness.js, test/app.test.js, this SUMMARY.md) and all three task commits (a044bfd, f7818c7, 2e37053) are present in git log.

---
*Phase: 01-f1-the-collections-registry*
*Completed: 2026-09-11*
