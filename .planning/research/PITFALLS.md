# Pitfalls Research

**Domain:** Refactoring a live, sync-backed data layer (offline-first PWA, union-merge Firestore sync) onto a declarative collection registry — without losing data
**Researched:** 2026-09-10
**Confidence:** HIGH for codebase-specific findings (verified directly against `index.html`, `CLAUDE.md`, `.planning/codebase/CONCERNS.md` on this repo) · MEDIUM for general offline-first/CRDT/CSP/event-delegation findings (cross-checked against multiple independent sources, no project-specific verification possible)

**How to read this file.** Every pitfall below is ranked by **blast radius**, not by how interesting it is. "Critical" pitfalls can silently destroy, orphan, duplicate, or resurrect logged training data — the one thing this project's Core Value says must never happen. "Moderate" pitfalls degrade safety nets (weaker validation, weaker test coverage) without destroying data by themselves. "Minor" pitfalls are annoying — broken styling, a console warning — and are called out as explicitly *not* data-destroying so they don't compete for attention with the ones that are.

Every pitfall in this file is *silent by design*: it passes `npm test`, passes code review, and shows nothing on screen. That is deliberate — this app's entire incident history (`mobilityLog` absence-as-off, Migration 15's silent revert, the missed soft-delete filter, the synced-`draft` crash, the `weather` cache stealing "newest") is one bug class repeated five times: **the rule for a collection existed only in a person's head, not in a place code could check it against.** The four in-scope changes are a bet that a declarative registry closes that class for good. This file is about the ways that bet can go wrong *while looking like it worked*.

---

## Critical Pitfalls

Ranked 1 (highest blast radius) to 10. All are silent: green tests, clean review, damage surfaces weeks later on a random two-device sync.

### Pitfall 1: The `gen`-mismatch wholesale-replace escape hatch gets lost inside the generic per-collection loop

**Blast radius:** Catastrophic — silently disables "Erase all data" and Import→Replace, the two operations that exist specifically to let the union merge be bypassed on purpose. This is not hypothetical: it already happened once, in exactly this codebase, before the `gen` counter existed (`CLAUDE.md`, `mergeDB` header comment: "a higher generation replaces everything... [without it] both of those actions silently did nothing").

**What goes wrong:**
`mergeDB(remote, local, localWins)` currently short-circuits *before* touching any collection: if `rG !== lG` (generation counters differ), it returns a wholesale replace of the higher-gen side and returns immediately — the per-collection union logic never runs. When F1 turns the six-plus hand-written `out.sessions = mergeUnion(...)`, `out.journal = mergeDateMap(...)` lines into a loop over a `COLLECTIONS` declaration, it is natural — and wrong — to fold the `gen` check *into* that loop, or to have the loop run unconditionally and treat the gen-mismatch branch as "just another case." If the gen short-circuit stops happening *before* any per-collection merging, Erase All Data and Import→Replace silently degrade back into ordinary unions: every row the user just tried to erase or replace comes straight back from the other side on the next sync.

**Why it happens:** The gen check is structurally *outside* the per-collection concern the declarative refactor is trying to centralize, so it's the one piece of `mergeDB` that has nowhere obvious to live in a `COLLECTIONS`-driven design. A refactor that mechanically converts "the six/seven output assignments" into "a loop over declared collections" only touches the *body* of the function — but the gen check is a *precondition* on running that body at all, and preconditions are exactly what mechanical extraction misses.

**How to avoid:** Keep the gen-mismatch branch as an explicit, untouched early return at the top of `mergeDB`, written in prose in the code as "does not participate in the declarative merge — do not refactor into `COLLECTIONS`." Do not let the `COLLECTIONS`-driven loop become reachable when `rG !== lG`. Add a test whose name states the hazard, not just the behavior: `"derived mergeDB still short-circuits wholesale-replace on gen mismatch"` — assert that a DB with rows the other side doesn't have (simulating a fresh Erase) produces zero unioned survivors from the losing side.

**Warning signs:** Any diff where `mergeDB`'s gen-mismatch branch and the per-collection loop share more code than "compute the winner"; a diff where `blank()` (needed to satisfy `Object.assign({}, blank(), ...)` on the wholesale-replace path) is itself derived from `COLLECTIONS` and the wholesale-replace path stops calling it explicitly.

**Phase to address:** Phase 1 (COLLECTIONS declaration / derived `mergeDB`). Verify before merging: re-run the existing "sync merge: a stale device can never subtract" test group (`test/app.test.js`, per `.planning/codebase/CONCERNS.md`) and confirm it still exercises a gen bump, not just an mtime difference.

---

### Pitfall 2: Map-shaped collections get generalized to list-union semantics, resurrecting "unchecked" forever

**Blast radius:** Catastrophic and *undetectable by looking at one device* — the bug only shows up as a two-device divergence, and by the time it's noticed the "off" state has been silently overwritten on every sync since the regression shipped.

**What goes wrong:** `journal`, `mobilityLog`, and `lawnLog` are merged with `mergeDateMap()`, which takes the **whole inner day-object from the newer side** — deliberately *not* a union of inner keys, because these collections encode "off" as `false` or an absent key, and unioning would mean a deleted/unchecked key can never die (`index.html:3673-3676`, `CLAUDE.md`: "Absence never means 'off'"). A `COLLECTIONS` declaration that models every collection with one shape — "list of rows, keyed, unioned" — has no vocabulary for this. If the declaration adds a generic `kind: 'map'` but the derived merge defaults an under-specified map collection to key-union (because union is the "safe-sounding" default, and it's what every other collection in the file does), the `explicitFalse` semantics silently disappear. A day that was un-checked reappears — forever — the next time an older device with that key still `true` syncs in.

**Why it happens:** Union-of-keys reads as *more correct* to someone unfamiliar with the incident history — "why would we throw away data the other side has?" is a reasonable question with a wrong answer here, because the "data" being thrown away is the fact that something was *turned off*, and turning something off doesn't create a new key to union — it removes information. The one existing map collection with a *direct* test gap (`mergeDateMap()` itself has "no direct test" per `.planning/codebase/CONCERNS.md`) shows this is already a known, currently-unenforced risk before F1 even starts.

**How to avoid:** The `COLLECTIONS` declaration must have an explicit, named field for this — not an inferred default — e.g. `mergeStrategy: 'union' | 'newer-wins-whole-object'`, and the derivation must fail loudly (throw at module-eval, not silently default) if a `kind: 'map'` entry omits it. Add the test `mergeDateMap()` is currently missing: build two device states where device A has `{mow: true}` on a date and device B has the same date deleted/absent, merge with B as newer, and assert the result reads as "never logged" — then merge with B as newer *and* B's value explicitly `false`, and assert the result stays `false` (not absent, not resurrected). This closes both the pre-existing gap and the new derivation risk in one test.

**Warning signs:** Any `COLLECTIONS` entry for `journal`/`mobilityLog`/`lawnLog` (or a new map-shaped collection) that doesn't have a `mergeStrategy` field, or has one that silently falls back to the list-collection default when unset.

**Phase to address:** Phase 1, primarily — this is about the existing map collections surviving the refactor intact. Re-check at Phase 2 only if `sleep` or any future collection is ever proposed as map-shaped (it is currently declared list-shaped, `{kind:'list', key:'id', soft:true, sortBy:'date'}` per `PROJECT.md`, so Phase 2 itself doesn't exercise this path — note that explicitly in the Phase 2 acceptance criteria so nobody assumes it does).

---

### Pitfall 3: A subtle change to a key/identity function silently orphans or duplicates rows

**Blast radius:** Severe and slow — doesn't crash anything, doesn't fail validation, just quietly grows the dataset with near-duplicate rows, or drops one twin of a duplicate pair on every future merge.

**What goes wrong:** Every collection's union merge depends on a `keyOf` function: `sessKey = s => s.id || ('c_'+...)`, `w => w.date`, `todoKey`, `hobbyKey`. These are not uniform — sessions prefer a stable `id` with a content-based fallback for pre-migration rows; weights and pet-weights key by bare `date` (one entry per date, by design); todos and hobby-log key by composite strings. When these become `key: 'id'` or `key: (row) => ...` entries in a declaration, it is easy to normalize them into one shape and lose a collection-specific nuance — e.g. representing the `weights` key as `'date'` (a field name, generic) is fine, but representing `sessions`' key as `'id'` alone silently drops the content-based fallback for any row that predates `id` backfill (migration 12), because now the declared key function returns `undefined` for those rows and every one of them either collides into a single key (all `undefined` merge into "the same" row, silently dropping all-but-one) or the derivation coerces `undefined` differently than the hand-written fallback did.

**Why it happens:** Declarative systems reward *uniformity* — one key-shape per collection reads cleaner than "prefer X, fall back to Y for old rows." The migration-era fallback logic is exactly the kind of detail that looks like accidental complexity worth deleting, when it is in fact load-bearing for rows that already exist in production and will never be touched by a fresh migration again.

**How to avoid:** Let the declaration's `key` field be a function, not just a field name, whenever the hand-written version was a function — do not force every collection into a `key: 'fieldname'` shape if the real key logic branches. Before deleting `sessKey`/`todoKey`/`hobbyKey`, run a script (no dependencies — plain Node) over the real backup export that counts distinct key values under the old function vs. the new declared one on the *actual* production dataset; a count mismatch is the signal.

**Warning signs:** Row count drops after a merge round-trip in a local test using a real (or realistic synthetic) pre-`id`-backfill session; two sessions that were previously distinct now report the same key.

**Phase to address:** Phase 1. Verification: the differential/golden test described in Pitfall 4 below is the general mechanism that catches this — this pitfall is why that test must include at least one row from *before* every historical migration boundary (pre-id sessions, pre-`gen` DBs), not just current-shape fixtures.

---

### Pitfall 4: Deleting the hand-written merge/validate/filter functions before proving behavioral equivalence

**Blast radius:** Catastrophic-by-construction — `mergeDB` is shared machinery for every collection. An undetected divergence here doesn't corrupt one feature, it corrupts the *merge itself*, on the next sync, for whichever collection happens to hit the changed path first.

**What goes wrong:** The instinct on a clean, well-tested refactor is: derive the new implementation, run the suite, see green, delete the old code in the same change. The existing test suite (226 checks) was written *against the hand-written implementation's known failure modes* — it proves the old code doesn't repeat the five known incidents. It does not, by construction, prove that a *new* implementation with a *different internal structure* preserves every behavior the old one had, including behaviors nobody wrote a regression test for because they never broke. A green suite after deleting the old code is evidence the new code doesn't repeat *documented* incidents. It is not evidence the new code is behaviorally identical to the old one on the long tail of real data.

**Why it happens:** "The tests pass" and "the two implementations are equivalent" are different claims, and it's easy to conflate them when there both. Deleting old code immediately also removes the only artifact that would let you *notice* a divergence later — once `mergeUnion`/`mergeDateMap`/`liveSessions` etc. are gone, there is no baseline left to diff a suspicious production merge against.

**How to avoid — concrete, no dependencies:**
1. **Characterization/golden test using real data.** The app already has an export feature (`Export backup`). Before writing a single line of `COLLECTIONS`, export the real production DB once and check a scrubbed copy into `test/fixtures/real-db-snapshot.json` (strip nothing but any field you don't need — this is single-user data already leaving the device via the same export feature, so this adds no new exposure). Write a test that loads this fixture and runs it through `blank()`, `mergeDB()`, every `liveX()`, and `validateBackup()`.
2. **Differential testing, old vs. new, in the same commit range.** Rename the current hand-written functions (`mergeDB` → `mergeDB_v0`, `blank` → `blank_v0`, etc.) rather than deleting them, write the new derived versions alongside, and add a test that runs *both* over (a) the real fixture from step 1, and (b) a battery of synthetic two-device pairs — one pair per collection kind, one pair per known incident (a `mobilityLog` day toggled off on one side, a soft-deleted row on one side, a `gen` bump on one side, equal-`mtime` collisions). Assert deep equality between `v0` and derived output on every case. Only delete `_v0` once this test has been green through at least one full review cycle — and consider keeping the differential test itself as a permanent regression test (retargeted to compare "the merge" against a small hand-maintained reference oracle) rather than deleting it along with the old code.
3. **Never combine "delete the old implementation" and "ship a new collection" in the same commit.** Prove equivalence first (steps 1–2), ship that alone, and only *then* prove the new capability (Phase 2's `sleep` collection) in a separate change. Conflating them means a `sleep`-specific bug and a derivation-equivalence bug look identical in the diff.

**Warning signs:** A PR that deletes `mergeUnion`/`mergeDateMap`/hand-written `liveX()` functions in the same commit that introduces `COLLECTIONS`; no fixture file under `test/fixtures/` derived from real exported data; a test suite where every new test is synthetic (hand-built minimal fixtures) and none replay data that actually existed in production.

**Phase to address:** Phase 1. This is the single highest-leverage prevention in this whole file — get this mechanism in place and most of Pitfalls 1–3 and 5–8 get caught by it automatically, because they're all instances of "the derived version diverges from the hand-written one on a case nobody thought to unit-test directly."

---

### Pitfall 5: `mergeUnion`'s tie-break is order-dependent, and a property-based test that swaps arguments naively will either give a false pass or a false failure

**Blast radius:** Moderate on its own, but this is the pitfall that makes "prove idempotence/commutativity/associativity" *itself* a trap if done carelessly — a wrong property test can certify a broken merge as correct, or flag a correct merge as broken and get "fixed" into something actually wrong.

**What goes wrong / the actual merge laws here:** `mergeUnion(aArr, bArr, keyOf, newerFirst)` resolves same-key collisions by `mtime` first, and **only on an exact mtime tie**, falls back to `fromNewerSide` — a boolean derived *outside* this function from the whole-DB `updatedAt` comparison in `mergeDB`. This means:
- **Idempotence holds:** merging a DB with itself converges to itself (every row has an identical twin at an identical mtime; the arbitrary tie-break picks between two identical objects, so the result is unaffected).
- **Commutativity holds *at the whole-`mergeDB`-call level*, not at the raw-array level.** `mergeDB(A, B)` and `mergeDB(B, A)` should converge to the same content because `localNewer` is *recomputed* from each DB's own `updatedAt`, not passed in as a fixed flag. But calling `mergeUnion(arrA, arrB, key, true)` vs. `mergeUnion(arrB, arrA, key, true)` directly — i.e. swapping the *array* arguments without also flipping `newerFirst` to match — is **not** the same operation and will not converge, because `newerFirst` encodes "which side is newer," and swapping which array is `a` without swapping that flag silently reverses who wins ties.
- **Associativity is required, not optional, and for a non-obvious reason:** every remote write goes through `runTransaction()`, which re-reads and re-merges on every retry. A transaction that races with another write doesn't do one merge — it does a chain of pairwise merges. If `merge(merge(A,B),C) !== merge(A,merge(B,C))`, then which retry ordering happens to occur (a fact of network timing, not application logic) decides which surviving rows win on equal-mtime collisions. That is exactly the kind of "looks converged, actually depends on timing" bug this app's whole incident history is made of.

**Why it happens:** A property-based test written by someone who hasn't internalized the `newerFirst` coupling will write `merge(a, b) === merge(b, a)` as the commutativity check, using the raw array-level function and swapping arguments positionally without also correctly recomputing which side is "newer." That test will fail on legitimate, correct behavior (a false alarm), and the "fix" that makes the naive test pass — e.g., making `mergeUnion` insensitive to `newerFirst` entirely, always preferring one array positionally — would make the *real* function wrong for equal-mtime ties, silently making convergence depend on transaction retry order.

**How to avoid — concrete, no dependencies:** Write property tests at the `mergeDB(remote, local, localWins)` level, never at the raw `mergeUnion(aArr, bArr, ...)` level, because only `mergeDB` owns the correct recomputation of "who is newer." Use a small seeded PRNG (a 6-line `mulberry32`-style function is enough — no dependency needed) to generate N random pairs of synthetic DB states (varying `updatedAt`, per-row `mtime`, and deliberately including several exact-mtime ties). For each pair: assert `mergeDB(A,A,false)` converges to `A`'s live content (idempotence); assert `mergeDB(A,B,false)` and `mergeDB(B,A,false)` produce the *same set of live rows by key* regardless of cosmetic array-order differences (commutativity, checked by content not array identity); assert `mergeDB(mergeDB(A,B),C)` and `mergeDB(A,mergeDB(B,C))` converge to the same live-row set (associativity, directly motivated by the transaction-retry chaining above — say so in the test name). Do **not** assert exact array-order equality; assert the *live, keyed content* is identical (sort by key before comparing).

**Warning signs:** A property test that manipulates `newerFirst`/array order independently instead of always deriving it the way `mergeDB` does; a "convergence" test that only checks array length, not content, and would pass even if the wrong row won a tie.

**Phase to address:** Phase 1, as part of the differential/property-testing work from Pitfall 4. This is a testing-methodology pitfall as much as a code pitfall — flag it to whoever writes the property tests, not just whoever writes the merge.

---

### Pitfall 6: Soft-delete filter genericization has an edge the six hand-written `liveX()` functions never had to handle

**Blast radius:** Catastrophic if it happens — this is the exact incident already on file ("Soft-delete filter missed on a view; a deleted row ghosted back"), now with a new way to reintroduce it.

**What goes wrong:** All six current `liveX()` functions are identical one-liners: `(DB.X||[]).filter(isLive)`, where `isLive = x => !!x && !x.deletedAt`. That uniformity makes them an easy, safe-looking target for a single generic `liveCollection(key)` derived from `COLLECTIONS`. The edge case: not every collection is a flat array of objects with a top-level `deletedAt`. If `sleep` (or any future collection) is added with `soft: true` but the generic filter assumes `DB[key]` is always an array (breaks on map-shaped collections that also want soft-delete semantics per inner key, which none currently do, but the declaration format now invites someone to try), or if a collection's declaration omits `soft` and the generic filter's *default* is "show everything" rather than "fail loudly, this collection didn't say," a missing `soft: true` silently ships a collection with no soft-delete protection at all — indistinguishable from the original missed-filter incident, just moved from "someone forgot to call `liveX()` on a view" to "someone forgot to set a flag on a declaration."

**Why it happens:** Centralizing five things behind one declaration is precisely the goal of F1 — but it also means one wrong default in the *generator* now affects every collection at once, instead of one collection at a time. The blast radius per mistake goes *up* even as the frequency of mistakes should go *down*.

**How to avoid:** Make `soft` (or equivalent) a required field with no default — the declaration for every current and future collection must state it explicitly, and the generator should throw at module-eval time (per the temporal-dead-zone constraint already documented in this codebase) if any `COLLECTIONS` entry omits it, rather than defaulting to permissive. Add one test per declared collection, generated from `COLLECTIONS` itself — loop over the declaration in the test file and assert every `soft: true` collection's generated `liveX()` actually excludes a row with `deletedAt` set. This makes the test suite *grow automatically* with the declaration instead of needing a hand-written test added per new collection (which is the exact discipline gap F1 exists to close — apply it to the tests, not just the app code).

**Warning signs:** A `liveCollection()` generator with an `if (!def.soft) return raw` fallback instead of a required, validated field; a new collection declaration that doesn't appear in the loop-generated soft-delete test because the test file wasn't updated to iterate `COLLECTIONS` (i.e., the test itself was hand-written per-collection rather than derived).

**Phase to address:** Phase 1 (the generator and its required-field validation) and Phase 2 (the `sleep` collection is the acceptance test — verify its declaration is exercised by the *generated* test, not a hand-written one-off, or the acceptance test proves nothing about F1 actually working).

---

### Pitfall 7: The `draft`-to-local transition resurrects the exact crash it's meant to eliminate, via a path nobody is watching

**Blast radius:** Severe and ironic — the whole point of Phase 4 is closing the "synced draft crashes the Log tab the user is standing in front of at the rack" bug family. Done carelessly, it can reopen that exact bug through a path the phase's own motivation didn't anticipate: **stale data already sitting in the cloud from before the change ships.**

**What goes wrong, concretely:**
- **Existing cloud documents already contain a `draft` field** — possibly a stale, months-old one from a workout that was never cleanly finished, sitting in Firestore right now. The moment `draft` stops being read/written by local code, that field does not disappear from the cloud document; it just stops being *maintained*. If the generic merge (post-F1, driven by `COLLECTIONS`) is not explicitly told to exclude `draft` from its per-field pass, the same mechanism `wx` already relies on (`delete out.wx; // weather is derived cache — excluded from sync entirely`) needs to be applied to `draft` too — otherwise a declarative "merge every field from the newer side" pass will pull that stale cloud `draft` right back into local state, unguarded, exactly reproducing the "a draft short a field crashed the Log tab" incident, except now on a build that assumed drafts couldn't sync anymore, so nobody is looking for it there.
- **The `normalizeDraft(out)` call inside `mergeDB` exists *specifically* because merged output doesn't pass through `normalize()`, and specifically to repair a stale/short draft before it reaches `viewActive()`.** If `draft` is removed from the merge surface, it's tempting to delete this call as "no longer needed." Doing so before also guaranteeing no code path can hand a legacy-shaped `draft` to `viewActive()` un-repaired removes the last guard against the exact crash this codebase already suffered once.
- **Order of operations matters.** If "stop writing `draft` to the cloud" ships before "stop reading `draft` from the cloud into local state," there's a window (however short, on a single device this may just be "the moment the new code first loads on the phone with an old cloud doc still present") where local state can still absorb a poisoned draft. Ship both sides atomically, in the same deploy, and treat this as a case requiring the differential test from Pitfall 4: construct a "remote" fixture that still carries a legacy `draft` field and assert the new code never surfaces it to a view.
- **The PWA service worker complicates "just redeploy."** This app is offline-first with a cached shell; the currently-open tab keeps running old in-memory JS until the page is closed/reopened even after a new service worker installs. If a workout is mid-flight in the old code at the moment the new build deploys, the old code's normal save path could still push a `draft` write in the window before the new code takes over. This isn't a merge-logic bug, but it means "device-local drafts" isn't fully true until the phone has been closed and reopened at least once post-deploy — worth a note in the CLAUDE.md changelog entry for this phase so it isn't mistaken for a regression later.

**Why it happens:** The team's mental model is "we're removing sync for this field going forward," which is true for *new* writes but says nothing about the field's *existing* footprint in a system that was explicitly designed to union everything it sees. Retiring a synced field is a data-migration problem wearing a code-change costume.

**How to avoid:**
1. Treat `draft` exactly like the codebase already treats `wx`: an explicit, named exclusion from the sync surface, not an implicit consequence of "the code doesn't write it anymore." `delete`/exclude it in the same place `wx` is excluded, with a comment cross-referencing this decision.
2. Keep `normalizeDraft(out)`'s repair guard in `mergeDB` (or wherever the merge boundary now lives) for at least one full migration cycle after this phase ships — its cost is near zero and its job is specifically to survive exactly the stale-cloud-doc scenario above.
3. Add a one-time cleanup step (can be manual, given the single-user/single-device context, or a tiny migration) that strips `draft` from the live cloud document once, so the field doesn't linger indefinitely as a footgun for the next person who touches merge code without reading this file.
4. Add the differential test described above: a fixture "remote" DB with a legacy `draft` object, merged against a fresh local DB, asserting the resulting local state cannot reach `viewActive()` in a crashing shape — and ideally asserting `draft` doesn't reappear as a synced field at all.

**Warning signs:** `git grep draft` inside `mergeDB`/the new generic merge path returning nothing (nobody explicitly excluded it — it may just be silently falling through the generic per-field `Object.assign` newer-wins path); no test fixture anywhere representing "a remote DB that still has an old-shaped draft."

**Phase to address:** Phase 4 (draft becomes device-local), with a hard dependency on Phase 1's merge boundary already existing and having a place to put an explicit exclusion. Do not schedule Phase 4 before Phase 1's `mergeDB` derivation is proven equivalent (Pitfall 4) — a still-unstable merge function is the worst place to be making a field-retirement change.

---

### Pitfall 8: Non-idempotent or unpersisted migrations recur inside the Phase 1 rewrite itself (Migration-15-class bug, new occasion)

**Blast radius:** Catastrophic if it happens, and specifically because it already has — this project's worst production incident (a silently reverted, permanently unrunnable migration) is the direct precedent.

**What goes wrong:** If deriving `blank()`/`mergeDB()`/`liveX()`/`validateBackup()` from `COLLECTIONS` requires *reshaping any existing collection's stored rows* to fit the new declared shape (for example, if a collection's field needs renaming or restructuring to be uniformly describable by the declaration), that reshaping is a migration — and it inherits every rule `CLAUDE.md` already states for migrations: it must `touch()` rewritten rows and persist immediately, must be idempotent, and must never let `_schema` advance past an un-persisted rewrite. Doing this work "as part of the refactor" rather than "as an explicit, numbered `MIGRATIONS` entry" is exactly how Migration 15 went wrong: it ran in memory at boot, was never saved, and the schema stamp advanced anyway — so the sync merge preferred the untouched stale cloud copy (no `mtime` bump) and the migration could never run again, undetected for weeks.

**Why it happens:** "Refactor the data layer" and "migrate the data" feel like different kinds of work — one is "changing code," the other is "changing state" — but when the refactor requires reshaping rows already on disk/in the cloud, they're the same operation, and only one of the two mental categories comes with the existing safety discipline attached.

**How to avoid:** If Phase 1 requires *any* reshaping of existing stored data (not just reorganizing the code that reads/writes the existing shape), it must go through the numbered `MIGRATIONS` mechanism, bump `SCHEMA`, `touch()` every rewritten row, and `save()` (never `saveLocal()`) immediately — with a test replaying a stale-device merge post-migration, exactly as `CLAUDE.md` already prescribes. If Phase 1 can be done *without* reshaping any stored row (i.e., `COLLECTIONS` only changes how existing-shaped data is processed, not the shape itself), confirm that explicitly and state it in the phase's acceptance criteria — "no migration required, verified by: [specific check]" — so nobody has to guess later whether this rule applied.

**Warning signs:** A Phase 1 diff that mutates existing row shapes anywhere in `normalize()` or at load time without a corresponding `MIGRATIONS` entry and `SCHEMA` bump; any new `try{...}catch(e){}` around a rewrite step that isn't immediately followed by a persist.

**Phase to address:** Phase 1. Decide up front — as part of scoping the phase, before writing code — whether any stored-row reshaping is required, and treat that decision as a go/no-migration checkpoint.

---

### Pitfall 9: Mass onclick→delegation refactor silently drops call sites, and the failure surfaces exactly at the rack

**Blast radius:** Severe and data-adjacent, not data-destroying by itself — but a control that silently stops firing at the moment of logging a set is, from the user's perspective, indistinguishable from data loss: the set never gets recorded, on the one device that exists, at the one moment it could have been.

**What goes wrong:** 140 `onclick=` attributes (confirmed by direct count against this repo; `PROJECT.md` independently corrects an older "326 global functions" estimate down to this same number) become one delegated `#app` listener reading `data-act`/`data-arg`. A mechanical, regex-driven conversion of this many call sites will miss some, and the test suite is explicitly DOM-light (a `vm`-based harness with stubbed elements — `addEventListener(){}`, `click(){}` as no-ops per `.planning/codebase/TESTING.md`), so **the existing suite cannot detect a missed or misrouted click handler by exercising it** — it can only smoke-test that a view renders without throwing, not that its buttons still do anything. Concretely, in this codebase:
- **`stopPropagation()` breaks delegation silently — no error, no warning, the click just does nothing.** If any existing handler (or code introduced during the refactor, e.g. to prevent a tap from also triggering a parent card's handler) calls `stopPropagation()` before the event reaches the delegated `#app` listener, that button goes dead with zero console signal.
- **Confirmed safe on non-bubbling events for this codebase specifically:** a scan of every inline handler type present (`onclick`, `onchange`, `oninput`, `onkeydown`, `onpointerdown` — all of which bubble) found no `onfocus`/`onblur`/`onmouseenter`/`onmouseleave` attributes in the markup, so the classic "delegation misses non-bubbling events" trap does not currently apply here. This is worth stating explicitly so it isn't re-litigated defensively during the refactor — but re-run the same check after the refactor, since new markup could introduce one.
- **`onchange`/`oninput` fire on the same element they're bound to but the delegated pattern must read `event.target`, not `event.currentTarget`,** and must handle the case where the actual `target` is a text node or icon `<svg>` inside the intended button (a very live risk given `PH`, the inlined Phosphor icon map, puts SVG markup inside clickable elements) — `closest('[data-act]')` from `event.target` is the standard fix; a delegated handler that reads `event.target.dataset.act` directly instead of walking up via `closest()` will silently fail on any click that lands on an icon or nested span inside the button.
- **Dynamically injected markup** — anything built by a view function and inserted via `innerHTML` — is automatically covered by delegation (that's the point), *but only if the generated markup actually carries the `data-act` attribute correctly interpolated*, including through `esc()`. Given the codebase's own documented escaping gap ("attribute interpolations are not escaped at all" — `CLAUDE.md`), a `data-arg` value built from user-controlled content (e.g., an exercise name, a todo's text) needs the same attribute-escaping fix this phase is *already* motivated to make (closing "the apostrophe footgun") — miss it here and a `data-arg="Ian's PR"` breaks the attribute, silently truncating or mis-parsing the action argument rather than throwing.

**Why it happens:** A DOM-light test suite makes exactly this class of failure invisible to `npm test` — the smoke tests prove a view *renders*, never that a click *does what it used to*. A 140-site mechanical conversion has enough surface area that "I converted all of them" is a claim, not a verified fact, without a coverage mechanism independent of DOM simulation.

**How to avoid — concrete, no dependencies, achievable with the existing plain-JS harness:**
1. **Build an inventory before touching anything.** Extract every current `onclick="fnName(...)"` (and `onchange=`/`oninput=`/`onkeydown=`/`onpointerdown=`) call target from `index.html` via a small Node script (plain regex/string parsing, no dependency) into a checked-in fixture, e.g. `test/fixtures/inline-handler-inventory.json` — one entry per site, recording the function name invoked.
2. **After the refactor, assert completeness by static analysis, not DOM simulation.** Write a test that re-scans the refactored `index.html` for every `data-act="..."` value used in generated markup (grep the view-function source, since markup is template-string-generated, not literal HTML in most cases) and every case/key in the delegated dispatcher, then cross-checks: (a) every function name in the Pitfall-9-inventory fixture has a corresponding `data-act` entry somewhere in the source, and (b) every `data-act` value used anywhere in a view function has a matching entry in the dispatcher. This is pure text/AST-free static analysis — no click simulation needed — and it turns "did we miss any of the 140" from a manual review question into an automated, always-green-or-red check.
3. **Grep for `stopPropagation` before and after the change**, and treat any hit inside a handler reachable from a delegated action as something to review by hand — the search-tool result above confirms this is the single most common silent-failure mode in real-world onclick→delegation migrations.
4. **Require `closest('[data-act]')`, not direct `dataset` reads on `event.target`**, as the one dispatch pattern used everywhere — bake this into a one-line comment at the top of the dispatcher so it isn't reinvented per-call-site with a subtly different (and occasionally broken) targeting strategy.
5. **Manual UAT pass at the actual breakpoints that matter most** — since this is a single-user, single-device app, a full manual click-through of every screen before shipping is cheap and appropriate here in a way it wouldn't be for a multi-tenant product; prioritize the Log tab (the rack-side, in-workout screen) first, since that's the one screen where a missed handler has the highest cost.

**Warning signs:** A completeness-check test that can't be written because the refactor didn't preserve a consistent, greppable naming convention between `data-act` values and either the old function names or a documented mapping; any `stopPropagation()` call found inside code reachable from a converted handler; any `dataset.act` read directly off `event.target` rather than via `closest()`.

**Phase to address:** Phase 5 (event delegation). The inventory step (1) should happen *before* the refactor starts, as its own small prep commit, so the fixture is guaranteed to reflect the pre-refactor state rather than being reconstructed from memory afterward.

---

### Pitfall 10: CSP rollout silently disables the only off-device backup mechanism, with no on-screen error

**Blast radius:** Severe, specifically because of what this app already decided is out of scope. `PROJECT.md` explicitly keeps cloud sync in scope as "the only automatic off-device backup" and explicitly defers rewriting it. A CSP that breaks sync without breaking the visible app doesn't just create a bug — it silently removes the one thing standing between "phone breaks" and "two months of training data gone," and nothing in the UI currently tells the user that sync has stopped.

**What goes wrong, concretely, grounded in this codebase's actual script/style surface:**
- **Firebase is loaded from a CDN, not inlined:** `<script defer src="https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js">` (and two sibling `-auth-` / `-firestore-` scripts) — confirmed directly in `index.html`. A CSP with `script-src 'self'` and no explicit allowance for `www.gstatic.com` blocks these three scripts outright. Because the app is offline-first and fully functional on `localStorage` alone, **the app keeps working perfectly from the user's point of view** — logging sets, viewing history, everything — while cloud sync is completely and silently dead. There is no error dialog for this failure mode today (it's not a case any existing code path was written to detect), and the user has no reason to open devtools on a phone during a workout.
- **345 inline `style="..."` attributes exist throughout the markup** (counted directly). Removing inline event handlers (in scope for Phase 5) does nothing about inline styles (explicitly out of scope — "Navigation or layout changes" and "splitting `index.html`" are both declined in `PROJECT.md`). A CSP that also tightens `style-src` beyond `'unsafe-inline'` — either by mistake, or because a template/example online conflates "harden script-src" with "harden everything" — breaks the visual layout of the entire app. This one is at least *loud* in the sense that the UI visibly looks wrong, but it is still silent in the sense that it produces no error dialog, no crash, just a page that looks broken with no diagnostic offered to a non-technical user standing at a squat rack.
- **The weather feature calls `api.open-meteo.com` and `geocoding-api.open-meteo.com` directly from client-side `fetch()`.** A `connect-src` directive that omits these hosts breaks the lawn scheduler's weather forecasting silently (the existing code already has no-retry, fire-and-forget error handling here — a blocked `fetch()` just looks like a network hiccup, not a policy violation, to anyone reading the UI).
- **CSP violations are console-only by default.** Nothing about a `Content-Security-Policy` header surfaces to a user who never opens devtools — which, per this project's own stated context (`PROJECT.md`: "production is a phone... at the rack"), describes the only user of this app all the time.

**Why it happens:** CSP is usually pitched, correctly, as a defense-in-depth layer against XSS — and the mental framing of "harden the app" makes it easy to reach for a restrictive template policy without individually verifying every external resource the app currently, legitimately depends on. The dependency inventory (CDN Firebase, Open-Meteo, 345 inline styles) has to be built by hand for this app precisely *because* it has no build step and no bundler to introspect its own dependency graph.

**How to avoid — concrete, no dependencies:**
1. **Ship `Content-Security-Policy-Report-Only` before `Content-Security-Policy`, for at least several days of real use.** Report-Only mode logs every violation to the console without blocking anything — it turns "silently broke in production" into "visible in devtools, nothing actually broke yet," which is the entire point given this user won't be watching for it. Only flip to enforcing once a normal multi-day usage cycle (including a lawn-scheduler weather fetch and at least one cross-device sync, if feasible) produces zero report entries.
2. **Build the CSP directive value from a grep of the actual file, not from a template.** Before writing the policy: `grep -oE 'https?://[a-zA-Z0-9.-]+' index.html` (or equivalent) to enumerate every external host the app actually contacts, and cross-reference against the three known categories above (gstatic.com for scripts; the Firebase project's own `*.googleapis.com` / `*.firebaseio.com` / `identitytoolkit.googleapis.com` endpoints the SDK talks to at runtime, which won't show up in a static grep of `index.html` since they're internal to the SDK — check Firebase's own CSP guidance for the compat SDK version in use; open-meteo.com and geocoding-api.open-meteo.com for weather). Write the resulting host list into the phase's plan as an explicit checklist, and re-run the grep after the change to confirm nothing new was missed.
3. **`style-src` stays permissive (`'unsafe-inline'`, or a hash-per-value scheme only if that becomes cheap) as a deliberate, documented decision** — not an oversight discovered when the UI breaks. State explicitly, in the same place the CSP is defined, that tightening `style-src` is out of scope until/unless inline styles are separately addressed (which `PROJECT.md` has already declined for this milestone).
4. **Add a lightweight, dependency-free sync-health signal independent of CSP** — e.g., a `console.log`/one-line UI indicator on successful sync vs. one that hasn't run in N hours — so that *any* future silent sync failure (CSP-caused or otherwise) has a chance of being noticed before it's been silently broken for weeks. This is worth doing regardless of CSP, but CSP is the concrete trigger that makes the gap matter now.

**Warning signs:** A CSP header present in production with no corresponding Report-Only soak period in the deploy history; a `script-src` or `connect-src` directive written without a corresponding grep-based host inventory attached to the same change; any `style-src` value tighter than `'unsafe-inline'` shipping in the same phase as the event-delegation work (a scope-creep signal, not just a technical one).

**Phase to address:** Phase 5 (event delegation unlocks CSP), but treat the CSP rollout itself as the higher-risk half of that phase — the delegation refactor (Pitfall 9) is dangerous to *interaction*; the CSP header is dangerous to *the app's ability to protect data at all*, silently, in a way this project's own stated priorities (cloud sync as sole off-device backup) make worse than almost anything else in this file except Pitfalls 1–2.

---

## Moderate Pitfalls

These degrade the project's safety margins without destroying data by themselves. Still worth designing against, but they don't belong in the same tier as Pitfalls 1–10.

### Pitfall 11: The derived `validateBackup()` is structurally complete but semantically shallower than the hand-written one

**What goes wrong:** The current `validateBackup()` does more than check "is this an array/object of the right kind" — it validates date formats (`/^\d{4}-\d{2}-\d{2}$/`), walks into nested `entries`/`sets` structures, distinguishes *required* collections (`sessions`, `weights` — import fails without them) from *optional-but-typed-if-present* ones (`petWeights`, `cardio`, `ideas`, `todos`, `hobbyLog`, `journal`, `mobilityLog`, `lawnLog`), and produces a human-readable, specific failure reason per case. A `COLLECTIONS` declaration that only carries `{kind, key, soft, sortBy}`-level metadata can mechanically derive the *shape* checks (array vs. object, required vs. optional) but cannot, without deliberate extension, derive the deep per-row checks (date-format validity, nested-array validity) — those depend on a schema of *fields within a row*, which is a different, deeper kind of declaration than "what kind of collection is this."

**Why it happens:** F1's premise — "the rules for a collection live in one place" — is true for merge/soft-delete/sort rules, and only partially true for import validation, which needs field-level typing that the other four consumers (`blank`, `mergeDB`, `liveX`) don't need at all. It's easy to declare victory on "`validateBackup()` is derived from `COLLECTIONS`" while quietly shipping a weaker validator that accepts malformed backups the old one would have rejected.

**How to avoid:** Decide explicitly, as part of scoping Phase 1, whether the declaration will carry field-level validators (more work, full parity) or whether `validateBackup()` will keep a smaller set of hand-written deep checks *on top of* the derived shape checks (less centralization, but no silent parity loss). Either is fine — what's not fine is assuming derivation implies parity without checking. Verify with a test that feeds the exact malformed-backup cases the current suite already covers (or should cover — check `.planning/codebase/CONCERNS.md`'s "Escaping and injection" test-gap note) through the derived validator and confirms every one is still rejected with the same or better specificity.

**Phase to address:** Phase 1.

---

### Pitfall 12: The `sleep` collection's acceptance test proves rendering, not merging

**What goes wrong:** `PROJECT.md` states F1's acceptance test is "adding a real 11th collection in one line," with `sleep` as that collection specifically because it's list-shaped and "exercises union merge, soft delete, the `liveX()` filter and the sort invariant." That's the right instinct — but it's easy for the actual acceptance check, in practice, to end up being "the app boots, the Sleep view renders, `npm test`'s smoke tests pass" — which proves the *view* layer works, not that the *merge* layer does. Given this is a single-device app, there is no natural two-device scenario to exercise sleep's union merge in normal use; it will never get organically tested the way the existing collections eventually were (through real incidents).

**Why it happens:** "It renders and the smoke test is green" is the visible, easy-to-check signal; "a synthetic two-device merge round-trip converges correctly" requires deliberately writing a test nobody will be prompted to write by a failing build, because nothing fails without it.

**How to avoid:** Make the `sleep` collection's acceptance criteria explicitly include a synthetic merge test — two device-states with sleep entries on overlapping and non-overlapping dates, one with a soft-deleted entry, merged both directions — as a named, required check before the phase is considered done, not an optional nice-to-have. This is also the natural moment to build the "generated test per declared collection" pattern proposed in Pitfall 6, so `sleep`'s merge coverage isn't hand-written either — it should exist *because* `sleep` is in `COLLECTIONS`, automatically, proving the derivation actually generalizes rather than proving one hand-crafted example works.

**Phase to address:** Phase 2, but design the "acceptance test" mechanism during Phase 1 so Phase 2 can just invoke it.

---

### Pitfall 13: The Markdown export can leak soft-deleted rows or internal bookkeeping fields into an LLM-facing document

**What goes wrong:** A Markdown-table export "derived from the same declaration" needs to independently decide whether it reads through `liveX()` (soft-delete-filtered) or straight off `DB[key]` (which still contains soft-deleted rows, by design, since they're never spliced out — `CLAUDE.md`: "Rows stay in the blob... so an old device can never resurrect them"). If the export derivation reuses the *same read path* as the sync layer (raw `DB[key]`) rather than the *same read path* as the views (`liveX()`), a deleted set or a deleted todo shows up in an export meant to be pasted into a Claude conversation — not a data-loss bug, but a confusing, silently-wrong one: a thing the user explicitly deleted reappearing in a context (an AI assistant reading their training history) where its provenance as "deleted" is not obvious at all. Internal fields (`mtime`, `gen`, `_schema`) leaking into a human/LLM-facing export are a milder version of the same category — noise that could be misread as meaningful data.

**Why it happens:** The export and the sync merge share a data source (`COLLECTIONS`), but they need *different filters* over it, and "derived from the same declaration" doesn't automatically mean "derived through the same access pattern" unless that's made explicit.

**How to avoid:** Declare, per collection, which fields are export-visible (probably: everything except `mtime`/`deletedAt`/internal bookkeeping), and always route the export through the same `liveX()`-equivalent filter the views use — never through the raw `DB[key]` the sync layer touches. Add a test asserting a soft-deleted row never appears in export output.

**Phase to address:** Phase 3.

---

## Minor Pitfalls

Explicitly *not* data-destroying — listed so they don't get conflated with the pitfalls above in planning discussions.

### Pitfall 14: "It worked on this device" is not evidence, because this app already has a hidden second device

**What goes wrong:** There is one phone, but the merge logic doesn't know or care that "local" and "cloud" are on the same physical device — every sync round-trip is a real two-node merge between local `localStorage` state and whatever the Firestore document currently holds, which can be arbitrarily stale (a doc last written before today's testing session, or before this whole refactor started). Testing a change by using the app normally on the one phone exercises exactly one of the two nodes; the cloud side of every merge in ordinary manual testing is whatever was last pushed, not a deliberately-constructed adversarial state. A change that "worked" in a manual test session may never have exercised the stale-cloud-doc path at all.

**How to avoid:** Treat every phase in this milestone as requiring a *synthetic* second-device test — a hand-built or fixture-based "remote" DB state, deliberately stale/divergent from "local," run through the merge function in a test file — rather than relying on manual phone testing to stand in for two-device coverage it structurally cannot provide. This is really the umbrella principle behind Pitfalls 1, 2, 5, and 7 above; it's listed separately here because it's a process pitfall (a testing-methodology gap), not a specific code bug.

**Phase to address:** All phases touching merge (1, 4), as a standing testing discipline rather than a one-time fix.

### Pitfall 15: A CSP-driven `style-src` mistake is loud, not silent — don't over-prioritize it relative to Pitfall 10

**What goes wrong:** Unlike Firebase-CDN blocking (Pitfall 10, silent), a broken `style-src` produces an immediately visible, ugly UI. It's still worth preventing (a confusing, unstyled app at the rack is bad), but it will be *noticed and reported* the first time it happens, unlike a silently-dead sync connection. Don't let this pitfall's easy visibility make it feel more urgent in planning discussions than Pitfall 10's silent, unbounded blast radius.

**Phase to address:** Phase 5, same rollout as Pitfall 10 — just don't let it eclipse the priority ordering.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|--------------------|-----------------|------------------|
| Deriving `blank()`/`liveX()`/`mergeDB()` from `COLLECTIONS` but leaving `validateBackup()` partially hand-written (deep field checks) | Ships Phase 1 faster; avoids inventing a field-level validation DSL | Import validation quietly diverges from "the rules live in one place" — a 6th implicit place, just smaller than before | Acceptable **only if documented explicitly** as a deliberate boundary (see Pitfall 11) — never acceptable as an unstated gap |
| Skipping the differential/golden test (Pitfall 4) because "the smoke tests are green" | Faster to ship, less test code to write | The single highest-leverage prevention in this file goes unbuilt; every other pitfall's detection weakens | Never acceptable given this project's stated Core Value |
| Manual click-through UAT as the *only* coverage for the onclick→delegation refactor, skipping the static-analysis completeness check (Pitfall 9) | Fast, feels thorough because a human "tried everything" | Human review of 140 sites reliably misses some; no regression protection for the next change to the dispatcher | Acceptable as a supplement to the automated completeness check, never as a replacement for it |
| Enforcing CSP directly instead of soaking in Report-Only mode first | Ships CSP protection sooner | Exactly the silent-sync-death scenario in Pitfall 10, with no warning period | Never acceptable for the `script-src`/`connect-src` directives on this app; low-stakes elsewhere |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|-----------------|-------------------|
| Firestore `runTransaction()` + a refactored `mergeDB` | Assuming a single merge call is the only one that ever runs; testing merge in isolation from retry chaining | Test associativity explicitly (Pitfall 5) — transaction retries chain pairwise merges in an order the app doesn't control |
| Firebase compat SDK loaded via `<script defer src="https://www.gstatic.com/...">` | Writing a CSP `script-src` policy without an explicit `gstatic.com` allowance, assuming "the SDK is just JS, it'll be covered by 'self'" | Explicitly allow-list `www.gstatic.com` (and any other CDN host the specific Firebase compat build touches) in `script-src` before enforcing CSP |
| Open-Meteo weather API (`api.open-meteo.com`, `geocoding-api.open-meteo.com`) | Omitting these from `connect-src`, breaking the lawn scheduler silently (it already has no-retry, fire-and-forget error handling, so a blocked fetch looks like a normal network hiccup) | Grep the file for every external host before finalizing the CSP; include both weather hosts explicitly |
| PWA service worker + a mid-deploy code change | Assuming a new deploy takes effect immediately on the open tab | The currently-open tab keeps running old in-memory JS until closed/reopened; field-retirement changes (Pitfall 7) aren't fully in effect until the phone has been restarted at least once post-deploy |

## Performance Traps

Not a focus area for this milestone — the codebase's own `.planning/codebase/CONCERNS.md` already notes the app is well within capacity (332KB file, ~1.3% of localStorage quota) and none of the four in-scope changes materially change that. No performance trap in this file rises to a level worth roadmap attention; skip.

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Treating event delegation as "the CSP fix" without separately verifying `script-src`/`connect-src`/`style-src` against the app's actual external dependencies | CSP ships broken or ships permissive-to-the-point-of-uselessness (`'unsafe-inline'` everywhere just to make errors stop) | Build the directive from a grep-based host inventory (Pitfall 10), not from a generic template |
| Escaping `data-arg` values the same (incomplete) way `esc()` already handles inline-handler quotes today | The apostrophe/attribute-escaping hole this phase is partly motivated to close (per `CLAUDE.md`) gets carried forward into the new `data-arg` attributes instead of fixed | Escape attribute values properly when building `data-act`/`data-arg` markup — don't reuse `esc()` as-is if it still doesn't escape `'` or attribute contexts by the time this phase starts |
| Assuming `validateBackup()`'s derived shape checks are sufficient security hardening against a malicious/corrupted import | A hand-edited backup can still put arbitrary content into fields the derived shape checker doesn't type-check (Pitfall 11), which then flows into rendering — relevant given the documented attribute-escaping gap | Keep or add the deep per-row validation the current validator does; don't let "derived from `COLLECTIONS`" read as "fully hardened" |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|--------------|-------------------|
| No sync-health indicator | A silently broken sync connection (CSP-caused or otherwise, Pitfall 10) is invisible until data divergence is discovered, possibly after the fact | Add a minimal, dependency-free "last synced" signal — even a console log is better than nothing, but a one-line UI indicator directly addresses this app's stated single-point-of-failure risk |
| A dead button after the delegation refactor (Pitfall 9) gives no feedback | At the rack, a tap that silently does nothing reads as "did I actually log that?" — exactly the kind of ambiguity that risks a lost or duplicated set entry | Prioritize the Log tab in both the static-completeness check and manual UAT; consider a visible tap-feedback affordance if any doubt remains after testing |

## "Looks Done But Isn't" Checklist

- [ ] **`COLLECTIONS` declaration (Phase 1):** Often missing an explicit, required `mergeStrategy`/`soft` field per collection with no silent default — verify by grepping the declaration for every entry and confirming none rely on an inferred fallback.
- [ ] **Derived `mergeDB` (Phase 1):** Often missing the `gen`-mismatch wholesale-replace short-circuit as a hard precondition — verify by testing an Erase-All-Data / Import-Replace scenario specifically, not just an ordinary sync.
- [ ] **Derived `validateBackup()` (Phase 1):** Often missing the deep per-row checks (date format, nested entries/sets) the hand-written version had — verify by running the old malformed-backup test cases through the new validator.
- [ ] **`sleep` collection (Phase 2):** Often "done" once it renders and smoke-tests pass — verify a synthetic two-device merge round-trip actually converges correctly, including a soft-deleted entry.
- [ ] **Markdown export (Phase 3):** Often reads raw `DB[key]` instead of the live-filtered view — verify a soft-deleted row never appears in export output.
- [ ] **`draft` device-local (Phase 4):** Often "done" once local writes stop syncing — verify the merge boundary explicitly excludes `draft` (like `wx`), a legacy cloud `draft` can't resurface via merge, and `normalizeDraft()`'s guard is still present as a backstop.
- [ ] **Event delegation (Phase 5):** Often verified by manual click-through alone — verify with the static completeness cross-check (inventory-vs-dispatcher) described in Pitfall 9, independent of any DOM simulation.
- [ ] **CSP (Phase 5):** Often shipped directly in enforcing mode — verify a Report-Only soak period ran first and produced zero violations across a normal multi-day usage cycle including a weather fetch.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|-----------------|------------------|
| Silent merge-law divergence after old code deleted (Pitfall 4) | HIGH | Restore the local snapshot ring (already exists specifically for this purpose — "the undo buffer that was missing when a bad sync wiped four days of data") to before the bad merge; if the bad state has already synced and overwritten the snapshot ring's own basis, fall back to the most recent manual export/backup, if one exists close enough to the incident |
| Map-collection resurrection (`mobilityLog`/`lawnLog`/new map collection) (Pitfall 2) | MEDIUM | Identify the affected date keys, manually re-set the correct explicit value (`false`, not absence) on the newest-mtime device, let it propagate; no data is unrecoverable, but the "off" state has to be re-asserted by hand |
| Silently dead cloud sync from a CSP misconfiguration (Pitfall 10) | LOW if caught quickly (localStorage still holds everything, sync is the only thing broken), HIGH if the phone is then lost/damaged before sync is restored (this is the entire reason sync exists as "the only automatic off-device backup" per `PROJECT.md`) | Revert to Report-Only mode immediately on any suspicion; verify sync resumes; treat any period of confirmed-dead sync as a trigger for an immediate manual export as a stopgap backup |
| Missed onclick→delegation site leaves a control dead (Pitfall 9) | LOW | No data lost by the bug itself (worst case: a set the user gives up trying to log, which is a workflow cost, not a corruption); fix is a targeted addition to the dispatcher/markup, covered going forward by the completeness check once it exists |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|--------------------|----------------|
| 1 — `gen`-mismatch escape hatch lost | Phase 1 | Test: Erase-All-Data / Import-Replace scenario shows zero unioned survivors from the losing side |
| 2 — map collections generalized to union | Phase 1 | Test: explicit-`false` vs. absent-key merge, both directions, asserts no resurrection |
| 3 — key/identity drift | Phase 1 | Differential test (Pitfall 4) run against pre-migration-shaped fixture rows specifically |
| 4 — old implementation deleted before proof | Phase 1 | Golden fixture from real exported data + differential test against renamed `_v0` functions, kept green through review before deletion |
| 5 — merge-law property test written wrong | Phase 1 | Property tests written at `mergeDB()` level (not raw `mergeUnion()`), comparing live-content sets, covering idempotence/commutativity/associativity explicitly |
| 6 — soft-delete filter genericization gap | Phase 1 (generator), Phase 2 (sleep as acceptance test) | Generated (not hand-written) per-collection soft-delete test, looped from `COLLECTIONS` itself |
| 7 — draft-to-local resurrection path | Phase 4 (depends on Phase 1 being proven first) | Differential test: legacy-shaped remote `draft` fixture merged against fresh local state, never reaches `viewActive()` unguarded |
| 8 — migration ordering hazard recurs | Phase 1 | Explicit go/no-migration decision recorded in phase scoping; if yes, numbered `MIGRATIONS` entry + stale-device-merge replay test |
| 9 — mechanical handler-conversion misses sites | Phase 5 | Static inventory-vs-dispatcher completeness test (no DOM simulation) + `stopPropagation`/`closest()` audit |
| 10 — CSP silently kills sync | Phase 5 | Report-Only soak period with zero violations before enforcing; CSP directives built from a grep-based host inventory, not a template |
| 11 — derived `validateBackup()` shallower | Phase 1 | Old malformed-backup test cases re-run against the derived validator |
| 12 — sleep acceptance test proves rendering only | Phase 2 | Synthetic two-device merge test required as an explicit, named acceptance criterion |
| 13 — export leaks soft-deleted rows | Phase 3 | Test: soft-deleted row never appears in export output |
| 14 — "worked on this device" fallacy | Phases 1, 4 (standing discipline) | Every merge-touching change requires a synthetic second-device fixture test, not manual phone testing alone |
| 15 — style-src CSP mistake (loud, not silent) | Phase 5 | Explicit, documented decision to keep `style-src: 'unsafe-inline'` in scope for this milestone |

## Sources

- **Primary (HIGH confidence, first-party):** direct reads of `index.html` (this repo, `mergeDB`/`mergeUnion`/`mergeDateMap`/`blank`/`validateBackup`/soft-delete/`draft` sections), `CLAUDE.md`, `PROJECT.md`, `.planning/codebase/CONCERNS.md`, `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/TESTING.md`, `.planning/codebase/CONVENTIONS.md` — all current as of 2026-09-10.
- **Cross-checked web sources (MEDIUM confidence, general software-engineering findings, not project-specific verification):**
  - CRDT merge-law properties (idempotence/commutativity/associativity, join-semilattice, CALM theorem context) — corroborated across multiple independent sources on CRDT theory and property-based testing of CRDTs.
  - Tombstone/soft-delete resurrection bugs in offline-first sync — corroborated across multiple real-world incident reports (Obsidian Sync forum report of silent resurrection on offline-device reconnect; Couchbase tombstone-management docs; general offline-first sync-strategy guides).
  - CSP rollout silently breaking inline event handlers in production, including a documented case of "23 inline handlers, every one silent until the console was opened" — corroborated across GitHub issue reports and CSP migration write-ups (MV3 Chrome extension migration case; multiple "Refused to execute inline event handler" community threads).
  - Event delegation pitfalls (`stopPropagation()` silently blocking delegated listeners with no error; non-bubbling events requiring `focusin`/`focusout`/`mouseover`/`mouseout` substitutes; `event.target` vs. `event.currentTarget` confusion as the most common delegation bug) — corroborated across MDN, javascript.info, and multiple engineering blog write-ups on event delegation internals.

---
*Pitfalls research for: offline-first sync-backed data layer refactor onto a declarative registry*
*Researched: 2026-09-10*
