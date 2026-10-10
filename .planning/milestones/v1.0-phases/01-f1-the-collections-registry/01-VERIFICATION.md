---
phase: 01-f1-the-collections-registry
verified: 2026-09-14T09:51:01Z
status: passed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
---

# Phase 1: F1 — The COLLECTIONS Registry Verification Report

**Phase Goal:** The rules for how a collection merges, soft-deletes, sorts and validates move out of
five separately-maintained functions and into one declared registry, so a new or edited collection can
no longer silently omit a rule the way `mobilityLog` and Migration 15 already did.

**Verified:** 2026-09-14T09:51:01Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `const COLLECTIONS` declared textually before `let DB = load()`, adjacent to `SCHEMA`/`KEY`, before `MIGRATIONS`; every value is a literal or a hoisted `function` reference, never a `const` arrow or forward `const` | ✓ VERIFIED | `index.html:474` `const SCHEMA`, `:489` `const COLLECTIONS`, `:511` `const MIGRATIONS`, `:676` `let DB = load()` — strict textual order. `sessKey`/`todoKey`/`hobbyKey`/`cardioKey`/`ideaKey`/`sessionSort` are all `function` declarations (`index.html:3785-3792`), none are `const` arrows. Suite: `placement: COLLECTIONS sits after SCHEMA, before MIGRATIONS and before let DB = load()` passes. |
| 2 | Adding `sleep` touches only `COLLECTIONS` plus logging/viewing UI — no edit to `blank()`, `mergeDB()`, `liveX()` family, `validateBackup()`, or exporter column metadata — asserted directly by a test | ✓ VERIFIED | `sleep` is a single line (`index.html:504`), last entry. Structural checks `SLEEP-04: no derived consumer mentions sleep`, `there is no liveSleep wrapper`, `viewSleep reads through liveOf('sleep')`, `sleep is declared once, as the last entry` all pass. Live behavioral proof (SLEEP-05, 8 checks) injects a throwaway list+map collection via `test/harness.js` `opts.transform` and shows `blank()`/`liveOf()`/`validateBackup()`/`mergeDB()` pick it up with zero further code. |
| 3 | A boot-order regression test passes for every schema version 1 through current `SCHEMA` (originally "17" in ROADMAP text, correctly now 18 per plan 01-05's schema bump — see Known Decisions), every declared collection present in correct shape after boot | ✓ VERIFIED | `test/app.test.js:1683` `for(let v = 0; v <= app.SCHEMA; v++)` — confirmed programmatically: `app.SCHEMA === 18`, loop covers 0..18 inclusive. `MIGRATIONS` keys are exactly `[1..18]`, no gap (verified live via `loadApp`). Suite: 19 `boot: schema N → every declared collection shaped` checks pass. |
| 4 | Every hand-written function being replaced stays in the file, renamed; differential test proves derived replacement matches it over a real exported backup plus synthetic two-device fixtures per past incident — before the legacy function is deleted in a later commit | ✓ VERIFIED (constraint honored; deletion deferred by decision) | 10 legacy functions confirmed present (`grep -c '_legacy(' index.html` → 12 references across `blank_legacy`, 7×`live*_legacy`, `validateBackup_legacy`, `mergeDB_legacy`). REG-13 differential ran to completion over Ian's real backup on 2026-09-14: suite prints `653 passed, 0 failed, 0 skipped`, 30 `PASS  real backup: ` lines, 0 SKIP lines. Per-incident synthetic fixtures (2026-07-25 blind-write, Migration-15 revert, explicit-false-vs-absent, Erase all data, Import→Replace, ties, races) all pass. REG-14 (deletion) is intentionally `[ ]` (not `[x]`) in REQUIREMENTS.md — Ian deferred Task 2 on 2026-09-14 ("keep for now"), tracked as a Pending Todo in STATE.md with its precondition already met. Since nothing was deleted, the ordering constraint ("only in a commit later than its replacement") holds vacuously; this is a tracked follow-up, not a gap. |
| 5 | `gen`-mismatch wholesale-replace short-circuits before per-collection merge (Erase all data / Import→Replace give zero unioned survivors); a deleted `sleep` row and a map row storing explicit `false` both survive a stale-device merge replay | ✓ VERIFIED | `index.html:3910-3924`: gen-mismatch block is the first `return` in `mergeDB()`, textually unchanged, returns before `mergeCollections()` is ever called (confirmed: no `mergeUnion`/`mergeDateMap` calls inside `mergeDB()`'s own body). Suite: `merge incident: Erase all data: the erased side wins wholesale` (both argument orders), `gen off by one: 3 vs 4 replaces wholesale` all pass. SLEEP-06 (`sleep: a deleted night is not resurrected by a stale device`) and REG-16/explicit-false tests (`explicit false beats an older true (mobilityLog/lawnLog)`) pass. |

**Score:** 5/5 truths verified

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|---|---|---|---|
| REG-01 | `COLLECTIONS` declares kind/key/sortBy/merge/soft in one place | ✓ SATISFIED | `index.html:489-505`; `collectionProblems()` at `:3822` |
| REG-02 | Declared before `let DB = load()`, adjacent SCHEMA/KEY, before MIGRATIONS | ✓ SATISFIED | Textual offsets confirmed above |
| REG-03 | Every value literal or hoisted `function` ref, never `const` arrow/forward `const` | ✓ SATISFIED | All 6 key/sort functions are `function` declarations |
| REG-04 | Composite-key arrows promoted to `function` declarations | ✓ SATISFIED | `sessKey`, `todoKey`, `hobbyKey`, `cardioKey`, `ideaKey` all `function` |
| REG-05 | `merge` explicit required field, no inferred default; map with no merge fails loudly | ✓ SATISFIED | `mergeCollections()` throws naming the collection on unrecognised/missing strategy (`index.html:3892`,`3904`) |
| REG-06 | `blank()` derived from `COLLECTIONS` | ✓ SATISFIED | `index.html:686-692` — `for(const name in COLLECTIONS)` loop, reads only `kind` |
| REG-07 | `liveX()` filters derived from `COLLECTIONS` | ✓ SATISFIED | `liveOf(name)` (`:712-716`) is the single filter body; 7 one-line wrappers delegate |
| REG-08 | `validateBackup()` shape checks derived, strict parity | ✓ SATISFIED | 3-pass derivation, differential-tested string-identical vs `validateBackup_legacy` |
| REG-09 | `mergeDB()` per-collection merging derived | ✓ SATISFIED | `mergeCollections()` call inside `mergeDB()`, no direct `mergeUnion`/`mergeDateMap` calls in `mergeDB()` |
| REG-10 | gen-mismatch early return untouched by derived loop | ✓ SATISFIED | Confirmed above (Truth 5) |
| REG-11 | `MIGRATIONS` hand-written, not derived, may read `COLLECTIONS` one-way | ✓ SATISFIED | `MIGRATIONS` is a hand object literal; keys exactly 1..18, no gap (confirmed live) |
| REG-12 | Each consumer replaced in own commit, cheapest-first, mergeDB last | ✓ SATISFIED | `git log --reverse` shows `REG-12 step 1/4` (`a044bfd`) → `2/4` (`f7818c7`) → `3/4` (`2e37053`) → `4/4` (`04c127b`) in order |
| REG-13 | Replaced function kept renamed, differential-tested over real backup + synthetic fixtures | ✓ SATISFIED | Real-backup differential PASS (653/0/0, 30 real-backup checks); 400-case seeded random battery; per-incident fixtures |
| REG-14 | Legacy functions deleted only in a later commit than their replacement, never the same one | ⚠ CONSTRAINT HOLDS, DEFERRED | Deletion (Task 2 of plan 01-07) explicitly deferred by Ian on 2026-09-14 — precondition met, tracked as Pending Todo in STATE.md. Marked `[ ]` (honestly incomplete) in REQUIREMENTS.md, not `[x]`. Not a gap — a recorded, informed human decision. |
| REG-15 | Boot-order regression across every schema version | ✓ SATISFIED | Loop covers schema 0..18 |
| REG-16 | Row rewrites require touch+persist+idempotent+replay test, or don't ship | ✓ SATISFIED | `ensureCollectionDefaults()` creates only absent collections, never rewrites; no-rewrite test passes |
| REG-17 | `COLLECTIONS` carries column/format metadata for the exporter | ✓ SATISFIED | Every entry has `columns`; 4 format functions (`sessionRows`, `hobbyRows`, `journalRows`, `dayFlagRows`) |
| SLEEP-01 | `sleep` added to `COLLECTIONS` as `{kind:'list', key:'id', soft:true, sortBy:'date'}` | ✓ SATISFIED | `index.html:504` |
| SLEEP-02 | Ian can log hours/quality(1-5)/optional note | ✓ SATISFIED | `addSleep()` (`:3707`); form conventions confirmed by Ian at visual checkpoint 2026-09-12 (per Known Decisions — not re-litigated) |
| SLEEP-03 | Ian can see logged sleep as dated series, delete an entry | ✓ SATISFIED | `viewSleep()` (`:3721`), `removeSleep()` (`:3720`, soft delete) |
| SLEEP-04 | Adding sleep required only one COLLECTIONS entry + view, no edits elsewhere | ✓ SATISFIED | Structural checks pass (see Truth 2) |
| SLEEP-05 | Test asserts SLEEP-04 — declaration alone triggers pickup | ✓ SATISFIED | Live probe-injection test, 8 checks, all pass |
| SLEEP-06 | Deleted sleep entry survives stale-device merge replay | ✓ SATISFIED | 3 checks pass (basic replay, mtime tie, no-sleep-key device) |

No orphaned requirements — all 23 IDs from PLAN frontmatter (REG-01…REG-17, SLEEP-01…SLEEP-06) are present in REQUIREMENTS.md mapped to "Phase 1".

### Test Suite

`TZ=America/Chicago npm test` final line:

```
653 passed, 0 failed, 0 skipped
```

(0 skipped confirms `test/local/real-db-snapshot.json` is present on this machine and the real-backup differential ran to completion rather than being skipped — consistent with plan 01-06's recorded PASS.)

### Anti-Patterns Found

Scanned `index.html`, `test/app.test.js`, `test/harness.js`, `.gitignore` for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER` and stub patterns. Only match: `TODO_CAP` (`index.html:1563-1576`), a constant name for the app's to-do list "show more" cap — not a debt marker. No other matches. No blockers.

### Privacy Check

`test/local/real-db-snapshot.json`: confirmed present and `git check-ignore -q` exits 0 (ignored). Not read, not staged, not committed by this verification. `test/fixtures/merge-golden.json` (540 hashes, committed) contains no `golden()` calls inside the real-backup test block — confirmed by direct inspection — so no real-data content is baked into the committed goldens.

### Known Decisions Honored (not re-litigated)

- **Plan 01-07 partial status by design:** Task 1 (540 goldens from legacy code, commit `c5463bd`) done; Task 2 (delete 10 `_legacy` functions) deferred by Ian 2026-09-14, tracked in STATE.md Pending Todos, precondition already met. REG-14 correctly left unchecked in REQUIREMENTS.md.
- **SLEEP-02 form conventions:** confirmed by Ian at visual checkpoint 2026-09-12 — treated as resolved.
- **Plan 01-06 real-backup PASS:** 30 checks, 653/0/0, recorded counts-only in 01-06-SUMMARY.md — reproduced independently by this verification's own `npm test` run (653/0/0).
- **ROADMAP SC3 "SCHEMA = 17":** plan 01-05 correctly bumped SCHEMA to 18 per the project's schema ritual; boot test now covers 0-18. Criterion text predates the bump; the underlying property (full-range boot regression) holds at the current SCHEMA value.

### Human Verification Required

None. All Success Criteria are backed by static/behavioral evidence in the codebase and a reproduced green test run. SLEEP-02's visual/UX checkpoint was already completed and confirmed by Ian on 2026-09-12 (documented in STATE.md and 01-05-SUMMARY.md) — not re-opened here.

### Gaps Summary

No gaps. REG-14's deletion step is an explicit, tracked, informed deferral by the project owner (not an execution failure) — recorded above and left as STATE.md's existing Pending Todo, per the verification brief's instruction not to re-litigate this decision.

---

_Verified: 2026-09-14T09:51:01Z_
_Verifier: Claude (gsd-verifier)_
