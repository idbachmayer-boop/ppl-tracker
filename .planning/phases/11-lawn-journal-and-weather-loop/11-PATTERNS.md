# Phase 11: Lawn, Journal and Weather Loop - Pattern Map

**Mapped:** 2026-11-12
**Files analyzed:** 4 files (index.html as 12 regions, test/harness.js, test/app.test.js, test/fixtures/merge-golden.json)
**Analogs found:** 15 / 16 regions (one has no analog: the fetch backoff)

Line numbers are for this worktree at commit a92e0d9. Code excerpts below are short; follow the cited ranges for the full text.

## File Classification

| New/Modified region | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `index.html` COLLECTIONS `rainLog` entry (after L547) | config/model | CRUD (list, union merge) | `sleep:` entry L547 | exact |
| `index.html` `SCHEMA` 19 → 20 (L498) + `MIGRATIONS[20]` (after L657) | migration | batch | `18:d=>ensureCollectionDefaults(d)` L656; `ensureCollectionDefaults` L664-667 | exact |
| `index.html` `fetchWeather` / `maybeFetchWeather` + `WXFAIL`, `WX_BACKOFF_MS` (L3494, L3507-3524) | service | request-response | itself (modify in place) | self |
| `index.html` `recordRain(daily)` (new, near fetchWeather) | service | transform → CRUD write | `fetchWeather` saveLocal comment L3515-3517; `touch()`/`liveOf` L843-872 | role-match |
| `index.html` `rainByDate()` (new reader) | utility | transform | `liveOf('sleep')` read in `viewSleep` (test pins it, test L1696) | role-match |
| `index.html` `retryWeather` + `window 'online'` listener | event handler | event-driven | `window.addEventListener('online', syncRetryNow);` L5211 | exact |
| `index.html` Today `onRender` (L1710) | route | event-driven | Care `onRender` L1716 | exact |
| `index.html` `waterVerdict(o)` + `lawnStatus` water branch (L3652, L3676-3687) | service | transform | `mowVerdict(o)` L3628-3644 | exact |
| `index.html` `nextWaterDay()` (new) | utility | transform | `nextDueDay(kind)` L3811 | exact |
| `index.html` `mowMark` / `mowOutlookHTML` (L3752-3774) → "Lawn outlook" | component | render | itself | self |
| `index.html` `lawnHistory` 🌧 text (L3897-3920) | component | render | itself; pills L3902-3909 | self |
| `index.html` `viewLawn` / `wxGlance` failure states + ti fallback (L3922-3930, L1778-1784) | component | render | `viewLawn` empty-state L3926 | self |
| `index.html` `renderWeekReview` tags (L2615-2670) | component | render | existing `tags` array, emitted L2662; `dayFlagRows` `=== true` strictness L4633 | self |
| `test/harness.js` fetch stub, `opts.fetch`, `__fetchCalls`, `makeWx({pastDays})`, `names` | test | — | stub L91-96; `makeWx` L188-210; `names` L117; `api.__…` L173-176 | self |
| `test/app.test.js` LAWN-01..07 blocks, retargets | test | — | sleep blocks L1353-1452, L1686-1705; `spyPushes` L2752; `asyncBlock` L32; `INTRODUCED_AT` L1875; `REQUIRED_EXPORTS` L198 | exact |
| `test/fixtures/merge-golden.json` | fixture | batch | regenerate per docs/adding-a-collection.md § Registry validity | n/a |

## Pattern Assignments

### COLLECTIONS `rainLog` entry (config, list)
**Analog:** `index.html` L547 (`sleep`), the current last entry.
```js
  sleep:      { kind:'list', key:'id', sortBy:'date', merge:'union', soft:true, required:false, label:'Sleep', columns:[...] },
```
- Add `rainLog` **after** it (last). `key:'date'`, `label:'Rainfall'` (unused), columns `date` and `inches` (`unit:'in'`). Literals only (placement rule, CLAUDE.md).
- Allowed spec keys are checked by `collectionProblems` (~L4670-4700).

### SCHEMA + MIGRATIONS[20] (migration)
**Analog:** `index.html` L656 and L664-667.
```js
  18:d=>ensureCollectionDefaults(d), // sleep log — creates absent collections only (COLLECTIONS registry, F1)
```
New: `20:d=>ensureCollectionDefaults(d), // rain history (LAWN-02) — creates the absent list only, rewrites no row`. Rewrites no row, so no touch/persist guard is needed. Bump `const SCHEMA = 19;` (L498) to 20.

### fetchWeather / maybeFetchWeather (service, request-response) — modify
**Current:** `index.html` L3507-3524. Keep these properties:
- Early return guard `if(!DB.lawn || DB.lawn.lat==null || weatherFetching) return;` (L3508)
- `if(!r.ok) throw 0;` (L3513)
- The derived-data comment and `saveLocal()` (L3514-3516). **Never `save()`.**
- A single reset `weatherFetching=false; render();` after try/catch (L3519). Pitfall 10: keep it in one place or use `finally`.
Changes: `past_days=3` → `14` in the URL (L3512); capture `{lat,lon}`; `recordRain` only if location unchanged; `saveLocal()` once, then `schedulePush()` only if rain changed; on catch, bump `WXFAIL` (RESEARCH Pattern 3). Gate in `maybeFetchWeather` (L3520): add `|| Date.now()<WXFAIL.retryAt`. Declare `const WXFAIL={n:0,retryAt:0}` beside `let weatherFetching=false;` (L3494), as a const object like `SYNC` (L5035), so the harness can export the reference.

### Quiet push (shared, see below) — `saveLocal(); schedulePush();`
**Sources:** `saveLocal` L922, `save` L931-937, `schedulePush` L5213.

### recordRain (service, transform → CRUD)
**Analog:** no single function; combine `touch()` (L843-872 region) row stamping with the raw-array lookup. Full skeleton in RESEARCH Pattern 5 (L396-417). Key rules: index **raw** `DB.rainLog` (tombstones included, Pitfall 6), finished days only (`iso < todayISO()`), skip `null`, unchanged amount writes nothing, return a boolean.

### rainByDate (utility)
**Analog:** reads through `liveOf('<name>')` exactly as `viewSleep` does (pinned by test L1696). No `liveRain` wrapper (test L1694 style forbids it).

### retryWeather + online listener (event-driven)
**Analog:** `index.html` L5211:
```js
window.addEventListener('online', syncRetryNow);
```
Named hoisted function; guard with "weather screen showing" (`TAB==='today' || (TAB==='care' && subState.care==='lawn')`) — Pitfall 5.

### Today onRender (route)
**Analog:** L1710 vs L1716:
```js
onRender:()=>{ if(DB.lawn && DB.lawn.lat!=null && lawnSeason(new Date())) maybeFetchWeather(); }   // L1710, drop lawnSeason
onRender:sub => { if(sub==='lawn') maybeFetchWeather(); }                                        // L1716
```

### waterVerdict + lawnStatus water branch (service, transform)
**Analog:** `mowVerdict(o)` L3628-3644 — takes one options object, returns `{ blocked, ... }`, precedence documented in a comment above, `lawnStatus` maps it to text (mow call L3689-3690).
```js
function mowVerdict(o){
  ...
  let blocked = null;
  if(o.dsMow < 5) blocked = 'soon';
  else if(o.recentWet || rain.status==='allwet') blocked = 'wet';
```
Replace the inline chain at L3681-3687 with `waterVerdict({...})` and a `blocked` → existing `water.text`/`water.hard`/`water.recommend` mapping. Keep the pinned string `Watered today — hold off` (test L417) via `dsFmt`. Cool-day guard: `num` (L3658) turns `null` into 0 — test `HI[ti]!=null && isFinite(+HI[ti])` (Pitfall 4). Skeleton: RESEARCH L574-593.

### nextWaterDay (utility)
**Analog:** `nextDueDay(kind)` L3811 (loops off 1..6 over `lawnStatus(off)`). New sibling starts at k=0, skips `unknown` and `override`. Skeleton RESEARCH L379-386.

### mowMark / mowOutlookHTML → Lawn outlook (component)
**Self:** L3752-3774. `wet` icon `💧` → `☔` (L3754); add a second small line per 42px cell for the water mark (cell markup L3761-3765); `kicker('Mowing outlook')` (L3768) → `'Lawn outlook'`. Colours only from `var(--…)` as the existing marks do. Exact copy/layout: 11-UI-SPEC.md.

### lawnHistory 🌧 (component)
**Self:** L3897-3920. Row markup L3906-3909: put the plain-text `🌧 0.42"` (no button, no data-action) beside the pills span. Build `rainByDate()` once before the `for` loop (L3899). Call site stays gated by `lawnSeason` (~L3967).

### viewLawn / wxGlance failure states (component)
**Self:** empty state L3926:
```js
if(!wx || !wx.data) return `...<div class="empty">${weatherFetching?'Loading weather…':'<button class="btn btn-sm" data-action="fetchWeather">Load weather</button>'}</div>`;
```
Add the `WXFAIL.n>0` "Couldn't load weather" + Retry (`data-action="fetchWeather"`, existing action L5577 — no new ACTIONS entry). Replace fallbacks `if(ti<0) ti=times.length>1?1:0;` at L3929 and L1781 with "no usable forecast" (Pattern 8 / Pitfall 3).

### renderWeekReview tags (component)
**Self:** L2615-2670; `tags` emitted at L2662 as `<span style="font-size:11px">…</span>` chips. Skip `future` days (same `future` flag used at L2641). Read `lawnLog` with `=== true` like `dayFlagRows` (L4633). Rain value via `esc(rn.toFixed(2))`. Hoist `rainByDate()` outside the 7-day `.map`. Snippet: RESEARCH L431-437.

### test/harness.js (test)
- Fetch stub L91-96: replace the never-settling promise with a counting, `setImmediate`-rejecting stub plus `opts.fetch` injection; rewrite the stale comment (RESEARCH L448-457).
- `makeWx` L188-210: both `for(let n=-3; n<=6; n++)` loops (L194, L203) take `pastDays` (default 3).
- `names` list L117: add `WXFAIL`, `recordRain`, `rainByDate`, `waterVerdict`, `nextWaterDay`, `retryWeather`.
- Accessors next to L173-176: `api.__fetchCalls = () => sandbox.__fetchCalls || 0;`.

### test/app.test.js (test)
- **Collection tests:** copy the sleep blocks. Boot/blank/no-row-rewrite: L1353-1365 (`sleepFixture17` → a schema-19 fixture). Stale-device replay: L1431-1452 (both orders, both `localWins`, then a replay). Declaration-alone: L1686-1705 (consumer indexOf check, no `liveRainLog` wrapper, `liveOf('rainLog')` read).
- **Retargets:** last-entry check L1699-1703 → `rainLog` (keep sleep once-declared); `INTRODUCED_AT` L1875 add `rainLog:20`; literal `19` at ~L8398, ~L8511, ~L10365 → `app.SCHEMA` / reword; `REQUIRED_EXPORTS` L198 add new names.
- **Push spy:** `spyPushes(a)` L2752 (replaces `a.__sandbox.schedulePush`) — use for "unchanged rain schedules no push".
- **Async loop test:** `asyncBlock(label, fn)` L32; real example `asyncBlock('EQUIP-03 tracer…')` L8639. Override hoisted fns via `a.__sandbox.lawnSeason = () => null` (same trick as `spyPushes`).
- Frozen clock: seed `mtime:1` and assert it changes (Pitfall 8).

### test/fixtures/merge-golden.json
`WRITE_MERGE_GOLDEN=1 node test/app.test.js`, then plain `npm test`. Commit the regenerated file.

## Shared Patterns

### Derived data persistence
**Source:** `index.html` L3514-3516 comment + `saveLocal` L922. **Apply to:** fetchWeather, recordRain. Use `saveLocal()`; add `schedulePush()` (L5213) only when synced rain rows changed. Never `save()` (bumps `updatedAt`, L932).

### Soft-delete reads/writes
**Source:** `liveOf` / `touch` / `isLive` L843-872. Readers use `liveOf('rainLog')`; the writer scans the raw array.

### Escaping and data-action
**Source:** `lawnHistory` pill L3902 (`data-action="toggleLawnLog" data-which="${esc(action)}"`). Every interpolation through `esc()`, double-quoted attributes, no inline handlers, no new action needed (reuse `fetchWeather` L5577).

### Theme
Colours from `var(--…)` only, as in `mowMark` L3752-3756.

### After any inline script change
`npm run csp:hash`, then `npm test`.

## No Analog Found

| Region | Role | Data Flow | Reason |
|---|---|---|---|
| `WXFAIL` / `WX_BACKOFF_MS` backoff gate | service state | event-driven | No retry-with-backoff exists in the app (sync retry is a fixed timer). Use RESEARCH Pattern 3 skeleton (L309-338). |

## Metadata
**Analog search scope:** `index.html`, `test/harness.js`, `test/app.test.js`
**Files scanned:** 3 (plus CONTEXT, RESEARCH, UI-SPEC)
**Pattern extraction date:** 2026-11-12
