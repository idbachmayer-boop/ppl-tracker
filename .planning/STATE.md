---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Training accuracy, lawn & sleep
current_phase: 08
current_phase_name: progression-correctness
status: verifying
stopped_at: Completed 08-03-PLAN.md
last_updated: "2026-10-10T12:44:26.762Z"
last_activity: 2026-10-10
last_activity_desc: Phase 08 shipped (PR #13, merge 99e10c8); phone UAT pending
progress:
  total_phases: 6
  completed_phases: 1
  total_plans: 3
  completed_plans: 3
  percent: 17
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-10-09)

**Core value:** The data Ian has already logged must never be lost, corrupted, or resurrected after deletion — every other feature can fail before that one does.
**Current focus:** Phase 08 — progression-correctness

## Current Position

Phase: 08 (progression-correctness) — VERIFYING (live on main, phone UAT pending)
Plan: 3 of 3
Status: Phase complete — ready for verification
Last activity: 2026-10-10 — Phase 08 shipped as PR #13 (merge commit 99e10c8), live build verified

Progress: [██████████] 100% of Phase 8 plans (v1.1: 0 of 6 phases verified; Phase 8 awaits the phone UAT)

## Performance Metrics

**Velocity:**

- Total plans completed: 33
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

## Accumulated Context

### Decisions

The full v1.0 decision log lives in PROJECT.md (Key Decisions) and in
`.planning/milestones/v1.0-ROADMAP.md` (Milestone Summary). Per-plan decisions are in the archived
SUMMARY files under `.planning/milestones/v1.0-phases/`.

- [v1.1 roadmap, proposed 2026-10-09]: Six phases, 8-13, one per brief phase and in the brief's order. Phases 8-10 are verified with a real workout on Ian's phone plus the suite; Phases 11-13 with automated checks plus a quick look on the phone. Phase 9 takes `SCHEMA` 19 (equipment migration), Phase 11 the next number (new rain-history collection).
- [08-01]: An exercise left untouched at finish stores blankSets = its prefilled set count, so the next card gives no add-weight suggestion for it (D-09); Last time still shows the last real attempt
- [08-01]: addWeightInfo is now (workout, slotIndex, name) over lastAttemptEntry; lastRealEntry unchanged; weightStep(name) is the Phase 9 EQUIP-04 seam
- [08-02]: stall judged session to session per workout+slot+exKey; heavier or +1 total rep is progress, lighter restarts, 3 flat in a row after a baseline is stalled, never against an all-time best
- [08-02]: a deload, skipped day, empty entry, skipped set or blankSets>0 pauses the stall streak (blank set = planner's reading of D-10 with D-01, confirm on phone in 08-03)
- [08-03]: Phase 8 shipped as PR #13, merge commit 99e10c8 on main; revert is git revert -m 1 --no-edit 99e10c8. Phone workout check is the pending end-of-phase UAT item
- [08-03]: WR-02 (total reps compared when the set count changes) left open for Ian's product call; did not block shipping

### Pending Todos

- [v1.0 Phase 1, plan 01-07 Task 2]: Delete the ten legacy data-layer functions once SCHEMA 18 has run on the phone for a few days (Ian's call, 2026-09-14). Precondition met (01-06 PASS). Follow `milestones/v1.0-phases/01-f1-the-collections-registry/01-07-PLAN.md` Task 2 exactly: its own commit, retarget the synthetic differentials to the goldens, make golden() refuse regeneration, convert the real-backup block to invariants, and add the "legacy scaffolding is gone" check.
- CSP-test hardening (07-REVIEW WR-01..03): run as a separate quick task, per the v1.1 brief.

### Blockers/Concerns

No blockers. Open questions for discuss-phase, raised while drafting the v1.1 roadmap (details in the ROADMAP.md phase notes):

- Phase 9: `DB.exercises` is not a `COLLECTIONS` entry, and `mergeDB()` appears to take the whole array from the side with the newer `updatedAt`, so an equipment edit could lose to the other device's next save. Check before planning; the stale-device replay test must cover that path.
- Phase 9: the brief states steps in lb; kg behaviour (`INCREMENT.kg` is 2.5) is undecided.
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

Last session: 2026-10-10T12:44:26.751Z
Stopped at: Completed 08-03-PLAN.md
Resume file: None

## Operator Next Steps

- Phone UAT for Phase 8 (08-03-SUMMARY.md § UAT item): Settings → This version must end `99e10c8`. On failure, `git revert -m 1 --no-edit 99e10c8` on `main` and push. On pass, write the vault changelog entry, then `/gsd-verify-work 8`.
