---
phase: 09-equipment-and-weight-steps
plan: 04
subsystem: workout-ui
status: complete
tags: [equipment, picker, tag, settings, escaping]
requires:
  - "09-01: EQUIP_TYPES, EQUIP_LABEL, equipOf, equipKnown, weightStep, the eq* test helpers"
  - "09-02: setExerciseEquip, ACTIONS.setExEquip, the S1 Settings select, eqSelectOf"
  - "09-03: step-aware deloads, warm-ups and plate math (the tag reads the same weightStep)"
provides:
  - "equipAsk: an in-memory Set of registry ids waiting for the first-time picker, never stored"
  - "exEnsureAsk(name): exEnsure plus the D-16 question, used by resolveTypedName, pickEx and exPick"
  - "equipPickerHTML(id, name), equipTagText(name, w), cardTopWeight(sets)"
  - "ACTIONS.pickExEquip (click) → setExerciseEquip, which now clears the id from equipAsk"
  - "the D-05 tag on every expanded main card, rewritten live by updPlates"
  - "the four S2 CSS rules, and the Settings empty-state and intro copy"
  - "test helpers eqUiCard, eqPickerOf, eqTagOf"
affects: [09-05]
tech-stack:
  added: []
  patterns:
    - "in-memory UI state as a module-level Set next to collapsedEx, exported to the harness for tests only"
    - "a live readout written as textContent ahead of an existing early return"
key-files:
  created: []
  modified:
    - index.html
    - test/app.test.js
    - test/harness.js
decisions:
  - "[09-04]: the picker is keyed by registry id in equipAsk, so it follows the exercise, not the slot; switching a slot's exercise hides it and switching back shows it again until it is answered or the app reloads"
  - "[09-04]: on a time-based accessory card exEnsureAsk still queues the id, and extraCard declines to render it; the row keeps its guess, as UI-SPEC S2 says"
  - "[09-04]: equipAsk.delete(id) sits after setExerciseEquip's validity checks, so a refused type ('laser', 'toString') leaves the picker in place"
metrics:
  duration: "10 min"
  completed: "2026-10-12"
  tasks: 3
  files: 3
actuals:
  tokens: 7200
  tasks: 3
  commits: 4
---

# Phase 9 Plan 04: The first-time equipment picker, the card tag and the Settings copy Summary

A brand-new exercise that the default table can't place now asks for its equipment once, with six buttons and the likely answer highlighted. One tap stores the choice on the synced registry row, and the picker disappears. Every expanded main card shows a quiet tag such as "dumbbell · +2.5" under the exercise select. The tag changes live when the weight crosses 60 on a dumbbell. Settings → Exercises now mentions equipment in its intro and in its empty state.

## Suite lines

- Before the plan: `1073 passed, 0 failed, 2 skipped`
- After the plan: `1102 passed, 0 failed, 2 skipped`
- CSP hash after the last task: `sha256-P2fjw+DYI5VcXtwpRU9MRW+8ARDxSa3Nr4lMett/Wt4=` (`npm run csp:check` OK)

## Tasks

| # | Task | Commit |
|---|------|--------|
| 1 | Tracer: "+ Custom…" → exEnsureAsk → picker with the guess active → one tap → setExerciseEquip → save → tag | e2f0f35 |
| 2 | The picker and tag on every path: program names, existing rows, "Did you mean", accessory cards, two pickers, tags by type and unit, live | 97dd01b |
| 3 | Settings → Exercises states and copy, the refused and rendered error states, the hostile-name sweep, the layout markup | 13662a9 |

**Tracer gate (autonomous variant):** the plan is `autonomous: true` and human verification happens at the end of the phase. After the Task 1 commit I re-ran its verify (`npm run csp:check` OK, `1079 passed, 0 failed, 2 skipped`) and went on to Tasks 2 and 3. I returned no checkpoint.

## RED lines

**Task 1** (tests only; `1074 passed, 4 failed`):

```
FAIL  D-16 tracer: "+ Custom…" with a name the table cannot place stores the guess (machine, equipAt 0) and asks for the type  → {"row":{"id":"zercher-carry",…,"equip":"machine","equipAt":0,…},"asked":false}
FAIL  D-16 tracer: card 0 shows six pickExEquip buttons for zercher-carry, in EQUIP_TYPES order, with the guess (machine) active and pressed, and no tag  → []
FAIL  D-04 tracer: one tap stores dumbbell with a positive equipAt, pushes once (two in all with pickEx), and stops asking  → {"row":{…"equip":"machine","equipAt":0…},"pushes":1,"before":1,"stillAsked":false}
FAIL  D-05 tracer: card 0 then has no picker, and its tag reads "dumbbell · +2.5"  → {"picker":0,"tag":null}
```

Check (e) ("equipAsk is never stored") passed in the RED run, because nothing was stored yet.

**Task 2** (`1091 passed, 2 failed`). These are the two the plan said would fail. The program-name, existing-row, "Did you mean", two-picker, kg, hostile-type and collapsed checks already passed on Task 1's code.

```
FAIL  D-16: "+ Custom…" on the open abs card with "Zercher sit-up" shows the picker inside that card, after its exPick select  → {"picker":0,"selAt":995,"askAt":-1}
FAIL  D-05: typing 65 on a DB lateral raise card flips its tag to "dumbbell · +5", and 25 flips it back to "dumbbell · +2.5", live  → {"at65":"stale","at25":"stale"}
```

**Task 3** (`1100 passed, 2 failed`). Only the copy checks failed, as the plan expected:

```
FAIL  EQUIP-01: with nothing logged, Settings → Exercises says so, names equipment, and has no equipment select  → "…to rename or merge.</p></div>"
FAIL  EQUIP-01: the intro paragraph says the equipment under each name sets its weight step and plate math  → "…only the label they sit under."
```

## Mutation checks

Before each break I copied index.html to the scratchpad. I applied the mutant with a literal-replace script (`mutate.js`, which refuses a target found anything other than once), ran `npm run csp:hash` and the suite, and restored from the copy. `cmp` confirmed every restore was byte-identical, and `npm run csp:check` passed after each one. I never used `git checkout`.

| Task | Mutation | Check that went red |
|------|----------|---------------------|
| 1 | Drop `equipAsk.delete(id)` from setExerciseEquip | `D-04 tracer: one tap … stops asking` (stillAsked true) and `D-05 tracer: card 0 then has no picker …` (picker 6, tag null) |
| 2 (deferred from 1) | Drop `!equipKnown(name)` from exEnsureAsk | `D-16: picking the program name "Cable lateral raise" on a fresh install makes its row and never asks` (asks true) |
| 2 | Remove the tag write from updPlates | `D-05: typing 65 on a DB lateral raise card flips its tag …` (at65 / at25 "stale") |
| 2 (extra) | Drop `!isSec &&` from extraCard's picker condition | `D-16: "+ Custom…" on the time-based dead-hang card makes the row but shows no picker there` (picker 6) |
| 3 | Remove `esc(` around the name in equipPickerHTML's prompt | `T-9-23: a hostile exercise name renders escaped …` (raw `<img` in the prompt) |
| 3 (extra) | Remove `esc(` around the name in equipPickerHTML's aria-label | `T-9-23: …` (raw `<img` and an unescaped `"q"` in the aria-label) |

## Acceptance greps

- `grep -cE "^function (exEnsureAsk|equipPickerHTML|equipTagText|cardTopWeight)\(" index.html` → 4. `^let equipAsk = new Set();` → 1.
- `exEnsureAsk(` → 4 (the declaration, resolveTypedName, pickEx, exPick). `DB.draft` in the exEnsureAsk region → 0.
- A hex colour in the `.equip-ask { … .equip-grid .day-btn` CSS region → 0.
- The updPlates region has `equip-tag-` once, on the line before the `plates-` lookup and its early return. The extraCard region has `equipPickerHTML(` once.
- `to rename, merge or set their equipment.` → 1. `The equipment under each name sets its weight step and plate math.` → 1.
- These structural checks still pass: `DRAFT-05: only pickEx, exPick and finishWorkout still push from a draft function`, `F2: action wrappers never read DB and never persist`, `DELEG-04: every data-action …`, `DELEG-06: every control that acts on click is a button …`, `F2: the converted-button reset has zero specificity and no hard-coded colour`, and `DRAFT-05: picking a brand-new exercise mid-workout still pushes the new registry row`.

## UI backstop carried by 09-05

The ~380px phone render is not automated here. That render covers the picker's 3 × 2 grid with 44px buttons and the guess highlighted, the tag's legibility under the select, and the Settings rows with the select under the name. It is the 🧪 backstop row in 09-UI-SPEC.md § UI Considerations, and 09-05 Task 3's end-of-phase check on Ian's Android PWA carries it.

## Deviations from Plan

None that change behaviour. Small notes:
- The CSS rules sit inside the `/* Exercise log card */` group, after `.lasttime`, and are copied verbatim from UI-SPEC § S2.
- The rewritten updPlates reads the entry once and reuses it for the plate line. The plate output is unchanged, and every existing plate check still passes.
- I added two mutations beyond the plan's list: the time-based guard in extraCard, and the aria-label escape.
- The plan's "partial" case names a session entry whose `exId` is `ghost-lift`. With no registry row, exLabel shows the raw key `ghost-lift`, which is how Settings already labelled such rows. The test asserts the guessed-type line and that no select is rendered.

## Known Stubs

None.

## Threat Flags

None beyond the plan's threat model. Each of these has a check: T-9-23 (the hostile-name sweep, mutation-proved twice), T-9-24 (hostile stored type in the tag, the Settings select and the card), T-9-25 ('laser' and 'toString' refused with no write, push or toast), T-9-26 (the DRAFT-05 pushers check and the region grep), T-9-27 (equipAsk never stored) and T-9-29 (csp:hash after every script edit, csp:check in every verify).

## Self-Check: PASSED

- FOUND: index.html, test/app.test.js, test/harness.js
- FOUND: e2f0f35, 97dd01b, 13662a9
- `npm run csp:check` OK; `TZ=America/Chicago npm test` → `1102 passed, 0 failed, 2 skipped`
