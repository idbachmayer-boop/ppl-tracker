---
phase: 03-f3-adding-a-new-tracked-thing-recipe
plan: 05
subsystem: testing
tags: [markdown-docs, recipe, rehearsal, schema-migration, map-collection]

# Dependency graph
requires:
  - phase: 03-f3-adding-a-new-tracked-thing-recipe
    provides: "plan 03-01's CLAUDE.md spine and docs/adding-a-collection.md skeleton; plan 03-02's Dry Run A data-layer probe; plan 03-03's six-step spine and full companion doc; plan 03-04's verbatim placement-rule quote and copy-paste round-trip"
provides:
  - "docs/adding-a-collection.md § 'Registry validity' — the INTRODUCED_AT boot-compatibility table and the merge-golden.json regeneration command (WRITE_MERGE_GOLDEN=1), neither previously named anywhere in the recipe"
  - "docs/adding-a-collection.md § 'The hand-written UI' — split into a list-shaped/soft-delete (sleep) pattern and a map-shaped/whole-day-replace (mobilityLog) pattern; the single sleep-generalized pattern was actively wrong for a map collection"
  - "docs/adding-a-collection.md § 'A stale-device merge replay' and § 'An explicit-false replay' — clarified as two distinct required fixtures for a map collection, not a duplicate, even though both exercise replace-whole"
  - "docs/adding-a-collection.md § 'An export smoke test, optional but recommended' — new subsection"
  - "docs/adding-a-collection.md § 'Rehearsal record' — dated record that the recipe was walked cold end to end, not only written"
  - "CLAUDE.md step 1 — a retarget-the-last-entry-test note; step 2 — a pointer to the golden-fixture gotcha"
affects: []

actuals:
  tokens: 2426
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns:
    - "rehearsal-then-fold-back: a throwaway scratch-branch cold walk is the only honest instrument for a human-comprehension claim ('the recipe, read cold, produces the correct result with no step missing/wrong/requiring outside knowledge') that a machine-verified probe (Dry Run A) structurally cannot reach"

key-files:
  modified:
    - CLAUDE.md
    - docs/adding-a-collection.md

key-decisions:
  - "Task 3's evidence question (RESEARCH.md Open Questions Q1) was left at its plan-specified default: a narrative rehearsal record, not a preserved scratch-branch diff. Surfaced explicitly below rather than decided silently — see 'Open Question Surfaced, Not Decided'."
  - "The scratch branch used a real registry entry, a real SCHEMA bump, and a real hand-written UI (not a transform-injected probe like Dry Run A's), because the plan's whole point was proving the recipe against the one step Dry Run A structurally cannot reach: the hand-written UI."
  - "Both required-test-category gaps for a map collection ('stale-device replay' vs 'explicit-false replay') were resolved by writing two distinct fixtures — whole-day-cleared vs single-key-false — rather than treating the categories as literally identical, and the companion doc now says so."

requirements-completed: [DOC-04, DOC-01]

coverage:
  - id: D1
    description: "The recipe was followed cold, end to end, for a map-shaped collection (`supplements`) that is not `sleep`, on a scratch branch that ran a real `npm test` to green (767 passed, 0 failed, 2 skipped at the green point), then was torn down — commit made, switched back, force-deleted, `index.html`/`test/harness.js`/`test/app.test.js` confirmed byte-identical to their pre-rehearsal SHA-256 hashes, `git log --oneline -1` confirmed equal to the starting commit"
    requirement: "DOC-04"
    verification:
      - kind: other
        ref: "SHA-256 hash comparison of index.html, test/harness.js, test/app.test.js before vs. after teardown (identical); git status --porcelain empty; git branch --list '*dry-run-b*' empty; git log --oneline -1 == 32c6dbe (starting commit) both before and after"
        status: pass
      - kind: other
        ref: "npm test on the scratch branch at the green point: 767 passed, 0 failed, 2 skipped (14 new supplements-specific PASS lines plus all pre-existing checks)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every place the recipe was insufficient is recorded as a named gap with its step, classification (missing/wrong/outside knowledge/friction), and disposition (fixed in spine, fixed in companion doc, or out of scope with reason)"
    requirement: "DOC-01"
    verification:
      - kind: other
        ref: "Gap log below — 8 entries, one per numbered recipe step plus one cross-cutting finding, each with a disposition"
        status: pass
    human_judgment: false
  - id: D3
    description: "No enforcement check from plans 03-01, 03-02, 03-04 was weakened while closing gaps; git diff for Task 2 touches only CLAUDE.md and docs/adding-a-collection.md; the spine still holds exactly six numbered steps"
    requirement: "DOC-01"
    verification:
      - kind: unit
        ref: "npm test after Task 2/3 edits: 748 passed, 0 failed, 2 skipped — identical to the phase's pre-plan baseline"
        status: pass
      - kind: other
        ref: "git diff --name-only for Task 2's commit (cb5ea5a): CLAUDE.md, docs/adding-a-collection.md only; for Task 3's commit (431f5a6): docs/adding-a-collection.md only"
        status: pass
      - kind: other
        ref: "sed -n '62,113p' CLAUDE.md — six numbered steps (1-6), 45-line body (lines 67-111)"
        status: pass
    human_judgment: false
  - id: D4
    description: "docs/adding-a-collection.md carries a 5-12 line 'Rehearsal record' naming what was walked, when, the discarded branch and why, the gap count, and the honest ceiling (a green suite proves the code, not the prose)"
    requirement: "DOC-04"
    verification:
      - kind: unit
        ref: "npm test — 'recipe: the companion doc's copy-paste entry still passes the live validator' and full suite green"
        status: pass
      - kind: other
        ref: "Rehearsal record section is 10 lines, dated 2026-09-21, names supplements/map-shaped/replace-whole/explicitFalse, the discard reason (SCHEMA bump is one-way), 8 gaps found, and the code-vs-prose ceiling"
        status: pass
    human_judgment: true
    rationale: "Whether the narrative record is sufficient evidence of rehearsal, versus preserving the scratch-branch diff, is a documentation-completeness judgment the plan explicitly defers to Ian rather than deciding by test."

duration: ~20min
completed: 2026-09-21
status: complete
---

# Phase 3 Plan 05: Dry Run B — cold rehearsal and gap closure Summary

**Walked CLAUDE.md's "Adding a new tracked thing" recipe cold on a throwaway scratch branch for a real map-shaped `supplements` collection, found 8 gaps a machine-verified probe could never surface (most consequential: a `SCHEMA` bump silently invalidates the committed golden-fixture file, and the hand-written-UI pattern was wrong for a map), closed every one in `CLAUDE.md`/`docs/adding-a-collection.md`, and left zero code change behind.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-09-21T12:34:35Z
- **Tasks:** 3 (Task 1 produced no surviving commit by design — its output is this gap log)
- **Files modified:** 2 (`CLAUDE.md`, `docs/adding-a-collection.md`)

## Accomplishments

- **Task 1 — the cold walk.** Followed only `CLAUDE.md` § "Adding a new tracked thing" and
  `docs/adding-a-collection.md` (never `index.html`/`test/app.test.js`/`test/harness.js` up front) to
  add a real `supplements` collection — map-shaped, `merge:'replace-whole'`, `explicitFalse:true`,
  chosen because `sleep` is list-shaped and never exercised the map-only branches or the
  hand-written-UI's map pattern — on scratch branch `scratch/dry-run-b-supplements`. Bumped `SCHEMA`
  18→19, added `MIGRATIONS[19]`, wrote a toggle-checkbox UI (`SUPPLEMENTS`/`supplementsToday()`/
  `toggleSupplement()`/`viewSupplements()`), wired the Care tab's router, added 14 required tests
  (registry validity, stale-device replay, explicit-false replay, `validateBackup()` shape, UI
  behaviour, structural proof, export smoke), and got `npm test` green (767 passed, 0 failed, 2
  skipped) — after resolving a cascade of 57 failures caused entirely by the `SCHEMA` bump (see gap
  log). Committed the rehearsal (`d1d63b7`, scratch branch only), switched back to
  `claude/elastic-nash-8dfd46`, force-deleted the scratch branch. Confirmed via SHA-256 that
  `index.html`, `test/harness.js` and `test/app.test.js` are byte-identical to their pre-rehearsal
  state, `git status --porcelain` is empty, and `git log --oneline -1` equals the starting commit
  (`32c6dbe`) both before and after.
- **Task 2 — closed every gap.** Fixed the golden-fixture and boot-compatibility-table gaps in
  `docs/adding-a-collection.md` § "Registry validity" (worked detail) plus a one-line pointer in
  `CLAUDE.md` step 2 (the rule that bites); fixed the stale-last-entry-test gap with a one-line
  addition to `CLAUDE.md` step 1; split "The hand-written UI" into two named patterns (list-shaped/
  soft-delete vs map-shaped/whole-day-replace); clarified the stale-device-replay vs explicit-false
  overlap for maps; scoped the "UI behaviour" checklist to the shape actually built; added an "export
  smoke test" subsection. No enforcement check weakened — `npm test` stayed at the phase baseline
  (748 passed, 0 failed, 2 skipped) throughout, and `git diff --name-only` for this task touched only
  `CLAUDE.md` and `docs/adding-a-collection.md`.
- **Task 3 — the rehearsal record.** Added a 10-line `## Rehearsal record` to
  `docs/adding-a-collection.md` naming the date, collection, shape, discard reason, gap count, and
  the honest ceiling (a green suite proves the resulting code, not that the prose is what got the
  walker there). Surfaced RESEARCH.md's Open Questions Q1 rather than deciding it (see below).

## Task Commits

1. **Task 1: Walk the recipe cold for `supplements` on a scratch branch** — no surviving commit by
   design. The rehearsal commit (`d1d63b7`) lived only on `scratch/dry-run-b-supplements`, which was
   force-deleted immediately after teardown; it was never merged, pushed, or cherry-picked. The
   task's actual deliverable — the gap log below — is this SUMMARY.
2. **Task 2: Close every recorded gap in the recipe** — `cb5ea5a` (docs)
3. **Task 3: Write the rehearsal record and close the phase's documentation loop** — `431f5a6` (docs)

## Files Created/Modified

- `CLAUDE.md` — step 1 gained a one-line "retarget the previous last-entry test" note; step 2 gained
  a one-line pointer to the golden-fixture gotcha. Net +2 lines; the numbered-step body is still
  exactly 45 lines, six steps.
- `docs/adding-a-collection.md` — "Registry validity" gained the `INTRODUCED_AT` table and
  `WRITE_MERGE_GOLDEN=1` worked detail; "The hand-written UI" split into two named patterns; "A
  stale-device merge replay" and "UI behaviour" each gained a clarifying paragraph; new "An export
  smoke test" and "Rehearsal record" sections. `grep -c "registry-contract:"` still returns 3 — no
  contract surface touched.

## The Gap Log

Every numbered recipe step, even where the recipe held up. Classification is one of **missing**,
**wrong**, **outside knowledge**, **friction**, per the four categories the plan defines.

| # | Step | Classification | What happened | Disposition |
|---|------|-----------------|----------------|-------------|
| 1 | Step 1 (add the entry) | *no gap* | The verbatim placement-rule quote and the copy-paste example entry were fully sufficient; the entry was added correctly on the first try. | — |
| 2 | Step 1 (add the entry) | **missing** | The pre-existing `"SLEEP-04: sleep is declared once, as the last entry"` test hardcodes the assumption that `sleep` is the final `COLLECTIONS` key. Adding `supplements` after it broke that test by construction, and nothing in step 1's "goes last" instruction warns a walker that the *previous* last-entry's structural test needs retargeting. | **Fixed in spine** — `CLAUDE.md` step 1, one-line addition. |
| 3 | Step 2 (bump `SCHEMA`) | **missing**, high severity | Bumping `SCHEMA` 18→19 silently invalidated the committed `test/fixtures/merge-golden.json` (several fixtures embed `_schema`), producing ~50 `"hash differs"` failures with nothing in the failure text pointing at `SCHEMA`. Neither `CLAUDE.md` nor the companion doc mentions the golden-fixture mechanism, the `WRITE_MERGE_GOLDEN=1` regeneration command, or that it exists at all. This was the single most consequential gap of the walk. | **Fixed in spine** (one-line pointer, step 2) **+ companion doc** ("Registry validity", full worked detail: the command, why, and a caution to grep for hardcoded old-`SCHEMA`-literal tests elsewhere in the suite, which broke for the identical reason). |
| 4 | Step 2 (bump `SCHEMA`) | **missing**, high severity | REG-15's "every schema version boots" block (`INTRODUCED_AT` table in `test/app.test.js`) requires a `collectionName: schemaVersion` entry for every collection or fails loudly (`"boot: introduced-at table knows X"`). This table and the requirement to update it is never named in `CLAUDE.md` or the companion doc. | **Fixed in companion doc** — "Registry validity" now names the table and the failure mode explicitly. |
| 5 | Step 3 (hand-written UI) | **wrong**, high severity | The companion doc's "The hand-written UI" section is explicitly generalized from `sleep` (list-shaped, soft-delete): id helper, add-via-`touch()`+`save()`, remove-via-`softDelete()`, view-via-`liveOf()`, router wiring. None of the first four transfer to a map-shaped collection like `supplements`/`mobilityLog`: there is no row id, no add distinct from remove (a single toggle), no `softDelete()` (a map must declare `soft:false`), and `liveOf()` **throws** for a map by name (confirmed by reading its guard clause) — so "reads its rows through `liveOf()`" is actively incorrect for this shape. I only discovered the real pattern by opening `index.html` to read `mobToday()`/`toggleMobility()`/`mobilityRows()` directly; the recipe never pointed at them. | **Fixed in companion doc** — split into a list-shaped/soft-delete pattern and a new map-shaped/whole-day-replace pattern with its own three-piece structure. |
| 6 | Step 4 (tests) | **friction** | "A stale-device merge replay" (required for every collection) and "An explicit-`false` replay" (map-only) are presented as clearly distinct categories, but for a map collection both exercise `merge:'replace-whole'` and it's not obvious from the text whether writing two near-identical tests is expected or a sign of misunderstanding. Resolved by writing two deliberately distinct fixtures (whole-day-cleared vs single-key-false). | **Fixed in companion doc** — one clarifying paragraph noting these are two distinct required fixtures for a map, not a duplicate. |
| 7 | Step 4 (tests) | **outside knowledge** | "UI behaviour" (form validation/clamping, escaping, soft delete, router) assumes a free-text, soft-deletable list UI. For a fixed-vocabulary toggle map UI, only the router-exposure check transfers cleanly — the rest don't apply and the recipe doesn't say so. | **Fixed in companion doc** — one sentence scoping the checklist to the shape actually built. |
| 8 | Step 4 (tests), general | **missing**, medium severity | Step 4's six categories don't include an "export smoke test," even though step 6 claims a new collection "exports itself" and both `sleep` and Dry Run A carry exactly this kind of check. | **Fixed in companion doc** — new "An export smoke test, optional but recommended" subsection. |
| 9 | Step 4 (tests), general | **out of scope, with reason** | No category in step 4 shows actual test code (`ok()`, `golden()`, `clone()`, `canon()`, harness helpers) — every one of the six required categories needed opening `test/app.test.js` to find and imitate an analogous block, beyond what the existing "grep before trusting a citation" caveat implies. | **Out of scope** — showing full test code in the companion doc would duplicate `test/app.test.js` and rot the moment a harness helper changes; the citation-by-label-substring approach with the grep caveat is the intentional, lower-maintenance alternative. This is a structural limit of prose documentation, not a closable gap. |
| 10 | Step 5 (`npm test`) | *no gap* | Straightforward once the step-2/step-4 gaps above were resolved. | — |
| 11 | Step 6 (exporter) | *no gap* | Confirmed `supplements` exported its own section via `buildMarkdownExport()` with zero exporter-file edits, matching the claim. | — |
| 12 | Harness mechanic | *no gap* | `test/harness.js`'s exported-names list, as documented, worked correctly the first time. | — |

**Count check:** 12 gap-log entries above (4 "no gap" + 8 with a real finding); every finding has a
disposition (7 fixed in companion doc, 2 fixed in spine — one counted twice across both, 1 out of
scope with reason). None was silently dropped.

## Decisions Made

- **Scratch collection choice:** `supplements`, map-shaped like `mobilityLog` — per the plan's A1
  flagged assumption, any map-shaped candidate was acceptable; `supplements` was chosen over other
  candidates only because it named a plausible real feature without implying a decision Ian hasn't
  made (label `'Supplements'`, three-item fixed list: Creatine, Vitamin D, Fish oil — synthetic
  values, never copied from Ian's real data, per the plan's REG-13 precedent prohibition).
- Both stale-device-replay and explicit-false-replay tests were written as distinct fixtures for the
  map shape (see gap #6), rather than treating docs' two categories as coincidentally identical for a
  map.
- Golden-fixture and hardcoded-schema-literal fixes during the rehearsal (Task 1) were applied
  directly to `test/app.test.js` and `test/fixtures/merge-golden.json` on the scratch branch to reach
  green — these are throwaway, discarded with the branch, and are recorded here only as evidence for
  the gap log, not as changes that survive.

## Deviations from Plan

None beyond what the plan itself anticipated (Task 1's precondition, teardown, and gap-log mechanics
were followed exactly as specified). No Rule 1-4 deviation was needed: every fix that would normally
route through deviation rules was already in-scope as a Task 2 "close the gap" action per the plan's
own instructions.

## Open Question Surfaced, Not Decided

RESEARCH.md § Open Questions, Q1 asks whether the scratch-branch artifact should be preserved as
evidence that the recipe was rehearsed, or whether a narrative record (this SUMMARY plus the
Rehearsal record section) suffices. Per the plan's explicit instruction, this execution proceeded
with the default — the narrative record — and did not preserve the scratch-branch diff (it was force-
deleted per Task 1's mandatory teardown; recovering it would require `git reflog` on this worktree
before garbage collection runs). This is surfaced here for a human decision, not resolved: if a
preserved diff is wanted going forward, a future plan would need to capture it *before* teardown
(e.g., as a patch file committed elsewhere), since Task 1's teardown is unconditional and happens
before this SUMMARY exists.

## Issues Encountered

The 57 cascading test failures after the `SCHEMA` bump (gap log entries #3-4) initially looked like a
regression in the new `supplements` code. Root-caused via the `golden()` function's own documentation
comment in `test/app.test.js` (lines 27-63): the committed golden hashes are `fnv1a` of the *legacy*
code's output at record time, compared against the *derived* code's current output — both sides
embed `_schema` from several fixtures, so the two diverge the moment `SCHEMA` changes even though
nothing about legacy/derived equivalence changed. Regenerating via `WRITE_MERGE_GOLDEN=1 node
test/app.test.js` cleared 51 of the 57 failures immediately; the remaining 6 were the `INTRODUCED_AT`
table gap, two hardcoded-`18` schema-literal tests, and the stale last-entry test, each fixed
individually (see gap log).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- DOC-04 is now satisfied by both halves: Dry Run A (plan 03-02) machine-proves the data-layer half
  exhaustively; Dry Run B (this plan) proves the prose against a real, cold walkthrough of a
  map-shaped collection including the hand-written UI step Dry Run A structurally cannot reach.
- DOC-01's "no step missing, wrong, or requiring outside knowledge" is now evidenced by a gap list
  with a disposition per entry, not merely asserted.
- This is the last plan in phase 03-f3-adding-a-new-tracked-thing-recipe. The recipe
  (`CLAUDE.md` § "Adding a new tracked thing" + `docs/adding-a-collection.md`) is complete, rehearsed,
  and machine-guarded (registry-contract set-equality, placement-rule verbatim pin, copy-paste
  round-trip, and now a rehearsed hand-written-UI pattern for both shapes). No code change to the app
  survives this phase — `index.html` is untouched by any plan in phase 03; the only surviving edits
  across all five plans are to `CLAUDE.md` and `docs/adding-a-collection.md`.
- No blockers.

---
*Phase: 03-f3-adding-a-new-tracked-thing-recipe*
*Completed: 2026-09-21*

## Self-Check: PASSED

- FOUND: CLAUDE.md
- FOUND: docs/adding-a-collection.md
- FOUND: .planning/phases/03-f3-adding-a-new-tracked-thing-recipe/03-05-SUMMARY.md
- FOUND: cb5ea5a (Task 2 commit)
- FOUND: 431f5a6 (Task 3 commit)
