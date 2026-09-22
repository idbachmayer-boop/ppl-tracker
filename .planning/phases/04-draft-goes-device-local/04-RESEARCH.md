# Phase 4: Draft Goes Device-Local - Research

**Researched:** 2026-09-22
**Domain:** Client-side sync exclusion in a single-file PWA (Firestore transactional union-merge)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Cross-device handoff**
- **D-01:** Ian never continues a workout on a second device. The draft lives only where it was started, so no handoff mechanism is needed.
- **D-02:** Other devices show nothing about a workout in progress elsewhere. No "in progress elsewhere" flag or hint: nothing draft-derived syncs.

**Cutover & legacy cloud draft**
- **D-03:** A draft that exists only in the cloud doc is ignored, never adopted, including on the first boot after the change ships. Only a draft already in the device's own localStorage survives. A workout that is mid-set during the deploy survives on the phone logging it.
- **D-04:** The stale `draft` field is removed from the cloud doc by stripping `draft` from every merged/pushed blob (the same way `wx` is deleted in `mergeDB` / `snapPayload`), so the next ordinary merged write drops it. No separate one-off migration write. Remote `draft` values (legacy, malformed, absent) must never reach `DB.draft` through any merge path, **including the `gen`-mismatch wholesale-replace branch**, which currently copies the winning side wholesale.
- **D-05:** The local draft is always preserved across any remote merge. The merge result carries this device's own draft back in, just as `wx` is preserved in `adoptMerged` today [index.html:4278]. A remote Erase or Import→Replace arriving via `gen` bump does not clear this device's draft.

**Backups, snapshots, import**
- **D-06:** The downloadable JSON backup excludes `draft`. `validateBackup()`/import ignores any `draft` in an imported file, so a hand-edited or old backup can never plant a draft.
- **D-07:** Auto-snapshots exclude `draft` (extend `snapPayload`). Restoring a snapshot never replaces the workout in progress.
- **D-08:** A local "Erase all data" clears the local draft. A local Import (Merge or Replace) keeps the local draft.

**Draft saves vs sync pushes**
- **D-09:** Draft edits (set values, notes, stairs, extras, date/duration) persist locally only: written to this device immediately, with no `updatedAt` bump and no push. Syncing happens when Finish lands the session in `sessions` (the existing `save()` on finish). Starting and discarding a draft likewise causes no draft-bearing write. Persistence must still survive close/reopen exactly (DRAFT-05).

### Claude's Discretion
- Storage shape: keep `draft` inside the `DB` blob under `KEY` and strip it at every wire boundary, or move it to its own localStorage key. The planner picks, but the result must satisfy D-04..D-09 and the rule "Derived/device-only data uses `saveLocal()`".
- Whether `normalizeDraft()` stays in `mergeDB` (still harmless for the local draft) or moves to the local load path only. The Log tab must render when the remote draft is malformed or absent (DRAFT-03). Test this directly with a malformed remote `draft`.
- Schema/migration: only if the chosen storage shape needs one. If a migration rewrites rows, follow the CLAUDE.md migration rule (touch, persist immediately, stale-device replay test).
- Commit discipline: same as Phase 1. Don't delete any frozen `_legacy` differential function in the same commit that changes its live counterpart. If `mergeDB_legacy` differential tests assume draft follows recency, update the test's expectation explicitly rather than editing the frozen function.

### Deferred Ideas (OUT OF SCOPE)
None. Cross-device workout handoff was explicitly declined (D-01).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DRAFT-01 | The in-progress workout `draft` is excluded from cloud sync, following the pattern already used for the `wx` weather cache | See "Standard Stack → wx exclusion pattern (verified)" and "Code Examples → mergeDB strips draft" |
| DRAFT-02 | A stale cloud document still carrying a legacy `draft` field cannot reintroduce one onto a device | See "Code Examples → mergeDB strips draft" + "adoptMerged reattaches local draft" (covers every merge/adopt call site, enumerated in "Integration Points — every call site, verified") |
| DRAFT-03 | The Log tab renders correctly when a cloud document carries a malformed legacy `draft` | See "Runtime State Inventory" is N/A (no migration); see "Common Pitfalls → Pitfall 3" and existing `normalizeDraft()`-on-boot tests (already passing, unaffected) |
| DRAFT-04 | Finishing or discarding a workout no longer writes draft state across the wire | See "Code Examples", "Integration Points" — `finishWorkout`/`discardWorkout` already null `DB.draft` before `save()`; wire-boundary stripping is the defense-in-depth layer |
| DRAFT-05 | Ian's in-progress workout survives closing and reopening the app on the same device | See "Architecture Patterns → save() vs saveLocal()" — `saveLocal()` still persists to `localStorage[KEY]` synchronously; only the push side-effect is skipped |
</phase_requirements>

## Summary

This phase closes one specific sync boundary in a single-file PWA (`index.html`, one inline `<script>`, no build step, no dependencies). The in-progress workout (`DB.draft`) is a scalar field on the same `DB` blob that syncs to Firestore as one JSON document. Today `draft` crosses that wire on every `save()` call and is repaired-or-nulled by recency inside `mergeDB()`; the fix is to make it behave exactly like `wx` (the weather cache) already does — excluded from every wire-boundary write, and reattached from the calling device's own live `DB.draft` wherever a merge result becomes the new local `DB`.

The correct architecture, confirmed by reading `mergeDB`, `adoptMerged`, `snapPayload`, `pushNow`, `importData`, and `onSignedIn` directly: **`mergeDB()` unconditionally deletes `draft` from its output in both branches** (mirroring the existing `delete win.wx` / `delete out.wx`), and **`adoptMerged()` reattaches the calling device's own current `DB.draft`** onto the merge result before it becomes the new local `DB` (mirroring the existing `wx` reattachment three lines above it). Because `mergeDB()`'s raw output is what gets `JSON.stringify`'d straight into the Firestore transaction (`pushNow`'s `blob`), this is also literally "the push transaction" fix, not a separate one. Two additional call sites bypass `mergeDB`/`adoptMerged` entirely and need the identical one-line treatment by hand: `importData()`'s Merge and Replace branches, and `onSignedIn()`'s first-link "use the cloud copy only" choice — both already contain the equivalent `wx` reattachment idiom on the exact line that needs the `draft` counterpart added.

The single largest verified risk in this phase is **not** the production code change — it is small and mirrors an established pattern almost byte-for-byte. It is the **differential test harness**. `mergeDB` is compared against the frozen `mergeDB_legacy` twin across ~800+ synthetic and real-backup cases via a helper (`legacyView()`) that currently does **not** exclude the `draft` field from comparison. Once `mergeDB`'s draft behavior diverges from `mergeDB_legacy`'s (by design — that is the whole point of this phase), every one of those cases will report a spurious "merge parity" mismatch, and every recorded hash in `test/fixtures/merge-golden.json` will need regenerating. This is fully mechanical (add `'draft'` to the fields `legacyView()` strips, then run `WRITE_MERGE_GOLDEN=1 node test/app.test.js` once), but it is **required**, not optional — the suite goes from 748 passed to potentially 800+ failures if this step is skipped. Two specific existing tests assert the *old* recency-based repair behavior on a remote draft and must be rewritten to assert the *new* strip-and-discard behavior; both are cited by exact line number below.

**Primary recommendation:** Keep `draft` inside the `DB` blob (do not move it to its own `localStorage` key); strip it at every wire boundary the way `wx` already is. No `SCHEMA` bump or migration is needed — stripping happens automatically on the next ordinary merged write, exactly as D-04 specifies.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| In-progress workout state (`DB.draft`) | Browser/Client (`localStorage`) | — (never) | Explicitly device-local by D-01; must never reach the Database/Storage tier at all |
| Cloud sync of completed data (`sessions`, `weights`, etc.) | Browser/Client ↔ Database/Storage (Firestore) | — | Unaffected by this phase; only the exclusion of one field changes |
| Malformed-input defense for a legacy remote `draft` | Browser/Client (`normalizeDraft()`, `render()`'s per-view try/catch) | — | Client-only app, no server; the only place a bad field can be neutralized is before it reaches a view |
| Local backup/export (JSON download) | Browser/Client | — | `exportData()` runs entirely client-side, no network |
| Version history (`versions` subcollection) | Browser/Client → Database/Storage (Firestore) | — | `cloudVersion()` writes `snapPayload(DB)` directly to Firestore; in scope because it is a second, less obvious cloud-write path carrying the same field (see Pitfall 7) |

## Standard Stack

No new libraries. This is a same-file, same-language change to an existing single-file PWA (`index.html`) with no build step and no dependencies (`package.json` declares none). The relevant existing internal "stack" being extended:

### Core (existing, being extended — not introduced)
| Function | Location (verified) | Purpose | Why it's the right lever |
|----------|---------------------|---------|---------------------------|
| `mergeDB(remote, local, localWins)` | index.html:4130 | The one per-sync merge function; already strips `wx` via `delete win.wx` (4142) / `delete out.wx` (4163) | Add `delete win.draft;` / `delete out.draft;` next to the existing `wx` lines — same function, same pattern, verified in this session |
| `adoptMerged(merged, label)` | index.html:4275 | The one place a merge result becomes the new local `DB`; already reattaches `wx` via `const wx = DB.wx;` (4277) → `if(wx!==undefined) withWx.wx = wx;` (4282) | Add the identical `draft` reattachment two lines below the `wx` one |
| `snapPayload(d)` | index.html:772 | Strips `wx` from every local-snapshot AND cloud-version-history payload: `const c=Object.assign({},d); delete c.wx; return c;` | Add `delete c.draft;` — this single change also fixes `cloudVersion()`'s Firestore `versions` write (see Pitfall 7), which the CONTEXT integration-points list does not separately call out |
| `saveLocal()` | index.html:792 | `localStorage.setItem(KEY, JSON.stringify(DB))` with no `updatedAt` bump and no push | The existing mechanism D-09 requires draft mutators to switch to |
| `normalizeDraft(d)` | index.html:656 | Repairs a short/unknown local draft or nulls it if unusable | Already correct for the local-boot path; no change needed there |

**Installation:** none — no `npm install` step for this phase.

**Package Legitimacy Audit:** N/A — this phase installs no external packages. `package.json` remains dependency-free (`"description": "...no dependencies, no build step"`), consistent with the project's buildless, offline-first architecture.

## Storage Shape Decision (Claude's Discretion, resolved)

Two options were on the table per CONTEXT.md. Recommendation: **Option A — keep `draft` inside the `DB` blob, strip at every wire boundary.**

### Option A: Keep in `DB` blob, strip at wire boundary (RECOMMENDED)
- **Matches D-04/D-05's own wording exactly.** Both decisions describe the fix in terms of "the same exclusion pattern already used for the `wx` weather cache" and "just as `wx` is preserved in `adoptMerged` today" — this is describing Option A, not Option B.
- **Zero blast radius on read sites.** `DB.draft` is read or written directly at roughly 45 call sites across `viewActive`, `viewPicker`, `viewToday`'s Resume card, the glance pill, the rest timer, and every draft mutator (verified via full-file grep, this session). None of these need to change.
- **No `SCHEMA` bump, no migration.** `draft` is not a `COLLECTIONS` entry (it is a scalar `DB` field, like `wx`); `ensureCollectionDefaults()` (SCHEMA 18's migration) never touches it. Stripping happens automatically on the next merged write — exactly what D-04 specifies ("No separate one-off migration write").
- **Cost:** touches 6 distinct wire-boundary sites by hand (enumerated below) rather than one storage shim, and requires updating the differential-test comparison helper (`legacyView()`) — see Common Pitfalls.

### Option B: Own `localStorage` key (NOT recommended)
- Would require migrating ~45 verified read/write call sites from `DB.draft` to a new global (e.g. a module-level `let DRAFT`), a large, purely mechanical, high-blast-radius rename across a 4,654-line single file with no compiler or type checker to catch a missed site — exactly the failure mode CLAUDE.md's incident history (the 2026-07-25 blind-write, Migration 15) warns is how this codebase loses data: a missed edit in one of many places.
- Requires its own quota-handling and load/save story, duplicating machinery `saveLocal()`/`load()`/`normalize()` already provide for `KEY`.
- The two migrations that already touch `d.draft` in place (`renameLoggedExercise` at index.html:631, `buildExerciseRegistry` at index.html:584, both read/write `d.draft.entries`/`d.draft.extras` during `normalize()`) would need a second entry point into a second storage location.
- Structurally guarantees the field can never leak onto the wire (its only real advantage) — but Option A's 6 wire-boundary sites are a small, fully enumerable, testable set (below), so this guarantee is achievable at much lower risk with Option A.

**Verdict:** Option A. No `SCHEMA`/migration needed.

## Integration Points — every call site, verified

Every path by which `draft` currently enters or leaves `DB`, located by reading the file directly (not inferred):

### Wire-boundary sites needing a code change (6 total)

1. **`mergeDB()` gen-mismatch branch** — index.html:4137-4144:
   ```js
   if(rG !== lG){
     const win = Object.assign({}, blank(), lG > rG ? l : r);
     win.gen = Math.max(rG, lG);
     win.updatedAt = Math.max(+r.updatedAt||0, +l.updatedAt||0);
     win._schema = Math.max(+r._schema||0, +l._schema||0, SCHEMA);
     delete win.wx;
     return win;
   }
   ```
   Needs `delete win.draft;` next to `delete win.wx;`. This is the branch D-04 specifically calls out ("including the gen-mismatch wholesale-replace branch, which currently copies the winning side wholesale") — confirmed: `Object.assign({}, blank(), lG > rG ? l : r)` copies the winning side's `draft` wholesale today.

2. **`mergeDB()` recency branch** — index.html:4148-4164 (the `normalizeDraft(out)` call at 4159 and `delete out.wx` at 4163):
   ```js
   const out = Object.assign({}, blank(), older, newer); // start from newer's scalars, guarantee all blank() keys
   mergeCollections(r, l, localNewer, out);
   normalizeDraft(out);   // ← recommend removing (repairs a value about to be discarded — see below)
   // ── invariants ──
   out._schema = Math.max(+r._schema||0, +l._schema||0, SCHEMA);
   out.updatedAt = Math.max(rU, lU);
   delete out.wx; // weather is derived cache — excluded from sync entirely (see saveLocal)
   return out;
   ```
   Needs `delete out.draft;` next to `delete out.wx;`. **Do not edit `mergeDB_legacy` (index.html:4167-4218) — frozen for REG-13, edit only the live `mergeDB`.**

3. **`adoptMerged()`** — index.html:4275-4293 (the `wx` reattachment at 4277/4282):
   ```js
   function adoptMerged(merged, label){
     try{
       const wx = DB.wx;                                               // keep this device's own weather cache (not synced)
       const withWx = Object.assign({}, merged); if(wx!==undefined) withWx.wx = wx;
       if(JSON.stringify(withWx)===JSON.stringify(DB)) return false;   // nothing changed; don't churn the UI
       snapshotNow(label||'before-sync');
       DB = normalize(withWx);
       ...
   ```
   Needs a `const draft = DB.draft;` alongside `const wx = DB.wx;`, and `if(draft!==undefined) withWx.draft = draft;` alongside the `wx` reattachment. This is **the single fix that covers every `mergeDB`+`adoptMerged` pairing** (sign-in merge at 4333, live-listener merge at 4350-4351, post-push reconciliation at 4381-4382) — verified by grepping every `mergeDB(`/`adoptMerged(` call site in the file (7 call sites total; 5 of the 7 route through this one function).

4. **`onSignedIn()`'s first-link "use the cloud copy only" choice** — index.html:4323-4331 (this bypasses `mergeDB` entirely):
   ```js
   if(c==='C'){ adoptMerged(Object.assign(normalize(remoteDB),{wx:DB.wx}), 'chose-cloud'); }
   else if(c==='D'){ /* keep local as-is */ }
   else { adoptMerged(mergeDB(remoteDB, DB), 'first-link-merge'); }
   ```
   The `'C'` branch calls `normalize(remoteDB)` directly — if the remote doc carries a well-formed legacy `draft`, `normalizeDraft()` would happily adopt it (it only nulls *unusable* drafts, not merely-remote ones). Needs `draft:DB.draft` added to the `Object.assign`, mirroring the `wx:DB.wx` already there on the same line. **This exact line is already cited in CONTEXT.md's code_context as a `wx`-pattern reference point** — confirming the plan author anticipated this site.

5. **`importData()` Merge branch** — index.html:3585-3589:
   ```js
   if(merge){
     snapshotNow('before-import');
     const wx=DB.wx; DB=mergeDB(normalize(raw), DB, true); if(wx!==undefined) DB.wx=wx; DB.updatedAt=Date.now();
     DB.lastBackupAt=Date.now(); save(); cloudVersion('import'); toast('Backup merged ✓'); render(); return;
   }
   ```
   Bypasses `adoptMerged`. Needs `const draft=DB.draft;` before the `mergeDB` call and `if(draft!==undefined) DB.draft=draft;` alongside the existing `wx` reattachment — satisfies D-06 (imported `draft` ignored) and D-08 (local draft kept).

6. **`importData()` Replace branch** — index.html:3590-3594:
   ```js
   if(confirm('Replace ALL current data with this backup?...')){
     snapshotNow('before-import');
     const g=(+DB.gen||0)+1;
     const wx=DB.wx; DB=normalize(raw); if(wx!==undefined) DB.wx=wx; DB.gen=g; DB.updatedAt=Date.now();
     DB.lastBackupAt=Date.now(); save(); cloudVersion('import'); toast('Backup restored'); render(); } }
   ```
   `DB=normalize(raw)` directly adopts `raw.draft` (repaired-or-nulled, not stripped) today — a genuine gap D-06 flags. Same fix as #5: capture local `draft` before, reattach after.

### Sites verified to need NO change

- **`wipe()`** — index.html:3601: `DB=blank(); DB.gen=g; save();`. `blank()` already sets `draft:null`. D-08 ("Erase all data clears the local draft") is already satisfied by existing code — verified, no edit needed.
- **`normalize()`/`load()`** — index.html:667-691. `normalizeDraft(d)` is already called at the end of `normalize()` (line 682) and continues to protect the local boot path exactly as today. No change.
- **The two migrations that mutate `d.draft` in place** — `buildExerciseRegistry()` (index.html:584-630, touches `d.draft.entries`/`d.draft.extras` at 625-628) and `renameLoggedExercise()` (index.html:631-644, touches `d.draft.entries`/`d.draft.extras` at 639-641). These only ever run on `normalize()`'s local-boot path (never on merge output, since `mergeDB()` never calls `normalize()`), so they are unaffected and correctly out of scope.
- **`firestore.rules`** — grepped for `draft`; the only match is prose ("An earlier *draft* of this file included..."), unrelated to `DB.draft`. No rules change needed.

### Sites needing a *different* kind of change — the exported JSON backup

- **`exportData()`** — index.html:3372-3377:
  ```js
  function exportData(){
    const blob = new Blob([JSON.stringify(DB,null,2)],{type:'application/json'});
    ...
  }
  ```
  Currently serializes `DB` **raw** — no stripping at all, not even `wx`. D-06 requires `draft` excluded from this file. **Do not reuse `snapPayload()` here** — it also strips `wx`, which is not requested for the full JSON backup and would be an unrequested behavior change. Recommend a minimal explicit strip: `const payload = Object.assign({}, DB); delete payload.draft;` then serialize `payload`.

### Draft mutators — `save()` → `saveLocal()`, with one verified exception

Every function that writes `DB.draft` was located and read directly. Per D-09, pure-draft mutators should switch from `save()` (bumps `updatedAt`, schedules a push) to `saveLocal()` (persists to `localStorage` only). **Two of them must NOT switch** — they also touch `DB.exercises`, a genuinely synced collection, via `exEnsure()`:

| Function | Location | Touches only `DB.draft`? | Recommended call |
|----------|----------|---------------------------|-------------------|
| `setVal` | 1907 | yes | `saveLocal()` |
| `setNote` | 1908 | yes | `saveLocal()` |
| `setSessionNote` | 1909 | yes | `saveLocal()` |
| `rollWeight` | 1912-1922 | yes | `saveLocal()` |
| `addSet` | 1923 | yes | `saveLocal()` |
| `rmSet` | 1924 | yes | `saveLocal()` |
| `skipSet` | 1925-1930 | yes | `saveLocal()` |
| `unskipSet` | 1931 | yes | `saveLocal()` |
| `stairVal` | 1932 | yes | `saveLocal()` |
| `stairTimeSet` | 1933-1937 | yes | `saveLocal()` |
| `repCheck` | 1939-1945 | yes (`sets[k]._cel` flag) | `saveLocal()` |
| `setDraftDate` | 1884 | yes | `saveLocal()` |
| `setDraftDur` | 1885 | yes | `saveLocal()` |
| `skipStairs` | 1962 | yes | `saveLocal()` |
| `unskipStairs` | 1963 | yes | `saveLocal()` |
| `undeloadExercise` | 1138 | yes | `saveLocal()` |
| `startWorkout` | 1700-1725 | yes (creates draft) | `saveLocal()` |
| `startBackdate` | 1734-1742 | yes (creates draft) | `saveLocal()` |
| `editSession`'s draft build | 2205-2221 | yes (builds draft from history; does not touch `DB.sessions`) | `saveLocal()` |
| `discardWorkout` | 2034 | yes (`DB.draft=null`) | `saveLocal()` |
| `exSet` | 2723 | yes | `saveLocal()` |
| `exRoll` | 2724 | yes | `saveLocal()` |
| `exAddSet` | 2725 | yes | `saveLocal()` |
| `exRmSet` | 2726 | yes | `saveLocal()` |
| **`pickEx`** | 1898-1906 | **NO** — `e.exId = exEnsure(sel.value)` (1905) or via `resolveTypedName()` → `exEnsure()` (1901) mutates `DB.exercises` via `exRows().push(touch({...}))` (index.html:1184) | **KEEP `save()`** |
| **`exPick`** | 2714-2721 | **NO** — same `exEnsure()` call, both branches (2718, 2721) | **KEEP `save()`** |
| `finishWorkout` | 1989-2031 | NO — pushes to `DB.sessions` (line 2026); `DB.draft=null` happens first (line 2028), so it is already null by the time `save()` runs | **KEEP `save()`** (per D-09: "Syncing happens when Finish lands the session in `sessions` — the existing `save()` on finish") |

A naive blanket find-replace of every `save()` call inside a function that touches `DB.draft.*` would silently stop syncing newly-typed custom exercise names across devices via `pickEx`/`exPick` — this is the one non-obvious exception, verified by tracing `exEnsure()`'s body.

**A secondary, minor tradeoff:** `save()` also calls `pruneDeleted()` and `maybeDailySnapshot()`; `saveLocal()` does neither. If a whole day's only actions are draft-only edits (no finish, no discard, no other real save), the daily local snapshot for that day would not fire from those calls — it will still fire from any other same-day `save()` call (a weigh-in, a hobby log, etc.), and from `finishWorkout()`/`discardWorkout()` if the workout is completed or discarded. This is a small, known, accepted consequence of D-09 and does not violate any DRAFT requirement; worth a one-line note in the plan, not a blocker.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Excluding a scalar `DB` field from every sync path | A new "excluded fields" list/config object, or a JSON schema filter | The existing `delete x.wx` / reattach-in-`adoptMerged` idiom, applied identically to `draft` | The codebase already solved this exact problem for `wx`; a second, differently-shaped mechanism for the same problem is the kind of divergence Phase 1's whole `COLLECTIONS` registry exists to prevent |
| Detecting whether a draft mutator is "pure draft" | Static analysis / a generic AST scan | The 26-item manual table above, already verified by reading every call site | The one exception (`pickEx`/`exPick` touching `exEnsure()`) is a semantic fact about this specific codebase that only reading the function bodies reveals |
| Comparing legacy vs. derived merge output when a field is intentionally allowed to diverge | A new comparison framework | Extend the existing `legacyView()` helper's exclusion list (already excludes post-baseline `COLLECTIONS` names) to also exclude `'draft'` | `legacyView()` already exists for exactly this purpose (fields legitimately absent from the legacy code's comparison scope) |

**Key insight:** every mechanism this phase needs (exclude-from-wire, reattach-local-value-after-merge, discretionary-comparison-exclusion) already exists in the codebase for `wx`. The job is applying the same three mechanisms to a second field, not inventing new ones.

## Common Pitfalls

### Pitfall 1: The differential test harness will report ~800 false failures if `legacyView()` isn't updated first
**What goes wrong:** `mergeDB` and `mergeDB_legacy` are compared via `legacyView()` (index.html — actually `test/app.test.js:479-484` defines `canon()`, and the `legacyView()` helper around the REG-13 differential block strips every `COLLECTIONS` key not in `LEGACY_COLLECTIONS` before comparing — but `draft` is not a `COLLECTIONS` name, so it is currently **retained** in every comparison. Once `mergeDB`'s draft handling diverges from the frozen `mergeDB_legacy`'s (by design), literally every `sameMerge()` call (dozens of named incident tests, plus the 400-case random differential battery at `test/app.test.js:~1082-1105`, plus every `realMerge()` call in the real-backup block) will report a "merge parity" mismatch on the `draft` key.
**Why it happens:** `mergeDB_legacy` is frozen (must never be edited — REG-14/this phase's own commit-discipline rule) and still does draft-by-recency; `mergeDB` will do draft-always-stripped. That is a genuine, intentional divergence — not a bug — but the test harness's comparison function doesn't know that yet.
**How to avoid:** Add `'draft'` to whatever `legacyView()` already strips (verified location: the differential block starting `test/app.test.js:~665` — function `legacyView(out)` deletes `COLLECTIONS` keys not in `LEGACY_COLLECTIONS`; extend it, or add a parallel unconditional `delete copy.draft;`, before the per-field comparison). This is test code, not the frozen production function — editing it is in scope and required.
**Warning signs:** A green baseline of 748 passed suddenly shows hundreds of new `FAIL merge parity: ...` and `FAIL golden: ...` lines after only touching `mergeDB()`.

### Pitfall 2: `test/fixtures/merge-golden.json` must be regenerated after fixing Pitfall 1, or every golden check fails
**What goes wrong:** `golden(label, legacyText, derivedText)` (`test/app.test.js:56-63`) hashes the *canonical* (post-`legacyView()`) text with `fnv1a()` and compares against a committed hash. Once `legacyView()`'s canonicalization changes (by excluding `draft`), every previously-recorded hash in `test/fixtures/merge-golden.json` becomes stale — even for cases where `draft` was always `null` on both sides, because removing a key changes the JSON string being hashed.
**Why it happens:** The goldens are a permanent record of the *frozen* legacy function's own output, recorded once and checked forever (so the equivalence proof survives REG-14's eventual deletion of `mergeDB_legacy`). Changing what gets canonicalized invalidates every recorded hash, not just the draft-related ones.
**How to avoid:** After fixing Pitfall 1 (and only after), regenerate with `WRITE_MERGE_GOLDEN=1 node test/app.test.js` and commit the updated `test/fixtures/merge-golden.json`. This is safe — it re-records the *legacy* function's own output, which hasn't changed; only the canonicalization changed.
**Warning signs:** `golden: merge:...` and `golden: random battery...` failures with `"no golden recorded"` or `"hash differs"` extras, at a volume matching essentially the entire differential suite.

### Pitfall 3: Two existing tests assert the *old* recency-based repair behavior on a remote draft and must be rewritten
**What goes wrong:** Two tests directly call `mergeDB()` with a malformed or unknown-workout remote draft and assert that `mergeDB` *repairs and returns* it:
- `test/app.test.js:2560-2566` — `"the sync merge repairs a malformed draft as well"`: asserts `out.draft && out.draft.workout === 'PUSH 1' && !!out.draft.stairs`.
- `test/app.test.js:2567-2572` — `"…and still drops one with an unknown workout (the 2026-07-25 guard)"`: asserts `a.mergeDB(remote, local, false).draft === null`.

Under the new design, `mergeDB()` never returns a `draft` key at all (regardless of whether the remote value was well-formed, malformed, or absent) — both assertions become false: `out.draft` is `undefined`, not a repaired object or explicit `null`.
**Why it happens:** These tests encode the *pre-Phase-4* design intentionally (the comment above them, `test/app.test.js:2527-2533`, says "mergeDB's output does not pass back through normalize()" — explaining why `mergeDB` used to have to repair remote drafts itself). That comment becomes stale text describing removed behavior once this phase ships.
**How to avoid:** Rewrite both assertions to check `!('draft' in out)` (or `out.draft === undefined`) for every remote-draft shape (well-formed, missing `stairs`, unknown `workout`) — these can likely collapse into one parameterized test: "mergeDB never returns a draft field, regardless of remote content." Also update the stale comment at `test/app.test.js:2527-2533`. Separately, keep (unchanged) the five tests at `test/app.test.js:2545-2557` that call `a.normalize(d)` directly — those test the *local*-boot repair path, which is unaffected by this phase.
**Warning signs:** These two specific `FAIL` lines are easy to miss inside a large Pitfall-1-driven wall of failures; check for them by name after fixing Pitfalls 1-2.

### Pitfall 4: The "null draft beats a stale draft" incident test also needs its expectation updated
**What goes wrong:** `test/app.test.js:838-843` (`"a finished workout's null draft beats a stale draft"`) runs `sameMerge(...)` (which itself depends on Pitfall 1's fix) and then separately asserts `out.draft === null`. Under the new design this becomes `out.draft === undefined` (stripped unconditionally, not "null won the recency comparison").
**Why it happens:** Same root cause as Pitfall 3 — this test encodes the *mechanism* (recency comparison) rather than just the *outcome* (a stale draft can never resurrect), and the mechanism changes even though the safety property it was written to prove still holds (a stale remote draft still can never come back).
**How to avoid:** Update the assertion to `out.draft === undefined`; keep the test's *name* and its historical comment (the 2026-07-25 incident story) — the regression it guards against is still exactly what's being tested, just via a stronger mechanism now.
**Warning signs:** One specific `FAIL` line with extra `null` printed as the actual value once Pitfalls 1-2 are fixed.

### Pitfall 5: The test harness's `names` export allowlist is missing most functions this phase needs to test directly
**What goes wrong:** `test/harness.js:101-126` defines an explicit allowlist of function names exposed as `app.<name>` from the sandboxed `vm` context. Verified **NOT present**: `normalizeDraft`, `adoptMerged`, `snapPayload`, `pushNow`, `schedulePush`, `saveLocal`, `save`, `startWorkout`, `startBackdate`, `finishWorkout`, `discardWorkout`, `wipe`, `importData`, `cloudVersion`, and every draft mutator (`setVal`, `pickEx`, etc.). `mergeDB`, `mergeDB_legacy`, `normalize`, `blank`, `validateBackup`, `touch`, `exEnsure`, and `viewActive` ARE already present.
**Why it happens:** The harness only exports what earlier phases needed to test directly; this phase needs to assert on several functions no earlier phase touched.
**How to avoid:** Add the specific names this phase's tests need to `test/harness.js`'s `names` array before writing those tests (Wave 0 gap, see Validation Architecture below). Prefer testing through already-exported pure functions (`mergeDB`, `normalize`) where an existing test pattern already does so (e.g. the malformed-draft tests at `test/app.test.js:2536-2572` set `a.DB` directly and call `a.normalize`/`a.mergeDB` — no new export needed for that style); add new exports only for behavior that can't be reached that way (e.g. `adoptMerged`'s reattachment, `saveLocal` vs `save` call-site verification, `snapPayload`'s new exclusion).
**Warning signs:** `app.adoptMerged is not a function` (or similarly `undefined`) errors when a new test tries to call an unexported function.

### Pitfall 6: `importData()`'s Replace branch may be unreachable in the test harness as written
**What goes wrong:** `test/harness.js:85` stubs `confirm: () => true` unconditionally. `importData()` (index.html:3579-3598) does `const merge = confirm('Merge this backup...')`, which will always be `true` in the harness, so the function always takes the Merge branch and `return`s — the Replace branch (behind a second, nested `confirm(...)`) is never reached by calling `importData()` as-is inside a test.
**Why it happens:** No existing test calls `importData()` at all (verified: zero matches for `importData` in `test/app.test.js` outside this research); the codebase's established pattern is to test pure logic functions directly (`mergeDB`, `normalize`) rather than drive dialog-based UI flows. This is genuinely new territory for this test suite.
**How to avoid:** Two viable options, not yet tried in this codebase — spike whichever is chosen early in the plan:
  1. **Extract pure helpers** — e.g. `importMerge(raw)` / `importReplace(raw)` that take already-parsed, already-confirmed input and contain the exact merge/replace + draft-reattachment logic, called by `importData()` after its `FileReader`/`confirm()` orchestration. Add both to `test/harness.js`'s `names`. This matches the codebase's existing convention (pull logic into small named, directly-testable functions) and sidesteps the `confirm()` stub entirely.
  2. **Override `app.__sandbox.confirm` per test** — `loadApp()` exposes `api.__sandbox = sandbox` (`test/harness.js:131`), and since the inline script resolves the free identifier `confirm` against the `vm` context's global object at *call* time (not at parse time), reassigning `app.__sandbox.confirm = () => false` before invoking `importData()` should route execution into the Replace branch. This is a reasonable inference from `vm` module semantics but has **no existing precedent in this test suite** (verified: zero uses of `__sandbox.confirm =` anywhere in `test/app.test.js`) — treat as unverified until spiked.
**Warning signs:** A test written against `importData()` for the Replace path silently exercises the Merge path instead and passes for the wrong reason.

### Pitfall 7: `cloudVersion()` is a second, easy-to-miss cloud-write path carrying the same field
**What goes wrong:** `cloudVersion(label)` (index.html:4417 onward) builds `const payload = snapPayload(DB);` and writes `blob: JSON.stringify(payload)` directly to a Firestore `versions` subcollection (`SYNC.docRef.collection('versions').add(...)`). This is called from `finishWorkout` (safe today — draft is already null by then), but also from `deleteSession` (`cloudVersion('delete')`), a weigh-in log (`cloudVersion('weigh-in')`, index.html:2483), import (`cloudVersion('import')`), a successful push (`cloudVersion('push')`, index.html:4386), and snapshot restore (`cloudVersion('before-restore')`) — several of which can fire **while a workout is actively in progress** (e.g. Ian logs a bodyweight entry mid-workout). Today, `snapPayload()` only strips `wx`, so the live in-progress `draft` — including partially-entered sets — is already being written into Firestore version history in these cases, pre-dating this phase.
**Why it happens:** `snapPayload()` is shared by both the local snapshot ring (`snapshotNow`) and the cloud version history (`cloudVersion`), but only D-07 (framed around the local ring) explicitly asks for the extension — the cloud-history angle isn't separately named in CONTEXT.md's Integration Points list.
**How to avoid:** Extending `snapPayload()` per D-07 (`delete c.draft;` alongside `delete c.wx;`) fixes both paths for free, since both funnel through this one function. Call this out explicitly when verifying DRAFT-01/04 — "no cloud write containing draft" should be checked against `cloudVersion`'s Firestore write too, not only `pushNow`'s.
**Warning signs:** A test asserting "no cloud write contains draft" that only inspects `pushNow`'s transaction payload and never inspects `snapPayload(DB)`'s output directly would pass while this second path still leaked draft state, prior to the `snapPayload` fix.

## Code Examples

Illustrative sketches based on the verified call sites above — exact wording is the plan/executor's call, but the shape and location are confirmed by reading the file directly.

### mergeDB — strip draft in both branches, mirroring wx
```js
// index.html:4130, gen-mismatch branch (~4137-4144)
if(rG !== lG){
  const win = Object.assign({}, blank(), lG > rG ? l : r);
  win.gen = Math.max(rG, lG);
  win.updatedAt = Math.max(+r.updatedAt||0, +l.updatedAt||0);
  win._schema = Math.max(+r._schema||0, +l._schema||0, SCHEMA);
  delete win.wx;
  delete win.draft;      // NEW — draft never crosses the wire, mirrors wx (D-04)
  return win;
}
...
// recency branch (~4148-4164)
const out = Object.assign({}, blank(), older, newer);
mergeCollections(r, l, localNewer, out);
// normalizeDraft(out) removed — repairing a value that is about to be deleted is dead work;
// the LOCAL draft is protected on its own path (normalize()'s call to normalizeDraft(), line 682)
out._schema = Math.max(+r._schema||0, +l._schema||0, SCHEMA);
out.updatedAt = Math.max(rU, lU);
delete out.wx;
delete out.draft;        // NEW — mirrors wx (D-04)
return out;
```

### adoptMerged — reattach the calling device's own draft, mirroring wx
```js
// index.html:4275
function adoptMerged(merged, label){
  try{
    const wx = DB.wx;
    const draft = DB.draft;                                          // NEW
    const withWx = Object.assign({}, merged);
    if(wx!==undefined) withWx.wx = wx;
    if(draft!==undefined) withWx.draft = draft;                      // NEW
    if(JSON.stringify(withWx)===JSON.stringify(DB)) return false;
    snapshotNow(label||'before-sync');
    DB = normalize(withWx);
    ...
```

### snapPayload — extend the existing exclusion (fixes both the local ring and cloudVersion's Firestore write)
```js
// index.html:772
function snapPayload(d){ const c=Object.assign({},d); delete c.wx; delete c.draft; return c; }
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `draft` follows the same recency comparison as every other `DB` field in `mergeDB` (fixed 2026-07-25 to stop the resurrection loop, but still crosses the wire) | `draft` is unconditionally stripped from every merge output, reattached only from the calling device's own live state | This phase | Closes the remaining exposure the 2026-07-25 fix left open: a stale/malformed remote draft can no longer reach a device at all, not merely "lose a recency comparison most of the time" |
| `exportData()` serializes `DB` raw | `exportData()` strips `draft` before serializing | This phase | The downloadable JSON backup can no longer carry an in-progress workout |

**Deprecated/outdated:** the code comment at `index.html:4150-4158` (and its byte-identical twin in the frozen `mergeDB_legacy` at 4200-4208) describing "draft: already set correctly by Object.assign(newer) above — same recency rule as every other field" becomes stale prose in the *live* `mergeDB` once this phase ships (the frozen legacy twin's copy must stay untouched — it is describing what the frozen function still does).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Overriding `app.__sandbox.confirm` after `loadApp()` will actually redirect `importData()`'s branch choice at call time, per `vm` module free-identifier resolution semantics | Common Pitfalls → Pitfall 6 | If wrong, a test believed to exercise the Replace path silently exercises Merge instead and passes for the wrong reason — must be spiked with a trivial assertion before relying on it |

**All other claims in this research are `[VERIFIED]`** — confirmed by directly reading `index.html` (this session, current worktree state) and `test/app.test.js`/`test/harness.js`, with line numbers and verbatim quotes cited inline throughout. No package-registry or documentation lookups were needed (no external libraries involved).

## Open Questions

1. **Should the stale "draft: already set correctly..." comment in the frozen `mergeDB_legacy` (index.html:4200-4208) be left as-is or annotated?**
   - What we know: REG-14/this phase's commit discipline forbids editing the frozen function's *behavior* in the same commit as the live one's change.
   - What's unclear: Whether a comment-only annotation (not a behavior change) inside the frozen function is acceptable, or whether "frozen" means byte-for-byte untouched including comments.
   - Recommendation: Leave `mergeDB_legacy` completely untouched (comments included) — it is meant to be the verbatim historical reference (REG-13's stated purpose: "preserving the exact historical code the incidents were fixed against," per STATE.md's Phase 1 decision log). Put any clarifying note in the *live* `mergeDB`'s comment instead.

2. **Pitfall 6's two options (extract pure helpers vs. override `__sandbox.confirm`) — which does the planner choose?**
   - What we know: Both are technically viable; neither has precedent in this codebase.
   - What's unclear: Which better fits the plan's overall shape (this research doesn't have visibility into how many other Wave 0 harness changes are already planned).
   - Recommendation: Prefer extracting pure helpers (`importMerge`/`importReplace`) — it matches the codebase's existing convention of small, directly-testable, named functions (`mergeUnion`, `mergeDateMap`, `mergeCollections`, etc.) rather than relying on stub-override behavior that hasn't been proven in this suite.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Custom, dependency-free (`test/app.test.js`, run via plain `node`); no Jest/Mocha/Vitest |
| Config file | none — `package.json`'s `"test": "node test/app.test.js"` is the entire configuration |
| Quick run command | `npm test` (full suite; verified baseline this session: **748 passed, 0 failed, 2 skipped**, ~seconds) |
| Full suite command | `npm test` (same — there is no separate quick/full split; the whole suite runs in one process) |
| Golden regeneration command | `WRITE_MERGE_GOLDEN=1 node test/app.test.js` (required once, after Pitfall 1's `legacyView()` fix — see Wave 0 Gaps) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|---------------------|-------------|
| DRAFT-01 | `mergeDB`'s output never carries a `draft` key, any input shape | unit | `node test/app.test.js` (new assertion, replacing Pitfall 3's two tests) | ✅ — extend existing block at `test/app.test.js:2559-2572` |
| DRAFT-01 | `pushNow`'s Firestore `blob` (`JSON.stringify(merged)`) never contains `"draft"` | unit | `node test/app.test.js` (new test calling exported `mergeDB` and asserting on `JSON.stringify` of its output, since `pushNow` itself is not exported and touches `fbDb`) | ❌ Wave 0 — write new |
| DRAFT-02 | A legacy/malformed/well-formed remote draft never reaches local `DB.draft` via `adoptMerged` | unit | `node test/app.test.js` (new test exercising `mergeDB`+`adoptMerged` together) | ❌ Wave 0 — write new; requires exporting `adoptMerged` (Pitfall 5) |
| DRAFT-02 | `onSignedIn`'s `'C'` (cloud-only) choice does not adopt a remote draft | unit or integration | `node test/app.test.js` | ❌ Wave 0 — `onSignedIn` is not exported and touches `fbDb`/`fbAuth`; likely needs the `Object.assign(normalize(remoteDB),{wx:...,draft:...})` line's *shape* tested indirectly via `normalize`+manual reattachment, since the surrounding function can't run in the harness without a live Firebase stub |
| DRAFT-03 | Log tab renders without error on a malformed/absent remote draft | smoke (already covered) | `node test/app.test.js` — existing tests at `test/app.test.js:2536-2557` already assert this for the local/boot path; unaffected by this phase | ✅ existing, unaffected |
| DRAFT-04 | `finishWorkout`/`discardWorkout` produce no draft-bearing write | unit | `node test/app.test.js` | ❌ Wave 0 — requires exporting `finishWorkout`/`discardWorkout` (Pitfall 5) |
| DRAFT-05 | Close/reopen (i.e. `saveLocal()` then re-`load()`) preserves the draft exactly | unit | `node test/app.test.js` | ❌ Wave 0 — requires exporting `saveLocal` (Pitfall 5), or can be tested indirectly via `normalize(JSON.parse(JSON.stringify(DB)))` round-trip without exporting `saveLocal` itself |
| D-06 | Import (Merge and Replace) ignores a `draft` in the file, keeps the local one | unit | `node test/app.test.js` | ❌ Wave 0 — blocked on Pitfall 6's resolution |
| D-07 | `snapshotNow`/`cloudVersion` payloads exclude `draft` | unit | `node test/app.test.js` | ❌ Wave 0 — requires exporting `snapPayload` (Pitfall 5) |
| Merge-law/differential parity | `mergeDB` vs. `mergeDB_legacy` stay comparable on every non-draft field | regression (existing, ~800 cases) | `node test/app.test.js` | ✅ existing — blocked on Pitfall 1 (`legacyView()`) + Pitfall 2 (golden regeneration) before it goes green again |

### Sampling Rate
- **Per task commit:** `npm test` (the whole suite runs in well under a minute; there is no faster subset command in this codebase)
- **Per wave merge:** `npm test`
- **Phase gate:** `npm test` green (748+ passed, 0 failed) before `/gsd-verify-work`, **and** `test/fixtures/merge-golden.json` regenerated and committed if Pitfall 1's `legacyView()` change lands

### Wave 0 Gaps
- [ ] `test/harness.js`'s `names` array (101-126) — add `adoptMerged`, `snapPayload`, `saveLocal`, `save`, `startWorkout`, `startBackdate`, `finishWorkout`, `discardWorkout`, `setVal` (or the specific subset the plan's tests call directly). `normalizeDraft` only if a test wants to call it standalone rather than through `normalize`.
- [ ] `test/app.test.js`'s `legacyView()` helper — extend to strip `'draft'` from the comparison (Pitfall 1), **before** touching `mergeDB`'s production code, so the baseline the diff is measured against is meaningful.
- [ ] `test/fixtures/merge-golden.json` — regenerate via `WRITE_MERGE_GOLDEN=1 node test/app.test.js` after the `legacyView()` change (Pitfall 2). Commit the result.
- [ ] Two tests at `test/app.test.js:2560-2572` and the assertion at `test/app.test.js:838-843` — rewrite expectations (Pitfalls 3-4).
- [ ] Resolve Pitfall 6 (importData Replace-branch reachability) before writing the D-06/D-08 import tests — spike whichever option is chosen first.

## Security Domain

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V1 Architecture | yes | This phase *is* an architecture/trust-boundary change — narrowing what crosses the client↔Firestore boundary. No new pattern needed beyond what's documented above. |
| V2 Authentication | no | Unchanged — Firebase Auth email/password, untouched by this phase |
| V3 Session Management | no | Unchanged |
| V4 Access Control | no | Unchanged — `firestore.rules` isolates by `request.auth.uid`; verified no `draft`-specific rule exists or is needed (the whole document is already scoped per-user) |
| V5 Input Validation | yes | Existing `normalizeDraft()` (index.html:656) is the standard control for a malformed remote/legacy `draft` shape — this phase does not need a new validator, only to stop routing untrusted remote data through the one that exists |
| V6 Cryptography | no | Unchanged |
| V8 Data Protection / minimization | yes | The whole phase is a data-minimization change: an ephemeral, device-local field should never have been replicated to a third-party datastore or a downloadable backup in the first place |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| A malformed/legacy field arriving from a synced document crashes a view (client-side DoS against the app's own UI, not the network) | Tampering / Denial of Service | `normalizeDraft()` on the local-boot path (unchanged by this phase); wire-boundary stripping in `mergeDB` means a malformed *remote* draft can no longer reach this code path at all after this phase, which is a stronger mitigation than repair-on-read |
| Unnecessary replication of ephemeral/sensitive client state to a cloud datastore and a local downloadable file | Information Disclosure (minor — single-user app, but still real: partially-logged workout data currently appears in Firestore `versions` history and JSON backups) | Data minimization — stop writing the field at the boundary (this phase), rather than relying on downstream consumers to ignore it |

## Sources

### Primary (HIGH confidence — read directly this session)
- `index.html` (current worktree state, 4,654 lines) — `mergeDB`, `mergeDB_legacy`, `adoptMerged`, `onSignedIn`, `pushNow`, `startLiveSync`, `snapPayload`, `save`, `saveLocal`, `normalizeDraft`, `normalize`, `blank`, `load`, `MIGRATIONS`, `importData`, `validateBackup`, `exportData`, `wipe`, every draft-mutator function, `exEnsure` — read in full via multiple `Read`/`Grep` passes this session.
- `test/app.test.js` (3,507 lines) and `test/harness.js` (178 lines) — read directly for the differential-test structure, `legacyView()`/`canon()`/`golden()` mechanics, the `names` export allowlist, and existing draft-related test coverage.
- `.planning/phases/04-draft-goes-device-local/04-CONTEXT.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/ROADMAP.md`, `.planning/codebase/CONCERNS.md`, `.planning/config.json`, `CLAUDE.md` — read directly this session.
- `firestore.rules` — grepped for `draft`; no relevant match.
- `npm test` run directly this session: 748 passed, 0 failed, 2 skipped (baseline).

### Secondary (MEDIUM confidence)
None — no external documentation lookups were needed for this phase (no new libraries, no framework, pure internal-codebase research).

### Tertiary (LOW confidence)
None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; every function cited was read directly this session with exact line numbers
- Architecture: HIGH — the `wx` pattern this phase mirrors was read in full, and every call site that needs to change (or explicitly doesn't) was verified by reading the function body, not inferred from a comment
- Pitfalls: HIGH for Pitfalls 1-5 and 7 (verified by reading the exact test code and production code involved); MEDIUM for Pitfall 6 (the two proposed resolutions are reasoned from `vm` module semantics and codebase convention but neither has been executed/spiked in this session — flagged as Assumption A1)

**Research date:** 2026-09-22
**Valid until:** 2026-10-06 (internal-codebase research tied to current worktree state; re-verify line numbers if other work lands in `index.html`/`test/app.test.js` before this phase is planned)
