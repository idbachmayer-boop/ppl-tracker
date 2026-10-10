# Phase 2: Export for Claude - Context

**Gathered:** 2026-09-16
**Status:** Ready for planning

<domain>
## Phase Boundary

A Markdown export of Ian's live data. It sits alongside the JSON backup and is built entirely from
`COLLECTIONS` plus the `liveX()` read path, ready to hand to a Claude conversation from the phone.
Requirements EXP-01…EXP-08 are fixed. This phase does not add a settings screen, windowing or
aggregation (EXP-09), or re-import.

</domain>

<decisions>
## Implementation Decisions

### Delivery
- **D-01:** Use `navigator.share` with a `.md` File on the phone. When sharing a file is unsupported (`navigator.canShare` is false or missing), fall back to a Blob download, the same mechanism `exportData()` uses (index.html:3362). If Ian cancels the share sheet (AbortError), do not fall back to a download and do not show an error.
- **D-02:** The button goes in Settings, directly below "Export backup (.json)" (index.html:3351), as its own button with a Phosphor icon. Do not add it to the home backup-reminder card.
- **D-03:** The filename is `ppl-export-YYYY-MM-DD.md`, using `todayISO()`.

### Table content
- **D-04:** A skipped workout day exports as a single row: date, workout, exercise `(skipped)`, and the missing marker in set/weight/reps. Today `sessionRows` returns no rows for these days, so it or the export-side formatter has to change. The differential goldens from Phase 1 must stay valid, which means the planner has to check whether `sessionRows` feeds any Phase 1 test.
- **D-05:** For `mobilityLog` and `lawnLog`, export only flags that are `true`. The `done` column goes away, leaving date and item. An explicit `false` is sync bookkeeping, not an event.
- **D-06:** A collection with no live rows still gets its heading, followed by a "No entries" line, so Claude can tell an empty section from a truncated one.
- **D-07:** Nothing outside `COLLECTIONS` is exported: no exercise registry, lawn config, hobbies/productivity lists or pet name. This keeps EXP-02 strict.

### Units, missing values, headers
- **D-08:** Each column spec in `COLLECTIONS` declares a readable label and, where it applies, a unit kind (`mass` → `DB.unit`, `km`). The exporter resolves them into headers: `weight (lb)` for sessions, weights and petWeights, `distance (km)` for cardio. Nothing is hard-coded in the exporter (EXP-02, EXP-06). The planner decides the metadata shape, e.g. `columns` entries becoming `{field,label,unit}` or a parallel map. `collectionProblems()` must validate the new shape, and `sleep` must still need no exporter edit.
- **D-09:** Every missing value is written as `—` (em dash), matching the app's views. It is never an empty cell and never `0`.
- **D-10:** Headers use readable labels, e.g. `value` → `weight`, `cat` → `category`, `distanceKm` → `distance (km)`.

### Order & layout
- **D-11:** Rows within each table run oldest first.
- **D-12:** Sections follow `COLLECTIONS` key order, with no grouping metadata. A new collection simply appends a section.
- **D-13:** The header block states what the file is, when it was generated, the overall date range, and a row count per section, e.g. "Workouts: 412 rows · Sleep: 0 entries". Together these let Claude check the file is complete.

### Claude's Discretion
- Exact header wording, section heading names (these may come from a registry label), the icon choice, and whether the `mass`/`km` unit mapping lives in the registry or in a small resolver keyed by unit kind.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/ROADMAP.md`: Phase 2 goal and 5 success criteria
- `.planning/REQUIREMENTS.md`: EXP-01…EXP-08 (locked), EXP-09 (deferred), and the out-of-scope table (no round-trip Markdown, no export config screen, no in-app correlation charts)
- `.planning/PROJECT.md`: Key Decisions ("Markdown tables", "derives from COLLECTIONS")
- `CLAUDE.md`: the escaping rules, the soft-delete/`liveX()` rule, and "Nocturne" theme tokens for the button
- `.planning/phases/01-f1-the-collections-registry/`: REG-17 (column/format metadata) and the differential tests and goldens that D-04/D-08 must not break
- `.planning/codebase/CONVENTIONS.md`, `.planning/codebase/TESTING.md`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `COLLECTIONS` (index.html:489): already carries `columns` and, for 4 collections, a `format` (`sessionRows`, `hobbyRows`, `journalRows`, `dayFlagRows` at index.html:3797–3818)
- `collectionProblems()` (index.html:3822): registry validator with an `ALLOWED` key list that has to grow for any new metadata
- `exportData()` (index.html:3360s): the Blob + `a.download` pattern to reuse for the fallback
- The `liveX()` derived filters, `todayISO()`, `ph()` icons, `esc()`

### Established Patterns
- Functions the registry references must be hoisted `function` declarations (REG-03/04)
- Tests run under `npm test`; the smoke check covers every screen, so the Settings button needs to render cleanly

### Integration Points
- The Settings export card (index.html:3350) and the registry column metadata

</code_context>

<specifics>
## Specific Ideas

- The main path is phone → share sheet → Claude app.
- Test fixtures should include a cell containing a pipe and a newline (EXP-07) and a deleted row (EXP-05).

</specifics>

<deferred>
## Deferred Ideas

- EXP-09 windowing/aggregation (already in the backlog).
- The export button on the home backup-reminder card (considered, not chosen).

</deferred>

---

*Phase: 02-export-for-claude*
*Context gathered: 2026-09-16*
