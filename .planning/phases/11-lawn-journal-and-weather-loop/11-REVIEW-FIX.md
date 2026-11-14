---
phase: 11-lawn-journal-and-weather-loop
fixed_at: 2026-11-13T00:00:00Z
review_path: .planning/phases/11-lawn-journal-and-weather-loop/11-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 11: Code Review Fix Report

**Fixed at:** 2026-11-13
**Source review:** .planning/phases/11-lawn-journal-and-weather-loop/11-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6 (fix scope: all)
- Fixed: 6. IN-01 is a documentation fix: the behaviour is accepted and unchanged.
- Skipped: 0

**Where verification ran:** in the main checkout of the session's harness worktree
(`.claude/worktrees/bold-mcclintock-f1c7e4`, branch `claude/bold-mcclintock-f1c7e4`). The caller's
binding constraint was to work on that branch in that worktree, so the fixer did not create a
nested `gsd-reviewfix/*` worktree, and there is no recovery sentinel or cleanup tail to run. Every
number below can be reproduced from this tree with `npm test`.

**Verification:** after each fix commit, `npm run csp:hash` ran (every fix but the test-only parts
touched the inline script), then `npm test` ran green. The final run: **1439 passed, 0 failed,
2 skipped** (the baseline was 1425). `npm run csp:check` passes. Each new regression check was shown
to fail with only the fix reverted: the fixed `index.html` was copied to the scratchpad, the fix was
removed or `HEAD:index.html` was written over it, the named check went red, and the scratchpad copy
was restored. The reviewer's repro scripts 1–3 now report the fixed behaviour. Repro 4 (IN-01) still
reports the accepted behaviour.

## Fixed Issues

### WR-01: The droplet and the "next" line invent a watering day past the cached forecast

**Files modified:** `index.html`, `test/app.test.js`
**Commit:** 81f0f8f
**Applied fix:** I applied the reviewer's fix to both projections. `nextWaterDay()` and
`nextDueDay()` now return null at the first in-season day the cached forecast does not cover
(`!s.havewx`), so they stay in agreement (D-08), and nothing is named past the forecast (D-07).
Today's own card (`lawnStatus(0)`) is unchanged. `mowForecast()` already returns null when today is
not in the cache, so stopping at k = 0 cannot hide a strip.
**Regression checks:** "Phase 11 WR-01 (D-07)" uses a cache built for yesterday with every covered
day at 70%. It asserts that `nextWaterDay`, `nextDueDay('water')` and the outlook's water line are
all silent, and that `lw3Agree` is empty. It goes red without the fix: next 6, nextDue
`{"off":6,"label":"Thu"}`, and the water line present. The guard "Phase 11 WR-01 guard" checks that
the last covered day (day 4) is still named on every surface. It passes both before and after the
fix.
**No existing test** called `nextDueDay` with `DB.wx = null`. The only `nextDueDay` check outside
Phase 11 (line 383) uses a full forecast.

### WR-02: A weather fetch that lands re-renders whatever tab is open

**Files modified:** `index.html`, `test/app.test.js`
**Commit:** baeb5a3
**Applied fix:** `fetchWeather` now calls `render()` at start and at settle only while
`weatherScreenShowing()` (Today or Care → Lawn), as the reviewer suggested.
**Regression check:** "Phase 11 WR-02" counts renders through the vm global. It starts a fetch on
Today, switches to Train → Log, and lets the fetch settle. It asserts zero renders after the switch,
with the cache written. Without the fix it goes red with `renders: ["train"]`. The guard checks that
a fetch settling on Care → Lawn still renders that screen.
**Note for a human:** Week in Review (on a history screen) also shows saved rain rows. When a fetch
lands there, it no longer redraws, so a newly recorded rain row appears on the next render. This
matches the reviewer's premise that only Today and Lawn read `DB.wx`, and it also protects Week in
Review's inline journal textarea from a redraw while Ian types.

### WR-03: Coming back online away from a weather screen leaves the backoff armed

**Files modified:** `index.html`, `test/app.test.js`
**Commit:** cf66fec
**Applied fix:** `retryWeather()` returns early with no failure. On a weather screen it fetches at
once, as before. Anywhere else it sets `WXFAIL.retryAt = 0`, so the next visit to Today or
Care → Lawn retries through `maybeFetchWeather`. `WXFAIL.n` is kept, so the offline note stays until
a fetch succeeds. I corrected the comment above `weatherScreenShowing()`, because it had claimed the
old code already behaved this way. D-14 is still honoured: no fetch and no render happen on
Train → Log, and the existing "online on Train → Log makes no fetch" check still passes.
**Regression check:** "Phase 11 WR-03" runs three failures, which leave a 60-minute wait. Then it
goes online on Train → Log (no fetch), visits Care → Lawn, and expects exactly one fetch that
succeeds. Without the fix it goes red with `after: 0, n: 3, cached: false`. The guard checks that
going online with no failure leaves the hourly gate alone.

### IN-01: "Tombstones stay tombstones" holds only on the device that has the tombstone

**Files modified:** `index.html` (comment only)
**Commit:** 0a7a720
**Applied fix:** This is a documentation fix. The behaviour is accepted. `recordRain`'s comment now
says the tombstone guarantee is device-local. It explains why a newer live row from a device that
never saw the tombstone wins under `mergeUnion`'s newest-action-wins rule. It says why this is
accepted: D-04 gives rain no delete path, so a tombstone can only come from a hand-edited backup. It
also says what a future rain delete or correction feature must change first: deletion precedence in
the merge for this collection, as `exMerge` tombstones have.
**Why not the code change:** giving a tombstone precedence for `rainLog` means a new merge kind in
the registry. That would change `mergeDB`, the golden fixture and `collectionProblems`, and it would
need three-replica law tests (overlay #97). It would also contradict the project-wide
newest-action-wins design that `mergeUnion`'s own comment defends. D-01 rates changes to how rain
rows sync as costly to reverse. The stale-device replay tests (D-04, lines ~11716–11728) are
untouched and still pass, because there the tombstone is the newer action.
**Regression check:** none new. A comment-only change has nothing that can go red without it. The
device-local guarantee the comment now states is already pinned by "D-04: a soft-deleted rain row
stays deleted: a fetch never revives it or adds a second live row for its date". Repro 4 still shows
the accepted cross-device result (a live row at 0.42).

### IN-02: Week in Review and Lawn history disagree on a non-boolean lawn flag

**Files modified:** `index.html`, `test/app.test.js`
**Commit:** e8f715d
**Applied fix:** I took the direction D-13 sets. A new helper,
`lawnFlag(day, key) => !!day && typeof day==='object' && day[key]===true` (grepped first; the name
was unused), is now the only way a `lawnLog` flag is read. It covers Week in Review, the
`lawnHistory` pills and their override asterisk, `daysSinceLawn`, `lawnStatus`'s
`overrideWater`/`overrideMow`, the card's Mark watered/Mark mowed buttons, `toggleLawnLog`,
`logLawnPastDate` and `toggleLawnOverride`. Everything now agrees with Week in Review and with the
export's `dayFlagRows` (`=== true`).
**Found by the check:** the review named three readers (Week in Review, the history pills, and
`daysSinceLawn`). Six more sinks read the same fields as truthy: the overrides in `lawnStatus`, the
pill's override asterisk, the card's button state, `toggleLawnLog`'s current value (a stored `'yes'`
toggled to `false`), `logLawnPastDate`'s "already logged" check, and `toggleLawnOverride`.
**Regression checks:** "Phase 11 IN-02 (D-13)" stores `{ mowed:'false', watered:1 }` and today's
`{ overrideWater:'false', overrideMow:1, watered:'yes' }`. It asserts that every reader says "not
logged". A second check asserts that tapping Mark watered and using the date picker log over the
junk values. Both go red without the fix. The guard "an explicit true still reads as logged in every
reader" passes both before and after. The existing D-13 check, which stores `{ mowed:'false',
watered:1 }`, already encoded this direction and is unchanged. The app itself only ever writes
booleans (`setLawnLog` stores `!!on`), so only hand-edited backups are affected.

### IN-03: `rainByDate` accepts non-number amounts that `recordRain` would refuse

**Files modified:** `index.html`, `test/app.test.js`
**Commit:** de5afac
**Applied fix:** `rainByDate` no longer coerces the amount:
`typeof v !== 'number' || !isFinite(v) || v < 0 || v > RAIN_SANE_MAX_IN` skips the row, as the
reviewer suggested. **Extended beyond the review:** with a strict reader, a stored `'0.42'` would stay
hidden forever, because `recordRain` compared `+row.inches !== inches`, saw 0.42 equal to 0.42 and
never rewrote it. `recordRain` now compares strictly (`row.inches !== inches`), so the next fetch
replaces a non-number amount with the real reading and `touch()`es it. D-03 still holds: an
unchanged numeric amount writes nothing.
**Regression checks:** three checks cover a stored `true`, `'0.42'` and `[0.42]`. Each must be
refused by `rainByDate` and show in neither Lawn history nor Week in Review. These go red without the
fix: `true` read as 1, and the others as 0.42. "A fetch replaces a stored '0.42'…" goes red when only
the `recordRain` half is reverted. The D-03 guard checks that an unchanged numeric amount writes
nothing and still shows; it passes both before and after.

---

_Fixed: 2026-11-13_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
