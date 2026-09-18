# Phase 1: F1 — The COLLECTIONS Registry - Pattern Map

**Mapped:** 2026-09-11
**Files analyzed:** 4 (`index.html`, `test/app.test.js`, `test/harness.js`, new `.gitignore`)
**Analogs found:** 4 / 4 — this is a single-file app; every "file" is really a set of functions/sections within `index.html` plus its two test files. There is no external codebase to search — the analog for every new function is an existing sibling function in the same file.

## File Classification

| New/Modified Unit | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `const COLLECTIONS = {...}` (new, `index.html` ~line 479) | config/registry (data-layer declaration) | N/A (declarative, read by others) | `const MIGRATIONS = {...}` (index.html:480) — same TDZ tier, same "hand-typed dict keyed by domain concept" shape | exact (structural sibling) |
| `sessKey`/`todoKey`/`hobbyKey` promotion to `function` decls | utility (key extraction) | transform | `buildExerciseRegistry(d)` (index.html:533) — existing precedent for a hoisted `function` declaration referenced from inside a `const` declared earlier in the file | exact |
| `cardioKey`/`ideaKey` extraction from inline arrows | utility (key extraction) | transform | same three promoted key consts above (`sessKey` etc., index.html:3618-3620) | exact |
| `sessionSort(a,b)` (new named comparator) | utility | transform | the inline comparator it replaces, index.html:3690 | exact (extraction, not new pattern) |
| `blank()` derivation (loop over `COLLECTIONS`) | model/config (default-shape factory) | CRUD (create/default) | current hand-written `blank()`, index.html:641 | exact (same function, derived body) |
| `liveOf(name)` + thin `liveX()` wrappers | service/filter | CRUD (read, soft-delete filter) | current 7 hand-written `liveX()` one-liners, index.html:653-659 | exact |
| `validateBackup()` shape prologue (loop over `COLLECTIONS`) | validation | request-response (import guard) | current hand-written required/optional loops, index.html:3302-3305 | exact |
| `mergeCollections(r,l,localNewer,out)` (new, extracted) | service (merge engine) | event-driven / CRUD (sync merge) | current per-collection lines inside `mergeDB()`, index.html:3664-3676 | exact |
| `mergeDB()` (thinned, calls `mergeCollections()`) | service/controller (sync entry point) | event-driven | itself, index.html:3644-3695 — only the middle section changes | exact |
| `mergeDB_legacy` (renamed original, temporary) | service (frozen reference for differential test) | event-driven | N/A — renaming precedent is REG-13/PITFALLS Pitfall 4, no prior renamed-legacy function exists in this file yet; first of its kind | no analog (new pattern, but mechanically trivial — copy-paste-rename) |
| `MIGRATIONS[18]` — `sleep` default | migration | batch (idempotent one-time shape fix) | migration 6 (`todos`), index.html:494; siblings 7, 8, 10 same shape | exact |
| `liveSleep()` | service/filter | CRUD | `liveCardio()`/`liveIdeas()`, index.html:656-657 (both `id`-keyed, both soft-delete) | exact |
| `addSleep()` | controller (form submit handler) | CRUD (create) | `addCardio()`, index.html:3448-3457 | exact |
| `removeSleep(id)` | controller | CRUD (soft delete) | `removeCardio(id)`, index.html:3458 | exact |
| `viewSleep()` | component/view | CRUD (list + form render) | `viewCardio()`, index.html:3545-3589 (form-above-history-list shape; strip the Strava-import section, cardio has no analog need there) | exact minus import subsection |
| `TABS[...]` entry for `sleep` (new `sub` pair, e.g. on `care`) | route/nav config | N/A | `care`'s existing `sub` array, index.html:1287-1289 | exact |
| `.gitignore` (new file, none exists) | config | N/A | none in-repo — first `.gitignore` for this project | no analog; needs `test/fixtures/real-db-snapshot.json` (or the whole `test/fixtures/` dir) ignored per the LOCAL-ONLY real-backup decision |
| `test/harness.js` `names` array edit | test config (export plumbing) | N/A | the array itself, test/harness.js:97-114 — additive edit to an existing list, not a new pattern | exact |
| `test/app.test.js` new differential/regression blocks (boot-order, `blank()` parity, `liveX()` parity, `validateBackup()` string parity, `mergeDB` gen-untouched, `sleep` stale-delete replay) | test | request-response (assertion) | existing named blocks: "booting with data that needs migrating" (test/app.test.js:478-490), "a bad backup is refused, and says why" (test/app.test.js:500-519), "sync merge: a stale device can never subtract" (~355-366), "a migration must survive the next sync" (~396-427) | exact — each new test extends a same-shaped existing block |
| `test/fixtures/real-db-snapshot.json` (real backup, LOCAL ONLY, git-ignored) | test fixture (file I/O) | file-I/O, conditional/skippable | **no analog exists** — flagged below under No Analog Found; this is the single biggest gap this map surfaces | none |

## Pattern Assignments

### `const COLLECTIONS = {...}` (registry, `index.html` ~line 479)

**Analog:** `MIGRATIONS` object declaration, and the migration-6 entry shape

**Placement/TDZ pattern** (index.html:478-480, exact insertion point):
```js
478  const PRODUCTIVITY_DEFAULT = [...];
     ← COLLECTIONS goes HERE
479  /* Ordered schema migrations. Each takes the data object up one version. Must be idempotent. */
480  const MIGRATIONS = {
```

**Hoisted-function-reference precedent** (why `key`/`sortBy`/`merge` can safely be function references even though `COLLECTIONS` is a `const` declared before those functions exist textually):
```js
// index.html:528-533
/* Migration 17: build the exercise registry and stamp every logged row with an identity.
   Deliberately reads only PROGRAM — ACCESSORIES is declared far below and this runs during
   `let DB = load()`, so touching it would throw a TDZ ReferenceError... */
17: d=>{ ...buildExerciseRegistry(d)... },
...
function buildExerciseRegistry(d){...}   // index.html:533 — function DECLARATION, hoisted, safe to reference from the const above
```
Apply the identical rule to `COLLECTIONS`: every `key`/`sortBy`/`merge` value must be a string literal or a reference to a `function` **declaration** (never a `const` arrow), because `function` declarations hoist and `const`s don't.

**Per-collection shape, exact oracle** (extracted from the phase's own research, already verified against source this session — not re-derived here):
```js
const COLLECTIONS = {
  sessions:   { kind:'list', key:sessKey,   sortBy:sessionSort, merge:'union', soft:true,  columns:[...] },
  weights:    { kind:'list', key:'date',    sortBy:'date',      merge:'union', soft:true,  columns:[...] },
  petWeights: { kind:'list', key:'date',    sortBy:'date',      merge:'union', soft:true,  columns:[...] },
  cardio:     { kind:'list', key:cardioKey, /* sortBy intentionally undeclared */ merge:'union', soft:true, columns:['date','type','minutes','distanceKm','note'] },
  ideas:      { kind:'list', key:ideaKey,   merge:'union', soft:true, columns:[...] },
  todos:      { kind:'list', key:todoKey,   merge:'union', soft:true, columns:[...] },
  hobbyLog:   { kind:'list', key:hobbyKey,  merge:'union', soft:true, columns:[...] },
  journal:    { kind:'map',  merge:'line-union',   required:false, columns:[...] },
  mobilityLog:{ kind:'map',  merge:'replace-whole',required:false, columns:[...] },
  lawnLog:    { kind:'map',  merge:'replace-whole',required:false, columns:[...] },
  sleep:      { kind:'list', key:'id', sortBy:'date', merge:'union', soft:true, columns:['date','hours','quality','note'] },
};
```
`merge` is a **required** field with no inferred default (REG-05) — this is the mechanism that structurally prevents the `mobilityLog`/`lawnLog` key-union incident from recurring; a loop that reads `spec.merge` and throws (or a derivation that only special-cases `'union'`/`'line-union'`/`'replace-whole'` and errors on anything else) is the enforcement point, not a comment.

---

### Promotions: `sessKey`, `todoKey`, `hobbyKey`, `cardioKey`, `ideaKey`, `sessionSort`

**Analog:** the three existing key consts, verbatim (index.html:3618-3620), plus the two inline arrows they're siblings of (index.html:3667-3668) and the inline comparator (index.html:3690).

**Current shape (const arrow, to be promoted):**
```js
// index.html:3618-3620
const sessKey = s => s.id || ('c_'+(s.date||'')+'|'+(s.workout||'')+'|'+(s.endedAt||'')+'|'+(s.skipped?'1':'0'));
const todoKey = t => (t.created||'')+'|'+(t.text||'');
const hobbyKey = h => (h.date||'')+'|'+(h.item||h.hobby||'')+'|'+(h.cat||'');
```
```js
// index.html:3667-3668 — inline, currently un-named
out.cardio = mergeUnion(r.cardio, l.cardio, c=>c.id || ((c.date||'')+'|'+(c.type||'')+'|'+(c.minutes||'')), localNewer);
out.ideas  = mergeUnion(r.ideas,  l.ideas,  i=>i.id || ((i.date||'')+'|'+(i.text||'')), localNewer);
```
```js
// index.html:3690 — inline comparator to become sessionSort(a,b)
out.sessions.sort((a,b)=> a.date===b.date ? ((a.endedAt||0)-(b.endedAt||0)) : String(a.date).localeCompare(String(b.date)));
```
**New shape (all five must become `function` declarations, not `const` arrows):**
```js
function sessKey(s){ return s.id || ('c_'+(s.date||'')+'|'+(s.workout||'')+'|'+(s.endedAt||'')+'|'+(s.skipped?'1':'0')); }
function todoKey(t){ return (t.created||'')+'|'+(t.text||''); }
function hobbyKey(h){ return (h.date||'')+'|'+(h.item||h.hobby||'')+'|'+(h.cat||''); }
function cardioKey(c){ return c.id || ((c.date||'')+'|'+(c.type||'')+'|'+(c.minutes||'')); }
function ideaKey(i){ return i.id || ((i.date||'')+'|'+(i.text||'')); }
function sessionSort(a,b){ return a.date===b.date ? ((a.endedAt||0)-(b.endedAt||0)) : String(a.date).localeCompare(String(b.date)); }
```
All existing call sites inside `mergeDB()` keep calling these by name — this is a pure extraction, no call-site logic changes (satisfies REG-12's "shippable at every commit").

---

### `blank()` derivation

**Analog:** current hand-written `blank()` (index.html:641)
```js
function blank(){ return { _schema:SCHEMA, gen:0, sessions:[], weights:[], petWeights:[], petName:"Freddie", exercises:[], draft:null, unit:"lb", routineMode:"4day", hobbies:HOBBIES_DEFAULT.slice(), productivity:PRODUCTIVITY_DEFAULT.slice(), hobbyLog:[], journal:{}, mobilityLog:{}, todos:[], cardio:[], ideas:[], lawnLog:{}, lawn:null, wx:null, hobbySeedV2:true }; }
```
**Derived shape** — scalars stay hand-written; list/map fields loop `COLLECTIONS`, reading only `spec.kind` (TDZ-safety rule from the Architecture section: `blank()` runs during `let DB = load()`, so it must not touch `key`/`sortBy`/`merge`, none of which are needed at boot):
```js
function blank(){
  const out = { _schema:SCHEMA, gen:0, petName:"Freddie", exercises:[], draft:null, unit:"lb",
                routineMode:"4day", hobbies:HOBBIES_DEFAULT.slice(), productivity:PRODUCTIVITY_DEFAULT.slice(),
                lawn:null, wx:null, hobbySeedV2:true };
  for(const name in COLLECTIONS) out[name] = COLLECTIONS[name].kind==='list' ? [] : {};
  return out;
}
```
Golden test: `JSON.stringify(blank())` before/after must be byte-identical (key order may shift — compare parsed-and-sorted, not raw string, per REG-06).

---

### `liveOf()` + `liveX()` wrappers

**Analog:** the 7 hand-written one-liners (index.html:653-659)
```js
const isLive = x => !!x && !x.deletedAt;
function liveSessions(){ return (DB.sessions||[]).filter(isLive); }
function liveWeights(){ return (DB.weights||[]).filter(isLive); }
function livePetWeights(){ return (DB.petWeights||[]).filter(isLive); }
function liveCardio(){ return (DB.cardio||[]).filter(isLive); }
function liveIdeas(){ return (DB.ideas||[]).filter(isLive); }
function liveTodos(){ return (DB.todos||[]).filter(isLive); }
function liveHobbyLog(){ return (DB.hobbyLog||[]).filter(isLive); }
```
**Derived shape** (thin-wrapper-delegates-to-shared-engine — the only acceptable derivation per this phase's anti-pattern rule):
```js
function liveOf(name){ return (DB[name]||[]).filter(isLive); }
function liveSessions(){ return liveOf('sessions'); }
function liveWeights(){ return liveOf('weights'); }
function livePetWeights(){ return liveOf('petWeights'); }
function liveCardio(){ return liveOf('cardio'); }
function liveIdeas(){ return liveOf('ideas'); }
function liveTodos(){ return liveOf('todos'); }
function liveHobbyLog(){ return liveOf('hobbyLog'); }
function liveSleep(){ return liveOf('sleep'); }   // new, SLEEP-01
```
Never use `window['live'+cap(name)] = ...` dynamic generation — explicitly ruled out (Anti-Patterns, this phase's own research) because it breaks grep-ability.

---

### `mergeDB()` / `mergeCollections()` extraction

**Analog:** `mergeDB()` itself, current full body (index.html:3644-3695)

**Hard `gen`-mismatch early return — must stay textually untouched, `mergeCollections()` called only after it (REG-10):**
```js
// index.html:3644-3658
function mergeDB(remote, local, localWins){
  const r = remote && typeof remote==='object' ? remote : {};
  const l = local  && typeof local==='object'  ? local  : {};
  const rG = +r.gen || 0, lG = +l.gen || 0;
  if(rG !== lG){
    const win = Object.assign({}, blank(), lG > rG ? l : r);
    win.gen = Math.max(rG, lG);
    win.updatedAt = Math.max(+r.updatedAt||0, +l.updatedAt||0);
    win._schema = Math.max(+r._schema||0, +l._schema||0, SCHEMA);
    delete win.wx;
    return win;
  }
  // per-collection merging begins only below this line — mergeCollections() goes here
```

**One list branch to generalize** (index.html:3664):
```js
out.sessions = mergeUnion(r.sessions, l.sessions, sessKey, localNewer);
```
**One map branch to generalize, with the explicit-false hazard comment intact** (index.html:3673-3676):
```js
/* mobilityLog / lawnLog: take the WHOLE inner object from the newer side. Do NOT union inner
   keys — these encode "off" as false/absent, and unioning resurrects unchecked boxes forever. */
out.mobilityLog = mergeDateMap(r.mobilityLog, l.mobilityLog, localNewer, null);
out.lawnLog     = mergeDateMap(r.lawnLog,     l.lawnLog,     localNewer, null);
```
**`mergeCollections()` derived shape** (dispatches by `spec.merge`, throws/errors on an unrecognized or missing value rather than defaulting):
```js
function mergeCollections(r, l, localNewer, out){
  for(const name in COLLECTIONS){
    const spec = COLLECTIONS[name];
    if(spec.kind==='list'){
      out[name] = mergeUnion(r[name], l[name], typeof spec.key==='function' ? spec.key : (x=>x[spec.key]), localNewer);
    } else { // map
      if(spec.merge==='line-union') out[name] = mergeDateMap(r[name], l[name], localNewer, (a,b,bN)=>mergeJournalEntry(a,b,bN));
      else if(spec.merge==='replace-whole') out[name] = mergeDateMap(r[name], l[name], localNewer, null);
      else throw new Error(`COLLECTIONS.${name} is missing a merge strategy`); // no silent default — REG-05
    }
  }
}
```
`journal` needs a special-case dispatch (`mergeJournalEntry`) because its `merge` value is genuinely bespoke per-line logic, not one of the two generic map strategies — keep this dispatch explicit rather than trying to fold `mergeJournalEntry` into `COLLECTIONS` itself (Anti-Patterns: no validation/merge DSL).

**Sort invariants stay hand-written, outside the loop** (index.html:3688-3690) — `sortBy` is applied after `mergeCollections()` returns, for the three collections that declare one (`sessions` via `sessionSort`, `weights`/`petWeights`/`sleep` via `sortBy:'date'`), never inside the generic dispatch.

---

### `validateBackup()` shape prologue

**Analog:** current hand-written required/optional loops (index.html:3302-3305)
```js
const arrays = ['sessions','weights'];
for(const k of arrays) if(!Array.isArray(raw[k])) return `This backup is missing its ${k} list, so it's incomplete or truncated.`;
for(const k of ['petWeights','cardio','ideas','todos','hobbyLog']) if(raw[k]!=null && !Array.isArray(raw[k])) return `The ${k} section is damaged (expected a list).`;
for(const k of ['journal','mobilityLog','lawnLog']) if(raw[k]!=null && (typeof raw[k]!=='object' || Array.isArray(raw[k]))) return `The ${k} section is damaged.`;
```
**Derived shape**, required strict wording parity with the above (`sessions`/`weights` need `required:true` on their `COLLECTIONS` spec so this loop can tell them apart from the optional five):
```js
for(const name in COLLECTIONS){
  const spec = COLLECTIONS[name];
  if(spec.required && !Array.isArray(raw[name])) return `This backup is missing its ${name} list, so it's incomplete or truncated.`;
  if(!spec.required && raw[name]!=null){
    const ok = spec.kind==='list' ? Array.isArray(raw[name]) : (typeof raw[name]==='object' && !Array.isArray(raw[name]));
    if(!ok) return `The ${name} section is damaged${spec.kind==='list'?' (expected a list)':''}.`;
  }
}
// Deep per-row checks below (index.html:3309-3323) STAY HAND-WRITTEN, unchanged — no validation DSL.
```
Parity proof: run the existing malformed-backup battery through the derived validator, assert identical returned **strings** (test/app.test.js:500-519, the `reject(...)` calls), not just identical truthiness (REG-08).

---

### `MIGRATIONS[18]` — new `sleep` default

**Analog:** migration 6 and its three siblings (index.html:494-496, 498)
```js
6:d=>{ if(!d.todos) d.todos=[]; return d; }, // rolling to-do list
7:d=>{ if(!d.cardio) d.cardio=[]; return d; }, // cardio / Strava log
8:d=>{ if(!d.ideas) d.ideas=[]; return d; }, // in-app dev-idea capture
10:d=>{ if(!d.lawnLog) d.lawnLog={}; return d; }, // adaptive lawn watering/mowing log
```
**New entry, identical shape:**
```js
18:d=>{ if(!Array.isArray(d.sleep)) d.sleep=[]; return d; }, // sleep log (COLLECTIONS registry, F1)
```
No `touch()`/persist-immediately/idempotent-row-rewrite ceremony needed — REG-16's four guards don't apply because this creates a new empty field, it never rewrites an existing row with an `mtime` (Go/No-Go Decision, already resolved: no rewrite required for F1).

---

### `sleep` CRUD + view — analog is `cardio`, not `weights`

**Analog:** `addCardio()`/`removeCardio()`/`viewCardio()` (index.html:3448-3589), **minus the Strava-import subsection** (index.html:3460-3543, `pickCardioFile`/`handleCardioFile`/`parseGPX`/`parseTCX`/`parseStravaCSV`/`importCardioBatch`/`confirmCardioImport`/`discardCardioImport` — none of this has a `sleep` equivalent, do not port it).

**Add pattern** (index.html:3448-3457):
```js
function addCardio(){
  const date=(document.getElementById('cardio-date')||{}).value||todayISO();
  const type=(document.getElementById('cardio-type')||{}).value||'Longboard';
  const min=parseFloat((document.getElementById('cardio-min')||{}).value)||0;
  const distV=parseFloat((document.getElementById('cardio-dist')||{}).value);
  const note=((document.getElementById('cardio-note')||{}).value||'').trim();
  if(!(min>0) && !(distV>0)){ toast('Enter minutes or distance'); return; }
  DB.cardio.push(touch({ id:cardioUid(), date, type, minutes:min, distanceKm:(distV>0?dispToKm(distV):0), note, source:'manual' }));
  save(); toast('Cardio logged 🛹'); render();
}
function removeCardio(id){ if(!softDelete(DB.cardio, c=>c.id===id)) return; save(); render(); }
```
`cardioUid()` (index.html:3426, exact form for a new `sleepUid()`-style id generator, or reuse a shared uid helper if one exists — this is the `id` generator `sleep` needs since `COLLECTIONS.sleep.key` is `'id'`):
```js
function cardioUid(){ return 'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
```
**Adapted `addSleep()`/`removeSleep()` shape:**
```js
function addSleep(){
  const date=(document.getElementById('sleep-date')||{}).value||todayISO();
  const hours=parseFloat((document.getElementById('sleep-hours')||{}).value);
  const quality=parseInt((document.getElementById('sleep-quality')||{}).value,10)||3;
  const note=((document.getElementById('sleep-note')||{}).value||'').trim();
  if(!(hours>0)){ toast('Enter hours slept'); return; }
  DB.sleep.push(touch({ id:'sl'+Date.now().toString(36)+Math.random().toString(36).slice(2,6), date, hours, quality, note }));
  save(); toast('Sleep logged 🌙'); render();
}
function removeSleep(id){ if(!softDelete(DB.sleep, s=>s.id===id)) return; save(); render(); }
```

**View / list-with-delete pattern** (index.html:3557-3561, the `hist-item` + `x-set` delete button convention):
```js
const rows = list.length ? list.map(c=>`<div class="hist-item" style="cursor:default">
    <div><div style="font-weight:600">${esc(c.type)}...</div>
      <div class="muted" style="font-size:12px">${fmtDate(c.date)} · ...${c.note?' · '+esc(c.note):''}</div></div>
    <button class="x-set" onclick="removeCardio('${c.id}')" title="delete">${ph('x')}</button>
  </div>`).join('') : '<p class="empty">No cardio logged yet. ...</p>';
```
Adapt directly for `viewSleep()`: replace `c.type`/duration/distance line with `${c.hours}h · quality ${c.quality}/5`, keep `esc(c.note)`, keep the `x-set`/`removeSleep('${s.id}')` delete button, keep the empty-state `<p class="empty">` pattern.

**Icon:** reuse `ph('moon')` — already used at index.html:2743 in `viewSkincare()` for the evening marker; do not add a new icon to the `PH` map.

**Quality-rating control:** lowest-novelty choice is a plain `<select>`, matching `cardio-type`'s existing `<select>` (index.html:3574):
```js
<div><label>Type</label><select id="cardio-type">${CARDIO_TYPES.map(t=>`<option ${t==='Longboard'?'selected':''}>${t}</option>`).join('')}</select></div>
```
Adapt: `<select id="sleep-quality">${[1,2,3,4,5].map(n=>`<option value="${n}" ${n===3?'selected':''}>${n}</option>`).join('')}</select>`.

---

### `TABS` entry for `sleep`

**Analog:** `care`'s existing `sub` array (index.html:1287-1289)
```js
{ id:'care', label:'Care', icon:'sparkle', sub:[['skin','Skin'],['lawn','Lawn']],
  view:sub => sub==='skin' ? viewSkincare() : viewLawn(),
  onRender:sub => { if(sub==='lawn') maybeFetchWeather(); } },
```
Extend to `sub:[['skin','Skin'],['lawn','Lawn'],['sleep','Sleep']]`, and the `view:` ternary to add `: sub==='sleep' ? viewSleep() : ...`. This placement is **automatically picked up** by the smoke test's `SCREENS` construction (`test/app.test.js:566-570`, builds from `app.TABS[...].sub`) — zero test-file edits needed for coverage, per the research's evidence-based recommendation (option 1 over a `progSub`-style placement).

---

### `test/harness.js` — the `names` export list

**Analog:** the array itself (test/harness.js:97-114) — this is additive, not a new pattern:
```js
const names = [
  'todayISO','esc','fmtDate','effRange','PROGRAM','blank','normalize','touch','SCHEMA',
  ...
  'TABS','tabDef','render','go','setSub','subState',
  'viewActive','viewCardio','viewCardioTrend','viewData','viewHistory','viewPicker','viewSkincare','viewVolume',
];
```
**Every new function this phase introduces must be added to this array in the same commit that introduces it**, or it silently returns `undefined` to every test that references it (this is the single biggest flagged risk in the phase's own research). Names to add, minimum: `COLLECTIONS`, `liveOf`, `liveSleep`, `mergeCollections`, `mergeDB_legacy` (or whatever the renamed legacy function is called), `sessKey`, `todoKey`, `hobbyKey`, `cardioKey`, `ideaKey`, `sessionSort`, `addSleep`, `removeSleep`, `viewSleep`, `blank_legacy`/`validateBackup_legacy` if either gets a temporary renamed twin per REG-13.

---

### Test blocks — boot-order / parity / differential

**Analog A — boot-with-migration pattern** (test/app.test.js:478-490):
```js
console.log('\n── booting with data that needs migrating ──');
const booted = loadApp(APP_PATH, Object.assign(app.blank(), { _schema:14, draft:null, sessions:[
  { id:'g1', workout:'LEGS 1', date:'2026-07-15', endedAt:1, extras:{},
    entries:[{name:'Goblet squat', sets:[{w:'50',r:'12',skipped:false}]}] }]}));
ok('the app boots at all (no dead-zone crash)', typeof booted.exKey === 'function' && typeof booted.exRows === 'function');
ok('  …the migration ran', booted.DB._schema === app.SCHEMA && booted.DB.sessions[0].entries[0].name === 'Deficit sumo squat', ...);
ok('a fresh install still boots clean', (()=>{ const fresh = loadApp(APP_PATH); return fresh.DB._schema === app.SCHEMA && fresh.DB.sessions.length === 0; })());
```
Use this exact `loadApp(APP_PATH, seed)` + `loadApp(APP_PATH)` (fresh) pairing for REG-15's schema-1→17(→18) boot regression, and for asserting `sleep` defaults to `[]` on a fresh boot and backfills on an old-schema boot.

**Analog B — malformed-backup differential battery** (test/app.test.js:500-521), the `reject(label, mutate, expect)` helper:
```js
const reject = (label, mutate, expect) => {
  const copy = JSON.parse(JSON.stringify(realBackup)); mutate(copy);
  const msg = app.validateBackup(copy);
  ok(label, typeof msg === 'string' && (!expect || expect.test(msg)), msg);
};
reject('a truncated file (no weights list) is refused', d=>{ delete d.weights; }, /weights/);
```
Reuse this helper verbatim for REG-08's parity test — just also call whatever the pre-derivation `validateBackup` twin is (if REG-13 renames it) and assert both messages match, not just both truthy.

**Analog C — stale-device-can't-subtract merge test** (referenced at test/app.test.js:355-366; exact block header): `── sync merge: a stale device can never subtract ──`. This is the direct template for SLEEP-06's synthetic two-device sleep-delete replay — build a `sleep` array on each synthetic device the same way that block builds `petWeights`/other arrays, run through `mergeDB`, assert the soft-deleted row's `deletedAt` survives.

**No analog for a "skip loudly when a local fixture file is absent" guard.** Searched `test/app.test.js` in full — the only environment-sensitive guard in the suite is the frozen-clock/TZ check at the top of the file (`freezeRunnerClock()` at line 15, and the comment at lines 8-10: *"The clock is frozen to midday Fri 7 Aug 2026 (see harness.js). Set TZ=America/Chicago; the suite checks that itself below"* — enforced via `ok('  …at midday — set TZ=America/Chicago if this fails', new Date().getHours() === 12, ...)`). This is a **loud assertion failure**, not a skip — the suite has no precedent for "conditionally skip a block and print why." The real-backup differential test (REG-13) will need to invent this pattern from scratch:
```js
// No existing precedent — write fresh, following the ok()/console.log conventions above:
const fixturePath = path.join(__dirname, 'fixtures', 'real-db-snapshot.json');
if(fs.existsSync(fixturePath)){
  console.log('\n── differential: real backup, legacy vs derived ──');
  // ...run both mergeDB_legacy and mergeDB over the fixture, assert deep-equal...
} else {
  console.log('\n── SKIPPED: real backup differential (no test/fixtures/real-db-snapshot.json — see .gitignore) ──');
}
```
Flag this loudly in the test output (not a silent `if` with no `console.log`), per the phase's Test Fixture Gap section.

## Shared Patterns

### TDZ-safety (applies to `COLLECTIONS`, its promoted key functions, and `sessionSort`)
**Source:** migration 13's and migration 17's own comments, index.html:503-506 and 528-532 (quoted verbatim in Registry Shape section above).
**Apply to:** any new top-level `const`/`function` placed before `let DB = load()` (index.html:635).
**Rule:** literal values or hoisted `function` declarations only; never a forward-referenced `const` arrow.

### Soft-delete convention (`touch()` + `deletedAt`, never splice)
**Source:** index.html:643-664, the `isLive`/`touch`/`softDelete` primitives, and every existing `removeX()` (`removeCardio`, index.html:3458).
**Apply to:** `removeSleep()`.
```js
const isLive = x => !!x && !x.deletedAt;
function touch(x){ if(x && typeof x==='object') x.mtime = Date.now(); return x; }
function softDelete(arr, pred){
  const it = (arr||[]).find(x=> isLive(x) && pred(x)); if(!it) return false;
  it.deletedAt = Date.now(); touch(it); return true;
}
```

### `esc()` escaping for user-entered text in list rows
**Source:** `viewCardio()`'s note rendering, index.html:3559 — `${c.note?' · '+esc(c.note):''}`.
**Apply to:** `viewSleep()`'s `note` field. Per `CLAUDE.md`'s documented gap, `esc()` doesn't cover attribute interpolation — if `sleep`'s edit form ever pre-fills a `value="${...}"` attribute, that needs manual escaping beyond `esc()`; this phase's locked SLEEP-02/03 scope (log + view + delete, no edit-in-place) does not need that escape hatch, but flag it if a future phase adds editing.

### `save(); toast(...); render();` — the standard write-then-refresh triad
**Source:** every `addX()`/`removeX()` in the file, e.g. `addCardio()` (index.html:3456) and `removeCardio()` (index.html:3458).
**Apply to:** `addSleep()`/`removeSleep()` verbatim.

## No Analog Found

| File/Unit | Role | Data Flow | Reason |
|---|---|---|---|
| `test/fixtures/real-db-snapshot.json` | test fixture | file-I/O | Confirmed absent from the repo this session (research's Test Fixture Gap section, `find`/`ls` run directly). Cannot be fabricated — requires Ian to export a real backup via Settings → Export backup and provide it. No committed analog for the "skip loudly if absent" guard either (see Test Blocks section above) — this guard must be authored fresh, not copied. |
| `.gitignore` | config | N/A | No `.gitignore` exists in this repo today [confirmed via research: no prior mention of one]. Write fresh; minimum content needed is an ignore rule for `test/fixtures/real-db-snapshot.json` (or the whole `test/fixtures/` directory) per the LOCAL-ONLY real-backup decision. No project convention to copy from since this is the first one. |
| `mergeDB_legacy` (renamed original, temporary scaffold) | service | event-driven | First time this codebase has ever renamed-and-frozen a function specifically to diff against its replacement — REG-13/PITFALLS Pitfall 4 is itself the reason this pattern is being introduced. Mechanically it is just "copy `mergeDB`'s current body under a new name before editing the original," which needs no analog to execute correctly, but there is no prior instance in this file to point to. |

## Metadata

**Analog search scope:** `index.html` (whole file, single `<script>` block — read directly, not grepped blindly, per this project's own research methodology), `test/app.test.js`, `test/harness.js`. No other source files exist (`package.json` confirms zero dependencies; no `src/`, no other JS files in the repo).
**Files scanned:** 3 (`index.html`, `test/app.test.js`, `test/harness.js`) — this is the entire application + test surface; `.gitignore` is a new file with no existing sibling to scan.
**Pattern extraction date:** 2026-09-11
