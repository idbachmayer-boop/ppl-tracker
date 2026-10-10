---
phase: 07-content-security-policy
reviewed: 2026-10-09T13:05:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - index.html
  - .github/workflows/deploy.yml
  - CLAUDE.md
  - test/app.test.js
  - scripts/csp-hash.js
findings:
  critical: 0
  warning: 3
  info: 6
  total: 9
status: issues_found
---

# Phase 7: Code Review Report

**Reviewed:** 2026-10-09T13:05:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Scope: `git diff a122a2e..HEAD` for `index.html`, `.github/workflows/deploy.yml`, `CLAUDE.md` and
`test/app.test.js`, plus `scripts/csp-hash.js` (d602994, d300ccf).

**The shipped policy is correct.** I traced every resource the app loads against the parsed policy and
found no directive that breaks the app. The trace covered the three gstatic SDK tags, the inline
script, the blob: manifest and its data: icons, `./sw.js`, the open-meteo `fetch` calls, the Firebase
Auth, token and Firestore hosts, the Android auth loader and its iframe, the blob: export downloads,
and the `google.com` link, which is navigation only. The app never uses media, fonts, `<img>` with
remote URLs, forms, `<iframe>`, `eval` or `new Function`, so leaving those under `default-src 'none'`
is safe. Exfiltration routes from injected markup are closed: `img-src` blocks CSS `url()` and
`<img>` beacons, `form-action 'none'` blocks forms, `frame-src` is pinned, and `default-src` blocks
prefetch. `style-src 'unsafe-inline'` is the only unsafe allowance, and it is documented. The deploy
step stamps first, then verifies and never computes a hash, which is the right order. I ran the
suite: `928 passed, 0 failed, 2 skipped`. `csp:check` is OK.

**The weaknesses are in the guards, not the policy.** The test comment at
`test/app.test.js:3569` says "a widened one must not [stay green]", and that claim does not hold. I
built three mutations in a scratch clone, and each one kept the full suite green and the deploy's
`--check` green:

- a policy with an attacker host in `connect-src`, `img-src` and `script-src`, plus
  `script-src-attr 'unsafe-inline'` (which re-enables `<img onerror>` injection);
- a second, single-quoted CSP `<meta>` with `connect-src 'none'` (which kills sync silently);
- a deploy job whose check step was turned into `echo skipped # node scripts/csp-hash.js --check`.

Nothing here is a live defect today. All three findings are regression guards that would let a future
edit ship a weakened or broken policy without a red suite.

## Warnings

### WR-01: The CSP checks require minimum allowances but never cap them, so a widened policy stays green

**File:** `test/app.test.js:3569`, `3653-3659`, `3676-3681`, `3690-3700`
**Issue:** Each directive check asserts that something is present (`INVENTORY.every(h => connect.includes(h))`,
`img-src` includes `'self'` and `data:`, the `AUTH_LOADER` paths are present). None of them asserts
that nothing else is present. The `script-src` checks refuse only keywords, wildcards and schemes,
and accept any extra source with a path. Directives the suite never inspects, such as
`script-src-attr`, `script-src-elem` and `style-src-attr`, are not checked at all. A CSP3 browser
reads `script-src-attr 'unsafe-inline'` instead of `script-src` for event-handler attributes, so it
re-opens exactly the `esc()`-hole injection (`<img src=x onerror=…>` through `innerHTML`) that this
phase exists to block.

Proven in a scratch clone. This mutation of `index.html` gives `928 passed, 0 failed` and
`CSP hash OK`:
```
connect-src https://evil.example https://identitytoolkit… ;
img-src 'self' data: https://evil.example ;
script-src 'sha256-…' … https://apis.google.com/js/api.js https://evil.example/x/ … ;
form-action 'none'; script-src-attr 'unsafe-inline'
```
The block's own comment says that "connect-src lists every host the app talks to, so logged data
cannot be posted anywhere else". The suite does not enforce that sentence.

**Fix:** Bound every directive from above, and keep the comparison order-insensitive so it still
asserts a property, never the wording:
```js
const EXPECTED = {
  'default-src': ["'none'"], 'object-src': ["'none'"], 'base-uri': ["'none'"], 'form-action': ["'none'"],
  'connect-src': INVENTORY, 'img-src': ["'self'", 'data:'], 'style-src': ["'self'", "'unsafe-inline'"],
  'manifest-src': ['blob:'], 'worker-src': ["'self'"], 'frame-src': [handler],
  'script-src': [/* checked separately: one sha256, the gstatic version path, AUTH_LOADER */],
};
const extraDirectives = Object.keys(pol).filter(d => !(d in EXPECTED));        // refuses script-src-attr/-elem
const widened = Object.keys(EXPECTED).filter(d => d !== 'script-src')
  .flatMap(d => dir(d).filter(t => !EXPECTED[d].includes(t)).map(t => d + ' ' + t));
const extraScript = dir('script-src').filter(t => !/^'sha256-/.test(t) &&
  t !== gstaticTokens[0] && !AUTH_LOADER.includes(t));
ok('CSP: no directive allows more than the inventory', !extraDirectives.length && !widened.length && !extraScript.length,
   { extraDirectives, widened, extraScript });
```
Adding a host then means editing `INVENTORY` in the same commit, which is the review point you want.

### WR-02: A second CSP `<meta>` goes undetected unless it is written with double quotes

**File:** `scripts/csp-hash.js:23`, `36-41`; `test/app.test.js:3591-3593`, `3596`
**Issue:** Both the tool (`CSP_MARK = /http-equiv="Content-Security-Policy"/gi`) and the CSP-01 "one CSP
meta" check count policies by the exact double-quoted attribute text. A browser enforces every policy
it finds, intersected. A stray `<meta http-equiv='Content-Security-Policy' …>`, or an unquoted
`http-equiv=Content-Security-Policy`, is a second policy that the suite and the deploy check never
see. This is a silent-break risk. Proven: inserting
`<meta http-equiv='Content-Security-Policy' content="connect-src 'none'" />` after the real meta keeps
`928 passed, 0 failed` and `CSP hash OK`, yet in a browser it blocks Firestore, Auth and weather with
no error the app surfaces. Sync failures are silent, as 07-CONTEXT notes.
**Fix:** Count `<meta>` tags whose `http-equiv` is the CSP, whatever the quoting and case, in
`csp-hash.js`, and reuse that count in the suite:
```js
const CSP_META = /<meta\b[^>]*\bhttp-equiv\s*=\s*(["']?)content-security-policy\1[\s/>]/gi;
const metas = (html.match(CSP_META) || []).length;
```
Keep the strict `META` regex for reading the content, so an oddly written meta still fails loudly
instead of being parsed by guesswork.

### WR-03: The deploy-ordering check matches text, so a disabled check step still passes

**File:** `test/app.test.js:3623-3630` (asserting on `.github/workflows/deploy.yml:53-72`)
**Issue:** The test finds `sed -i`, `actions/setup-node`, then the first textual occurrence of
`node scripts/csp-hash.js --check` or `npm run csp:check`, and compares their string offsets. A YAML
comment satisfies it. Proven: changing line 68 to
`run: echo skipped  # node scripts/csp-hash.js --check` keeps the suite at `928 passed, 0 failed`.
`continue-on-error: true` or `if: false` on the step would also pass. The deploy gate is the last line
of defence against publishing a blank app, so its guard should assert that the step really runs. It
also pins `setup-node` after the stamp, which is incidental: a `setup-node` before `Stamp build` is
equally correct and would turn the check red for no reason.
**Fix:** Split the deploy job into steps (`job.split(/\n      - /)`), then:
- find the stamp step by its `sed -i`, the check step by its `run:` value with comments stripped
  (`/^\s*run:\s*(node scripts\/csp-hash\.js --check|npm run csp:check)\s*$/m`), and the upload step;
- assert stamp index < check index < upload index;
- assert the check step has no `continue-on-error:` and no `if:` key;
- drop the `nodeAt > sedAt` clause.

## Info

### IN-01: `npm run csp:hash --check` without `--` rewrites the file, despite the "never fall through" comment

**File:** `scripts/csp-hash.js:59-61`
**Issue:** npm 11 consumes `--check` as its own config flag when it comes before `--`, so the script
runs in rewrite mode. Verified: with a stale hash, `npm run csp:hash --check` printed
`updated sha256-…` and edited `index.html`. The rewrite is also the remedy, so no harm is done, but
the comment's guarantee ("A typo'd --check must never fall through to the rewrite") only holds for
direct `node` invocation.
**Fix:** In rewrite mode, run `if(process.env.npm_config_check) fail('did you mean npm run csp:check?')`,
after confirming that npm exports it. Or reword the comment and point people to `npm run csp:check`.

### IN-02: `--check` can recommend a command that then refuses to run

**File:** `scripts/csp-hash.js:79`, `82`
**Issue:** When `script-src` has no `'sha256-…'` token, `--check` prints "policy has none … Run: npm run
csp:hash". `csp:hash` then fails with "expected exactly one 'sha256-…' source in script-src, found 0".
The advice is a dead end.
**Fix:** When `have.length === 0`, make the `--check` message say to add a placeholder
`'sha256-x'` to `script-src` first. Or let rewrite mode insert the token right after `script-src`
when none is present.

### IN-03: `style-src 'self'` is an allowance nothing uses, and CSP-04 requires it

**File:** `index.html:5`; `test/app.test.js:3685`
**Issue:** The page has no `<link rel="stylesheet">`. All its CSS is the inline `<style>` and `style=`
attributes, which `'unsafe-inline'` covers. `'self'` adds stylesheet loads from any of the owner's
`github.io` Pages repos, and the CSP-04 check makes that mandatory. The risk is small, because
`'unsafe-inline'` already allows CSS injection and `img-src` blocks CSS exfiltration, but it is an
allowance the 07-CONTEXT D-01 inventory adopted without a consumer.
**Fix:** Drop `'self'` from `style-src` next time the policy changes (this needs a re-probe and
`csp:hash` is not affected), and relax CSP-04 to require only `'unsafe-inline'`.

### IN-04: The phone auth-loader path is Google-internal and can change with no deploy

**File:** `index.html:5` (`https://apis.google.com/_/scs/abc-static/`); `CLAUDE.md:89-103`
**Issue:** The gapi loader chooses its own bundle path. If Google moves it, for example to another
`/_/scs/…-static/` path, `script-src` blocks it on phones. Nothing in the repo changes, no test can
see it, and sign-in or the auth iframe on Android degrades silently. The CLAUDE.md bullet lists the
triggers that call for a re-probe (an SDK bump, a new host, console auth changes) but not this one.
**Fix:** Add one line to the CLAUDE.md CSP bullet: if phone sync breaks with no deploy, check DevTools
for a `script-src` violation on `apis.google.com`, then widen to the reported path and re-probe.

### IN-05: The manifest link without `href` is non-conforming HTML (known trade-off)

**File:** `index.html:12`
**Issue:** The HTML spec says a `<link>`'s `href` "must be present". Browsers handle the missing
attribute correctly (no fetch until the script sets it), and the 07-06 decision kept the hashed script
byte-identical on purpose, so this is only a note. Validators and some audit tools will flag it.
**Fix:** None needed now. If the inline script is ever edited anyway, creating the `<link>` in the
script removes the placeholder entirely. The MANIFEST checks would then need to read the link from the
booted DOM rather than the markup.

### IN-06: `manifest-src blob:` locks in a manifest whose `start_url` is already ignored (pre-existing)

**File:** `index.html:5`, `306-308`
**Issue:** Every probe in 07-06 and 07-07 logs `property 'start_url' ignored, URL is invalid.`,
because `"./"` cannot resolve against a `blob:` base. This predates the phase. The policy now makes
moving to a real `manifest.json` (the usual fix, which also lets Android mint a WebAPK) a
policy change too: it would need `manifest-src 'self'` and a re-probe.
**Fix:** Out of scope for this phase. Record it next to CSP-04 as a deferred idea: an absolute
`start_url` built from `location` in the inline script, or a static `manifest.json` with
`manifest-src 'self'`.

---

_Reviewed: 2026-10-09T13:05:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
