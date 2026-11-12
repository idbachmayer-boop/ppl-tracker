# Phase 11: Lawn, Journal and Weather Loop - Context

**Gathered:** 2026-11-11
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers five things (LAWN-01..07):

- The lawn scheduler holds off watering on cool days.
- Each finished day's rainfall is saved, with its exact amount, in a new synced rain collection kept separate from `lawnLog`.
- The 7-day outlook marks the next watering day with 💧.
- Week in Review shows 🚜 Mowed, 💧 Watered and 🌧 rain.
- A failed weather fetch backs off instead of looping, and the test harness's `fetch` settles, so a loop fails the suite instead of hiding.

New capabilities are out of scope. The main one raised was editing a rain-gauge reading by hand; it is listed under Deferred Ideas.

</domain>

<decisions>
## Implementation Decisions

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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope
- `.planning/ROADMAP.md` § "Phase 11: Lawn, Journal and Weather Loop": goal, success criteria, and the Notes (collection recipe, SCHEMA 19 → 20, `INTRODUCED_AT`, the merge golden, why rain stays out of `lawnLog`).
- `.planning/REQUIREMENTS.md` § "Lawn, journal and weather loop (LAWN)": LAWN-01..07 wording.
- `.planning/v1.1-BRIEF.md`: the milestone brief these requirements came from.

### Adding a collection (mandatory recipe)
- `CLAUDE.md` § "Adding a new tracked thing": one `COLLECTIONS` entry placed last, the verbatim placement rule, SCHEMA and migration, the required tests, and "do not touch the exporter".
- `docs/adding-a-collection.md`: the worked example, the field-by-field contract, the hand-written UI pattern, the test walkthrough, and § "Registry validity" (regenerating `test/fixtures/merge-golden.json`).
- `CLAUDE.md` § "Rules that exist because breaking them cost real data": union merge, never `set()`; soft deletes; absence never means "off"; migrations `touch()` and persist; derived data uses `saveLocal()`.

### Weather loop origin
- `.planning/milestones/v1.0-phases/04-draft-goes-device-local/04-REVIEW.md`: WR-01 (the fetch → fail → render loop) and WR-05 (the harness `fetch` that never settles), closed by LAWN-06 and LAWN-07.

### Security and CSP
- `CLAUDE.md` § Conventions → "Content-Security-Policy": a new fetch host fails the suite. Staying on `api.open-meteo.com` needs no policy change. Any inline-script edit needs `npm run csp:hash`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `fetchWeather()` / `maybeFetchWeather()` (`index.html` ~3507–3524): the fetch, the hourly staleness check, and `weatherFetching`. The backoff and the rain-row write go here. `DB.wx` is already written with `saveLocal()`.
- `lawnStatus(dayOffset)` (~3652): today's watering and mowing recommendation. Its watering branch becomes the shared watering verdict (D-08).
- `mowVerdict(o)` (~3628): the model for "one decision in one place", with documented precedence.
- `nextDueDay(kind)` (~3811) and `mowForecast()` (~3709): projecting a verdict across the 7-day forecast.
- `mowOutlookHTML()` / `mowMark()` (~3752–3774): the strip that becomes the Lawn outlook (D-06).
- `lawnHistory()` (~3897): the 14-day list where 🌧 is added.
- `renderWeekReview()` (~2615): the `tags` array where 🚜, 💧 and 🌧 go.
- `touch()` (~844), `saveLocal()` (~922), `save()` (~931), `mergeDB()` (~4933).
- `SEASON_RULES` (~3558): `rainSkip` per season.

### Established Patterns
- `COLLECTIONS` registry (~line 541–547; `sleep` is currently last), plus `liveX()` filters and `validateBackup()`, all derived from it.
- `mergeDateMap` for `lawnLog` takes the whole inner object from the newer side, decided by `localNewer`. That is why the quiet push must not bump `updatedAt`.
- Router `onRender` hooks: Today (~1710) and Care (~1716) call `maybeFetchWeather`. Today's call is currently gated on `lawnSeason`.
- `data-action` delegation and `ACTIONS` thin wrappers. `esc()` on every interpolation.
- Theme tokens only (no hex). Phosphor icons through `ph()`. Emoji for logged and celebrated marks.

### Integration Points
- The test harness `test/harness.js:96` fetch stub (LAWN-07).
- `INTRODUCED_AT` boot table, `MIGRATIONS`, `SCHEMA` (498, currently 19).
- The "I am the last entry" test retargets from `sleep` to the new collection.

</code_context>

<specifics>
## Specific Ideas

- Lawn outlook strip preview Ian picked (illustrative; only the *next* watering day actually gets 💧 per D-07):
  ```
  Lawn outlook
   Today  Thu   Fri   Sat   Sun   Mon   Tue
    –     💧    ☔    🚜    –     –     –
        water  wet   mow
  ```
- History and journal preview Ian picked:
  ```
  Lawn history
   Sat, Nov 8   🌧 0.42"   [💧 Watered] [🚜 Mowed]
  Week in review
   Sat 11/8   🚜 Mowed  🌧 0.42"
  ```
- It is November, so the scheduler is off-season. The phone check for 💧 and cool-day holds needs test data or must wait until April. Rain marks (D-11) can be checked live now.

</specifics>

<deferred>
## Deferred Ideas

- Manual rain-gauge entry or correction (typing your own reading, or removing a day's rain). This is a new capability and belongs in the backlog.

</deferred>

---

*Phase: 11-lawn-journal-and-weather-loop*
*Context gathered: 2026-11-11*
