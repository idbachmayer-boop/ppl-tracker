---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Training accuracy, lawn & sleep
current_phase: 11
current_phase_name: lawn-journal-and-weather-loop
status: executing
stopped_at: Completed 11-04-PLAN.md
last_updated: "2026-11-13T19:56:08.222Z"
last_activity: 2026-11-13
last_activity_desc: Phase 11 execution started
progress:
  total_phases: 6
  completed_phases: 3
  total_plans: 19
  completed_plans: 18
  percent: 50
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-11-11)

**Core value:** The data Ian has already logged must never be lost, corrupted, or resurrected after deletion — every other feature can fail before that one does.
**Current focus:** Phase 11 — lawn-journal-and-weather-loop

## Current Position

Phase: 11 (lawn-journal-and-weather-loop) — EXECUTING
Plan: 5 of 5
Status: Ready to execute
Last activity: 2026-11-13 — Phase 11 execution started

Progress: [██████████] 95%

## Performance Metrics

**Velocity:**

- Total plans completed: 47
- Average duration: - min
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 7 | - | - |
| 02 | 3 | - | - |
| 03 | 5 | - | - |
| 04 | 3 | - | - |
| 05 | 6 | - | - |
| 7 | 7 | - | - |
| 6 | 2 | - | - |
| 8 | 3 | - | - |
| 9 | 5 | - | - |
| 10 | 6 | - | - |

**Recent Trend:**

- Last 5 plans: none yet
- Trend: N/A

*Updated after each plan completion*
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 01 P01 | 65min | 2 tasks | 3 files |
| Phase 01 P02 | 15min | 3 tasks | 3 files |
| Phase 01 P03 | ~20min | 2 tasks | 3 files |
| Phase 01 P04 | ~50min | 2 tasks | 2 files |
| Phase 01 P05 | ~50min | 3 tasks | 3 files |
| Phase 01 P06 | ~10min | 2 tasks | 0 files |
| Phase 02 P01 | 22min | 2 tasks | 3 files |
| Phase 02 P02 | ~3min (commit-to-commit) | 2 tasks | 2 files |
| Phase 02 P03 | ~5.5min (commit-to-commit) | 2 tasks | 3 files |
| Phase 03 P01 | ~15min | 2 tasks | 3 files |
| Phase 03 P02 | ~10min | 2 tasks | 1 files |
| Phase 03 P03 | ~9min | 3 tasks | 2 files |
| Phase 03 P04 | ~15min | 2 tasks | 2 files |
| Phase 03 P05 | ~20min | 3 tasks | 2 files |
| Phase 04 P01 | 17min | 2 tasks | 5 files |
| Phase 04 P02 | 97min | 2 tasks | 3 files |
| Phase 04 P03 | 3min | 2 tasks | 4 files |
| Phase 05 P01 | 15min | 3 tasks | 7 files |
| Phase 05 P02 | 16min | 3 tasks | 4 files |
| Phase 05 P03 | 16min | 2 tasks | 4 files |
| Phase 05 P04 | 19min | 2 tasks | 3 files |
| Phase 05 P05 | 27min | 3 tasks | 3 files |
| Phase 05 P06 | 26min | 3 tasks | 7 files |
| Phase 06 P01 | 15min | 2 tasks | 1 files |
| Phase 06 P02 | 12min | 2 tasks | 4 files |
| Phase 07 P01 | 5min | 2 tasks | 4 files |
| Phase 07 P03 | 10 min | 2 tasks | 3 files |
| Phase 07 P02 | ~15min executor (spans 2026-10-02..05, waiting on Ian) | 3 tasks | 0 files |
| Phase 07 P04 | 12 min | 2 tasks | 4 files |
| Phase 07 P06 | 13min | 3 tasks | 5 files |
| Phase 07 P07 | ~9min executor (spans 2026-10-07..09, waiting on Ian) | 3 tasks | 0 files |
| Phase 08 P01 | 12min | 3 tasks | 2 files |
| Phase 08 P02 | 8 min | 3 tasks | 2 files |
| Phase 08 P03 | ~20min (incl. Ian's push, PR, CI, deploy) | 3 tasks | 0 files |
| Phase 09 P01 | 13min | 3 tasks | 4 files |
| Phase 09 P02 | 14 min | 3 tasks | 3 files |
| Phase 09 P03 | 14 min | 3 tasks | 2 files |
| Phase 09 P04 | 10 min | 3 tasks | 3 files |
| Phase 09 P05 | ~25min (incl. the push, PR, CI, deploy) | 3 tasks | 0 files |
| Phase 10 P01 | 10 min | 3 tasks | 3 files |
| Phase 10 P02 | 8 min | 3 tasks | 2 files |
| Phase 10 P03 | 14 min | 3 tasks | 3 files |
| Phase 10 P04 | ~17 min (incl. push, PR, CI, deploy) | 3 tasks | 0 files |
| Phase 10 P05 | 13 min | 3 tasks | 3 files |
| Phase 10 P06 | ~10 min executor (spans 2026-10-31..11-11, waiting on Ian's merge) | 3 tasks | 0 files |
| Phase 11 P01 | 12min | 3 tasks | 3 files |
| Phase 11 P02 | 13 min | 3 tasks | 5 files |
| Phase 11 P03 | 40min | 3 tasks | 3 files |
| Phase 11 P04 | 15 min | 3 tasks | 3 files |

## Accumulated Context

### Decisions

The full v1.0 decision log lives in PROJECT.md (Key Decisions) and in
`.planning/milestones/v1.0-ROADMAP.md` (Milestone Summary). Per-plan decisions are in the archived
SUMMARY files under `.planning/milestones/v1.0-phases/`.

- [v1.1 roadmap, proposed 2026-10-09]: Six phases, 8-13, one per brief phase and in the brief's order. Phases 8-10 are verified with a real workout on Ian's phone plus the suite; Phases 11-13 with automated checks plus a quick look on the phone. Phase 9 takes `SCHEMA` 19 (equipment migration), Phase 11 the next number (new rain-history collection).
- [08-01]: An exercise left untouched at finish stores blankSets = its prefilled set count, so the next card gives no add-weight suggestion for it (D-09); Last time still shows the last real attempt
- [08-01]: addWeightInfo is now (workout, slotIndex, name) over lastAttemptEntry; lastRealEntry unchanged; weightStep(name) is the Phase 9 EQUIP-04 seam
- [08-02]: stall judged session to session per workout+slot+exKey; heavier or +1 total rep is progress, lighter restarts, 3 flat in a row after a baseline is stalled, never against an all-time best
- [08-02]: a deload, skipped day, empty entry, skipped set or blankSets>0 pauses the stall streak (blank set = planner's reading of D-10 with D-01; confirmed in the phone UAT)
- [08-03]: Phase 8 shipped as PR #13, merge commit 99e10c8 on main; revert is git revert -m 1 --no-edit 99e10c8. Phone UAT passed 2026-10-10; 08-SECURITY.md verified, 20/20 threats closed
- [08-UAT]: WR-02 resolved by Ian: keep comparing total reps even when the set count changes (matches PROG-02)
- [09-01]: Registry rows carry equip (one of EQUIP_TYPES) and equipAt (0 = a default); migration 19 stamps them with mtime old + 1, never now (D-14), and the boot save persists it
- [09-01]: weightStep(name, w) returns null for bodyweight in either unit, 2.5 flat in kg, and in lb dumbbell 2.5 below 60 then 5, cable 2.5, barbell/EZ/machine 5; every caller branches on null
- [09-02]: equipClock is one hoisted rule shared by mergeExercises and exMerge; only a strictly higher equipAt replaces the mtime winner's type, which keeps the merge commutative on ties
- [09-02]: exMerge tombstones the merged row (deletedAt, mergedInto, empty aliases); exRow reads live rows only and exEnsure never reuses a tombstoned id
- [09-03]: deloadPlan floors 0.9 x lastW to the exercise's ladder (always strictly lighter); at or below the bar on a bar lift in lb it keeps the weight and the card shows the D-15 line, computed at render
- [09-03]: barStyle is decided by equipOf(name); BAR_FOR and LANDMINE_RE only pick sled or landmine, and the EZ plate line is silent at or under the bar and on unloadable totals (D-07 supersedes the UI-SPEC Color sentence)
- [09-03]: warm-up rungs use loadNearest with ties down, clamped to the bar on bar lifts in lb and capped at the working weight; translateLoad floors with loadFloor and the suggest line escapes its unit
- [09-04]: the picker is keyed by registry id in equipAsk, so it follows the exercise, not the slot; it stays until answered, the slot switches exercise, or the app reloads
- [09-04]: on a time-based accessory card exEnsureAsk still queues the id and extraCard declines to render it; the row keeps its guess
- [09-04]: equipAsk.delete(id) sits after setExerciseEquip's validity checks, so a refused type leaves the picker in place
- [09-05]: Phase 9 shipped as PR #14, merge commit 8a20832 on main; live stamp 2026-10-12T18:58:25Z 8a20832, csp --check OK, SCHEMA 19, helper grep 4. Phone workout and cross-device type change are the pending end-of-phase UAT
- [09-UAT]: Phone UAT passed 2026-10-13 (tag, Preacher-curl plates, pre-set types, cross-device type change both ways, first-time picker, 380px layout, clean finish); 09-SECURITY.md verified, 37/37 closed
- [09-05]: Revert is git revert -m 1 --no-edit 8a20832 on main. Once schema 19 has synced, a revert keeps all data but pauses sync on every device until a 19+ build ships; a blank app means nothing migrated and the revert is clean
- [09-05]: Shipped with WR-09, WR-06 and the info items open (none blocking); WR-09 (order-dependent conflicting concurrent merges) is the post-ship fix candidate
- [Phase 10]: 10-01: exercise skip is add-alongside — entry gets skipped:true + reason, per-set skipped flags stay the only judgement input (D-09); SCHEMA stays 19
- [Phase 10]: 10-01: finishWorkout strips every own key starting with _ from entries and sets; draft-only fields must start with _
- [Phase 10]: 10-02: the D-17 skip note comes from lastAttemptEntry and sits after lastLine, so the Last time numbers stay lastRealEntry's
- [Phase 10]: 10-02: editSession carries only skipped and reason (boolean true only), never _preSkip, so Undo on a re-edited workout takes the no-snapshot path
- [Phase 10]: 10-03: the history panel renders only when the Last time line is tappable (ref || alt); openExHist and logReturn are screen-only lets reset at the five collapsedEx.clear() sites
- [Phase 10]: 10-03: landingY is the router's only scroll decision; the return point is used once on a Train → Log arrival and cleared
- [Phase 10]: Phase 10 shipped as PR #15, merge commit 9a4e647 on main; live page verified (stamp 9a4e647, CSP OK, SCHEMA 19). Revert: git revert -m 1 --no-edit 9a4e647 — no sync pause, but Undo or finish any open skipped exercise first.
- [Phase 10]: 10-05: Log card header is two rows (meta + right-pinned 32x32 skip/collapse pair; badge + flag with flex-wrap); .ph is inline-block globally and icons before text outside buttons/headings take 'lead' (G-10-5)
- [Phase 10]: 10-06: G-10-5 shipped as PR #16, merge commit 5375e10 on main; live stamp 2026-11-11T13:02:19Z 5375e10, CSP OK, SCHEMA 19. Revert: git revert -m 1 --no-edit 5375e10 (render-only, clean). Phone re-check of UAT test 5 passed 2026-11-11.
- [10-UAT]: Phase 10 phone UAT 6/6 passed 2026-11-11; 10-SECURITY.md verified, 45/45 closed. Open post-ship: 10-REVIEW WR-02 (unescaped extras fallback label in Workout history, pre-existing, index.html:2745) and WR-01 (weak glued-icon test)
- [Phase 11]: Offline weather backs off 5/15/60 min in memory only (WXFAIL); manual refresh, Retry weather and the online event on weather screens skip the wait
- [Phase 11]: A weather cache is usable only when daily.time holds today; index-1 fallbacks removed (wxTodayIndex)
- [Phase 11]: Today fetches weather all year whenever a location is set (D-12)
- [Phase 11]: Rain history lives in its own synced list collection rainLog ({ date, inches, mtime }), keyed by date, never in lawnLog (11-02)
- [Phase 11]: A synced derived row reaches the cloud through the quiet push: touch + saveLocal + schedulePush, never save() (11-02, D-01)
- [Phase 11]: 11-03: waterVerdict decides watering in one place (override > recent > own-day wet > rain3 > tomorrow > cool > city > due); a wet hold carries why=both|amount|chance so lawnStatus words it without repeating the 60% test
- [Phase 11]: 11-03: forecast values reach waterVerdict only as finite numbers or null (finiteWx), so a gap in the forecast is never a cool or wet day
- [Phase 11]: Every rain display reads through rainByDate() (liveOf('rainLog'), string date, finite 0..40); the 0.1 inch mark is tested on the stored number before toFixed(2)
- [Phase 11]: Week in Review lawn tags read lawnLog[day].mowed/.watered === true only; a stored string or number, false, or an override key renders nothing

### Pending Todos

- [v1.0 Phase 1, plan 01-07 Task 2]: Delete the ten legacy data-layer functions once SCHEMA 18 has run on the phone for a few days (Ian's call, 2026-09-14). Precondition met (01-06 PASS). Follow `milestones/v1.0-phases/01-f1-the-collections-registry/01-07-PLAN.md` Task 2 exactly: its own commit, retarget the synthetic differentials to the goldens, make golden() refuse regeneration, convert the real-backup block to invariants, and add the "legacy scaffolding is gone" check.
- CSP-test hardening (07-REVIEW WR-01..03): run as a separate quick task, per the v1.1 brief.

### Blockers/Concerns

No blockers. Open questions for discuss-phase, raised while drafting the v1.1 roadmap (details in the ROADMAP.md phase notes):

- Phase 9: resolved. The registry merges per row with an equipAt clock (09-02, replays in the suite), and kg keeps a flat 2.5 (D-10). Open post-ship: WR-09 in 09-REVIEW.md.
- Phase 11: rain rows come from the weather fetch, but derived data uses `saveLocal()`. Decide how a rain row persists and reaches the cloud without letting a stale device look newest. The weather cache keeps only 3 past days.
- Phase 12: Ian chooses whether `wipe()` goes through `keepLocalDraft()` or becomes the documented exception (SLP-03).

The v1.0 concerns (Phase 1 merge risk, the SCHEMA 18 one-way ship, CSP silently killing sync) are resolved: the real-backup differential passed, SCHEMA 18 shipped, and the CSP-06 signed-in round trip passed on `f71c6e4`. Revert target if the CSP ever has to come out: `643c628` on `main`, never a hotfix forward.

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Validation | VAL-01, VAL-02 (backup type checks; attribute escaping) | Deferred to v2 | 2026-09-10 |
| Export | EXP-09 (recent-detail-plus-aggregate windowing) | Deferred to v2 | 2026-09-10 |
| Deploy | DEPLOY-01 (CI publishes served surface only) | Deferred to v2 | 2026-09-10 |

Items acknowledged and deferred at milestone close on 2026-10-09 (`audit-open` reported 15
`deferred_items` lines; they are the bullets of three entries in the phase 4 and 5
`deferred-items.md` files, now under `milestones/v1.0-phases/`):

| Category | Item | Status |
|----------|------|--------|
| deferred_item | Phase 04: Lawn tab re-fetches weather in a tight loop while offline (04-REVIEW WR-01/WR-05) | Open; scheduled for v1.1 Phase 11 (LAWN-06, LAWN-07) |
| deferred_item | Phase 05 #1: `dispatchAction` looked up the event handler through the prototype chain | Resolved (05-REVIEW-FIX WR-04) |
| deferred_item | Phase 05 #2: logged set values rendered as HTML text without `esc()` | Resolved (05-REVIEW-FIX WR-02) |
| tech_debt | Local Erase (`wipe()`) drops the in-progress draft without `keepLocalDraft()` | Open; scheduled for v1.1 Phase 12 (SLP-03) |
| tech_debt | Remaining v1.0 audit debt (12 ranked items) | See `milestones/v1.0-MILESTONE-AUDIT.md` |

## Session Continuity

Last session: 2026-11-13T19:56:08.201Z
Stopped at: Completed 11-04-PLAN.md
Resume file: None

## Operator Next Steps

- Discuss Phase 11: `/gsd-discuss-phase 11` (Lawn, Journal and Weather Loop). Open question first: how a rain row persists and reaches the cloud without a stale device looking newest.
- Optional cleanup: `/gsd-code-review 10 --fix` for 10-REVIEW WR-01/WR-02.
