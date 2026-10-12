# Phase 9: Equipment and Weight Steps - Research

**Researched:** 2026-10-10
**Domain:** In-app data model, sync merge and migration (single-file PWA, no dependencies)
**Confidence:** HIGH for the code findings (every one read this session and probed in node); MEDIUM for the few default types no locked decision covers (see Assumptions Log)

## Summary

**The highest-priority question is answered: `DB.exercises` merges as a whole array taken from the side with the newer `updatedAt`. Per-row `mtime` plays no part.** `exercises` is not a `COLLECTIONS` key, so `mergeCollections()` never sees it. `mergeDB()` builds its output with `Object.assign({}, blank(), older, newer)`, which takes `newer.exercises` as-is. A node probe this session confirmed it. Device A held `preacher-curl` with `equip:'ez'` at `mtime:500` plus a row it had just created. Device B held the same row with no equipment at `mtime:10` and a newer `updatedAt`. In both argument orders the merge returned only B's bare row: the equipment value was gone, and so was A's new row. Old builds offer one defence: an old build refuses to merge with, or write over, a cloud doc at a higher `_schema` (`remoteTooNew`). But two devices on the *new* build would still erase each other's equipment edits (EQUIP-03) on every save. So Phase 9 must change how the registry merges.

**Primary recommendation:** the registry should merge per row by `id` through `mergeUnion` (newest `mtime` wins). Do this in a new `mergeExercises()` helper that `mergeDB()` calls after `mergeCollections()`. The equipment value then gets its own clock: store `equip` plus `equipAt`. `equipAt` is 0 for a default (from the migration or a name guess) and `Date.now()` for a choice Ian makes. The merge always keeps the `equip` with the higher `equipAt`, whichever row won on `mtime`. This field clock is what makes EQUIP-02 and EQUIP-03 hold together. Migration 19 must `touch()` every row it rewrites (a locked rule), and that stamps "now". Without the field clock, a device that boots the new build *after* Ian changed a type on his other device would migrate its stale local copy and overwrite his choice. Ian is most likely to change types right after the update lands, which is exactly that window. Also make `exMerge` soft-delete (tombstone) instead of `filter`, because a union would bring a hard-removed row back. Read through `equipOf(name)`, which falls back to the name guess when a row has no valid `equip`. A missing or stripped default then can never change behaviour.

Everything else follows Phase 8's seam:
- `weightStep(name, w)` gains the weight argument (dumbbells switch at 60) and returns `null` for bodyweight.
- `round5` and the flat `INCREMENT` read in `translateLoad` go away, replaced by type-aware rounding helpers (`loadFloor`, `loadNearest`, `deloadWeight`).
- Plate math is driven by type, and the old style table stays only to tell sled and landmine apart.
- The default table must be a literal declared above `MIGRATIONS`. A temporal-dead-zone error inside migration 19 would be swallowed silently while `_schema` still advances, and the existing every-schema boot test would not notice.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Equipment type per exercise (EQUIP-01) | Database / Storage (synced registry row in the `users/{uid}` blob) | Browser (localStorage copy) | The type is synced data and lives on the `DB.exercises` row |
| Registry merge (EQUIP-02/03) | Browser (`mergeDB` runs client-side inside a Firestore transaction) | Firestore (stores the merged blob only) | No server code. Every merge rule is client JS |
| Migration 18→19 (EQUIP-02) | Browser (`normalize()` at boot, then the boot `save()`) | — | Runs during `let DB = load()`, so the TDZ rules apply |
| Step, rounding and plate math (EQUIP-04/05/06) | Browser (render-time, derived, never stored) | — | Derived from type plus logged weight, like Phase 8's verdicts |
| Settings control and first-time picker | Browser (DOM via `data-action` dispatcher) | — | Writes synced data, so it uses `save()` |

## Standard Stack

No libraries. The app is one `index.html` with inline JS, no build and no dependencies (CLAUDE.md). The tests are a plain node script.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js (test runner only) | v24.15.0 [VERIFIED: `node --version` this session] | Runs `test/app.test.js` via `test/harness.js` (vm sandbox) | Already the project's only test infrastructure |

**Installation:** none. **Version verification:** not applicable, because no package is installed.

## Package Legitimacy Audit

This phase installs no external packages, so there is nothing to audit.
**Packages removed due to [SLOP] verdict:** none. **Packages flagged as suspicious [SUS]:** none.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
Carried forward from Phase 8:
- `weightStep(name)` (index.html ~L1098) is the single seam for the step, and it is a `function`
  declaration so Phase 9 changes only its body.
- Bodyweight progression keeps Phase 8's rule (D-08): progress means +1 total rep, and at the top of
  the range the card shows "⬆ Add weight (belt) or harder variation" with no number.

#### Default equipment types (EQUIP-01, EQUIP-02)
- **D-01:** Defaults follow the obvious name rules:
  - "DB …" and Hammer curl → dumbbell;
  - Barbell bench and incline, Standing OHP, Romanian deadlift, Barbell row and Barbell curl → barbell;
  - EZ-bar curl, Skull crusher and **Preacher curl** → EZ bar;
  - Lat pulldown, Triceps pushdown, Seated cable row and Straight-arm pulldown → cable;
  - "… machine", Seated Fly/Flys, Reverse pec deck, Machine crunch, Leg press and Hack squat → machine;
  - Chin-up, Pull-up, Nordic hamstring curl, Dead hang, Hanging leg raise, Diamond push-ups and
    **Lunges** (logged at 0) → bodyweight.

  The planner finalises the full table from the registry and the export's exercise list. Every name in
  Ian's 2026-10-10 export must map to a type.
- **D-02:** Ian's answers for the unclear ones, all dumbbell: **Deficit sumo squat**, **Bulgarian split
  squat**, **Overhead triceps extension** and **Wrist curls**.
- **D-03:** **Rear delt fly = dumbbell.** The machine variant is **Reverse pec deck** (machine), which Ian
  already logs separately.
  - The export has two June sessions of Rear delt fly at 40 and 55 lb that were the machine. Every later
    session is the 5 lb dumbbell.
  - They stay under Rear delt fly. Phase 9 does not re-file history. Add-weight and stall judge the
    latest sessions (Phase 8), so these two old rows don't affect suggestions.
- **D-04:** **A brand-new exercise asks for its type the first time it is logged.** A one-tap equipment
  picker appears when the new exercise is created during a workout.
  - Ian rejected silently guessing.
  - The name rules may pre-select the likely option.
  - The pick writes the synced registry row. `pickEx` already uses `save()` for a new registry row; see
    the draft rule in CLAUDE.md.
- **D-05:** **The workout card shows a small muted equipment tag** next to the exercise name, for example
  "dumbbell · +2.5", so a wrong type is easy to spot mid-set.

#### Plate-loaded lifts (EQUIP-06)
- **D-06:** **Plate math follows how the lift is loaded, not only the type.** The existing loading styles
  (`BAR_LB`/`BAR_FOR`: straight 45, ez 25, sled 0, landmine 45) stay.
  - **Leg press and Hack squat:** type machine (5 lb step). They keep today's "per side — plates only,
    sled not counted" breakdown.
  - **T-bar row, Meadows row and Chest Supported T-Bar Row:** type barbell (5 lb step). They keep
    today's one-sleeve landmine breakdown (90 lb = 45 bar + one 45). Ian confirmed the chest-supported
    one at his gym is a landmine with a pad.
  - **Preacher curl:** type EZ bar. It shows plate math against the 25 lb bar (EQUIP-06).
- **D-07:** **Logged weight is the total, bar included**, as today for barbell lifts. Ian's gym also has
  **preset fixed-weight EZ bars below 25 lb, 10 lb apart**, which is how a 20 lb preacher entry happened.
  - When the working weight is 25 lb or less, or doesn't fit the 25 lb bar plus plates, the plate line
    says nothing rather than something wrong.
  - Exact behaviour for a weight under the bar is the planner's call, but it must never show negative
    plates or a breakdown that can't be loaded.

#### Steps (EQUIP-04)
**These amend EQUIP-04 as written (Ian, 2026-10-10).** REQUIREMENTS.md and the ROADMAP success
criteria are updated to match.
- **D-08:** Step by type:
  - barbell, EZ bar and machine: **5 lb**;
  - dumbbell: **2.5 lb up to and including 60 lb, then 5 lb above 60** (60 → 65 → 70), which matches
    Ian's rack;
  - cable: **2.5 lb**, because the stacks have a 2.5 lb add-on and his pushdown history moves in 2.5s;
  - bodyweight: no number (see Phase 8 D-08).
- **D-09:** **EZ bar stays 5 lb**, even though the preset bars are 10 lb apart. Odd steps (35, 45) are
  the loaded 25 lb bar plus plates, and plate math shows how to load them.
- **D-10:** **lb only.** Ian never logs kg.
  - If the unit is switched to kg, every type keeps today's flat 2.5 kg.
  - No kg-specific step table is designed.

#### Rounding (EQUIP-05)
- **D-11:** **Deload = 90%, rounded down to the exercise's step, and always at least one step lighter.**
  Examples: 15 DB → 12.5, 10 DB → 7.5, 135 barbell → 120, 70 DB → 60 (63 rounded down on the 5 lb part
  of the rack, then 60).
  - `deloadExercise` uses `round5` today (L1236); that goes.
  - When the dumbbell step changes at 60, round to a weight that exists on the rack.
- **D-12:** **Warm-up rungs (~50%, ~75%) round to the nearest step** for that exercise, and on a bar to a
  loadable total.
  - The "Rounded to 5 lb — with kettlebells, take the nearest bell" note (L2104) becomes accurate for the
    step used.
- **D-13:** **The "Last time … → suggest X lb for 8–12" line (`translateLoad`, L937/L1891) is the
  recalculation Ian wanted.**
  - It stays **display only** and is never prefilled.
  - It rounds down to the exercise's step instead of the flat `INCREMENT`. It is the second place
    `INCREMENT` is read directly (review IN-04), so it routes through the same step seam.

### Claude's Discretion
- How the equipment type is stored on the registry row (field name, enum spelling) and how the default
  table is expressed. It must follow CLAUDE.md:
  - SCHEMA 18 → 19 with a `MIGRATIONS` entry that is idempotent and never downgrades;
  - `touch()` every rewritten row and persist immediately;
  - a stale-device merge replay test, run twice.

  ROADMAP's note also applies: `DB.exercises` may merge as a whole array by `updatedAt`, so check the
  merge path before planning.
- The layout of the Settings → Exercises equipment control and of the first-time picker. Both are
  `data-action` controls with values through `esc()`, and both save with `save()`.
- How `barStyle`/`BAR_FOR` and the new type relate. Either the type drives plate math with the loading
  style kept for sled and landmine, or the style table stays and is checked against the type. The
  user-visible results must match D-06/D-07.

### Deferred Ideas (OUT OF SCOPE)
- Splitting one exercise's past sessions between two names (for example the June rear-delt machine rows).
  Settings can rename and merge but not split. Not needed now (D-03).
- A per-exercise step override, for a machine whose stack doesn't match its type. Not requested;
  revisit if a type's step proves wrong for a specific machine.
- A kg step table (D-10).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EQUIP-01 | Each exercise has one equipment type (barbell, EZ bar, dumbbell, machine, cable, bodyweight), stored on the synced registry row | § Data model (`equip`/`equipAt` on the row), `EQUIP_TYPES` enum, `equipOf()` read path, Settings list shows it |
| EQUIP-02 | Migration bumps SCHEMA, `touch()`es rewritten rows, persists immediately, is idempotent, never downgrades; stale-device replay run twice keeps it | § Migration 19, Pitfalls 1–3 (TDZ, silent catch, late-migrating device), the replay tests in Validation Architecture |
| EQUIP-03 | Ian changes the type in Settings → Exercises, and the change syncs | § Registry merge (the whole-array finding plus per-row union plus `equipAt`), `setExerciseEquip()`, the merge tests |
| EQUIP-04 | Steps: 5 for barbell/EZ/machine, 2.5 cable, dumbbell 2.5 up to 60 then 5, no flat 5 for a dumbbell at or under 60 | § `weightStep(name, w)`, Pitfall 5 (Phase 8 tests hard-code +5 on DB lateral raise) |
| EQUIP-05 | Deloads and warm-ups round to the exercise's step (15 DB deload → 12.5) | § Rounding helpers `loadFloor` / `loadNearest` / `deloadWeight`, worked examples from Ian's data |
| EQUIP-06 | Plate math follows the type, and Preacher curl = EZ bar against 25 lb | § Plate style from type, D-07 silence rule for `ez` |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Single file, no build, no dependencies. `index.html` stays the whole app.
- Run `npm test` before every push. Any edit to the inline `<script>`, even whitespace, needs `npm run csp:hash` first, or the app goes blank everywhere.
- **Sync is a union merge, never an overwrite.** Every remote write is a `runTransaction` and `mergeDB()`. Never resolve a conflict by "more data wins".
- **Deletes are soft.** Never splice a synced row out, because a union merge resurrects it. This now applies to `exMerge` once the registry unions.
- **A migration that rewrites rows must `touch()` them and be persisted immediately**, and must ship a stale-device merge replay test.
- **Derived data uses `saveLocal()`.** Synced edits use `save()`.
- **The draft never leaves the device.** Draft edits use `saveLocal()`. Only `pickEx`, `exPick` and `finishWorkout` may read `DB.draft` and call `save()`. A test enforces this by name (test/app.test.js:3736).
- **Escaping:** every user-controlled string goes through `esc()`. `esc()` does not escape `'`, so user data goes in double-quoted attributes only and never into JS source.
- **Event handlers:** `data-action` plus `data-*` attributes, one thin wrapper per event type in `ACTIONS`, wrappers never touch `DB` and never persist, action names are never built at runtime, and nothing stops propagation.
- **Icons:** Phosphor via `PH`. **Theme:** colours from `:root` custom properties, never hard-coded hex.
- **Schema:** bump `SCHEMA`, add a `MIGRATIONS` entry, keep it idempotent, never downgrade `_schema`.
- A SCHEMA bump stales `test/fixtures/merge-golden.json`. Regenerate it with `WRITE_MERGE_GOLDEN=1 node test/app.test.js` and grep the test file for the old schema number as a bare literal (docs/adding-a-collection.md § Registry validity).
- After shipping: append a changelog entry to `C:\Main Vault\50-59 Projects & Events\53. Software Projects\PPL Tracker App.md` (the live vault).
- Ian's export lives outside the repo and is never committed.

## Current Code (verbatim, read this session)

### The merge: why `exercises` moves as a whole array

`exercises` is absent from `COLLECTIONS` [VERIFIED: index.html:508-531, which lists exactly the keys `sessions`, `weights`, `petWeights`, `cardio`, `ideas`, `todos`, `hobbyLog`, `journal`, `mobilityLog`, `lawnLog`, `sleep`]. `mergeCollections()` loops only `for(const name in COLLECTIONS)` [VERIFIED: index.html:4264-4283]. `mergeDB()` [VERIFIED: index.html:4302-4306]:

```js
  const rU = +r.updatedAt || 0, lU = +l.updatedAt || 0;
  const localNewer = localWins ? (lU >= rU) : (lU > rU);
  const newer = localNewer ? l : r, older = localNewer ? r : l;
  const out = Object.assign({}, blank(), older, newer); // start from newer's scalars, guarantee all blank() keys
  mergeCollections(r, l, localNewer, out);
```

Node probe (scratch script, harness `loadApp`, `process.exit(0)`) [VERIFIED: run this session]:
```
remote=B(newer) local=A -> [{"id":"preacher-curl","name":"preacher-curl","aliases":["preacher-curl"],"mtime":10}]
remote=A local=B(newer) -> [{"id":"preacher-curl","name":"preacher-curl","aliases":["preacher-curl"],"mtime":10}]
exercises in COLLECTIONS? false
```
A's `equip:'ez'` (mtime 500) and A's freshly created row `new-on-a` were both dropped, in both argument orders.

The registry code already assumes a union it doesn't have [VERIFIED: index.html:1255-1257]: *"Ids are derived from the name rather than random, so two devices that invent the same exercise offline land on the same id — a random id would have produced duplicates the union merge could never reconcile."*

`mergeUnion` already does what the registry needs: per-item `mtime`, ties go to the newer side [VERIFIED: index.html:4057-4075]:
```js
    const cur=out[prev], curT=+cur.mtime||0, newT=+it.mtime||0;
    if(newT>curT || (newT===curT && fromNewerSide)) out[prev]=it;   // strictly newer action wins; ties fall back to side
```

Old builds cannot write over a newer schema [VERIFIED: index.html:4455]:
```js
function remoteTooNew(remoteDB){ return (+(remoteDB && remoteDB._schema) || 0) > SCHEMA; }
```
It is checked at sign-in, in the live listener and inside the push transaction (index.html:4475, 4504, 4526). Once a schema-19 doc reaches the cloud, a schema-18 device refuses to merge or push until it updates.

### Registry writers that change under a union [VERIFIED: index.html:1263-1305]
```js
const exRows = () => DB.exercises || (DB.exercises = []);
function exRow(id){ return exRows().find(x=>x && x.id===id) || null; }
...
  exRows().push(touch({ id, name:String(name).trim(), aliases:[k] }));          // exEnsure, L1286
...
  DB.exercises = exRows().filter(x=>x.id!==fromId);                             // exMerge, L1304 — a hard delete
```
Rows are `{id, name, aliases, mtime}` (migration 17 builds `{ id, name:String(name).trim(), aliases:[k], mtime:Date.now() }` [VERIFIED: index.html:611]). Every registry reader and writer: `exRows/exRow/exIdByName/exKey/exLabel/exEnsure/exMerge/exSuggest` (1263-1332), `resolveTypedName` (2000-2007), `pickEx` (2008-2016), `finishWorkout` exEnsure (2130-2131), `renameExercise`/`doExMerge` (2713-2731), `exPick` (2859-2867).

### Schema, migrations and boot [VERIFIED]
- `const SCHEMA = 18;` (index.html:481)
- `17:d=>buildExerciseRegistry(d),` / `18:d=>ensureCollectionDefaults(d), // sleep log …` (index.html:578-579)
- `for(let v=from+1; v<=SCHEMA; v++){ try{ d = MIGRATIONS[v](d) || d; }catch(e){} }` (index.html:709). **Errors are swallowed and `_schema` still advances** (L714).
- `let DB = load();` (index.html:719). Migrations run here, before any const declared below this line exists.
- `function touch(x){ if(x && typeof x==='object') x.mtime = Date.now(); return x; }` (index.html:748) is a hoisted function, so it is safe during migration (migration 17 already uses it).
- `if(migrationRan) save();` (index.html:5037) is the boot save that persists a migration immediately and queues the push.

### Step and rounding [VERIFIED]
```js
const round5 = n => Math.max(0, Math.round(n/5)*5);                                   // L863
function translateLoad(w, r, targetReps){                                              // L937-943
  const one = e1rm(w, r);
  if(!one || !targetReps) return null;
  const raw = one / (1 + targetReps/30);
  const inc = INCREMENT[DB.unit] || 5;
  return Math.max(inc, Math.floor(raw/inc)*inc);
}
const INCREMENT = { lb:5, kg:2.5 };                                                    // L1090
function weightStep(name){ return INCREMENT[DB.unit] || 5; }                           // L1098
  return { allTop:v.allTop, lastW:v.lastW, newW: v.lastW + weightStep(name), hasLoad:v.hasLoad };   // L1128
  const dw = lastW>0 ? String(round5(lastW*0.9)) : '';                                 // L1236 deloadExercise
          if(aw) w = (aw.allTop && aw.hasLoad) ? String(aw.newW) : (real[k]? real[k].w : (real.length? real[real.length-1].w : ''));  // L1823 startWorkout prefill
      flag = (aw && aw.allTop) ? `<span class="flag">⬆ Add weight${aw.hasLoad?` → ${esc(aw.newW)} ${esc(DB.unit)}`:' (belt) or harder variation'}</span>` : '';  // L1881
      const sug = offRange ? translateLoad(best.w, best.r, rng.lo) : null;             // L1891
      if(sug) lastLine += ` <span class="muted">→ suggest <strong>${sug} ${DB.unit}</strong> for …`;   // L1892 — DB.unit unescaped (IN-04)
  const w50 = round5(w*0.5), w75 = round5(w*0.75);                                     // L2096 toggleWarm
    ${bar==null ? '<div class="muted" style="font-size:11px;padding-top:4px">Rounded to 5 lb — with kettlebells, take the nearest bell.</div>' : ''}`;  // L2107
```
`round5` has exactly two readers (L1236, L2096). `INCREMENT` has exactly two (L941, L1098) [VERIFIED: grep plus Read].

### Plate math [VERIFIED: index.html:1037-1055, 1930, 2092-2094]
```js
const BAR_LB = { straight:45, ez:25, sled:0, landmine:45 };
const BAR_FOR = {
  "Barbell bench press":'straight', "Barbell incline press":'straight', "Standing OHP":'straight',
  "Back squat":'straight',          "Front squat":'straight',          "Romanian deadlift":'straight',
  "Stiff-leg deadlift":'straight',  "Good mornings":'straight',        "Barbell row":'straight',
  "Barbell curl":'straight',        "EZ-bar curl":'ez',                "Skull crusher":'ez',
  "Leg press":'sled',               "Hack squat":'sled',
  "T-bar row":'landmine',           "Meadows row":'landmine',
};
const LANDMINE_RE = /t-?\s?bar|meadows|landmine/i;
function barStyle(name){ const s = BAR_FOR[name]; if(s) return s; if(LANDMINE_RE.test(name||'')) return 'landmine'; if(/barbell/i.test(name||'')) return 'straight'; return null; }
const barWeight = name => { const s=barStyle(name); return s ? BAR_LB[s] : null; };
const isBarbell = name => barWeight(name) != null;
```
Readers: `updPlates` (1087-1089), the card's plate line (1930, gated on `isBarbell(entry.name)&&DB.unit==='lb'`), and `toggleWarm` (2092-2094). Preacher curl gets no plate math today because it is not in `BAR_FOR` and matches no regex.

### Card and Settings
- The card header, in `viewActive` (1913-1923): an `ex-meta` line (`muscle · movement · how-to`), the range badge and flag, then `<select data-action="pickEx" data-i="${esc(i)}">`. The exercise name lives in the select, so the D-05 tag sits beside or under it.
- `exercisesCardHTML()` (2694-2711) builds rows from `exListRows()`, which lists only exercises with logged sessions, each with a Rename button (`data-action="renameExercise" data-id="${esc(r.id)}"`).
- ACTIONS entries: `doExMerge`, `renameExercise` (4869-4870), `pickEx: { change: el => pickEx(+el.dataset.i, el) }` (4999), `exPick: { change: el => exPick(el.dataset.id, el) }` (5018).

### Tests that pin current behaviour [VERIFIED: test/app.test.js]
- L982: `ok('merge: mergeDB delegates every per-collection merge', !src.includes('mergeUnion(') && !src.includes('mergeDateMap('));`. **`mergeDB` itself may not call `mergeUnion(`**, so the registry merge goes in a separate helper.
- L725-730 `legacyView` keeps `exercises` in the legacy-vs-derived parity comparison. Every existing parity fixture has `exercises` either empty on both sides or present on one side only, so a per-row union reproduces the legacy result there.
- L3736: `const DRAFT_PUSHERS = ['exPick', 'finishWorkout', 'pickEx'];` lists the only functions that may read `DB.draft` and call `save()`.
- L1335 `after._schema === 18`, L1360-1361 `._schema === 18`: bare literals that break at SCHEMA 19.
- L1848-1885 boots from every `_schema` 0..SCHEMA but checks only `_schema`, shape and the seeded rows. **It cannot detect a migration-19 body that threw.**
- L7731-8220 Phase 8 progression tests use `DB lateral raise` (it will default to dumbbell) and assert `→ 30` / `→ 35` / prefill `'30'`. Eight `includes('30'|'35')` / `=== '30'` assertions change.
- L1793-1806 `'merging two exercises keeps every set'` asserts `!app.exRow('pec-deck')` after `exMerge`.
- L3036 and L3864 comments state "mergeDB() takes it whole from the newer side". The assertions still pass under a union, but the comments go stale.
- `test/harness.js` `names` list: consts (e.g. a new `EQUIP_TYPES`) are reachable as `app.X` only when added there. Function declarations are always on `a.__sandbox`.

## Architecture Patterns

### System Architecture Diagram

```
 Settings → Exercises select ──┐                     ┌── Log tab: pickEx/exPick "+ Custom…"
 (setExEquip, change)          │                     │   → exEnsure creates row (equipGuess, equipAt 0)
 First-time picker button ─────┤                     │   → name not in EQUIP_DEFAULTS? show picker
 (pickExEquip, click)          ▼                     ▼
                     setExerciseEquip(id, type) ── validate ∈ EQUIP_TYPES
                       row.equip=type, row.equipAt=Date.now(), touch(row), save()
                                   │
          ┌────────────────────────┼─────────────────────────────┐
          ▼                        ▼                             ▼
   localStorage blob        schedulePush → runTransaction   render()
          │                  remote ─┐                           │
          │                          ▼                           ▼
          │          mergeDB(remote, local)                equipOf(name)
          │            gen differs? → wholesale (unchanged)   row.equip valid? else equipGuess(name)
          │            mergeCollections (unchanged)              │
          │            mergeExercises:                           ├─ weightStep(name,w): lb ⇒ 5 | 2.5 | DB ladder | null
          │              union by id, mtime wins (mergeUnion)    │     kg ⇒ 2.5 (D-10)
          │              then equip/equipAt from max(equipAt)    ├─ addWeightInfo newW / startWorkout prefill / D-05 tag
          ▼                                                      ├─ deloadWeight (90%, floor, ≥1 step lighter, bar clamp)
 Boot: load() → normalize() → MIGRATIONS[19]                      ├─ loadNearest (warm-up rungs, bar clamp)
   rows lacking valid equip: equip=equipGuess(name),             ├─ translateLoad floor to step (display only)
   equipAt=0, touch(row) → `if(migrationRan) save()`             └─ plateStyle: type → straight/landmine/ez/sled/none
                                                                       → platesText (ez: silent ≤25 or unloadable)
```

### Recommended code placement (inside `index.html`)

| Piece | Where | Why there |
|-------|-------|-----------|
| `EQUIP_TYPES`, `EQUIP_DEFAULTS` (literals), `function equipGuess(name)` | Directly above `const MIGRATIONS` (L536), below `COLLECTIONS` | Migration 19 reads them during `let DB = load()` (L719). Literals and hoisted functions only. They must **not** read `normEx` (a const arrow at L1261), `BAR_FOR` (L1038), `LANDMINE_RE` (L1047) or `ACCESSORIES` (L2840), all of which are in the TDZ at that point |
| `19:d=>stampEquipment(d)` and `function stampEquipment(d)` | MIGRATIONS entry 19 plus a function next to `buildExerciseRegistry` | Same pattern as migrations 17 and 18 |
| `EQUIP_LABEL` (display names) and `equipOf(name)` | Next to the registry helpers (~L1263-1305) | Runtime only |
| `weightStep(name, w)` plus rounding helpers | Replace L1098, next to `INCREMENT` | Phase 8's seam |
| `plateStyle(name)` (or a new body for `barStyle`) | Replace `barStyle`'s body (L1048-1053); keep the name so `barWeight`, `isBarbell`, `updPlates`, the card and `toggleWarm` need no edits | Smallest diff |
| `mergeExercises(r, l, localNewer)` | Next to `mergeUnion` / `mergeCollections` (~L4057-4283). `mergeDB` calls it after `mergeCollections` | L982 forbids `mergeUnion(` inside `mergeDB` |
| `setExerciseEquip(id, type)` | Next to `renameExercise` (~L2713) | It does not read `DB.draft`, so it does not join `DRAFT_PUSHERS` |
| ACTIONS `setExEquip` (change) and `pickExEquip` (click) | In the Settings group (~L4869) and the Log group (~L4999) | Two names, because a `<select>` also fires click |

### Pattern 1: Data model (Claude's discretion; recommended)

Row: `{ id, name, aliases, mtime, equip, equipAt }`.
- `equip` ∈ `EQUIP_TYPES = ['barbell','ez','dumbbell','machine','cable','bodyweight']`. Display names go through a lookup (`EQUIP_LABEL = { barbell:'barbell', ez:'EZ bar', dumbbell:'dumbbell', machine:'machine', cable:'cable', bodyweight:'bodyweight' }`), never the stored string.
- `equipAt`: `0` means a default (migration 19, `exEnsure` guess). `Date.now()` means Ian chose it (Settings or the D-04 picker). An absent or non-finite value counts as −1.
- Reads always go through `equipOf(name)` = the row's `equip` if it is in `EQUIP_TYPES`, else `equipGuess(name)`. A stripped or hostile value can never change behaviour.

### Pattern 2: Registry merge (EQUIP-02, EQUIP-03)

```js
/* Proposed. Phase 9: the exercise registry merges per row, never as a whole array. Called by mergeDB
   after mergeCollections; the gen-mismatch early return above stays untouched. */
function mergeExercises(r, l, localNewer){
  const rows = mergeUnion(r.exercises, l.exercises, x => x.id, localNewer);   // mtime wins per row
  const at = x => { const v = +(x && x.equipAt); return x && x.equip != null && isFinite(v) ? v : -1; };
  const best = new Map();
  [].concat(Array.isArray(r.exercises) ? r.exercises : [], Array.isArray(l.exercises) ? l.exercises : [])
    .forEach(x => { if(x && typeof x === 'object'){ const p = best.get(x.id); if(!p || at(x) > at(p)) best.set(x.id, x); } });
  /* The equipment value has its own clock: Ian's choice (equipAt = when) beats any default (0), whichever
     side's row won on mtime. A migration touch() on a late-updating device must not erase his choice. */
  return rows.map(x => { const b = best.get(x.id); return b && at(b) > at(x) ? Object.assign({}, x, { equip: b.equip, equipAt: b.equipAt }) : x; });
}
// in mergeDB, after `mergeCollections(r, l, localNewer, out);`
  out.exercises = mergeExercises(r, l, localNewer);
```
- Build new objects; never mutate an input row. `adoptMerged` compares `JSON.stringify(withWx)` against `DB`.
- **Do not sort** the output. `mergeUnion` keeps the newer side's order, which is what the legacy whole-array merge produced. That keeps every existing `sameMerge` parity fixture and golden hash equal.

### Pattern 3: Soft-delete on `exMerge` (required once the registry unions)

Replace `DB.exercises = exRows().filter(x=>x.id!==fromId);` with a tombstone: `a.deletedAt = Date.now(); a.mergedInto = intoId; a.aliases = []; touch(a);`. Then:
- `exRow(id)` returns live rows only (`!x.deletedAt`). The existing test's `!app.exRow('pec-deck')` keeps passing.
- `exEnsure`'s id-collision loop must still see tombstones: `while(exRows().some(x=>x&&x.id===id))`. Otherwise a new row could reuse a tombstoned id and collide in the merge.
- `exIdByName` and `exSuggest` already skip a tombstone because its `aliases` are empty.
- Optional, not required: `exKey` follows `mergedInto` one hop, for a session a stale device logged against the old id after the merge.

### Pattern 4: Migration 19 (EQUIP-02)

```js
19:d=>stampEquipment(d),   // equipment type per registry row (EQUIP-02) — rewrites rows, so touch()
/* Proposed. Runs during `let DB = load()`: reads only EQUIP_TYPES/EQUIP_DEFAULTS/equipGuess (declared above
   MIGRATIONS) and the hoisted touch(). Idempotent: a row that already has a valid type is never touched. */
function stampEquipment(d){
  (Array.isArray(d.exercises) ? d.exercises : []).forEach(r=>{
    if(!r || typeof r !== 'object' || r.deletedAt || EQUIP_TYPES.indexOf(r.equip) >= 0) return;
    r.equip = equipGuess(r.name); r.equipAt = 0; touch(r);
  });
  return d;
}
```
Persistence is already handled by `if(migrationRan) save();` at L5037. `exEnsure` should stamp the same `equip: equipGuess(name), equipAt: 0` on every new row, so every row the new build creates has a type (EQUIP-01).

### Pattern 5: Step and rounding (EQUIP-04, EQUIP-05)

```js
/* Proposed. lb only (D-10): kg keeps today's flat INCREMENT.kg for every type. null = no number (bodyweight). */
function weightStep(name, w){
  if(DB.unit !== 'lb') return INCREMENT[DB.unit] || 2.5;
  const t = equipOf(name);
  if(t === 'bodyweight') return null;
  if(t === 'dumbbell') return (+w || 0) >= 60 ? 5 : 2.5;    // 57.5 → 60, 60 → 65 → 70 (D-08)
  if(t === 'cable') return 2.5;
  return 5;                                                   // barbell, ez, machine
}
```
- `addWeightInfo` (L1128): `newW: step==null ? null : v.lastW + step`, where `step = weightStep(name, v.lastW)`. Card (L1881): show `→ newW` only when `aw.hasLoad && aw.newW != null`. Otherwise show the existing `(belt) or harder variation`. Prefill (L1823): bump only when `newW != null`.
- The rounding ladder (a set of loadable totals): constant step `s` (5, or 2.5 for cable, bodyweight-with-load and kg). For dumbbells in lb: multiples of 2.5 up to 60, then 60 + multiples of 5. Add `+1e-9` inside every `Math.floor`/`Math.round`, because `0.9*70` is `63.00000000000001` [VERIFIED: node this session].
  - `loadFloor(name, x)`: the largest ladder value ≤ x.
  - `loadNearest(name, x)`: the nearer of the floor and the next value up (a tie goes up, as `Math.round` does).
- `deloadWeight(name, w)` = `min(loadFloor(name, 0.9*w), loadFloor(name, w − ε))`, so it is always at least one step lighter. For `straight`/`landmine` styles, clamp up to the bar weight if that is still below `w`. Return `''` when nothing positive is lighter. D-11 checks: 15 DB → 12.5, 10 DB → 7.5, 135 barbell → 120, 70 DB → 60 (`63` → ladder floor 60).
- Warm-ups (L2096): `loadNearest(name, w*0.5)` and `(w*0.75)`, clamped to at least the bar on bar styles ("a loadable total on a bar", D-12). Replace the note at L2107 with the real step, e.g. "Rounded to the nearest 2.5 lb (5 lb above 60)" for dumbbells and "Rounded to 2.5 lb" for cable. Kettlebells are out of scope, so drop that clause.
- `translateLoad(w, r, targetReps, name)`: `Math.max(minStep, loadFloor(name, raw))`. Pass `entry.name` at L1891 and write `${esc(sug)} ${esc(DB.unit)}` at L1892 (IN-04).

### Pattern 6: Plate style from type (EQUIP-06, D-06, D-07)

```js
/* Proposed body for barStyle(name): type decides whether there is a bar; BAR_FOR/LANDMINE_RE only pick
   sled vs landmine (D-06). Keeps barWeight/isBarbell/updPlates/toggleWarm untouched. */
function barStyle(name){
  const t = equipOf(name);
  if(t === 'ez') return 'ez';
  if(t === 'barbell') return (BAR_FOR[name] === 'landmine' || LANDMINE_RE.test(name||'')) ? 'landmine' : 'straight';
  if(t === 'machine') return BAR_FOR[name] === 'sled' ? 'sled' : null;
  return null;                                   // dumbbell, cable, bodyweight
}
```
In `platesText`, for `style==='ez'`: return `''` when `t <= bar` (preset EZ bars, D-07) and `''` when the breakdown has `leftover > 0.01`. Leave the existing straight-bar, landmine and sled wording unchanged, since existing tests pin it at test/app.test.js:425-436. Every existing plate test still holds under the default table: Skull crusher → ez → 25, Leg press → machine+sled → 0, `'T bar row'` / `'Tbar row'` → the landmine regex in `equipGuess` → barbell → landmine, Deficit sumo squat → dumbbell → null.

### Pattern 7: D-04 first-time picker and D-05 tag

- Trigger: in `pickEx`/`exPick`, record `const wasKnown = !!exIdByName(name)` *before* `exEnsure`. If the row is new **and** `normalized name` is not a key of `EQUIP_DEFAULTS`, add its id to a module-level `let equipAsk = new Set()`. This is UI state and is never stored. Program names picked from the select are in the table and never ask. That matters on a fresh install, where `blank()` starts at `_schema: SCHEMA`, migration 17 never runs, and rows are created lazily.
- Render: the card shows a row of six buttons, `data-action="pickExEquip" data-id="${esc(id)}" data-equip="${esc(t)}"`, with the `equipGuess` option highlighted. A tap calls `setExerciseEquip(id, t)`, which validates, sets `equip` and `equipAt=Date.now()`, calls `touch()` and `save()`, removes the id from `equipAsk`, and renders. Ignoring the picker leaves the guess (`equipAt 0`), and the tag shows it.
- Settings: per row, `<select data-action="setExEquip" data-id="${esc(r.id)}">` with `<option value="${esc(t)}">${EQUIP_LABEL[t]}</option>`. A key from `exListRows()` with no registry row (`exRow(id)` null) can't be edited; render it without a select, as `renameExercise` already bails.
- Tag (D-05): `${EQUIP_LABEL[t]} · +${step}` in a muted span next to the select. Bodyweight shows just "bodyweight". The step uses the heaviest weight currently on the card (`weightStep(name, w)`), so a 65 lb dumbbell shows +5. Run the text through `esc()`.
- ROADMAP marks this phase **UI hint: yes**, and `workflow.ui_phase` is true, so a UI-SPEC pass may settle the layout.

### Anti-Patterns to Avoid
- **Adding `exercises` to `COLLECTIONS`:** it would gain a Markdown export section (`columns[0]` must be an ISO date, and registry rows have none), `validateBackup` shape rules and `liveX` wrappers. That is the wrong tool. Use a dedicated helper.
- **Calling `mergeUnion(` inside `mergeDB`:** this fails test L982.
- **Reading `normEx`, `BAR_FOR`, `LANDMINE_RE`, `ACCESSORIES` or `PROGRAM`-derived consts from migration 19:** a TDZ error is swallowed by L709's silent catch while `_schema` advances, so the migration never runs again. This is how migration 15 died.
- **Sorting the merged registry:** it breaks legacy parity and golden hashes, and it churns stored order.
- **Storing or rendering the raw `equip` string:** always validate against `EQUIP_TYPES` and render through `EQUIP_LABEL`.
- **Making `setExerciseEquip` read `DB.draft`:** it would join the `DRAFT_PUSHERS` test (L3810) as an unplanned fourth pusher.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Per-row conflict resolution | A new compare loop | `mergeUnion(a, b, x=>x.id, localNewer)` (L4057) | Already encodes mtime-wins and tie-to-newer-side, and is covered by the delete/re-add/tie laws |
| Persisting the migration | A save inside the migration | `if(migrationRan) save();` (L5037) | Calling `save()` during `load()` hits `SNAP_KEY` in the TDZ (comment at L720-723) |
| Escaping | String concatenation | `esc()` (L952) | Project rule; `'` is not escaped, so use double-quoted attributes |
| Event wiring | `onchange=`/`onclick=` | `ACTIONS` plus `dispatchAction` | CSP blocks inline handlers, and the suite refuses them |
| Plate breakdown | A new calculator | `plateBreakdown`/`platesText` (L1056-1084) | Handles one-sleeve landmine, sled-not-counted and leftovers |

## Runtime State Inventory

This is a schema migration that rewrites stored rows, so every category is answered.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `localStorage['ppl_tracker_v1']` on each of Ian's devices. The Firestore doc `users/{uid}` (one JSON blob, `exercises` inside). Cloud versions plus the local snapshot ring `ppl_tracker_snaps_v1`. Downloaded `ppl-backup-*.json` files | **Data migration**: migration 19 stamps `equip`/`equipAt` per row at each device's boot. Restore and Import→Replace pass through `normalize()` and migrate. **Import→Merge of an older backup** migrates the backup and `touch()`es its rows "now" (see Pitfall 3). `equipAt` protects equipment choices, but names, aliases and tombstones in that file can win the row merge |
| Live service config | Firestore security rules (`firestore.rules`, reconciled 2026-09-10). The blob shape change needs no rule change, because the rules gate on ownership only | None. Verified by reading the CLAUDE.md conventions; the rules check is property-based |
| OS-registered state | Service worker `sw.js` `CACHE_VERSION = 'v2-2026-08-10'`. The PWA install on Ian's Android phone, with ~10 min update lag (memory note) | None in code. During verification, check Settings → This version on the phone before testing |
| Secrets/env vars | None. The Firebase web config is public by design | None |
| Build artifacts | The CSP `<meta>` sha256 of the inline script, and the `<meta name="ppl-build">` stamp (deploy-time) | `npm run csp:hash` after every script edit; `npm test` fails when the hash is stale |

## Common Pitfalls

### Pitfall 1: A TDZ error in migration 19 is invisible
**What goes wrong:** the default table, or a helper it calls, references a `const` declared below `let DB = load()` (L719): `normEx`, `BAR_FOR`, `LANDMINE_RE`, `ACCESSORIES`, `EQUIP_LABEL`. The ReferenceError is swallowed at L709, `_schema` becomes 19, and the migration never runs again.
**Why it happens:** migrations run at module-eval time inside a silent `try/catch`.
**How to avoid:** declare literals and hoisted functions above `MIGRATIONS`. Add a test that boots `loadApp(APP_PATH, schema18SeedWithRegistry)` and asserts **every stored** registry row carries a valid `equip`. The every-schema boot loop (L1848-1885) checks only `_schema` and shape, so it would pass while the migration did nothing.
**Warning signs:** rows in `a.__stored().exercises` without `equip` after a seeded boot.

### Pitfall 2: The whole-array merge erases an equipment edit
**What goes wrong:** Ian edits on device A, device B saves anything later, and B's array wins whole (probe output above).
**How to avoid:** use `mergeExercises` (Pattern 2) and test both argument orders, replayed twice.

### Pitfall 3: A late-migrating device's `touch()` beats Ian's earlier edits
**What goes wrong:** A updates and migrates. Ian sets a type on A at T2. B updates later, migrates its *stale local* rows at T3 > T2 (normalize runs before any pull), and pushes. On row `mtime`, B wins.
**How to avoid:** the separate `equipAt` clock (an explicit `equipAt` beats a default `0`). That covers equipment. **Residual:** renames, merge tombstones and aliases made on A in that window can still be reverted by B's `touch()`. The same applies to Import→Merge of an older backup. See Open Question 1 for the `mtime = old + 1` alternative.
**Warning signs:** a type Ian set comes back as the default after his second device updates.

### Pitfall 4: A union brings back a merged-away exercise
**What goes wrong:** `exMerge` deletes the `from` row by `filter`. The other device's copy then unions back, still claiming the alias, so new entries can split the history again.
**How to avoid:** use a tombstone (Pattern 3) and test it with a stale-device replay run twice.

### Pitfall 5: Phase 8 tests hard-code +5 on a dumbbell
**What goes wrong:** test/app.test.js:7731 uses `DB lateral raise` (now dumbbell, so 25 → 27.5). Eight assertions expecting `30` or `35` go red: L7762-7764, 7818, 7828, 7914, 8194, 8205, 8220.
**How to avoid:** update them to the dumbbell values (27.5, 32.5, 30) with a comment naming EQUIP-04, and keep one +5 control on a barbell or machine slot. They then double as EQUIP-04 regressions.

### Pitfall 6: SCHEMA literals and golden hashes
L1335 and L1360-1361 compare `_schema === 18`. Change them to `app.SCHEMA` (or `>= 18`), because their intent is "migration 18 ran". Every golden hash embeds `_schema`, so regenerate with `WRITE_MERGE_GOLDEN=1 node test/app.test.js`, then run `npm test` normally and confirm parity stays green. `INTRODUCED_AT` (L1834) needs no change, because `exercises` is not a collection.

### Pitfall 7: Float drift in rounding
`0.9*70 = 63.00000000000001` [VERIFIED: node]. Use `Math.floor(x/s + 1e-9)*s` and the same epsilon for the ladder boundary at 60. Format via `String(n)`; sums of multiples of 2.5 are exact in binary.

### Pitfall 8: Bodyweight with a logged load
`weightStep` returning `null` must not produce `NaN` (`lastW + null` = `lastW`, which is silently wrong). Every caller must branch on `null`. Rounding helpers need a numeric step, so use 2.5 for bodyweight with a load [ASSUMED].

### Pitfall 9: The card's plate line for an EZ bar at 25 lb or less
Today `platesText(20,25,'ez')` returns "Under bar weight (25 lb)" (L1082). D-07 needs `''`. The warm-up rung "Empty bar — 25 lb" (L2099) stays.

### Pitfall 10: Probing the app from a script hangs
`loadApp` starts intervals. Ad-hoc probes must call `process.exit()` (done this session) or run through `npm test`.

### Pitfall 11: Stale CSP hash
Any script edit needs `npm run csp:hash`, or the app goes blank on every device.

## Code Examples

### Default type table (EQUIP-01/02, D-01..D-03, D-06)

Keys are normalised names (trimmed, lower-case, single spaces). This covers every `PROGRAM` example, every `ACCESSORIES` example, and all 38 exercise names in Ian's 2026-10-10 export (read this session, not copied into the repo). Source: **L** = locked decision, **A** = assumed (needs Ian's nod; see the log).

| Name | Type | Src | | Name | Type | Src |
|------|------|-----|-|------|------|-----|
| Barbell bench press | barbell | L D-01 | | Leg extensions | machine | A |
| Barbell incline press | barbell | L D-01 | | Leg press | machine (sled) | L D-01/06 |
| Standing OHP | barbell | L D-01 | | Hack squat | machine (sled) | L D-01/06 |
| Romanian deadlift | barbell | L D-01 | | Machine hamstring curl | machine | L D-01 |
| Barbell row | barbell | L D-01 | | Calf raise machine | machine | L D-01 |
| Barbell curl | barbell | L D-01 | | Seated Fly / Seated Flys (one row) | machine | L D-01 |
| Back squat, Front squat | barbell | A (in `BAR_FOR` straight) | | Reverse pec deck | machine | L D-01 |
| Stiff-leg deadlift, Good mornings | barbell | A (in `BAR_FOR` straight) | | Machine crunch | machine | L D-01 |
| T-bar row / T-bar Row (one row) | barbell (landmine) | L D-06 | | Seated OHP | machine | A (L1027 says "often a machine") |
| Meadows row | barbell (landmine) | L D-06 | | Lat pulldown | cable | L D-01 |
| Chest Supported T-Bar Row | barbell (landmine) | L D-06 | | Triceps pushdown | cable | L D-01 |
| Behind-the-back wrist curls | barbell | A | | Seated cable row | cable | L D-01 |
| EZ-bar curl | ez | L D-01 | | Straight-arm pulldown | cable | L D-01 |
| Skull crusher | ez | L D-01 | | Cable fly, Cable lateral raise, Cable crunch | cable | A (name) |
| Preacher curl | ez | L D-01/06 | | Face pull | cable | A |
| Overhand grip curl | ez | A | | Glute kickbacks | cable | A |
| DB bench press, DB incline press, DB fly, DB shoulder press, DB lateral raise, DB pullover, DB curl, One-arm DB row | dumbbell | L D-01 ("DB …") | | Chin-up, Pull-up | bodyweight | L D-01 |
| Dumbbell row | dumbbell | L D-01 (spirit of "DB …") | | Nordic hamstring curl | bodyweight | L D-01 |
| Hammer curl | dumbbell | L D-01 | | Dead hang | bodyweight | L D-01 |
| Deficit sumo squat, Bulgarian split squat, Overhead triceps extension, Wrist curls | dumbbell | L D-02 | | Hanging leg raise, Diamond push-ups, Lunges | bodyweight | L D-01 |
| Rear delt fly | dumbbell | L D-03 | | Weighted push-up, Weighted decline push-up, Dips | bodyweight | A |
| Concentration curl, Reverse wrist curls, Farmer carry | dumbbell | A | | Weighted sit-up, Dead bug, Plank, Plate/stair raise, Active hang, Towel dead hang | bodyweight | A |

Every name in Ian's export maps to a **locked** type (D-01/D-02/D-03/D-06). All the assumed rows are names he has never logged.

Fallback for custom names, in this order (proposed; the regexes are literals inside `equipGuess`):
1. `/\bdb\b|dumbbell/` → dumbbell
2. `/\bez\b|skull crusher|preacher/` → ez
3. `/t-?\s?bar|meadows|landmine|barbell/` → barbell
4. `/cable|pulldown|pushdown|face pull/` → cable
5. `/push-?ups?|pull-?ups?|chin-?ups?|\bdips?\b|\bhang\b|plank|nordic|\blunges?\b|dead bug/` → bodyweight
6. Anything else → **machine**. That gives a 5 lb step and no plate line, which is exactly what an unknown name gets today. The migration therefore changes nothing Ian sees for a name it can't classify.

### Worked numbers from Ian's export (sanity checks for tests)

| Lift (type) | Last logged | ⬆ Add weight | Deload (D-11) | Notes |
|---|---|---|---|---|
| Preacher curl (ez) | 35 (Oct 9) | 40 | 31.5 → 30 | 20 lb (Jun 26) is a preset bar, so the plate line is silent |
| DB incline press (dumbbell) | 65 / 55 / 45 | 70 / 57.5 / 47.5 | 65 → 58.5 → 57.5 | Crosses the 60 boundary |
| Deficit sumo squat (dumbbell) | 25 | 27.5 | 22.5 | |
| Triceps pushdown (cable) | 25 | 27.5 | 22.5 | |
| Rear delt fly (dumbbell) | 5 | 7.5 | 4.5 → 2.5 | |
| Barbell bench press (barbell) | 155 | 160 | 139.5 → 135 | |
| Meadows row (barbell/landmine) | 47.5 | 52.5 | 42.75 → 40 → clamp 45 (bar) | Shows why the bar clamp matters |
| Barbell row (barbell) | 45 (Sep 4) | 50 | Nothing lighter than the empty bar | Open Question 3 |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| A flat `INCREMENT[DB.unit]` for every lift | Per-type `weightStep(name, w)` | Phase 9 | Dumbbell and cable lifts progress in loadable 2.5 steps |
| `round5` for deloads and warm-ups | `loadFloor` / `loadNearest` on the type's ladder | Phase 9 | 15 DB deload = 12.5 |
| `BAR_FOR` name table decides "has a bar" | Type decides; table only picks sled/landmine | Phase 9 | Preacher curl gets plate math |
| Registry merged whole by `updatedAt` | Per-row union plus a field clock for `equip` | Phase 9 | Edits and new rows survive the other device's saves |

**Deprecated/outdated:** `round5` (remove it, since no readers are left), and reading `INCREMENT` directly anywhere except `weightStep`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Unlogged program and accessory names get the types marked **A** in the table (e.g. Seated OHP = machine, Glute kickbacks = cable, Overhand grip curl = ez, Weighted push-up/Dips = bodyweight) | Code Examples | Low. Ian has never logged them, and he can change any of them in Settings |
| A2 | The fallback for an unclassifiable custom name is `machine` (today's 5 lb, no plate line) | Code Examples | Low. It matches current behaviour, and D-04 asks for a custom name anyway |
| A3 | EQUIP-04's "No dumbbell suggestion at 60 lb or under jumps a flat 5 lb" means a suggestion that **lands** at or under 60 never comes from +5, so 60 → 65 is correct per D-08's explicit "60 → 65 → 70" | Pattern 5 | Medium. The requirement sentence can be read as "a dumbbell at 60 must not get +5", which contradicts D-08's example and Ian's rack (no 62.5). Follow D-08 and name the reading in the test |
| A4 | A deload never prefills below the bar on `straight`/`landmine` styles (clamp to the bar). EZ is not clamped, because preset bars below 25 exist | Pattern 5 | Low. D-07 leaves under-bar behaviour to the planner |
| A5 | Bodyweight-with-load rounds on 2.5 (belt plates) | Pitfall 8 | Low. Ian logs every bodyweight lift at 0 or blank |
| A6 | The D-04 picker appears only when a genuinely new row's name is not in `EQUIP_DEFAULTS`. Program names never ask | Pattern 7 | Medium. "asks the first time" could be read as "every new row". Asking for program names on a fresh install would be noise the table already answers |
| A7 | Straight-bar, landmine and sled plate wording ("Under bar weight", "(+x can't load)") stays. The D-07 silence applies to `ez` only | Pattern 6 | Low. Existing tests pin those strings |

## Open Questions (RESOLVED)

1. **Literal `touch()` versus a migration stamp that cannot beat later edits.**
   - What we know: EQUIP-02 and CLAUDE.md require `touch()` (`mtime = Date.now()`). Pitfall 3 shows that a device migrating *after* Ian edits on his other device wins every row on `mtime`. `equipAt` neutralises this for equipment, which is the requirement. It does not for renames, merges or aliases made in that window, or for Import→Merge of an older backup.
   - What's unclear: whether Ian accepts that residual, or wants migration 19 to stamp `mtime = (+row.mtime||0) + 1`. That still beats the un-migrated copy of the same row, which is the rule's purpose, and never beats a later real action. It does reinterpret the literal `touch()` wording.
   - Recommendation: plan the literal `touch()` (a locked constraint) plus `equipAt`. Raise the `+1` variant with Ian at plan review, as a one-line change if he prefers it.
   - **RESOLVED: D-14** (Ian, 2026-10-12): stamp old `mtime` + 1, plus `equipAt`.
2. **Should Settings → Exercises list every program exercise?** Today it lists only logged ones (L2659 comment). EQUIP-01 is satisfied for everything Ian can see. Recommendation: keep it as is. **RESOLVED:** keep the logged-only list (the plans follow this).
3. **Deload at the empty bar** (Barbell row at 45): nothing lighter is loadable. Recommendation: keep 45 prefilled and let the coach line say deload isn't possible below the bar, or leave the weights unchanged. Planner's call. **RESOLVED: D-15** (Ian, 2026-10-12): stay at the bar weight and show "Already at the empty bar — cut a set or reps instead."

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | `npm test`, `npm run csp:hash` | ✓ | v24.15.0 | — |
| git | REPO-01 LF tests, commits | ✓ | (suite passes) | — |
| Ian's Android phone (installed PWA) | Phase verification ("a real workout on Ian's phone") | Manual | — | Desktop browser for a smoke test only |

Baseline: `npm test` → **984 passed, 0 failed, 2 skipped**, about 5.6 s [VERIFIED: run this session].

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Hand-rolled `ok()` assertions in `test/app.test.js`, plus `test/harness.js` (node `vm` sandbox, frozen clock 2026-08-07 12:00 Chicago) |
| Config file | none (`package.json` `"test": "node test/app.test.js"`) |
| Quick run command | `npm test` (the whole suite, ~6 s; there is no per-file split) |
| Full suite command | `npm test` and `npm run csp:check` |
| Golden regeneration | `WRITE_MERGE_GOLDEN=1 node test/app.test.js`, then `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EQUIP-01 | Every registry row after migration, and every `exEnsure` row, has `equip` ∈ `EQUIP_TYPES`. `equipOf` falls back to the guess for a missing or hostile value. The Settings card renders one control per row with the current type selected | unit plus render | `npm test` | ❌ new section "── equipment (EQUIP) ──" in test/app.test.js |
| EQUIP-01 | Default table: each export name maps to its locked type (`Preacher curl`→ez, `Rear delt fly`→dumbbell, `Chest Supported T-Bar Row`→barbell, `Seated Flys`→machine, `Lunges`→bodyweight, …) | unit | `npm test` | ❌ |
| EQUIP-02 | Boot from a `_schema:18` seed with registry rows: every **stored** row has `equip` (the TDZ catcher). `_schema` is 19. A second `normalize()` touches nothing (idempotent). `_schema` never goes down | integration (`loadApp(APP_PATH, seed)`) | `npm test` | ❌ |
| EQUIP-02 | Stale-device replay: an un-migrated schema-18 copy (newer `updatedAt`, no `equip`) merged with the migrated copy in both orders keeps every `equip`. Replaying the stale copy against the result again keeps it | unit (`mergeDB`) | `npm test` | ❌ |
| EQUIP-02 | Late-migrating device: Ian's explicit `equipAt` choice survives the other device's later migration `touch()`, replayed twice | unit | `npm test` | ❌ |
| EQUIP-03 | An edit on A (`setExerciseEquip` → `touch`, `save`) survives B's newer unrelated save, both orders, twice. A row created on A survives B being newer. An `exMerge` tombstone is not resurrected by a stale live copy, twice. Laws over registry fixtures: idempotent, commutative, associative | unit | `npm test` | ❌ |
| EQUIP-03 | `setExEquip`/`pickExEquip` reach `setExerciseEquip` through `dispatchAction` with the decoded args. An invalid type is refused. It pushes (`save`). It is not in `DRAFT_PUSHERS` | integration (dispatcher) | `npm test` | ❌ |
| EQUIP-04 | `weightStep`: barbell/ez/machine 5, cable 2.5, dumbbell 2.5 at 57.5 and 5 at 60 and 65, bodyweight `null`, kg 2.5 for every type. Card flag and prefill: DB lateral raise 25 → 27.5, a barbell slot +5, bodyweight → "(belt) or harder variation" | unit plus render | `npm test` | Partial (Phase 8 tests at L7731+ change to 27.5/32.5) |
| EQUIP-05 | `deloadExercise` prefills 12.5 (15 DB), 7.5 (10 DB), 120 (135 BB), 60 (70 DB). Warm-up rungs land on the ladder and at least the bar. The note names the real step. `translateLoad` floors to the step and the suggestion line escapes `DB.unit` | unit plus render | `npm test` | ❌ |
| EQUIP-06 | `barWeight('Preacher curl')===25`, `isBarbell('Preacher curl')`. The plate line on a Preacher card at 35 shows "Per side: 1×5". At 20 and at 25 it is silent. Leg press is still sled, T-bar/Meadows/Chest Supported still landmine, Deficit sumo squat has no bar. A type change in Settings changes the plate line | unit plus render | `npm test` | Partial (L425-436 existing) |
| D-05 | The card tag reads "dumbbell · +2.5" for DB lateral raise at 25, "+5" at 65, and "bodyweight" with no number | render | `npm test` | ❌ |
| D-04 | Picking "+ Custom…" with a new unlisted name shows the six-button picker with the guess highlighted. A program name does not. A tap stores `equipAt>0` and pushes | integration | `npm test` | ❌ |
| All | Real workout on the phone after the deploy reaches it (Settings → This version), with the second device synced | manual | — | manual-only (Android PWA, CLAUDE.md verification) |

### Sampling Rate
- **Per task commit:** `npm run csp:hash` (if the script changed), then `npm test`
- **Per wave merge:** `npm test` and `npm run csp:check`
- **Phase gate:** full suite green, golden regenerated in the same commit as the SCHEMA bump, then `/gsd-verify-work`

### Wave 0 Gaps
- [ ] Add new consts (`EQUIP_TYPES`, `EQUIP_DEFAULTS`, `EQUIP_LABEL`) and any new function names the suite calls via `app.X` to the harness `names` list (test/harness.js ~L38-155) and to `REQUIRED_EXPORTS` (test/app.test.js:158)
- [ ] Retarget the Phase 8 +5 assertions (Pitfall 5) and the `_schema === 18` literals (Pitfall 6) in the same plan as the code change, never later
- [ ] A schema-18 registry seed helper (rows without `equip`, fixed `mtime`) shared by the boot, replay and late-migration tests

## Security Domain

### Applicable ASVS Categories (Level 1)

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Unchanged (Firebase email/password) |
| V3 Session Management | no | Unchanged |
| V4 Access Control | no | `firestore.rules` gates on owner; the blob shape change needs no rule change |
| V5 Input Validation | yes | `equip` whitelisted against `EQUIP_TYPES` on write (`setExerciseEquip`) and on read (`equipOf`). `equipAt` coerced (`isFinite`, else −1). Imported backups are shape-checked only (`validateBackup`), so treat row fields as hostile |
| V5.3 Output Encoding | yes | `esc()` on every `data-*` and on the tag/picker text. Labels come from `EQUIP_LABEL`, never the stored string. Double-quoted attributes only |
| V6 Cryptography | no | — |
| V14 Configuration | yes | CSP sha256 regenerated (`npm run csp:hash`); no new script or fetch hosts |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Hostile backup row `equip:'"><img onerror=…>'` rendered into Settings/tag | Tampering / XSS | Never render `equip`; map through `EQUIP_LABEL`; unknown → `equipGuess` |
| Hostile exercise name in the picker prompt | XSS | `esc(name)` in double-quoted contexts; never into JS source |
| Stale device reverting synced data | Tampering (integrity) | Per-row union, `equipAt` field clock, `remoteTooNew` refusal, replay tests |
| `DB.unit` injected via backup into the suggestion line | XSS | `esc(DB.unit)` at L1892 (IN-04) |

## Sources

### Primary (HIGH confidence)
- `index.html`, read this session: L328-412 (PROGRAM), L481, L495-660 (COLLECTIONS, MIGRATIONS, buildExerciseRegistry), L700-748, L863, L923-952, L1023-1129, L1231-1332, L1809-1935, L1997-2016, L2084-2160, L2657-2731, L2840-2935, L4057-4087, L4255-4317, L4450-4550, L4821-4880, L5020-5040
- `test/app.test.js`, read this session: L1-260, L400-440, L690-1385, L1760-1900, L3000-3060, L3700-3812, L3835-3880, L7290-7400, L7731-7916, L8185-8196. `test/harness.js` L1-80, L150-271
- Node probes this session: the merge behaviour (above) and float values. `npm test` baseline
- `.planning/phases/09-…/09-CONTEXT.md`, `.planning/REQUIREMENTS.md` (EQUIP-01..06, Out of Scope), `.planning/ROADMAP.md` § Phase 9, `.planning/STATE.md`, `.planning/phases/08-…/08-REVIEW.md` IN-04, `docs/adding-a-collection.md` § Registry validity, `CLAUDE.md`
- `C:\Users\idbac\Downloads\ppl-export-2026-10-10.md` (Workouts section; distinct names and per-session weights; read only, not copied)

### Secondary / Tertiary
- None. No web or library research was needed; the phase is entirely in-repo.

## Metadata

**Confidence breakdown:**
- Merge-path finding: HIGH. Read in source and reproduced by a probe.
- Architecture (per-row union, `equipAt`, tombstone, TDZ placement): HIGH. Every constraint traced to a line or test.
- Default table: HIGH for every exported name (locked decisions); MEDIUM for unlogged names (A1).
- Pitfalls: HIGH. Each tied to a specific line or test.

**Research date:** 2026-10-10
**Valid until:** the next edit to `mergeDB`, `MIGRATIONS` or the registry helpers (the code is stable; re-check the line numbers if another phase lands first)
