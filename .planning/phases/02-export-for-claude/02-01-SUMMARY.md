---
phase: 02-export-for-claude
plan: 01
subsystem: export
tags: [markdown-export, registry-schema, gfm-escaping, static-analysis-tests]

# Dependency graph
requires:
  - phase: 01-collections-registry
    provides: COLLECTIONS registry (kind/key/sortBy/merge/soft/required/explicitFalse/columns/format), liveOf(name), collectionProblems(reg), the REG-17 row-shaper functions (sessionRows, hobbyRows, journalRows, dayFlagRows)
provides:
  - "COLLECTIONS[*].columns promoted from string[] to {field,label,unit?}[] on all eleven collections, plus a required COLLECTIONS[*].label"
  - "collectionProblems() column-object shape rules: non-object columns, missing/duplicate field or label, internal-field refusal (id/mtime/deletedAt), unknown column keys, invalid unit, label with | or line break, missing collection label, cross-collection label collisions"
  - "buildMarkdownExport(), exportRows(name), mdEscape(s), mdCell(v), mdHeader(col), downloadMarkdown(text,filename), exportMarkdown() — a read-only Markdown export derived generically from COLLECTIONS and the live read path"
  - "Settings -> Backup 'Export for Claude (.md)' button, downloading ppl-export-YYYY-MM-DD.md"
  - "EXP-02 proof: a probe collection declared by source transform exports its own section with no exporter edit; static checks that no exporter function names a collection, unit, live wrapper, fmtDate, kmToDisp or esc(), and that none persists or reaches the network"
affects: [02-export-for-claude (plans 02-02, 02-03 build the recipe file and share-sheet branch on top of this column shape and exporter)]

# Actuals (#2632)
actuals:
  tokens: 8836
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Column metadata as {field,label,unit?} objects (single primary representation, no parallel label/unit map)"
    - "Markdown table cell escaping: mdEscape doubles the backslash run before every pipe and collapses line-break runs to <br>, so a GFM parser can never misread a cell boundary"
    - "Exporter functions read data only through liveOf(name) (lists) or DB[name] (maps), never a hand-written wrapper, so the export path proves EXP-04 by construction"
    - "Static source-string tests (comment-stripped app[name].toString()) enforce cross-cutting prohibitions (no persistence calls, no hardcoded collection/unit names) that unit tests on behavior alone cannot catch"

key-files:
  created: []
  modified:
    - index.html (COLLECTIONS literal, collectionProblems, mdEscape/mdCell/mdHeader, exportRows/buildMarkdownExport/downloadMarkdown/exportMarkdown, Settings Backup card)
    - test/harness.js (exporter function names added to the sandbox `names` export list)
    - test/app.test.js (Phase 1 checks moved to the new column shape; export tracer tests; registry refusal battery extended for column objects; EXP-02 probe, ordering, empty-section and static-analysis proofs)

key-decisions:
  - "COLLECTIONS.columns promoted in place from string[] to {field,label,unit}[] rather than adding a parallel label map, per the plan's assumption-delta decision — keeps one hand-maintained schema and preserves column order"
  - "Task 1's collectionProblems() rewrite already implemented every column-object refusal rule Task 2's behavior bullets required; Task 2 needed no index.html changes, only the missing test coverage"

patterns-established:
  - "A probe collection injected by source transform (test/harness.js opts.transform) is the standing pattern for proving 'declare it once, every consumer picks it up' without touching the real registry or shipping a fixture collection"

requirements-completed: [EXP-01, EXP-02, EXP-04, EXP-06]

coverage:
  - id: D1
    description: "Every COLLECTIONS column is a {field,label,unit?} object; collectionProblems() refuses malformed columns, internal-id columns, and missing/duplicate labels"
    requirement: EXP-04
    verification:
      - kind: unit
        ref: "test/app.test.js — registry: * (refusal battery, columns section)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Settings -> Backup shows 'Export for Claude (.md)' below 'Export backup (.json)'; tapping it downloads ppl-export-YYYY-MM-DD.md built from buildMarkdownExport(), while the JSON backup is unchanged"
    requirement: EXP-01
    verification:
      - kind: unit
        ref: "test/app.test.js — export: Settings shows Export for Claude (.md) directly below Export backup (.json) (D-02)"
        status: pass
      - kind: unit
        ref: "test/app.test.js — export: tapping it downloads ppl-export-2026-08-07.md as text/markdown (D-03/EXP-01)"
        status: pass
      - kind: unit
        ref: "test/app.test.js — export: the JSON backup still downloads ppl-backup-2026-08-07.json and records lastBackupAt (EXP-01)"
        status: pass
    human_judgment: false
  - id: D3
    description: "A probe collection and probe map declared in one line export their own sections with no exporter edit; sections follow COLLECTIONS order; a fresh install exports every section as 'No entries'; Mobility and Lawn export as two separate sections despite sharing dayFlagRows"
    requirement: EXP-02
    verification:
      - kind: unit
        ref: "test/app.test.js — export: a probe collection declared in one line exports its own section with no exporter edit (EXP-02)"
        status: pass
      - kind: unit
        ref: "test/app.test.js — export: sections follow COLLECTIONS order (D-12)"
        status: pass
      - kind: unit
        ref: "test/app.test.js — export: a fresh install exports every section as No entries (D-06)"
        status: pass
      - kind: unit
        ref: "test/app.test.js — export: Mobility and Lawn share dayFlagRows but export as two sections (EXP-02 adjacency)"
        status: pass
    human_judgment: false
  - id: D4
    description: "No exporter function names a real collection, unit literal, live wrapper, fmtDate, kmToDisp or esc(); none persists (save/saveLocal/touch/lastBackupAt/backupSnoozeAt) or reaches the network (fetch/firebase/pushNow/runTransaction); exportRows reads lists only through liveOf("
    requirement: EXP-06
    verification:
      - kind: unit
        ref: "test/app.test.js — export: no exporter function names a collection, a unit, a live wrapper, fmtDate, kmToDisp or esc (EXP-02)"
        status: pass
      - kind: unit
        ref: "test/app.test.js — export: no exporter function persists, touches backup bookkeeping or reaches the network"
        status: pass
      - kind: unit
        ref: "test/app.test.js — export: exportRows reads lists through liveOf (EXP-04)"
        status: pass
    human_judgment: false
  - id: D5
    description: "The downloaded ppl-export-YYYY-MM-DD.md opens correctly in a real browser: 11 sections Workouts through Sleep, empty sections read 'No entries', a soft-deleted weigh-in is excluded, and a '|' in an idea is escaped"
    human_judgment: true
    rationale: "Visual/functional browser verification of the tracer feedback gate — already performed by the orchestrator/user during the Task 1 checkpoint (approved) and documented here for traceability, not re-run by this continuation agent"

duration: ~22min (Task 1 ~15min, Task 2 ~7min; excludes the human checkpoint wait between them)
completed: 2026-09-17
status: complete
---

# Phase 2 Plan 1: Column-Object Registry + Markdown Export Tracer Summary

**COLLECTIONS columns promoted to `{field,label,unit}` objects; a generic `buildMarkdownExport()` derived from the registry, wired to a Settings "Export for Claude (.md)" button, with EXP-02 proven by a probe collection and static source checks**

## Performance

- **Duration:** ~22 min total (Task 1 ~15 min to first commit; a human checkpoint approval happened between tasks; Task 2 ~7 min)
- **Started:** 2026-09-17T12:25:12Z (per STATE.md session start)
- **Completed:** 2026-09-17T12:47:08Z (Task 2 commit)
- **Tasks:** 2 of 2
- **Files modified:** 3 (`index.html`, `test/harness.js`, `test/app.test.js`)

## Accomplishments

- Every `COLLECTIONS` entry now declares a `label` and column objects (`{field,label,unit?}`), promoted in place from the old `string[]` shape, with no parallel label map.
- `collectionProblems()` enforces the full column-object contract: non-object columns, missing/duplicate field or label, refusal of internal fields (`id`, `mtime`, `deletedAt`), unknown column keys, invalid `unit`, labels holding `|` or a line break, missing collection labels, and cross-collection label collisions — each problem naming the offending collection and field.
- `buildMarkdownExport()`, `exportRows(name)`, `mdEscape`, `mdCell`, `mdHeader`, `downloadMarkdown`, and `exportMarkdown` build a Markdown export generically from `COLLECTIONS` and the app's own live read path (`liveOf` for lists, `DB[name]` for maps) — no collection name, unit, or live wrapper is hardcoded anywhere in the exporter.
- Settings -> Backup now shows an "Export for Claude (.md)" button directly below "Export backup (.json)"; tapping it downloads `ppl-export-YYYY-MM-DD.md` while leaving the JSON backup path (and `lastBackupAt`) untouched.
- EXP-02 is proven end to end: a probe list and probe map declared via a one-line source transform each get their own section with a `DB.unit`-resolved header and no exporter edit; sections follow `Object.keys(COLLECTIONS)` order; a fresh install exports every section as "No entries"; `Mobility` and `Lawn` (which share `dayFlagRows`) export as two distinct sections.
- Static source-string checks (comment-stripped `app[name].toString()`) prove the exporter never persists (`save`/`saveLocal`/`touch`/`lastBackupAt`/`backupSnoozeAt`), never reaches the network (`fetch`/`firebase`/`pushNow`/`runTransaction`), and never hardcodes a collection name, unit literal, live wrapper, `fmtDate`, `kmToDisp`, or `esc(`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Tracer — promote columns to {field,label,unit}, build the Markdown export from COLLECTIONS, download it from a Settings button** - `d220b96` (feat)
2. **Task 2: Registry contract for the new column shape, and the EXP-02 proofs (probe collection, static exporter check, empty/adjacent/ordered sections)** - `de63474` (test)

**Plan metadata:** commit pending (this SUMMARY + STATE.md/ROADMAP.md update)

_Note: Task 2 required no `index.html` changes — Task 1's `collectionProblems()` rewrite already satisfied every behavior bullet in Task 2's `<behavior>` block, so the task landed as a single `test` commit adding the missing coverage._

## Files Created/Modified

- `index.html` - COLLECTIONS literal (labels + column objects on all eleven collections), `collectionProblems()` column-object rules, `mdEscape`/`mdCell`/`mdHeader`, `exportRows`/`buildMarkdownExport`/`downloadMarkdown`/`exportMarkdown`, Settings Backup card button (Task 1 only; unchanged in Task 2)
- `test/harness.js` - the seven exporter function names appended to the sandbox `names` export list (Task 1)
- `test/app.test.js` - Phase 1 checks (SLEEP-05 probe lines, refusal-battery factories, duplicate-columns refusal, REG-17 rows test) moved to the new column shape (Task 1); export tracer test section added (Task 1); registry refusal battery extended with 13 new column-object checks, and 9 new EXP-02/static-analysis checks added to the export section (Task 2)

## Decisions Made

- Promoted `columns` in place to `{field,label,unit}[]` rather than adding a parallel label/unit map (assumption-delta decision, D-08) — one hand-maintained schema, column order preserved for the Phase 1 REG-17 contract.
- Task 2's plan-mandated TDD step ("write every behavior bullet as its own ok before touching index.html, and run the suite") surfaced that Task 1's `collectionProblems()` rewrite already covered every refusal rule Task 2 specified. No index.html edit was needed for Task 2; the task's contribution is entirely test coverage that locks the contract in place and proves EXP-02.

## Deviations from Plan

None - plan executed exactly as written. Task 1's tracer implementation already satisfied Task 2's `<behavior>` bullets without additional `index.html` changes; this was anticipated by the plan's own TDD instruction ("Refusal bullets that Task 1's validator already enforces pass at once, which is expected").

## Issues Encountered

None.

## Checkpoint Record

Task 1 (`type="tracer"`) triggered the plan's designed human-verify checkpoint per its tracer feedback gate. The orchestrator/user response was **approved**: `buildMarkdownExport()` was inspected in a browser — header correct, 11 sections Workouts through Sleep in order, empty sections show "No entries", a soft-deleted weigh-in was excluded, and a `|` in an idea was escaped as `\|`. Suite was 670 passed / 0 failed immediately after Task 1's commit (691 passed / 0 failed / 0 skipped after Task 2's additions).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The `{field,label,unit}` column shape, `collectionProblems()` contract, and the seven exporter functions are locked in and proven generic (EXP-02) — plans 02-02 (the header/date-range recipe) and 02-03 (the share-sheet branch and full EXP-07 escaping battery) can build on this without touching the exporter's core logic.
- No blockers. The JSON backup path is untouched and remains the only round-trip format, as required by REQUIREMENTS Out of Scope.

---
*Phase: 02-export-for-claude*
*Completed: 2026-09-17*

## Self-Check: PASSED

- FOUND: `.planning/phases/02-export-for-claude/02-01-SUMMARY.md`
- FOUND: `d220b96` (Task 1 commit)
- FOUND: `de63474` (Task 2 commit)
