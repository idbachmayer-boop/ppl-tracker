# Roadmap: PPL Tracker — Declarative Data Layer

## Overview

This milestone replaces the implicit, five-places-at-once rules governing PPL Tracker's ten (soon
eleven) data collections with one explicit, derived registry — then builds everything that registry
unlocks, in the order Ian already decided on 2026-09-09 and research confirmed has no data-flow
reason to change. Phase 1 declares `COLLECTIONS` and re-derives `blank()`, the `liveX()` filters,
`validateBackup()` and `mergeDB()` from it, proven by adding an eleventh collection (`sleep`) in one
line. Phases 2 and 3 spend that registry: a clean Markdown export for Claude, and a documented recipe
so the next collection after `sleep` doesn't require re-deriving what Phase 1 worked out. Phases 4 and
6 are self-contained fixes (device-local draft, `.gitattributes`) that don't touch the registry in
either direction and can land whenever convenient. Phase 5 replaces all 172 inline event-handler
attributes with delegated listeners, which is what makes Phase 7's hash-based Content-Security-Policy
possible without disabling every clickable control in the app. Phase 1 is the highest-risk phase in
the milestone — it is the only one that touches the merge, soft-delete and migration code paths that
have already caused real, unrecoverable data loss in this app.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: F1 — The COLLECTIONS Registry** - One declared registry replaces the five places a collection's merge/delete/sort rule could be silently forgotten; adding `sleep` in one line is the proof. (completed 2026-09-14)
- [ ] **Phase 2: Export for Claude** - A Markdown export of live data, derived from the same registry and the same views, ready to paste into a Claude conversation.
- [ ] **Phase 3: F3 — Adding a New Tracked Thing (Recipe)** - `CLAUDE.md` gets a numbered recipe for the next collection after `sleep`, written against the shipped registry.
- [ ] **Phase 4: Draft Goes Device-Local** - The in-progress workout stops crossing the wire, closing a whole bug family at the source.
- [ ] **Phase 5: F2 — Event Delegation** - All 172 inline handler attributes become delegated listeners, which is what makes a real CSP possible.
- [ ] **Phase 6: F4 — .gitattributes** - Git stores `index.html`'s bytes exactly, landed alone so the whole-file diff hides nothing.
- [ ] **Phase 7: Content Security Policy** - A hash-based CSP ships without silently breaking the only off-device backup.

## Phase Details

### Phase 1: F1 — The COLLECTIONS Registry

**Goal**: The rules for how a collection merges, soft-deletes, sorts and validates move out of five separately-maintained functions and into one declared registry, so a new or edited collection can no longer silently omit a rule the way `mobilityLog` and Migration 15 already did.
**Depends on**: Nothing (first phase)
**Risk**: Highest-risk phase in this milestone — it is the only phase that touches the merge, soft-delete and migration code paths directly, where a mistake doesn't fail loudly, it silently loses or resurrects real training data, which is exactly how the 2026-07-25 blind-write and Migration-15 incidents happened.
**Requirements**: REG-01, REG-02, REG-03, REG-04, REG-05, REG-06, REG-07, REG-08, REG-09, REG-10, REG-11, REG-12, REG-13, REG-14, REG-15, REG-16, REG-17, SLEEP-01, SLEEP-02, SLEEP-03, SLEEP-04, SLEEP-05, SLEEP-06
**Success Criteria** (what must be TRUE):

  1. `const COLLECTIONS` is declared textually before `let DB = load()`, adjacent to `SCHEMA`/`KEY` and before `MIGRATIONS`; every value inside it is a literal or a reference to a hoisted `function` declaration, never a `const` arrow or a forward `const` reference — checkable by reading the file top to bottom once (REG-02, REG-03, REG-04).
  2. Adding the `sleep` collection touches only `COLLECTIONS` plus its logging/viewing UI — no edits to `blank()`, `mergeDB()`, the `liveX()` filter family, `validateBackup()`, or the exporter's column metadata — and a test asserts this directly (SLEEP-04, SLEEP-05).
  3. A boot-order regression test passes for every schema version from 1 through the current `SCHEMA = 17`, with every declared collection present in the correct shape immediately after boot (REG-15).
  4. Every hand-written function being replaced (`mergeDB_v0` etc.) stays in the file, renamed, and a differential test proves its derived replacement matches it over a real exported backup plus a synthetic two-device fixture for each past incident — before the legacy function is deleted in a later commit (REG-12, REG-13, REG-14).
  5. Two behaviors that must never regress both hold under test: the `gen`-mismatch wholesale-replace still short-circuits before any per-collection merge, so "Erase all data" and Import→Replace still produce zero unioned survivors from the losing side (REG-09, REG-10); and a deleted `sleep` row plus a map collection (`journal`, `mobilityLog`, `lawnLog`) row storing an explicit `false` both survive a stale-device merge replay without resurrecting (SLEEP-06, REG-05, REG-16).

**Plans**: 7/7 plans executed
**UI hint**: yes

Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Tracer: declare COLLECTIONS at the TDZ-safe spot, validate it at module eval, boot every schema through it; settle export columns/format (REG-17)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — Derive blank(), the liveX() family and validateBackup() from COLLECTIONS, one commit each, legacy twins kept (REG-12 steps 1-3)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-03-PLAN.md — Freeze mergeDB as mergeDB_legacy, replay every sync incident, then derive mergeCollections(); gen early return untouched (REG-12 step 4)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 01-04-PLAN.md — Seeded random merge differential + merge laws; .gitignore and the local-only real-backup differential that skips loudly

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 01-05-PLAN.md — sleep as one COLLECTIONS entry (SCHEMA 18), Care → Sleep log/list/delete, SLEEP-05 probe proof
- [x] 01-06-PLAN.md — Checkpoint: Ian exports a real backup into test/local/; the real-data differential must PASS (counts-only record)

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 01-07-PLAN.md — Record legacy outputs as committed goldens, then delete the legacy functions in a later commit (REG-14)

### Phase 2: Export for Claude

**Goal**: Ian can pull a clean, complete Markdown snapshot of his data out of the app for Claude to reason over, generated from the same `COLLECTIONS` declaration and the same live views as the rest of the app, so the export never becomes a second hand-maintained schema.
**Depends on**: Phase 1 (needs `COLLECTIONS`' column/format metadata settled by REG-17, and the derived `liveX()` family)
**Requirements**: EXP-01, EXP-02, EXP-03, EXP-04, EXP-05, EXP-06, EXP-07, EXP-08
**Success Criteria** (what must be TRUE):

  1. Ian can export a Markdown file, separate from and alongside the existing JSON backup, and it opens with a header stating what it is, when it was generated, and the date range covered (EXP-01, EXP-08).
  2. The Markdown table builder itself is derived from `COLLECTIONS`, not hand-written per collection — adding a twelfth collection later requires no exporter edit (EXP-02).
  3. Every table is read through the same `liveX()` path the app's own views use — exporting after deleting a row shows the row absent, along with its internal id, never present with `deletedAt` visible (EXP-04, EXP-05).
  4. Workouts export as one flat row per set (date, workout, exercise, set number, weight, reps), not nested by session (EXP-03).
  5. Dates are ISO format, units appear once in the column header sourced from `DB.unit` rather than hardcoded, and a logged value containing a pipe character or an embedded newline still produces a valid, unbroken table row (EXP-06, EXP-07).

**Plans**: 2/3 plans executed

Plans:
**Wave 1**

- [x] 02-01-PLAN.md — Tracer: COLLECTIONS columns become {field,label,unit}; Markdown export built from the registry and downloaded from Settings; registry contract + EXP-02 probe/static proofs (stops once after the tracer in interactive runs)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 02-02-PLAN.md — Row content: skipped day as one row (D-04), only ticked day flags (D-05), oldest first (D-11), cardio blanks as — (D-09); deleted rows, ids and non-registry data proven absent (EXP-03/04/05, D-07)

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 02-03-PLAN.md — Header with date range and per-section counts (EXP-08, D-13), units/escaping battery (EXP-06/07), share sheet with download fallback (D-01)

### Phase 3: F3 — Adding a New Tracked Thing (Recipe)

**Goal**: The knowledge of how to add a new tracked collection moves out of this milestone's working memory into a numbered recipe in `CLAUDE.md`, so the collection after `sleep` doesn't require re-deriving what Phase 1 already worked out.
**Depends on**: Phase 1 (documents the shipped `COLLECTIONS` shape and placement rule); also reflects Phase 2 (documents the export's `columns` field) — not a hard blocker, but writing it after Phase 2 avoids a rewrite
**Requirements**: DOC-01, DOC-02, DOC-03, DOC-04
**Success Criteria** (what must be TRUE):

  1. `CLAUDE.md` contains a numbered "adding a new tracked thing" recipe, written against the shipped `COLLECTIONS` shape, not the pre-Phase-1 five-places version (DOC-01).
  2. The recipe states the module-eval-time placement rule verbatim (declare before `let DB = load()`; literals or hoisted-function references only) and lists the tests a new collection must ship with, including the stale-device merge replay (DOC-02, DOC-03).
  3. Following the recipe end to end, on paper or a scratch branch, for a collection other than `sleep` produces the correct result with no step missing, wrong, or requiring outside knowledge (DOC-04).

**Plans**: TBD

Plans:

- [ ] 03-01: TBD

### Phase 4: Draft Goes Device-Local

**Goal**: The in-progress workout stops crossing the wire at all, so a crash or a malformed legacy `draft` field arriving from another device can never corrupt or clear the workout Ian is mid-set on, at the rack, right now.
**Depends on**: Nothing — independent of Phase 1's `COLLECTIONS` registry in both directions, since `draft` is a scalar `DB` field, never a declared collection. Note: this phase edits the same merge boundary Phase 1 hardens, so apply the same never-delete-in-the-same-commit discipline regardless of execution order relative to Phase 1.
**Requirements**: DRAFT-01, DRAFT-02, DRAFT-03, DRAFT-04, DRAFT-05
**Success Criteria** (what must be TRUE):

  1. Finishing or discarding a workout produces no cloud write containing `draft` state, following the same exclusion pattern already used for the `wx` weather cache (DRAFT-01, DRAFT-04).
  2. A cloud document still carrying a legacy `draft` field from before this change cannot reintroduce a draft onto a device that opens the app after the change ships (DRAFT-02).
  3. The Log tab renders without error when the cloud document's legacy `draft` field is malformed or absent (DRAFT-03).
  4. Closing and reopening the app on the same device preserves the in-progress workout exactly as it was left (DRAFT-05).

**Plans**: TBD

Plans:

- [ ] 04-01: TBD

### Phase 5: F2 — Event Delegation

**Goal**: All 172 inline handler attributes are replaced by delegated listeners reading `data-*` attributes, so markup no longer calls global functions by name and a Content-Security-Policy can restrict script execution without disabling the app.
**Depends on**: Nothing — independent of Phase 1's `COLLECTIONS` registry in both directions.
**Requirements**: DELEG-01, DELEG-02, DELEG-03, DELEG-04, DELEG-05, DELEG-06, DELEG-07
**Success Criteria** (what must be TRUE):

  1. A static inventory of all 172 inline handler attributes (140 `onclick`, 14 `onchange`, 13 `oninput`, 3 `onkeydown`, 2 `onpointerdown`) is captured before any are touched, and a static completeness check cross-references that inventory against the delegated dispatcher afterward (DELEG-01, DELEG-03).
  2. Grepping the shipped `index.html` for `on(click|change|input|keydown|pointerdown)=` returns zero matches — no handler is reachable only through a global function called by name from markup (DELEG-02, DELEG-04).
  3. Every `stopPropagation()` call in the file has been found and confirmed not to break delegation (DELEG-05).
  4. Every converted control is still operable by keyboard, not only by pointer or click (DELEG-06).
  5. The Log tab — the screen Ian is standing in front of mid-workout — is manually verified end to end and behaves identically to before the conversion (DELEG-07).

**Plans**: TBD
**UI hint**: yes

Plans:

- [ ] 05-01: TBD

### Phase 6: F4 — .gitattributes

**Goal**: Git stores `index.html`'s bytes exactly as written instead of letting `core.autocrlf` silently rewrite line endings, so a future line-ending flip can never disguise a real change inside a multi-thousand-line reformat diff.
**Depends on**: Nothing — independent of Phase 1's `COLLECTIONS` registry in both directions; can land at any point in the milestone.
**Requirements**: REPO-01, REPO-02
**Success Criteria** (what must be TRUE):

  1. A `.gitattributes` file exists that makes git store `index.html` bytes exactly, ending `core.autocrlf` rewriting (REPO-01).
  2. The commit that adds `.gitattributes` contains nothing else — the resulting whole-file diff is isolated to its own commit, verifiable by inspecting that commit's file list (REPO-02).

**Plans**: TBD

Plans:

- [ ] 06-01: TBD

### Phase 7: Content Security Policy

**Goal**: A hash-based Content-Security-Policy ships that blocks arbitrary injected script while explicitly keeping the three Firebase SDK scripts and Firebase's runtime endpoints allowed, so tightening security is never the thing that silently kills the app's only off-device backup.
**Depends on**: Phase 5 (a hash-based `script-src` cannot coexist with 172 inline handler attributes without `unsafe-inline` or the fragile, Safari-inconsistent `unsafe-hashes`; delegation must land first)
**Requirements**: CSP-01, CSP-02, CSP-03, CSP-04, CSP-05, CSP-06, CSP-07
**Success Criteria** (what must be TRUE):

  1. A `<meta http-equiv="Content-Security-Policy">` tag ships with a hash-based `script-src` covering the inline script block, and `https://www.gstatic.com` is allow-listed so the three Firebase SDK scripts still load (CSP-01, CSP-02).
  2. `connect-src` explicitly covers Firebase's runtime endpoints and the weather API hosts, built from a hand inventory rather than a grep of `index.html` (they don't appear in a static grep), and `style-src` keeps `'unsafe-inline'` as a documented, deliberate decision (CSP-03, CSP-04).
  3. Loading the app against a local static file server shows a DevTools console with zero CSP violations before the policy is pushed to production — the only pre-production check available, since meta CSP has no report-only mode (CSP-05).
  4. After the policy is live, cloud sync is confirmed working by an actual sync check (e.g., a round-trip write observed in Firestore), never merely assumed because the app loads normally (CSP-06).
  5. `CLAUDE.md` documents the manual hash-regeneration command, so a future edit to the inline script cannot silently break the policy (CSP-07).

**Plans**: TBD

Plans:

- [ ] 07-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7. Phases 4 and 6 have no dependency on
Phase 1 in either direction and may be pulled earlier if convenient; Phase 7 must not start before
Phase 5 completes.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. F1 — The COLLECTIONS Registry | 7/7 | Complete    | 2026-09-14 |
| 2. Export for Claude | 2/3 | In Progress|  |
| 3. F3 — Adding a New Tracked Thing (Recipe) | 0/TBD | Not started | - |
| 4. Draft Goes Device-Local | 0/TBD | Not started | - |
| 5. F2 — Event Delegation | 0/TBD | Not started | - |
| 6. F4 — .gitattributes | 0/TBD | Not started | - |
| 7. Content Security Policy | 0/TBD | Not started | - |
