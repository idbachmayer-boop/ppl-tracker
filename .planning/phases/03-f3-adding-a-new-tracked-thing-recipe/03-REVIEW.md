---
phase: 03-f3-adding-a-new-tracked-thing-recipe
reviewed: 2026-09-21T00:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - CLAUDE.md
  - docs/adding-a-collection.md
  - test/app.test.js
findings:
  critical: 1
  warning: 1
  info: 1
  total: 3
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-09-21T00:00:00Z
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

This phase adds a "recipe" for adding a new tracked collection: a `CLAUDE.md` § "Adding a new
tracked thing", a companion `docs/adding-a-collection.md` worked example, and four new test blocks
in `test/app.test.js` (DOC-04/Dry Run A's map-collection probe, DOC-02's placement-rule
verbatim-quote check, DOC-03's registry/doc divergence check, and the copy-paste example-entry
round-trip).

Fact-checked every doc claim against `index.html`: the `COLLECTIONS` registry shape, the
`collectionProblems()` `ALLOWED`/column-key contracts, `liveOf()`'s map refusal, `validateBackup()`'s
exact damaged-section message, the `INTRODUCED_AT` boot table, the `WRITE_MERGE_GOLDEN` regeneration
step, the "hoisted function, never a const arrow" placement rule, and the `let migrationRan` /
`load()` ordering all check out — nothing in either doc tells a reader to do something that would
break sync, soft delete, or the explicit-`false` map convention. The regex/JSON extractors added for
DOC-02 and DOC-03 (`docBlock()`, the `ALLOWED` array anchor, the `has unknown key` column-key anchor)
were verified against the live source and are not vacuous — they anchor to real, uniquely-occurring
text and a sentinel-field mutation test proves they reject an injected bogus field.

One test in the new DOC-04/Dry Run A block is genuinely vacuous, confirmed by reproduction below —
see CR-01.

## Critical Issues

### CR-01: "no derived consumer mentions recipeProbeMap" asserts against the wrong object and always passes

**File:** `test/app.test.js:1690-1693`
**Issue:** This test is meant to prove that Dry Run A's injected map collection (`recipeProbeMap`,
only present in the `recipeProbe` instance built via `test/harness.js`'s `opts.transform`) is picked
up by every derived consumer generically — i.e. that none of `blank`, `liveOf`, `validateBackup`,
`mergeCollections`, `mergeDB`, `exportRows`, `buildMarkdownExport` special-case it by name. But the
`consumers` map is built from `app.*`, not `recipeProbe.*`:

```js
const consumers = { blank: app.blank, liveOf: app.liveOf, validateBackup: app.validateBackup,
  mergeCollections: app.mergeCollections, mergeDB: app.mergeDB, exportRows: app.exportRows,
  buildMarkdownExport: app.buildMarkdownExport };
const hits = Object.keys(consumers).filter(name =>
  stripComments(consumers[name].toString()).indexOf('recipeProbeMap') >= 0);
ok('DRY-RUN-A: no derived consumer mentions recipeProbeMap', hits.length === 0, hits);
```

`app` is `loadApp(APP_PATH)` — the **unmodified** app, whose source never declares `recipeProbeMap`
at all (it only exists in `recipeProbe`, built two lines above from a transformed copy of the source).
Since the string `"recipeProbeMap"` cannot appear anywhere in `app`'s source, `hits` is `[]` and this
assertion passes unconditionally, regardless of whether the derived consumers in `recipeProbe` (the
instance that actually matters) special-case the collection by name.

Reproduced by injecting a deliberate regression into `recipeProbe`'s `blank()` (a `/* BUG: special-
cased by name */` branch keyed on the literal `'recipeProbeMap'`) and running the test's own
assertion logic against both objects:

```
AS WRITTEN (checks app.*) hits: [] -> test would pass: true
IF CHECKING recipeProbe.* instead, hits: [ 'blank' ] -> test would pass: false
```

The correctly-scoped version of this check (used one screen away, for `sleep`, at
`test/app.test.js:1583-1586`) is legitimate there only because `sleep` really is declared in `app`'s
own `COLLECTIONS` — that pattern does not transfer to a transform-injected probe collection that only
exists in a second, separately-loaded instance. This is exactly the "regex extractor that silently
matches nothing and passes" failure mode: the test's label promises coverage of genericity for the
map-only branches that Dry Run A exists to exercise (per the block's own header comment,
`mobilityLog`'s production incident is the motivating case), and currently provides none.

**Fix:**
```js
const consumers = { blank: recipeProbe.blank, liveOf: recipeProbe.liveOf,
  validateBackup: recipeProbe.validateBackup, mergeCollections: recipeProbe.mergeCollections,
  mergeDB: recipeProbe.mergeDB, exportRows: recipeProbe.exportRows,
  buildMarkdownExport: recipeProbe.buildMarkdownExport };
const hits = Object.keys(consumers).filter(name =>
  stripComments(consumers[name].toString()).indexOf('recipeProbeMap') >= 0);
ok('DRY-RUN-A: no derived consumer mentions recipeProbeMap', hits.length === 0, hits);
```

## Warnings

### WR-01: Dry Run A injects the probe collection first, not last — silently at odds with the recipe's own placement rule

**File:** `test/app.test.js:1610-1611`
**Issue:**
```js
const recipeProbeTransform = code => code.replace('const COLLECTIONS = {', 'const COLLECTIONS = {\n' + RECIPE_PROBE_MAP_LINE);
```
This inserts `recipeProbeMap` as the very **first** key of `COLLECTIONS`. `CLAUDE.md`'s step 1 (the
very recipe this phase ships) is explicit that a new entry "goes **last** — never inserted among the
existing entries, because entry order fixes validation precedence and merge order." This pattern is
copied verbatim from the pre-existing `SLEEP-05` probe (`test/app.test.js:1503`), so it's not new to
this phase and, as far as I traced, `collectionProblems()`'s duplicate-label check and `mergeDB()`'s
per-collection merge are not actually order-sensitive in the current implementation — so this does
not appear to hide a live bug today. But it does mean Dry Run A's own header comment ("machine-proves
the recipe's data-layer half end to end for it") overstates what's covered: it never exercises
whether placement position affects anything, and a future change that makes validation or merge order
genuinely order-sensitive would not be caught by either probe.
**Fix:** Either note explicitly in the block comment that placement order is out of scope for this
probe (DOC-02's separate verbatim-quote test already covers the *documented* rule, not runtime
behavior), or change the transform to append the line immediately before the registry's closing `};`
so the probe is actually last, matching what a reader following the recipe would produce.

## Info

### IN-01: DOC-03's "documented spec key is accepted" check only detects one specific failure mode

**File:** `test/app.test.js:262-272`
**Issue:** `specKeyFalselyRefused` is only populated when `collectionProblems()` returns a message
containing `unknown field "<name>"`. Any documented key that produces a *different* kind of rejection
(e.g. a hypothetical future validator change that refuses a currently-valid key via some other message
shape) would not be flagged as "falsely refused" even though the key would, in practice, be unusable
as documented. This is intentional and narrowly correct for what it currently guards against (an
`ALLOWED`-list drift), and is not a bug, but the assertion name ("every documented spec key is
accepted by collectionProblems") reads more broadly than what it actually checks.
**Fix:** Optional — narrow the `ok()` label to something like "every documented spec key is a known
field (not refused as unknown)" so the label doesn't overpromise, or add a stricter per-key valid
fixture if broader coverage is wanted later.

---

_Reviewed: 2026-09-21T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

## Resolution (2026-09-21)

- **CR-01 — fixed** in `ac7420a`: consumers now read from `recipeProbe.*`; mutation-checked (a name special-case injected into `blank()` turns the check red). Suite: 748 passed, 0 failed.
- **WR-01 — open (advisory):** the probe is injected first in `COLLECTIONS`, not last as the recipe prescribes. No current order-dependence found.
- **IN-01 — open (info).**
