# Phase 3: F3 — Adding a New Tracked Thing (Recipe) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-20
**Phase:** 3-f3-adding-a-new-tracked-thing-recipe
**Areas discussed:** Recipe home & length

---

## Gray area selection

Four areas were offered; one was selected.

| Option | Description | Selected |
|--------|-------------|----------|
| Recipe home & length | Inline in CLAUDE.md vs a spine plus companion doc | ✓ |
| How far the recipe goes | Data layer only, or through to the logging/viewing UI | |
| How the tests are named | Abstract categories vs pointers to real fixtures | |
| DOC-04 dry run | Which non-sleep collection, and paper vs scratch branch | |

The three unselected areas are recorded in CONTEXT.md under Claude's Discretion, with the
trade-offs stated, so research and planning can resolve them without another round.

---

## Recipe home & length

### Where does the recipe live?

| Option | Description | Selected |
|--------|-------------|----------|
| Spine in CLAUDE.md, detail in a doc | Numbered steps + non-negotiable rules in CLAUDE.md; worked example and fixtures in a companion doc | ✓ |
| Fully inline in CLAUDE.md | One authoritative place, nothing to follow; CLAUDE.md roughly doubles and every session pays for it | |
| Companion doc, one line in CLAUDE.md | Leanest always-loaded file; war-story rules end up outside the file meant to carry them | |

**User's choice:** Spine in CLAUDE.md, detail in a doc.
**Notes:** DOC-01 is satisfied by the spine itself — CLAUDE.md contains the numbered recipe, not a
pointer to one.

### How much does the spine carry on its own?

| Option | Description | Selected |
|--------|-------------|----------|
| Steps + the rules that bite | Steps as one-liners, plus the module-eval placement rule verbatim (DOC-02) and the required-tests list (DOC-03) inline | ✓ |
| Steps only | Every rule and test detail in the companion doc; DOC-02's "verbatim" then lands in the second file | |
| Steps + a real COLLECTIONS line | Also an annotated pasteable registry entry; longest of the three | |

**User's choice:** Steps + the rules that bite.
**Notes:** A competent reader can follow the recipe from CLAUDE.md alone; the companion doc is for
the worked `sleep` example and fixture code.

### Prose or structural enforcement?

| Option | Description | Selected |
|--------|-------------|----------|
| Test that the docs match the registry | npm test asserts the recipe's field list and collectionProblems()'s ALLOWED list stay in step; a registry change that outdates the recipe turns the suite red | ✓ |
| Prose only | Cheapest, nothing new to maintain; a twelfth collection with new metadata silently ages the recipe | |
| Test that the files exist and are linked | Catches deletion and broken links, not staleness | |

**User's choice:** Test that the docs match the registry.
**Notes:** Consistent with the repo's existing lesson that the suite asserts a *property*, never
exact wording — the earlier `firestore.rules` test that pinned a variable name broke the moment the
file matched reality.

### Companion doc location

| Option | Description | Selected |
|--------|-------------|----------|
| docs/adding-a-collection.md | New docs/ folder at the repo root; room for the Phase 7 CSP hash note | ✓ |
| adding-a-collection.md at the repo root | Beside CLAUDE.md and REVIEW-2026-09-09.md, where long-form prose already lives | |
| You decide | Planner picks | |

**User's choice:** `docs/adding-a-collection.md`.

---

## Claude's Discretion

- How far the recipe goes — data layer only, or through to the logging/viewing UI
- How the required tests are named — abstract categories vs pointers to real fixtures
- The DOC-04 dry run — which non-`sleep` collection, and paper vs scratch branch
- The exact shape of the D-03 docs-match-registry assertion

## Deferred Ideas

None — discussion stayed within phase scope.
