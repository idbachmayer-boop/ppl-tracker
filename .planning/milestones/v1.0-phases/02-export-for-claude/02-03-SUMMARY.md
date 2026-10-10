---
phase: 02-export-for-claude
plan: 03
subsystem: export
tags: [markdown-export, web-share-api, gfm-escaping, header-metadata]

# Dependency graph
requires:
  - phase: 02-export-for-claude (plan 02-01)
    provides: "{field,label,unit} column shape, buildMarkdownExport()/exportRows()/mdCell()/mdEscape()/mdHeader(), the Settings 'Export for Claude (.md)' button, exportMarkdown()/downloadMarkdown()"
  - phase: 02-export-for-claude (plan 02-02)
    provides: "skipped-day rows, day-flag bookkeeping filter, oldest-first stable sort, zeroIsMissing, and the row-correctness/privacy proofs the header's row counts read from"
provides:
  - "buildMarkdownExport() header block: '- Date range: FIRST to LAST' (or 'no dated entries') and '- Rows per section: label: N rows · …' in COLLECTIONS order, both computed from the same per-section {spec, rows} array the tables below are printed from (D-13, EXP-08)"
  - "exportShareFailed(err, text, filename): AbortError (Ian cancelled) returns false and stays silent; any other rejection or synchronous throw falls back to downloadMarkdown and returns true (D-01)"
  - "exportMarkdown() rewritten as a synchronous 'share' | 'download' | 'error' dispatch: builds the file, shares it via navigator.share when File/canShare/share all exist and canShare is truthy, downloads otherwise, and shows \"Couldn't build the export\" on a build throw — never awaiting before navigator.share (RESEARCH Pitfall 6)"
  - "A 17-test EXP-06/EXP-07 battery pinning unit-in-header-once, ISO dates, pipe/backslash-run doubling, CRLF/CR/LF/U+2028/U+2029 collapse, trim-to-em-dash, emoji/accented-text passthrough, and object-valued weights — behavior plan 02-01 already shipped, now locked"
  - "A counts-only Markdown-export pass over Ian's real backup (test/local/real-db-snapshot.json, local-only, git-ignored) proving the header/table concurrency guarantee on real data, SKIP when the file is absent"
affects: []

# Actuals (#2632)
actuals:
  tokens: 6746
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "buildMarkdownExport() computes Object.keys(COLLECTIONS).map(name => ({spec, rows: exportRows(name)})) exactly once per call; both the header's date-range/row-count line and the tables below read from that same array, so a header count can never disagree with its own table (EXP-08 concurrency) — the same 'compute once, derive twice' shape as plan 02-02's dayFlagRows two-stage filter"
    - "exportMarkdown() stays a plain synchronous function even though it calls navigator.share(): the share attempt is fired and .catch-handled inline, with the function returning 'share' immediately after handing the attempt to the OS, rather than awaiting the sheet's resolution — required because a user gesture's transient activation can expire the instant an await interposes (RESEARCH Pitfall 6)"
    - "exportShareFailed(err, text, filename) is the single fallback funnel for every non-cancel share outcome (rejection or synchronous throw) — one function, one rule (AbortError is silent, everything else downloads), rather than duplicating the cancel-check at each of the three call sites that could reach it"
    - "Per-test navigator/File/Blob/anchor stubs (shareEnv() in test/app.test.js) are installed on a fresh loadApp() instance's __sandbox per scenario, leaving the harness's shared default sandbox (no File, no share) untouched — so the download-only environment every earlier check assumes keeps working unchanged"

key-files:
  created: []
  modified:
    - index.html (buildMarkdownExport header block; exportShareFailed; exportMarkdown rewritten synchronous share/download/error dispatch)
    - test/harness.js (exportShareFailed added to the sandbox `names` export list)
    - test/app.test.js (EXP-06/07/08/D-13 test battery; real-backup counts-only Markdown pass; shareEnv() test rig and the D-01/EXP-01 share-sheet battery; REQUIRED_EXPORTS/EXPORTER_FNS extended)

key-decisions:
  - "The ISO-dates-never-display-formatted check (EXP-06) uses a freshly seeded instance rather than the shared X fixture, because by that point in the file X's Sleep collection has already been emptied by an earlier EXP-04 softDelete test — reusing X would have silently dropped Sleep from the required-labels set"
  - "exportMarkdown() returns 'share' as soon as the share attempt is handed to navigator.share(), regardless of how the sheet is eventually resolved (success, cancel, or another failure) — matching the plan's Interfaces section ('exportMarkdown() returns share, download or error') and keeping the function's return value about which delivery mechanism was attempted, not its eventual outcome"

patterns-established:
  - "Header-and-table concurrency proof pattern: derive presentation metadata (counts, ranges) from the identical data structure the detail view renders from, then test both by parsing the actual rendered output back apart (mdSections) rather than recomputing the metadata independently in the test"

requirements-completed: [EXP-01, EXP-06, EXP-07, EXP-08]

coverage:
  - id: D1
    description: "The export opens with a header block: what the file is, when it was generated (UTC ISO), the overall date range across every section, and a per-section row count in COLLECTIONS order — an empty section reads '0 entries', one row reads '1 row'. The date range and every section's count are computed from the exact same rows array each table is printed from, so they can never disagree, including on a fixture where the earliest date is in one section and the latest in another, a single-row fixture, a fully empty DB, and a malformed (non-ISO) date that must not stretch the range."
    requirement: EXP-08
    verification:
      - kind: unit
        ref: "test/app.test.js — export: the header says what the file is and when it was generated (EXP-08/D-13)"
        status: pass
      - kind: unit
        ref: "test/app.test.js — export: the header states the date range across sections (EXP-08/D-13)"
        status: pass
      - kind: unit
        ref: "test/app.test.js — export: the header lists every section's row count in COLLECTIONS order (D-13)"
        status: pass
      - kind: unit
        ref: "test/app.test.js — export: every header count equals its table's rows (EXP-08)"
        status: pass
      - kind: unit
        ref: "test/app.test.js — export: one dated row gives a D to D range (EXP-08 adjacency)"
        status: pass
      - kind: unit
        ref: "test/app.test.js — export: an empty export says no dated entries and 0 entries everywhere (EXP-08 empty)"
        status: pass
      - kind: unit
        ref: "test/app.test.js — export: a malformed date is exported but does not stretch the range (EXP-08 ordering)"
        status: pass
      - kind: unit
        ref: "test/app.test.js — real backup: the Markdown export builds without throwing / one section per declared collection / every section count equals its table rows / every table row has its header's cell count (local-only, SKIP when test/local/real-db-snapshot.json is absent)"
        status: pass
    human_judgment: false
  - id: D2
    description: "EXP-06 (already shipped by plan 02-01) is pinned by dedicated tests: weight headers follow DB.unit (lb then kg) on Workouts/Weigh-ins/Pet weigh-ins with no unit suffix on any cell; Cardio's distance header stays the literal 'distance (km)' regardless of DB.unit; every first-column cell across a populated fixture is either ISO (YYYY-MM-DD) or the — missing marker, with at least one ISO cell in Workouts, Weigh-ins, Cardio, Todos, Journal and Sleep, and no fmtDate-style display date anywhere in the file."
    requirement: EXP-06
    verification:
      - kind: unit
        ref: "test/app.test.js — export: weight headers follow DB.unit, lb then kg (EXP-06)"
        status: pass
      - kind: unit
        ref: "test/app.test.js — export: distance stays km whatever DB.unit is (EXP-06)"
        status: pass
      - kind: unit
        ref: "test/app.test.js — export: dates are ISO, never display-formatted (EXP-06)"
        status: pass
    human_judgment: false
  - id: D3
    description: "EXP-07 (already shipped by plan 02-01) is pinned by a battery covering: a pipe and an embedded newline in the same cell; a bare backslash before a pipe (doubles to three backslashes plus the escaped pipe); a lone trailing backslash (untouched); CRLF/CR/LF/U+2028/U+2029 all collapsing to <br>; leading/trailing whitespace trimmed and a whitespace-only or null/undefined/empty value writing —; a ZWJ family-emoji sequence and accented text (café) passing through byte-for-byte; the existing hostile <script> & \"quotes\" idea exporting as typed with no &lt;/&quot; anywhere in the file; and an object-valued weight (from a hand-edited backup) exporting as escaped JSON text with the row's cell count intact."
    requirement: EXP-07
    verification:
      - kind: unit
        ref: "test/app.test.js — export: pipes, backslashes and line breaks never change a row's width (EXP-07)"
        status: pass
      - kind: unit
        ref: "test/app.test.js — export: cells are trimmed and whitespace-only is — (EXP-07 empty)"
        status: pass
      - kind: unit
        ref: "test/app.test.js — export: CRLF, CR, LF, U+2028 and U+2029 become <br> (EXP-07)"
        status: pass
      - kind: unit
        ref: "test/app.test.js — export: emoji and accented text survive unchanged (EXP-07 encoding)"
        status: pass
      - kind: unit
        ref: "test/app.test.js — export: a hostile <script> idea is exported as typed, not HTML-escaped (EXP-07)"
        status: pass
      - kind: unit
        ref: "test/app.test.js — export: an object-valued weight exports as escaped JSON with the row intact (EXP-07)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Tapping Export for Claude opens the OS share sheet with the .md file wherever File/navigator.canShare/navigator.share all exist and canShare({files:[file]}) is truthy — canShare is asked about the exact same File object that is then shared. Cancelling (AbortError) downloads nothing and shows no toast; any other rejection or a synchronous throw from share() still falls back to the same Blob download every unsupported device uses. Devices missing File, canShare, or share, or where canShare returns false, go straight to the download and never call share."
    requirement: EXP-01
    verification:
      - kind: unit
        ref: "test/app.test.js — export: with a file share sheet, tapping shares ppl-export-2026-08-07.md and downloads nothing (D-01/D-03)"
        status: pass
      - kind: unit
        ref: "test/app.test.js — export: canShare is asked about the same file that is shared (D-01)"
        status: pass
      - kind: unit
        ref: "test/app.test.js — export: cancelling the share sheet downloads nothing and shows no error (D-01)"
        status: pass
      - kind: unit
        ref: "test/app.test.js — export: any other share failure falls back to the download (D-01)"
        status: pass
      - kind: unit
        ref: "test/app.test.js — export: a share call that throws falls back to the download (D-01)"
        status: pass
      - kind: unit
        ref: "test/app.test.js — export: canShare false goes straight to the download (D-01)"
        status: pass
      - kind: unit
        ref: "test/app.test.js — export: no canShare goes straight to the download (D-01)"
        status: pass
      - kind: unit
        ref: "test/app.test.js — export: no File constructor goes straight to the download (D-01)"
        status: pass
      - kind: unit
        ref: "test/app.test.js — export: exportShareFailed stays silent on AbortError and downloads otherwise (D-01)"
        status: pass
    human_judgment: false
  - id: D5
    description: "The Markdown export never counts as a backup and never makes this device look newest to sync: no export path (download, share success, cancel, or a non-cancel share failure) writes DB, localStorage, or DB.lastBackupAt, and two exports in a row over unchanged data produce byte-identical files (EXP-01's safety prohibition, and the concurrency guarantee behind D-13's header)."
    requirement: EXP-01
    verification:
      - kind: unit
        ref: "test/app.test.js — export: no export path writes DB, localStorage or lastBackupAt (EXP-01)"
        status: pass
      - kind: unit
        ref: "test/app.test.js — export: two exports in a row produce identical files (EXP-01 concurrency)"
        status: pass
    human_judgment: false
  - id: D6
    description: "A build failure (a throwing getter on DB, standing in for corrupted stored data) shows the toast \"Couldn't build the export\" and neither shares nor downloads anything."
    verification:
      - kind: unit
        ref: "test/app.test.js — export: a build failure shows a toast and neither shares nor downloads"
        status: pass
    human_judgment: false
  - id: D7
    description: "Manual-only, collected at end-of-phase verification per 02-VALIDATION.md: the share sheet actually opening on Ian's phone, cancel behavior on-device, whether Android's Chrome offers the share sheet for a .md/text/markdown file at all (flagged assumption — MDN's shareable-file-types list has no .md/text/markdown entry, so Android may fall through to the download instead), and opening the shared/downloaded file in the Claude app."
    human_judgment: true
    rationale: "navigator.share/canShare require a real phone, HTTPS, and an actual user gesture — none of which the Node vm-based harness can provide. This is explicitly out of scope for automated verification per the plan's own objective and 02-VALIDATION.md's Manual-Only Verifications list."

duration: "commit-to-commit ~5.5min (Task 1 08:12:35, Task 2 08:18:08, local clock); excludes reading time for PLAN.md, both prior SUMMARYs, RESEARCH.md and the relevant index.html/test sections"
completed: 2026-09-17
status: complete
---

# Phase 2 Plan 3: Export Header (Date Range + Row Counts) and Share-Sheet Delivery Summary

**The export now opens with a self-checking header (generated timestamp, date range, per-section row counts computed from the same arrays as the tables) and tapping "Export for Claude" opens the OS share sheet first, falling back to the existing download everywhere else — completing every EXP-01…EXP-08 requirement for the phase**

## Performance

- **Duration:** commit-to-commit ~5.5 min (local clock; Task 1 08:12:35, Task 2 08:18:08 — excludes reading PLAN.md, both prior plans' SUMMARYs, RESEARCH.md, and the relevant index.html/test sections before writing any test)
- **Started:** 2026-09-17 (session start, per STATE.md)
- **Completed:** 2026-09-17T08:18:08-05:00 (Task 2 commit)
- **Tasks:** 2 of 2
- **Files modified:** 3 (`index.html`, `test/harness.js`, `test/app.test.js`)

## Accomplishments

- `buildMarkdownExport()` now computes every collection's `{spec, rows}` exactly once per call, and both the new header lines and the tables below read from those same arrays — so a header count can never disagree with its own table (EXP-08 concurrency). The header gained `- Date range: FIRST to LAST` (or `no dated entries` on a fully empty DB) and `- Rows per section: label: N rows · …`, in `COLLECTIONS` order, with `0 entries` / `1 row` / `N rows` per section.
- A malformed (non-ISO) date is still exported as a cell but is excluded from the date-range computation, which only considers strings matching `/^\d{4}-\d{2}-\d{2}$/`.
- A 17-test battery pins EXP-06 (DB.unit-driven weight headers with no unit suffix on any cell, Cardio's literal `distance (km)`, ISO-only dates with no `fmtDate` display formatting anywhere) and EXP-07 (pipe/backslash-run doubling, CRLF/CR/LF/U+2028/U+2029 collapsing to `<br>`, trim-to-em-dash on whitespace-only/null/undefined, ZWJ-emoji and accented-text passthrough, the existing hostile `<script>` idea exporting unescaped, and an object-valued weight from a hand-edited backup exporting as escaped JSON) — all behavior plan 02-01 already shipped, now locked against regression.
- A counts-only Markdown-export pass runs over `test/local/real-db-snapshot.json` (Ian's real backup) when present locally: builds without throwing, one section per declared collection, every header count equals its table's rows, every row has its header's cell count. The block prints a loud `SKIP` line when the file is absent, never a silent pass, and its extras hold only numbers, booleans and collection/section labels — never a row, date or note (T-01-13).
- `exportShareFailed(err, text, filename)` is the single fallback funnel: an `AbortError` (Ian cancelled the share sheet) returns `false` and stays silent — no download, no toast; any other rejection or synchronous throw from `navigator.share` still calls `downloadMarkdown` and returns `true`, so Ian always ends up with his file unless he actually cancelled (D-01, RESEARCH Open Question 2).
- `exportMarkdown()` is rewritten as a synchronous `'share' | 'download' | 'error'` dispatch: builds the text inside a `try`/`catch` (a throw shows `"Couldn't build the export"` and returns `'error'`), constructs the `File` only when the constructor exists, asks `navigator.canShare({files:[file]})` about that exact `File`, and — only when `File`, `canShare`, and `share` all exist and `canShare` is truthy — calls `navigator.share({files:[file]})` directly with no `await` before it (RESEARCH Pitfall 6: a user gesture's transient activation can expire the instant anything asynchronous runs first). Every other combination falls through to the existing `downloadMarkdown` path. No path ever calls `save`/`saveLocal`/`touch` or touches `lastBackupAt`/`backupSnoozeAt` — the Markdown export still isn't a backup (EXP-01, RESEARCH Assumption A2).
- `test/harness.js` exports `exportShareFailed`; `test/app.test.js` adds a per-instance `shareEnv()` rig (stubbed `navigator.canShare`/`navigator.share`, `File`, `Blob`, and a click-recording anchor) used across 11 new share/fallback/persistence tests, leaving the harness's shared default sandbox (no `File`, no `share`) untouched so every earlier download-only test keeps passing unchanged.

## Task Commits

Each task was committed atomically:

1. **Task 1: Header block with date range and per-section counts (EXP-08, D-13), plus the unit, ISO-date and escaping battery (EXP-06, EXP-07) and a counts-only real-backup pass** - `e41dd95` (feat)
2. **Task 2: Share sheet with download fallback (D-01): share where the device can, stay silent on cancel, fall back everywhere else, never write DB** - `7b217c4` (feat)

**Plan metadata:** commit pending (this SUMMARY + STATE.md/ROADMAP.md/REQUIREMENTS.md update)

_Note: both tasks were TDD (tests written first, expected to fail on the header/share-branch checks and pass at once on the EXP-06/EXP-07 pins that plan 02-01 already implemented), and each landed as a single `feat` commit per the plan's own instruction to "run the suite until it is green, then commit" once per task._

## Files Created/Modified

- `index.html` - `buildMarkdownExport()`'s header block (date range + per-section counts, computed once and shared with the tables); `exportShareFailed(err, text, filename)`; `exportMarkdown()` rewritten as the synchronous share/download/error dispatch
- `test/harness.js` - `exportShareFailed` appended to the sandbox `names` export list
- `test/app.test.js` - 17 new `export:` tests for D-13/EXP-06/EXP-07/EXP-08 plus a real-backup counts-only Markdown-export block (Task 1); `REQUIRED_EXPORTS`/`EXPORTER_FNS` extended with `exportShareFailed`; a `shareEnv()` test rig and 11 new `export:` tests for the D-01 share/fallback branches and the EXP-01 no-persistence/concurrency guarantees (Task 2)

## Decisions Made

- The EXP-06 "dates are ISO, never display-formatted" check runs against a freshly seeded `loadApp`/`populatedDB` instance rather than the shared `X` fixture used throughout the rest of the section — by that point in the file, an earlier EXP-04 test has already soft-deleted `X.DB.sleep`'s only live row, which would have silently dropped `Sleep` from the required-labels set and weakened the check without anyone noticing.
- `exportMarkdown()` returns `'share'` as soon as the share attempt is handed to `navigator.share()`, not based on how the sheet is eventually resolved — matching the plan's own Interfaces section (`exportMarkdown() returns 'share', 'download' or 'error'`) and keeping the return value about which delivery mechanism was attempted, independent of whether Ian completed, cancelled, or hit an error in the sheet.

## Deviations from Plan

None - plan executed exactly as written. Both tasks' TDD RED phase behaved exactly as predicted: the D-13/EXP-08 header assertions failed before the header lines existed (Task 1) and the D-01 share-branch assertions failed before `exportShareFailed`/the rewritten `exportMarkdown` existed (Task 2), while the EXP-06/EXP-07 pins passed immediately since plan 02-01 had already implemented that behavior.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Every EXP-01…EXP-08 requirement now has passing automated coverage across plans 02-01, 02-02 and 02-03. `npm test` is green at 753 passed / 0 failed / 0 skipped (0 skipped because `test/local/real-db-snapshot.json` is present in this environment and the real-backup Markdown pass ran against it; the block prints a loud `SKIP` line instead when that local-only file is absent).
- This is the last plan in Phase 2 (ROADMAP success criteria 1 and 5, and D-01/D-03/D-13, were the two items still open — both now implemented and tested).
- Manual-only verification remains open per 02-VALIDATION.md: the share sheet on Ian's actual phone, cancel behavior on-device, whether Android's Chrome offers a share sheet for a `.md`/`text/markdown` file at all (RESEARCH's flagged Android assumption — MDN's shareable-file-types list has no `.md`/`text/markdown` entry, so `canShare` may return `false` there and correctly fall back to the download), and opening the resulting file in the Claude app. These are collected at end-of-phase verification, not gated on this plan.
- No blockers.

---
*Phase: 02-export-for-claude*
*Completed: 2026-09-17*

## Self-Check: PASSED

- FOUND: `.planning/phases/02-export-for-claude/02-03-SUMMARY.md`
- FOUND: `e41dd95` (Task 1 commit)
- FOUND: `7b217c4` (Task 2 commit)
