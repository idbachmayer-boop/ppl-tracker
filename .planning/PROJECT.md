# PPL Tracker

## What This Is

A workout tracker that keeps absorbing things. Push/Pull/Legs training is the primary function,
but over months of real use it has also picked up weigh-ins, cardio, a journal, mobility, todos,
ideas, a hobby picker, pet weigh-ins, a lawn scheduler and sleep. That makes eleven collections,
none abandoned, all declared in one `COLLECTIONS` registry that the sync, delete, validation and
export code derive from. It is a single-file offline-first PWA used by one person, on one phone, at
the rack, and it runs under a hash-based Content-Security-Policy.

## Core Value

The data Ian has already logged must never be lost, corrupted, or resurrected after deletion —
every other feature can fail before that one does.

## Current State

**Shipped:** v1.0 Collections & lockdown (2026-10-09). Live on `main` as merge commit `f71c6e4` and
later docs-only commits. See `.planning/MILESTONES.md`.

- `index.html` is 4,951 lines: HTML, CSS and inline JS, with no build step and no dependencies.
  `SCHEMA = 18`.
- The test suite has 928 checks (0 failed, 2 skipped; 226 at the start of v1.0). It blocks the
  deploy, and `npm run csp:check` runs in the deploy job.
- Tech stack: vanilla JS, a service worker, Firebase Auth plus Firestore (union-merge sync),
  Open-Meteo weather, and GitHub Pages via Actions.
- Known debt is ranked in `.planning/milestones/v1.0-MILESTONE-AUDIT.md`. The top items are the
  offline weather retry loop, local Erase dropping the draft, the VAL-02 escaping sweep, and CSP
  tests that never cap allowances.

## Requirements

### Validated

<!-- Shipped, in daily use, confirmed valuable. -->

- ✓ Push/Pull/Legs workout logging — sessions, entries, sets, PRs, stairs and extras — existing
- ✓ Seven list-shaped collections (`sessions`, `weights`, `petWeights`, `cardio`, `ideas`, `todos`, `hobbyLog`) — existing
- ✓ Three date-keyed map collections (`journal`, `mobilityLog`, `lawnLog`) — existing
- ✓ Union-merge cloud sync over Firestore — every remote write is a `runTransaction` that re-reads and calls `mergeDB()`, never `set()` — existing
- ✓ Soft delete across every collection — `deletedAt` + `touch()`, read through `liveX()` filters, so a union merge cannot resurrect a deleted row — existing
- ✓ Generation counter (`gen`) so "Erase all data" and Import→Replace survive the union merge — existing
- ✓ Local snapshot ring in its own localStorage key — the undo buffer that was missing when a bad sync wiped four days of data — existing
- ✓ Schema migrations with a never-downgrade guard (`SCHEMA = 18`) — existing; migration 18 only creates absent collections
- ✓ Offline-first PWA — service worker, inlined Phosphor icons, no CDN, no build step, no dependencies — existing
- ✓ Backup export/import with shape validation (`validateBackup()`) — existing
- ✓ Lawn scheduler with weather-driven mow forecasting — existing
- ✓ **F1: the `COLLECTIONS` registry.** `blank()`, `mergeDB()`, the `liveX()` filters, `validateBackup()` and the export columns all derive from one declaration. Each replaced function was differential-tested against its frozen twin, including over Ian's real exported backup. — v1.0
- ✓ **`sleep`, the eleventh collection**, added as one `COLLECTIONS` entry plus its Care → Sleep log/list/delete screen — v1.0
- ✓ **Export for Claude.** Markdown tables derived from `COLLECTIONS` and the live views, with a header giving the date range and row counts, delivered through the share sheet with a download fallback — v1.0
- ✓ **F3: the add-a-collection recipe.** Six numbered steps in `CLAUDE.md` plus `docs/adding-a-collection.md`, pinned by tests, and rehearsed cold for `supplements` (8 gaps found, all closed) — v1.0
- ✓ **The in-progress workout is device-local.** The draft never syncs, every `DB` replacement keeps this device's draft, and draft edits persist with `saveLocal()` — v1.0
- ✓ **F2: event delegation.** No inline on-event attribute is left. Every control is a `data-action` behind one dispatcher, and keyboard and phone passes were done — v1.0
- ✓ **F4: `.gitattributes`** (`* text=auto eol=lf`), landed alone as `17b5a66`, with the suite asking git for the property — v1.0
- ✓ **Content-Security-Policy.** Hash-based `script-src`, with `npm run csp:hash` / `csp:check` and the deploy check. Live as `f71c6e4`, with a signed-in sync round trip confirmed on the PC and the phone — v1.0
- ✓ A test suite that blocks the deploy — 928 checks at v1.0 close (226 at initialization) — existing

### Active

<!-- Next milestone. Hypotheses until shipped. Requirements are written by /gsd-new-milestone. -->

v1.1 Training accuracy, lawn & sleep. Full list with REQ-IDs in `.planning/REQUIREMENTS.md`; source
of every rule is `.planning/v1.1-BRIEF.md`.

- [ ] Progression correctness: add weight only after every planned set hit the top of the range; progress and stall measured session to session by `exKey`, bodyweight included (PROG)
- [ ] Equipment type per exercise with its own weight step, rounding and plate math (EQUIP)
- [ ] Log page: last 5 sessions inline from "Last time", and skip exercise with undo (LOG)
- [ ] Lawn: cool-day hold, rain history in its own synced collection, watering in the outlook, journal marks, weather fetch backoff (LAWN)
- [ ] Sleep card on Today, and a local Erase that keeps the workout in progress (SLP)
- [ ] Strength index on Progress and Today (STR)
- [ ] Poor-sleep 10%-lighter workout offer, never automatic, treated like a deload (INT)

### Out of Scope

<!-- Each decided on 2026-09-09 unless noted, not overlooked. Do not re-open; if one turns out to be
     wrong, say so explicitly rather than quietly planning around it. Re-audited at v1.0 close: all
     still hold. -->

- **Rewriting or removing cloud sync** — the sync code works, is tested, and is the only automatic off-device backup; when the phone dies, localStorage dies with it. Rewriting it is real data risk for near-zero payoff on a single device. (Answer 1)
- **Deleting or trimming any feature, the lawn scheduler included** — usage data show nothing is abandoned. The problem was never feature count; it is that each feature reinvented the sync rules. v1.0's registry fixed that. (Answers 3, 4)
- **Anything about localStorage capacity** — measured from real exports at ~1.3% of budget, on track to reach half of it around 2035. (Answer 5)
- **Switching auth providers** — data is keyed to the current auth uid, so a Google login means a hand migration of `users/{uid}`. Closing signup in the console already solved the actual risk. Adding Google sign-in would also need a CSP change. (Answer 6)
- **Navigation or layout changes** — "workouts are the main function" was a statement about emphasis, not a complaint. (Answer 8)
- **Splitting `index.html` into modules** — splitting means a build step, which is the thing that makes the app editable without a toolchain. (F5)
- **App Check** — lower priority now that signup is closed; with no way to obtain an account there is nothing to abuse.
- **Removing `'unsafe-inline'` from `style-src`** — the markup carries inline `style=` attributes; out of scope by decision (CSP-04).
- **Kettlebells** — Ian doesn't use them; no kettlebell equipment type. (v1.1 brief, 2026-10-09)

## Current Milestone: v1.1 Training accuracy, lawn & sleep

**Goal:** Make the training advice trustworthy (add weight, stall, steps and deloads that match what
Ian actually lifted), and close the lawn and sleep loops he asked for, without bending any v1.0 data
rule.

**Target features:** defined by `.planning/v1.1-BRIEF.md`, agreed with Ian on 2026-10-09. It covers
his 14 in-app ideas plus two v1.0 audit follow-ups, in six phases (roadmap Phases 8-13):

1. **Progression correctness.** Add weight only when every planned set reached the top of the range
   (a skipped set blocks it). Progress means +1 total rep or more weight versus the previous session,
   and a stall is 3 sessions without progress, tracked by `exKey`. Bodyweight exercises are included.
2. **Equipment and weight steps.** Each exercise gets a synced equipment type. Dumbbells step by
   2.5 lb and everything else by 5 lb, and deloads and warm-ups round to the exercise's own step.
   Plate math follows the equipment, with a 25 lb EZ bar for the preacher curl.
3. **Log page.** Tapping "Last time" opens that exercise's last 5 sessions inline, without leaving
   the workout. A skip-exercise button takes an optional reason, can be undone, and blocks adding
   weight next time.
4. **Lawn and journal.** Hold off watering below 60°F. Rain history goes in a new synced collection
   (separate from `lawnLog`). The outlook shows 💧 on the next watering day, and Week in Review shows
   mowed, watered and rain marks. The offline weather retry loop gets a backoff, and the test
   harness's fetch stops hiding it.
5. **Sleep.** A morning sleep card on Today until last night is logged. A local Erase keeps the
   workout in progress, or the exception is documented.
6. **Strength index and poor-sleep intensity.** The index starts at 100, has a bodyweight-adjusted
   line and a weekly chart, and shows on Progress and Today. After a poor night, the app offers a
   10%-lighter workout with one tap. It is never automatic, and the session is treated like a deload.

The CSP-test hardening (07-REVIEW WR-01..03) runs as a separate quick task, outside v1.1.
Requirements are in `.planning/REQUIREMENTS.md`.

## Context

**The single cause behind nearly every incident before v1.0.** The rules for a collection were
implicit, so each new collection re-learned them by failing in production: `mobilityLog` forgot its
merge rule and read absence as "off"; Migration 15 forgot to `touch()` and persist; a missed `liveX()`
filter ghosted a deleted row; a malformed draft crashed the Log tab. v1.0 closed that family. The
rules now live in one declaration, the draft never leaves the device, and adding a collection is a
documented, test-pinned recipe.

**Prior work.** `REVIEW-2026-09-09.md` in the repo root holds the original review and the eight
answered questions. `.planning/codebase/` holds the GSD codebase map. `.planning/milestones/` holds
the v1.0 roadmap, requirements, audit and phase artifacts. `CLAUDE.md` is authoritative and wins on
conflict.

**Already closed, console-only, no code:** Firebase email/password sign-up is disabled; sign-in is
unaffected. `firestore.rules` was reconciled with the console on 2026-09-10 and matches what is
deployed.

**Known open items carried out of v1.0:** REG-14 legacy deletion is deferred by Ian (the ten
`_legacy` twins remain, and 540 goldens keep the differential). Map collections are not associative
across three devices (documented, accepted). v2 backlog: VAL-01, VAL-02, EXP-09, DEPLOY-01.

## Constraints

- **Tech stack**: `index.html` is the whole app — HTML, CSS and inline JS in one file, no build step, no dependencies — and stays that way. It is what makes the app installable and offline-first.
- **Module-eval order**: anything reached from `normalize()` runs at module-eval time and must not touch a `const` declared further down. `COLLECTIONS` holds only literals and hoisted-function references for the same reason. This temporal-dead-zone trap has already killed the boot once.
- **Sync is a union merge, never an overwrite**: every remote write is a `runTransaction` that re-reads and calls `mergeDB()`. Never `set()`. Never resolve a conflict by "more data wins" — edits legitimately remove sets.
- **Deletes are soft**: never splice a row out of a collection. Set `deletedAt`, call `touch()`, read through `liveX()`.
- **Absence never means "off"**: map collections take the whole inner object from the newer side, so a deleted key reads as "never logged" on the other device. Store an explicit `false`.
- **Migrations that rewrite rows must `touch()` and persist immediately**, must be idempotent, and must never downgrade `_schema`.
- **Derived data uses `saveLocal()`**: `save()` bumps `updatedAt` and triggers a push.
- **The draft never leaves the device**: every `DB` replacement keeps this device's draft through `keepLocalDraft()` and strips a foreign one; draft edits use `saveLocal()`.
- **Event handlers**: markup carries `data-action` plus escaped `data-*`; `dispatchAction` is the only listener; never stop propagation.
- **Escaping**: every user-controlled string rendered into HTML goes through `esc()`. `esc()` does not escape `'`, and only some attribute interpolations are escaped (the full sweep is VAL-02).
- **CSP**: any change to the inline script needs `npm run csp:hash`; a new fetch host, a Firebase SDK bump or a console auth change needs a policy change and a re-probe.
- **Testing**: `npm test` before every push. A red suite blocks the deploy. Baseline is 928 checks green.
- **Deploy**: push to `main`, GitHub Actions publishes. Single user, single device, production is a phone.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Declare collections once; derive `blank()`, `mergeDB()`, `liveX()` and `validateBackup()` from it | The merge rule cannot be forgotten because there is nowhere left to forget it | ✓ Good — shipped in Phase 1; verified 5/5 |
| The export for Claude is Markdown tables | Cheapest for Claude to read, eyeballable before pasting, no parsing step | ✓ Good — shipped in Phase 2; verified 20/20, UAT passed |
| The export derives from `COLLECTIONS`, not a second hand-written serialiser | A separate serialiser is a sixth place the schema would live | ✓ Good — a probe collection exports with no exporter edit |
| F1's acceptance test is adding a real 11th collection in one line | Behaviour parity proves the refactor didn't break; only a new collection proves the declaration actually pays off | ✓ Good — `sleep` needed no edit to any derived function, asserted by test |
| The 11th collection is `sleep` — `{ kind:'list', key:'id', soft:true, sortBy:'date' }` | List-shaped, so it exercises union merge, soft delete, the `liveX()` filter and the sort invariant | ✓ Good — shipped with SCHEMA 18; form conventions confirmed by Ian 2026-09-12 |
| Differential-test each replaced function against a frozen `_legacy` twin, including over a real backup kept local-only | Any divergence in merge code silently loses or resurrects data; the repo is public | ✓ Good — real-backup differential passed 2026-09-14 |
| Seven phases, one per in-scope item, in the agreed order | Each ships and is verified alone; cleanest rollback on a single-file app | ✓ Good — 7/7 verified; the CSP's failed go-live reverted cleanly |
| `.gitattributes` lands in its own commit, alone (`* text=auto eol=lf`) | A line-ending change can hide a real edit inside a whole-file reformat | ✓ Good — C1 `17b5a66`, alone; survives on `main` only through a merge commit, never a squash |
| `draft` stops syncing and becomes device-local | Ian would never finish a workout on another device; removing it deletes a whole bug family | ✓ Good — shipped in Phase 4; two-device check passed. ⚠️ local Erase still drops it (v1.1) |
| Event delegation through an event-keyed `ACTIONS` map, own-property lookups, one non-passive listener per event | Unlocks a hash-only CSP; markup no longer names functions | ✓ Good — 175 handlers converted; real workout on the phone passed |
| Build stamp lives in `<meta name="ppl-build">`, never in the hashed script | A deploy rewrite of the script would blank the app under the CSP | ✓ Good — shipped alone first (`58d8988`) |
| CSP is hash-only `script-src` with exact SDK and auth-loader paths; `style-src` keeps `'unsafe-inline'` | Blocks injected script without breaking sync; inline styles out of scope | ✓ Good — live as `f71c6e4`; sync round trip confirmed. ⚠️ tests don't cap allowances (quick task) |
| Keep the ten renamed `_legacy` functions after the real-data differential passed | Deletion is allowed but not urgent; Ian wants SCHEMA 18 to run on the phone for a few days first | — Pending (Ian, 2026-09-14) |
| The recipe's placement rule quotes the `index.html` `COLLECTIONS` comment verbatim, pinned by a containment test | The only literally accurate wording, and it lives next to the code it describes | ✓ Good — Ian chose it 2026-09-21 |
| Dry Run B's evidence is the written record, not a preserved scratch-branch diff | The branch carried a real `SCHEMA` bump that must never reach `main` | ✓ Good — Ian accepted it in UAT 2026-09-22 |
| Leave sync, features, capacity, auth and layout alone | Each was put to Ian on 2026-09-09 and answered; see Out of Scope | ✓ Good — re-audited at v1.0 close |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-10-09 after starting milestone v1.1*
