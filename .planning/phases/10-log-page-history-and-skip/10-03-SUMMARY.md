---
phase: 10-log-page-history-and-skip
plan: 03
subsystem: workout-log
status: complete
tags: [history, log-tab, router, scroll, strength, screen-only-state]
requires:
  - "10-01: skipTailHTML, the S2 skipped card, the lg* test helpers"
  - "10-02: skipNoteHTML inside the Last time element, lgLastTime's class-based locator, lgCase/lgTry"
provides:
  - "exerciseRecent, exhRowHTML, exhPanelHTML, toggleExHist, openExerciseChart, backToWorkout, landingY (index.html)"
  - "`let openExHist = -1, logReturn = null;`: screen-only Log tab state, reset at the five collapsedEx.clear() sites"
  - "the S3 Last time button and the S4 panel in viewActive; the S5 Back to workout control in viewStrength"
  - "go() and setSub() end in window.scrollTo(0, landingY())"
  - "harness getters a.openExHist and a.logReturn; test helpers lgRows, lgPanelCard, lgRowHead, lgPanelCase, lgTrip, lgFire, lgLast, lgScroll, lgLatCard"
affects: [10-04]
tech-stack:
  added: []
  patterns:
    - "screen-only state lives in module lets beside collapsedEx and is reset wherever collapsedEx is cleared"
    - "a one-shot return point consumed by the router (landingY) instead of a per-view scroll hook"
key-files:
  created: []
  modified: [index.html, test/app.test.js, test/harness.js]
decisions:
  - "The history panel renders only when the Last time line is tappable (ref || alt), so a slot swapped to an exercise with no history never shows a panel it cannot close"
  - "landingY is the only scroll decision in the router: it returns 0 unless a return point is set and the arrival is Train → Log, and it clears the point on use"
  - "The tracer feedback gate ran autonomously (re-verified end to end), as in 10-01 and 10-02: the plan declares no designed stops and human_verify_mode is end-of-phase"
metrics:
  duration: "14 min"
  completed: "2026-10-20"
  tasks: 3
  files: 3
actuals:
  tokens: 11000
  tasks: 3
  commits: 3
---

# Phase 10 Plan 03: Inline History on the Log Card Summary

Mid-workout, Ian taps an exercise's Last time line and its last 5 sessions open on the card, from any workout, with deloads, skips, PRs and notes marked. Tapping "Full chart in Strength" opens Progress → Strength on that exercise. "Back to workout" (or Train → Log, or Today's Resume) brings him back to the same scroll spot with the panel still open and collapsed cards still collapsed. Nothing in the workout is written, saved or pushed along the way.

## What was built

- **index.html**
  - `exerciseRecent(key, n, skipId)` walks `liveSessions()` newest first and returns up to `n` `{ s, e }` matched by exKey. It skips skipped days and the session being edited, and keeps deloads and skipped attempts.
  - `exhRowHTML(s, e, prIdx)` builds one escaped row: date, stored workout label, then `skipTailHTML` for a whole skip, or the sets with `<em>skip[: reason]</em>` in place, the trophy on PR sets and `no sets logged` when blank. A muted ` ↓ deload` and the `.exh-note` line follow.
  - `exhPanelHTML(i, entry)` builds the label (`Last session` / `Last {n} sessions · any workout`), the rows or the empty copy, and the `openExChart` link button.
  - `toggleExHist(i)`, `openExerciseChart(i)`, `backToWorkout()` and `landingY()` are all screen-only. None calls save() or saveLocal().
  - viewActive: the Last time element is `<button class="lasttime tap" data-action="toggleExHist" … aria-expanded>` when `ref || alt`, with the caret cue span. Otherwise it stays the plain `<div class="lasttime">`. The panel follows it, before the note hint.
  - viewStrength: `back` leads both returns while `logReturn && DB.draft`.
  - go and setSub: `window.scrollTo(0, landingY())`.
  - `openExHist = -1; logReturn = null;` after each of the five `collapsedEx.clear()` calls (startWorkout, startBackdate, finishWorkout, discardWorkout, editSession).
  - Three ACTIONS entries (`toggleExHist`, `openExChart`, `backToWorkout`) and the six `.exh*` CSS rules from UI-SPEC § S4.
- **test/harness.js**: read-only `get openExHist()` and `get logReturn()`.
- **test/app.test.js**: a 4-step tracer, 28 LOG-01 checks (Task 2) and 18 LOG-02 checks (Task 3).

## Suite lines

- Pre-plan: `1190 passed, 0 failed, 2 skipped`, CSP `sha256-PP7O5aSUm4QAbZZV9jYnDMsf4ZPDW4uzf5xgUPo7Vag=`
- After Task 1: `1194 passed, 0 failed, 2 skipped`
- After Task 2: `1222 passed, 0 failed, 2 skipped` (no index.html change)
- Post-plan: `1240 passed, 0 failed, 2 skipped`
- CSP hash after the last task: `sha256-7c8BOzrYRMrnMDjU3HgbrCnMAbQ92+Hf5twsf8LsHNY=` (`npm run csp:check` OK). Tasks 2 and 3 changed no script, so the hash is Task 1's.

## RED lines

**Task 1** (tests first, before any index.html change, `1190 passed, 4 failed`):
```
FAIL  LOG-01 tracer (a): the Last time line is a closed toggleExHist button and no panel shows  → {"tag":null,"closed":false,"panel":false}
FAIL  LOG-01/D-01/D-06 tracer (b): tapping the line opens the panel with 3 rows from any workout, newest first, and writes nothing  → {"open":false,"panels":0,…}
FAIL  LOG-02/D-19/D-20 tracer (c): Full chart in Strength opens the exercise in Strength with Back to workout, and records the scroll  → {"tag":null,"tab":"train","sub":"log",…}
FAIL  LOG-02/D-21 tracer (d): Back to workout lands on Log at the recorded scroll, the panel still open, the workout untouched  → {"scroll":[0,0],"open":false,…}
```

**Task 2:** no RED. All 28 checks passed on Task 1's code, which already followed `<interfaces>`. Each rule was proved by mutation instead (table below).

**Task 3:** no RED. All 18 checks passed on Task 1's code. Each rule was proved by mutation instead.

**Re-pointed 10-02 checks:** none. 10-02's `lgLastTime` already finds the element by class, so every PROG, EQUIP and LOG card check stayed green when the line became a button. D-11 ("no converted button wraps a div"), DELEG-04, DELEG-06, F2 and both DRAFT-05 checks stayed green.

## Mutation tables

Each mutation was applied in place, the suite run, then index.html restored byte for byte (`cmp`), and `npm run csp:check` passed again. The CSP checks always fail while a mutation is in place, so they are left out of this table.

| # | Mutation | Check that went red |
|---|----------|---------------------|
| T1-i | go's scrollTo back to `(0,0)` | tracer (d) |
| T1-ii | toggleExHist writes `DB.draft._open` and calls saveLocal() | tracer (b), tracer (d) |
| T2-i | exerciseRecent reads `DB.sessions` | D-04 |
| T2-ii | skipId exclusion dropped | both D-05 checks |
| T2-iii | exerciseRecent skips deload entries | D-02/D-03 deload marker |
| T2-iv | `esc(` removed around `s.workout` | T-10-20 hostile, and the long-label check (the `&` comes out raw) |
| T2-v | `!!(ref \|\| alt)` dropped from `open` | D-07 no history, D-24 all-skipped, D-24 deloaded, panel-follows-the-slot |
| T2-vi | toggleExHist writes the draft and calls saveLocal() | D-06 no-write, tracer (b), tracer (d) |
| T3-i | setSub's scrollTo back to `(0,0)` | D-21 Train → Log |
| T3-ii | landingY never clears `logReturn` | the one-shot check, tracer (d), D-21 Train → Log, D-21 Resume |
| T3-iii | `logReturn &&` dropped from the S5 condition | D-20 "Strength reached without the link" |
| T3-iv | discardWorkout reset removed | D-21 discardWorkout reset (through the `openExHist` half, see note) |
| T3-v | bare `scrollY` in openExerciseChart | D-21 no scrollY, both D-19 link checks (ReferenceError) |

Note on T3-iv: discardWorkout ends in `goSub('train','log')`, and landingY clears `logReturn` on that arrival even without the reset. So the `logReturn` half of that one reset is also covered by the router. The `openExHist` half is what the check catches.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Helper name collision in the test file**
- **Found during:** Task 2.
- **Issue:** I first named the Task 2 case helper `lgHist`. 10-02 already declares `const lgHist` (its one-session fixture), so the suite died with a SyntaxError before any check ran.
- **Fix:** renamed mine to `lgPanelCase`. 10-02's helper is untouched.
- **Files modified:** test/app.test.js
- **Commit:** 9fe245e

**2. [Plan wording] Extra coverage beyond `<behavior>`**
- D-20: the pet tab is checked alongside Weight, Volume and Cardio, because UI-SPEC § S5 lists it.
- D-19: a no-draft call is checked from Today, so "TAB unchanged" means it stayed on a non-Train screen.
- T-10-20: the hostile check also pins each of the four escaped fields in its own row, so a raw value in any one field goes red, not just a stray `<img`.

**3. [Process] Task 2 and Task 3 commit type is `test`**
- Both tasks are TDD, but neither had a natural RED: Task 1 had already implemented `<interfaces>` exactly, which the plan allows. The mutation tables are the gate evidence. 10-01 and 10-02 did the same.

## Assumptions handed to 10-04

- **A1/A2 (the scroll restore on the phone):** `window.scrollTo(0, y)` runs synchronously right after render(), and `window.scrollY` is read when the link is tapped. The harness can only see the call. 10-04 Task 3's human check confirms that Back to workout and Train → Log land at the same spot on Ian's Android PWA. If it lands at the top, the follow-up is one deferred scroll, which needs its own test design because the harness's rAF never runs.
- **The panel at 380px:** the six `.exh*` rules and the cue are unverified on the phone. This is also part of 10-04's human check.
- **A4:** a session that holds the exercise twice (a slot plus an accessory extras entry) gives two rows. This is cosmetic, and no extras card holds a slot exercise today.

## Threat Flags

None. The new surface is the one T-10-20 to T-10-27 cover: synced labels, notes and reasons rendered in the panel, screen-only state beside DB, and a router hook on every arrival. Each mitigation has a mutation-proved test.

## Known Stubs

None.

## Commits

- 94b5b14 feat(10-03): open an exercise's history on the card, chart it, and come back
- 9fe245e test(10-03): pin the history panel's rows and the toggle, rule by rule
- 68fbb47 test(10-03): pin the chart link and every way back to the workout

## Self-Check: PASSED

- FOUND index.html (7 new top-level functions, `let openExHist` on the line after `let collapsedEx`, 2 `window.scrollTo(0, landingY())`, 5 resets, 3 ACTIONS entries, 6 `.exh*` rules), test/harness.js (both getters), test/app.test.js
- FOUND commits 94b5b14, 9fe245e, 68fbb47
- exerciseHistory, lastRealEntry, lastAnywhere, lastAttemptEntry and prSetIndex are byte-identical to 489f4e1
- `npm run csp:check` OK, `TZ=America/Chicago npm test` gives `1240 passed, 0 failed, 2 skipped`
