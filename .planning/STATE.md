---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 2
current_phase_name: Export for Claude
status: planning
stopped_at: Completed 01-06-PLAN.md
last_updated: "2026-09-14T11:30:00.973Z"
last_activity: 2026-09-14
last_activity_desc: Phase 01 complete, transitioned to Phase 2
progress:
  total_phases: 1
  completed_phases: 1
  total_plans: 7
  completed_plans: 7
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-10)

**Core value:** The data Ian has already logged must never be lost, corrupted, or resurrected after deletion — every other feature can fail before that one does.
**Current focus:** Phase 01 — F1 — The COLLECTIONS Registry

## Current Position

Phase: 2 — Export for Claude
Plan: Not started
Status: Ready to plan
Last activity: 2026-09-14 — Phase 01 complete, transitioned to Phase 2

Progress: [█████████░] 86%

## Performance Metrics

**Velocity:**

- Total plans completed: 7
- Average duration: - min
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 7 | - | - |

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

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Phase 1]: `COLLECTIONS` declared before `let DB = load()`, adjacent to `SCHEMA`/`KEY`, before `MIGRATIONS` — values must be literals or hoisted-function references only, never a `const` arrow or a forward `const` reference (TDZ contract from research/SUMMARY.md).
- [Phase 1]: Each hand-written function replaced by the registry (`mergeDB_v0` etc.) is kept renamed and differential-tested against its replacement over a real exported backup plus per-incident synthetic fixtures; legacy is deleted only in a later commit, never the same one.
- [Phase 1]: The `gen`-mismatch wholesale-replace stays a hard early `return` in `mergeDB()`, untouched by the derived per-collection loop — folding it in silently disables "Erase all data" and Import→Replace.
- [Phase 1]: `merge` is an explicit required field on every collection; map collections (`journal`, `mobilityLog`, `lawnLog`) take the whole inner object from the newer side, never a union of inner keys.
- [Phase 1]: A row rewrite is permitted only with all four guards — `touch()`, persist immediately, idempotent, stale-device merge replay test.
- [Phase 1]: The real-backup fixture (REG-13) stays LOCAL ONLY in a git-ignored folder — the repo and the live site are public, so a committed backup would publish Ian's journal, weights and notes. Committed tests use synthetic per-incident fixtures; the real-data differential runs only when the local file is present and skips loudly, never silently, when it is absent. (Ian, 2026-09-11)
- [Phase 1]: Planned without CONTEXT.md and without a UI-SPEC (`--skip-ui`) — the sleep view copies an existing log screen rather than a written design contract. (Ian, 2026-09-11)
- [Phase 7]: Meta CSP has no report-only mode; local DevTools verification against a static file server is the only pre-production check, and cloud sync must be actively confirmed working after the policy goes live, not assumed.
- [Phase 1, plan 01-01]: COLLECTIONS is declared as dead data only in this plan — no consumer (blank, liveX, validateBackup, mergeDB) reads it yet; migration happens one collection per commit in plans 01-02 and 01-03.
- [Phase 1, plan 01-01]: cardio, ideas, todos and hobbyLog deliberately declare no sortBy in COLLECTIONS — the hand-written merge never sorted them, so declaring one would change stored order.
- [Phase 1, plan 01-01]: columns/format validation was deliberately deferred from Task 1 to Task 2 so the module-eval placement contract and merge-strategy refusal could land first, independently of REG-17's export metadata.
- [Phase ?]: REG-08 shape prologue kept as three ordered COLLECTIONS passes (required lists, optional lists, maps) rather than one combined loop, to guarantee legacy fault-precedence regardless of registry declaration order
- [Phase ?]: liveOf(name) throws on an undeclared/non-soft-list name instead of defaulting to permissive behavior, closing the gap Pitfall 6 warned about
- [Phase ?]: [Phase 1, plan 01-03]: mergeDB_legacy copies the pre-phase mergeDB verbatim (comments included) with the single sanctioned edit blank() -> blank_legacy(), preserving the exact historical code the incidents were fixed against.
- [Phase ?]: [Phase 1, plan 01-03]: Sort invariants (weights/petWeights by date, sessions via sessionSort) moved into mergeCollections, dispatched from each COLLECTIONS entry's declared sortBy, rather than staying hand-written in mergeDB -- a deliberate departure from 01-PATTERNS.md so plan 01-05's sleep collection needs no mergeDB edit.
- [Phase ?]: [Phase 1, plan 01-03]: ROW_FOR's row factories are keyed by exactly the fields each list's real key function reads, so the REG-13 fixtures exercise the actual sessKey/cardioKey/ideaKey/todoKey/hobbyKey composite-key logic rather than bypassing it.
- [Phase ?]: [Phase 1, plan 01-04]: Property tests for the merge (idempotence/commutativity/associativity) are written at the mergeDB() level, never on raw mergeUnion/mergeDateMap — per PITFALLS Pitfall 5, only mergeDB owns recomputing which side is newer.
- [Phase ?]: [Phase 1, plan 01-04]: Map collections (mobilityLog, lawnLog) are not associative today because a map day carries no per-day mtime; documented via a fixed counterexample rather than patched, per PITFALLS Pitfall 5 and the plan's explicit prohibition.
- [Phase ?]: [Phase 1, plan 01-05]: sleep is declared last in COLLECTIONS on one line, keeping every existing collection's validation precedence and merge order unchanged, verified by a structural test rather than only by placement.
- [Phase ?]: [Phase 1, plan 01-05]: SLEEP-02 confirmed by Ian, 2026-09-12 — the sleep form conventions (date defaults to today, hours 0-24 in 0.25 steps, quality integer 1-5 default 3, optional trimmed note, multiple entries per date via id key) are no longer an open flagged assumption.
- [Phase ?]: [Phase 1, plan 01-05]: SLEEP-05's proof boots a fresh probe instance via test/harness.js's opts.transform rather than adding a permanent fixture collection to the real registry, since existing devices only ever gain a collection through the SCHEMA/MIGRATIONS ritual, never through a derived consumer.
- [Phase 1, plan 01-06]: REG-13's real-backup differential ran to completion over Ian's actual exported backup (225602 bytes, _schema 17) on 2026-09-14 — 30 real-backup PASS lines, 0 FAIL, suite at 653 passed / 0 failed / 0 skipped. Plan 01-07's legacy-function deletion precondition is now met.
- [Phase 1, plan 01-05]: SLEEP-02's form conventions (date defaults to today; hours >0 and <=24 in 0.25 steps; quality 1–5 default 3; note optional and trimmed; multiple entries per date) confirmed by Ian at the Task 2 visual checkpoint. (Ian, 2026-09-12)
- [Phase 1, plan 01-07]: Legacy-function deletion (REG-14, Task 2) DEFERRED — "keep for now". The precondition is met, but the ten `_legacy` twins stay until SCHEMA 18 has shipped and run on the phone for a few days. Task 1's 540 goldens are committed, so the differential outlives the legacy code whenever it goes. REG-14 holds: nothing was deleted early. (Ian, 2026-09-14)

### Pending Todos

- [Phase 1, plan 01-07 Task 2]: Delete the ten legacy data-layer functions once SCHEMA 18 has shipped and been used on the phone for a few days (Ian's call, 2026-09-14). Precondition already met (01-06 PASS). Follow 01-07-PLAN.md Task 2 exactly: own commit, retarget synthetic differentials to the goldens, make golden() refuse regeneration, convert the real-backup block to invariants, add the "legacy scaffolding is gone" check.

### Blockers/Concerns

- [Phase 1]: Highest-risk phase in the milestone — the only one touching the merge/soft-delete/migration code paths that already caused the 2026-07-25 blind-write and Migration-15 incidents. Do not relax the differential-test-before-delete discipline under time pressure.
- [Phase 1]: The planner's two flagged items are resolved — SLEEP-02 confirmed (2026-09-12), REG-14 deletion deferred by Ian (2026-09-14; see Decisions and Pending Todos). The planner also documented a pre-existing gap: the three date-keyed map collections are not order-independent across three devices, because a day carries no timestamp of its own. Plan 01-04 records it and does not change behaviour.
- [Phase 1]: Shipping SCHEMA 18 is one-way — the cloud copy is stamped 18 and older builds refuse to sync. No plan pushes to `main`; the code goes through a PR after the phase.
- [Phase 7]: A CSP that blocks `gstatic.com` fails silently — the app keeps working on localStorage with cloud sync dead and no visible error. Verify sync explicitly after the policy ships.

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Validation | VAL-01, VAL-02 (backup type checks; attribute escaping) | Deferred to v2 | 2026-09-10 |
| Export | EXP-09 (recent-detail-plus-aggregate windowing) | Deferred to v2 | 2026-09-10 |
| Deploy | DEPLOY-01 (CI publishes served surface only) | Deferred to v2 | 2026-09-10 |

## Session Continuity

Last session: 2026-09-14T09:36:35.732Z
Stopped at: Completed 01-06-PLAN.md
Resume file: None
