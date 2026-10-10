---
phase: 05-f2-event-delegation
reviewed: 2026-09-25T12:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - CLAUDE.md
  - docs/adding-a-collection.md
  - index.html
  - test/app.test.js
  - test/fixtures/handler-inventory.json
  - test/harness.js
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
status: issues_found
---

# Phase 5: Code Review Report

**Reviewed:** 2026-09-25
**Depth:** standard (phase diff `afda969..HEAD`, targeted reads of `index.html` and `test/app.test.js`)
**Files Reviewed:** 6
**Status:** issues_found

## Summary

The conversion is mechanically sound. Checked and found correct:

- **Registry coverage.** Every literal `data-action="…"` name in `index.html` has an `ACTIONS` entry, and every `data-enter` target (`addTodo`, `logWeight`, `logPetWeight`, `searchLocation`) has an own `click`. No action name is built at runtime.
- **Argument types.** Every index is decoded with a unary plus. Every id, key and name stays a string, as the old inline calls passed them. `toggleLawnLog` and `logPetWeight` never pass an `undefined` second argument.
- **Events.** Nothing runs twice: selects, checkboxes and date inputs act on one event each. Label-forwarded clicks (mobility rows, History date) land on change-only controls, and no `<label>` wraps a converted button. The stopwatch `pointerdown` still reaches `swGuard`, and every listener is registered non-passive. Nothing calls `stopPropagation`.
- **Draft rule.** Every draft function the wrappers call uses `saveLocal()` (checked 23 functions). `skipDay` and `changeSessionDate` still call `save()`, and both write synced session rows.
- **Suite.** `TZ=America/Chicago npm test`: **885 passed, 0 failed, 2 skipped** (matches the baseline).

Both deferred items are real, and both reproduce through `test/harness.js`. Two new problems also turned up:

- An attribute on a line this phase rewrote is still unescaped. That contradicts the new CLAUDE.md claim.
- A layout regression in the Log tab picker. It reproduced in headless Chrome.

## Warnings

### WR-01: `logRow` placeholder breaks out of its attribute on a hostile `DB.unit` — on a line Phase 5 rewrote

**File:** `index.html:1549` (sink); call sites `index.html:1563` and the pet row just below it. The same raw `DB.unit` also appears at `index.html:2299` and `index.html:2325`.

**Issue:** `logRow` writes `placeholder="${hint}"` without escaping it. The new comment says "the caller owns the escaping", but the weight call site passes `` `Your weight (${DB.unit})` `` raw. The pet call site escapes `petName()` but not `DB.unit`. Nothing constrains `DB.unit`: `validateBackup()` accepts any value and `normalize()` keeps it.

This breaks the new CLAUDE.md sentence "The template lines Phase 5 rewrote escape their attribute values". `logRow` is one of those lines.

**Reproduced** (harness): `importReplace()` a backup with `unit: '"><img src=x onerror=alert(3)>'`, open the weigh-in card, then call `viewToday()`. The output contains `<input … id="wt-input" placeholder="Your weight (">` followed by a live `<img onerror>`. The same breakout also pushes `data-action="enter"` out of the tag, so Enter-to-log stops working.

**Fix:** escape at the sink, and pass the pet hint unescaped so it isn't escaped twice:
```js
const logRow = (id, act, hint) => `…placeholder="${esc(hint)}"…`;
// pet call site: `${petName()}'s weight (${DB.unit})`   (esc() at the sink now covers it)
```
Also wrap `DB.unit` in `esc()` at lines 2299 and 2325. Add a hostile-unit check alongside the D-09 set-row checks.

### WR-02: Logged set values (and other stored session fields) render as HTML without `esc()` — deferred item 2 confirmed

**File:** `index.html:1010` (`fmtSet`). Sinks:
- `index.html:1683` (picker preview "Last:")
- `index.html:1804` and `:1810` (active workout "Last time")
- `index.html:2200` (History `setsOf`)
- `index.html:2197` (`s.durationMin`, now inside the converted `<button class="hist-item tap">`)

**Issue:** `fmtSet` interpolates the stored `w` and `r` as they are. `validateBackup()` checks shape only, and `normalize()` does not coerce set values, so a merged backup keeps any string.

**Reproduced** (harness):
- `importMerge()` a backup whose set has `w: '<img src=x onerror=alert(1)>'`. `validateBackup` returns `null` and the stored `w` is unchanged. After `toggleHist`, `viewHistory()` contains the raw `<img …>` and no `&lt;img`.
- The same test with `durationMin: '</button><img src=x onerror=alert(2)>'` injects through `right`. It closes the new `<button>` early, so everything after it falls outside the tap target.

`viewStrength` did not reproduce: its worked-set filter drops non-numeric weights. Risk stays low while the data is Ian's own (owner-gated Firestore, his own backups). Phase 7's CSP would also block `onerror`, but not markup injection.

**Fix:** escape at each sink: `esc(fmtSet(x.w, x.r))` in the four places above, `esc(String(s.durationMin))` in `right`, and `esc(s.workout)` in the History pill. Do not escape inside `fmtSet` itself: `setStatus` already escapes the title it builds from `fmtSet`, and the Markdown exporter has its own escaping, so both would end up escaped twice. Add a hostile-history check for `viewHistory` and `viewPicker`.

### WR-03: `:where(button.tap){width:100%}` squeezes the picker's Skip/Start group — "Start ▶" wraps

**File:** `index.html:60` (rule), `index.html:1702` (the `togglePreview` button inside a `.row` flex container)

**Issue:** the old `<div style="min-width:0">` had flex-basis `auto`, its content width. The replacement `<button class="tap">` gets `width:100%`, so its flex-basis is the whole row. That forces the sibling Skip/Start group to shrink down to its min-content width, and the suggested workout's "Start ▶" button wraps onto two lines. The whole row gets taller on the screen Ian opens before every workout. The other `tap` buttons are block-level or the row itself, so they are unaffected.

**Reproduced** in headless Chrome (real `<style>` block from `index.html`, 390px card):

| Markup | Start button (w × h) | Skip button height | Left column width |
|---|---|---|---|
| Old `<div>` | 62 × 30 | 30 | 139 |
| New `<button class="tap">` | 48 × 44 | 44 | 217 |

**Fix:** give this button its content width back, or drop `width:100%` for tap buttons inside a flex row:
```html
<button class="tap" style="cursor:pointer;min-width:0;width:auto;flex:1 1 auto" data-action="togglePreview" …>
```
Add the picker row to the DELEG-07 phone checklist as a visual check. It currently checks only that the preview toggles.

### WR-04: `dispatchAction` reads the event handler through the prototype chain — deferred item 1 confirmed

**File:** `index.html:4727`

**Issue:** the action name is checked as an own property of `ACTIONS`, but `ACTIONS[name][e.type]` is a plain lookup. `enter` (line 4788) guards the same lookup with an own-property check, so the dispatcher, which every event in the app passes through, is less strict than the one action that calls through it.

**Reproduced** (harness): set `Object.getPrototypeOf(a.ACTIONS).click` to a counter, then dispatch a `click` on a `toggleIdeaDone` element (a change-only action). The planted function ran once.

Real-world risk is low: the app has no prototype-pollution source, and `JSON.parse` does not pollute. It is a one-line hardening of the app's single input choke point.

**Fix:**
```js
const spec = ACTIONS[name];
const fn = Object.prototype.hasOwnProperty.call(spec, e.type) ? spec[e.type] : null;
```
Add a planted-`click` case on a change-only action to the "dispatcher ignores…" check (test/app.test.js around line 4977).

## Info

### IN-01: The tap-region structural check cannot see interactive descendants or interpolated content

**File:** `test/app.test.js:5155-5182` (`f2TapRegions` / `f2TapRegionProblems`)

**Issue:** the check scans template source and flags only `<div` and a `kicker()` call without the `'span'` argument. It does not flag `<button`, `<a`, `<input`, `<select` or `<label` inside a `tap` button. A nested `<button>` or `<a>` changes how the HTML parser nests the markup, so taps land on the wrong control. The check also cannot see what `${right}`, `${d}` or `${weekTally()}` expand to. I checked the current tree by hand and it is clean, but the check would not catch a future regression.

**Fix:** add `/<(button|a|input|select|textarea|label)[\s>]/` to `f2TapRegionProblems`. Also run the render-level check on rendered HTML from `viewToday()`, `viewHistory()` and `viewPicker()`, not only on source text.

### IN-02: `cancelEditIdea` markup carries a `data-id` its wrapper ignores

**File:** `index.html:4678`

**Issue:** `data-id="${esc(i.id)}"` is written, but `ACTIONS.cancelEditIdea` never reads it. The attribute is harmless, but it suggests the cancel acts on one specific idea when it doesn't.

**Fix:** drop the attribute.

### IN-03: `openChart` wrapper assigns app state directly instead of calling a function

**File:** `index.html:4807`

**Issue:** CLAUDE.md now says a wrapper "calls the existing function with its existing arguments". `openChart` writes the module-level `progSub` itself before calling `goSub`. It does not touch `DB` or persist, so the suite's guard allows it, but it is the one wrapper that owns state.

**Fix:** add `function openChart(sub){ progSub = sub; goSub('train','progress'); }` and make the wrapper `el => openChart(el.dataset.prog)`.

---

_Reviewed: 2026-09-25_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
