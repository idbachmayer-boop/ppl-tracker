---
phase: 10-log-page-history-and-skip
reviewed: 2026-11-11T13:10:37Z
depth: standard
scope: "G-10-5 gap closure, git diff 74c4018 4624870 -- index.html test/app.test.js"
files_reviewed: 2
files_reviewed_list:
  - index.html
  - test/app.test.js
findings:
  critical: 0
  warning: 2
  info: 5
  total: 7
status: issues_found
---

# Phase 10: Code Review Report (G-10-5 gap closure)

**Reviewed:** 2026-11-11T13:10:37Z
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

> The earlier review of plans 10-01..10-03 is preserved in git history at commit `e2bc23a`. Its findings were addressed in `10-REVIEW-FIX.md`.

## Summary

Scope: the G-10-5 diff `74c4018..4624870`. It covers the two-row Log card header (`.ex-head > .ex-meta`, `.ex-controls`, `.ex-targets`), `.ph { display: inline-block }`, the nine `ph(…, 'lead')` gaps, the `white-space:nowrap` on the two how-to links, and the new or retargeted G-10-5 and D-12 tests.

Verified at the reviewed tip:
- `npm run csp:check` reports the hash OK (`sha256-rEEv9Fyk…`).
- `TZ=America/Chicago npm test` ends `1250 passed, 0 failed, 2 skipped`.
- Every G-10-5 check and the retargeted D-12 check pass.

Rules checked against CLAUDE.md:
- No inline handler was added. Every control still uses `data-action` with `data-i="${esc(i)}"`.
- No `data-action` name changed.
- No `save()` or `saveLocal()` path was touched.
- No colour was hard-coded.
- `.ex-skip` was removed, and nothing else references it.
- `.ph` (0,1,0) out-specifies the bare `svg` rule (0,0,1), so the charts keep their block display while icons go inline.
- The `-4px` pull of `.ex-controls` stays inside `.ex-body`'s 14px padding, so `.ex-card { overflow:hidden }` clips nothing.
- `flag` defaults to `''`, so dropping the `'<br>'+` guard cannot render `undefined`.

No blocker. The app code is sound. The weaknesses are in the new tests: one can let through the defect it is named for, one sits on a touched line that still carries an unescaped user value, and several assert less than their names claim.

## Warnings

### WR-01: The icon-gap check passes an icon glued to text inside a following inline element

**File:** `test/app.test.js:2662-2663`

**Issue:** `gluedIcons()` accepts an icon whenever the character after `</svg>` is whitespace or `<`:

```js
const ok = cls.includes('lead') || !next || /[\s<]/.test(next) || …
```

So `${ph('skip-forward')}<strong>Bench</strong>` and `${ph('fire')}<span>Warm-up</span>` both pass, even though they render the icon touching the word, which is exactly the G-10-5 defect. The app already uses this shape: line 2117 is `${ph('skip-forward','lead')}<strong>${esc(entry.name)}</strong>`. It is safe today only because it carries `lead`. A grep of the current tree finds no unspaced instance, so nothing ships broken today. But the check named "no icon is glued to the word after it, on any screen" cannot detect the next one written this way.

**Fix:** When `next === '<'`, skip forward over opening tags (not closing tags) and test the first text character:

```js
let j = end + 6;
while (html[j] === '<' && html[j + 1] !== '/') j = html.indexOf('>', j) + 1;
const nextText = html.charAt(j);
const ok = cls.includes('lead') || !nextText || /[\s<]/.test(nextText) || ctx.some(…);
```

### WR-02: A touched line still renders a synced or imported key as raw HTML

**File:** `index.html:2745`

**Issue:** This diff edited the line to add `'lead'`, but left its fallback label unescaped:

```js
const lbl = d2 ? `${ph(d2.icon,'lead')}${d2.label}` : (w.charAt(0).toUpperCase()+w.slice(1));
lines.push(`<strong>${lbl}…`)
```

`w` is a key of `s.extras` on a stored session. It arrives from a cloud merge or from an imported backup, and `validateBackup()` checks shape, not content. Any key not found in `ACCESSORIES` is written into the History detail as markup. The CSP stops script execution (no `'unsafe-inline'`), but HTML injection still works. CLAUDE.md requires every user-controlled string to go through `esc()`, and asks for this to be fixed "when you touch them".

**Fix:**
```js
const lbl = d2 ? `${ph(d2.icon,'lead')}${d2.label}` : esc(w.charAt(0).toUpperCase()+w.slice(1));
```
Add a suite case: a session whose `extras` holds the key `'<img src=x>'` renders that text escaped in History.

## Info

### IN-01: The D-12 test name describes a layout that no longer exists

**File:** `test/app.test.js:9945`

**Issue:** The name still reads "…first in the header column, ahead of the caret and the range badge". There is no header column any more, the badge now sits in `.ex-targets` outside `.ex-head`, and `order` no longer checks skip < badge. It checks only that the badge exists somewhere in the card. When this test fails, its name will point at the wrong property.

**Fix:** Rename it to something like "D-12: the skip button shows only on a card with an unfinished set, inside the card header and ahead of the caret".

### IN-02: The controls-group check's "apart from the Add weight flag" clause has nothing to test

**File:** `test/app.test.js:9948-9968`

**Issue:** The fixture card (`f2Mid`, slot 2) never carries a flag. The red run recorded `"flag":false` even under the old markup, where the flag shared the badge's column. So `!r.live.flag` cannot fail. The targets-row test covers this transitively, but this test's name promises more than it checks.

**Fix:** Either seed slot 2 at the top of its range so it renders `class="flag"`, and assert that as a positive control, or drop "and the Add weight flag" from the name.

### IN-03: The CSS parse used by the `.ph` and icon-gap checks has blind spots it does not guard

**File:** `test/app.test.js:156-189`, `2638-2641`

**Issue:** Three gaps:
- The `@media`-free assumption is only a comment. A future `@media (…) { .ph { display:block } }` parses to the selector `@media (…)` and is silently skipped.
- `blockers` looks only at rules whose last compound contains `.ph`. A rule like `.x-set svg { display:block }` (0,1,1) out-specifies `.ph` and re-blocks every icon in that context unseen.
- `spaced` treats any positive `margin-right` on `X .ph` as a spaced context, and ignores later overrides like `.btn .ph:only-child { margin-right:0 }`.

**Fix:**
- Assert the assumption: `ok(…, !/@/.test(styleBody))`.
- Extend `blockers` to any rule whose last compound is `svg` or `.ph` and that sets `display: block`, except the bare `svg` rule.

### IN-04: A local `ok` shadows the suite's `ok()` assertion function

**File:** `test/app.test.js:2662`

**Issue:** Inside `gluedIcons`, `const ok = …` shadows the global `ok(name, cond, detail)`. It is harmless as written because the binding is block-scoped. But an edit that calls `ok(...)` inside that block would throw "ok is not a function".

**Fix:** Rename it to `spacedOk` or `fine`.

### IN-05: The icon-gap check would pass if no icon were ever scanned

**File:** `test/app.test.js:2671-2689`

**Issue:** The only positive control is `spaced.length > 0`. If routing ever rendered asynchronously, or wrote somewhere other than `#app`, every `gluedIcons()` call would see an empty string and the check would pass with nothing scanned. The red run proves it scans today, but nothing keeps it that way.

**Fix:** Count the `svg.ph` elements `gluedIcons` visits, and require a floor (for example `> 50` for the mid-workout walk) in the `ok()` condition.

---

_Reviewed: 2026-11-11T13:10:37Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
