# Phase 4: Draft Goes Device-Local - Pattern Map

**Mapped:** 2026-09-22
**Files analyzed:** 4 (all modified, none new)
**Analogs found:** 4 / 4 — the `wx` exclusion idiom, present in the same file, is the analog for every production-code change; the differential-test/harness idioms are the analog for every test change.

This is a single-file PWA (`index.html`) plus a dependency-free test suite (`test/app.test.js`, `test/harness.js`, `test/fixtures/merge-golden.json`). There is no cross-file "controller/service" split to map — the pattern to copy is the codebase's own existing `wx` (weather-cache) exclusion mechanism, verified in place this session at the line numbers below. All line numbers below were located by direct `grep`/`Read` in the current worktree, not carried over from CONTEXT.md/RESEARCH.md unchanged (though in this case they matched).

## File Classification

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|-----------------|---------------|
| `index.html` (`mergeDB`, `adoptMerged`, `snapPayload`, `onSignedIn`, `importData`, `exportData`, draft mutators) | service/utility (sync merge + persistence) | event-driven (Firestore transaction/listener) + CRUD (local draft edits) | `wx` exclusion idiom in the same functions (`snapPayload` line 772, `mergeDB` lines 4142/4163, `adoptMerged` lines 4277-4282, `onSignedIn` line 4329, `importData` lines 3587/3592) | exact — same file, same functions, same field-exclusion mechanism, different field name |
| `test/app.test.js` (`legacyView`, malformed-draft tests, stale-draft incident test) | test | transform/regression (differential comparison) | `legacyView()` (line 673) already strips `COLLECTIONS` keys not in `LEGACY_COLLECTIONS`; the two malformed-draft tests (~2559-2572) and the stale-draft incident test (~838-843) are the direct analogs to rewrite in place | exact — same file, same test block, expectation changes only |
| `test/harness.js` (`names` allowlist) | config/utility (test sandbox export list) | batch (static array) | `names` array, lines 101-126 | exact — append to existing array, same convention (flat string list, no per-entry logic) |
| `test/fixtures/merge-golden.json` | config (recorded hashes) | batch | existing golden file, regenerated via `WRITE_MERGE_GOLDEN=1 node test/app.test.js` per `golden()` at `test/app.test.js:56` | exact — mechanical regeneration, not hand-edited |

## Pattern Assignments

### `index.html` — `mergeDB()` (service, event-driven), lines 4130-4165

**Analog:** the function's own existing `wx` handling, two lines away from where `draft` needs the same treatment.

**Gen-mismatch branch** (lines 4137-4144):
```javascript
if(rG !== lG){
  const win = Object.assign({}, blank(), lG > rG ? l : r);
  win.gen = Math.max(rG, lG);
  win.updatedAt = Math.max(+r.updatedAt||0, +l.updatedAt||0);
  win._schema = Math.max(+r._schema||0, +l._schema||0, SCHEMA);
  delete win.wx;
  return win;
}
```
Copy pattern: add `delete win.draft;` directly below `delete win.wx;`.

**Recency branch** (lines 4145-4165, `normalizeDraft(out)` call at 4159, `delete out.wx` at 4163):
```javascript
const rU = +r.updatedAt || 0, lU = +l.updatedAt || 0;
const localNewer = localWins ? (lU >= rU) : (lU > rU);
const newer = localNewer ? l : r, older = localNewer ? r : l;
const out = Object.assign({}, blank(), older, newer); // start from newer's scalars, guarantee all blank() keys
mergeCollections(r, l, localNewer, out);
/* draft: already set correctly by Object.assign(newer) above — same recency rule as every other
   field. BUG FIXED HERE (2026-07-25): ... */
normalizeDraft(out);
// ── invariants ──
out._schema = Math.max(+r._schema||0, +l._schema||0, SCHEMA);
out.updatedAt = Math.max(rU, lU);
delete out.wx; // weather is derived cache — excluded from sync entirely (see saveLocal)
return out;
```
Copy pattern: add `delete out.draft;` directly below `delete out.wx;`; remove (or leave harmless — planner's call per CONTEXT.md discretion) the `normalizeDraft(out)` call since its result is about to be deleted. Do NOT touch the twin comment block at lines 4200-4208 inside `mergeDB_legacy` (frozen, do not edit — see Shared Patterns below).

---

### `index.html` — `adoptMerged()` (service, event-driven), lines 4275-4293

**Analog:** its own existing `wx` reattachment, lines 4277 and 4282.

```javascript
function adoptMerged(merged, label){
  try{
    const wx = DB.wx;                                               // keep this device's weather cache (not synced)
    /* `merged` never carries wx (stripped from every synced blob) but DB almost always does, so
       comparing them directly was ALWAYS unequal — ... */
    const withWx = Object.assign({}, merged); if(wx!==undefined) withWx.wx = wx;
    if(JSON.stringify(withWx)===JSON.stringify(DB)) return false;   // nothing changed; don't churn the UI
    snapshotNow(label||'before-sync');
    DB = normalize(withWx);
    openHist = -1;
    try{ localStorage.setItem(KEY, JSON.stringify(DB)); }catch(e){ handleQuotaFailure(); }
    const typing = DB.draft && document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if(!typing) render();
    return true;
  }catch(e){ return false; }
}
```
Copy pattern: add `const draft = DB.draft;` alongside `const wx = DB.wx;` (line 4277), and `if(draft!==undefined) withWx.draft = draft;` alongside the `wx` reattachment (line 4282). Note the existing `typing` guard at line 4289 already reads `DB.draft` — this continues to work unchanged since `DB.draft` still exists locally after reattachment; no edit needed there.

**Covers 5 of 7 call sites automatically** (verified by reading every `mergeDB(`/`adoptMerged(` pairing): sign-in merge (line 4333: `adoptMerged(mergeDB(remoteDB, DB), 'sign-in-merge')`), first-link merge (line 4331), plus the live-listener merge and post-push reconciliation call sites further down the file. Only the `'C'` branch of `onSignedIn` (line 4329, bypasses `mergeDB`) and both `importData()` branches (bypass `adoptMerged` entirely) need hand-written treatment — see below.

---

### `index.html` — `onSignedIn()`'s `'C'` (cloud-only) branch, line 4329

**Analog:** the same line's existing `wx` carry.

```javascript
if(c==='C'){ adoptMerged(Object.assign(normalize(remoteDB),{wx:DB.wx}), 'chose-cloud'); }
else if(c==='D'){ /* keep local as-is */ }
else { adoptMerged(mergeDB(remoteDB, DB), 'first-link-merge'); }
```
Copy pattern: add `draft:DB.draft` to the same `Object.assign` object literal, mirroring `wx:DB.wx` on the identical line.

---

### `index.html` — `importData()` Merge and Replace branches, lines 3579-3596

**Analog:** the existing `wx` capture-and-reattach idiom present in both branches already.

```javascript
function importData(inp){
  const f=inp.files[0]; if(!f)return; const r=new FileReader();
  r.onload=()=>{ try{ const raw=JSON.parse(r.result);
    const bad = validateBackup(raw);
    if(bad){ alert('Nothing was imported.\n\n'+bad); inp.value=''; return; }
    const merge = confirm('Merge this backup with your current data?\n\nOK = MERGE ...');
    if(merge){
      snapshotNow('before-import');
      const wx=DB.wx; DB=mergeDB(normalize(raw), DB, true); if(wx!==undefined) DB.wx=wx; DB.updatedAt=Date.now();
      DB.lastBackupAt=Date.now(); save(); cloudVersion('import'); toast('Backup merged ✓'); render(); return;
    }
    if(confirm('Replace ALL current data with this backup?...')){
      snapshotNow('before-import');
      const g=(+DB.gen||0)+1;
      const wx=DB.wx; DB=normalize(raw); if(wx!==undefined) DB.wx=wx; DB.gen=g; DB.updatedAt=Date.now();
      DB.lastBackupAt=Date.now(); save(); cloudVersion('import'); toast('Backup restored'); render(); } }
    catch(e){ alert('Nothing was imported.\n\nThis file isn't readable as JSON...'); }
    finally{ inp.value=''; } };
  r.readAsText(f);
}
```
Copy pattern (both branches): capture `const draft=DB.draft;` next to the existing `const wx=DB.wx;`, and add `if(draft!==undefined) DB.draft=draft;` next to the existing `if(wx!==undefined) DB.wx=wx;`. Both `wx` and `draft` share the identical statement shape in both branches — literally copy-paste with the field name changed.

---

### `index.html` — `snapPayload()` (utility, transform), line 772

**Analog:** itself — one-line function, `wx` stripped already.

```javascript
function snapPayload(d){ const c=Object.assign({},d); delete c.wx; return c; }
```
Copy pattern: add `delete c.draft;` before `return c;`. This single change fixes both `snapshotNow`'s local ring and `cloudVersion()`'s Firestore `versions` write, since both funnel through this function (see RESEARCH.md Pitfall 7).

---

### `index.html` — `exportData()` (utility, file I/O), lines 3372-3377

**No `wx`-analog exists here** — `exportData()` currently serializes `DB` raw, unlike every other wire boundary. This is the one site with no existing pattern to copy from directly; RESEARCH.md's recommendation (a fresh minimal strip, not reusing `snapPayload()` since that also strips `wx` which isn't wanted here) is the right call:
```javascript
function exportData(){
  const blob = new Blob([JSON.stringify(DB,null,2)],{type:'application/json'});
  ...
}
```
New code (no direct analog, closest conceptual precedent is `snapPayload`'s `Object.assign` + `delete` shape): `const payload = Object.assign({}, DB); delete payload.draft;` then serialize `payload` instead of `DB`.

---

### `index.html` — draft mutators, `save()` → `saveLocal()` (utility, CRUD)

**Analog:** `saveLocal()` itself, line 792:
```javascript
function saveLocal(){ try{ localStorage.setItem(KEY, JSON.stringify(DB)); return true; }catch(e){ return handleQuotaFailure(); } }
```
vs. `save()`, line 801 (bumps `updatedAt`, schedules push — read this function directly before switching call sites, to confirm exactly what side effects each draft mutator will lose).

Copy pattern: in each pure-draft mutator (`setVal`, `setNote`, `stairVal`, `startWorkout`, `discardWorkout`, etc. — full verified list in RESEARCH.md's table), replace the trailing `save();` call with `saveLocal();`. Do NOT do this in `pickEx`/`exPick` (they also call `exEnsure()`, which mutates the synced `DB.exercises` collection) or in `finishWorkout` (already nulls `DB.draft` before its `save()`, and finishing is the one point drafts intentionally become synced session data).

---

### `test/app.test.js` — `legacyView()` (test utility), lines 673-677

**Analog:** itself — already excludes fields for exactly this reason (post-baseline `COLLECTIONS` names).

```javascript
function legacyView(out){
  const copy = Object.assign({}, out);
  Object.keys(app.COLLECTIONS).forEach(name => { if(LEGACY_COLLECTIONS.indexOf(name) < 0) delete copy[name]; });
  return canon(copy);
}
```
Copy pattern: add `delete copy.draft;` (unconditional, since `draft` is not a `COLLECTIONS` entry and this exclusion is not schema-versioned) before `return canon(copy);`. This must land **before** `mergeDB`'s production-code change, per RESEARCH.md Pitfall 1 — otherwise ~800 differential cases spuriously fail.

---

### `test/app.test.js` — malformed-draft tests to rewrite, verified present at lines 2557-2564

Located and read directly this session (line numbers shifted slightly from RESEARCH.md's citation but content matches exactly):
```javascript
ok('the sync merge repairs a malformed draft as well', (()=>{
  const remote = populatedDB(a); remote.draft = draftFor(a,'PUSH 1'); delete remote.draft.stairs;
  remote.updatedAt = Date.now();
  const local = populatedDB(a); local.updatedAt = Date.now() - 60000;
  const out = a.mergeDB(remote, local, false);
  return out.draft && out.draft.workout === 'PUSH 1' && !!out.draft.stairs;
})());
ok('  …and still drops one with an unknown workout (the 2026-07-25 guard)', (()=>{
  const remote = populatedDB(a); remote.draft = draftFor(a,'PUSH 1'); remote.draft.workout = 'GONE';
  remote.updatedAt = Date.now();
  const local = populatedDB(a); local.updatedAt = Date.now() - 60000;
  return a.mergeDB(remote, local, false).draft === null;
})());
```
Rewrite pattern: both assertions change from checking a repaired/nulled `draft` value to checking `!('draft' in out)` (or `out.draft === undefined`), for every remote-draft shape. Can collapse into one parameterized assertion per RESEARCH.md.

---

### `test/app.test.js` — stale-draft incident test, verified present at lines 838-843

```javascript
{
  // "a finished workout's null draft beats a stale draft": null must win over a stale non-null draft.
  const validDraft = { workout: 'PUSH 1', date: today, entries: [], extras: {}, stairs: { level: '', seconds: '', skipped: false, reason: '' } };
  const olderWithDraft = Object.assign(app.blank(), { draft: validDraft, updatedAt: 100 });
  const newerNullDraft = Object.assign(app.blank(), { draft: null, updatedAt: 900 });
  const out = sameMerge("a finished workout's null draft beats a stale draft", newerNullDraft, olderWithDraft, false);
  ok("merge incident: a finished workout's null draft beats a stale draft", out.draft === null, out.draft);
}
```
Rewrite pattern: change the final assertion to `out.draft === undefined` (keep the test name/comment — the safety property still holds, only the mechanism changed from "recency comparison" to "unconditional strip"). Note `sameMerge()` (line 683) itself depends on `legacyView()`'s fix landing first.

---

### `test/harness.js` — `names` allowlist, lines 101-126 (config, batch)

**Analog:** the array itself — flat list of exported function-name strings, no per-entry structure.

```javascript
const names = [
  'todayISO','esc','fmtDate','effRange','PROGRAM','blank','normalize','touch','SCHEMA',
  ...
  'mdEscape', 'mdCell', 'mdHeader', 'exportRows', 'buildMarkdownExport', 'exportMarkdown', 'downloadMarkdown', 'exportData', 'exportShareFailed',
];
```
**Verified present already:** `mergeDB`, `mergeDB_legacy`, `normalize`, `blank`, `blank_legacy`, `validateBackup`, `touch`, `exEnsure`, `viewActive`, `exportData`.
**Verified NOT present** (confirmed by grep against the full array): `adoptMerged`, `snapPayload`, `saveLocal`, `save`, `normalizeDraft`, `startWorkout`, `startBackdate`, `finishWorkout`, `discardWorkout`, `importData`, `onSignedIn`, `cloudVersion`, `wipe`, `pushNow`, `schedulePush`, every individual draft mutator (`setVal`, `pickEx`, etc.).

Copy pattern: append needed names as bare strings to the existing array in the same comma-separated style, grouped near a thematically related existing entry (e.g. add `adoptMerged` near `mergeDB`/`remoteTooNew`; add `snapPayload`/`saveLocal`/`save` near `exportData`). Only add what tests actually call directly — RESEARCH.md's Wave 0 Gaps section lists the specific candidates per requirement.

## Shared Patterns

### The `wx`-exclusion idiom (the central pattern for this entire phase)
**Source:** `index.html` — `snapPayload()` (772), `mergeDB()` both branches (4142, 4163), `adoptMerged()` (4277-4282), `onSignedIn()`'s `'C'` branch (4329), `importData()`'s Merge (3587) and Replace (3592) branches.
**Apply to:** every one of the 6 wire-boundary sites for `draft` (RESEARCH.md's enumerated list). The mechanism is always the same three moves: (1) `delete <target>.wx` becomes `delete <target>.draft` at every write-to-wire point; (2) `const wx = DB.wx` + conditional reattach becomes the same for `draft` at every point a merge result becomes the new local `DB`; (3) nothing else changes — no new abstraction, no config object, no schema bump.
```javascript
// the pattern, generalized:
delete out.wx;
delete out.draft;   // NEW, same shape

const wx = DB.wx;
const draft = DB.draft;   // NEW, same shape
if(wx!==undefined) withWx.wx = wx;
if(draft!==undefined) withWx.draft = draft;   // NEW, same shape
```

### `saveLocal()` vs `save()` — device-local persistence without a push
**Source:** `index.html:792` (`saveLocal`) vs `index.html:801` (`save`).
**Apply to:** every pure-draft mutator (D-09). This is the existing mechanism CLAUDE.md's "Derived data uses `saveLocal()`" rule already names — no new function needed.

### `legacyView()` / `sameMerge()` / `golden()` — the differential-test comparison chain
**Source:** `test/app.test.js:673` (`legacyView`), `:683` (`sameMerge`), `:56` (`golden`).
**Apply to:** any change to `mergeDB`'s output shape must be reflected in `legacyView()` first, then the golden fixture regenerated (`WRITE_MERGE_GOLDEN=1 node test/app.test.js`), in that order — this ordering is itself the pattern to follow, not just the individual edits.

## No Analog Found

| File/Change | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `exportData()`'s new strip | utility, file-I/O | No existing wire boundary in this file omits stripping today — `exportData()` is the one site that currently serializes `DB` raw with zero exclusions (not even `wx`). Use the `Object.assign({}, DB); delete payload.draft;` shape (closest available precedent: `snapPayload`'s own `Object.assign`+`delete` construction, adapted). |
| `test/harness.js` support for `importData()`'s Replace branch (confirm() is stubbed to always return true) | test infrastructure | No existing test in this suite drives a `confirm()`-gated UI flow — RESEARCH.md Pitfall 6 flags this as genuinely new territory with two unproven options (extract pure `importMerge`/`importReplace` helpers, or override `app.__sandbox.confirm` per test). Neither has precedent to copy; planner must choose and spike early. |

## Metadata

**Analog search scope:** `index.html` (whole file, 4654 lines, grepped for `wx`/`draft`/function names and read at the specific offsets above), `test/app.test.js` (grepped for `legacyView`/`sameMerge`/`golden`/draft-related test names and read at the specific offsets above), `test/harness.js` (read lines 95-127 for the `names` array).
**Files scanned:** 3 source files (all previously known from CONTEXT.md/RESEARCH.md); no additional candidate analogs existed elsewhere in the repo since this is a single-file app with no parallel controller/service directory structure.
**Pattern extraction date:** 2026-09-22
