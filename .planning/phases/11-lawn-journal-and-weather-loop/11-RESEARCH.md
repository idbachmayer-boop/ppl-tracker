# Phase 11: Lawn, Journal and Weather Loop - Research

**Researched:** 2026-11-11
**Domain:** In-repo vanilla JS (single-file PWA `index.html`): a new synced list collection, the Open-Meteo weather fetch, the lawn scheduler, two display surfaces (Lawn history, Week in Review), and the Node `vm` test harness
**Confidence:** HIGH. Every claim about existing code was read this session. The two riskiest design claims (the quiet push cannot change a `lawnLog` winner; a backoff gate stops the fetch loop) were run in scratch copies of the repo, not just reasoned. The one claim I could not test (the Android `online` event) is tagged `[ASSUMED]` and is covered by Ian's phone check.

**Provenance note:** `[VERIFIED: path:lines]` means I read that file this session and quote the value beside the claim. `[VERIFIED: prototype]` means I ran it in a scratch copy under the session scratchpad (the worktree is untouched). `[VERIFIED: live API]` means a real call to `api.open-meteo.com` with a neutral London coordinate (never Ian's location). `[CITED: url]` is official documentation. `[ASSUMED]` needs confirmation.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

### Rain saving and sync (LAWN-02)

- **D-01: Rain rows sync with a "quiet push".**
  - When a fetch produces a new or changed rain row, it is written to `DB` and saved with `saveLocal()`. It is not saved with `save()`.
  - The row then goes to the cloud through the normal `runTransaction` + `mergeDB()` path, but that push must not bump `updatedAt`. A stale device must never look newest just because it was opened and wrote rain. That is the hole the weather cache once opened (CLAUDE.md "Derived data uses `saveLocal()`").
  - The row's own `mtime` is stamped through `touch()`, so the per-row merge picks the newest reading.
  - The researcher must confirm three things:
    - how `localNewer` and `updatedAt` decide `mergeDateMap` today;
    - that a quiet push cannot change which side wins `lawnLog` or `mobilityLog`;
    - that the push is never `set()`.
  - **Reversibility:** costly. Once rows are in the cloud, changing how they push means replaying merge tests against real data.
- **D-02: The fetch asks for about 14 past days, not 3.** It still calls `api.open-meteo.com` (`past_days=14`), so the CSP needs no change. Every completed day still in that window that has no row, or whose amount changed, is written on the next fetch from either device. Gaps happen only if neither device fetches for more than 2 weeks. The researcher should check that index-based readers of `DB.wx.data.daily` and `hourly` still find "today" (they use `indexOf(todayISO())`, but `viewLawn` has a fallback `ti` and `mowForecast` uses offsets).
- **D-03: The latest reading wins.**
  - If a later fetch reports a different amount for a saved day, the row is updated and `touch()`ed, and the newest `mtime` wins between devices.
  - If the amount is unchanged, nothing is written and nothing is pushed. This is what keeps an hourly fetch from causing hourly writes.
  - "Once a day is over" means only days before today (the device's local date) are saved. Today's partial total is never saved.
- **D-04: Rain is read-only.** There is no edit, remove or manual-entry UI. Rows come only from Open-Meteo. The collection is still `soft:true`, so the required stale-device delete replay test applies, and every reader goes through the collection's `liveX()` filter.
- **D-05: One saved row per day.** The planner chooses the collection shape (a list keyed by date, or a map). Each row holds at least the date and the exact amount in inches. If it is a map, the explicit-`false` replay test applies too. Rain stays out of `lawnLog` (ROADMAP note: `mergeDateMap` takes the whole inner object).

### Watering outlook and rules (LAWN-01, LAWN-04)

- **D-06: The Mowing outlook becomes a Lawn outlook.**
  - The existing 7-day strip (`mowOutlookHTML` / `mowMark`) becomes a "Lawn outlook".
  - Each day can show 🚜 (mow) and/or 💧 (water).
  - "Wet, don't mow" moves from 💧 to ☔, so 💧 means only "water this day".
  - The mow behaviour, the next-mow highlight and the explanatory copy stay as they are, with wording adjusted for the merged strip.
- **D-07: Only the next watering day gets 💧.** Exactly one 💧 appears, on the first upcoming day watering is due. Later watering days are not projected. If no day qualifies within the forecast, there is no 💧 (better silent than invented, as `nextDueDay` already does).
- **D-08: One shared watering verdict.**
  - Watering gets one decision function, like `mowVerdict`. It is used by Today's card, the Today heads-up, the "next …" line (`nextDueDay('water')`) and the outlook strip, so they can never disagree.
  - Its holds, beyond the existing ones (watered recently, rain in the last 3 days ≥ `rainSkip`, rain tomorrow ≥ `rainSkip`, odd/even ordinance, heat tightening), are:
    - **Cool day:** the day's forecast high is below 60°F (LAWN-01).
    - **Wet forecast:** the day's own forecast rain is at least the season's `rainSkip` (0.3 in summer, 0.5 in spring and fall), or its chance of rain is 60% or more (LAWN-04).
  - The planner sets the precedence between holds and documents it next to the function, the way `mowVerdict` does.
- **D-09: The cool-day hold is a hard hold.**
  - The card reads along the lines of "Cool day (high 54°F) — hold off" and counts as `hard`, like the rain holds.
  - The existing per-day Override still lets Ian water anyway.
  - The outlook skips cool days.
  - The threshold is a named constant (60°F).

### Rain marks in history and the journal (LAWN-03, LAWN-05)

- **D-10: 🌧 shows with the amount.** A day with 0.1" or more of rain shows "🌧 0.42"" (two decimals) as plain text, not a tappable pill. Below 0.1" there is no mark, but the exact amount is still saved. This applies to the Lawn history (`lawnHistory`, next to the 💧/🚜 pills) and to Week in Review.
- **D-11: Rain is saved and shown all year.**
  - Rain is saved whenever a location is set, in every month (precipitation includes melted snow).
  - Week in Review shows 🌧 all year.
  - The Lawn history list stays hidden off-season (Nov–Mar), as it is now.
  - This also lets the phone check in November see real rain marks.
- **D-12: Today fetches weather all year.**
  - Today's `onRender` currently fetches only when `lawnSeason(new Date())` is true. It now fetches whenever a location is set, all year, still at most hourly through `maybeFetchWeather`.
  - Today's lawn card stays hidden off-season.
  - Care → Lawn keeps fetching as now.
- **D-13: Week in Review lawn tags are display-only.** 🚜 Mowed, 💧 Watered and 🌧 0.42" are plain tags like 🎲, ⚖️ and 🏆, read from `lawnLog` (`mowed` / `watered === true`) and the rain collection's live rows. Lawn logs are still fixed only in Care → Lawn.

### Offline weather (LAWN-06, LAWN-07)

- **D-14: A failed fetch backs off.**
  - After a failure there is no automatic retry for a few minutes, and the wait grows with each further failure (roughly 5 → 15 → 60 minutes; the planner sets the exact steps).
  - A success resets the backoff.
  - Tapping ↻ (`fetchWeather` action), or the device coming back online (`online` event), retries right away.
  - This applies on Today and on Care → Lawn, and must make the fetch → fail → render → fetch loop impossible.
  - The backoff state is device-local and never synced (memory, or `saveLocal()`, at the planner's choice).
- **D-15: While failing, show the last forecast with a note.**
  - Keep the last cached forecast on screen with a small muted line such as "Offline — weather from 3:40pm", next to the ↻ button.
  - If no forecast has ever been cached, Lawn shows "Couldn't load weather" with a Retry button, instead of "Loading weather…" forever.
- **D-16: LAWN-07, the harness fetch must settle.** The harness stub `test/harness.js:96` (`fetch: () => new Promise(() => {})`) never settles, so a fetch-render loop can hide. It is changed so `fetch` settles. A test then proves that a failing fetch does not re-fire on the following renders, and fails if the loop comes back.

### Claude's Discretion

- The rain collection's name, `label` (must be unused) and shape (list vs map), and the field names inside a row.
- The exact backoff steps and where the backoff state lives (device-local only).
- The precedence order inside the shared watering verdict, and the exact copy of the hold messages.
- How the quiet push is wired: a flag on the existing push path, or a separate transaction. Either way it uses `runTransaction` + `mergeDB()` and never bumps `updatedAt`.

### Deferred Ideas (OUT OF SCOPE)

- Manual rain-gauge entry or correction (typing your own reading, or removing a day's rain). This is a new capability and belongs in the backlog.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LAWN-01 | The lawn scheduler holds off watering when today's forecast high is below 60°F. | One shared `waterVerdict` with a cool-day hold (D-08/D-09). Guard against `num(null) === 0` reading a missing high as a cool day (Pitfall 4). Existing test fixtures default to a 75°F high, so no current wording check moves. |
| LAWN-02 | Once a day is over, that day's rainfall is saved with its exact amount in its own small synced collection, separate from `lawnLog`, added by the CLAUDE.md recipe. | List collection `rainLog` (key `date`, soft, last entry), migration 20, `recordRain()` writer using `saveLocal()` + `schedulePush()`. Quiet-push safety proven (§ "Quiet push: what the code does"). Recipe edit list in § Architecture Patterns, Pattern 1. |
| LAWN-03 | Lawn history shows 🌧 on every day with 0.1 inches of rain or more. | `rainByDate()` over `liveOf('rainLog')`, `RAIN_MARK_IN = 0.1`, two-decimal plain text in `lawnHistory` rows (Pattern 5). Open-Meteo returns three-decimal inches, so the mark test runs on the raw number. |
| LAWN-04 | The 7-day outlook shows 💧 on the day watering is next due, skipping any day whose forecast rain meets `rainSkip` or whose chance of rain is 60% or higher. | `nextWaterDay()` loops `lawnStatus(k)` for k = 0..6 using the shared verdict; the new genuinely-new hold is the 60% chance, because own-day rain is already inside `rain3` (Pattern 4). |
| LAWN-05 | Week in Review shows 🚜 Mowed, 💧 Watered and 🌧 rain on each day they apply. | New tags in `renderWeekReview`'s `tags` array, read strictly (`=== true`) from `lawnLog` and from `rainByDate()` (Pattern 5). |
| LAWN-06 | A failed weather fetch backs off instead of looping fetch → fail → render, on Today and Lawn, while offline. | `WXFAIL` backoff gate inside `maybeFetchWeather` (the only automatic caller). Prototype: 41 fetches in 40 ticks before, 1 after (Pattern 3). |
| LAWN-07 | The test harness's `fetch` settles, so a fetch-render loop fails the suite instead of hiding. | Macrotask-rejecting, counting stub plus an `opts.fetch` injection point. Prototype: the full existing suite stays at 1250 passed (Pattern 6). |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

Treated with the same authority as the locked decisions above. [VERIFIED: CLAUDE.md read this session]

- **Single file, no build, no dependencies.** `index.html` is the whole app. No `npm install` is ever part of a phase here.
- **`npm test` before every push; `npm run csp:hash` after any edit to the inline script**, even whitespace. A stale hash blanks the app on every device. Every code task in this phase edits the inline script.
- **Sync is a union merge, never an overwrite.** Every remote write is a `runTransaction` that re-reads and calls `mergeDB()`. Never `set()` outside that transaction. Never "more data wins".
- **Deletes are soft.** Never splice a row out of a synced list. Read through `liveOf(name)`. Never a hand-written `liveX` wrapper (a test asserts `liveSleep` does not exist; the same convention applies).
- **Absence never means "off".** Not directly in play for a list, but it is why rain stays out of `lawnLog`.
- **A migration that rewrites rows must `touch()` them and persist immediately.** Migration 20 only creates an empty list, so it rewrites nothing (same as migration 18).
- **Derived data uses `saveLocal()`.** `save()` bumps `updatedAt` and pushes. The rain writer is the one place a derived write must ALSO reach the cloud, which is the whole subject of D-01.
- **`esc()` on every user-controlled string; user data only in double-quoted attributes.** `validateBackup()` checks shape, never inner types, so a hand-edited backup can put anything in `inches`.
- **Events:** markup never calls a function by name. Use `data-action` and one thin `ACTIONS` wrapper per event. A wrapper never touches `DB` or persists. Never stop propagation. This phase can add zero new actions (Retry reuses `fetchWeather`).
- **Theme:** colours from `:root` custom properties, no hard-coded hex. Icons are Phosphor via `ph()`; emoji stay for logged or celebrated marks (🚜 💧 🌧 ☔ qualify).
- **Schema:** bump `SCHEMA`, add a `MIGRATIONS` entry, idempotent, never downgrade `_schema`.
- **Adding a new tracked thing:** exactly one `COLLECTIONS` entry, last, unused `label`, values literal or hoisted `function` only; tests per `docs/adding-a-collection.md`; do not touch the exporter.
- **After shipping:** append a dated changelog entry to `C:\Main Vault\50-59 Projects & Events\53. Software Projects\PPL Tracker App.md` and update **Current Features** (this phase is structural: a new synced collection). That is an orchestrator or close-out step, not a code task.

## Summary

This phase is five small pieces on top of machinery that already exists. The only genuinely risky one is the new synced collection, and CONTEXT already picked the safe mechanism (a quiet push). I checked it against the code and by running it: `pushNow` never bumps `updatedAt`; only `save()` does, and `schedulePush()` is the only thing `save()` adds that a derived write needs. So "quiet push" is simply `saveLocal()` followed by `schedulePush()`, with no new transaction and no flag. A stale device doing that cannot change which side wins `lawnLog` or `mobilityLog`, because `mergeDB` decides those maps from `updatedAt` alone and the merged blob's `updatedAt` is `max(rU, lU)`, which a rain write does not change. A control run where the stale device did `save()` instead flipped the `lawnLog` winner to the stale side, which is the 2026-07-25 incident in miniature.

Use a **list** collection keyed by `date`, not a map. A list merges per row by `mtime` (`mergeUnion`), which is what D-03 ("latest reading wins") needs, and it is immune to the `updatedAt` question entirely. A map with `replace-whole` would hand the whole day to whichever side has the newer `updatedAt`, which is exactly what a quiet push must not influence. No explicit-`false` replay test is then required (it is map-only).

The offline loop is real and reproducible today: a stale cache on Care → Lawn or on Today in season makes 41 fetches in 40 event-loop ticks [VERIFIED: prototype]. The fix is a three-line gate in `maybeFetchWeather`, the only automatic caller. The harness stub that hid it can be replaced with one that rejects on a macrotask and counts calls, and I ran the whole existing suite against that stub: 1250 passed, 0 failed. Two hazards that CONTEXT did not name: `viewLawn` and `wxGlance` both fall back to `ti = 1` when today is missing from the cache, which with 14 past days would show a two-week-old day as "today" after a long offline stretch; and an `online`-triggered fetch calls `render()` on whatever tab is open, including the Log tab mid-set.

**Primary recommendation:** Declare `rainLog` (list, key `date`, soft, last, label `Rainfall`), bump `SCHEMA` 19 → 20 with `ensureCollectionDefaults`, write rows with `touch()` + `saveLocal()` + `schedulePush()` from a single `recordRain()` called by `fetchWeather`, gate automatic fetches with a memory-only `WXFAIL` backoff, route all watering decisions through one `waterVerdict()`, and change the harness `fetch` to a counting macrotask-rejecting stub in the first plan so every later plan is tested against it.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Weather fetch, backoff, retry on `online` | Browser / Client | External API (Open-Meteo) | The whole app is client-side; the only network peers are Open-Meteo and Firebase. Backoff state is per device and never synced. |
| Rain row derivation (`recordRain`) | Browser / Client | — | Pure function of the fetched `daily` arrays and `todayISO()`. |
| Rain history persistence and sync | Database / Storage (localStorage, then the Firestore blob) | Browser / Client | `saveLocal()` writes localStorage; `schedulePush` → `pushNow` → `runTransaction` + `mergeDB` writes the cloud blob. No server code exists. |
| Watering verdict, cool and wet holds, outlook projection | Browser / Client | — | Derived on every render from `DB.wx` and `DB.lawnLog`. No stored state. |
| Lawn history 🌧, Week in Review tags | Browser / Client | — | Display only, read through `liveOf('rainLog')` and `lawnLog`. |
| Security rules | CDN / Static (n/a) / Firebase console | — | `firestore.rules` gates the whole per-user document. The blob is one string field, so a new collection inside it needs no rules change. |

## Standard Stack

### Core

No external packages. The project forbids dependencies (single file, no build) and this phase adds none.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| (none) | — | — | `index.html` stays dependency-free. Node `vm` + the existing `test/harness.js` is the test stack. |

### Supporting

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| Node | v24.15.0 (this machine) | `npm test` = `node test/app.test.js` | Every task. Pin `TZ=America/Chicago`. |
| `npm run csp:hash` / `csp:check` | repo scripts | Re-pin the inline script's sha256 | After every inline-script edit; CI runs the check. |
| Open-Meteo forecast API | v1, free, no key | Daily and hourly weather, `past_days` up to 92 | Already the only weather host; allowed by the CSP. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| List collection keyed by `date` | Map collection (`replace-whole`) | A map takes the whole day from the newer `updatedAt` side, which defeats "latest reading wins" and is the very thing a quiet push must not influence. Rejected. |
| `saveLocal()` + `schedulePush()` quiet push | A flag on `save()` or a separate transaction | More code, more places to get the merge wrong. The existing push path already never bumps `updatedAt`. Rejected. |
| In-memory `WXFAIL` | Persist failure state in `DB.wx` | `DB.wx` is device-local already, but a persisted failure adds a `saveLocal()` per failure and survives a reload, where a fresh retry is actually wanted. Memory is enough. |

**Installation:** none. No `npm install`.

**Version verification:** not applicable (no packages). Node v24.15.0 confirmed locally; the suite ran green at 1250 passed in 8 s before any change.

## Package Legitimacy Audit

Not applicable: this phase installs no external packages, so no `gsd-tools package-legitimacy check` was run and nothing is tagged `[ASSUMED]` for provenance.

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
                       ┌───────────────────────────────────────────────┐
 render() ──onRender──▶│ maybeFetchWeather()   (the ONLY auto caller)   │
 (Today: all year,     │   skip if no location / fetching /             │
  Care→Lawn)           │   now < WXFAIL.retryAt   ◀── backoff gate      │
                       │   skip if cache fresh (<1h, same lat/lon)      │
                       └───────────────┬───────────────────────────────┘
 ↻ / Retry / "Load weather" (ACTIONS) ─┤ (manual: bypasses the gate)
 window 'online' (only on a weather    │
  screen) ─────────────────────────────┤
                                       ▼
                       fetchWeather()  weatherFetching=true; render()
                          │ fetch(api.open-meteo.com … past_days=14)
              ┌───────────┴───────────┐
          ok  │                       │ fail / !r.ok / bad JSON
              ▼                       ▼
   DB.wx = {at,lat,lon,data}      WXFAIL.n++, retryAt = now + step[n]
   WXFAIL reset                   (keep last DB.wx; show "Offline — …")
   recordRain(data.daily) ─────┐          │
      for each day < today:    │          │
      new row / changed amount │          │
      → touch(row)             │          ▼
   saveLocal()  (NOT save())   │      render()  ──▶ maybeFetchWeather()
   schedulePush() if changed ──┘                    sees retryAt → stops
              │
              ▼
   render()   (Lawn: outlook 💧, history 🌧; History: Week in Review tags)

 schedulePush ─1.5s─▶ pushNow ─▶ runTransaction: read remote ─▶ mergeDB(remote, local)
                                   ├─ lawnLog / mobilityLog: whole day from newer updatedAt (unchanged)
                                   ├─ rainLog: mergeUnion by row mtime (newest reading wins)
                                   └─ updatedAt = max(rU, lU)   ← a rain write never raises it
                                 ─▶ tx.set(blob)  (inside the transaction only)
```

### Recommended edit map (by symbol, all in `index.html` unless noted)

```
COLLECTIONS (after sleep, L547)        + rainLog entry, last
SCHEMA (L498)                          19 → 20
MIGRATIONS (after 19, L657)            + 20: d=>ensureCollectionDefaults(d)
fetchWeather / maybeFetchWeather       backoff, past_days=14, recordRain, location-match guard
(L3507-3524)                           + WXFAIL, WX_BACKOFF_MS, retryWeather (online handler)
TABS today.onRender (L1710)            drop the lawnSeason gate
viewLawn (L3922), wxGlance (L1778)     failure states; replace the ti=1 fallback
lawnStatus (L3652)                     water branch → waterVerdict()
nextDueDay (L3811)                     unchanged API, now rides waterVerdict through lawnStatus
mowMark / mowOutlookHTML (L3752-3774)  wet → ☔, add 💧, retitle "Lawn outlook"
lawnHistory (L3897)                    🌧 text next to the pills
renderWeekReview (L2615)               + 🚜 Mowed, 💧 Watered, 🌧 tags
test/harness.js                        fetch stub, opts.fetch, makeWx pastDays, new exports
test/app.test.js                       INTRODUCED_AT, last-entry retarget, three `19` literals,
                                       new LAWN-xx blocks, golden regen
test/fixtures/merge-golden.json        regenerate (WRITE_MERGE_GOLDEN=1)
```

### Pattern 1: The new collection, by the recipe

**What:** One declaration; everything else derived. [VERIFIED: index.html:547, :657, :664-667, :4675]

The last entry today is:
```text
  sleep:      { kind:'list', key:'id',        sortBy:'date',      merge:'union', soft:true,  required:false, label:'Sleep', columns:[{field:'date',label:'date'},{field:'hours',label:'hours'},{field:'quality',label:'quality (1-5)'},{field:'note',label:'note'}] },
```
The validator's allowed spec keys are `const ALLOWED = ['kind','key','sortBy','merge','soft','required','explicitFalse','label','columns','format'];` and a list must declare `merge:'union'`. Every label in use is `Workouts`, `Weigh-ins`, `Pet weigh-ins`, `Cardio`, `Ideas`, `Todos`, `Hobbies & chores`, `Journal`, `Mobility`, `Lawn`, `Sleep`, so `Rainfall` is unused.

**Proposed entry (new code):**
```js
  /* rainLog (Phase 11, LAWN-02): one row per finished day, written by the weather fetch, read-only to Ian.
     A list keyed by date, not a map: rows merge by their own mtime, so a later reading wins and no
     rain write can influence lawnLog's whole-day merge. */
  rainLog:    { kind:'list', key:'date', sortBy:'date', merge:'union', soft:true, required:false, label:'Rainfall', columns:[{field:'date',label:'date'},{field:'inches',label:'rainfall',unit:'in'}] },
```
Everything in it is a literal, so the verbatim placement rule holds trivially. `unit:'in'` is a literal unit string, which the column contract allows. `format` is omitted because the rows are already flat (as `sleep`'s are).

**Migration (new code, mirrors migration 18):**
```js
  20:d=>ensureCollectionDefaults(d), // rain history (LAWN-02) — creates the absent list only, rewrites no row
```
`ensureCollectionDefaults` is quoted at L664-667: `for(const name in COLLECTIONS){ if(d[name]==null) d[name] = COLLECTIONS[name].kind==='list' ? [] : {}; } return d;`. It touches no existing row, so the four row-rewrite guards (touch, persist, idempotent, stale-device replay) are not triggered, exactly as the sleep test records.

**Name choice:** `rainLog` is safe against two substring tests. "no derived consumer mentions <name>" uses `indexOf` on comment-stripped source of `blank`, `liveOf`, `validateBackup`, `mergeCollections`, `mergeDB`; a name like `rain` would false-positive on words such as "train" or "constrain", `rainLog` will not. The exporter test greps `\b<name>\b` in the exporter functions; none mention `rainLog`. [VERIFIED: test/app.test.js:1690-1692, :4220-4226]

### Pattern 2: Quiet push: what the code does (D-01, the three confirmations)

**1. How `localNewer` and `updatedAt` decide the maps today.** [VERIFIED: index.html:4950, :4755-4763, :4774-4793]
```text
  const localNewer = localWins ? (lU >= rU) : (lU > rU);
```
`lU` and `rU` are the two sides' `updatedAt`. `mergeCollections` calls `mergeDateMap(r[name], l[name], localNewer, null)` for `replace-whole` maps (`mobilityLog`, `lawnLog`), and `mergeDateMap` does `out[k] = innerMerge ? innerMerge(av,bv,bNewer) : (bNewer? bv : av)`. So for a day present on both sides, the whole inner object comes from the side with the strictly greater `updatedAt` (ties go to `remote` unless `localWins`). Lists merge by row `mtime` in `mergeUnion` (L4567), where "strictly newer action wins; ties fall back to side".

**2. A quiet push cannot change a `lawnLog` or `mobilityLog` winner.** Only `save()` writes `DB.updatedAt` (L932: `DB.updatedAt = Date.now();`). `saveLocal()` (L922) does not. `pushNow` never bumps it either, except the zero guard `if(!DB.updatedAt) DB.updatedAt=Date.now();`, which cannot fire on a device that has ever saved (the boot migration save stamps it). The merged blob carries `out.updatedAt = Math.max(rU, lU)` (L4962 region), so a rain-only write leaves the cloud's `updatedAt` at whatever either side already had.

I ran it. Setup: cloud device A has `updatedAt` 100 and a `lawnLog` day that says `mowed:false`; stale device B has `updatedAt` 50, the same day saying `mowed:true`, plus two new rain rows written quietly. [VERIFIED: prototype, `quiet.js` in the session scratchpad, with the real `mergeDB`]
```text
B pushes:          updatedAt 100   lawnLog {"mowed":false}   rain [0.25 (mtime 99), 0.42 (mtime 95)]
A after listener:  updatedAt 100   lawnLog {"mowed":false}   rain [same two rows]
CONTROL (B used save(), updatedAt 200):  lawnLog {"mowed":true}   <- the stale side wins; this is the 2026-07-25 hazard
```
The tombstone replay for a rain row also held (the deleted row stayed deleted after merging the stale device, and again after replaying it). `collectionProblems()` returned no problems for the proposed entry, and it was last in `Object.keys(COLLECTIONS)`.

**3. The push is never a bare `set()`.** The only remote write is `tx.set(SYNC.docRef, {...})` inside `fbDb.runTransaction`, after `tx.get` and `mergeDB(remoteDB, localSnap)` [VERIFIED: index.html:5162-5190]. `schedulePush` is `function schedulePush(){ if(!SYNC.user || !SYNC.docRef) return; clearTimeout(pushTimer); pushTimer=setTimeout(()=>pushNow(true), 1500); }` (L5213), and `save()` calls it once at the end (L937). So a derived write that must reach the cloud is exactly:
```js
saveLocal();          // persist, no updatedAt bump
schedulePush();       // debounced pushNow(true): transaction + mergeDB
```
No new transaction and no flag are needed. This answers Claude's-discretion item 4: use the existing path.

**Signed-out and not-yet-reconciled devices are safe.** `schedulePush` returns early with no user. `pushNow` with `!SYNC.reconciled` sets `SYNC.pending`, schedules a retry, and writes nothing, so a quiet push can never run from an unreconciled state (L5164).

**Side effects to know about, none blocking:**
- The receiving device's live listener sees a changed blob and shows the toast "Synced from another device" and re-renders (`adoptMerged`). That happens about once per day when new rain rows arrive. Cosmetic. If it bothers Ian, suppress the toast when the only difference is `rainLog` (planner's call; not required).
- `adoptMerged` calls `snapshotNow('before-remote-change')`, and the local ring holds 8 entries. A daily rain adoption consumes ring slots, shortening how many days the undo buffer covers. Low severity; note it in the plan, do not engineer around it.
- Blob growth: a row is about 55 bytes (`{"date":"2026-11-10","inches":0.042,"mtime":1789000000000}`), so about 20 KB a year. The Firestore document limit is 1 MiB [CITED: firebase.google.com/docs/firestore/quotas] and the blob is one string field, so this is small next to the ~5.5 KB/week the code comment cites for the rest of the blob.

### Pattern 3: The backoff, and why it stops the loop (LAWN-06, D-14, D-15)

**The loop today.** [VERIFIED: index.html:3507-3524, :1710, :1716, :1758-1768] `fetchWeather` sets `weatherFetching=true; render();`, awaits `fetch`, and on any failure falls through to `weatherFetching=false; render();`. `render()` runs the tab's `onRender`, which calls `maybeFetchWeather()`. The cache is still stale, so it calls `fetchWeather()` again. Nothing records the failure. Today's `onRender` is `onRender:()=>{ if(DB.lawn && DB.lawn.lat!=null && lawnSeason(new Date())) maybeFetchWeather(); }`, Care's is `onRender:sub => { if(sub==='lawn') maybeFetchWeather(); }`.

Measured with the macrotask stub: **41 fetch calls in 40 event-loop ticks on Care → Lawn and on Today**, and 0 on Today when `lawnSeason` is overridden to `null` (the off-season case that D-12 removes). [VERIFIED: prototype, `loop.js`]

**The gate.** `maybeFetchWeather` is the only automatic caller, so the gate belongs there. Manual paths call `fetchWeather()` directly and bypass it. I patched a scratch copy with the three lines below and re-ran the same script: **1 fetch call after 40 ticks** on both screens. [VERIFIED: prototype]

```js
let weatherFetching=false;
/* Device-local, never in DB and never synced. A const object (like SYNC) so the harness can export the
   reference and a test can set retryAt to simulate the wait elapsing: the frozen test clock cannot. */
const WXFAIL = { n:0, retryAt:0 };
const WX_BACKOFF_MS = [5*60000, 15*60000, 60*60000];   // 5 → 15 → 60 min, then stays at 60

async function fetchWeather(){
  if(!DB.lawn || DB.lawn.lat==null || weatherFetching) return;
  weatherFetching=true; render();
  try{
    const {lat,lon}=DB.lawn;
    const r=await fetch(URL);                  // URL unchanged except past_days=14
    if(!r.ok) throw 0;                         // 429 / 5xx count as failures too (WR-01)
    const data=await r.json();
    DB.wx={ at:Date.now(), lat, lon, data };
    if(DB.lawn && DB.lawn.lat===lat && DB.lawn.lon===lon) recordRain(data.daily);   // see Pitfall 7
    saveLocal();
    if(rainChanged) schedulePush();
    WXFAIL.n=0; WXFAIL.retryAt=0;
  }catch(e){
    WXFAIL.n++; WXFAIL.retryAt=Date.now()+WX_BACKOFF_MS[Math.min(WXFAIL.n, WX_BACKOFF_MS.length)-1];
  }
  weatherFetching=false; render();
}
function maybeFetchWeather(){
  if(!DB.lawn || DB.lawn.lat==null || weatherFetching || Date.now()<WXFAIL.retryAt) return;
  /* …existing staleness test unchanged… */
}
```
(`rainChanged` stands for `recordRain`'s boolean return; the real code should keep one `saveLocal()` for the cache and the rows rather than two.)

**Retry on demand.** The ↻ button, "Load weather" and the new Retry button all use `data-action="fetchWeather"`, which maps to `fetchWeather:       { click: () => fetchWeather() },` [VERIFIED: index.html:5577]. They already bypass the gate, so **no new action is needed** and the existing action-wrapper test (`fetchWeather === '[[],[]]'`, test/app.test.js:6163) stays true. The online retry is a named hoisted function wired like `window.addEventListener('online', syncRetryNow);` (L5211):
```js
function retryWeather(){ if(WXFAIL.n>0 && weatherScreenShowing()) fetchWeather(); }
window.addEventListener('online', retryWeather);
```
`weatherScreenShowing()` is `TAB==='today' || (TAB==='care' && subState.care==='lawn')`. The guard is Pitfall 5.

**Where state lives:** memory only. A fresh app launch gets one immediate try, which is wanted, and the gate then protects the rest of the session. A success clears both fields. The first failure waits 5 minutes, the second 15, the third and later 60.

**What the screens show (D-15).** `viewLawn` today returns `Loading weather…` or a `Load weather` button when there is no cache. Add a third state: `!weatherFetching && WXFAIL.n>0` with no cache shows `Couldn't load weather` and a Retry button (`data-action="fetchWeather"`). With a cache and `WXFAIL.n>0`, add a small muted line beside the ↻ button: `Offline — weather from ${time}`. Include the date when `wx.at` is not today, otherwise a cache from days ago reads as current (see Pitfall 3).

### Pattern 4: One watering verdict (LAWN-01, LAWN-04, D-08/D-09)

**What exists.** [VERIFIED: index.html:3676-3687] The watering branch inside `lawnStatus` is an inline chain: override, `dsWater < waterEvery`, `rain3 >= rules.rainSkip`, `rainTomorrow >= rules.rainSkip`, `!sprinkleDayOK`, otherwise due. The mow branch already delegates to `mowVerdict(o)`, whose comment documents precedence ("too-soon beats wet beats heat beats not-yet-due"). `water.hard` is set but no UI reads it today (grep of `.hard` finds only the assignments), so `hard` is a data flag for consistency, not a rendering switch.

**The season thresholds the verdict reads** [VERIFIED: index.html:3559-3561]:
```text
  spring: { months:[4,5],  waterPerWeek:2,   rainSkip:0.5, heatLimit:null, heatWater:null },
  summer: { months:[6,7,8],waterPerWeek:3.5, rainSkip:0.3, heatLimit:85,   heatWater:90 }, // 3–4×/week
  fall:   { months:[9,10], waterPerWeek:2,   rainSkip:0.5, heatLimit:null, heatWater:null },
```

**A finding that shapes the verdict.** `rain3 = num(P[ti])+num(P[ti-1])+num(P[ti-2])` already includes the day's own forecast amount. So for the *amount* half of D-08's "wet forecast" hold, `rain3 >= rainSkip` already holds the day back; the only condition that is genuinely new is **chance of rain ≥ 60%** (`PP[ti]`). The existing hold's copy ("Rained recently") is misleading for a future day, so put the own-day check before it.

**Recommended precedence (document it next to `waterVerdict`, as `mowVerdict` does):**
1. `override` (today only; Ian's own decision) → recommend, text unchanged.
2. `recent`: `dsWater < every` → soft hold, text unchanged ("Watered … — hold off").
3. `wet`: own-day forecast rain `P[ti] >= rainSkip` or `PP[ti] >= 60` → hard, new copy along the lines of "Rain in the forecast (~0.40", 70%) — hold off".
4. `rain3`: `rain3 >= rainSkip` → hard, existing copy.
5. `rainTomorrow` → hard, existing copy.
6. `cool`: the day's high below `COOL_DAY_F` (60) → hard, copy "Cool day (high 54°F) — hold off".
7. `city`: the odd/even ordinance → hard, existing copy.
8. otherwise due.

The reasoning: rain holds beat the city rule today, and a cool day is more informative than "it's an even date" when both apply. Heat tightening only shortens `waterEvery`; a cool day and a 90°F stretch cannot coexist in one two-day window, so no precedence is needed between them. Only wording pinned by an existing test is `Watered today — hold off` (test/app.test.js:417); the other hold strings are free to change.

**The outlook (D-07).** `nextDueDay` loops `off = 1..6`, so it cannot answer "is it today?". Add a sibling that starts at 0:
```js
function nextWaterDay(){              // new code
  for(let k=0; k<=6; k++){
    const s = lawnStatus(k); if(!s.season) continue;
    const w = s.water;
    if(w.recommend && !w.unknown && !w.override) return k;   // an override is a decision, not a due date
  }
  return null;                                               // better silent than invented
}
```
It skips `unknown` (nothing ever logged) on purpose, the same as `nextDueDay`, so a lawn with no history shows no 💧 rather than a guess. Because every hold lives in the verdict, a day failing the 60% chance, the `rainSkip`, the cool threshold or the ordinance is skipped for free, and Today's card, the heads-up and the "next …" line cannot disagree with the strip. `lawnStatus(k)` for k up to 6 reads `P[ti+k+1]` which falls off the array end and `num(undefined)` returns 0, so the last day simply sees no "rain tomorrow", which matches how `nextDueDay` already behaves.

**Strip cell.** `mowMark(d)` returns one icon per day; change `wet` from 💧 to ☔ and render the water mark as a second small line in the same 42 px cell. That is presentation, and `UI hint: yes` in the roadmap means a UI-SPEC pass is available if Ian wants one; nothing in the logic depends on it.

**Cool-day guard (Pitfall 4).** `num = v=>(v==null?0:+v)` turns a missing high into 0, which is below 60. The hold must test `HI[ti] != null && isFinite(+HI[ti])` before comparing.

### Pattern 5: Writing and reading rain rows (LAWN-02, LAWN-03, LAWN-05)

**Writer (new code):**
```js
const RAIN_MARK_IN = 0.1;                       // LAWN-03: 🌧 at 0.1 inch or more
function recordRain(daily){                     // returns true when a row was added or changed
  if(!daily || !Array.isArray(daily.time) || !Array.isArray(daily.precipitation_sum)) return false;
  if(!Array.isArray(DB.rainLog)) DB.rainLog = [];
  const today = todayISO(), byDate = new Map();
  DB.rainLog.forEach(r => { if(r && typeof r==='object') byDate.set(r.date, r); });   // ALL rows, tombstones included
  let changed = false;
  daily.time.forEach((iso, i) => {
    if(typeof iso!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso) || !(iso < today)) return;  // finished days only
    const v = daily.precipitation_sum[i];
    if(v==null || !isFinite(+v) || +v<0 || +v>40) return;                                  // unknown is not 0
    const inches = Math.round(+v*1000)/1000;                                                 // API gives 3 decimals
    const row = byDate.get(iso);
    if(!row){ const r = touch({ date:iso, inches }); DB.rainLog.push(r); byDate.set(iso, r); changed = true; }
    else if(row.deletedAt){ /* a tombstone stays a tombstone: never revive */ }
    else if(+row.inches !== inches){ row.inches = inches; touch(row); changed = true; }
  });
  return changed;
}
```
Notes: the ISO-string compare `iso < today` is correct because both are zero-padded `YYYY-MM-DD`. The writer looks at all rows, not `liveOf`, so a tombstoned date is not re-added as a second live row (Pitfall 6). Zero-rain days are stored as `0` rows: D-03's "no row" test would otherwise re-evaluate every dry day on every fetch, and "dry" must be distinguishable from "never fetched". An unchanged amount writes nothing, which is what keeps hourly fetches from hourly writes.

**Reader (new code):**
```js
function rainByDate(){                          // Map<ISO, inches>, live rows only, numbers only
  const m = new Map();
  liveOf('rainLog').forEach(r => { const v = +r.inches; if(r && typeof r.date==='string' && isFinite(v)) m.set(r.date, v); });
  return m;
}
```
Mark text is `🌧 ${v.toFixed(2)}"` when `v >= RAIN_MARK_IN`, plain text, no tap target (D-10). The threshold is tested on the raw three-decimal number, so 0.096 shows no mark and exactly 0.1 does; the display rounds to two decimals only after the test. Pass the number through `esc()` anyway to keep the "every interpolation" convention.

**Week in Review (D-13).** Add to `tags` in `renderWeekReview`, skipping `future` days:
```js
const lw = (DB.lawnLog||{})[iso] || {};
if(!future && lw.mowed === true)   tags.push(`<span style="font-size:11px">🚜 Mowed</span>`);
if(!future && lw.watered === true) tags.push(`<span style="font-size:11px">💧 Watered</span>`);
const rn = rainByDate().get(iso);
if(!future && rn !== undefined && rn >= RAIN_MARK_IN) tags.push(`<span style="font-size:11px">🌧 ${esc(rn.toFixed(2))}"</span>`);
```
Read `=== true`, the same strictness `dayFlagRows` uses, so an explicit `false` and the bookkeeping keys `overrideWater`/`overrideMow` never render. Build `rainByDate()` once per render, outside the seven-day `.map`.

**Lawn history (D-10/D-11).** `lawnHistory` stays gated on `lawnSeason` at its one call site (`${lawnSeason(new Date()) ? lawnHistory() : ''}`, L3967), so off-season it stays hidden. Inside, put the 🌧 text in the row beside the pills. Today's row never has one (today is never saved).

### Pattern 6: Harness `fetch` that settles (LAWN-07, D-16)

**What is there.** [VERIFIED: test/harness.js:91-96] The stub is `fetch: () => new Promise(() => {}),` with a comment explaining it used to reject at once, which spun in microtasks forever and starved every timer. That is why it was made inert, and why the loop became undetectable (04-REVIEW WR-05).

**The replacement.** Reject on a macrotask so the event loop keeps turning and `process.exit` (called by the suite's tail) still runs; count every call; allow a test to inject a response. I ran the whole existing suite with only this change in a scratch copy: **1250 passed, 0 failed, 2 skipped, exit 0**, identical to the baseline. [VERIFIED: prototype]

```js
// in loadApp(): inside the sandbox object (new code)
fetch: (url, init) => {
  sandbox.__fetchCalls = (sandbox.__fetchCalls || 0) + 1;
  sandbox.__fetchUrls.push(String(url));
  if(opts && typeof opts.fetch === 'function') return Promise.resolve(opts.fetch(url, init));   // online tests
  return new Promise((_, rej) => setImmediate(() => rej(new TypeError('offline (harness)'))));   // default: offline
},
```
with `sandbox.__fetchUrls = []` declared next to it, and `api.__fetchCalls = () => sandbox.__fetchCalls || 0;` beside the other `api.__…` accessors. A successful injected response is `{ ok:true, json: async () => makeWx({...}).data }`.

**The test that makes a loop fail the suite** (new, label it `LAWN-06/07`):
```js
asyncBlock('LAWN-06/07 a failed fetch backs off', async () => {
  const a = loadApp(APP_PATH); a.DB = a.blank();
  a.DB.lawn = { lat: 44.94, lon: -93.36, label: 'x' }; a.DB.wx = null;
  a.go('care'); a.setSub('lawn');
  for(let i = 0; i < 40; i++) await new Promise(r => setImmediate(r));
  ok('LAWN-06: offline, one fetch then quiet (not one per tick)', a.__fetchCalls() === 1, a.__fetchCalls());
  /* …then WXFAIL.retryAt = 0; render again → exactly one more; a.fetchWeather() bypasses the gate… */
});
```
Because `Date.now()` is frozen by the harness (`FROZEN_MS`), time never advances inside a test. Export `WXFAIL` (a `const` object, reachable only through the harness `names` list) so a test can set `WXFAIL.retryAt = 0` to simulate the wait elapsing. New `function` declarations (`recordRain`, `waterVerdict`, `rainByDate`, `nextWaterDay`, `retryWeather`) are reachable as `a.__sandbox.name` without any harness change, but add them to the `names` list and to `REQUIRED_EXPORTS` anyway so a rename fails loudly instead of returning `undefined`.

Add a global backstop: record every instance's `__fetchCalls` in a module-level array in the harness and assert in the suite's tail that none exceeded a generous cap (say 25). A regression anywhere then fails the suite even in a test that never thought about weather.

**Also needed in the harness:** `makeWx` hard-codes `for(let n=-3; n<=6; n++)` (L194, L203). Add a `pastDays` option defaulting to 3, so every existing fixture (and the merge golden, which does not use it) is unchanged, and rain tests pass `pastDays: 14`. `precipByOffset` is already keyed by signed day offset, so past-day rain needs no other change.

### Pattern 7: Today fetches all year (D-12)

Change Today's `onRender` to `()=>{ if(DB.lawn && DB.lawn.lat!=null) maybeFetchWeather(); }`. To test the off-season case the clock cannot move (the harness freezes August), but `lawnSeason` is a hoisted function declaration, so a test can replace it on the sandbox global and the `onRender` closure picks the override up at call time: `a.__sandbox.lawnSeason = () => null;`. [VERIFIED: prototype: with the override, the current code makes 0 fetches on Today; after the change it must make 1.] The same trick is how the existing suite overrides `schedulePush` (`spyPushes`, test/app.test.js:2752).

### Pattern 8: past_days = 14 and the readers (D-02)

**API check.** [VERIFIED: live API, neutral coordinate] The existing parameter set with `past_days=14&forecast_days=7` returns 21 daily entries and 504 hourly entries, `daily_units.precipitation_sum` is `inch`, and the values carry **three decimals** (for example `0.012`, `0.004`, `0.386`). `precipitation_probability_max` is present for past days too. The payload was 14.9 KB against roughly 8 KB at three past days, and it is stored in `DB.wx` and rewritten on every `save()` and `saveLocal()`, so each write is roughly 7 KB heavier. `past_days` allows 0 to 92 [CITED: open-meteo.com/en/docs]. Daily values are "a simple 24 hour aggregation from hourly values", with day boundaries from the resolved time zone when `timezone=auto` is used [CITED: open-meteo.com/en/docs].

**Every reader of `DB.wx.data.daily` and `hourly`, and whether 14 past days breaks it:**

| Reader | How it finds today | Verdict |
|--------|-------------------|---------|
| `lawnStatus` (L3652) | `ti=dy.time.indexOf(today)`; offsets `P[ti-1]`, `P[ti-2]` | Safe. Start-independent. |
| `mowForecast` (L3709) | `ti = dy.time.indexOf(todayISO())`; returns `null` if `ti < 0`; `idx = ti+k` | Safe. |
| `lawnHeatWindow`, `lawnRainWindow`, `rainTiming` | Scan `h.time` by `t.slice(0,10) === day` | Safe. 504 entries is trivial. |
| `viewLawn` (L3929) | `let ti=times.indexOf(today); if(ti<0) ti=times.length>1?1:0;` | **Fix.** The fallback means index 1, which is 13 days ago with 14 past days. |
| `wxGlance` (L1781) | `let ti=dy.time.indexOf(todayISO()); if(ti<0) ti=dy.time.length>1?1:0;` | **Fix.** Same fallback. |

Replace both fallbacks: if today is not in the cache, the forecast has nothing valid to say about today, so treat it as no usable forecast (the Lawn screen shows the offline/Retry state, `wxGlance` returns `null`). With D-14's backoff, an offline stretch longer than a week is now plausible, which is when this fallback would otherwise mislabel an old day as today.

**Old caches keep working.** A device that still holds a three-past-day cache from the previous build finds `today` normally, and the first fetch after the deploy replaces it. Until then it saves at most three days of rows, which the next fetch backfills.

### Anti-Patterns to Avoid

- **`save()` from the weather path.** It bumps `updatedAt`; the control run above shows a stale device then winning `lawnLog`. Use `saveLocal()` + `schedulePush()`.
- **Putting rain in `lawnLog`.** `mergeDateMap` takes the whole inner object from the newer side, so a rain key could overwrite the other device's mowed and watered marks.
- **A map collection for rain.** It would decide by `updatedAt`, not by row. Use the list.
- **Restarting the fetch from the render that reports the failure.** Any automatic path must pass through `maybeFetchWeather`'s gate.
- **A 60-minute `setInterval` or timer to "retry later".** Nothing here needs one; the next render after the window retries, and timers cost battery in a PWA.
- **Re-adding a tombstoned date.** Look up existing rows in the raw array, not through `liveOf`.
- **Adding a `liveRain` wrapper.** The convention is `liveOf('rainLog')`.
- **Touching the exporter.** `rainLog` exports itself (`exportRows` reads lists through `liveOf` and picks the declared columns).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Per-row sync with newest-wins | A custom reconcile for rain | `mergeUnion` via a `merge:'union'` list entry | Already handles ties, missing mtime, tombstones, and is what every list uses. |
| Soft-delete filtering | A `liveRain()` wrapper | `liveOf('rainLog')` | `liveOf` throws on a non-soft list, so misuse fails loudly. |
| Backup shape validation | A `rainLog` check in `validateBackup` | The registry-derived pass | A non-array `rainLog` already yields `The rainLog section is damaged (expected a list).` |
| Export section | Exporter code | The `COLLECTIONS` entry's `columns` | `buildMarkdownExport` derives it; a test fails if an exporter function names a collection. |
| Empty default for existing devices | A bespoke migration body | `ensureCollectionDefaults` | Creates absent collections only, rewrites no row. |
| Retry timers | `setInterval` polling | A gate in `maybeFetchWeather` | No timers, no battery, no leaked handles in the harness. |
| Escaping | A new sanitiser | `esc()` plus number coercion | Rendered rain values are numbers from `toFixed`; never interpolate the stored field raw. |

**Key insight:** every hard part of this phase (merge, soft delete, validation, export, boot defaults) already exists behind the registry. The work is one declaration, one writer, one gate, one verdict function, and tests.

## Common Pitfalls

### Pitfall 1: The SCHEMA bump breaks three tests that hard-code 19, and stales the golden
**What goes wrong:** After 19 → 20 the suite fails in places that name no collection. [VERIFIED: test/app.test.js:8398, :8511, :10365]
**Why it happens:** Three Phase 9 and 10 checks compare to the literal `19`: `stored._schema === 19` (a schema-18 device "boots into schema 19", L8398), `empty._schema === 19` (L8511), and `r.schema === 19` inside "…and SCHEMA stays 19" (L10365). Separately, the committed `test/fixtures/merge-golden.json` hashes outputs that embed `_schema`, so dozens of `golden:` cases fail as `hash differs`.
**How to avoid:** Change the first two to `app.SCHEMA` (their intent is "migration 19 ran"; use `>= 19` if the literal must stay) and reword the third so it asserts the marker survives, not that SCHEMA is 19. Then `WRITE_MERGE_GOLDEN=1 node test/app.test.js`, run `npm test` plain, and commit the regenerated fixture. [CITED: docs/adding-a-collection.md § Registry validity]
**Warning signs:** Many `golden:` failures at once with `hash differs`; a failure naming "schema 19".

### Pitfall 2: A "last entry" test and a boot table both name the old last collection
**What goes wrong:** `SLEEP-04: sleep is declared once, as the last entry` fails (it asserts `keys[keys.length-1] === 'sleep'`), and `boot: introduced-at table knows rainLog` fails. [VERIFIED: test/app.test.js:1698-1703, :1875-1878]
**How to avoid:** Retarget the first to `rainLog` (keep a check that `sleep` is still declared exactly once). Add `rainLog:20` to `INTRODUCED_AT`, which currently ends `…lawnLog:10, petWeights:14, sleep:18 };`. The boot loop from every historical schema then seeds an empty `rainLog` for versions at or above 20 and lets migration 20 create it below.
**Warning signs:** The failure text names `rainLog` or `sleep`.

### Pitfall 3: A long offline stretch shows an old forecast as "today"
**What goes wrong:** With the backoff in place, a phone offline for a week keeps the last cache on screen (D-15). `viewLawn` and `wxGlance` fall back to index 1 when today is absent, which now means 13 days ago.
**How to avoid:** Replace the fallback (Pattern 8). Always show the cache's date in the offline note when it is not today, for example "Offline — weather from Mon 3:40pm".
**Warning signs:** The strip's "Today" column shows a high that matches no recent day.

### Pitfall 4: A missing forecast high reads as a cool day
**What goes wrong:** `num = v=>(v==null?0:+v)` returns 0 for a `null` high, and 0 < 60, so watering is held on a day with no data.
**How to avoid:** Compare only when `HI[ti] != null && isFinite(+HI[ti])`. Same guard for the 60% chance (`PP[ti]`).
**Warning signs:** "Cool day (high 0°F)" in a summer card.

### Pitfall 5: The `online` retry re-renders whatever tab is open
**What goes wrong:** `fetchWeather` calls `render()` at the start and the end. Fired from `window 'online'` while Ian is on the Log tab, it rebuilds the workout screen, dropping focus and closing the keyboard mid-set. Today it never happened because a fetch started only from Today or Lawn. (`adoptMerged` guards exactly this with its `typing` check; `fetchWeather` has no such guard.)
**How to avoid:** Retry on `online` only when a weather screen is showing (`weatherScreenShowing()`), and let the next visit to Today or Lawn retry through the normal gate otherwise. The same re-render already exists in season on Today; D-12 widens it to all year, so keep an eye on the Today weigh-in input.
**Warning signs:** A report that the keyboard closes by itself on reconnect.

### Pitfall 6: Reviving a tombstoned rain row
**What goes wrong:** The writer searches `liveOf('rainLog')`, finds no row for a deleted date, and pushes a new live row with the same key and a newer `mtime`. The merge resurrects it.
**How to avoid:** Index existing rows from the raw `DB.rainLog` including tombstones, and skip a tombstoned date. Nothing deletes rain today (D-04), so this only matters for a hand-edited backup or a future feature, but the stale-device replay test must pass with a tombstone present.

### Pitfall 7: Location changes mid-fetch, or between fetches, write the wrong place's rain
**What goes wrong:** `useMyLocation` and `searchLocation` set `DB.wx=null` and call `fetchWeather()`. A response for the old coordinates that lands after the change would be saved as rain for the new place. Also, rows carry no location, so moving the location rewrites the last 14 days' amounts ("latest reading wins").
**How to avoid:** Only call `recordRain` when `DB.lawn.lat`/`lon` still equal the values captured at the start of the call. Treat the rewrite-on-move as accepted behaviour for a fixed home address; list it in Open Questions so Ian can overrule.

### Pitfall 8: The test clock is frozen, so `touch()` ordering cannot be observed by waiting
**What goes wrong:** `Date.now()` returns `FROZEN_MS` for the whole run. A test that expects a later fetch to produce a larger `mtime` than an earlier one sees equal values.
**How to avoid:** Seed rows with a small explicit `mtime` (for example `1`), run the fetch, and assert the row's `mtime === Date.now()` (greater than 1) and its `inches` changed; assert an unchanged amount leaves `mtime` at the seeded value and schedules no push (`spyPushes` count 0).

### Pitfall 9: Past-day values are archived model forecasts, not a rain gauge
**What goes wrong:** Ian compares a saved 0.42" to a rain gauge and they differ.
**Why:** The "Past Days" feature serves "archived forecasts" [CITED: open-meteo.com/en/docs], summed per local day. This is the same source the scheduler already trusts for `rain3`.
**How to avoid:** Nothing to build. Say "forecast-model rainfall" in any copy if the UI-SPEC wants a label. The deferred manual-entry idea (CONTEXT) is the proper fix and is out of scope.

### Pitfall 10: Two renders per fetch and a possible `finally` omission
**What goes wrong:** If a new throw path is added between `weatherFetching=true` and the reset, the flag latches true and `maybeFetchWeather` is a no-op for the rest of the session (the WR-05 symptom).
**How to avoid:** Keep the reset in one place after the `try`/`catch`, or use `finally`. Add a test that a thrown `r.json()` still clears `weatherFetching`.

## Code Examples

### Waterfall of holds (skeleton for `waterVerdict`, new code)
```js
/* ── The watering decision, in ONE place ── (mirrors mowVerdict)
   Precedence: override > watered recently > wet forecast (own-day rain or chance) > rain already fell
   > rain tomorrow > cool day > city rule > due. Today's card, the heads-up, the "next …" line and the
   outlook strip all read this through lawnStatus(), so they cannot disagree. */
const COOL_DAY_F = 60, WET_CHANCE_PCT = 60;
function waterVerdict(o){
  // o: { override, dsWater, every, havewx, rainOwn, chanceOwn, rain3, rainTomorrow, rainSkip, highF, sprinkleDayOK }
  if(o.override) return { blocked:null, why:'override' };
  if(o.dsWater < o.every) return { blocked:'recent' };
  if(o.havewx && (o.rainOwn >= o.rainSkip || o.chanceOwn >= WET_CHANCE_PCT)) return { blocked:'wet' };
  if(o.havewx && o.rain3 >= o.rainSkip) return { blocked:'rain3' };
  if(o.havewx && o.rainTomorrow >= o.rainSkip) return { blocked:'tomorrow' };
  if(o.highF != null && isFinite(o.highF) && o.highF < COOL_DAY_F) return { blocked:'cool' };
  if(!o.sprinkleDayOK) return { blocked:'city' };
  return { blocked:null };
}
```
`lawnStatus` maps `blocked` to the existing `water.text`, `water.hard` and `water.recommend`, keeping every current string, and passes `highF: havewx ? HI[ti] : null`.

### A stale-device rain test (shape, new code; copy the sleep labels)
```js
{
  const A = Object.assign(app.blank(), { updatedAt:100, rainLog:[{ date:'2026-08-01', inches:0.2, deletedAt:900, mtime:900 }] });
  const B = Object.assign(app.blank(), { updatedAt:500, rainLog:[{ date:'2026-08-01', inches:0.2, mtime:100 }] });
  const dead = r => { const row = r.rainLog.find(x=>x.date==='2026-08-01'); return !!row && !!row.deletedAt; };
  const first = app.mergeDB(clone(A), clone(B), false);
  const replay = app.mergeDB(clone(first), clone(B), false);
  ok('LAWN-02: a deleted rain row is not resurrected by a stale device, and stays deleted on replay',
     [first, app.mergeDB(clone(B), clone(A), false), replay].every(dead));
}
```
(Same shape as the sleep checks at test/app.test.js:1431-1452.) The prototype run of this exact scenario returned `true true`.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inert, never-settling harness `fetch` | Counting stub that rejects on a macrotask, with an injection point | This phase (LAWN-07) | A fetch loop becomes a countable failure instead of invisible. |
| Fetch from `onRender`, no memory of failure | Gate in `maybeFetchWeather` with a growing wait | This phase (LAWN-06) | Ends the battery-draining offline loop (04-REVIEW WR-01). |
| `past_days=3` weather cache | `past_days=14` | This phase (D-02) | Rows survive up to two weeks without opening the app. |
| `mowVerdict` only | `mowVerdict` and `waterVerdict` | This phase (D-08) | One decision per task. |

**Deprecated/outdated:** the harness comment at L91-95 ("No network: a request never settles") must be rewritten, not left standing next to the new stub.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The Android PWA fires `window 'online'` reliably when connectivity returns, so D-14's "retry on online" works on Ian's phone. | Pattern 3 | Low. The next render after the 5-minute window retries anyway, and ↻ is always available. Cannot be tested in the harness (its `addEventListener` is a no-op); covered by the phone check. |
| A2 | Backoff steps of 5, 15 and 60 minutes are right. CONTEXT leaves the exact steps to the planner. | Pattern 3 | Low. Constants in one array. |
| A3 | Zero-rain days should be stored as `0` rows (D-05 says "one saved row per day"; D-03's "has no row" rule implies it). | Pattern 5 | Low. If Ian wants only wet days stored, the writer skips `0` and a dry day reads as "no row"; the cost is that dry and never-fetched look the same. |
| A4 | Moving the saved location overwriting the last 14 days of rows is acceptable for a fixed home address. | Pitfall 7 | Low for Ian. Would matter only if he sets a different town. |
| A5 | The "Synced from another device" toast on arrival of new rain rows (about daily) is acceptable. | Pattern 2 | Cosmetic. Suppress when only `rainLog` differs if it annoys him. |
| A6 | A rain value above 40 inches in a day or below 0 is junk and should be ignored. | Pattern 5 | Low. The bound is a sanity guard against a malformed response, not a product rule. |

All other claims in this document were verified or cited.

## Open Questions (RESOLVED)

1. **Should the Today screen also say "Offline — weather from …"?**
   - What we know: D-15 puts the note "next to the ↻ button", which exists only on the Lawn screen. Today's weather card is a tappable summary with no refresh control.
   - What's unclear: whether Today should show anything when its forecast is stale.
   - Recommendation: Lawn only, as D-15 reads. `wxGlance` returns `null` when today is not in the cache, which hides the card on its own after a long outage.
   - **Resolved:** Lawn only (11-01; UI-SPEC Open Question 3).

2. **Rows have no location.** Moving the saved location rewrites recent rows (Pitfall 7, A4). Accept for now; a `lat`/`lon` pair per row would be a schema decision for a later phase. **Resolved:** accepted, with no location on rows (11-02, A4).

3. **Toast and snapshot-ring noise from daily rain syncs (A5).** Decide during planning whether to suppress; not required for correctness. **Resolved:** the noise is accepted, not suppressed (11-02 T-11-16, 11-05 A5).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | `npm test`, csp scripts | ✓ | v24.15.0 | — |
| git | REPO-01 and CRLF tests, commits | ✓ | present | — |
| `TZ=America/Chicago` | The frozen-clock suite | ✓ when passed explicitly | — | CI sets it in `.github/workflows/deploy.yml` (L27); pass it inline locally |
| `api.open-meteo.com` | Live check of the response shape | ✓ (reachable from here) | v1 | The harness injects a fake response; tests never need the network |
| Ian's phone | Success criterion 5 and the 🌧 look (Week in Review works in November; 💧 and cool-day holds need an off-season stub or April) | manual | — | Automated checks carry the rest |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** none. No package, service or tool is missing.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Plain Node script, `ok(name, cond, extra)`; the app loads into a `vm` through `test/harness.js` `loadApp()` |
| Config file | none (`package.json`: `"test": "node test/app.test.js"`) |
| Quick run command | `TZ=America/Chicago node test/app.test.js \| grep -E "FAIL\|LAWN"` |
| Full suite command | `npm run csp:hash && npm run csp:check && TZ=America/Chicago npm test` |
| Baseline at research time | `1250 passed, 0 failed, 2 skipped`, about 8 s |

The runner has no name filter, so **put the requirement ID in every new `ok()` label** (`LAWN-01: …`). That makes the quick command above isolate this phase.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LAWN-01 | High 54°F → water held, hard, text names the high; 60°F exactly → scheduled as before; a `null` high is not a cool day; Override still waters | unit | `npm test` (labels `LAWN-01:`) | ❌ Wave 0 (new block in `test/app.test.js` using `setup()` and `hiByOffset`) |
| LAWN-02 | Collection declared last with unused label; `collectionProblems()` clean; migration 20 creates `[]`, rewrites no row, idempotent, never downgrades; stale-device delete replay (both directions) and replay-again; `validateBackup` refuses `rainLog:'x'`, accepts an older backup; declaration-alone proof; export section derives | unit | `npm test` (labels `LAWN-02:`) | ❌ Wave 0 (copy the sleep block, L1353-1500) |
| LAWN-02 | A fetch adds one row per finished day, never today; unchanged amount writes nothing and schedules no push; changed amount updates and re-stamps; tombstone not revived; `DB.updatedAt` unchanged; `spyPushes` count is 1 for a changed batch and 0 for none; never `save()` | integration (injected `opts.fetch`) | `npm test` (`LAWN-02:`) | ❌ Wave 0 |
| LAWN-02 | The pushed blob carries the rows, the stale device does not flip a `lawnLog` day, and no `set()` outside the transaction | integration (`fakeCloud`, L2761) | `npm test` (`LAWN-02:`) | ❌ Wave 0 |
| LAWN-03 | 0.42 → "🌧 0.42"", 0.1 → shown, 0.099 → no mark but row kept, today never marked; off-season Lawn history hidden | unit (HTML) | `npm test` (`LAWN-03:`) | ❌ Wave 0 |
| LAWN-04 | 💧 appears on exactly one day, the first allowed due day; skips a day with chance ≥ 60 and a day with own rain ≥ `rainSkip` (0.3 summer; 0.5 when `lawnSeason` is overridden to spring); skips the wrong-parity day; none if no day qualifies; "wet" is ☔ and 🚜/💧 can share a cell; Today's card and heads-up agree with the strip | unit (HTML + `nextWaterDay`) | `npm test` (`LAWN-04:`) | ❌ Wave 0 |
| LAWN-05 | Tags 🚜 Mowed, 💧 Watered, 🌧 0.42" on the right days; explicit `false` and `overrideWater` do not render; a soft-deleted rain row does not render; all year (override `lawnSeason` to `null`) | unit (HTML) | `npm test` (`LAWN-05:`) | ❌ Wave 0 |
| LAWN-06 | Offline: Care → Lawn and Today each make exactly one fetch over 40 ticks; failure then render does not re-fire; `WXFAIL.retryAt = 0` allows one more; success resets; a non-OK response backs off; ↻ and Retry bypass the gate; off-season Today fetches (D-12); the last forecast stays with "Offline — weather from …"; no cache shows "Couldn't load weather" + Retry; today-missing cache shows no forecast, not a mislabeled day | async | `npm test` (`LAWN-06:`) | ❌ Wave 0 |
| LAWN-07 | The harness `fetch` settles (rejects on a macrotask), counts calls and accepts `opts.fetch`; no instance in the whole run exceeds the call cap | harness + backstop | `npm test` (`LAWN-07:`) | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run csp:hash && npm run csp:check && TZ=America/Chicago npm test` (about 10 s; every code task edits the inline script)
- **Per wave merge:** same
- **Phase gate:** full suite green on the tip, then Ian's phone check

### Wave 0 Gaps
- [ ] `test/harness.js`: counting macrotask-rejecting `fetch`, `opts.fetch`, `__fetchCalls`/`__fetchUrls`, `makeWx({ pastDays })`, exports for `WXFAIL` and each new function; rewrite the stale comment at L91-95.
- [ ] `test/app.test.js`: add `rainLog:20` to `INTRODUCED_AT` (L1875); retarget the "last entry" check (L1698); replace the three `19` literals (L8398, L8511, L10365); add new names to `REQUIRED_EXPORTS` (L190-206); add a tail assertion on the fetch-call backstop.
- [ ] `test/fixtures/merge-golden.json`: regenerate with `WRITE_MERGE_GOLDEN=1 node test/app.test.js` after the SCHEMA bump, then run `npm test` plain.
- [ ] New `LAWN-xx` blocks as mapped above.
- Framework install: none.

### Manual-only (Ian's end-of-phase check on the phone; `human_verify_mode` is end-of-phase)
1. In November the scheduler is off, so check what is live: open Week in Review (Train → History) and confirm 🌧 on recent wet days with two decimals, none on dry days. The fetch runs all year now, so rows exist after one Today visit.
2. Put the phone in airplane mode, open Today and Care → Lawn: no spinning, "Offline — weather from …" on Lawn, then turn the network back on and confirm it refreshes.
3. Check the second device receives the rain rows (Settings → Cloud Sync, then Week in Review there).
4. The 💧 outlook and cool-day hold cannot be seen until April; the automated tests carry them. If Ian wants a live look sooner, that needs a temporary season override and is not part of this phase.

## Security Domain

`security_enforcement` is enabled in `.planning/config.json` (ASVS level 1, block on high). [VERIFIED: config.json]

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Unchanged (Firebase email/password). |
| V3 Session Management | no | Unchanged. |
| V4 Access Control | yes (unchanged) | `firestore.rules` gates the per-user document; `rainLog` lives inside the existing blob string, so no rule change. Do not add a new collection or document. |
| V5 Input Validation | yes | Validate the Open-Meteo payload before writing a synced row (array shape, `^\d{4}-\d{2}-\d{2}$` date, finite number in 0..40). Coerce `+row.inches` and test `isFinite` on read; a hand-edited backup can put anything in the field because `validateBackup` checks shape only. `esc()` every interpolation. |
| V6 Cryptography | no | None. |
| V13 API and Web Service | yes | One allowed host (`api.open-meteo.com`) already in `connect-src` [VERIFIED: index.html line 5 `connect-src … https://api.open-meteo.com https://geocoding-api.open-meteo.com`]. No new host, so no CSP policy change, but the inline script changes, so `npm run csp:hash` is mandatory. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malformed or hostile third-party JSON becomes a synced row | Tampering | Shape, regex and numeric bounds in `recordRain`; rows are plain objects in a list keyed by a validated date string, so no object-key or prototype-pollution path exists. |
| Hand-edited or imported backup carries a hostile `inches` or `date` | Tampering / XSS | Reader coerces to a number and renders only `toFixed` output, through `esc()`; the date is never placed into an attribute. |
| Stale device overwrites a newer device's `lawnLog` through a rain write | Tampering | Quiet push never bumps `updatedAt`; control run proves `save()` would have. |
| A fetch loop hammers a rate-limiting API (HTTP 429) | Denial of service | Backoff to 60 minutes; non-OK counts as failure (WR-01). |
| Stale inline-script hash blanks the app | Denial of service | `npm run csp:hash` before every commit; CI `csp:check`. |
| Rain write from an unreconciled device | Tampering | `pushNow` refuses until `SYNC.reconciled`; signed-out devices never push. |

## Sources

### Primary (HIGH confidence)
- `index.html` (this worktree), read this session: L498 `SCHEMA`; L540-548 `COLLECTIONS`; L615-667 `MIGRATIONS` and `ensureCollectionDefaults`; L843-872 `isLive`, `touch`, `liveOf`; L922-937 `saveLocal`, `save`; L1710-1716 router `onRender`; L1758-1768 `render`; L1778-1795 `wxGlance`, `rainTiming`; L2615-2680 `renderWeekReview`; L3494-3543 weather fetch; L3558-3561 `SEASON_RULES`; L3628-3687 `mowVerdict`, `lawnStatus`; L3709-3774 `mowForecast`, `mowMark`, `mowOutlookHTML`; L3778-3840 `setLawnLog`, `nextDueDay`, `cLawnCard`; L3897-3970 `lawnHistory`, `viewLawn`; L4040-4062 `exportRows`; L4170-4210 `validateBackup`; L4567-4585 `mergeUnion`; L4670-4700 `collectionProblems`; L4755-4793 `mergeDateMap`, `mergeCollections`; L4933-4966 `mergeDB`; L5076-5110 `adoptMerged`; L5162-5213 `pushNow`, retry, `schedulePush`; L5577 `fetchWeather` action.
- `test/harness.js` (full), `test/app.test.js` (L1-140, L205-440, L1353-1500, L1560-1720, L1860-1980, L2553-2600, L2700-2830, L4220-4260, L5240-5330, L6139-6165, tail), `docs/adding-a-collection.md` (full), `CLAUDE.md`, `11-CONTEXT.md`, `REQUIREMENTS.md`, `ROADMAP.md` Phase 11, `04-REVIEW.md` WR-01/WR-05, Phase 10 `10-RESEARCH.md` and `10-VALIDATION.md` (format only).
- Prototypes in the session scratchpad (`proto/`, copies of the repo; the worktree itself is unmodified): macrotask-stub full-suite run (1250 passed), `loop.js` (41 → 1 fetches), `quiet.js` (quiet-push merge, control, tombstone replay).
- Live Open-Meteo response for a neutral coordinate (`past_days=14`, 21 daily and 504 hourly entries, three-decimal inches).

### Secondary (MEDIUM confidence)
- https://open-meteo.com/en/docs: `past_days` 0-92, archived forecasts, daily is a 24 h aggregation from hourly with `timezone=auto` boundaries.
- https://firebase.google.com/docs/firestore/quotas: maximum document size 1 MiB.

### Tertiary (LOW confidence)
- Android `online` event reliability (A1): training knowledge only, covered by the phone check.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH. No packages; the stack is the repo itself.
- Architecture: HIGH. The merge, quiet-push and loop claims were executed, not only read.
- Pitfalls: HIGH for the code-derived ones (1-8, 10); MEDIUM for Pitfall 9 (model-versus-gauge accuracy rests on the API docs).

**Research date:** 2026-11-11
**Valid until:** 2026-12-11 for the code facts (any phase landing before this one in `index.html` would move line numbers, not the design); the Open-Meteo parameter facts are stable.
