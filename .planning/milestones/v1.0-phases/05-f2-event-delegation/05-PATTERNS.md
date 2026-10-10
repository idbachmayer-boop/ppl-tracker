# Phase 5: F2 — Event Delegation - Pattern Map

**Mapped:** 2026-09-24
**Files analyzed:** 7 (4 modified, 1 created, 2 docs corrected)
**Analogs found:** 7 / 7 (all in-repo; this is a single-file app, so "analog" usually means an existing section of `index.html` or `test/app.test.js`)

Line numbers are as of commit 727b571 (index.html unchanged since 1426a6d, which RESEARCH pins).

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `index.html` — new `/* ── Event delegation (F2) ── */` section (`dispatchAction`, `const ACTIONS`, 5 listeners) | registry + dispatcher | event-driven | `COLLECTIONS` block (index.html:484-524) + Boot block (4685-4698) | role-match (registry), placement differs on purpose |
| `index.html` — render templates (175 sites across 31 functions + static `<body>` markup) | component (template-literal views) | request-response (render → innerHTML) | existing `data-tab` / `data-ph` attributes (buildTabBar 1404, boot 4689) | exact for the attribute idiom |
| `index.html` — CSS `:where(button.tap)` / `:where(button.tap-inline)` reset | config (stylesheet) | n/a | `.phase-header` (index.html:140), `:focus-visible` (239) | exact |
| `test/fixtures/handler-inventory.json` (NEW) | test fixture (snapshot) | batch / file-I/O | `test/fixtures/merge-golden.json` + its loader (test/app.test.js:45-47) | exact |
| `test/harness.js` — export `ACTIONS`/`dispatchAction`, record `document.addEventListener` | test utility | transform | its own `names` list (106-141) and `doc` stub (58-68) | exact |
| `test/app.test.js` — new "F2" section, `REQUIRED_EXPORTS` additions, DRAFT-05 scan extension, retarget export test | test (structural source scan + dispatcher unit) | batch | DRAFT-05 structural scan (3350-3365), DRAFT-02 `dbAssignLines` (3010-3035), registry test (1889), export test (3526-3538) | exact |
| `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md` (172 → 175) | docs | n/a | — | n/a (text edit) |

## Pattern Assignments

### `index.html` — `ACTIONS` registry + `dispatchAction` (registry, event-driven)

**Analog:** `COLLECTIONS` (index.html:484-520) — a declared, commented, name → spec object. Copy the **header-comment style** (a boxed `/* ─── Title (F2) ─── */` block that states the placement/TDZ reasoning), not the placement.

Header comment pattern (index.html:484-496):
```javascript
/* ───────────────────────── Collections registry (F1) ─────────────────────────
   Declared before DB boots via load() a few dozen lines down, after SCHEMA/KEY, before MIGRATIONS;
   every value is a literal or a reference to a hoisted `function` declaration — never a const
   arrow, never a forward const.
   ...
const COLLECTIONS = {
  sessions:   { kind:'list', key:sessKey, ... },
```

**Deliberate divergence — do NOT copy the boot-time validator** (index.html:521-524):
```javascript
{
  const problems = collectionProblems(COLLECTIONS);
  if(problems.length) throw new Error('COLLECTIONS is invalid: ' + problems.join('; '));
}
```
RESEARCH (Alternatives, "Do not add a boot-time validator that throws"): a bad action must break one control, not the Log tab mid-workout. If a shared validator is wanted, mirror the *shape* of `collectionProblems(reg)` (index.html:4047 — hoisted `function`, returns `problems[]` of `name+': '+msg`, `ALLOWED` field list) as `function actionProblems(){…}` and call it **only from the test**.

**Placement:** immediately before the Boot block, after `fallbackCopy` (index.html:4683) and before line 4685:
```javascript
/* ───────────────────────── Boot ───────────────────────── */
/* The stopwatch bar, the idea FAB and its sheet live as static markup in <body>, so they can't
   call ph() inside a template literal ... */
document.querySelectorAll('[data-ph]').forEach(el => { el.innerHTML = ph(el.dataset.ph) + el.innerHTML; });
...
if(migrationRan) save();
buildTabBar();
render();
updateStopwatch();
```
The comment "Runs here, after every const in the file is initialized" (4694) is the precedent for the TDZ-safe-at-bottom argument; restate it in the new section's header.

**Core dispatcher/registry shape:** use RESEARCH Pattern 1 verbatim (05-RESEARCH.md lines 452-491): hoisted `function dispatchAction(e)` with text-node guard, `closest('[data-action]')`, `el.disabled` return, `hasOwnProperty` own-key check, `ACTIONS[name][e.type]`; `const ACTIONS = { name: { click(el,e), change(el,e), … } }`; `['click','change','input','keydown','pointerdown'].forEach(t => document.addEventListener(t, dispatchAction))` — no `{passive:true}` (swGuard needs `preventDefault`).

**Function the stopwatch wrapper must call unchanged** (index.html:3668-3672):
```javascript
function swGuard(e){
  if(keyboardUp()){ e.preventDefault(); return; }
  const a = document.activeElement;
  if(a && a.blur) a.blur();
}
```

**Escaping helper for every `data-*` value** (index.html:941):
```javascript
const esc = s => String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
```

---

### `index.html` — render templates (component, render → innerHTML)

**Analog:** the two existing `data-*` idioms already in the file:
- `buildTabBar` (index.html:1404) — the tab `<button>` already carries `data-tab="${t.id}"`; the `go` action reads `el.dataset.tab`.
- Boot line 4689 — `el.dataset.ph` read from static markup; proves `dataset` reading is established convention.

Conversion shape (RESEARCH 05-RESEARCH.md:496-504):
```javascript
// before: onclick="weekShift(-1)"
`<button class="btn btn-ghost btn-sm" data-action="weekShift" data-d="-1">${ph('caret-left')}</button>`
// before: onclick="removeCardio('${c.id}')"
`<button class="x-set" data-action="removeCardio" data-id="${esc(c.id)}" title="delete">${ph('x')}</button>`
```
Templated helpers `logRow` (1536-1539) and `versionsCardHTML`'s `row` (4570-4574) take pre-built attribute fragments with a **literal** action name (RESEARCH Pattern 2, lines 511-520). Never `data-action="${…}"`.

Batch order and per-site table: RESEARCH § Full inventory (P1 shell 4 · P2 Settings+Ideas 37 · P3a Care 20 · P3b Train non-Log 39 · P4 Today 33 · P5 Log 42).

---

### `index.html` — CSS reset (config)

**Analog:** `.phase-header` (index.html:140) — existing full-width transparent left-aligned `<button>`:
```css
.phase-header { width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border: none; background: transparent; cursor: pointer; text-align: left; color: var(--text); }
```
Focus ring comes free from index.html:239:
```css
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
```
New rule: RESEARCH lines 575-579 (`:where(button.tap)` / `:where(button.tap-inline)`, zero specificity, `inherit` only — no hex, per Theme convention). Place next to the button rule at line 56.

---

### `test/fixtures/handler-inventory.json` (fixture, batch)

**Analog:** `test/fixtures/merge-golden.json`, loaded at test/app.test.js:45-47:
```javascript
const GOLDEN_PATH = path.join(__dirname, 'fixtures', 'merge-golden.json');
...
const GOLDEN_IN = fs.existsSync(GOLDEN_PATH) ? JSON.parse(fs.readFileSync(GOLDEN_PATH, 'utf8')) : {};
```
Load the inventory the same way (`path.join(__dirname, 'fixtures', 'handler-inventory.json')`), but **fail** if it is missing (DELEG-01 requires it to exist), unlike the golden which tolerates absence. Generate with RESEARCH's script (05-RESEARCH.md:678-706) **before any markup edit**; rows keyed on `{fn, event, tag, was, occurrence, calls, action}`, never line. Hand-fix the 3 templated rows to `actions: [...]`. Written with `JSON.stringify(rows, null, 1) + '\n'`.

---

### `test/harness.js` (test utility)

**Analog:** itself. Two edits.

1. `names` list (harness.js:106-141) — append with a comment, following the grouped-with-comment style:
```javascript
    /* Which build a device is running (Settings → This version). */
    'BUILD', 'buildLabel',
  ];
```
Add `'ACTIONS', 'dispatchAction',` under a `/* Event delegation (Phase 5). */` comment. `ACTIONS` is a `const`, so it is only reachable through this export (same reason as `SYNC`, comment at 131-133).

2. `doc` stub (harness.js:58-68) currently drops listeners:
```javascript
  const doc = {
    getElementById: id => { if(!byId.has(id)) byId.set(id, el()); return byId.get(id); },
    ...
    addEventListener(){},
    head: el(),
  };
```
Replace `addEventListener(){}` with a recorder into a `listeners` map, and after `api.__src = code;` (148) add `api.__listeners = listeners;` — same pattern as `api.__sandbox` / `api.__src` / `api.__stored` (147-149).

---

### `test/app.test.js` (tests, structural + dispatcher unit)

**Assertion helper** (test/app.test.js:19): `ok(name, cond, extra)` — always pass the offending list as `extra` so a failure names the site.

**a) `REQUIRED_EXPORTS`** (133-140): add `'ACTIONS','dispatchAction'`:
```javascript
const REQUIRED_EXPORTS = ['COLLECTIONS','collectionProblems','MIGRATIONS', ...
  'mdEscape', 'mdCell', 'mdHeader', 'exportRows', 'buildMarkdownExport', 'exportMarkdown', 'downloadMarkdown', 'exportShareFailed'];
REQUIRED_EXPORTS.forEach(name => ok('exported: ' + name, app[name] !== undefined));
```

**b) Registry validity analog** (1889):
```javascript
ok('registry: the shipped COLLECTIONS has no problems', app.collectionProblems(app.COLLECTIONS).length === 0, app.collectionProblems(app.COLLECTIONS));
```
→ "every ACTIONS entry is keyed only by the five events", "only `enter` listens to keydown".

**c) Source-scan analog — DRAFT-02 `dbAssignLines`** (3015-3035): comment-strip, split, filter, report `offenders`, plus a **synthetic** input that must be caught (proves the regex bites):
```javascript
const DB_ASSIGN = /(^|[^\w.$])DB\s*=(?!=)/;
function dbAssignLines(src){
  const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  return stripComments(src).split('\n').map(l => l.trim()).filter(l => DB_ASSIGN.test(l));
}
...
  const synthetic = ['DB = normalize(raw);'].filter(l => DB_ASSIGN.test(l) && !sanctioned(l));
  ok("DRAFT-02: every statement that replaces DB keeps this device's draft",
     lines.length >= 7 && offenders.length === 0 && ... && synthetic.length === 1,
     { scanned: lines.length, offenders, exceptions, syntheticCaught: synthetic.length === 1 });
```
Apply to: no-inline-handler guard (broad `/\son[a-z]+\s*=\s*["'`$]/i`, Pitfall 9 — add synthetic `<b onclick="x()">` must match and `r.onload=` / `const one = ` must not), propagation guard, no-dynamic-action-name guard.

**d) Function-source scan analog — DRAFT-05** (3354-3365):
```javascript
  const stripComments = src => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const pushers = Object.keys(a.__sandbox).filter(k => {
    const f = a.__sandbox[k];
    if(typeof f !== 'function') return false;
    const src = stripComments(Function.prototype.toString.call(f));
    return /\bDB\.draft\b/.test(src) && /(?<![\w.$])save\(\)/.test(src);
  }).sort();
  ok('DRAFT-05: only pickEx, exPick and finishWorkout still push from a draft function',
     canon(pushers) === canon(DRAFT_PUSHERS), pushers);
```
Extend: also scan `Object.values(a.ACTIONS).flatMap(s => Object.values(s))` sources (they are not sandbox globals — Pitfall 7). Reuse the same named-allowlist idea for `REVIEWED_PROPAGATION = []`. **Do not edit** `DRAFT_PUSHERS` (3289) or `DRAFT_ONLY_MUTATORS` (25 rows) — if either needs editing, a signature moved.

**e) Rendered-HTML smoke analog — `drawEvery`** (2512-2523): drives `go(tab)`/`setSub(sub)`, reads `appEl.innerHTML`. Use its HTML as the *secondary* `data-action` coverage source; static source scan stays primary.

**f) Test to retarget — export button** (3533-3536):
```javascript
  const onclickCount = (X.__src.match(/onclick="exportMarkdown\(\)"/g) || []).length;
  ok('export: Settings shows Export for Claude (.md) directly below Export backup (.json) (D-02)',
     jsonIdx >= 0 && claudeIdx > jsonIdx && importIdx > claudeIdx && buttonTagsBetween === 1 && onclickCount === 1, ...
```
In P2 replace `onclickCount` with "exactly one `data-action` whose `ACTIONS` click handler source calls `exportMarkdown`" — property, not literal.

**g) New F2 section body:** RESEARCH § Completeness test shape (05-RESEARCH.md:713-753) and § Driving the dispatcher (771-778: `fakeEl` with `closest`, `fire()` building `{type, target, preventDefault}`). Section header style: `console.log('\n── F2: … ──');` as at 3288.

## Shared Patterns

### Comment stripping before any source scan
**Source:** test/app.test.js:3017 and 3356 (identical regex)
**Apply to:** every F2 structural check
```javascript
s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
```
Add `.replace(/<!--[\s\S]*?-->/g,'')` for the static `<body>` markup.

### Attribute escaping
**Source:** `esc()` index.html:941. **Apply to:** every interpolated `data-*`, and every `value="${…}"` on a line the phase rewrites (Open Question 2 recommendation; CLAUDE.md "escape attributes too when you touch them").

### Numeric decode
**Apply to:** every numeric `data-*` read in a wrapper: `+el.dataset.i` (Pitfall 1: `weekShift`, `toggleHist`, `toggleExCollapse`, `toggleGuide`, `skinTogglePhase`, `skipSet`).

### Thin wrappers
Wrappers never reference `DB`, `save(`, or `saveLocal(`; they call existing functions with existing signatures. Enforced by the extended DRAFT-05 scan.

### Assert the property, never the count
Precedent: firestore.rules checks and `collectionProblems`. No `=== 175` anywhere.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| document-level delegated listeners | dispatcher | event-driven | No delegation infrastructure exists; existing listeners (`load`, `online`, `visibilitychange`, matchMedia, visualViewport) are single-purpose. Use RESEARCH Pattern 1. |
| keyboard-operable converted `<div>`→`<button>` | component | — | Only `.phase-header` precedent for styling; semantics per RESEARCH § Keyboard Operability (19 buttons, backdrop exception). |

## Metadata

**Analog search scope:** `index.html`, `test/app.test.js`, `test/harness.js`, `test/fixtures/`
**Files scanned:** 4
**Pattern extraction date:** 2026-09-24
