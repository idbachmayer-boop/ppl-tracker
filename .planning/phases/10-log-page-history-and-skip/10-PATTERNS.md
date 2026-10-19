# Phase 10: Log Page — History and Skip - Pattern Map

**Mapped:** 2026-10-13
**Files analyzed:** 3 (index.html — many regions; test/app.test.js; test/harness.js optional)
**Analogs found:** 14 / 14 regions (all in-file analogs)

Cite by symbol; find with `grep -n "<symbol>" index.html`. Line numbers below are as of commit 489f4e1 and drift.

## File Classification

| New/Modified region | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `skipExercise(i)` / `unskipExercise(i)` (new, index.html) | draft mutator | draft-local write (`saveLocal`) | `skipSet` / `unskipSet` (~2295) | exact |
| `exUnfinished(e)` (new) | utility | transform | `finishWorkout` blank-count filter `!s.skipped && s.r===''` (~2389) | exact |
| `exerciseRecent(key,n,skipId)` (new) | pure query | read/transform | `exerciseHistory` (~2712) + `lastAttemptEntry` (~1287) | exact |
| `skipSummaryHTML(e)` (new) | render helper | transform | stair skip-note in `viewActive` (~2189) + `setsOf` in `viewHistory` (~2564) | role-match |
| `toggleExHist(i)` + `let openExHist` (new) | screen state | ephemeral UI | `toggleExCollapse` + `let collapsedEx` (~2433-2438) | exact |
| `openExerciseChart(i)`, `backToWorkout()`, `landingY()`, `let logReturn` (new) | navigation | request-response (router) | `ACTIONS.openChart` + `selectExercise` + `go`/`goSub`/`setSub` (~1721, ~2631, ~5347) | role-match |
| `viewActive()` edits | component (template) | render | collapsed branch (~2089-2096), caret button (~2157), `.lasttime` line (~2105-2122) | exact |
| `finishWorkout()` edit | draft->synced copy | transform | its own `entries` map (~2388-2393) | exact |
| `startWorkout`/`startBackdate`/`discardWorkout`/`editSession` resets | state reset | — | existing `collapsedEx.clear()` lines | exact |
| `editSession()` carry `skipped`/`reason` | draft builder | transform | its own `entries` map (~2616-2621) | exact |
| `viewHistory()` D-15 line | component | render | `setsOf` (~2564) | exact |
| `viewStrength()` back control | component | render | `viewStrength` header / `selectedExercise` (~2725) | role-match |
| `ACTIONS` entries (5) | dispatch wrapper | event-driven | `openChart`, `toggleExCollapse` entries in `ACTIONS` (~5269+) | exact |
| `test/app.test.js` LOG section + DRAFT-05 rows | test | — | `DRAFT_ONLY_MUTATORS` table (~3737-3800), PROG helpers `latSess`/`latCard` (~7731-7751) | exact |
| `test/harness.js` getters (optional) | test infra | — | existing `get TAB()` getter in `loadApp` | exact |

## Pattern Assignments

### `skipExercise` / `unskipExercise` (draft mutator)
**Analog:** `skipSet` / `unskipSet`
```js
function skipSet(i,k){
  const reason = prompt(`Why skipping set ${k+1}? (optional)`, '');
  if(reason===null) return;
  const st = DB.draft.entries[i].sets[k]; st.skipped=true; st.reason=reason.trim(); st.w=''; st.r='';
  saveLocal(); render();
}
function unskipSet(i,k){ const ss=DB.draft.entries[i].sets, st=ss[k]; st.skipped=false; st.reason=''; if(st.w==='') st.w=nearWeight(ss, k); saveLocal(); render(); }
```
Rules: `prompt` null = abort (D-10); `saveLocal()` never `save()` (DRAFT-05 scan fails otherwise); snapshot into `e._preSkip` (deep copy via `JSON.parse(JSON.stringify(...))`); no-snapshot fallback uses `nearWeight`. Full proposed bodies: 10-RESEARCH.md Pattern 1. Readers test `e.skipped === true`, never truthiness.

### `exerciseRecent` (pure query)
**Analog:** `exerciseHistory` loop + `lastAttemptEntry` counting rule
```js
function exerciseHistory(key){
  const out=[];
  const ls=liveSessions();
  for(let i=ls.length-1;i>=0;i--){ const s=ls[i]; if(s.skipped) continue;
    sessionExercises(s).forEach(e=>{
      if(exKey(e)!==key) return;
```
```js
    if((Array.isArray(e.sets) && e.sets.length) || +e.blankSets > 0) return {entry:e, date:s.date};
```
Do NOT modify `exerciseHistory`/`lastAttemptEntry`/`lastRealEntry` (pinned). Skip `s.id===DB.draft.editRef` (D-05); do not skip deloads (D-03). PR marker via `prSetIndex().isPR(s, e, k)` as in `viewHistory`; compute `prSetIndex()` once per render only when a panel is open. `esc(s.workout)` (contains `&`).

### `toggleExHist` + `openExHist` (screen state)
**Analog:**
```js
let collapsedEx = new Set(); // slot indices collapsed to a summary in the active workout (ephemeral UI)
function toggleExCollapse(i){ if(collapsedEx.has(i)) collapsedEx.delete(i); else collapsedEx.add(i); render(); }
```
Declare `let openExHist = -1, logReturn = null;` beside `collapsedEx`. No save/saveLocal. Reset alongside every `collapsedEx.clear()` (startWorkout, startBackdate, finishWorkout, discardWorkout, editSession).

### `openExerciseChart` / `backToWorkout` / `landingY` (navigation)
**Analogs:**
```js
function go(id){ if(!tabDef(id)) return; TAB=id; syncTabBar(); render(); window.scrollTo(0,0); }
function goSub(id, sub){ const t=tabDef(id); if(!t) return; if(t.sub && sub) subState[id]=sub; go(id); }
function setSub(sub){ const t=tabDef(TAB); if(t && t.sub) subState[TAB]=sub; render(); window.scrollTo(0,0); }
function selectExercise(m){ selectedExercise=m; render(); }
  openChart:        { click: el => { progSub = el.dataset.prog; goSub('train', 'progress'); } },
```
Set `selectedExercise = exKey(e); progSub='strength';` then `goSub('train','progress')`. Read `window.scrollY || 0` (harness has no bare `scrollY`). Replace `scrollTo(0,0)` in `go`/`setSub` with `scrollTo(0, landingY())`. Logic reading `DB` lives in the function, not the ACTIONS wrapper. `landingY`/`openExerciseChart` read `DB.draft` so must never call `save()`.

### `viewActive()` edits (template)
**Skipped-card branch** — copy collapsed-branch opener exactly (tests split on `'<div class="ex-card">'`):
```js
if(collapsedEx.has(i)){ const done = entry.sets.filter(x=>!x.skipped && x.r!=='');
  return `<div class="ex-card"><div class="ex-accent ${barClass(g)}"></div> ...
```
**Skip note markup** — copy stair skip:
```html
<div class="skip-note" style="margin:0"><span>${ph('skip-forward','lead')}Stair stepper skipped${st.reason?': <em>'+esc(st.reason)+'</em>':''}</span><button data-action="unskipStairs">Undo</button></div>
```
**Header skip button** — copy caret:
```html
<button class="skip-set" data-action="toggleExCollapse" data-i="${esc(i)}" title="collapse" style="font-size:16px;vertical-align:middle">${ph('caret-up')}</button>
```
**Last-time toggle:** `<button class="lasttime tap" data-action="toggleExHist" data-i="${esc(i)}" aria-expanded="...">` containing only spans (no `<div` inside a `.tap` button — D-11 test). Keep `lastLine` text byte-identical (pins `/Last time \([^)]*\):/`); never use class `flag`; D-17 note is a separate `<span class="muted">`. Plain `<div class="lasttime">` for "No previous data". Panel and `noteHint` sit outside the button; panel must not contain `class="ex-card"`. Main slot cards only, not `extraCard`.

### `finishWorkout()` edit
**Analog (self):**
```js
  const entries = d.entries.map(e=>{
    const blank = e.sets.filter(s=> !s.skipped && s.r==='').length;
    const out = Object.assign({}, e, { sets: e.sets.filter(s=> s.skipped || s.r!=='').map(s=>{ const c=Object.assign({}, s); delete c._cel; return c; }) });
    if(blank>0) out.blankSets = blank; else delete out.blankSets;
    return out;
  });
```
Add `delete out._preSkip;` and `if(out.skipped!==true){ delete out.skipped; delete out.reason; }`. Mirrors the `delete c._cel` idiom. Mind Pitfall 10 (deload + fully skipped entry).

### `editSession()` edit
**Analog (self):**
```js
      return { name:e.name, note:e.note||'', deload:!!e.deload,
               sets:kept.concat(Array.from({length:k}, ()=>({w:bw,r:'',skipped:false,reason:''}))) }; }),
```
Add `...(e.skipped===true ? {skipped:true, reason:String(e.reason||'')} : {})` (or Object.assign). No `_preSkip` here; `unskipExercise` fallback handles it.

### `viewHistory()` D-15
**Analog:**
```js
const setsOf = e => e.sets.map((x,k)=> x.skipped ? '<em>skip</em>' : esc(fmtSet(x.w,x.r)) + (prIdx.isPR(s, e, k) ? ' 🏆' : '')).join(', ');
```
Branch on `e.skipped===true` to use shared `skipSummaryHTML(e)` so Log card, inline rows and History cannot drift.

### `ACTIONS` entries
Thin wrappers, unary plus, no `DB`, no persist, literal names:
```js
  skipExercise:   { click: el => skipExercise(+el.dataset.i) },
  unskipExercise: { click: el => unskipExercise(+el.dataset.i) },
  toggleExHist:   { click: el => toggleExHist(+el.dataset.i) },
  openExChart:    { click: el => openExerciseChart(+el.dataset.i) },
  backToWorkout:  { click: () => backToWorkout() },
```

### `test/app.test.js`
**DRAFT-05 table analog** (`DRAFT_ONLY_MUTATORS`, row shape `[name, setup, args, changed]`):
```js
  ['unskipStairs',     db => { db.draft.stairs.skipped = true; },
                             () => [],                db => db.draft.stairs.skipped === false],
...
  ok('DRAFT-05: ...', failing.length === 0 && DRAFT_ONLY_MUTATORS.length === 25, failing);
```
Add `skipExercise` / `unskipExercise` rows (set `a.__sandbox.prompt = () => 'x'` in setup for skip) and bump the pin 25 -> 27.
**Card-locator analog** (PROG block): `latSess(date, sets, o)`, `latRun(list)`, `latCard(i)` = `P.viewActive().split('<div class="ex-card">')[i + 1]`. Reuse for LOG-0x tests. Other helpers: `f2Mid`, `f2At`, `fireListener`, `spyPushes`, `populatedDB`, `fullDraft`, `canon`. Also required: stale-device merge replay is not needed (no schema change; SCHEMA stays 19), but a test that a finished session holds no `_preSkip`.

## Shared Patterns
- **Persistence:** draft edits -> `saveLocal(); render();`. Screen state -> `render()` only.
- **Escaping:** every interpolated value and every `data-*` value through `esc()`; double-quoted attributes only.
- **Dispatch:** `data-action="literal"` + `data-i="${esc(i)}"`; clickable controls must be `<button>`.
- **Icons:** `ph('skip-forward')`, `ph('caret-up')`; no new emoji except existing PR 🏆 / ↓ markers.
- **CSP:** after any script change run `npm run csp:hash`, then `npm test`.

## No Analog Found
None. Scroll restoration after `render()` (`landingY`) has no prior precedent for non-zero scroll; behaviour on phone is an ASSUMED item for UAT.

## Metadata
**Search scope:** index.html, test/app.test.js, test/harness.js
**Pattern extraction date:** 2026-10-13
