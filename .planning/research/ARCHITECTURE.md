# Architecture Research: Declarative Collection Registry (F1)

**Domain:** Single-file, no-build, offline-first PWA — declare-once data-layer registry for a
CRDT-flavoured union-merge sync engine
**Researched:** 2026-09-10
**Confidence:** HIGH (grounded directly in the shipped `index.html`, its incident-history comments,
and the existing `test/harness.js` vm-based test rig; CRDT vocabulary cross-checked against
Kleppmann's local-first essay and standard CRDT literature — see Sources)

This is a subsequent-milestone research pass on a live app. It does not re-derive or challenge
anything already shipped, and it proposes nothing that adds a dependency, a build step, or a file
split — all three are explicitly out of scope in `.planning/PROJECT.md`.

## Standard Architecture

### System Overview — where the registry sits

```
                          index.html (single <script>, top-to-bottom eval)
┌───────────────────────────────────────────────────────────────────────────────┐
│  early consts: KEY, SCHEMA, DEFAULT_HOBBIES…                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │  const COLLECTIONS = { sessions:{...}, weights:{...}, … , sleep:{...} }  │  │ ◄── NEW, F1
│  └─────────────────────────────────────────────────────────────────────────┘  │
│  const MIGRATIONS = { 1: d=>…, …, 18: d=>ensureCollectionDefaults(d) }         │  hand-written,
│                                                                                 │  reads COLLECTIONS,
│                                                                                 │  not derived from it
│  function blank(){ …scalars…, ⤳ derive list/map defaults from COLLECTIONS }   │ ◄── derived
│  function normalize(raw){ …MIGRATIONS loop…, normalizeDraft(d) }              │  unchanged shape
│  let DB = load();   // ← MODULE-EVAL TIME. Everything above this line must    │
│                      //   already be fully initialized data, not TDZ consts.  │
│  ─────────────────────────────────────────────────────────────────────────── │
│  function isLive(x){…}  function touch(x){…}                                  │
│  function liveOf(name){ return (DB[name]||[]).filter(isLive); }               │ ◄── derived engine
│  function liveSessions(){ return liveOf('sessions'); }  …six more, unchanged  │ ◄── thin named wrappers
│  ─────────────────────────────────────────────────────────────────────────── │
│  function validateBackup(raw){ ⤳ shape loop over COLLECTIONS, then           │ ◄── partially derived
│                                    hand-written per-row deep checks }         │
│  ─────────────────────────────────────────────────────────────────────────── │
│  function mergeUnion(...){…}  function mergeDateMap(...){…}   (primitives,    │  unchanged, reused
│                                                                  hand-written) │
│  function mergeCollections(r,l,localNewer,out){ ⤳ loop over COLLECTIONS,     │ ◄── derived dispatch
│                                                     calls the primitives }    │
│  function mergeDB(remote,local,localWins){ …gen check…, out.* scalars…,      │  hand-written frame,
│                                              mergeCollections(...), sort,     │  now thin
│                                              normalizeDraft(out)… }           │
│  ─────────────────────────────────────────────────────────────────────────── │
│  function toMarkdown(){ ⤳ loop over COLLECTIONS, one table per collection }  │ ◄── NEW consumer,
│                                                                                 │     derived
└───────────────────────────────────────────────────────────────────────────────┘
```

Five places read a collection's rules today: `blank()`, `MIGRATIONS`, `mergeDB()`,
`validateBackup()`, `liveSessions()` (and its six siblings). F1 derives **four** of those five —
`blank()`, `mergeDB()`, the `liveX()` family, `validateBackup()` — from `COLLECTIONS`.
`MIGRATIONS` deliberately stays hand-written (see **Anti-Patterns**, "deriving MIGRATIONS").

### Component Responsibilities

| Component | Responsibility | Owns |
|-----------|----------------|------|
| `COLLECTIONS` (new) | The one declaration: which tracked things exist, their shape, identity, sort, merge and soft-delete rules | `kind`, `key`, `sortBy`, `merge`, `soft`, `explicitFalse`, `required` per collection |
| Strategy functions (existing + a few new, all `function` declarations) | The actual merge/identity/sort algorithms | `mergeUnion()`, `mergeDateMap()`, `sessKey`/`cardioKey`/etc. promoted to `function` form, `mergeJournalEntry()` |
| `blank()` (derived) | Build an empty `DB` — scalars hand-written, list/map defaults looped from `COLLECTIONS` | Default shape of a fresh install |
| `mergeCollections()` (new, derived) | Loop `COLLECTIONS`, call the right primitive per collection | The per-collection dispatch that today is 10 hand-typed lines inside `mergeDB()` |
| `mergeDB()` (existing, thinner) | `gen`-based wholesale replace, scalar `Object.assign`, calls `mergeCollections()`, sort invariants, `normalizeDraft()` | Whole-DB merge orchestration — stays hand-written, it is not per-collection |
| `liveOf()` (new) + `liveSessions()`…`liveHobbyLog()` (existing, now one-liners) | Soft-delete read filter | Shared filter logic once; named, grep-able call sites unchanged |
| `validateBackup()` (existing, partially derived) | Shape loop from `COLLECTIONS`, then hand-written per-row deep checks (date regex, numeric `w`, etc.) | Import safety net |
| `MIGRATIONS` (existing, unchanged, may *read* `COLLECTIONS`) | One-time historical transforms, schema-version sequence | How old data becomes today's shape — a different question than "what is today's shape" |
| `toMarkdown()` (new consumer, this milestone) | "Export for Claude" — one Markdown table per live collection | Reads `COLLECTIONS` for names/columns, no second hand-written serialiser |

### What stays hand-written on purpose

- **`MIGRATIONS`** — see Anti-Patterns below.
- **Deep, per-row validation** in `validateBackup()` (date regex, `entries[].sets[]` shape, numeric
  `w`) — `COLLECTIONS` owns *shape* (list vs. map, required vs. optional), not business rules about
  what a valid row looks like. A validation DSL for two array-of-row-types is a solution in search
  of a problem at this scale (10–15 collections, one user).
- **Scalar `DB` fields** (`petName`, `routineMode`, `hobbies`, `productivity`, `lawn`, `wx`,
  `hobbySeedV2`, `draft`) — these aren't collections (no `soft`, no merge-by-key), they're
  single-value settings. `COLLECTIONS` should not try to also become a general `DB`-shape schema;
  that's a bigger, unrequested refactor.
- **`mergeDB()`'s orchestration** — `gen` wholesale-replace, the `Object.assign(blank(), older,
  newer)` scalar pass, sort invariants, `normalizeDraft(out)`. These are whole-DB concerns, not
  per-collection ones; folding them into `COLLECTIONS` would blur the boundary the registry exists
  to draw.
- **The sync transport** (`initSync()`, `runTransaction`, Firebase listeners) — untouched; out of
  scope per `PROJECT.md`.

## The module-eval-time / TDZ constraint (first-class, not a footnote)

This is the single most important placement decision in F1, and the codebase has already suffered
one production boot failure from getting it wrong (the `migrationRan` / `SNAP_KEY` incident,
`index.html:634-639`).

**The rule the codebase already follows, correctly, and that `COLLECTIONS` must follow too:**

> A top-level `const`/`let` initializer runs in source order. Any code path that executes
> synchronously *before* that line has been reached — including a call chain triggered by
> `let DB = load()` at module scope — sees that binding as a **temporal-dead-zone
> `ReferenceError`**, not `undefined`. A `function name(){...}` **declaration**, by contrast, is
> fully hoisted — name *and* body — to the top of its enclosing scope, so it is safe to reference
> from anywhere in that scope, including textually earlier, as long as it is not *called* before
> its own dependencies are ready.

Concretely, in this file:

- `let DB = load()` (`index.html:635`) is the eager trigger. `load()` → `normalize()` → the
  `MIGRATIONS` loop → `blank()` / `normalizeDraft()` all run **synchronously, right then**, at
  module-eval time, before a single further line of the script has executed.
- The existing `MIGRATIONS[13]` comment (`index.html:503-506`) states the rule explicitly: a
  migration entry "must be a PURE literal" because `MIGRATIONS` itself is evaluated during
  `let DB = load()`, "far above" any const declared later — touching one would throw and be
  silently swallowed by the migration loop's `try{}catch(e){}`, which is worse than a crash: it
  **advances `_schema` anyway**, permanently skipping that migration. This exact failure mode is
  what happened to migration 15 (`CLAUDE.md`, "Rules that exist because breaking them cost real
  data").
- `buildExerciseRegistry()` (migration 17) demonstrates the *safe* forward reference: `MIGRATIONS`
  (a `const` object of arrow functions, declared at `index.html:480`) contains
  `17:d=>buildExerciseRegistry(d)` — a reference to a `function` declaration that doesn't textually
  appear until `index.html:533`, *after* `MIGRATIONS`. This works only because
  `buildExerciseRegistry` is a `function` declaration (hoisted), not a `const` arrow. Its own
  comment (`index.html:528-532`) confirms the corollary: it deliberately reads only `PROGRAM`
  (already `const`-declared earlier) and avoids `ACCESSORIES` (declared later), because touching
  the latter would be the same TDZ trap.
- `migrationRan` is a `let`, consumed only, deliberately, at the very bottom of the script
  (`index.html:4125`) rather than right after `let DB = load()`, because `save()` reaches
  `maybeDailySnapshot()` → `snapshotNow()` → `SNAP_KEY`, a `const` declared later
  (`index.html:680`) — calling `save()` any earlier is a TDZ crash that "takes out the entire
  boot" (the comment's own words, `index.html:636-639`).

**What this means for `COLLECTIONS`, stated as placement rules:**

1. **`const COLLECTIONS = {...}` must be declared textually before `let DB = load()`** —
   concretely, next to `SCHEMA`/`KEY`, immediately before `MIGRATIONS` (around today's
   `index.html:479`). Not "somewhere in the file" — *before the first line that can read it*, same
   as `MIGRATIONS` already is.
2. **Every value inside the `COLLECTIONS` object literal must be one of:** a string, a boolean, a
   number, or a reference to a `function` **declaration** (never a `const` arrow, never another
   not-yet-initialized `const`). This is the one rule that makes the object safe to read from
   `blank()`/`MIGRATIONS` at eval time regardless of where in the file the referenced functions
   physically live. It also means the handful of existing composite-key arrow consts
   (`sessKey`, `todoKey`, `hobbyKey`, `index.html:3618-3620`, plus cardio's and ideas' inline
   arrows in `mergeDB()`) should be **promoted from `const name = x=>…` to `function name(x){…}`**
   as part of moving them into `COLLECTIONS` — today they're safe only because nothing calls them
   before their declaration line runs; once they're referenced from an object that must exist at
   `blank()`-time, that accident of ordering stops being reliable and the hoisting guarantee is
   what should carry it instead.
3. **`blank()` only needs the cheap half of the spec at eval time** — `kind` (list → `[]`, map →
   `{}`) and nothing else. Keep `blank()`'s derived loop reading *only* `spec.kind`, not
   `spec.key`/`spec.sortBy`/`spec.merge` — those are read later, by `mergeCollections()`,
   `liveOf()`, and `validateBackup()`, none of which run during module eval (they run on user
   action, sync events, or import — always after the whole script has finished evaluating, so
   every `const` in the file is initialized by then, TDZ is not a concern for them at all). This
   narrows the "must be eval-time-safe" surface to the smallest possible piece of the registry,
   rather than making the whole object earn eval-time safety for consumers that don't need it.
4. **Nothing about `COLLECTIONS` needs deferred/lazy computation.** Because rule 2 restricts every
   value to primitives or hoisted function references, the object can be a single, eagerly-evaluated
   literal — there's no case here for `function getCollections(){ return {...}; }` computed on
   first call. Reach for that pattern only if a future collection's default value itself needs to
   be *computed* from something that must stay declared later for unrelated readability reasons
   (e.g., a large lookup table) — in that case wrap the computation in a `function` declaration
   (`function defaultThingEntry(){ return {...}; }`) and have `blank()` call it, rather than
   inlining a computed expression into the `COLLECTIONS` literal itself. Not needed for the current
   ten collections or for `sleep`; noted here only as the escape hatch for collection twelve-plus.
5. **`MIGRATIONS` may *read* `COLLECTIONS` safely**, because `MIGRATIONS` is declared *after*
   `COLLECTIONS` in the file (rule 1 already guarantees this) — so a migration entry doing
   `COLLECTIONS[name].kind==='list' ? [] : {}` is exactly as safe as migration 17 reading `PROGRAM`.
   This is what makes the "one line" extension promise real (see **Extension Points**).

**Verification, not just placement.** Because a TDZ failure here is silent-then-catastrophic
(swallowed by the migration `try/catch`, `_schema` still advances), place-and-hope is not enough.
Add one boot-order regression test to `test/app.test.js` using the existing `harness.js`
(`loadApp()` already evaluates the whole script in a `vm` context against a *seeded* localStorage
blob, `harness.js:39-42` — exactly the path that exercises `MIGRATIONS`): assert `loadApp(APP_PATH,
seed)` does not throw for every schema version from 1 through current, and assert
`api.DB[name]` exists and has the right `kind`'s shape for every `name` in `COLLECTIONS` after boot.
That test is the mechanical proof that placement rule 1 held, on every future edit — including ones
made by an agent with no debugger attached, which is exactly the failure mode this constraint
exists to catch.

## Registry Shape

### What belongs in the declaration vs. what stays in code

| Belongs in `COLLECTIONS` | Stays in hand-written code |
|---|---|
| `kind` (`'list'` \| `'map'`) | Deep per-row shape validation |
| `key` — string field name, or a `function` reference for composite keys | The merge/identity **algorithms** themselves (`mergeUnion`, `mergeDateMap`, `mergeJournalEntry`) |
| `sortBy` — string field name, or a `function` reference for multi-key sorts | Whole-DB orchestration (`gen` check, scalar assign, sort-invariant ordering) |
| `merge` — a named strategy string (`'union-by-key'`, `'replace-whole'`, `'line-union'`) | Import/export UI, confirm dialogs, toasts |
| `soft` (boolean — participates in soft-delete / `liveX()`) | The soft-delete primitives (`isLive`, `touch`) |
| `explicitFalse` (boolean — documents the "absence ≠ off" rule; also drives a guard, see Pitfalls below) | Sync transport |
| `required` (boolean — `validateBackup()` refuses a backup missing this collection entirely) | — |

### Inline functions vs. named strategies referenced by string — the actual trade-off

`PROJECT.md`'s own sketch already leans toward strings for the common fields (`key:'id'`,
`sortBy:'date'`, and implicitly a `merge` string for map collections). That instinct is right, and
it's worth being explicit about *why*, because "just use strings" and "just use functions" are both
defensible in the abstract — the deciding factor here is the app's actual incident history, not a
general readability argument.

**Recommendation: strings for the common case, a named `function` reference as the explicit escape
hatch for anything that doesn't fit a single field name.** Concretely:

- `key: 'id'` or `key: 'date'` (string) covers 8 of the current 10 collections cleanly. A generic
  `keyOf(spec, row)` resolves `typeof spec.key==='string' ? row[spec.key] : spec.key(row)`.
- `key: cardioKey` (a hoisted `function cardioKey(c){ return c.id || (c.date+'|'+c.type+'|'+c.minutes); }`)
  covers the composite-fallback cases (`cardio`, `ideas`, `todos`, `hobbyLog`) — these already exist
  as `sessKey`/`todoKey`/`hobbyKey` today, just promoted to `function` declarations per the TDZ rule
  above.
- `merge: 'union-by-key'` / `'replace-whole'` / `'line-union'` resolve through a small internal
  `STRATEGIES` table of hoisted functions — three entries, not eleven bespoke ones.

**Why strings-for-the-common-case wins here, specifically:** the actual production bug this
milestone exists to prevent (`mobilityLog` forgot its merge rule and read absence as "off") was not
caused by choosing the wrong *implementation* — `mergeDateMap(r, l, newer, null)` already existed
and was correct. It was caused by a new collection quietly **not calling it**, because there was no
place a reviewer or an agent could look and see "collections must pick one of N known merge
strategies." A named-string enum makes that omission visible and enumerable — `grep "merge:"
index.html` lists every collection's choice on one screen, and a fourth, never-seen string value is
an obvious red flag in review. An inline bespoke arrow function per collection reintroduces exactly
the original failure mode at a smaller radius: one more unreviewed snowflake, just typed inside
`COLLECTIONS` instead of inside `mergeDB()`. The string-enum approach doesn't just describe the
existing three strategies — it makes "invent a fourth one" a conscious, visible act instead of a
silent default.

**Trade-off, honestly stated:** the string+lookup indirection costs one extra hop when reading the
code (`COLLECTIONS.lawnLog.merge` → `'replace-whole'` → `STRATEGIES['replace-whole']` → the actual
function) versus an inline arrow you could read in place. For an 11-collection registry read by
humans and by agents doing text search, that hop is cheap — `grep -n "'replace-whole'"` still finds
every use in one command, and `STRATEGIES` itself is a five-line table sitting right next to
`COLLECTIONS`. It would stop being worth it well past collection twenty or so, where a growing
number of one-off strategies would make the enum itself the unreadable part — not a concern at this
app's actual and plausible scale (see Scaling Considerations).

**Field-level validators do not belong in `COLLECTIONS` at all** (see the table above) — resist the
urge to add a `validate: fn` per collection. `validateBackup()`'s deep checks (date regex, numeric
`w`) are collection-specific business rules with no shared shape across collections; a declarative
schema-language for two structurally different array-of-row types is speculative generality this
app has no use for yet, and the milestone's own Out of Scope list already rejects "anything not
already producing incidents."

## Derived Consumers — keep the derivation obvious, not clever

The instruction to keep derivation "obvious rather than clever" rules out one tempting pattern
outright: **do not generate named functions dynamically** (e.g., looping over `COLLECTIONS` and
assigning `window['live'+cap(name)] = () => …`). That would shrink the line count, but it breaks the
thing this file is optimized for — a human or an agent with no debugger, doing a text search.
`grep -n "function liveSessions"` must keep finding a real declaration; a name assembled at runtime
from string concatenation is invisible to that search and produces an anonymous stack frame on
error.

**The pattern to use instead, everywhere:** one small, honestly-named `function` holds the shared
logic; every existing call site becomes a **thin, still-textually-present, still individually named
one-liner that delegates to it.** This preserves every existing call site (`liveSessions()`,
`liveWeights()`, …) with zero call-site migration, while collapsing the actual logic to one place.

```js
// blank(): scalars hand-written, list/map defaults derived
function blank(){
  const out = { _schema:SCHEMA, gen:0, draft:null, unit:'lb', petName:'Freddie',
                routineMode:'4day', hobbies:HOBBIES_DEFAULT.slice(),
                productivity:PRODUCTIVITY_DEFAULT.slice(), lawn:null, wx:null,
                hobbySeedV2:true, exercises:[] };
  for(const name in COLLECTIONS) out[name] = COLLECTIONS[name].kind==='list' ? [] : {};
  return out;
}

// liveX(): shared engine, thin named wrappers unchanged at every call site
function liveOf(name){ return (DB[name]||[]).filter(isLive); }
function liveSessions(){ return liveOf('sessions'); }
function liveWeights(){ return liveOf('weights'); }
// … five more, unchanged shape, each still a real, grep-able declaration

// mergeDB(): dispatch loop extracted, orchestration frame stays hand-written
function mergeCollections(r, l, localNewer, out){
  for(const name in COLLECTIONS){
    const spec = COLLECTIONS[name];
    if(spec.kind==='list'){
      out[name] = mergeUnion(r[name], l[name], k=>keyOf(spec,k), localNewer);
      if(spec.sortBy) out[name].sort(bySortSpec(spec.sortBy));
    } else {
      const inner = spec.merge==='line-union' ? mergeJournalEntry : null;
      out[name] = mergeDateMap(r[name], l[name], localNewer, inner);
    }
  }
}
function mergeDB(remote, local, localWins){
  // … unchanged: gen check, Object.assign(blank(), older, newer) for scalars …
  mergeCollections(r, l, localNewer, out);
  // … unchanged: sort invariants for sessions (composite key, stays hand-written),
  //    normalizeDraft(out), _schema/updatedAt, delete out.wx …
}

// validateBackup(): shape loop derived, deep checks stay hand-written
function validateBackup(raw){
  if(!raw || typeof raw!=='object' || Array.isArray(raw))
    return 'This file isn’t a backup — it doesn’t contain a data object.';
  for(const name in COLLECTIONS){
    const spec = COLLECTIONS[name];
    if(spec.required && !Array.isArray(raw[name]))
      return `This backup is missing its ${name} list, so it’s incomplete or truncated.`;
    if(!spec.required && raw[name]!=null){
      const ok = spec.kind==='list' ? Array.isArray(raw[name])
                                     : (typeof raw[name]==='object' && !Array.isArray(raw[name]));
      if(!ok) return `The ${name} section is damaged${spec.kind==='list'?' (expected a list)':''}.`;
    }
  }
  // … unchanged: schema-version check, per-row deep checks for sessions/weights …
}
```

`sessions`' sort (`date`, then `endedAt` as a tiebreaker) is a two-field composite that doesn't fit
a single `sortBy: 'date'` string cleanly — give it `sortBy: sessionSort` (a hoisted function
reference), same escape hatch as composite keys. Don't force every collection through the string
form; the string form is the *common* case, not the *only* case.

## Merge Semantics as Data — CRDT vocabulary as prior art, not a library to adopt

**Nothing here is a recommendation to add Automerge, Yjs, RxDB, PouchDB, or any CRDT library as a
dependency.** The app has zero dependencies by design (`CLAUDE.md:3-4`) and F1 does not change that.
The value of this literature for F1 is purely **vocabulary** — precise, well-established names for
merge behaviors this app already implements by hand, so `COLLECTIONS.merge` strings can borrow
established terms instead of inventing project-local jargon, and so the registry's comments can cite
*why* a rule is shaped the way it is in language a future reader (or an AI agent) can look up.

| This app's existing behavior | CRDT/local-first term | Where it comes from |
|---|---|---|
| `mergeUnion()` — per-record union by key, collision resolved by `mtime`, delete is a flagged row (`deletedAt`) that survives the union rather than a spliced-out one | **Add-wins set with per-element tombstones**, resolved as an implicit **last-writer-wins register per element** (`mtime` = the writer-wins clock) | OR-Set (observed-remove set) terminology; tombstones as the standard mechanism to make a remove durable against a concurrent add arriving later — used by Automerge's list/text CRDTs and Yjs's deletion model |
| `mergeDateMap(..., null)` for `mobilityLog`/`lawnLog` — the **whole inner object**, not individual keys, is replaced wholesale from the newer side | **Last-writer-wins register**, but registered at the *whole-value* granularity (the day's object), not per-field | LWW-Register is the standard CRDT term for "newest write wins, whole value"; Automerge and Yjs's `Y.Map` both default to per-*key* LWW — this app's deliberate choice to register at the *day* granularity instead of the *field* granularity is the non-obvious part, and is exactly what the `explicitFalse` rule exists to protect (see below) |
| `mergeDateMap(..., mergeJournalEntry)` for `journal` — line-level set union of a free-text field | A **custom CRDT merge function** operating at a finer grain than the register default | Analogous to a custom "reduce" merge in Automerge's `applyPatch`/custom conflict-resolution hooks, or a CouchDB/PouchDB `bulkDocs` conflict-resolution callback that inspects and combines both revisions rather than picking one |
| Storing an explicit `false` instead of deleting a key (`CLAUDE.md`, "Absence never means off") | Distinguishing **explicit deletion (tombstone) from mere absence** | Kleppmann's local-first essay and Automerge's design both stress that CRDTs must encode "this was intentionally removed" as data (a tombstone), because a merge cannot distinguish "never existed on this replica" from "existed and was removed here" without one — that's the exact bug `mobilityLog` had |
| `gen` counter forcing wholesale replace on Erase-all / Import→Replace | Escaping the CRDT's own merge-forever guarantee via an explicit **generation/epoch marker** | Comparable to a version-vector reset or an explicit "supersede everything before this point" epoch, used when the desired semantics are genuinely "replace," not "merge" — CRDTs proper don't have a native way to say this, which is why real local-first systems (including this one) special-case it outside the merge function |
| `localWins` tie-break in `mergeDB()` | Deterministic **tie-breaking rule** on equal logical clocks | Standard CRDT LWW-register designs need a deterministic tiebreaker (commonly actor/replica ID order) when timestamps are equal; this app uses "which side is local" as its tiebreaker instead, which is sufficient for a two-device, single-user system and is *not* claiming general N-way CRDT correctness |
| Firestore `runTransaction()` re-read + `mergeDB()` | Server acting as a **merge point**, not a source of truth | Distinct from CouchDB/PouchDB's model, where the *server* stores conflicting revisions and leaves resolution to the client reading a `_conflicts` array — this app resolves eagerly, inside the transaction, before anything is persisted, which is closer to Automerge/Yjs's model of merge-on-receive than to CouchDB's model of merge-on-read |

**Naming the `COLLECTIONS.merge` strategy strings from this table**, rather than from scratch, gives
future collections (and future readers) a vocabulary that means the same thing here as it does in
the literature: `'union-by-key'` (add-wins set + per-element LWW), `'replace-whole'` (whole-value
LWW register), `'line-union'` (custom merge). A collection twelve that needs a fourth behavior
should be describable in this same vocabulary before it's added — if it can't be, that's a signal
the new behavior needs its own design conversation, not a quiet fourth string.

## Incremental Migration — strangler fig, one consumer at a time, shippable at every commit

The constraint that matters most here isn't technical difficulty — every one of the four
derivations above is small — it's that **`npm test` must stay green and the app must stay deployable
after every single commit** (`CLAUDE.md:8-16`, `PROJECT.md` constraints). That rules out a branch
that touches all four consumers at once and lands as one commit; five small, independently
shippable commits (six, counting the pure-declaration step) is the right shape, and it matches how
`test/harness.js` already lets you prove parity before deleting anything.

| Step | What ships | Risk | How to prove parity before deleting the old code |
|---|---|---|---|
| 0 | `const COLLECTIONS = {...}` added near `SCHEMA`/`KEY`. **Nothing reads it yet.** Pure dead data. | None — no behavior changes. | N/A — nothing to compare yet. This step exists purely to get the placement (see TDZ section) right in isolation, reviewed on its own. |
| 1 | `blank()` derives its list/map fields from `COLLECTIONS`; scalar fields stay hand-written. | Low — `blank()` is pure, no external inputs. | Golden test: `JSON.stringify(blank())` before the change vs. after, byte-identical. Trivial with `harness.js`'s existing `loadApp()`. |
| 2 | `liveOf()` extracted; all seven `liveX()` functions become one-line delegates. | Low — each old body and the shared body are structurally identical (`(DB[name]\|\|[]).filter(isLive)`). | Differential test: seed a fixture `DB` with live and soft-deleted rows in every collection, call every `liveX()` before and after, `deepEqual` the arrays. |
| 3 | `validateBackup()`'s shape-checking prologue derives from `COLLECTIONS`; per-row deep checks untouched. | Medium — error *strings* are user-facing; must match exactly, not just "reject/accept" the same way. | Differential test over a battery of recorded backup fixtures (valid; missing `sessions`; damaged `mobilityLog`; wrong type on `todos`; etc. — the existing 226-check suite likely already has several of these as fixtures per `harness.js`'s exported `validateBackup` name) asserting the returned string (or `null`) is identical before/after, not just its truthiness. |
| 4 | `mergeCollections()` extracted from `mergeDB()`; the per-collection block of ~10 hand-typed lines becomes a loop. **Highest risk — this is the function named in the incident history.** | High. | Run old and new **side by side** for one commit: rename the current body to `mergeDB_legacy`, add `mergeDB` calling `mergeCollections()`, add a differential test that runs both over a battery of recorded merge fixtures — stale-device union, `gen`-bump wholesale replace, `lawnLog` explicit-false toggle, `journal` line-union, `localWins` tie — asserting `deepEqual(mergeDB_legacy(a,b,w), mergeDB(a,b,w))` for every fixture. Only delete `mergeDB_legacy` once this has run clean through a normal usage cycle (a few real days, one deploy) — not just once in CI. |
| 5 | Delete `mergeDB_legacy` and any other temporary side-by-side scaffolding from step 4. Add the one boot-order regression test described in the TDZ section. | Low — this step is pure cleanup once step 4 has proven out. | The differential tests from steps 1–4 graduate into the permanent suite (they're good regression coverage regardless), rather than being thrown away. |

**Why this order.** `blank()` first because it's the only one of the four with zero external
inputs — the cheapest possible proof of the derivation pattern before applying it anywhere
higher-stakes. `liveOf()` second for the same reason (pure, read-only, no merge logic). `validateBackup()`
third because it's read-only but has user-facing string output, raising the bar on what "parity"
means without yet touching write/merge logic. `mergeDB()` last and alone, on its own commit(s), with
temporary side-by-side old/new comparison, because it's the one named directly in the incident
history and the one whose failure mode (a stale device silently winning) is not visible in a quick
smoke test — it only shows up over days of real cross-device use. Doing it last means the registry
pattern itself is already proven three times over by the time the highest-risk consumer touches it.

This is a **strangler-fig migration** at the level of individual consumers, not of the file: each
step wraps/replaces one hand-written function with a thin derived one while its neighbors and every
external call site stay untouched, and the old implementation is deleted only after differential
testing proves the new one produces byte-identical output over recorded real fixtures — never
deleted first, never deleted on faith.

## Extension Points — what collection twelve and beyond needs

The acceptance test for F1 is adding `sleep` in one line (`PROJECT.md`, Key Decisions:
`{ kind:'list', key:'id', soft:true, sortBy:'date' }`). For that to actually be one line — and to
stay one line for the next tracker, and the one after that — the registry must make these four
things true simultaneously:

1. **Adding an entry to `COLLECTIONS` is sufficient for `blank()`, `mergeDB()`, `liveX()`, and
   `validateBackup()` to pick it up with no further edits** — which is exactly what the derivation
   in the previous sections gives, *provided* the new collection's rules fit the existing three
   `merge` strategies and the existing `key`/`sortBy` string-or-function convention. `sleep` does
   (it's `list`/`id`/`soft`/`sortBy:'date'`, structurally identical to `weights`).
2. **A generic `liveSleep()` still needs its own one-line wrapper** (`function liveSleep(){ return
   liveOf('sleep'); }`) for views to call — the registry doesn't eliminate the need for a named,
   grep-able call site per collection, it eliminates the need for that call site to contain any
   *logic*. This is a deliberate one extra line per collection, in exchange for every one of those
   lines being identical and therefore unreviewable-wrong.
3. **`MIGRATIONS` still needs one new entry**, because `COLLECTIONS` doesn't derive `MIGRATIONS`
   (see Anti-Patterns) — but that entry can now be a single call to a shared helper:
   ```js
   // Safe to read COLLECTIONS here: MIGRATIONS is declared after COLLECTIONS (see TDZ section).
   function ensureCollectionDefaults(d){
     for(const name in COLLECTIONS) if(d[name]==null) d[name] = COLLECTIONS[name].kind==='list' ? [] : {};
     return d;
   }
   // …
   18: d => ensureCollectionDefaults(d),
   ```
   which stays correct for every future collection without edits, as long as its default is really
   just "empty list" or "empty map" — a collection whose sane default is something else (a
   pre-seeded map, say) still needs a bespoke migration line, same as today.
4. **`toMarkdown()` (this milestone's export) needs a per-collection column/format description** —
   the simplest version is `columns: ['date','type','minutes']` (an array of field names) for
   flat-row collections, with an escape hatch (`format: sessionRows` — a hoisted function reference,
   same convention as `key`/`sortBy`) for anything with nested shape (`sessions`' `entries[].sets[]`).
   Don't try to make every collection's export declarative; `sessions` almost certainly needs the
   escape hatch, and that's fine — the win is that adding `sleep`'s export needs a `columns` array,
   not a new hand-written serialiser function.

**What the registry does *not* need to anticipate:** multi-field composite delete reasons, per-field
merge policies within a list row, conflict *surfacing* to the user (this app resolves silently,
by design, per the sync anti-pattern write-up), or anything resembling a general ORM. Those would
be solving problems this app doesn't have; adding them now would be exactly the kind of "just in
case" complexity `PROJECT.md`'s Out of Scope section already rejects elsewhere.

## Anti-Patterns

### Anti-Pattern: Deriving `MIGRATIONS` from `COLLECTIONS`

**What it would look like:** trying to generate migration entries from the registry, on the theory
that "one declaration should drive all five places."

**Why it's wrong:** `COLLECTIONS` describes the *current* shape of a collection. `MIGRATIONS`
describes a *sequence of historical transformations* — including ones, like the goblet-squat rename
(migration 15/16) or the exercise-registry build (migration 17), that have nothing to do with a
collection's steady-state shape and everything to do with one-off content repair. These are
different questions with different lifecycles: `COLLECTIONS` changes when a tracker's *rules*
change; `MIGRATIONS` grows by exactly one entry per schema bump, forever, and old entries are never
edited once shipped. Trying to make one drive the other would either constrain future migrations to
whatever shape the registry anticipated (it can't anticipate a rename), or bloat the registry with
one-time-use fields that only matter for a single historical migration.

**Do this instead:** keep `MIGRATIONS` hand-written and sequential, exactly as it is today. Let it
*read* `COLLECTIONS` where convenient (`ensureCollectionDefaults()`, above) — that's a one-way
dependency, registry → migration, never the reverse.

### Anti-Pattern: Dynamically-named derived functions

**What it would look like:** `COLLECTION_NAMES.forEach(name => { window['live'+cap(name)] = () =>
liveOf(name); })`, or similar metaprogramming to shrink the `liveX()` family to zero hand-written
lines.

**Why it's wrong:** it optimizes for line count at the direct expense of the thing this codebase has
explicitly prioritized — being readable by a human or an agent doing a text search with no debugger
attached. A dynamically-assigned function has no textual declaration to find, produces an anonymous
or unhelpful stack frame on a thrown error inside it, and can't be jumped-to by any editor's
go-to-definition. The five production incidents this milestone exists to prevent were all *silent*
failures; this pattern trades one class of silent failure (a forgotten edit) for another (an
un-findable one).

**Do this instead:** the thin-wrapper-delegates-to-shared-engine pattern used throughout this
document — every call site stays a real, named, textually-present one-liner.

### Anti-Pattern: A validation DSL for `validateBackup()`

**What it would look like:** `COLLECTIONS.sessions.validate = { date: /^\d{4}-\d{2}-\d{2}$/,
entries: { sets: { w: 'number-like' } } }` and a generic schema-walker to interpret it.

**Why it's wrong:** two structurally different row shapes (`sessions`' nested `entries[].sets[]` vs.
everything else's flat rows) do not share enough structure to make a general schema language pay for
itself, and a schema-interpreter is *more* code to read for a human/agent than the current
straight-line `if` checks — the opposite of the "obvious, not clever" goal. This is the same
speculative-generality trap the project's own Out of Scope list warns against elsewhere.

**Do this instead:** keep per-row deep validation hand-written in `validateBackup()`, as detailed in
the Registry Shape section's boundary table. Only the shape prologue (list vs. map, required vs.
optional) is worth deriving.

### Anti-Pattern: Overwrite-instead-of-merge, generalized incorrectly to collections

**What it would look like:** a future collection's `merge` strategy implemented as "keep whichever
side has more rows" or "prefer the side with the higher `updatedAt`" applied wholesale, instead of
per-record `mtime`.

**Why it's wrong:** this is the exact 2026-07-25 incident (`CLAUDE.md:20-23`) at the per-collection
level instead of the whole-DB level — "more data wins" and "newer wins" are both wrong for the same
reason: a legitimate edit can *remove* data (a set deleted, a day un-toggled), and a naive
"bigger/newer wins" rule would resurrect it.

**Do this instead:** every list collection's `merge` strategy is `'union-by-key'` (per-record
`mtime`, never whole-array comparison); every map collection is `'replace-whole'` or `'line-union'`,
never "prefer the array with more keys." This is already correct in the current hand-written code;
the anti-pattern risk is specifically in a *future* collection's author reaching for something that
sounds reasonable in isolation but reintroduces the original bug.

## Scaling Considerations (collection count, not traffic — single device, single user)

| Collection count | Registry shape adjustments |
|---|---|
| 10 (today) → ~15 (`sleep` plus a few more plausible trackers, matching this app's actual history of absorbing one new tracker every few weeks) | No change needed. Three `merge` strategies, string `key`/`sortBy` for the common case, function escape hatch for composites — all comfortably readable in one screen of `COLLECTIONS`. |
| ~20+ | `toMarkdown()`'s output and the CLAUDE.md "adding a tracked thing" checklist (F3) start to matter more than the registry itself — worth revisiting whether every collection still belongs in one flat Markdown export, or whether grouping (workout-related / health-related / home-related) helps the human reading it. Not a `COLLECTIONS` shape change. |
| 30+ (very unlikely given 47 days of history producing 10) | If a genuinely new `merge` strategy is needed at this point, that's a real design decision, not a shape problem — add a fourth named strategy deliberately, don't reach for inline bespoke functions per collection (see Registry Shape trade-off discussion). |

This app has produced roughly one new collection every 4–5 days of real use over its first 47 days.
Even continuing that pace for a year would land around 15–20 collections — well inside the "no
change needed" band above. Designing for hundreds of collections would be solving a problem this
app's own usage data says won't occur.

## Suggested Build Order (informs roadmap phase structure)

The milestone's phase order is already fixed: **F1 registry → Markdown export → CLAUDE.md recipe →
device-local draft → event delegation → `.gitattributes`.** This section checks that order against
the data-flow dependencies surfaced above, rather than proposing a different one.

- **F1 (registry) must be first** — every other in-scope item either depends on it directly
  (Markdown export, CLAUDE.md recipe) or is independent of it (the rest). Confirmed correct.
- **Markdown export depends on F1**, exactly as ordered — `toMarkdown()` reads `COLLECTIONS` for
  names, `kind`, and (new) `columns`/`format`. It cannot be built first without either duplicating
  the collection list by hand (the "second hand-written serialiser" `PROJECT.md` explicitly rejects)
  or being rewritten once F1 lands. Confirmed correct, and confirms the `columns`/`format` extension
  point above needs to exist *by the time this phase starts*, not be retrofitted — worth adding to
  F1's own scope rather than discovering it mid-way through the export phase.
- **The CLAUDE.md recipe (F3) depends on F1 (and benefits from the export existing)** — it documents
  "add one line to `COLLECTIONS`, one line to `MIGRATIONS`, one line for the `liveX()` wrapper,
  optionally one line for `columns`" — a recipe that doesn't exist to write accurately until the
  registry's actual final shape (including the export's `columns` field) is settled. Confirmed
  correct to sequence after both.
- **Device-local draft has no dependency on the registry, in either direction — worth stating
  explicitly, since it's easy to assume otherwise.** `draft` is a *scalar* `DB` field (see the
  "stays hand-written" table above), not a `COLLECTIONS` entry — it has no `soft`, no merge-by-key,
  no sort. Making it device-local means removing it from what `save()`/`syncToCloud()` push, which
  touches the sync layer, not `mergeDB()`'s per-collection loop. It can land before or after F1
  without either phase touching the other's code. No reordering implied; noting this only so the
  roadmap doesn't accidentally serialize two independent phases under a false dependency.
- **Event delegation and `.gitattributes` are both fully independent of the registry** — pure UI
  event-wiring and a repo-metadata commit respectively. Their position at the end of the order is a
  sequencing choice about risk and diff size (`.gitattributes` alone produces a 4,131-line diff per
  `PROJECT.md`'s own note), not a data-flow dependency. No concern from this research's perspective.

**No reordering is suggested.** The one addition this research surfaces for phase *scope* rather than
*order*: F1's own acceptance criteria should include the `columns`/`format` extension point on
`COLLECTIONS` (even if `toMarkdown()` itself isn't built until the next phase), so the Markdown
export phase is purely "write `toMarkdown()`," not "extend the registry and then write `toMarkdown()`."

## Sources

- `C:/Users/idbac/Projects/ppl-tracker/index.html` — read directly: `KEY`/`SCHEMA` (473-474),
  `MIGRATIONS` (480-522) including the migration-13 "pure literal" TDZ comment (503-506) and the
  migration-17/`buildExerciseRegistry` hoisting-safe forward reference (521, 528-579),
  `normalizeDraft`/`normalize`/`load`/`blank` (605-641) including the `migrationRan`/`SNAP_KEY`
  deferred-consumption comment (634-639), soft-delete primitives and `liveX()` family (643-659),
  `validateBackup` (3300-3325), `mergeUnion`/`mergeDateMap`/`mergeJournalEntry`/key functions
  (3597-3641), `mergeDB` (3644-3695).
- `C:/Users/idbac/Projects/ppl-tracker/test/harness.js` — the existing `vm`-context test rig
  (`loadApp()`, seeded-localStorage boot path, exported-function-name list) that the golden/
  differential tests proposed above should be built on, not a new rig.
- `C:/Users/idbac/Projects/ppl-tracker/.planning/PROJECT.md` — milestone scope, out-of-scope list,
  the `COLLECTIONS` sketch, and the `sleep` acceptance-test decision.
- `C:/Users/idbac/Projects/ppl-tracker/CLAUDE.md` — incident history (2026-07-25 blind-write,
  migration 15 silent revert, `mobilityLog` absence-as-off bug).
- [Local-first software: you own your data, in spite of the cloud](https://www.inkandswitch.com/essay/local-first/) — Kleppmann et al., Ink & Switch / Onward! 2019. Source of the "seven ideals" framing and the argument for CRDTs as a local-first foundation; cited here purely for vocabulary (tombstones, explicit-deletion-vs-absence), not as a library recommendation.
- [Local-first software — Wikipedia](https://en.wikipedia.org/wiki/%22Local-first%22_software) — secondary summary, used to cross-check the essay's framing.
- CRDT terminology (LWW-Register, tombstone, OR-Set/observed-remove, add-wins) — standard distributed-systems literature, cross-checked via general CRDT survey material; used only to name this app's existing hand-rolled behaviors precisely, not to propose adopting Automerge, Yjs, RxDB, or PouchDB as dependencies (all explicitly out of scope per the single-file, zero-dependency constraint in `CLAUDE.md`/`PROJECT.md`).

---
*Architecture research for: ppl-tracker F1 (declarative collection registry)*
*Researched: 2026-09-10*
