---
phase: 05-f2-event-delegation
plan: 02
subsystem: ui-events
status: complete
tags: [event-delegation, csp-prep, settings, ideas, xss, keyboard]

requires:
  - phase: 05-f2-event-delegation
    plan: 01
    provides: dispatchAction, event-keyed ACTIONS, handler-inventory ratchet, F2 guards and helpers, :where(button.tap) reset
provides:
  - "ACTIONS entries: openIdeas, ideasBackdrop, closeIdeas, addIdea, copyIdeas, saveEditIdea, cancelEditIdea, toggleIdeaDone, startEditIdea, removeIdea, setUnit, setRoutineMode, setPetName, removeItem, addItem, exportMarkdown, pickImportFile, importData, wipe, doExMerge, renameExercise, toggleTrash, restoreDeleted, toggleVersions, restoreSnapshot, restoreCloudVersion, pushNow, syncSignOut, syncSignIn, syncCreateAccount"
  - "harness: renderIdeasList export, setSelectionRange stub, cloudVersionList accessor"
  - "test/app.test.js: HOSTILE id constant (reusable by 05-04), f2IdeasList/f2AppHtml helpers, four new f2Corpus states"
affects: [05-03, 05-04, 05-05, 05-06]

actuals:
  tokens: 12800
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "A template helper that emitted an inline handler takes a literal attribute fragment per call site (versionsCardHTML's row(…, act))"
    - "A div around interactive content (the Ideas backdrop) keeps its own e.target === el test in the wrapper, because the dispatcher resolves every action-less tap inside it to the div"
    - "A picker button clicks the hidden file input synchronously inside the tap; the input's action has change only, so the synthesized click does nothing"

key-files:
  created: []
  modified:
    - index.html
    - test/app.test.js
    - test/harness.js
    - test/fixtures/handler-inventory.json

key-decisions:
  - "Cancel in the idea editor carries a harmless data-id so the plan's own assertion (Save and Cancel both carry the id) holds. cancelEditIdea() still takes no argument"
  - "The rename-exercise check asserts on the prompt's arguments, not its message: renameExercise passes the name as the default value under a fixed message"
  - "The export-placement check counts Settings controls whose action's click source calls exportMarkdown(, in place of the inline-handler regex. Retargeted in the same step as the conversion"

requirements-completed: []
requirements-partial: [DELEG-02, DELEG-04, DELEG-06]

duration: ~16min
completed: 2026-09-25
---

# Phase 5 Plan 02: Settings and Ideas Sheet Delegation Summary

**Every control in Settings and the Ideas sheet, 37 call sites, now reaches its function through `dispatchAction`. Idea, exercise and cloud-version ids travel as `data-id="${esc(id)}"`, and a test with an id containing `"`, `'`, `<` and `&` proves each one is inert and acts on the right row. Before this plan the cloud-version id sat unescaped inside inline-handler quotes, and the red run showed its raw `<b>` in the rendered Settings HTML. The Recently deleted and Version history headers are real buttons now. The Ideas backdrop keeps its reviewed div exception.**

## Performance

- **Duration:** about 16 minutes
- **Started:** 2026-09-25T09:41Z
- **Completed:** 2026-09-25T09:57Z
- **Tasks:** 3
- **Files modified:** 4

## Anchors

- **BASE:** `658c06b93cee50f1fa9e16b1befb375828aa83ad` (658c06b)
- **CAPTURE:** `3a64173` (from 05-01). Inventory identity is unchanged: the check against `git show 3a64173:test/fixtures/handler-inventory.json` prints `identity unchanged`.
- **Rows mapped:** 41 of 175. 05-01 mapped 4, and this plan mapped 37: 10 for Ideas, 16 for Settings and 11 for trash, versions and sync. No row in `renderIdeasList`, `viewData`, `exercisesCardHTML`, `trashCardHTML`, `versionsCardHTML` or `syncCardHTML` is unmapped. The only inline handlers left in the static markup belong to the stopwatch (`swGuard` ×2, `swToggle`, `swClear`).

## Accomplishments

- **Ideas sheet:** the FAB, Close, Add idea, Copy all and every list control run through the dispatcher. The done checkbox acts on `change` only. The edit textarea's `id="idea-edit-${esc(i.id)}"` is escaped too (D-09).
- **Backdrop:** a `div` with `data-action="ideasBackdrop"` and no role or tabindex (D-08). The wrapper keeps `e.target === el`. A tap inside the sheet resolves to the backdrop but does not close it.
- **Settings:** units, routine, pet name, hobbies, productivity, backup, Erase and the exercises card are all delegated. The pet name's two-statement handler became one `change` action that calls `setPetName` and then `render` (D-02). Import opens the picker synchronously, and the file input imports only on `change`.
- **Trash and Version history:** both headers, open and closed, are `<button class="row tap">` with block spans inside. Restores take `+el.dataset.i` or the exact id.
- **Cloud Sync:** Sign in, Create account, Check for updates, Sign out and Reload now call the same functions with the same arguments as before.
- **Export test (Pitfall 8):** the label is unchanged. `onclickCount` is gone, and `exportControls === 1` checks the property.

## Task Commits

1. **Task 1:** `3105ea1` feat(05-02): the Ideas sheet is delegated; idea ids travel as escaped data
2. **Task 2:** `9323d24` feat(05-02): Settings is delegated; the export test asserts the property
3. **Task 3:** `7475315` feat(05-02): trash, version history and sync are delegated; their headers are buttons

## Red and Green Lists (TDD gates)

**Task 1, tests written, before the `index.html` edit** (816 passed, 5 failed):
- RED: `DELEG-02: the Ideas sheet opens, closes, adds and copies through the dispatcher`, `DELEG-06: the Ideas backdrop closes only on a tap on the backdrop itself`, `D-03: a hostile idea id round-trips through data-id and deletes the right idea`, `DELEG-02: ticking an idea done fires once per change, and a click on the checkbox does nothing`, `DELEG-02: rewording an idea saves through the dispatcher`.
- After the edit: 821 passed, 0 failed.

**Task 2, tests written, before the production edit** (821 passed, 4 failed):
- RED: `DELEG-02: the pet name saves and redraws on change through one action (D-02 chain)`, `DELEG-02: Import backup opens the file picker, and choosing a file runs importData once`, `DELEG-02: units, routine and list edits route through the dispatcher`, `D-03: a hostile exercise id round-trips through data-id`.
- **Export retarget order:** the `export: Settings shows Export for Claude…` check was retargeted to `exportControls` in the same step as the `viewData` conversion, before the suite ran again. It was never run red on its own, because the old form would have failed once the literal was gone.
- After the edit: 825 passed, 0 failed.

**Task 3, tests written, before the production edit** (825 passed, 4 failed):
- RED: `DELEG-06: Recently deleted and Version history open and close from a button`, `DELEG-02: restoring a deleted item and a snapshot pass numeric indexes`, `D-03: a hostile cloud version id round-trips through data-id` (`rawB: true`, meaning the live code rendered the hostile id's `<b>` unescaped), `DELEG-02: every Cloud Sync button runs its sync call through the dispatcher`.
- After the edit: 829 passed, 0 failed.

## Guard Mutation Pass

After each GREEN step, each mutation below was applied to `index.html` by a script that restores the original bytes in a `finally`. Every mutation turned at least one check red by name:

| Mutation | Fails by name |
|---|---|
| backdrop wrapper drops `e.target === el` | DELEG-06 backdrop (`onChild: 1`) |
| backdrop gains `tabindex="0"` | DELEG-06 backdrop |
| `removeIdea` `data-id` unescaped | D-03 esc, D-03 hostile idea (`rawB`) |
| `toggleIdeaDone` also on `click` | DELEG-02 rendered-control mapping, DELEG-06 button, checkbox-once |
| `data-action="openIdeas"` dropped | DELEG-03 ratchet, Ideas-sheet check |
| `saveEditIdea` wrapper loses the id | rewording check |
| Cancel's `data-id` dropped | rewording check |
| `copyIdeas` wrapper passes an argument | Ideas-sheet check (arity) |
| .md button wired to `exportData` | export placement (`exportControls: 0`), DELEG-03 |
| Import also calls `exportMarkdown` | export placement (`exportControls: 2`) |
| pet chain drops `render()` | DELEG-03 (`lost call render`), pet-name chain |
| pet name also on `input` | pet-name chain (`events: input,change`) |
| `importData` also on `click` | rendered-control mapping, DELEG-06 button, import-once |
| picker click deferred with `setTimeout` | import-once (`opened: 0`) |
| `removeItem` index read as a string | numeric decode |
| `renameExercise` `data-id` unescaped | D-03 esc, D-03 hostile exercise |
| `setUnit` reads the wrong key | units/routine/list |
| `removeItem` ignores the category | units/routine/list |
| `restoreSnapshot` index read as a string | numeric decode, numeric restore |
| `data-kind` unescaped | D-03 esc |
| cloud `data-id` unescaped | D-03 esc, D-03 hostile cloud version |
| trash open header left as a div | rendered-control mapping, DELEG-06 button (static and rendered), header toggle |
| a `<div>` inside the versions header button | D-11 |
| Create account calls `syncSignIn(false)` | sync buttons |
| Check for updates loses `false` | sync buttons |
| snapshot rows lose their `data-action` | DELEG-03 (versions multi-action row), numeric restore |
| cloud restore reads `dataset.i` | numeric decode, D-03 hostile cloud version |
| `restoreDeleted` ignores the kind | numeric restore (`kind`) |

The static D-03 esc check is the only check that catches an unescaped `data-kind`, because kinds are app-controlled literals.

## Final Counts

`TZ=America/Chicago npm test`: **829 passed, 0 failed, 2 skipped** (baseline 816/0/2).

## Decisions Made

See `key-decisions` in the frontmatter. None of them changes production behaviour beyond what the plan specified.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The plan's Cancel spec and its own assertion disagreed**
- **Found during:** Task 1
- **Issue:** `<behavior>` requires the Save and Cancel controls to both have `data.id === 'i2'`, but `<action>` gives Cancel only `data-action="cancelEditIdea"`.
- **Fix:** Cancel also carries `data-id="${esc(i.id)}"`. The wrapper is still `() => cancelEditIdea()`, so the argument and arity are unchanged. A mutation that drops the attribute fails the rewording check.
- **Files modified:** index.html
- **Commit:** 3105ea1

**2. [Rule 3 - Blocking] The rename prompt's message does not contain the name**
- **Found during:** Task 2
- **Issue:** `<behavior>` says the recorded prompt's message contains the row's name. `renameExercise` calls `prompt('Name for this exercise:', r.name)`, so the name is the default value.
- **Fix:** the check asserts that one prompt was recorded and that one of its arguments contains the name. It also checks that an empty answer leaves the name unchanged.
- **Files modified:** test/app.test.js
- **Commit:** 9323d24

**3. [Rule 2 - Strengthening] Checks tightened beyond the plan's wording, never loosened**
- The backdrop check also asserts that the backdrop's start tag has no `tabindex` or `role` (D-08).
- The checkbox check also fires `input` and requires no toggle.
- The Ideas-sheet check requires exactly one control per action.
- The import check also requires that the input's own click leaves the picker count at 1.
- The units check requires at least two hobbies first, so "removes the first" can be told apart from "removes one".

**4. [Rule 3 - Blocking] A harness comment would have ended a template literal**
- **Found during:** Task 3
- **Issue:** the api object in `test/harness.js` is built inside a template literal, so backticks in the new comment would have ended the string early. A `sed -i` fix also stripped every CR from the file.
- **Fix:** plain words in the comment, and CRLF restored across the file. The diff is the three intended lines.
- **Files modified:** test/harness.js
- **Commit:** 7475315

## Issues Encountered

- `node -e` with `loadApp` never exits (the app starts intervals), so ad hoc probes must call `process.exit`. The suite already does.
- Line endings: `core.autocrlf=true`. The inventory rewrite script writes LF with one-space indent and a trailing newline, which round-trips byte-identically. Git's "LF will be replaced by CRLF" warning is expected.

## Human Check (pending, end of phase)

Per `human_verify_mode: end-of-phase`, this is recorded for the phase-end browser pass and was not run here:

- Serve the repo root with `py -m http.server 8080` and open http://localhost:8080/. Do NOT sign in.
- Open Settings. Compare the Recently deleted and Version history cards, open and closed, with the deployed app at https://idbachmayer-boop.github.io/ppl-tracker/.
- Tab to each header, then press Enter, then Space.
- Tap the 💡 button, type an idea and Add it. Tap the backdrop above the sheet (it should close), reopen it, and tap inside the sheet (it should stay open). Press Copy all.
- Press Import backup, then cancel the chooser.
- **Expected:** both cards look exactly as before in both states. Each header shows the accent focus ring and toggles on Enter and on Space. The idea is listed. The sheet closes only from the backdrop or Close. Copy all shows "Copied ✓". Import opens the file chooser. No "Something broke" card appears.

## Known Stubs

None.

## Threat Flags

None beyond the plan's threat model. The checks listed there cover T-5-02 (hostile ids for ideas, exercises and cloud versions), T-5-08 (import once per file, and the unchanged functions own their confirms), T-5-09 (no deferred wrapper, where a mutation that defers the picker fails) and T-5-10 (backdrop self-only close).

## Requirements

- **Partial, and not ticked in REQUIREMENTS.md:** DELEG-02, DELEG-04 and DELEG-06. Plans 05-03 through 05-06 still convert the remaining 134 rows, and 05-06 closes these requirements.

## Next Phase Readiness

- `HOSTILE` is a top-level const in the F2 section of `test/app.test.js`. Plan 05-04 can reuse it, provided its checks come after the declaration.
- `f2AppHtml(a)` and `f2IdeasList(a)` are available to later checks, which must also come after their declarations.
- The Settings corpus states stub `firebase = {}` on their own instance only.

## Self-Check: PASSED

- FOUND: index.html, test/app.test.js, test/harness.js, test/fixtures/handler-inventory.json
- FOUND: 3105ea1, 9323d24, 7475315
