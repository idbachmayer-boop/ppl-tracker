# Phase 9: Equipment and Weight Steps - Context

**Gathered:** 2026-10-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Every exercise gets one synced equipment type (barbell, EZ bar, dumbbell, machine, cable or bodyweight).
The type decides:
- the step for add-weight suggestions;
- the step for deloads, warm-up rungs and the "→ suggest X lb" translation line;
- which bar, if any, the plate math uses.

Ian sets the type in Settings → Exercises, and the change syncs. Existing exercises get a type from a
migration (EQUIP-01..06).

Not in this phase:
- the inline history on the Log page (Phase 10);
- whole-exercise skip (Phase 10);
- kettlebells (out of scope for v1.1);
- per-exercise custom steps beyond what the type gives.

</domain>

<decisions>
## Implementation Decisions

Carried forward from Phase 8:
- `weightStep(name)` (index.html ~L1098) is the single seam for the step, and it is a `function`
  declaration so Phase 9 changes only its body.
- Bodyweight progression keeps Phase 8's rule (D-08): progress means +1 total rep, and at the top of
  the range the card shows "⬆ Add weight (belt) or harder variation" with no number.

### Default equipment types (EQUIP-01, EQUIP-02)
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

### Plate-loaded lifts (EQUIP-06)
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

### Steps (EQUIP-04)
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

### Rounding (EQUIP-05)
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

### Decided after research (2026-10-12, RESEARCH.md open questions)
- **D-14:** **The migration stamps each rewritten row's `mtime` as "only just newer" than its old copy (old `mtime` + 1), not `Date.now()`.**
  - A stale device's un-migrated copy still loses to it.
  - A rename or merge Ian made on the other device before this one updated still wins.
  - This satisfies CLAUDE.md's migration rule, since `mtime` is stamped and the result is persisted
    immediately. It only avoids "now" outrunning real edits.
  - Equipment choices are protected separately by their own clock (RESEARCH: `equipAt`).
  - The stale-device replay test must cover a rename on the other device as well.
- **D-15:** **Deload at the empty bar stays at the bar weight**, for example Barbell row at 45, and the
  card says why: "Already at the empty bar — cut a set or reps instead."
  - This is the one exception to D-11's "at least one step lighter", because nothing lighter can be
    loaded.
  - The same applies wherever 90% rounds below the bar on a barbell or EZ-bar lift.
- **D-16:** **The first-time equipment picker (D-04) shows only for a name the default table can't
  place.** Program names and every name in Ian's history get their type silently.
- **D-17 (clarifies D-08):** **The dumbbell step is the gap to the next dumbbell on the rack.**
  - Below 60 the rack goes in 2.5s, so 57.5 → 60.
  - Above 60 it goes in 5s, so 60 → 65 → 70.
  - Rounding uses the same rack: deloads round down to a weight that exists, and warm-ups to the
    nearest one.

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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and scope
- `.planning/REQUIREMENTS.md` — EQUIP-01..06 (EQUIP-04 amended 2026-10-10 per D-08), and Out of Scope
  (kettlebells).
- `.planning/ROADMAP.md` § Phase 9: the goal, success criteria and Notes (migration rules,
  `DB.exercises` merge path, golden-fixture regeneration, picker via `save()`, kg question → D-10).
- `.planning/v1.1-BRIEF.md` — Ian's milestone brief.

### Rules the code must keep
- `CLAUDE.md` — the migration rules (Migration 15 incident), draft rules, escaping, `data-action`
  handlers, the CSP hash after script edits, and § "Adding a new tracked thing".
- `docs/adding-a-collection.md` § "Registry validity": regenerate `test/fixtures/merge-golden.json`
  after the SCHEMA bump.

### Prior phase decisions
- `.planning/phases/08-progression-correctness/08-CONTEXT.md` — D-08 (bodyweight), D-09/D-10 and the
  `weightStep` seam.
- `.planning/phases/08-progression-correctness/08-REVIEW.md` — IN-04 (`translateLoad` reads
  `INCREMENT` directly; L1892 prints `DB.unit` without `esc()`).

### Ian's data
- `C:\Users\idbac\Downloads\ppl-export-2026-10-10.md` — the export Ian shared, outside the repo. It lists
  every exercise name he has logged and the weights behind D-02, D-03 and D-08. Use it to check the
  default table. Never commit it.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `weightStep(name)` (~L1098): the step seam; today it returns `INCREMENT[DB.unit] || 5`.
- `BAR_LB`, `BAR_FOR`, `LANDMINE_RE`, `barStyle`, `barWeight`, `isBarbell`, `plateBreakdown` and
  `platesText` (~L1023–1085): the plate math, with straight, ez, sled and landmine loading styles.
- `exRows`, `exRow`, `exIdByName`, `exKey`, `exEnsure`, `exMerge` (~L1263–1305): the exercise registry.
  Rows are `{id, name, aliases}` and get `touch()`ed.
- Settings → Exercises: `exListRows`, `exercisesCardHTML`, `renameExercise` (~L2657–2720). Rename and
  merge already use `save()`.
- The warm-up ramp renderer (~L2086–2105) and `deloadExercise` (~L1233) both use `round5`.
- `translateLoad` (~L937) and its call site in the card's Last time line (~L1891).

### Established Patterns
- Identity goes through `exKey()`, never the exact name.
- Synced registry edits use `save()`. Draft edits use `saveLocal()`.
- All markup controls are `data-action` with `esc()`'d `data-*`.

### Integration Points
- `addWeightInfo`/`addWeightVerdict` (Phase 8) consume `weightStep`, so the step change flows into ⬆ Add
  weight automatically.
- `pickEx`/`exEnsure` is where the D-04 first-time picker hooks in.
- The card header in `viewActive` is where the D-05 tag goes.

</code_context>

<specifics>
## Specific Ideas

- Ian's own example: a 15 lb dumbbell deload at 90% is 12.5, not 15.
- The tag text should read like "dumbbell · +2.5".
- Preacher curl is the motivating case for EQUIP-06 (Ian's 2026-10-09 idea: "I've been doing ezbar, but I
  don't see the plate math").

</specifics>

<deferred>
## Deferred Ideas

- Splitting one exercise's past sessions between two names (for example the June rear-delt machine rows).
  Settings can rename and merge but not split. Not needed now (D-03).
- A per-exercise step override, for a machine whose stack doesn't match its type. Not requested;
  revisit if a type's step proves wrong for a specific machine.
- A kg step table (D-10).

</deferred>

---

*Phase: 09-equipment-and-weight-steps*
*Context gathered: 2026-10-10*
