# Requirements: PPL Tracker

**Defined:** 2026-10-09
**Milestone:** v1.1 Training accuracy, lawn & sleep
**Core Value:** The data Ian has already logged must never be lost, corrupted, or resurrected after
deletion — every other feature can fail before that one does.

**Source:** `.planning/v1.1-BRIEF.md`, agreed with Ian on 2026-10-09. Every threshold below is his
decision, not a default. All of `CLAUDE.md` applies to every requirement: union-merge sync, soft
deletes, explicit `false`, migrations that `touch()` and persist, `saveLocal()` for derived data and
draft edits, the draft never leaving the device, `esc()` on user strings, `data-action` delegation,
and `npm run csp:hash` after any change to the inline script.

IDs do not reuse any v1.0 prefix (REG, EXP, DOC, DRAFT, DELEG, REPO, CSP, SLEEP, VAL, DEPLOY), so
sleep work in this milestone is `SLP`, not `SLEEP`.

## v1.1 Requirements

### Progression and stall (PROG)

- [x] **PROG-01**: The app suggests adding weight to a slot only when every planned set for that slot
  was done (none skipped, none missing) and each one reached the top of the rep range at the working
  weight. Two sets at the top plus one skipped set does not suggest adding weight.
- [ ] **PROG-02**: A session counts as progress on an exercise when, compared with the previous session
  of that exercise, total reps across all sets went up by at least 1, or the weight went up.
- [ ] **PROG-03**: An exercise is flagged as stalled only after 3 sessions in a row with no progress,
  each measured against the session before it, never against the all-time best. Extra reps on sets 2
  and 3 count as progress, so a DB lateral raise that gains reps on later sets is not flagged.
- [ ] **PROG-04**: Progress and stall history follow the exercise's identity (`exKey`), not its exact
  name, so a renamed or merged exercise keeps its history.
- [ ] **PROG-05**: Bodyweight exercises are checked for stalls too, with progress meaning +1 total rep.
  When every set reaches the top of the range, the app shows "add weight (belt) or harder variation"
  with no number.

### Equipment and weight steps (EQUIP)

- [ ] **EQUIP-01**: Each exercise has one equipment type: barbell, EZ bar, dumbbell, machine, cable or
  bodyweight. It is stored on the synced exercise-registry row.
- [ ] **EQUIP-02**: Existing exercises get an equipment type defaulted from their name. The migration
  that writes it bumps `SCHEMA`, stamps `mtime` on every row it rewrites (`touch()`), persists
  immediately, is idempotent and never downgrades `_schema`. A stale-device merge replay test proves
  an older device cannot revert it, and replaying that device again still keeps it.
- [ ] **EQUIP-03**: Ian can change an exercise's equipment type in Settings → Exercises, and the change
  syncs to his other device.
- [ ] **EQUIP-04**: Weight suggestions move by the exercise's own step: 5 lb for barbell, EZ bar,
  machine and cable; 2.5 lb for dumbbells. No suggestion uses a flat 5 lb step for a dumbbell.
- [ ] **EQUIP-05**: Deloads and warm-ups round to the exercise's own step, so a 15 lb dumbbell deload
  at 90% suggests 12.5 lb instead of rounding back to 15.
- [ ] **EQUIP-06**: Plate math follows the equipment type. The preacher curl is an EZ bar exercise with
  a 25 lb bar and shows plate math against that bar.

### Log page (LOG)

- [ ] **LOG-01**: Tapping the "Last time" line on an exercise card opens that exercise's last 5
  sessions inline on the card. The workout is never left, and the in-progress draft is unchanged.
- [ ] **LOG-02**: The inline history links to that exercise's full chart in Progress → Strength.
- [ ] **LOG-03**: Each exercise card has a skip button that skips all of that exercise's sets, with one
  optional reason. The skip is a draft edit and persists with `saveLocal()`.
- [ ] **LOG-04**: A skipped exercise can be un-skipped during the workout, restoring its sets.
- [ ] **LOG-05**: A skipped exercise is saved as skipped in the finished session, so it blocks adding
  weight to it next time (PROG-01).

### Lawn, journal and weather loop (LAWN)

- [ ] **LAWN-01**: The lawn scheduler holds off watering when today's forecast high is below 60°F.
- [ ] **LAWN-02**: Once a day is over, that day's rainfall is saved, with its exact amount, in its own
  small synced collection, separate from `lawnLog`. The collection is added by the `CLAUDE.md` recipe:
  one `COLLECTIONS` entry placed last with an unused `label`, a `SCHEMA` bump and a migration, and the
  required tests (registry validity, a stale-device merge replay that keeps a deleted row deleted,
  `validateBackup()` shape, and a declaration-alone structural proof). The merge golden is regenerated.
- [ ] **LAWN-03**: Lawn history shows 🌧 on every day with 0.1 inches of rain or more.
- [ ] **LAWN-04**: The 7-day outlook shows 💧 on the day watering is next due. It skips any day whose
  forecast rain meets the season's `rainSkip` (0.3 to 0.5 inches) or whose chance of rain is 60% or
  higher.
- [ ] **LAWN-05**: Week in Review in the journal shows 🚜 Mowed, 💧 Watered and 🌧 rain on each day they
  apply.
- [ ] **LAWN-06**: A failed weather fetch backs off instead of looping fetch → fail → render, on both
  Today and Lawn, while offline (closes 04-REVIEW WR-01).
- [ ] **LAWN-07**: The test harness's `fetch` settles, so a fetch-render loop fails the suite instead of
  hiding (closes 04-REVIEW WR-05).

### Sleep card and Erase (SLP)

- [ ] **SLP-01**: In the morning, Today shows a sleep card until last night's sleep is logged; once it
  is logged the card disappears for the rest of the day. It reuses the morning weigh-in card's pattern.
- [ ] **SLP-02**: The sleep card's entry is dated the day Ian woke up, requires hours and quality, and
  takes an optional note. It saves a row in the existing `sleep` collection.
- [ ] **SLP-03**: A local "Erase all data" keeps this device's in-progress workout: `wipe()` goes
  through `keepLocalDraft()`, or `CLAUDE.md` documents it as the one exception to the draft rule. A
  test pins whichever is chosen (closes the v1.0 audit `wipe()` warning).

### Strength index (STR)

- [ ] **STR-01**: The strength index starts at 100. For every exercise trained in the last 4 weeks, it
  divides that exercise's best e1RM from those 4 weeks by its best e1RM from its own first 4 weeks
  logged, then averages across those exercises.
- [ ] **STR-02**: Bodyweight exercises contribute total reps in place of e1RM.
- [ ] **STR-03**: A second line shows the index adjusted for bodyweight: index × (bodyweight at start ÷
  bodyweight now).
- [ ] **STR-04**: The index and the bodyweight-adjusted line appear at the top of Progress → Strength
  with a weekly chart.
- [ ] **STR-05**: Today's week card shows one small strength number with its change over the month,
  e.g. "Strength 112, +3 this month".

### Poor-sleep intensity (INT)

- [ ] **INT-01**: Last night counts as poor sleep when its sleep entry has quality 2 or lower, or under
  6 hours.
- [ ] **INT-02**: When a workout starts after a poor night, the app asks "You slept poorly. Go 10%
  lighter today?" and applies it with one tap. It is never applied automatically.
- [ ] **INT-03**: A lighter workout keeps the same sets and reps. Each suggested weight is cut 10%,
  rounded to the exercise's step, and always at least one step lighter than the normal suggestion.
- [ ] **INT-04**: A lighter session is marked like a deload, so it never counts toward a stall and
  never counts as a reason to add weight.
- [ ] **INT-05**: When no sleep is logged for last night, nothing changes and the Log page shows a
  small "Log last night's sleep" link. Logging a poor night from that link brings up the offer.

## Future Requirements

Deferred. Tracked, not in the v1.1 roadmap.

### Carried v2 backlog

- **VAL-01**: `validateBackup()` checks the types inside an imported file, not only its shape.
- **VAL-02**: File-wide attribute-escaping sweep (`esc()` does not escape `'`).
- **EXP-09**: Export windowing (recent detail plus aggregates).
- **DEPLOY-01**: CI publishes only the served surface, not the whole repo.

### v1.0 tech debt not covered by the brief

From `STATE.md` and `milestones/v1.0-MILESTONE-AUDIT.md`:

- REG-14 legacy deletion: remove the ten `_legacy` data-layer functions per
  `milestones/v1.0-phases/01-f1-the-collections-registry/01-07-PLAN.md` Task 2 (Ian's call on timing).
- 04-REVIEW WR-03: `pickEx`/`exPick` bump `updatedAt` and push even when nothing synced changed.
- 04-REVIEW WR-04: a draft kept across restore, Replace or remote Erase can land a session whose `exId`
  is in no registry.
- 04-REVIEW WR-06: under a storage-quota failure the draft has no durable copy, and the banner says
  cloud sync protects it.
- 02-REVIEW WR-02: `collectionProblems()` does not require `soft:true` on a list, but `exportRows`
  routes every list through `liveOf`.
- 02-REVIEW WR-03: the "column[0] is the date" export contract is enforced nowhere.
- 06-REVIEW WR-01..03: the line-ending checks do not prove normalization and cover `index.html` only.
- 07-REVIEW IN-04: add the phone auth-loader path to the `CLAUDE.md` re-probe triggers.
- 01-REVIEW IN-01: a malformed imported sleep row renders `NaN`.
- Map collections (`mobilityLog`, `lawnLog`, `journal`) are not associative across three devices
  (documented and accepted).
- Process: no `04-SECURITY.md` / `07-SECURITY.md`; Nyquist validation still draft for phases 02-05
  and 07.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Kettlebells (equipment type, list of bells) | Ian doesn't use them (v1.1 brief) |
| CSP-test hardening (07-REVIEW WR-01..03) | Runs as a separate quick task, outside v1.1 (v1.1 brief) |
| Everything in PROJECT.md → Out of Scope | Decided 2026-09-09 and re-audited at v1.0 close; v1.1 does not re-open any of it |

## Traceability

Which phases cover which requirements. Filled during roadmap creation (2026-10-09); the roadmap is
proposed and awaiting Ian's approval.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PROG-01 | Phase 8 | Complete |
| PROG-02 | Phase 8 | Pending |
| PROG-03 | Phase 8 | Pending |
| PROG-04 | Phase 8 | Pending |
| PROG-05 | Phase 8 | Pending |
| EQUIP-01 | Phase 9 | Pending |
| EQUIP-02 | Phase 9 | Pending |
| EQUIP-03 | Phase 9 | Pending |
| EQUIP-04 | Phase 9 | Pending |
| EQUIP-05 | Phase 9 | Pending |
| EQUIP-06 | Phase 9 | Pending |
| LOG-01 | Phase 10 | Pending |
| LOG-02 | Phase 10 | Pending |
| LOG-03 | Phase 10 | Pending |
| LOG-04 | Phase 10 | Pending |
| LOG-05 | Phase 10 | Pending |
| LAWN-01 | Phase 11 | Pending |
| LAWN-02 | Phase 11 | Pending |
| LAWN-03 | Phase 11 | Pending |
| LAWN-04 | Phase 11 | Pending |
| LAWN-05 | Phase 11 | Pending |
| LAWN-06 | Phase 11 | Pending |
| LAWN-07 | Phase 11 | Pending |
| SLP-01 | Phase 12 | Pending |
| SLP-02 | Phase 12 | Pending |
| SLP-03 | Phase 12 | Pending |
| STR-01 | Phase 13 | Pending |
| STR-02 | Phase 13 | Pending |
| STR-03 | Phase 13 | Pending |
| STR-04 | Phase 13 | Pending |
| STR-05 | Phase 13 | Pending |
| INT-01 | Phase 13 | Pending |
| INT-02 | Phase 13 | Pending |
| INT-03 | Phase 13 | Pending |
| INT-04 | Phase 13 | Pending |
| INT-05 | Phase 13 | Pending |

**Coverage:**
- v1.1 requirements: 36 total (PROG 5, EQUIP 6, LOG 5, LAWN 7, SLP 3, STR 5, INT 5)
- Mapped to phases: 36 (Phase 8: 5, Phase 9: 6, Phase 10: 5, Phase 11: 7, Phase 12: 3, Phase 13: 10)
- Unmapped: 0 ✓

---
*Requirements defined: 2026-10-09*
*Last updated: 2026-10-09 after roadmap creation (Phases 8-13, proposed)*
