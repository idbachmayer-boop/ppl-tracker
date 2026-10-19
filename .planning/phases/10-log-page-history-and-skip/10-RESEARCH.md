# Phase 10: Log Page — History and Skip - Research

**Researched:** 2026-10-13
**Domain:** In-repo vanilla JS (single-file PWA `index.html`): active-workout card UI, device-local draft, synced session shape, router/scroll, and the Node `vm` test harness
**Confidence:** HIGH (every claim about existing code was read this session; the only external-behaviour claim, scroll after `innerHTML`, is tagged `[ASSUMED]` and is covered by Ian's phone UAT)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

Carried forward (not re-asked):
- Phase 8 D-09: add weight judges the latest non-deload entry where the exercise was on the card, even
  one where every set was skipped. Phase 8 D-10: a session with any skipped set pauses the stall streak.
  A skipped exercise therefore blocks add weight and pauses the stall streak **through the existing
  per-set `skipped` checks** in `addWeightInfo` and `isStalledSlot`.
- Phase 8 kept `lastRealEntry` as the source of the "Last time" line and the prefilled weights. It
  skips skipped sets and deloads, so the line keeps showing the last real attempt.
- History follows `exKey` (PROG-04).

#### Inline history: what the 5 sessions are
- **D-01:** The 5 rows are **this exercise's last 5 sessions in any workout or slot**, matched by
  `exKey`, newest first. Every row is labelled with its workout (for example "Push 2"). This matches the
  per-exercise Strength chart. Rejected: this slot only, or this slot with "anywhere" as a fallback.
  - Note: add weight and stall stay per slot (Phase 8 D-04). The history view is wider than the
    judgement on purpose.
- **D-02:** Each row shows **date · workout · sets**, plus small markers for a deload (↓), skipped sets
  or a skipped exercise (with its reason), and a PR. The entry's note goes on its own muted line.
  Rejected: date and sets only, and a ▲/=/▼ trend cue.
- **D-03:** **Deloads and skipped attempts count among the 5 and are marked.** The history shows what
  actually happened, so Ian can see why there's no Add weight. Rejected: "real sessions only" (the
  `lastRealEntry` filter).
- **D-04:** It reads through `liveSessions()` (ROADMAP note), so a deleted session never comes back
  into view. Skipped *days* (`s.skipped`) have no entries and don't appear.
- **D-05:** **When editing a past workout** (`DB.draft.editRef` is set), the session being edited is
  **left out** of its own history.

#### Inline history: opening and closing
- **D-06:** Tapping the Last time line toggles the panel. **Only one panel is open at a time**: opening
  another card's history closes the first. Which card is open is **screen-only state** (like
  `collapsedEx`) and is never written into `DB.draft`. Opening and closing never call `save()` or
  `saveLocal()`.
- **D-07:** **"No previous data — set your baseline." is not tappable.** With no history there is
  nothing to show. When the line comes from `lastAnywhere` (no history in this slot, some elsewhere),
  it is tappable, because D-01 history is per exercise.

#### Skipping a whole exercise
- **D-08:** **Skip marks only the unfinished sets.** A set that already has reps stays done, and every
  set without reps is marked skipped. Real work is never thrown away. A skipped set still blocks Add
  weight (Phase 8 D-01/D-09). — **Reversibility:** costly — finished sessions written under this rule
  hold done sets alongside skipped ones. Changing to "skip everything" later would not change those
  sessions, and the history and Add-weight rules would have to read both forms.
- **D-09:** **Keep the per-set `skipped` flag as the source of truth** in the saved session, so
  `addWeightInfo`, `isStalledSlot`, PRs, volume, the export and **older app builds on another device**
  all handle a skipped exercise with no changes. An exercise-level marker (for example the reason, or
  a flag saying "skipped as a whole") may be added for display. The shape is the planner's call, within
  the data rules. — **Reversibility:** one-way — whatever field lands in a synced session is read by
  every device and by every backup from now on. It has to stay additive. Old builds must still judge
  Add weight correctly from the per-set flags alone.
- **D-10:** The reason comes from **`prompt()`**, like `skipSet` and `skipStairs` already do. Cancel
  aborts the skip. An empty answer skips with no reason. The reason is user text, so it goes through
  `esc()` when rendered and only into double-quoted attributes.
- **D-11:** A skipped card is **collapsed to a one-line skip note with an Undo button**, like the skipped
  stair-stepper card. If some sets were done first, it reads **done sets + "rest skipped: reason"**,
  for example "Lat pulldown · 120×10, 120×9 · rest skipped: shoulder".
- **D-12:** The skip button is a **skip-forward icon in the card header, next to the collapse caret**.
  It is a `data-action` control, never an inline handler. **It is hidden when every set already has
  reps**, because there is nothing left to skip.
- **D-13:** **Undo restores the card exactly as it was before the skip**, including pre-filled and typed
  weights, and any single sets that were already skipped with their own reasons. This is different from
  today's single-set `unskipSet`, which re-fills with `nearWeight`. The pre-skip state lives in the draft
  so it survives a reload. **It must not reach the finished session**: `finishWorkout` copies every
  draft entry field, so it has to be stripped there, the same way `_cel` is.
- **D-14:** Skip, un-skip and every edit made while skipped are draft edits: **`saveLocal()`, never
  `save()`** (CLAUDE.md draft rule; the suite's draft tripwire fails otherwise).

#### After the workout
- **D-15:** In finished-session history (Workout history and the D-01 inline view), a skipped exercise
  reads **"Name — skipped: reason"**, or done sets + "rest skipped: reason", muted.
- **D-16:** **A workout where every exercise was skipped can be finished** and is saved as a normal
  session, with each exercise marked skipped, so each one blocks Add weight next time. `finishWorkout`
  already accepts skipped sets as content. Rejected: steering Ian to "Skip day".
- **D-17:** Next time, the **Last time line keeps the last real numbers** (`lastRealEntry`) and adds a
  small muted note when the most recent attempt in this slot was skipped, for example "skipped Oct 13:
  shoulder", so it's clear why there's no ⬆ Add weight.
- **D-18:** The Markdown export carries the skip the way it already carries skipped sets and their
  reasons. **No exporter change is expected** (CLAUDE.md step 6: the export derives from the data). If
  D-09 adds an exercise-level field, check that the export shows it sensibly.

#### The chart link and coming back
- **D-19:** The inline history's link opens **Train → Progress → Strength with this exercise already
  selected** (`progSub='strength'` and `selectedExercise` set to the exercise's `exKey`, or its "(reps)"
  series for bodyweight). If the exercise has no chartable data, Strength opens on its default.
- **D-20:** Arriving from a workout, Strength shows a small **"← Back to workout"** control. Tapping Train
  → Log also works. Neither path touches the draft.
- **D-21:** **Coming back restores the scroll position, keeps that card's history panel open, and keeps
  collapsed cards collapsed.** Every set is unchanged. This return state is screen-only and never goes
  into `DB.draft` or a save.

### Claude's Discretion
- The data shape of the exercise-level skip (D-09), within the rules stated there.
- How the pre-skip snapshot is stored in the draft (D-13), within the draft rules.
- The exact wording, icons and spacing of the markers (D-02), the skip note (D-11, D-15, D-17) and the
  back control (D-20). Use Phosphor icons from `PH` and `:root` colours (CLAUDE.md conventions).

### Deferred Ideas (OUT OF SCOPE)
None. The discussion stayed within the phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description (REQUIREMENTS.md) | Research Support |
|----|-------------|------------------|
| LOG-01 | Tapping the "Last time" line on an exercise card opens that exercise's last 5 sessions inline on the card. The workout is never left, and the in-progress draft is unchanged. | New pure helper over `liveSessions()` + `sessionExercises()` + `exKey()` (§Pattern 3); screen-only `openExHist` like `collapsedEx` (§Pattern 4); the line becomes a `<button class="lasttime tap">` (§Pitfalls 4, 5) |
| LOG-02 | The inline history links to that exercise's full chart in Progress → Strength. | `selectedExercise` is an `exKey` and `viewStrength` already falls back to `all[0]` (§Pattern 5); return via `go()`/`setSub()` scroll hook (§Pattern 6) |
| LOG-03 | Each exercise card has a skip button that skips all of that exercise's sets, with one optional reason. The skip is a draft edit and persists with `saveLocal()`. | `skipExercise(i)` modelled on `skipSet` (§Pattern 1); DRAFT-05 mutator table must grow (§Pitfall 1) |
| LOG-04 | A skipped exercise can be un-skipped during the workout, restoring its sets. | `_preSkip` snapshot in the draft entry, stripped at finish (§Pattern 2, §Draft snapshot leak analysis) |
| LOG-05 | A skipped exercise is saved as skipped in the finished session, so it blocks adding weight to it next time (PROG-01). | Per-set `skipped` already blocks `addWeightVerdict` and pauses `stallStreak`; no SCHEMA bump (§Schema and sync impact) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

Treat these with the authority of locked decisions:

- **Single file, no build, no dependencies.** All code goes into `index.html`'s inline `<script>`; no package is installed.
- **`npm run csp:hash` after any change to the inline script** (even whitespace), then `npm test`. A stale hash blanks the app everywhere. `npm test` fails and names the command when the hash is stale. Current state: `node scripts/csp-hash.js --check` printed `CSP hash OK sha256-c21XVzCcRwMep642eFzbjNWAsgtThZ09OcXShNXTUM8=`.
- **Draft rule.** Draft edits persist with `saveLocal()`. Only `pickEx`, `exPick`, `finishWorkout` may `save()`. "A test fails when ... a new draft function calls `save()`."
- **The in-progress workout never leaves the device.** `mergeDB()` deletes `draft`; `snapPayload()`/`exportData()` leave it out; any `DB =` replacement goes through `keepLocalDraft()` (this phase adds none).
- **Deletes are soft; read through `liveSessions()`.**
- **Escaping:** every user string through `esc()`; `esc()` does not escape `'`, so user data only in double-quoted attributes and never in JS source text.
- **Event handlers:** `data-action` + `data-*` (each value through `esc()`); one thin `ACTIONS` wrapper per event; wrappers decode indexes with unary plus, never touch `DB`, never persist; never stop propagation.
- **Schema:** bump `SCHEMA` + `MIGRATIONS` only when needed; migrations idempotent, never downgrade `_schema`. A migration that rewrites rows must `touch()` and persist. (This phase needs none, §Schema and sync impact.)
- **Icons** from the inline `PH` map (Phosphor); **colours** from `:root` custom properties, no hard-coded hex.
- **Before every push:** `npm test` green.
- **After shipping:** dated changelog entry in `C:\Main Vault\50-59 Projects & Events\53. Software Projects\PPL Tracker App.md` (the live vault, never the old one), and update **Current Features** if structural.
- Config: `workflow.human_verify_mode = "end-of-phase"` — phone checks are Ian's end-of-phase UAT, not executor checkpoints. Commands for Ian must be PowerShell-compatible.

## Summary

Phase 10 is entirely in-repo work on one file. No library, no network host and no schema change are involved. The two features are independent: **(A) skip / un-skip a whole exercise** (draft data + finish + display), and **(B) inline history + chart link + return** (screen-only state + router). The existing code already does most of the hard part: a set with `skipped:true` blocks Add weight in `addWeightVerdict` and pauses `stallStreak`, `finishWorkout` already keeps skipped sets and accepts an all-skipped workout, and `exKey`/`liveSessions`/`sessionExercises`/`prSetIndex` already give per-exercise history with PRs. So LOG-05 holds through the per-set flags alone, as D-09 requires.

The risks are not in the logic. They are in the **test pins and conventions** that a change to `viewActive`, `finishWorkout`, `go`/`setSub` and `ACTIONS` will trip: the DRAFT-05 mutator table pins its length at `25`; every card must still open with exactly `<div class="ex-card">` (tests split on it); a tappable Last-time line must be a `<button>` whose source holds no `<div>`; `data-action` values must be literals; the `/Last time \([^)]*\):/` text format and the `class="flag"` marker are pinned; and the harness sandbox has `scrollTo(){}` but no `scrollY`. A careless choice in any of these produces a red suite or, worse, a silent leak of the draft-only snapshot into a synced session.

Two details in CONTEXT need care. First, D-18 says the Markdown export "carries skipped sets and their reasons". It does not carry reasons: `sessionRows` emits `weight:set.w, reps:set.r` only, so a skipped set exports as a row of `—`. "No exporter change" still holds, but the export will not show the skip reason. Second, a deloaded entry that is then fully skipped is ignored by `lastAttemptEntry` (`e.deload` → `continue`), so it would not block Add weight. Both are listed under Open Questions.

**Primary recommendation:** Store the exercise skip as additive entry fields `skipped:true` + `reason` (mirroring the stairs and skipped-day shapes), keep the pre-skip state in a draft-only `_preSkip` stripped in `finishWorkout`, keep `SCHEMA` at 19, render the Last-time line as `<button class="lasttime tap" data-action="toggleExHist">`, and restore scroll by changing the `window.scrollTo(0,0)` in `go()`/`setSub()` to `window.scrollTo(0, landingY())`.

## Architectural Responsibility Map

The app is a single-page PWA; all "tiers" live in the browser. The useful split is by state lifetime.

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Skip / un-skip an exercise mid-workout | Browser: device-local draft (`DB.draft`, `saveLocal()`) | — | Draft rule: never synced, never `save()` |
| Pre-skip snapshot for exact undo (D-13) | Browser: draft entry field `_preSkip` | — | Must survive reload, so it lives in the draft, never in synced data |
| Skip recorded in the finished session (LOG-05) | Synced data: `DB.sessions` row written by `finishWorkout` (`save()`) | Cloud (union merge) | The only sanctioned draft-to-synced copy path |
| Add-weight / stall judgement next time | Derived at render (`addWeightInfo`, `isStalledSlot`) | — | Computed, never stored (Phase 8 D-07), so no migration |
| Inline history rows (LOG-01) | Derived at render from `liveSessions()` | — | Read-only view over synced sessions |
| Which card's history is open; scroll to restore (D-06, D-21) | Browser: module-level screen-only `let` | — | Never in `DB`, never persisted (like `collapsedEx`, `equipAsk`) |
| Strength chart selection (LOG-02) | Browser: existing screen-only `progSub` / `selectedExercise` | — | Already module-level, set by `openChart` today |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| None (vanilla JS in `index.html`) | — | Whole feature | CLAUDE.md: "no build step, no dependencies. Keep it that way" |

### Supporting (already in repo)
| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| Node.js | v24.15.0 (`node --version`) | Runs `test/app.test.js` and `scripts/csp-hash.js` | Every change |
| npm | 11.12.1 (`npm --version`) | `npm test`, `npm run csp:hash`, `npm run csp:check` | Every change |

**Installation:** none.

## Package Legitimacy Audit

No external packages are installed by this phase.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| (none) | — | — | — | — | — | — |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
                 TAP on card (Log tab, viewActive)
                              │
            document listener → dispatchAction → ACTIONS[name].click (thin wrapper, +el.dataset.i)
                              │
     ┌────────────────────────┼─────────────────────────────┬─────────────────────────────┐
     ▼                        ▼                             ▼                             ▼
 skipExercise(i)        unskipExercise(i)            toggleExHist(i)             openExerciseChart(i)
 prompt() → null? stop   restore sets from           openExHist = i | -1          logReturn = {y: scrollY}
 snapshot → _preSkip     _preSkip (fallback:         (screen-only)                selectedExercise = exKey(entry)
 mark unfinished sets    unskip no-reason sets)      render()                     progSub = 'strength'
 entry.skipped/reason    delete marker+_preSkip                                    goSub('train','progress')
 saveLocal(); render()   saveLocal(); render()            │                             │
     │                        │                           ▼                             ▼
     └──────► DB.draft (localStorage only) ◄──────┐   viewActive: panel rows =     viewStrength: chart of
                              │                    │   exerciseRecent(exKey, 5,     selectedExercise (+ "Back
                   Finish & save                   │   editRef) over liveSessions   to workout" when logReturn)
                              ▼                    │                                     │
                    finishWorkout(): copy entries, │                     backToWorkout / Train→Log / Resume
                    keep skipped sets, DELETE       │                                     ▼
                    _preSkip (and _cel), save()     │                   go()/setSub(): render(), then
                              │                     │                   window.scrollTo(0, landingY())
                              ▼                     │                   (restores y once, clears logReturn)
                    DB.sessions row ──► union merge ──► other devices (old builds read per-set flags)
                              │
                              ▼  next workout
          viewActive: lastRealEntry → Last time numbers;  lastAttemptEntry → addWeightVerdict
          (skipped set ⇒ blocked ⇒ no ⬆ flag);  D-17 note from lastAttemptEntry(...).entry.skipped
```

### Recommended edit map (by symbol)

| Symbol (index.html) | Change |
|---|---|
| `viewActive()` | (1) skipped-card branch first (D-11); (2) skip button in `.ex-head` next to the caret, hidden when nothing is left to skip (D-12); (3) `.lasttime` becomes a `tap` button when `ref \|\| alt` (D-07); (4) inline panel after it when `openExHist===i`; (5) D-17 muted note |
| new `skipExercise(i)`, `unskipExercise(i)` | Draft functions, `saveLocal()` only |
| new `exerciseRecent(key, n, skipId)` | Pure; rows for D-01..D-05 |
| new `skipSummaryHTML(e)` (or similar) | One shared, escaped text for D-11 / D-15 / inline rows |
| new `toggleExHist(i)`, `openExerciseChart(i)`, `backToWorkout()`, `landingY()` | Screen-only; no `save`/`saveLocal` |
| new `let openExHist = -1, logReturn = null;` | Next to `let collapsedEx` (HISTORY section) |
| `finishWorkout()` | `delete out._preSkip`; reset `openExHist`/`logReturn` beside `collapsedEx.clear()` |
| `startWorkout`, `startBackdate`, `discardWorkout`, `editSession` | Reset `openExHist`/`logReturn` beside each `collapsedEx.clear()` |
| `editSession()` | Carry `skipped`/`reason` through when rebuilding entries (recommended; §Pitfall 9) |
| `viewHistory()` | D-15 line for an entry with `skipped===true` |
| `viewStrength()` | "Back to workout" control when `logReturn && DB.draft` |
| `go()`, `setSub()` | `window.scrollTo(0,0)` → `window.scrollTo(0, landingY())` |
| `ACTIONS` | `skipExercise`, `unskipExercise`, `toggleExHist`, `openExChart`, `backToWorkout` |

Reset sites are the existing idiom, found by grep — `grep -n "collapsedEx.clear" index.html`:
```
2040:    collapsedEx.clear();                      (startWorkout, new draft)
2074:  collapsedEx.clear();                        (startBackdate)
2423:  DB.draft = null; collapsedEx.clear(); save(); snapshotNow('after-workout'); cloudVersion('workout');   (finishWorkout)
2429:function discardWorkout(){ ... DB.draft=null; collapsedEx.clear(); saveLocal(); goSub('train','log'); } }
2609:  collapsedEx.clear();                        (editSession)
```
(The function names in parentheses were read from the surrounding source, `index.html:2035-2083`, `2375-2429`, `2604-2627`.)

### Pattern 1: Skip a whole exercise — modelled on `skipSet`

**What:** prompt for a reason; Cancel aborts; snapshot; mark only the unfinished sets; set the exercise-level marker; `saveLocal(); render();`.

Existing source this mirrors `[VERIFIED: index.html:2295-2301]`:
```js
function skipSet(i,k){
  const reason = prompt(`Why skipping set ${k+1}? (optional)`, '');
  if(reason===null) return;
  const st = DB.draft.entries[i].sets[k]; st.skipped=true; st.reason=reason.trim(); st.w=''; st.r='';
  saveLocal(); render();
}
function unskipSet(i,k){ const ss=DB.draft.entries[i].sets, st=ss[k]; st.skipped=false; st.reason=''; if(st.w==='') st.w=nearWeight(ss, k); saveLocal(); render(); }
```

Proposed (names are recommendations; every existing identifier used appears in a quoted excerpt in this file):
```js
/* Nothing left to skip = no set that is neither done (reps) nor already skipped (D-12). */
function exUnfinished(e){ return (e && Array.isArray(e.sets) ? e.sets : []).filter(st=> st && !st.skipped && st.r===''); }
function skipExercise(i){
  const e = DB.draft.entries[i];
  if(!e || e.skipped===true || !exUnfinished(e).length) return;
  const reason = prompt(`Why skipping ${e.name}? (optional)`, '');
  if(reason===null) return;                                   // D-10: Cancel aborts, nothing stored
  e._preSkip = { sets: JSON.parse(JSON.stringify(e.sets)), deload: !!e.deload };   // D-13, draft-only
  e.sets.forEach(st=>{ if(st && !st.skipped && st.r===''){ st.skipped=true; st.reason=''; st.w=''; st.r=''; } });  // D-08
  e.skipped = true; e.reason = String(reason).trim();         // D-09 additive display marker
  saveLocal(); render();
}
function unskipExercise(i){
  const e = DB.draft.entries[i]; if(!e) return;
  const snap = e._preSkip;
  if(snap && Array.isArray(snap.sets)){ e.sets = snap.sets; e.deload = !!snap.deload; }
  else e.sets.forEach((st,k)=>{ if(st && st.skipped && !st.reason){ st.skipped=false; if(st.w==='') st.w=nearWeight(e.sets,k); } }); // no snapshot (edited past workout)
  delete e._preSkip; delete e.skipped; delete e.reason;
  saveLocal(); render();
}
```
Per-set `reason` stays `''` on sets the exercise skip marks; the exercise reason lives once on the entry. That keeps individually skipped sets' own reasons distinguishable for the no-snapshot fallback.

### Pattern 2: Strip the draft-only snapshot at finish

Existing copy idiom `[VERIFIED: index.html:2388-2393]`:
```js
  const entries = d.entries.map(e=>{
    const blank = e.sets.filter(s=> !s.skipped && s.r==='').length;
    const out = Object.assign({}, e, { sets: e.sets.filter(s=> s.skipped || s.r!=='').map(s=>{ const c=Object.assign({}, s); delete c._cel; return c; }) });
    if(blank>0) out.blankSets = blank; else delete out.blankSets;
    return out;
  });
```
Add `delete out._preSkip;` inside this map, and drop a marker that is not exactly `true` (`if(out.skipped!==true){ delete out.skipped; delete out.reason; }`) so a hand-made draft cannot plant a truthy string. `Object.assign({}, e, …)` copies `skipped` and `reason` into the session, which is what LOG-05/D-15 want.

### Pattern 3: Inline history rows (D-01..D-05)

Existing helpers `[VERIFIED: index.html:1436-1440, 2712-2724]`:
```js
function sessionExercises(s){
  const list = (s.entries||[]).slice();
  if(s.extras) Object.keys(s.extras).forEach(w=>{ const e=s.extras[w]; if(e && e.name && Array.isArray(e.sets) && e.sets.length) list.push(e); });
  return list;
}
function exerciseHistory(key){
  const out=[];
  const ls=liveSessions();
  for(let i=ls.length-1;i>=0;i--){ const s=ls[i]; if(s.skipped) continue;
    sessionExercises(s).forEach(e=>{
      if(exKey(e)!==key) return;
      const worked=e.sets.filter(x=>!x.skipped && x.r!==''); if(!worked.length) return;
```
`exerciseHistory` drops entries with no worked set (so it would hide a fully skipped attempt, against D-03), carries no workout label (D-01), and is pinned by tests at `test/app.test.js:1779` and `:1799-1800` (`.length === 2`, `.length === 3`). **Do not change it.** Add a new pure helper:

```js
/* The last n times this exercise was on a card, any workout or slot, newest first (D-01..D-05).
   An entry counts when it holds sets or recorded blank sets — the lastAttemptEntry rule. */
function exerciseRecent(key, n, skipId){
  const out = [], ls = liveSessions();
  for(let i=ls.length-1; i>=0 && out.length<n; i--){
    const s = ls[i];
    if(s.skipped || (skipId && s.id===skipId)) continue;          // D-04, D-05
    sessionExercises(s).forEach(e=>{
      if(out.length>=n || !e || exKey(e)!==key) return;
      if(!((Array.isArray(e.sets) && e.sets.length) || +e.blankSets > 0)) return;
      out.push({ s, e });
    });
  }
  return out;
}
```
Call it as `exerciseRecent(exKey(entry), 5, DB.draft.editRef)`. Row markers: `e.deload` → ↓; any `x.skipped` or `e.skipped===true` → skip text with reason (shared helper); PR → `prSetIndex().isPR(s, e, k)` on the done set's original index `k`, exactly as `viewHistory` does `[VERIFIED: index.html:2564]`. Compute `prSetIndex()` once per `viewActive` render and only when a panel is open. `s.workout` is user-visible text that contains `&` for specialized days (`'SPECIALIZED — CHEST & TRICEPS'`, from the `PROGRAM` keys listed by the harness), so it goes through `esc()`.

The rule that an entry counts when it holds sets or blank sets is the existing one `[VERIFIED: index.html:1287-1296]`:
```js
    if(!e || exKey(e)!==key || e.deload) continue;
    if((Array.isArray(e.sets) && e.sets.length) || +e.blankSets > 0) return {entry:e, date:s.date};
```
(`exerciseRecent` deliberately does **not** skip `e.deload`; D-03 wants deloads shown.)

### Pattern 4: Screen-only open state (D-06), the `collapsedEx` precedent

`[VERIFIED: index.html:2432-2438]`:
```js
let openHist = -1, showBackdate = false, reviewWeekOffset = 0;
let collapsedEx = new Set(); // slot indices collapsed to a summary in the active workout (ephemeral UI)
...
function toggleExCollapse(i){ if(collapsedEx.has(i)) collapsedEx.delete(i); else collapsedEx.add(i); render(); }
```
Proposed: `let openExHist = -1;` and `function toggleExHist(i){ openExHist = openExHist===i ? -1 : i; render(); }`. A single number gives "only one panel open" for free. No `save`/`saveLocal`.

### Pattern 5: Opening Strength on the exercise (D-19)

Existing `[VERIFIED: index.html:2631-2633, 2725-2730, 5347]`:
```js
let chartRange = 30, progSub='body', selectedExercise=null;
function progSubTab(t){ progSub=t; render(); }
function selectExercise(m){ selectedExercise=m; render(); }
...
function viewStrength(sub){
  const loadEx = exercisesWithData(), bwEx = bwExercisesWithData(), all = loadEx.concat(bwEx);
  if(!all.length) return `<h1>Progress</h1><p class="subtitle">Strength over time</p>${sub}<div class="empty">Log a few workouts and your per-exercise trend shows up here.</div>`;
  if(!selectedExercise || !all.includes(selectedExercise)) selectedExercise=all[0];
  const isReps = bwEx.includes(selectedExercise);
...
  openChart:        { click: el => { progSub = el.dataset.prog; goSub('train', 'progress'); } },
```
`selectedExercise` is the `exKey` for both the loaded and the "(reps)" series (both `<option value="${esc(m)}">`, `index.html:2736-2737`), and `isReps` is derived from membership. So D-19 is just `selectedExercise = exKey(entry)`: the bodyweight case and the "no chartable data → default" case are already handled by `viewStrength`. Put the logic in a function (`openExerciseChart(i)`), not in the wrapper, because the wrapper may not read `DB` (F2 test, §Pitfall 6).

### Pattern 6: Returning to the workout (D-20, D-21)

How navigation works today `[VERIFIED: index.html:1721-1725]`:
```js
function go(id){ if(!tabDef(id)) return; TAB=id; syncTabBar(); render(); window.scrollTo(0,0); }
function goSub(id, sub){ const t=tabDef(id); if(!t) return; if(t.sub && sub) subState[id]=sub; go(id); }
function setSub(sub){ const t=tabDef(TAB); if(t && t.sub) subState[TAB]=sub; render(); window.scrollTo(0,0); }
```
- **Every arrival at the Log tab scrolls to the top today.** `go()` and `setSub()` both end in `window.scrollTo(0,0)`. Restoration must therefore happen *after* that call, i.e. inside `go`/`setSub` themselves. A `TABS[].onRender` hook runs inside `render()`, before the reset, and would be overwritten.
- **Paths into the Log tab** (grep `goSub('train', *'log')\|data-sub="log"`): the Today "Resume" button (`data-action="goSub" data-tab="train" data-sub="log"`, line 1809), the section switcher (`setSub`), the tab bar (`go('train')` when `subState.train==='log'`), plus `startWorkout`, `startBackdate`, `discardWorkout`, `editSession`. After following the chart link, `subState.train` is `'progress'`, so the tab bar's Train lands on Progress, and Train → Log is the `setSub('log')` path.
- **Screen-only state that already survives a tab switch:** `collapsedEx` (module `Set`), `equipAsk` (module `Set`), `progSub`, `selectedExercise`. None is reset by `go`/`setSub`. `openExHist` will behave the same, which satisfies "keeps that card's history panel open" with no extra code.

Proposed:
```js
let logReturn = null;   // { y } — where the Log tab was when the chart link was followed (D-21). Screen-only.
function landingY(){
  if(!logReturn || TAB!=='train' || subState.train!=='log') return 0;
  const y = DB.draft ? (+logReturn.y || 0) : 0; logReturn = null; return y;
}
// go():     ... render(); window.scrollTo(0, landingY()); }
// setSub(): ... render(); window.scrollTo(0, landingY()); }
function openExerciseChart(i){
  const e = DB.draft && DB.draft.entries[i]; if(!e) return;
  logReturn = { y: window.scrollY || 0 };                        // never bare scrollY (§Pitfall 8)
  selectedExercise = exKey(e); progSub = 'strength';
  goSub('train', 'progress');
}
function backToWorkout(){ goSub('train', 'log'); }
```
`[ASSUMED]` Calling `window.scrollTo` synchronously right after `el.innerHTML = …` scrolls to the restored position because the browser lays out on demand; this needs Ian's phone check (it is in the UAT list).

### Anti-Patterns to Avoid
- **Changing `exerciseHistory`, `lastRealEntry` or `lastAttemptEntry`.** Each is pinned by tests or by Phase 8 decisions. Add `exerciseRecent`; read `lastAttemptEntry` for D-17.
- **Building an action name at runtime** (`data-action="${skipped?'unskipExercise':'skipExercise'}"`). DELEG-04 fails. Two literal templates.
- **Reason text in an attribute** (`title="${esc(reason)}"`) or in JS source. Text nodes only, inside `<em>`, as the existing skip notes do.
- **`save()` anywhere in the new draft or screen functions.** DRAFT-05 fails by name.
- **A new SCHEMA/migration "to be safe".** It pauses sync on every older device until it updates (`remoteTooNew`), it is one-way, and Phase 11 already owns the next number.
- **Reusing `class="flag"` for any marker** (history PR marker, D-17 note). PROG tests treat that class as "⬆ Add weight is showing".

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Per-exercise identity across renames/merges | Name comparison | `exKey(e)` | Follows `exId`, aliases and `mergedInto` (PROG-04) |
| PR markers per set | New PR scan | `prSetIndex().isPR(s, e, k)` | Same gate as `exercisePRs`; "these two must never disagree" (`index.html:1613`) |
| Weight restored on an un-skipped row with no snapshot | New fill rule | `nearWeight(sets, k)` | Existing rule for restored rows (`index.html:2283-2292`) |
| Live-only session reads | `DB.sessions.filter(...)` | `liveSessions()` | Soft-delete rule; a missed filter ghosts rows |
| Main + accessory entries of a session | Concatenating by hand | `sessionExercises(s)` | Already filters empty extras |
| Formatting | New formatters | `fmtSet`, `fmtDate`, `esc`, `ph` | `fmtDate('2026-10-13')` returns `Oct 13` (run through the harness this session) |
| Add-weight blocking for a skipped exercise | New exercise-level check | existing per-set check in `addWeightVerdict` | D-09: old builds must work from per-set flags |

**Key insight:** every rule this phase needs already exists at the set level. The exercise-level marker is display-only; nothing that judges progress may start depending on it.

## Schema and sync impact (D-09 is one-way)

**Decision: no `SCHEMA` bump, no migration.** The exercise skip adds `skipped` (boolean `true`) and `reason` (string) to a session entry. They are written only on newly finished sessions. No existing row is rewritten, so the "a migration that rewrites rows must `touch()` and persist" rule never applies.

Evidence, per consumer:

| Consumer | Behaviour with an unknown additive entry field | Source |
|---|---|---|
| `SCHEMA` | Stays `19`; tests pin `_schema === 19` (`test/app.test.js:8289`, `:8402`) | `[VERIFIED: index.html:485]` `const SCHEMA = 19;` |
| `mergeDB` → `mergeUnion` | A session row is taken whole from the side with the newer `mtime`; fields inside an entry are never merged or inspected | `[VERIFIED: index.html:4360-4371]` `if(newT>curT \|\| (newT===curT && fromNewerSide)) out[prev]=it;` |
| `remoteTooNew` on an older build | Only `_schema` is compared, so an unchanged schema never pauses sync | `[VERIFIED: index.html:4890]` `function remoteTooNew(remoteDB){ return (+(remoteDB && remoteDB._schema) \|\| 0) > SCHEMA; }` |
| `validateBackup` | Checks an entry is an object and `sets` is an array or absent; other fields are not inspected | `[VERIFIED: index.html:3984-3987]` `if(!e \|\| typeof e!=='object') return ...; if(e.sets!=null && !Array.isArray(e.sets)) return ...` |
| `buildMarkdownExport` / `sessionRows` | Emits one row per set with `weight:set.w, reps:set.r`; entry-level fields are ignored, so `skipped`/`reason` never appear. A skipped set's `''` weight and reps print as `—` | `[VERIFIED: index.html:4401, 4443-4446]` `rows.push({ date:s.date, workout:s.workout, exercise:item.name, set:i+1, weight:set.w, reps:set.r });` and `return esc==='' ? '—' : esc;` |
| `exportData` (JSON) / `snapPayload` | Whole session serialized, so the marker is kept in backups; the draft is removed | `[VERIFIED: index.html:889, 3817]` `delete c.draft;` / `stripDraft(Object.assign({},DB))` |
| Older build's Add weight | `addWeightVerdict` blocks on any `x.skipped`; `stallStreak` pauses on any `x.skipped` | `[VERIFIED: index.html:1302, 1412]` `const blocked = sets.some(x=> x && x.skipped) \|\| (+entry.blankSets > 0) \|\| !worked.length;` |
| Older build's Workout history | Shows `<em>skip</em>` per skipped set, as today | `[VERIFIED: index.html:2564]` |
| Any existing reader of an entry-level `.skipped` | None. Every `.skipped` receiver is a session, a set, or stairs (grep below) | — |
| `test/fixtures/merge-golden.json` | Not stale: it hashes `mergeDB` outputs of in-test fixtures, and neither `mergeDB` nor `SCHEMA` changes | grep `merge-golden` → `test/app.test.js:47`, `:1222` |

Receiver check — `grep -o "[A-Za-z_\$][A-Za-z0-9_\$.]*\.skipped" index.html | sort | uniq -c | sort -rn`:
```
     33 s.skipped
     24 x.skipped
      8 st.skipped
      4 s.stairs.skipped
      2 DB.draft.stairs.skipped
      1 z.skipped
      1 set.skipped
      1 d.stairs.skipped
```
Every `s.skipped` line was listed (`grep -n "[^A-Za-z_.]s\.skipped" index.html`) and each `s` is a session or, inside `.sets.some(s=>…)`/`.sets.filter(s=>…)`, a set. Every `x`/`st`/`z`/`set` receiver was listed and each is a set or `stairs`. So an entry-level `skipped` key is read by nothing existing, and an older build ignores it.

Field-name choice: `skipped` + `reason` mirrors the two existing skip shapes `[VERIFIED: index.html:2056, 2068]`: `stairs: { level:'', seconds:'', skipped:false, reason:'' },` in `startWorkout`, and `skipped:true, reason:reason.trim(), entries:[]` on the row `skipDay` pushes. Readers must test `e.skipped === true`, never truthiness, because `validateBackup` does not check types and a hand-edited backup can put anything there (CLAUDE.md, Escaping).

## Draft snapshot leak analysis (D-13)

Every path that copies draft entries into synced or exported data, by grepping the copy idioms — `grep -n "Object.assign({}, *e\b\|Object.assign({},e\b\|\.entries\.map\|draft\.entries" index.html`. The only line that **copies** a draft entry into new data is:
```
2390:    const out = Object.assign({}, e, { sets: e.sets.filter(s=> s.skipped || s.r!=='').map(s=>{ const c=Object.assign({}, s); delete c._cel; return c; }) });
```
(finishWorkout). The other hits read or mutate the draft in place: migration stamping (lines 707, 739), the card readers `restTargetForSlot`, `updPlates`, `targetSet`, `repHint`, `setStatus` (963, 1209, 1332, 1336, 1351-1352), `deloadExercise`/`undeloadExercise` (1426, 1432), `exMerge` restamp (1529), `viewActive` (2088), `pickEx` and the set editors (2259-2311), and `toggleWarm` (2373).

Whole-draft paths all remove the draft before anything leaves the device — `grep -n "snapPayload(\|stripDraft(\|delete [a-z]*\.draft" index.html`:
```
889:function snapPayload(d){ const c=Object.assign({},d); delete c.wx; delete c.draft; return c; }
3817:  const blob = new Blob([JSON.stringify(stripDraft(Object.assign({},DB)),null,2)],{type:'application/json'}); // the draft is device-local (D-06)
4732:    delete win.draft;
4750:  delete out.draft;
```
(`pushNow` deep-copies `DB` including the draft, line 4953, but its blob is `mergeDB(...)`, which deletes `draft` at line 4750.) `JSON.parse(JSON.stringify` appears only at line 2624 (`editSession`, synced → draft) and line 4953 (`pushNow`).

**Conclusion:** `finishWorkout`'s entry map is the one strip site for `_preSkip`. Add a property test that a finished entry has no key starting with `_` (covers `_cel` and `_preSkip` and any future draft-only field), rather than a test that names `_preSkip` only.

## Runtime State Inventory

Not a rename/refactor/migration phase. Omitted.

## Common Pitfalls

### Pitfall 1: The DRAFT-05 mutator table pins its own length
**What goes wrong:** adding `skipExercise`/`unskipExercise` rows makes `DRAFT_ONLY_MUTATORS.length` 27, and the check fails.
**Pin** `[VERIFIED: test/app.test.js:3799-3800]`:
```js
  ok('DRAFT-05: every draft-only edit is stored on this device with no updatedAt bump and no push',
     failing.length === 0 && DRAFT_ONLY_MUTATORS.length === 25, failing);
```
**How to avoid:** add both rows (the harness `prompt` returns `''`, so `skipExercise` skips with no reason) and change `25` to the new length in the same commit. `unskipExercise`'s setup must leave the entry skipped first.
**Related tripwire** `[VERIFIED: test/app.test.js:3737, 3805-3812]`: `const DRAFT_PUSHERS = ['exPick', 'finishWorkout', 'pickEx'];` and the scan of every sandbox function whose comment-stripped source matches `/\bDB\.draft\b/` and `/(?<![\w.$])save\(\)/`. `openExerciseChart` and `landingY` read `DB.draft`, so neither may call `save()`.
**DB-replacement tripwire** `[VERIFIED: test/app.test.js:3057-3077]`: any new `DB =` line fails unless it calls `keepLocalDraft(`. This phase needs none.

### Pitfall 2: Every exercise card must open with exactly `<div class="ex-card">`
**What goes wrong:** tests find slot `i` with `viewActive().split('<div class="ex-card">')[i + 1]` (grep `ex-card` in `test/app.test.js` → lines 7747, 8264, 8994, 9092, 9094, 9169, 9210, 9241, 9364). A skipped-card branch opening `<div class="ex-card skipped">`, or a history panel containing that exact string, shifts every later slot.
**How to avoid:** the skipped branch starts with the same `<div class="ex-card"><div class="ex-accent ${barClass(g)}"></div>` the collapsed branch uses (`index.html:2092`). The panel never contains `class="ex-card"`.

### Pitfall 3: Pinned "Last time" text and the `flag` class
**Pins:** `r.exact = /Last time \([^)]*\):/.test(html);` and `r.elsewhere = /Last time \([^)]*· LEGS 1\):/.test(html);` (`test/app.test.js:7607-7608`); `flagOf = card => /<span class="flag">([\s\S]*?)<\/span>/` and many `!card.includes('class="flag"')` checks (`:7749`, `:7788`, `:7809`, `:7825`, `:7860`, `:7866`, `:7913`, `:7930`, `:8178`); `card.includes(lastTop)` for the joined `fmtSet` text (`:7856-7866`); `→ suggest <strong>` (`:9170`, `:9351`).
**How to avoid:** keep `lastLine`'s text exactly as built at `index.html:2105-2122`; put the D-17 note after it as a separate `<span class="muted">`; never use class `flag` for a new marker.

### Pitfall 4: A tappable Last-time line must be a `<button>`, with no `<div>` in its source
**Pins:** DELEG-06 — every rendered control with a click action must be a `button` (`test/app.test.js:5567-5583`); D-11 — inside any `<button class="… tap …">` up to its `</button>`, the **raw source** may hold no `<div` (`:5587-5625`).
**How to avoid:** `<button class="lasttime tap" data-action="toggleExHist" data-i="${esc(i)}" aria-expanded="…">${lastLine}${skipNote}</button>`. `lastLine` contains only `<span>`/`<strong>`. Keep `noteHint` (`<div class="last-note">`) and the panel outside the button. The `:where(button.tap)` reset has zero specificity (`index.html:62`), so `.lasttime`'s background and padding (`index.html:90`) still apply. Render a plain `<div class="lasttime">` for the D-07 "No previous data" case.

### Pitfall 5: `data-action` must be a literal, and numeric `data-*` must be decoded
**Pins:** DELEG-04 — `data-action` values must be a quoted literal without `${`, naming an own `ACTIONS` key (`test/app.test.js:5017-5027`); numeric keys `const NUMERIC_DATA = ['i','k','idx','n','d','range'];` must be read with unary plus or `Number()` (`:5062`, `:5379-5403`); every interpolated `data-*` value starts with `esc(` (`:5458-5483`); each `ACTIONS` entry keyed only by the five delegated events (`:5349-5356`).
**How to avoid:** `toggleExHist: { click: el => toggleExHist(+el.dataset.i) }` and so on; `data-i="${esc(i)}"`; separate literal templates for skip and undo.

### Pitfall 6: Wrappers may not read `DB` or persist
**Pin** `[VERIFIED: test/app.test.js:5363-5367]`: `ok('F2: action wrappers never read DB and never persist', ...)`, scanning each wrapper for `/\bDB\b/` and `/\bsave(Local)?\(/`.
**How to avoid:** `openExChart: { click: el => openExerciseChart(+el.dataset.i) }`. Compute `exKey(DB.draft.entries[i])` inside the function. `openChart` may set `progSub` in the wrapper because `progSub` is not `DB`; the new action should still call a function.

### Pitfall 7: The active-workout control table and the "collapse header" locator
**Pins:** `f2At('toggleExCollapse', 0)` plus "class has no `tap`" picks the header caret (`test/app.test.js:7284-7285`, `:7343`); the exact-argument table `want` (`:7365-7397`) and `f2LogSpied` (`:7304-7307`).
**How to avoid:** the new header button uses `data-action="skipExercise"` (class `skip-set`, like the caret), never `toggleExCollapse`. Optionally extend `f2LogSpied`/`want` with the new controls so the exact-argument rule covers them.

### Pitfall 8: The harness has `scrollTo` but no `scrollY`
**What goes wrong:** the sandbox defines `addEventListener(){}, removeEventListener(){}, scrollTo(){},` and `sandbox.window = sandbox;` but no `scrollY`/`pageYOffset` `[VERIFIED: test/harness.js:106-108]`. A bare `scrollY` read throws a ReferenceError in every test that follows the link; `window.scrollY` reads `undefined`.
**How to avoid:** `window.scrollY || 0` in code. In tests, set `a.__sandbox.scrollY = 640` and replace `a.__sandbox.scrollTo` with a recorder; `go()` calls `window.scrollTo`, which resolves to the sandbox at call time. `requestAnimationFrame` is stubbed to never run (`harness.js:98`), so do not defer the restore into rAF.

### Pitfall 9: `editSession` drops entry-level fields
**What goes wrong:** re-opening a finished session rebuilds each draft entry from `name`, `note`, `deload` and `sets` only `[VERIFIED: index.html:2619-2622]`:
```js
      const kept = (Array.isArray(e.sets)?e.sets:[]).map(x=>({w:x.w,r:x.r,skipped:!!x.skipped,reason:x.reason||''}));
      const bw = nearWeight(kept, kept.length);
      return { name:e.name, note:e.note||'', deload:!!e.deload,
               sets:kept.concat(Array.from({length:k}, ()=>({w:bw,r:'',skipped:false,reason:''}))) }; }),
```
so an edited and re-saved session loses `skipped`/`reason` (the per-set flags survive, so LOG-05 still holds; only the D-15 text degrades). An older build editing the session on another device does the same; that cannot be prevented.
**How to avoid:** carry `skipped:true` and `reason` through when `e.skipped === true`. There is no `_preSkip` in that case, so `unskipExercise` needs the no-snapshot fallback in Pattern 1. Add `editSession` to the DRAFT-05 row expectations if its shape changes (the existing row at `test/app.test.js:3773-3775` only checks `editRef`).

### Pitfall 10: A deloaded, fully skipped entry does not block Add weight
**What goes wrong:** `lastAttemptEntry` skips deload entries (`if(!e || exKey(e)!==key || e.deload) continue;`, `index.html:1293`). If Ian taps Deload and then skips the whole exercise, the finished entry is `deload:true` with only skipped sets, so the add-weight verdict falls back to the attempt before, which can be all-top. That contradicts LOG-05's "blocks adding weight next time".
**How to avoid:** see Open Question 1. Recommended: when the skip leaves no done set, `skipExercise` clears `deload` (the snapshot keeps it for Undo).

### Pitfall 11: First-occurrence locators in tests
`test/app.test.js:1905-1913` locate `'const SCHEMA'`, `'const COLLECTIONS'`, `'const MIGRATIONS'`, `'let DB = load()'` and `'const COLLECTIONS = {'` by `indexOf` in the script source; `:4896` locates `'<body>'` and `'<script>'` in the raw file. A new comment containing any of those strings placed above the real occurrence moves the locator. New code goes in the WORKOUT / HISTORY / WEIGHT sections, far below, but no comment should quote them.

### Pitfall 12: Index-keyed screen state outliving its workout
`openExHist` is a slot index, like `collapsedEx`. If it is not reset where `collapsedEx.clear()` runs, the next workout opens a panel on a card Ian never tapped, and a stale `logReturn` scrolls a fresh workout. Reset both at the five grep sites listed under the edit map.

### Pitfall 13: CSP hash
Any byte change to the inline script needs `npm run csp:hash` before `npm test`. `npm test` fails and names the command when stale. CSS changes in `<style>` do not affect the hash (`style-src 'unsafe-inline'`, CLAUDE.md).

## Code Examples

### Skipped card (D-11) — same opener as the collapsed branch
```js
// Existing collapsed branch to mirror [VERIFIED: index.html:2089-2096]:
//   if(collapsedEx.has(i)){ const done = entry.sets.filter(x=>!x.skipped && x.r!=='');
//     return `<div class="ex-card"><div class="ex-accent ${barClass(g)}"></div> ...
// Existing stair skip note to mirror [VERIFIED: index.html:2189-2192]:
//   <div class="skip-note" style="margin:0"><span>${ph('skip-forward','lead')}Stair stepper skipped${st.reason?': <em>'+esc(st.reason)+'</em>':''}</span><button data-action="unskipStairs">Undo</button></div>
if(entry.skipped === true){
  return `<div class="ex-card"><div class="ex-accent ${barClass(g)}"></div><div class="ex-body">
    <div class="skip-note" style="margin:0"><span>${ph('skip-forward','lead')}${skipSummaryHTML(entry)}</span><button data-action="unskipExercise" data-i="${esc(i)}">Undo</button></div>
  </div></div>`;
}
```
`skipSummaryHTML(e)` (proposed) returns, fully escaped: `<strong>Name</strong> · 120×10, 120×9 · rest skipped: <em>reason</em>` or `<strong>Name</strong> skipped: <em>reason</em>`, built from `e.sets.filter(x=>!x.skipped && x.r!=='')` and `fmtSet`. Reuse it in `viewHistory` (D-15) and the inline rows so the three surfaces cannot drift.

### Header skip button (D-12) next to the caret
```js
// Existing caret [VERIFIED: index.html:2157]:
//   <button class="skip-set" data-action="toggleExCollapse" data-i="${esc(i)}" title="collapse" style="font-size:16px;vertical-align:middle">${ph('caret-up')}</button>
${exUnfinished(entry).length ? `<button class="skip-set" data-action="skipExercise" data-i="${esc(i)}" title="skip this exercise" aria-label="Skip this exercise" style="font-size:16px;vertical-align:middle">${ph('skip-forward')}</button>` : ''}
```

### D-17 note
```js
const att = lastAttemptEntry(name, i, entry.name);
const skipNote = (att && att.entry && att.entry.skipped === true)
  ? ` <span class="muted">· skipped ${fmtDate(att.date)}${att.entry.reason ? ': ' + esc(att.entry.reason) : ''}</span>` : '';
```

### ACTIONS entries (thin wrappers)
```js
  skipExercise:   { click: el => skipExercise(+el.dataset.i) },
  unskipExercise: { click: el => unskipExercise(+el.dataset.i) },
  toggleExHist:   { click: el => toggleExHist(+el.dataset.i) },
  openExChart:    { click: el => openExerciseChart(+el.dataset.i) },
  backToWorkout:  { click: () => backToWorkout() },
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Exercise skip only by skipping each set | `skipExercise` + entry marker | This phase | Per-set flags stay the source of truth (D-09) |
| Undo re-fills with `nearWeight` (`unskipSet`) | Snapshot restore (`_preSkip`) | This phase | Exact undo, survives reload |
| Every arrival at a tab scrolls to top | One-shot restore after the chart link | This phase | Only `go`/`setSub` change |

**Deprecated/outdated:** none.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `window.scrollTo(0, y)` called synchronously after `innerHTML` lands on `y` in Android Chrome PWA (layout is forced on demand) | Pattern 6 | Return lands at the top; fallback is one `setTimeout(…, 0)`, which the harness's real `setTimeout` would run after the test reads; Ian's UAT catches it |
| A2 | `window.scrollY` is the right read on the phone (standard `pageYOffset` alias) | Pattern 6 | Restore always 0; UAT catches it |
| A3 | Ian wants the skip button and inline history on **main slot cards only**, not on the accessory "extras" cards (abs, forearms, dead hang). Extras cards have no Last-time line, no per-set skip and no Add weight (`extraCard`, `index.html:3196-3223`, read via `sed`) | Edit map | Low: if he wants them, it is a follow-up |
| A4 | Five rows means five **entries**; in the rare session holding the exercise twice (a slot and an extras card) both rows count | Pattern 3 | Cosmetic |

## Open Questions (RESOLVED)

1. **Deload, then skip the whole exercise (Pitfall 10).** RESOLVED: D-22 (10-CONTEXT.md)
   - What we know: `lastAttemptEntry` ignores `deload` entries, so a deloaded, fully skipped entry does not block Add weight; the attempt before it is judged.
   - What's unclear: whether Ian sees "deload then skip" as a real case.
   - Recommendation: `skipExercise` sets `deload=false` when no set is done (snapshot restores it on Undo). If some sets were done at the deload weight, keep `deload` (those numbers must not become the baseline). Confirm with Ian or the planner records it as a decision.

2. **D-18 wording vs the actual export.** RESOLVED: D-23 (10-CONTEXT.md)
   - What we know: the Markdown export never carried set reasons; a skipped set exports as `— | —`. The JSON backup carries everything.
   - Recommendation: no exporter change (CLAUDE.md step 6, and EXP-02 forbids exporter functions naming collections). Note it in the SUMMARY so Ian is not surprised.

3. **History that holds only skipped or deloaded attempts (D-07 edge).** RESOLVED: D-24 (10-CONTEXT.md)
   - What we know: `lastRealEntry` and `lastAnywhere` both ignore no-worked and deload entries, so the line reads "No previous data" even when `exerciseRecent` has rows.
   - Recommendation: follow D-07 literally (`ref || alt` gates tappability), but still show the D-17 note when the last attempt in the slot was skipped. Low impact.

4. **Re-editing a session with a skipped exercise (Pitfall 9).** RESOLVED: D-25 (10-CONTEXT.md)
   - Recommendation: carry the marker through `editSession`; Undo there uses the no-snapshot fallback (un-skip sets with no reason of their own, refill weights with `nearWeight`).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | `npm test`, `csp:hash` | ✓ | v24.15.0 | — |
| npm | scripts | ✓ | 11.12.1 | — |
| git | commits, `.gitattributes` LF check in suite | ✓ | 2.56.0.windows.2 (`git check-attr eol index.html` → `eol: lf`) | — |
| Ian's Android phone | End-of-phase UAT | Ian only | — | None (by design) |

**Missing dependencies with no fallback:** none for automated work.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Plain Node script with `ok(name, cond, extra)`; app loaded into `vm` by `test/harness.js` `loadApp()` |
| Config file | none (`package.json` `"test": "node test/app.test.js"`) |
| Quick run command | `npm test` (about 10 s; baseline run this session: `1136 passed, 0 failed, 2 skipped`) |
| Filter for Ian (PowerShell) | `npm test 2>&1 \| Select-String "FAIL\|LOG-"` |
| Full suite command | `npm run csp:hash; npm test` |

Harness facts for the new tests (read this session): `prompt: () => ''` and `confirm: () => true` are overridable as `a.__sandbox.prompt = …` (`harness.js:101`); function declarations are reachable on `a.__sandbox`; `let` variables are **not** exported (only names in the `names` list, plus getters such as `get TAB()`), so assert screen-only state through rendered HTML (`f2AppHtml(a)`), or add getters for `openExHist`/`logReturn` to the harness. Existing helpers to reuse: `f2Mid(seed)` (PUSH 1 draft on Train → Log, `updatedAt 1000`), `f2Find`/`f2At`, `fireListener`, `fakeEl`, `spyPushes`, `spyOn`, `canon`, `populatedDB`, `fullDraft`, and the PROG block's `latSess`/`latRun`/`latCard`/`flagOf`/`todayRow` (`test/app.test.js:7731-7751`).

New section header, after the EQUIP UI block: `console.log('\n── LOG: history and skip on the workout card (LOG-01..05) ──');`.

### Phase Requirements → Test Map
| Req / Decision | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LOG-01, D-06 | Tapping Last time (`fireListener` click on `toggleExHist`) shows the panel; stored draft `canon` unchanged, `updatedAt` 1000, pushes 0; a second card's tap closes the first | integration (dispatcher) | `npm test` | ❌ Wave 0 |
| LOG-01, D-01 | Rows = last 5 by `exKey`, newest first, across workouts, labelled with `s.workout` (escaped); a renamed/merged exercise keeps its rows | unit (`exerciseRecent`) + render | `npm test` | ❌ |
| D-02, D-03 | A deload row shows ↓, a skipped attempt shows the skip text and reason, a PR set shows the marker (assert by code point U+1F3C6, never a pasted glyph), note on its own muted line | render | `npm test` | ❌ |
| D-04 | A soft-deleted session and a skipped day never appear | unit | `npm test` | ❌ |
| D-05 | With `DB.draft.editRef = 's1'`, row for s1 absent | unit | `npm test` | ❌ |
| D-07 | No history → no `toggleExHist` control for that slot; `lastAnywhere`-only → control present | render | `npm test` | ❌ |
| LOG-02, D-19 | `openExChart` click → `TAB==='train'`, `subState.train==='progress'`, Strength's `<select>` has the exercise's `exKey` `selected`; bodyweight-only exercise selects its "(reps)" option; no data → default, no throw | integration | `npm test` | ❌ |
| D-20 | Strength shows `backToWorkout` only after the link; the click lands on Log; draft `canon` unchanged | integration | `npm test` | ❌ |
| D-21 | With `a.__sandbox.scrollY = 640`, link then `setSub('log')` (and separately `backToWorkout`) records a final `scrollTo(0, 640)`; panel still open; `collapsedEx` card still collapsed; a second arrival scrolls to 0 | integration (scrollTo spy) | `npm test` | ❌ |
| LOG-03, D-08, D-10, D-14 | `skipExercise` via dispatcher with `prompt` → `'shoulder'`: done sets untouched, unfinished sets `skipped:true`, `w:''`, `r:''`; entry `skipped===true`, `reason==='shoulder'`; `prompt` → `null` leaves the stored blob byte-identical | integration | `npm test` | ❌ |
| LOG-03 | Reload: `loadApp(APP_PATH, a.__stored())` restores the skipped entry and `_preSkip` exactly (`canon`) | integration | `npm test` | ❌ |
| D-14 | DRAFT-05 table gains `skipExercise` and `unskipExercise` rows; length pin updated; pushers list unchanged | structural (existing check) | `npm test` | ✅ (edit) |
| D-11 | Skipped card: one `.skip-note` with Undo, done sets + "rest skipped", card still splits on `<div class="ex-card">` so the next slot's index is right | render | `npm test` | ❌ |
| D-12 | All sets with reps → no `skipExercise` control; caret locator still finds the `toggleExCollapse` header button | render | `npm test` | ❌ |
| LOG-04, D-13 | Pre-filled and typed weights plus one set already skipped with its own reason → skip → reload → Undo → sets deep-equal the pre-skip copy; no `_preSkip`, `skipped`, `reason` left on the entry | integration | `npm test` | ❌ |
| LOG-05, D-09, D-16 | Through real functions (`startWorkout`, `setVal`, `skipExercise`, `finishWorkout`): finished entry keeps per-set flags and the marker; **no key starting with `_`** on any entry or set; next `latCard` has no `class="flag"`; `addWeightInfo(...).allTop === false`; an all-skipped workout finishes | integration | `npm test` | ❌ |
| D-09 old build | Delete `skipped`/`reason` from the finished entry → `addWeightInfo` still not all-top, `isStalledSlot` streak paused | unit | `npm test` | ❌ |
| D-09 sync | `validateBackup` accepts a backup whose entry carries the marker; `mergeDB` keeps the newer-`mtime` row with its marker; `SCHEMA` still 19 | unit | `npm test` | ❌ |
| D-15 | Workout history (open row) shows "Name — skipped: reason" / "· rest skipped: reason" | render | `npm test` | ❌ |
| D-17 | Next card's Last time line keeps the last real numbers (`/Last time \([^)]*\):/`) and shows "skipped {fmtDate}: reason" | render | `npm test` | ❌ |
| D-18 | `buildMarkdownExport()` runs on a session with a skipped exercise, has the set rows with `—`, and contains neither `_preSkip` nor the draft | unit | `npm test` | ❌ |
| Security | Hostile reason `"><img src=x>'` (built from ordinary characters) renders escaped in the skip note, inline row, Workout history and D-17 note; no `<img` in any HTML; reason never inside an attribute | render | `npm test` | ❌ |
| CSP | `csp:check` passes after the script change | existing | `npm test` | ✅ |

### Manual-only (Ian's end-of-phase UAT on the phone, not executor checkpoints)
1. Settings → This version shows the new build (PWA update lag, memory note).
2. Real workout: tap Last time on two cards (one panel at a time), read the 5 rows; tap the chart link; Strength shows that exercise; "← Back to workout" returns to the same scroll spot with the panel open and collapsed cards still collapsed.
3. Skip an exercise with a reason after doing one set; close and reopen the app; the skip is still there; Undo restores typed weights; skip again and finish.
4. Workout history shows "— rest skipped: reason"; start the next session of that workout: no ⬆ Add weight on that card, Last time shows the last real numbers plus the skipped note.
5. 380px layout: the header skip icon and the caret do not crowd the range badge.

### Sampling Rate
- **Per task commit:** `npm run csp:hash` (if the script changed), then `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** full suite green before `/gsd-verify-work`; then Ian's UAT

### Wave 0 Gaps
- [ ] `test/app.test.js` — new LOG section (no test mentions `LOG-0`: `grep -c "LOG-0" test/app.test.js` → `0`)
- [ ] `test/app.test.js` — DRAFT-05 table rows for `skipExercise`/`unskipExercise` and the updated length pin
- [ ] `test/harness.js` — optional getters for `openExHist`/`logReturn` (absent; `let`s are not exported), and nothing else: `scrollY` is set per test on `a.__sandbox`

No framework install is needed.

## Security Domain

`security_enforcement: true`, ASVS level 1.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | unchanged Firebase auth |
| V3 Session Management | no | — |
| V4 Access Control | no | `firestore.rules` unchanged |
| V5 Input Validation / Output Encoding | yes | `esc()` on every rendered reason, exercise name and workout label; `e.skipped === true` strict check; reason only in text nodes |
| V6 Cryptography | no | CSP hash regenerated by `npm run csp:hash`, never hand-computed |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Stored XSS through a skip reason that syncs to the other device or arrives in a backup | Tampering / Elevation | `esc()` in text nodes; never an attribute or JS source; hostile-string render tests |
| Type confusion from a hand-edited backup (`skipped:"false"`, `reason:{}`) | Tampering | Strict `=== true`; `esc()` calls `String()` |
| Draft-only snapshot leaking into a synced session | Information disclosure / Integrity | `delete out._preSkip` in `finishWorkout`; property test "no `_`-prefixed key in a finished entry" |
| Action-name injection | Tampering | Literal `data-action` (DELEG-04), own-key lookup in `dispatchAction` |
| Stale device reverting the skip | Integrity | Unchanged: per-row `mtime` union merge; `finishWorkout` `touch()`es the new row |
| Very long reason | DoS (UI) | Optional: cap at a few hundred characters on input; not required |

## Sources

### Primary (HIGH confidence)
- `index.html` (read this session): 483-514, 740-919, 960-1019, 1280-1479, 1485-1644, 1680-1789, 2084-2443, 2537-2796, 3816-3955, 3976-3987, 4360-4377, 4386-4447, 4888-4890, 5240-5479; plus `sed`/`grep` views of 695-742, 2035-2083, 3196-3240, 4700-4760, 4940-4975
- `test/app.test.js` (read): 1903-1914, 3045-3104, 3725-3834, 5014-5135, 5300-5634, 7200-7398, 7743-7751, 8286-8289; `grep`/`sed` views of the helpers and pins cited above
- `test/harness.js` (read): 70-109, plus a full `cat`
- `.planning/phases/10-.../10-CONTEXT.md`, `.planning/REQUIREMENTS.md`, `.planning/v1.1-BRIEF.md` §3, `.planning/STATE.md`, `.planning/ROADMAP.md` Phase 10, `08-CONTEXT.md` D-01..D-10, `09-UI-SPEC.md` S3/S4
- Commands run: `npm test` (`1136 passed, 0 failed, 2 skipped`), `node scripts/csp-hash.js --check`, version probes

### Secondary / Tertiary
- None. No web or Context7 lookup was needed: the phase uses no external library or host.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — nothing new; versions probed
- Architecture: HIGH — every touched symbol read; data shapes checked against every reader by grep
- Pitfalls: HIGH — each pin quoted from the test file with its line
- Scroll restore on device: MEDIUM — A1/A2, verified only by Ian's UAT

**Research date:** 2026-10-13
**Valid until:** until the next change to `viewActive`, `finishWorkout`, `go`/`setSub` or the DRAFT-05/F2 tests (line numbers drift; cite by symbol)
