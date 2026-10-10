# Phase 3: F3 — Adding a New Tracked Thing (Recipe) - Pattern Map

**Mapped:** 2026-09-20
**Files analyzed:** 3
**Analogs found:** 2 / 3 (the third — `docs/adding-a-collection.md` — has no in-repo analog; see below)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|-----------------|---------------|
| `CLAUDE.md` (new numbered recipe section) | config/documentation | request-response (prose read by a human/agent, not executed) | `CLAUDE.md`'s own "Rules that exist because breaking them cost real data" and "Conventions" sections | exact (self-analog) |
| `docs/adding-a-collection.md` (new file, new folder) | documentation | transform (worked example → copy-paste fixture) | none in-repo; nearest structural cousin is `.planning/codebase/*.md` | no analog — do not force |
| `test/app.test.js` — D-03 docs-match-registry assertion | test | transform (parse doc/registry, assert property equality) | `test/app.test.js:1765` registry-contract check, and the `firestore.rules` property test at `test/app.test.js:89-113` | exact (property-assertion pattern) |
| `test/app.test.js` — Dry-run-A map-shaped probe | test | event-driven / transform (fresh `vm` boot from source-patched code) | SLEEP-05 block, `test/app.test.js:1495-1579`, built on `test/harness.js`'s `opts.transform` | exact |

## Pattern Assignments

### `CLAUDE.md` (new numbered recipe section)

**Analog:** `CLAUDE.md`'s own existing sections (self-analog — this file's voice is the only pattern that matters here).

**Section heading style** — level-2 (`##`), short, sometimes an evocative name rather than a bland
noun (`## Before every push`, `## Rules that exist because breaking them cost real data`,
`## Conventions`, `## After shipping`). A new numbered-recipe section should get its own `##` heading,
not be nested under an existing one — e.g. `## Adding a new tracked thing` (mirrors "Before every
push" — short, verb-first, states what the reader is about to do).

**"Rules that exist because breaking them cost real data" block structure** (repo-relative
`CLAUDE.md`, currently around lines 18-40 — anchor on the heading text, not the line number, it will
move once this section is added):
- Each rule is one **bold, one-sentence claim** as a lead-in, followed by 1-3 sentences of
  justification/mechanism, e.g.:
  ```
  **Sync is a union merge, never an overwrite.** On 2026-07-25 a stale device blind-wrote the cloud and
  destroyed four days of weigh-ins, unrecoverably. Every remote write is a `runTransaction` that
  re-reads and calls `mergeDB()`. Never `set()`. Never resolve a conflict by "more data wins" — edits
  legitimately remove sets.
  ```
- War-story rules cite what broke, when, and why — not just the rule. The recipe's D-02 placement
  rule should follow this shape: state the rule, then (briefly) what breaks if ignored, referencing
  Migration 15 / the TDZ trap already named in `index.html`'s own comment, not re-deriving new prose.
- Inline code (`COLLECTIONS`, `mergeDB()`, `_schema`) is back-ticked throughout — follow this for
  `COLLECTIONS`, `SCHEMA`, `MIGRATIONS`, `blank()`, `collectionProblems()` in the new section.

**"Conventions" block structure** (currently lines 42-60, bulleted, not full paragraphs):
```
- **Escaping:** every user-controlled string rendered into HTML goes through `esc()`. Two holes to
  know about: ...
- **Security rules live in `firestore.rules`**, in this repo — not only in the Firebase console.
  ... The suite asserts the security *property* (every `allow` gated on the caller owning the
  document, nothing granted unconditionally), never the exact wording — an earlier version pinned
  the variable name and broke the moment the file matched reality.
- **Schema:** bump `SCHEMA` and add an entry to `MIGRATIONS`. Migrations must be idempotent and must
  never downgrade `_schema`.
```
This is the exact precedent RESEARCH.md points to for "assert the property, never the wording"
(D-03's rationale) — CONTEXT.md and RESEARCH.md both cite this convention bullet by name
(`CLAUDE.md § Conventions`). The new recipe's DOC-03 language should echo this bullet's own phrasing
("asserts the *property*... never the exact wording") rather than re-explaining it, and can literally
link back to the "Schema" bullet above instead of restating the SCHEMA/MIGRATIONS rule a second time
— `CLAUDE.md` already states it generically (RESEARCH.md §Q1 recommendation: "point at/reuse this
line rather than re-deriving it").

**Numbered-list precedent:** `CLAUDE.md` currently has no numbered list — every existing section uses
bold-lead-in bullets or plain prose. The recipe is the first place a numbered list appears. Keep list
items one-line/spine-style per D-01 ("the steps as one-liners"), consistent with the terseness of
every other section — no item should run past 2 lines before pointing to the companion doc.

**Verbatim placement-rule source** — RESEARCH.md's DOC-02 section recommends sourcing the verbatim
quote from `index.html`'s own comment block (around `index.html:479-491`, anchor on the comment text
"Declared before DB boots via load()"), not from `REQUIREMENTS.md`/`ROADMAP.md`'s looser "adjacent to
SCHEMA/KEY" wording. Planner should quote that `index.html` comment text directly into the new
`CLAUDE.md` section.

---

### `docs/adding-a-collection.md`

**No analog exists in this repository.** `docs/` does not currently exist (confirmed: `ls docs` in
the worktree root returns nothing). Do not force a match to an unrelated file type.

The nearest **structural** cousin — for tone/format only, not content — is `.planning/codebase/*.md`
(`ARCHITECTURE.md`, `CONVENTIONS.md`, `STRUCTURE.md`, `TESTING.md`, `INTEGRATIONS.md`, `CONCERNS.md`):
these are the only other markdown documents in the repo written for a technical reader walking through
"how does this codebase work," as opposed to `CLAUDE.md`'s terse rule-list voice. If the planner wants
a heading/section-break convention to imitate, `.planning/codebase/CONVENTIONS.md` and `TESTING.md`
are worth a glance for how they structure a "here is the pattern, here is a worked example" doc — but
this is a weak, tone-only cousin, not a load-bearing analog. Everything content-specific for this file
(the annotated `sleep` registry entry, the field-by-field walkthrough, the fixture code, the
`addSleep`/`removeSleep`/`viewSleep`/router-wiring worked example) should be built directly from
RESEARCH.md's own extracted evidence (§Q1's enumerated edit list, `index.html:3846-3889` for the
worked `sleep` UI functions, `index.html:492-519` for the registry entry shape) — RESEARCH.md has
already done this extraction; PATTERNS.md does not need to re-derive it.

---

### `test/app.test.js` — D-03 docs-match-registry assertion (test, transform/property-check)

**Analog A (primary): the `firestore.rules` property test.** Anchor: search for the comment text
"Assert the property, never the wording" (`test/app.test.js`, in the block immediately preceding
`const rulesPath = APP_PATH.replace(/index\.html$/, 'firestore.rules');`, currently around lines
89-113). This is explicitly the pattern D-03 is told to copy — CONTEXT.md cites it directly ("the
`firestore.rules` test already learned that lesson").

**What to copy — the shape, not the exact regex:**
```javascript
/* ... These originally asserted the exact text of a DRAFT of firestore.rules rather than the security
   property, so reconciling the file with the real console rules on 2026-09-10 broke them both...
   Assert the property, never the wording. */
const rulesPath = APP_PATH.replace(/index\.html$/, 'firestore.rules');
ok('firestore.rules is in the repo', fs.existsSync(rulesPath));
if(fs.existsSync(rulesPath)){
  const rules = fs.readFileSync(rulesPath, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
  ok('  …every allow is gated on the caller owning the document',
     (rules.match(/allow\b[^;]*:\s*if\b[^;]*;/g) || []).length > 0
     && (rules.match(/allow\b[^;]*:\s*if\b[^;]*;/g) || [])
          .every(a => /request\.auth\.uid\s*==\s*\w+/.test(a) || /\bif\s+false\b/.test(a)));
  ok('  …and nothing is granted unconditionally', !/allow\b[^;]*:\s*if\s+true\b/.test(rules));
}
```
**Pattern to extract, generalized for D-03:**
1. Read the source-of-truth file (there: `firestore.rules`; here: `docs/adding-a-collection.md` for
   the doc's claimed field list, or `CLAUDE.md`'s new section for the recipe's field claims).
2. Strip anything that isn't the load-bearing content (there: comments; here, per RESEARCH.md's Shape
   A: extract the field-name array from a fenced code block via a marker comment / regex capture, then
   `JSON.parse` after quoting keys).
3. Compare a **derived value** (a sorted/deduped key set) against the live code's own value — never a
   string/prose match. Here: `collectionProblems()`'s live `ALLOWED` array,
   `['kind','key','sortBy','merge','soft','required','explicitFalse','label','columns','format']`
   (`index.html:4009`, anchor on the `const ALLOWED = [` literal — RESEARCH.md already confirms this
   exact array).
4. The cautionary tale is in the comment itself — read it into the new test's own header comment
   framing so a future maintainer understands *why* this is a value-diff, not a string match (mirrors
   how the `firestore.rules` comment explains its own prior failure).

**Analog B (secondary): the existing registry-contract check**, anchor on the `ok()` label text
`registry: the shipped COLLECTIONS has no problems` (`test/app.test.js`, currently around line 1765):
```javascript
ok('registry: the shipped COLLECTIONS has no problems', app.collectionProblems(app.COLLECTIONS).length === 0, app.collectionProblems(app.COLLECTIONS));
```
This is the simplest possible "assert against the live registry, not a copy" pattern — call the real
exported function (`app.collectionProblems`) against the real exported data (`app.COLLECTIONS`), never
a hand-reconstructed copy of either. D-03's new test should follow the same shape: pull the doc's
claimed field list, pull `app.collectionProblems`'s live `ALLOWED` list (it is a local `const` inside
the function, not itself exported — the new test will need to either export it or derive it
indirectly, e.g. by feeding `collectionProblems()` a synthetic spec with every candidate field and
reading which ones it flags as "unknown field"; the planner should choose the extraction mechanism).

**Where to place the new block:** near the existing registry-contract checks
(`test/app.test.js`, the `── the registry refuses what would lose data (REG-05/REG-04/REG-17/REG-11) ──`
console.log block or immediately after it) — keeps every "does the registry stay honest" check
co-located, matching this file's existing `console.log('\n── ... ──')` section-banner convention.

---

### `test/app.test.js` — Dry-run-A map-shaped probe (test, event-driven/transform)

**Analog:** SLEEP-05 block, anchor on the comment text `SLEEP-05: a collection declared in one line is
picked up everywhere` (`test/app.test.js`, currently lines 1495-1579), built on `test/harness.js`'s
`opts.transform` mechanism (anchor: `function loadApp(htmlPath, seed, opts)`, `test/harness.js` line
~45, and the `opts.transform(code)` comment at line ~42).

**Harness transform mechanism to copy** (`test/harness.js`):
```javascript
// opts.transform(code), when given, rewrites the extracted inline-script text before it runs
function loadApp(htmlPath, seed, opts){
  // ...
  if(opts && typeof opts.transform === 'function') code = opts.transform(code);
  // ... boots a fresh vm instance from the (possibly mutated) source
}
```

**Probe injection + assertion style to copy** (`test/app.test.js:1501-1579`, condensed):
```javascript
const PROBE_LIST_LINE = "  probeList:{ kind:'list', key:'id', sortBy:'date', merge:'union', soft:true, required:false, label:'Probe list', columns:[{field:'date',label:'date'},{field:'value',label:'value',unit:'mass'}] },";
const PROBE_MAP_LINE  = "  probeMap:{ kind:'map', merge:'replace-whole', soft:false, required:false, explicitFalse:true, label:'Probe map', columns:[{field:'date',label:'date'},{field:'item',label:'item'}], format:dayFlagRows },";
const probeTransform = code => code.replace('const COLLECTIONS = {', 'const COLLECTIONS = {\n' + PROBE_LIST_LINE + '\n' + PROBE_MAP_LINE);
const probe = loadApp(APP_PATH, null, { transform: probeTransform });

ok('SLEEP-05: the declaration is valid', probe.collectionProblems(probe.COLLECTIONS).length === 0, probe.collectionProblems(probe.COLLECTIONS));
// then: blank() creates it empty, liveOf() hides deleted rows, validateBackup() checks shape,
// mergeDB() unions/replaces per merge strategy — one ok() per derived consumer, each proving
// "picked up from declaration alone, zero further code."
```

**What Dry-run-A must change to avoid colliding with SLEEP-05** (per RESEARCH.md's explicit
recommendation): use a **new, distinctly-named** map-shaped probe collection — e.g. `recipeProbeMap`,
not `probeMap` — declared via the same `opts.transform` string-replace technique, asserting the same
five derived-consumer properties (`blank()`, `liveOf()`, `validateBackup()`, `mergeDB()`,
`mergeCollections()` pick it up with zero further code). This keeps Dry-run-A additive and permanent
(cheap to keep, cannot bit-rot) rather than duplicating or weakening the existing SLEEP-05 assertions.

**Assertion style to copy exactly:** each `ok()` call's third argument is the actual failing value
(never a boolean), e.g. `ok('SLEEP-05: liveOf hides a deleted probe row', live.length === 1 && live[0].id === 'p1', live);` —
this repo's `ok()` convention always passes a debug payload as the third arg so a failure prints
useful state, not just `false`. Follow this in the new Dry-run-A checks.

**Section banner convention:** `console.log('\n── SLEEP-05: a collection declared in one line is picked up everywhere ──');`
— every major test block in this file opens with a `console.log('\n── <name> ──')` banner. The new
Dry-run-A block should open with its own banner, e.g.
`console.log('\n── DRY-RUN-A: the recipe's map probe is picked up everywhere ──');`.

## Shared Patterns

### "Assert the property, never the wording"
**Source:** `CLAUDE.md § Conventions` (the `firestore.rules` bullet) and its test implementation,
`test/app.test.js` around lines 89-113 (anchor: comment text "Assert the property, never the wording").
**Apply to:** the new `CLAUDE.md` recipe section's own D-03 language, and the D-03 enforcement test in
`test/app.test.js`. Both should explicitly invoke this precedent rather than re-deriving the
justification — `CLAUDE.md` already states it once; don't restate it a third time across two new
documents.

### `ok()` debug-payload convention
**Source:** every `ok()` call site in `test/app.test.js` (e.g. line 1765, line 1509-1511, 1514, 1518-1523).
**Apply to:** both new test additions (D-03's registry/doc diff, Dry-run-A's probe assertions) — pass
the actual mismatched value as the third argument, never bare `true`/`false`.

### `console.log('\n── <banner> ──')` section markers
**Source:** used throughout `test/app.test.js` before every major test block (e.g. line 1495, line
1581).
**Apply to:** both new test blocks, so they read as first-class sections in `npm test` output rather
than orphaned checks appended to an existing block.

### Bold-lead-in-sentence rule format
**Source:** `CLAUDE.md`'s "Rules that exist because breaking them cost real data" section and its
"Conventions" section (bulleted variant).
**Apply to:** the new numbered recipe section in `CLAUDE.md` — keep the terse, one-bold-claim-per-item
voice; do not switch to a different prose register for the new section.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `docs/adding-a-collection.md` | documentation | transform | `docs/` does not exist yet; no prior worked-example/companion-doc file exists in this repo. Nearest tone-only cousin: `.planning/codebase/*.md` (not load-bearing — content should be built from RESEARCH.md's own extracted evidence, not from imitating another file's structure). |

## Metadata

**Analog search scope:** repo root `CLAUDE.md`; `test/app.test.js` (full file, targeted reads at
firestore.rules block ~80-125, SLEEP-05 block ~1495-1600, registry-contract block ~1755-1795);
`test/harness.js` (`opts.transform`/`loadApp` definitions); `.planning/codebase/` directory listing;
`docs/` confirmed absent.
**Files scanned:** 4 (`CLAUDE.md`, `test/app.test.js`, `test/harness.js`, `.planning/codebase/` listing)
**Pattern extraction date:** 2026-09-20
</content>
