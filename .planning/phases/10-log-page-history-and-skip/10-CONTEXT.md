# Phase 10: Log Page — History and Skip - Context

**Gathered:** 2026-10-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Two additions to the active-workout exercise card on the Log tab (`viewActive()`):

1. **Inline history (LOG-01, LOG-02).** Tapping the "Last time" line opens that exercise's last 5
   sessions on the card, with a link to its full chart in Progress → Strength. The workout is never left,
   and the draft is never changed by opening, closing or following the link.
2. **Skip a whole exercise (LOG-03..05).** A button on each card skips the exercise, with one optional
   reason. It can be undone during the workout, survives an app reload (draft edit, `saveLocal()`), and
   the finished session records it as skipped, so the next time ⬆ Add weight is not suggested (PROG-01).

The rules are locked by `.planning/v1.1-BRIEF.md` §3 and REQUIREMENTS.md LOG-01..05. Below are the
implementation choices Ian made on 2026-10-13.

</domain>

<decisions>
## Implementation Decisions

Carried forward (not re-asked):
- Phase 8 D-09: add weight judges the latest non-deload entry where the exercise was on the card, even
  one where every set was skipped. Phase 8 D-10: a session with any skipped set pauses the stall streak.
  A skipped exercise therefore blocks add weight and pauses the stall streak **through the existing
  per-set `skipped` checks** in `addWeightInfo` and `isStalledSlot`.
- Phase 8 kept `lastRealEntry` as the source of the "Last time" line and the prefilled weights. It
  skips skipped sets and deloads, so the line keeps showing the last real attempt.
- History follows `exKey` (PROG-04).

### Inline history: what the 5 sessions are
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

### Inline history: opening and closing
- **D-06:** Tapping the Last time line toggles the panel. **Only one panel is open at a time**: opening
  another card's history closes the first. Which card is open is **screen-only state** (like
  `collapsedEx`) and is never written into `DB.draft`. Opening and closing never call `save()` or
  `saveLocal()`.
- **D-07:** **"No previous data — set your baseline." is not tappable.** With no history there is
  nothing to show. When the line comes from `lastAnywhere` (no history in this slot, some elsewhere),
  it is tappable, because D-01 history is per exercise.

### Skipping a whole exercise
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

### After the workout
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

### The chart link and coming back
- **D-19:** The inline history's link opens **Train → Progress → Strength with this exercise already
  selected** (`progSub='strength'` and `selectedExercise` set to the exercise's `exKey`, or its "(reps)"
  series for bodyweight). If the exercise has no chartable data, Strength opens on its default.
- **D-20:** Arriving from a workout, Strength shows a small **"← Back to workout"** control. Tapping Train
  → Log also works. Neither path touches the draft.
- **D-21:** **Coming back restores the scroll position, keeps that card's history panel open, and keeps
  collapsed cards collapsed.** Every set is unchanged. This return state is screen-only and never goes
  into `DB.draft` or a save.

### Settled after research (2026-10-13, research Open Questions 1–4)
- **D-22:** **A skip with no done set clears `deload`**, so a deload-then-skip still blocks Add weight
  next time (`lastAttemptEntry` ignores deloaded entries). The pre-skip snapshot keeps the deload, so
  Undo puts it back. When some sets were done, the deload stays.
- **D-23:** **The exporter stays unchanged.** A skipped set keeps exporting as a row of `—`, and skip
  reasons are visible only in the app. This corrects D-18's premise that the export carries reasons.
- **D-24:** When an exercise's only history is skipped or deloaded attempts, the Last time line reads
  **"No previous data — set your baseline."** and is **not tappable** (D-07 applied literally). The D-17
  muted skip note **still shows** under it.
- **D-25:** **Re-editing a finished workout keeps a skipped exercise skipped**: the exercise-level marker
  and reason carry through `editSession` into the draft. Undo still works; with no pre-skip snapshot it
  restores the sets as unskipped empty sets.

### Claude's Discretion
- The data shape of the exercise-level skip (D-09), within the rules stated there.
- How the pre-skip snapshot is stored in the draft (D-13), within the draft rules.
- The exact wording, icons and spacing of the markers (D-02), the skip note (D-11, D-15, D-17) and the
  back control (D-20). Use Phosphor icons from `PH` and `:root` colours (CLAUDE.md conventions).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and scope
- `.planning/v1.1-BRIEF.md` §3 "Log page": the source of every rule in this phase.
- `.planning/REQUIREMENTS.md`: LOG-01..05, and PROG-01 / PROG-04, which this phase relies on.
- `.planning/ROADMAP.md` § "Phase 10": success criteria and notes (saveLocal, esc, liveSessions).

### Decisions this phase builds on
- `.planning/phases/08-progression-correctness/08-CONTEXT.md`: D-01 (blank and skipped sets),
  D-04 (per-slot streaks), D-09 (a skipped attempt blocks add weight), D-10 (skipped sets pause the
  stall).
- `.planning/phases/09-equipment-and-weight-steps/09-CONTEXT.md`: the card's equipment tag and
  equipment picker share the card header area that D-12 touches.

### Project rules
- `CLAUDE.md`: the draft rule (`saveLocal()`, `keepLocalDraft`, the tripwire), escaping, `data-action`
  delegation, and CSP (`npm run csp:hash` after any change to the inline script).

</canonical_refs>

<code_context>
## Existing Code Insights

Code is cited by symbol. Find each one with `grep -n "<symbol>" index.html`; line numbers drift.

### Reusable Assets
- `skipSet` / `unskipSet` / `skipStairs` / `unskipStairs`: the existing prompt-based skip, the
  skip-note markup (`.skip-note`) and its Undo button.
- The stair-stepper card's skipped branch in `viewActive()`: the collapsed one-line pattern for D-11.
- `collapsedEx` (ephemeral `Set` of collapsed slot indices) and `toggleExCollapse`: the precedent for
  screen-only card state (D-06, D-21).
- `exerciseHistory(key)` (used by `viewStrength`) and `lastAnywhere`: per-exercise history by `exKey`.
  These are the starting point for the D-01 rows.
- `viewStrength`, `selectedExercise`, `selectExercise`, `progSubTab`, and the `openChart` action: how to
  land on Strength with an exercise selected (D-19).
- `goSub('train', ...)`: tab and sub-tab navigation.
- `fmtSet`, `fmtDate`, `exLabel`, `prSetIndex` / `exercisePRs`: formatting and PR markers for rows.

### Established Patterns
- **Draft edits** persist with `saveLocal()`. Only `pickEx`, `exPick` and `finishWorkout` call `save()`.
- **`finishWorkout`** builds the session from copies of the draft entries (`Object.assign({}, e, …)`),
  keeps skipped sets, drops sets with no reps (counting them as `blankSets`), and strips `_cel`. A
  draft-only field like D-13's snapshot must be stripped the same way.
- **`lastRealEntry`** ignores skipped sets and deloads, which is right for D-17's numbers. The newer
  "latest entry on the card" helper next to `addWeightInfo` (Phase 8 D-09) is what sees a skipped
  attempt.
- **Controls** are `data-action` plus `data-*` attributes, each through `esc()`, with one thin wrapper
  in `ACTIONS`. Wrappers never touch `DB` or persist.

### Integration Points
- `viewActive()`: the Last time line (`.lasttime`), the card header (collapse caret), and the set rows.
- `finishWorkout()`: where the skip is written into the synced session (D-09, D-13).
- `viewHistory()`: Workout history rendering (D-15).
- `viewStrength()`: the "← Back to workout" control (D-20).
- The inline `<script>` changes, so `npm run csp:hash` is needed before `npm test`.

</code_context>

<specifics>
## Specific Ideas

- Example skipped-card text: "Lat pulldown · 120×10, 120×9 · rest skipped: shoulder".
- Example Last time note: "skipped Oct 13: shoulder".
- Example history row: "Oct 8 · Push 1 — 135×10, 135×9, 135×8", with ↓, skip and PR markers and the note
  on its own muted line.
- **Verification** (ROADMAP): a real workout on Ian's phone, done by Ian, plus `npm test`. The phone
  checks belong to Ian's UAT, not to an executor agent: no agent in this pipeline has his phone.

</specifics>

<deferred>
## Deferred Ideas

None. The discussion stayed within the phase scope.

</deferred>

---

*Phase: 10-log-page-history-and-skip*
*Context gathered: 2026-10-13*
