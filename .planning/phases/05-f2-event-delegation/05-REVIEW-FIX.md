---
phase: 05-f2-event-delegation
fixed_at: 2026-09-25T22:30:06Z
review_path: .planning/phases/05-f2-event-delegation/05-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 5: Code Review Fix Report

**Fixed at:** 2026-09-25T22:30:06Z
**Source review:** .planning/phases/05-f2-event-delegation/05-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4 (WR-01 to WR-04; IN-01 to IN-03 left alone by choice)
- Fixed: 4
- Skipped: 0

Every fix was written test-first:

1. A new check reproduced the review's scenario and failed on the unfixed code.
2. The fix turned it green.
3. The fix was then reverted on its own, and the check went red by name.
4. The fix was restored, and the suite was green again.

## Verification

- **Where it ran:** the orchestrator's own worktree
  (`.claude/worktrees/gifted-goodall-706ad7`, branch `claude/gifted-goodall-706ad7`). No separate
  review-fix worktree was made, as instructed. The numbers can be reproduced from this tree.
- **Suite:** `TZ=America/Chicago npm test`: **891 passed, 0 failed, 2 skipped** (baseline 885 / 0 / 2).
  The six added checks are listed under each fix. The two skips are the usual local-only
  real-backup legs.
- **Handler inventory ratchet:** green. All DELEG-01..04 checks pass, including "index.html has no
  inline on-event attribute left".
- **WR-03 layout:** also measured in headless Chrome (see below). The suite has no layout engine.

## Fixed Issues

### WR-01: `logRow` placeholder breaks out of its attribute on a hostile `DB.unit`

**Files modified:** `index.html`, `test/app.test.js`
**Commit:** 273309d
**Applied fix:**

- `logRow` now escapes its hint at the sink, `placeholder="${esc(hint)}"`, and its comment says
  callers pass plain text.
- The pet call site passes `${petName()}'s weight (${DB.unit})` unescaped, so the pet name is
  escaped once.
- Both Progress weigh-in boxes, body (`wt-input`) and pet (`pet-input`), escape `DB.unit`.

**Tests:**

- New check: "D-09: a hostile weight unit stays inside every weigh-in placeholder, and Enter still
  logs from Today". It sets `DB.unit` to a `"><img onerror>` payload and covers four boxes: Today's
  two and the two Progress ones. For each box it decodes the rendered `placeholder` and checks
  that the payload is still inside it. It also checks that both Today boxes still carry
  `data-action="enter"`.
- The existing pet-hint check ("DELEG-02: Enter in Today's pet weigh-in box…") matched the
  `&#39;` encoding. It now decodes the placeholder and compares it with the intended text, and it
  flags any double-encoded entity. It asserts the property, not the wording.

### WR-02: Logged set values and other stored session fields render as HTML without `esc()`

**Files modified:** `index.html`, `test/app.test.js`, `.planning/phases/05-f2-event-delegation/deferred-items.md`
**Commit:** 746df0d
**Applied fix:** `fmtSet()` still returns plain text, with a comment explaining why: the Markdown
exporter and `setStatus` escape it themselves. Each HTML sink now escapes:

- **Picker preview:** the "Last:" line, `esc(lastStr)`.
- **Active workout:** both "Last time" lines, the exact-slot one and the elsewhere one.
- **History set list:** `setsOf` escapes each set's text. `<em>skip</em>` and 🏆 stay markup.
- **History `durationMin`:** escaped in the row button's `right` and in the detail's "min at the
  gym" line. It used to close the row's `<button>` early.
- **History row pill:** `esc(s.workout)`.
- **Week review tags:** `esc(s.workout)` in both the pill and the "skipped …" tag, also on the
  History screen. The review did not list this sink. The new History check found it: a hostile
  workout name still produced a live `<img>` after the listed sinks were fixed.

Deferred item 2 is marked resolved. The strength-history rows were already safe, because they
escape `setsStr`.

**Tests (all new):**

- "D-09: a hostile logged set, duration or workout name renders escaped in History". The duration
  payload is a `</button>` closer.
- "D-09: a hostile logged set renders escaped in the picker preview's last-time line"
- "D-09: a hostile logged set renders escaped in the active workout's last-time lines". It covers
  both the exact-slot branch and the elsewhere branch.

**Not changed:** `index.html:1660` renders `DB.draft.workout` raw in Today's "in progress" pill.
That value is this device's own draft, not a stored session field, and the finding does not cover
it. It is left for VAL-02's file-wide sweep.

### WR-03: `:where(button.tap){width:100%}` squeezes the picker's Skip/Start group

**Files modified:** `index.html`, `test/app.test.js`, `.planning/phases/05-f2-event-delegation/05-DELEG-07-CHECKLIST.md`
**Commit:** 83170dc
**Applied fix:**

- The picker's `togglePreview` button now has the inline style
  `min-width:0;width:auto;flex:1 1 auto`. Its flex basis is its content again, so the Skip/Start
  group keeps its content width, and the button grows into the spare space, so its tap target is
  larger than before.
- The zero-specificity `:where(button.tap)` reset is unchanged, so every other converted button
  keeps it. This is the only bare `tap` button that is a flex item. All the others are the card,
  the row or the list item themselves.
- DELEG-07 phone checklist §2 has a new first step: look at the suggested card's picker row before
  tapping anything.

**Manual measurement (headless Chrome):**

- **Setup:** the real `viewPicker()` output, the app's own `<style>` blocks, body pinned to 390px.
- **Script:** a scratch script (not committed) that loads the app through `test/harness.js`.

| Markup | Suggested "Start ▶" (w × h) | Skip height | Preview toggle width |
|---|---|---|---|
| Before (Phase 5 `button.tap`) | 48 × 44 (wrapped) | 44 | 217 |
| After (`width:auto;flex:1 1 auto`) | 62 × 30 | 30 | 203 (fills the free space) |

The "after" numbers match the review's old-`<div>` measurement (62 × 30, Skip 30). The other two
cards' Start buttons (50 × 30) did not change.

**Tests:** new check "WR-03: no converted button that sits in a flex row takes the full-width reset
as its flex basis (the Log picker keeps Start on one line)".

- **What it checks:** for every `tap` button that is a direct child of a flex container, on every
  rendered screen in the F2 corpus, it resolves the flex basis the way the cascade does. The inline
  `flex-basis`, `flex` or `width` wins over the reset. A basis of `100%` fails.
- **What it reads from the app's CSS:** which classes are flex containers, and the reset's width.
  Neither is hard-coded.
- **Self-test:** synthetic cases prove it catches a squeezed button and passes the fixed and
  block-parent forms.
- **Revert result:** on the reverted markup it named exactly the picker toggles.

### WR-04: `dispatchAction` reads the event handler through the prototype chain

**Files modified:** `index.html`, `test/app.test.js`, `.planning/phases/05-f2-event-delegation/deferred-items.md`
**Commit:** 472773c
**Applied fix:** `dispatchAction` now reads the handler only when it is an own property of the
action:
`const spec = ACTIONS[name]; const fn = Object.prototype.hasOwnProperty.call(spec, e.type) ? spec[e.type] : null;`

This is the same rule the `enter` action already follows. Deferred item 1 is marked resolved.

**Tests:** new check "F2: an event handler inherited through Object.prototype never runs, even on a
control whose action exists".

- **Setup:** it plants `click` and `change` on the app's own `Object.prototype` and removes them in
  a `finally`, then asserts they are gone.
- **What it fires:** through the app's own document listeners, a click on the change-only
  `toggleIdeaDone` and a change on the click-only `removeIdea`.
- **Result:** neither planted function runs, and each real event still calls its function once.
- **Before the fix:** both planted functions ran.

---

_Fixed: 2026-09-25T22:30:06Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
