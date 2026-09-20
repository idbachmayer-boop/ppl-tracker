# Phase 3: F3 — Adding a New Tracked Thing (Recipe) - Context

**Gathered:** 2026-09-20
**Status:** Ready for planning

<domain>
## Phase Boundary

A numbered "adding a new tracked thing" recipe, written against the shipped `COLLECTIONS`
declaration (11 entries, `columns: {field,label,unit,zeroIsMissing}`, validated by
`collectionProblems()` at module-eval), so the collection after `sleep` doesn't require
re-deriving what Phase 1 worked out. Requirements DOC-01…DOC-04 are fixed.

This is a documentation phase. It changes no app behaviour and adds no collection. The only
production-code change it may make is to the test suite, to enforce the recipe (D-03).

</domain>

<decisions>
## Implementation Decisions

### Recipe home & length
- **D-01:** Split, not inline. `CLAUDE.md` gets the numbered recipe as a **spine** — the steps as
  one-liners — and a companion doc carries the worked example and copy-paste fixtures. DOC-01 is
  satisfied by the spine: `CLAUDE.md` contains the numbered recipe, not a pointer to one.
  Rationale: `CLAUDE.md` is loaded into every session; the honest end-to-end recipe would roughly
  double it.
- **D-02:** The spine is **self-sufficient for the rules that bite**. Inline in `CLAUDE.md`, not
  only in the companion doc:
  - the module-eval-time placement rule, stated **verbatim** — declare before `let DB = load()`,
    adjacent to `SCHEMA`/`KEY` and before `MIGRATIONS`; every value a literal or a reference to a
    hoisted `function` declaration, never a `const` arrow, never a forward `const` reference; and
    `blank()` may read only `kind` at module-eval time (DOC-02);
  - the list of tests a new collection must ship with, including the stale-device merge replay
    (DOC-03).
  A competent reader can follow the recipe from `CLAUDE.md` alone. The companion doc is for the
  worked `sleep` example, the annotated registry entry and fixture code.
- **D-03:** The recipe is **structurally enforced, not prose**. `npm test` asserts the recipe's
  claims stay true against the live registry — e.g. every field the recipe documents matches
  `collectionProblems()`'s `ALLOWED` key list, and every key in `COLLECTIONS` is covered by the
  recipe's field list. A registry change that outdates the recipe turns the suite red.
  Rationale: this repo's recurring failure mode is a rule that nothing enforces (Migration 15,
  `mobilityLog`). The planner decides the exact assertion shape; the property is
  "docs and registry cannot silently diverge", never an exact-wording match — the `firestore.rules`
  test already learned that lesson (`CLAUDE.md` § Conventions).
- **D-04:** The companion doc is `docs/adding-a-collection.md` — a new `docs/` folder at the repo
  root. Chosen partly because Phase 7 will need somewhere to put the CSP hash-regeneration note.
  — **Reversibility:** reversible — a file move plus one link in `CLAUDE.md`.

### Claude's Discretion
Three gray areas were surfaced and deliberately left to research and planning, inside the locked
requirements:
- **How far the recipe goes** — whether the numbered steps stop at the data layer (registry entry,
  migration, tests) or carry through to the logging/viewing UI the way `sleep` actually did
  (Phase 1 shipped `sleep` as one `COLLECTIONS` entry **plus** a Care → Sleep log/list/delete
  screen). The export needs no step either way — it derives from `columns`.
- **How the required tests are named** in DOC-03 — abstract categories ("a stale-device merge
  replay") versus pointers to the real fixtures in `test/app.test.js` (`sleepFixture17`, the
  stale-device replay at ~line 435 and ~line 722). Concrete pointers rot; abstract ones are vaguer.
  Note D-03 makes staleness detectable for the registry surface, not for line numbers.
- **The DOC-04 dry run** — which non-`sleep` collection proves the recipe, and whether the dry run
  is on paper or on a scratch branch that actually runs `npm test`. Worth weighing: a **map-shaped**
  collection exercises `merge:'replace-whole'` and `explicitFalse`, which is the exact hole
  `mobilityLog` fell into, so it tests more of the recipe than another list-shaped one would.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and scope
- `.planning/ROADMAP.md` — Phase 3 goal and its 3 success criteria
- `.planning/REQUIREMENTS.md` §DOC — DOC-01…DOC-04 (locked)
- `.planning/PROJECT.md` — Key Decisions; the "one bug, four times" Context section that explains
  why this recipe exists at all

### What the recipe is written against
- `CLAUDE.md` — the file being edited; its existing voice, the war-story rules, and the
  `firestore.rules` precedent for asserting a *property* rather than exact wording
- `index.html:472–514` — the `COLLECTIONS` declaration, its placement comment block, the column
  contract, and the module-eval validation call
- `.planning/phases/01-f1-the-collections-registry/` — REG-02/03/04 (placement), REG-12…REG-16
  (differential tests, goldens), SLEEP-01…SLEEP-06 (what adding a collection actually took)
- `.planning/phases/02-export-for-claude/02-CONTEXT.md` — D-08: the `{field,label,unit}` column
  shape and `collectionProblems()`'s growing `ALLOWED` list, which the recipe must document

### Codebase
- `.planning/codebase/CONVENTIONS.md`, `.planning/codebase/TESTING.md`
- `test/app.test.js` — `sleepFixture17` (~1254), the stale-device merge replay (~435, ~722), and
  the registry-contract checks D-03 extends

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `COLLECTIONS` (index.html:492) — 11 entries, already the single source of truth the recipe
  describes; its inline comment block already states the placement rule and the column contract in
  prose that can be lifted into the recipe
- `collectionProblems()` — the registry validator whose `ALLOWED` key list is the natural anchor for
  D-03's docs-match-registry test
- `test/app.test.js` — an established harness with a `sleep` section that is, in effect, an
  already-written worked example of the recipe

### Established Patterns
- Values referenced by the registry must be hoisted `function` declarations (REG-03/04)
- The suite asserts *properties*, not exact file wording (the `firestore.rules` lesson)
- `npm test` before every push; a red suite blocks the deploy

### Integration Points
- `CLAUDE.md` (new numbered section), `docs/adding-a-collection.md` (new file), and `test/app.test.js`
  (new enforcement checks). No `index.html` behaviour change.

</code_context>

<specifics>
## Specific Ideas

- The spine must state the placement rule **verbatim** — DOC-02 says "verbatim", and a paraphrase of
  a temporal-dead-zone rule is how the boot died once already.
- `docs/` is expected to also host the Phase 7 CSP hash-regeneration note (CSP-07), so it is not a
  folder created for one file.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-f3-adding-a-new-tracked-thing-recipe*
*Context gathered: 2026-09-20*
