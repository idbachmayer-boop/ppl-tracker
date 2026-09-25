---
phase: 05-f2-event-delegation
plan: 06
subsystem: ui-events
status: complete
tags: [event-delegation, csp-prep, log-tab, stopwatch, draft, escaping, docs]

requires:
  - phase: 05-f2-event-delegation
    plan: 05
    provides: dispatcher, event-keyed ACTIONS (incl. toggleAcc, startWorkout, skipDay), per-occurrence DELEG-03 ratchet, F2 guards and helpers (controlsIn, fakeEl, fireAction, fireListener, spyOn, f2Corpus, f2AppHtml)
provides:
  - "ACTIONS entries: swToggle, swClear, togglePreview, toggleGuide, toggleExCollapse, undeloadExercise, deloadExercise, addSet, toggleWarm, unskipSet, skipSet, rmSet, setWeight, setReps, pickEx, setNote, unskipStairs, skipStairs, stairVal, stairTimeSet, setDraftDate, setDraftDur, setSessionNote, finishWorkout, discardWorkout, setExtraWeight, setExtraReps, exRmSet, exPick, exAddSet"
  - "index.html has no inline on-event attribute; every one of the 175 inventory rows is mapped"
  - "The DELEG-03 ratchet counts wiring sites per event, so one element handling two events is one site"
  - "CLAUDE.md § Conventions: an Event handlers bullet; the Escaping bullet no longer mentions inline handlers"
  - "docs/adding-a-collection.md teaches data-action for both UI shapes"
  - "test/app.test.js: f2StaticControl, f2Log, f2Mid, f2Stall, f2MidBusy, f2MidPast, f2Find, f2At, f2LogSpied, EVIL; seven new f2Corpus states"
  - ".planning/phases/05-f2-event-delegation/05-DELEG-07-CHECKLIST.md"
affects: [phase-06, phase-07]

actuals:
  tokens: 18800
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "One element, two events, one action: the action's entry holds a handler per event (pointerdown + click on the stopwatch; input + change on the weight box), and the ratchet counts it as one wiring site"
    - "An exact-arguments sweep: spy on every function the screen's controls call, fire each rendered control once with its own event, and compare the complete call map per control (numbers stay numbers, the element stays the element, a no-op event calls nothing)"
    - "A stalled slot for tests: four earlier sessions of the same slot whose best never beats the first make isStalledSlot() true, so the coach's Deload button renders"

key-files:
  created:
    - .planning/phases/05-f2-event-delegation/05-DELEG-07-CHECKLIST.md
    - .planning/phases/05-f2-event-delegation/05-06-SUMMARY.md
  modified:
    - index.html
    - test/app.test.js
    - test/fixtures/handler-inventory.json
    - CLAUDE.md
    - docs/adding-a-collection.md
    - .planning/phases/05-f2-event-delegation/deferred-items.md

key-decisions:
  - "The ratchet's per-occurrence rule now counts wiring sites per event (the maximum over events, not the sum). The plan mapped two rows of different events on one element to one action, which the old rule read as two missing sites"
  - "Two exact-argument sweeps were added beyond the plan (lesson d): every active-workout control and every accessory control fires once and must produce exactly the call map the inline handler did"
  - "The collapsed card's summary text now goes through esc(). It is text, not an attribute, but it is on a rewritten line and carries stored w/r. The other fmtSet text sinks are deferred item 2"
  - "The F2 rule doc check loosens Markdown before scanning (a space before every on<letters>=), because the harness scanner wants whitespace before `on` and a doc wraps attributes in backticks"

requirements-completed: [DELEG-02, DELEG-04]
requirements-pending-human: [DELEG-06, DELEG-07]

duration: ~26min
completed: 2026-09-25
---

# Phase 5 Plan 06: The Log Tab Is Delegated Summary

**The Log tab now runs entirely through `dispatchAction`: the rest stopwatch, the workout picker, the active workout and the accessories, which were the last 42 inline call sites. `index.html` has no inline on-event attribute left, and every inventory row is mapped. The stopwatch still keeps the keyboard up: through the app's own non-passive listener, `swGuard` calls `preventDefault` when the keyboard is up and blurs the focused box when it is down. Typing a weight or reps stays on this device and pushes nothing, the weight rolls down when you leave the box, the exercise select prompts once, and a skip asks about "set 2". Hostile stored values in the set rows, stairs, backdated date and duration, and the extras render inert. `CLAUDE.md` and the collection recipe now teach `data-action`, and a check keeps them that way.**

## Performance

- **Duration:** about 26 minutes
- **Started:** 2026-09-25T11:07Z (BASE 7071e88)
- **Completed:** 2026-09-25T11:33Z
- **Tasks:** 3
- **Files modified:** 7 (2 created)

## Anchors

- **BASE:** `7071e88f8132302900f865261443e54817fca0e8` (7071e88). The precondition held: the suite was 867/0/2 at BASE.
- **CAPTURE:** `3a64173` (from 05-01). Comparing `fn, event, tag, was, occurrence, calls` row by row against `git show 3a64173:test/fixtures/handler-inventory.json` prints `identity unchanged`.
- **Rows mapped:** 175 of 175 (`r.every(x => x.action || x.actions.length)` prints `true`). This plan mapped the last 42: 4 static stopwatch rows, 5 `viewPicker`, 25 `viewActive`, 1 `accItem`, 7 `extraCard`.
- **`swGuard`:** byte-identical to BASE (the `diff` of the function body prints nothing).
- **Draft tables:** `DRAFT_ONLY_MUTATORS` and `DRAFT_PUSHERS` are unedited. See Deviation 4 for the plan's check command.

## Accomplishments

- **Stopwatch (static markup):** play/pause keeps `id="sw-toggle"` and `data-ph`, and carries `data-action="swToggle"`. Clear carries `data-action="swClear"`. Each entry runs `swGuard(e)` on `pointerdown` and toggles or clears on `click`.
- **Picker:** the preview toggle is `<button class="tap">` with its inner line as a block span. Start and Skip reuse `startWorkout` / `skipDay` with escaped `data-name`, and the Specialized Skip still sends `SPECIALIZED`. Guide headers send a numeric `data-i`.
- **Active workout:** the collapsed card is `<button class="ex-body tap">` with spans inside. The coach, set-row, header, select, add-set, warm-up, note, stairs, backdated-date, duration, session-note, Finish and Discard controls are all delegated. `value=` on the weight, reps, stairs level/min/sec, date and duration, and the rep-hint `placeholder=`, go through `esc()`.
- **Accessories:** the `accItem` and extras headers reuse `toggleAcc`. The extras weight box stores on `input` and rolls on `change`, reps store on `input`, and the select acts on `change` only. `value=` on both boxes is escaped.
- **Docs:** see the key decisions. The recipe's delete button is `data-action="removeX" data-id="${esc(id)}"` with an `ACTIONS` entry. The safe-id gate stays as defence in depth. The map-shaped checkbox carries the action, never the label.

## Task Commits

1. **Task 1 (code):** `ad9a846` feat(05-06): the stopwatch and the workout picker are delegated; swGuard keeps the keyboard up
2. **Task 1 (docs):** `f28fc8f` docs(05-06): teach the delegated handler pattern
3. **Task 2:** `0c1ec42` feat(05-06): the active workout is delegated; set-row values are escaped
4. **Task 3 (code):** `4c49388` feat(05-06): accessories are delegated; no inline handler is left in index.html
5. **Task 3 (checklist):** `74f8c9f` docs(05-06): the DELEG-07 phone checklist

## Red and Green Lists (TDD gates)

**Task 1 code: tests written before the production edit** (867 passed, 4 failed):
- RED: `DELEG-02: the stopwatch holds focus with the keyboard up and lets it go with the keyboard down (swGuard through the dispatcher)`, `DELEG-02: a stopwatch tap toggles once, and Clear clears once`, `DELEG-02: a program preview and a guide section open and close through the dispatcher`, `DELEG-02: Start and Skip on the Log picker reuse Today's actions`. None of these controls existed.
- After the edit: the picker check failed because 4-day mode is the default (Deviation 2). After that fix: 870/1, with `DELEG-03` naming the unmapped rows. After the inventory: 870/1 again, `data-action="swToggle" wired 1x, 2 inventory rows map to it` (Deviation 1). After the ratchet fix: **871 passed, 0 failed**.

**Task 1 docs: the checks written before the document edits** (871 passed, 2 failed):
- RED: `F2 rule: CLAUDE.md names the registry the suite enforces, and it exists in index.html` (all three names missing) and `F2 rule: the collection recipe prescribes no inline on-event attribute`. The first scan found no rows at all, because of backticks (Deviation 3). After the fix it found `click=removeX('${id}')` and `change=toggleX(i)`.
- After editing both documents: **873 passed, 0 failed**.

**Task 2: tests written before the production edit** (873 passed, 7 failed):
- RED: the six planned labels plus the added exact-arguments sweep. The sweep reported all 27 controls missing, and the stall seed already gave `busyStalled: true`.
- After the edit and the inventory: **880 passed, 0 failed**. Every DRAFT-05 check passed.

**Task 3: tests written before the production edit** (880 passed, 5 failed):
- RED: `DELEG-02: an accessory's weight, reps, exercise and set buttons route through the dispatcher`, the accessory exact-arguments sweep, `D-09: a hostile accessory value renders escaped`, `DELEG-02: every inventoried call site is now a delegated action` and `DELEG-04: index.html has no inline on-event attribute left`. The last two named the eight `accItem` / `extraCard` rows.
- After the edit and the inventory: **885 passed, 0 failed**.

## Guard Mutation Pass

After each GREEN, a script in the scratchpad applied each mutation to `index.html` with a whole-string anchor that had to match exactly once. It ran the suite, printed the failing labels, and restored the original bytes in a `finally`. `cmp` against a backup copy confirmed the file was unchanged afterwards, three times.

| Mutation | Fails by name |
|---|---|
| Clear loses `data-action` | DELEG-03, stopwatch focus, stopwatch tap |
| `swGuard()` without `e` | stopwatch focus |
| `swClear` has no `pointerdown` | DELEG-03, stopwatch focus |
| `swToggle(el)` / toggle also on `pointerdown` | stopwatch tap |
| pointerdown listener `{ passive: true }` | DELEG-02 listener |
| `toggleGuide` string index | numeric decode, preview/guide |
| preview toggle stays a div | rendered-control mapping, DELEG-06, preview/guide |
| preview inner span back to a div | D-11 |
| picker `data-name` unescaped | D-03 |
| picker Skip sends the card name / Specialized Start loses `data-action` / `togglePreview` wrong key | Start and Skip (+ DELEG-03) / preview |
| `skipSet` k as a string | numeric decode, "set 2", exact arguments |
| weight `input` also rolls / drops `updPlates` / no `change` | roll check, exact arguments (+ DELEG-03) |
| reps `change` drops `repCheck` | DELEG-03, exact arguments |
| `pickEx` also on `input` / passes `{value}` not the element | rendered-control mapping, swap once, exact arguments |
| weight, reps, stairs level, date or duration `value=` unescaped | D-09 (each one separately) |
| collapsed card stays a div / loses `data-action` / inner span a div | mapping, DELEG-06, collapse / DELEG-03 / D-11 |
| `toggleExCollapse` string index, `undeloadExercise` wrong key, Deload loses `data-action`, stairs part swapped, `setDraftDur` on `change`, `finishWorkout(el)` | exact arguments (+ numeric decode / DELEG-03 where relevant) |
| `setNote` wrapper calls `save()` | thin wrappers |
| `setWeight` `data-k` unescaped | D-03 |
| `setVal` calls `save()` (the draft rule) | DRAFT tracer, both DRAFT-05 checks, typing pushes nothing |
| `accItem` header loses `data-action` / goes back inline | DELEG-03, accessory arguments (+ both DELEG-04 checks) |
| extras weight or reps `value=` unescaped | hostile accessory |
| extras weight has no `change` / reps k a string / reps writes `w` / `exPick` also on `input` / `exRmSet` off by one / `exAddSet` wrong key / select loses `data-action` | accessory route and accessory arguments (+ numeric decode, mapping, DELEG-03) |
| extras header `data-key` unescaped | D-03 |
| a new `onmouseover` anywhere | both DELEG-04 checks |

**Equivalent mutant:** `stairVal: el => stairVal('level', el.value)` stays green. The only `stairVal` control carries `data-field="level"`, so the constant and the decoded field are the same value.

## Which accessory the extras check used

`abs`. It is assigned to PUSH 1 (`ACCESSORIES.abs.days` includes it) and is load-bearing (no `unit: 'sec'`), so one card exercises both `setExtraWeight` and `setExtraReps`. The check asserts both facts, so a change to the accessory table fails by name instead of silently testing less.

## D-09 hostile fields

None were dropped. `EVIL` (`"><img src=x onerror=alert(1)>`, built with `String.fromCharCode(34)`) in entry 0's `w` and `r`, `stairs.level`, a historical `date` and `durationMin` renders with no `<img` and at least five `&quot;&gt;&lt;img`. `viewActive` did not throw for any field.

## Final Counts

`TZ=America/Chicago npm test`: **885 passed, 0 failed, 2 skipped** (baseline 867/0/2). Each label named in the plan's `<behavior>` blocks prints exactly one `PASS` line.

## Decisions Made

See `key-decisions` in the frontmatter. The only user-visible change beyond the plan is escaping in the collapsed summary, which is invisible for any real set value (`BW`, `×` and digits pass through `esc()` unchanged).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The ratchet counted one element's two events as two wiring sites**
- **Found during:** Task 1, the inventory update
- **Issue:** the per-occurrence rule (from 05-03) needs one `data-action="x"` in the function for every row mapped to `x`. The plan maps the stopwatch's `pointerdown` and `click` rows to one action on one button, and the weight box's `input` and `change` rows to one action on one input. That's one site each, so the correct code failed `DELEG-03`.
- **Fix:** sites are counted per event, and a function needs the maximum over its events. Two rows of the same event mapped to one action (the picker's two Start buttons, the two collapse buttons) still need two sites.
- **Files modified:** test/app.test.js
- **Commit:** ad9a846

**2. [Rule 1 - Test bug] The picker check assumed 3-day mode**
- **Found during:** Task 1, first GREEN run
- **Issue:** `blank()` and migration 11 default `routineMode` to `'4day'`, so the "fixed cards" instance also rendered the five Specialized cards.
- **Fix:** the fixed-card instance sets `'3day'` explicitly. The 4-day instance checks the Specialized Start and Skip. The plan's "4-day mode" corpus state was kept as written, even though the default states already render 4-day mode.
- **Commit:** ad9a846

**3. [Rule 1 - Test bug] The recipe scan could not see a Markdown attribute**
- **Found during:** Task 1 docs, the RED run
- **Issue:** `scanInlineHandlers` needs whitespace before `on`. In the doc, both attributes followed a backtick, so the unedited doc scanned as clean and the check was red only because `data-action` was missing.
- **Fix:** the check puts a space before every `on<letters>=` that is not inside a longer word, then scans. A synthetic check proves that a backtick-wrapped and a bracketed attribute are found, and that "on-event" and `reason=` are not.
- **Commit:** f28fc8f

**4. [Rule 1 - Plan check] The plan's draft-table command compares LF to CRLF**
- **Found during:** Task 2 acceptance
- **Issue:** `git show BASE:test/app.test.js` returns the LF blob, and the working copy is CRLF (`core.autocrlf=true`), so the plan's `node -e` prints `CHANGED` for an untouched block.
- **Fix:** none to the code. With both sides normalized to LF, the same command prints `draft tables unchanged`. `git diff 7071e88 HEAD -- test/app.test.js | grep -c "^[-+]const DRAFT_\|^[-+]  \['"` prints `0`.

**5. [Rule 2 - Missing check] Exact arguments for every Log-tab control**
- **Found during:** Task 2 and Task 3, writing the tests (orchestrator lesson d)
- **Issue:** the planned checks covered some controls' behaviour, but not the argument list of each converted control.
- **Fix:** `DELEG-02: every active-workout control calls its function with exactly the arguments the inline handler passed` (27 controls across two instances, including the stalled slot's Deload button) and `DELEG-02: every accessory control calls its function with exactly the arguments the inline handler passed` (11 controls). The mutation pass shows these two sweeps catch several wrapper mutants that no behaviour check caught.
- **Commits:** 0c1ec42, 4c49388

**6. [Rule 2 - Security] The collapsed summary text is escaped**
- **Found during:** Task 2, rewriting the collapsed card
- **Issue:** the summary is `fmtSet(w, r)` of stored values, placed as HTML text on a line this plan rewrote.
- **Fix:** `${esc(summary)}`. The other `fmtSet` text sinks are outside this plan's lines and are recorded as deferred item 2.
- **Commit:** 0c1ec42

**7. [Rule 2 - Strengthening] Checks tightened beyond the plan's wording, never loosened**
- The stopwatch focus check also requires no blur while the keyboard is up.
- The stopwatch tap check fires `pointerdown` first and requires no toggle or clear from it.
- The picker check clicks every Start and Skip in both routine modes, including the `&` in `SPECIALIZED — CHEST & TRICEPS`.
- The preview check requires the toggle to be a `tap` button, and the guide check requires exactly one `phase-body` open, then none.
- The skip check also requires the Undo control to be a button.
- The accessory check asserts all three stored sets, the no-push, the unchanged `updatedAt`, add then remove (3 → 4 → 3), and that `exPick`'s entry is keyed by `change` alone.
- Both closing properties carry a synthetic proof that the scanner still finds an inline handler.

None of these changes the plan's scope.

## Issues Encountered

- A one-off `node -e` that loaded the harness to list PUSH 1's examples printed its answer, then never exited, because the app starts intervals. It hit the 2-minute tool timeout and a chained `grep` never ran. Logged as a skill observation. Scratch scripts after that went through files in the scratchpad.
- Every `index.html` edit kept CRLF. Scripted edits normalized to LF, asserted that each anchor matched exactly once, and restored CRLF. A node count of bare LFs printed `0` for each edited file after each step.
- Git's "LF will be replaced by CRLF" warning for the JSON fixture and the checklist is expected (05-01).

## Human Checks (pending, end of phase)

`human_verify_mode` is `end-of-phase`, so neither check was run here. Both come from Task 3's `<human-check>` blocks and must run in this order:

1. **DELEG-06 keyboard-only desktop pass (first, before any deploy).** The session with the browser pane runs `py -m http.server 8080` from the repo root and opens http://localhost:8080/. **Do not sign in to Cloud Sync.** Using only Tab, Shift+Tab, Enter and Space, walk every screen, then the Log tab: start PUSH 1, type a weight and reps, Tab to the stopwatch and press Enter, skip and unskip a set, collapse and expand, swap an exercise, open the warm-up ramp and an accessory, fill stairs, then History → Add a past workout for the date and minutes fields. Finish with Discard. **Expected:** every control shows the accent focus ring and activates on Enter (and Space for buttons). Enter in an input logs or adds once. No "Something broke". A failure blocks the phone check.
2. **DELEG-07 on Ian's Android phone (post-deploy).** This needs the phase PR merged and Pages published. Work through `05-DELEG-07-CHECKLIST.md` during a real workout, starting with the Settings → This version pre-flight. **Expected:** every line behaves as written. The phase is not complete until this passes.

## Known Stubs

None.

## Threat Flags

None beyond the plan's threat model.
- **T-5-16:** every `value=` the plan named, plus the rep-hint `placeholder=` and the extras boxes, goes through `esc()`. The two D-09 checks and the six "unescaped" mutations prove it.
- **T-5-17:** no wrapper reads `DB` or persists (the thin-wrapper and DRAFT-05 (F2) checks). Typing pushes nothing, and the DRAFT-05 tables are unedited.
- **T-5-18:** `swGuard` is proven through the registered non-passive listener. `pickEx` and `exPick` act on `change` alone, indexes are numeric, and every control's call map is pinned.
- **T-5-19 / T-5-20:** the keyboard-pass instructions forbid sign-in and end with Discard. The two `F2 rule` checks keep the docs honest.

## Requirements

- **Complete (ticked):** DELEG-02 (every call site delegated and every row mapped) and DELEG-04 (no inline handler of any kind in `index.html`).
- **Pending a human check, not ticked:** DELEG-06 waits on the keyboard-only desktop pass. DELEG-07 waits on Ian's phone run against the deployed build. The suite side of both is done, but neither check has run.

## Next Phase Readiness

- Phase 7's CSP can drop `'unsafe-inline'` for event handlers. `DELEG-04: index.html has no inline on-event attribute left` fails on any new inline handler, and the older DELEG-04 check refuses one that isn't in the inventory.
- Deferred items: 1 (the dispatcher's own-property gap, 05-03) and 2 (the `fmtSet` text sinks, this plan). Both are low risk and belong with VAL-02.

## Self-Check: PASSED

- FOUND: index.html, test/app.test.js, test/fixtures/handler-inventory.json, CLAUDE.md, docs/adding-a-collection.md, .planning/phases/05-f2-event-delegation/05-DELEG-07-CHECKLIST.md
- FOUND: ad9a846, f28fc8f, 0c1ec42, 4c49388, 74f8c9f
- CLAUDE.md's verbatim `placement-rule` block is untouched (`git diff 7071e88 HEAD -- CLAUDE.md | grep -c placement-rule` prints `0`).
