# Phase 4 — deferred items

Out-of-scope discoveries logged during execution. Not fixed in this phase.

## From 04-01

### The Lawn tab may re-fetch weather in a tight loop while offline

- **Found during:** 04-01 Task 1, while adding async test blocks.
- **Where:** `index.html`, `fetchWeather()` / `maybeFetchWeather()`.
- **What:** `fetchWeather()` sets `weatherFetching=false` and calls `render()` after a failed request.
  The Care → Lawn `onRender` calls `maybeFetchWeather()`, which sees the cache is still stale and calls
  `fetchWeather()` again. When `fetch` rejects immediately, which is what happens when the device is
  offline, this looks like an unbounded fetch → fail → render → fetch cycle for as long as the Lawn
  screen is open with a stale cache. Offline-first is a core promise of the app, so this is worth checking
  on a phone in airplane mode.
- **How it showed up:** in the harness, `fetch` rejected synchronously and the cycle ran entirely in
  microtasks, so the suite never exited once async checks let the event loop turn. The harness now uses
  a `fetch` that never settles (commit 27fd954), which fixes the suite, not the app.
- **Suggested fix:** don't retry within the same render cycle after a failure. For example, record
  `weatherFailedAt` and skip `maybeFetchWeather()` for a few minutes after a failed attempt.
