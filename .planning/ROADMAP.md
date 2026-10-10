# Roadmap: PPL Tracker

## Milestones

- ✅ **v1.0 Collections & lockdown**: Phases 1-7 (shipped 2026-10-09)
- 📋 **v1.1 Training accuracy, lawn & sleep**: Phases 8-13 (in progress — roadmap approved 2026-10-10)

## Phases

<details>
<summary>✅ v1.0 Collections & lockdown (Phases 1-7) — SHIPPED 2026-10-09</summary>

- [x] Phase 1: F1 — The COLLECTIONS Registry (7/7 plans) — completed 2026-09-14
- [x] Phase 2: Export for Claude (3/3 plans) — completed 2026-09-18
- [x] Phase 3: F3 — Adding a New Tracked Thing (Recipe) (5/5 plans) — completed 2026-09-22
- [x] Phase 4: Draft Goes Device-Local (3/3 plans) — completed 2026-09-23
- [x] Phase 5: F2 — Event Delegation (6/6 plans) — completed 2026-10-01
- [x] Phase 6: F4 — .gitattributes (2/2 plans) — completed 2026-10-02
- [x] Phase 7: Content Security Policy (7/7 plans) — completed 2026-10-09

Full details: `.planning/milestones/v1.0-ROADMAP.md`. Phase artifacts:
`.planning/milestones/v1.0-phases/`.

</details>

### 📋 v1.1 Training accuracy, lawn & sleep (Phases 8-13) — in progress (approved 2026-10-10)

**Milestone Goal:** Make the training advice trustworthy, so that add-weight, stall, step and deload
suggestions match what Ian actually lifted, and close the lawn and sleep loops he asked for, without
bending any v1.0 data rule.

**Status:** Draft. Ian has not approved this roadmap yet. Nothing below is planned or started.

**Source:** `.planning/v1.1-BRIEF.md`, agreed with Ian on 2026-10-09. Its six phases map one to one
onto Phases 8-13, and every threshold below is his decision, not a default. Requirements with IDs are
in `.planning/REQUIREMENTS.md`.

- [ ] **Phase 8: Progression Correctness** - Add weight only when every planned set hit the top of the range; progress and stall are measured session to session by `exKey`, bodyweight included.
- [ ] **Phase 9: Equipment and Weight Steps** - Each exercise gets a synced equipment type, its own 2.5 or 5 lb step, step-aware deloads and warm-ups, and plate math for its own bar.
- [ ] **Phase 10: Log Page — History and Skip** - The last 5 sessions open inline from "Last time", and a whole exercise can be skipped with an optional reason and undone.
- [ ] **Phase 11: Lawn, Journal and Weather Loop** - Cool-day watering hold, rain history in its own synced collection, 💧 in the outlook, journal marks, and a weather fetch that backs off offline.
- [ ] **Phase 12: Sleep Card and Erase** - A morning sleep card on Today, and a local Erase that keeps the workout in progress or is the documented exception.
- [ ] **Phase 13: Strength Index and Poor-Sleep Intensity** - A strength index from 100 on Progress and Today, and a one-tap 10%-lighter offer after a poor night.

**Rules every v1.1 phase carries** (from `CLAUDE.md`, which wins on any conflict):

- Every phase edits the inline `<script>`, so run `npm run csp:hash` before each commit that touches
  it. A stale hash blanks the app on every device, the phone included.
- `npm test` stays green from the 928-check baseline, and each phase adds checks for what it changes.
- Union-merge sync, soft deletes, an explicit `false` in map collections, `esc()` on every
  user-controlled string (double-quoted attributes only, never JS source), and `data-action`
  delegation through thin `ACTIONS` wrappers. Never stop propagation.
- Draft edits persist with `saveLocal()`, never `save()`. Only `pickEx`, `exPick` and
  `finishWorkout` may `save()`, and the suite fails when a new draft function calls it.
- No new fetch host without a CSP change and a re-probe on desktop and Android user agents.

## Phase Details

### Phase 8: Progression Correctness
**Goal**: The add-weight and stall advice on each exercise card matches what Ian actually lifted. Weight goes up only after a complete set of top-of-range sets, and a stall means three sessions in a row without progress against the session before, so the false DB lateral raise warning and the repeating stalls stop.
**Depends on**: Nothing in v1.1 (builds on the shipped v1.0 app)
**Requirements**: PROG-01, PROG-02, PROG-03, PROG-04, PROG-05
**Verification**: A real workout on Ian's phone, plus the automated suite (`npm test`).
**Success Criteria** (what must be TRUE):
  1. After a session where every planned set for a slot was done at the working weight and each one reached the top of the rep range, the next session suggests adding weight. After two sets at the top plus one skipped or missing set, it does not (PROG-01).
  2. A session counts as progress when, against the previous session of that exercise, total reps across all sets rose by at least 1 or the weight went up. Extra reps on sets 2 and 3 alone count, so a DB lateral raise that gains reps on its later sets is not flagged as stalled (PROG-02, PROG-03).
  3. The stalled warning appears only after 3 sessions in a row with no progress, each measured against the session before it and never against the all-time best, and one session of progress clears it (PROG-03).
  4. A renamed or merged exercise keeps its progress and stall history, because both follow the exercise's identity (`exKey`), not its exact name (PROG-04).
  5. A bodyweight exercise is flagged as stalled after 3 sessions in a row without +1 total rep, and when every set reaches the top of the range its card shows "add weight (belt) or harder variation" with no number (PROG-05).
**Notes**:
- The bugs being fixed, from the brief: `addWeightInfo` drops skipped and blank sets before checking the top of the range, so two top sets plus a skip still says "add weight"; `isStalledSlot` compares the best single-set e1RM with the all-time max before the last 3 sessions, so extra reps on later sets never count.
- Until Phase 9 adds an explicit equipment type, "bodyweight" means what the app already treats as bodyweight (sets logged at weight 0, shown as BW). Phase 9 keeps the two definitions consistent.
- Deloaded entries stay out of both checks, as they do today. INT-04 (Phase 13) relies on this.
**Plans:** 2/3 plans executed

Plans:
- [x] 08-01-PLAN.md — Add weight judges every set on the card: a skipped or blank set blocks it (a `blankSets` marker is stamped at finish), every set must be at the working weight, the latest attempt is judged, and bodyweight suggests a belt or harder variation (PROG-01, PROG-05)
- [x] 08-02-PLAN.md — Stall is 3 flat sessions in a row, each against the one before, per workout and slot by `exKey`; deloads, skipped days and skipped sets pause, a lighter session restarts, bodyweight counts; the in-app guide matches (PROG-02..05)
- [ ] 08-03-PLAN.md — Ship: pre-flight, Ian pushes and merges with a merge commit, live bytes checked, then the real workout on Ian's phone (end-of-phase UAT)

### Phase 9: Equipment and Weight Steps
**Goal**: Every exercise knows its equipment, so suggestions, deloads, warm-ups and plate math move in steps Ian can actually load (2.5 lb for dumbbells, 5 lb for everything else), and a deload always makes the weight lighter.
**Depends on**: Phase 8 (the per-exercise step plugs into the corrected add-weight rule)
**Requirements**: EQUIP-01, EQUIP-02, EQUIP-03, EQUIP-04, EQUIP-05, EQUIP-06
**Verification**: A real workout on Ian's phone, plus the automated suite (`npm test`).
**Success Criteria** (what must be TRUE):
  1. Settings → Exercises shows each exercise's one equipment type (barbell, EZ bar, dumbbell, machine, cable or bodyweight). Ian can change it there, and the change shows on his other device after sync (EQUIP-01, EQUIP-03).
  2. After the update, every existing exercise already has an equipment type defaulted from its name, and syncing with an older device that never ran the migration, twice in a row, leaves every exercise's equipment type in place (EQUIP-02).
  3. Add-weight suggestions move by the exercise's own step: +2.5 lb for a dumbbell exercise, +5 lb for barbell, EZ bar, machine and cable. No dumbbell suggestion jumps a flat 5 lb (EQUIP-04).
  4. Deloads and warm-ups round to the exercise's own step, so a 15 lb dumbbell deload at 90% suggests 12.5 lb instead of rounding back to 15 (EQUIP-05).
  5. Plate math follows the equipment type, and the preacher curl, as an EZ bar exercise, shows plate math against a 25 lb bar (EQUIP-06).
**Notes** (this migration rewrites existing rows, so every `CLAUDE.md` migration rule applies):
- Bump `SCHEMA` (18 → 19) and add a `MIGRATIONS` entry. It must be idempotent and must never downgrade `_schema`.
- `touch()` every exercise-registry row it rewrites (stamp `mtime`) and persist immediately. A migration that only runs in memory inside `normalize()` at boot is how Migration 15 was silently reverted in production.
- Ship a stale-device merge replay test: an older device's un-migrated rows cannot revert the equipment field, and replaying that device a second time still keeps it.
- Check the merge path before planning. `DB.exercises` is not a `COLLECTIONS` entry, and `mergeDB()` appears to take the whole array from the side with the newer `updatedAt`. If so, a per-row `mtime` alone does not protect an equipment edit (EQUIP-03) from the other device's next save, and the replay test must cover that path too.
- The `SCHEMA` bump stales `test/fixtures/merge-golden.json`: regenerate it with `WRITE_MERGE_GOLDEN=1 node test/app.test.js`, and grep `test/app.test.js` for the old schema number as a bare literal (`docs/adding-a-collection.md`).
- The equipment picker is a `data-action` control with its value through `esc()`. Changing it edits synced data, so it goes through `save()`, not `saveLocal()`.
- The brief states steps in lb. What a kg user sees (today `INCREMENT.kg` is 2.5) is a question for discuss-phase, not something this roadmap decides.
**Plans**: TBD
**UI hint**: yes

### Phase 10: Log Page — History and Skip
**Goal**: Mid-workout, Ian can see how an exercise went over its last 5 sessions without leaving the workout, and can skip a whole exercise (with an optional reason, and undo) in a way that correctly blocks adding weight next time.
**Depends on**: Phase 8 (a skipped exercise blocks adding weight through PROG-01, and history follows `exKey` per PROG-04)
**Requirements**: LOG-01, LOG-02, LOG-03, LOG-04, LOG-05
**Verification**: A real workout on Ian's phone, plus the automated suite (`npm test`).
**Success Criteria** (what must be TRUE):
  1. Tapping the "Last time" line on an exercise card opens that exercise's last 5 sessions inline on the card. The workout is never left, and every set already entered is unchanged (LOG-01).
  2. The inline history links to that exercise's full chart in Progress → Strength, and coming back to the Log tab finds the workout exactly as it was (LOG-02).
  3. Each exercise card has a skip button that skips all of that exercise's sets and takes one optional reason. The skip survives reloading the app on the phone (LOG-03).
  4. A skipped exercise can be un-skipped during the workout, which restores its sets (LOG-04).
  5. After the workout is finished, the session records the exercise as skipped, and the next time that exercise comes up the app does not suggest adding weight to it (LOG-05).
**Notes**:
- Skip and un-skip are draft edits: `saveLocal()`, never `save()` (the suite's draft tripwire fails otherwise). `finishWorkout` is what writes the skip into the synced session.
- The skip reason is user text: through `esc()` when rendered, in double-quoted attributes only.
- The inline history reads through `liveSessions()`, so a deleted session never ghosts back into it.
**Plans**: TBD
**UI hint**: yes

### Phase 11: Lawn, Journal and Weather Loop
**Goal**: The lawn scheduler stops watering on cool days, remembers how much it rained, shows when watering is next due, and marks mowing, watering and rain in the journal, while the weather fetch stops looping when the phone is offline.
**Depends on**: Nothing in v1.1 for its features. Its `SCHEMA` bump takes the next number after Phase 9's.
**Requirements**: LAWN-01, LAWN-02, LAWN-03, LAWN-04, LAWN-05, LAWN-06, LAWN-07
**Verification**: Automated checks, plus a quick look on Ian's phone.
**Success Criteria** (what must be TRUE):
  1. When today's forecast high is below 60°F, the lawn scheduler holds off watering. At 60°F or warmer, watering is scheduled as before (LAWN-01).
  2. Once a day is over, its rainfall is saved with the exact amount in a new synced rain-history collection, separate from `lawnLog`, and it reaches Ian's other device. Lawn history shows 🌧 on every day with 0.1 inches of rain or more, and no mark below that, while the exact amount is kept either way (LAWN-02, LAWN-03).
  3. The 7-day outlook shows 💧 on the day watering is next due, skipping any day whose forecast rain meets the season's `rainSkip` (0.3 to 0.5 inches) or whose chance of rain is 60% or higher (LAWN-04).
  4. Week in Review in the journal shows 🚜 Mowed, 💧 Watered and 🌧 rain on each day they apply (LAWN-05).
  5. With the phone offline, a failed weather fetch on Today and on Lawn backs off instead of looping fetch → fail → render, and the test harness's `fetch` settles, so a fetch-render loop fails the suite instead of hiding (LAWN-06, LAWN-07).
**Notes** (a new collection, so `CLAUDE.md` "Adding a new tracked thing" applies step by step):
- Exactly one `COLLECTIONS` entry, placed last (after `sleep`), with a `label` no other collection uses. Its values follow the verbatim placement rule: literals or hoisted `function` references only. Retarget the existing "I am the last entry" test from `sleep` to it.
- Bump `SCHEMA` and add a `MIGRATIONS` entry, taking the next number after Phase 9's (19 → 20 if the phases ship in order). It must be idempotent and never downgrade `_schema`. Add the collection to the `INTRODUCED_AT` boot table and regenerate `test/fixtures/merge-golden.json`.
- Required tests: registry validity; a stale-device merge replay in which a deleted row stays deleted, and stays deleted when the stale device is replayed again; `validateBackup()` shape (a damaged section is refused, an older backup without the section is accepted); a declaration-alone proof that no derived consumer names the collection; UI behaviour for the history marks. If the collection is a map, the explicit-`false` replay too.
- Do not touch the exporter. The new collection exports itself.
- Rain stays out of `lawnLog` because `mergeDateMap` takes the whole inner object from the newer side, so rain written there could overwrite the other device's mowed and watered marks.
- Open for discuss-phase: rain rows come from the weather fetch, and `CLAUDE.md` says derived data uses `saveLocal()` (the weather cache once used `save()` and made a stale device look newest just by being opened). Decide how a rain row is persisted and reaches the cloud without reopening that hole.
- Open for discuss-phase: the weather cache holds only 3 past days, so a day is saved only if the app is opened within that window. Confirm with Ian whether gaps are acceptable. Open-Meteo is already an allowed host; any other host needs a CSP change.
**Plans**: TBD
**UI hint**: yes

### Phase 12: Sleep Card and Erase
**Goal**: Logging last night's sleep takes one card on Today each morning, and erasing local data no longer silently throws away the workout Ian is in the middle of.
**Depends on**: Nothing in v1.1 (uses the `sleep` collection shipped in v1.0)
**Requirements**: SLP-01, SLP-02, SLP-03
**Verification**: Automated checks, plus a quick look on Ian's phone.
**Success Criteria** (what must be TRUE):
  1. In the morning, Today shows a sleep card until last night's sleep is logged. Once it is, the card is gone for the rest of the day, reload included, following the morning weigh-in card's pattern (SLP-01).
  2. The card will not save without hours and quality, takes an optional note, and saves a row in the existing `sleep` collection dated the day Ian woke up. The row shows in Care → Sleep and on his other device after sync (SLP-02).
  3. The Erase behaviour Ian chooses holds, and a test pins it: either a local "Erase all data" during a workout leaves this device's in-progress workout on the Log tab (`wipe()` goes through `keepLocalDraft()`), or `CLAUDE.md` names `wipe()` as the one documented exception to the draft rule (SLP-03).
**Notes**:
- SLP-03 needs Ian's choice at discuss-phase. Either way it closes the v1.0 audit's `wipe()` warning.
- Saving from the card writes synced data, so it uses `save()`. The note is user text and goes through `esc()`.
**Plans**: TBD
**UI hint**: yes

### Phase 13: Strength Index and Poor-Sleep Intensity
**Goal**: Ian can see in one number whether he is getting stronger since he started, on Progress and on Today, and after a poor night the app offers a lighter workout that he accepts with one tap and that never distorts his progression history.
**Depends on**: Phase 8 (deload-like sessions stay out of stall and add-weight checks; history by `exKey`), Phase 9 (lighter weights round to each exercise's step; bodyweight exercises by equipment type), Phase 12 (last night's sleep entry, and the entry the "Log last night's sleep" link opens)
**Requirements**: STR-01, STR-02, STR-03, STR-04, STR-05, INT-01, INT-02, INT-03, INT-04, INT-05
**Verification**: Automated checks, plus a quick look on Ian's phone.
**Success Criteria** (what must be TRUE):
  1. Progress → Strength opens with a strength index and a weekly chart. The index starts at 100: for every exercise trained in the last 4 weeks, its best e1RM from those 4 weeks is divided by its best from its own first 4 weeks logged, then averaged across those exercises, with bodyweight exercises using total reps in place of e1RM (STR-01, STR-02, STR-04).
  2. A second line shows the index adjusted for bodyweight, index × (bodyweight at start ÷ bodyweight now), so the same index reads higher after Ian loses weight (STR-03).
  3. Today's week card shows one small strength number with its change over the month, in the form "Strength 112, +3 this month" (STR-05).
  4. When last night's sleep entry has quality 2 or lower, or under 6 hours, starting a workout asks "You slept poorly. Go 10% lighter today?" and one tap applies it. Nothing changes without that tap, and quality 3 with 6 hours or more asks nothing. With no sleep logged for last night, nothing changes and the Log page shows a small "Log last night's sleep" link; logging a poor night from it brings up the offer (INT-01, INT-02, INT-05).
  5. A lighter workout keeps the same sets and reps, with each suggested weight cut 10%, rounded to the exercise's step and always at least one step lighter (a 15 lb dumbbell becomes 12.5 lb; a 20 lb cable becomes 15 lb, not 20). The finished session is marked like a deload, so it never counts toward a stall or as a reason to add weight (INT-03, INT-04).
**Notes**:
- Accepting the offer edits the draft, so it persists with `saveLocal()`. The deload-like mark reaches the synced session through `finishWorkout`.
- The index and the Today number are derived from logged data. If anything is cached, it uses `saveLocal()`; this phase needs no `SCHEMA` change.
- Edge cases for discuss-phase: an exercise whose first 4 weeks overlap the last 4 weeks, and what "bodyweight at start" means when the first weigh-in comes after the first workout.
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 8 → 9 → 10 → 11 → 12 → 13

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. F1 — The COLLECTIONS Registry | v1.0 | 7/7 | Complete | 2026-09-14 |
| 2. Export for Claude | v1.0 | 3/3 | Complete | 2026-09-18 |
| 3. F3 — Adding a New Tracked Thing (Recipe) | v1.0 | 5/5 | Complete | 2026-09-22 |
| 4. Draft Goes Device-Local | v1.0 | 3/3 | Complete | 2026-09-23 |
| 5. F2 — Event Delegation | v1.0 | 6/6 | Complete | 2026-10-01 |
| 6. F4 — .gitattributes | v1.0 | 2/2 | Complete | 2026-10-02 |
| 7. Content Security Policy | v1.0 | 7/7 | Complete | 2026-10-09 |
| 8. Progression Correctness | v1.1 | 2/3 | In Progress | - |
| 9. Equipment and Weight Steps | v1.1 | 0/TBD | Not started | - |
| 10. Log Page — History and Skip | v1.1 | 0/TBD | Not started | - |
| 11. Lawn, Journal and Weather Loop | v1.1 | 0/TBD | Not started | - |
| 12. Sleep Card and Erase | v1.1 | 0/TBD | Not started | - |
| 13. Strength Index and Poor-Sleep Intensity | v1.1 | 0/TBD | Not started | - |
