# Phase 1: F1 — The COLLECTIONS Registry - Research

**Researched:** 2026-09-11
**Domain:** Single-file, no-build, offline-first PWA — declarative data-layer registry over a union-merge Firestore sync engine (JS language mechanics: TDZ/hoisting, no new libraries)
**Confidence:** HIGH — every claim in this document is either read directly from `index.html`/`CLAUDE.md`/`test/*.js` in this session, or carried from the project-level research already committed at `.planning/research/{SUMMARY,ARCHITECTURE,PITFALLS}.md` (2026-09-10), which was itself grounded in direct code reads. No external search providers were consulted: `.planning/config.json` has `exa_search`, `brave_search`, `firecrawl`, `tavily_search`, `ref_search`, `perplexity`, and `jina` all `false`, and this phase introduces zero external packages and touches no framework/library whose docs would need lookup — it is pure vanilla-JS refactoring of code already in this repo.

<user_constraints>
## User Constraints

No `CONTEXT.md` exists for this phase (discuss-phase was skipped by design). The orchestrator supplied the following as locked decisions for this planning run — treat exactly as CONTEXT.md `## Decisions` would be treated:

### Locked Decisions
- Sleep fields are settled: `{id, date, hours, quality, note}`, `quality` an integer 1–5, declared `{ kind:'list', key:'id', soft:true, sortBy:'date' }`.
- No UI-SPEC (`--skip-ui`). Sleep UI must reuse existing markup/CSS patterns, `esc()` escaping, and the icon/theme rules from `CLAUDE.md`.
- A SCHEMA bump is permitted, but any row rewrite must satisfy all four REG-16 guards (`touch()`, persist immediately, idempotent, never downgrade `_schema`, ships with a stale-device merge replay test).

### Claude's Discretion
- Which tab/sub-tab `sleep` lives on, and how hours/quality/note are entered — "follow the app's existing log screens." Research below identifies the closest existing pattern and a placement recommendation with evidence; the planner makes the final call.
- Navigation must not be invented from scratch — extend an existing tab's `sub` array or an existing sub-view family, don't add new top-level nav concepts. (This is this phase's application of `PROJECT.md`'s "Navigation or layout changes" Out-of-Scope item, not a contradiction of it — see the Architecture Patterns section.)

### Deferred Ideas (OUT OF SCOPE)
- Everything in `PROJECT.md`'s Out of Scope table applies unchanged: rewriting/removing sync, deleting/trimming features, localStorage capacity work, auth provider switching, navigation/layout redesign, splitting `index.html`, App Check.
- Explicitly-rejected sleep features (from `PROJECT.md`/`REQUIREMENTS.md` v2/Out-of-Scope): sensor-style sleep fields, separate bedtime/waketime, disruption tag pickers, sleep reminders, in-app correlation charts.
- Field-level validators inside `COLLECTIONS` (a validation DSL) — rejected by both prior research docs; per-row deep checks stay hand-written in `validateBackup()`.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REG-01 | `COLLECTIONS` declares kind/key/sort/merge/soft per collection | Registry Shape section; per-collection oracle table |
| REG-02 | Declared before `let DB = load()`, adjacent to `SCHEMA`/`KEY`, before `MIGRATIONS` | TDZ Placement Contract — exact line target given |
| REG-03 | Every value a literal or hoisted `function` reference, never a `const` arrow/forward `const` | TDZ Placement Contract; Code Examples |
| REG-04 | `sessKey`/`todoKey`/`hobbyKey` + inline cardio/ideas key arrows promoted to `function` declarations | Exact line numbers and current source given below |
| REG-05 | `merge` required, no inferred default; map collection omitting it fails loudly | Per-collection oracle table; Pitfall 2 (project research) |
| REG-06 | `blank()` derived, correct shape per declared collection | Derived Consumers section |
| REG-07 | `liveX()` filters derived from `COLLECTIONS` | Derived Consumers section |
| REG-08 | `validateBackup()` shape checks derived, strict parity with hand-written version | Registry Shape boundary table; Pitfall 11 |
| REG-09 | `mergeDB()` per-collection merging derived | Derived Consumers section; migration-order table |
| REG-10 | `gen`-mismatch short-circuit stays a hard early return, untouched by the derived loop | mergeDB() read at index.html:3644-3658, quoted below |
| REG-11 | `MIGRATIONS` stays hand-written; may read `COLLECTIONS` one-way | Anti-Patterns: Deriving MIGRATIONS |
| REG-12 | Each consumer replaced in its own commit, cheapest-first, `mergeDB()` last, shippable at every commit | Suggested Build Order / migration-order table |
| REG-13 | Legacy functions renamed and differential-tested against a real backup + per-incident synthetic fixtures before deletion | Test Fixture Gap section — **no real backup exists in-repo, flagged, not fabricated** |
| REG-14 | Renamed legacy deleted only in a later commit | migration-order table, Step 5 |
| REG-15 | Boot-order regression test, schema 1→17, every declared collection correct shape after boot | Verification section; harness.js `loadApp()` seeding mechanism |
| REG-16 | Any row rewrite: `touch()`, persist immediately, idempotent, never downgrade `_schema`, ships with stale-device merge replay test | Migration Go/No-Go Decision section — **answered: no rewrite required for F1** |
| REG-17 | `COLLECTIONS` carries column/format metadata the Phase 2 export needs | Extension Points: columns/format field |
| SLEEP-01 | `sleep` added as `{kind:'list', key:'id', soft:true, sortBy:'date'}` | Per-collection oracle table (new 11th row) |
| SLEEP-02 | Log hours, 1–5 quality, optional note | UI Placement Recommendation section |
| SLEEP-03 | See sleep as a dated series, can delete an entry | UI Placement Recommendation section |
| SLEEP-04 | Adding `sleep` touches only `COLLECTIONS` + its view — no edits to `blank()`/`mergeDB()`/`liveX()` family/`validateBackup()`/exporter | Hard-Coded Collection List Audit — every other list enumerated and cleared |
| SLEEP-05 | A test asserts SLEEP-04 | Verification section |
| SLEEP-06 | A deleted sleep entry survives a stale-device merge replay | Per-collection oracle table; Pitfall 1/4 test pattern |
</phase_requirements>

## Summary

F1's code-shape work is already fully specified by the project-level research committed yesterday (`ARCHITECTURE.md`, `PITFALLS.md`, `SUMMARY.md` — 2026-09-10). This document does not re-derive that; it verifies the specific line numbers and source text those documents cite still match the current file (they do, within a line or two), builds the concrete per-collection oracle table the differential tests need, and answers the four open items the orchestrator specifically asked for: the exact TDZ insertion point and promotion list, the state of the test-fixture infrastructure (a real exported backup does **not** exist in this repo and must not be fabricated), the full hard-coded-collection-list audit that SLEEP-04 depends on, and a concrete, evidence-based UI-placement recommendation for the `sleep` view.

**The single biggest planning risk this research surfaces:** `test/harness.js` exports a fixed, hand-maintained array of names (`loadApp()`'s `names` list, lines 97–114) from the vm sandbox to the test file. Any new function the plan introduces — `COLLECTIONS` itself, `liveOf()`, `mergeCollections()`, `mergeDB_v0`/`blank_v0` (the renamed legacy functions REG-13 requires), `sortBy` helpers, `sessionSort`, the promoted `cardioKey`/`ideaKey`, and every new sleep function (`viewSleep`, `logSleep`, `removeSleep`) — **will silently come back `undefined` to every test that references it** unless its name is added to that array first. This is not called out anywhere in the prior research and is an easy way to ship a phase where `npm test` is green because the assertions that would have caught a regression never actually ran (they'd throw on `undefined is not a function` — but only if someone writes the test; a differential test that *only* checks equality between two `undefined`s would silently "pass"). The plan must include, as an explicit step in the same commit as each new function, adding its name to `harness.js`'s export list.

**Primary recommendation:** Follow the strangler-fig, cheapest-first, five/six-commit migration order already laid out in `ARCHITECTURE.md`'s "Incremental Migration" table (`COLLECTIONS` as dead data → `blank()` → `liveX()` → `validateBackup()` shape prologue → `mergeCollections()` side-by-side with a renamed `mergeDB_legacy` → delete). Before writing `mergeDB` differential tests, get Ian to export a real backup via the app's existing **Export backup** button and drop a scrubbed copy at `test/fixtures/real-db-snapshot.json` — this fixture does not currently exist and the plan must not proceed to REG-13's differential-testing step by fabricating one.

## Architectural Responsibility Map

This phase is entirely inside one architectural tier — there is no client/server split in this app.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Collection shape/merge/sort/soft-delete rules | Database/Storage (logical layer, physically colocated in the single-file client) | — | `COLLECTIONS` is a data-layer declaration; there is no separate backend — `index.html`'s data layer *is* the persistence/merge tier, running client-side against `localStorage` and, via Firestore transactions, the sync tier |
| Sleep logging UI (form + list) | Browser/Client | — | Pure DOM rendering inside the existing single-page app; no SSR, no separate API |
| Sync/merge orchestration (`mergeDB`, `runTransaction`) | Database/Storage | Browser/Client (initiates the transaction) | Firestore transaction runs against the client SDK but the merge *logic* (`mergeDB`) is the data layer's responsibility, reused identically for local-only and synced state |
| Backup import/export shape validation | Database/Storage | Browser/Client (file picker, `FileReader`) | `validateBackup()` is data-layer business logic; the file I/O around it is a thin client concern |

No misassignment risk here — the entire phase lives in one file with no tier boundary to get wrong. This section is included per protocol but there is nothing for the planner to sanity-check against a tier boundary that doesn't exist in this app.

## Standard Stack

No new libraries. This phase is a pure refactor of existing vanilla JS. `CLAUDE.md` and `PROJECT.md` both forbid adding a dependency (`index.html` is the whole app, zero dependencies, no build step) and no researcher — in this session or the 2026-09-10 pass — found a reason to challenge that.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| — none — | — | — | Zero-dependency constraint is a hard project rule (`CLAUDE.md:3-4`, `PROJECT.md` Constraints), unchanged by this phase |

### Package Legitimacy Audit

**Not applicable.** `package.json` [VERIFIED: package.json:1-8] declares no `dependencies` or `devDependencies` at all — only a `test` script (`node test/app.test.js`). This phase introduces zero npm packages. The Package Legitimacy Gate does not apply.

## Registry Shape — the per-collection oracle table

This is the table the differential tests (REG-13) and the derivation itself (REG-01/05/06/07/08/09) are built against. Every cell is read directly from `index.html` this session; line numbers are current as of this repo's `planning/milestone-collections` branch HEAD.

| Collection | kind | key (current) | sortBy (post-merge invariant?) | soft-delete | merge strategy | Notes / hazards |
|---|---|---|---|---|---|---|
| `sessions` | list | `sessKey` [VERIFIED: index.html:3618] — `const sessKey = s => s.id \|\| ('c_'+(s.date\|\|'')+'\|'+(s.workout\|\|'')+'\|'+(s.endedAt\|\|'')+'\|'+(s.skipped?'1':'0'));` | **Yes** — two-field composite: `out.sessions.sort((a,b)=> a.date===b.date ? ((a.endedAt\|\|0)-(b.endedAt\|\|0)) : String(a.date).localeCompare(String(b.date)));` [VERIFIED: index.html:3690] | Yes — `liveSessions()` [VERIFIED: index.html:653] `function liveSessions(){ return (DB.sessions\|\|[]).filter(isLive); }` | union-by-key, `mergeUnion(r.sessions, l.sessions, sessKey, localNewer)` [VERIFIED: index.html:3664] | `sortBy` needs a hoisted **function** reference (`sessionSort`), not a string — no single field name captures the tiebreak. `key` needs a function reference too (composite fallback for pre-`id` rows, migration 12). |
| `weights` | list | `w=>w.date` inline [VERIFIED: index.html:3665] — `out.weights = mergeUnion(r.weights, l.weights, w=>w.date, localNewer);` | **Yes** — `out.weights.sort((a,b)=>String(a.date).localeCompare(String(b.date)));` [VERIFIED: index.html:3688] | Yes — `liveWeights()` [VERIFIED: index.html:654] | union-by-key, one row per date | `key:'date'` string form is sufficient — every row is keyed by its own `date` field, no composite needed |
| `petWeights` | list | `w=>w.date` inline [VERIFIED: index.html:3666] | **Yes** — `out.petWeights.sort(...)` [VERIFIED: index.html:3689] | Yes — `livePetWeights()` [VERIFIED: index.html:655] | union-by-key, same rule as weights | Structurally identical to `weights` — `key:'date'` string form |
| `cardio` | list | inline arrow [VERIFIED: index.html:3667] — `c=>c.id \|\| ((c.date\|\|'')+'\|'+(c.type\|\|'')+'\|'+(c.minutes\|\|''))` | **No** — no `.sort()` call on `out.cardio` anywhere in `mergeDB` (confirmed by reading index.html:3644-3695 in full); view-time sort only, in `viewCardio()` (`list.slice().sort(...)`) | Yes — `liveCardio()` [VERIFIED: index.html:656] | union-by-key | Needs promotion to a named `function cardioKey(c){...}` per REG-04. **`sortBy` must be left undeclared** (or explicitly `null`) — declaring one would introduce a merge-time sort invariant this collection has never had, changing storage order (not user-visible today only because every read path re-sorts, but a behavior change nonetheless and out of scope for a "derive, don't change" refactor) |
| `ideas` | list | inline arrow [VERIFIED: index.html:3668] — `i=>i.id \|\| ((i.date\|\|'')+'\|'+(i.text\|\|''))` | **No** — same as `cardio`, no merge-time sort | Yes — `liveIdeas()` [VERIFIED: index.html:657] | union-by-key | Promote to `function ideaKey(i){...}`. Same "leave sortBy undeclared" caution as cardio |
| `todos` | list | `todoKey` [VERIFIED: index.html:3619] — `const todoKey = t => (t.created\|\|'')+'\|'+(t.text\|\|'');` | **No** | Yes — `liveTodos()` [VERIFIED: index.html:658]. Note: `removeTodo()`/`doneTodo()` set `deletedAt`/`touch()` directly on the object returned by `liveTodos()[i]` rather than via the `softDelete(arr,pred)` helper [VERIFIED: index.html:1274-1275], but the effect (and the field written) is identical | union-by-key | `todos` rows carry **no `id` field** — `todoKey` is the only identity; must be promoted to a `function` declaration |
| `hobbyLog` | list | `hobbyKey` [VERIFIED: index.html:3620] — `const hobbyKey = h => (h.date\|\|'')+'\|'+(h.item\|\|h.hobby\|\|'')+'\|'+(h.cat\|\|'');` | **No** | Yes — `liveHobbyLog()` [VERIFIED: index.html:659] | union-by-key | Promote to `function` declaration |
| `journal` | map (date-keyed) | n/a (map key is the ISO date string itself) | n/a | n/a — maps don't soft-delete; a day's value is either present or absent, no `deletedAt` concept | **line-union** — `mergeJournalEntry(a,b,bN)` [VERIFIED: index.html:3621-3630], called via `out.journal = mergeDateMap(r.journal, l.journal, localNewer, (a,b,bN)=>mergeJournalEntry(a,b,bN));` [VERIFIED: index.html:3672] | Custom per-line-dedup merge, not whole-value or key-union. This is the one map collection whose merge is genuinely a bespoke function — matches ARCHITECTURE.md's `'line-union'` strategy |
| `mobilityLog` | map (date-keyed) | n/a | n/a | n/a | **replace-whole** (newer-wins whole inner object) — `out.mobilityLog = mergeDateMap(r.mobilityLog, l.mobilityLog, localNewer, null);` [VERIFIED: index.html:3675] | `explicitFalse` semantics: `toggleMobility()` writes `m[name] = !m[name];` [VERIFIED: index.html:2650] — always an explicit boolean, key is **never deleted**. This is the exact incident CLAUDE.md warns about; the write-side discipline already exists, `COLLECTIONS` must not weaken it |
| `lawnLog` | map (date-keyed) | n/a | n/a | n/a | **replace-whole** — `out.lawnLog = mergeDateMap(r.lawnLog, l.lawnLog, localNewer, null);` [VERIFIED: index.html:3676] | `explicitFalse` confirmed at the write site: `setLawnLog()` — `e[action] = !!on;` plus the comment `// keep the (possibly all-false) entry rather than deleting it — see toggleMobility on why absence is unsafe for sync` [VERIFIED: index.html:3041-3047] |
| `sleep` (new, SLEEP-01) | list | `'id'` (string form — sleep rows will always have an `id`, no legacy composite-fallback need) | **Yes** — `sortBy:'date'` per the locked decision | Yes | union-by-key | Structurally identical to `weights`/`petWeights` in every respect except having a real `id` field like `cardio`/`ideas`. This is exactly why `PROJECT.md` picked it as the acceptance test — it exercises every mechanism (`sortBy` invariant AND soft-delete AND `id`-based union) in one declaration |

**`gen`-mismatch short-circuit, verified verbatim (REG-10):**
```js
// index.html:3644-3658, read this session
function mergeDB(remote, local, localWins){
  const r = remote && typeof remote==='object' ? remote : {};
  const l = local  && typeof local==='object'  ? local  : {};
  const rG = +r.gen || 0, lG = +l.gen || 0;
  if(rG !== lG){
    const win = Object.assign({}, blank(), lG > rG ? l : r);
    win.gen = Math.max(rG, lG);
    win.updatedAt = Math.max(+r.updatedAt||0, +l.updatedAt||0);
    win._schema = Math.max(+r._schema||0, +l._schema||0, SCHEMA);
    delete win.wx;
    return win;
  }
  // ... per-collection merging begins only below this line
```
This is a hard `return` that exits the function entirely before any collection-specific code runs. REG-10 requires this stay textually identical — the derived `mergeCollections()` loop must be called *after* this block, never merged into it, never made reachable from inside the `if(rG!==lG)` branch.

## The TDZ / module-eval-time placement contract (verified this session)

This is stated fully in `ARCHITECTURE.md` (2026-09-10); this session re-read the source lines it cites and confirms they are unchanged.

**Exact insertion point for `const COLLECTIONS = {...}`:** immediately after `PRODUCTIVITY_DEFAULT` and before the `MIGRATIONS` comment/declaration:
```
478  const PRODUCTIVITY_DEFAULT = [...];
     ← COLLECTIONS goes HERE, before this next line:
479  /* Ordered schema migrations. Each takes the data object up one version. Must be idempotent. */
480  const MIGRATIONS = {
```
[VERIFIED: index.html:478-480]. This is textually before `let DB = load()` at [VERIFIED: index.html:635], satisfying REG-02 ("adjacent to SCHEMA/KEY... before MIGRATIONS" — `KEY`/`SCHEMA` are at [VERIFIED: index.html:473-474]).

**Why the ordering matters, verified verbatim from the file's own comments:**

Migration 13's comment (governs the same hazard COLLECTIONS must avoid):
```
/* Generation counter for wholesale replace (Erase all data / Import→Replace). Keep this a PURE
   literal: MIGRATIONS runs during `let DB = load()` far above the merge-key consts, and a TDZ
   ReferenceError here would be swallowed by the silent catch below while _schema still advances,
   permanently skipping the migration. */
```
[VERIFIED: index.html:503-506, quoted verbatim]

Migration 17's comment (the safe-forward-reference precedent):
```
/* Migration 17: build the exercise registry and stamp every logged row with an identity.
   Deliberately reads only PROGRAM — `ACCESSORIES` is declared far below and this runs during
   `let DB = load()`, so touching it would throw a TDZ ReferenceError straight into the silent
   catch in normalize(), skipping the migration while `_schema` advanced anyway (the trap the
   comment on migration 13 describes). Everything else is discovered from the data itself. */
```
[VERIFIED: index.html:528-532, quoted verbatim] — `buildExerciseRegistry` is declared as `function buildExerciseRegistry(d){...}` at [VERIFIED: index.html:533], a `function` declaration referenced from inside `MIGRATIONS` (a `const` at line 480) despite appearing textually *after* it — this is exactly the hoisting guarantee `COLLECTIONS`'s function-reference values must rely on.

The `migrationRan`/`SNAP_KEY` sibling trap (why `blank()` must only read `spec.kind` at eval time, nothing more):
```
/* `migrationRan` is consumed at the very bottom of this script, not here: save() reaches
   maybeDailySnapshot() → snapshotNow() → SNAP_KEY, a const declared further down, so calling it at
   this point dies on a temporal-dead-zone ReferenceError and takes the whole boot with it. Same
   family of trap as the MIGRATIONS comment above. */
```
[VERIFIED: index.html:636-639, quoted verbatim] — `let migrationRan = false;` at [VERIFIED: index.html:634], `let DB = load();` at [VERIFIED: index.html:635], `SNAP_KEY` declared at [VERIFIED: index.html:680].

**Concrete rule for `COLLECTIONS`'s contents:** every value must be a string/number/boolean literal, or a reference to a `function` **declaration** (hoisted). The `blank()` derivation must only read `spec.kind` during the eval-time call chain (`let DB = load()` → `load()` → `normalize()` → `blank()`); `key`/`sortBy`/`merge` are read later by `mergeCollections()`/`liveOf()`/`validateBackup()`, none of which run at module-eval time — this narrows the "must survive TDZ" surface to the minimum, per `ARCHITECTURE.md`'s rule 3.

### Promotion list (REG-04) — exact current source, must become `function` declarations

| Name | Current declaration | Current line | New shape needed |
|---|---|---|---|
| `sessKey` | `const sessKey = s => s.id \|\| ('c_'+(s.date\|\|'')+'\|'+(s.workout\|\|'')+'\|'+(s.endedAt\|\|'')+'\|'+(s.skipped?'1':'0'));` | [VERIFIED: index.html:3618] | `function sessKey(s){ return s.id \|\| ...; }` |
| `todoKey` | `const todoKey = t => (t.created\|\|'')+'\|'+(t.text\|\|'');` | [VERIFIED: index.html:3619] | `function todoKey(t){ return ...; }` |
| `hobbyKey` | `const hobbyKey = h => (h.date\|\|'')+'\|'+(h.item\|\|h.hobby\|\|'')+'\|'+(h.cat\|\|'');` | [VERIFIED: index.html:3620] | `function hobbyKey(h){ return ...; }` |
| cardio's inline key | `c=>c.id \|\| ((c.date\|\|'')+'\|'+(c.type\|\|'')+'\|'+(c.minutes\|\|''))`, inline inside the `mergeUnion(...)` call | [VERIFIED: index.html:3667] | Extract to `function cardioKey(c){ return ...; }`, keep the call site calling it by name |
| ideas' inline key | `i=>i.id \|\| ((i.date\|\|'')+'\|'+(i.text\|\|''))`, inline inside the `mergeUnion(...)` call | [VERIFIED: index.html:3668] | Extract to `function ideaKey(i){ return ...; }` |
| (new, not a promotion — must be *written*) `sessionSort` | Currently an inline comparator, not a named function: `(a,b)=> a.date===b.date ? ((a.endedAt\|\|0)-(b.endedAt\|\|0)) : String(a.date).localeCompare(String(b.date))` | [VERIFIED: index.html:3690] | `function sessionSort(a,b){ return ...; }` — needed as `COLLECTIONS.sessions.sortBy`'s function-reference value |

`weights`/`petWeights`/`sleep`'s `w=>w.date` keys and `sortBy:'date'` do **not** need promotion — the string-field-name convention (`key:'date'`, `sortBy:'date'`) covers them cleanly, per `ARCHITECTURE.md`'s "strings for the common case" recommendation. Only the composite/fallback cases above need the function-reference escape hatch.

## Migration Go/No-Go Decision (Pitfall 8 / REG-16 gate)

**Decision, recorded per `PITFALLS.md` Pitfall 8's explicit instruction to state this rather than assume it:** *No stored-row reshaping is required to introduce `COLLECTIONS` and derive `blank()`/`liveX()`/`validateBackup()`/`mergeDB()` for the ten existing collections.* Every `key`/`sortBy`/`merge` value identified in the oracle table above reads a field that already exists on every row in every collection today (`id`, `date`, composite strings built from existing fields). Nothing needs renaming, restructuring, or backfilling. This is a **derivation of behavior**, not a **change of shape** — confirmed by re-reading `blank()`, `mergeDB()`, and all seven `liveX()` filters directly this session (no field access anywhere in those functions that isn't already present in `mergeUnion`/`mergeDateMap`'s existing call sites).

**The one piece of genuinely new stored data is `sleep` itself** — not a reshape of an existing collection, a brand-new empty collection needing a default. This still goes through the numbered `MIGRATIONS` mechanism (SCHEMA bump permitted per the locked decision), following the exact idempotent-default pattern already used for every prior "add an empty collection" migration, e.g. migration 6: `6:d=>{ if(!d.todos) d.todos=[]; return d; }, // rolling to-do list` [VERIFIED: index.html:494]. A new `MIGRATIONS[18]` entry doing `if(!Array.isArray(d.sleep)) d.sleep=[]; return d;` (or the shared `ensureCollectionDefaults()` helper `ARCHITECTURE.md` proposes, looping `COLLECTIONS` for every collection whose default is `[]`/`{}`) satisfies this with no row rewrite anywhere. **REG-16's four guards do not need to fire for this phase** — there is no existing row being rewritten, only a new empty field being defaulted, which is the same risk class as every prior "add a collection" migration in this file's own history (migrations 6, 7, 8, 10, 14 all follow this identical shape and none of them needed `touch()`/persist-immediately treatment, because they create rows, they don't rewrite ones that already have an `mtime`).

**State this explicitly in the plan's acceptance criteria**, per Pitfall 8's own instruction — do not leave it implicit.

## Hard-Coded Collection List Audit (SLEEP-04 completeness check)

Every place in `index.html` that enumerates collection names explicitly, found by reading the relevant sections directly this session (not a blind grep — grep alone can't tell "this is a per-collection rule" from "this is an unrelated string"):

| Location | What it does | Does adding `sleep` require an edit? |
|---|---|---|
| `validateBackup()` — `const arrays = ['sessions','weights'];` [VERIFIED: index.html:3302]; `for(const k of ['petWeights','cardio','ideas','todos','hobbyLog'])` [VERIFIED: index.html:3304]; `for(const k of ['journal','mobilityLog','lawnLog'])` [VERIFIED: index.html:3305] | Hand-written required/optional collection lists | **Yes, but this is exactly what REG-08 derives away.** After derivation, this becomes a loop over `COLLECTIONS`, not three hard-coded arrays — this *is* SLEEP-04's proof, not a violation of it |
| `mergeDB()` — the seven `out.X = mergeUnion(...)` / three `out.Y = mergeDateMap(...)` lines [VERIFIED: index.html:3664-3676] | Per-collection merge dispatch | **Yes, but this is REG-09's derivation target.** After `mergeCollections()` exists, this is a loop, not ten hand-typed lines |
| `blank()` — the object literal listing every collection's empty default [VERIFIED: index.html:641] | Default DB shape | **Yes, but this is REG-06's derivation target** |
| The seven `liveX()` one-liners [VERIFIED: index.html:653-659] | Soft-delete filters | **Yes, but this is REG-07's derivation target** |
| `snapSummary(d)` — `const ws=(d.weights\|\|[]), ss=(d.sessions\|\|[]); ... return { sessions:ss.length, weights:ws.length, cardio:(d.cardio\|\|[]).length, latest:... };` [VERIFIED: index.html:683-686] | Cosmetic summary shown on the Settings → Version History snapshot list (`"3 workouts · 2 weigh-ins logged"` style text) | **No edit required for SLEEP-04 to hold.** This is display-only metadata for the local snapshot ring, not one of the five named consumers (`blank()`, `mergeDB()`, `liveX()` family, `validateBackup()`, exporter). Leaving it untouched is correct and does not violate SLEEP-04. Optionally extending it to mention sleep counts is a cosmetic nice-to-have, not a requirement — **flag this explicitly in the plan as "intentionally not touched," so a reviewer doesn't mistake the omission for a miss** |
| `exportData()` — `JSON.stringify(DB,null,2)` [VERIFIED: index.html:3290] | JSON backup export | **No.** Exports the whole `DB` object with no per-collection enumeration at all — `sleep` is included automatically the moment it exists as a `DB` field, no code change needed here |
| `pushNow()` / `syncToCloud` transaction — `const blob = JSON.stringify(merged);` [VERIFIED: index.html:3848] | Cloud sync payload | **No.** The payload is the whole merged `DB` object serialized wholesale; no per-collection enumeration. `sleep` rides along automatically once `mergeDB()` produces it in `merged` |
| `restoreSnapshot()` / `adoptMerged()` — both call `normalize()`/assign the whole blob [VERIFIED: index.html:3929-3939, 3752-3770] | Local snapshot restore / merged-state adoption | **No.** Whole-blob operations, no per-collection list |
| `wipe()` — `DB=blank(); DB.gen=g;` [VERIFIED: index.html:3348] | Erase all data | **No.** Calls `blank()` (already covered above) and bumps `gen`; no separate per-collection list |
| `importData()` — merge and replace branches [VERIFIED: index.html:3326-3345] | Backup import | **No.** Calls `mergeDB()`/`normalize()` wholesale; no separate per-collection list |
| `test/harness.js`'s `names` export array [VERIFIED: test/harness.js:97-114] | Which internal functions the test file can see | **This is not part of the app, but it is a hard-coded list that WILL need an edit** — see the Test Fixture Gap section below. Not a SLEEP-04 violation (SLEEP-04 is about app consumers, not test plumbing) but the plan must account for it or new tests silently no-op |
| `test/app.test.js`'s `populatedDB()` fixture [VERIFIED: test/app.test.js:538-563] and the top-level smoke-test fixture (same function, referenced at line 189-201 in `TESTING.md`'s excerpt) | Smoke-test seed data | **Not required for SLEEP-04**, but the plan should add a `sleep` array to this fixture so the "every screen still draws" smoke test exercises the new view with data present, not just empty-state |

**Conclusion: SLEEP-04 holds.** No hard-coded collection list outside the five explicitly-named consumers (which the derivation is specifically deriving) will require an edit to add `sleep`. The only genuinely new work for `sleep` beyond `COLLECTIONS` + its view is: one `MIGRATIONS` entry (see Go/No-Go above), one `liveSleep()` one-line wrapper (per `ARCHITECTURE.md`'s Extension Points — the registry doesn't eliminate the *named call site*, only the logic inside it), and the harness.js export-list edit (test plumbing, not app code, and arguably still within "its view" as far as SLEEP-04's spirit goes since it's what makes the view testable — the plan should treat it as bundled with the view work, not as a sixth edit site).

## Test Fixture Gap — REG-13's real-backup requirement (verify, don't fabricate)

Checked directly this session: `test/` contains exactly two files, `app.test.js` and `harness.js` [VERIFIED: directory listing, `ls test/`]. **There is no `test/fixtures/` directory and no real exported backup file anywhere in this repository** [VERIFIED: `find . -iname "*backup*"` and `find . -iname "fixtures"` both returned nothing, run from repo root this session].

The `realBackup` fixture used today in `test/app.test.js` (for the `validateBackup()` tests) is **synthetic**, hand-built via `Object.assign(app.blank(), {...})` [VERIFIED: test/app.test.js:501-503] — it is not a real exported backup, and reusing it as REG-13's "real exported backup" fixture would not satisfy the requirement (the requirement is specifically about the long tail of real data, per `PITFALLS.md` Pitfall 4 — "a green suite after deletion proves the new code doesn't repeat *documented* incidents. It is not evidence the new code is behaviorally identical to the old one on the long tail of real data").

**What the plan must do about this — do not fabricate a substitute:**
1. Ask Ian to tap **Settings → Export backup** (`exportData()`, [VERIFIED: index.html:3289-3294]) on his real device and provide the resulting JSON file.
2. Scrub it if needed (nothing sensitive is expected — it's the same data already leaving the device via this feature today — but the plan should not assume without checking) and check a copy into `test/fixtures/real-db-snapshot.json`.
3. If this step cannot happen before the phase's differential-testing plan step runs, the plan must say so explicitly and either (a) block on it as a `checkpoint:human-verify`-style gate before REG-13's tests are written, or (b) descope REG-13's "real exported backup" leg to "synthetic two-device fixtures per past incident only" and record that as a known gap, never silently substitute the existing synthetic `realBackup` fixture and call it done.

This gap was flagged as a possibility in the phase's incoming context ("flag it if not present — do not fabricate one") and is now confirmed, not hypothetical.

## Per-Incident Synthetic Fixtures Needed (REG-13)

From `CLAUDE.md`'s "Rules that exist because breaking them cost real data" and the existing test suite's own incident-documentation comments, each of these needs a synthetic two-device fixture in the differential test battery:

| Incident | What the fixture must encode | Existing test precedent to extend, not duplicate |
|---|---|---|
| 2026-07-25 blind-write / stale-device-can-subtract | Two device states where the "loser" has fewer/older rows; assert union, not overwrite | `test/app.test.js:355-366`, the `── sync merge: a stale device can never subtract ──` block — **already exists and already covers this at the `mergeDB()` level**; the differential test just needs to run the *same* fixtures through both `mergeDB_legacy` and derived `mergeDB` and assert identical output |
| Migration 15 silent revert | A device on an old `_schema` with un-migrated rows, syncing against a device that already migrated and correctly `touch()`-ed the rewritten rows | `test/app.test.js:396-427`, the `── a migration must survive the next sync ──` block — **already exists**; reuse the `gobletV14()` fixture builder [VERIFIED: test/app.test.js:377-380] as a template for how to construct "old-schema device meets migrated device" |
| `mobilityLog`/`lawnLog` explicit-`false` vs. absent-key | Device A has a day explicitly `false`; Device B has that key entirely absent (never logged); assert the merge does not resurrect it as "on", and separately that an explicitly-`false` day survives merge against a device where the day is simply missing | **Does not exist today** — `TESTING.md`'s own gap note confirms `mergeDateMap()` has "no direct test" (`.planning/codebase/CONCERNS.md:172-176`, itself citing `grep mergeDateMap test/app.test.js` returning nothing). This is new test-writing work, not an extension of an existing block |
| `gen`-mismatch wholesale replace (Erase all / Import→Replace) | A DB with rows the "losing" side doesn't have; simulate a fresh Erase (`gen` bumped) and assert **zero** unioned survivors from the losing side reach the output | Not present as a named block in `app.test.js` today (the mtime-collision tests at lines 355-366 test `updatedAt`/`mtime` recency, not a `gen` bump specifically) — new test-writing work, exact fixture shape modeled on `wipe()`'s own logic [VERIFIED: index.html:3348] |
| `sleep`-specific: a deleted sleep row surviving a stale-device merge (SLEEP-06) | Two synthetic device states: one with a soft-deleted sleep row (higher `mtime`), one with the same row still live (older `mtime`, simulating a stale device that never saw the delete); assert the deleted state wins | New — mirrors the existing "a delete is not resurrected by a newer-looking remote" pattern already proven for `petWeights` at `test/app.test.js:360-361`, just re-targeted at `sleep` |

## Cheapest-First Consumer Replacement Order (REG-12)

Directly adopting `ARCHITECTURE.md`'s "Incremental Migration" table (2026-09-10), re-verified this session against the actual function bodies:

| Step | Consumer | Why this position | Parity proof before moving on |
|---|---|---|---|
| 0 | `COLLECTIONS` added as dead data at the TDZ-safe insertion point | Zero behavior change — establishes placement in isolation, reviewable on its own before any consumer reads it | N/A — nothing reads it yet |
| 1 | `blank()` | Pure function, zero external inputs, cheapest possible proof of the derivation pattern | Golden test: `JSON.stringify(blank())` before vs. after the change, byte-identical |
| 2 | `liveOf()` + seven thin `liveX()` wrappers | Pure, read-only, structurally identical to `blank()` in risk profile — every existing body is literally `(DB[name]\|\|[]).filter(isLive)` already | Differential test: seed live + soft-deleted rows in every collection, call every `liveX()` before/after, deep-equal |
| 3 | `validateBackup()`'s shape prologue (list-vs-map, required-vs-optional) | Read-only but **user-facing string output** — raises the parity bar to "identical wording," not just "identical accept/reject" | Run the existing malformed-backup test battery (`test/app.test.js:500-519`) through the derived validator, assert identical returned strings, not just identical truthiness |
| 4 | `mergeCollections()` extracted from `mergeDB()` | **Highest risk — named directly in the incident history.** Do this last and alone | Rename current body to `mergeDB_legacy`; new `mergeDB` calls `mergeCollections()`; differential test runs both over the real-backup fixture (once obtained) + every per-incident synthetic fixture from the table above; only delete `mergeDB_legacy` after this is green through a normal usage cycle |
| 5 | Delete `mergeDB_legacy` (and any other renamed legacy scaffolding) | Pure cleanup once step 4 has proven out | The differential tests from steps 1–4 graduate into the permanent suite rather than being discarded |

**Every step must leave `npm test` green and the app deployable** — this is not optional sequencing advice, it's `CLAUDE.md`'s own rule ("A red suite blocks the deploy... Add checks for what you change" [VERIFIED: CLAUDE.md:8-16]) applied to a multi-commit phase.

## REG-17: Column/format metadata for Phase 2's export

Phase 2 (not this phase) builds `toMarkdown()`, but `ARCHITECTURE.md`'s "Suggested Build Order" section explicitly flags that the `columns`/`format` extension point on `COLLECTIONS` should be added **now**, in this phase's scope, so Phase 2 is purely "write `toMarkdown()`" rather than "extend the registry, then write `toMarkdown()`." Concretely, per collection:

- Flat-row collections get `columns: [...]` — an array of field names, e.g. `columns: ['date','type','minutes','distanceKm','note']` for `cardio`.
- `sessions` (and any other nested-shape collection) gets an escape hatch: `format: sessionRows` — a hoisted function reference (same convention as `key`/`sortBy`), because `entries[].sets[]` needs flattening logic no flat `columns` array can express. Per `REQUIREMENTS.md` EXP-03, `sessions` must export as one flat row per **set** (date, workout, exercise, set number, weight, reps) — this is exactly the kind of transform `format` exists for.
- `sleep`'s `columns` are trivially `['date','hours','quality','note']` — no escape hatch needed.

This phase should add `columns`/`format` to every collection's declaration even though nothing reads them yet (mirrors "Step 0: `COLLECTIONS` as dead data" for this one field specifically) — cheap now, expensive to retrofit once Phase 2 depends on the field already being settled per-collection.

## UI Placement Recommendation for `sleep` (SLEEP-02/03, Claude's discretion)

**The closest existing structural pattern is `cardio`, not `weights`.** Reasoning, with evidence:

| Field | `sleep` (locked shape) | `weights`/`petWeights` | `cardio` |
|---|---|---|---|
| Identity | `id` (per SLEEP-01: `key:'id'`) | keyed by bare `date`, no `id` field at all | `id` via `cardioUid()` [VERIFIED: index.html:3426] — `function cardioUid(){ return 'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }` |
| Extra scalar fields beyond date+value | `hours` (numeric) + `quality` (1–5 int) | none — single `value` | `type`, `minutes`, `distanceKm` — multiple fields |
| Optional note | yes | no | yes — `note` field, rendered with `esc()` |
| Delete affordance in the list view | needed (SLEEP-03) | not exposed in `viewWeight()`'s history list (weigh-ins can be re-logged/overwritten by date but there's no visible per-row delete button in the reviewed code) | `removeCardio(id)` with an `x-set` delete button per row [VERIFIED: index.html:3458, 3560] |

`cardio`'s form-and-history pattern (`addCardio()`/`removeCardio()`/`viewCardio()` [VERIFIED: index.html:3448-3588]) is the closest existing match on every axis that matters for `sleep`: an `id`-keyed row with multiple typed fields, an optional free-text `note` escaped via `esc()`, and a visible per-row delete (`x-set` button calling `removeCardio('${c.id}')`, itself calling `softDelete(DB.cardio, c=>c.id===id)` [VERIFIED: index.html:3458]). `sleep`'s CRUD functions (`addSleep()`/`removeSleep()`/`viewSleep()`) should mirror this shape directly: a small input card (date, hours as a number input, quality as a 1–5 selector, an optional note input) above a history list of `hist-item` rows each with an `x-set` delete button.

**Quality-rating UI:** No existing 1–5 rating control exists anywhere in the app today [VERIFIED: searched for `rating`, `quality`, `type="range"`, star characters — no matches in `index.html`]. The nearest reusable primitive is the `.seg` segmented-control CSS class already used for `viewWeight()`'s sub-nav and `viewCardio()`'s type `<select>` [VERIFIED: index.html:2153-2158, 3552]. Recommend a plain `<select id="sleep-quality">` with five `<option>`s (1 through 5, perhaps labeled) — this is the lowest-novelty choice, reuses the exact `<select>` pattern `cardio-type` already establishes, and needs no new CSS. A five-button `.seg` control is a defensible alternative (matches the app's existing segmented-control visual language more closely) but is marginally more UI code for the same result; either is consistent with "no UI-SPEC, reuse existing patterns" — the planner should pick one, not both.

**Icon:** `'moon'` already exists in the inlined Phosphor `PH` map [VERIFIED: index.html:872, path data present] and is already in active use for the evening-routine marker in `viewSkincare()` [VERIFIED: index.html:2743 — `${ph('moon')}`]. No new icon needs to be added to `PH` — reuse `ph('moon')` for the sleep tab/section marker, consistent with `CLAUDE.md`'s icon rule ("Phosphor, inlined in the `PH` map. No CDN, no web font").

**Tab/sub-tab placement — evidence, not a mandate:** `TABS` is a flat array with each entry optionally carrying a `sub` array of `[id,label]` pairs [VERIFIED: index.html:1282-1291]. The existing groups are `train` (`log`/`history`/`cardio`/`progress`), `care` (`skin`/`lawn`), and ungrouped `today`/`settings`. Two placements are structurally available without inventing new top-level navigation:
1. **Add `sleep` as a new `sub` entry on an existing tab** (e.g., `care`'s `sub` becomes `[['skin','Skin'],['lawn','Lawn'],['sleep','Sleep']]`), following the exact precedent of how `cardio` presumably joined `train`'s sub-list as a fourth entry at some point in this app's 47-day history.
2. **Add `sleep` as a new `progSub` value inside `viewWeight()`** (mirroring how `petWeight` joined the Progress page's internal sub-nav [VERIFIED: index.html:2153-2158]).

**Evidence favoring option 1 over option 2, found directly in the test suite:** `test/app.test.js` builds its `SCREENS` list — the set of tab/sub combinations the "every screen still draws" smoke test exercises — **directly from `app.TABS`'s `sub` arrays** [VERIFIED: test/app.test.js:566-570]: `(app.TABS||[]).forEach(t => { if(t.sub) t.sub.forEach(([k,label]) => SCREENS.push([...])); ... })`. A new entry in a `TABS[...].sub` array is therefore **automatically exercised by the existing smoke test with zero test-file edits**. `progSub`, by contrast, is an internal variable of `viewWeight()` not enumerated anywhere `SCREENS` can see — confirmed by searching `test/app.test.js` for `progSub` and finding no matches [VERIFIED: grep, no results this session]. This means the pet-weight-style placement (option 2) is **not** covered by the existing smoke-test mechanism today, and choosing it for `sleep` would leave the new view's default state unexercised by "every screen still draws" unless the smoke test is separately extended to walk `progSub` states (a pre-existing gap this phase is not required to fix, but inherits if it reuses that pattern). **This is evidence, not a directive** — the planner may still choose option 2 if there's a stronger UX reason, but should do so knowingly, and should add the equivalent coverage by hand if so.

## Architecture Patterns

### System Architecture Diagram — where the registry sits relative to the boot/merge/render sequence

```
                     index.html (single <script>, top-to-bottom eval at module load)
┌───────────────────────────────────────────────────────────────────────────────────┐
│ KEY, SCHEMA, …HOBBIES/PRODUCTIVITY consts (473-478)                               │
│  ┌───────────────────────────────────────────────────────────────────────────┐    │
│  │ const COLLECTIONS = { sessions:{...}, …, sleep:{...} }   ◄── NEW, F1      │    │  data only,
│  └───────────────────────────────────────────────────────────────────────────┘    │  literals/hoisted
│ const MIGRATIONS = {...}  (480)  ── may READ COLLECTIONS (declared after it) ──►   │  fn refs only
│ function blank(){ …scalars…, ⤳ loop COLLECTIONS for kind→[]/{} }  (641, derived)   │
│ function normalize(raw){ …MIGRATIONS loop…, normalizeDraft(d) }  (616)             │
│ let migrationRan = false; (634)                                                    │
│ let DB = load();   ◄── MODULE-EVAL TIME. Everything above must already be safe.    │ (635)
│ ───────────────────────────────────────────────────────────────────────────────── │
│ function isLive(x){…} touch(x){…}  (651-652)                                       │
│ function liveOf(name){ return (DB[name]||[]).filter(isLive); }  ◄── NEW, derived   │
│ function liveSessions(){ return liveOf('sessions'); }  … 6 more, thin wrappers     │
│ ───────────────────────────────────────────────────────────────────────────────── │
│ function validateBackup(raw){ ⤳ shape loop over COLLECTIONS, then hand-written    │ (3300,
│                                    deep per-row checks unchanged }                 │  partially derived)
│ ───────────────────────────────────────────────────────────────────────────────── │
│ function mergeUnion(...) mergeDateMap(...) mergeJournalEntry(...)  (3597-3630,     │  unchanged,
│                                                                        unchanged)  │  primitives reused
│ function mergeCollections(r,l,localNewer,out){ ⤳ loop COLLECTIONS, dispatch }     │ ◄── NEW, derived
│ function mergeDB(remote,local,localWins){ …gen check (hard return, UNTOUCHED)…,   │ (3644, thinner
│                                              mergeCollections(...), sort          │  frame, calls
│                                              invariants, normalizeDraft(out)… }    │  the new dispatch)
└───────────────────────────────────────────────────────────────────────────────────┘
```

### Recommended file-internal structure (no new files — this is one `<script>` block)

No new files; the ordering above *is* the structure. `COLLECTIONS` lives at line ~479, strategy helper functions (`sessionSort`, promoted key functions) can live near their existing neighbors (e.g., `sessionSort` right next to `sessKey` at ~3618, since both are merge/sort primitives used by `mergeDB`), and the new derived functions (`liveOf`, `mergeCollections`) slot in exactly where their hand-written predecessors already live (~651 and ~3644 respectively) since they're direct extractions, not new subsystems.

### Pattern: thin-wrapper-delegates-to-shared-engine (the only acceptable derivation shape)

**What:** every existing named call site (`liveSessions()`, `liveWeights()`, …) stays a real, textually-present one-liner that calls a shared engine function; nothing is dynamically assigned.
**When to use:** every one of the four derivations in this phase.
**Why, not just what:** `ARCHITECTURE.md`'s Anti-Patterns section (already committed) rules out `window['live'+cap(name)] = ...`-style dynamic generation specifically because it produces an un-`grep`-able, un-debuggable call site — exactly the kind of silent failure this phase's own incident history is made of. This is not a style preference; it's the same "obvious, not clever" principle CLAUDE.md's whole incident-history section is built around.
**Example, adapted from `ARCHITECTURE.md` and re-verified against the current source this session:**
```js
// blank(): scalars hand-written, list/map defaults derived — only spec.kind read at eval time
function blank(){
  const out = { _schema:SCHEMA, gen:0, sessions:[], weights:[], petWeights:[], petName:"Freddie",
                exercises:[], draft:null, unit:"lb", routineMode:"4day",
                hobbies:HOBBIES_DEFAULT.slice(), productivity:PRODUCTIVITY_DEFAULT.slice(),
                hobbyLog:[], journal:{}, mobilityLog:{}, todos:[], cardio:[], ideas:[],
                lawnLog:{}, lawn:null, wx:null, hobbySeedV2:true };
  // current blank() [VERIFIED: index.html:641] is a single object literal, hand-written per key —
  // derivation should REPLACE the list/map fields' hand-typed defaults with a loop, e.g.:
  // for(const name in COLLECTIONS) out[name] = COLLECTIONS[name].kind==='list' ? [] : {};
  // ...while leaving scalar fields (_schema, gen, petName, unit, routineMode, hobbies, ...) hand-written.
  return out;
}
```

### Anti-Patterns to Avoid (inherited from `ARCHITECTURE.md`, re-affirmed)

- **Deriving `MIGRATIONS` from `COLLECTIONS`.** `MIGRATIONS` describes historical transformations, not current shape — different lifecycle, different question. Keep it hand-written; let it read `COLLECTIONS` one-way (REG-11).
- **Dynamically-named derived functions** (`window['live'+cap(name)]`). Breaks `grep`-ability and go-to-definition; trades a forgotten-edit failure for an un-findable one.
- **A validation DSL inside `COLLECTIONS`.** Two structurally different row shapes (`sessions`' nested `entries[].sets[]` vs. everything else's flat rows) don't share enough structure to justify a schema language. Per-row deep checks stay hand-written in `validateBackup()`.
- **Generalizing map-collection merge to key-union.** `journal`/`mobilityLog`/`lawnLog` must never default to unioning inner keys — that's the exact "absence never means off" incident. `merge` must be an explicit, required field with no inferred default (REG-05).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Per-collection merge dispatch | A bespoke `if/else` chain per new collection (what exists today) | `mergeCollections()` looping `COLLECTIONS`, dispatching to the three existing primitives (`mergeUnion`, `mergeDateMap` + inner strategy) | This *is* the phase — the whole point is that a new collection's merge rule can't be silently omitted once it's a required field a loop reads, not a line someone has to remember to add |
| A schema-validation library | Zod/Valibot/any npm validator (considered and rejected in `SUMMARY.md`) | Hand-written shape checks in `validateBackup()`, partially derived from `COLLECTIONS` | Zero-dependency constraint; the shape-check logic here is small enough (10-ish collections, one user) that a library is solving a problem this app doesn't have |
| A generic ORM / ODM-style ownership pattern | Field-level per-row validators, conflict-surfacing UI, per-field merge policies inside a list row | Keep `COLLECTIONS` scoped to exactly the five listed fields (`kind`,`key`,`sortBy`,`merge`,`soft`) plus the new `columns`/`format`/`required` fields already scoped by prior research | `ARCHITECTURE.md`'s "What the registry does not need to anticipate" section — speculative generality this app's actual usage pattern (one new collection every 4-5 days, ~10-20 collections total over a year) doesn't warrant |

**Key insight:** the reason this domain resists hand-rolling isn't complexity — every individual derivation here is small (a few lines each). It's that the *history* of this exact codebase shows hand-rolled per-collection logic silently omits a rule roughly once per new collection (`mobilityLog`'s merge rule, Migration 15's persist step, a missed `liveX()` filter). The registry's value is making omission structurally visible (a required field, a loop that throws on missing metadata), not making the code shorter.

## Common Pitfalls

The full, ranked pitfall catalogue for this exact refactor already exists at `.planning/research/PITFALLS.md` (2026-09-10, HIGH confidence, codebase-specific) — 15 pitfalls, the top 10 ranked Critical. This document does not re-paste it; the planner must read it directly (`.planning/research/PITFALLS.md`) alongside this file. What follows is the subset most load-bearing for **this specific plan's task breakdown**, re-verified against current line numbers this session:

1. **The `gen`-mismatch short-circuit gets folded into the generic loop** (Pitfall 1) — verified above with the exact current `mergeDB()` source (index.html:3644-3658); the derived `mergeCollections()` call must sit textually *after* this `return`, never inside the branch that returns from it.
2. **Map collections default to key-union instead of whole-object-newer-wins** (Pitfall 2) — verified above that `mobilityLog`/`lawnLog`'s write sites (`toggleMobility` at index.html:2650, `setLawnLog` at index.html:3041-3047) already discipline themselves to write explicit booleans; the registry's `merge` field must be required with no default, or this discipline becomes decorative.
3. **Deleting hand-written functions before proving equivalence** (Pitfall 4) — this session confirms the specific gap the prevention depends on: no real-backup fixture exists yet (Test Fixture Gap section above). This pitfall's prevention is *blocked*, not just recommended, until that fixture exists.
4. **`mergeUnion`'s property tests must be written at the `mergeDB()` level, never the raw `mergeUnion()` level** (Pitfall 5) — because `newerFirst` is recomputed by `mergeDB`, not passed through unchanged; a naive swap-arguments commutativity test at the array level will either false-fail or, worse, get "fixed" into something that breaks equal-mtime tie-breaking.
5. **`sleep`'s acceptance test proving rendering, not merging** (Pitfall 12) — SLEEP-06 exists specifically to close this; the planner must ensure the synthetic two-device merge test for `sleep` is a *named, required* check, not implied by "the view renders."

## Code Examples

### Derived `liveOf()` — the shared engine every `liveX()` wrapper delegates to
```js
// Current (7 hand-written one-liners), verified this session at index.html:653-659:
function liveSessions(){ return (DB.sessions||[]).filter(isLive); }
function liveWeights(){ return (DB.weights||[]).filter(isLive); }
// ...5 more, structurally identical

// Derived shape (ARCHITECTURE.md, re-affirmed):
function liveOf(name){ return (DB[name]||[]).filter(isLive); }
function liveSessions(){ return liveOf('sessions'); }
function liveWeights(){ return liveOf('weights'); }
// ...5 more one-liners, UNCHANGED call sites, now delegating
function liveSleep(){ return liveOf('sleep'); }   // the one new named wrapper SLEEP-01 needs
```

### Derived `validateBackup()` shape prologue, layered on top of the current hand-written checks
```js
// Current required/optional lists, verified this session at index.html:3302-3305:
const arrays = ['sessions','weights'];
for(const k of arrays) if(!Array.isArray(raw[k])) return `This backup is missing its ${k} list...`;
for(const k of ['petWeights','cardio','ideas','todos','hobbyLog']) if(raw[k]!=null && !Array.isArray(raw[k])) return `The ${k} section is damaged (expected a list).`;
for(const k of ['journal','mobilityLog','lawnLog']) if(raw[k]!=null && (typeof raw[k]!=='object' || Array.isArray(raw[k]))) return `The ${k} section is damaged.`;

// Derived shape — same three loops, generated from COLLECTIONS.required/kind instead of hand-typed lists:
for(const name in COLLECTIONS){
  const spec = COLLECTIONS[name];
  if(spec.required && !Array.isArray(raw[name])) return `This backup is missing its ${name} list, so it's incomplete or truncated.`;
  if(!spec.required && raw[name]!=null){
    const ok = spec.kind==='list' ? Array.isArray(raw[name]) : (typeof raw[name]==='object' && !Array.isArray(raw[name]));
    if(!ok) return `The ${name} section is damaged${spec.kind==='list'?' (expected a list)':''}.`;
  }
}
// Deep per-row checks (date regex, entries/sets shape, numeric weigh-in value) — index.html:3309-3323 — STAY HAND-WRITTEN, unchanged.
```

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The `<select>` (vs. a `.seg` 5-button control) is the lower-novelty choice for the quality rating UI | UI Placement Recommendation | Low — either is consistent with "reuse existing patterns"; this is a stated preference with reasoning, not a verified fact about what Ian wants. Planner/Ian should confirm |
| A2 | Placing `sleep` as a `TABS[...].sub` entry (vs. a `progSub` inside `viewWeight()`) is the better choice because it's automatically smoke-tested | UI Placement Recommendation | Medium — this is genuinely evidence-based (verified via reading `test/app.test.js:566-570`), but it's a testability argument, not a UX one; if there's a strong UX reason to nest it under Progress instead, that argument should win and the smoke-test gap should be closed by hand |
| A3 | A scrubbed real backup export contains nothing Ian would need to redact before checking it into a public repo | Test Fixture Gap | Low-Medium — this repo is already public and the export feature already exists for Ian to use; but nobody in this research session actually inspected a real export's contents (no such file exists locally to inspect). Ian should glance at the file before it's committed, not because of a specific known-sensitive field, but because nobody has verified there isn't one |

## Open Questions

1. **Should `cardio`/`ideas`/`todos`/`hobbyLog` gain a `sortBy` in `COLLECTIONS` even though they have none today?**
   - What we know: none of the four currently get a merge-time `.sort()` invariant in `mergeDB()` (verified directly, no `.sort()` call on any of these four arrays anywhere in `mergeDB`'s body) — they're sorted only at view time.
   - What's unclear: whether a future collection-twelve author would expect `sortBy` to be "the" field for stable ordering and be surprised these four don't have one.
   - Recommendation: leave `sortBy` undeclared (or `null`) for these four in this phase — declaring one would be a silent behavior change (introducing a merge-time sort where none exists today) outside this phase's "derive, don't change" mandate. Document the asymmetry in the `COLLECTIONS` declaration's own comments so Phase 3's recipe (F3) states it explicitly rather than a future author assuming uniformity.
2. **Does `snapSummary()`'s cosmetic per-collection counts need a `sleep` entry?**
   - What we know: it's a display-only helper for the local snapshot-history list, not one of the five SLEEP-04-named consumers.
   - What's unclear: whether Ian would want to see a sleep count in that summary text.
   - Recommendation: leave untouched for this phase (SLEEP-04 doesn't require it); note it as a deliberate omission, not an oversight, so a future reviewer doesn't "fix" it as a missed edit.

## Environment Availability

Not applicable — this phase adds no external dependency, service, or CLI tool. `npm test` (Node.js, already the project's only tooling) is suffient; verified runnable this session per `TESTING.md`'s documented invocation (`TZ=America/Chicago npm test`).

## Validation Architecture

`workflow.nyquist_validation` is `true` in `.planning/config.json` [VERIFIED: .planning/config.json] (key present, not absent) — this section is required.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Custom, zero-dependency Node harness — no external test runner [VERIFIED: package.json, test/harness.js] |
| Config file | none — `npm test` runs `node test/app.test.js` directly [VERIFIED: package.json:6] |
| Quick run command | `cd /c/Users/idbac/Projects/ppl-tracker && TZ=America/Chicago node test/app.test.js` |
| Full suite command | `cd /c/Users/idbac/Projects/ppl-tracker && TZ=America/Chicago npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REG-02/03/04 | Placement/hoisting correctness | boot-order regression | `TZ=America/Chicago npm test` (new assertions in `app.test.js`'s "booting with data that needs migrating" style block) | ❌ Wave 0 — new test needed, extending the existing pattern at `test/app.test.js:478-490` |
| REG-06 | `blank()` shape parity | golden/characterization | same suite, new assertion | ❌ Wave 0 |
| REG-07 | `liveX()` filter parity | differential | same suite, new assertion | ❌ Wave 0 |
| REG-08 | `validateBackup()` string parity | differential, replay existing malformed-backup battery | same suite, extends `test/app.test.js:500-519` | ⚠️ Partially — the malformed-backup battery exists, the "run it through both old and new validator" comparison does not |
| REG-09/REG-10 | `mergeDB()` derivation + `gen` short-circuit untouched | differential + named-hazard test | same suite | ❌ Wave 0 — including a test literally named to state the hazard, per `PITFALLS.md` Pitfall 1's own recommendation |
| REG-13 | Real-backup + per-incident differential | differential, real fixture | same suite | ❌ Wave 0, **and blocked on the Test Fixture Gap above** — cannot be written correctly until `test/fixtures/real-db-snapshot.json` exists |
| REG-15 | Boot-order, schema 1→17 | regression, loop over schema versions | same suite | ❌ Wave 0 |
| REG-16 | N/A this phase (Go/No-Go: no rewrite required) | — | — | — |
| SLEEP-05 | SLEEP-04 assertion (only `COLLECTIONS`+view touched) | static/structural — e.g., assert the diff for the sleep-adding commit only touches expected functions, or assert `mergeDB`/`blank`/`liveX`/`validateBackup`'s source text is unchanged except the generic loop bodies | same suite or a small script | ❌ Wave 0 — needs explicit design; a literal git-diff-scoped assertion is one option, a "every consumer picks up a collection added at test time with zero further code" behavioral test is another and is more robust (add a throwaway collection to `COLLECTIONS` inside the test itself, assert `blank()`/`liveX()`/`mergeDB()`/`validateBackup()` all handle it correctly with no further code touched) |
| SLEEP-06 | Deleted sleep row survives stale-device replay | differential, synthetic two-device | same suite | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `TZ=America/Chicago node test/app.test.js`
- **Per wave merge:** `TZ=America/Chicago npm test` (same command; no separate "full suite" exists — the one file is both)
- **Phase gate:** Full suite green before `/gsd-verify-work`, per `CLAUDE.md`'s own rule that a red suite blocks deploy

### Wave 0 Gaps
- [ ] `test/fixtures/real-db-snapshot.json` — a real exported backup from Ian, required by REG-13. **Cannot be fabricated; requires Ian's action.**
- [ ] `test/harness.js`'s `names` export array — must gain every new function name (`COLLECTIONS` is data, not a function, but still needs exporting if tests read it directly; `liveOf`, `mergeCollections`, `mergeDB_legacy`/`blank_v0`-style renamed legacy functions, `viewSleep`, `logSleep`/`addSleep`, `removeSleep`, `liveSleep`, `sessionSort`, `cardioKey`, `ideaKey` if any test needs to call them directly) — flagged in the Summary as the single biggest easy-to-miss risk.
- [ ] New test blocks for: gen-mismatch-untouched (named to state the hazard), `mergeDateMap()` explicit-false-vs-absent (currently zero direct coverage per `.planning/codebase/CONCERNS.md`), boot-order regression across schema 1→17, SLEEP-04's structural assertion, SLEEP-06's synthetic replay.
- [ ] `test/app.test.js`'s `populatedDB()` fixture (used by the "every screen still draws" smoke test) should gain a `sleep` array so the new view is exercised with data, not only empty-state.

## Security Domain

`security_enforcement` is `true`, `security_asvs_level: 1`, `security_block_on: "high"` [VERIFIED: .planning/config.json].

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | This phase touches no auth code; Firebase Auth is unchanged |
| V3 Session Management | No | Unchanged |
| V4 Access Control | No | Unchanged; `firestore.rules` already isolates by `request.auth.uid`, untouched by this phase |
| V5 Input Validation | **Yes** | `validateBackup()`'s derived shape prologue must not weaken acceptance criteria relative to the hand-written version (REG-08's "strict parity" requirement is itself the ASVS-relevant control here — a validator that silently accepts what it used to reject is the actual risk, not a missing library) |
| V6 Cryptography | No | Unchanged |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| A derived `validateBackup()` that is structurally complete but semantically shallower than the hand-written original (accepts a malformed backup the old one rejected) | Tampering (a maliciously or accidentally corrupted import reaching app state unchecked) | REG-08's explicit strict-parity requirement; verified by replaying the existing malformed-backup test battery (`test/app.test.js:500-519`) through the derived validator and asserting identical rejection, per `PITFALLS.md` Pitfall 11 |
| New `sleep` fields (`hours`, `quality`, `note`) rendered without escaping | Tampering/Injection (XSS via a crafted `note` field, especially if imported via a hand-edited backup) | Follow the existing `esc()` convention for `note` in element content; per `CLAUDE.md`'s documented gap, `esc()` does not escape `'` and does not cover attribute interpolation at all — if `sleep`'s form ever interpolates a value into an HTML attribute (e.g., a pre-filled `value="${...}"` on an edit field), that specific interpolation needs manual escaping beyond what `esc()` provides, exactly as `CLAUDE.md`'s Conventions section already warns for every other collection |

This phase does not introduce any new attack surface beyond the existing, documented `esc()` gap — it neither widens nor closes it. No new mitigation is required beyond following the existing convention faithfully for the new `sleep` fields.

## Sources

### Primary (HIGH confidence — read directly this session)
- `C:/Users/idbac/Projects/ppl-tracker/index.html` — `KEY`/`SCHEMA` (473-474), `MIGRATIONS` incl. migration 13/15/16/17 comments (480-533), `normalizeDraft`/`normalize`/`load`/`blank` (605-641), soft-delete primitives + `liveX()` family (643-659), `esc()` (836), `PH` icon map incl. `'moon'` (842-, 872), `ph()` helper (894), `TABS`/router (1282-1330), `viewWeight`/`viewPetWeight` (2152-2221), `toggleMobility` (2650), `setLawnLog`/`toggleLawnLog` (3041-3058), `viewData`/`exportData`/`validateBackup`/`importData`/`wipe` (3235-3348), cardio subsystem incl. `cardioUid`/`addCardio`/`removeCardio`/`viewCardio` (3413-3588), `mergeUnion`/key functions/`mergeJournalEntry`/`mergeDateMap`/`mergeDB` (3591-3695), `pushNow`/`schedulePush` (3833-3884), `restoreSnapshot` (3929-3939)
- `C:/Users/idbac/Projects/ppl-tracker/CLAUDE.md` — full file, incident history and conventions
- `C:/Users/idbac/Projects/ppl-tracker/test/harness.js` — full file, incl. the `names` export-list mechanism (97-114) that this research newly flags as a phase risk
- `C:/Users/idbac/Projects/ppl-tracker/test/app.test.js` — sync-merge/migration/validateBackup/smoke-test sections (355-670), `populatedDB()` fixture (538-563), `SCREENS` construction from `TABS` (566-570)
- `C:/Users/idbac/Projects/ppl-tracker/package.json` — confirms zero dependencies
- `C:/Users/idbac/Projects/ppl-tracker/.planning/config.json` — confirms `nyquist_validation: true`, `security_enforcement: true`, all external search providers `false`
- `C:/Users/idbac/Projects/ppl-tracker/.planning/{PROJECT,REQUIREMENTS,ROADMAP,STATE}.md` — scope, requirements, locked decisions
- `C:/Users/idbac/Projects/ppl-tracker/.planning/codebase/{ARCHITECTURE,TESTING,CONCERNS}.md` — codebase map, confirmed still accurate against a direct re-read this session

### Secondary (already committed project-level research, 2026-09-10, itself HIGH confidence and code-grounded)
- `.planning/research/SUMMARY.md`, `.planning/research/ARCHITECTURE.md`, `.planning/research/PITFALLS.md` — this document verifies and extends these; it does not contradict any claim in them. Re-read in full this session; every line-number citation in them that this session re-checked against current `index.html` matched or was off by at most one or two lines (consistent with minor edits since 2026-09-10).

### Tertiary
- None. No web search was performed — `.planning/config.json` disables every external search provider, and this phase's domain (vanilla-JS TDZ mechanics, this repo's own merge code) needs none.

## Metadata

**Confidence breakdown:**
- Standard stack: N/A (zero dependencies, confirmed) — not a meaningful axis for this phase
- Architecture/TDZ placement: HIGH — every line-number claim was read directly this session, not carried from memory or a prior document unchecked
- Registry shape / per-collection oracle table: HIGH — every cell read directly from `index.html` this session
- Test fixture gap: HIGH (confirmed absent, not assumed) — `find`/`ls` run directly against the repo this session
- UI placement recommendation: MEDIUM — the *evidence* (smoke-test coverage, closest structural pattern) is HIGH confidence and verified; the *recommendation itself* is Claude's discretion per the locked decision, so treat it as a strong default, not a mandate
- Pitfalls: HIGH (codebase-specific, inherited from `.planning/research/PITFALLS.md`, itself grounded in this repo's own incident history)

**Research date:** 2026-09-11
**Valid until:** Until this phase's plan is written and executed — this research is scoped to one phase's planning, not a durable reference; re-verify line numbers if execution is delayed and other commits land on `index.html` first.
