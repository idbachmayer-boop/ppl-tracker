# Stack Research

**Domain:** Single-file, dependency-free, offline-first PWA — adding a collection registry, a Markdown export, event delegation (for CSP), and a device-local field, without a build step
**Researched:** 2026-09-10
**Confidence:** HIGH overall (browser/spec facts verified against MDN/W3C-sourced search results and cross-checked against current knowledge); MEDIUM on the specific code shapes recommended for the registry, since those are architectural judgment rather than citable spec

Every recommendation below runs in the browser with zero dependencies and zero build tooling. Where a
library would normally be reached for, it is named for the record, then dismissed with a reason tied
to this project's constraints (no npm, no build step, single inline `<script>`).

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|------------------|
| Plain-object spec registry (`const COLLECTIONS = {...}`) | Native JS (ES2015 object literals) | Single source of truth for `blank()`, `mergeDB()`, `liveX()`, `validateBackup()`, and the new Markdown exporter | Data-only object literals have no execution order — safe to declare at the very top of the script, immune to the temporal-dead-zone trap (see below). No library gives you this for free; a library gives you *validation*, not a *registry shape*, and this project already has hand-rolled validation logic it can generalize. |
| `<meta http-equiv="Content-Security-Policy">` with hash-based `script-src` | CSP Level 2/3 (native browser support) | Lock down script execution without a server | The only CSP delivery mechanism available on GitHub Pages (static hosting, no custom response headers). Hash-based fits a static single inline `<script>` better than nonce-based, which requires per-request server generation — impossible here. |
| Native event delegation (`addEventListener` + `Element.closest()` + `dataset`) | DOM Level 3 Events / ES2015 | Replace ~140 inline `onclick=` attributes | `closest()` and `dataset` are universally supported in modern mobile Chrome/Safari. Removing inline handlers is also a *hard prerequisite* for a strict CSP without `'unsafe-inline'`, independent of any library choice. |
| Template-literal Markdown table builder | Native JS (tagged/plain template literals) | Export for pasting into Claude Desktop | A ~20-line function, not a library concern. Markdown-table libraries (e.g. `markdown-table` on npm) exist but pull in npm/a build step for a job this small. |
| Second `localStorage` key (or a `local:` prefix within the existing key's top-level shape, excluded from `mergeDB()`) | Native Web Storage API | Make `draft` device-local | `localStorage` already backs the whole app; no new API needed, only a routing decision — never send `draft` through `save()`/`push()`, only `saveLocal()` or a dedicated non-synced key. |

### Supporting Libraries (named for the record, not recommended)

| Library | Version | Purpose | Why NOT usable here |
|---------|---------|---------|----------------------|
| Zod | v4 (2025) | Runtime schema validation + type inference | Ships as an npm package; using it here means either a build step (rejected — see PROJECT.md Out of Scope) or hand-vendoring a minified UMD blob inline, which defeats "zero dependencies" and is unauditable/unupdatable without a toolchain. Also TypeScript-oriented; this project has no type layer to benefit from. |
| Valibot | v1 (2025) | Same as Zod, optimized for small bundle size (~1KB minimal) | Same objection — still an npm artifact requiring vendoring. Bundle-size advantage is irrelevant when nothing is bundled at all. |
| Standard Schema | v1.0 (2025) | Cross-library interface so validators are swappable | A TypeScript-first *interface spec*, not a runtime library — provides zero value without a type-checked build step, which this project explicitly does not have. |
| `markdown-table` (npm) | current | Generates GFM tables from arrays | Trivial to hand-write for ~10 collections; not worth an npm dependency for a project with none. |
| DOMPurify | current | HTML sanitization | Not needed — the project already has `esc()` and an explicit escaping convention (CLAUDE.md); this is an existing-code concern, not part of this milestone. |

### Development Tools (dev-time only, never shipped)

| Tool | Purpose | Notes |
|------|---------|-------|
| `openssl` or a one-line `node -e` script | Compute the SHA-256 hash of the inline `<script>` block for the CSP `script-src` value | Run locally before each push, output pasted into the `<meta>` tag by hand. Not a build step — it never transforms `index.html`'s runtime behavior, only tells you a string to paste. See CSP section for the automation-vs-manual tradeoff. |
| Browser DevTools console | Confirms the exact hash the browser expects | When a CSP hash mismatches, Chrome/Safari/Firefox print the correct `sha256-...` value in the console on the blocked-resource violation — useful as a manual check, not something to script around. |

## Installation

```bash
# None. Every recommendation above is either:
#   - a browser-native API (no install), or
#   - a hand-written ~20-100 line helper added directly to index.html, or
#   - a one-line shell/node command run at your terminal before `git push`,
#     never added to package.json and never shipped to the browser.
npm test   # unchanged — still the only command that has to succeed before every push
```

## The module-eval-time constraint — read this before writing the registry

**This is the single most likely way this milestone breaks production**, per the project's own
history (Migration 15 was silently reverted by a TDZ-adjacent ordering bug; `migrationRan` is
already deliberately consumed at the bottom of the script for this reason).

`normalize()` — and therefore anything it touches — runs at module-eval time, i.e. the instant the
inline `<script>` is parsed, not on any later event. A `const` declared *after* the line that calls
`normalize()` is in the temporal dead zone until its own declaration executes; touching it earlier
throws `ReferenceError` and the app never boots.

**The registry itself is safe if — and only if — every value in it is a literal (string, number,
boolean, plain array/object of literals) with no references to other identifiers:**

```js
// Safe at the very top of the script, above everything, including normalize()'s call site.
// Every value here is a literal. Nothing is looked up, nothing is called, nothing can be
// in a temporal dead zone, because nothing here *references* anything else.
const COLLECTIONS = {
  sessions:    { kind: 'list', key: 'id',   soft: true,  sortBy: 'date',
                 columns: [['date','Date'], ['type','Type'], ['notes','Notes']] },
  weights:     { kind: 'list', key: 'id',   soft: true,  sortBy: 'date' },
  petWeights:  { kind: 'list', key: 'id',   soft: true,  sortBy: 'date' },
  cardio:      { kind: 'list', key: 'id',   soft: true,  sortBy: 'date' },
  ideas:       { kind: 'list', key: 'id',   soft: true,  sortBy: 'createdAt' },
  todos:       { kind: 'list', key: 'id',   soft: true,  sortBy: 'createdAt' },
  hobbyLog:    { kind: 'list', key: 'id',   soft: true,  sortBy: 'date' },
  sleep:       { kind: 'list', key: 'id',   soft: true,  sortBy: 'date' },
  journal:     { kind: 'map',  key: 'date', soft: false },
  mobilityLog: { kind: 'map',  key: 'date', soft: false },
  lawnLog:     { kind: 'map',  key: 'date', soft: false },
};
```

**What is NOT safe:** embedding functions in the registry that close over later `const`s (e.g. a
`default: () => SOME_LATER_CONST`), or computing a derived value at top level by *calling* a function
defined later in the file with `const fn = () => {}` (function *expressions* are not hoisted the way
`function` declarations are). Keep `COLLECTIONS` pure data — no closures, no calls.

**Where the derived consumers go:** `blank()`, `mergeDB()`, a generic `live(key)`, and
`validateBackup()` become functions that read `COLLECTIONS` *at call time* via `Object.entries(...)` —
function bodies don't execute until invoked, so they are free to reference anything declared anywhere
else in the file, including things declared textually below them, **as long as they are not called
before those things exist**. That is already how `normalize()` is handled today (called at the
bottom, after everything it needs exists) — the same discipline applies to every new derived consumer.
Concretely: **declare `COLLECTIONS` immediately next to `SCHEMA`, at the very top of the script's
const block; write `blank`/`mergeDB`/`live`/`validateBackup` as ordinary functions anywhere below it;
do not call any of them before the point in the file where `normalize()` is already called today.**

Keep the existing named wrappers (`liveSessions()`, `liveWeights()`, …) as one-line pass-throughs over
the generic `live('sessions')` etc., so no call site outside `blank()`/`mergeDB()`/`liveX()`/
`validateBackup()` has to change for F1 to land — that keeps this phase's blast radius to the
declaration and its four direct consumers, not the ~140 call sites F2 will touch separately.

**Confidence: HIGH.** This is a direct application of JS's own hoisting/TDZ rules (ECMA-262), not a
judgment call — the risk and the fix are both mechanical.

## Content-Security-Policy for a single-file app with an inline `<script>`

**What GitHub Pages can and cannot deliver.** GitHub Pages serves static files with no mechanism to
set custom HTTP response headers — no `_headers` file, no server config, no per-request logic. The
*only* CSP delivery mechanism available is `<meta http-equiv="Content-Security-Policy" content="...">`
in `<head>`. (Confidence: HIGH — confirmed current as of 2025 searches; the only workarounds involve
proxying through Cloudflare/Netlify/a custom domain with a CDN in front, which is a hosting change and
therefore out of scope here.)

**What the `<meta>` tag cannot do that a real header can**, per the CSP spec:
- **`frame-ancestors` is silently ignored** inside `<meta>` — clickjacking protection is not available
  through this mechanism at all. (Low practical risk for a single-user app with no embed surface, but
  worth knowing it is not actually enforced even if written into the tag.)
- **`report-uri`/`report-to` do not work** inside `<meta>` — there is no way to get violation reports;
  you only find out about a broken policy by the feature visibly failing in front of Ian, at the rack.
  This makes local testing before every push more important than usual, since there is no telemetry
  safety net in production.
- **`sandbox` is ignored** inside `<meta>` — irrelevant here (no iframes), noted for completeness.
- **Coverage starts at the tag, not at the top of `<head>`.** The policy only applies to content
  parsed *after* the `<meta>` element is reached, so it must be the first thing inside `<head>` — any
  script or resource reference placed before it in markup is not covered at all.
- **No report-only mode via `<meta>`** — you cannot dry-run a stricter policy in "log but don't
  enforce" mode the way a `Content-Security-Policy-Report-Only` header allows; every change to the
  meta tag is a live enforcement change on the next push. Test locally with a local static server and
  browser DevTools console (which prints every violation) before pushing.
- **It can be neutralized by markup injection.** A real header cannot be stripped by anything in the
  page; a `<meta>` tag theoretically could be, by an attacker who manages to inject HTML before it
  parses. This project's `esc()` convention (CLAUDE.md) already exists to prevent exactly that class of
  injection — this is a reason to keep that discipline tight, not a reason to change the CSP approach.

**`'unsafe-inline'` vs hash-based vs nonce-based, for this app specifically:**

- **`'unsafe-inline'`** allows any inline script or handler to run — it is syntactically the easiest
  policy to write but provides no actual XSS protection, since it allows exactly the class of thing
  CSP exists to block. Useful only as a temporary, explicitly-labeled interim step while migrating
  (e.g., ship the `<meta>` tag with `'unsafe-inline'` first to prove the tag itself doesn't break
  anything, then tighten to a hash in a follow-up commit) — never as the end state.
- **Nonce-based (`'nonce-<random>'`)** requires the *server* to generate a fresh random value on every
  request and inject the same value into both the response header/meta tag and the `<script>` tag's
  `nonce` attribute. GitHub Pages serves byte-identical static files with no per-request templating —
  **nonce-based CSP is not achievable here, full stop**, unless the hosting model changes (out of
  scope; noted only because the question asked). Confidence: HIGH.
- **Hash-based (`'sha256-<digest>'`)** is the right fit: the app is one static, unchanging (between
  deploys) inline `<script>` block. Compute the SHA-256 digest of the script's exact text content
  (not including the `<script>` tags themselves), base64-encode it, and list it in `script-src`. The
  browser recomputes the hash of the inline block at parse time and compares.
  - **Caveat that matters here: hashes cover inline `<script>`/`<style>` *elements*, not inline event
    *handler attributes*.** A hash-based `script-src` without `'unsafe-inline'` blocks every
    `onclick=` attribute outright — this is not a bug to work around, it is the mechanism *forcing*
    capability #3 (event delegation) to happen before capability #2 (CSP) can be meaningfully
    tightened. There is a CSP3 extension, `'unsafe-hashes'`, that can allowlist individual
    handler-attribute strings by their own hash, but browser support for it is inconsistent —
    notably weaker in Safari — and it is fragile besides (editing any one of 140 attributes changes
    its hash, so it re-invites exactly the maintenance burden `'unsafe-hashes'` is meant to avoid).
    Given the app already needs to remove the inline handlers for other reasons (see F2), don't reach
    for `'unsafe-hashes'` at all — land F2 first, then ship a hash-only `script-src` with no exception
    needed for handler attributes. Confidence: MEDIUM on the Safari support gap specifically (verify
    empirically against the actual phone before relying on it); HIGH on the rest of this paragraph.
  - **Maintenance cost, and a real tension with "no build step":** because the whole app is one
    `<script>` block, its hash changes on *every* commit that touches any JS. Two ways to handle that,
    and this project's constraints make the first the safer default:
    1. **Manual (recommended default):** a documented one-line command (`openssl dgst -sha256 -binary
       index.html-script-slice | openssl base64`, or equivalent) run at the terminal before push,
       pasted by hand into the `<meta>` tag. This adds a manual step to the existing "run `npm test`
       before every push" habit, but it is a terminal command a human runs, not a transform the
       shipped file undergoes automatically — it stays inside the letter of "no build step."
    2. **Automated in the existing GitHub Actions deploy workflow:** a step that computes the hash and
       patches the `<meta>` tag in the *published* artifact only, leaving the committed `index.html`
       hash-free. This removes the manual step but is, honestly, a small build step by most
       definitions — PROJECT.md rules out "add a build step" explicitly. Flagging this tension rather
       than deciding it: **recommend option 1 for this milestone**, and treat option 2 as something to
       raise with the user explicitly if the manual step turns out to be missed often in practice,
       rather than adopting it silently. Confidence: MEDIUM (this is a judgment call about intent,
       not a technical fact).

## Event delegation in vanilla JS

**Current idiom** for replacing the ~140 `onclick=` attributes: one delegated listener per event type,
attached high in the tree (`document` or the app's root container), reading a `data-action` attribute
via `closest()`:

```js
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const fn = ACTIONS[el.dataset.action];
  if (fn) fn(el, e);
});
```

- **Why `closest()`, not `e.target` directly:** a click on an icon or text node *inside* a button
  reports that inner node as `e.target`, not the button itself. `closest('[data-action]')` walks up
  from whatever was actually clicked to the nearest ancestor carrying the attribute, so markup can
  freely nest icons/spans inside actionable elements without breaking the handler. `closest()` climbs
  the real DOM ancestor chain regardless of where the listener is registered, so delegating from
  `document` is safe.
- **`dataset` for parameters:** `data-action="delete-set"` plus `data-id="..."` (and similar) read as
  `el.dataset.action` / `el.dataset.id` — no parsing, no `eval`, and it keeps the same "behavior lives
  in HTML attributes" ergonomics the current `onclick=` code already has, just routed through one
  function instead of 140 global ones.
- **Non-bubbling events — this needs care, and general advice online is inconsistent about it:**
  - `click`, `change`, and `input` **do bubble** — a single delegated listener on each works fine.
    (Do not skip delegating `change`; it is commonly and incorrectly lumped in with `focus`/`blur` as
    non-bubbling — it isn't.)
  - `focus` and `blur` **do not bubble** — a delegated listener for `focus`/`blur` on a parent will
    never fire for descendant elements. Use `focusin`/`focusout` instead: DOM-spec bubbling
    equivalents of the same events, supported in all evergreen browsers including mobile Safari, and
    they slot into the identical `closest('[data-action]')` pattern above with no other changes.
  - Confidence: HIGH (verified against current event-bubbling behavior; this corrects a commonly
    repeated but inaccurate claim that `change` doesn't bubble).
- **Keyboard accessibility comes free if the 140 elements are real `<button>` (or `<a href>`)
  elements** — native interactive elements fire a synthetic `click` on Enter/Space, so a delegated
  `click` listener covers mouse, touch, *and* keyboard with no extra code. **Audit each of the 140
  during F2**: where the current markup is a `<div onclick=...>` or `<span onclick=...>` styled to
  look clickable, convert it to a real `<button>` (with CSS reset if needed to remove default button
  chrome) rather than keeping a non-semantic element — this is strictly less code than the
  alternative. Only where a real `<button>` cannot be used (rare — e.g. a naturally-clickable card that
  must contain its own nested interactive controls, since `<button>` cannot nest interactive content)
  add `tabindex="0"` + `role="button"` and a second delegated `keydown` listener that treats
  `Enter`/`Space` as a click (`e.preventDefault()` on Space to stop page scroll, then invoke the same
  `ACTIONS[el.dataset.action]` lookup). Confidence: HIGH — this is standard WAI-ARIA authoring
  practice, not a judgment call.

## Markdown table generation for the Claude export

**Escaping rules that actually matter for GFM-style pipe tables:**

- **Pipe characters (`|`) inside a cell must be escaped as `\|`**, or the row silently splits into the
  wrong number of columns on render (and, more importantly for this use case, becomes genuinely
  ambiguous for an LLM parsing the raw text, not just a rendering artifact).
- **Newlines inside a cell break the table entirely** — each table row must be exactly one line of
  source text. Replace embedded `\n` in any field (e.g. a journal entry or a note) with `<br>` (GFM
  renders it as a line break and Claude reads raw `<br>` fine even unrendered) rather than stripping
  it, so information isn't silently lost.
- **Leading/trailing whitespace in a cell is insignificant to any renderer** but trim it anyway at
  generation time — it's free correctness and marginally fewer tokens.
- **Every row, including the header separator (`| --- | --- | --- |`), must have the same number of
  `|`-delimited cells as the header** — this is a syntactic requirement of the format, not a style
  preference; a short row silently misaligns every column after the short one.
- **Empty/null values:** render as `-` rather than leaving the cell blank between two pipes (`| |`).
  An explicit `-` is unambiguous ("this field is empty") versus a table that merely *looks* malformed
  at a glance — matters more here than usual, since this export exists to be eyeballed before pasting
  (per the Key Decisions table in PROJECT.md).
- Escaping `*`/`_`/backtick inside cell text is optional for table *validity* (unlike `|` and
  newlines) — only relevant if a logged note happens to contain them and unintended bold/italic
  rendering would be confusing. Given the audience is Claude Desktop reasoning over data, not a human
  reading rendered Markdown, this is low-priority; skip it unless a specific field (e.g. free-text
  journal entries) turns out to contain them often.

**Conventions that make tabular text cheaper for an LLM to read**, beyond bare syntactic validity:

- One row = one record, always — never fold two log entries into one row's cell via `<br>` just to
  save a row; that reintroduces the "single line per record" property this format is chosen for.
- ISO 8601 dates (`YYYY-MM-DD`) everywhere, not locale-formatted — removes ambiguity when the model is
  asked to reason about ordering or elapsed time between rows.
- Put units in the header (`Weight (lb)`), not repeated in every cell (`185 lb`) — removes per-row
  redundant tokens across potentially hundreds of rows.
- Sort rows in a stable, meaningful order — chronological, given this is a fitness/life log — so token
  adjacency mirrors temporal adjacency; this measurably helps trend-style reasoning versus rows in
  insertion or random order.
- One table per collection, driven directly by `COLLECTIONS[key].columns` (see the registry section
  above) rather than one denormalized mega-table — keeps headers meaningful per collection and avoids
  sparse columns where most rows don't apply.
- **Never export soft-deleted rows.** The same `live(key)` filter that already exists for
  `liveSessions()` etc. should be the only source the exporter reads from — this is not a new rule,
  just a reminder that the Markdown exporter must derive from `COLLECTIONS` + `live()`, never write a
  second hand-rolled filter (this is explicitly one of this milestone's Key Decisions in PROJECT.md).
- Confidence: HIGH on the syntactic escaping rules (verifiable against the CommonMark/GFM table
  extension); MEDIUM on the "cheaper for an LLM" conventions, which are established practice but not a
  formal spec.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|--------------|-------------|---------------------------|
| Plain-object `COLLECTIONS` registry, hand-checked in `validateBackup()` | Zod/Valibot/Standard Schema | If this project ever gains a build step and npm dependencies (it explicitly won't, per PROJECT.md Out of Scope) — then a real validation library buys typed parsing and better error messages for free. Not applicable here. |
| Hash-based CSP `script-src` | Nonce-based CSP | Only if GitHub Pages is ever replaced or fronted by something that can template a per-request nonce (e.g. Cloudflare Workers) — a hosting change, out of scope for this milestone. |
| Manual hash recomputation before push | Automated hash injection in GitHub Actions | If the manual step is found to be reliably forgotten in practice. Flag to the user explicitly before adopting — it borders on "add a build step," which PROJECT.md rules out. |
| Delegated listeners keyed on `[data-action]` + `closest()` | Per-element listeners attached in a setup pass after each render | If the app ever moves to a virtual-DOM-style re-render model where elements are recreated wholesale on every state change — not the case here; the app patches specific DOM nodes, so delegation from a stable ancestor is strictly less code and never needs re-attaching. |
| Hand-written Markdown table builder | `markdown-table` (npm) | If the project ever needs to support more exotic GFM table features (alignment columns, nested tables) — unlikely for a flat tabular export of log data. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|--------------|
| Vendoring a minified Zod/Valibot build inline into `index.html` | Defeats "zero dependencies" in spirit even if it technically avoids npm at runtime — unauditable blob, no update path without re-vendoring by hand, no build step to keep it in sync | The plain-object `COLLECTIONS` registry + the existing hand-rolled shape checks in `validateBackup()`, generalized to iterate the registry |
| `'unsafe-inline'` as an end-state CSP | Provides no real XSS protection — allows exactly what CSP exists to block | Hash-based `script-src`, after F2 removes the inline `onclick=` attributes |
| Nonce-based CSP | Requires per-request server templating; GitHub Pages cannot do this | Hash-based `script-src` |
| `'unsafe-hashes'` to allowlist all 140 `onclick=` attributes individually | Fragile (any edit changes the hash), inconsistent browser support (notably Safari), and it's solving the wrong problem when the attributes can just be removed | Event delegation (F2) — removes the need for any handler-attribute exception at all |
| A second, hand-written Markdown serializer independent of `COLLECTIONS` | Recreates the exact bug pattern this milestone exists to close — a sixth place the schema would live (explicitly named as a Key Decision to avoid in PROJECT.md) | Derive the exporter from `COLLECTIONS[key].columns` + `live(key)` |
| Attaching 140 individual `addEventListener` calls (one per element) as a mechanical 1:1 replacement for the 140 `onclick=` attributes | Reproduces the current maintenance burden in a different syntax and doesn't unlock a clean CSP any more than delegation does, for more code | One delegated listener per event type, reading `data-action` |
| Storing `draft` in the same synced top-level DB object that `mergeDB()` walks | Silently re-introduces exactly the bug class this item exists to remove — any future addition to `mergeDB()`'s traversal could pick it back up | A separate `localStorage` key (or a clearly-named top-level key explicitly excluded by `mergeDB()`/`save()`'s push path), documented at the same place `COLLECTIONS` is declared |

## Stack Patterns by Variant

**If the phone in daily use is iOS/Safari specifically:**
- Verify `'unsafe-hashes'` support empirically before ever relying on it (per the CSP section) — this
  is the one place mobile Safari's CSP3 support is reported as behind Chrome. Doesn't change the
  recommendation (event delegation removes the need for it either way), just raises the cost of
  getting it wrong if someone is tempted to shortcut F2 and lean on `'unsafe-hashes'` instead.

**If GitHub Pages is ever fronted by a CDN/proxy that can set custom headers (not proposed, out of
scope, noted only for completeness):**
- Nonce-based CSP becomes viable, and `report-uri`/`frame-ancestors` become enforceable. Not relevant
  to this milestone; don't plan around it.

## Version Compatibility

| Feature | Target (modern mobile Chrome/Safari) | Notes |
|---------|----------------------------------------|-------|
| `Element.closest()` | Universal | Supported since Chrome 41 / Safari 6 — no concern on any device this app targets |
| `HTMLElement.dataset` | Universal | No concern |
| `focusin`/`focusout` | Universal, including mobile Safari | Use these instead of delegated `focus`/`blur` |
| CSP2 hash-based `script-src` (`'sha256-...'`) | Supported in current Chrome and Safari | Core to the CSP recommendation |
| CSP3 `'unsafe-hashes'` | Inconsistent, weaker in Safari | Avoid relying on it — see CSP section |
| `<meta http-equiv="Content-Security-Policy">` | Universal | `frame-ancestors`/`report-uri`/`sandbox` ignored inside it regardless of browser — a spec limitation, not a compatibility gap |

## Sources

- [CSP via HTTP headers vs meta tags](https://centralcsp.com/articles/csp-meta-tags) — MEDIUM (third-party summary), cross-checked against MDN CSP guide
- [MDN — Content Security Policy (CSP)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP) — HIGH
- [OWASP Content Security Policy Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html) — HIGH
- [CSP Hash Examples and Guide](https://content-security-policy.com/hash/) — MEDIUM
- [Hashes and Nonce | All you need to know](https://centralcsp.com/docs/csp-hashes-nonce) — MEDIUM
- [GitHub community discussion — Content Security Policy setting on GitHub Pages](https://github.com/orgs/community/discussions/49832) — HIGH (primary-source confirmation that GH Pages has no custom-header support)
- [Adding a Content Security Policy to Your GitHub Pages Site](https://www.isaacsmith.us/blog/2022/add-csp-to-github-pages) — MEDIUM
- [javascript.info — Event delegation](https://javascript.info/event-delegation) — HIGH
- [Standard Schema / Zod v4 / Valibot v1 comparisons (PkgPulse guides, 2026)](https://www.pkgpulse.com/guides/valibot-vs-zod-v4-typescript-validator-2026) — MEDIUM (aggregator, cross-checked against general knowledge of both libraries)
- Project files: `PROJECT.md`, `CLAUDE.md`, `.planning/codebase/STACK.md` — HIGH (primary source for constraints)
- MDN event-bubbling reference tables for `change`/`focus`/`blur`/`focusin`/`focusout` — HIGH (verified against training knowledge; corrects a commonly repeated but inaccurate claim found in one search result that `change` does not bubble)

---
*Stack research for: adding a collection registry, Markdown export, event delegation, and a
device-local field to an existing single-file offline-first PWA*
*Researched: 2026-09-10*
</content>
