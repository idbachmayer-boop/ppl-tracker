---
phase: 03-f3-adding-a-new-tracked-thing-recipe
verified: 2026-09-21T00:00:00Z
status: passed
score: 8/8 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:

  - test: "Read CLAUDE.md § Adding a new tracked thing top to bottom, then skim docs/adding-a-collection.md, against the gap log in 03-05-SUMMARY.md (deferred from 03-05-PLAN.md Task 2's end-of-phase human-check)."
    expected: "Every gap classified missing/wrong/outside-knowledge is visibly closed in one of the two files, or listed with a reason. The spine still reads like the rest of CLAUDE.md (terse, bold-lead-in) and is still short enough to want loaded into every session."
    why_human: "Whether a gap is actually closed for a cold reader is a comprehension judgment. Automated checks can prove the field lists agree and the quote is verbatim; they cannot prove a step is now understandable to a human."

  - test: "Read docs/adding-a-collection.md § Rehearsal record, and decide whether the narrative record is sufficient evidence that the recipe was rehearsed, or whether the scratch-branch diff should have been preserved instead (deferred from 03-05-PLAN.md Task 3's end-of-phase human-check; RESEARCH.md Open Questions Q1)."
    expected: "A decision on the evidence question. Note: the scratch branch (scratch/dry-run-b-supplements) was force-deleted per the plan's mandatory teardown, so if a preserved diff is wanted, it would need to be reconstructed from git reflog before this worktree garbage-collects, or redone in a future rehearsal."
    why_human: "Whether a narrative record is sufficient evidence of rehearsal, versus preserving a diff, is a documentation-completeness judgment about future value, not a technical one — the plan explicitly deferred it to Ian rather than deciding it."

  - test: "Confirm WR-01 (Dry Run A's recipeProbeMap is injected as the first COLLECTIONS entry via string-prepend, not appended last as CLAUDE.md step 1 prescribes for a real collection) is an acceptable, permanent deviation between the probe mechanism and the recipe it rehearses."
    expected: "Either accept WR-01 as-is (no live bug found; the probe's purpose is exercising map-only branches, not placement-order sensitivity — already covered separately by the pre-existing 'COLLECTIONS sits where module-eval can reach it' and 'entries are declared in the pre-phase order' checks), or open a follow-up to reorder the injection to match the recipe."
    why_human: "This is a judgment call about whether an advisory code-review finding, left open by the reviewer and by the phase's own resolution note, is worth a follow-up — not something a re-read of the diff resolves on its own."
---

# Phase 3: F3 — Adding a New Tracked Thing (Recipe) Verification Report

**Phase Goal:** The knowledge of how to add a new tracked collection moves out of this milestone's
working memory into a numbered recipe in `CLAUDE.md`, so the collection after `sleep` doesn't require
re-deriving what Phase 1 already worked out.
**Verified:** 2026-09-21
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `CLAUDE.md` contains a numbered "adding a new tracked thing" recipe, written against the shipped `COLLECTIONS` shape (DOC-01, roadmap SC1) | ✓ VERIFIED | `## Adding a new tracked thing` section exists between `## Conventions` and `## After shipping`, holds exactly 6 numbered steps (`1.`–`6.`), each step's content read and cross-checked against the live `index.html`/`collectionProblems()` (e.g. step 1's "entry goes last / label must be unused" matches the live label-uniqueness check; step 6's "exporter derives every section" matches `buildMarkdownExport()`'s design). |
| 2 | The recipe states the module-eval-time placement rule verbatim and lists the required tests including the stale-device merge replay (DOC-02, DOC-03, roadmap SC2) | ✓ VERIFIED | `CLAUDE.md` step 1 carries `<!-- placement-rule: verbatim from index.html -->` followed by a fenced quote that is byte-for-byte the text at `index.html:480-486` (`Collections registry (F1)` comment block) — confirmed by direct comparison. `npm test` machine-pins this: `PASS recipe: CLAUDE.md quotes the placement rule verbatim from the source it names`. Step 4 names "a stale-device merge replay" as its own bullet, verbatim phrase present. |
| 3 | Following the recipe end to end for a collection other than `sleep` produces the correct result with no step missing, wrong, or requiring outside knowledge (DOC-04, roadmap SC3) | ✓ VERIFIED (with human follow-up) | Two-part evidence: (a) Dry Run A — a machine-verified, permanent `test/app.test.js` block injects a map-shaped `recipeProbeMap` collection via one line and proves `blank()`, `collectionProblems()`, `liveOf()`, `validateBackup()`, `mergeDB()`/`mergeCollections()` (including the `mobilityLog` explicit-`false`/whole-day-replace trap) and `buildMarkdownExport()` all pick it up with zero further code — 9/9 `DRY-RUN-A:` PASS lines confirmed by direct `npm test` run, including the CR-01-fixed no-special-casing check (verified the fix scopes to `recipeProbe.*`, not `app.*`). (b) Dry Run B — an executor-proxy cold walk (03-05) built a real `supplements` collection on a scratch branch following only the recipe text, found 8 gaps (most consequential: `SCHEMA` bump silently stales `merge-golden.json`; the hand-written-UI pattern was wrong for a map shape), closed every gap in the recipe, reached green (`767 passed`), and tore the branch down (byte-identical `index.html`/`test/harness.js`/`test/app.test.js` confirmed, no branch survives). Routed to human_needed below because the plan itself designates the "is this recipe actually comprehensible" claim and the rehearsal-evidence-sufficiency question as human judgment, deferred to end of phase. |
| 4 | The doc's copy-paste registry-contract example entry is real and machine-validated, not a stale fixture (DOC-03) | ✓ VERIFIED | `docs/adding-a-collection.md`'s `<!-- registry-contract: example entry -->` fenced `js` block is evaluated via `new Function` (injecting only `dayFlagRows`) and round-tripped through the live `collectionProblems()` on every `npm test`; non-vacuity proven by a companion assertion that a `format`-stripped copy is refused. `PASS recipe: the companion doc's copy-paste entry still passes the live validator`, `PASS recipe: the round-trip is not vacuous — dropping format from the copy is refused`. |
| 5 | The registry-contract key lists (spec keys, column keys) in the companion doc can never silently drift from `collectionProblems()`'s live `ALLOWED`/column-key lists (DOC-03) | ✓ VERIFIED | `test/app.test.js` extracts both from `docs/adding-a-collection.md` and from `app.__src`, compares as sorted/de-duplicated sets, and proves non-vacuity with a sentinel-name mutation. All 8 `recipe:` PASS lines for this block confirmed. |
| 6 | EDGE DOC-01/empty — a new collection must declare non-empty `columns`; this is enforced live, not just documented (backstop) | ✓ VERIFIED | `index.html:4038` `p('columns must be a non-empty array of column objects')`; `test/app.test.js:1982` `PASS registry: an empty columns list is refused`. `columns` is present in the documented spec-key list (confirmed in `docs/adding-a-collection.md`'s fenced array). |
| 7 | EDGE DOC-01/adjacency — two collections may never share a `label`; enforced live, not just documented (backstop) | ✓ VERIFIED | `test/app.test.js:2048` `PASS registry: two collections sharing a label are refused, naming both`. `CLAUDE.md` step 1 states this rule explicitly. |
| 8 | The recipe was rehearsed, not only written, and that rehearsal is recorded (DOC-04) | ✓ VERIFIED | `docs/adding-a-collection.md § Rehearsal record` (10 lines) names the date, collection (`supplements`), shape, discard reason, gap count, and the honest ceiling ("a green suite proves the code, not this prose"). |

**Score:** 8/8 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `CLAUDE.md` | New `## Adding a new tracked thing` section, 6 numbered steps, verbatim placement quote | ✓ VERIFIED | Confirmed present, wired, content cross-checked against `index.html` directly (not just SUMMARY claims). |
| `docs/adding-a-collection.md` | New file; registry contract, field-by-field walkthrough, worked `sleep` example, hand-written UI (both shapes), test walkthrough, rehearsal record | ✓ VERIFIED | File exists (297 lines), `docs/` contains exactly this one file, all 7 expected `##` headings present and non-stub (read in full). |
| `test/app.test.js` | 4 new banners/blocks: DOC-03 divergence, DRY-RUN-A (DOC-04), DOC-02 placement verbatim, DOC-03 example-entry round-trip | ✓ VERIFIED | All banners present; `npm test` → 748 passed, 0 failed, 2 skipped, matching orchestrator's last-known count exactly. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `docs/adding-a-collection.md` contract blocks | `collectionProblems()`'s live `ALLOWED`/column-key arrays in `index.html` | `docBlock()` extractor + set comparison in `test/app.test.js` | ✓ WIRED | Confirmed by direct `npm test` PASS and by the plan's documented sentinel-mutation regression (recorded in 03-01-SUMMARY, re-confirmed structurally). |
| `CLAUDE.md` § Adding a new tracked thing | `docs/adding-a-collection.md` | Markdown link, cited ≥2 times | ✓ WIRED | `grep -c "docs/adding-a-collection.md" CLAUDE.md` → matches present in step 2, step 3, and the closing line. |
| `CLAUDE.md` placement-rule quote | `index.html`'s `COLLECTIONS` comment block | Whitespace-normalized containment check | ✓ WIRED | Verified directly: quote text is a byte-identical subset of `index.html:480-486`; machine-pinned by `PASS recipe: CLAUDE.md quotes the placement rule verbatim from the source it names`. |
| `docs/adding-a-collection.md` example-entry block | live `collectionProblems()` | `new Function` evaluation, `dayFlagRows` injected | ✓ WIRED | `PASS recipe: the companion doc's copy-paste entry still passes the live validator`. |
| Dry Run A's `recipeProbeMap` probe | the five derived consumers (`blank`, `liveOf`, `validateBackup`, `mergeCollections`/`mergeDB`, `buildMarkdownExport`) | `test/harness.js` `opts.transform` → a fresh `vm` instance | ✓ WIRED | CR-01's fix confirmed directly in source: `consumers` map now reads `recipeProbe.*` (the transformed instance), not `app.*` (the unmodified one) — the no-special-casing check is no longer vacuous. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full suite passes, matching orchestrator's last-known count | `npm test` | 748 passed, 0 failed, 2 skipped | ✓ PASS |
| CR-01 fix is actually in the committed source (not just claimed in REVIEW.md) | `grep -n "recipeProbe\.\(blank\|liveOf\|validateBackup\|mergeCollections\|mergeDB\|exportRows\|buildMarkdownExport\)" test/app.test.js` | Found at line 1691, `consumers` object built entirely from `recipeProbe.*` | ✓ PASS |
| Placement-rule quote is byte-identical to its named source | Direct read of `CLAUDE.md` lines and `index.html:480-486` | Text matches exactly, including the em dash and back-ticked identifiers | ✓ PASS |
| Backstop truths (empty `columns`, duplicate `label`) are live-enforced, not merely asserted in docs | `grep` for the two `ok()` labels in `test/app.test.js` and the refusal message in `index.html` | Both present and passing | ✓ PASS |
| `docs/` directory contains exactly the one expected file | `ls docs/` | `adding-a-collection.md` only | ✓ PASS |
| Working tree is clean; no uncommitted phase artifacts left behind | `git status --porcelain` | (empty) | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|----------------|--------------|--------|----------|
| DOC-01 | 03-01, 03-03, 03-05 | Numbered recipe in `CLAUDE.md`, against shipped `COLLECTIONS` | ✓ SATISFIED | 6-step spine confirmed directly; gap-closure loop in 03-05 fed content back in. |
| DOC-02 | 03-04 | Verbatim placement rule + `blank()`-reads-only-`kind` clause | ✓ SATISFIED | Verbatim quote confirmed byte-for-byte against `index.html`; machine-pinned test present and passing. |
| DOC-03 | 03-01, 03-03, 03-04 | Recipe names required tests incl. stale-device merge replay; doc/registry cannot silently diverge | ✓ SATISFIED | Divergence check, example-entry round-trip, and the explicit "stale-device merge replay" phrase all confirmed live. |
| DOC-04 | 03-02, 03-05 | Recipe verified end to end for a non-`sleep` collection | ✓ SATISFIED (see human_needed items) | Dry Run A (machine) + Dry Run B (cold walk, gaps closed) both confirmed; the comprehension/evidence-sufficiency judgment is explicitly deferred to Ian by the plan's own design. |

No orphaned requirements — REQUIREMENTS.md maps only DOC-01…DOC-04 to Phase 3, and all four are claimed across the five plans' frontmatter.

### Anti-Patterns Found

None. `grep` for `TBD|FIXME|XXX|TODO|HACK|PLACEHOLDER` and for placeholder-style prose (`placeholder|coming soon|not yet implemented|not available`) across `CLAUDE.md` and `docs/adding-a-collection.md` returned zero hits. The one literal placeholder-shaped value (`'REPLACE ME'` as the copy-paste example's label) is a deliberate, documented fixture value, not a stub — it is followed by an explicit instruction to rename it before use, and it round-trips through the live validator as-is.

### Code Review Findings (03-REVIEW.md) — Disposition

- **CR-01 (critical, "no derived consumer mentions recipeProbeMap" asserted against the wrong object and always passed)** — confirmed fixed in commit `ac7420a`. Verified directly in source: the `consumers` map is now built from `recipeProbe.*`. `npm test` green at 748/0/2, matching the review's own confirmation.
- **WR-01 (warning, probe injected first in `COLLECTIONS` rather than last as the recipe itself prescribes)** — confirmed still present in `test/app.test.js:1610` (`recipeProbeTransform` prepends right after `const COLLECTIONS = {`). Left open by the reviewer as advisory; no live bug traced. Routed to human_needed above rather than treated as a gap, since it is a probe-harness convenience decision separate from what the recipe teaches a real author to do (the recipe's own "goes last" rule is separately enforced by the pre-existing `registry: entries are declared in the pre-phase order` check), and both the review and the phase's own resolution note left it open by design.
- **IN-01 (info, DOC-03 check's label overpromises slightly)** — cosmetic, left open by the reviewer, does not affect any must-have.

## Deferred Items

None — no gap in this phase maps to a later milestone phase's goal or success criteria; Phase 4 (draft-goes-device-local), Phase 5 (event delegation), Phase 6 (.gitattributes) and Phase 7 (CSP) are unrelated to the recipe's content.

## Gaps Summary

No blocking gaps. All roadmap Success Criteria and all plan-level must-haves are directly confirmed
against the live codebase (source reads, direct `npm test` execution, direct grep confirmation of the
CR-01 fix) rather than accepted from SUMMARY.md narrative alone. Status is `human_needed` rather than
`passed` solely because the phase's own plans deliberately deferred three items to an end-of-phase
human checkpoint: (1) a cold-reader comprehension check on the finished recipe, (2) the
narrative-vs-preserved-diff rehearsal-evidence question RESEARCH.md explicitly left open, and (3) a
judgment call on whether WR-01 (advisory, no live bug found) is worth a follow-up. None of these route
through a failing or missing artifact — every machine-checkable claim in the phase passed.

## Human Verification Required

### 1. Read the recipe as a cold reader would

**Test:** Read `CLAUDE.md` § Adding a new tracked thing top to bottom, then skim
`docs/adding-a-collection.md`, comparing against the gap log in `03-05-SUMMARY.md`.
**Expected:** Every gap classified missing/wrong/outside-knowledge is visibly closed in one of the
two files, or explicitly listed as out of scope with a reason. The spine still reads like the rest of
`CLAUDE.md` and is short enough to want loaded into every session.
**Why human:** Comprehension for a cold reader is not something a grep or a set-equality test can
certify.

### 2. Decide the rehearsal-evidence question

**Test:** Read `docs/adding-a-collection.md § Rehearsal record` and RESEARCH.md's Open Questions Q1.
**Expected:** A decision on whether the narrative record is sufficient, or whether a preserved
scratch-branch diff should be captured in a future rehearsal (the branch used this time,
`scratch/dry-run-b-supplements`, was force-deleted per the plan's mandatory teardown).
**Why human:** The plan explicitly defers this documentation-completeness judgment rather than
deciding it.

### 3. Decide whether WR-01 needs a follow-up

**Test:** Review WR-01 in `03-REVIEW.md` (Dry Run A's probe is injected first in `COLLECTIONS`, not
last as the recipe prescribes for a real author).
**Expected:** Accept as-is, or open a follow-up ticket to reorder the injection.
**Why human:** Advisory, left open by both the reviewer and the phase's own resolution note; judging
whether it's worth acting on is not resolvable by re-reading the diff.

---

_Verified: 2026-09-21_
_Verifier: Claude (gsd-verifier)_
