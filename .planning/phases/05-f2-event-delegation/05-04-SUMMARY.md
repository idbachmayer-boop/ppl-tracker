---
phase: 05-f2-event-delegation
plan: 04
subsystem: ui-events
status: complete
tags: [event-delegation, csp-prep, train, history, progress, cardio, keyboard, xss]

requires:
  - phase: 05-f2-event-delegation
    plan: 03
    provides: dispatcher, event-keyed ACTIONS, per-occurrence DELEG-03 ratchet, F2 guards and helpers (controlsIn, fakeEl, fireAction, spyOn, f2Corpus, f2AppHtml, HOSTILE), :where(button.tap) / :where(button.tap-inline) reset
provides:
  - "ACTIONS entries: editJournal, saveJournalFor, closeJournalEdit, openActivityAdd, setActAddCat, addActivityFor, cancelActivityAdd, removeActivity, weekShift, toggleBackdate, startBackdate, changeSessionDate, editSession, deleteSession, toggleHist, setRange, progSubTab, logWeight, logPetWeight, selectPR, selectExercise, rmWeight, rmPetWeight, confirmCardioImport, discardCardioImport, removeCardio, addCardio, pickCardioFile, handleCardioFile"
  - "logPetWeight shared action: passes (input, dateEl) when data-date-el is present, (input) alone otherwise. Plan 05-05 reuses it for Today's weigh-in row"
  - "test/app.test.js: f2History(), f2Progress(sub), f2StartTag(html, name) helpers; five new f2Corpus states (History x2, Progress strength and pet, Cardio with two sessions)"
affects: [05-05, 05-06]

actuals:
  tokens: 10000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "An inline link mid-sentence becomes <button class=\"tap-inline\"> with its inline style kept, so it reads as a link and takes keyboard focus"
    - "An input inside a <label> carries the action itself, on change only. The label carries none, so a tap on the label (which clicks the input) cannot dispatch twice"
    - "A shared wrapper whose later consumer is not converted yet gets a synthetic-element check for that consumer's call shape (logPetWeight with no data-date-el)"

key-files:
  created: []
  modified:
    - index.html
    - test/app.test.js
    - test/fixtures/handler-inventory.json

key-decisions:
  - "The pet Log button's arity branch has a check of its own, using a stand-in element shaped like Today's control. The Progress path alone passes both ids, so the plan's checks stayed green when the wrapper always passed two arguments"
  - "The session date input's value= got esc() (D-09) and a check with a hostile date. No existing check covered attribute escaping outside data-*"
  - "The History argument check (Edit, Delete, category, Done) was added because four wrong-key or wrong-arity mutations stayed green under the plan's six checks"

requirements-completed: []
requirements-partial: [DELEG-02, DELEG-04, DELEG-06]

duration: ~19min
completed: 2026-09-25
---

# Phase 5 Plan 04: Train Delegation (History, Progress and Cardio) Summary

**Train's History, Progress and Cardio screens now run every control through `dispatchAction`: 39 call sites in nine functions. The week offset, history row index, chart range, PR index and weigh-in indexes all arrive as numbers. At offset 0 the next-week button is disabled, and a tap on it does nothing. The note and log-activity links and the activity × are now `<button class="tap-inline">`, and the × has an accessible name. History rows and PR rows are real buttons. Before this plan, a cardio id containing `"`, `'`, `<` and `&` put its raw `<b>` into the Cardio screen. It is now inert and deletes the right session. The pet Log button passes both element ids, and a control with no date element passes one.**

## Performance

- **Duration:** about 19 minutes
- **Started:** 2026-09-25T10:17Z (BASE 4ebe3c0)
- **Completed:** 2026-09-25T10:36Z
- **Tasks:** 2
- **Files modified:** 3

## Anchors

- **BASE:** `4ebe3c08f769848181acef90c5d62cca6904b17c` (4ebe3c0). The precondition held: the suite was 837/0/2 at BASE.
- **CAPTURE:** `3a64173` (from 05-01). Inventory identity is unchanged. Comparing `fn, event, tag, was, occurrence, calls` row by row against `git show 3a64173:test/fixtures/handler-inventory.json` prints `identity unchanged`.
- **Rows mapped:** 100 of 175. Before this plan, 61 were mapped. This plan mapped 39: 11 in `renderWeekReview`, 7 in `viewHistory`, 4 in `rangeSeg`, 6 in `viewWeight`, and 1 each in `viewPetWeight`, `weightList` and `petWeightList`. It also mapped 2 in `viewStrength` and 6 in `viewCardio`. Every row in these nine functions is now mapped, and none of them still has an inline handler.

## Accomplishments

- **Week in review:** the week-shift buttons carry `data-d="-1"` and `data-d="1"`. The next button keeps its conditional `disabled`. The note and log-activity links are `<button class="tap-inline">` with their link styling kept. The journal textarea saves on `input`, and its `id` is escaped. The activity × is a `tap-inline` button with `aria-label="Remove activity"`.
- **History:** each session row is a `<button class="hist-item tap">`, with a `display:block` span inside. The date input inside the `<label>` acts on `change` only, and its `value=` is escaped. Edit and Delete, plus the backdate picker's program buttons (both lists), carry escaped data.
- **Progress:** the range buttons carry `data-range`, the five sub-tabs `data-sub`, and the PR rows are `<button class="hist-item tap">` with `data-i`. The exercise select acts on `change` only. Both delete lists carry escaped indexes.
- **Cardio:** Delete carries `data-id="${esc(c.id)}"`. Add, Choose Strava file, Save and Discard are delegated. The hidden file input imports on `change` only.

## Task Commits

1. **Task 1:** `dced108` feat(05-04): History is delegated; offsets and row indexes arrive as numbers
2. **Task 2:** `0868832` feat(05-04): Progress and Cardio are delegated; cardio ids travel as escaped data

## Red and Green Lists (TDD gates)

**Task 1: tests written, before the `index.html` edit** (837 passed, 6 failed):
- RED: `DELEG-02: the week review steps back a week with a numeric offset, and the disabled next button does nothing`, `DELEG-02: a history row opens and closes again through the dispatcher (numeric index)`, `DELEG-02: a day's journal note opens, saves with its date, and closes through the dispatcher`, `DELEG-02: logging and removing a day's activity goes through the dispatcher`, `DELEG-02: a past session's date changes once, from the date input, not its label`, `DELEG-02: Add a past workout opens the picker and starts the chosen program`. None of these controls existed before the edit.
- After the edit: 843 passed, 0 failed.
- The mutation pass added `DELEG-02: editing, deleting, the activity category and Done in History run with their arguments` and `D-09: a hostile session date stays inside the date input's value attribute`. Final: 845 passed, 0 failed.

**Task 2: tests written, before the production edit** (845 passed, 6 failed):
- RED: `DELEG-02: a range button activates its own segment (numeric range)`, `DELEG-02: the Progress sub-tabs and both Log buttons route through the dispatcher`, `DELEG-02: picking an exercise and a PR row select through the dispatcher`, `DELEG-02: deleting a weigh-in passes a numeric index`, `D-03: a hostile cardio id round-trips through data-id and deletes the right session` (`rawB: true`, so the live code rendered the hostile id's `<b>`), and `DELEG-02: the Strava file picker opens from its button, and choosing a file runs the handler once`.
- After the edit: 851 passed, 0 failed.
- The mutation pass added `DELEG-02: the shared logPetWeight action passes one argument when the control names no date element`. Final: 852 passed, 0 failed.

## Guard Mutation Pass

After each GREEN, a script applied each mutation to `index.html` and restored the original bytes in a `finally`. `cmp` against a backup confirmed the file was unchanged afterwards. In the final state, every mutation turns at least one check red by name:

| Mutation | Fails by name |
|---|---|
| `weekShift` offset read as a string | numeric decode, week review (`NaN weeks ago`) |
| next button loses `disabled` | week review |
| `toggleHist` index read as a string | numeric decode, history row, session date |
| `changeSessionDate` also on `click` | rendered-control mapping, DELEG-06, session date |
| date action moved onto the `<label>` | rendered-control mapping, session date |
| × loses `aria-label` | activity check |
| × stays a span | rendered-control mapping, DELEG-06, activity check |
| session row stays a div | rendered-control mapping, DELEG-06, history row |
| row's inner span back to a div | D-11 |
| note link stays an `<a>` | rendered-control mapping, DELEG-06, journal check |
| `editJournal` `data-iso` unescaped | D-03 |
| `saveJournalFor` drops the date / on `change` instead of `input` | journal check (+ DELEG-03) |
| `startBackdate` reads the wrong key | numeric decode, backdate check |
| a SPECIALIZED program button loses `data-action` | DELEG-03 (per occurrence) |
| `editSession` reads the wrong key / `deleteSession` read as a string | History argument check (+ numeric decode) |
| `setActAddCat` wrong key / `cancelActivityAdd` passes an argument | History argument check |
| `addActivityFor` drops the date / link loses `data-iso` / `removeActivity` wrong key | activity check |
| `closeJournalEdit` loses `data-action` | DELEG-03, journal check |
| session date `value=` unescaped | D-09 hostile session date |
| `setRange` read as a string / 90 button sends 30 | range check (+ numeric decode) |
| a range button or a sub-tab loses `data-action` | DELEG-03 (per occurrence), range / sub-tab check |
| `progSubTab` wrong key / `logWeight` passes an argument | sub-tab and Log check |
| `logPetWeight` always passes two arguments | shared logPetWeight arity check |
| pet Log drops `data-date-el` | sub-tab and Log check |
| `selectPR` read as a string | numeric decode, PR check |
| PR row stays a div | rendered-control mapping, DELEG-06, PR check |
| `selectExercise` also on `input` / on `input` alone | rendered-control mapping, PR check (+ DELEG-03) |
| `rmWeight` read as a string / `rmPetWeight` wrong key | weigh-in delete check (+ numeric decode) |
| `removeCardio` `data-id` unescaped | D-03, hostile cardio |
| `removeCardio` wrong key | numeric decode, hostile cardio |
| `handleCardioFile` also on `click` / passes nothing | Strava picker (+ mapping, DELEG-06) |
| `pickCardioFile` loses `data-action` | DELEG-03, Strava picker |
| `addCardio` passes an argument | Strava picker |
| `confirmCardioImport` loses `data-action` / Discard calls confirm | DELEG-03 |

In the first pass, six mutations stayed green. Four were in History: wrong-key `editSession`, string `deleteSession` (it was caught only by the generic numeric check), wrong-key `setActAddCat`, and a `cancelActivityAdd` that passed an argument. The other two were the unescaped session date `value=` and the always-two-arguments `logPetWeight`. Each got a check (see Deviations), and each was then re-run to red.

## Controls Left to Static Coverage

`confirmCardioImport` and `discardCardioImport` render only while `pendingCardio` is set, and that happens only after a Strava file has been parsed. `pendingCardio` is a `let`, so the harness cannot reach it. The DELEG-03 ratchet (wired, handles `click`, keeps its callee), the DELEG-04 name check and the thin-wrapper checks cover both. The mutation pass shows the ratchet catches both a dropped `data-action` and a wrapper that calls the wrong function.

## Final Counts

`TZ=America/Chicago npm test`: **852 passed, 0 failed, 2 skipped** (baseline 837/0/2).

## Decisions Made

See `key-decisions` in the frontmatter. None changes user-visible behaviour beyond what the plan specified.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing check] Four History controls had no argument check**
- **Found during:** Task 1, mutation pass
- **Issue:** the plan's six History checks never click Edit, Delete, the Productivity category or the activity panel's Done. So `editSession(+el.dataset.i)`, `setActAddCat(el.dataset.c)` and `cancelActivityAdd(el)` all stayed green. A string `deleteSession` index was caught only by the generic decode check, because `DB.sessions['3']` behaves exactly like `DB.sessions[3]`.
- **Fix:** the new check `DELEG-02: editing, deleting, the activity category and Done in History run with their arguments` requires `[[3]]`, `[[3]]`, `[["productivity"]]` and `[[]]`.
- **Files modified:** test/app.test.js
- **Commit:** dced108

**2. [Rule 2 - Missing check] No check covered the escaped session date (D-09)**
- **Found during:** Task 1, mutation pass
- **Issue:** the plan escapes `value="${s.date}"`, but the D-03 check reads only `data-*`, so reverting the `esc()` stayed green. `validateBackup()` never checks a date's content.
- **Fix:** `D-09: a hostile session date stays inside the date input's value attribute` renders an open row whose date is `2026-08-01"><b>x`. It requires no raw `<b>` and the escaped value.
- **Files modified:** test/app.test.js
- **Commit:** dced108

**3. [Rule 2 - Missing check] The shared `logPetWeight` wrapper's one-argument path was untested**
- **Found during:** Task 2, mutation pass
- **Issue:** the only control converted so far (Progress's pet Log) names both ids. A wrapper that always passed `(input, dateEl)`, and so passed `undefined` for a control with no date element, stayed green. The plan prohibits exactly that, and 05-05's Today control has that shape.
- **Fix:** `DELEG-02: the shared logPetWeight action passes one argument when the control names no date element` fires two stand-in elements, one with `data-date-el` and one without.
- **Files modified:** test/app.test.js
- **Commit:** 0868832

**4. [Rule 2 - Strengthening] Checks tightened beyond the plan's wording, never loosened**
- The session-date check also fires `click` and `input` on the date input and requires no call. It also requires the one `change` call's index to be a `number`.
- The activity check picks an item not already logged that day, so "gains a row" cannot pass on the existing seed row.
- The exercise-select check fires `click` and `input` before `change` and requires exactly one call. It also requires the action to be keyed by `change` alone.
- The Strava check also clicks Add cardio and requires `[[]]`.
- **Commits:** dced108, 0868832

## Issues Encountered

- A shell command that ran `cat > file` with no heredoc waited on stdin and hit the 2-minute tool timeout. It wrote nothing to the repo, and the next command re-created the scratch script.
- A `grep -c $'\r$'` inside a longer compound command printed 0 for both files. A node count confirmed both files are all CRLF (bare LF: 0) before each commit.

## Human Check (pending, end of phase)

Per `human_verify_mode: end-of-phase`, this check was not run here. It is recorded for the phase-end browser pass:

- Serve the repo root with `py -m http.server 8080`, open http://localhost:8080/, and do NOT sign in. Compare Train → History (a week review with a note and an activity, and an open session row) and Train → Progress (the strength PR list) with the deployed app at https://idbachmayer-boop.github.io/ppl-tracker/.
- Using only Tab, Shift+Tab, Enter and Space: step the week back and forward, open the note editor from its link, open Log activity, remove an activity with its ×, open and close a session row, and pick a PR row.
- **Expected:** everything looks as before, and the links still read as inline links in the sentence. Each of those controls takes keyboard focus with the accent ring and responds to Enter and Space. After one step back, the week title reads "Last week". Focus jumping to the top when a control re-renders the screen is older than this phase and is not a regression.
- **Why a human:** only a browser can show whether the inline buttons look the same mid-sentence and whether real keyboard focus works.

## Known Stubs

None.

## Threat Flags

None beyond the plan's threat model. T-5-02 is covered by the hostile cardio id round trip, the escaped `data-*` values (the D-03 check) and the escaped session date `value=` (the new D-09 check). T-5-13 is covered by the generic numeric-decode check plus number-arrival checks on `weekShift`, `toggleHist`, `setRange`, `selectPR`, `rmWeight`, `rmPetWeight`, `changeSessionDate`, `editSession` and `deleteSession`.

## Requirements

- **Partial, not ticked in REQUIREMENTS.md:** DELEG-02, DELEG-04 and DELEG-06. Plans 05-05 and 05-06 still convert the remaining 75 rows, and 05-06 closes these requirements.

## Next Phase Readiness

- `logPetWeight` is ready for Today's weigh-in row. Give the control `data-action="logPetWeight" data-input="<its input id>"` with no `data-date-el`, and its Enter key can use `data-action="enter" data-enter="logPetWeight"` on an input that carries the same `data-input`. The shared-arity check already pins the one-argument call.
- `logWeight` is registered too, if Today's body-weight row uses it.
- The Log tab (D-05) and Today are the remaining screens.

## Self-Check: PASSED

- FOUND: index.html, test/app.test.js, test/fixtures/handler-inventory.json, .planning/phases/05-f2-event-delegation/05-04-SUMMARY.md
- FOUND: dced108, 0868832
