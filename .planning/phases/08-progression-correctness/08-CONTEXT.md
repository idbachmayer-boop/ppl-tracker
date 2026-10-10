# Phase 8: Progression Correctness - Context

**Gathered:** 2026-10-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the advice on each exercise card ("⬆ Add weight" and "⚠ Stalled") match what Ian actually lifted.
Two parts:

- **Add weight** only after a complete set of top-of-range sets.
- **A stall** is 3 sessions in a row without progress, each compared with the session before.

Covers PROG-01..05. Equipment types and weight steps belong to Phase 9. History on the Log page and skip-exercise
belong to Phase 10. Poor-sleep "lighter" sessions belong to Phase 13; they reuse the deload exclusion kept here.

</domain>

<decisions>
## Implementation Decisions

The rules are locked by `.planning/v1.1-BRIEF.md` and REQUIREMENTS.md PROG-01..05. Below are the
implementation edge cases Ian decided on 2026-10-10.

### What "every planned set" means (PROG-01)
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

### Mixed or lower weights (PROG-02)
- **D-03:** A session's **working weight is its heaviest set**.
  - Compared with the previous session in the same slot:
    - heavier working weight = progress;
    - same working weight = progress if total reps across all sets rose by at least 1;
    - lighter working weight = **no progress, and not a failure either**. The comparison restarts from that
      session, the same way it restarts after a deload.
  - Set-by-set matching was rejected.

### Which sessions count toward a stall (PROG-03, PROG-04)
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

### Moving existing history to the new rule
- **D-07:** **Re-judge all history immediately.** The new rule is computed over every past session as soon
  as it ships.
  - Today's false warnings disappear.
  - A real 3-session stall shows up straight away.
  - No stored data is rewritten, because stall and add-weight are computed, not stored. No migration is
    needed for the rules themselves. D-01's blank-set marker, if the planner adds one, applies only to
    newly finished workouts. Older sessions are judged on what they hold, since their blank sets were
    already dropped.

### Bodyweight exercises (PROG-05)
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

</decisions>

<specifics>
## Specific Ideas

- The false warning that started this: DB lateral raise (3–5 sets × 15–20).
  - Set 1 reaches 20, and `repHint` then caps it at "=20".
  - The +1 reps land on sets 2 and 3, which never change the session's best-set e1RM.
  - So three sessions look flat and it reads "stalled". The add-weight rule needs every set at 20 or more,
    so the weight never goes up to break the tie.
  - The phone workout check must replay this case.
- Ian's own words (Sep 21): "I need to do all of the sets at the max rep range to progress and each lift
  needs to have all sets done for me to progress."

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scope and locked rules
- `.planning/v1.1-BRIEF.md` § Phase 1: the approved rules and the bugs they fix.
- `.planning/REQUIREMENTS.md`: PROG-01..05.
- `.planning/ROADMAP.md` § Phase 8: goal, success criteria, notes.

### Project rules
- `CLAUDE.md`:
  - draft rules: `saveLocal` for draft edits, `finishWorkout` saves;
  - `esc()` and `data-action`;
  - `npm run csp:hash` after **any** change to the inline script, which every phase here makes;
  - the migration rules, if any stored row is rewritten.

### Code (index.html, line numbers as of 2026-10-09)
- `addWeightInfo` L1092-1098, `INCREMENT` L1090, `repHint` L1116-1124, `setStatus` L1131-1145.
- `slotE1rmSeries` L1152-1159, `isStalledSlot` L1160-1165, `e1rm` L1022.
- `deloadExercise` and `undeloadExercise` L1168-1175, `lastRealEntry` L909-919, `effRange` L868.
- `startWorkout` draft prefill L1749-1765, `viewActive` flag and coach lines L1814-1831.
- `finishWorkout` L2040: blank sets are dropped here. `skipSet` / `unskipSet` L1969-1975.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `exKey` and the exercise registry (`exEnsure` L1216-1223) give a stable identity for D-04.
- `lastRealEntry` already skips skipped days and deloads. Its exclusion semantics can be reused for
  D-05's pause.

### Established Patterns
- Stall and add-weight are pure functions computed at render time. Keep them pure and unit-tested, with
  no stored derived state.
- The suite (`test/app.test.js`, 928 passing) uses a frozen clock. Add property tests for each D-xx edge
  case: a skipped set blocks, a removed set doesn't, a lighter set blocks, later-set reps count as
  progress, a lighter session restarts, a deload pauses, slots are independent, a rename keeps history,
  and bodyweight stalls.

### Integration Points
- The `viewActive` card flags and coach banner, and the `startWorkout` prefill. That is the only place
  suggested weights are written.
- The Phase 9 and Phase 13 hooks: the weight step (`INCREMENT`) is replaced per equipment in Phase 9; keep
  the add-weight helper's step a single seam.

</code_context>

<deferred>
## Deferred Ideas

None came up. Everything discussed stayed inside Phase 8.

</deferred>

---

*Phase: 08-progression-correctness*
*Context gathered: 2026-10-10*
