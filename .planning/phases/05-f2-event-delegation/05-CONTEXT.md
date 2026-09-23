# Phase 5: F2 — Event Delegation - Context

**Gathered:** 2026-09-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace every inline event-handler attribute in `index.html` with delegated listeners that read `data-*`
attributes, so markup never calls a global function by name. That is the precondition for Phase 7's
hash-based CSP. Handlers only: inline `style=`, `javascript:` URLs and other CSP blockers stay in Phase 7.

**Inventory correction:** the roadmap says 172. On 2026-09-23 the count is **175**: 143 `onclick`,
14 `onchange`, 13 `oninput`, 3 `onkeydown` and 2 `onpointerdown`. Fix ROADMAP.md and REQUIREMENTS.md
to match.
</domain>

<decisions>
## Implementation Decisions

### Dispatcher shape
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

### Keyboard operability
- **D-04:** The 17 `onclick` handlers on `div`/`span`/`li`/`tr`/`label` convert to real `<button>`
  elements, with a CSS reset so they look the same. Where a `<button>` can't legally wrap the content
  (interactive children, table rows), fall back to `role="button"` + `tabindex="0"` + dispatcher
  handling of Enter/Space.

### Rollout
- **D-05:** Land it screen by screen. The dispatcher, `ACTIONS` and the completeness test come first,
  then the low-risk screens (Settings, Progress, Lawn, Skin, Activities…), with the **Log tab last, in
  its own plan**. Mixed inline/delegated state between commits is acceptable.
- **D-06:** DELEG-07 is verified on Ian's phone against the deployed build, doing a real workout flow
  (start, log sets, skip/unskip, warm-up, stairs, notes, extras, date/duration, finish) from a checklist
  Claude writes. Before that, Claude runs a keyboard-only desktop pass in the browser pane.

### Completeness check
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
</decisions>

<canonical_refs>
## Canonical References

- `CLAUDE.md` — escaping rules (the `'` hole, unescaped attributes), the draft rules (draft actions keep
  `saveLocal()`; `pickEx`/`exPick`/`finishWorkout` keep `save()`), "assert the property, not the wording"
- `.planning/ROADMAP.md` § Phase 5 — success criteria
- `.planning/REQUIREMENTS.md` — DELEG-01..07
- `.planning/phases/04-draft-goes-device-local/04-CONTEXT.md` — draft save discipline that the Log-tab
  actions must preserve
- `.planning/codebase/CONVENTIONS.md`, `TESTING.md`
</canonical_refs>

<code_context>
## Existing Code Insights

- Inline handlers are almost all in template-literal HTML with `${i}`/`${k}`/`${id}` interpolation, rendered via `innerHTML`.
- `onkeydown="if(event.key==='Enter')${fn}"` is a generic helper that builds handler code from a string, so it needs a named-action equivalent.
- Existing listeners: `window load`, `online`, `visibilitychange`, the matchMedia and visualViewport listeners. There is no delegation infrastructure yet.
- `COLLECTIONS` is the precedent for a declared registry plus a structural test.
</code_context>

<specifics>
## Specific Ideas
- The Log tab is the screen Ian uses mid-set, so any regression there costs a workout. That is why it goes last and gets a device check.
</specifics>

<deferred>
## Deferred Ideas
- Inline `style=` / `javascript:` removal and other CSP prerequisites belong to Phase 7.
</deferred>
