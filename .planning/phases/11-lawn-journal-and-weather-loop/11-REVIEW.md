---
phase: 11-lawn-journal-and-weather-loop
reviewed: 2026-11-13T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - CLAUDE.md
  - index.html
  - test/app.test.js
  - test/fixtures/merge-golden.json
  - test/harness.js
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 11: Code Review Report

**Reviewed:** 2026-11-13
**Depth:** standard (diff `ddff1ab..HEAD`, plus the functions the diff calls)
**Files Reviewed:** 5
**Status:** issues_found

## Summary

I reviewed the Phase 11 diff against CLAUDE.md's binding rules and the locked decisions in
11-CONTEXT.md (D-01..D-16). Most of the phase holds up:

- **Rain rows.** `recordRain` stamps rows with `touch()` and its caller persists them with
  `saveLocal()` and sends them with `schedulePush()`. `save()` is never called. The location guard
  and the tombstone skip both work.
- **Quiet push.** It goes through `pushNow`'s `runTransaction` + `mergeDB`, and `merged.updatedAt`
  is `max(rU, lU)`. A stale device's rain write cannot win `lawnLog` or `mobilityLog`.
- **Migration and registry.** Migration 20 only creates the absent list, and `rainLog` is the last
  `COLLECTIONS` entry with an unused label.
- **Escaping and markup.** Every new interpolation is either a number or goes through `esc()`, and
  the new controls use `data-action`. The CSP hash is current: the suite reports 1425 passed,
  0 failed.

I found no blockers. I found three warnings: the droplet can be invented past the forecast, and two
gaps in the weather retry and re-render path. Each one was reproduced through `test/harness.js` with
scratch scripts (not committed), and the observed output is quoted in each finding.

I also tested the merge tie case the overlay asks about. Two `rainLog` copies with the same `mtime`
but different `inches` fall back to the `updatedAt` side, the same as every other union list. That
needs two devices to stamp the same millisecond with different readings, so it is not raised as a
finding. I did not build a three-replica associativity fixture for it.

## Warnings

### WR-01: The droplet and the "next" line invent a watering day past the cached forecast (violates D-07)

**File:** `index.html:3980-3986` (`nextWaterDay`), `index.html:3967-3975` (`nextDueDay`)

**Issue:** `lawnStatus(k)` sets `havewx = ti>=0`. For a day the cached forecast does not cover,
`havewx` is false, so every rain hold and the wet hold are skipped, and `highF` is null, so the
cool hold is skipped too. The verdict then falls through to "due" whenever the parity rule allows.

D-15 now keeps an older cache on screen while the fetch backs off. A cache fetched yesterday covers
only today through today+5, so day 6 has no data. If every covered day is held, both projections
return day 6, which has no forecast at all. This is likely in October, when every forecast day is
cool. The strip has no cell for that day, so no droplet appears there, but the outlook's water line
and the Today card's quiet "next …" line still name it. D-07 says "If no day qualifies within the
forecast, there is no 💧 (better silent than invented)". `nextDueDay`'s own comment makes the same
promise ("Null past the forecast horizon").

Reproduced with a cache built for yesterday where every day has a 70% chance of rain:

```
0..5 havewx true  rec false  70% chance of rain — hold off
6    havewx false rec true   Time to water — before noon or after 6pm
nextWaterDay 6
nextDueDay {"off":6,"label":"Thu"}
strip cells 0,1,2,3,4,5
waterLine: Expect to water <strong>Thursday</strong> (Aug 13) — before noon or after 6pm
```

**Fix:** Stop projecting at the first day without forecast data, in both functions, so they keep
agreeing (D-08):

```js
function nextWaterDay(){
  for(let k=0; k<=6; k++){
    const s = lawnStatus(k); if(!s.season) continue;
    if(!s.havewx) return null;              // past the cached forecast: silent, never invented (D-07)
    if(s.water.recommend && !s.water.unknown && !s.water.override) return k;
  }
  return null;
}
// nextDueDay: same guard after the season check — `if(!s.havewx) return null;`
```

Today's own card (`lawnStatus(0)`) keeps its "an absent forecast must not stop the watering"
behaviour, because only the projections change. Check for any existing test that calls
`nextDueDay('water')` with `DB.wx = null`. With this change it returns null, which is what its
comment already promises.

### WR-02: A weather fetch that lands re-renders whatever tab is open, including Train → Log mid-set (widened by D-12)

**File:** `index.html:3536` and `index.html:3560` (`fetchWeather`'s two `render()` calls)

**Issue:** RESEARCH Pitfall 5 named this hazard, but only the `online` path got a guard
(`retryWeather` → `weatherScreenShowing()`). `fetchWeather` itself still calls `render()`
unconditionally when it starts and when it settles. Before Phase 11, Today fetched only in season.
D-12 makes Today fetch whenever a location is set, all year, and Today is the landing tab.

The path is ordinary: Ian opens the app, the fetch starts, and he taps Train → Log. The request now
asks for 21 days of hourly data instead of 10, so its window is longer. When it settles, `render()`
rebuilds the workout screen. That drops focus and closes the keyboard mid-set, which is the exact
symptom Pitfall 5 warns about. `adoptMerged` guards this case with its `typing` check, but
`fetchWeather` has no guard.

Reproduced with `render` instrumented through `opts.transform`, then `go('today')` followed at once
by `go('train'); setSub('log')`:

```
RENDER on train/log weatherFetching= true
RENDER on train/log weatherFetching= false     <- the fetch settling rebuilt the Log tab
tab while fetch landed: train fetches: 1 wx cached: true
```

**Fix:** Render only when a screen that shows weather is open. No other tab reads `DB.wx`, and the
next visit renders the fresh cache anyway:

```js
weatherFetching=true; if(weatherScreenShowing()) render();
...
weatherFetching=false; if(weatherScreenShowing()) render();
```

Add a harness check: start a fetch on Today, switch to Train → Log, settle the fetch, and assert
that `#app` was not rebuilt.

### WR-03: Coming back online away from a weather screen leaves the backoff armed for up to 60 minutes

**File:** `index.html:3616-3625` (`weatherScreenShowing` comment and `retryWeather`)

**Issue:** D-14 says the device coming back online "retries right away". The code skips the retry
when Lawn or Today is not showing, and the comment says "Anywhere else, the next visit retries
through the gate in maybeFetchWeather". It does not. `WXFAIL.retryAt` is left in the future, so the
gate in `maybeFetchWeather` still refuses on the next visit. After three failures the wait is
60 minutes. During that time Lawn keeps showing "Offline — weather from …", or "Couldn't load
weather", while the phone is online.

Reproduced: three failures on Care → Lawn, then switch to Train → Log, go online, fire the `online`
listeners, and visit Lawn and then Today:

```
after 3 failures: n 3 wait min 60 calls 3
online, next Lawn visit: extra fetches 0 n 3 wait min left 60
online, Today visit: extra fetches 0
```

**Fix:** Clear the wait when reconnecting off-screen, so the next visit really does retry. This
keeps Pitfall 5's no-render-on-Log guarantee:

```js
function retryWeather(){
  if(WXFAIL.n === 0) return;
  if(weatherScreenShowing()) fetchWeather();
  else WXFAIL.retryAt = 0;   // the next visit to Today or Lawn retries through maybeFetchWeather
}
```

`WXFAIL.n` stays as it is, so the offline note still shows until a fetch succeeds. The existing
"online on Train → Log makes no fetch" check still holds.

## Info

### IN-01: "Tombstones stay tombstones" holds only on the device that has the tombstone

**File:** `index.html:3572-3574`, `index.html:3590-3592` (`recordRain`)

**Issue:** `recordRain` skips a date this device holds as a tombstone. Another device that never
received that tombstone (or a stale one whose amount changes) still creates or `touch()`es a live
row with a newer `mtime`. `mergeUnion` then lets that live row beat the tombstone. Reproduced:
device A has a tombstone for yesterday from 5 s earlier, device B fetches, and the merge result is
`{"date":"2026-08-06","inches":0.42,"mtime":…}`, which is live.

Rain has no delete path (D-04), so a tombstone can only come from a hand-edited backup import. That
limits the impact, and it is why this is Info.

**Fix:** Reword the comment to say the guarantee is device-local. If a rain delete or correction
feature ever ships (Deferred Ideas), give deletion precedence in the merge for this collection, the
way `exMerge` tombstones do for the registry.

### IN-02: Week in Review and Lawn history disagree on a non-boolean lawn flag

**File:** `index.html:2654-2655` vs `index.html:4084` (and `daysSinceLawn`, `index.html:3689`)

**Issue:** Week in Review shows Mowed or Watered only for `=== true` (plan 11-04's test). The Lawn
history pills and `daysSinceLawn` read the same `lawnLog` fields as truthy. A hand-edited backup
that stores `"false"` or `1` therefore reads as logged on Lawn and in the scheduler, but as not
logged in Week in Review. The truthy readers were there before this phase, but Phase 11 added the
second rule.

**Fix:** Use one predicate (for example `lawnFlag(e, key) => e && e[key] === true`) in all three
readers, or document the divergence next to the Week in Review check.

### IN-03: `rainByDate` accepts non-number amounts that `recordRain` would refuse

**File:** `index.html:3610`

**Issue:** `+r.inches` coerces the stored value. `true` becomes 1 and renders as `🌧 1.00"`, and
`"0.42"` and `[0.42]` are accepted as numbers. The output stays numeric, so this is not an escaping
hole, but the reader is looser than the writer (`typeof v==='number'`), and validateBackup does not
type-check rows.

**Fix:** `const v = r.inches; if(typeof v !== 'number' || !isFinite(v) || v < 0 || v > RAIN_SANE_MAX_IN) continue;`

---

_Reviewed: 2026-11-13_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
