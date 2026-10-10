# Phase 5: F2 — Event Delegation - Research

**Researched:** 2026-09-23
**Domain:** DOM event delegation in a single-file, no-build vanilla-JS PWA; keyboard operability; static completeness testing in a `vm` harness
**Confidence:** HIGH (codebase facts all read this session; browser-semantics claims cited to MDN / WHATWG, with the few unverified ones logged under Assumptions)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Dispatcher shape
- **D-01:** One declared `ACTIONS` registry (name → function) in the spirit of `COLLECTIONS`. Markup
  carries `data-action="name"` plus scalar `data-*` args (e.g. `data-i`, `data-k`, `data-name`).
  There is one `document` listener per event type (`click`, `change`, `input`, `keydown`,
  `pointerdown`), and it looks up `ACTIONS[el.dataset.action]` via `closest('[data-action]')`.
- **D-02:** A handler that chains calls today (e.g. `setVal(...);updTargetBadge(...);updPlates(...)`)
  becomes one named action that does the whole chain. One `data-action` per element per event, with
  no multi-action syntax.
- **D-03:** Args come from `data-*` attributes, never from JS source strings. This also closes the
  CLAUDE.md hole where a user string sits inside an inline handler's quotes (`startWorkout('${o.name}')`,
  `saveJournalFor('${iso}',…)`). Every interpolated `data-*` value goes through `esc()`, following the
  attribute-escaping convention.

#### Keyboard operability
- **D-04:** The 17 `onclick` handlers on `div`/`span`/`li`/`tr`/`label` convert to real `<button>`
  elements, with a CSS reset so they look the same. Where a `<button>` can't legally wrap the content
  (interactive children, table rows), fall back to `role="button"` + `tabindex="0"` + dispatcher
  handling of Enter/Space.

#### Rollout
- **D-05:** Land it screen by screen. The dispatcher, `ACTIONS` and the completeness test come first,
  then the low-risk screens (Settings, Progress, Lawn, Skin, Activities…), with the **Log tab last, in
  its own plan**. Mixed inline/delegated state between commits is acceptable.
- **D-06:** DELEG-07 is verified on Ian's phone against the deployed build, doing a real workout flow
  (start, log sets, skip/unskip, warm-up, stairs, notes, extras, date/duration, finish) from a checklist
  Claude writes. Before that, Claude runs a keyboard-only desktop pass in the browser pane.

#### Completeness check
- **D-07:** Capture the inventory at phase start as a checked-in snapshot file. The test asserts that
  every inventoried call site maps to an `ACTIONS` entry, that zero `on(click|change|input|keydown|pointerdown)=`
  remain, and that every `data-action` in the markup has a registry entry. **No pinned count.** It asserts
  the property, not the number (CLAUDE.md convention).

### Claude's Discretion
- The exact registry placement and name, how `event`/`this.value` are passed to actions, and the snapshot
  file format and location.
- `swGuard(event)` on `pointerdown`: keep its semantics exactly.
- DELEG-05: there are currently **zero** `stopPropagation()` calls. Record that in verification and add a
  test guard that fails if one appears inside delegated markup without review.
- Whether to add a guard test that bans new inline `on*=` attributes (recommended).

### Deferred Ideas (OUT OF SCOPE)
- Inline `style=` / `javascript:` removal and other CSP prerequisites belong to Phase 7.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DELEG-01 | A static inventory of all inline handler attributes is captured before any are changed (REQUIREMENTS.md says 172; the real count is 175) | § Handler Inventory: all 175 sites, with line, render function, event, tag and handler text, and a generator script under Code Examples. § Snapshot format. |
| DELEG-02 | Inline `onclick`/`onchange`/`oninput`/`onkeydown`/`onpointerdown` are replaced by delegated listeners reading `data-*` | § Architecture Patterns (dispatcher, event-keyed `ACTIONS`, placement), § Arg-shape translation table |
| DELEG-03 | A static completeness check cross-references the pre-change inventory against the dispatcher | § Validation Architecture: inventory ratchet test, handler-calls-preserved test, registry-coverage test |
| DELEG-04 | No handler is reachable only through a global function called by name from markup | § Validation Architecture: no-inline-handler guard (broad `on[a-z]+=` form), no dynamic action names |
| DELEG-05 | Any `stopPropagation()` that would break delegation is found and resolved | Verified: 0 `stopPropagation`, 0 `stopImmediatePropagation`, 0 `cancelBubble` in index.html today. The only `preventDefault` is in `swGuard`. § Validation: guard test |
| DELEG-06 | Converted controls remain keyboard-operable | § Keyboard Operability: the 16 `div` + 1 `span` + **3 `<a>` without `href`** (CONTEXT missed these), with button/CSS-reset guidance and the backdrop exception |
| DELEG-07 | Log tab manually verified end to end | § Log-tab verification checklist (draft for the plan), the desktop keyboard-pass server command, and the PWA update-lag note |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

These carry the same authority as locked decisions:

- **Single file, no build, no dependencies.** `index.html` is the whole app. No npm packages. Nothing in this phase may add a build step or a runtime library.
- **`npm test` before every push.** A red suite blocks the deploy. Add checks for what you change.
- **Draft rules:** draft edits persist with `saveLocal()`. The only draft functions that still `save()` are `pickEx`, `exPick` and `finishWorkout`. A test fails when a new draft function calls `save()`. Delegation wrappers must not break this (see Pitfall 7).
- **Escaping:** every user-controlled string rendered into HTML goes through `esc()`. `esc()` does **not** escape `'`, so a user string must never sit inside an inline handler's quotes. Values interpolated into an attribute are not escaped today. "Escape attributes too when you touch them."
- **Assert the property, never the wording.** No pinned counts, no pinned text (the firestore.rules lesson).
- **Icons:** Phosphor, inlined in `PH`. **Theme:** colours come from `:root` custom properties, so don't hard-code hex. Any new CSS reset must use `var(--…)` or `inherit`.
- **Boot order / TDZ:** anything read at module-eval time must already be initialized. Placement comments exist on `COLLECTIONS`, migrations 13/17 and `let migrationRan`, and they all describe the same trap.
- **After shipping:** append a dated changelog entry to `C:\Main Vault\50-59 Projects & Events\56. Software Projects\PPL Tracker App.md` (never the old vault).

## Summary

`index.html` has **175** inline handler attributes today. That is 143 `onclick`, 14 `onchange`, 13 `oninput`, 3 `onkeydown` and 2 `onpointerdown`, across 31 render functions plus the static `<body>` markup [VERIFIED: generator script run over index.html this session]. Every function they call is a hoisted `function` declaration; the one exception is the `esc` const arrow, which appears only inside `renameExercise('${esc(r.id)}')`. The mechanical part is therefore low-risk. The risk is in six places where inline semantics and delegated semantics quietly differ:

1. `data-*` values come back as **strings**, and several consumers compare numbers strictly or use `Set.has`. `weekShift(d)` would concatenate, giving `"0" + "-1"`.
2. `<select>` and checkboxes fire `input` **and** `change`, and the stopwatch buttons fire `pointerdown` **and** `click`, so the dispatcher must route by event type.
3. An Enter-to-submit input next to a Log button needs care, because a `keydown` action that also sits on a `<button>` fires twice. Enter on a button already synthesizes a `click`.
4. `ACTIONS` wrappers are invisible to the existing DRAFT-05 "who calls `save()`" scan, because that scan walks sandbox globals and a `const` object's arrow values aren't globals.
5. The `onclick="exportMarkdown()"` literal is pinned by an existing test (`test/app.test.js:3533`).
6. Three `<a onclick>` without `href` are keyboard-dead today, and CONTEXT's "17" missed them.

The recommended design follows D-01. `ACTIONS` is an **event-keyed** registry, `{ name: { click(el,e){…}, change(el,e){…} } }`, placed as a `const` in a new section immediately before the `/* ── Boot ── */` block (index.html line 4685), after every other `const`. There is one hoisted `function dispatchAction(e)`, and five `document.addEventListener` calls sit next to it. Wrappers stay thin: they convert `dataset` strings to the original argument types and call the **existing functions with their existing signatures**. That keeps DRAFT-05's 25-row mutator table, "every screen still draws" and every behaviour test valid without edits. Validation happens in tests, never at boot. A malformed action should break one control, not the app.

Completeness rests on a checked-in inventory snapshot, `test/fixtures/handler-inventory.json`, which works as a **ratchet**. Every row is either still present verbatim as an inline handler (not yet converted) or names an `ACTIONS` entry that handles that event. That entry's source must still call every function the original handler called, and its `data-action="name"` must appear in the same render function's source. Inline handlers that don't match an unconverted row are refused. When the Log-tab plan lands, "no unconverted rows" plus "zero `on[a-z]+=` attributes" closes DELEG-02/04 with no pinned number.

**Primary recommendation:** Build an event-keyed `ACTIONS` + `dispatchAction` at the bottom of the script, with thin wrappers that keep existing signatures and `Number()` every numeric `data-*`. Add a snapshot-ratchet completeness test and broad inline-handler and propagation guards. Convert in five plans: shell → Settings+Ideas → Care+Train-non-Log (two sub-plans if wanted) → Today → Log.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Event capture (5 event types) | Browser / Client, one `document` listener each | — | The whole app is a client-side SPA rendered via `innerHTML`. Delegation at `document` survives every re-render. |
| Action routing (`data-action` → function) | Browser / Client, `dispatchAction` + `ACTIONS` | — | Replaces the implicit global-name lookup that inline handlers do. |
| Argument decoding (`dataset` → typed args) | Browser / Client, the `ACTIONS` wrappers | — | The only place a string becomes a number or an element. Keeps domain functions' signatures unchanged. |
| Business logic / persistence (`save`/`saveLocal`) | Browser / Client, existing domain functions | localStorage / Firestore (unchanged) | Untouched by this phase. Wrappers must never call `save()`/`saveLocal()` or touch `DB` themselves. |
| Output encoding of `data-*` values | Browser / Client, render templates via `esc()` | — | D-03. `esc()` escapes `"`, so it is sufficient for double-quoted attributes. |
| Completeness / regression proof | Test harness (Node `vm`) | — | Static source scans plus rendered-HTML scans. No DOM needed. |
| Future CSP enforcement | CDN / Static (meta CSP, Phase 7) | — | This phase is the precondition only. |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| (none — platform APIs) | — | `EventTarget.addEventListener`, `Element.closest`, `HTMLElement.dataset` | CLAUDE.md forbids dependencies. These are the web platform's native delegation primitives, supported in every browser the app runs in [CITED: developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener] |
| Node.js `vm` harness | Node v24.15.0 (local) | Existing test harness `test/harness.js` | Already the project's test stack [VERIFIED: `node --version`] |

### Supporting
None. No package is installed by this phase.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Event-keyed `ACTIONS[name][e.type]` | Event-scoped attributes (`data-click="x" data-change="y"`) | Also avoids double-fire, but contradicts D-01's `data-action` + `closest('[data-action]')` wording. Rejected. |
| Event-keyed registry | Flat `ACTIONS[name] = fn` called for any event | **Unsafe.** A `<select>` fires `input` and `change` (so `pickEx` runs twice and prompts twice on `__custom`). A checkbox fires `click`, `input` and `change` (so `toggleMobility` flips three times). A programmatic `.click()` on `#imp` would run `importData`. Do not use. |
| Thin wrappers that keep signatures | Rewrite domain functions to take `(el, e)` | Breaks DRAFT-05's mutator table (calls `pickEx(0, {value:…})`, `setVal(0,0,'r','8')` etc.) and ~40 behaviour tests. No benefit. |
| Boot-time `actionProblems()` throw (like `collectionProblems()`) | Test-time validation only | A registry typo at boot would take out the whole app, including the Log tab mid-workout. Test-time catches it before deploy. |

**Installation:** none.

## Package Legitimacy Audit

This phase installs no external packages. Nothing to audit. `package.json` has zero dependencies [VERIFIED: package.json read this session].

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Handler Inventory (DELEG-01)

Generated this session by scanning index.html for `\bon(click|change|input|keydown|pointerdown)="` and walking `${…}` nesting to the closing quote. The enclosing function is the nearest preceding column-0 `function` declaration [VERIFIED: generator run, total 175]. **Line numbers are as of commit 1426a6d.** They shift as soon as anything is edited, so the snapshot must key on (function, event, handler text, occurrence), not on line.

### Totals

| Event | Count | | Tag (click only) | Count |
|---|---|---|---|---|
| onclick | 143 | | `button` | 123 |
| onchange | 14 | | `div` | 16 |
| oninput | 13 | | `a` (no `href`) | 3 |
| onkeydown | 3 | | `span` | 1 |
| onpointerdown | 2 | | | |
| **Total** | **175** | | | |

`onload=` appears twice in the file, but both are JS property assignments (`r.onload=()=>…` on a FileReader, lines 3616 and 3759), not markup attributes [VERIFIED: grep]. They are CSP-safe and not in scope, but a naive guard regex matches them (Pitfall 9).

### Arg shapes (how each handler gets its arguments)

| Shape | Sites | Translation |
|---|---|---|
| No args, `fn()` | 44 | `data-action="fn"`, wrapper `click: () => fn()` |
| String/number literals only, `setUnit('lb')`, `setRange(30)` | 45 | literal goes in a `data-*`. **Numbers need `Number()`** in the wrapper |
| Numeric interpolation, `${i}`, `${i},${k}`, `${idx}`, `${pi}`, `${o.idx}`, `${o.i}` | ~30 | `data-i="${i}"`, wrapper `+el.dataset.i` |
| Quoted string interpolation, `'${x}'` | 36 | `data-x="${esc(x)}"`, wrapper `el.dataset.x`. **This closes the `'` hole.** User/data-derived ones: `c.id` (cardio), `i.id` (ideas ×4), `r.id` (exercise registry), `s.id` (sleep, already guarded by `safeId`), `v._id` (cloud version). The rest are program constants or ISO dates. |
| `this.value` | 19 | wrapper reads `el.value` |
| `this` (the element) | 4 | `pickEx(${i},this)`, `exPick('${id}',this)`, `importData(this)`, `handleCardioFile(this)`. Wrapper passes `el` |
| `event` | 6 | `swGuard(event)` ×2, backdrop `event.target===this`, Enter ×3. Wrapper receives `e` |
| Chained statements (D-02) | 5 | `progSub='body';goSub(…)`, `progSub='pet';goSub(…)`, `setVal(…,'w',…);updTargetBadge(…);updPlates(…)`, `setVal(…,'r',…);updTargetBadge(…)`, `setPetName(this.value);render()`. One action each |
| Inline logic | 7 | `if(event.target===this)closeIdeas()`, `location.reload()` ×2, `if(event.key==='Enter')…` ×3, `document.getElementById('imp').click()` |
| **Templated code**, handler text built from a string | 3 source sites (4 runtime) | `logRow`'s `onkeydown="if(event.key==='Enter')${fn}"` + `onclick="${fn}"` (called with `"logWeight()"` and `"logPetWeight('pet-input')"`), and `versionsCardHTML`'s `row(…, action)` → `onclick="${action}"` (called with `` `restoreSnapshot(${i})` `` and `` `restoreCloudVersion('${v._id}')` ``) |

Verbatim sources for the templated sites [VERIFIED: index.html:1536-1539 and 4570-4574, read this session]:

```text
1536  const logRow = (id, fn, hint) => `<div class="row" style="gap:8px;margin-top:8px">
1537        <input type="number" inputmode="decimal" step="0.1" id="${id}" placeholder="${hint}" style="flex:1" onkeydown="if(event.key==='Enter')${fn}">
1538        <button class="btn btn-sm" onclick="${fn}">Log</button>
4570  const row = (when, label, sum, action) => `<div class="hist-item" style="cursor:default">
4573      <button class="btn btn-sm btn-ghost" onclick="${action}">Restore</button>
```

### Full inventory, grouped into rollout batches (D-05)

Batch sizes: P1 shell 4 · P2 Settings+Ideas 37 · P3a Care 20 · P3b Train non-Log 39 · P4 Today 33 · P5 Log 42 (38 + 4 stopwatch) = **175**.

#### P1 — Infrastructure + app shell (4)
The tracer bullet: it proves delegation live on every screen at once.

| Line | Fn | Event | Tag | Handler today |
|---|---|---|---|---|
| 1404 | buildTabBar | click | button | `go('${t.id}')` (the button already carries `data-tab="${t.id}"`) |
| 1422 | segNav | click | button | `setSub('${k}')` |
| 1439 | render (error card) | click | button | `exportData()` |
| 1440 | render (error card) | click | button | `location.reload()` |

#### P2 — Settings + Ideas sheet (37)

| Line | Fn | Event | Tag | Handler today |
|---|---|---|---|---|
| 284 | (static markup) | click | button | `openIdeas()` |
| 285 | (static markup) | click | div | `if(event.target===this)closeIdeas()` (modal backdrop, see Keyboard § exception) |
| 287 | (static markup) | click | button | `closeIdeas()` |
| 289 | (static markup) | click | button | `addIdea()` |
| 290 | (static markup) | click | button | `copyIdeas()` |
| 2591 | exercisesCardHTML | click | button | `doExMerge()` |
| 2596 | exercisesCardHTML | click | button | `renameExercise('${esc(r.id)}')` |
| 3354 | viewData | click | button | `setUnit('lb')` |
| 3355 | viewData | click | button | `setUnit('kg')` |
| 3359 | viewData | click | button | `setRoutineMode('3day')` |
| 3360 | viewData | click | button | `setRoutineMode('4day')` |
| 3374 | viewData | change | input | `setPetName(this.value);render()` |
| 3384 | viewData | click | button | `removeItem('hobby',${i})` |
| 3385 | viewData | click | button | `addItem('hobby')` |
| 3390 | viewData | click | button | `removeItem('productivity',${i})` |
| 3391 | viewData | click | button | `addItem('productivity')` |
| 3396 | viewData | click | button | `exportData()` |
| 3397 | viewData | click | button | `exportMarkdown()` (**pinned by test/app.test.js:3533**) |
| 3398 | viewData | click | button | `document.getElementById('imp').click()` |
| 3399 | viewData | change | input | `importData(this)` |
| 3403 | viewData | click | button | `wipe()` |
| 4551 | trashCardHTML | click | div | `toggleTrash()` |
| 4559 | trashCardHTML | click | button | `restoreDeleted('${o.kind}',${o.i})` |
| 4562 | trashCardHTML | click | div | `toggleTrash()` |
| 4573 | versionsCardHTML | click | button | `${action}` → `restoreSnapshot(${i})` / `restoreCloudVersion('${v._id}')` |
| 4577 | versionsCardHTML | click | div | `toggleVersions()` |
| 4590 | versionsCardHTML | click | div | `toggleVersions()` |
| 4612 | syncCardHTML | click | button | `location.reload()` |
| 4618 | syncCardHTML | click | button | `pushNow(false)` |
| 4620 | syncCardHTML | click | button | `syncSignOut()` |
| 4627 | syncCardHTML | click | button | `syncSignIn(false)` |
| 4628 | syncCardHTML | click | button | `syncSignIn(true)` |
| 4665 | renderIdeasList | click | button | `saveEditIdea('${i.id}')` |
| 4666 | renderIdeasList | click | button | `cancelEditIdea()` |
| 4670 | renderIdeasList | change | input | `toggleIdeaDone('${i.id}')` |
| 4672 | renderIdeasList | click | button | `startEditIdea('${i.id}')` |
| 4673 | renderIdeasList | click | button | `removeIdea('${i.id}')` |

#### P3a — Care: Skin, Lawn, Sleep (20)

| Line | Fn | Event | Tag | Handler today |
|---|---|---|---|---|
| 2829 | viewSkincare | click | button | `skinSubTab('routine')` |
| 2830 | viewSkincare | click | button | `skinSubTab('shaving')` |
| 2835 | viewSkincare | click | button | `skinTogglePhase(${pi})` (Set: **needs Number**) |
| 2848 | viewSkincare | click | button | `skinSelectDay('${d}')` |
| 2924 | lawnSetup | click | button | `useMyLocation()` |
| 2926 | lawnSetup | keydown | input | `if(event.key==='Enter')searchLocation()` |
| 2926 | lawnSetup | click | button | `searchLocation()` |
| 3220 | cLawnCard (compact) | click | div | `goSub('care','lawn')` (**also rendered on Today**) |
| 3236 | cLawnCard (`anchor`) | click | button | `setLawnDaysAgo('${action}',${n})` |
| 3243 | cLawnCard (`block`) | click | button | `toggleLawnLog('${which.log}')` |
| 3244 | cLawnCard (`block`) | click | button | `toggleLawnOverride('${which.ov}')` |
| 3263 | cLawnCard (full, header row) | click | div | `goSub('care','lawn')` |
| 3279 | lawnHistory | click | button | `toggleLawnLog('${action}','${iso}')` |
| 3293 | lawnHistory | click | button | `logLawnPastDate('watered')` |
| 3294 | lawnHistory | click | button | `logLawnPastDate('mowed')` |
| 3301 | viewLawn | click | button | `changeLawnLoc()` |
| 3303 | viewLawn | click | button | `fetchWeather()` (inside a single-quoted JS string, not a template literal) |
| 3336 | viewLawn | click | button | `fetchWeather()` |
| 3915 | viewSleep | click | button | `removeSleep('${s.id}')` |
| 3932 | viewSleep | click | button | `addSleep()` |

#### P3b — Train: History, Week review, Progress, Cardio (39)

| Line | Fn | Event | Tag | Handler today |
|---|---|---|---|---|
| 2096 | renderWeekReview | click | **a** | `editJournal('${iso}')` |
| 2101 | renderWeekReview | input | textarea | `saveJournalFor('${iso}',this.value)` |
| 2102 | renderWeekReview | click | button | `closeJournalEdit()` |
| 2106 | renderWeekReview | click | **a** | `openActivityAdd('${iso}')` |
| 2113 | renderWeekReview | click | button | `setActAddCat('hobby')` |
| 2113 | renderWeekReview | click | button | `setActAddCat('productivity')` |
| 2114 | renderWeekReview | click | button | `addActivityFor('${iso}')` |
| 2114 | renderWeekReview | click | button | `cancelActivityAdd()` |
| 2115 | renderWeekReview | click | **span** | `removeActivity(${o.idx})` |
| 2129 | renderWeekReview | click | button | `weekShift(-1)` (**string concat if not Number**) |
| 2131 | renderWeekReview | click | button | `weekShift(1)` (rendered `disabled` when offset ≥ 0) |
| 2164 | viewHistory | click | button | `toggleBackdate()` |
| 2167 | viewHistory | click | button | `startBackdate('${n}')` |
| 2167 | viewHistory | click | button | `startBackdate('${o.name}')` |
| 2177 | viewHistory | change | input | `changeSessionDate(${idx},this.value)` (inside a `<label>`) |
| 2178 | viewHistory | click | button | `editSession(${idx})` |
| 2179 | viewHistory | click | button | `deleteSession(${idx})` |
| 2207 | viewHistory | click | div | `toggleHist(${idx})` (`openHist===i`: **needs Number**) |
| 2253 | rangeSeg | click | button | `setRange(30)` |
| 2254 | rangeSeg | click | button | `setRange(90)` |
| 2255 | rangeSeg | click | button | `setRange(365)` |
| 2256 | rangeSeg | click | button | `setRange(9999)` |
| 2259 | viewWeight | click | button | `progSubTab('body')` |
| 2260 | viewWeight | click | button | `progSubTab('strength')` |
| 2261 | viewWeight | click | button | `progSubTab('volume')` |
| 2262 | viewWeight | click | button | `progSubTab('cardio')` |
| 2263 | viewWeight | click | button | `progSubTab('pet')` |
| 2288 | viewWeight | click | button | `logWeight()` |
| 2314 | viewPetWeight | click | button | `logPetWeight('pet-input','pet-date')` |
| 2356 | viewStrength | click | div | `selectPR(${i})` |
| 2365 | viewStrength | change | select | `selectExercise(this.value)` |
| 2428 | weightList | click | button | `rmWeight(${idx})` |
| 2539 | petWeightList | click | button | `rmPetWeight(${i})` |
| 3851 | viewCardio | click | button | `confirmCardioImport()` |
| 3851 | viewCardio | click | button | `discardCardioImport()` |
| 3856 | viewCardio | click | button | `removeCardio('${c.id}')` (**data-derived id inside quotes today**) |
| 3875 | viewCardio | click | button | `addCardio()` |
| 3880 | viewCardio | click | button | `pickCardioFile()` (programmatic `.click()` on `#cardio-file`) |
| 3881 | viewCardio | change | input | `handleCardioFile(this)` |

#### P4 — Today (33)

| Line | Fn | Event | Tag | Handler today |
|---|---|---|---|---|
| 1500 | viewToday | click | button | `goSub('train','log')` |
| 1503 | viewToday | click | button | `startWorkout('${o.name}')` (draft function) |
| 1504 | viewToday | click | button | `skipDay('SPECIALIZED')` |
| 1508 | viewToday | click | button | `startWorkout('${nxt}')` |
| 1509 | viewToday | click | button | `skipDay('${nxt}')` |
| 1514 | viewToday | click | button | `setPickCat('hobby')` |
| 1515 | viewToday | click | button | `setPickCat('productivity')` |
| 1518 | viewToday | click | button | `shufflePick()` |
| 1518 | viewToday | click | button | `didPick()` |
| 1519 | viewToday | change | select | `selectPick(this.value)` |
| 1525 | viewToday | input | textarea | `saveJournal(this.value)` |
| 1526 | viewToday | click | **a** | `goSub('train','history')` |
| 1537 | viewToday (`logRow`) | keydown | input | `if(event.key==='Enter')${fn}` (templated ×2) |
| 1538 | viewToday (`logRow`) | click | button | `${fn}` (templated ×2) |
| 1541 | viewToday | click | div | `toggleAcc('weighin')` |
| 1549 | viewToday | click | button | `progSub='body';goSub('train','progress')` |
| 1557 | viewToday | click | button | `progSub='pet';goSub('train','progress')` |
| 1563 | viewToday | click | div (whole card) | `goSub('care','lawn')` |
| 1568 | viewToday | click | div (whole card) | `goSub('train','history')` |
| 1572 | viewToday | click | div (whole card) | `goSub('train','cardio')` |
| 1582 | viewToday | click | div | `toggleAcc('mob-today')` |
| 1590 | viewToday | click | button | `toggleMobSession()` |
| 1601 | viewToday | keydown | input | `if(event.key==='Enter')addTodo()` |
| 1602 | viewToday | click | button | `addTodo()` |
| 1605 | viewToday | change | input[checkbox] | `doneTodo(${i})` |
| 1607 | viewToday | click | button | `removeTodo(${i})` |
| 1609 | viewToday | click | button | `toggleAcc('todos-all')` |
| 1616 | viewToday | click | button | `exportData()` |
| 1616 | viewToday | click | button | `go('settings')` |
| 1621 | viewToday | click | button | `go('settings')` |
| 1621 | viewToday | click | button | `exportData()` |
| 1622 | viewToday | click | button | `snoozeBackup()` |
| 2781 | mobilityRows | change | input[checkbox] | `toggleMobility(${i})` (checkbox wrapped in a `<label>`) |

#### P5 — Log tab, last and in its own plan (42)

| Line | Fn | Event | Tag | Handler today |
|---|---|---|---|---|
| 276 | (static markup) stopwatch | pointerdown | button | `swGuard(event)` |
| 276 | (static markup) stopwatch | click | button | `swToggle()` |
| 277 | (static markup) stopwatch | pointerdown | button | `swGuard(event)` |
| 277 | (static markup) stopwatch | click | button | `swClear()` |
| 1690 | viewPicker (`card`) | click | div | `togglePreview('${name}')` |
| 1695 | viewPicker (`card`) | click | button | `skipDay('${skipName}')` |
| 1703 | viewPicker | click | button | `startWorkout('${name}')` |
| 1708 | viewPicker | click | button | `startWorkout('${o.name}')` |
| 1718 | viewPicker | click | button | `toggleGuide(${i})` (Set: **needs Number**) |
| 1778 | viewActive | click | div | `toggleExCollapse(${i})` (Set: **needs Number**) |
| 1809 | viewActive | click | button | `undeloadExercise(${i})` |
| 1810 | viewActive | click | button | `deloadExercise(${i})` |
| 1815 | viewActive | click | button | `unskipSet(${i},${k})` |
| 1819 | viewActive | input | input | `setVal(${i},${k},'w',this.value);updTargetBadge(${i},${k});updPlates(${i})` |
| 1819 | viewActive | change | input | `rollWeight(${i},${k},this.value)` (same element as above) |
| 1820 | viewActive | input | input | `setVal(${i},${k},'r',this.value);updTargetBadge(${i},${k})` |
| 1820 | viewActive | change | input | `repCheck(${i},${k})` (same element as above) |
| 1822 | viewActive | click | button | `skipSet(${i},${k})` (`k+1` in prompt: **needs Number**) |
| 1823 | viewActive | click | button | `rmSet(${i},${k})` |
| 1832 | viewActive | click | button | `toggleExCollapse(${i})` |
| 1836 | viewActive | change | select | `pickEx(${i},this)` (**save() allowed**, DRAFT_PUSHERS) |
| 1842 | viewActive | click | button | `addSet(${i})` |
| 1845 | viewActive | click | button | `toggleWarm(${i})` |
| 1848 | viewActive | input | input | `setNote(${i},this.value)` |
| 1863 | viewActive | click | button | `unskipStairs()` |
| 1872 | viewActive | input | input | `stairVal('level',this.value)` |
| 1873 | viewActive | input | input | `stairTimeSet('m',this.value)` |
| 1874 | viewActive | input | input | `stairTimeSet('s',this.value)` |
| 1876 | viewActive | click | button | `skipStairs()` |
| 1884 | viewActive | input | input[date] | `setDraftDate(this.value)` |
| 1885 | viewActive | input | input | `setDraftDur(this.value)` |
| 1902 | viewActive | input | textarea | `setSessionNote(this.value)` |
| 1904 | viewActive | click | button | `finishWorkout()` (**save() allowed**) |
| 1905 | viewActive | click | button | `discardWorkout()` |
| 2697 | accItem | click | button | `toggleAcc('${key}')` |
| 2802 | extraCard | input | input | `exSet('${id}',${k},'w',this.value)` |
| 2802 | extraCard | change | input | `exRoll('${id}',${k},this.value)` (same element) |
| 2803 | extraCard | input | input | `exSet('${id}',${k},'r',this.value)` |
| 2804 | extraCard | click | button | `exRmSet('${id}',${k})` |
| 2807 | extraCard | click | button | `toggleAcc('${id}')` |
| 2809 | extraCard | change | select | `exPick('${id}',this)` (**save() allowed**) |
| 2812 | extraCard | click | button | `exAddSet('${id}')` |

`toggleAcc` is shared by Today (P4) and Log (P5). Register the action the first time a plan needs it, which is P4. `cLawnCard` renders on both Today and Care, so its conversion (P3a) changes Today's lawn card too. Say so in P3a's verification.

## Architecture Patterns

### System Architecture Diagram

```
 user gesture (tap / key / pointer)
          │
          ▼
 target element (may be <svg>/<path> inside a button, or a detached node after re-render)
          │  bubbles (click, input, change, keydown, pointerdown all bubble)
          ▼
 document listener ×5 ──► dispatchAction(e)
                              │
                              ├─ el = target.closest('[data-action]') ── none? ──► return (no-op)
                              ├─ el.disabled? ────────────────────────────────────► return
                              ├─ spec = ACTIONS[el.dataset.action] (own key only) ── missing? ─► return
                              ├─ fn = spec[e.type] ────── no handler for this event? ─► return
                              ▼
                        wrapper fn(el, e)
                              │ decodes: +el.dataset.i, el.dataset.id, el.value, el, e
                              ▼
               existing domain function (unchanged signature)
                              │
               ┌──────────────┼───────────────────────┐
               ▼              ▼                       ▼
        saveLocal() (draft)   save() (synced; only    render() → #app.innerHTML
                              non-draft fns + pickEx/  (the new markup carries data-action
                              exPick/finishWorkout)     again; no listener re-binding needed)
```

### Recommended placement in index.html

```
<body> static markup   ← stopwatch, idea FAB and sheet: data-action attributes, no JS
<script>
  … everything that exists today …
  function fallbackCopy(…){…}                      (≈ line 4683)
  /* ── Event delegation (F2) ── */                  ← NEW SECTION, here
  function dispatchAction(e){…}                     hoisted, safe anywhere
  const ACTIONS = {…};                              after every other const in the file
  ['click','change','input','keydown','pointerdown'].forEach(t => document.addEventListener(t, dispatchAction));
  /* ── Boot ── */                                   (existing, line 4685)
  document.querySelectorAll('[data-ph]')…
  if(migrationRan) save(); buildTabBar(); render(); updateStopwatch();
</script>
```

**Why here, and why the COLLECTIONS rule doesn't transfer.** `COLLECTIONS` must sit high because `blank()` reads it during `let DB = load()` at module-eval, and its values must be hoisted functions because they are dereferenced then. `ACTIONS` is read **only when an event fires**, and no event can fire until the synchronous inline script has finished, so nothing reads it at module-eval. Creating an arrow `(el) => setVal(…)` doesn't dereference `setVal` until the arrow runs. So arrow wrappers are TDZ-safe wherever `ACTIONS` sits. Placing it last, after every `const`, makes even a direct reference safe. Placing the registration next to it means that if the script dies at module-eval, the app is dead either way, just as today, because the first `render()` is on the last line. [VERIFIED: boot block at index.html:4685-4698 read this session; every called handler function is a column-0 `function` declaration per the classification run. The only non-function name used inside a handler is the `esc` const arrow at 941, and only inside `renameExercise('${esc(r.id)}')`.]

**Do not add a boot-time validator that throws.** If the planner wants a shared validator, write `function actionProblems(){ … return [] }` (hoisted, pure) and call it **only from the test**.

### Pattern 1: Event-keyed registry + dispatcher
**What:** each `ACTIONS` entry maps event type → wrapper. One element carries one `data-action`, and that one entry covers every event the element needs (weight input: `input` + `change`; stopwatch: `pointerdown` + `click`).
**When:** every converted handler.

```javascript
// Source: design for this repo; platform APIs per MDN addEventListener / Element.closest / dataset
/* ── Event delegation (F2) ─────────────────────────────────────────────────────────────
   Markup names an action; this is the only code that turns a tap into a call. One entry per
   action, keyed by event type, so a <select> firing both input and change runs only its change
   handler. Wrappers are thin: decode data-* (Number() every index — dataset is always a string)
   and call the existing function with its existing signature. A wrapper never touches DB and
   never calls save()/saveLocal() itself; the functions it calls own that (DRAFT-05). */
function dispatchAction(e){
  let t = e.target;
  if(t && t.nodeType === 3) t = t.parentElement;           // defensive: text-node targets
  const el = t && t.closest ? t.closest('[data-action]') : null;
  if(!el || el.disabled) return;
  const name = el.dataset.action;
  if(!Object.prototype.hasOwnProperty.call(ACTIONS, name)) return;
  const fn = ACTIONS[name][e.type];
  if(fn) fn(el, e);
}
const ACTIONS = {
  // shell
  go:        { click: el => go(el.dataset.tab) },
  setSub:    { click: el => setSub(el.dataset.sub) },
  reload:    { click: () => location.reload() },
  exportData:{ click: () => exportData() },
  // Enter-to-submit: the input names the CLICK action it stands in for (see Pattern 3)
  enter:     { keydown: (el, e) => { if(e.key !== 'Enter') return;
                 const a = ACTIONS[el.dataset.enter]; if(a && a.click) a.click(el, e); } },
  // stopwatch: swGuard's semantics unchanged — same event, same preventDefault, before click
  swToggle:  { pointerdown: (el, e) => swGuard(e), click: () => swToggle() },
  swClear:   { pointerdown: (el, e) => swGuard(e), click: () => swClear() },
  // backdrop: fires only when the backdrop itself is the target, as today
  ideasBackdrop: { click: (el, e) => { if(e.target === el) closeIdeas(); } },
  // D-02 chain → one action; Number() the indices
  setWeight: { input:  el => { const i = +el.dataset.i, k = +el.dataset.k;
                               setVal(i, k, 'w', el.value); updTargetBadge(i, k); updPlates(i); },
               change: el => rollWeight(+el.dataset.i, +el.dataset.k, el.value) },
  pickEx:    { change: el => pickEx(+el.dataset.i, el) },
  weekShift: { click:  el => weekShift(+el.dataset.d) },
  removeCardio: { click: el => removeCardio(el.dataset.id) },
  // …one entry per remaining action…
};
['click','change','input','keydown','pointerdown'].forEach(type => document.addEventListener(type, dispatchAction));
```

Markup side:

```javascript
// before: <button … onclick="weekShift(-1)">
`<button class="btn btn-ghost btn-sm" data-action="weekShift" data-d="-1">${ph('caret-left')}</button>`
// before: onclick="removeCardio('${c.id}')"   ← c.id inside JS quotes, esc() can't protect it
`<button class="x-set" data-action="removeCardio" data-id="${esc(c.id)}" title="delete">${ph('x')}</button>`
// before: oninput="setVal(…,'w',this.value);updTargetBadge(…);updPlates(…)" onchange="rollWeight(…)"
`<input type="number" inputmode="decimal" id="w-${i}-${k}" placeholder="0=BW" value="${esc(st.w)}"
        data-action="setWeight" data-i="${i}" data-k="${k}">`
```

### Pattern 2: Keep every action name literal in the source
**What:** never write `data-action="${…}"`. Helpers that used to receive code strings (`logRow`, versions `row`) receive **pre-built attribute fragments whose action name is a literal at the call site**, or they are inlined.
**Why:** the completeness test can then find every action name with one static regex. It doesn't have to reach every render state (the weigh-in `logRow` doesn't even render at the harness's frozen midday).

```javascript
// versionsCardHTML: the row helper takes the attribute fragment, not code
const row = (when, label, sum, act) => `…<button class="btn btn-sm btn-ghost" ${act}>Restore</button>…`;
snaps.map((s,i)=>row(s.at, s.label, s.summary||{}, `data-action="restoreSnapshot" data-i="${i}"`))
cloudVersionList.map(v=>row(v.at, v.label, v.summary||{}, `data-action="restoreCloudVersion" data-id="${esc(v._id)}"`))
// logRow: the input names the click action it submits
const logRow = (id, act, hint) => `<div class="row" style="gap:8px;margin-top:8px">
      <input type="number" inputmode="decimal" step="0.1" id="${id}" placeholder="${hint}" style="flex:1" data-action="enter" ${act.enter}>
      <button class="btn btn-sm" ${act.click}>Log</button></div>`;
logRow('wt-input',  { click:'data-action="logWeight"',    enter:'data-enter="logWeight"' },    `Your weight (${DB.unit})`)
logRow('pet-input', { click:'data-action="logPetWeightToday"', enter:'data-enter="logPetWeightToday"' }, `…`)
```

(`logPetWeight('pet-input')` on Today differs from Progress's `logPetWeight('pet-input','pet-date')`, so they need two action names, or one action that reads `data-date-el`. Pick one and keep the inventory mapping honest.)

### Pattern 3: Enter-to-submit through the registry, not a second copy of the call
The generic `enter` action looks up the **click** handler named in `data-enter` and runs it. The input's Enter and the button's tap then run the same code, and no action carries both `click` and `keydown`. Sites: `wt-input`, `pet-input` (via `logRow`), `todo-input` → `addTodo`, `loc-input` → `searchLocation`.

### Anti-Patterns to Avoid
- **A flat `ACTIONS[name] = fn` called for any event type.** Double and triple fires (Pitfall 2).
- **Reading `el.dataset.i` without `Number()`.** Silent wrong behaviour, not a crash (Pitfall 1).
- **Logic in wrappers** (`DB.draft.x = …; saveLocal()`). It escapes the DRAFT-05 scan (Pitfall 7).
- **Changing domain-function signatures to `(el, e)`.** It breaks DRAFT-05's table and ~40 behaviour tests for no gain.
- **`data-action` on a `<label>` wrapping a checkbox.** The label click and the forwarded input click both reach `document` and both resolve to the label, so the action runs twice (Pitfall 5).
- **`modal.contains(e.target)` for "outside click".** After `renderIdeasList()` replaces `innerHTML`, the target is detached and `contains()` is false. Keep the existing `e.target === el` check.
- **`e.stopPropagation()` anywhere.** There is no second listener to protect, and it would silently kill the document listener for that event.
- **Dynamic generation of wrappers via `window[name]`.** It breaks grep and go-to-definition. Phase 1 already records this for `liveX()` (01-RESEARCH Anti-Patterns).

## Keyboard Operability (DELEG-06)

### The real list is 20, not 17
CONTEXT counted 17 clickable non-buttons on "div/span/li/tr/label". The actual list is **16 `div` + 1 `span` + 3 `<a>` with no `href`**. There are no `li`, `tr` or `label` click handlers [VERIFIED: tag classification run]. An `<a>` without `href` is not focusable and has no link role, so the three anchors are as keyboard-dead as the divs:

| # | Line | Element | Action | Contents | Convert to |
|---|---|---|---|---|---|
| 1 | 285 | `div.modal-overlay` | backdrop close | the whole modal card (textarea, buttons) | **Keep as `div`, no role, no tabindex.** See exception below. |
| 2 | 1541 | `div.row` weigh-in header | `toggleAcc('weighin')` | `kicker()` div + caret span | `<button>` |
| 3 | 1563 | `div.card` weather | `goSub('care','lawn')` | divs/spans, text only | `<button>` |
| 4 | 1568 | `div.card` this week | `goSub('train','history')` | divs, text | `<button>` |
| 5 | 1572 | `div.card` cardio | `goSub('train','cardio')` | divs incl. progress bar divs | `<button>` |
| 6 | 1582 | `div.row` mobility header | `toggleAcc('mob-today')` | kicker + divs | `<button>` |
| 7 | 1690 | `div` preview toggle | `togglePreview(name)` | pill span + div | `<button>` |
| 8 | 1778 | `div.ex-body` collapsed exercise | `toggleExCollapse(i)` | `div.row` + spans | `<button>` |
| 9 | 2207 | `div.hist-item` | `toggleHist(idx)` | div + spans (detail is a sibling) | `<button>` |
| 10 | 2356 | `div.hist-item` PR | `selectPR(i)` | spans | `<button>` |
| 11 | 3220 | `div.card` lawn heads-up | `goSub('care','lawn')` | divs | `<button>` |
| 12 | 3263 | `div.row` lawn header | `goSub('care','lawn')` | kicker + span | `<button>` |
| 13/14 | 4551, 4562 | `div.row` trash header | `toggleTrash()` | divs + spans | `<button>` |
| 15/16 | 4577, 4590 | `div.row` versions header | `toggleVersions()` | divs + spans | `<button>` |
| 17 | 2115 | `span` × | `removeActivity(idx)` | "×" | inline `<button>` (add `aria-label="Remove"`) |
| 18 | 1526 | `a` | `goSub('train','history')` | text + icon | inline `<button>` styled as link |
| 19 | 2096 | `a` | `editJournal(iso)` | icon + text | inline `<button>` styled as link |
| 20 | 2106 | `a` | `openActivityAdd(iso)` | text | inline `<button>` styled as link |

**None of #2–#20 has an interactive descendant**, so no site needs the `role="button"` fallback [VERIFIED: each template read this session. Nested controls such as the weigh-in "Chart" buttons, the lawn block buttons and the history edit row are siblings, not children]. The only content-model issue is that most contain `<div>` children (including `kicker()`, which returns a `<div>` at index.html:1478). The WHATWG content model for `<button>` is "Phrasing content, but there must be no interactive content descendant and no descendant with the tabindex attribute specified" [CITED: html.spec.whatwg.org/multipage/form-elements.html#the-button-element]. A `<div>` inside a `<button>` is non-conforming but parses and renders normally, because only a nested `<button>` start tag closes a button. **Recommendation:** convert the 19 to `<button>` and swap their inner `<div>`s for `<span style="display:block">` (or a `kicker` span variant) where the edit is cheap. If some inner `<div>` is left, it is a validator warning, not a functional or accessibility defect. Don't use `role="button"` for any of these. MDN says to use native buttons "where possible" [CITED: developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/button_role].

**Exception, the modal backdrop (#1).** It is a container of interactive controls, so wrapping it in `<button>` is illegal (interactive descendants), and `role="button"` on it would nest interactive roles. Its keyboard path already exists: the sheet's own **Close** button (line 287). Keep it a `div` with `data-action="ideasBackdrop"` and the `e.target === el` guard. Record the rationale in VERIFICATION as the DELEG-06 disposition. Adding an Escape-to-close is optional polish, and it would need a `keydown` action (`if(e.key==='Escape')`) on the overlay. This reading of D-04 needs the planner's sign-off (Open Question 1).

**Because no site needs it, don't build the Enter/Space `role=button` path.** If a later site genuinely needs it: activate on Enter keydown, `preventDefault()` on Space keydown to stop the page scrolling, and activate on Space **keyup** to match native buttons. That requires a `keyup` listener D-01 doesn't list [CITED: MDN button role, which shows `preventDefault()` on Space "to stop scrolling"].

### CSS reset for converted buttons (theme-safe, zero specificity)
```css
/* Converted click targets (F2): a <button> that must look exactly like the div/a it replaced.
   :where() has zero specificity, so .card / .row / .hist-item / .ex-body still win for background,
   border, padding and display. `* {margin:0;padding:0;box-sizing:border-box}` already applies. */
:where(button.tap)   { display:block; width:100%; background:none; border:0; color:inherit;
                       font:inherit; letter-spacing:inherit; text-align:inherit; cursor:pointer;
                       -webkit-appearance:none; appearance:none; }
:where(button.tap-inline) { display:inline; background:none; border:0; padding:0; color:inherit;
                       font:inherit; cursor:pointer; -webkit-appearance:none; appearance:none; }
```
Facts it relies on: `* { box-sizing: border-box; margin: 0; padding: 0; }` exists at index.html:40. The global button rule is only `button { font-family: inherit; }` at line 56, so a button would otherwise shrink to UA font-size and centre its text. `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }` at line 239 gives every converted control a visible focus ring for free. `body` sets `-webkit-tap-highlight-color: transparent`, which is inherited, so tap feedback is unchanged [VERIFIED: index.html lines 40-56 and 239 read/grepped this session]. `.phase-header` (line 140) is an existing precedent for a full-width, left-aligned, transparent `<button>`. `:where()` is supported in every current browser [ASSUMED: Chrome 88+/Safari 14+]. **Visual check required** per screen, most importantly for the 3 whole-`.card` buttons on Today (#3–#5) and the inline link-buttons (#18–#20), which sit mid-sentence.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Keyboard activation of clickable divs | `role=button` + `tabindex` + Enter/Space keyup/keydown logic | Native `<button>` + the `:where(button.tap)` reset | Native buttons bring focusability, Enter/Space (Space on keyup), AT semantics, and the existing `:focus-visible` ring |
| Finding the element that owns an action | Manual `parentNode` loop | `Element.closest('[data-action]')` | Works on SVG targets (the Phosphor icons are inline `<svg aria-hidden="true">`) and on detached subtrees |
| Attribute escaping | A new escape helper | Existing `esc()` | It already escapes `"`, which is all a double-quoted attribute needs. `dataset` returns the decoded value, so the round trip is exact |
| Handler inventory | Manual counting | The generator script (Code Examples) | The hand count in ROADMAP was already wrong (172 vs 175) |
| Arg type coercion | Ad-hoc `parseInt` per site | `+el.dataset.x` (or one hoisted `function dnum(el,k){ return Number(el.dataset[k]); }`) | `parseInt` silently accepts `"3px"`. One idiom is greppable |

**Key insight:** delegation fails silently. A dropped call site, a string where a number was, or a double fire all look like "the button does nothing" or "it toggled twice". The inline version would have either worked or thrown. The completeness test and the string/number guards are the phase.

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None. The phase changes markup and dispatch only. No `DB` field, schema, `SCHEMA`/`MIGRATIONS` or localStorage key changes [VERIFIED: handler targets are existing functions; no new persisted state] | none |
| Live service config | None. Firestore rules and the Firebase config are untouched | none |
| OS-registered state | Service worker `sw.js` (`CACHE_VERSION = 'v2-2026-08-10'`) caches `./index.html`, but the strategy is **network-first** [VERIFIED: sw.js read]. A new index.html reaches the phone without a cache bump. GitHub Pages `max-age=600` can delay it about 10 minutes (project memory: pwa-update-lag-on-phone) | No cache bump required. **Before the DELEG-07 phone pass, confirm Settings → This version shows the new build stamp** |
| Secrets/env vars | None | none |
| Build artifacts | None. The deploy only stamps `__BUILD_STAMP__` (deploy.yml:53-54) | none |

## Common Pitfalls

### Pitfall 1: `dataset` values are strings. Silent wrong behaviour on numeric args
**What goes wrong:** `weekShift("-1")` sets `reviewWeekOffset = Math.min(0, 0 + "-1")`, which is `Math.min(0, "0-1")`, which is `NaN`. `toggleExCollapse("2")` adds `"2"` to a `Set` that `viewActive` queries with the number `2`, so the card never collapses. `toggleHist` uses `openHist===i`. `skipSet` prompts `Why skipping set ${k+1}`, which becomes "set 01". `toggleGuide` and `skinTogglePhase` use `Set.has`.
**Why:** inline handlers interpolated `${i}` as a JS number literal. `dataset` always returns strings.
**Avoid:** every numeric `data-*` goes through `+el.dataset.x` in the wrapper. Add a test that dispatches `toggleHist`/`toggleExCollapse` twice through `dispatchAction` and asserts it toggles back, and that `weekShift` via the dispatcher yields "Last week".
**Evidence:** index.html:2060-2063, 1948-1949, 2221, 2689, 2825 [VERIFIED: read this session].

### Pitfall 2: One element, several events: route by `e.type`
**What goes wrong:** a flat registry runs `pickEx` on both the `input` and the `change` of a `<select>`, so there are two `save()`s and, for `__custom`, two prompts. A checkbox's `click` → `input` → `change` flips `toggleMobility`/`doneTodo` three times. The programmatic `document.getElementById('imp').click()` / `pickCardioFile()` synthesizes a `click` on a file input whose action is `change`-only. The weight input has `input` and `change` doing different things.
**Avoid:** `ACTIONS[name][e.type]`, as in Pattern 1. Add a test that every entry's keys are a subset of the five event types.

### Pitfall 3: Enter on a button fires `click`. Don't also bind `keydown` there
**What goes wrong:** if the `logWeight` entry has both `click` and `keydown(Enter)` and the button carries it, Enter on the focused button runs `keydown` → `logWeight()` and then the native activation runs `click` → `logWeight()`. The weigh-in is logged twice.
**Avoid:** Pattern 3. `keydown` only on the `enter` action, which lives only on text inputs. Add a test that no `ACTIONS` entry other than `enter` has a `keydown` handler.

### Pitfall 4: `change` fires on blur, which happens before the next tap's `click`
**What goes wrong (pre-existing, not introduced):** typing reps and then tapping "+ Add set" runs `pointerdown` → focus moves → blur → `change` → `repCheck` (starts the rest clock, maybe confetti) → `click` → `addSet`. This order is identical today and after delegation. List it in the DELEG-07 checklist so it isn't mistaken for a regression. `setVal`/`rollWeight`/`repCheck` don't call `render()` [VERIFIED: index.html:1930-1968], so the tapped button isn't replaced between `pointerdown` and `click`.

### Pitfall 5: Label forwarding double-fire
**What goes wrong:** the mobility row is `<label>` wrapping `<input type="checkbox">` plus an `<a href>` (index.html:2780-2783). If `data-action` moved to the `<label>` with a `click` handler, one tap dispatches two clicks (label, then the forwarded click on the input), both resolve to the label via `closest`, and the toggle runs twice.
**Avoid:** keep `data-action` on the `<input>` with a `change` handler. `change` fires once per toggle. The same applies to History's `<label>Date <input type="date">`.

### Pitfall 6: `swGuard` must keep `preventDefault` working
**What goes wrong:** if the `pointerdown` listener were passive, `e.preventDefault()` would be ignored, and tapping the stopwatch mid-set would dismiss the keyboard.
**Facts:** passive defaults to `false` except for `wheel`, `mousewheel`, `touchstart` and `touchmove` on Window/Document/body in non-Safari browsers. `pointerdown` isn't in that list [CITED: developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener]. The document listener runs in the bubble phase of the same event, before the default action, just as the inline target-phase handler did.
**Avoid:** register without `{passive:true}` (optionally pass `{passive:false}` to make it explicit). Keep `swGuard(e)` byte-identical [VERIFIED: index.html:3668-3672].

### Pitfall 7: `ACTIONS` wrappers escape the DRAFT-05 "who calls save()" scan
**What goes wrong:** the DRAFT-05 structural check walks `Object.keys(a.__sandbox)`, which holds only top-level **function declarations**. It flags any function whose comment-stripped source matches `/\bDB\.draft\b/` and `/(?<![\w.$])save\(\)/`, against the allowlist `DRAFT_PUSHERS = ['exPick', 'finishWorkout', 'pickEx']` [VERIFIED: test/app.test.js:3289, 3354-3364]. `const ACTIONS` and its arrow values are not sandbox properties, so a wrapper that did `DB.draft.x=v; save()` would pass unnoticed.
**Avoid:** (a) wrappers stay thin: no `DB` and no `save(`/`saveLocal(` in any handler source. Enforce with a test over `Function.prototype.toString` of every `ACTIONS[a][ev]`. (b) Extend the DRAFT-05 scan to also include `ACTIONS` handler sources, so the property holds if (a) is ever relaxed. **Keeping existing signatures means `DRAFT_ONLY_MUTATORS` (25 rows) needs no change.** The `dbAssignLines` DB-replacement tripwire already scans the whole `__src`, so it covers `ACTIONS` automatically [VERIFIED: test/app.test.js:3015-3035].

### Pitfall 8: The existing export test pins the inline handler
`test/app.test.js:3533` counts `onclick="exportMarkdown\(\)"` in `__src` and requires exactly 1 [VERIFIED: read]. P2 must retarget it to the property (exactly one control's action calls `exportMarkdown`, sitting between the JSON export and Import buttons). Assert that, not the new literal text.

### Pitfall 9: Guard regexes that over- or under-match
- `/\bonload=/` matches `r.onload=` (a JS property, lines 3616 and 3759). `/\son[a-z]+\s*=/` matches `const one = e1rm(w, r)` (line 927) [VERIFIED: ran both over index.html].
- **Use** `/\son[a-z]+\s*=\s*["'`$]/i` over the raw file with HTML comments and JS comments stripped. It matched exactly the 175 today plus nothing else [VERIFIED: equivalent regex run]. It is broader than the five DELEG events on purpose: Phase 7's CSP blocks *every* inline handler attribute. MDN: "inline event handlers are blocked", and hash sources "allow scripts and styles by their hash, but not event handlers" without `'unsafe-hashes'` [CITED: developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src].

### Pitfall 10: Disabled controls
`weekShift(1)`'s button renders `disabled` at offset 0. Per the WHATWG activation behaviour, a disabled button doesn't activate [CITED: html.spec.whatwg.org form-elements]. Whether a click on a *child* (the SVG caret) of a disabled button is dispatched has varied between browsers [ASSUMED]. The dispatcher's `if(el.disabled) return;` makes it browser-independent. `weekShift` clamps with `Math.min(0, …)` anyway.

### Pitfall 11: Re-render mid-dispatch
`startEditIdea`/`saveEditIdea`/`cancelEditIdea` call `renderIdeasList()`, which replaces `#ideas-list` innerHTML while the click is still being dispatched. `render()` does the same to `#app` on nearly every action. With a single document listener, `closest()` has already run before the action, and no later listener consults the detached target, so this is safe. Two rules keep it safe: **never add a second delegated listener for the same event type** (a second lookup could see a detached node), and **never test "outside click" with `contains()`**. The event path is fixed at dispatch time, so a detached target still bubbles to `document` [ASSUMED: DOM spec event path computed before dispatch].

### Pitfall 12: User activation must survive the move
`copyIdeas` (clipboard), `exportData`/`exportMarkdown` (`navigator.share`), `document.getElementById('imp').click()` and `pickCardioFile()` (file pickers) all require transient user activation. A synchronous document listener runs inside the same trusted event, so activation is preserved. **Never defer a wrapper** (`setTimeout`, `await` before the call, `requestAnimationFrame`) [ASSUMED: standard transient-activation semantics].

### Pitfall 13: Attribute escaping on lines you rewrite
D-03 covers `data-*`. The Log plan rewrites the set-row inputs that carry `value="${st.w}"` / `value="${st.r}"` unescaped (index.html:1819-1820, 2802-2803). The same goes for stairs, date and duration `value=` attributes and `id="idea-edit-${i.id}"`. CLAUDE.md: "Escape attributes too when you touch them." REQUIREMENTS lists general attribute escaping as VAL-02 (deferred to v2). See Open Question 2.

## Draft save discipline under delegation (CLAUDE.md + Phase 4)

This section pulls together what Pitfall 7 and the Validation Architecture say about the draft rule. It is the rule the Log-tab plan must not break.

- **Rule:** draft edits persist with `saveLocal()`. Only `pickEx`, `exPick` and `finishWorkout` still `save()` from a draft path [VERIFIED: test/app.test.js:3289 — `const DRAFT_PUSHERS = ['exPick', 'finishWorkout', 'pickEx'];`].
- **Enforcement today:** (1) `DRAFT_ONLY_MUTATORS` (25 rows, test/app.test.js:3292-3352) calls each draft function **by name with its current positional signature**, for example `setVal(0,0,'r','8')` and `pickEx(0, { value:'Zercher carry' })`. It asserts no push, no `updatedAt` bump, and that the stored draft matches. (2) A structural scan (3354-3364) over every top-level function in `a.__sandbox` flags any whose comment-stripped source reads `DB.draft` and calls bare `save()` but isn't in the allowlist.
- **How delegation interacts:**
  - The wrappers live in `const ACTIONS`, which is **not** on the sandbox global, so the scan can't see them. Keep them thin: no `DB` and no `save`/`saveLocal`. Add a test for that, and extend the scan to cover `ACTIONS` handler sources.
  - **Do not change any draft function's signature.** The mutator table, the close-and-reopen replay (3366-3382), the editRef replay (3383-3399) and the async `pickEx` push test (3409-3429) then pass with no edits. If a chained action becomes a new top-level helper instead of an inline wrapper chain, its source contains no `DB.draft`, so the scan correctly ignores it.
  - `pickEx`/`exPick` wrappers pass the `<select>` element (`el`) exactly as `this` was passed, and `finishWorkout` is called with no args, so the three sanctioned pushers are unchanged.
  - The DRAFT-02 `dbAssignLines` tripwire (3015-3035) already scans the full script text, so it covers `ACTIONS` with no change.
- **P5 check:** after converting the Log tab, the DRAFT-05 block must be green **without edits to `DRAFT_ONLY_MUTATORS` or `DRAFT_PUSHERS`**. If either needs an edit, a signature or save path moved, which is a regression, not a test update.

## Every screen still draws (existing smoke check, unchanged)

`drawEvery()` (test/app.test.js:2512-2523) drives the real router (`go(tab)` → `setSub(sub)`) for every `TABS` entry and sub-tab. It runs in three states: with data (`uiFull`), fresh install (`uiEmpty`), and mid-workout (`uiDraft`, which draws `viewActive`). It fails on a throw or on the "Something broke on this screen" card. The phase changes only template text and adds data attributes, so the check should stay green unchanged after every batch. It is the fastest signal that a template edit broke a view, for example a stray backtick or an unbalanced `${` while rewriting attributes. Its rendered HTML is also a free input for tests. Collect `data-action="…"` from all three states' HTML as a **secondary** coverage check alongside the static source scan. Don't make it the primary one: the frozen midday clock never renders the morning weigh-in `logRow`, and trash/versions/ideas-edit need opened state.

## Code Examples

### Inventory generator (DELEG-01). Run once, before any conversion, and commit its output
```javascript
// Source: written and run this session against index.html @1426a6d (175 rows)
const fs = require('fs');
const src = fs.readFileSync('index.html', 'utf8'), lines = src.split('\n');
const lineOf = i => src.slice(0, i).split('\n').length;
function enclosing(ln){                                  // nearest column-0 function declaration
  for(let k = ln - 1; k >= 0; k--){
    const m = lines[k].match(/^(?:async\s+)?function\s+([A-Za-z0-9_$]+)/);
    if(m) return m[1];
    if(/^<script>/.test(lines[k])) break;
  }
  return '(static markup)';
}
const re = /\bon(click|change|input|keydown|pointerdown)="/g, rows = [], seen = {};
let m;
while((m = re.exec(src))){
  const start = m.index + m[0].length; let i = start, depth = 0;
  while(i < src.length){                                 // walk ${…} nesting to the closing quote
    if(src[i] === '$' && src[i+1] === '{'){ depth++; i += 2; continue; }
    if(depth && src[i] === '}'){ depth--; i++; continue; }
    if(!depth && src[i] === '"') break; i++;
  }
  const fn = enclosing(lineOf(m.index)), was = src.slice(start, i), event = m[1];
  const key = fn + '|' + event + '|' + was; seen[key] = (seen[key] || 0) + 1;
  const tag = ([...src.slice(Math.max(0, m.index - 400), m.index).matchAll(/<([a-zA-Z]+)[\s>]/g)].pop() || [])[1];
  rows.push({ fn, event, tag, was, occurrence: seen[key],
              calls: [...was.matchAll(/([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\(/g)].map(x => x[1])
                       .filter(n => n !== 'if'),
              action: null });
}
fs.writeFileSync('test/fixtures/handler-inventory.json', JSON.stringify(rows, null, 1) + '\n');
```
Hand-fix the 3 templated rows' `calls` after generating: `${fn}` → `["logWeight","logPetWeight"]`, `${action}` → `["restoreSnapshot","restoreCloudVersion"]`. For these rows a single source site maps to **two** actions, so give the snapshot an `actions: [...]` array for them. For `location.reload()` rows, `calls` is `["location.reload"]`. For `document.getElementById('imp').click()` it is `["document.getElementById","click"]`. Set `action` as each batch lands.

### Completeness test shape (DELEG-01/03/04). Properties only, no counts
```javascript
// Source: pattern for test/app.test.js, in the style of the DRAFT-05 structural checks
console.log('\n── F2: every inline handler became a delegated action (DELEG-01…05) ──');
const INV = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'handler-inventory.json'), 'utf8'));
const stripJs   = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const stripHtml = s => s.replace(/<!--[\s\S]*?-->/g, '');
const src = stripHtml(rawHtml);                                  // static markup + script
const A = app.ACTIONS || {};
const EVENTS = ['click','change','input','keydown','pointerdown'];
const fnSrc = name => name === '(static markup)' ? src.slice(0, src.indexOf('<script>'))
                    : (typeof app.__sandbox[name] === 'function' ? String(app.__sandbox[name]) : '');
const handlerSrc = (a, ev) => A[a] && typeof A[a][ev] === 'function' ? String(A[a][ev]) : '';
// 1. ratchet: every inventoried site is either still inline verbatim, or mapped and wired
const broken = INV.filter(r => {
  const names = r.actions || (r.action ? [r.action] : []);
  if(!names.length) return !fnSrc(r.fn).includes(`on${r.event}="${r.was}"`);  // dropped without mapping
  return names.some(a => {
    const ev = r.event === 'keydown' ? 'keydown' : r.event;
    const h = r.event === 'keydown' ? handlerSrc('enter', 'keydown') : handlerSrc(a, ev);
    const wired = fnSrc(r.fn).includes(`data-action="${a}"`) || fnSrc(r.fn).includes(`data-enter="${a}"`);
    const callsKept = r.calls.every(c => (handlerSrc(a, r.event === 'keydown' ? 'click' : ev)).includes(c.split('.').pop()));
    return !h || !wired || !callsKept;
  });
});
ok('F2: every inventoried call site is still inline, or maps to an ACTIONS entry that handles its event and keeps every call', broken.length === 0, broken.slice(0, 5));
// 2. no NEW inline handler: every remaining inline attribute is an unconverted inventory row
const INLINE = /\son([a-z]+)\s*=\s*"([^"]*)"/g;   // plus a separate check for ' and ` and unquoted ${ forms
const remaining = [...stripJs(src).matchAll(INLINE)];
const unconverted = new Set(INV.filter(r => !r.action && !r.actions).map(r => r.event + '|' + r.was));
ok('F2: no inline handler exists that is not an unconverted inventory row', remaining.every(m => unconverted.has(m[1] + '|' + m[2])), remaining.filter(m => !unconverted.has(m[1] + '|' + m[2])).map(m => m[0]).slice(0, 5));
// 3. every literal data-action / data-enter names an entry; no dynamic action names
const named = [...src.matchAll(/data-(?:action|enter)="([^"$]+)"/g)].map(m => m[1]);
ok('F2: every data-action in the markup has an ACTIONS entry', named.every(n => Object.prototype.hasOwnProperty.call(A, n)), named.filter(n => !(n in A)));
ok('F2: no action name is built at runtime', !/data-(?:action|enter)="\$\{/.test(src));
// 4. registry shape: event-keyed, thin, no double-fire keydown
ok('F2: every ACTIONS entry is keyed only by the five delegated events', Object.values(A).every(s => s && Object.keys(s).length && Object.keys(s).every(k => EVENTS.includes(k) && typeof s[k] === 'function')));
ok('F2: only the Enter action listens to keydown', Object.keys(A).filter(a => A[a].keydown).every(a => a === 'enter'));
ok('F2: wrappers never touch DB or persist (DRAFT-05 stays the only save() gate)', Object.keys(A).every(a => Object.keys(A[a]).every(ev => { const s = stripJs(String(A[a][ev])); return !/\bDB\b/.test(s) && !/\bsave(Local)?\(/.test(s); })));
// 5. propagation guard (DELEG-05): today there are zero; a new one fails by name until reviewed
const REVIEWED_PROPAGATION = [];   // add "fnName" here only after confirming it can't starve the document listener
const stoppers = Object.keys(app.__sandbox).filter(k => typeof app.__sandbox[k] === 'function'
  && /\.(stopPropagation|stopImmediatePropagation)\s*\(|\bcancelBubble\s*=/.test(stripJs(String(app.__sandbox[k]))));
ok('F2: nothing stops propagation without review', stoppers.every(n => REVIEWED_PROPAGATION.includes(n)) && !/\.(stopPropagation|stopImmediatePropagation)\s*\(|cancelBubble\s*=/.test(stripJs(Object.values(A).flatMap(s => Object.values(s).map(String)).join('\n'))), stoppers);
```
In P5, add the closing assertions: `INV.every(r => r.action || r.actions)` ("no unconverted rows remain") and "zero `on[a-z]+=` attributes remain" (the broad regex, Pitfall 9). The last means DELEG-02/04 hold with no number anywhere. The planner will refine the details (the keydown mapping, and multi-action rows needing the matching call per action). The shape above is the contract.

### Harness changes (test/harness.js)
```javascript
// 1. export the registry and dispatcher (add to `names`)
'ACTIONS', 'dispatchAction',
// 2. record listeners instead of dropping them, so a test can assert all five are wired
const listeners = {};
const doc = { …, addEventListener(type, fn){ (listeners[type] = listeners[type] || []).push(fn); }, … };
// after runInContext:
api.__listeners = listeners;
```
Test: `EVENTS.every(t => (a.__listeners[t]||[]).includes(a.dispatchAction))`. Also add `ACTIONS`/`dispatchAction` to `REQUIRED_EXPORTS` (test/app.test.js:133).

### Driving the dispatcher in the harness (no DOM needed)
```javascript
const fakeEl = (dataset, extra) => { const el = Object.assign({ dataset, disabled:false, value:'' }, extra);
  el.closest = sel => sel === '[data-action]' ? el : null; return el; };
const fire = (a, type, el, more) => a.dispatchAction(Object.assign({ type, target: el, key: undefined,
  preventDefault(){ this.defaultPrevented = true; } }, more));
fire(a, 'click', fakeEl({ action:'toggleHist', idx:'2' }));   // opens row 2
fire(a, 'click', fakeEl({ action:'toggleHist', idx:'2' }));   // must close it again (string would never match)
fire(a, 'input', fakeEl({ action:'pickEx', i:'0' }, { value:'Zercher carry' }));   // input on a select → must be a no-op
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline `on*=` attributes calling globals | `addEventListener` + delegation via `closest()` + `data-*` | Long-standing practice. CSP Level 2/3 made inline handlers a policy blocker | Required for Phase 7's hash-based CSP without `'unsafe-inline'`/`'unsafe-hashes'` [CITED: MDN script-src] |
| `change`/`input` not bubbling (historic IE) | Both bubble in the HTML Standard ("Make 'input' and 'change' events bubble", whatwg r3473, 2009). `input` is fired "with the bubbles and composed attributes initialized to true" | 2009 | Document-level delegation of form events is safe [CITED: html.spec.whatwg.org/multipage/input.html; lists.w3.org public-html-diffs 2009Jul/0206] |
| Clickable `div`s | Native `<button>` with CSS reset | Current a11y guidance | Keyboard and AT support by default [CITED: MDN button role] |

**Deprecated/outdated:** `'unsafe-hashes'` as a way to keep inline handlers under CSP works, but MDN presents it only as a fallback "if code can't be updated to equivalent addEventListener calls". This phase makes the fallback unnecessary.

## Log-tab verification checklist (DELEG-07 draft for the P5 plan)

Pre-flight: deploy, then on the phone open Settings → **This version** and confirm the new stamp (Pages can lag about 10 minutes). The desktop keyboard pass comes first: serve the worktree with `py -m http.server 8080` (Python 3.14.4 available) or `node -e` static server, open `http://localhost:8080/`, and drive with Tab / Shift-Tab / Enter / Space only.

1. **Picker:** expand/collapse a program preview (keyboard: Tab to it, Enter), open a "How this program works" guide section, Skip a day (confirm prompt), Start PUSH 1. In 4-day mode also start a Specialized option.
2. **Weight input:** type a weight. The target badge and plate text update live. Blur rolls the weight into empty sets below.
3. **Reps input:** type reps. The badge updates. Blur starts the rest stopwatch. Top-of-range shows confetti and a toast.
4. **Stopwatch:** with the keyboard up, tap play/pause. **The keyboard stays up and focus stays in the input** (swGuard). With the keyboard down, tap. It stays down. Clear works.
5. **Sets:** "+ Add set", remove a set (×), skip a set (prompt text says "set 2", not "set 12"), Undo skip.
6. **Collapse:** collapse an exercise (caret), then expand from the summary row (tap and keyboard Enter).
7. **Deload:** a stalled slot's "Deload −10%" and "undo".
8. **Swap exercise:** select another example. Select "+ Custom…". The prompt appears **once**.
9. **Warm-up ramp** toggles on the first exercise.
10. **Notes:** exercise note and session note persist across a tab switch.
11. **Accessories:** open the Warm-up / Cool-down accordions. Open an extra (abs), pick an exercise, enter weight/reps (weight rolls down on blur), add and remove a set.
12. **Stairs:** level/min/sec. Skip (prompt) and Undo.
13. **Backdated workout** (History → Add a past workout): date and minutes fields.
14. **Finish & save.** The session appears in History and pushes once (sync status). Start another and Discard (confirm).
15. **Regression sweep:** tab bar and sub-tabs, Today weigh-in Enter-to-log (**logs once**), to-do Enter-to-add (once), Lawn Enter-to-search.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `:where()` is supported by every browser Ian uses (Android Chrome, desktop) | CSS reset | Low. Without it the reset's specificity is (0,1,1), which beats `.card` and flattens card backgrounds. Visible immediately in the visual check |
| A2 | Clicks on a child of a disabled `<button>` may or may not dispatch depending on browser | Pitfall 10 | None. The `el.disabled` guard makes it moot |
| A3 | The event path is computed before dispatch, so a target detached mid-dispatch still bubbles to `document` | Pitfall 11 | Low. Only one listener runs. `closest()` has already run |
| A4 | A synchronous delegated handler keeps transient user activation for clipboard/share/file-picker | Pitfall 12 | Medium. A broken import or Strava upload would be noticed only on a device. Include "Import backup opens the picker" and "Copy all ideas" in the P2 manual check |
| A5 | Android Gboard reports `e.key === 'Enter'` on number and text inputs, same as today | Pattern 3 | None new. Semantics are copied verbatim from today's inline check |

## Open Questions (RESOLVED — Q1–Q4 by CONTEXT D-08..D-11 addendum 2026-09-24; Q5 by plan 05-01 count fix)

1. **Does the modal backdrop count under D-04?**
   - What we know: D-04 says convert the 17 to `<button>`, or fall back to `role=button`. The backdrop can legally be neither (interactive descendants), and it already has a keyboard path: the Close button.
   - Recommendation: record it as an explicit DELEG-06 disposition ("not a control; keyboard path = Close button"). Optionally add Escape-to-close. Planner confirms or asks Ian.
2. **Escape `value="${…}"` on rewritten lines, or leave for VAL-02?**
   - What we know: CLAUDE.md says "Escape attributes too when you touch them". REQUIREMENTS defers general attribute escaping (VAL-02) to v2.
   - Recommendation: `esc()` every attribute on a line the phase rewrites. It's one call, it closes a real hole on exactly the lines being touched, and it doesn't claim VAL-02 (which is about *all* attributes plus the `'` gap).
3. **Inner `<div>` → `<span style="display:block">` inside converted buttons, or accept non-conforming markup?**
   - Recommendation: swap where cheap (it is invisible), and don't block on it. It isn't a DELEG-06 failure.
4. **Split P3 into Care (20) and Train-non-Log (39)?** Recommended. 59 sites in one plan is the largest diff of the phase, and Care vs Train are independent screens.
5. **ROADMAP.md / REQUIREMENTS.md say 172.** CONTEXT asks to correct them to 175. Put the edit in P1 alongside the snapshot, stated as "175 at 1426a6d". The test never asserts it.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | `npm test` | ✓ | v24.15.0 | — |
| npm | `npm test` script | ✓ | (bundled) | `node test/app.test.js` |
| Python (`py` launcher) | Desktop keyboard pass, static server | ✓ | 3.14.4 (`py`; the `python`/`python3` aliases are Store stubs) | `node -e` one-file static server |
| Browser pane / Chrome | D-06 keyboard-only desktop pass | not probed | — | Ian runs the pass locally |
| Ian's phone (Android) | DELEG-07 | human | — | none, required by D-06 |

**Missing dependencies with no fallback:** none. **Note:** `python` and `python3` resolve to Microsoft Store stubs. Use `py`.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Custom `ok()` assertions in `test/app.test.js`, with the Node `vm` harness `test/harness.js` (no runner, no deps) |
| Config file | none. `package.json` `"test": "node test/app.test.js"`. CI sets `TZ: America/Chicago` (deploy.yml:27) |
| Quick run command | `TZ=America/Chicago npm test` (whole suite ≈ 3 s. Baseline this session: **794 passed, 0 failed, 2 skipped**) |
| Full suite command | same |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DELEG-01 | Inventory snapshot exists, parses, and every row has fn/event/was/calls | structural | `npm test` (section "F2: …") | ❌ Wave 0: `test/fixtures/handler-inventory.json` + test block |
| DELEG-02 | Every row mapped. Zero `on[a-z]+=` attributes (final plan). Dispatcher registered for 5 events | structural + unit | `npm test` | ❌ Wave 0 |
| DELEG-03 | Ratchet: each row still inline verbatim, or mapped to an entry handling its event, wired by `data-action` in the same function, and calling every original callee | structural | `npm test` | ❌ Wave 0 |
| DELEG-04 | No dynamic action names. Every `data-action`/`data-enter` has an entry. Broad inline-handler ban | structural | `npm test` | ❌ Wave 0 |
| DELEG-05 | No `stopPropagation`/`stopImmediatePropagation`/`cancelBubble` outside an empty reviewed allowlist, in functions or `ACTIONS` | structural | `npm test` | ❌ Wave 0 |
| DELEG-06 | Converted controls are `<button>` (no `div`/`span`/`a` carrying a click `data-action`, except the reviewed backdrop). Keyboard pass | structural + manual | `npm test` + desktop keyboard pass | ❌ Wave 0 (structural) |
| DELEG-07 | Log tab end to end on the phone | manual-only (D-06: real device, real workout) | checklist above | n/a |
| (cross-cutting) | Numeric args arrive as numbers. `select`/checkbox fire once. Enter logs once. `swGuard` preventDefault reaches the event | unit via `dispatchAction` + fake events | `npm test` | ❌ Wave 0 |
| (cross-cutting) | Wrappers thin (no `DB`, no `save`). DRAFT-05 scan extended to `ACTIONS` | structural | `npm test` | ❌ (extend the existing DRAFT-05 block) |
| (cross-cutting) | Hostile ids (`'`, `"`, `<`) in ideas/cardio/sleep render only escaped inside `data-*` | behavioural (rendered HTML) | `npm test` | partial: seed has a hostile idea *text*, not a hostile *id*. Add hostile ids |

Existing tests that **must keep passing unchanged** (they prove behaviour didn't move): DRAFT-05 mutator table (test/app.test.js:3292-3352), DRAFT-02 `dbAssignLines` (3015-3035), "every screen still draws" (2469-2548) in 3 states, and the escaping check (3458-3463). **One existing test must be retargeted:** export button placement (3533). Change it from the `onclick="exportMarkdown()"` literal to the property "exactly one control's action calls `exportMarkdown`".

### Sampling Rate
- **Per task commit:** `TZ=America/Chicago npm test`
- **Per plan (screen batch):** full suite plus a visual/keyboard spot-check of that batch's screens
- **Phase gate:** suite green, desktop keyboard-only pass over all screens, DELEG-07 phone checklist, then `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `test/fixtures/handler-inventory.json`: generated **before** any markup edit (DELEG-01 ordering is itself the requirement)
- [ ] `test/harness.js`: export `ACTIONS`, `dispatchAction`, and record `document.addEventListener` into `__listeners`
- [ ] `test/app.test.js`: new "F2" section (ratchet, registry coverage, shape, thin wrappers, propagation guard, dispatcher unit tests), `REQUIRED_EXPORTS` additions, and the DRAFT-05 scan extension
- [ ] `index.html`: `dispatchAction`, empty-ish `ACTIONS`, 5 listeners and the `:where(button.tap…)` CSS reset. They land in P1 with the shell conversions as the tracer

## Security Domain

`security_enforcement: true`, ASVS level 1 (.planning/config.json).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | unchanged (Firebase Auth) |
| V3 Session Management | no | unchanged |
| V4 Access Control | no | unchanged (firestore.rules) |
| V5 Validation, Sanitization and Encoding | **yes** | `esc()` on every interpolated `data-*`. Args decoded from `dataset`, never from JS source text. `Number()` on numeric args |
| V6 Cryptography | no | — |
| V14 Configuration (CSP precondition) | **yes, enabling** | Removing all inline handlers lets Phase 7 ship `script-src` with hashes and without `'unsafe-inline'`/`'unsafe-hashes'` |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| DOM XSS via a data-derived id inside inline-handler quotes: `removeCardio('${c.id}')`, `removeIdea('${i.id}')` ×4, `restoreCloudVersion('${v._id}')`, `renameExercise('${esc(r.id)}')` (`esc` leaves `'`). `validateBackup()` checks shape only, so an imported backup can set any id | Tampering / Elevation | Move the value to `data-id="${esc(id)}"`. It's then only ever data, and `"` is escaped. The sleep view's `safeId` guard (index.html:3911) shows the hole was already known for one collection |
| Attribute breakout via an unescaped `"` in a `data-*` value | Tampering | `esc()` escapes `"` → `&quot;` [VERIFIED: index.html:941 — `const esc = s => String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));`]. All attributes are double-quoted |
| Action-name injection (user data choosing which registry function runs) | Elevation | Action names are literals in source only (test: no `data-action="${`). The dispatcher requires an **own** key (`hasOwnProperty`), so `constructor`/`__proto__` can't resolve |
| Silent loss of a safety control (dropped `confirm()` path, e.g. `wipe`, `deleteSession`) | Repudiation / DoS on data | Wrappers call the unchanged functions, which own their confirms. The ratchet asserts every original callee is still called |

## Sources

### Primary (HIGH confidence)
- `index.html` @1426a6d: read this session: lines 272-291 (static markup), 941 (`esc`), 1398-1440 (tab bar, segNav, render), 1490-1625 (viewToday, logRow), 1685-1910 (viewPicker, viewActive), 1921-1990 (draft mutators), 2060-2063, 2088-2212 (week review, history), 2350-2368, 2586-2598, 2690-2700, 2775-2850, 2918-2930, 3215-3340 (lawn), 3350-3404 (settings), 3655-3700 (stopwatch, swGuard), 3848-3934 (cardio, sleep), 4545-4632 (trash, versions, sync), 4655-4699 (ideas, boot); CSS lines 18-265
- `test/harness.js` (whole file) and `test/app.test.js` lines 1-160, 2469-2568, 3005-3036, 3276-3463, 3515-3544: read this session
- Generator/classifier scripts run this session over index.html (inventory of 175, tag and arg-shape classification, regex false-positive checks)
- `npm test` run this session: 794 passed / 0 failed / 2 skipped
- MDN, CSP `script-src` (inline handlers blocked; hashes don't cover handlers; `'unsafe-hashes'`): https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src
- MDN, `addEventListener` passive defaults: https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
- MDN, ARIA `button` role (Enter/Space, tabindex, prefer native): https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/button_role
- WHATWG HTML, `<button>` content model and disabled activation: https://html.spec.whatwg.org/multipage/form-elements.html#the-button-element

### Secondary (MEDIUM confidence)
- WHATWG HTML input events (`input` fired with bubbles and composed true): https://html.spec.whatwg.org/multipage/input.html
- whatwg r3473, "Make 'input' and 'change' events bubble": https://lists.w3.org/Archives/Public/public-html-diffs/2009Jul/0206.html
- whatwg/html issue 6853 (UA-initiated change events bubble): https://github.com/whatwg/html/issues/6853
- MDN `change` event (timing per control type): https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/change_event

### Tertiary (LOW confidence)
- Assumptions A1–A5 above

## Metadata

**Confidence breakdown:**
- Inventory and codebase facts: HIGH. Generated by script and spot-read line by line
- Dispatcher design and placement: HIGH. Follows D-01, and the TDZ reasoning is checked against the actual boot block
- Test design: HIGH for the approach (mirrors the existing DRAFT-05 and `dbAssignLines` structural checks); MEDIUM for exact regex details, which the planner will refine
- Browser semantics: HIGH for passive/CSP/button (MDN/WHATWG); MEDIUM for change bubbling (spec history + issue); LOW for A2–A4

**Research date:** 2026-09-23
**Valid until:** until index.html changes. Line numbers are pinned to 1426a6d; regenerate the inventory if anything lands before P1.
