# Phase 2: Export for Claude - Research

**Researched:** 2026-09-16
**Domain:** Client-side Markdown generation + Web Share API, derived from an existing declarative registry (`COLLECTIONS`)
**Confidence:** HIGH (all core mechanics verified by reading `index.html` and `test/app.test.js` directly this session; the two external-platform questions are CITED against MDN/GFM spec, not ASSUMED)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Delivery**
- **D-01:** Use `navigator.share` with a `.md` File on the phone. When sharing a file is unsupported (`navigator.canShare` is false or missing), fall back to a Blob download, the same mechanism `exportData()` uses (index.html:3362). If Ian cancels the share sheet (AbortError), do not fall back to a download and do not show an error.
- **D-02:** The button goes in Settings, directly below "Export backup (.json)" (index.html:3351), as its own button with a Phosphor icon. Do not add it to the home backup-reminder card.
- **D-03:** The filename is `ppl-export-YYYY-MM-DD.md`, using `todayISO()`.

**Table content**
- **D-04:** A skipped workout day exports as a single row: date, workout, exercise `(skipped)`, and the missing marker in set/weight/reps. Today `sessionRows` returns no rows for these days, so it or the export-side formatter has to change. The differential goldens from Phase 1 must stay valid, which means the planner has to check whether `sessionRows` feeds any Phase 1 test.
- **D-05:** For `mobilityLog` and `lawnLog`, export only flags that are `true`. The `done` column goes away, leaving date and item. An explicit `false` is sync bookkeeping, not an event.
- **D-06:** A collection with no live rows still gets its heading, followed by a "No entries" line, so Claude can tell an empty section from a truncated one.
- **D-07:** Nothing outside `COLLECTIONS` is exported: no exercise registry, lawn config, hobbies/productivity lists or pet name. This keeps EXP-02 strict.

**Units, missing values, headers**
- **D-08:** Each column spec in `COLLECTIONS` declares a readable label and, where it applies, a unit kind (`mass` → `DB.unit`, `km`). The exporter resolves them into headers: `weight (lb)` for sessions, weights and petWeights, `distance (km)` for cardio. Nothing is hard-coded in the exporter (EXP-02, EXP-06). The planner decides the metadata shape, e.g. `columns` entries becoming `{field,label,unit}` or a parallel map. `collectionProblems()` must validate the new shape, and `sleep` must still need no exporter edit.
- **D-09:** Every missing value is written as `—` (em dash), matching the app's views. It is never an empty cell and never `0`.
- **D-10:** Headers use readable labels, e.g. `value` → `weight`, `cat` → `category`, `distanceKm` → `distance (km)`.

**Order & layout**
- **D-11:** Rows within each table run oldest first.
- **D-12:** Sections follow `COLLECTIONS` key order, with no grouping metadata. A new collection simply appends a section.
- **D-13:** The header block states what the file is, when it was generated, the overall date range, and a row count per section, e.g. "Workouts: 412 rows · Sleep: 0 entries". Together these let Claude check the file is complete.

### Claude's Discretion
- Exact header wording, section heading names (these may come from a registry label), the icon choice, and whether the `mass`/`km` unit mapping lives in the registry or in a small resolver keyed by unit kind.

### Deferred Ideas (OUT OF SCOPE)
- EXP-09 windowing/aggregation (already in the backlog).
- The export button on the home backup-reminder card (considered, not chosen).
- No round-trip Markdown, no export config screen, no in-app correlation charts (per REQUIREMENTS.md Out of Scope table).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EXP-01 | Ian can export a Markdown file separate from, and alongside, the existing JSON backup | `exportData()` pattern at `index.html:3361-3366` to mirror; see Code Examples and Assumption A2 on whether to share its bookkeeping |
| EXP-02 | The export is derived from `COLLECTIONS`, not hand-written per collection | Architecture Patterns 1-3 (generic dispatch over `COLLECTIONS[*].columns`/`format`); Don't Hand-Roll table |
| EXP-03 | Workouts export as flat rows — one row per set | Pattern 2 (`sessionRows`, verified verbatim at `index.html:3797-3807`) plus Pitfall 4's skipped-day extension |
| EXP-04 | Every collection's rows are read through the same `liveX()` path the views use, never raw `DB[key]` | `liveOf()` contract at `index.html:712-716`; Pattern 3 clarifies map collections (`journal`/`mobilityLog`/`lawnLog`) have no `liveX()` wrapper and are read via `DB[name]` directly, matching the app's own views |
| EXP-05 | Soft-deleted rows and internal ids are absent from the export | Pattern 1 (columns-projection never includes `id`/`mtime`/`deletedAt`, verified against all 11 `COLLECTIONS` entries); `liveOf()` filtering handles soft-delete |
| EXP-06 | ISO dates, units in header once (from `DB.unit`), one consistent missing marker | Code Examples' `headerFor()` sketch; Anti-Patterns warns against `fmtDate()`; Don't Hand-Roll table resolves the cardio-distance-unit nuance |
| EXP-07 | Cell values escaped for Markdown tables — pipes, newlines, whitespace | `mdEscapeCell()` sketch, CITED against the GFM table spec; Pitfall 1 |
| EXP-08 | Header block states what/when/date-range so truncation is detectable | Architecture Diagram's date-range note (`columns[0]` is always the date/created field across all 11 collections — verified); Validation Architecture EXP-08 row |

</phase_requirements>

## Summary

Phase 2 adds one pure function that turns `COLLECTIONS` + the live-row read paths into a Markdown
string, and one thin DOM/share wrapper around it. Nothing here is architecturally novel — Phase 1
(REG-17) already built the row-shaping half of this feature (`sessionRows`, `hobbyRows`,
`journalRows`, `dayFlagRows`, each collection's `columns` array) and left it unused, by design, for
this phase to consume. The `format` field has never been called by production code before now; the
only callers today are Phase 1's own tests. That makes every behavior change to a `format` function
safe with respect to Phase 1's differential-testing discipline — there is no `golden()` hash and no
merge-differential fixture anywhere that depends on `sessionRows`/`hobbyRows`/`journalRows`/
`dayFlagRows` output. The `rows:` tests at `test/app.test.js:1884-1912` are plain `ok()` assertions
the Phase 2 plan is free to extend.

The one real design decision left open by REG-17 is the column metadata shape. Today `columns` is an
array of plain field-name strings (`['date','workout','exercise','set','weight','reps']`) with no
label or unit information. CONTEXT.md's D-08 asks for `{field,label,unit}`. This research confirms
that change is mechanically contained to `collectionProblems()`'s columns-validation branch
(`index.html:3850-3852`), plus one now-broken Phase 1 test that compares row keys to
`COLLECTIONS.sessions.columns` via `JSON.stringify` equality (`test/app.test.js:1895-1897`) — that
test must be rewritten to compare against `columns.map(c=>c.field)`, not `columns` directly. No other
production code path reads `.columns` today, so this is a contained, low-risk shape change.

Two real data-shape traps were found that CONTEXT.md's decisions don't fully anticipate: (1) the
`skipDay()` code path produces a session with `entries:[]` and no `extras`, so `sessionRows()` today
silently returns zero rows for a skipped day — D-04's "single row per skipped day" is new behavior,
not a bug fix; and (2) `dayFlagRows()` today emits a row for *every* key in a mobility/lawn day
object, including internal bookkeeping keys (`__session` on mobilityLog, `overrideWater`/
`overrideMow` on lawnLog) that are not loggable items and must never reach the export, or Ian's
export would show fabricated "flags" that were never something he logged. Both are documented in
detail below with exact source lines and are HIGH-confidence, code-verified findings, not guesses.

**Primary recommendation:** Build the exporter as two layers — a pure `buildMarkdownExport()` that
takes no arguments (reads `DB`/`COLLECTIONS` directly, like every other view function in this file)
and returns a Markdown string, fully unit-testable without touching the DOM; and a thin
`exportMarkdown()` wrapper that constructs the `File`/`Blob`, tries `navigator.share`, and falls back
to the existing `exportData()` download pattern. Keep the row-shape/presentation split REG-17 already
established: `format` functions (and the columns-projection default for collections without one) hand
back raw values; `buildMarkdownExport()` owns ISO-formatting, the em-dash missing marker, unit-label
resolution, and the `\|`/newline table-cell escaping.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Row selection (soft-delete filtering) | Client (data layer: `liveOf`/`DB[name]`) | — | Already derived from `COLLECTIONS` in Phase 1; export must reuse it verbatim (EXP-04) |
| Row shaping (flatten sessions, day-flags, journal) | Client (data layer: `COLLECTIONS[name].format`) | — | REG-17 already built these as raw-value shapers; Phase 2 extends, doesn't replace |
| Presentation (ISO dates, unit labels, missing marker, `\|`/newline escaping) | Client (new export module) | — | Explicitly deferred to Phase 2 by the REG-17 code comment at `index.html:3793-3796` |
| Column/unit metadata declaration | Client (`COLLECTIONS[name].columns`) | — | D-08: metadata lives in the registry so the exporter reads it, never hardcodes it |
| Registry shape validation | Client (`collectionProblems()`) | — | Must grow to validate the new `{field,label,unit}` column shape |
| File delivery (share sheet / download) | Browser (Web Share API / Blob+`<a download>`) | Client (fallback logic) | No server exists; this is a fully client-side, offline-first PWA (CLAUDE.md) |
| UI entry point (button) | Client (`viewData()` / Settings screen) | — | D-02: lives in the existing Settings → Backup card, not a new screen |

## Package Legitimacy Audit

Not applicable. This phase adds zero dependencies and zero packages — `index.html` remains a
single file with no build step (CLAUDE.md, non-negotiable constraint). Everything needed
(`navigator.share`, `Blob`, `URL.createObjectURL`, `document.createElement('a')`) is a browser
built-in already used elsewhere in this file (`exportData()` at `index.html:3361-3366`).

## Standard Stack

No new libraries. Everything is already in the file or is a browser API.

### Core (already present, reused)
| Symbol | Location | Purpose |
|--------|----------|---------|
| `COLLECTIONS` | `index.html:489-505` | Declares `kind`, `columns`, `format` per collection — the single source the exporter must derive from (EXP-02) |
| `liveOf(name)` / `liveSessions()` etc. | `index.html:712-731` | The only soft-delete-filtered read path; `liveOf` throws for any name that isn't a declared soft list, so exporter code must call it exactly the way every other view does |
| `sessionRows`, `hobbyRows`, `journalRows`, `dayFlagRows` | `index.html:3797-3818` | REG-17's raw row shapers, referenced by name from each collection's `format` field |
| `collectionProblems(reg)` | `index.html:3822-3857` | Registry validator; the `columns` branch (`3850-3852`) needs a new shape check for D-08 |
| `exportData()` | `index.html:3361-3366` | The Blob + `a.download` pattern D-01 reuses verbatim for the fallback path |
| `todayISO()` | `index.html:814` | `new Date().toLocaleDateString('en-CA')` — YYYY-MM-DD local, used for D-03's filename |
| `esc()` | `index.html:908` | HTML-escaping only (`&<>"`) — **do not use this for Markdown cell escaping**; it solves a different problem (see Pitfall 1) |
| `ph(name, cls)` / `PH` map | `index.html:914-966` | Inlined Phosphor icons; no icon named "export" or "share" exists today — see Code Examples for the closest candidates |

### Browser APIs (new usage in this file, well-established web platform features)
| API | Purpose | Constraint |
|-----|---------|------------|
| `navigator.canShare({files:[...]})` | Feature-detect whether a file share sheet is available | Secure context (HTTPS) required; does **not** require a user gesture to call [CITED: developer.mozilla.org/en-US/docs/Web/API/Navigator/canShare] |
| `navigator.share({files:[...]})` | Opens the OS share sheet with the `.md` File attached | Must be triggered from a user-gesture event handler (click), secure context required [CITED: developer.mozilla.org/en-US/docs/Web/API/Navigator/share] |
| `new File([text], filename, {type:'text/markdown'})` | Build the shareable/downloadable payload | `File` extends `Blob`; same constructor style already stubbed in the test harness (`Blob: function Blob(){}` at `test/harness.js:87`) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `navigator.share` + Blob-download fallback | Clipboard API (`navigator.clipboard.writeText`) | Rejected implicitly by D-01 (share sheet is the chosen mechanism) — clipboard loses the filename/File semantics and doesn't hand off to the Claude app as directly |
| Per-collection hand-written table builder | Generic builder driven by `COLLECTIONS[*].columns`/`format` | Explicitly the point of EXP-02; hand-rolling here recreates the exact five-places problem this whole milestone exists to end |

**Installation:** None — no `npm install` needed. This section is intentionally empty.

## Architecture Patterns

### System Architecture Diagram

```
[Settings screen: viewData()]
        |
        | click "Export for Claude" button
        v
[exportMarkdown()]  <-- thin wrapper, DOM + share/download only, mirrors exportData()
        |
        | 1. calls
        v
[buildMarkdownExport()]  <-- pure function, no DOM, fully unit-testable
        |
        | for each name in Object.keys(COLLECTIONS), in declared order (D-12):
        v
  +-----------------------------------------------------------+
  | spec = COLLECTIONS[name]                                  |
  |   spec.kind === 'list'                                    |
  |     rows = liveOf(name)              // soft-delete safe  |
  |     rows.sort(by columns[0].field)   // oldest first D-11 |
  |     for each row:                                         |
  |       spec.format ? spec.format(row) : [pick(columns,row)]|
  |   spec.kind === 'map'                                     |
  |     keys = Object.keys(DB[name]).sort()  // ISO sorts OK  |
  |     for each date key:                                    |
  |       spec.format(date, DB[name][date])  // format REQUIRED on maps |
  +-----------------------------------------------------------+
        |
        | raw {field: value} rows, keys == columns order
        v
[presentation layer inside buildMarkdownExport()]
   - ISO dates verbatim (never fmtDate())
   - missing value -> '—' (em dash)
   - unit resolution: columns[i].unit -> header suffix, via DB.unit for 'mass' kind
   - mdEscapeCell(): '\|' + strip/replace embedded newlines + trim
        |
        v
[Markdown string: header block + one H2 + table per collection, "No entries" if empty (D-06)]
        |
        +---> exportMarkdown(): new File([md], `ppl-export-${todayISO()}.md`, {type:'text/markdown'})
                    |
                    | navigator.canShare && navigator.canShare({files:[file]})
                    |___________________________
                    |                           |
                   yes                          no
                    v                           v
         navigator.share({files:[file]})   Blob + <a download> (exportData() pattern)
                    |
              catch: err.name === 'AbortError' -> do nothing (user cancelled, D-01)
              catch: anything else -> fall through to Blob download? (see Open Questions)
```

### Recommended Project Structure

No new files — this is a single-file app. Inside `index.html`, place the new functions:
- Presentation helpers (`mdEscapeCell`, unit resolver) directly after the REG-17 row shapers at
  `index.html:3818` (same section, same comment block style — `/* ── COLLECTIONS export row shapers … ── */`).
- `buildMarkdownExport()` and `exportMarkdown()` near `exportData()` (`index.html:3360-3366`), since
  that is where Ian and future maintainers will already be looking for "the other export."
- New button markup inside `viewData()`, directly below the existing `Export backup (.json)` button
  (`index.html:3351`), matching D-02.

### Pattern 1: Generic column-driven row projection (no format function)
**What:** For collections without a `format` (weights, petWeights, cardio, ideas, todos, sleep — all
"already flat"), project exactly the declared `columns` fields from the raw row object. Never spread
the whole row — this is what naturally satisfies EXP-05's "no internal id" requirement, since `id`,
`mtime`, `deletedAt`, `source` etc. are never in any collection's `columns` array (verified: none of
the 11 `COLLECTIONS` entries list `id` in their `columns`, even though `cardio`/`ideas`/`sleep` rows
carry an `id` field internally — `index.html:489-505`).
**When to use:** Every collection where `COLLECTIONS[name].format` is `undefined`.
**Example (conceptual, field-name form — adjust if D-08's `{field,label,unit}` shape is adopted):**
```javascript
// Source: derived from COLLECTIONS[name].columns at index.html:490-504
function pickColumns(row, columns){
  const out = {};
  columns.forEach(c => { const field = typeof c==='string' ? c : c.field; out[field] = row[field]; });
  return out;
}
```

### Pattern 2: Format-function dispatch (list collections with `format`)
**What:** `sessions` and `hobbyLog` already declare a `format` function that takes the raw row and
returns an array of output rows (`sessionRows` can return 0, 1, or N rows per session — one per set).
**When to use:** Whenever `COLLECTIONS[name].format` is a function and `kind === 'list'`.
**Example — verbatim from the shipped code:**
```javascript
// Source: index.html:3797-3807 (verified this session, quoted exactly)
function sessionRows(s){
  if(!s || typeof s!=='object') return [];
  const rows = [];
  const addItem = item => {
    if(!item || typeof item!=='object' || !Array.isArray(item.sets)) return;
    item.sets.forEach((set,i)=>{ rows.push({ date:s.date, workout:s.workout, exercise:item.name, set:i+1, weight:set.w, reps:set.r }); });
  };
  if(Array.isArray(s.entries)) s.entries.forEach(addItem);
  if(s.extras && typeof s.extras==='object' && !Array.isArray(s.extras)) Object.keys(s.extras).forEach(k=>addItem(s.extras[k]));
  return rows;
}
```
This is the function D-04 requires extending: today, `s.skipped === true` sessions are pushed with
`entries:[]` and no `extras` key (verified at `index.html:1717-1720`, the `skipDay()` body), so the
two existing loops both no-op and `sessionRows()` returns `[]` for a skipped day. Adding an
`if(s.skipped) return [{...}]` branch at the top is a pure addition — it does not change output for
any non-skipped session, so it cannot break the existing `rows:` assertions at
`test/app.test.js:1893-1903` (none of which use `skipped:true` fixtures).

### Pattern 3: Format-function dispatch (map collections — format is mandatory)
**What:** `journal`, `mobilityLog`, `lawnLog` have no soft-delete filter at all (`kind:'map'`,
`soft:false` — `liveOf()` would throw if called with these names, since it only accepts
`kind==='list' && soft===true`, verified at `index.html:712-716`). Their "live" read path IS
`DB[name]` directly, because that is what the app's own views already do (`DB.journal[todayISO()]`
at `index.html:1492`; `DB.mobilityLog[t]` at `index.html:2718`; `DB.lawnLog[t]` at `index.html:3000`).
EXP-04's "same `liveX()` path the views use" therefore means, for these three collections, *reading
`DB[name]` directly* — there is no dedicated wrapper to call, and inventing one that doesn't exist in
the codebase would be new, untested code the phase doesn't need.
**When to use:** `kind === 'map'`.
**Example — verbatim from the shipped code:**
```javascript
// Source: index.html:3812-3818 (verified this session, quoted exactly)
function journalRows(date, text){
  return [{ date, entry: (text==null ? '' : String(text)) }];
}
function dayFlagRows(date, obj){
  if(!obj || typeof obj!=='object' || Array.isArray(obj)) return [];
  return Object.keys(obj).map(k=>({ date, item:k, done:obj[k] }));
}
```
`dayFlagRows` as shipped emits one row per key in the day object — including keys that are not
loggable items. See Pitfall 2 below; this is the single most important correctness gap between the
shipped code and D-05's requirement.

### Anti-Patterns to Avoid
- **Reusing `esc()` for Markdown cell content.** `esc()` HTML-escapes (`&<>"`); a Markdown file pasted
  into a Claude conversation is read as plain text, not rendered HTML. Running `esc()` on cell values
  would corrupt normal text (turning `<` into `&lt;`) for no benefit. Write a separate escape function
  for the table-cell problem (pipe + newline), matching what EXP-07 actually asks for.
- **Using `fmtDate()` for export dates.** `fmtDate()` (`index.html:815`) converts an ISO string to
  `"Aug 7"` display format. Every collection already stores dates as raw ISO strings
  (`sessions[i].date`, `weights[i].date`, etc.) — EXP-06 wants exactly that raw value passed through
  unchanged, not re-parsed and re-formatted.
- **Spreading the whole row object instead of projecting `columns`.** Doing `{...row}` instead of
  picking exactly the declared fields would leak `id`, `mtime`, `deletedAt`, `source` straight into
  the export — silently reintroducing the exact EXP-05 violation the phase exists to prevent.
- **Calling `liveOf('journal')` / `liveOf('mobilityLog')` / `liveOf('lawnLog')`.** These will throw —
  `liveOf` explicitly refuses any name that isn't a declared `kind:'list', soft:true` collection
  (`index.html:713-714`). Map collections must be read via `DB[name]` directly.
- **Persisting anything from the export path.** `buildMarkdownExport()` should not call `save()` or
  `saveLocal()` at all — it only reads `DB`. If `exportMarkdown()` wants to record "last export" state
  for a future feature, that is explicitly out of scope here (CONTEXT.md's Phase Boundary excludes a
  settings screen); do not add new bookkeeping fields to `DB` in this phase.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Per-collection Markdown table builder | A `switch(name)` or 11 hand-written table functions | The generic `columns`/`format` dispatch in Patterns 1-3 | This is EXP-02's entire point — a twelfth collection must need zero exporter edits |
| Soft-delete filtering for list collections | A second, export-specific "skip deleted" check | `liveOf(name)` (already derived from `COLLECTIONS` in Phase 1) | A second filter is exactly the "five places" bug pattern CLAUDE.md documents — a missed filter ghosts a deleted row back into a view (or here, an export) |
| Unit conversion for cardio distance | `kmToDisp()`/`dispToKm()` (the app's mi/km display conversion) | The raw `distanceKm` value, labeled literally `distance (km)` | `distanceKm` is stored canonically in km regardless of `DB.unit` (verified comment at `index.html:3526-3528`); converting it would silently disagree with the number Ian typed into the export vs. what's stored, and CONTEXT.md's D-08 already asks for the literal `(km)` label — no conversion needed at all |
| Share-sheet capability detection | A user-agent sniff for "is this iOS Safari" | `navigator.canShare({files:[file]})` | Feature detection is the platform-recommended approach and doesn't require a gesture to call [CITED: MDN] |

**Key insight:** Every piece of this phase that looks like it needs new logic already has a Phase-1-built
counterpart to derive from (`COLLECTIONS`, `liveOf`, the `format` functions) or a Phase-1-adjacent
precedent to mirror (`exportData()`'s Blob+download pattern). The actual net-new code is small:
presentation formatting (dates/units/missing-marker/escaping), the generic dispatch loop, and the
share/download wrapper.

## Common Pitfalls

### Pitfall 1: Using `esc()` for Markdown table cells
**What goes wrong:** Cell text like `bench > incline` or a quoted note gets HTML-entity-encoded
(`&gt;`, `&quot;`) in a file that is never rendered as HTML — Claude sees garbled text instead of
what Ian actually typed.
**Why it happens:** `esc()` is the only escaping helper in the file, and it's used everywhere else
user text is rendered, so it's the obvious first reach.
**How to avoid:** Write a Markdown-specific escape: replace `|` with `\|`, replace embedded newlines
(GFM tables are block-level constructs and cannot contain a raw line break inside a cell — content
ends at the first newline [CITED: github.github.com/gfm/#tables-extension-]), and trim whitespace, per
EXP-07's exact wording.
**Warning signs:** Exported notes/ideas containing `&`, `<`, `>`, or `"` look different from what was
typed; a fixture with a literal `<script>` (the existing `ideas` test fixture at
`test/app.test.js` populatedDB — `'A hostile <script> & "quotes" — must be escaped'`) is a good canary.

### Pitfall 2: `dayFlagRows` currently exports internal bookkeeping keys as if they were logged items
**What goes wrong:** `dayFlagRows(date, obj)` does `Object.keys(obj).map(k=>({date,item:k,done:obj[k]}))`
— every key in the day object becomes a row. But:
- `mobilityLog[date]` can carry `__session` (set to the string `'yoga'` or `false` by
  `toggleMobSession()` at `index.html:2724`), which the app itself treats as reserved and never an
  exercise name: `const isReservedMobKey = k => k.indexOf('__')===0; // e.g. __session — never an exercise name`
  [VERIFIED: index.html:2682].
- `lawnLog[date]` can carry `overrideWater` / `overrideMow` (booleans set by `toggleLawnOverride()` at
  `index.html:3155-3157`), which are UI override bookkeeping, not something Ian logged. The only two
  real loggable lawn actions are `'watered'` and `'mowed'` [VERIFIED: index.html:3113-3128, the
  `setLawnLog`/`toggleLawnLog` bodies only ever read/write the `action` parameter passed from the
  `'watered'`/`'mowed'` call sites at lines 3222-3223, 3251-3252].
**Why it happens:** `dayFlagRows` was written in Phase 1 purely to satisfy REG-17's shape contract
(one row per key), before D-05's "only true flags, no bookkeeping" requirement existed.
**How to avoid:** Before emitting a row, filter out `__`-prefixed keys (mobilityLog convention) and,
for lawnLog specifically, filter out any key not in the real action set (`watered`, `mowed`) — or more
robustly, filter out any key matching `/^override/i`. Combine with D-05's separate requirement to only
emit rows where the flag is `=== true`.
**Warning signs:** A test fixture with `mobilityLog[date] = {'Couch stretch': true, __session:'yoga'}`
or `lawnLog[date] = {mowed:true, overrideMow:false}` producing 2 rows instead of 1 in the export.

### Pitfall 3: Treating `__session`'s truthy-but-non-boolean value as excludable by `=== true`
**What goes wrong:** `__session` is excluded by Pitfall 2's `__`-prefix filter regardless, but if a
future collection reuses the "flag" pattern with a non-boolean truthy value and the exporter filters
on strict `=== true`, a legitimately-set flag could be silently dropped. Keep the reserved-key filter
and the `=== true` check as two independent, clearly-named checks rather than folding them into one
condition, so a future collection's field doesn't accidentally fall through a gap between the two.
**Why it happens:** `mobilityLog` mixes two different value types (boolean flags for real exercises,
a tri-state-ish string/false for `__session`) under one object shape.
**How to avoid:** Filter reserved keys first, unconditionally; only then apply the `=== true` check to
what remains.
**Warning signs:** None currently reachable in the shipped data (since `__session` is filtered by
Pitfall 2's fix regardless) — this is a design-robustness note, not a live bug.

### Pitfall 4: `sessionRows` returning `[]` for skipped days breaks the "one row per skipped day" requirement silently
**What goes wrong:** D-04 requires a skipped day to produce exactly one export row. The shipped
`sessionRows()` returns `[]` for `{skipped:true, entries:[]}` sessions — meaning the workout section's
row count would simply omit skipped days entirely unless `sessionRows` (or the exporter) is changed.
**Why it happens:** REG-17 built `sessionRows` for entries-based sessions only; skipped-day handling
wasn't in scope for Phase 1 (there was no export consumer yet to expose the gap).
**How to avoid:** Extend `sessionRows` (see Pattern 2) with an `if(s.skipped) return [...]` branch.
Since no `golden()` hash or merge-differential test touches `sessionRows` output (verified — only
plain `ok()` assertions reference it, at `test/app.test.js:1884-1912`; the golden-hash tests operate
on `blank`, `liveX`, `merge:*`, and `validate:*` labels, never a `rows:` label), this is safe to change
without any Phase 1 differential-test fallout. Update the existing "4 rows" assertion's neighbors with
a new skipped-day fixture and assertion; do not touch the existing non-skipped assertions.
**Warning signs:** An export where a skipped workout day is simply absent from the Workouts table,
making a truncated file indistinguishable from a day nobody attempted.

### Pitfall 5: Column-shape change (D-08) silently breaks one Phase 1 test
**What goes wrong:** If `columns` becomes `[{field,label,unit}, ...]` instead of `['date', ...]`, the
Phase 1 test `sessRows.every(r => JSON.stringify(Object.keys(r)) === JSON.stringify(app.COLLECTIONS.sessions.columns))`
at `test/app.test.js:1895-1897` starts comparing an array of plain strings (`Object.keys(r)`) against
an array of objects (`COLLECTIONS.sessions.columns`) — it will fail every run, forever, not just once.
**Why it happens:** This test was written against the Phase 1 shape and has no reason to anticipate
Phase 2's metadata extension.
**How to avoid:** Update this assertion (and the three `collectionProblems()` columns-refusal tests at
`test/app.test.js:1829-1839`, which construct `columns:['id']` / `columns:['id','id']` / delete
`spec.columns` — these all need to move to the new object shape too) in the same commit that changes
`columns`' shape. This is within Phase 2's remit since D-08 explicitly assigns the shape decision to
this phase's planner.
**Warning signs:** `npm test` failing on `rows: every row's keys equal COLLECTIONS.sessions.columns
exactly` immediately after the columns-shape change lands, before any exporter code is even written.

### Pitfall 6: Calling `navigator.share` outside a synchronous user-gesture handler
**What goes wrong:** Per the Web Share API spec, `navigator.share()` must be triggered off a UI event
like a button click; calling it after an `await` or inside a `setTimeout` can cause browsers to reject
with `NotAllowedError` (missing "transient activation") even though everything else about the call is
correct [CITED: developer.mozilla.org/en-US/docs/Web/API/Navigator/share].
**Why it happens:** It's tempting to build the Markdown string (a potentially non-trivial synchronous
computation) and then call `share()`, but if any async work is interposed between the click and the
`share()` call, the gesture can expire.
**How to avoid:** Keep `buildMarkdownExport()` synchronous (it already will be — everything it reads
is already in memory) and call `navigator.share()` directly in the `onclick` handler's call chain,
with no `await` before it.
**Warning signs:** Share sheet works when clicked immediately after page load but fails after the app
has been open a while — a classic transient-activation-expiry symptom (not something the harness can
catch; note as a manual verification item).

## Code Examples

### Icon candidates (no dedicated "share"/"export" icon exists in the `PH` map)
```javascript
// Source: index.html:914-965 (PH map keys, verified this session)
// No 'share', 'export', or 'file-text' key exists. Closest semantic fits already inlined:
//   'arrow-square-out'  — external-link glyph, reads as "goes to another app" (recommended)
//   'upload-simple'     — already used elsewhere for "send this out" (cloud-arrow-up is upload-to-cloud, a poor fit)
//   'note-pencil'       — a written-document glyph, weaker fit (implies editing, not exporting)
// This is explicitly "Claude's Discretion" per CONTEXT.md — 'arrow-square-out' is the recommendation.
```

### The existing Blob-download fallback pattern to mirror
```javascript
// Source: index.html:3361-3366 (verified this session, quoted exactly) — exportData(), the JSON backup
function exportData(){
  const blob = new Blob([JSON.stringify(DB,null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download=`ppl-backup-${todayISO()}.json`; a.click();
  DB.lastBackupAt=Date.now(); DB.backupSnoozeAt=null; save();
}
```
Note the last line: `exportData()` updates backup-reminder bookkeeping (`lastBackupAt`,
`backupSnoozeAt`) and calls `save()`. The Markdown export is explicitly *not* the JSON backup (D-01's
own wording: "separate from... the existing JSON backup"), so `exportMarkdown()` should almost
certainly skip this bookkeeping entirely — see Open Questions.

### AbortError handling pattern (D-01)
```javascript
// Pattern derived from MDN's documented example, adapted to this file's style
// Source: developer.mozilla.org/en-US/docs/Web/API/Navigator/share [CITED]
async function exportMarkdown(){
  const text = buildMarkdownExport();
  const file = new File([text], `ppl-export-${todayISO()}.md`, {type:'text/markdown'});
  if(navigator.canShare && navigator.canShare({files:[file]})){
    try{ await navigator.share({files:[file]}); return; }
    catch(err){ if(err && err.name === 'AbortError') return; /* user cancelled — no fallback, no error (D-01) */ }
  }
  // Fallback: mirrors exportData()'s Blob + <a download> pattern
  const blob = new Blob([text], {type:'text/markdown'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download = file.name; a.click();
}
```

### Markdown cell escaping (EXP-07)
```javascript
// Pattern derived from the GFM table spec [CITED: github.github.com/gfm/#tables-extension-]
function mdEscapeCell(v){
  if(v == null || v === '') return '—'; // D-09: missing marker, never blank, never 0
  return String(v).trim().replace(/\|/g, '\\|').replace(/\r?\n+/g, ' ');
}
```

### Unit-label resolution sketch (D-08)
```javascript
// Column metadata shape recommendation: columns: [{field, label, unit}], unit one of:
//   undefined         -> no unit suffix
//   'mass'            -> resolves to `(${DB.unit})` at render time — weight (lb) / weight (kg)
//   a literal string  -> used as-is, e.g. 'km' for cardio's distanceKm (canonical storage unit,
//                        NOT converted via kmToDisp/distUnit — see Don't Hand-Roll table)
function headerFor(col){
  const unit = col.unit === 'mass' ? DB.unit : col.unit;
  return unit ? `${col.label} (${unit})` : col.label;
}
```

## State of the Art

Not applicable in the conventional sense (no library version drift to track) — but worth noting:

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `format` fields declared but never called | `format` fields are load-bearing, called by `buildMarkdownExport()` | This phase | The Phase 1 comment "these hand back raw stored values... Presentation... is Phase 2's job" (`index.html:3793-3796`) is the design contract this phase fulfills |
| `columns: string[]` | `columns: {field,label,unit}[]` (if D-08 is implemented this way) | This phase | Requires updating `collectionProblems()` and the Phase 1 `rows:` test noted in Pitfall 5 |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Modern iOS Safari (current, 2026) supports sharing a `text/markdown` File via `navigator.share`, based on the general "text files" category described in MDN/web.dev docs rather than a markdown-specific test | Standard Stack, Pitfall 6 | If iOS actually rejects `text/markdown` specifically (some iOS versions have been pickier about MIME type than file extension), `canShare` returns `false` and the app correctly falls through to the Blob-download fallback — low risk either way, since D-01 already specifies a fallback for exactly this case |
| A2 | `exportMarkdown()` should NOT update `DB.lastBackupAt`/`DB.backupSnoozeAt` or call `save()`, unlike `exportData()` | Code Examples, Open Questions | If Ian actually wants the Markdown export to also count as "a backup happened" for the backup-reminder nag, omitting this would leave the nag firing even after a fresh export — low-severity, easily corrected in review since CONTEXT.md doesn't address it either way |
| A3 | The recommended icon `arrow-square-out` is the best fit among existing `PH` map entries | Code Examples | Purely cosmetic; CONTEXT.md marks icon choice as Claude's Discretion, so any reasonable choice is acceptable |

## Open Questions (RESOLVED)

1. **Does `exportMarkdown()` touch `DB.lastBackupAt`/`backupSnoozeAt`, or skip persistence entirely?**
   - What we know: `exportData()` (the JSON backup) does both; CONTEXT.md D-01 says the Markdown
     export is "separate from... the existing JSON backup" but doesn't address bookkeeping.
   - What's unclear: Whether "separate" means "must not affect the JSON backup's own reminder state"
     or is silent on the question.
   - Recommendation: Skip persistence entirely (Assumption A2) — the Markdown export is a read-only
     snapshot, and touching `DB` for a feature explicitly scoped as "not a backup" (per Out of Scope:
     "A round-trippable or re-importable Markdown export") risks confusing two different guarantees.
     Flag for Ian confirmation during planning/discussion if the planner wants certainty.
   - RESOLVED: no persistence. 02-03 Task 2 tests that no export path writes DB, localStorage or `lastBackupAt`.

2. **What happens on a `navigator.share` rejection that is NOT `AbortError`?**
   - What we know: D-01 only specifies behavior for the unsupported case (fall back to download) and
     the cancelled case (do nothing). Other rejections (`InvalidStateError`, `NotAllowedError`,
     `TypeError`, `DataError` — all CITED from MDN) are unaddressed.
   - What's unclear: Whether a genuine share failure (e.g., `NotAllowedError` from an expired gesture,
     Pitfall 6) should silently fall back to download, or surface a toast/error.
   - Recommendation: Treat any non-`AbortError` rejection the same as "share unsupported" — fall back
     to the Blob download rather than leaving Ian with nothing. This matches the spirit of "the export
     must succeed one way or another" without over-engineering error-specific UI. Falls under
     Claude's Discretion per CONTEXT.md (not explicitly decided).
   - RESOLVED: any non-`AbortError` rejection falls back to the Blob download (02-03 Task 2).

3. **Exact final shape of the `{field,label,unit}` column metadata (D-08 leaves this to the planner).**
   - What we know: The shape needs a `field` (for row projection), a human-readable `label`, and an
     optional `unit` (resolved to `DB.unit` for mass, or used literally otherwise).
   - What's unclear: Whether `unit` should be a free-form string or a small enum (`'mass' | 'km' |
     null`), and whether it's a fourth array-of-objects field or a parallel object keyed by field name.
   - Recommendation: Array of `{field,label,unit}` objects, matching `columns`' existing array-typed
     position and ordering semantics (order defines table column order, per the existing contract at
     `test/app.test.js:1895-1897`) — a parallel map would lose the implicit ordering `columns` already
     provides for free.
   - RESOLVED: array of `{field,label,unit}` objects, promoted to the single column representation (02-01).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `navigator.share` | D-01 primary delivery path | Runtime-dependent (Android Chrome: yes; iOS Safari: yes for text files on current versions per CITED research; desktop Chrome/Firefox: inconsistent) | N/A (Web API, not a package) | Blob + `<a download>`, the existing `exportData()` mechanism — already proven to work in this exact codebase |
| `navigator.canShare` | Feature detection for the above | Same as above | N/A | If absent entirely (older browsers), treat as `false` and go straight to the Blob-download fallback |
| Node.js test harness support for `navigator.share`/`canShare` | Unit-testing the share/fallback branch | **Not currently stubbed** — `test/harness.js`'s `navigator` sandbox object only provides `serviceWorker` and `geolocation` (`test/harness.js` line ~76) | — | The plan must extend the harness's `navigator` stub with `share`/`canShare` (as jest-style mock-able functions, or the harness must accept an injected navigator) so `exportMarkdown()`'s branching is testable at all; alternatively, keep `exportMarkdown()` untested (matching `exportData()`, which has zero direct test coverage today) and test only `buildMarkdownExport()`'s string output |

**Missing dependencies with no fallback:** None — every dependency here has a documented fallback.

**Missing dependencies with fallback:** `navigator.share`/`canShare` support is inconsistent across
browsers, but the Blob-download fallback (proven, already shipping via `exportData()`) covers every
case.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js native `vm`-based harness (no external test runner) [VERIFIED: package.json, test/harness.js] |
| Config file | none — `test/harness.js` is the harness itself, `npm test` runs `node test/app.test.js` |
| Quick run command | `npm test` (single file, whole suite — there is no faster subset command) |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EXP-01 | Markdown export is a distinct artifact from the JSON backup | unit (string-content assertion) | `npm test` (new `ok()` block asserting `buildMarkdownExport()` returns a string containing the header, distinct from `JSON.stringify(DB)`) | ❌ Wave 0 — add to `test/app.test.js` |
| EXP-02 | Adding a 12th collection needs no exporter edit | unit (structural — mirrors SLEEP-04/05's pattern) | `npm test` (probe-collection test via `harness.js`'s `opts.transform`, same technique as `test/app.test.js:1501-1513`) | ❌ Wave 0 |
| EXP-03 | Workouts flatten to one row per set | unit | `npm test` (extend the existing `rows: sessionRows...` block at `test/app.test.js:1893-1903`) | ✅ pattern exists, extend it |
| EXP-04 | Every table reads through `liveX()`/`DB[name]` (never raw `DB[key]` including deleted) | unit | `npm test` (seed a soft-deleted row via `softDelete()`, assert absent from `buildMarkdownExport()` output) | ❌ Wave 0 |
| EXP-05 | No internal ids, no `deletedAt` in output | unit | `npm test` (assert exported table has no column named `id`/`deletedAt`/`mtime`, and no raw id value from a fixture appears in output) | ❌ Wave 0 |
| EXP-06 | ISO dates, unit-in-header-once, consistent missing marker | unit | `npm test` (assert a known ISO date string appears verbatim; assert header contains `(lb)`/`(kg)` per `DB.unit`; assert a `null`/`''` field renders as `—`) | ❌ Wave 0 |
| EXP-07 | Pipe/newline-safe cells | unit | `npm test` (fixture with `note: 'has a \| pipe\nand a newline'`, assert output has exactly the expected escaped row and the file still has the correct total line/row count) | ❌ Wave 0 — CONTEXT.md's own "Specific Ideas" section requires this fixture |
| EXP-08 | Header block: what/when/date-range | unit | `npm test` (assert header contains a generated-at value and a min/max date computed from `columns[0].field` across all live rows, per the Architecture Diagram's date-range note) | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test` (the only command; runs in well under 30 seconds based on the
  existing ~650-check suite)
- **Per wave merge:** `npm test`
- **Phase gate:** `npm test` green (per CLAUDE.md: "A red suite blocks the deploy") before
  `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `test/harness.js` — add `buildMarkdownExport`, `exportMarkdown`, and any new presentation helper
      names (`mdEscapeCell` etc.) to the `names` array (currently ends around the `sleepUid`/`addSleep`/
      `removeSleep`/`viewSleep` block) — a function not added here silently comes back `undefined` from
      `app.functionName`, per the harness's own documented behavior.
- [ ] `test/harness.js` — extend the sandboxed `navigator` object with `share`/`canShare` stubs (or an
      injectable navigator) if the plan wants `exportMarkdown()`'s branching under test, per the
      Environment Availability gap above.
- [ ] `test/app.test.js` — new `REQUIRED_EXPORTS` entries for whatever new function names the plan
      introduces, following the existing pattern at lines 121-127.
- [ ] `test/app.test.js` — the Pitfall 5 test updates (columns-shape tests at lines 1829-1839, 1895-1897)
      must land in the same commit as the `columns` shape change, not deferred.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth surface touched — export reads only the already-authenticated local `DB` |
| V3 Session Management | no | No session state introduced |
| V4 Access Control | no | Single-user, client-only app; no new access boundary |
| V5 Input Validation | yes | Markdown-cell escaping (EXP-07) is the input-validation surface — logged text (idea/journal/note fields) is attacker-adjacent only in the sense that Ian's own past hand-edited-JSON-backup imports could contain arbitrary strings (`validateBackup()` checks shape, not types — documented existing gap, VAL-01, deferred to v2). The export must not let such a string break table structure or leak raw HTML into a context that might render it. |
| V6 Cryptography | no | No cryptographic operation in this phase |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Markdown table injection (a logged value containing `|` or a newline breaking table structure, or a crafted string masquerading as a second header row) | Tampering | `mdEscapeCell()` (Pitfall 1 / Code Examples) — escape `|`, collapse newlines, trim. This is a **structural-integrity** concern (a malformed table), not a code-execution concern, since the output is a `.md` file read as plain text by Claude, never rendered as HTML by this app. |
| Stale-share-target confusion (sharing a `.md` file that a hostile installed app claims to handle) | Spoofing | Out of scope for this app — `navigator.share` hands control to the OS-level share sheet; the OS, not this PWA, is responsible for which app receives the file. No mitigation available or needed at this layer. |
| Re-introducing an HTML-escaping hole by reusing `esc()` in a non-HTML context | Tampering (data corruption, not injection) | Covered by Pitfall 1 — use a dedicated Markdown escaper, not `esc()`. |

Note: this phase does **not** introduce a new XSS surface. The exported file is never rendered as HTML
by `index.html` itself; CLAUDE.md's `esc()`/attribute-escaping rules govern in-app rendering and remain
unaffected by this phase (no view in `viewData()` interpolates export content back into the DOM beyond
the existing escaped button markup).

## Sources

### Primary (HIGH confidence — read directly this session)
- `index.html` (this repo, this branch) — `COLLECTIONS` (489-505), `liveOf`/`liveX` family (705-738),
  `sessKey`/row-shapers/`collectionProblems` (3780-3857), `exportData`/Settings screen (3307-3366),
  cardio unit handling (3526-3538), lawn/mobility log bookkeeping (2682, 2717-2735, 3100-3157)
- `test/app.test.js` (this repo) — REQUIRED_EXPORTS/harness-export guard (100-127), REG-17 `rows:`
  tests (1884-1912), `collectionProblems` refusal battery incl. `columns` (1770-1854)
- `test/harness.js` (this repo) — sandbox `navigator`/`Blob`/`URL` stubs, exported `names` array
- `.planning/phases/01-f1-the-collections-registry/01-01-SUMMARY.md` — REG-17 delivery record
- `.planning/phases/02-export-for-claude/02-CONTEXT.md` — locked D-01 through D-13 decisions

### Secondary (MEDIUM confidence — WebFetch against official docs this session)
- [MDN: Navigator.canShare()](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/canShare) — file-share feature detection, secure-context requirement
- [MDN: Navigator.share()](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share) — AbortError on cancel, user-gesture requirement, other rejection types
- [GFM spec: Tables extension](https://github.github.com/gfm/#tables-extension-) — pipe escaping (`\|`), block-level constraint on newlines inside cells

### Tertiary (LOW confidence — WebSearch synthesis only, corroborated by the above)
- General "iOS Safari file-sharing category support (text/audio/image/pdf/video)" claim — directionally
  consistent with MDN but not verified against a markdown-specific test; see Assumption A1

## Metadata

**Confidence breakdown:**
- Standard stack / architecture: HIGH — every mechanism (`COLLECTIONS`, `liveOf`, row shapers,
  `exportData()`, harness structure) was read directly from the current branch this session, not
  recalled from training data.
- Pitfalls: HIGH for Pitfalls 1-5 (all code-verified with exact line citations); MEDIUM for Pitfall 6
  (platform behavior, CITED against MDN but not independently reproduced in this environment).
- Security: HIGH — no new attack surface; the analysis is a scope confirmation, not a discovery.

**Research date:** 2026-09-16
**Valid until:** Effectively indefinite for the in-repo findings (they change only if the code changes
before this phase executes); ~30 days for the external Web Share API / GFM spec findings, which are
stable standards not expected to shift.
