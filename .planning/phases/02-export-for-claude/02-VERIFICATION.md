---
phase: 02-export-for-claude
verified: 2026-09-17T00:00:00Z
status: human_needed
score: 20/20 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "On Ian's real phone (installed PWA, HTTPS, real tap): Settings → Backup → tap 'Export for Claude (.md)'"
    expected: "The OS share sheet opens listing the .md file (iOS Safari expected to share it); tapping a target such as the Claude app delivers the file"
    why_human: "navigator.share/canShare require a real device, a genuine user gesture and a secure context — the Node vm harness cannot provide any of the three (test/harness.js's sandbox stubs canShare/share per test, it does not exercise the real API)"
  - test: "Cancel the share sheet on the real phone"
    expected: "Nothing downloads and no toast/error appears (silent no-op, matching exportShareFailed's AbortError branch)"
    why_human: "Same as above — the AbortError branch is unit-tested with a stubbed rejection, but the real OS cancel gesture and its exact error shape can only be confirmed on-device"
  - test: "Tap 'Export for Claude (.md)' on Ian's Android phone in Chrome"
    expected: "Per RESEARCH's flagged assumption (MDN's shareable-file-types allowlist has no .md/text/markdown entry), canShare likely returns false and the file downloads directly instead of opening the share sheet — confirm which path actually occurs and whether Ian is satisfied with the download fallback as the Android experience"
    why_human: "Chromium's file-sharing allowlist behavior for this exact MIME/extension combination cannot be verified without a real Android Chrome instance"
  - test: "Open/attach the downloaded or shared ppl-export-YYYY-MM-DD.md in the Claude app/website"
    expected: "The file renders as valid Markdown: the header (title, Generated, Date range, Rows per section) is visible, each '## ' section renders as a table, Workouts is one row per set, and Claude can read the content as intended"
    why_human: "Only the real target application shows how the file is actually consumed; no automated check can substitute for reading it in the Claude app"
---

# Phase 2: Export for Claude Verification Report

**Phase Goal:** Ian can pull a clean, complete Markdown snapshot of his data out of the app for Claude to reason over, generated from the same `COLLECTIONS` declaration and the same live views as the rest of the app, so the export never becomes a second hand-maintained schema.
**Verified:** 2026-09-17
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Ian can export a Markdown file, separate from and alongside the JSON backup, with a header stating what it is, when it was generated, and the date range covered (EXP-01, EXP-08, D-13) | ✓ VERIFIED | `index.html:3362` button `onclick="exportMarkdown()"` sits directly below `exportData()`'s JSON button and above Import; `buildMarkdownExport()` (index.html:3416) emits `# PPL Tracker export`, `- Generated: <ISO>`, `- Date range: FIRST to LAST` / `no dated entries`, `- Rows per section: ...`. Confirmed by `PASS export: the header says what the file is and when it was generated (EXP-08/D-13)` and 6 more EXP-08 tests, all passing in the run I executed. |
| 2 | The Markdown table builder is derived from `COLLECTIONS`, not hand-written per collection; a 12th collection requires no exporter edit (EXP-02) | ✓ VERIFIED | `buildMarkdownExport` iterates `Object.keys(COLLECTIONS)` generically (index.html:3420); a probe collection injected by source transform gets its own section with no exporter change — `PASS export: a probe collection declared in one line exports its own section with no exporter edit (EXP-02)`. Static check `PASS export: no exporter function names a collection, a unit, a live wrapper, fmtDate, kmToDisp or esc (EXP-02)` confirms no hardcoded collection names in exporter source. |
| 3 | Every table is read through the same `liveX()`/`DB[name]` path the views use; a deleted row is absent from the export along with its internal id, never present with `deletedAt` visible (EXP-04, EXP-05) | ✓ VERIFIED | `exportRows` (index.html:3382-3390) calls `liveOf(name)` for lists and `DB[name]` for maps — same read path as the app's own views. Independently reproduced outside the test suite: a weights fixture with one soft-deleted row (`deletedAt:5`, id `w1`) and one live row (id `w2`) exported exactly one row (`191`), with no `w1`, no `deletedAt` anywhere in the output. Suite: `PASS export: a deleted row sharing a date with a live row leaves only the live row (EXP-04 adjacency)`, `PASS export: no id, mtime, deletedAt or source column or value leaks (EXP-05)`. |
| 4 | Workouts export as one flat row per set (date, workout, exercise, set number, weight, reps), not nested by session; a skipped day is one explicit row (EXP-03, D-04) | ✓ VERIFIED | `sessionRows` (index.html:3938) flattens sets to one row each and returns exactly one `(skipped)` row (set/weight/reps null) for a skipped session, with the skip reason never exported. Independently reproduced: a skipped session with an entry still exported exactly one row `\| 2026-08-01 \| PUSH \| (skipped) \| — \| — \| — \|` with no occurrence of the stored reason text ("tired"/"NO_LEAK"). Suite: `PASS export: a skipped workout day is one Workouts row (D-04)`, plus the EXP-03 boundary/adjacency/precision/ordering battery. |
| 5 | Dates are ISO, units appear once in the column header sourced from `DB.unit` (not hardcoded), and a pipe or embedded newline in a logged value still produces a valid, unbroken table row (EXP-06, EXP-07) | ✓ VERIFIED | `mdHeader` (index.html:3991) resolves `unit:'mass'` to `DB.unit` at export time; `mdEscape`/`mdCell` (index.html:3973-3989) double the backslash run before every pipe and collapse line-break runs to `<br>`. Suite: `PASS export: weight headers follow DB.unit, lb then kg (EXP-06)`, `PASS export: pipes, backslashes and line breaks never change a row's width (EXP-07)`, plus the full EXP-07 battery (CRLF/CR/LF/U+2028/U+2029, emoji/ZWJ, hostile `<script>` text, object-valued weights) all passing. |
| 6 | Only ticked day flags export (Mobility/Lawn), with bookkeeping keys (`__session`, `override*`) and explicit `false` dropped (D-05) | ✓ VERIFIED | `dayFlagRows` (index.html:3962) runs a bookkeeping-key filter then a strict `=== true` filter. Independently reproduced: `mobilityLog` with `{'Couch stretch':true, __session:'yoga', ignored:false}` exported exactly one row (`Couch stretch`), no `__session` anywhere in the file. Suite: `PASS rows: dayFlagRows drops __ keys such as __session (D-05)`, `PASS rows: dayFlagRows drops override keys and false flags (D-05)`. |
| 7 | Rows run oldest-first, stable, locale-independent (D-11); cardio's "not entered" 0 renders as — while every other 0 stays 0 (D-09) | ✓ VERIFIED | `exportRows`'s sort compares `columns[0]` as plain strings, never `localeCompare` (index.html:3403-3412); `mdCell(v,col)` applies `zeroIsMissing` only when the column declares it, and `COLLECTIONS.cardio`'s `minutes`/`distanceKm` declare it. Suite: `PASS export: rows run oldest first (D-11)`, `PASS export: cardio's blank minutes or distance writes — (D-09)`, `PASS export: a column without zeroIsMissing still writes a real 0`. |
| 8 | Nothing outside `COLLECTIONS` reaches the file — lawn location, pet name, hobby/productivity lists, exercise registry, in-progress draft, weather cache (D-07) | ✓ VERIFIED | `buildMarkdownExport` iterates only `Object.keys(COLLECTIONS)` (index.html:3420); no other `DB.*` field is read. Suite: `PASS export: nothing outside COLLECTIONS is exported (D-07)`, seeding unique marker strings into lawn/pet/exercise-registry/draft and asserting none appear. |
| 9 | Tapping the button opens the OS share sheet where the device supports it (canShare true), stays silent on cancel, and falls back to the existing download everywhere else, never writing DB/localStorage/lastBackupAt (D-01, D-03, EXP-01) | ✓ VERIFIED (mechanism); ⚠️ real-device delivery is unverifiable in this environment — see Human Verification | `exportMarkdown` (index.html:3478) stays synchronous through the `navigator.share` call (no `await` before it, per RESEARCH Pitfall 6); `exportShareFailed` (index.html:3465) returns `false` (silent) on `AbortError` and otherwise falls back to `downloadMarkdown`. Suite: `PASS export: cancelling the share sheet downloads nothing and shows no error (D-01)`, `PASS export: no export path writes DB, localStorage or lastBackupAt (EXP-01)`, `PASS export: two exports in a row produce identical files (EXP-01 concurrency)`, plus 8 more D-01 branch tests, all against stubbed `navigator`/`File`/`Blob`. The actual share sheet opening on a real phone, and Android's `.md`/`text/markdown` support, cannot be exercised by the harness — routed to human verification per 02-VALIDATION.md's own Manual-Only list. |

**Score:** 9/9 roadmap-level truths verified (0 present-but-behavior-unverified). Underlying it, all ~40 plan-level must-have truths across 02-01/02-02/02-03 are backed by passing automated tests I ran directly (753 passed, 0 failed, 0 skipped) plus 3 independent spot-checks reproduced outside the test suite (skipped-day export, EXP-05 id/bookkeeping absence, D-05 day-flag filter).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `index.html` — `COLLECTIONS` literal | Every entry has `label` + `columns:[{field,label,unit?}]` | ✓ VERIFIED | index.html:492-511, all 11 collections confirmed with `label` and object-shaped columns; `cardio.minutes`/`distanceKm` carry `zeroIsMissing:true` |
| `index.html` — `collectionProblems()` | Validates column-object shape, internal-field refusal, label rules, `zeroIsMissing` | ✓ VERIFIED | index.html:3999+; refusal-battery tests (`registry: *`) all pass |
| `index.html` — `mdEscape`, `mdCell`, `mdHeader` | Escaping/presentation helpers | ✓ VERIFIED | index.html:3973, 3979, 3991 — signatures match plan (`mdCell(v, col)`) |
| `index.html` — `exportRows`, `buildMarkdownExport`, `downloadMarkdown`, `exportMarkdown`, `exportShareFailed` | Generic exporter, header block, share/download dispatch | ✓ VERIFIED | index.html:3382, 3416, 3453, 3465, 3478 — all present, all wired, all reachable from the Settings button |
| Settings "Export for Claude (.md)" button | Below JSON export, above Import | ✓ VERIFIED | index.html:3362, single `onclick="exportMarkdown()"` in the file (`grep -c` = 1) |
| `test/harness.js` | Exports the 9 exporter function names | ✓ VERIFIED | line 125: `mdEscape, mdCell, mdHeader, exportRows, buildMarkdownExport, exportMarkdown, downloadMarkdown, exportData, exportShareFailed` all present |
| `test/app.test.js` | "export for Claude" test section, `mdCells`/`mdSections`/`EXPORTER_FNS` helpers, D-01…D-13/EXP-01…EXP-08 battery | ✓ VERIFIED | Confirmed by grep and by the passing test names enumerated above |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| Settings Backup card | `exportMarkdown()` | inline `onclick` | ✓ WIRED | index.html:3362, directly below JSON export button, above Import |
| `buildMarkdownExport()` | `COLLECTIONS` | `Object.keys(COLLECTIONS)` iteration | ✓ WIRED | index.html:3420 |
| `exportRows(name)` | `liveOf(name)` / `DB[name]` | same read path as app views | ✓ WIRED | index.html:3385 (`liveOf`), 3392 (`DB[name]`) |
| `mdHeader(col)` | `DB.unit` | unit kind `'mass'` resolved at export time | ✓ WIRED | index.html:3991-3998 |
| `exportMarkdown()` | `navigator.share({files:[file]})` | canShare-gated, no `await` before it | ✓ WIRED | index.html:3478-3500 |
| `navigator.share(...)` rejection | `exportShareFailed(err, text, filename)` | `.catch` handler | ✓ WIRED | index.html:3494 |
| `buildMarkdownExport()` header | `exportRows(name)` arrays | counts and tables read the same computed `sections` array | ✓ WIRED | index.html:3420 (`sections` computed once, read by both the header loop and the table loop) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full suite green | `npm test` | `753 passed, 0 failed, 0 skipped`, exit 0 | ✓ PASS |
| Skipped-day export is one row, reason not leaked | `node -e "...loadApp...buildMarkdownExport()..."` (ad hoc, independent of the committed test file) | `HAS_SKIPPED`, `NO_LEAK`, row = `\| 2026-08-01 \| PUSH \| (skipped) \| — \| — \| — \|` | ✓ PASS |
| Soft-deleted row + internal id + bookkeeping key absent from export | `node -e "...loadApp...buildMarkdownExport()..."` (ad hoc) | `OK_no___session`, `OK_no_deletedAt`, `OK_no_id`; only live weight row (`191`) and only the `true`-valued flag (`Couch stretch`) present | ✓ PASS |
| Settings button placement and exporter function presence | `grep` on `index.html`/`test/harness.js` | Button below JSON export, above Import; all 9 exporter names present in both files | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|----------------|--------------|--------|----------|
| EXP-01 | 02-01, 02-03 | Export Markdown file separate from/alongside JSON backup; never counts as a backup | ✓ SATISFIED | Button + `exportMarkdown()`; no `save`/`saveLocal`/`touch`/`lastBackupAt` on any export path (static check + before/after DB diff tests) |
| EXP-02 | 02-01 | Export derived from `COLLECTIONS`, not hand-written | ✓ SATISFIED | Probe-collection test, static no-hardcoded-name check |
| EXP-03 | 02-02 | Workouts export as flat rows, one per set | ✓ SATISFIED | `sessionRows` flattening + boundary/adjacency/precision/ordering tests |
| EXP-04 | 02-01, 02-02 | Every collection read through `liveX()`, never raw `DB[key]` | ✓ SATISFIED | `exportRows` routes through `liveOf`/`DB[name]`; delete-then-re-export test |
| EXP-05 | 02-02 | Soft-deleted rows and internal ids absent | ✓ SATISFIED | Declaration-side refusal (`collectionProblems`) + projection-side proof (no id/mtime/deletedAt/source anywhere) |
| EXP-06 | 02-01, 02-02, 02-03 | ISO dates, units once in header from `DB.unit`, one consistent missing marker | ✓ SATISFIED | `mdHeader` DB.unit resolution, `zeroIsMissing`, ISO-only date battery |
| EXP-07 | 02-03 | Cell values escaped for Markdown tables | ✓ SATISFIED | Full pipe/backslash/line-break/emoji/hostile-text/object-value battery |
| EXP-08 | 02-03 | Header block: what/when/date range so truncation is detectable | ✓ SATISFIED | Header lines + concurrency proof (counts computed from same array as tables) + real-backup counts-only pass |

No orphaned requirements: `REQUIREMENTS.md` maps only EXP-01…EXP-08 to Phase 2 (line 141: "EXP-01 … EXP-08 | Phase 2 | Complete"), and all eight are claimed across the three plans' frontmatter (`02-01`: EXP-01/02/04/06; `02-02`: EXP-03/04/05/06; `02-03`: EXP-01/06/07/08). REQUIREMENTS.md's checkboxes are ticked for all eight, but per the verification brief those ticks were not trusted — each ID above was independently checked against code and passing tests rather than taken from the checkbox state.

### Anti-Patterns Found

No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers found in the export-related code added this phase (`COLLECTIONS`, `collectionProblems`, `sessionRows`, `dayFlagRows`, `mdEscape`/`mdCell`/`mdHeader`, `exportRows`/`buildMarkdownExport`/`downloadMarkdown`/`exportMarkdown`/`exportShareFailed`).

The committed code review (`02-REVIEW.md`, 2026-09-17: 0 critical, 3 warnings, 2 info) found real, reproduced gaps, but none of them break a roadmap success criterion or an EXP-01…EXP-08 requirement as currently shipped, because none are reachable through the normal app UI:

| File | Finding | Severity | Impact on this phase's must-haves |
|------|---------|----------|-----------------------------------|
| index.html:3944 (`sessionRows`) | A `null`/`undefined` element inside a session's `sets` array throws and aborts the *entire* export (all collections), surfacing only as a generic "Couldn't build the export" toast | WARNING (advisory) | Not reachable via any in-app action (`addSet` et al. always produce well-shaped sets); only reachable via a hand-edited backup, a risk class CLAUDE.md already documents for `validateBackup`. Does not violate EXP-03/EXP-07's guarantees over data the app itself produces. |
| index.html:3382-3390 / 4017 | `collectionProblems` doesn't require a `kind:'list'` entry to declare `soft:true`, but `exportRows` unconditionally calls the throwing `liveOf` for every list | WARNING (advisory) | Only reachable by adding a future collection to `COLLECTIONS` that doesn't follow the current convention — not a defect in the nine shipped collections. Relevant to Phase 3's recipe work, not this phase's must-haves. |
| index.html:482-488 / 3408 / 3424 | The documented "`columns[0]` is always the date" contract is not enforced by `collectionProblems` | WARNING (advisory) | Same class as above — a future-collection risk, not a defect in what's shipped; all 11 current collections do put date first. |
| index.html:4008 / 3439 | `validLabel` doesn't forbid `·`, the header's own "Rows per section" delimiter | INFO | No current label contains `·`; cosmetic edge case for a future label. |
| index.html:3453-3458 | `downloadMarkdown`'s `true` return value is never inspected by callers | INFO | Dead code path, no functional impact. |

These are legitimate hardening opportunities for Phase 3 (which documents the "add a new collection" recipe) but are advisory findings, not gaps against Phase 2's roadmap success criteria or requirements — they don't undermine any must-have truth listed above.

### Human Verification Required

02-VALIDATION.md's "Manual-Only Verifications" table and the D-01 plan sections both flag these as requiring a real device; they cannot be exercised by the Node `vm` harness (no real user gesture, no HTTPS, no actual OS share sheet):

1. **Share sheet opens on Ian's phone.** Tap "Export for Claude (.md)" on the installed PWA. Expected: the OS share sheet lists the `.md` file (iOS Safari expected to work). Why human: `navigator.share`/`canShare` need a real device, secure context and genuine user gesture.
2. **Cancel behaviour on-device.** Cancel the share sheet. Expected: nothing downloads, no toast/error. Why human: same API constraint; the `AbortError` branch is only unit-tested against a stubbed rejection.
3. **Android `.md` share support.** Tap the button on Android Chrome. Expected (per RESEARCH's flagged assumption): `canShare` likely returns `false` (MDN's shareable-file-types list has no `.md`/`text/markdown` entry) and the file downloads directly — confirm this is the actual, acceptable behavior on Ian's device. Why human: real Chromium allowlist behavior for this MIME/extension pair can't be probed from Node.
4. **Opening the file in the Claude app.** Share or attach the resulting file to a Claude conversation. Expected: header (title, Generated, Date range, Rows per section) and per-section tables render correctly, Workouts as one row per set. Why human: only the real target application shows how the file is actually consumed.

### Gaps Summary

No blocking gaps. All 8 EXP requirements and every plan-level must-have (D-01 through D-13, plus every EXP-0X edge-probe truth) are implemented and covered by automated tests that I ran directly (753 passed, 0 failed, 0 skipped), plus 3 independent spot-checks reproduced outside the committed suite. The only open items are the four manual, device-dependent checks above, which the phase's own plans and 02-VALIDATION.md correctly identified as impossible to automate and deferred to end-of-phase human verification. The code review's 3 warnings are real and worth fixing but apply only to hypothetical future/malformed inputs (a hand-edited backup, or a future collection that doesn't follow the shipped convention) — they do not undermine any of the phase's must-haves against the data the app itself produces today.

---

*Verified: 2026-09-17*
*Verifier: Claude (gsd-verifier)*
