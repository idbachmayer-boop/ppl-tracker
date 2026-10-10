---
phase: 03-f3-adding-a-new-tracked-thing-recipe
plan: 03
subsystem: testing
tags: [markdown-docs, registry-contract, recipe]

# Dependency graph
requires:
  - phase: 03-f3-adding-a-new-tracked-thing-recipe
    provides: "plan 03-01's CLAUDE.md § Adding a new tracked thing (step 1) and docs/adding-a-collection.md's two registry-contract blocks; plan 03-02's Dry Run A ok() label for the explicit-false replay"
provides:
  - "CLAUDE.md § Adding a new tracked thing — completed to six numbered steps plus the required-test category list, at most 45 lines, no line-number citations"
  - "docs/adding-a-collection.md § The registry contract, field by field — every spec key and column key from the two registry-contract blocks explained"
  - "docs/adding-a-collection.md § A copy-paste entry to start from — a map-shaped registry entry under <!-- registry-contract: example entry --> that validates against the live collectionProblems()"
  - "docs/adding-a-collection.md § The worked example / The hand-written UI / The tests a new collection ships with — sleep's real edit list, the hand-written UI pattern with the safe-id gate, and a test walkthrough anchored to 17 greppable ok() label substrings"
affects: [03-04, 03-05]

actuals:
  tokens: 3978
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "ok()-label-substring citation, verified by grep before writing (never a line number) — every citation in the companion doc's test walkthrough was checked with node -e against test/app.test.js before being committed, and re-verified after two rewraps broke a quoted substring across a markdown line wrap"

key-files:
  modified:
    - CLAUDE.md
    - docs/adding-a-collection.md

key-decisions:
  - "The CLAUDE.md spine's step 4 required-test list uses seven categories, matched one-for-one by docs/adding-a-collection.md's '## The tests a new collection ships with' subheadings, so the two documents cannot silently drift into different category counts."
  - "The copy-paste example entry's label is the placeholder 'REPLACE ME' rather than a real future collection name, since no live label was available that wouldn't itself look like a real proposal Ian didn't make."
  - "Three ok()-label citations that word-wrapped across a markdown line break (breaking the literal quoted string) were caught by a second grep pass after the first pass showed 0 hits for those three, and rewrapped so each quoted substring stays on one line — see Self-Check below for the before/after grep counts."

requirements-completed: [DOC-01, DOC-03]

coverage:
  - id: D1
    description: "CLAUDE.md § Adding a new tracked thing holds exactly six numbered steps, names the stale-device merge replay, mentions docs/adding-a-collection.md at least twice, has no line-number citation, and is at most 45 lines"
    requirement: "DOC-01"
    verification:
      - kind: other
        ref: "node -e script extracting the section by heading and counting ^[0-9]\\. lines, phrase occurrence, doc mentions, and line-citation patterns (recorded in Self-Check)"
        status: pass
      - kind: unit
        ref: "npm test — 740 passed, 0 failed, 2 skipped, unchanged from the 03-02 baseline"
        status: pass
    human_judgment: false
  - id: D2
    description: "docs/adding-a-collection.md's field-by-field walkthrough names every key in the spec-key and column-key registry-contract blocks"
    requirement: "DOC-03"
    verification:
      - kind: other
        ref: "grep -c for each of the 10 spec keys and 4 column keys against docs/adding-a-collection.md (recorded in Self-Check) — all present"
        status: pass
    human_judgment: false
  - id: D3
    description: "The <!-- registry-contract: example entry --> map-shaped fixture validates against the live collectionProblems() with zero problems, references only dayFlagRows, and is plain ASCII"
    requirement: "DOC-03"
    verification:
      - kind: other
        ref: "node -e loading the app via test/harness.js and calling collectionProblems({ recipeExample: <entry> }) — returned []"
        status: pass
    human_judgment: false
  - id: D4
    description: "The worked sleep example and hand-written UI pattern name softDelete, liveOf, touch(), saveLocal(), ensureCollectionDefaults, and state the safe-id gate with the esc()-does-not-escape-a-quote reason"
    requirement: "DOC-03"
    verification:
      - kind: other
        ref: "grep -c for each literal string against docs/adding-a-collection.md (recorded in Self-Check) — all present at least once"
        status: pass
    human_judgment: false
  - id: D5
    description: "The tests a new collection ships with section carries all seven CLAUDE.md step-4 categories, one for one, each anchored to a greppable ok() label substring with at least one hit"
    requirement: "DOC-03"
    verification:
      - kind: other
        ref: "node -e script extracting every backtick-quoted string from docs/adding-a-collection.md and grepping each against test/app.test.js — 17/17 substrings return exactly 1 hit (recorded in Self-Check)"
        status: pass
    human_judgment: false

duration: ~9min
completed: 2026-09-21
status: complete
---

# Phase 3 Plan 03: The recipe content — spine, field contract, worked example Summary

**`CLAUDE.md` § Adding a new tracked thing now carries all six numbered steps and the required-test category list (naming the stale-device merge replay explicitly), and `docs/adding-a-collection.md` gained the field-by-field registry contract, a validated copy-paste map-shaped entry, the worked `sleep` edit list, the hand-written-UI pattern with its safe-id gate, and a test walkthrough anchored to 17 greppable `ok()` label substrings — every one confirmed against `test/app.test.js` before being written.**

## Performance

- **Duration:** ~9 min (commit to commit)
- **Completed:** 2026-09-21T12:08:55Z
- **Tasks:** 3
- **Files modified:** 2 (`CLAUDE.md`, `docs/adding-a-collection.md`)

## Accomplishments

- Extended `CLAUDE.md` § Adding a new tracked thing from plan 03-01's single step to a full six-step
  spine (39 lines): the entry-goes-last / label-uniqueness rules under step 1, a pointer to the
  existing `**Schema:**` Conventions bullet under step 2, the never-derived hand-written-UI step,
  the seven-category required-test list under step 4 (registry validity, migration correctness,
  a stale-device merge replay, an explicit-`false` replay for map collections, `validateBackup()`
  shape, UI behaviour, and a declaration-alone structural proof), `npm test` as step 5, and the
  explicit no-export-step negative as step 6.
- Added `## The registry contract, field by field` to the companion doc — one entry per spec key
  (`kind`, `key`, `sortBy`, `merge`, `soft`, `required`, `explicitFalse`, `label`, `columns`,
  `format`) and one per column key (`field`, `label`, `unit`, `zeroIsMissing`), each stating what
  `collectionProblems()` does when the field is wrong or missing, without stating a field count in
  prose.
- Added `## A copy-paste entry to start from` — a map-shaped registry entry under
  `<!-- registry-contract: example entry -->`, shaped like `mobilityLog` with a placeholder
  `'REPLACE ME'` label, verified by hand to return an empty problem list from the live
  `collectionProblems()` via `test/harness.js` before committing.
- Added `## The worked example: how sleep was added` (the registry-derived vs. hand-written split,
  and why the migration line is still needed even though `ensureCollectionDefaults()` is derived),
  `## The hand-written UI` (the five-piece pattern generalized from `sleep`, plus the safe-id gate
  as its own bolded rule with the `esc()`-does-not-escape-`'` reason), and
  `## The tests a new collection ships with` (all seven CLAUDE.md step-4 categories, each expanded
  into a paragraph and anchored to a real `sleep`/Dry-Run-A `ok()` label, with the stale-device
  merge replay paragraph deliberately the longest).
- Caught and fixed three citations that word-wrapped across a markdown line break during drafting —
  a naive first grep pass returned 0 hits for those three because the literal quoted string
  contained an embedded newline; rewrapping so each quoted substring stays on one line brought all
  17 citations to exactly 1 hit each.

## Task Commits

Each task was committed atomically:

1. **Task 1: Complete the six-step spine and the required-test list in CLAUDE.md** — `f52403c` (docs)
2. **Task 2: Write the registry walkthrough and the copy-paste entry into the companion doc** — `3079929` (docs)
3. **Task 3: Write the worked sleep example, the UI pattern and the test walkthrough** — `a4e21a2` (docs)

## Files Created/Modified

- `CLAUDE.md` - § Adding a new tracked thing extended from step 1 to the full six-step spine plus
  the required-test category list (33 lines added).
- `docs/adding-a-collection.md` - Four new sections appended after the existing registry-contract
  blocks: field-by-field walkthrough, copy-paste example entry, worked `sleep` example, hand-written
  UI pattern, and the test walkthrough (203 lines added across Tasks 2 and 3).

## The Six Step Headings, As Written

1. Add exactly one entry to `COLLECTIONS` in `index.html`. (entry-last / label-uniqueness rules)
2. Bump `SCHEMA` and add a `MIGRATIONS` entry. (points at the existing Schema Conventions bullet)
3. If the collection is logged or viewed, write its UI by hand. (never derived)
4. Add the tests this collection must ship with. (seven-category list, detailed below)
5. Run `npm test`.
6. Do not touch the exporter. (explicit negative step)

## `ok()` Label Substrings Cited, With Grep Hit Count

All 17 verified with `grep -c` (equivalently, exactly 1 match each) against `test/app.test.js`
after the line-wrap fix:

| Substring | Hits |
|---|---|
| `registry: the shipped COLLECTIONS has no problems` | 1 |
| `sleep: migration 18 rewrites no existing row (REG-16 guards not triggered)` | 1 |
| `sleep: migrations stay idempotent` | 1 |
| `sleep: _schema never goes down` | 1 |
| `sleep: a deleted night is not resurrected by a stale device (SLEEP-06)` | 1 |
| `sleep: replaying the stale device again keeps it deleted` | 1 |
| `an explicit false survives the merge, and absence does not mean off` | 1 |
| `sleep: a damaged sleep section is refused` | 1 |
| `sleep: an older backup without sleep is accepted` | 1 |
| `sleep: logging a night stores hours, quality and the trimmed note` | 1 |
| `sleep: blank or impossible hours are refused` | 1 |
| `sleep: the note is escaped` | 1 |
| `sleep: deleting a night is soft` | 1 |
| `sleep: an id that could break out of the attribute gets no delete button` | 1 |
| `sleep: the router exposes Care` | 1 |
| `no derived consumer mentions sleep` | 1 |
| `sleep is declared once, as the last entry` | 1 |

## `CLAUDE.md` Section Length

Final `## Adding a new tracked thing` section: **39 lines** (heading through the last line before
`## After shipping`), within the plan's 45-line budget. No content was moved from the spine to the
companion doc to stay inside the budget — the six-step draft fit without trimming.

## Decisions Made

- The copy-paste example entry's `label` is the placeholder `'REPLACE ME'` rather than a plausible
  real collection name, since inventing a name Ian hasn't proposed risked reading as a decision this
  plan doesn't have standing to make.
- Step 4's seven required-test categories in `CLAUDE.md` and the companion doc's seven
  `### ` subheadings under "The tests a new collection ships with" are written to match one for one,
  in the same order, so the two documents cannot silently drift into different category counts —
  the same "docs and registry cannot silently diverge" discipline D-03 established, applied here to
  spine-vs-companion-doc category parity (which nothing currently machine-checks, unlike the
  key-set divergence test plan 03-01 shipped).

## Deviations from Plan

None — plan executed exactly as written. The three word-wrapped citations were caught and fixed
during Task 3 itself, before committing, as part of the task's own `<acceptance_criteria>` ("Every
`ok()` label substring quoted in the doc returns at least one hit") — not a deviation from the
plan, but the plan's own verification step working as designed.

## Issues Encountered

Two `node -e` scripts run mid-task (extracting quoted substrings and grepping each against
`test/app.test.js`) initially reported 0 hits for three citations. Root cause: a markdown line wrap
had split a backtick-quoted `ok()` label across two lines, so the literal string captured by the
extraction regex contained an embedded `\n` that never appears in the single-line `ok()` call in
`test/app.test.js`. Fixed by rewrapping each of the three so the full quoted string stays on one
markdown line; re-ran the same script to confirm all 17 citations then returned exactly 1 hit.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 03-04 can proceed: the `<!-- registry-contract: example entry -->` block it needs to
  round-trip is in place and already confirmed, by hand, to validate against the live
  `collectionProblems()`.
- DOC-01 is satisfied by content: `CLAUDE.md` now carries the full six-step recipe, not a pointer
  to one.
- DOC-03's naming half is satisfied: every required-test category is named in both documents, the
  stale-device merge replay is named explicitly and is the longest test-walkthrough paragraph, and
  every concrete citation is a greppable `ok()` label rather than a line number.
- D-02 ("a competent reader can follow the recipe from `CLAUDE.md` alone") remains, as flagged in
  the plan, a human-judgment claim this plan's structural checks cannot settle — that is Dry Run B's
  job in plan 03-05, not a gap introduced here.
- No blockers.

---
*Phase: 03-f3-adding-a-new-tracked-thing-recipe*
*Completed: 2026-09-21*

## Self-Check: PASSED

- FOUND: docs/adding-a-collection.md
- FOUND: CLAUDE.md
- FOUND: .planning/phases/03-f3-adding-a-new-tracked-thing-recipe/03-03-SUMMARY.md
- FOUND: f52403c (Task 1 commit)
- FOUND: 3079929 (Task 2 commit)
- FOUND: a4e21a2 (Task 3 commit)
