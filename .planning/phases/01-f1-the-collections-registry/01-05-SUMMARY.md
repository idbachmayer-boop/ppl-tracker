---
phase: 01-f1-the-collections-registry
plan: 05
subsystem: data-model
tags: [collections-registry, migrations, schema, care-tab, tdd-differential]

# Dependency graph
requires:
  - phase: 01-f1-the-collections-registry (plan 04)
    provides: "mergeDB/mergeCollections fully derived from COLLECTIONS, the mergeDB_legacy differential harness, clone(), canon(), and the merge-law property tests this plan's probe checks build on"
provides:
  - "sleep as the eleventh COLLECTIONS entry (last on purpose): { kind:'list', key:'id', sortBy:'date', merge:'union', soft:true, required:false, columns:['date','hours','quality','note'] }"
  - "SCHEMA 18 and ensureCollectionDefaults(d) — a migration helper that creates only ABSENT collections, called once from MIGRATIONS[18], proven to rewrite no existing row"
  - "sleepUid(), addSleep(), removeSleep(id), viewSleep() — Care → Sleep logging, listing (last-7-days summary, newest-first history) and soft-delete, copying cardio's pattern"
  - "A behavioural proof (SLEEP-05) that a brand-new collection declared as one injected COLLECTIONS line is picked up by blank(), liveOf(), validateBackup() and mergeDB()/mergeCollections() with zero further code"
  - "Structural checks (SLEEP-04) proving no derived consumer's source mentions sleep, no liveSleep wrapper exists, viewSleep reads through liveOf('sleep'), and sleep is declared exactly once as the last entry"
affects: [phase-1-plan-06, phase-1-plan-07]

actuals:
  tokens: 7676
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A new collection needs only its COLLECTIONS declaration plus the project's SCHEMA/MIGRATIONS ritual (an ensureCollectionDefaults-style empty-default migration) — never an edit to blank(), liveOf(), validateBackup(), mergeCollections() or mergeDB()"
    - "Proving 'derived consumers need no edit' for a hypothetical future collection uses test/harness.js's opts.transform to inject a throwaway COLLECTIONS line into a freshly booted instance, rather than adding a permanent fixture collection to the real registry"
    - "A migration that must not rewrite existing rows (REG-16) is proven by comparing canon() of every legacy collection and the full sorted set of every mtime, before and after normalize(), on a populated schema-(N-1) fixture"

key-files:
  created: []
  modified:
    - index.html
    - test/harness.js
    - test/app.test.js

key-decisions:
  - "sleep is declared last in COLLECTIONS, on one line, so every existing collection's validation precedence (required lists, then optional lists, then maps) and merge order is unchanged — verified directly by a structural test, not just by review"
  - "ensureCollectionDefaults(d) is the one migration-18 helper: it fills only null/undefined collections and is called exclusively from hand-written MIGRATIONS (REG-11 stays intact) — a future collection needing a non-empty default still needs its own migration line"
  - "SLEEP-02's form conventions (date defaults to today, hours 0<h<=24 in 0.25 steps, quality integer 1-5 default 3, note optional/trimmed, multiple entries per date via id key) were flagged assumptions inferred from cardio's form, not sourced from REQUIREMENTS.md — Ian confirmed all of them via the Task 2 checkpoint (screenshots + driven walkthrough) on 2026-09-12; no longer an open assumption"
  - "SLEEP-05's proof boots a FRESH probe instance (test/harness.js opts.transform) rather than adding a permanent fixture collection to the real registry, because existing devices only ever gain a collection through the SCHEMA bump + MIGRATIONS ritual, never through a derived consumer — the probe's freshness is itself part of what's being proven"
  - "The delete button in viewSleep is rendered only for ids matching [A-Za-z0-9_-]+, closing the documented esc()-does-not-escape-a-quote hole for the new inline onclick handler (CLAUDE.md escaping convention, T-01-16)"

patterns-established:
  - "collectionProblems/blank/liveOf/validateBackup/mergeCollections/mergeDB genuinely need zero edits for a new collection — demonstrated with a live probe injection, not just asserted in prose"

requirements-completed: [SLEEP-01, SLEEP-02, SLEEP-03, SLEEP-04, SLEEP-05, SLEEP-06, REG-15, REG-16]

coverage:
  - id: D1
    description: "sleep joins COLLECTIONS as the last entry, SCHEMA bumps to 18, and MIGRATIONS[18] (ensureCollectionDefaults) creates the collection only when absent — proven to rewrite no existing row, stay idempotent, never downgrade _schema, and let a deleted sleep row survive every stale-device merge replay (self-merge, both argument orders, localWins, and a replayed transaction retry)"
    requirement: "REG-15"
    verification:
      - kind: unit
        ref: "test/app.test.js#sleep: migration 18 rewrites no existing row (REG-16 guards not triggered)"
        status: pass
      - kind: unit
        ref: "test/app.test.js#sleep: migrations stay idempotent"
        status: pass
      - kind: unit
        ref: "test/app.test.js#sleep: _schema never goes down"
        status: pass
      - kind: unit
        ref: "test/app.test.js#sleep: a deleted night is not resurrected by a stale device (SLEEP-06)"
        status: pass
      - kind: unit
        ref: "test/app.test.js#sleep: replaying the stale device again keeps it deleted"
        status: pass
    human_judgment: false
  - id: D2
    description: "Migration 18 is proven not to rewrite any existing legacy row or mtime on a populated schema-17 fixture (REG-16's no-rewrite guarantee)"
    requirement: "REG-16"
    verification:
      - kind: unit
        ref: "test/app.test.js#sleep: migration 18 rewrites no existing row (REG-16 guards not triggered)"
        status: pass
      - kind: unit
        ref: "test/app.test.js#sleep: migration 18 keeps an existing sleep list"
        status: pass
    human_judgment: false
  - id: D3
    description: "Ian can open Care → Sleep, log a night (date, hours 0-24 in 0.25 steps, quality clamped 1-5 default 3, optional trimmed note), see nights listed newest-first with a last-7-days average card, and delete one (soft delete, idempotent, unsafe ids get no delete button); the view visually matches Cardio's cards/type/Nocturne theme in light and dark"
    requirement: "SLEEP-02"
    verification:
      - kind: unit
        ref: "test/app.test.js#sleep: logging a night stores hours, quality and the trimmed note"
        status: pass
      - kind: manual_procedural
        ref: "Task 2 checkpoint:human-verify — Care → Sleep walkthrough with screenshots"
        status: pass
    human_judgment: true
    rationale: "Visual/theme fit and the inferred form-convention defaults (SLEEP-02 was a flagged assumption, not a REQUIREMENTS.md item) needed Ian's explicit sign-off, which he gave on 2026-09-12."
  - id: D4
    description: "Deleting a sleep entry is soft (softDelete via CLAUDE.md's delete convention): idempotent on a second delete, an unknown id changes nothing, and the deleted row is filtered by liveOf('sleep') everywhere it's read"
    requirement: "SLEEP-03"
    verification:
      - kind: unit
        ref: "test/app.test.js#sleep: deleting a night is soft"
        status: pass
      - kind: unit
        ref: "test/app.test.js#sleep: deleting twice is a no-op"
        status: pass
      - kind: unit
        ref: "test/app.test.js#sleep: an unknown id changes nothing"
        status: pass
    human_judgment: false
  - id: D5
    description: "No derived consumer (blank, liveOf, validateBackup, mergeCollections, mergeDB) mentions sleep in its source; no liveSleep wrapper was added; viewSleep reads through the generic liveOf('sleep'); sleep is declared exactly once, as the last COLLECTIONS entry"
    requirement: "SLEEP-04"
    verification:
      - kind: unit
        ref: "test/app.test.js#SLEEP-04: no derived consumer mentions sleep"
        status: pass
      - kind: unit
        ref: "test/app.test.js#SLEEP-04: there is no liveSleep wrapper"
        status: pass
      - kind: unit
        ref: "test/app.test.js#SLEEP-04: viewSleep reads through liveOf('sleep')"
        status: pass
      - kind: unit
        ref: "test/app.test.js#SLEEP-04: sleep is declared once, as the last entry"
        status: pass
    human_judgment: false
  - id: D6
    description: "Two throwaway collections (a list and a map) injected as one COLLECTIONS line each, in a freshly booted probe instance, are picked up by blank(), liveOf(), validateBackup() and mergeDB()/mergeCollections() with correct empty defaults, soft-delete filtering, backup-validation messages, union+date-sort merge, stale-device tombstone survival, and replace-whole/explicit-false map semantics — with no further code"
    requirement: "SLEEP-05"
    verification:
      - kind: unit
        ref: "test/app.test.js#SLEEP-05: the probe transform applied (two lines added, nothing else changed)"
        status: pass
      - kind: unit
        ref: "test/app.test.js#SLEEP-05: the declaration is valid"
        status: pass
      - kind: unit
        ref: "test/app.test.js#SLEEP-05: blank() creates the probes empty"
        status: pass
      - kind: unit
        ref: "test/app.test.js#SLEEP-05: liveOf hides a deleted probe row"
        status: pass
      - kind: unit
        ref: "test/app.test.js#SLEEP-05: validateBackup checks the probes"
        status: pass
      - kind: unit
        ref: "test/app.test.js#SLEEP-05: mergeDB unions probe rows and sorts them by date"
        status: pass
      - kind: unit
        ref: "test/app.test.js#SLEEP-05: a deleted probe row survives a stale device"
        status: pass
      - kind: unit
        ref: "test/app.test.js#SLEEP-05: the map probe replaces whole days and keeps explicit false"
        status: pass
    human_judgment: false
  - id: D7
    description: "A deleted sleep row survives a stale-device merge replay without resurrecting, including on an exact mtime tie (newer updatedAt device decides) and when one side has no sleep key at all"
    requirement: "SLEEP-06"
    verification:
      - kind: unit
        ref: "test/app.test.js#sleep: a deleted night is not resurrected by a stale device (SLEEP-06)"
        status: pass
      - kind: unit
        ref: "test/app.test.js#sleep: on an exact mtime tie the newer device decides"
        status: pass
      - kind: unit
        ref: "test/app.test.js#sleep: a device without any sleep list cannot resurrect or remove"
        status: pass
    human_judgment: false

duration: ~35min (Tasks 1-2, 2026-09-11 evening) + ~15min (Task 3, 2026-09-12 morning), paused overnight for Ian's Task 2 checkpoint approval
completed: 2026-09-12
status: complete
---

# Phase 1 Plan 5: Sleep — The Eleventh Collection, Proved by Declaration Alone Summary

**Sleep joins COLLECTIONS as one last-entry declaration with SCHEMA 18 and an empty-default migration, gets a full Care → Sleep log/list/delete view copying cardio's pattern, and a live probe injection proves any future collection needs nothing more than its declaration plus the SCHEMA/MIGRATIONS ritual.**

## Performance

- **Duration:** ~35 min (Tasks 1-2) + ~15 min (Task 3), across two sessions separated by an overnight checkpoint pause
- **Started:** 2026-09-11T19:59:14-05:00
- **Completed:** 2026-09-12T08:30:53-05:00
- **Tasks:** 3 of 3
- **Files modified:** 3 (index.html, test/harness.js, test/app.test.js)

## Accomplishments

- `sleep` is declared as the last entry in `COLLECTIONS` — `{ kind:'list', key:'id', sortBy:'date', merge:'union', soft:true, required:false, columns:['date','hours','quality','note'] }` — keeping every existing collection's validation precedence and merge order unchanged, verified by a structural test rather than just by placement.
- `SCHEMA` is 18. `ensureCollectionDefaults(d)` creates a collection only when it's null/undefined (never rewrites a row that already has an `mtime`), wired in as `MIGRATIONS[18]`. A populated schema-17 fixture proves migration 18 changes no legacy collection's content and no `mtime`, stays idempotent, and never lets `_schema` decrease.
- `sleepUid()`, `addSleep()`, `removeSleep(id)` and `viewSleep()` give Care → Sleep a full log/list/delete flow copying cardio's pattern (minus the Strava import): date defaults to today, hours must be `>0` and `<=24` in 0.25 steps, quality is an integer clamped 1-5 (default 3), the note is optional and trimmed, deletes are soft, and the delete button is withheld for any id that isn't `[A-Za-z0-9_-]+` (closing the documented `esc()`-does-not-escape-a-quote hole for the new inline handler).
- A deleted sleep row survives every stale-device merge replay tested: both argument orders, `localWins` true/false, an exact-`mtime` tie (newer `updatedAt` wins), a device with no `sleep` key at all, and a replayed transaction retry.
- Two throwaway collections (`probeList`, a soft-delete union list; `probeMap`, a replace-whole map with `explicitFalse`) are injected as exactly two lines into a freshly booted probe instance via `test/harness.js`'s `opts.transform`. `blank()`, `liveOf()`, `validateBackup()` and `mergeDB()`/`mergeCollections()` pick both up correctly — empty defaults, soft-delete filtering, validation messages, union+date-sort merge, stale-device tombstone survival, and whole-day replacement with `false` preserved — with zero further code, proving SLEEP-05's claim directly rather than just asserting it.
- Structural checks confirm the "declaration alone" property for the real `sleep` collection too: none of `blank`, `liveOf`, `validateBackup`, `mergeCollections` or `mergeDB`'s source mentions `sleep`; no `liveSleep` wrapper exists; `viewSleep` reads through the generic `liveOf('sleep')`; and the `COLLECTIONS` literal has exactly one `sleep:` line, as the last entry.
- Suite grew from the plan 01-04 baseline of 502 passed to 539 passed after Task 2, and to 551 passed, 0 failed, 1 skipped after Task 3 (the 1 skip is the expected, git-ignored real-backup fixture — local only, per Ian's 2026-09-11 decision).

## Task Commits

Each task was committed atomically:

1. **Task 1: sleep joins COLLECTIONS as one entry, with SCHEMA 18 and an empty-default migration** - `9d33461` (feat)
2. **Task 2: Log, list and delete sleep on Care → Sleep** - `8cb3921` (feat)
3. **Task 3: Prove a new collection needs only its declaration — a probe injected into COLLECTIONS at test time (SLEEP-05), plus SLEEP-04's structural check** - `028b63b` (test)

## Files Created/Modified

- `index.html` - Adds the `sleep` COLLECTIONS entry (last), bumps `SCHEMA` to 18, adds `ensureCollectionDefaults(d)` and `MIGRATIONS[18]`, and adds `sleepUid()`, `addSleep()`, `removeSleep(id)`, `viewSleep()` plus the Care tab's `['sleep','Sleep']` sub entry
- `test/harness.js` - Appends `ensureCollectionDefaults`, `sleepUid`, `addSleep`, `removeSleep`, `viewSleep` to the exported `names` list
- `test/app.test.js` - Adds `sleep:18` to `INTRODUCED_AT`; two sleep rows to `populatedDB`; the Task 1 block (`sleep: one declaration, SCHEMA 18, no row rewritten`, 14 checks covering SLEEP-01/SLEEP-06/REG-16); the Task 2 block (`sleep: log, list and delete`, 12 checks covering SLEEP-02/SLEEP-03); and the Task 3 block (`SLEEP-05: a collection declared in one line is picked up everywhere`, 8 checks using a probe-transform-booted instance, plus `SLEEP-04: sleep is added through its declaration alone`, 4 structural checks)

## Decisions Made

- `sleep` is declared last in `COLLECTIONS`, on one line, so every existing collection's validation precedence and merge order stays unchanged — verified directly by `SLEEP-04: sleep is declared once, as the last entry`, not just by code placement.
- `ensureCollectionDefaults(d)` is the single migration-18 helper, called only from hand-written `MIGRATIONS` (REG-11 stays intact); it fills only null/undefined collections and never rewrites an existing row, so none of REG-16's four rewrite guards (touch, persist immediately, idempotent, stale-device replay) are triggered.
- **SLEEP-02 confirmed by Ian, 2026-09-12.** The form conventions (date defaults to today; hours `>0` and `<=24` in 0.25 steps; quality integer 1-5, default 3; note optional and trimmed; multiple entries per date allowed because the key is `id` not `date`) were flagged assumptions inferred from cardio's form, not sourced from REQUIREMENTS.md. Ian reviewed them via the Task 2 `checkpoint:human-verify` (screenshots plus a driven walkthrough: logged a 7.5h/quality-4 night with a note, confirmed it appeared at the top of History with the Last-7-days card counting it, deleted it via ✕, confirmed the screen matched Cardio's cards/type/Nocturne theme) and replied "approved." This is no longer an open flagged assumption.
- SLEEP-05's proof boots a fresh probe instance via `test/harness.js`'s existing `opts.transform` (added in plan 01-01) rather than adding a permanent fixture collection to the real registry — existing devices only ever gain a collection through the SCHEMA bump + MIGRATIONS ritual, never through a derived consumer, so the probe's freshness is itself part of what SLEEP-04/SLEEP-05 are proving.
- The delete button in `viewSleep` is rendered only for ids matching `/^[A-Za-z0-9_-]+$/`, closing the documented `esc()`-does-not-escape-a-single-quote hole (CLAUDE.md's escaping convention, threat T-01-16) for the new inline `removeSleep('...')` handler; a hand-edited backup with a quote/paren/semicolon id gets no button.

## Deviations from Plan

None - plan executed exactly as written across all three tasks. Every `must_haves.truths` item and every task's acceptance criteria passed on first implementation.

## Issues Encountered

None.

## Known Stubs

None. `sleep` rows are exactly `{id, date, hours, quality, note}` per Ian's decision 4 — no sensor-style fields, no bedtime/waketime split, no disruption tags, no reminders, no correlation charts, matching the plan's explicit prohibitions.

## Threat Flags

None beyond the threat register already in 01-05-PLAN.md (T-01-15 through T-01-18), all of which are mitigated and tested in this plan: `esc()` on note/hours/quality/date (T-01-15), the safe-id gate on the delete button (T-01-16), `SCHEMA 18` + `remoteTooNew` refusing older-build pushes (T-01-17), and `ensureCollectionDefaults`'s no-rewrite proof (T-01-18).

## User Setup Required

None - no external service configuration required. This plan does not push to `main`; shipping SCHEMA 18 to the shared cloud blob is a one-way door left to the ship step, per the plan's explicit constraint.

## Next Phase Readiness

- Plan 01-06 (Ian's real-backup fixture) and plan 01-07 (legacy-function deletion) are unaffected by this plan's scope — sleep touched only `COLLECTIONS`, its logging/viewing UI, and the mandatory SCHEMA/MIGRATIONS ritual, exactly as SLEEP-04/SLEEP-05 prove.
- ROADMAP Phase 1 success criterion 3 now holds at SCHEMA 18 (REG-15), with REG-16 recorded as not triggered and proven by a no-rewrite test.
- ROADMAP success criterion 5's second half (a deleted row survives a stale-device merge replay) now has a sleep-specific proof (SLEEP-06) alongside the existing legacy-collection coverage from earlier plans.
- No blockers. `npm test` is green: 551 passed, 0 failed, 1 skipped (the git-ignored real-backup fixture, expected absent until plan 01-06).

## Self-Check: PASSED

All claimed files exist (`index.html`, `test/harness.js`, `test/app.test.js`, this `SUMMARY.md`) and all three task commits (`9d33461`, `8cb3921`, `028b63b`) are present in `git log`.

---
*Phase: 01-f1-the-collections-registry*
*Completed: 2026-09-12*
