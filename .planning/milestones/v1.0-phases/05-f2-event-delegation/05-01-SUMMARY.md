---
phase: 05-f2-event-delegation
plan: 01
subsystem: ui-events
status: complete
tags: [event-delegation, csp-prep, dispatcher, structural-tests, keyboard, inventory]

requires:
  - phase: 04-draft-goes-device-local
    provides: DRAFT-05 save-discipline scan (DRAFT_PUSHERS, DRAFT_ONLY_MUTATORS), fullDraft(), populatedDB(), SCREENS/drawEvery
provides:
  - "test/fixtures/handler-inventory.json: the frozen pre-change inventory (175 rows, captured at 3a64173 with index.html untouched)"
  - "scanInlineHandlers(raw) in test/harness.js (the same algorithm made the snapshot and scans the live file)"
  - "index.html Event delegation (F2) section: dispatchAction(e), event-keyed const ACTIONS (go, setSub, exportData, reload), five non-passive document listeners"
  - "harness: api.__listeners ({fn, opts} per event), ACTIONS/dispatchAction/buildTabBar exports, read-only TAB getter"
  - "F2 test helpers: controlsIn, fakeEl, fireAction, fireListener, spyOn, f2Corpus, f2Static, f2StripJs; constants F2_EVENTS, NUMERIC_DATA, REVIEWED_PROPAGATION, REVIEWED_NONBUTTON_CLICK"
  - "CSS :where(button.tap) / :where(button.tap-inline) zero-specificity reset"
affects: [05-02, 05-03, 05-04, 05-05, 05-06]

actuals:
  tokens: 18100
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "Event-keyed registry: ACTIONS[name][e.type](el, e), own-key lookup only, one document listener per event type"
    - "Markup names an action with a literal data-action and escaped scalar data-* args; wrappers are thin and call existing functions with existing signatures"
    - "Inventory ratchet: an unmapped row must still be inline verbatim; a mapped row must be wired, handle its event and keep every original callee (whole identifier)"
    - "Mutation pass after GREEN: apply the regression each guard names, confirm it fails by name, restore from a backup copy"

key-files:
  created:
    - test/fixtures/handler-inventory.json
  modified:
    - index.html
    - test/harness.js
    - test/app.test.js
    - .planning/ROADMAP.md
    - .planning/REQUIREMENTS.md
    - .planning/phases/05-f2-event-delegation/05-CONTEXT.md

key-decisions:
  - "The ratchet's 'keeps every call' matches a whole identifier, not a substring: a mutation renaming go( to goX( passed the substring form"
  - "The dispatcher test plants a click handler on the app's Object.prototype, because a truthy lookup in place of the own-key check was otherwise unobservable"
  - "The F2 source checks read a fresh loadApp instance (f2app), so no earlier check's override of a sandbox function can hide a call site"
  - "The numeric-decode check accepts a plus only in unary position; 'x' + el.dataset.i (string concatenation) fails"
  - "The D-03 esc() check walks each data-* value to its closing quote and checks every top-level placeholder, not only the first"
  - "The inventory was generated from the CRLF working copy and proven identical to a scan of the LF blob, so CI (LF) and Windows (CRLF) agree"

patterns-established:
  - "fireListener(a, type, el): fire the listener the app itself registered, which proves the registration as well as the dispatch"
  - "f2Corpus(): cached rendered HTML of every screen in three states, plus tab bar, static markup and error card; later plans append states below the marker comment"

requirements-completed: [DELEG-01, DELEG-03, DELEG-05]
requirements-partial: [DELEG-02, DELEG-04, DELEG-06]

duration: ~15min
completed: 2026-09-25
---

# Phase 5 Plan 01: Event Delegation Tracer and Guard Rails Summary

**A tap on a tab now reaches `go()` through one non-passive document listener, `dispatchAction` and an event-keyed `ACTIONS` registry. Before any markup changed, a frozen 175-row inventory of every inline handler went in, along with a ratchet and guards that refuse a dropped call site, a new inline handler, a string index, a wrapper touching `DB`, a propagation stopper, an unescaped `data-*` and a clickable non-button.**

## Performance

- **Duration:** about 15 minutes
- **Started:** 2026-09-25T09:25Z (BASE afda969)
- **Completed:** 2026-09-25T09:39Z
- **Tasks:** 3
- **Files modified:** 7 (1 created)

## Anchors

- **BASE:** `afda96905b051ddbcd6951ea303ae1ee8461ee73` (afda969)
- **CAPTURE:** `3a64173`. `git diff --quiet afda969 3a64173 -- index.html` prints `untouched`. The snapshot at CAPTURE is `identical` to `scanInlineHandlers` over `git show afda969:index.html`, restricted to the five events, and every row at CAPTURE is unmapped.
- **Rows mapped after this plan:** 4 (`buildTabBar` → `go`, `segNav` → `setSub`, `render` → `exportData`, `render` → `reload`). After Task 1 exactly one row was mapped (`1 buildTabBar go`).

## Accomplishments

- `scanInlineHandlers(raw)` in the harness is broad: any `on<letters>=`, any quoting. It reproduces RESEARCH's generator row for row for the five DELEG events (175 rows: 143 click, 14 change, 13 input, 3 keydown, 2 pointerdown; click tags 123 button, 16 div, 3 a, 1 span).
- `index.html` gains the `Event delegation (F2)` section just before Boot. It holds `dispatchAction` (text-node step, `closest` guard, disabled guard, own-key lookup, per-event handler), `const ACTIONS` (the last top-level const in the file) and five `{ passive: false }` document listeners.
- The tab bar, the section switcher and the error card's Export and Reload buttons run through the dispatcher. Their `data-*` values go through `esc()`.
- The zero-specificity `:where(button.tap)` / `:where(button.tap-inline)` reset sits right after the global `button` rule. It sets no colour of its own.
- The F2 test block holds 20 checks, each printing one PASS line. It sits immediately before the end-of-suite REG-01 check.

## Task Commits

1. **Task 1 (tracer): capture:** `3a64173` test(05-01): capture the inline handler inventory before any change (DELEG-01)
2. **Task 1 (tracer): dispatcher:** `738fad2` feat(05-01): tab bar taps go through one delegated dispatcher (tracer)
3. **Task 2:** `cd2a82d` feat(05-01): the app shell is delegated, and the registry guards itself
4. **Task 3: code:** `31b9227` feat(05-01): a zero-specificity reset for converted buttons, with keyboard checks
5. **Task 3: docs:** `56f6d57` docs(05-01): the handler count is 175

## Red and Green Lists (TDD gates)

**Task 1, after the tests and before the `index.html` edit** (798 passed, 4 failed):
- RED: `exported: ACTIONS`, `exported: dispatchAction`, `DELEG-02: document has one listener per delegated event, it is dispatchAction, and none is passive`, `DELEG tracer: a tap on a tab reaches go() through the document listener` (no such control).
- GREEN: `DELEG-01: the handler inventory exists…`, `DELEG-03: every inventoried call site is still inline, or is wired…`, `DELEG-04: every inline handler left in index.html is an unconverted inventory row`, `DELEG-04: every data-action and data-enter names an ACTIONS entry…`.
- After the edit: 802 passed, 0 failed.

**Task 2, after the tests and before the production edit** (811 passed, 2 failed):
- RED: `DELEG-02: the section switcher changes the sub-view through the dispatcher`, `DELEG-02: the error card's Export and Reload run through the dispatcher`.
- GREEN from the start (they guard the registry as it stands; their synthetic proofs bite): registry keyed by the five events, only `enter` on keydown, wrappers never touch DB or persist, DRAFT-05 (F2), numeric decode, dispatcher ignores, DELEG-05, D-03, rendered-control event mapping.
- After the edit: 813 passed, 0 failed.

**Task 3, after the tests and before the CSS edit** (815 passed, 1 failed):
- RED: `F2: the converted-button reset has zero specificity and no hard-coded colour` (both rules missing).
- GREEN and vacuous until later plans convert controls: `DELEG-06: every control that acts on click is a button…` and `D-11: no converted button wraps a div…`. Their synthetic proofs show they bite: `<div class="row" data-action="go">` is caught, a div inside a `tap` button is caught, `kicker('x')` is caught, `kicker('x','span')` passes, and the class token `tapx` does not count as `tap`.
- After the edit: 816 passed, 0 failed.

## Tracer Feedback Gate

The run is autonomous (`human_verify_mode: end-of-phase`), so after committing `738fad2` the tracer's verify was re-run end to end: `PASS  DELEG tracer: a tap on a tab reaches go() through the document listener`, suite 802/0/2. Expansion then went ahead.

## Guard Mutation Pass

After each GREEN, the regression each guard names was applied to `index.html` and restored from a backup copy:

| Mutation | Fails by name |
|---|---|
| drop `data-action="go"` from the tab button | DELEG-03 (`go not wired by data-action`), tracer |
| add an `onmouseover` to the error card | DELEG-04 new-inline (`fn: render, event: mouseover`) |
| `data-action="nope"` | DELEG-04 names (`action=nope`), DELEG-03, tracer |
| wrapper calls `goX(` instead of `go(` | DELEG-03 (`lost call go`), tracer. Before the fix only the tracer caught it. |
| pointerdown listener `{ passive: true }` | DELEG-02 listener (`["pointerdown"]`) |
| wrapper writes `DB.x` | F2 thin wrappers (`reload.click`) |
| wrapper calls `e.stopPropagation()` | DELEG-05 (`ACTIONS.reload.click`) |
| `data-sub="${k}"` unescaped | D-03 |
| `setSub` gains an `input` handler | DELEG-02 rendered-control mapping (`button … click,input`) |
| `reload` gains a `keydown` handler | only-enter-keydown, rendered-control mapping |
| dispatcher ignores `disabled` | dispatcher-ignores (`disabled: switched to care`) |
| own-key lookup replaced by `ACTIONS[name]` | dispatcher-ignores (`an inherited name reached Object.prototype (3x)`). Before the fix nothing caught it. |
| tap-inline rule gets `background: var(--surface)` | converted-button reset |

## Final Counts

`TZ=America/Chicago npm test`: **816 passed, 0 failed, 2 skipped** (baseline 794/0/2).

## "17" grep (Task 3)

`grep -n "17" .planning/ROADMAP.md .planning/REQUIREMENTS.md` matches only `REG-17` (ROADMAP 43, 58; REQUIREMENTS 30, 139), `SCHEMA = 17` (ROADMAP 48), "Phase 1 (needs … REG-17)" (ROADMAP 84) and the old `172` lines, which are now 175. Neither file states a keyboard-set count, which confirms planning claim 11. The "17" appears only in 05-CONTEXT.md D-04, which now points at D-08's corrected set.

## Decisions Made

See `key-decisions` in the frontmatter. The first two came from the mutation pass. The rest tighten guards the plan specified, and none of them loosen anything.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Scanner tag window ended one character early**
- **Found during:** Task 1, step 1 (before the capture commit)
- **Issue:** The broad regex consumes the whitespace before `on`, so a window ending at the match index cut off the separator after `<select`. That changed the `tag` on some rows compared with RESEARCH's generator (for example `select` became `button`).
- **Fix:** the window ends at the `o` of `on`. The scanner then reproduced RESEARCH's generator exactly (JSON-identical over 175 rows).
- **Files modified:** test/harness.js
- **Commit:** 3a64173

**2. [Rule 2 - Missing critical check] The ratchet's callee check was a substring match**
- **Found during:** Task 1, mutation pass
- **Issue:** a wrapper calling `goX(` satisfied "`go` appears in the handler source".
- **Fix:** whole-identifier match (`(?<![\w$])name(?![\w$])`).
- **Files modified:** test/app.test.js
- **Commit:** 738fad2

**3. [Rule 2 - Missing critical check] The inherited-name case (T-5-01) passed vacuously**
- **Found during:** Task 2, mutation pass
- **Issue:** with no inherited property carrying a `click`, swapping the own-key lookup for a truthy lookup changed nothing observable.
- **Fix:** the dispatcher test plants `click` on the app's `Object.prototype` for the duration of the cases and fails if it ever runs. It is removed in a `finally`.
- **Files modified:** test/app.test.js
- **Commit:** cd2a82d

**4. [Rule 2 - Strengthening] Guards made stricter than specified, never looser**
- The DELEG-04 names check also refuses a `data-action`/`data-enter` that is not double-quoted.
- The numeric-decode check refuses a binary plus (string concatenation).
- The D-03 check examines every top-level placeholder in a `data-*` value, not only one directly after the quote.
- The F2 source checks read a fresh `loadApp` instance instead of the shared `app`.
- **Commits:** 738fad2, cd2a82d

None of these changed the plan's scope. No production behaviour differs from the plan.

## Issues Encountered

- **Line endings:** `core.autocrlf=true`, so the working copy is CRLF and CI sees LF. No handler text spans a line, and the scan of the CRLF working copy equals the scan of the LF blob, so the snapshot is portable. Git's "LF will be replaced by CRLF" warning for the new JSON fixture is expected.

## Known Stubs

None. The `actions: []` rows (logRow ×2, the versions row) are intentionally unmapped until plans 05-02 and 05-04 convert them, and the ratchet holds them to "still inline".

## Threat Flags

None beyond the plan's threat model. The dispatcher and `ACTIONS` are the planned surface (T-5-01…T-5-07), and each mitigation has a check that the mutation pass exercised.

## Requirements

- **Complete:** DELEG-01 (inventory captured before any change), DELEG-03 (static completeness ratchet), DELEG-05 (zero stoppers, with a guard and an empty allowlist). No later plan in this phase lists them.
- **Partial:** DELEG-02, DELEG-04 and DELEG-06 (infrastructure and guards are in; plans 05-02…05-06 finish the conversions). DELEG-07 is not touched here.

## Next Phase Readiness

Plan 05-02 (Settings and Ideas) can convert against the live ratchet. When it does:
- set `action` or `actions` on the rows it converts, changing no identity field;
- add a no-op `setSelectionRange` to the harness element stub;
- retarget the export-placement test (Pitfall 8);
- add any state that reaches its controls below the marker comment in `f2Corpus()`.

## Self-Check: PASSED

- FOUND: test/fixtures/handler-inventory.json, test/harness.js, test/app.test.js, index.html
- FOUND: 3a64173, 738fad2, cd2a82d, 31b9227, 56f6d57
