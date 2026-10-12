# Phase 9: Equipment and Weight Steps - Pattern Map

**Mapped:** 2026-10-12
**Files analyzed:** 4 (index.html — ~14 regions; test/app.test.js; test/harness.js; test/fixtures/merge-golden.json)
**Analogs found:** 14 / 15 regions (all in-file; the app is one `index.html`)

Line numbers are from the current HEAD (e4082c3) and drift as edits land; grep the quoted text.

## File Classification

| New/Modified region | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `EQUIP_TYPES`, `EQUIP_DEFAULTS`, `function equipGuess` (above `const MIGRATIONS`) | config / utility | transform | `buildExerciseRegistry` local `norm`/`slug` (index.html ~L601-603) — inline literals, no TDZ consts | role-match |
| `MIGRATIONS[19]` + `function stampEquipment(d)` | migration | batch | migration 17 `buildExerciseRegistry` (L578, L596-615) + migration 16 `renameLoggedExercise` | exact |
| `SCHEMA = 18 → 19` (L481) | config | — | prior bumps | exact |
| `exEnsure` stamps `equip`/`equipAt:0`; `exMerge` tombstone; `exRow` live-only | model | CRUD | `exEnsure`/`exMerge` (L1281-1305) | exact (modify) |
| `EQUIP_LABEL`, `equipOf(name)` | utility | transform | `exLabel`/`exKey` (L1272-1278) | role-match |
| `mergeExercises(r,l,localNewer)` + one call in `mergeDB` | service | sync merge | `mergeUnion` (L4057-4075), call site after `mergeCollections` (L4306) | exact |
| `weightStep(name,w)` + `loadFloor`/`loadNearest`/`deloadWeight` | utility | transform | `weightStep` (L1098), `round5` (L863), `translateLoad` (L937-943) | exact (modify) |
| `deloadExercise` | controller (draft) | event-driven | itself (L1233-1239) | modify |
| `toggleWarm` warm-up rungs + note | component | render | itself (L2086-2107) | modify |
| `translateLoad` + call site L1891-1892 | utility + component | transform | itself | modify |
| `barStyle` body / `platesText` ez silence | utility | transform | `barStyle` (L1048), `platesText` (L1056-1084) | modify |
| `addWeightInfo` newW / prefill L1823 / flag L1881 | service + component | transform | itself (L1128, L1823, L1881) | modify |
| `setExerciseEquip(id,type)` | controller (synced) | CRUD | `renameExercise` (L2713-2722) | exact |
| Settings select in `exercisesCardHTML` | component | render | `exercisesCardHTML` rename button (L2694-2711) | exact |
| D-04 picker + D-05 tag in `viewActive` card; `equipAsk` Set in `pickEx`/`exPick` | component | event-driven | `pickEx` (L2008-2016), card header L1913-1923 | role-match |
| ACTIONS `setExEquip` (change), `pickExEquip` (click) | route | event-driven | `renameExercise`/`pickEx` entries (L4870, L4999) | exact |
| test/app.test.js new tests | test | — | migration-15 replay block (L663-699), L982 merge structure test, DRAFT_PUSHERS (L3736/L3810) | exact |
| test/harness.js `names` | config | — | names list (L117-135) | exact |
| test/fixtures/merge-golden.json | fixture | — | regenerate `WRITE_MERGE_GOLDEN=1 node test/app.test.js` | n/a |

## Pattern Assignments

### Migration 19 (migration, batch) — analog migration 17

MIGRATIONS entry style (index.html L576-579):
```js
  /* Exercises stop being strings and become things with ids. See buildExerciseRegistry(). */
  17:d=>buildExerciseRegistry(d),
  18:d=>ensureCollectionDefaults(d), // sleep log — creates absent collections only (COLLECTIONS registry, F1)
};
```
TDZ discipline (L591-595): comment states what it reads and why; uses only literals and inline helpers:
```js
/* Migration 17: ... Deliberately reads only PROGRAM — `ACCESSORIES` is declared far below and this runs during
   `let DB = load()`, so touching it would throw a TDZ ReferenceError straight into the silent
   catch in normalize(), skipping the migration while `_schema` advanced anyway ... */
function buildExerciseRegistry(d){
  const norm = s => String(s==null?'':s).trim().toLowerCase().replace(/\s+/g,' ');
```
`equipGuess` must use its own inline `norm` like this — not `normEx` (const arrow at L1261), `BAR_FOR`, `LANDMINE_RE`, `ACCESSORIES`, `EQUIP_LABEL`.
Rewrite-rows rule (L585-590 comment): rewrite then `touch()`; persistence comes from the boot `if(migrationRan) save();` (~L5037) — never `save()` inside the migration. D-14: stamp `r.mtime = (+r.mtime||0) + 1` instead of `touch()` (Date.now()); comment that this is the deliberate "just newer" variant.
Idempotence: skip rows already holding a valid `equip` (and tombstones).

### Registry helpers (model, CRUD) — analog `exEnsure`/`exMerge` (L1281-1305)
```js
function exEnsure(name){
  const k = normEx(name); if(!k) return null;
  const found = exIdByName(name); if(found) return found;
  let id = slugEx(name), n = 2;
  while(exRow(id)) id = slugEx(name) + '-' + (n++);
  exRows().push(touch({ id, name:String(name).trim(), aliases:[k] }));
  return id;
}
...
  DB.exercises = exRows().filter(x=>x.id!==fromId);   // L1304 — becomes a tombstone
```
Changes: push `{..., equip: equipGuess(name), equipAt: 0}`; collision loop must see tombstones (`exRows().some(x=>x&&x.id===id)`) once `exRow` filters `!x.deletedAt`; `exMerge` sets `a.deletedAt=Date.now(); a.mergedInto=intoId; a.aliases=[]; touch(a)`. `equipOf` follows `exLabel` shape (L1278): `const r = exRow(exKey(name)); return r && EQUIP_TYPES.indexOf(r.equip)>=0 ? r.equip : equipGuess(name);`

### `mergeExercises` (service, sync) — analog `mergeUnion` (L4057-4075)
```js
function mergeUnion(aArr, bArr, keyOf, newerFirst){
  ...
    const cur=out[prev], curT=+cur.mtime||0, newT=+it.mtime||0;
    if(newT>curT || (newT===curT && fromNewerSide)) out[prev]=it;
  ...
}
```
Call site in `mergeDB` (L4302-4306) — add one line after `mergeCollections(r, l, localNewer, out);`:
```js
  const out = Object.assign({}, blank(), older, newer);
  mergeCollections(r, l, localNewer, out);
  out.exercises = mergeExercises(r, l, localNewer);   // new
```
Constraint, test L981-983: `mergeDB.toString()` must not contain `mergeUnion(` — so the union call lives inside `mergeExercises`. Also the gen early-return (`return win;`) must stay before `mergeCollections(` (L976-978). Do not sort; never mutate input rows (use `Object.assign({}, x, {equip, equipAt})`). Full proposed body: RESEARCH.md Pattern 2.

### Step seam + rounding (utility, transform) — analog L863, L937-943, L1090-1098
```js
const round5 = n => Math.max(0, Math.round(n/5)*5);                 // L863 — readers L1236, L2096 only
const INCREMENT = { lb:5, kg:2.5 };                                  // L1090
/* The one seam Phase 9 (EQUIP-04) replaces: only the body changes, so `name` is kept though unused. */
function weightStep(name){ return INCREMENT[DB.unit] || 5; }         // L1098
```
New helpers are hoisted `function` declarations next to `weightStep`. Use `+1e-9` epsilon in floor/round (0.9*70 drift). `weightStep` returns `null` for bodyweight — every caller (`addWeightInfo` L1128, prefill L1823, flag L1881, D-05 tag) branches on null. Proposed bodies: RESEARCH.md Pattern 5.

### `deloadExercise` (draft controller) — itself, L1233-1239
```js
  const dw = lastW>0 ? String(round5(lastW*0.9)) : '';
  e.deload=true; e.sets.forEach(st=>{ if(!st.skipped) st.w=dw; });
  saveLocal(); render();
```
Swap only `round5(lastW*0.9)` for `deloadWeight(e.name, lastW)`. Keep `saveLocal()` (draft rule; DRAFT_PUSHERS test). D-15 empty-bar note rendered on the card where `e.deload` is shown, text "Already at the empty bar — cut a set or reps instead."

### Warm-up ramp (component) — `toggleWarm` L2086-2107
```js
  const w50 = round5(w*0.5), w75 = round5(w*0.75);
  ...
    ${bar==null ? '<div class="muted" style="font-size:11px;padding-top:4px">Rounded to 5 lb — with kettlebells, take the nearest bell.</div>' : ''}`;
```
Replace with `loadNearest(entry.name, …)` clamped to `bar` on bar styles; note text from the real step (UI-SPEC copy).

### `translateLoad` (L937-943) + Last-time line (L1891-1892)
```js
  const inc = INCREMENT[DB.unit] || 5;
  return Math.max(inc, Math.floor(raw/inc)*inc);
...
      if(sug) lastLine += ` <span class="muted">→ suggest <strong>${sug} ${DB.unit}</strong> for …`;
```
Add `name` param, floor via `loadFloor`; escape `${esc(sug)} ${esc(DB.unit)}` (IN-04). Display only, never prefilled.

### Plate style (L1037-1055, platesText L1056-1084)
Keep `BAR_LB`, `BAR_FOR`, `LANDMINE_RE`, `barWeight`, `isBarbell` and readers (`updPlates` L1087-1089, card L1930, `toggleWarm`) untouched; only `barStyle`'s body changes (RESEARCH Pattern 6). Add `'ez'` silence in `platesText` (≤25 or leftover>0.01 → `''`); existing straight/landmine/sled wording is pinned by tests L425-436.

### `setExerciseEquip` (synced controller) — analog `renameExercise` (L2713-2722)
```js
function renameExercise(id){
  const r = exRow(id); if(!r) return;
  ...
  touch(r); save(); toast('Renamed ✓'); render();
}
```
Shape: `const r = exRow(id); if(!r || EQUIP_TYPES.indexOf(type)<0) return; r.equip=type; r.equipAt=Date.now(); touch(r); equipAsk.delete(id); save(); render();`. Must NOT read `DB.draft` (else it joins DRAFT_PUSHERS, test L3805-3812).

### Settings control — analog `exercisesCardHTML` (L2694-2711)
```js
    ${rows.map(r=>`<div class="hist-item">
      <span style="min-width:0"><strong style="font-size:13px">${esc(r.name)}</strong>
        <span class="muted" style="font-size:11px">· ${r.n} session${r.n===1?'':'s'}</span></span>
      <button class="btn btn-sm btn-ghost" data-action="renameExercise" data-id="${esc(r.id)}">${ph('pencil-simple')}Rename</button>
    </div>`).join('')}
```
Add `<select data-action="setExEquip" data-id="${esc(r.id)}">` with `<option value="${esc(t)}"${sel}>${esc(EQUIP_LABEL[t])}</option>`; skip the select when `exRow(r.id)` is null. Layout/copy per 09-UI-SPEC.md.

### First-time picker + tag — analog `pickEx` (L2008-2016) and card header (L1913-1923)
```js
function pickEx(i, sel){
  const e = DB.draft.entries[i];
  if(sel.value==='__custom'){
    const picked = resolveTypedName(prompt('Exercise name:', e.name));
    if(picked){ e.name = picked.name; e.exId = picked.exId; }
    save(); render(); return;
  }
  e.name = sel.value; e.exId = exEnsure(sel.value); save(); render();
}
```
Capture `wasKnown = !!exIdByName(name)` before `exEnsure` (also in `resolveTypedName`/`exPick`); if new and not a key of `EQUIP_DEFAULTS`, `equipAsk.add(id)` (module `let`, UI-only, declared below `let DB` is fine since only read at runtime). Picker buttons: `data-action="pickExEquip" data-id="${esc(id)}" data-equip="${esc(t)}"`. Tag: muted span `${esc(label + ' · +' + step)}` beside the `pickEx` select.

### ACTIONS wrappers — analog L4869-4870, L4999
```js
  doExMerge:      { click: () => doExMerge() },
  renameExercise: { click: el => renameExercise(el.dataset.id) },
  ...
  pickEx:           { change: el => pickEx(+el.dataset.i, el) },
```
New: `setExEquip: { change: el => setExerciseEquip(el.dataset.id, el.value) }` (Settings group) and `pickExEquip: { click: el => setExerciseEquip(el.dataset.id, el.dataset.equip) }` (Log group). Thin, no DB access, no persistence, literal names.

## Tests

### Stale-device migration replay — analog test/app.test.js L663-699 (migration 15 block)
```js
ok('  …so the merge prefers it over the untouched copy', (()=>{
  const local = app.normalize(gobletV14());                      // this device: migrated, touched
  const stale = JSON.parse(JSON.stringify(gobletV14()));         // the other device: pre-migration, no mtime
  stale._schema = 15; stale.updatedAt = Date.now() + 60000;      // and it LOOKS newer
  local.updatedAt = Date.now();
  const out = app.mergeDB(stale, local);
  return out.sessions[0].entries[0].name === 'Deficit sumo squat';
})(), 'the stale name won the merge');
...
ok('a second run touches nothing (migrations settle)', (()=>{ ... normalize twice, compare mtimes ... })());
```
Copy for schema-18 registry seed: equip survives a stale merge (both argument orders, replayed twice); a rename on the other device (mtime > old+1) still wins (D-14); an explicit `equipAt` choice beats a migrated default; tombstoned merge stays deleted on replay; second normalize changes no mtime; boot `loadApp(APP_PATH, seed18)` and assert every `a.__stored().exercises` row has a valid `equip` (catches silent TDZ).

### Structure tests to keep green
- L976-983 (`mergeDB` source: gen return before `mergeCollections(`, no `mergeUnion(`).
- L3805-3812 DRAFT_PUSHERS stays `['exPick','finishWorkout','pickEx']`.
- Update bare `_schema === 18` literals (L1335, L1360-1361) to `app.SCHEMA`.
- Phase 8 `DB lateral raise` assertions (L7762-7764, 7818, 7828, 7914, 8194, 8205, 8220) → dumbbell values; keep one +5 barbell/machine control.
- L1793-1806 `!app.exRow('pec-deck')` must hold under tombstones.

### harness.js names (L117-135)
Consts are only reachable as `app.X` when listed; add `EQUIP_TYPES`, `EQUIP_DEFAULTS`, `EQUIP_LABEL` (and `equipAsk` if tested). Function declarations are already on `a.__sandbox`. Add new names to `REQUIRED_EXPORTS` (app.test.js L158) as wanted.

### Golden fixture
After SCHEMA bump: `WRITE_MERGE_GOLDEN=1 node test/app.test.js`, then `npm test` normally (docs/adding-a-collection.md § Registry validity). Then `npm run csp:hash`.

## Shared Patterns

- **Escaping:** every interpolated value (`id`, `equip`, label, step, `DB.unit`) through `esc()` in double-quoted attributes.
- **Persistence:** synced registry edit → `touch(row); save()`; draft edits → `saveLocal()`; migration → boot save only.
- **Validation:** any stored `equip` read via `equipOf` and checked against `EQUIP_TYPES`; render via `EQUIP_LABEL`.
- **Theme/icons:** `:root` vars, `ph()` icons, `muted` class for the tag (per UI-SPEC).
- **Probing:** never ad-hoc `node -e` with `loadApp` (intervals keep it alive); go through `npm test`.

## No Analog Found

| Region | Reason |
|---|---|
| Field-level clock (`equipAt`) inside `mergeExercises` | No existing per-field clock; follow RESEARCH.md Pattern 2 |

## Metadata
**Search scope:** index.html, test/app.test.js, test/harness.js
**Pattern extraction date:** 2026-10-12
