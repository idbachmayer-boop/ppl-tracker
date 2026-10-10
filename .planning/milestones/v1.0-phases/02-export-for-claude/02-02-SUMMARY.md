---
phase: 02-export-for-claude
plan: 02
subsystem: export
tags: [markdown-export, row-shaping, stable-sort, privacy-proof]

# Dependency graph
requires:
  - phase: 02-export-for-claude (plan 02-01)
    provides: "{field,label,unit} column shape, buildMarkdownExport()/exportRows()/mdCell()/mdHeader(), the Settings 'Export for Claude (.md)' button, and the EXP-02 probe-collection/static-analysis proof"
provides:
  - "sessionRows one-row skipped-day branch — a skipped workout day exports exactly one '(skipped)' row (D-04)"
  - "dayFlagRows two-stage filter — bookkeeping keys (__session, override*) dropped first, then only values strictly === true pass — and mobilityLog/lawnLog columns reduced to date+item (D-05)"
  - "exportRows oldest-first stable sort by columns[0], compared as plain strings, missing value sorts first (D-11)"
  - "mdCell(v, col) zeroIsMissing rule; COLLECTIONS.cardio's minutes/distanceKm declare it so addCardio's stored 0 renders as — (D-09)"
  - "collectionProblems() validates the new zeroIsMissing column key"
  - "Proof tests for EXP-03 (workout-flattening edges), EXP-04 (delete-then-re-export, malformed-DB empty case), EXP-05 (no id/mtime/deletedAt/source), and D-07 (nothing outside COLLECTIONS reaches the file, proven with unique markers in lawn/pet-name/exercise-registry/draft)"
affects: [02-export-for-claude (plan 02-03 builds the share-sheet branch and the EXP-07 escaping battery on top of this correctness layer)]

# Actuals (#2632)
actuals:
  tokens: 6653
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Two independent filter passes (bookkeeping-key drop, then strict === true) kept as separate .filter() calls rather than folded into one condition, so a future flag-shaped collection can't fall through a gap between the two checks (RESEARCH Pitfall 3)"
    - "exportRows' oldest-first sort compares columns[0] values as plain strings, never localeCompare, so the file's row order is identical regardless of the phone's locale; Array.prototype.sort's stability preserves stored order (sessionSort by endedAt, set order) for equal dates"
    - "mdCell(v, col) takes the column spec as an optional second argument so per-column presentation rules (zeroIsMissing) live in the registry, not as a special case hardcoded in the exporter"

key-files:
  created: []
  modified:
    - index.html (sessionRows skipped-day branch, dayFlagRows two-stage filter + REG-17 comment, mobilityLog/lawnLog columns date+item only, exportRows stable sort, buildMarkdownExport description line + mdCell column arg, mdCell(v,col) zeroIsMissing rule, collectionProblems zeroIsMissing key + boolean validation, COLLECTIONS.cardio zeroIsMissing on minutes/distanceKm)
    - test/app.test.js (REG-17 rows: block extended with D-04/D-05 fixtures and assertions; PROBE_MAP_LINE's done column removed; registry refusal battery gains 2 zeroIsMissing checks; 20 new export: tests for EXP-03/EXP-04/EXP-05/D-07/D-09/D-11 appended to the "export for Claude" section)

key-decisions:
  - "dayFlagRows' bookkeeping-key filter and strict-true filter are two chained .filter() calls, not one combined boolean expression, exactly per RESEARCH Pitfall 3's warning against folding them"
  - "COLLECTIONS.cardio's columns array was reformatted across multiple lines (unlike every other one-line COLLECTIONS entry) so each zeroIsMissing:true declaration sits on its own line and is independently greppable"

patterns-established:
  - "Column-level presentation rules (zeroIsMissing) are declared in COLLECTIONS and read by mdCell(v,col), keeping the exporter itself free of per-collection special cases — the same generic-dispatch discipline 02-01 established for labels/units"

requirements-completed: [EXP-03, EXP-04, EXP-05, EXP-06]

coverage:
  - id: D1
    description: "Workouts flatten to one row per set; a skipped day exports as exactly one explicit '(skipped)' row (D-04) instead of silently vanishing; set numbering, identical-set adjacency, empty-session, stored-precision (no rounding/coercion), and entries-then-extras ordering edges are pinned"
    requirement: EXP-03
    verification:
      - kind: unit
        ref: "test/app.test.js — rows: a skipped session is one row — (skipped), no set, weight or reps (D-04)"
        status: pass
      - kind: unit
        ref: "test/app.test.js — export: a skipped workout day is one Workouts row (D-04)"
        status: pass
      - kind: unit
        ref: "test/app.test.js — export: sets number from 1 within an exercise (EXP-03 boundary)"
        status: pass
      - kind: unit
        ref: "test/app.test.js — export: a live session with no sets contributes no rows (EXP-03 boundary)"
        status: pass
      - kind: unit
        ref: "test/app.test.js — export: two identical sets stay two rows (EXP-03 adjacency)"
        status: pass
      - kind: unit
        ref: "test/app.test.js — export: weight and reps are written exactly as stored (EXP-03 precision)"
        status: pass
      - kind: unit
        ref: "test/app.test.js — export: rows keep entries-then-extras order, sets ascending (EXP-03 ordering)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every table is read through liveOf(name)/DB[name] exactly as the views do (this plan does not touch that path — it pins the guarantee 02-01 already built): a soft-deleted row sharing a date with a live row leaves only the live row, deleting a row and exporting again drops it, and a missing list or a non-object/null map exports 'No entries' without throwing"
    requirement: EXP-04
    verification:
      - kind: unit
        ref: "test/app.test.js — export: a deleted row sharing a date with a live row leaves only the live row (EXP-04 adjacency)"
        status: pass
      - kind: unit
        ref: "test/app.test.js — export: deleting a row and exporting again drops it (EXP-04)"
        status: pass
      - kind: unit
        ref: "test/app.test.js — export: a missing list and a non-object or null map export No entries (EXP-04 empty)"
        status: pass
    human_judgment: false
  - id: D3
    description: "No id/mtime/deletedAt/source column or value reaches the file; mobilityLog/lawnLog export only date+item for flags strictly === true, dropping __-prefixed (__session) and override* (overrideWater/overrideMow) bookkeeping keys (D-05)"
    requirement: EXP-05
    verification:
      - kind: unit
        ref: "test/app.test.js — export: no id, mtime, deletedAt or source column or value leaks (EXP-05)"
        status: pass
      - kind: unit
        ref: "test/app.test.js — rows: dayFlagRows drops __ keys such as __session (D-05)"
        status: pass
      - kind: unit
        ref: "test/app.test.js — rows: dayFlagRows drops override keys and false flags (D-05)"
        status: pass
      - kind: unit
        ref: "test/app.test.js — rows: dayFlagRows keeps only true flags, as date + item (D-05)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Extends EXP-06's one-consistent-missing-marker guarantee to cardio's 'not entered' zero: addCardio stores 0 for whichever of minutes/distance Ian left blank, and mdCell(v, col) now renders that stored 0 as — via the new zeroIsMissing column key, while every other stored 0 (e.g. a 0 lb set) still renders as a real 0"
    requirement: EXP-06
    verification:
      - kind: unit
        ref: "test/app.test.js — export: cardio's blank minutes or distance writes — (D-09)"
        status: pass
      - kind: unit
        ref: "test/app.test.js — export: a column without zeroIsMissing still writes a real 0"
        status: pass
      - kind: unit
        ref: "test/app.test.js — registry: a zeroIsMissing that is not a boolean is refused"
        status: pass
      - kind: unit
        ref: "test/app.test.js — registry: zeroIsMissing true is accepted"
        status: pass
    human_judgment: false
  - id: D5
    description: "Rows in every table run oldest first by columns[0], a stable, locale-independent sort; a missing first-column value sorts first and writes — (D-11)"
    verification:
      - kind: unit
        ref: "test/app.test.js — export: rows run oldest first (D-11)"
        status: pass
      - kind: unit
        ref: "test/app.test.js — export: equal dates keep stored order — sessions (D-11 stable)"
        status: pass
      - kind: unit
        ref: "test/app.test.js — export: equal dates keep stored order — ideas (D-11 stable)"
        status: pass
      - kind: unit
        ref: "test/app.test.js — export: map days run oldest first (D-11)"
        status: pass
      - kind: unit
        ref: "test/app.test.js — export: a row with no date sorts first and writes — (D-11/D-09)"
        status: pass
    human_judgment: false
  - id: D6
    description: "Nothing outside COLLECTIONS reaches the file — the lawn location (lat/lon/label), pet name, exercise registry and the in-progress draft's session note are proven absent by seeding unique marker strings into each and asserting none appear in the export (D-07, ROADMAP Phase 2 criterion 3)"
    verification:
      - kind: unit
        ref: "test/app.test.js — export: nothing outside COLLECTIONS is exported (D-07)"
        status: pass
    human_judgment: false

duration: "commit-to-commit ~3min (Task 1 07:57:19, Task 2 08:00:02, local clock); total session time including research, reading and test authoring not separately tracked"
completed: 2026-09-17
status: complete
---

# Phase 2 Plan 2: Export Correctness — Skipped Days, Day-Flag Bookkeeping, Ordering, Zero-as-Missing, and Privacy Proofs Summary

**A skipped workout day now exports as one explicit "(skipped)" row, mobility/lawn flags export only what Ian actually ticked, every table runs oldest-first with a stable locale-independent sort, cardio's "not entered" zeros render as —, and 20 new tests prove deleted rows, internal ids and non-registry data never reach the file**

## Performance

- **Duration:** commit-to-commit ~3 min (local clock; see `duration` note above — total working time including reading 02-01's summary, the research doc, and authoring ~34 new tests was longer than the commit-timestamp delta suggests)
- **Started:** 2026-09-17 (session start, per STATE.md)
- **Completed:** 2026-09-17T08:00:02-05:00 (Task 2 commit)
- **Tasks:** 2 of 2
- **Files modified:** 2 (`index.html`, `test/app.test.js`)

## Accomplishments

- `sessionRows(s)` now returns exactly one `{exercise:'(skipped)', set:null, weight:null, reps:null}` row for any session with `skipped` truthy — a skipped day is never silently absent from the Workouts export (D-04). The skip `reason` is never exported.
- `dayFlagRows(date, obj)` runs two independent, unfoldable filters before emitting a row: bookkeeping keys (`__`-prefixed, `override*`) are dropped first, then only values strictly `=== true` pass. `mobilityLog`/`lawnLog` columns drop `done`, leaving `date` + `item` (D-05). An explicit `false` is bookkeeping, never a logged event.
- `exportRows(name)` stable-sorts every collection's projected rows by `columns[0]`'s value, compared as plain strings (never `localeCompare`, which would vary by phone locale). A missing date sorts first and prints as `—`. Rows with equal first-column values keep their stored order — session order via `sessionSort`, set order within a session, insertion order for ideas (D-11).
- `mdCell(v, col)` gained a second, optional `col` argument: when a column declares `zeroIsMissing: true` and the stored value is a number or numeric-string `0`, it renders `—` instead of `0`. `COLLECTIONS.cardio`'s `minutes` and `distanceKm` columns declare it, matching `addCardio()`'s "stores 0 for whichever was left blank" behavior and the Cardio view's existing `—` for zero distance (D-09). Every other column's `0` (e.g. a 0 lb set) still renders as a real `0`.
- `collectionProblems()` accepts the new `zeroIsMissing` column key and refuses a non-boolean value, naming the offending column.
- The workout-flattening edges (EXP-03) are pinned by tests: set numbers start at 1 per exercise, two identical sets stay two distinct rows, a live non-skipped session with no sets contributes zero rows, weight/reps are written exactly as stored with no rounding or coercion, and rows follow entries-then-extras order with sets ascending.
- EXP-04 (soft-deleted rows and malformed collections) and EXP-05 (no `id`/`mtime`/`deletedAt`/`source`) are proven with dedicated fixtures, including a delete-then-re-export round trip on the smoke fixture's Sleep collection.
- D-07 is proven directly: a fixture seeds unique marker strings into the lawn location, pet name, exercise registry, and an in-progress draft's session note, and asserts none of them — nor an unlogged productivity default — appear anywhere in the exported file.

## Task Commits

Each task was committed atomically:

1. **Task 1: Skipped days as one row (D-04), true-only day flags without bookkeeping keys (D-05), and the workout-flattening edges (EXP-03)** - `fca0ec3` (feat)
2. **Task 2: Oldest-first stable order (D-11), zero-as-missing for cardio (D-09), and proof that deleted rows, internal ids and non-registry data never reach the file (EXP-04, EXP-05, D-07)** - `a37214d` (feat)

**Plan metadata:** commit pending (this SUMMARY + STATE.md/ROADMAP.md update)

_Note: both tasks used the plan's TDD flow (tests written and run RED before the index.html change, then GREEN), but landed as single `feat` commits per task rather than separate `test`/`feat` commits — matching the plan's own instruction to "run the suite until it is green, then commit" once per task, not per RED/GREEN gate._

## Files Created/Modified

- `index.html` - `sessionRows` skipped-day branch; `dayFlagRows` two-stage filter and updated REG-17 comment; `mobilityLog`/`lawnLog` columns reduced to `date`+`item`; `exportRows` stable oldest-first sort; `buildMarkdownExport`'s description line and `mdCell` call site; `mdCell(v, col)` zeroIsMissing rule; `collectionProblems` zeroIsMissing key + boolean validation; `COLLECTIONS.cardio`'s `minutes`/`distanceKm` columns gain `zeroIsMissing:true`
- `test/app.test.js` - REG-17 `rows:` block extended with skipped-session and day-flag-filter fixtures/assertions (Task 1); `PROBE_MAP_LINE`'s `done` column removed to match `dayFlagRows`' new output shape (Task 1); 8 new `export:` tests for EXP-03/D-04/D-05 appended to the "export for Claude" section (Task 1); registry refusal battery gains 2 `zeroIsMissing` checks (Task 2); 12 new `export:` tests for D-11/D-09/EXP-04/EXP-05/D-07 appended to the same section (Task 2)

## Decisions Made

- `dayFlagRows`' bookkeeping-key filter and strict-true filter are two chained `.filter()` calls, never folded into one condition — exactly the structure RESEARCH Pitfall 3 warned was needed so a future flag-shaped collection's field can't fall through a gap between the two checks.
- `COLLECTIONS.cardio`'s `columns` array was reformatted across multiple lines (every other `COLLECTIONS` entry stays on one line) so each `zeroIsMissing:true` declaration is independently greppable — a minor formatting deviation from the "keep each entry on one line" convention Task 1 established for `mobilityLog`/`lawnLog`, made because the plan's own acceptance criteria greps for two separate `zeroIsMissing:true` occurrences.

## Deviations from Plan

None (beyond the cardio multi-line formatting note above, which is a formatting choice, not a behavior change) - plan executed exactly as written. Both tasks' TDD RED phase failed exactly as the plan predicted (missing skipped-row branch, missing `zeroIsMissing` support, unsorted rows), and GREEN was reached with the changes the plan specified.

## Issues Encountered

None. The RED-phase run for Task 1 crashed with an uncaught `TypeError` (rather than a clean `FAIL` line) on the "skipped row's keys equal columns fields" assertion, because `sessionRows` still returned `[]` pre-implementation and the test called `Object.keys(undefined)` — expected and consistent with the plan's own prediction that the D-04 assertions would fail before the `sessionRows` change landed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The exported file now proves its own correctness on three axes this plan owned: content fidelity (skipped days, day-flag bookkeeping), ordering (oldest-first, stable, locale-independent), and privacy (no soft-deleted rows, no internal ids, nothing outside `COLLECTIONS`). Plan 02-03 can build the share-sheet branch and the full EXP-07 escaping battery on top of this without touching `sessionRows`, `dayFlagRows`, `exportRows`, or `mdCell` again.
- `npm test` is green at 720 passed / 0 failed / 0 skipped, including every plan 02-01 check.
- No blockers.

---
*Phase: 02-export-for-claude*
*Completed: 2026-09-17*

## Self-Check: PASSED

- FOUND: `.planning/phases/02-export-for-claude/02-02-SUMMARY.md`
- FOUND: `fca0ec3` (Task 1 commit)
- FOUND: `a37214d` (Task 2 commit)
