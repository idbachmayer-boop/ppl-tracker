---
phase: 11-lawn-journal-and-weather-loop
plan: 01
subsystem: weather / lawn / test-harness
status: complete
tags: [weather, backoff, offline, harness, LAWN-06, LAWN-07]
requires: []
provides:
  - "WXFAIL / WX_BACKOFF_MS backoff gate in maybeFetchWeather (5, 15, 60, 60 min)"
  - "retryWeather + weatherScreenShowing on window 'online'"
  - "wxTodayIndex() usable-cache rule (viewLawn, wxGlance)"
  - "harness fetch that settles on a macrotask and counts; opts.fetch injection; __fetchCalls/__fetchUrls/__winListeners; fetchCallCounts()"
  - "LAWN section in test/app.test.js with lwTicks/lwRes/lwLawn, and the LAWN-07 fetch-ledger backstop at the tail"
affects: [11-02, 11-03, 11-04, 11-05]
tech-stack:
  added: []
  patterns:
    - "memory-only backoff object (const, exported by reference like SYNC)"
    - "macrotask-settling harness fetch with per-instance ledger"
key-files:
  created: []
  modified: [index.html, test/harness.js, test/app.test.js]
decisions:
  - "Offline weather backs off 5 → 15 → 60 min in memory only; manual refresh, Retry weather and the online event (weather screens only) skip the wait"
  - "A weather cache is usable only when daily.time holds today; the index-1 fallbacks are gone from viewLawn and wxGlance"
  - "Today fetches weather all year whenever a location is set (D-12)"
metrics:
  duration: "~12 min"
  completed: 2026-11-13
  tasks: 3
  files: 3
estimate:
  tokens: 100000
actuals:
  tokens: 9000
  tasks: 3
  commits: 4
---

# Phase 11 Plan 01: Weather loop backoff and a harness fetch that settles Summary

When the phone is offline, the weather fetch now waits 5, then 15, then 60 minutes between tries instead of
looping once per render. Lawn keeps the last forecast with an `Offline — weather from …` note, or shows
`Couldn’t load weather` with a Retry weather button when there is none. A cache without today is never
labelled as today. The test harness `fetch` now settles and counts, so a fetch-render loop anywhere in the
suite fails it.

## Suite lines

- Pre-plan: `1250 passed, 0 failed, 2 skipped` (CSP `sha256-rEEv9FykoHBjAb6rlYI/lb5nNl6tKlDgFr/EKI2vJ1s=`)
- Post-plan: `1291 passed, 0 failed, 2 skipped`, with `npm run csp:check` reporting
  `CSP hash OK sha256-nHwJQxG44xvcO8yxlKciaSI/QwRG/S4O9KnZtfYaehw=`

## Commits

| Task | Commit | What |
|------|--------|------|
| 1 (tracer) | 04d4ac7 | Harness fetch settles and counts; WXFAIL backoff; gate in maybeFetchWeather; LAWN section and tracer |
| 2 | 6e242a3 | Today fetches all year; body-shape check; retryWeather and the online listener; LAWN-07 tail backstop |
| 3 | dc95fd4 | wxTodayIndex; viewLawn S5 note and S6 states; refresh button label; wxGlance usable-cache rule; prohibitions check |

## What was built

- **test/harness.js:** the fetch stub increments a per-instance counter, records `String(url)`, and settles
  from `setImmediate`. It resolves with `opts.fetch(url, init)` when given, and otherwise rejects with
  `TypeError('offline (harness)')`. Sandbox `addEventListener` records listeners into `winListeners[type]`.
  New: `api.__fetchCalls()`, `api.__fetchUrls()`, `api.__winListeners`, a `weatherFetching` getter,
  module-level `FETCH_LEDGER`, and the exported `fetchCallCounts()`. `names` gains `WXFAIL`, `WX_BACKOFF_MS`,
  `fetchWeather`, `maybeFetchWeather`, `retryWeather`, `weatherScreenShowing`, `wxTodayIndex` and `wxGlance`.
- **index.html:**
  - `const WXFAIL = { n:0, retryAt:0 };` and `const WX_BACKOFF_MS = [5*60000, 15*60000, 60*60000];`.
  - fetchWeather: a failure runs `WXFAIL.n++` and sets `retryAt`, and a success resets both. A body without
    `daily.time` throws before `DB.wx` is assigned. The single `weatherFetching=false; render();` reset is
    kept after the try/catch.
  - maybeFetchWeather returns early while `Date.now() < WXFAIL.retryAt`.
  - `weatherScreenShowing()`, `retryWeather()` and `window.addEventListener('online', retryWeather);`.
  - Today's onRender no longer checks the season.
  - `wxTodayIndex()`, used by viewLawn's no-forecast branch (Loading / Load weather / Couldn’t load weather +
    Retry weather) and by wxGlance.
  - The S5 note (`Retrying…` or `Offline — weather from [Ddd ]h:mm AM`), passed through `esc()`.
  - The refresh button gets `title` and `aria-label` `Refresh weather`.
- **test/app.test.js:** the section `── LAWN: lawn, journal and weather loop (LAWN-01..07) ──` right before
  the REG-01 end block. REQUIRED_EXPORTS gains `WXFAIL` and `WX_BACKOFF_MS`, and the tail now awaits
  `lwTicks(50)`, then runs the LAWN-07 ledger check (max ≤ 25 per instance).

## Helper names and signatures (final)

- `lwTicks(n)` → Promise resolving after n `setImmediate` turns.
- `lwRes(data, extra)` → an `opts.fetch` returning `Object.assign({ ok:true, status:200, json: async () => data }, extra)`.
- `lwLawn(a)` → sets `a.DB.lawn = { lat:44.94, lon:-93.36, label:'St. Louis Park' }`, returns `a`.
- Added beyond `<interfaces>` (all checked against the file first, no collision): `lwOnline(a)` (the
  recorded `online` listeners that are `retryWeather`), `lwTodayCard(html)` (Today's goSub weather card with
  a temperature), `lwFetchTags(html)` (start tags of fetchWeather buttons), and the constants
  `LW_COULDNT`, `LW_S6_BODY`, `LW_OFFLINE` and `LW_RETRYING`.
- Harness: `fetchCallCounts()` → number[], one per loadApp instance. App: `wxTodayIndex()` → int ≥ 0 or -1;
  `retryWeather()` → undefined; `weatherScreenShowing()` → boolean.

## RED lines quoted

Task 2 (before the index.html change):
- `FAIL  D-12: off-season, Today with a location and no cache fetches the forecast exactly once  → 0`
- `FAIL  LAWN-06: a body with no daily.time counts as a failure, backs off, and leaves the cached forecast as it was  → {"calls":1,"n":0,"cacheKept":false}`
- The online and concurrency checks were also red, but only because `retryWeather` did not exist yet. The
  mutations below prove them.

Task 3 (before the index.html change):
- `FAIL  Pattern 8: a cache without today shows no temperature and no Mowing outlook on Lawn (a usable cache shows both)  → {"stale":true,"outlook":false}`
- `FAIL  Pattern 8: wxGlance() returns null for a cache without today (and a glance for a usable one)  → {"temp":75,"icon":"☀️","text":"Clear","hi":75,"lo":55,"rainProb":0,"loc":"St. Louis Park"}`
- `FAIL  Pattern 8: Today shows no weather card from a cache without today (a usable cache shows it)  → {"stale":true,"usable":true}`
- `FAIL  D-15: no cache after a failure shows Couldn’t load weather, its body copy and one Retry weather button  → {"controls":1}`
- `FAIL  D-15: a usable cache after a failure shows "Offline — weather from {time}" in a muted 11px note, with the forecast and outlook still there  → {"time":"12:00 PM"}`
- `FAIL  D-15: a cache fetched on an earlier day puts the short weekday first ("Offline — weather from Thu 12:00 PM")  → {}`
- `FAIL  D-15: while a retry is in flight the note reads Retrying… and the offline text is gone  → {"fetching":true}`
- `FAIL  D-15: the refresh button carries title and aria-label "Refresh weather"  → ["<button class=\"btn btn-sm btn-ghost\" data-action=\"fetchWeather\">"]`

## Mutation table

Each mutation was applied to index.html by an exact-once anchor script, from a scratchpad copy taken just
before. Each was restored by `cp` from that copy, never with git, and `npm run csp:check` confirmed the hash
matched again afterwards. (The two extra FAILs in each mutated run are the CSP hash checks going stale,
which is expected.)

| # | Task | Mutation | Check that went red | Mishandled input | Restore |
|---|------|----------|---------------------|------------------|---------|
| M1 | 1 | Drop `Date.now() < WXFAIL.retryAt` from maybeFetchWeather | `FAIL  LAWN-06/07 tracer: offline Care → Lawn: async block did not finish  → "Error: timed out after 10s…"`, then, once the block's tail ran, `FAIL  LAWN-06/07 tracer: offline, Care → Lawn fetches once and then waits  → {"calls":41,"n":40,"waitMs":3600000}` | Null cache on Care → Lawn with an always-rejecting fetch, which fetches on every render | restored from scratchpad copy |
| M2 | 2 | Same gate removal | `FAIL  LAWN-06: offline on Today with a stale cache, one fetch over 40 turns  → 41` and `FAIL  LAWN-07: no app instance in the whole run made more than 25 weather fetches (a fetch-render loop fails here)  → {"max":71,"instances":428}` | Every instance left on Today or Care → Lawn with a stale cache under the always-rejecting stub | restored from scratchpad copy |
| M3 | 2 | retryWeather skips `weatherScreenShowing()` | `FAIL  D-14: online on Train → Log after a failure makes no fetch (the workout is never rebuilt)  → {"n":2,"before":1,"after":2}` | A failed fetch, then an online event while Train → Log is showing | restored from scratchpad copy |
| M4 | 2 | fetchWeather skips the body-shape check | `FAIL  LAWN-06: a body with no daily.time counts as a failure, backs off, and leaves the cached forecast as it was  → {"calls":1,"n":0,"cacheKept":false}` | An OK response whose body is `{}` | restored from scratchpad copy |
| M5 | 3 | Put an index-1 fallback back into viewLawn (`ti0<0 && wx.data ? 1 : ti0`) | `FAIL  Pattern 8: a cache without today shows no temperature and no Mowing outlook on Lawn (a usable cache shows both)  → {"stale":true,"outlook":false}` | A cache whose daily.time starts 17 days ago and lacks today | restored from scratchpad copy |
| M6 | 3 (extra) | Put an index-1 fallback back into wxGlance | `FAIL  Pattern 8: wxGlance() returns null …  → {"temp":75,…}` and `FAIL  Pattern 8: Today shows no weather card …  → {"stale":true,"usable":true}` | Same 17-days-ago cache | restored from scratchpad copy |
| M7 | 3 (extra) | fetchWeather calls `save()` instead of `saveLocal()` | `FAIL  LAWN-06: fetchWeather keeps saveLocal() and never save(), and no weather function sets a timer or writes the backoff into DB  → ["fetchWeather"]` | Any successful fetch, which would bump updatedAt | restored from scratchpad copy |

**M1 note.** With the gate removed, every leftover suite instance on a weather screen loops as well, which
slows the event loop until the tracer block hits the suite's 10 s timeout. The tracer therefore fails by
name through the timeout first, and its count assertion prints afterwards (`calls 41`). An isolated probe
applied the same mutation through the harness's `opts.transform` to one instance, with no file edit. Over 40
turns it printed `intact: fetches over 40 turns = 1` and `mutated: fetches over 40 turns = 41`, which matches
RESEARCH Pattern 3's measurement.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Task 3 RED crashed the suite instead of failing by name**
- **Found during:** Task 3, step 1.
- **Issue:** The top-level Pattern 8 check called `a.wxGlance()` before the harness exported it. The
  TypeError killed the process at module level and hid every later check.
- **Fix:** Added `'wxTodayIndex','wxGlance'` to the harness `names` before running RED (planned for step 2
  anyway), and guarded the call with `typeof a.wxGlance === 'function'`.
- **Files modified:** test/harness.js, test/app.test.js. **Commit:** dc95fd4.

**2. [Rule 2 - Missing critical check] The plan's prohibitions had no check**
- **Found during:** Task 3.
- **Issue:** "fetchWeather never calls save()", "no timer retries the weather" and "WXFAIL lives in memory
  only" were stated as prohibitions, but no check guarded them. Planner probe 2 asked for a comment-stripped
  check in the suite.
- **Fix:** One asyncBlock. It strips comments with the existing `f2StripJs`, asserts that no weather
  function contains `save(`, `setTimeout(`, `setInterval(` or a DB write of the backoff, and that
  fetchWeather keeps `saveLocal()`. After a failure it also asserts that neither DB nor the stored blob
  contains `retryAt`/`WXFAIL`. Mutation M7 proves it.
- **Commit:** dc95fd4.

### Judgment calls

- **Tracer feedback gate.** `auto_advance` is false, so the executor's default for a tracer is an interactive
  checkpoint. The plan declares `autonomous: true` and "designed_stops: None", every `<verify>` is automated,
  `human_verify_mode` is `end-of-phase`, and the phone check belongs to 11-05 Task 3. The tracer's automated
  verify was re-run green (`npm run csp:check` OK and `1256 passed, 0 failed`), and execution went on
  without a checkpoint. This is the same conflict as skill observation #113 (the fix is staged, not yet installed).
- **Extra helpers** (`lwOnline`, `lwTodayCard`, `lwFetchTags`, `LW_*`): every name was grepped for
  collisions before it was declared.

## Known Stubs

None. Every rendered state reads from DB.wx, WXFAIL or weatherFetching.

## Threat Flags

None. No new fetch host, endpoint, data-action or ACTIONS entry. The `online` listener is the one the
threat model (T-11-03) covers.

## Self-Check: PASSED

- index.html, test/harness.js and test/app.test.js are modified and committed (04d4ac7, 6e242a3, dc95fd4).
- `npm run csp:check` reports OK, and `TZ=America/Chicago npm test` ends `1291 passed, 0 failed, 2 skipped`.
- Every acceptance grep in Tasks 1-3 printed the expected count.
