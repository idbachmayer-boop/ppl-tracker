---
phase: 11-lawn-journal-and-weather-loop
plan: 02
subsystem: data / weather / sync / test-harness
status: complete
tags: [rainLog, collections, schema-20, weather, sync, quiet-push, LAWN-02]
requires:
  - "11-01: harness fetch that settles and counts, opts.fetch, LAWN section helpers lwTicks/lwRes/lwLawn, WXFAIL"
provides:
  - "COLLECTIONS.rainLog (last entry, label Rainfall, list keyed by date, sortBy date, soft)"
  - "SCHEMA 20 and MIGRATIONS[20] = ensureCollectionDefaults"
  - "recordRain(daily) → boolean and RAIN_SANE_MAX_IN = 40"
  - "fetchWeather at past_days=14 with the lat/lon guard and the quiet push (saveLocal + schedulePush)"
  - "harness makeWx({ pastDays }) (default 3); names recordRain, RAIN_SANE_MAX_IN"
  - "test helper lwRain19(tag, mtime); lwQuietPush(useSave)"
affects: [11-03, 11-04, 11-05]
tech-stack:
  added: []
  patterns:
    - "quiet push: a synced derived row is touch()ed, persisted with saveLocal(), sent with schedulePush() — never save()"
key-files:
  created: []
  modified: [index.html, test/harness.js, test/app.test.js, test/fixtures/merge-golden.json, CLAUDE.md]
decisions:
  - "Rain history lives in its own synced list collection rainLog ({ date, inches, mtime }), keyed by date, never in lawnLog"
  - "A synced derived row reaches the cloud through the quiet push (touch + saveLocal + schedulePush), so a stale device writing rain never moves updatedAt"
  - "Only finished days (date < todayISO() as text) are saved; amounts are numbers 0..40 in, rounded half-up to 3 decimals; an unchanged amount writes nothing"
metrics:
  duration: "~13 min"
  completed: 2026-11-13
  tasks: 3
  files: 5
estimate:
  tokens: 120000
actuals:
  tokens: 14500
  tasks: 3
  commits: 4
---

# Phase 11 Plan 02: Rain history in a synced rainLog, sent by a quiet push Summary

Each finished day's rainfall, at its exact amount, is now saved in a new synced `rainLog` collection.
One weather fetch (now `past_days=14`) fills all 14 finished days. The rows reach the cloud through
`schedulePush()` and pushNow's transaction, and `updatedAt` never moves, so a stale device that writes
rain can't win `lawnLog` or `mobilityLog`. SCHEMA is 20, migration 20 creates the empty list, and the
merge golden was regenerated in the bump commit.

## Suite lines and CSP

- Pre-plan: `1291 passed, 0 failed, 2 skipped`.
- Post-plan: `1331 passed, 0 failed, 2 skipped`. `npm run csp:check` reports
  `CSP hash OK sha256-oFcssEN1b1CQLXHsOJYESN7MJOdPynhgLEXBR6icV5Q=`.

## Commits

| Task | Commit | What |
|------|--------|------|
| 1 (tracer) | 1fe0de0 | rainLog entry, SCHEMA 20, migration 20, recordRain, fetchWeather at past_days=14 with the quiet push; makeWx pastDays; five retargets; tracer; golden regenerated |
| 2 | 5777a50 | The recipe checks: migration 20, replays, one row per date, sort, validateBackup, declaration alone, export |
| 3 | 667022f | The writer's rules, Pitfall 7, D-11, quiet push and its control, source check, CLAUDE.md sentence and its name check |

## Pre-retarget FAIL list (Task 1 step 7)

The first run after the index.html change, before any test edit, gave `1235 passed, 59 failed`:

- 53 `golden:` FAILs: 51 `golden: merge:*`, `golden: blank` and `golden: validate:newer app version` hash
  differences, plus `golden: random battery — 400 derived merges match the recorded legacy merges`.
  All were cleared by the regeneration (`Wrote 540 golden hashes`).
- The five planned retargets:
  - `SLEEP-04: sleep is declared once, as the last entry  → {"lastKey":"rainLog","sleepLineCount":1}`
  - `boot: introduced-at table knows rainLog  → "rainLog"`
  - `EQUIP-02/D-14: a schema-18 device boots into schema 19, … → {"schema":20,…}`
  - `EQUIP-02: an empty registry stays empty and still reaches schema 19  → {"ex":[],"schema":20}`
  - `D-09/D-23: validateBackup accepts the marker, … and SCHEMA stays 19  → {…,"schema":20}`
- One FAIL outside the list:
  `placement: every function value in COLLECTIONS is a hoisted function declaration  → ["sleep"]`.
  The cause was my own rewording of sleep's comment, not the retargets. See Deviation 1.

## Mutation tables

Each mutation was applied to index.html by an exact-once anchor script, from a scratchpad copy taken just
before, and restored by `cp` from that copy. `npm run csp:check` confirmed the hash matched again after each
one. The two `CSP-01` FAILs that every mutated run also shows are the expected stale-hash checks, and they are
left out below.

### Task 1

| # | Mutation | Check that went red | Mishandled input | Restore |
|---|----------|---------------------|------------------|---------|
| T1-M1 | fetchWeather calls `save()` in place of `saveLocal()` + `if(rainChanged) schedulePush();` | `FAIL  LAWN-02 tracer: a fetch saves every finished day, yesterday at 0.42, never today, with no updatedAt bump and one push  → {…"updatedAt":1786122000000,"storedUpdatedAt":1786122000000,"pushes":1}`, plus the second tracer check (`"updatedAt":1786122000000`) and LAWN-06's no-save check | A device at updatedAt 1000 writing rain | restored from scratchpad copy |

### Task 2

| # | Mutation | Check that went red | Mishandled input | Restore |
|---|----------|---------------------|------------------|---------|
| T2-M1 | `20:d=>d` | `FAIL  LAWN-02: a schema-19 device boots with an empty rainLog in the STORED blob and _schema 20  → {"schema":20}`, `FAIL  LAWN-02: migration 20 rewrites no existing row and gives a schema-19 blob an empty rainLog`, and `boot: schema 18/19 → every declared collection shaped  → "rainLog is not an array"` | A schema-19 blob with no rainLog key | restored from scratchpad copy |
| T2-M2 | rainLog `sortBy:'missing'` | `FAIL  LAWN-02: merged rain rows come back date-sorted, in both orders  → {"m1":["2026-08-03","2026-08-01","2026-08-02"],…}` | Rows 08-03 on one device, 08-01 and 08-02 on the other | restored from scratchpad copy |
| T2-M3 | rainLog `soft:false` | The suite goes red with exit 1, though no single check fails by name: the process dies at the earlier pre-existing recipe-probe export (test line 1796) with `Error: liveOf: rainLog is not a declared soft-delete list`. An isolated probe (harness `opts.transform`, one instance, no file edit) printed `intact | replay stillDeleted: true,true,true,true | Rainfall section present` and `mutated | replay stillDeleted: true,true,true,true | export threw: liveOf: rainLog is not a declared soft-delete list`. The merge keeps tombstones whatever `soft` says, so the replays stay green, and `liveOf` refuses the mutant. The LAWN-02 export check now catches that throw, so it names the FAIL if it is ever reached | A tombstoned row against a live stale copy, then the export | restored from scratchpad copy |

### Task 3

| # | Mutation | Check that went red | Mishandled input | Restore |
|---|----------|---------------------|------------------|---------|
| T3-M1 | Drop `else if(row.deletedAt) continue;` | `FAIL  D-04: a soft-deleted rain row stays deleted: a fetch never revives it or adds a second live row for its date  → [{"date":"2026-08-05","inches":0.5,"deletedAt":5,"mtime":1786122000000}]` | A deleted dayOff(-2) row against a new amount 0.5 | restored from scratchpad copy |
| T3-M2 | Drop `\|\| !(date < today)` | `FAIL  D-03: the first call saves the 14 finished days, none today or later, and a dry day is a row at 0  → {"first":true,"n":21,…}` (also the tracer, D-11 and the key-subset check) | Today's 0.3 and the forecast days | restored from scratchpad copy |
| T3-M3 | Always touch a live row (`else {` in place of the amount comparison) | `FAIL  D-03: a day already saved with the same amount is not rewritten (returns false, every mtime stays 1)  → {"again":true,"mtimes":[1786122000000,…]}` and `FAIL  D-03: a second fetch whose amounts all match schedules no push …  → {"calls":2,"pushes1":1,"pushes":2,…}` | 14 rows at mtime 1 with matching amounts | restored from scratchpad copy |
| T3-M4 | Drop the lat/lon guard (`const rainChanged = recordRain(data.daily);`) | `FAIL  LAWN-02: when the saved location changes while a fetch is in flight, that response writes no rain rows (Pitfall 7)  → {"calls":1,"rows":[{"date":"2026-07-24",…` | The location moved mid-fetch | restored from scratchpad copy |
| T3-M5 | `save()` in place of the saveLocal + schedulePush pair | `FAIL  D-01: a stale device that writes rain and pushes keeps the cloud's lawnLog and mobilityLog days and updatedAt 2000, and adds the rain rows  → {"writes":1,"lawnDay":{"mowed":true,"watered":false},"mobDay":{"x":false},"updatedAt":1786122000000,…}`, plus the D-01 source check `→ ["fetchWeather"]` | The stale device at updatedAt 1000 against the cloud at 2000 | restored from scratchpad copy |
| T3-M6 | `isFinite(+v) && +v>=0 && +v<=RAIN_SANE_MAX_IN` in place of the `typeof v === 'number'` test | `FAIL  LAWN-02: an amount is saved only as a finite number from 0 to 40 … → {"got":[0,0,0.25,null,…],"expected":[null,null,null,null,…]}` | null, '' and '0.25' | restored from scratchpad copy |

## The CLAUDE.md check's RED line (Task 3 step 1)

`FAIL  D-01 rule: CLAUDE.md names recordRain and schedulePush, and both are functions in index.html  → [{"n":"recordRain","inDoc":false,"isFn":true},{"n":"schedulePush","inDoc":false,"isFn":true}]`

It was the only FAIL in that run (`1330 passed, 1 failed`).

## The CLAUDE.md sentence as committed

Appended to the "Derived data uses `saveLocal()`" paragraph:

> A derived row that must sync, such as the `rainLog` rows `recordRain()` writes from the weather fetch, is
> stamped with `touch()`, persisted with `saveLocal()`, and sent with `schedulePush()`, which merges through
> `pushNow`'s transaction; never `save()`, because the `updatedAt` bump would let a stale device win
> `lawnLog`.

## What was built

- **index.html**
  - The `rainLog` COLLECTIONS entry, last, exactly as the plan's first truth reads, with its one-line comment.
    Sleep's comment no longer claims sleep is the last entry.
  - `const SCHEMA = 20;` and `20:d=>ensureCollectionDefaults(d), // rain history (LAWN-02): …`.
  - `const RAIN_SANE_MAX_IN = 40;` and `function recordRain(daily)`, placed after maybeFetchWeather. It indexes
    every row, tombstones included, by date in an `Object.create(null)` map. It accepts a date only as a
    zero-padded `YYYY-MM-DD` string below `todayISO()`, and an amount only when `typeof v === 'number'`,
    finite and between 0 and 40, rounded with `Math.round(v*1000)/1000`. It adds `touch({ date, inches })`,
    leaves a tombstone alone, and updates a changed live row in place with `touch(row)`.
  - fetchWeather: `past_days=14`, the `rainChanged` lat/lon guard, one `saveLocal()`, then
    `if(rainChanged) schedulePush();`. The saveLocal comment is extended with the D-01 reasoning.
- **test/harness.js:** `makeWx({ pastDays = 3 })` drives both loops, and its header comment says so. `names`
  gains `recordRain` and `RAIN_SANE_MAX_IN`.
- **test/app.test.js:** REQUIRED_EXPORTS gains `recordRain`, and the five retargets landed. Three LAWN-02 blocks
  sit at the end of the LAWN section: the tracer, the recipe checks (with `lwRain19`), and the writer and
  quiet-push checks (with `lwQuietPush`). Both new top-level names were grepped first, and neither collides.
- **test/fixtures/merge-golden.json:** regenerated in commit 1fe0de0. 540 hashes, 452 lines changed.
- **CLAUDE.md:** the sentence above.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Sleep's reworded comment tripped the placement check**
- **Found during:** Task 1, step 7, in the pre-retarget run.
- **Issue:** The placement check finds COLLECTIONS function references with `:\s*ident\s*[,}\n]` over the
  whole literal, comments included. My first rewording ended a line with `No format: sleep`, which the check
  read as a reference to a function named `sleep`.
- **Fix:** Reflowed the comment so `No format: sleep rows are already flat.` sits on one line. The check is
  unchanged.
- **Files modified:** index.html. **Commit:** 1fe0de0.

**2. [Rule 2 - Missing check robustness] The export check would crash instead of failing by name**
- **Found during:** Task 2, the `soft:false` mutation.
- **Issue:** `liveOf` throws for a list that is not soft, so a top-level `buildMarkdownExport()` call kills the
  run.
- **Fix:** The LAWN-02 export check catches the throw and reports it as `threw` in a named FAIL. An earlier
  pre-existing check (test line 1796) still crashes first under that mutant. It is out of scope, and the run
  goes red either way.
- **Files modified:** test/app.test.js. **Commit:** 5777a50.

### Judgment calls

- **Tracer feedback gate.** As in 11-01: `auto_advance` is false, but the plan is `autonomous: true` with no
  designed stops, every `<verify>` is automated, `human_verify_mode` is `end-of-phase`, and the second-device
  check belongs to 11-05 Task 3. The tracer's verify was green (`1298 passed, 0 failed`, CSP OK) before
  execution went on, with no checkpoint.
- **D-04 tie and adjacency fixtures** put the newer `updatedAt` on the side whose amount should win. The
  adjacency fixture deliberately gives the higher `updatedAt` to the *older* mtime, so row mtime, not device
  recency, decides it.
- **Pitfall 7 check** runs `await a.fetchWeather()` from Settings, so no render-triggered refetch for the new
  location can write rows before the assertion.

## Known Stubs

None. No UI was added. 11-04 reads rainLog for the rain marks.

## Threat Flags

None. There is no new fetch host (the URL stays on api.open-meteo.com), no endpoint, action or remote-write
path. Every mitigation in T-11-10..T-11-17 has a check, each proved by a mutation above.

## Self-Check: PASSED

- Commits 1fe0de0, 5777a50 and 667022f exist on `claude/bold-mcclintock-f1c7e4`.
- `grep -c "^const SCHEMA = 20;" index.html` → 1; `20:d=>ensureCollectionDefaults(d)` → 1; `past_days=3` → 0;
  `past_days=14` → 1; `^function recordRain(` → 1; recordRain body `save\(|schedulePush` → 0; fetchWeather
  `if(rainChanged) schedulePush();` → 1; `function lwRain19` → 1; CLAUDE.md `recordRain` ≥ 1 and
  `schedulePush` ≥ 1.
- `git log -1 --format=%s -- test/fixtures/merge-golden.json` → `feat(11-02): save each finished day's
  rainfall in a synced rainLog, pushed quietly`.
- `npm run csp:check` OK, and `TZ=America/Chicago npm test` ends `1331 passed, 0 failed, 2 skipped`.
