---
phase: 03-f3-adding-a-new-tracked-thing-recipe
plan: 04
subsystem: testing
tags: [markdown-docs, temporal-dead-zone, registry-contract, recipe]

# Dependency graph
requires:
  - phase: 03-f3-adding-a-new-tracked-thing-recipe
    provides: "plan 03-01's docBlock() JSON-fence extractor and docs/adding-a-collection.md's <!-- registry-contract: example entry --> fixture; plan 03-03's six-step CLAUDE.md spine (numbered step 1) this plan inserts into"
provides:
  - "CLAUDE.md § Adding a new tracked thing, step 1 — the module-eval-time placement rule quoted verbatim from index.html's COLLECTIONS comment block, behind a <!-- placement-rule: verbatim from index.html --> marker"
  - "test/app.test.js — DOC-02 block asserting the CLAUDE.md quote is a whitespace-normalized substring of the source file its own marker names, with a 200-char floor and a required MIGRATIONS/blank( mention"
  - "test/app.test.js — docBlock() generalized to take a fence language tag (json default, unchanged for existing callers; any other tag returns raw text)"
  - "test/app.test.js — the companion doc's copy-paste example entry evaluated via new Function with only dayFlagRows injected, and round-tripped through the live collectionProblems()"
affects: [03-05]

actuals:
  tokens: 2087
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "verbatim-quote pinning: a doc claims to reproduce another file's text behind a <!-- X: verbatim from SOURCE --> marker, and a test asserts whitespace-normalized containment against SOURCE rather than pinning exact wording — the same 'assert the property, never the wording' discipline CLAUDE.md already applies to firestore.rules, now applied to prose provenance"
    - "single shared fenced-block extractor (docBlock) parameterized by fence language tag, rather than a second extractor per fence type"

key-files:
  modified:
    - CLAUDE.md
    - test/app.test.js

key-decisions:
  - "Task 1 decision (Ian, 2026-09-21): option-a — CLAUDE.md quotes index.html's own COLLECTIONS registry comment block (the paragraph at index.html:480-486, source path recorded in the CLAUDE.md marker as `index.html`), trimmed to the placement/TDZ sentences only. The sortBy paragraph and the column-contract paragraph (index.html:487-491) were dropped from the quote. Because option-a already says 'after SCHEMA/KEY' rather than 'adjacent', no looseness note was required — the quote is literally accurate as written, and a single marker/quote pair covers both the placement clause and the blank()-reads-only-kind clause D-02 requires, since both live in the same source paragraph."
  - "The DOC-02 test block and the DOC-03 round-trip block are placed with their siblings, not together: DOC-02 sits immediately after the existing 'COLLECTIONS sits where module-eval can reach it' placement block; the DOC-03 round-trip extends plan 03-01's 'recipe:' registry-contract block, per the plan's explicit instruction that the round-trip is a registry check, not a placement check."

requirements-completed: [DOC-02, DOC-03]

coverage:
  - id: D1
    description: "CLAUDE.md § Adding a new tracked thing states the module-eval-time placement rule verbatim inside a fenced block, preceded by a marker naming index.html as the source, and the quote carries the blank()-reads-only-kind clause D-02 requires"
    requirement: "DOC-02"
    verification:
      - kind: unit
        ref: "test/app.test.js — 'recipe: CLAUDE.md names at least one verbatim placement-rule source'"
        status: pass
      - kind: unit
        ref: "test/app.test.js — 'recipe: CLAUDE.md quotes the placement rule verbatim from the source it names'"
        status: pass
      - kind: unit
        ref: "test/app.test.js — 'recipe: the quoted placement rule is substantial, not a fragment'"
        status: pass
    human_judgment: false
  - id: D2
    description: "The verbatim check is not vacuous — hand-mutating one word inside the CLAUDE.md quote turns the suite red; restoring it returns the suite to green"
    requirement: "DOC-02"
    verification:
      - kind: other
        ref: "Manual mutation of 'const' to 'totallydifferentword' inside the fenced quote, confirmed via npm test (see Issues Encountered for the exact FAIL line), then restored and re-verified green (743 passed, 0 failed)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The companion doc's copy-paste registry entry (docs/adding-a-collection.md's <!-- registry-contract: example entry --> block) is evaluated via new Function with only dayFlagRows injected and round-trips through the live collectionProblems() with zero problems; it is map-shaped and exercises the explicitFalse branch"
    requirement: "DOC-03"
    verification:
      - kind: unit
        ref: "test/app.test.js — 'recipe: the companion doc's copy-paste entry still passes the live validator'"
        status: pass
      - kind: unit
        ref: "test/app.test.js — 'recipe: the copy-paste entry is map-shaped and exercises the explicitFalse branch'"
        status: pass
    human_judgment: false
  - id: D4
    description: "The round-trip is non-vacuous: the same fixture with format removed is refused by the live validator in the same run, and removing explicitFalse from the doc's actual fixture turns the suite red"
    requirement: "DOC-03"
    verification:
      - kind: unit
        ref: "test/app.test.js — 'recipe: the round-trip is not vacuous — dropping format from the copy is refused'"
        status: pass
      - kind: other
        ref: "Manual removal of the 'explicitFalse: true,' line from docs/adding-a-collection.md's example-entry fence, confirmed via npm test (2 FAIL lines, see Issues Encountered), then restored and re-verified green (748 passed, 0 failed)"
        status: pass
    human_judgment: false
  - id: D5
    description: "docBlock() is generalized to a single shared fenced-block extractor parameterized by fence language tag — no second extractor was added for the js-fenced example entry"
    requirement: "DOC-03"
    verification:
      - kind: other
        ref: "grep -n 'function docBlock' test/app.test.js returns exactly one match"
        status: pass
    human_judgment: false

duration: ~15min
completed: 2026-09-21
status: complete
---

# Phase 3 Plan 04: Placement-rule verbatim quote and copy-paste round-trip Summary

**`CLAUDE.md` now quotes index.html's own COLLECTIONS placement/TDZ comment verbatim behind a machine-checked `<!-- placement-rule: verbatim from index.html -->` marker, and the companion doc's copy-paste registry fixture is evaluated and round-tripped through the live `collectionProblems()` on every `npm test`.**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-09-21T07:17:30-05:00
- **Tasks:** 2 (Task 1 was a decision checkpoint, resolved by Ian before this execution resumed — no commit)
- **Files modified:** 2 (`CLAUDE.md`, `test/app.test.js`)

## Accomplishments

- Recorded Task 1's decision: **option-a**. `CLAUDE.md` step 1 quotes `index.html`'s own
  `COLLECTIONS` registry comment block, source path `index.html`, trimmed to the
  placement/TDZ sentences only (the "Declared before DB boots..." sentence through "...never during
  it.", index.html:480-486) — the `sortBy` paragraph and the column-contract paragraph
  (index.html:487-491) were dropped. Because option-a already reads "after SCHEMA/KEY" rather than
  "adjacent", no looseness note was needed.
- Added the quote to `CLAUDE.md` step 1, behind a `<!-- placement-rule: verbatim from index.html -->`
  marker and a fenced ` ```text ` block, preceded by a one-line lead-in in the file's own voice.
- Added a new `test/app.test.js` block (banner `── the recipe quotes the placement rule verbatim
  (DOC-02) ──`) that finds every `<!-- placement-rule: verbatim from SOURCE -->` marker in
  `CLAUDE.md`, reads `SOURCE` relative to the repo root, and asserts the quote is a
  whitespace-normalized substring of that file — plus a 200-character floor requiring both
  `MIGRATIONS` and `blank(` to appear, so a trivially short quote cannot satisfy the check.
- Generalized plan 03-01's `docBlock()` fenced-block helper to take a fence language tag (`json`
  stays the default and behaves exactly as before every existing call site; any other tag returns
  the raw fenced text instead of `JSON.parse`-ing it), and used it to extract the `js`-fenced
  `<!-- registry-contract: example entry -->` block from `docs/adding-a-collection.md` — no second
  extractor was written.
- Evaluated that extracted entry with `new Function('dayFlagRows', 'return (' + src + ');')`,
  injecting only `dayFlagRows`, and asserted it passes `collectionProblems()` with zero problems, is
  map-shaped (`kind:'map'`, `merge:'replace-whole'`, `explicitFalse:true`), and that a shallow copy
  with `format` deleted is refused — proving the round-trip is not vacuous.
- Performed both required hand-mutation checks by hand, confirmed the suite went red, and restored
  both files to green (see Issues Encountered for the exact failure output of each).

## Task Commits

Task 1 (decision checkpoint) required no commit — resolved by Ian before this execution resumed.

1. **Task 2: Quote the placement rule verbatim and pin it to its source** — `12d0133` (feat)
2. **Task 3: Round-trip the companion doc's copy-paste entry through the live validator** — `364ede4` (test)

## Files Created/Modified

- `CLAUDE.md` — step 1 of § Adding a new tracked thing gained a one-line lead-in, the
  `<!-- placement-rule: verbatim from index.html -->` marker, and a fenced verbatim quote
  (13 lines added).
- `test/app.test.js` — new DOC-02 placement-rule verbatim block (45 lines), `docBlock()`
  generalized to accept a fence language tag, and a new registry-contract round-trip block appended
  inside plan 03-01's `recipe:` `if(docBlocksOk){...}` (58 lines added combined).

## Decisions Made

- **Task 1 (Ian, 2026-09-21):** option-a — quote `index.html`'s own `COLLECTIONS` comment block,
  source path `index.html`. No looseness note needed since option-a is literally accurate.
- Trimmed the quote to placement/TDZ sentences only, per Ian's explicit instruction: the
  "Declared before..." sentence through "...never during it." (inclusive of the `blank()`-reads-
  only-`kind` clause D-02 requires), dropping the `sortBy` paragraph and the column-contract
  paragraph that follow it in the same comment block.
- Kept the two new test blocks with their topical siblings rather than adjacent to each other: the
  DOC-02 verbatim-pin block follows the existing placement/REG-02 block, and the DOC-03 round-trip
  extends plan 03-01's registry-contract block, per the plan's explicit "this is a registry check"
  instruction.
- The whitespace-normalized quote is 541 characters (well above the 200-character floor) and names
  both `MIGRATIONS` and `blank(`, so the non-vacuity check is satisfied by a wide margin.

## Deviations from Plan

None — plan executed exactly as written, including both required hand-mutation verifications.

## Issues Encountered

Both required hand-mutation checks (plan acceptance criteria) were performed as specified,
confirmed to turn the suite red, and restored:

1. **DOC-02 quote mutation** — changed `never a const` to `never a totallydifferentword` inside the
   fenced quote in `CLAUDE.md`. Result:
   ```
   FAIL  recipe: CLAUDE.md quotes the placement rule verbatim from the source it names  →
   {"quoteSource":"index.html","srcExists":true,"quoteStart":"Declared before DB boots via load() a
   few dozen lines down, after SCHEMA/KEY, be"}
   ```
   Restored via the pre-mutation backup; re-ran `npm test` — 743 passed, 0 failed, 2 skipped.

2. **DOC-03 fixture mutation** — deleted the `explicitFalse: true,` line from
   `docs/adding-a-collection.md`'s `<!-- registry-contract: example entry -->` fence. Result:
   ```
   FAIL  recipe: the companion doc's copy-paste entry still passes the live validator  →
   ["exampleEntry: a map must declare explicitFalse as a boolean"]
   FAIL  recipe: the copy-paste entry is map-shaped and exercises the explicitFalse branch  →
   {"kind":"map","merge":"replace-whole"}
   ```
   Restored via the pre-mutation backup; re-ran `npm test` — 748 passed, 0 failed, 2 skipped.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- DOC-02 is satisfied and machine-guarded: the placement rule in `CLAUDE.md` cannot drift from
  `index.html` without turning the suite red.
- DOC-03's structural half is now fully complete: the field list, the key coverage, and the
  paste-able fixture are all pinned to live code and round-tripped through the real validator.
- The recipe is complete enough for Dry Run B in plan 03-05 to be a fair cold read — nothing this
  plan added is a stub or a placeholder.
- No blockers.

---
*Phase: 03-f3-adding-a-new-tracked-thing-recipe*
*Completed: 2026-09-21*

## Self-Check: PASSED

- FOUND: CLAUDE.md
- FOUND: test/app.test.js
- FOUND: docs/adding-a-collection.md
- FOUND: 12d0133 (Task 2 commit)
- FOUND: 364ede4 (Task 3 commit)
