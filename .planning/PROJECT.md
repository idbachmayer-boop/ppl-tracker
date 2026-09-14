# PPL Tracker

## What This Is

A workout tracker that keeps absorbing things. Push/Pull/Legs training is the primary function,
but over 47 days of real use it has also picked up weigh-ins, cardio, a journal, mobility, todos,
ideas, a hobby picker, pet weigh-ins and a lawn scheduler — ten collections, none abandoned. It is
a single-file offline-first PWA used by one person, on one phone, at the rack.

## Core Value

The data Ian has already logged must never be lost, corrupted, or resurrected after deletion —
every other feature can fail before that one does.

## Requirements

### Validated

<!-- Shipped, in daily use, confirmed valuable. Inferred from the codebase map and the code. -->

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
- ✓ Lawn scheduler with weather-driven mow forecasting — 12 log entries in 47 days, genuine regular use — existing
- ✓ **F1 — the `COLLECTIONS` registry**: `blank()`, `mergeDB()`, the `liveX()` filters, `validateBackup()` and the export columns all derive from one declaration; each replaced function kept renamed and differential-tested against it, including over Ian's real exported backup — Validated in Phase 1: F1 — The COLLECTIONS Registry
- ✓ **`sleep`, the eleventh collection**, added as one `COLLECTIONS` entry plus its Care → Sleep log/list/delete screen — Validated in Phase 1: F1 — The COLLECTIONS Registry
- ✓ A test suite that blocks the deploy — 226 checks at initialization, 623 after Phase 1 (653 with the local-only real backup present), including a smoke check on every screen — existing

### Active

<!-- This milestone. Hypotheses until shipped. -->

- [ ] **A clean "export for Claude"** as Markdown tables, derived from the same declaration rather than hand-written as a second serialiser
- [ ] **F3 — an "adding a new tracked thing" checklist** in `CLAUDE.md`, written against the declaration F1 creates
- [ ] **Stop syncing the in-progress workout** — make `draft` device-local
- [ ] **F2 — event delegation** replacing the inline `onclick` attributes, which unlocks a CSP and closes the escaping holes
- [ ] **F4 — `.gitattributes`**, in its own commit, never bundled

### Out of Scope

<!-- Each decided on 2026-09-09, not overlooked. Do not re-open; if one turns out to be wrong,
     say so explicitly rather than quietly planning around it. -->

- **Rewriting or removing cloud sync** — the sync code works, is tested, and is the only automatic off-device backup; when the phone dies, localStorage dies with it. Rewriting it is real data risk for near-zero payoff on a single device. (Answer 1)
- **Deleting or trimming any feature, the lawn scheduler included** — 47 days of usage data show nothing is abandoned. The problem was never feature count; it is that each feature reinvented the sync rules. Ten features with one written rulebook is fine. (Answers 3, 4)
- **Anything about localStorage capacity** — measured from real exports at ~1.3% of budget, on track to reach half of it around 2035. (Answer 5)
- **Switching auth providers** — data is keyed to the current auth uid, so a Google login means a hand migration of `users/{uid}`. Closing signup in the console already solved the actual risk. (Answer 6)
- **Navigation or layout changes** — "workouts are the main function" was a statement about emphasis, not a complaint. Nothing in the usage data suggests the app feels wrong. (Answer 8)
- **Splitting `index.html` into modules** — splitting means a build step, which is the thing that makes the app editable without a toolchain. F1–F3 buy more than splitting would. (F5)
- **App Check** — lower priority now that signup is closed; with no way to obtain an account there is nothing to abuse.

## Context

**The single cause behind nearly every incident.** The rules for a collection are implicit, so each
new collection re-learns them by failing in production. `mobilityLog` forgot its merge rule and read
absence as "off". Migration 15 forgot to `touch()` and persist, and was silently reverted in
production. A missed `liveX()` filter ghosts a deleted row back into a view. A draft short a field
crashed the Log tab — the screen Ian is standing in front of at the rack. Those are not four bugs.
They are one bug, four times.

To know what a "session" is today you must read `blank()`, `MIGRATIONS`, `mergeDB()`,
`validateBackup()` and the `liveSessions()` filter. Adding one new tracked thing means editing all
five, correctly. F1 makes that one line.

**Prior work.** `REVIEW-2026-09-09.md` in the repo root holds the full review, the eight answered
questions, and the agreed phase order. `.planning/codebase/` holds the real GSD codebase map.
`CLAUDE.md` is authoritative and wins on conflict — it carries the war stories that produced every
rule above.

**Already closed, console-only, no code:** Firebase email/password sign-up is disabled; sign-in is
unaffected. `firestore.rules` was reconciled with the console on 2026-09-10 and matches what is
deployed.

**Known correction:** the review estimates F2 at "326 global functions". The markup actually carries
**140** `onclick=` attributes. The decision is unaffected; the size estimate is.

## Constraints

- **Tech stack**: `index.html` is the whole app — HTML, CSS and inline JS in one file, no build step, no dependencies — and stays that way. It is what makes the app installable and offline-first.
- **Module-eval order**: anything reached from `normalize()` runs at module-eval time and must not touch a `const` declared further down. `save()` → `maybeDailySnapshot()` → `snapshotNow()` reaches `SNAP_KEY` (`index.html:679`), which is why `migrationRan` is deliberately consumed at the bottom of the script (`index.html:637`). This temporal-dead-zone trap has already killed the boot once.
- **Sync is a union merge, never an overwrite**: every remote write is a `runTransaction` that re-reads and calls `mergeDB()`. Never `set()`. Never resolve a conflict by "more data wins" — edits legitimately remove sets.
- **Deletes are soft**: never splice a row out of a collection. Set `deletedAt`, call `touch()`, read through `liveX()`.
- **Absence never means "off"**: map collections take the whole inner object from the newer side, so a deleted key reads as "never logged" on the other device. Store an explicit `false`.
- **Migrations that rewrite rows must `touch()` and persist immediately**, must be idempotent, and must never downgrade `_schema`.
- **Derived data uses `saveLocal()`**: `save()` bumps `updatedAt` and triggers a push. The weather cache using `save()` is what let a stale device look "newest" merely by being opened.
- **Escaping**: every user-controlled string rendered into HTML goes through `esc()`. `esc()` does not escape `'`, and attribute interpolations are not escaped at all. Escape attributes too when you touch them.
- **Testing**: `npm test` before every push. A red suite blocks the deploy. Baseline is 226 checks green.
- **Deploy**: push to `main`, GitHub Actions publishes. Single user, single device, production is a phone.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Declare collections once; derive `blank()`, `mergeDB()`, `liveX()` and `validateBackup()` from it | The merge rule cannot be forgotten because there is nowhere left to forget it | ✓ Good — shipped in Phase 1; verified 5/5 |
| The export for Claude is Markdown tables | Cheapest for Claude to read, eyeballable before pasting, no parsing step | — Pending |
| The export derives from `COLLECTIONS`, not a second hand-written serialiser | A separate serialiser is a sixth place the schema would live | — Pending |
| F1's acceptance test is adding a real 11th collection in one line | Behaviour parity proves the refactor didn't break; only a new collection proves the declaration actually pays off | ✓ Good — `sleep` needed no edit to any derived function, asserted by test |
| The 11th collection is `sleep` — `{ kind:'list', key:'id', soft:true, sortBy:'date' }` | List-shaped, so it exercises union merge, soft delete, the `liveX()` filter and the sort invariant; pairs naturally with the workout and weight trends already tracked | ✓ Good — shipped with SCHEMA 18; form conventions confirmed by Ian 2026-09-12 |
| Six phases, one per in-scope item, in the agreed order | Each ships and is verified alone; cleanest rollback on a single-file app | — Pending |
| `.gitattributes` lands in its own commit, alone | `* -text` produces a 4,131-line diff on `index.html`; bundling it would hide a real change inside a reformat | — Pending |
| `draft` stops syncing and becomes device-local | Ian would never finish a workout on another device, so the draft has no reason to cross the wire; removing it deletes a whole bug family | — Pending |
| Keep the ten renamed `_legacy` functions after the real-data differential passed | Deletion is allowed but not urgent; Ian wants SCHEMA 18 to run on the phone for a few days first. 540 committed goldens keep the differential alive once they go | — Pending (Ian, 2026-09-14) |
| Leave sync, features, capacity, auth and layout alone | Each was put to Ian on 2026-09-09 and answered; see Out of Scope | ✓ Good |

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
*Last updated: 2026-09-14 after Phase 1: F1 — The COLLECTIONS Registry*
