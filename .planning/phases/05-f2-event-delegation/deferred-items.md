# Phase 5 deferred items

Issues found during execution that fall outside the plan being run. Each names where it was found
and what would fix it.

## 1. `dispatchAction` looks up the event handler through the prototype chain (found in 05-03)

- **Where:** `index.html`, `dispatchAction`: `const fn = ACTIONS[name][e.type];`
- **What:** the action NAME is checked as an own key of `ACTIONS` (T-5-01), but the handler for
  the event is read with a plain property lookup. If `Object.prototype` ever carried a `click`, a
  click on a control whose action handles only `change` (for example `toggleIdeaDone`) would run it.
  Probe: plant `Object.getPrototypeOf(a.ACTIONS).click`, dispatch a click on a `toggleIdeaDone`
  element, and the planted function runs once.
- **Risk today:** low. Nothing in the app assigns to `Object.prototype`, and `JSON.parse` does not
  pollute it. It is defence in depth, the same gap 05-03 closed in the `enter` action (which now
  requires an own `click` on the named entry).
- **Fix:** read the handler only if it is an own property, for example
  `const spec = ACTIONS[name]; const fn = Object.prototype.hasOwnProperty.call(spec, e.type) ? spec[e.type] : null;`,
  and add a case to the "dispatcher ignores…" check that clicks a change-only action while the
  planted `click` is in place.
- **Why deferred:** the dispatcher belongs to 05-01. The scope rule limits 05-03 to what its own
  changes caused.

## 2. Logged set values render as HTML text without `esc()` (found in 05-06)

- **Where:** `index.html`, every `fmtSet(w, r)` result placed in markup: the picker preview's
  "Last:" line (`previewRows`), the active workout's "Last time" line (both the exact-slot and the
  elsewhere branch of `viewActive`), History's set list (`setsOf` in `viewHistory`) and the strength
  history rows. `setStatus`'s title goes through `esc()` already.
- **What:** `fmtSet` returns the stored `w` and `r` as they are. A session from an imported backup or
  an older build can hold any string there (`validateBackup()` checks shape, never types), and it
  would render as markup in these text positions. These are not attributes, so D-09 did not cover
  them. 05-06 escaped the one such line it rewrote (the collapsed card's summary).
- **Risk today:** low. The values come from this device's own storage or Ian's own backups, and the
  inputs are `type="number"`.
- **Fix:** escape at the sink (`esc(fmtSet(...))` or make `fmtSet` return escaped text and audit its
  non-HTML callers, such as the Markdown exporter), with a hostile-history check like the D-09 ones.
  This belongs with VAL-02's file-wide sweep.
- **Why deferred:** outside 05-06's rewritten lines, and not attribute values.
