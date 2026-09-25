---
phase: 05-f2-event-delegation
plan: 05
subsystem: ui-events
status: complete
tags: [event-delegation, csp-prep, today, weigh-in, mobility, todos, keyboard, enter-to-submit]

requires:
  - phase: 05-f2-event-delegation
    plan: 04
    provides: dispatcher, event-keyed ACTIONS (incl. enter, goSub, logWeight, logPetWeight with its one-argument path), per-occurrence DELEG-03 ratchet, F2 guards and helpers (controlsIn, fakeEl, fireAction, fireListener, spyOn, f2Corpus, f2AppHtml), kicker(t, 'span'), :where(button.tap) reset
provides:
  - "ACTIONS entries: startWorkout, skipDay, setPickCat, shufflePick, didPick, selectPick, saveJournal, toggleAcc, openChart, toggleMobSession, toggleMobility, addTodo, doneTodo, removeTodo, snoozeBackup"
  - "toggleAcc, startWorkout and skipDay are registered for the Log tab's reuse in plan 05-06"
  - "logRow(id, act, hint): act.enter / act.click are literal attribute fragments written at the two call sites; the hint is not escaped inside logRow"
  - "test/app.test.js: f2Today(seed), f2SeedSpecialized(a), f2Evening(a) (per-instance 20:00 clock), f2TodayWeighIn(); ten new f2Corpus states for Today"
affects: [05-06]

actuals:
  tokens: 11200
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "A templated row whose handler was a string parameter takes an object of literal attribute fragments ({ enter, click }), so action names stay literal in the source and the ratchet can find them"
    - "A per-instance clock: replace a.__sandbox.Date with a class frozen at another hour on the same calendar day, to reach a view's time-of-day variant (the evening card order) without touching the shared frozen clock"
    - "A banner behind a module-level let (quotaBannerShown) is reached the way a device reaches it: a localStorage.setItem that throws a quota error during save()"

key-files:
  created:
    - .planning/phases/05-f2-event-delegation/05-05-SUMMARY.md
  modified:
    - index.html
    - test/app.test.js
    - test/fixtures/handler-inventory.json

key-decisions:
  - "The evening week card was converted in Task 1, not Task 2. Its inventory row has the same handler text as the week link, and the ratchet counts inline occurrences, so converting only one of the two left the other row failing as 'dropped'"
  - "The week card renders only in the evening order, which the frozen midday clock never reaches. It is covered by a per-instance 20:00 clock (f2Evening) in a check and in a corpus state"
  - "Two mutations that survived the plan's checks got argument pins: toggleMobSession(el) and addTodo(el). Neither function reads an argument today, but 05-04 found the same gap and lesson (d) asks for exact argument lists on every converted control"

requirements-completed: []
requirements-partial: [DELEG-02, DELEG-04, DELEG-06]

duration: ~27min
completed: 2026-09-25
---

# Phase 5 Plan 05: Today Delegation Summary

**Every control on Today now runs through `dispatchAction`: 32 call sites in `viewToday` and the mobility checklist in `mobilityRows`. Enter in the weigh-in box logs exactly once, the Log button logs exactly once, and Enter on the focused Log button adds nothing through `keydown`. Today's pet row still calls `logPetWeight('pet-input')` with one argument, and its placeholder is escaped once, not twice. A Chart button sets the Progress view and opens it in one action. A mobility checkbox toggles once per change, and a click forwarded from its label does nothing. Un-ticking stores an explicit `false`. The weigh-in and mobility headers and the weather, week and cardio cards are now real buttons with block spans inside. Workout names travel as escaped `data-name` values.**

## Performance

- **Duration:** about 27 minutes
- **Started:** 2026-09-25T10:36Z (BASE cde1d91)
- **Completed:** 2026-09-25T11:03Z
- **Tasks:** 3
- **Files modified:** 3

## Anchors

- **BASE:** `cde1d917336bd2be9fb07570e2080b24eb7bf2cd` (cde1d91). The precondition held: the suite was 852/0/2 at BASE.
- **CAPTURE:** `3a64173` (from 05-01). Comparing `fn, event, tag, was, occurrence, calls` row by row against `git show 3a64173:test/fixtures/handler-inventory.json` prints `identity unchanged`.
- **Rows mapped:** 133 of 175. Before this plan, 100 were mapped. This plan mapped all 32 `viewToday` rows (the two templated `logRow` rows as `actions: ["logWeight","logPetWeight"]`) and the one `mobilityRows` row. None of these rows is left unmapped, and neither function has an inline handler left.
- **`DRAFT_PUSHERS`:** `git diff cde1d91 -- test/app.test.js | grep -c "^[-+]const DRAFT_PUSHERS"` prints `0`. `startWorkout` and `skipDay` are unchanged, so their `saveLocal()` / `save()` split is untouched, and every Phase 4 `DRAFT` check passes.

## Which state reached each workout-card variant

The frozen clock is Friday 7 Aug 2026, 12:00 Chicago: a workout day (`WORKOUT_DAYS` includes 5), in the afternoon card order.

| Variant | State |
|---|---|
| Fixed next workout (Start / Skip) | `populatedDB` as is. Its last live session is PUSH 2, so `nextWorkout()` is `LEGS 2` |
| Specialized options (5 × Start, Skip `SPECIALIZED`) | `populatedDB` + `routineMode = '4day'` + a PULL 1 session yesterday (`f2SeedSpecialized`), so `nextWorkout()` is `SPECIALIZED` |
| Resume | `populatedDB` + `draft = fullDraft(a, 'PUSH 1')` |
| Evening week card | any DB + `f2Evening(a)`: this instance's clock is 20:00 on the same day |

The Specialized check includes `SPECIALIZED — CHEST & TRICEPS`, so the `&` round-trips through `data-name="${esc(o.name)}"` and reaches `startWorkout` intact.

## Storage banner: reachable

`quotaBannerShown` is a `let`, but the suite reaches it the way a full device does. The check replaces `localStorage.setItem` with one that throws a quota error, calls `save()`, and restores `setItem`. `handleQuotaFailure()` sets the flag and re-renders. The banner's Export now and Settings buttons are clicked and asserted (`[[]]` and `TAB === 'settings'`). A corpus state renders both banners together.

## Accomplishments

- **Workout card:** Resume is `data-action="goSub" data-tab="train" data-sub="log"`. Start and Skip carry `data-name="${esc(nxt)}"`, the Specialized options carry `data-name="${esc(o.name)}"`, and their Skip carries `data-name="SPECIALIZED"`.
- **Pick-a-thing card:** the category segments, Something else and I did it are delegated. The selector acts on `change` only.
- **Journal:** the textarea saves on `input`. The week link is `<button class="tap-inline">` with its link styling kept.
- **Weigh-in card:** `logRow(id, act, hint)` builds the input with `id="${esc(id)}"`, the unescaped `placeholder="${hint}"` and `${act.enter}`, and the button with `${act.click}`. The header is `<button class="row tap">` with `kicker(…, 'span')`. The two Chart buttons are `data-action="openChart" data-prog="body"` / `"pet"`.
- **Shortcut cards:** weather, week and cardio are `<button class="card tap">` with `data-action="goSub"`. Every inner div is now a `display:block` span, including the cardio progress bar's two divs, and each kicker takes `'span'`.
- **Mobility card:** the header is `<button class="row tap">`, and the session button is delegated. In `mobilityRows`, the checkbox carries `data-action="toggleMobility" data-i="${esc(i)}"`. The `<label>` carries nothing.
- **To-dos:** the box is `data-action="enter" data-enter="addTodo"`. Add, the tick box (`change` only), × and Show more are delegated, with numeric indexes.
- **Banners:** Export, Settings, Set up sync and Later are delegated.

## Task Commits

1. **Task 1:** `c427411` feat(05-05): Today's workout, pick and journal cards are delegated
2. **Task 2:** `07dbcc3` feat(05-05): Today's weigh-in, shortcut and mobility cards are delegated; Enter logs once
3. **Task 3:** `565ac9e` feat(05-05): Today's to-dos and banners are delegated

## Red and Green Lists (TDD gates)

**Task 1: tests written, before the `index.html` edit** (852 passed, 5 failed):
- RED: `DELEG-02: Start and Skip on Today pass the workout name through data-name`, `DELEG-02: with a workout in progress, Resume opens the Log tab`, `DELEG-02: the pick-a-thing card routes category, shuffle, done and the selector through the dispatcher`, `DELEG-02: the journal box saves on input through the dispatcher`, `DELEG-06: the week link under the journal box is an inline button that opens History`. None of these controls existed.
- After the edit and the Task 1 inventory rows: 856 passed, 1 failed (`DELEG-03`, the week card's row, see Deviation 1). After converting the week card too: 857 passed, 0 failed.
- The evening check was added: 858 passed, 0 failed.

**Task 2: tests written, before the production edit** (858 passed, 5 failed):
- RED: `DELEG-02: Enter in the weigh-in box logs once, and the Log button logs once`, `DELEG-02: Enter in Today's pet weigh-in box passes one argument, as before`, `DELEG-02: a Chart button sets the Progress view and opens it (D-02 chain)`, `DELEG-02: a mobility checkbox toggles once per change, never on the label's forwarded click`, `DELEG-06: Today's weigh-in and mobility headers and the weather, week and cardio cards are buttons`. The last one's week term already passed, from Task 1.
- After the edit: 863 passed, 0 failed. The mutation pass added the session-button check. Final: 864 passed, 0 failed.

**Task 3: tests written, before the production edit** (864 passed, 3 failed):
- RED: `DELEG-02: Enter in the to-do box adds one to-do, and ticking one fires once with a numeric index`, `DELEG-02: Show more expands the to-do list through toggleAcc`, `DELEG-02: the backup and storage banners' buttons route through the dispatcher`. Both banners rendered: the RED output shows `banner: true` and `quota: true`, with no controls.
- After the edit: 867 passed, 0 failed. The mutation pass then tightened the to-do check, and the suite stayed at 867.

## Guard Mutation Pass

After each GREEN, a script applied each mutation to `index.html`, ran the suite, and restored the original bytes in a `finally`. `cmp` against a backup confirmed the file was unchanged afterwards. In the final state, every mutation turns at least one check red by name, except one equivalent mutant (below).

| Mutation | Fails by name |
|---|---|
| `startWorkout` reads the wrong key / `skipDay` passes nothing | Start and Skip |
| Specialized or fixed `data-name` unescaped | D-03 |
| Specialized Skip sends an option name | Start and Skip |
| fixed Skip loses `data-action` | DELEG-03, Start and Skip |
| Resume sends `history` | Resume |
| `startWorkout` wrapper calls `save()` | thin wrappers |
| `setPickCat` wrong key / productivity sends hobby / `didPick(el)` / shuffle loses `data-action` | pick card (+ DELEG-03) |
| `selectPick` also on `input` / on `click` | rendered-control mapping, pick card (+ DELEG-03, DELEG-06) |
| `saveJournal` on `change` | DELEG-03, journal |
| week link stays an `<a>` / week card stays a div | rendered-control mapping, DELEG-06, week link / evening week card |
| week card kicker without `'span'` / inner span back to a div | D-11 |
| `logRow` escapes the hint | pet weigh-in (`&amp;#39;`) |
| weigh-in box loses `data-enter` | DELEG-03, weigh-in |
| pet box loses `data-input` / pet Log gains `data-date-el` | pet weigh-in |
| `logWeight` gains a `keydown` | only-Enter-keydown, rendered-control mapping, weigh-in |
| `enter` runs on any key | location box (05-03), weigh-in |
| `openChart` forgets `progSub` / sets it after navigating / pet Chart sends body | Chart |
| `toggleMobility` on `click` | DELEG-03, mapping, DELEG-06, mobility |
| `toggleMobility` index as a string | numeric decode |
| mobility action moved onto the `<label>` | mapping, mobility |
| mobility `data-i` unescaped | D-03 |
| `toggleAcc` wrong key | numeric decode (`k`), mobility |
| weigh-in header stays a div / weather card stays a div | mapping, DELEG-06, headers-and-cards |
| weigh-in / cardio kicker without `'span'`, mobility header or cardio bar inner div | D-11 |
| cardio card loses `data-action` | DELEG-03, headers-and-cards |
| `toggleMobSession(el)` | session button (added, see Deviation 3) |
| to-do box loses `data-enter` / Add loses `data-action` | DELEG-03, to-do |
| `addTodo` gains a `keydown` | only-Enter-keydown, mapping |
| `addTodo(el)` | to-do (tightened, see Deviation 4) |
| `doneTodo` on `click` / also on `click` / index as a string | mapping, DELEG-06, to-do (+ DELEG-03, numeric decode) |
| `doneTodo` `data-i` unescaped | D-03 |
| `removeTodo` wrong key / off by one | to-do |
| Show more sends the wrong key | Show more |
| Later / either Export loses `data-action` | DELEG-03, banners |
| `snoozeBackup(el)` / Set up sync or Settings sends `today` | banners |

**Equivalent mutant:** giving the weigh-in Log button the `enter` fragment too puts a second `data-action` on the tag. A browser keeps the first attribute, and so does `controlsIn`, so the button still runs `logWeight` and nothing changes. It stays green, correctly.

## Final Counts

`TZ=America/Chicago npm test`: **867 passed, 0 failed, 2 skipped** (baseline 852/0/2).

## Decisions Made

See `key-decisions` in the frontmatter. None changes user-visible behaviour beyond what the plan specified.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The week card's conversion moved from Task 2 into Task 1**
- **Found during:** Task 1, first GREEN run
- **Issue:** the week link (row 24, `goSub('train','history')`, occurrence 1) and the evening week card (row 31, the same text, occurrence 2) share handler text in `viewToday`. The ratchet requires an unmapped row to appear inline at least `occurrence` times. Converting the link left one inline copy, so the untouched row 31 failed `DELEG-03` as "dropped without a mapping".
- **Fix:** the week card was converted and mapped in Task 1. That adds `DELEG-06: Today's evening week card is a whole-card button that opens History`, the `f2Evening(a)` per-instance clock, and a corpus state for the evening order.
- **Files modified:** index.html, test/app.test.js, test/fixtures/handler-inventory.json
- **Commit:** c427411

**2. [Rule 2 - Missing check] The plan's DELEG-06 cards check assumed the week card renders at midday**
- **Found during:** Task 2, writing the tests
- **Issue:** the afternoon card order has no week card, and the evening order has no weather card, so no single render at the frozen clock shows weather, week and cardio together.
- **Fix:** the check renders midday with `setup()` (weigh-in and mobility headers, weather, lawn, cardio) and an evening instance (the week card). The weather card is identified as the `card tap` button carrying the temperature and `Lawn →`, apart from the lawn card's own `care/lawn` buttons.
- **Commit:** 07dbcc3

**3. [Rule 2 - Missing check] The mobility session button had no argument check**
- **Found during:** Task 2, mutation pass
- **Issue:** `toggleMobSession: { click: el => toggleMobSession(el) }` stayed green.
- **Fix:** `DELEG-02: the mobility session button toggles through the dispatcher with no argument` requires `[[]]`. It also checks the real toggle: `__session` becomes `'yoga'`, then an explicit `false` (CLAUDE.md: absence never means "off").
- **Commit:** 07dbcc3

**4. [Rule 2 - Missing check] `addTodo`'s argument list was unpinned**
- **Found during:** Task 3, mutation pass
- **Issue:** `addTodo: { click: el => addTodo(el) }` stayed green, because `addTodo` reads the box itself.
- **Fix:** the to-do check spies on `addTodo` and requires `[[],[]]` from one Add click plus one Enter.
- **Commit:** 565ac9e

**5. [Rule 2 - Strengthening] Checks tightened beyond the plan's wording, never loosened**
- The Resume check first sets `subState.train = 'history'`, so "opens the Log sub" cannot pass on the default. It also requires `TAB` to have been `today`.
- The pick check fires `click` and `input` on the select before `change`, and requires one call and a registry entry keyed by `change` alone.
- The journal check fires `click` first and requires no save.
- The weigh-in check also fires a click inside the box and requires no log.
- The pet check adds a hostile pet name (`Fr"><b>x`): no raw `<b>`, and the placeholder reads `Fr&quot;&gt;&lt;b&gt;x&#39;s weight` (T-5-02).
- The mobility check also requires un-ticking to store an explicit `false` on the same key.
- The to-do check fires a non-Enter key and a click in the box first, and requires both to add nothing. It clicks the × and requires a soft delete (the row stays, with `deletedAt`). It requires the numeric index from a spy.
- The Show more check also collapses the list again (5 → 7 → 5).
- The banners check clicks every button in both banners.
- **Commits:** c427411, 07dbcc3, 565ac9e

None of these changes the plan's scope. No production behaviour differs from the plan.

## Issues Encountered

- A compound shell command began with a stray `cat > file` that had no heredoc. It waited on stdin and hit the 2-minute tool timeout. The node edit that followed it had also failed, on a multi-line anchor written with `\n` against a CRLF file, so nothing was written. The stray process was killed by PID. After that, every edit ran from a script in the scratchpad that normalizes CRLF to LF, asserts each anchor matches exactly once, and restores CRLF. A node count confirmed `index.html` has no bare LF. 05-04 recorded the same `cat` hang, so it is logged as a skill observation.
- The inventory writer re-serializes with a one-space indent and refuses to write if a round trip of the unmodified file doesn't match byte for byte. It also refuses any change to an identity field. Git's "LF will be replaced by CRLF" warning for the JSON fixture is expected (05-01).

## Human Check (pending, end of phase)

Per `human_verify_mode: end-of-phase`, this check was not run here. It is recorded for the phase-end browser pass:

- Serve the repo root with `py -m http.server 8080`, open http://localhost:8080/, and do NOT sign in. Put it next to the deployed app at https://idbachmayer-boop.github.io/ppl-tracker/.
- Compare Today card by card: the weigh-in card open and closed, the weather, week and cardio cards, the mobility card open, and the to-do card.
- Using only the keyboard: open the weigh-in card, type a weight and press Enter, then check the chart shows ONE new weigh-in. Tab to its Log button and press Enter once. Add a to-do with Enter. Tick a mobility stretch with Space. Open the week shortcut card with Enter. The week card shows only after 5 pm.
- **Expected:** every card looks as before: same padding, same text alignment, left-aligned and full width, same colours. Each shortcut card and header shows the accent focus ring. Enter logs exactly one weigh-in and adds exactly one to-do. Space ticks the stretch once. Enter on the week card opens History.
- **Why a human:** only a browser can show whole-card button styling and real Enter/Space activation, where the browser synthesizes the click.

## Known Stubs

None.

## Threat Flags

None beyond the plan's threat model.
- **T-5-02:** workout names move to escaped `data-name` values. The D-03 check catches either one unescaped. The pet-name placeholder keeps its single `esc()` at the call site, and a hostile-name term in the pet check covers it.
- **T-5-14:** `keydown` exists only on `enter`. The weigh-in and to-do checks prove one log or add per Enter, one per tap, and none from a keydown on the button.
- **T-5-15:** the mobility action is on the checkbox's `change`. The mobility check fires a `click` and requires no toggle, and it requires that no control in the card is a `<label>`.

## Requirements

- **Partial, not ticked in REQUIREMENTS.md:** DELEG-02, DELEG-04 and DELEG-06. Plan 05-06 converts the remaining 42 rows (the Log tab and the static markup) and closes them.

## Next Phase Readiness

- `toggleAcc`, `startWorkout` and `skipDay` are registered for the Log tab. The picker's Start and Skip can use `data-action="startWorkout" data-name="${esc(name)}"` / `data-action="skipDay" data-name="${esc(name)}"`. The accessory and extras accordions can use `data-action="toggleAcc" data-key="${esc(id)}"`.
- When a single function has two rows with the same handler text, convert both in the same task. The ratchet counts inline occurrences (Deviation 1).
- `f2Evening(a)` reaches evening-only markup on one instance without moving the shared clock.

## Self-Check: PASSED

- FOUND: index.html, test/app.test.js, test/fixtures/handler-inventory.json, .planning/phases/05-f2-event-delegation/05-05-SUMMARY.md
- FOUND: c427411, 07dbcc3, 565ac9e
