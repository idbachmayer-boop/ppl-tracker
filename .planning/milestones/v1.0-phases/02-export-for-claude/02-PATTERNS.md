# Phase 2: Export for Claude - Pattern Map

**Mapped:** 2026-09-16
**Files analyzed:** 2 (single-file PWA: `index.html`, `test/app.test.js`; `test/harness.js` modified in support)
**Analogs found:** 6 / 6 (all functions/sections land in existing files as additions near an existing analog)

This is a single-file PWA (`index.html` is the entire app; no new files are created). "Files to
create/modified" below are logical additions — new functions/markup/tests — each placed adjacent to
its closest analog in the same file, per RESEARCH.md's Recommended Project Structure.

## File Classification

| New/Modified Unit | Role | Data Flow | Closest Analog | Match Quality | Location to add |
|---|---|---|---|---|---|
| `buildMarkdownExport()` | service (pure transform) | transform/batch | `exportData()` (index.html:3361-3366) for the wrapper shape; `sessionRows`/`dayFlagRows` (index.html:3797-3818) for row-shaping style | role-match | near `exportData()`, index.html:3360 area |
| `exportMarkdown()` | controller (DOM/share wrapper) | file-I/O | `exportData()` (index.html:3361-3366) | exact | directly below `exportData()` |
| `mdEscapeCell()` | utility | transform | none existing (new escaping concern); `esc()` (index.html:908) is the sibling escaper for a different context | no analog (see below) | near REG-17 row shapers, index.html:3793-3818 |
| `headerFor()` / unit resolver | utility | transform | `columns` metadata itself (index.html:490-504); cardio unit comment (index.html:3526-3528) | role-match | same block as `mdEscapeCell()` |
| `columns: [{field,label,unit}]` shape change | config (registry) | CRUD (config read) | existing `columns:[...]` string arrays, index.html:490-504 | exact (same field, extended shape) | `COLLECTIONS` literal, index.html:489-505 |
| `collectionProblems()` columns-validation branch | middleware (validator) | request-response (registry validation) | existing branch at index.html:3850-3852 | exact | same function, same branch |
| `sessionRows()` skipped-day branch | service (row shaper) | transform | existing function body, index.html:3797-3807 | exact | same function, added branch |
| `dayFlagRows()` reserved-key/true-only filter | service (row shaper) | transform | existing function body, index.html:3815-3818; reserved-key convention at index.html:2682 | exact | same function |
| Settings "Export for Claude" button | component (markup) | request-response (click handler) | `Export backup (.json)` button, index.html:3351 | exact | `viewData()`, directly below index.html:3351 |
| `test/harness.js` `names` array additions | config (test harness) | N/A | `names` array, test/harness.js:101-125 | exact | append `buildMarkdownExport`, `exportMarkdown`, `mdEscapeCell`, `headerFor` (whatever the plan names them) |
| `test/harness.js` `navigator` stub extension | config (test harness) | N/A | `navigator:{serviceWorker,geolocation}`, test/harness.js:78 | exact | add `share`/`canShare` stub fields |
| `test/app.test.js` `REQUIRED_EXPORTS` additions | test | N/A | `REQUIRED_EXPORTS` array, test/app.test.js:121-126 | exact | append same new names |
| `test/app.test.js` EXP-0x unit tests | test | transform/event-driven | REG-17 `rows:` block (test/app.test.js:1884-1912); SLEEP-05 probe-collection transform test (test/app.test.js:1494-1513) | exact | new block after REG-17/REG-11 block, or its own `console.log` section |
| `test/app.test.js` columns-shape test updates | test | N/A | `columns` refusal battery (test/app.test.js:1829-1839, 1895-1897) | exact | edit in place, same commit as D-08 shape change |

## Pattern Assignments

### `buildMarkdownExport()` / `exportMarkdown()` (service + controller, file-I/O)

**Analog:** `exportData()` — `index.html:3361-3366`

```javascript
function exportData(){
  const blob = new Blob([JSON.stringify(DB,null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download=`ppl-backup-${todayISO()}.json`; a.click();
  DB.lastBackupAt=Date.now(); DB.backupSnoozeAt=null; save();
}
```

Reuse the Blob + `<a download>` two-liner verbatim for the fallback path. Per RESEARCH.md's
Assumption A2, the Markdown export should **not** touch `DB.lastBackupAt`/`backupSnoozeAt`/`save()` —
those three lines are JSON-backup-specific bookkeeping and must be omitted, not copied.

`todayISO()` (index.html:814) is the filename date source — same call as `exportData()` uses for its
`.json` filename, producing `ppl-export-${todayISO()}.md` per D-03.

**Placement:** immediately after `exportData()`, same section, matching RESEARCH.md's Recommended
Project Structure.

**Read-path pattern to follow inside `buildMarkdownExport()`:**
`liveOf(name)` — `index.html:712-716`:
```javascript
function liveOf(name){
  const spec = COLLECTIONS[name];
  if(!spec || spec.kind !== 'list' || spec.soft !== true) throw new Error('liveOf: ' + name + ' is not a declared soft-delete list');
  return (DB[name]||[]).filter(isLive);
}
```
For `kind:'list'` collections call `liveOf(name)` (or the named wrapper, e.g. `liveSessions()`).
For `kind:'map'` collections (`journal`, `mobilityLog`, `lawnLog`) `liveOf` throws — read `DB[name]`
directly, matching how the app's own views already do it (`DB.journal[todayISO()]` at index.html:1492,
`DB.mobilityLog[t]` at index.html:2718, `DB.lawnLog[t]` at index.html:3000).

---

### `mdEscapeCell()` / unit-label resolver (utility, transform)

**No existing analog** — this is genuinely new logic. `esc()` (index.html:908) is the nearest sibling
but solves a different problem (HTML-entity escaping) and must NOT be reused here (RESEARCH.md
Pitfall 1 / Anti-Patterns: using `esc()` on Markdown cells corrupts plain text like `bench > incline`
for no reason, since the `.md` file is never rendered as HTML).

**Placement:** directly after the REG-17 row-shaper block, same comment-block style:
```javascript
/* ── COLLECTIONS export row shapers (REG-17) ── ...
   Presentation (ISO dates, units, missing markers, escaping) is Phase 2's job — these hand back raw
   stored values ... */
```
— index.html:3793-3796. Add the new presentation helpers directly below `dayFlagRows()` (index.html:3818),
in the same section, before the `collectionProblems()` block starts (index.html:3819).

---

### `columns` shape change + `collectionProblems()` validation (config + middleware)

**Analog (both the thing being changed and its validator):** `COLLECTIONS` literal, index.html:489-505,
and the columns-validation branch inside `collectionProblems()`, index.html:3850-3852:

```javascript
if(!Array.isArray(spec.columns) || spec.columns.length===0 || spec.columns.some(c=>typeof c!=='string' || c==='') || new Set(spec.columns).size!==spec.columns.length){
  p('columns must be a non-empty array of distinct, non-empty strings');
}
```

D-08 requires extending `columns` entries to `{field,label,unit}` objects. This branch's `some(c=>typeof c!=='string'...)` check and the `new Set(spec.columns)` distinctness check both assume plain
strings — both must be rewritten against `c.field` (and `label` required, `unit` optional/nullable).
Also check `ALLOWED` (index.html:3827) — no new top-level key is needed since `columns` already exists,
but the shape validation inside the array must change.

**Every `COLLECTIONS` entry's `columns:[...]` array** (index.html:490-504) needs updating to the new
object shape, e.g.:
```javascript
sessions: { ..., columns:['date','workout','exercise','set','weight','reps'], format:sessionRows },
```
becomes (illustrative — exact labels are Claude's Discretion per CONTEXT.md):
```javascript
sessions: { ..., columns:[{field:'date',label:'date'},{field:'workout',label:'workout'},{field:'exercise',label:'exercise'},{field:'set',label:'set'},{field:'weight',label:'weight',unit:'mass'},{field:'reps',label:'reps'}], format:sessionRows },
```

---

### `sessionRows()` skipped-day branch (service, transform)

**Analog:** the function's own existing body, index.html:3797-3807 (verbatim):
```javascript
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
D-04 requires an `if(s.skipped) return [{...}]` branch added at the top, producing one row with
exercise `(skipped)` and missing markers elsewhere — a pure addition, since `skipDay()` (index.html:1717-1720)
produces `{skipped:true, entries:[]}` and both existing loops currently no-op for that shape. This
cannot break `test/app.test.js:1893-1903` — no fixture there sets `skipped:true`.

---

### `dayFlagRows()` reserved-key filter (service, transform)

**Analog:** the function's own existing body, index.html:3815-3818 (verbatim):
```javascript
function dayFlagRows(date, obj){
  if(!obj || typeof obj!=='object' || Array.isArray(obj)) return [];
  return Object.keys(obj).map(k=>({ date, item:k, done:obj[k] }));
}
```
Reserved-key convention to reuse, verbatim from index.html:2682:
```javascript
const isReservedMobKey = k => k.indexOf('__')===0; // e.g. __session — never an exercise name
```
D-05 requires: filter out `__`-prefixed keys (mobilityLog) and lawn override keys (`overrideWater`/
`overrideMow`, set at index.html:3155-3157 — filter via `/^override/i` or an explicit allowlist of
`'watered'`/`'mowed'`), THEN keep only `=== true` rows, and drop the `done` column entirely (date + item
only). Apply the reserved-key filter unconditionally before the `=== true` check (two independent
checks, not folded — RESEARCH.md Pitfall 3).

---

### Settings button markup (component, request-response)

**Analog:** the JSON backup export button, index.html:3350-3353 (verbatim):
```html
<h2>Backup</h2>
<div class="card">
  <p class="muted" style="margin-bottom:12px">A downloadable copy of your data — handy as an extra safety net even with Cloud Sync on.</p>
  <button class="btn btn-block" onclick="exportData()">${ph('download-simple')}Export backup (.json)</button>
  <button class="btn btn-ghost btn-block" style="margin-top:10px" onclick="document.getElementById('imp').click()">${ph('upload-simple')}Import backup</button>
  <input type="file" id="imp" accept="application/json" class="hidden" onchange="importData(this)">
</div>
```
D-02: add a new `<button class="btn ... btn-block" onclick="exportMarkdown()">${ph('arrow-square-out')}Export for Claude (.md)</button>`
directly below the `Export backup (.json)` button (same `<div class="card">`), matching the existing
`btn`/`btn-block`/`ph()`-icon-prefix markup convention exactly. Icon: `arrow-square-out` is
RESEARCH.md's recommendation (no dedicated share/export glyph exists in the `PH` map, index.html:914-965).

---

### Test harness additions (config)

**Analog — `names` array, `test/harness.js:101-125`** (excerpt of the tail, verbatim):
```javascript
'validateBackup_legacy', 'mergeDB_legacy', 'mergeCollections', 'ensureCollectionDefaults',
'sleepUid', 'addSleep', 'removeSleep', 'viewSleep',
];
```
Append the new function names (`buildMarkdownExport`, `exportMarkdown`, and any presentation helper
like `mdEscapeCell`/`headerFor`) to this array — a name omitted here comes back `undefined` from
`app.fnName` silently (harness's own documented behavior), per RESEARCH.md's Wave 0 Gaps.

**Analog — `navigator` stub, `test/harness.js:78`** (verbatim):
```javascript
navigator: { serviceWorker:{ register(){ return Promise.resolve(); } }, geolocation:{ getCurrentPosition(){} } },
```
Extend with `share`/`canShare` stub fields if the plan wants `exportMarkdown()`'s branching under test
(optional per RESEARCH.md — `exportData()` itself has zero direct test coverage today, so testing only
`buildMarkdownExport()`'s string output and leaving `exportMarkdown()` untested is an acceptable
alternative).

---

### Test additions (test)

**Analog 1 — `REQUIRED_EXPORTS`, `test/app.test.js:121-127`** (verbatim):
```javascript
const REQUIRED_EXPORTS = ['COLLECTIONS','collectionProblems','MIGRATIONS','sessKey','todoKey','hobbyKey','cardioKey','ideaKey','sessionSort',
  'sessionRows','hobbyRows','journalRows','dayFlagRows','blank_legacy',
  'liveOf','liveSessions','liveCardio','liveIdeas','liveTodos','liveHobbyLog','softDelete',
  'liveSessions_legacy','liveWeights_legacy','livePetWeights_legacy','liveCardio_legacy','liveIdeas_legacy','liveTodos_legacy','liveHobbyLog_legacy',
  'validateBackup_legacy', 'mergeDB_legacy', 'mergeCollections', 'ensureCollectionDefaults',
  'sleepUid', 'addSleep', 'removeSleep', 'viewSleep'];
REQUIRED_EXPORTS.forEach(name => ok('exported: ' + name, app[name] !== undefined));
```
Append the same new names added to `test/harness.js`'s `names` array.

**Analog 2 — REG-17 `rows:` block, `test/app.test.js:1884-1912`** (excerpt, verbatim):
```javascript
const sessRows = app.sessionRows(sessionFixture);
ok('rows: sessionRows on two entries plus one extra gives 4 rows', sessRows.length === 4, sessRows.length);
ok('rows: every row\'s keys equal COLLECTIONS.sessions.columns exactly',
   sessRows.every(r => JSON.stringify(Object.keys(r)) === JSON.stringify(app.COLLECTIONS.sessions.columns)),
   sessRows.map(r=>Object.keys(r)));
```
**Must be rewritten** for the D-08 shape change: compare `Object.keys(r)` against
`app.COLLECTIONS.sessions.columns.map(c=>c.field)`, not `columns` directly (RESEARCH.md Pitfall 5).
Also add: a skipped-day fixture/assertion (D-04, new), a `dayFlagRows` fixture with `__session`/
`overrideMow` reserved keys expecting them filtered (D-05, new — extends the existing
`app.dayFlagRows('2026-08-01', {a:true, b:false})` fixture at line 1907).

**Analog 3 — `columns` refusal battery, `test/app.test.js:1829-1839`** (verbatim):
```javascript
spec = validListSpec(); delete spec.columns;
...
spec = validListSpec(); spec.columns = [];
...
spec = validListSpec(); spec.columns = ['id','id'];
```
These three (plus `validListSpec()`/`validMapSpec()` factories at lines 1777-1778, which build
`columns:['id']`) must move to the new `{field,...}` object shape in the same commit as the
`COLLECTIONS` shape change (RESEARCH.md Pitfall 5).

**Analog 4 — SLEEP-05 probe-collection transform test, `test/app.test.js:1494-1513`** (verbatim
pattern to copy for an EXP-02 "adding a 12th collection needs no exporter edit" proof):
```javascript
const PROBE_LIST_LINE = "  probeList:{ kind:'list', key:'id', sortBy:'date', merge:'union', soft:true, required:false, columns:['date','value'] },";
const probeTransform = code => code.replace('const COLLECTIONS = {', 'const COLLECTIONS = {\n' + PROBE_LIST_LINE + '\n' + PROBE_MAP_LINE);
const probe = loadApp(APP_PATH, null, { transform: probeTransform });
```
Same technique — boot a fresh instance from a source-transformed copy with an extra `COLLECTIONS` line
(updated to the new `{field,label,unit}` columns shape) and assert `buildMarkdownExport()` (called via
`probe.buildMarkdownExport()`) includes the new collection's section with no exporter code changed.

## Shared Patterns

### Blob download (file-I/O fallback)
**Source:** `exportData()`, `index.html:3361-3366`
**Apply to:** `exportMarkdown()`'s fallback path (D-01) — reuse `new Blob([...],{type:...})` +
`document.createElement('a')` + `a.download=...; a.click();` verbatim, swapping MIME type to
`text/markdown` and filename to `ppl-export-${todayISO()}.md`.

### Soft-delete read path
**Source:** `liveOf(name)` and the named `liveX()` wrappers, `index.html:712-731`
**Apply to:** `buildMarkdownExport()` for every `kind:'list'` collection (EXP-04, EXP-05) — never read
`DB[name]` directly for list collections; always go through `liveOf`/`liveSessions()` etc.

### Registry-driven dispatch, no hand-rolling
**Source:** `COLLECTIONS` (index.html:489-505) + `format` field convention (index.html:3793-3818)
**Apply to:** `buildMarkdownExport()`'s per-collection loop — iterate `Object.keys(COLLECTIONS)` in
declared order (D-12), dispatch to `spec.format` if present else project `spec.columns` fields
directly (Pattern 1 from RESEARCH.md). A 12th collection must need zero exporter edits (EXP-02).

### Reserved/internal-key filtering convention
**Source:** `isReservedMobKey` at `index.html:2682`
**Apply to:** `dayFlagRows()`'s new filter (D-05) — same `k.indexOf('__')===0` convention already
established for mobilityLog; extend analogously for lawnLog's `override*` keys.

### Registry field validation
**Source:** `collectionProblems()`'s `ALLOWED` array and per-field checks, `index.html:3822-3857`
**Apply to:** Any shape change to `columns` (D-08) — the validator is the single place that must
change in lockstep with the registry literal, per the file's own established pattern (every
`COLLECTIONS` field has a matching `collectionProblems()` check).

## No Analog Found

| Unit | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `mdEscapeCell()` | utility | transform | No existing Markdown-specific escaping exists in the codebase; `esc()` is HTML-only and must not be reused (see Pattern Assignments above and RESEARCH.md Pitfall 1). Build fresh per the GFM-spec-derived sketch in RESEARCH.md's Code Examples. |
| `navigator.share`/`canShare` branching | controller | event-driven | No existing Web Share API usage anywhere in `index.html`; RESEARCH.md's Code Examples section has the only sketch (AbortError handling pattern). Follow MDN-cited pattern, not an in-repo analog. |

## Metadata

**Analog search scope:** `index.html` (whole file, targeted reads at COLLECTIONS/liveOf/row-shapers/
collectionProblems/exportData/Settings screen sections); `test/app.test.js` (REQUIRED_EXPORTS, REG-17
rows block, columns refusal battery, SLEEP-05 probe transform); `test/harness.js` (names array,
navigator stub)
**Files scanned:** 3
**Pattern extraction date:** 2026-09-16
