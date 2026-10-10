---
phase: 03-f3-adding-a-new-tracked-thing-recipe
plan: 01
subsystem: testing
tags: [markdown-docs, test-suite, registry-contract, tdd]

# Dependency graph
requires:
  - phase: 02-f1-export-for-claude
    provides: COLLECTIONS registry and collectionProblems() validator that this plan's divergence check reads
provides:
  - "docs/adding-a-collection.md — companion doc with the two registry-contract blocks (spec keys, column keys)"
  - "CLAUDE.md § Adding a new tracked thing — spine section, numbered step 1, link to the companion doc"
  - "test/app.test.js block (DOC-03) proving the doc and collectionProblems()'s live ALLOWED/column-key lists cannot silently diverge"
affects: [03-02, 03-03, 03-04, 03-05]

actuals:
  tokens: 2320
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Source-text anchor extraction (regex over app.__src) cross-checked by behavioural probing of the live validator, not just string comparison — mirrors the firestore.rules block's 'assert the property, never the wording' discipline"

key-files:
  created:
    - docs/adding-a-collection.md
  modified:
    - CLAUDE.md
    - test/app.test.js

key-decisions:
  - "CLAUDE.md's new section carries only step 1 (add exactly one COLLECTIONS entry) in this plan — the remaining numbered steps are left for plan 03-03, per the plan's explicit scope boundary."
  - "docs/adding-a-collection.md states no field count in prose — 03-RESEARCH.md's '9 items; 10 array entries' note was a miscount; the test compares sets, so the doc needs no number."
  - "The column-key behavioural cross-check builds each probe column via Object.assign({field,label}, {[name]:'dummy'}) rather than object-literal duplicate keys, so 'field'/'label' themselves get overwritten cleanly without relying on JS's last-key-wins semantics reading oddly in a diff."

patterns-established:
  - "Registry-contract blocks: a marker comment immediately followed by a fenced ```json array, extracted by test/app.test.js and compared as a set against a live source-of-truth anchor — reusable for any future doc/code contract in this repo."

requirements-completed: [DOC-01, DOC-03]

coverage:
  - id: D1
    description: "CLAUDE.md carries a '## Adding a new tracked thing' section whose step 1 says add exactly one COLLECTIONS entry, linking docs/adding-a-collection.md"
    requirement: "DOC-01"
    verification:
      - kind: other
        ref: "grep -c '^## Adding a new tracked thing$' CLAUDE.md; grep -c 'docs/adding-a-collection.md' CLAUDE.md"
        status: pass
    human_judgment: false
  - id: D2
    description: "docs/adding-a-collection.md exists with two machine-readable registry-contract blocks (spec keys, column keys)"
    requirement: "DOC-01"
    verification:
      - kind: unit
        ref: "test/app.test.js#recipe: docs/adding-a-collection.md exists and holds both registry-contract blocks"
        status: pass
    human_judgment: false
  - id: D3
    description: "npm test goes red when the documented spec-key/column-key lists and collectionProblems()'s live lists disagree, in either direction, and the check is proven non-vacuous"
    requirement: "DOC-03"
    verification:
      - kind: unit
        ref: "test/app.test.js#recipe: the documented spec-key list matches the live ALLOWED list"
        status: pass
      - kind: unit
        ref: "test/app.test.js#recipe: the documented column-key list matches the live column contract"
        status: pass
      - kind: unit
        ref: "test/app.test.js#recipe: the comparison is not vacuous — an extra field breaks it"
        status: pass
    human_judgment: false
  - id: D4
    description: "Every key actually used by a live COLLECTIONS entry or column is named in the companion doc; each documented key is accepted by collectionProblems() while sentinel names are refused; documented names are plain ASCII identifiers"
    requirement: "DOC-03"
    verification:
      - kind: unit
        ref: "test/app.test.js#recipe: every key used by a live COLLECTIONS entry is documented"
        status: pass
      - kind: unit
        ref: "test/app.test.js#recipe: every documented spec key is accepted by collectionProblems, and a sentinel key is refused"
        status: pass
      - kind: unit
        ref: "test/app.test.js#recipe: every documented column key is accepted by collectionProblems, and a sentinel column key is refused"
        status: pass
      - kind: unit
        ref: "test/app.test.js#recipe: the documented key names are plain ASCII identifiers"
        status: pass
    human_judgment: false

duration: ~15min
completed: 2026-09-21
status: complete
---

# Phase 3 Plan 01: The recipe-vs-registry divergence check Summary

**A test block in `test/app.test.js` extracts the registry-contract key lists from a new `docs/adding-a-collection.md`, extracts the live `ALLOWED`/column-key lists straight out of `collectionProblems()` in `index.html`, and fails loudly the moment the two disagree in either direction — proven non-vacuous with two sentinel names and an ASCII-identifier encoding guard.**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-09-21T11:52:21Z
- **Tasks:** 2
- **Files modified:** 3 (1 created: `docs/adding-a-collection.md`; 2 modified: `CLAUDE.md`, `test/app.test.js`)

## Accomplishments

- Wired one path end to end: `docs/adding-a-collection.md`'s two registry-contract blocks → a `docBlock()` extractor in `test/app.test.js` → `collectionProblems()`'s live `ALLOWED` array and column-key contract in `index.html` — compared as sorted, de-duplicated sets, never as prose.
- Proved the RED gate is not decorative: with `docs/adding-a-collection.md` absent, `npm test` failed exactly one check — `recipe: docs/adding-a-collection.md exists and holds both registry-contract blocks` — before the doc existed (723 passed, 1 failed, 2 skipped). After creating the doc, the suite went green (727 passed, 0 failed, 2 skipped).
- Manually confirmed the divergence check bites: removing `"format"` from the doc's spec-key array turned the suite red (exit 1) with the exact key-set diff (`docSpecKeys` missing `format` vs `liveAllowed` still holding it); restoring the file returned the suite to green.
- Closed the coverage and encoding gaps (Task 2): every key a live `COLLECTIONS` entry or column actually uses is now asserted to be a subset of the documented lists; every documented key is behaviourally cross-checked against `collectionProblems()` itself (not just source-text extraction), with `zzNotAField` / `zzNotAColumnKey` sentinels proving the check discriminates; documented key names are asserted to be plain ASCII identifiers, guarding against typographic quotes and invisible Unicode (U+00A0, U+200B, U+2028, U+FEFF).
- Added `CLAUDE.md § Adding a new tracked thing`, placed between `## Conventions` and `## After shipping`, carrying a one-sentence lead-in, numbered step 1 ("add exactly one entry to `COLLECTIONS`"), and a closing link to `docs/adding-a-collection.md`.

## Observed Red Output (before docs/adding-a-collection.md existed)

```
── the recipe and the registry cannot silently diverge (DOC-03) ──
  FAIL  recipe: docs/adding-a-collection.md exists and holds both registry-contract blocks
        → {"recipeDocExists":false,"docSpecKeysRaw":null,"docColumnKeysRaw":null}
  PASS  recipe: the live ALLOWED array anchor is found and yields more than one name
  PASS  recipe: the live column-key anchor is found and yields more than one name

723 passed, 1 failed, 2 skipped
```

After creating `docs/adding-a-collection.md`: **727 passed, 0 failed, 2 skipped** (Task 1 complete).
After Task 2's four additional assertions: **731 passed, 0 failed, 2 skipped**.

## Extracted Key Lists (read out of `index.html`, not transcribed from any planning doc)

- **Spec keys** (`collectionProblems()`'s `ALLOWED` array — 10 entries):
  `kind, key, sortBy, merge, soft, required, explicitFalse, label, columns, format`
- **Column keys** (the `has unknown key` check in `collectionProblems()` — 4 entries):
  `field, label, unit, zeroIsMissing`

Both lists are written verbatim into `docs/adding-a-collection.md`'s two fenced `json` blocks.

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end "the recipe cannot outlive the registry"** — `93235b7` (test) — added the companion doc, the `CLAUDE.md` spine section, and the core divergence-check block (4 assertions).
2. **Task 2: Close the coverage and encoding gaps** — `abcd9ba` (test) — extended the same block with 4 more assertions (documented-superset check, two behavioural cross-checks, ASCII-identifier guard).

Both tasks were combined implementation-plus-test commits per the tracer-task convention (`type="tracer" tdd="true"` executes and commits as one atomic unit — real implementation, real `<verify>` — rather than splitting into separate RED/GREEN commits); the RED state was observed and recorded above before committing.

## Files Created/Modified

- `docs/adding-a-collection.md` - New companion doc: title, one-paragraph pointer back to `CLAUDE.md`, and `## The registry contract` holding the two marker-delimited `json` contract blocks.
- `CLAUDE.md` - New `## Adding a new tracked thing` section (step 1 only; steps 2+ deferred to plan 03-03).
- `test/app.test.js` - New block under the banner `── the recipe and the registry cannot silently diverge (DOC-03) ──`, placed immediately after the `REG-05/REG-04/REG-17/REG-11` block, holding 10 assertions total.

## Decisions Made

- No field count stated in `docs/adding-a-collection.md` prose — `03-RESEARCH.md`'s "9 items; 10 array entries" note is a miscount (the live array holds 10 distinct entries); the test compares sets, so no number is needed or written.
- `CLAUDE.md`'s new section stops at step 1 by design — the tracer proves the path end to end; filling in the remaining numbered steps is plan 03-03's job, per the plan's explicit scope boundary.
- The column-key behavioural probe builds each fixture column with `Object.assign({field,label}, {[name]:'dummy'})` instead of an object literal with a duplicate key, so the override of `field`/`label` for those two key names is explicit rather than relying on JS's silent last-key-wins duplicate-property behavior.

## Deviations from Plan

None - plan executed exactly as written. Both tasks' `<action>` and `<behavior>` specifications were followed directly; all `<acceptance_criteria>` were verified by hand (grep counts, red-then-green cycle, manual single-name-deletion regression check).

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plans 03-02 and 03-03 can start in parallel — both depend only on the tracer path this plan proved, which is now committed and green.
- The precedent this plan sets (`docBlock()` extractor + live source-anchor extraction + behavioural cross-check + ASCII guard) is reusable as-is for plan 03-04's "the recipe quotes the placement rule verbatim" block and plan 03-02's Dry Run A map-probe block.
- No blockers.

---
*Phase: 03-f3-adding-a-new-tracked-thing-recipe*
*Completed: 2026-09-21*

## Self-Check: PASSED

- FOUND: docs/adding-a-collection.md
- FOUND: .planning/phases/03-f3-adding-a-new-tracked-thing-recipe/03-01-SUMMARY.md
- FOUND: 93235b7 (Task 1 commit)
- FOUND: abcd9ba (Task 2 commit)
- FOUND: 6e3af2a (SUMMARY commit)
