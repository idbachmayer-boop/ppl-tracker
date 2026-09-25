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
