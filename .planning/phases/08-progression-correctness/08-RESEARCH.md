# Phase 8: Progression Correctness - Research

**Researched:** 2026-10-10
**Domain:** In-repo training logic (pure functions in the single-file PWA `index.html`) plus one additive field on finished sessions
**Confidence:** HIGH (every claim below was read from the code this session, and the four bugs were reproduced against the real app through `test/harness.js`)

## Summary

This phase replaces two small pure functions and adjusts their two render call sites. Nothing outside
the repo is involved: no packages, no network, no schema bump. The bugs from the brief all reproduce
against the current build through the suite's own harness (probe run 2026-10-10):

| Case | Current output | Required |
|------|----------------|----------|
| DB lateral raise 25 lb, 20/17/15 → 20/18/15 → 20/18/16 → 20/19/16 | `isStalledSlot` → `true` | not stalled (PROG-03) |
| 2 sets at 20 + 1 skipped | `addWeightInfo` → `{"allTop":true,"lastW":25,"newW":30,"hasLoad":true}` | no add weight (PROG-01) |
| 30/30/25 lb, all at 20 reps | `{"allTop":true,"lastW":30,"newW":35,...}` | no add weight (D-02) |
| Bodyweight, 5 identical sessions at 0 lb | `isStalledSlot` → `false` | stalled (PROG-05) |

A prototype of the helpers recommended below was injected through `loadApp(..., {transform})` and passed
all 12 of the D-xx edge cases (see Code Examples). The work splits into:

1. Pure helpers that summarise one entry and compare two entries.
2. A per-slot streak walk keyed by `exKey`.
3. An add-weight verdict that refuses skipped, blank and lighter sets.
4. A `blankSets` count stamped at `finishWorkout` and carried through `editSession`.
5. The two render sites (`viewActive` flag and coach banner, `startWorkout` prefill).
6. Updating one existing test fixture (`f2Stall`) that is no longer a stall under the new rule.

**Primary recommendation:** Keep `isStalledSlot(name, workout, slotIndex)` and `addWeightInfo`'s return
shape `{allTop, lastW, newW, hasLoad}`, so the callers and the existing `busyStalled` test keep their
shape. Rewrite the internals around four pure `function` declarations: `workedSets`, `sessionSummary`,
`compareSessions` and `addWeightVerdict`. Store the D-01 marker as an entry-level `blankSets` count,
written only by `finishWorkout`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
The rules are locked by `.planning/v1.1-BRIEF.md` and REQUIREMENTS.md PROG-01..05. Below are the
implementation edge cases Ian decided on 2026-10-10.

#### What "every planned set" means (PROG-01)
- **D-01:** "Planned sets" means **the sets on the card when the workout was finished**, not the program's
  set count.
  - A set added with + Add set must also reach the top of the range.
  - A set removed deliberately (`rmSet`) does not count as missing.
  - Only a **skipped** set or a **blank** set blocks the increase.
  - Blank sets are dropped at `finishWorkout` today (index.html ~L2040), so the finished entry no longer
    shows that a set was blank. Record it in some form, for example by keeping a marker or storing the
    planned count, so the rule can be applied. How is the planner's call, within the data rules.
- **D-02:** Add weight also requires **every set at the working weight**. With 30, 30 and 25 lb all at the
  top of the range, the answer is **not** add weight.

#### Mixed or lower weights (PROG-02)
- **D-03:** A session's **working weight is its heaviest set**.
  - Compared with the previous session in the same slot:
    - heavier working weight = progress;
    - same working weight = progress if total reps across all sets rose by at least 1;
    - lighter working weight = **no progress, and not a failure either**. The comparison restarts from that
      session, the same way it restarts after a deload.
  - Set-by-set matching was rejected.

#### Which sessions count toward a stall (PROG-03, PROG-04)
- **D-04:** Each **slot keeps its own streak**, matched by the exercise's identity (`exKey`), not its exact
  name (`slotE1rmSeries` uses an exact `e.name === name` match today, L1152).
  - DB lateral raise in Push 1, Push 2 and the specialized day keeps three separate streaks, because the
    rep ranges and the order can differ.
  - Rejected: one streak across all slots.
- **D-05:** **Skipped days and deload sessions pause the streak.** They don't count as a flat session and
  they don't break the streak. The next real session is compared with the last real one.
  - Deload entries stay excluded, as they are today. INT-04 in Phase 13 relies on this for "lighter"
    sessions.
  - Lighter sessions (D-03) restart the comparison. That is different from a deload, which pauses it.
- **D-06:** 3 flat sessions in a row = stalled. One session of progress clears the warning. Never compare
  with the all-time best (`maxBefore`, L1162, goes).

#### Moving existing history to the new rule
- **D-07:** **Re-judge all history immediately.** The new rule is computed over every past session as soon
  as it ships.
  - Today's false warnings disappear.
  - A real 3-session stall shows up straight away.
  - No stored data is rewritten, because stall and add-weight are computed, not stored. No migration is
    needed for the rules themselves. D-01's blank-set marker, if the planner adds one, applies only to
    newly finished workouts. Older sessions are judged on what they hold, since their blank sets were
    already dropped.

#### Bodyweight exercises (PROG-05)
- **D-08:** Until Phase 9 adds an explicit equipment type, "bodyweight" means sets logged at weight 0
  (shown as BW), which is how the app already treats it.
  - Progress = +1 total rep.
  - When every set reaches the top of the range, the card shows "add weight (belt) or harder variation"
    with **no number**.
  - Bodyweight series must no longer be dropped. Today `e1rm` returns 0 for weight 0 and `if(best>0)`
    filters those sessions out, so bodyweight exercises can never stall.

### Claude's Discretion
- How the stall and progress rule is shaped in code: rewrite `isStalledSlot` and `slotE1rmSeries`, or
  replace them with one per-slot "session comparison" helper.
- The exact wording of the stalled banner, which can now say why ("no extra rep for 3 sessions").
- How D-01's blank-set information is stored, provided it follows CLAUDE.md:
  - finishing a workout already uses `save()`;
  - nothing about the draft syncs;
  - a new field on a session entry is additive and needs no migration unless existing rows are rewritten.

### Deferred Ideas (OUT OF SCOPE)
None came up. Everything discussed stayed inside Phase 8.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PROG-01 | Add weight only when every planned set was done (none skipped, none missing) and each reached the top of the range at the working weight | `addWeightVerdict(entry, rng)` (Pattern 3); `blankSets` stamped in `finishWorkout` (Pattern 4); latest-attempt lookup so a fully skipped or blank entry still blocks (Open Question 1) |
| PROG-02 | Progress = total reps +1 or heavier weight, against the previous session | `sessionSummary` and `compareSessions` (Pattern 1) |
| PROG-03 | Stalled only after 3 flat sessions in a row, each against the one before, never the all-time best | `stallStreak` walk (Pattern 2); `maxBefore` removed |
| PROG-04 | History follows `exKey`, not the exact name | `slotHistory` filters with `exKey(e)===exKey(name)`; `exKey` already resolves `exId`, then aliases, then the normalised name (index.html:1208-1212) |
| PROG-05 | Bodyweight stalls on +1 total rep; all-top shows "add weight (belt) or harder variation", no number | No `e1rm` in the new path, so weight 0 is a normal summary `{W:0, reps}`; `hasLoad===false` drives the no-number flag |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Single file: all app code stays in `index.html`. No build step and no dependencies.
- Run `npm test` before every push. Add checks for what changes.
- After **any** change to the inline `<script>`, run `npm run csp:hash`. The suite fails when the hash is stale.
- Sync is a union merge. Never use `set()`, and never resolve a conflict by "more data wins".
- Deletes are soft. Read through `liveSessions()`.
- A migration that rewrites rows must `touch()` them and persist at once. **This phase rewrites no stored rows** (D-07), so no migration and no `SCHEMA` bump.
- Derived data uses `saveLocal()`. Stall and add-weight are derived at render time and never stored.
- The draft never leaves the device. Draft edits use `saveLocal()`. Only `pickEx`, `exPick` and `finishWorkout` may call `save()` from a function that reads `DB.draft` (the suite enforces `DRAFT_PUSHERS`, test/app.test.js:3736).
- Every user-controlled string rendered into HTML goes through `esc()`, including attribute values you touch. `esc()` does not escape `'`.
- Markup never calls a function by name: use `data-action` with an `ACTIONS` wrapper. This phase adds no new controls; the existing `deloadExercise` and `undeloadExercise` buttons stay.
- Colours come from `:root` custom properties. The `.coach.stall` and `.flag` classes already exist.
- Tests assert the property, never the wording.
- After shipping, append a changelog entry to `C:\Main Vault\50-59 Projects & Events\53. Software Projects\PPL Tracker App.md`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Session summary and comparison (W, total reps, progress/flat/lighter) | Browser (pure JS in `index.html`) | — | Computed at render time from `liveSessions()`. Never stored (D-07). |
| Stall streak per slot and exercise | Browser (pure) | — | Same reason. Reads `liveSessions()`, filters by workout, slot index and `exKey`. |
| Add-weight verdict | Browser (pure) | — | Reads the latest qualifying entry and the slot's `effRange`. |
| Blank-set marker (`blankSets`) | Browser → local storage, then Firestore through the existing `save()` push | — | Written once, on the new session row, inside `finishWorkout`, which already calls `touch(sess)` and `save()`. It syncs as part of that row through the union merge. |
| Rendering the flag and the banner | Browser (`viewActive`) | — | Display only. Text through `esc()`. |

## Standard Stack

No libraries. Everything uses what already ships in `index.html`:

| Asset | Location | Role in this phase |
|-------|----------|--------------------|
| `liveSessions()` | index.html:760 | Source of history. Soft-deleted rows are already excluded. |
| `exKey(e)` | index.html:1208-1212 | Identity for D-04 and PROG-04 |
| `effRange(slot, name)` | index.html:868 | Rep range including per-exercise overrides |
| `INCREMENT` | index.html:1090 | Weight step. Wrap it in one seam for Phase 9. |
| `lastRealEntry(workout, slotIndex, exName)` | index.html:909-919 | Keeps feeding the "Last time" line and the prefill weights. Unchanged. |
| Test harness `loadApp(path, seed, {transform})` | test/harness.js:45-170 | Loads the real inline script into a `vm` with a frozen clock |

**Installation:** none.

## Package Legitimacy Audit

Not applicable. This phase installs no external packages (`package.json` has no dependencies, and the
project rule is "no dependencies").

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Current Code (verbatim, read this session)

These are the exact sources the plan rewrites. Line numbers are as of commit 7b94e7d.

`INCREMENT` and `addWeightInfo` [VERIFIED: index.html:1090-1098]:
```js
const INCREMENT = { lb:5, kg:2.5 };
/* Should we bump the load, and to what? Uses the last real entry's worked sets. */
function addWeightInfo(slot, ref, name){
  if(!ref) return null;
  const rng=effRange(slot, name), real=ref.entry.sets.filter(x=>!x.skipped && x.r!=='');
  if(!real.length) return null;
  const lastW=Math.max(0, ...real.map(x=> x.w===''?0:+x.w));
  return { allTop: real.every(x=> +x.r >= rng.hi), lastW, newW: lastW+(INCREMENT[DB.unit]||5), hasLoad: lastW>0 };
}
```
The bug: `real` filters out skipped and blank sets before `every(... >= rng.hi)`, and nothing checks that
every set is at `lastW`.

`slotE1rmSeries` and `isStalledSlot` [VERIFIED: index.html:1152-1165]:
```js
function slotE1rmSeries(name, workout, slotIndex){
  const v=[];
  liveSessions().forEach(s=>{ if(s.skipped || s.workout!==workout || !s.entries) return;
    const e=s.entries[slotIndex]; if(!e || e.deload || e.name!==name) return;
    let best=0; e.sets.forEach(x=>{ if(!x.skipped){ const val=e1rm(x.w,x.r); if(val>best) best=val; } });
    if(best>0) v.push(best); });
  return v;
}
function isStalledSlot(name, workout, slotIndex){
  const v=slotE1rmSeries(name, workout, slotIndex);
  if(v.length<4) return false;
  const maxBefore=Math.max(...v.slice(0,-3));
  return v.slice(-3).every(x=> x<=maxBefore);
}
```
`slotE1rmSeries` has exactly one caller (`isStalledSlot`). `isStalledSlot` has exactly one app caller
(index.html:1831) and one test caller (test/app.test.js:7329) [VERIFIED: grep]. Delete
`slotE1rmSeries` outright.

`e1rm` [VERIFIED: index.html:1022]: `function e1rm(w,r){ w=+w; r=+r; if(!w||!r) return 0; return w*(1+r/30); }`.
Keep it: strength charts, `exercisesWithData`, `exerciseHistory` and `translateLoad` still use it, and
Phase 13 STR reuses those. Only the stall path stops calling it.

`lastRealEntry` [VERIFIED: index.html:909-919]: skips `s.skipped` days, missing entries, a different
`exKey` when `exName` is given, `e.deload`, and entries with no worked set (`e.sets.some(x=>!x.skipped && x.r!=='')`).

`exKey` [VERIFIED: index.html:1208-1212]:
```js
function exKey(e){
  if(!e) return '';
  if(typeof e === 'string') return exIdByName(e) || normEx(e);
  return e.exId || exIdByName(e.name) || normEx(e.name);
}
```

`finishWorkout` drops blank sets [VERIFIED: index.html:2041-2042]:
```js
  // keep skipped sets (they carry a reason); drop sets with no reps (incl. pre-filled-weight-only)
  d.entries.forEach(e=>{ e.sets = e.sets.filter(s=> s.skipped || s.r!==''); e.sets.forEach(s=>delete s._cel); });
```
It then stamps `exId` (L2045), builds `sess` with `entries:d.entries` (L2057), and runs
`DB.sessions.push(touch(sess))` → `save()` (L2070-2072).

`editSession` rebuilds the draft entry from four fields only [VERIFIED: index.html:2258-2260]:
```js
    entries: PROGRAM[s.workout].slots.map((sl,i)=>{ const e=(s.entries||[])[i];
      return e ? { name:e.name, note:e.note||'', deload:!!e.deload, sets:(e.sets||[]).map(x=>({w:x.w,r:x.r,skipped:!!x.skipped,reason:x.reason||''})) }
               : { name:sl.examples[0], note:'', sets:[] }; }),
```
Any new entry field is **lost on edit** unless this line carries it (Pitfall 2).

Draft set mutators [VERIFIED: index.html:1967-1968, 1972]:
`function addSet(i){ DB.draft.entries[i].sets.push({w:'',r:'',skipped:false,reason:''}); saveLocal(); render(); }`,
`function rmSet(i,k){ if(DB.draft.entries[i].sets.length<=1)return; DB.draft.entries[i].sets.splice(k,1); saveLocal(); render(); }`,
and `skipSet` sets `st.skipped=true; st.reason=reason.trim(); st.w=''; st.r='';`. So `rmSet` already
removes a set from the card (D-01: does not count as missing), and a skipped set is kept with
`skipped:true`.

Render sites [VERIFIED: index.html:1814-1815, 1831]:
```js
      const aw = addWeightInfo(s, ref, entry.name);
      flag = (aw && aw.allTop) ? `<span class="flag">⬆ Add weight${aw.hasLoad?` → ${aw.newW} ${DB.unit}`:''}</span>` : '';
...
    else if(isStalledSlot(entry.name, name, i)) coachHint = `<div class="coach stall">⚠ Stalled — no new best for this exercise on ${name} in 3 sessions. <button class="coach-btn" data-action="deloadExercise" data-i="${esc(i)}">Deload −10%</button> or swap the exercise above.</div>`;
```
`${name}` (the workout) and `${DB.unit}` are not escaped. Escape both when these lines change (CLAUDE.md:
"Escape attributes too when you touch them").

The `startWorkout` prefill, the only writer of suggested weights [VERIFIED: index.html:1752-1758]:
```js
        const ref = lastRealEntry(name,i);
        const exName = ref? ref.entry.name : s.examples[0];
        const aw = addWeightInfo(s, ref, exName);
        const real = ref? ref.entry.sets.filter(x=>!x.skipped && x.r!=='') : [];
        ...
          if(aw) w = (aw.allTop && aw.hasLoad) ? String(aw.newW) : (real[k]? real[k].w : (real.length? real[real.length-1].w : ''));
```

The DB lateral raise slots, three separate streaks under D-04 [VERIFIED: index.html:334, 343, 397]:
`ex("Shoulders","Lateral raise",3,15,20,["DB lateral raise","Cable lateral raise"])` in PUSH 1 (slot 4)
and PUSH 2 (slot 4), and `ex("Shoulders","Lateral raise",5,15,20,[...])` in "SPECIALIZED — SHOULDERS"
(slot 1).

Schema [VERIFIED: index.html:481, 578]: `const SCHEMA = 18;`. Migration `17:d=>buildExerciseRegistry(d),`
stamps `exId` on every stored entry that has sets. Fixtures seeded at `_schema:16` get real ids;
fixtures seeded at `_schema:18` skip the registry migration, and `exKey` falls back to the normalised
name (the probe confirmed this: `exId` was `undefined` at `_schema:18`).

The in-app guide already states the rule [VERIFIED: index.html:473]: "**Add weight** once you hit the top
of the range on **all sets** … The app flags this with the green **⬆ Add weight** tag." It also has a
"Tiebreaker: total reps — 10+9+8 (27) → 10+10+8 (28) still counts as progress." So the new code finally
matches the guide's own text.

## Architecture Patterns

### System Architecture Diagram

```
 liveSessions()  (soft-deleted rows already gone)
       │
       ▼
 slotHistory(workout, slotIndex, exName)
   keep: s.workout===workout, !s.skipped, entry at slotIndex, exKey(entry)===exKey(exName)
       │                                                     │
       │ (stall path)                                        │ (add-weight path)
       ▼                                                     ▼
 drop entry.deload  ──► pause                      last entry that is !deload and was "on the card"
 sessionSummary(e) null (no worked set) ──► pause     (has sets, or blankSets>0)
       │                                                     │
       ▼                                                     ▼
 compareSessions(prev, cur)                         addWeightVerdict(entry, effRange(slot,name))
   W up       → progress → streak = 0                 blocked if any skipped set, blankSets>0,
   W same, reps ≥ prev+1 → progress → streak = 0      no worked set, or any set below W
   W same, otherwise → flat → streak += 1             allTop = every worked set r ≥ hi
   W down     → lighter → streak = 0 (restart)        hasLoad = W>0; newW = W + weightStep(name)
       │                                                     │
       ▼                                                     ▼
 isStalledSlot = streak ≥ 3                         viewActive flag: "⬆ Add weight → N unit"
       │                                              or (W==0) "⬆ Add weight (belt) or harder variation"
       ▼                                            startWorkout prefill: newW only when allTop && hasLoad
 viewActive coach banner (+ Deload −10% button)

 finishWorkout ──► per main entry: blankSets = sets with !skipped && r==='' (counted before the filter)
               ──► touch(sess) + save()  (unchanged) ──► union-merge sync of the whole session row
 editSession  ──► re-expands blankSets into blank draft rows, so a re-save recounts them
```

### Recommended code placement (inside `index.html`)

Replace the block at index.html:1090-1098 (`INCREMENT` and `addWeightInfo`) and 1147-1165 (stall
comment, `slotE1rmSeries`, `isStalledSlot`) in place. Declare every new helper as a **`function`
declaration**, not a `const` arrow:
- the harness reaches function declarations through `a.__sandbox.<name>` without editing the export list;
- nothing here runs at module-eval time, so there is no temporal-dead-zone exposure.

Still, never call these helpers from `normalize()`, `load()` or a `MIGRATIONS` entry.

### Pattern 1: Summarise one entry and compare two (PROG-02, D-03, D-08)
**What:** One summary per entry: `W` = heaviest worked set (blank weight = 0), `reps` = sum of reps over
worked sets. Compare two summaries in three ways.
**When:** The stall walk. Phase 13's lighter-session work and Phase 10's inline history can reuse it.
```js
// Source: prototype run against the real app via loadApp(..., {transform}) on 2026-10-10 (all 12 cases OK)
function setWeightNum(x){ const v = (x.w===''||x.w==null) ? 0 : +x.w; return isFinite(v) && v>0 ? v : 0; }
function workedSets(e){ return (e && Array.isArray(e.sets) ? e.sets : []).filter(x=> x && !x.skipped && x.r!=='' && x.r!=null); }
function sessionSummary(e){
  const worked = workedSets(e); if(!worked.length) return null;          // nothing done → caller pauses
  const W = Math.max(0, ...worked.map(setWeightNum));
  const reps = worked.reduce((a,x)=> a + (isFinite(+x.r) ? +x.r : 0), 0);
  return { W, reps };
}
function compareSessions(prev, cur){
  if(cur.W > prev.W) return 'progress';
  if(cur.W < prev.W) return 'lighter';                                     // D-03: restart, not a failure
  return cur.reps >= prev.reps + 1 ? 'progress' : 'flat';
}
```
`setLoad` already exists at index.html:1283 (`const setLoad = x => (x.w===''||x.w==null) ? 0 : +x.w;`),
but it has no NaN guard, and `validateBackup()` never type-checks `w`. Keep the guarded variant for the
progression path.

### Pattern 2: Per-slot streak walk (PROG-03, PROG-04, D-04..D-06)
```js
function slotHistory(workout, slotIndex, exName){
  const key = exKey(exName), out = [];
  liveSessions().forEach(s=>{
    if(s.skipped || s.workout!==workout || !Array.isArray(s.entries)) return;   // skipped day → pause
    const e = s.entries[slotIndex];
    if(!e || exKey(e)!==key) return;                                           // another lift in this slot → pause
    out.push({ entry:e, date:s.date });
  });
  return out;                                                                   // liveSessions() is date-sorted
}
function stallStreak(workout, slotIndex, exName){
  let prev = null, streak = 0;
  slotHistory(workout, slotIndex, exName).forEach(({entry})=>{
    if(entry.deload) return;                                                    // D-05: pause
    const cur = sessionSummary(entry); if(!cur) return;                         // no worked set → pause
    if(prev) streak = compareSessions(prev, cur)==='flat' ? streak+1 : 0;       // progress or lighter → 0
    prev = cur;                                                                 // always compare with the one before
  });
  return streak;
}
function isStalledSlot(name, workout, slotIndex){ return stallStreak(workout, slotIndex, name) >= 3; }
```
"3 flat sessions" means a baseline plus 3 flats, so 4 real sessions minimum. That matches today's
`v.length<4` threshold. Return the streak too if the banner should say why. For example, the planner
can expose `stallStreak` and word the banner "no extra rep or weight for 3 sessions".

### Pattern 3: Add-weight verdict (PROG-01, D-01, D-02, D-08)
```js
function weightStep(name){ return INCREMENT[DB.unit] || 5; }   // Phase 9 seam: EQUIP-04 replaces the body only
function addWeightVerdict(entry, rng){
  if(!entry) return null;
  const sets = Array.isArray(entry.sets) ? entry.sets : [];
  const worked = workedSets(entry);
  const blocked = sets.some(x=>x && x.skipped) || (+entry.blankSets > 0) || !worked.length;
  const W = worked.length ? Math.max(0, ...worked.map(setWeightNum)) : 0;
  const allTop = !blocked && worked.every(x=> setWeightNum(x)===W && +x.r >= rng.hi);
  return { allTop, lastW:W, hasLoad:W>0 };
}
```
`addWeightInfo` then becomes a thin wrapper. It picks the entry to judge (see Open Question 1), calls
`addWeightVerdict(entry, effRange(slot, name))`, and adds `newW: lastW + weightStep(name)`. Keep the
returned `{allTop, lastW, newW, hasLoad}` shape so `startWorkout` and `viewActive` change only where
the BW wording is added.

BW flag wording (PROG-05): when `aw.allTop && !aw.hasLoad`, render
`⬆ Add weight (belt) or harder variation` with no number. Today that branch already renders the bare
"⬆ Add weight", so this is a text change on the existing branch. The prefill is unchanged: it never
prefills a number for BW.

### Pattern 4: Record blank sets at finish (D-01)
```js
// in finishWorkout, replacing L2042 — main entries only (extras are not progression-tracked)
d.entries.forEach(e=>{
  const blank = e.sets.filter(s=> !s.skipped && s.r==='').length;
  e.sets = e.sets.filter(s=> s.skipped || s.r!=='');
  e.sets.forEach(s=>delete s._cel);
  if(blank>0) e.blankSets = blank; else delete e.blankSets;
});
```
```js
// in editSession, L2259 — re-expand so the user sees (and can fill or remove) the blanks, and the re-save recounts them
sets: (e.sets||[]).map(x=>({w:x.w,r:x.r,skipped:!!x.skipped,reason:x.reason||''}))
        .concat(Array.from({length: Math.max(0, Math.floor(+e.blankSets||0))}, ()=>({w:'',r:'',skipped:false,reason:''})))
```
Why this satisfies CLAUDE.md:
- The field is written only on the **new** session row inside `finishWorkout`, which already does
  `touch(sess)` and `save()`. Every merge consumer keeps it, because sessions merge as whole rows by
  `mtime`.
- No existing row is rewritten, so there is no migration and no `SCHEMA` bump (D-07).
- The draft carries no `blankSets` of its own: `editSession` turns the count back into blank rows, and
  `finishWorkout` recounts. No draft data is synced.
- `editSession` already uses `saveLocal()`.
- No new function reads `DB.draft` and calls `save()`, so `DRAFT_PUSHERS` stays
  `['exPick','finishWorkout','pickEx']`.

Rejected alternatives:
- **Keep the blank sets in the stored entry.** Many consumers treat `x.r!==''` or `!x.skipped`
  as "worked" (`e_count`, `sessionRows` export, history `setsOf`, `weeklySetsByMuscle`, PR scans,
  `targetSet`, `previewRows`, `viewActive` collapsed summary). Blank rows would leak into counts, the
  export and the history text.
- **Store `planned: N`.** It works the same, but every reader must then compute `planned - sets.length`,
  and a later `exMerge` or edit that changes `sets` silently corrupts the difference. A count of what was
  actually blank is self-contained.

### Anti-Patterns to Avoid
- **Matching on `e.name`.** Always use `exKey(e)===exKey(name)`. Today's `e.name!==name` is exactly why a
  rename splits the history (PROG-04).
- **Using `e1rm` as the progress measure.** It is 0 for bodyweight, which drops the session, and it is
  blind to reps on non-best sets. Both of the brief's bugs come from it.
- **Comparing against a max over history.** D-06: compare only with the previous real session.
- **Treating a deload as "lighter".** A deload pauses the streak. A lighter non-deload session restarts
  it. Check `entry.deload` before comparing.
- **Storing the stall or add-weight result.** It is derived. Storing it would need `saveLocal()`
  discipline and would go stale on edit or delete.
- **Changing `lastRealEntry` semantics.** It feeds "Last time", `targetSet`, `repHint`, `setStatus`,
  `deloadExercise` and the draft builders. Add the latest-attempt lookup as a separate helper instead.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Exercise identity | name or `toLowerCase()` comparisons | `exKey()` | Handles `exId`, registry aliases (renames and merges) and legacy entries |
| Live history | `DB.sessions` scans | `liveSessions()` | A soft-deleted session would ghost back into the streak |
| Rep range for a slot and exercise | `slot.lo/hi` | `effRange(slot, name)` | Per-exercise overrides (Deficit sumo squat 12–15) |
| Weight step | a literal `5` | one `weightStep(name)` seam over `INCREMENT` | Phase 9 (EQUIP-04) swaps the body without touching the callers |
| HTML escaping | manual replace | `esc()` | Project rule |

## Runtime State Inventory

This is a logic refactor plus one additive field, not a rename. Checked anyway, because it changes the
shape of synced rows:

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | Session entries gain an optional `blankSets` (number) on rows finished after the deploy. Existing rows are untouched (D-07). | Code edit only. No data migration. |
| Live service config | None. Firestore rules check ownership, not shape (CLAUDE.md). Verified: no rule change needed. | None |
| OS-registered state | None. The service worker caches `index.html`, and the PWA update lag (~10 min, per memory) means a phone may run the old build briefly. | None. Phone verification must confirm Settings → This version first. |
| Secrets/env vars | None | None |
| Build artifacts | The CSP `sha256` in the `<meta>` policy is stale after any script edit | Run `npm run csp:hash`. The suite fails otherwise. |

Cross-version note: a device still on the old build that **edits** a session finished on the new build
rebuilds the entry from `{name,note,deload,sets}` and drops `blankSets` (Pitfall 2). That only loses a
blocker, which means one possibly wrong "add weight" hint, and no logged data is lost. Accept and
document it.

## Common Pitfalls

### Pitfall 1: The existing stall fixture stops being a stall
**What goes wrong:** test/app.test.js:7329 asserts `busyStalled === true` on `f2MidBusy`, which calls
`f2Stall`. `f2Stall` pushes PUSH 1 slot-0 sessions `[[-40,'185','8'],[-35,'135','5'],[-30,'135','5'],[-25,'135','5']]`
[VERIFIED: test/app.test.js:7181], and `populatedDB` adds `s1` at `dayOff(-9)` with `135×8, 135×7`
[VERIFIED: test/app.test.js:2515-2516].
**Why:** Under the new rule:
- −35 is lighter than −40, which restarts the streak;
- −30 and −25 are flat, so the streak is 2;
- −9 has 15 reps against 5, which is progress, so the streak is 0.

The result is not stalled, the 05-06 "stalled slot" screen loses its Deload button, and the
handler-inventory check at 7394 fails.
**How to avoid:** Rewrite `f2Stall` so that the last 4 real PUSH 1 slot-0 sessions are a baseline plus
3 flats. For example, push three sessions after `s1` at `dayOff(-8)`, `dayOff(-6)` and `dayOff(-4)`,
each `135×8, 135×7`. Update its comment, which describes the old "never beats the first one" rule.
**Warning signs:** `FAIL` on the F2 handler inventory, `busyStalled: false`.

### Pitfall 2: `blankSets` lost on edit
**What goes wrong:** `editSession` (index.html:2259) copies only `name, note, deload, sets`, and
`finishWorkout` rebuilds the session from the draft. A re-saved edit silently clears the blocker.
**How to avoid:** Re-expand the count into blank draft rows (Pattern 4). Test: finish with 1 blank → edit →
re-save without changes → `blankSets===1` still, and no add-weight flag.

### Pitfall 3: A fully skipped or fully blank exercise still says "add weight"
**What goes wrong:** `lastRealEntry` skips entries with no worked set. If the add-weight check only judges
`ref.entry`, then "skip all 3 sets of lateral raise" falls through to the session before, which may be
all-top, and the card says add weight. This is the same class of bug Ian reported, and LOG-05 (Phase 10)
requires a skipped exercise to block.
**How to avoid:** See Open Question 1. Judge the latest non-deload entry that was on the card, not
`lastRealEntry`'s entry.

### Pitfall 4: Fixtures seeded at `_schema:18` have no exercise ids
**What goes wrong:** Migration 17 (`buildExerciseRegistry`) doesn't run, so `exKey` falls back to the
normalised name and an alias-spelling test ("Seated Flys" vs "Seated Fly") would fail for the wrong
reason.
**How to avoid:** Seed with `_schema:16` through `app.normalize(...)`, the way `withSessions`
(test/app.test.js:410) and `twoSpellings` (1771) already do.

### Pitfall 5: The phone runs the old build
**What goes wrong:** The PWA update lag (memory: up to ~10 minutes) makes the fix look missing.
**How to avoid:** The phone check starts with Settings → This version showing the new build stamp.

### Pitfall 6: Stale CSP hash blanks the app
**How to avoid:** `npm run csp:hash` after the last script edit of every plan, then `npm test`. The suite
names the command when the hash is stale.

### Pitfall 7: NaN from imported data
**What goes wrong:** `validateBackup()` checks shape only, so `w:"abc"` makes `+x.w` NaN. `Math.max`
with NaN returns NaN, and every comparison becomes false.
**How to avoid:** The `isFinite` guards in `setWeightNum` and `sessionSummary`. Add one test with a
garbage `w`.

### Pitfall 8: Probing the app from a script hangs
The app arms timers. Ad-hoc `node` probes through `loadApp` must end with `process.exit(0)`, as the
suite does (test/app.test.js:7738). (A probe without it hung for 2 minutes this session.)

## Code Examples

Prototype test fixture (shape the planner can lift into `test/app.test.js`):
```js
// Source: this session's prototype, adapted to the suite's conventions (ok(), _schema:16 normalize)
const LW = 'PUSH 1', LAT = app.PROGRAM[LW].slots.findIndex(s=>s.examples.includes('DB lateral raise'));
let nId = 0;
const latSess = (date, sets, o={}) => ({ id:'lat'+(nId++), workout:LW, date, endedAt:1, extras:{}, skipped:!!o.skippedDay,
  entries: app.PROGRAM[LW].slots.map((s,i)=> i!==LAT ? { name:s.examples[0], sets:[] }
    : Object.assign({ name:o.name||'DB lateral raise',
        sets: sets.map(([w,r,sk])=>({ w:String(w), r: sk?'':String(r), skipped:!!sk, reason:'' })) },
      o.deload?{deload:true}:{}, o.blankSets?{blankSets:o.blankSets}:{}) ) });
const latRun = list => { app.DB = app.normalize(Object.assign(app.blank(), { _schema:16, sessions:list, draft:null })); };
latRun([ latSess('2026-07-01',[[25,20],[25,17],[25,15]]), latSess('2026-07-08',[[25,20],[25,18],[25,15]]),
         latSess('2026-07-15',[[25,20],[25,18],[25,16]]), latSess('2026-07-22',[[25,20],[25,19],[25,16]]) ]);
ok('PROG-03: extra reps on later sets are progress, so the DB lateral raise is not stalled',
   app.__sandbox.isStalledSlot('DB lateral raise', LW, LAT) === false);
```

Prototype results (all against the real `index.html` with the helpers appended through `transform`):

| Case | Result |
|------|--------|
| lateral raise, later-set reps | not stalled (old code: stalled) |
| baseline + 3 flat | stalled |
| baseline + 2 flat | not stalled |
| deload and skipped day in between, 3 flats around them | stalled (paused, not broken) |
| lighter session, then 2 flat | not stalled (restart) |
| bodyweight, baseline + 3 flat | stalled (old code: not stalled) |
| "Seated Fly"/"Seated Flys"/"seated flys" alias spellings | one streak, stalled |
| 2 top + 1 skipped | no add weight |
| 30/30/25 all top | no add weight |
| 4 sets (one added) all top | add weight |
| 2 top + `blankSets:1` | no add weight |
| bodyweight all top | `allTop` true, `hasLoad` false |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Best-set e1RM vs the all-time max before the last 3 | Session-to-session W and total-reps comparison, streak ≥ 3 | This phase | Later-set reps count. Bodyweight stalls. No permanent stall after a PR. |
| Exact `e.name` match | `exKey` match | This phase (stall path; `lastRealEntry` already used `exKey`) | Renames and merges keep history |
| Blank sets vanish at finish | `blankSets` count on the entry | This phase | D-01 can be applied to new sessions |

**Deprecated:** `slotE1rmSeries` (delete it). The stall comment block at index.html:1147-1151 describes
the old rule. Rewrite it so it doesn't mislead the next reader.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | An exercise whose sets were **all** skipped or all left blank (on a new session) should block add weight next time, and pause the stall streak | Open Question 1, Pitfall 3 | If Ian wants it to fall through to the older session, the card would show "add weight" after a skipped exercise. That is low data risk, but it is the reported complaint. |
| A2 | Legacy entries with `sets: []` and no marker are "not performed" (pause, and they don't block), because D-07 says old sessions are judged on what they hold | Open Question 1 | A legacy fully blank exercise wouldn't block the next add-weight. That matches today's behaviour, so nothing regresses. |
| A3 | A session with a skipped set still counts in the stall comparison: its total reps are lower, so it is usually "flat" | Pattern 2 | D-05 pauses only skipped *days* and deloads, so this follows the letter. If Ian expects a partly skipped session to pause, the streak could reach 3 one session early. |
| A4 | Accessory extras (abs, forearms) stay out of scope: no `blankSets`, no stall | Pattern 4 | They never had stall or add-weight logic, so nothing regresses. |
| A5 | Banner copy: "⚠ Stalled — no extra rep or weight on {workout} for 3 sessions." | Discretion | Copy only |

## Open Questions (RESOLVED)

1. **Which entry does the add-weight verdict judge?**
   - RESOLVED: by D-09 in 08-CONTEXT.md. Judge the latest non-deload entry that was on the card, even
     when every set was skipped or left blank, and keep `lastRealEntry` for "Last time" and the prefill.
     This is implemented as `lastAttemptEntry` in 08-01 Task 1 and pinned by 08-01 Task 2's tests.
   - What we know: `lastRealEntry` skips entries with no worked set, so a fully skipped or fully blank
     exercise is invisible to it. D-01 says a skipped or blank set blocks. LOG-05 (Phase 10) says a
     skipped exercise blocks next time.
   - Recommendation: judge the **latest** entry from `slotHistory(workout, i, name)` that is `!deload`
     and was on the card, meaning `sets.length>0 || blankSets>0`. Keep `lastRealEntry` for the "Last
     time" line and the prefill weights. Then:
     - a fully skipped or blank new entry blocks, with no flag; the prefill falls back to the last real
       weights, as today;
     - a legacy `sets:[]` entry is skipped, which matches A2.

     This makes LOG-05's blocking free in Phase 10. If the planner wants the minimum instead, judge
     `ref.entry` only and leave a note for Phase 10. Either way, write a test that pins the chosen
     behaviour.
2. **Does the in-app guide (GUIDE "How to progress", index.html:473) need a line about skipped or blank
   sets and the stall rule?** Optional copy. Recommend adding "with no set skipped or left blank, all at
   the same weight" and one sentence on the stall rule, so the guide keeps matching the code.
   - RESOLVED: by D-10 together with 08-02 Task 3's GUIDE update. The "How to progress" entry gains the
     add-weight wording (no set skipped or left blank, all at the same weight), a stall sentence (3
     sessions in a row, deloads, skipped days and sessions with a skipped set don't count, per D-10),
     and a bodyweight line.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | `npm test`, `npm run csp:hash` | ✓ | v24.15.0 | — |
| git | suite's line-ending check (missing git fails the suite) | ✓ | 2.56.0.windows.2 | — |
| Ian's phone (Android PWA) | Phase verification: a real workout | Human step | — | none; end-of-phase human verify |

Baseline: `npm test` → **928 passed, 0 failed, 2 skipped** in about 5 s (run 2026-10-10 in this worktree).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Plain Node script with its own `ok(name, cond, extra)` asserter. No library. |
| Config file | none. `test/harness.js` (vm sandbox, frozen clock 2026-08-07T17:00Z, `TZ=America/Chicago`) |
| Quick run command | `npm test` (about 5 s) |
| Full suite command | `npm test` (CI runs exactly this) |
| Access to new helpers | `a.__sandbox.<fnName>` for `function` declarations. Optionally add the names to the export list in `test/harness.js:117-156` so they read as `app.<name>`. |

### Phase Requirements → Test Map
| Req / Decision | Behaviour | Test Type | Automated Command | File Exists? |
|----------------|-----------|-----------|-------------------|-------------|
| PROG-01 / D-01 | 2 top + 1 skipped → no add weight | unit (pure verdict, fixture sessions) | `npm test` | ❌ new section |
| PROG-01 / D-01 | 2 top + `blankSets:1` → no add weight; all top with `blankSets` absent → add weight | unit | `npm test` | ❌ |
| D-01 | added 4th set must also reach top; a removed set (`rmSet`) is not missing | unit (verdict) + draft flow (`addSet`/`rmSet` → `finishWorkout`) | `npm test` | ❌ |
| D-01 | `finishWorkout` stamps `blankSets` equal to the count of `!skipped && r===''` sets, omits it when 0, and keeps the session `touch`ed | integration (`a.finishWorkout()` on a `fullDraft`) | `npm test` | ❌ |
| D-01 | `editSession` → re-save keeps `blankSets` (re-expanded rows recounted) | integration | `npm test` | ❌ |
| D-01 (sync) | a stale-device merge replay keeps `blankSets` on the newer row (whole-row mtime merge) | unit (`mergeDB`) | `npm test` | ❌ |
| D-02 | 30/30/25 all top → no add weight | unit | `npm test` | ❌ |
| PROG-02 / D-03 | heavier W = progress; same W with +1 total reps = progress; same W, same reps = flat | unit (`compareSessions`) | `npm test` | ❌ |
| PROG-03 | lateral raise 20/17/15 → 20/18/15 → 20/18/16 → 20/19/16 is **not** stalled (the phone replay case) | unit (`isStalledSlot` on fixtures) | `npm test` | ❌ |
| PROG-03 / D-06 | baseline + 3 flat → stalled; + 2 flat → not; one progress after 3 flats clears it | unit | `npm test` | ❌ |
| D-06 | a big old PR followed by 3 progressing sessions is not stalled (no all-time max) | unit | `npm test` | ❌ |
| D-03 | a lighter session restarts: lighter + 2 flat → not stalled; lighter + 3 flat → stalled | unit | `npm test` | ❌ |
| D-05 | deload entries and skipped days in the middle pause (3 flats around them → stalled) | unit | `npm test` | ❌ |
| D-04 | same exercise in PUSH 1 slot 4 and PUSH 2 slot 4: 3 flats in one slot doesn't stall the other | unit | `npm test` | ❌ |
| PROG-04 | alias spellings / `exMerge` / `renameExercise` keep one streak (seed at `_schema:16`) | unit | `npm test` | ❌ |
| PROG-05 / D-08 | bodyweight baseline + 3 flat → stalled; +1 rep clears | unit | `npm test` | ❌ |
| PROG-05 / D-08 | BW all top → flag text contains "belt" and "harder variation" and no digits after the arrow; prefill writes no number | render (`viewActive()` HTML) + `startWorkout` | `npm test` | ❌ |
| D-07 | no `SCHEMA` change; booting old data rewrites no session (`mtime` unchanged) | unit | `npm test` | ✅ partly (schema tests exist) |
| Security | garbage `w` ("abc") neither throws nor stalls; `viewActive` stall banner escapes the workout name and unit | unit + render | `npm test` | ❌ |
| Regression | `f2Stall` fixture rewritten; `busyStalled===true` and the handler inventory still pass | existing | `npm test` | ✅ (needs fixture edit) |
| Regression | DRAFT-05: `DRAFT_PUSHERS` unchanged; `editSession` row still stores the identical draft | existing | `npm test` | ✅ |
| CSP | inline-script hash current | existing | `npm run csp:check` / `npm test` | ✅ |
| Phone | a real workout: the lateral raise shows no stall; a skipped set → no ⬆ next time; build stamp checked first | manual (human verify, end of phase) | — | manual-only: needs Ian's real history and device |

### Sampling Rate
- **Per task commit:** `npm run csp:hash && npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** full suite green, plus the phone workout check, before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] New section in `test/app.test.js` ("── progression: add weight and stall ──") with a slot fixture builder seeded through `normalize` at `_schema:16`
- [ ] Rewrite `f2Stall` (test/app.test.js:7177-7186) so it is a stall under the new rule
- [ ] Optional: export the new helper names in `test/harness.js` (or use `a.__sandbox`)

## Security Domain

`security_enforcement: true`, ASVS level 1.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | unchanged (Firebase Auth) |
| V3 Session Management | no | — |
| V4 Access Control | no | `firestore.rules` unchanged (ownership-gated) |
| V5 Input Validation | yes | Stored `w`/`r` are untyped strings (imports are shape-checked only). The progression helpers coerce with `+` and guard `isFinite`, and never throw on garbage. |
| V5 Output Encoding | yes | `esc()` on every interpolated value in the changed lines: workout name, `DB.unit`, numbers |
| V6 Cryptography | no | CSP hash via `npm run csp:hash` (sha256 is computed by the existing script, never by hand) |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| A hand-edited backup puts markup in `DB.unit`, which renders in the add-weight flag | Tampering → XSS | `esc(DB.unit)` in the touched flag line. The CSP blocks inline script injection anyway. |
| A malformed `blankSets` (string, negative, huge) from an import | Tampering / DoS | Read as `+entry.blankSets > 0`. `editSession` clamps with `Math.max(0, Math.floor(...))` and should cap (e.g. ≤ 20) before `Array.from`. |
| A stale device blind-writes and removes `blankSets` | Tampering (integrity) | Sessions merge whole-row by `mtime`. The newer finished row wins. A stale build's *edit* can drop it (documented, low impact). |

## Sources

### Primary (HIGH confidence)
- `index.html` (read this session): L325-412 PROGRAM; L470-477 GUIDE; L481 SCHEMA; L537-579 MIGRATIONS; L600-660 registry and rename; L672-724 normalize and draft helpers; L868 effRange; L898-943 lastRealEntry, lastAnywhere, translateLoad; L1015-1175 e1rm, plates, INCREMENT, addWeightInfo, badges, repHint, setStatus, stall, deload; L1179-1351 identity, PRs, BW series; L1744-1787 startWorkout, startBackdate; L1790-1871 viewActive; L1955-2076 draft mutators and finishWorkout; L2195-2266 history and editSession; L2350-2362 exerciseHistory; L3995-4018 sessionRows.
- `test/harness.js` (L1-180), `test/app.test.js` (L1-30, L380-420, L1765-1830, L2512-2531, L2640-2655, L3727-3812, L5285-5300, L7160-7200, L7720-7739).
- Live probes against the real app via `loadApp`: the current bug outputs and the prototype of the recommended helpers (12/12 cases).
- `.planning/phases/08-progression-correctness/08-CONTEXT.md`, `08-DISCUSSION-LOG.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md` § Phase 8, `.planning/v1.1-BRIEF.md` § 1, `CLAUDE.md`.

### Secondary / Tertiary
- None. No external documentation applies; the research-plan seam was not used, because every question is about in-repo code.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH. There are no dependencies; every reused helper was read.
- Architecture: HIGH. Prototyped against the real script, all cases pass.
- Pitfalls: HIGH. The `f2Stall` break was derived by hand from the read fixture values. `editSession` field loss was read from source.
- Open Question 1 / A1: MEDIUM. It is a reading of D-01 plus LOG-05 and needs Ian's or the planner's confirmation.

**Research date:** 2026-10-10
**Valid until:** until `index.html` changes substantially (line numbers drift with every edit; re-grep before editing)
