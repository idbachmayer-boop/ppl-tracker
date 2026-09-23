# Phase 3: F3 — Adding a New Tracked Thing (Recipe) - Research

**Researched:** 2026-09-20
**Domain:** Internal documentation authoring for a single-file PWA's declarative data registry (no new external stack — this phase edits `CLAUDE.md`, adds `docs/adding-a-collection.md`, and extends `test/app.test.js`)
**Confidence:** HIGH — every claim below was checked against the code or test file read this session; no library research was needed because this phase introduces no dependency.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DOC-01 | `CLAUDE.md` gains a numbered "adding a new tracked thing" recipe, written against the shipped `COLLECTIONS` declaration | §Q1 (spine scope), §Recipe Spine Draft — recommends a 6-step spine, and confirms via `index.html`/test evidence which steps are registry-derived vs hand-written |
| DOC-02 | The recipe states the module-eval-time placement rule and what may appear as a value in `COLLECTIONS` | §DOC-02 Placement Rule — three existing wordings quoted verbatim, discrepancy flagged, source-of-truth recommendation given |
| DOC-03 | The recipe names the tests a new collection must ship with, including the stale-device merge replay | §Q2 — enumerates every test category `sleep` actually shipped with (with file:line), demonstrates line-number rot found live in `CONTEXT.md` itself, recommends a naming/enforcement scheme |
| DOC-04 | The recipe is verified end to end for a collection that is not `sleep`, on paper or in a scratch branch | §Q3 — confirms the map-shaped claim against real `COLLECTIONS` entries and `collectionProblems()`, identifies the SLEEP-05 probe-injection pattern as an existing, already-proven dry-run mechanism, and names a concrete candidate collection |
</phase_requirements>

## Summary

This is a documentation phase against code that is already fully shipped and already tested — there
is no unknown technology here, only unknowns about *what the recipe should say* and *how to prove it
stays true*. All three of CONTEXT.md's gray areas resolve cleanly from evidence already sitting in
the repo: (1) `sleep`'s actual edit list splits cleanly into registry-derived work and hand-written
UI work, and the export genuinely required zero code either way — confirmed by reading
`buildMarkdownExport()`/`exportRows()`, not assumed; (2) the concrete-fixture-pointer approach in
DOC-03 is demonstrably fragile — this research found `CONTEXT.md`'s own line-number citations
already stale at the moment they were written; and (3) Phase 1 already built and shipped, inside
`test/app.test.js`, the exact "declare a throwaway map-shaped collection and prove every derived
consumer picks it up with zero further code" dry run that DOC-04 is asking for — it just isn't
labeled as a recipe rehearsal.

**Primary recommendation:** Write the `CLAUDE.md` spine as data-layer steps (registry entry →
SCHEMA/MIGRATIONS bump → required tests → `npm test`) plus **one** line naming "hand-written
logging/viewing UI" as a non-derived, non-decomposed step pointing to the companion doc; name DOC-03's
tests by **category and `ok()`-label substring**, never by line number; and satisfy DOC-04 with two
complementary dry runs — a permanent, `npm test`-verified map-shaped probe extending the existing
SLEEP-05 pattern (covers the data layer), plus a one-time scratch-branch walkthrough of a real
map-shaped candidate collection, "supplements", discarded after `npm test` passes (covers the UI
half the probe pattern cannot reach).

## Architectural Responsibility Map

This is a single-file offline-first PWA with no server tier; the standard five-tier web-app map does
not fit. Adapted to this project's actual layers:

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Recipe content (numbered steps, placement rule, field contract) | Documentation (`CLAUDE.md` spine) | Companion doc (`docs/adding-a-collection.md`) | D-01: spine carries the rules that bite; companion carries the worked example (loaded doc is small; full doc is discoverable) |
| Recipe-vs-registry divergence detection | Test Suite (`test/app.test.js`) | Browser/Client (`collectionProblems()` in `index.html`) | D-03: `npm test` is the only thing in this repo that "structurally enforces" anything; it must read the live `ALLOWED` list and the live `COLLECTIONS` keys, not a copy |
| Collection runtime behavior (merge, soft-delete, migration) | Browser/Client (`index.html`) | — | Already built and shipped in Phase 1; this phase changes none of it |
| New-collection UI (logging/viewing) | Browser/Client (`index.html`) | Documentation (companion doc, worked example only) | Never derivable from the registry (confirmed: `sleepUid`/`addSleep`/`removeSleep`/`viewSleep` are 100% hand-written, index.html:3846-3889) |
| Markdown export of a new collection | Browser/Client (`buildMarkdownExport()`/`exportRows()`) | — | Confirmed registry-driven; needs no recipe step (see §Q1) |

## Q1 — How far the recipe goes

### Reconstructing what shipping `sleep` actually took

Enumerated from `.planning/phases/01-f1-the-collections-registry/01-05-SUMMARY.md` and cross-checked
directly against `index.html`:

**Registry-driven / structurally required (derived consumers need zero edits):**
1. One `COLLECTIONS` entry — `index.html:514`:
   `sleep: { kind:'list', key:'id', sortBy:'date', merge:'union', soft:true, required:false, label:'Sleep', columns:[{field:'date',label:'date'},{field:'hours',label:'hours'},{field:'quality',label:'quality (1-5)'},{field:'note',label:'note'}] }`
2. `SCHEMA` bumped 17 → 18 — `index.html:474`.
3. `MIGRATIONS[18] = d=>ensureCollectionDefaults(d)` — `index.html:563`, helper defined
   `index.html:570-573`. This is **not** a derived consumer in the REG-06/07/08/09 sense; it is a
   small hand-written migration line, one per new collection, required because an *existing* device's
   stored blob won't gain the new key until `_schema` advances past it — `blank()` only helps a
   *fresh* boot. `CLAUDE.md` already states this rule generically under **Conventions → Schema**:
   `"Schema: bump SCHEMA and add an entry to MIGRATIONS. Migrations must be idempotent and must
   never downgrade _schema."` The recipe should point at/reuse this line rather than re-deriving it.

**Hand-written, never derived (this is what "plus its logging/viewing UI" meant in Phase 1):**
4. `sleepUid()` — `index.html:3846`.
5. `addSleep()` — `index.html:3847-3859` (form read, validation/clamping, `touch()`, `save()`).
6. `removeSleep(id)` — `index.html:3860` (soft delete via `softDelete()`).
7. `viewSleep()` — `index.html:3861-3889` (history list, last-7-days summary card, add form, safe-id
   gate on the delete button per the `esc()`-does-not-escape-`'` convention).
8. Router wiring — Care tab's `sub` array gained `['sleep','Sleep']` and its `view:` dispatcher
   gained a branch — `index.html:1369-1370`.
9. `test/harness.js` — the new function names (`sleepUid`, `addSleep`, `removeSleep`, `viewSleep`,
   `ensureCollectionDefaults`) had to be added to the harness's exported-names allowlist. This is a
   **test-harness mechanic**, not an app requirement — worth one line in the companion doc so a
   future reader isn't stranded wondering why their new function is `undefined` in tests, but it does
   not belong in the `CLAUDE.md` spine.

**Test-only additions (not app code, but required by D-03):**
10. SLEEP-01/06/REG-16 block (`test/app.test.js:1254-1394`, ~14 checks) — migration correctness,
    stale-device replay for the new collection specifically.
11. SLEEP-02/03 block (`test/app.test.js:1396-1493`, ~12 checks) — the hand-written UI's own
    behavior (form validation, escaping, soft delete).
12. SLEEP-04 block (`test/app.test.js:1581-1599`) — structural proof that no derived consumer's
    source mentions `sleep` by name.
13. SLEEP-05 block (`test/app.test.js:1495-1579`) — the probe-injection proof (see §Q3).

**A reader stranded without #4-9:** anyone who only got a registry entry, a migration, and passing
tests would have a fully-synced, fully-exportable collection with **no way to log to it or see it on
the phone** — Ian's actual use case (mid-workout, on the phone) is entirely UI. This is why the spine
cannot skip naming the UI step even though it can't be decomposed the way the registry step can.

### Confirming the export needs no step (verified, not assumed)

`buildMarkdownExport()` (`index.html:3416-3452`) computes `Object.keys(COLLECTIONS).map(name=>({
spec: COLLECTIONS[name], rows: exportRows(name) }))` — a single registry-keyed loop, no per-collection
branch. `exportRows()` (`index.html:3382-3415`) likewise reads `spec.kind`, `spec.format`,
`spec.columns` generically; for a `list` it only calls `spec.format` `if(typeof spec.format==='
function')`, and for a `map` it calls `spec.format` unconditionally (confirming maps **must**
declare `format` — also enforced by `collectionProblems()`, `index.html:4063`:
`if(spec.kind==='map' && typeof spec.format!=='function') p('a map must declare format');`). A grep
of `sleep` across `buildMarkdownExport`, `exportRows`, `mdCell`, `mdHeader` (`index.html:3382-4000`)
returns zero hits — `sleep` is never named there. Phase 2's own test
(`test/app.test.js:2416-2434`) proves this live: a synthetic `probeList`/`probeMap` pair, declared
only via `test/harness.js`'s `opts.transform`, gets its own export section with "no exporter edit"
— the test's own comment says exactly that. **This is a verified claim, not an assumption carried
over from CONTEXT.md.**

### Recommendation — Recipe Spine Draft (for DOC-01)

A 6-line numbered spine in `CLAUDE.md`, each line pointing to the companion doc for the worked
example:

1. Add one `COLLECTIONS` entry — placement + value rules stated verbatim (DOC-02, see below).
2. Bump `SCHEMA` and add a `MIGRATIONS[N]` entry (existing "Schema" convention applies — an
   empty-default migration is usually enough; see `ensureCollectionDefaults` in the companion doc).
3. If the collection needs to be logged or viewed, write its UI by hand — this is never derived.
   (Companion doc: `sleep`'s `addX`/`removeX`/`viewX`/router-wiring pattern.)
4. Add the tests this collection must ship with (DOC-03 — see the list below).
5. Run `npm test` — `collectionProblems()` validates the registry at module eval; a red suite means
   a rule was broken.
6. No export step is needed — `buildMarkdownExport()` derives every section from `COLLECTIONS`.

Step 6 is worth keeping as an explicit **negative** step in the spine ("no export step needed") —
its whole value is pre-empting the natural next question ("do I also need to touch the exporter?")
with a verified "no," rather than leaving it silently absent and ambiguous.

## Q2 — How DOC-03 names the required tests

### The tests `sleep` actually shipped with (verified, by `ok()` label and file:line)

Grouped by category — this is the shape a recipe reader needs, independent of the collection's name:

**Registry validity (generic — always applicable):**
- `"registry: the shipped COLLECTIONS has no problems"` — `test/app.test.js:1765`.

**Migration correctness (only if the collection needs a non-empty default; `sleep` didn't):**
- `"sleep: migration 18 rewrites no existing row (REG-16 guards not triggered)"` — `:1276`.
- `"sleep: migrations stay idempotent"` — `:1293`.
- `"sleep: _schema never goes down"` — `:1305`.

**Stale-device merge replay (always applicable — this is DOC-03's named example):**
- `"sleep: a deleted night is not resurrected by a stale device (SLEEP-06)"` — `:1343`.
- `"sleep: replaying the stale device again keeps it deleted"` — `:1353`.
- `"sleep: on an exact mtime tie the newer device decides"` — `:1361`.
- `"sleep: a device without any sleep list cannot resurrect or remove"` — `:1371`.

**`validateBackup()` shape checks (always applicable):**
- `"sleep: a damaged sleep section is refused"` — `:1385`.
- `"sleep: an older backup without sleep is accepted"` — `:1393`.

**UI/behavior (only if a UI was written — see §Q1):**
- `"sleep: logging a night stores hours, quality and the trimmed note"` — `:1407`.
- `"sleep: blank or impossible hours are refused"` — `:1421`; `"…quality is clamped to 1–5"` —
  `:1429`; `"…a bad date falls back to today"` — `:1437`.
- `"sleep: the history lists live nights and hides deleted ones"` — `:1443`; `"…the note is escaped"`
  — `:1449`; `"…an empty log shows the empty state"` — `:1454`.
- `"sleep: deleting a night is soft"` — `:1461`; `"…deleting twice is a no-op"` — `:1472`;
  `"…an unknown id changes nothing"` — `:1479`; `"…an id that could break out of the attribute gets
  no delete button"` — `:1486`.
- `"sleep: the router exposes Care → Sleep"` — `:1492`.

**Structural "declaration alone" proof (always applicable — this is the SLEEP-04 pattern):**
- `"SLEEP-04: no derived consumer mentions sleep"` — `:1586`.
- `"SLEEP-04: there is no liveSleep wrapper"` — `:1589`.
- `"SLEEP-04: viewSleep reads through liveOf('sleep')"` — `:1591`.
- `"SLEEP-04: sleep is declared once, as the last entry"` — `:1596`.

### Line-number rot, demonstrated live

`03-CONTEXT.md`'s own `canonical_refs` section (written today, 2026-09-20) cites: `sleepFixture17`
"(~1254)" and "the stale-device merge replay at ~line 435 and ~line 722." This research verified
both:
- `sleepFixture17` is actually **defined at `test/app.test.js:1259`**, not 1254 — already 5 lines
  off at the moment `CONTEXT.md` was written, because Phase 2 inserted content earlier in the file.
- Line **435** is not a `sleep`-specific test at all — it is the generic
  `"sync merge: a stale device can never subtract"` block using `petWeights` fixtures
  (`test/app.test.js:435-448`), part of the 2026-07-25-incident regression suite that predates
  `sleep` entirely. The `sleep`-specific stale-device-replay tests are at `:1343` and `:1353`.
- Line **722** is inside `populatedLegacyDB()`'s definition region (`test/app.test.js:714` onward),
  a fixture helper for the REG-13 differential — not a stale-device replay test itself.

This is exactly the failure mode DOC-03's discretion note warned about, caught in the act: a
concrete line-number pointer written *today*, by an agent with full file access, was already
partially wrong. Any pointer style based on line numbers will rot faster than the recipe review
cycle can catch it, and D-03's structural test (which diffs the `ALLOWED` key set, not doc prose)
cannot detect a wrong line number — it has no way to know what a citation in `CLAUDE.md`'s prose
is supposed to point at.

### Recommendation — naming scheme

Name test **categories** in the `CLAUDE.md` spine (matching the groups above: registry validity,
migration correctness *if applicable*, stale-device merge replay, `validateBackup()` shape,
UI/behavior *if applicable*, the SLEEP-04-style declaration-alone structural proof). In the companion
doc, reference the *exact `ok()` label text* used for `sleep`'s versions of each category (e.g.
`` `"sleep: a deleted night is not resurrected by a stale device (SLEEP-06)"` ``) rather than a line
number — a label is `grep`-able (`grep -n "a deleted night is not resurrected"
test/app.test.js`), survives file reflow, and its own staleness is visible the moment someone
greps and gets zero hits, rather than silently pointing at the wrong line the way a number does.

### DOC-03's structural enforcement test — two concrete assertion shapes

**Shape A — recipe-lists-ALLOWED-keys (recommended, primary):** The companion doc's field-by-field
walkthrough embeds a literal array of the field names it claims are the registry's allowed keys
(mirroring `collectionProblems()`'s actual list). A test extracts that array from the doc (parse the
fenced code block's array literal, e.g. with a regex capturing `` \[.*?\] `` inside a known marker
comment, then `JSON.parse` after quoting keys), and asserts the **sorted, de-duplicated set** equals
`collectionProblems`'s live `ALLOWED` array (`index.html:4009`:
`['kind','key','sortBy','merge','soft','required','explicitFalse','label','columns','format']`).
Cheap, does not require embedding runnable code in the doc, and directly targets D-03's literal
example ("every field the recipe documents matches `collectionProblems()`'s `ALLOWED` key list").

**Shape B — round-trip-via-worked-example (recommended, secondary — for the companion doc's fixture
specifically):** The companion doc's copy-paste "annotated registry entry" block (the one meant for
copy-pasting into `COLLECTIONS`) is extracted by the test and run through the *real*
`collectionProblems()`. If `collectionProblems()` ever grows a new required field the doc's example
doesn't demonstrate, either the extraction fails structurally or `collectionProblems()` returns a
non-empty problem list — both fail the test. This also guards the companion doc's actual copy-paste
value (a stale fixture that fails on paste is worse than no fixture).

Both compare **values** (a key set; a validator's pass/fail verdict), never exact prose — avoiding
the `firestore.rules` mistake `CLAUDE.md` already documents: *"The suite asserts the security
property... never the exact wording — an earlier version pinned the variable name and broke the
moment the file matched reality."*

Additionally recommend a **coverage-completeness** check: every one of `collectionProblems()`'s
`ALLOWED` entries (9 keys, quoted above) is named somewhere in the companion doc's walkthrough, and
every key actually used across the 11 live `COLLECTIONS` entries (see the enumeration below) is a
subset of `ALLOWED` — a set-equality/subset test, immune to reordering or rewording.

## Q3 — The DOC-04 dry run

### Verifying the map-shaped claim against real code

`mobilityLog` and `lawnLog` (`index.html:510-511`) are both:
`{ kind:'map', merge:'replace-whole', soft:false, required:false, explicitFalse:true, ... }`

The comment directly above them (`index.html:508-509`) states the exact hole:
*"mobilityLog / lawnLog: take the WHOLE inner object from the newer side. Do NOT union inner
keys — these encode 'off' as false/absent, and unioning resurrects unchecked boxes forever."*

`collectionProblems()` enforces six map-only validation branches that a list-shaped collection like
`sleep` never exercises at all (`index.html:4028-4035`):
- a map must not declare `key` (`p('a map must not declare key')`)
- a map must not declare `sortBy`
- a map must not declare `soft:true`
- a map must not declare `required:true`
- `explicitFalse` must be declared as a boolean (`p('a map must declare explicitFalse as a
  boolean')`)
- `explicitFalse:true` is allowed **only** with `merge:'replace-whole'`
  (`p('explicitFalse true is allowed only with merge "replace-whole"')`)

`sleep` is `kind:'list'`, so all of Phase 1's dry-run coverage for `sleep` itself only ever exercised
the **list** branches (`index.html:4024-4027`). **CONTEXT.md's claim is confirmed, not
assumed**: a map-shaped dry-run subject is strictly more informative than repeating a list-shaped one.

### A dry run of this exact shape already exists and already passes

`test/harness.js`'s `opts.transform` mechanism (used by the `probe` instance,
`test/app.test.js:1501-1504`) string-replaces `'const COLLECTIONS = {'` with itself plus two new
declaration lines, then boots a **fresh `vm` instance from the mutated source**:

```
const PROBE_LIST_LINE = "  probeList:{ kind:'list', key:'id', sortBy:'date', merge:'union', soft:true, required:false, label:'Probe list', columns:[{field:'date',label:'date'},{field:'value',label:'value',unit:'mass'}] },";
const PROBE_MAP_LINE  = "  probeMap:{ kind:'map', merge:'replace-whole', soft:false, required:false, explicitFalse:true, label:'Probe map', columns:[{field:'date',label:'date'},{field:'item',label:'item'}], format:dayFlagRows },";
const probeTransform = code => code.replace('const COLLECTIONS = {', 'const COLLECTIONS = {\n' + PROBE_LIST_LINE + '\n' + PROBE_MAP_LINE);
const probe = loadApp(APP_PATH, null, { transform: probeTransform });
```
(`test/app.test.js:1501-1504`)

`probeMap` is declared with `merge:'replace-whole'` and `explicitFalse:true` — **exactly** the
CONTEXT.md concern. Tests then prove `blank()`, `liveOf()`, `validateBackup()`, `mergeDB()`, and
`mergeCollections()` all pick up both probes correctly with zero further code
(`test/app.test.js:1506-1579`, 8 checks) — including a map-specific replace-whole/explicit-false
assertion (`:1570-1578`) and the export deriving a section from the probes with no exporter edit
(`:2416-2434`). This block currently runs and passes on every `npm test` invocation (confirmed this
session: `721 passed, 0 failed, 2 skipped`, run 2026-09-20).

This **is** a scratch-branch-style dry run of a map-shaped collection that already runs `npm test`
end to end — it is simply not currently framed as "the recipe's rehearsal," and it never builds a
UI (nobody wrote `viewProbeMap()`), so it cannot exercise the UI half of the recipe identified in §Q1.

### Recommendation

Use **two** complementary dry runs for DOC-04, because no single one covers both halves of the
recipe identified in §Q1 (data layer vs. hand-written UI):

**Dry run A (data layer, permanent, `npm test`-verified) — reuse the probe pattern.** Extend
`test/harness.js`'s `opts.transform` mechanism with a *new* throwaway map-shaped collection name
(distinct from the existing `probeMap`, to avoid colliding with SLEEP-05's assertions — e.g.
`recipeProbeMap`), declared `merge:'replace-whole'`, `explicitFalse:true`, and assert the same
five derived-consumer properties SLEEP-05 already proves. This literally is "a scratch branch that
actually runs `npm test`" — done inside the harness's transform mechanism instead of a real git
branch, which is *better* for a permanent regression check because it costs nothing to keep and
cannot bit-rot the way a discarded branch would.

**Dry run B (UI half, one-time, scratch branch, discarded) — a real candidate collection.** Pick a
plausible next real collection, walk the full recipe by hand on a scratch git branch — add the
`COLLECTIONS` entry, bump `SCHEMA`, add the `MIGRATIONS` line, write the logging/viewing UI, add the
tests named in DOC-03 — run `npm test`, confirm green, then discard the branch (never merge). This is
the only way to test the recipe's UI step (§Q1 step 3), which dry run A structurally cannot reach.

**Concrete candidate for Dry run B: `supplements`** — a map-shaped collection keyed by date
(`{ '2026-09-20': { creatine:true, fishOil:false } }`), `merge:'replace-whole'`, `explicitFalse:true`.
Recommended because: (1) it is map-shaped, exercising the `mobilityLog`-shaped hole per CONTEXT.md's
concern; (2) it is a semantically plausible real future collection (increasing the odds the
walkthrough surfaces a genuine gap in the recipe rather than a contrived one an author already knows
the answer to); (3) its UI is small — a couple of toggle checkboxes, same shape as `mobilityLog`'s
existing view — so the hand-written half of the dry run stays cheap to build and discard.

## DOC-02 — Placement Rule: verbatim wording comparison

DOC-02 requires the module-eval-time placement rule stated **verbatim**. Three different wordings of
this rule exist in the repo today, and none of them currently live in `CLAUDE.md` (this phase is
introducing the rule to `CLAUDE.md` for the first time):

**1. `index.html`'s own comment block (`index.html:479-491`) — the closest to "shipped code truth,"
since it documents the code sitting directly beneath it and is what `collectionProblems()`
enforces at module eval:**
> *"Declared before DB boots via load() a few dozen lines down, after SCHEMA/KEY, before MIGRATIONS;
> every value is a literal or a reference to a hoisted `function` declaration — never a `const`
> arrow, never a forward `const`. `blank()` may read only `kind` at module-eval time (see the
> placement comments on migration 13 and migration 17 above, and the one on `let migrationRan` below
> — this is the same trap). Everything else here (`key`, `sortBy`, `merge`, `label`, `columns`,
> `format`) is read later, by code that runs after boot, never during it."*

A second, independent statement of the `blank()` half of the rule exists right at `blank()`'s own
definition (`index.html:692-694`):
> *"Derived from COLLECTIONS (REG-06): scalars stay hand-written, every list/map field loops the
> registry. blank() runs during `let DB = load()` above, so this loop may read only `spec.kind` —
> `key`/`sortBy`/`merge`/`columns`/`format` are all declared further down and touching them here
> would be the same TDZ trap the placement comments on migrations 13 and 17 describe."*

**2. `REQUIREMENTS.md` REG-02/03/04 (locked, historical spec wording — all three checked complete):**
> REG-02: *"`COLLECTIONS` is declared textually before `let DB = load()`, adjacent to `SCHEMA`/`KEY`
> and before `MIGRATIONS`"*
> REG-03: *"Every value inside `COLLECTIONS` is a literal or a reference to a hoisted `function`
> declaration — never a `const` arrow, never a reference to a `const` declared later"*

**3. `ROADMAP.md` Phase 1 success criterion 1 (a paraphrase combining REG-02/03/04):**
> *"`const COLLECTIONS` is declared textually before `let DB = load()`, adjacent to `SCHEMA`/`KEY`
> and before `MIGRATIONS`; every value inside it is a literal or a reference to a hoisted `function`
> declaration, never a `const` arrow or a forward `const` reference — checkable by reading the file
> top to bottom once (REG-02, REG-03, REG-04)."*

**Discrepancy found:** wording 2/3's *"adjacent to `SCHEMA`/`KEY`"* is looser than the actual file
layout. `SCHEMA` is `index.html:474`, `KEY` is `index.html:473`; `COLLECTIONS`'s comment block starts
at `index.html:479` — but four other `const` declarations (`DEFAULT_HOBBIES`, `HOBBY_SEED_V2`,
`HOBBIES_DEFAULT`, `PRODUCTIVITY_DEFAULT`, `index.html:475-478`) sit textually between them. "Adjacent"
is true only in the sense of "same Storage section, no unrelated code between," not "next line." The
index.html comment's own phrasing — *"after SCHEMA/KEY"* — is the more literally accurate of the two.
`COLLECTIONS`'s validation block ends at `index.html:519`; `MIGRATIONS` begins at `index.html:521` —
"before MIGRATIONS" is confirmed true and tight in both wordings. `let DB = load()` is at
`index.html:686`, well after `COLLECTIONS` (492-519) — "before `let DB = load()`" confirmed.

**Recommendation:** Source the `CLAUDE.md` spine's verbatim quote from the **`index.html` comment
block** (wording 1), not from `REQUIREMENTS.md`/`ROADMAP.md` (wording 2/3), because: (a) it is the
prose actually shipped next to the code it describes, so keeping the two in sync going forward means
touching one place; (b) it is more literally accurate ("after SCHEMA/KEY" vs. the looser "adjacent
to"); (c) it already includes the `blank()`-reads-only-`kind` clause D-02 explicitly requires. The
planner should decide whether to fix "adjacent" → "after" when lifting the phrase, or preserve
`REQUIREMENTS.md`'s wording for continuity with the locked requirement text — this research flags the
choice rather than making it, since it is an editorial call, not a factual one.

## Registry contract — verified enumeration

**`collectionProblems()`'s `ALLOWED` key list, exactly as coded (`index.html:4009`):**
```
['kind','key','sortBy','merge','soft','required','explicitFalse','label','columns','format']
```
(9 items; 10 array entries — `explicitFalse` sits between `required` and `label`.)

**Column-object allowed keys (`index.html:4044`, quoted inline):**
```
k!=='field' && k!=='label' && k!=='unit' && k!=='zeroIsMissing'
```
i.e. a column object may carry only `field`, `label`, `unit`, `zeroIsMissing`.

**Every key actually present on each of the 11 live `COLLECTIONS` entries (`index.html:492-514`,
read this session):**

| Collection | Keys present |
|---|---|
| `sessions` | kind, key, sortBy, merge, soft, required, label, columns, format |
| `weights` | kind, key, sortBy, merge, soft, required, label, columns |
| `petWeights` | kind, key, sortBy, merge, soft, required, label, columns |
| `cardio` | kind, key, merge, soft, required, label, columns *(no `sortBy` — deliberate, see comment `index.html:487-488`)* |
| `ideas` | kind, key, merge, soft, required, label, columns |
| `todos` | kind, key, merge, soft, required, label, columns |
| `hobbyLog` | kind, key, merge, soft, required, label, columns, format |
| `journal` | kind, merge, soft, required, explicitFalse, label, columns, format |
| `mobilityLog` | kind, merge, soft, required, explicitFalse, label, columns, format |
| `lawnLog` | kind, merge, soft, required, explicitFalse, label, columns, format |
| `sleep` | kind, key, sortBy, merge, soft, required, label, columns *(no `format` — "sleep rows are already flat," comment `index.html:512-513`)* |

Every key used across all 11 entries is a subset of the 9-entry `ALLOWED` list above — no entry uses
a field `collectionProblems()` doesn't recognize (expected; the suite would already be red
otherwise). Also confirmed: `collectionProblems()` enforces registry-wide label uniqueness
(`index.html:4065-4075`) — two collections may never share a `label`, since it becomes the export's
`## ` heading. This is a fact the recipe should name (a copy-pasted `sleep`-shaped entry with an
un-renamed `label:'Sleep'` would be silently refused, not silently merged).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| A second "which fields are the registry allowed to use" list, hand-maintained in prose | A bespoke bullet list in `CLAUDE.md`/the companion doc with no link back to code | Extract the field list from `collectionProblems()`'s live `ALLOWED` array (Shape A/B, §Q2) | A hand-copied list is exactly the kind of "rule nothing enforces" this phase exists to prevent (D-03 rationale, Migration 15 precedent) |
| A separate "how do I prove a new collection needs no edits" mechanism | A brand-new fixture/harness feature for the recipe's dry run | `test/harness.js`'s existing `opts.transform` probe-injection pattern (already proven, SLEEP-05) | Already built, already tested, already covers list- and map-shaped collections; reinventing it risks a second, subtly different mechanism drifting from the one Phase 1 validated |

**Key insight:** every piece of infrastructure this phase needs to point at — the `ALLOWED` list, the
probe-injection dry-run mechanism, the `SCHEMA`/`MIGRATIONS` convention — already exists and is
already tested. The phase's job is to *document and structurally pin* these, not to build anything
new in `index.html`.

## Common Pitfalls

### Pitfall 1: Recipe drifts from a registry change nobody re-read the docs for
**What goes wrong:** A future collection changes `collectionProblems()`'s `ALLOWED` list (adds a
field), and the recipe's field walkthrough silently stops matching reality — the exact "rule nothing
enforces" failure mode named in D-03's rationale (Migration 15, `mobilityLog`).
**Why it happens:** Prose documentation has no dependency edge back to the code it describes.
**How to avoid:** D-03's structural test (Shape A/B, §Q2) — a value diff, not a wording match.
**Warning signs:** A registry PR that touches `ALLOWED` or adds a `COLLECTIONS` field with no
corresponding `npm test` failure means the enforcement test isn't wired correctly.

### Pitfall 2: A concrete fixture-name/line-number pointer rots faster than the recipe is reviewed
**What goes wrong:** DOC-03's tests are named by exact line number in `CLAUDE.md`/companion doc; the
file reflows (as it did between this research session's writing and `CONTEXT.md`'s own citations,
already stale by 5+ lines and pointing at the wrong test category); the recipe now sends a reader to
the wrong code.
**Why it happens:** Line numbers have no structural tie to the content they describe; nothing greps
or diffs them.
**How to avoid:** Name tests by their `ok()` label substring, or by category, never by line number
(§Q2 recommendation).
**Warning signs:** `grep -n "<quoted label fragment>" test/app.test.js` returning zero hits — this is
itself a cheap, if manual, staleness check a reviewer can run before merging a recipe edit.

### Pitfall 3: A dry-run subject that repeats `sleep`'s shape proves nothing new
**What goes wrong:** DOC-04's dry run picks another list-shaped collection (e.g. a second workout
metric), which only exercises the same `collectionProblems()` branches `sleep` already covers,
missing the map-specific validation entirely (`explicitFalse`, `replace-whole`).
**Why it happens:** List-shaped is the more common/obvious collection shape, and reusing `sleep`'s
pattern feels safe.
**How to avoid:** Pick a map-shaped candidate (§Q3 recommendation — `supplements`), which is the only
shape that exercises the `mobilityLog`/`lawnLog` merge trap `collectionProblems()` guards against.
**Warning signs:** A dry-run walkthrough that never triggers any of the six map-only
`collectionProblems()` branches (`index.html:4028-4035`) has not actually tested the part of the
recipe most likely to be gotten wrong.

## Runtime State Inventory

Not applicable — this phase renames/refactors nothing and adds no collection. Explicitly checked
against all five categories:

| Category | Finding |
|----------|---------|
| Stored data | None — no `COLLECTIONS` entry is added, removed, or renamed this phase |
| Live service config | None — no `n8n`/Firestore/Datadog-style external config touched |
| OS-registered state | None — no scheduler/service registration involved |
| Secrets/env vars | None — no keys added, removed, or renamed |
| Build artifacts | None — no build step exists in this project; `docs/` is a plain new folder, not a build output |

CONTEXT.md's Phase Boundary states this directly: *"This is a documentation phase. It changes no app
behaviour and adds no collection. The only production-code change it may make is to the test
suite."* Confirmed consistent with everything read this session — every code citation above is either
already-shipped Phase 1/2 code, or a pointer to where D-03's new enforcement test would live
(`test/app.test.js`).

## Package Legitimacy Audit

Not applicable — this phase installs no packages. `package.json` (read this session) declares zero
dependencies (`"scripts": {"test": "node test/app.test.js"}` only); the project's own constraint
("no build step, no dependencies") rules out any new install.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node.js native, custom harness (no external test runner) |
| Config file | none — `test/harness.js` is the harness, `test/app.test.js` is the suite |
| Quick run command | `npm test` (currently 721 passed, 0 failed, 2 skipped — confirmed this session, 2026-09-20) |
| Full suite command | `npm test` (same — this repo has one suite, no split unit/integration invocation) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DOC-01 | `CLAUDE.md` contains a numbered recipe against the shipped `COLLECTIONS` shape | manual/structural | none automatable for prose content itself; DOC-03's enforcement test partially covers it by proving the recipe's *field claims* match the registry | ❌ Wave 0 — new test needed |
| DOC-02 | The placement rule is stated verbatim; the value-shape rule is stated | human-judgment (verbatim text match is a human/reviewer check — a test cannot assert prose equals prose without the exact-wording trap D-03 forbids) | none — reviewed by a human against `index.html`'s comment block at merge time | n/a — not test-automatable by design |
| DOC-03 | The recipe names the tests a new collection must ship with | structural (registry-field coverage), human-judgment (are the *categories* actually named in the doc) | `npm test` for the field-coverage half (Shape A/B, §Q2); manual review for the category-naming half | ❌ Wave 0 — new test needed for Shape A/B |
| DOC-04 | The recipe is verified end to end for a non-`sleep` collection | structural (Dry run A, permanent) + manual/one-time (Dry run B, scratch branch, discarded — cannot be "automated" by definition, since it is deliberately never merged) | `npm test` for Dry run A; a one-time `checkpoint:human-verify`-style manual walkthrough for Dry run B | ❌ Wave 0 for Dry run A's probe extension; Dry run B is inherently a manual, non-committed exercise |

**Honest statement on what a test can and cannot prove for DOC-04:** A test can prove the *data
layer* claim exhaustively — "every derived consumer picks up a map-shaped collection from its
declaration alone" is exactly what Dry run A / SLEEP-05's existing pattern machine-verifies, with no
human judgment involved. A test **cannot** prove "the recipe, read cold by someone who didn't write
it, produces the correct result with no step missing, wrong, or requiring outside knowledge" — that
is inherently a human-comprehension claim about prose. The best available proxy is Dry run B: a human
(ideally not the recipe's author) follows the written steps literally, on a scratch branch, and
records where they got stuck or had to guess. `npm test` passing at the end of Dry run B is necessary
but not sufficient evidence for DOC-04 — it confirms the *resulting code* is correct, not that the
*recipe text* was the thing that got the human there without outside knowledge. Recommend the planner
capture Dry run B as a `checkpoint:human-verify` task with an explicit prompt: "follow only what's
written in `CLAUDE.md` + `docs/adding-a-collection.md`; note every place you had to guess or look at
`index.html` directly."

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test` (same suite; no separate full-suite invocation exists in this repo)
- **Phase gate:** Full suite green before `/gsd-verify-work`, per `CLAUDE.md`'s "Before every push"
  rule.

### Wave 0 Gaps
- [ ] A new `test/app.test.js` block asserting DOC-03's Shape A and/or Shape B (docs-match-registry
      field coverage) — does not exist yet; this is D-03's core deliverable.
- [ ] A `test/harness.js`/`test/app.test.js` extension for Dry run A (a new map-shaped probe name,
      e.g. `recipeProbeMap`, distinct from the existing `probeMap`) if the planner adopts the §Q3
      recommendation to keep a permanent probe-based dry run alongside the one-time scratch-branch
      walkthrough.
- [ ] No framework install needed — `node test/app.test.js` already runs with zero setup.

## Security Domain

`security_enforcement: true`, `security_asvs_level: 1` (`.planning/config.json`, read this session).
This phase is documentation-plus-test-only and adds no new input surface, auth flow, or session
handling — most ASVS categories are not newly triggered. The one category worth naming explicitly is
input validation/output encoding, because the recipe's UI-writing step (§Q1) will, by design, point a
future author at adding a new form (as `sleep`'s did) and a new inline delete handler.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Phase touches no auth code |
| V3 Session Management | No | Phase touches no session code |
| V4 Access Control | No | Phase touches no `firestore.rules` or access logic |
| V5 Input Validation / Output Encoding | Yes (indirectly, via the UI step the recipe points to) | Existing `esc()` convention, plus the safe-id gate pattern `sleep`'s `viewSleep()` established (`/^[A-Za-z0-9_-]+$/` before rendering an inline `onclick="removeX('...')"` handler) — the recipe/companion doc should repeat this pattern explicitly, since `esc()` does **not** escape `'` (`CLAUDE.md` § Conventions) and a naively-copied delete button is the most likely place a future collection reintroduces that hole |
| V6 Cryptography | No | Not touched |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| A copy-pasted inline `onclick="removeX('${id}')"` handler with an unescaped id breaking out of the attribute | Tampering | The safe-id gate `sleep` already established: render the delete button only when `id` matches `/^[A-Za-z0-9_-]+$/` (`index.html:3872`, tested at `test/app.test.js:1486`) — the companion doc's worked example should carry this pattern forward explicitly, not leave a future author to rediscover it |
| A recipe reader copying `sleep`'s registry entry verbatim, including `label:'Sleep'` | n/a (data-integrity, not a STRIDE security threat, but adjacent) | `collectionProblems()`'s label-uniqueness check (`index.html:4065-4075`) already refuses this loudly at boot — worth naming in the recipe so a reader understands *why* their new collection throws instead of silently merging into Sleep's section |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The specific candidate collection "supplements" (date→{creatine,fishOil} map) is a *plausible* real future collection, not just a contrived test subject | §Q3 recommendation | Low — this is offered as one concrete example satisfying DOC-04's "a collection that is not `sleep`" requirement; the planner or Ian may substitute any other map-shaped idea without weakening the research's core finding (map-shaped > list-shaped for this dry run) |
| A2 | The planner will choose to source DOC-02's verbatim quote from `index.html`'s comment block rather than `REQUIREMENTS.md`/`ROADMAP.md`'s wording | §DOC-02 Placement Rule | Low-medium — this is flagged as an editorial recommendation, not asserted as the only correct choice; if the planner instead preserves `REQUIREMENTS.md`'s wording for traceability continuity, the "adjacent to SCHEMA/KEY" imprecision should still be corrected or explicitly accepted as a known looseness |
| A3 | Extending `test/harness.js`'s `opts.transform` mechanism with a second, differently-named map probe (Dry run A) will not collide with or weaken SLEEP-05's existing assertions | §Q3 Dry run A | Low — the transform mechanism is a simple string-replace; a second injected collection with a distinct name is additive, but this was not implemented or executed this session, only reasoned about from reading the existing pattern |

**If this table is empty:** N/A — three low-risk assumptions logged above; none touch data
integrity, security, or a locked decision.

## Open Questions

1. **Should Dry run B's scratch branch ever be committed as a permanent fixture, or strictly
   discarded?**
   - What we know: CONTEXT.md's discretion note allows either "on paper or on a scratch branch that
     actually runs `npm test`." D-04 (ROADMAP) requires "no step missing, wrong, or requiring outside
     knowledge" be demonstrated.
   - What's unclear: whether Ian wants the scratch-branch artifact (diff, commit log) referenced from
     `docs/adding-a-collection.md` as evidence the recipe was actually rehearsed, or whether a
     narrative summary in the phase's VERIFICATION.md suffices.
   - Recommendation: the planner should treat this as a `checkpoint:human-verify` gate with Ian,
     since it is a documentation-completeness judgment call, not a technical one.

2. **Does the companion doc's copy-paste fixture (Shape B, §Q2) need to be kept in a fenced code
   block parseable by a Node script, or is manual review of Shape A's field-set diff sufficient
   enforcement on its own?**
   - What we know: Shape A alone satisfies D-03's literal example ("every field the recipe documents
     matches `ALLOWED`"). Shape B adds a nice-to-have guarantee (the doc's paste-able fixture itself
     never silently breaks) but requires the doc to hold machine-parseable code, which is a stronger
     constraint on how the companion doc is written.
   - What's unclear: whether that constraint is worth the coupling, given D-01's whole rationale for
     splitting `CLAUDE.md` from the companion doc was to keep the spine light — Shape B reintroduces
     some of that coupling into the companion doc.
   - Recommendation: planner's discretion; this research recommends Shape A as sufficient on its own
     for satisfying D-03's letter, with Shape B as an optional strengthening.

## Sources

### Primary (HIGH confidence — code and tests read directly this session)
- `index.html:472-573` — `COLLECTIONS` declaration, placement comment, `MIGRATIONS`, `ensureCollectionDefaults`
- `index.html:686-729` — `let DB = load()`, `blank()`, `liveOf()`
- `index.html:3382-3470` — `exportRows()`, `buildMarkdownExport()`, `downloadMarkdown()`, `exportShareFailed()`
- `index.html:3844-3889` — `sleepUid()`, `addSleep()`, `removeSleep()`, `viewSleep()`
- `index.html:3925-3932` — hoisted key/sort function declarations (`sessKey`, `cardioKey`, etc.)
- `index.html:3938-3975` — `sessionRows`, `hobbyRows`, `journalRows`, `dayFlagRows` (format functions)
- `index.html:4004-4088` — `collectionProblems()` in full
- `test/app.test.js:435-472` — the 2026-07-25 stale-device regression block
- `test/app.test.js:1254-1600` — the full `sleep`/SLEEP-01..06 test blocks
- `test/app.test.js:1765-1922` — registry-contract refusal tests
- `test/app.test.js:2143-2172` — `populatedDB()`, including its `sleep` rows
- `test/app.test.js:2416-2434` — the probe-collection export proof (EXP-02)
- `.planning/phases/01-f1-the-collections-registry/01-05-SUMMARY.md` — full `sleep` shipping record
- `CLAUDE.md` — read in full this session; Schema/Escaping/firestore.rules convention bullets quoted verbatim above
- `.planning/config.json` — `nyquist_validation: true`, `security_enforcement: true`, `security_asvs_level: 1`
- `package.json` — confirms zero dependencies, `npm test` → `node test/app.test.js`
- Live `npm test` run, 2026-09-20 — 721 passed, 0 failed, 2 skipped

### Secondary (MEDIUM confidence)
- None — no external web sources were needed; this phase has no new library or ecosystem dependency.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Recipe scope (Q1): HIGH — every claimed edit traced to a specific `index.html`/test line this session
- Test naming (Q2): HIGH — the rot claim is demonstrated live against `CONTEXT.md`'s own citations, not hypothesized
- Dry-run design (Q3): HIGH — the recommended mechanism (probe transform) is existing, shipped, passing code, not a new proposal
- DOC-02 verbatim wording: MEDIUM — three existing wordings are quoted exactly, but which one becomes canonical is an editorial call left to the planner/Ian, not a fact this research can settle

**Research date:** 2026-09-20
**Valid until:** Next `COLLECTIONS` or `collectionProblems()` change (this research is tied to a
specific code snapshot; any Phase 4-7 work that touches the registry, or any hand-edit to
`index.html` before this phase executes, should trigger a re-check of the line numbers and `ALLOWED`
list quoted above before the recipe is written).

---
*Phase: 03-f3-adding-a-new-tracked-thing-recipe*
*Research completed: 2026-09-20*
