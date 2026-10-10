---
phase: 05-f2-event-delegation
plan: 03
subsystem: ui-events
status: complete
tags: [event-delegation, csp-prep, care, lawn, skin, sleep, keyboard, enter-to-submit]

requires:
  - phase: 05-f2-event-delegation
    plan: 02
    provides: dispatcher, event-keyed ACTIONS, handler-inventory ratchet, F2 guards and helpers (controlsIn, fakeEl, fireAction, fireListener, spyOn, f2Corpus, f2AppHtml), :where(button.tap) reset
provides:
  - "ACTIONS entries: enter (Enter-to-submit, keydown only), goSub, skinSubTab, skinTogglePhase, skinSelectDay, removeSleep, addSleep, useMyLocation, searchLocation, changeLawnLoc, fetchWeather, setLawnDaysAgo, toggleLawnLog, toggleLawnOverride, logLawnPastDate"
  - "kicker(t, tag): kicker(t, 'span') returns the same element as a display:block span; kicker(t) is byte-identical to before"
  - "DELEG-03 ratchet counts wiring sites per mapped row (fn + data-action / data-enter), not just per name"
  - "test/app.test.js: five new f2Corpus states (Skin shaving, Lawn setup, Lawn full, Lawn no weather, Today heads-up)"
affects: [05-04, 05-05, 05-06]

actuals:
  tokens: 9900
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Enter-to-submit: a text field carries data-action=\"enter\" data-enter=\"<name>\"; ACTIONS.enter.keydown runs the named entry's click only on Enter, and only if both the entry and its click are own properties"
    - "A whole card that navigates is <button class=\"card tap\"> with block spans inside and kicker(t, 'span') (D-11)"
    - "An arity-sensitive wrapper branches on the presence of a data-* value rather than passing undefined (toggleLawnLog)"
    - "A view that onRender starts a never-settling fetch in the harness is captured by calling the view function directly (viewLawn with no weather)"

key-files:
  created:
    - .planning/phases/05-f2-event-delegation/deferred-items.md
  modified:
    - index.html
    - test/app.test.js
    - test/fixtures/handler-inventory.json

key-decisions:
  - "The enter action requires an OWN click on the named entry, not only an own entry name. The plan's literal form ran an inherited Object.prototype.click when data-enter named an own entry without a click handler"
  - "The DELEG-03 ratchet now requires as many wiring sites in a function as inventory rows mapped to that action there, because one surviving same-name sibling hid a dropped Load weather button"
  - "The hostile-sleep-id check asserts both no removeSleep control and no removeSleep( handler text, so it is non-vacuous before and after the conversion"
  - "The anchor-button check also requires the mowed anchors' day counts to read 0,1,2,3 in label order, because an off-by-one in data-n otherwise passed"

requirements-completed: []
requirements-partial: [DELEG-02, DELEG-04, DELEG-06]

duration: ~16min
completed: 2026-09-25
---

# Phase 5 Plan 03: Care Delegation (Skin, Lawn, Sleep and Today's lawn card) Summary

**Every Care control, 20 call sites in total, now reaches its function through `dispatchAction`. That covers Skin's sub-tabs, shaving phases and day picker, the lawn location setup, the lawn card on both Care and Today, the two-week lawn history, the Lawn view, and the sleep log. Enter in the location box searches through the registry's new `enter` action, exactly once. The lawn heads-up card and the compact card's header are now real buttons that open Care → Lawn, using the new `kicker(t, 'span')`. A lawn history pill logs its own date and a card button logs today, so `toggleLawnLog`'s arity is unchanged. The four checks that pinned old handler text now assert the same properties on parsed controls. The sleep `safeId` check has been shown to bite.**

## Performance

- **Duration:** about 16 minutes
- **Started:** 2026-09-25T09:58Z (BASE 773bc73)
- **Completed:** 2026-09-25T10:15Z
- **Tasks:** 2
- **Files modified:** 3, plus 1 created (deferred-items.md)

## Anchors

- **BASE:** `773bc731acffad38bf7cfc7bc977cc98b0088dd2` (773bc73). Precondition met: the suite was 829/0/2 at BASE.
- **CAPTURE:** `3a64173` (from 05-01). Inventory identity is unchanged: comparing `fn, event, tag, was, occurrence, calls` row by row against `git show 3a64173:test/fixtures/handler-inventory.json` prints `identity unchanged`.
- **Rows mapped:** 61 of 175. 05-01 mapped 4, 05-02 mapped 37, and this plan mapped 20: 4 `viewSkincare`, 2 `viewSleep`, 3 `lawnSetup` (the keydown row maps to `searchLocation`), 5 `cLawnCard`, 3 `lawnHistory` and 3 `viewLawn`. No row in these six functions is unmapped, and none of them has an inline handler left.

## Accomplishments

- **Skin:** the sub-tab buttons (`data-sub`), the phase headers (`data-i="${esc(pi)}"`, decoded with `+`) and the day buttons (`data-day="${esc(d)}"`) are delegated. A phase opens on the first tap and closes on the second.
- **Sleep:** the delete button is still inside the unchanged `safeId` gate and now carries `data-id="${esc(s.id)}"`. Add sleep is delegated.
- **Lawn setup:** Use my location and Find are delegated. The location box carries `data-action="enter" data-enter="searchLocation"` in place of its `onkeydown`.
- **Lawn card (Care and Today):** the heads-up branch is `<button class="card tap" data-action="goSub" data-tab="care" data-sub="lawn">`, with every inner div converted to a block span and the kicker in span form. The compact header is `<button class="row tap" …>` with `kicker(…, 'span')`. The `full` branch's kicker is still a div. The anchor, block and override buttons carry escaped `data-which` and `data-n`.
- **History and Lawn view:** each pill carries `data-which` and `data-iso`. The two date-picker buttons, Change, Load weather (inside a single-quoted JS string, whose quoting stays valid) and refresh are all delegated.
- **`kicker(t, tag)`:** without a second argument it returns exactly the old `<div>`. With `'span'` it returns a `<span>` whose style starts with `display:block;`.

## Task Commits

1. **Task 1:** `b14ce37` feat(05-03): Skin and Sleep are delegated; sleep checks assert parsed controls
2. **Task 2:** `958a030` feat(05-03): Lawn is delegated; Enter-to-search goes through the registry

## Red and Green Lists (TDD gates)

**Task 1, tests written, before the `index.html` edit** (828 passed, 3 failed):
- RED: `sleep: the history lists live nights and hides deleted ones` (no `removeSleep` controls yet), `DELEG-02: a shaving phase opens and closes through the dispatcher (numeric index)`, `DELEG-02: Skin's day picker and sub-tabs switch through the dispatcher`.
- GREEN from the start: `sleep: an id that could break out of the attribute gets no delete button`. It holds both before and after the conversion, because it also requires that no `removeSleep(` text appears.
- After the edit: 831 passed, 0 failed.

**Task 2, tests written, before the production edit** (829 passed, 6 failed):
- RED: `the card carries the recommendation AND the anchor buttons`, `the history lists all 14 days, each tappable`, `DELEG-02: Enter in the location box searches once, other keys do nothing, and a click in the box does nothing`, `DELEG-02: a lawn history pill logs its own date, and a lawn card button logs today (arity preserved)`, `DELEG-06: the lawn heads-up card and the compact card's header open Care → Lawn from a button`, `F2: kicker() without a tag is unchanged, and kicker(t, 'span') is the same element as a block span`.
- After the edit: 835 passed, 0 failed.
- The mutation pass then added `F2: Enter runs only an own registry entry named by data-enter`, which failed against the plan's literal `enter` form (`ran: ["inherited"]`) and passed after the fix, and `DELEG-02: location, weather, the date picker and overrides run through the dispatcher with their arguments`. It also tightened the DELEG-03 ratchet and the anchor check. Final: 837 passed, 0 failed.

## The `safeId` Mutation Check (observation 29)

After the conversion, the gate `${safeId.test(String(s.id)) ? …` was replaced with `${true ? …` in a scratch run. The run restored the original bytes in a `finally`, and `cmp` confirmed the file was unchanged afterwards.
- **Result: red.** 830 passed, 1 failed. The failure was `sleep: an id that could break out of the attribute gets no delete button  → {"del":[{"tag":"button",…,"data":{"action":"removeSleep","id":"a'b(c);"}}]…`.
- The retargeted negative check therefore depends on the gate, and does not pass just because the handler text changed.

## Lawn States the Heads-up Check Uses

The frozen runner clock is 2026-08-07, in summer, on an odd day. The states were built with the existing `setup(a, o)` helper and confirmed with `lawnStatus()` and `mowForecast()` before any check relied on them:
- **(a) Compact header:** `{ mowedDaysAgo: 9, wateredDaysAgo: 1, wx:{ precipByOffset:{ '-2': 0.4 } } }`, the state the "both tasks stay on screen" check uses. Mowing is due today, so `cLawnCard()` renders the header row, not the heads-up.
- **(b) Heads-up:** `{ mowedDaysAgo: 5, wateredDaysAgo: 1, wx:{ precipByOffset:{ 0: 0.6 } } }`. Watering reads "Watered 1 day ago — hold off" and mowing reads "Wet conditions — don't mow", neither unknown. `mowForecast().next.k` is 2, so `cLawnCard()` returns the whole-card heads-up. The same state feeds the `Today: lawn heads-up` corpus entry.

## Guard Mutation Pass

After each GREEN, each mutation was applied to `index.html` by a script that restored the original bytes in a `finally`. Every mutation in the final state turns at least one check red by name:

| Mutation | Fails by name |
|---|---|
| `safeId` gate removed | sleep hostile-id check |
| `skinTogglePhase` index read as a string | numeric decode, shaving phase (`opened: false`) |
| `data-day` unescaped | D-03 |
| `skinSelectDay` reads the wrong key | Skin day picker |
| `removeSleep` `data-action` dropped | sleep history, DELEG-03 |
| `removeSleep` `data-id` unescaped | D-03 |
| `skinSubTab` wrapper passes nothing | shaving phase, Skin day picker/sub-tabs |
| one of the two `skinSubTab` buttons loses `data-action` | DELEG-03 (per-occurrence), both Skin checks |
| `enter` runs on any key | Enter-once (`otherKey: 2`) |
| `enter` uses a truthy lookup | Enter own-key (5 inherited runs) |
| `enter` checks the entry but reads `.click` through the prototype (the plan's form) | Enter own-key (1 inherited run) |
| `searchLocation` also gets a `keydown` | only-enter-keydown, rendered-control mapping |
| `enter` also gets a `click` | rendered-control mapping, DELEG-06 button, Enter-once |
| `data-enter` dropped | DELEG-03, Enter-once |
| `toggleLawnLog` always passes `iso` (undefined arity) | arity check |
| pill loses `data-iso` | 14-day history, arity check |
| pill `data-iso` unescaped | D-03 |
| `setLawnDaysAgo` `n` read as a string | numeric decode |
| anchor `data-n` off by one | anchor-button check (sequence 0,1,2,3) |
| heads-up card left as a div | rendered-control mapping, DELEG-06 button, DELEG-06 goSub |
| heads-up kicker without `'span'` | D-11, kicker parity |
| heads-up due line back to a div | D-11 |
| compact header kicker without `'span'` | D-11 |
| `goSub` wrapper swaps its arguments | DELEG-06 goSub |
| default `kicker()` markup changed | kicker parity |
| Load weather button loses `data-action` | DELEG-03 (per-occurrence), Lawn buttons |
| `toggleLawnOverride` reads the wrong key | Lawn buttons |
| `useMyLocation` wrapper passes an argument | Lawn buttons |
| the "mowed" picker sends `watered` | Lawn buttons |
| `logLawnPastDate` wrapper calls `toggleLawnLog` | DELEG-03 (`lost call logLawnPastDate`) |

In the first pass, four mutations stayed green: the truthy `enter` lookup, the off-by-one anchor, the dropped Load weather wiring and the wrong-key override. Each got a check (see Deviations) and was re-run to red.

## Final Counts

`TZ=America/Chicago npm test`: **837 passed, 0 failed, 2 skipped** (baseline 829/0/2).

## Decisions Made

See `key-decisions` in the frontmatter. None of them changes user-visible behaviour beyond the plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Security] The plan's `enter` wrapper read `click` through the prototype chain**
- **Found during:** Task 2, mutation pass
- **Issue:** `<action>` specified `if(Object.prototype.hasOwnProperty.call(ACTIONS, n) && ACTIONS[n].click)`. The name is checked as an own key, but `.click` is not. With a planted `Object.prototype.click`, `data-enter="enter"` (an own entry that has no click) ran the inherited handler. T-5-11 asks for "an own key with a click handler".
- **Fix:** `own(ACTIONS, n) && own(ACTIONS[n], 'click')`, plus the check `F2: Enter runs only an own registry entry named by data-enter`, which plants a click on the app's `Object.prototype` and tries `__proto__`, `constructor`, `toString`, `hasOwnProperty`, `nope` and `enter`.
- **Files modified:** index.html, test/app.test.js
- **Commit:** 958a030

**2. [Rule 2 - Missing check] The DELEG-03 ratchet was keyed by name, not by occurrence**
- **Found during:** Task 2, mutation pass
- **Issue:** `viewLawn` has two `fetchWeather` rows. Dropping the Load weather button's `data-action` left the suite green, because the refresh button kept `data-action="fetchWeather"` in the function's source.
- **Fix:** the ratchet also requires, for each function, at least as many `data-action="x"` sites (`data-enter="x"` for keydown rows) as inventory rows mapped to `x`. Every earlier plan's mappings still pass.
- **Files modified:** test/app.test.js
- **Commit:** 958a030

**3. [Rule 2 - Missing check] Four surviving mutations got checks**
- The anchor check now also requires the mowed anchors to read `0,1,2,3` in label order.
- A new check, `DELEG-02: location, weather, the date picker and overrides run through the dispatcher with their arguments`, covers `useMyLocation`, both `fetchWeather` buttons, `changeLawnLoc`, both `logLawnPastDate` buttons and both `toggleLawnOverride` buttons, with their exact argument lists.
- **Commit:** 958a030

**4. [Plan criterion imprecise] `grep -c "removeSleep('sl1')" test/app.test.js` prints 3, not 0**
- **Found during:** Task 1 verification
- **Issue:** the three matches are direct `S.removeSleep('sl1')` calls in the existing soft-delete tests (lines 1486, 1494 and 1497), not handler-text reads. The criterion's intent is that the check no longer reads handler text, and that holds: `grep -c 'indexOf("removeSleep' test/app.test.js` prints 0.
- **Fix:** none needed in code. The soft-delete tests are correct and stay as they are.

**5. [Rule 2 - Strengthening] Checks tightened beyond the plan's wording, never loosened**
- The hostile-sleep-id check requires no `removeSleep` control AND no `removeSleep(` text.
- The Enter check fires through the app's registered document listeners (`fireListener`), not straight into the dispatcher, and requires every `searchLocation` call to have zero arguments.
- The goSub check also asserts that state (a) is not the heads-up, that the heads-up is the whole card (`<button class="card tap"` at the start), and that each state has exactly one opener.
- A kicker-parity check (`F2: kicker() without a tag is unchanged…`) enforces the plan's prohibition on changing `kicker(t)`.

## Deferred Issues

- `dispatchAction` reads the event handler as `ACTIONS[name][e.type]`, through the prototype chain. This is the same gap as deviation 1, but in 05-01's dispatcher. It is logged in `.planning/phases/05-f2-event-delegation/deferred-items.md` with a probe and a one-line fix. The risk is low: nothing in the app writes to `Object.prototype`.

## Issues Encountered

- `python` is not on PATH on this machine, so edit scripts ran under `node`. Edits kept CRLF, and a bare-LF count of 0 was checked for `index.html` and `test/app.test.js` before each commit.
- Rendering Care → Lawn with no weather through `go()` starts `fetchWeather()`. The harness `fetch` never settles, so the view shows "Loading weather…" and not the button. The corpus state and the Lawn-buttons check call `viewLawn()` directly on a fresh instance.

## Human Check (pending, end of phase)

Per `human_verify_mode: end-of-phase`, this check is recorded for the phase-end browser pass and was not run here:

- Serve the repo root with `py -m http.server 8080` and open http://localhost:8080/. Do NOT sign in.
- On Care → Lawn with no location, type a city in the location box and press Enter.
- Once a location is set, compare Care → Lawn and Today's lawn card with the deployed app at https://idbachmayer-boop.github.io/ppl-tracker/.
- Tab to the Today lawn card (or its header) and press Enter.
- Open Care → Skin → Shaving and toggle a phase with the keyboard.
- On Care → Sleep, add a night, then delete it.
- **Expected:** Enter searches once (one result message, no double toast). The lawn card on Today and on Care looks exactly as before, including the heads-up card when it shows. Keyboard focus shows the accent ring on the card, and Enter opens Care → Lawn. The shaving phase opens and closes. Adding and deleting a night both work.
- **Why a human:** visual parity of the whole-card button and a real keyboard need a browser, and which lawn card variant shows depends on live weather.

## Known Stubs

None.

## Threat Flags

None beyond the plan's threat model. The checks listed here cover T-5-02 (escaped `data-*`, and the `safeId` gate proven by mutation), T-5-11 (`data-enter` runs only an own entry's own click) and T-5-12 (arity-preserving `toggleLawnLog`, two arguments from a pill and one from the card).

## Requirements

- **Partial, and not ticked in REQUIREMENTS.md:** DELEG-02, DELEG-04 and DELEG-06. Plans 05-04 through 05-06 still convert the remaining 114 rows, and 05-06 closes these requirements.

## Next Phase Readiness

- `enter`, `goSub` and `kicker(t, 'span')` are available. The other 17 keyboard targets can use `data-action="enter" data-enter="<name>"`, provided `<name>` has an own `click`.
- The Today view still has an inline `goSub('care','lawn')` on the weather card (`cWeather`, around line 1568). That row belongs to the Today plan.
- The ratchet now counts per occurrence. A later plan that maps two rows to the same action in one function needs two `data-action` sites in that function.

## Self-Check: PASSED

- FOUND: index.html, test/app.test.js, test/fixtures/handler-inventory.json, .planning/phases/05-f2-event-delegation/deferred-items.md
- FOUND: b14ce37, 958a030
