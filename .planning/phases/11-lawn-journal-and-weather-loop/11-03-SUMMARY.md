---
phase: 11-lawn-journal-and-weather-loop
plan: 03
subsystem: lawn scheduler
status: complete
tags: [lawn, watering, weather, outlook, LAWN-01, LAWN-04]
requires:
  - "11-01: harness fetch counting, LAWN section helpers"
  - "11-02: SCHEMA 20, rainLog (untouched here)"
provides:
  - "COOL_DAY_F and WET_CHANCE_PCT (60, 60)"
  - "waterVerdict(o): the watering decision in one place, with documented precedence"
  - "nextWaterDay(): the one droplet day, 0..6 or null"
  - "the Lawn outlook: umbrella for wet, droplet pair cells, a water line, a footnote built from the constants"
  - "test helpers lwStrip, lw3Next, lw3Drops, lw3Water, lw3SetHigh, lw3Agree, lw3Cell; lw3App instance"
affects: [index.html, test/harness.js, test/app.test.js]
tech-stack:
  added: []
  patterns: ["one verdict function per lawn task (mowVerdict, waterVerdict), read through lawnStatus()"]
key-files:
  created: []
  modified: [index.html, test/harness.js, test/app.test.js]
decisions:
  - "waterVerdict returns why ('both' | 'amount' | 'chance') for a wet hold, so lawnStatus picks the copy without repeating the 60% test"
  - "Forecast values reach the verdict through finiteWx(): a finite number or null. A null, string or non-finite high is never a cool day"
  - "Two 11-01 checks that read the old kicker text were retargeted to 'Lawn outlook' (the rename is the plan's)"
metrics:
  duration: "~40 min"
  completed: 2026-11-13
actuals:
  tokens: 6300
  tasks: 3
  commits: 4
---

# Phase 11 Plan 03: One Watering Verdict and the Lawn Outlook Summary

Watering is now decided by one function, `waterVerdict`. It holds on a cool day (forecast high under 60°F,
rounded) and on a day whose own forecast is wet (rain at the season's rainSkip, or a 60% chance). The outlook
puts one droplet on the first day the card itself would water, and it is renamed the Lawn outlook. Wet days
show an umbrella, and the droplet pairs with a mow, wet or hot mark when they fall on the same day.

## Suite lines

- Pre-plan: `1331 passed, 0 failed, 2 skipped` (CSP `sha256-oFcssEN1b1CQLXHsOJYESN7MJOdPynhgLEXBR6icV5Q=`).
- After Task 1: `1332 passed, 0 failed, 2 skipped`.
- After Task 2: `1373 passed, 0 failed, 2 skipped`.
- Post-plan: `1390 passed, 0 failed, 2 skipped`. `npm run csp:check` reports
  `CSP hash OK sha256-4Qugf6I+C/pWn8WRDGyIoeq73RsQ1zH3xDUGRMzYEzA=`.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (tracer) | waterVerdict → lawnStatus → nextWaterDay → the droplet cell | b60d7a7 | index.html, test/harness.js, test/app.test.js |
| 2 | Every edge: 60°F, 60%, rainSkip in summer and spring, missing highs, Override, precedence, agreement | 667fe0c | test/app.test.js |
| 3 | The Lawn outlook: umbrella, pair cells, water line, footnote | e9152e6 | index.html, test/app.test.js |

## RED lines

Task 1 (before any index.html change):

```
FAIL  LAWN-01/04 tracer: a cool day holds watering and the outlook marks Sunday  → {"text":"Time to water — before noon or after 6pm (last 7 days ago)","hard":false,"recommend":true,"next":"nextWaterDay is not exported","nextDue":{"off":2,"label":"Sun"},"drops":[0,0,0,0,0,0,0],"card":false}
```

The tracer goes through `lw3Next()`, so the missing export failed one check by name and did not crash the
run. RED here was more than a missing symbol: the text, hard flag, droplet count and card all failed too.

Task 3 (11 FAILs before the outlook edit, quoted in short):

```
FAIL  D-06: the strip's kicker reads Lawn outlook
FAIL  D-06: a wet day that is not the water day shows UMBRELLA labelled wet, with no droplet  → {"mark":"💧",...,"label":"wet"}
FAIL  D-08: with a wet mow day in the strip, the strip, the card, the heads-up and the next line still agree  → ["droplets in the strip: 2"]
FAIL  D-06: a mow day that is also the water day pairs its mark with the droplet at 12px, nowrap, labelled both  → {"mark":"💧","label":"water",...}
FAIL  D-06: a wet mow-blocked day that is also the water day pairs its mark with the droplet at 12px, nowrap, labelled water
FAIL  D-06: a hot mow-blocked day that is also the water day pairs its mark with the droplet at 12px, nowrap, labelled water
FAIL  D-07: the water line reads Expect to water Sunday (Aug 9), after the mow line, with the drop icon
FAIL  D-07: on a watering day the line reads today, with no date
FAIL  LAWN-04: with no mow ever logged the strip stays hidden and the water line still renders
FAIL  D-06: the summer footnote states the cool-day, rain, chance and heat rules  → ["high under 60°F","rain of 0.3\"","60% chance"]
FAIL  D-06: the fall footnote states rain of 0.5" and the heat window
```

The highlight check passed before the change, as planned, and a mutation proves it (below).

## Mutation tables

Each mutation was applied by `mutate.js` in the scratchpad, which asserts that its anchor matches exactly
once. Each was applied to the committed task state and restored by `cp` from a scratchpad copy, and `cmp`
confirmed the restore. Every mutated run also shows the two expected `CSP-01` stale-hash FAILs, which are
left out below.

**Task 1**

| Mutation | Check that went red | Mishandled input | Restore |
|----------|---------------------|------------------|---------|
| Delete the cool test from waterVerdict | `LAWN-01/04 tracer: a cool day holds watering and the outlook marks Sunday` (text "Time to water…", next 0, droplet on day 0) | high 54°F today | restored from scratchpad copy |

**Task 2**

| Mutation | Check that went red | Mishandled input | Restore |
|----------|---------------------|------------------|---------|
| Compare the unrounded high (`o.highF < COOL_DAY_F`) | `LAWN-01: a high of 59.5°F waters as before` → "Cool day (high 60°F) — hold off" | high 59.5 | restored from scratchpad copy |
| Drop the typeof/finite guard (`highF = havewx ? num(HI[ti]) : null`) | `LAWN-01 (Pitfall 4): a high of null …` → "Cool day (high 0°F)"; also the string '54' and -Infinity checks | a null high, read as 0°F | restored from scratchpad copy |
| Chance test `> WET_CHANCE_PCT` | `LAWN-04: a 60% chance holds, hard`; also `D-07: cool on day 0, a 60% chance on day 2 → … 4` (got 2) | a 60% chance | restored from scratchpad copy |
| Cool test moved above the rain-tomorrow test | `D-08: rain tomorrow beats a cool day` → "Cool day (high 54°F) — hold off" | 0.6" tomorrow with a 54°F high | restored from scratchpad copy |
| nextWaterDay starts at k = 1 | `D-07: plain weather, watered a week ago → … 0` (got 2); `D-08: … agree` → ["card recommend: true","Mark watered on the card: true"]; `D-08: when nextWaterDay() is 0, Today's card holds … Mark watered` | a watering day today | restored from scratchpad copy |

**Task 3**

| Mutation | Check that went red | Mishandled input | Restore |
|----------|---------------------|------------------|---------|
| Highlight the water day instead of `f.next` (`const target = d.k===wk;`) | `D-06: the next-mow highlight sits on exactly one cell, the next mow day, never the water day` → {"lit":[2],"mow":5,"water":2} | water day 2, mow day 5 | restored from scratchpad copy |
| Drop the 12px nowrap span from the pair | all three `D-06: … pairs its mark with the droplet at 12px, nowrap …` checks (mark "🚜💧", "☔💧", "🔥💧", pairStyle null) | a mow, wet or hot day that is also the water day | restored from scratchpad copy |

## waterVerdict precedence comment, as committed

```js
/* ── The watering decision, in ONE place ─────────────────────────────────────────────────────
   Today's card, tomorrow's heads-up, nextDueDay('water') and the outlook's droplet all read this
   through lawnStatus(), so they can never disagree about which day is a watering day. Precedence:
   override > watered recently > wet forecast for the day itself > rain already fell (3 days) > rain
   tomorrow > cool day > the odd/even city rule > due. A decision Ian made beats everything. The rain
   holds beat the city rule because they say more. The day's own forecast is tested before the 3-day
   total, which already contains it, so a future day never reads "Rained recently". A cool day says
   more than "it's an even date". The cool test reads the high the way the weather card shows it,
   rounded to a whole °F, so a hold never says "high 60°F". A missing, non-numeric or non-finite
   value arrives as null and is never a hold: an absent forecast must not stop the watering. */
const COOL_DAY_F = 60, WET_CHANCE_PCT = 60;
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Two 11-01 checks read the old kicker text**
- **Found during:** Task 3
- **Issue:** Planner probe 10 said nothing in the suite asserted `Mowing outlook`, but 11-01 later added
  `Pattern 8: a cache without today shows no temperature and no Mowing outlook …` and the D-15 `outlook`
  helper, which read the kicker. The rename turned 5 checks red.
- **Fix:** Retargeted both to `Lawn outlook`, which index.html renders only in the kicker. The negative
  half of Pattern 8 is still not vacuous.
- **Files modified:** test/app.test.js
- **Commit:** e9152e6

**2. [Rule 1 - Bug] The umbrella was written as the literal glyph, not the escape**
- **Found during:** Task 3 acceptance greps
- **Issue:** `'☔'`, typed into an Edit call, landed in index.html and test/app.test.js as the literal ☔.
  The braced `'\u{…}'` escapes survived. Behaviour was identical, so only the `grep -c "u2614"` acceptance
  check (0, should be 1) caught it.
- **Fix:** A scratchpad node script rewrote the literal as the escape, asserting one match per file. The
  CSP hash was regenerated and the suite re-run green before the commit.
- **Files modified:** index.html, test/app.test.js
- **Commit:** e9152e6

**3. [Fixture choice] The D-07 chance fixture uses mowedDaysAgo 2, not 3**
- With a 3-day-old mow, day 2's 60% chance is also a wet mow day. Before Task 3 swapped the wet mark to
  the umbrella, its 💧 would have doubled the strip's droplet count. A 2-day-old mow makes day 2 "too soon".
  Task 3's own fixtures cover a wet mow day beside the droplet, and the agreement check runs there too.

### Notes

- The tracer gate: `workflow.auto_advance` is false, but the plan has no designed stops and the phase's
  `human_verify_mode` is `end-of-phase`. The tracer's verify was re-run end to end (`1332 passed, 0 failed`,
  CSP OK) before expansion, and execution went on, as 11-01 and 11-02 did. 11-05 owns the phone check.
- Under the frozen clock (Fri 7 Aug, an odd date), k = 1 is always held by the city rule, so the "heads-up
  never says Watering tomorrow when nextWaterDay() is not 1" half of `lw3Agree` can't be falsified by a
  fixture here (planner probe 7). Its other halves are mutation-proved.
- The existing `── watering ──` checks and `water text — watered today` pass unchanged. Every existing
  water string is byte-identical.

## Threat model

T-11-20 (null high read as 0°F): `finiteWx` guard, mutation-proved. T-11-21 (surfaces disagreeing):
`lw3Agree` over nine fixtures, with the nextWaterDay start mutation-proved. T-11-22 (Override ignored):
`D-09` check. T-11-23: hold copy is formatted numbers in `esc(r.text)`, as before. T-11-02: every
script-editing commit ran `npm run csp:hash` first, and `csp:check` is OK at HEAD. No new surface: no
data-action, CSS class, colour token or icon, and no hex in mowOutlookHTML.

## Known Stubs

None.

## Self-Check: PASSED
