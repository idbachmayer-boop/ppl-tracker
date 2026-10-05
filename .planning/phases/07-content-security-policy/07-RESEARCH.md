# Phase 7: Content Security Policy - Research

**Researched:** 2026-10-02
**Domain:** Browser Content-Security-Policy delivered by `<meta>` in a single-file, no-build PWA that loads Firebase JS SDK compat 10.14.1 from gstatic
**Confidence:** HIGH. The endpoint inventory and the build-stamp landmine were both proven in a real browser (headless Chrome over CDP, desktop and Android user agents) and against the shipped Firebase SDK source, not only read about.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Policy strictness
- **D-01:** Full lockdown. Start from `default-src 'none'` and explicitly allow only what the app
  uses. The planner and researcher build the inventory by hand (CSP-03) and must cover at least:
  `script-src` (inline hash plus the Firebase path, see D-07), `connect-src` (Firebase Auth,
  Firestore and token endpoints; `api.open-meteo.com`; `geocoding-api.open-meteo.com`),
  `img-src` (`'self' data:`, for the SVG icons), `manifest-src` (`blob:`, since the inline manifest
  comes from `URL.createObjectURL`), `worker-src 'self'` (`./sw.js`), `frame-src` (whatever the
  Firebase/Google sign-in flow needs; check the `www.google.com` reference near index.html:2716),
  and `style-src 'self' 'unsafe-inline'` (CSP-04, documented as deliberate: 440 inline
  `style=` attributes). Also verify that `sw.js` is unaffected, since a meta CSP doesn't apply to
  the worker.
- **D-02:** Add the hardening directives `object-src 'none'`, `base-uri 'none'` and
  `form-action 'none'`. (`frame-ancestors` is ignored in a meta CSP, so leave it out.)

#### Stale-hash guard
- **D-03:** `npm test` fails when the sha256 of the inline `<script>` doesn't match the hash in the
  meta tag. The failure message names the regeneration command. CI already blocks the deploy on a
  red suite.
- **D-04:** Add an npm script (e.g. `npm run csp:hash`) that recomputes the hash and rewrites the
  meta tag in place. It's run by hand, with no build step. CLAUDE.md documents it (CSP-07).
- **D-05:** The hash must be computed over the exact bytes git stores (LF; Phase 6's
  `.gitattributes`), so the hash on Windows matches the one on the deployed site.

#### Rollout & sync check
- **D-06:** The CSP lands as its own commit so it can be reverted cleanly. Run the local
  static-server check first (CSP-05, zero violations in the console). After go-live, the proof of
  sync is a cross-device round trip: log a test weigh-in on the PC, see it appear on the phone
  (allow ~10 min for PWA update lag; Settings → This version shows the build), then soft-delete it
  and confirm the delete syncs. Also check the console on the live URL for violations. If sync is
  broken, revert the CSP commit immediately and diagnose afterwards; never hotfix forward.

#### Firebase pinning
- **D-07:** Allow only the exact version path `https://www.gstatic.com/firebasejs/10.14.1/`, not
  the whole host. A test asserts that the version in the CSP matches the version in the three SDK
  `<script src>` tags, so an SDK bump that forgets the CSP fails `npm test`. — **Reversibility:**
  reversible.

### Claude's Discretion
- The exact Firebase endpoint list, how the test extracts the inline script, the npm script's
  implementation, and where the meta tag sits in `<head>` (it must come before any script).

### Deferred Ideas (OUT OF SCOPE)
- Removing inline styles so `style-src` can drop `'unsafe-inline'`. This is out of scope for v1.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description (from `.planning/REQUIREMENTS.md:88-94`) | Research Support |
|----|-------------|------------------|
| CSP-01 | A `<meta http-equiv="Content-Security-Policy">` policy ships, using a hash-based `script-src` for the inline script block | §Landmine (the build stamp must leave the script first), §Recommended policy, §Code Examples (`scripts/csp-hash.js`), §Pitfall 1 and 2 |
| CSP-02 | The policy allow-lists `https://www.gstatic.com` so the three Firebase SDK scripts keep loading | D-07 path `https://www.gstatic.com/firebasejs/10.14.1/`. Loading all three under it verified in Chrome (§Empirical results) |
| CSP-03 | `connect-src` covers Firebase's runtime endpoints and the weather API hosts, inventoried by hand | §Firebase endpoint inventory (from the SDK source) and §Resource inventory (from index.html). Weather hosts returned 200 under the policy and a foreign host was blocked (§Empirical results) |
| CSP-04 | `style-src` retains `'unsafe-inline'` as a documented, deliberate decision | §Recommended policy. Test asserts it is present. CLAUDE.md note |
| CSP-05 | Verified locally against a static file server with zero console violations before push | §CSP-05: who can run it. Headless Chrome is installed and the scripted CDP probe works from a subagent. Run it under **both** desktop and Android user agents |
| CSP-06 | Cloud sync confirmed working after the policy is live | §Rollout. D-06 round trip, plus a check that Settings → This version shows the CSP commit on both devices first |
| CSP-07 | Hash-regeneration documented as a manual command in `CLAUDE.md` | §Code Examples (CLAUDE.md wording). `npm run csp:hash` |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Single-file PWA: `index.html` is the whole app. **No build step, no dependencies.** Keep it that way.
- `npm test` before every push. A red suite blocks the deploy in CI. Add checks for what you change.
- Tests assert **properties, never wording**. A missing git **fails**, never skips (REPO-01 idiom).
- Line endings: `.gitattributes` forces LF. The suite asserts the property via `git check-attr` and the indexed blob.
- Draft/sync rules: nothing in this phase may touch `save()`/`saveLocal()`/`mergeDB()` behaviour. The CSP only gates *which hosts* sync may reach.
- Escaping: every user string through `esc()`. (The CSP is defence in depth on top of this, not a replacement.)
- Event handlers: `data-action` plus one delegated listener. **No inline on-event attributes** (Phase 5). That is what makes a hash-only `script-src` possible.
- Icons are inline Phosphor SVG with no CDN or web font, which is why `font-src` can stay `'none'`.
- Security rules in `firestore.rules` stay in sync with the console. (Not touched here.)
- After shipping, append a dated changelog entry in Ian's vault at `C:\Main Vault\50-59 Projects & Events\56. Software Projects\PPL Tracker App.md` and update **Current Features** (a CSP is structural).
- REQUIREMENTS.md Out of Scope (`.planning/REQUIREMENTS.md:125`, verbatim): "Automated CSP hash injection in GitHub Actions | Borders on a build step, which is ruled out. The manual documented command is the chosen alternative." **This rules out landmine option (b).**
- REQUIREMENTS.md Out of Scope (`.planning/REQUIREMENTS.md:127`): no Report-Only soak, because it has no `<meta>` equivalent.

## Summary

The phase is feasible, but CONTEXT.md does not cover two blocking issues. Both were found and resolved empirically in this session.

**1. The build stamp sits inside the hashed script (the orchestrator's landmine), and it does break production.** `.github/workflows/deploy.yml:54` rewrites `'__BUILD_STAMP__'` inside the inline `<script>` (`index.html:484`) after checkout and before upload. I simulated exactly that: I hashed the repo copy, applied the deploy's `sed`, and loaded the result in headless Chrome. **The inline script was blocked and the app did not boot.** Chrome printed the hash it wanted instead (`sha256-Hkuwmusby3pM…`, not the repo's `sha256-/gdiPzMW…`). Every local check passes, and production renders a blank page. Option (b), recomputing the hash in CI, is explicitly Out of Scope (`REQUIREMENTS.md:125`). **Recommendation: option (a), moving the stamp into `<meta name="ppl-build" content="__BUILD_STAMP__">` in `<head>`** and reading it at runtime. I verified the whole path in Chrome: meta stamp, policy, hash, then the deploy-style `sed` on the meta. Result: zero violations, the app boots, and Settings shows `Updated Oct 2, 2026, 5:00 AM · abc1234`. A `<script type="application/json">` data block would also escape `script-src` (verified), but it trips the existing "exactly one inline script" test (`test/app.test.js:107-109`) and the harness's "last inline script is the app" rule (`test/harness.js:47-49`). The meta tag avoids both. I byte-compared the live `index.html` against the git blob plus the deploy `sed`: **identical**. Nothing else (Pages, the SW, Actions) rewrites the file.

**2. On mobile, the auth SDK loads a third-party script and iframe at start-up, and a desktop-only local check cannot see it.** Firebase Auth compat 10.14.1's popup/redirect resolver initialises proactively when the user agent is mobile, Safari or iOS (`get _shouldInitProactively(){return He()||De()||je()}` in the shipped SDK). That injects `https://apis.google.com/js/api.js`, which then loads `https://apis.google.com/_/scs/abc-static/…`, plus an iframe at `https://ppl-tracker-a1d87.firebaseapp.com/__/auth/iframe`. This happens even though the app only ever calls `signInWithEmailAndPassword` and `createUserWithEmailAndPassword` (`index.html:4322`). The policy D-01 sketches loaded with **zero violations on a desktop UA and one violation on an Android UA** (Ian's phone). The SDK swallows the failure (`try{await this._popupRedirectResolver._initialize(this)}catch(e){}`), and auth init still completed. So blocking it would not break email/password sync, but it would put a CSP error on every phone load, and CSP-05's "zero violations" would be true only on the PC. **Recommendation: allow it narrowly**, with `script-src … https://apis.google.com/js/api.js https://apis.google.com/_/scs/abc-static/` and `frame-src https://ppl-tracker-a1d87.firebaseapp.com/__/auth/`. I verified this as zero violations under the Android UA. The `www.google.com` reference at `index.html:2716` is only an `<a target="_blank">` how-to search link. Top-level navigation is not governed by any CSP directive, so it needs nothing.

**Primary recommendation:** Ship in this order. (1) Move the build stamp to a `<meta>` and update the harness, tests and deploy step. (2) Add the zero-dep `scripts/csp-hash.js` (`npm run csp:hash` / `--check`), whose hashing is pinned to a Chrome-verified test vector. (3) Add the meta CSP below as its own revertable commit, with property tests, a deploy-job `--check` after the stamp, and the CLAUDE.md note. Then run the scripted headless-Chrome probe under desktop **and** Android UAs, then the human DevTools pass, then push and do the D-06 round trip.

### Recommended policy (verified zero violations: desktop UA and Android UA, signed-out boot)

```
default-src 'none';
script-src 'sha256-<computed>' https://www.gstatic.com/firebasejs/10.14.1/ https://apis.google.com/js/api.js https://apis.google.com/_/scs/abc-static/;
connect-src https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://api.open-meteo.com https://geocoding-api.open-meteo.com;
frame-src https://ppl-tracker-a1d87.firebaseapp.com/__/auth/;
img-src 'self' data:;
style-src 'self' 'unsafe-inline';
manifest-src blob:;
worker-src 'self';
object-src 'none';
base-uri 'none';
form-action 'none'
```

`font-src`, `media-src` and `child-src` deliberately fall back to `default-src 'none'`. The app has no `@font-face` (count 0), no `<audio>/<video>` (0) and no workers besides the SW. Do **not** add `'strict-dynamic'`, `'unsafe-eval'`, `'unsafe-hashes'`, `frame-ancestors`, `report-uri` or `sandbox` (see Pitfalls).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Policy enforcement (script/connect/frame/…) | Browser / Client | — | Meta CSP is parsed and enforced by the browser. There is no server (GitHub Pages sends no CSP header: verified `curl -sI`) |
| Policy declaration + inline-script hash | CDN / Static (`index.html` `<head>`) | — | The hash lives in the same static file it protects. The bytes are served unchanged (byte-compare verified) |
| Hash regeneration | Developer tooling (`scripts/csp-hash.js`, run by hand) | — | No build step (CLAUDE.md, REQUIREMENTS.md:125). The tool edits one attribute in place |
| Stale-hash / drift guard | CI test job (`npm test`) | CI deploy job (`--check` after stamp) | The test catches drift in the repo. The deploy check proves the *published* bytes still match after the only deploy-time rewrite |
| Build stamp | CDN / Static (`<meta name="ppl-build">`) | CI deploy job (`sed`) | Must sit outside the hashed script, so the deploy rewrite cannot change the hash |
| Service worker | Browser (worker context) | — | The page's meta CSP does not govern the worker's own fetches. Registering it is governed by the page's `worker-src` (verified: `SW_STATE.ready = true` under the policy) |
| Sync transport (Auth, Firestore) | API / Backend (Google) | Browser (`connect-src`, `frame-src`, `script-src` for gapi) | The SDK reaches fixed Google hosts. The policy only gates them |

## Standard Stack

No packages. Everything uses Node built-ins and the browser.

### Core
| Tool | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node `crypto` (built-in) | Node 20 in CI (`deploy.yml:32-33`), v24.15.0 locally | `createHash('sha256').update(text,'utf8').digest('base64')` → CSP hash-source | The exact algorithm CSP3 hash-sources use. Matched Chrome's own reported hash on a CRLF + emoji vector this session |
| Meta CSP (`<meta http-equiv="Content-Security-Policy">`) | CSP Level 2/3 | Policy delivery without a server | The only delivery available on GitHub Pages. Report-Only is impossible in meta [CITED: w3.org/TR/CSP3] |
| Headless Chrome via CDP (local verification only, not committed) | Chrome installed at `C:/Program Files/Google/Chrome/Application/chrome.exe`. Edge also present | CSP-05 scripted probe: violations, request hosts, boot facts | A subagent can run it with no browser pane and zero deps (Node 24 global `WebSocket` + `fetch`) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Meta build stamp (a) | Recompute the hash in CI (b) | **Ruled out by REQUIREMENTS.md:125** (borders on a build step) |
| Meta build stamp | `<script type="application/json">` data block | Verified exempt from `script-src`, but it breaks `test/app.test.js:107-109` ("exactly one inline script") and `test/harness.js:47-49` (the harness runs the *last* inline script as the app) |
| Meta build stamp | Deploy writes an external `build.js` | Needs `'self'` in `script-src`, which on `*.github.io` admits every same-user repo. Adds a file outside the SW shell (`sw.js:13`) and is effectively a build artifact |
| Hash-only `script-src` | `'strict-dynamic'` | Makes browsers ignore the D-07 host/path allowlist, so the three parser-inserted gstatic tags would be blocked unless they carried `integrity` hashes [CITED: MDN script-src]. Harmful here |
| Path-restricted `apis.google.com` | Whole host `https://apis.google.com` | Both verified clean. The path form is narrower, and the cost of Google moving the path is only console noise (the SDK swallows the failure) |
| Allow the gapi/iframe on mobile | Leave it blocked | Functionally harmless today (failure swallowed, auth init completes: verified), but every phone load logs a CSP error and CSP-05 becomes desktop-only. Also breaks the moment Google sign-in is ever added |

**Installation:** none.

## Package Legitimacy Audit

This phase installs **no** external packages (npm, PyPI or crates). The hash tool and the probe use only Node built-ins (`fs`, `path`, `crypto`, `http`, `child_process`, global `fetch`/`WebSocket`).

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| (none) | — | — | — | — | — | — |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## The build-stamp landmine: evidence and resolution

### What rewrites `index.html` between git and the browser (complete list)

`.github/workflows/deploy.yml:51-55` (verbatim):
```yaml
      - name: Stamp build
        run: |
          test "$(grep -c "'__BUILD_STAMP__'" index.html)" = 1
          sed -i "s/'__BUILD_STAMP__'/'$(date -u +%Y-%m-%dT%H:%M:%SZ) ${GITHUB_SHA::7}'/" index.html
          grep -q "^const BUILD = '[0-9T:Z-]* [0-9a-f]\{7\}';" index.html
```
`index.html:484` (verbatim, inside the inline `<script>` that opens at `index.html:300` and closes at `index.html:4943`): `const BUILD = '__BUILD_STAMP__';`

- **Deploy job:** the `sed` above is the only transform. `upload-pages-artifact@v3` with `path: '.'` (`deploy.yml:59-61`) tars the checkout as is.
- **GitHub Pages:** serves the bytes unchanged. [VERIFIED: fetched `https://idbachmayer-boop.github.io/ppl-tracker/index.html`. Its stamp `2026-10-02T09:31:33Z e35f560` resolves to commit `e35f560b97d4…`, and `git show e35f560:index.html` with the deploy `sed` replayed is **byte-identical** to the live file (382136 = 382136 chars, 0 CR).] Pages sends **no** CSP header and `Cache-Control: max-age=600` [VERIFIED: `curl -sI`].
- **Service worker:** `sw.js:34` (verbatim) `if(new URL(req.url).origin !== self.location.origin) return;` and network-first `cache.put` of the response it got. It stores and serves the same bytes and never rewrites them. A cached copy carries its own matching meta CSP, so a cached page is always self-consistent.
- **The browser's own normalisation:** the HTML parser turns CR/CRLF into LF *before* hashing [CITED: html.spec.whatwg.org/multipage/parsing.html "Preprocessing the input stream"]. Verified: Chrome demanded `sha256-FkXmCGIF…` for a CRLF script, which equals Node's LF-normalised hash, not the raw-CRLF hash `sha256-dwJuaNwq…`.

### Empirical proof that it breaks production (headless Chrome, this session)
Repo copy hashed, then the deploy `sed` applied, then loaded:
```
[security/error] Executing inline script violates the following Content Security Policy directive
'script-src 'sha256-/gdiPzMWpfDQF8a7sAJJJPnkr2vjzMbvfQDa5qV5rOs=' https://www.gstatic.com/firebasejs/10.14.1/'.
Either the 'unsafe-inline' keyword, a hash ('sha256-Hkuwmusby3pM1VZH3LHZf76Mj+Qp0aJ7XOf4Yu/0l7s='), ... is required
appBooted: false
```
Side effect seen: once the script is blocked, `<link rel="manifest" href="#">` (`index.html:10`) is never repointed to the blob, so `manifest-src blob:` additionally blocks the page URL as a manifest, three times. That is a symptom of a dead script and does not need its own fix.

### Options weighed

| Option | Hash invariant across deploy? | Collides with | Verdict |
|---|---|---|---|
| (a) `<meta name="ppl-build" content="__BUILD_STAMP__">` + runtime read | Yes (meta attributes are not hashed) | Needs a small harness change (stub `querySelector` returns `el()` with no `.content`, `test/harness.js:64`) and edits to 3 BUILD tests plus 3 deploy lines | **RECOMMENDED.** End-to-end verified in Chrome |
| (b) CI recomputes the hash after stamping | Yes | **REQUIREMENTS.md:125 Out of Scope** | Rejected (locked) |
| (c1) `<script type="application/json">` data block | Yes (exempt per WHATWG step 13 before CSP step 21, and verified in Chrome) | `test/app.test.js:107-109` regex counts it as a 2nd inline script. Placed after the app script, `test/harness.js:49` would execute it as the app | Rejected |
| (c2) External `build.js` written at deploy | Yes | Needs `script-src 'self'`, a new artifact, and is not in the SW shell | Rejected |
| (c3) Drop the build stamp | Yes | Loses Settings → This version, which D-06 relies on to tell a stale phone from a broken policy | Rejected |

### Exact edits that option (a) requires (tests that pin the text being changed)
- `index.html:484` → `const BUILD = (document.querySelector('meta[name="ppl-build"]') || {}).content || '';` and update the comment at `index.html:479-483`. The name `ppl-build` is a proposal, not an existing value.
- `index.html` `<head>`: `<meta name="ppl-build" content="__BUILD_STAMP__" />`.
- `test/app.test.js:3290-3292` pins `/const BUILD = '__BUILD_STAMP__';/`. Rewrite it as a property: the placeholder appears exactly once, in the `ppl-build` meta, and **not inside the inline script**.
- `test/app.test.js:3299-3300` (`a.BUILD === '__BUILD_STAMP__'`) holds once the harness feeds meta content.
- `test/app.test.js:3310` replays the deploy with `src.replace("'__BUILD_STAMP__'", …)`. The single-quoted form no longer exists, so it must follow the new `sed` form. Add: the replayed copy's `inlineScriptHash` still equals the policy's hash. **This is the landmine's regression test.**
- `test/app.test.js:3293-3296` (deploy job stamps before `upload-pages-artifact`) is unchanged and still holds.
- `.github/workflows/deploy.yml:53-55`: retarget to the meta form (see Code Examples).
- `test/harness.js:64`: answer `meta[name="…"]` selectors from the parsed HTML (see Code Examples).

## Firebase endpoint inventory (CSP-03, the core risk)

Source: the three SDK files actually served, downloaded this session from `https://www.gstatic.com/firebasejs/10.14.1/` and grepped. Behaviour was then confirmed by request capture in headless Chrome.

**Auth methods this app calls** [VERIFIED: index.html:4322, quoted]: `const p = create ? fbAuth.createUserWithEmailAndPassword(email,pass) : fbAuth.signInWithEmailAndPassword(email,pass);`. Also `fbAuth.signOut()` (`:4325`) and `fbAuth.onAuthStateChanged` (`:4297`). No popup, no redirect, no Google provider, no `photoURL` (grep count 0).

**Config** [VERIFIED: index.html:4280-4286, quoted]: `apiKey: "AIzaSyA7fxqZoTkHvhRJVSZKC4RVjotIujZMN_4", authDomain: "ppl-tracker-a1d87.firebaseapp.com", projectId: "ppl-tracker-a1d87", storageBucket: "ppl-tracker-a1d87.firebasestorage.app", messagingSenderId: "771855906872", appId: "1:771855906872:web:edabc4861e707571828ecd"`.

| Directive | Host / path | Hit when | Evidence |
|---|---|---|---|
| `script-src` | `https://www.gstatic.com/firebasejs/10.14.1/` | Every load (3 deferred tags, `index.html:268-270`) | Chrome request capture: 3 requests under that path, `firebase.apps.length === 1` |
| `script-src` | `https://apis.google.com/js/api.js` | **Mobile / Safari / iOS UA only**, at auth init, even signed out | SDK: `gapiScript:"https://apis.google.com/js/api.js"`; `get _shouldInitProactively(){return He()||De()||je()}` where `Fe(e){return/android/i.test(e)}`. Chrome, Android UA: violation under D-01's sketch |
| `script-src` | `https://apis.google.com/_/scs/abc-static/…` | Loaded by api.js right after | Chrome: `https://apis.google.com/_/scs/abc-static/_/js/k=gapi.lb.en…/m=gapi_iframes/rt` |
| `frame-src` | `https://ppl-tracker-a1d87.firebaseapp.com/__/auth/` | Same mobile condition | SDK: `Tn="__/auth/iframe"`. Chrome: iframe `https://ppl-tracker-a1d87.firebaseapp.com/__/auth/iframe?apiKey=…` |
| `connect-src` | `https://identitytoolkit.googleapis.com` | Sign-in, account create, user reload on boot when signed in | SDK: `apiHost:"identitytoolkit.googleapis.com"` |
| `connect-src` | `https://securetoken.googleapis.com` | ID-token refresh (about hourly while signed in) | SDK: `tokenApiHost:"securetoken.googleapis.com"` |
| `connect-src` | `https://firestore.googleapis.com` | Every Firestore read, listen and transaction (WebChannel over XHR/fetch) | SDK: `this.host="firestore.googleapis.com"` |
| — (not needed) | `wss:` | never | `WebSocket` occurrences in all three SDK files: 0 |
| — (not needed) | `*.firebaseio.com`, `firebaseinstallations`, analytics | never | grep counts 0 (no RTDB, Installations or Analytics SDK loaded) |
| — (not needed) | `www.googleapis.com` | never | Not in the v10 SDK host strings. Only `identitytoolkit.`/`securetoken.`/`firestore.` subdomains are used |
| — (latent) | `https://www.google.com/recaptcha/enterprise.js`, `/recaptcha/api.js` | Only if reCAPTCHA Enterprise is turned on for email/password in the Firebase console, or for phone auth | SDK strings `recaptchaEnterpriseScript:"https://www.google.com/recaptcha/enterprise.js?render="` and `isProviderEnabled("EMAIL_PASSWORD_PROVIDER")`. Not allowed, deliberately (see Pitfall 6) |

The SDK files contain no `eval(` and no `new Function` (grep count 0), so `'unsafe-eval'` is not needed. Chrome under the policy showed zero exceptions and no eval violations.

**What only a real signed-in browser can confirm:** that `identitytoolkit`, `securetoken` and `firestore` calls succeed end to end under the policy. The signed-out probe never reaches them. CSP host matching is deterministic, so the risk is an *unlisted* host, not a mismatch. The D-06 round trip on the live site closes this. Optionally, a signed-in local pass does too (see Open Question 2).

## Resource inventory (index.html, by hand)

Commands run against `index.html` (counts quoted from `grep -c -F -- "<pattern>" index.html`): `fetch(` 2, `new URL(` 0, `XMLHttpRequest` 0, `createObjectURL` 3, `serviceWorker` 3, `new Worker` 0, `import(` 0, `<link` 1, `<img` 0, `<iframe` 0, `<object` 0, `<embed` 0, `<form` 0, `eval(` 0, `new Function` 0, `@font-face` 0, `url(` 2, `blob:` 3, `data:` 2, `insertAdjacentHTML` 0, `document.write` 0, `window.open` 0, `WebSocket` 0, `EventSource` 0, `importScripts` 0, `<base` 0, `javascript:` 0, `srcset`/`<video`/`<source` 0. String-argument `setTimeout(`/`setInterval(` found by `grep -n -E "setTimeout\(\s*['\"\`]"`: none.

| file:line | What | Directive |
|---|---|---|
| `index.html:268-270` | 3× `<script defer src="https://www.gstatic.com/firebasejs/10.14.1/firebase-{app,auth,firestore}-compat.js">` | `script-src` path (D-07) |
| `index.html:300-4943` | The one inline `<script>` | `script-src 'sha256-…'` |
| `index.html:10` | `<link rel="manifest" href="#" id="manifest-placeholder" />`, repointed at `:306` to `URL.createObjectURL(new Blob([…],{type:'application/json'}))` | `manifest-src blob:`. Verified: only the blob is fetched, never `#`, while the script runs |
| `index.html:303` | Manifest icons `data:image/svg+xml,…` | `img-src data:` |
| `index.html:313` | `navigator.serviceWorker.register('./sw.js', {scope:'./'})` | `worker-src 'self'`. Verified `SW_STATE.ready:true` |
| `index.html:2904` | `fetch` `https://api.open-meteo.com/v1/forecast?…` | `connect-src`. Verified HTTP 200 under the policy |
| `index.html:2924` | `fetch` `https://geocoding-api.open-meteo.com/v1/search?…` | `connect-src`. Verified HTTP 200 under the policy |
| `index.html:2716` | `const gsearch = q => 'https://www.google.com/search?q='+…`, used only in `<a href … target="_blank" rel="noopener">` (`:1845`, `:2797`, `:2834`) | **None.** Top-level navigation is not a fetch directive |
| `index.html:3424-3425`, `:3505-3506` | `<a href=blob: download>` + `.click()` for backup/export | None (download navigation) |
| `index.html:1986-1988` | confetti `<canvas>`, `style.cssText` | None (CSSOM writes are not gated by `style-src`. `'unsafe-inline'` is present anyway) |
| `index.html:1005` and throughout | inline `<svg>` icons, `fill="url(#gid)"` same-document refs | None |
| 440 `style="…"` attributes and the `<style>` at `index.html:12` | inline styles | `style-src 'unsafe-inline'` (CSP-04) |
| fonts `index.html:36,41` | system stacks only (`ui-monospace`, `-apple-system`, …) | `font-src` stays `'none'` |
| `/favicon.ico` | Browser-initiated, same origin | `img-src 'self'` (seen requested, no violation) |

## Architecture Patterns

### System Architecture Diagram

```
 git blob (LF) ──► deploy job ──sed: stamp into <meta name="ppl-build"> (NOT the script)──► --check: hash(script) == policy hash? ──no──► job fails, nothing published
                                                                                                │yes
                                                                                                ▼
                                                                          GitHub Pages (bytes unchanged, max-age=600)
                                                                                                │
 Browser: HTML parser ──► normalises CRLF→LF ──► <meta CSP> parsed FIRST in <head> ──► policy active for everything after it
                                                                                                │
         ┌───────────────────────┬──────────────────────┬────────────────────────┬──────────────┴───────────────┐
         ▼                       ▼                      ▼                        ▼                              ▼
  inline <script>          gstatic SDK x3        SDK auth init:              fetch()                     SW register ./sw.js
  sha256 match? ─no─► app  path match           mobile UA? ─yes─► gapi js     identitytoolkit / securetoken  worker-src 'self'
  dead (blank page)        (D-07)               + authDomain iframe           firestore / open-meteo        (worker's own fetches
         │yes                                   (script-src + frame-src)      connect-src allowlist         NOT governed by page CSP)
         ▼                                                                    other host ─► blocked
  app boots, DOM via innerHTML (style attrs need 'unsafe-inline'), data-action delegation (no inline handlers)
```

### Recommended file layout (new and changed)
```
index.html                  # + <meta http-equiv=CSP> right after <meta charset>; + <meta name="ppl-build">; BUILD reads the meta
scripts/csp-hash.js         # NEW: zero-dep; exports inlineScriptHash/readPolicy; CLI rewrites the hash in place, --check verifies
package.json                # + "csp:hash": "node scripts/csp-hash.js", "csp:check": "node scripts/csp-hash.js --check"
test/harness.js             # querySelector answers meta[name="…"] from the parsed HTML
test/app.test.js            # BUILD tests retargeted; new "Content Security Policy (CSP-0x)" block
.github/workflows/deploy.yml# stamp targets the meta; setup-node + `node scripts/csp-hash.js --check` after the stamp, before upload
CLAUDE.md                   # Before-every-push line + Conventions bullet (CSP-07)
```
`scripts/` is new. It is published by `path: '.'` like everything else, which is noise but not a leak (DEPLOY-01, v2).

### Pattern 1: Meta placement
**What:** `<meta http-equiv="Content-Security-Policy" content="…" />` as the **second** element in `<head>`, right after `<meta charset="UTF-8" />` (`index.html:4`). Charset must stay within the first 1024 bytes, which it does as the first element.
**Why:** "policies in meta elements are not applied to content which precedes them" [CITED: w3.org/TR/CSP3 §meta]. Placing it before `<link rel="manifest">` (`:10`), `<style>` (`:12`) and the SDK tags (`:268`) covers everything. Must be inside `<head>`.

### Pattern 2: One hashing function, anchored to an independent oracle
**What:** `scripts/csp-hash.js` exports `inlineScriptHash(html)`, and both the CLI and the test use it. The test also checks it against a vector whose hash **Chrome itself** reported this session, so a wrong algorithm cannot pass by agreeing with itself.
**Extraction:** reuse the harness regex `/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g` (`test/harness.js:47`, verbatim) and require exactly one match. Normalise `/\r\n?/g → '\n'` (the browser does the same, so any checkout hashes identically). UTF-8 encode, sha256, base64.
**D-05 satisfied twice:** (1) normalisation makes the working-tree hash equal the blob hash even on a stale CRLF checkout. (2) A test computes the hash from `git show :index.html` too and requires equality, using the REPO-01 `git` helper idiom (`test/app.test.js:96-104`), which fails rather than skips.

### Pattern 3: Policy parsed as data in tests (property, not wording)
Parse `content` → `split(';')` → `{directive: [tokens]}`. Assert properties: sets of required tokens, forbidden tokens, version equality. Never compare the whole string.

### Anti-Patterns to Avoid
- **Hashing raw file bytes without newline normalisation:** passes on an LF checkout, fails silently on a CRLF one. Chrome normalises, so you must too (verified).
- **Recomputing the hash in CI:** Out of Scope (REQUIREMENTS.md:125). A `--check` that only *verifies* is fine.
- **`'strict-dynamic'`:** makes browsers ignore the gstatic path allowlist, so the SDK tags get blocked.
- **Whole-host `https://www.gstatic.com`:** violates D-07.
- **Putting the policy in a test fixture string:** pins wording. Assert directives and tokens instead.
- **A second inline script (even a JSON data block):** breaks `test/app.test.js:109` and the harness's last-script rule.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| sha256/base64 | any JS hash impl | `require('crypto').createHash('sha256')` | Built in, identical to the browser's |
| Finding the expected hash when debugging | guessing | Chrome's violation message prints the exact `sha256-…` it wants | Verified this session |
| Browser verification by a subagent | Puppeteer/Playwright install | Raw CDP over Node 24's global `WebSocket` (probe below) | Zero dependencies, honours the no-deps rule, runs headless |
| Static server | `npx http-server` (adds a dep) | 10-line `http.createServer` (inside the probe), or `py -m http.server` | `python`/`python3` on this machine are Microsoft Store stubs. `py` (3.14.4) works |
| CSP parsing for tests | a CSP parser library | `content.split(';').map(s=>s.trim().split(/\s+/))` | The grammar for this policy is trivial |

## Common Pitfalls

### Pitfall 1: Any edit to the inline script silently invalidates the hash
**What goes wrong:** one whitespace change in `index.html:301-4942`, and production renders a blank page.
**How to avoid:** the D-03 test fails with a message naming `npm run csp:hash`. Every later phase and quick task that touches the script must run it. Put it in CLAUDE.md "Before every push".
**Warning signs:** a test named like `CSP-01: the policy's script hash matches the inline script` goes red. In the browser: "Executing inline script violates…".

### Pitfall 2: A deploy-time rewrite of hashed bytes (the landmine)
**How to avoid:** stamp only the `ppl-build` meta. A test replays the deploy `sed` and asserts the hash is unchanged. The deploy job runs `--check` after stamping.

### Pitfall 3: A desktop-only local check misses mobile-only loads
**What goes wrong:** zero violations on the PC, a violation on every phone load (gapi + iframe).
**How to avoid:** run the probe with an Android UA as well. The SDK branches on `/android/i` and on iOS/Safari regexes, so UA emulation exercises the same code path [VERIFIED: SDK source].

### Pitfall 4: Mistaking pre-existing console noise for violations
These appear **without** any CSP (baseline probe on the unmodified file) and are not violations:
- `Manifest: property 'start_url' ignored, URL is invalid.`
- the Firestore `enableMultiTabIndexedDbPersistence() will be deprecated` warning
- a local-server-only `404` for `/favicon.ico`

Count only "violates the following Content Security Policy directive" lines, or `securitypolicyviolation` events.

### Pitfall 5: Reading "the phone works" while it is still on the pre-CSP build
**Why:** Pages `Cache-Control: max-age=600` plus deploy time. The network-first SW can be served the HTTP-cached copy.
**How to avoid:** before trusting the round trip, Settings → This version on **both** devices must show the CSP commit's short sha. With the stamp in a meta, this keeps working.

### Pitfall 6: Future Firebase console or SDK changes need policy changes
Turning on reCAPTCHA Enterprise for email/password would make sign-in load `https://www.google.com/recaptcha/enterprise.js`, which the policy blocks, so **sign-in breaks**. Adding Google sign-in, or bumping the SDK version (D-07's test catches the path; the probe must be re-run for new hosts), has the same effect. Record this in the CLAUDE.md CSP bullet.

### Pitfall 7: Directives that do nothing in meta
`frame-ancestors`, `report-uri`, `sandbox` and Report-Only are unsupported in `<meta>` [CITED: w3.org/TR/CSP3]. Including them reads as protection that does not exist. A test should refuse them.

### Pitfall 8: worker-src fallback on old Safari
`worker-src` falls back to `child-src`, then `script-src`, then `default-src` [CITED: w3.org/TR/CSP3]. A browser without `worker-src` support would check `script-src`, which has no `'self'`, so SW registration would be blocked there. Chrome (both of Ian's devices, ASSUMED) supports it, and the probe verified the registration. Do **not** add `'self'` to `script-src` to cover this: on `*.github.io`, `'self'` admits every repo of the same user.

### Pitfall 9: A blocked gstatic is quiet, but not invisible
`initSync` returns early (`index.html:4292` verbatim: `if(SYNC.ready || !window.firebase) return;`), and Settings shows "Cloud sync couldn't load (no connection to the sync library). Reopen the app while online." (`index.html:4620`). A blocked Firestore host shows "Offline — will sync when you're back online" or "Sync error". These are the manual tells in the CSP-06 check.

## Code Examples

### `scripts/csp-hash.js` (skeleton: names and paths are proposals)
```js
#!/usr/bin/env node
/* Content-Security-Policy hash for index.html's one inline <script>.
 *   npm run csp:hash   rewrites the sha256 in the CSP <meta> in place (run after ANY edit to the script)
 *   npm run csp:check  exits 1 if the hash is stale (the deploy job runs this after stamping)
 * No build step: this edits one attribute value and nothing else. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const INLINE = /<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g;          // same regex as test/harness.js:47
const META = /<meta http-equiv="Content-Security-Policy" content="([^"]*)"/i;
function inlineScriptHash(html){
  const m = [...html.matchAll(INLINE)];
  if(m.length !== 1) throw new Error(`expected exactly one inline <script>, found ${m.length}`);
  /* The HTML parser turns CRLF and lone CR into LF before the browser hashes (verified in Chrome),
     so a CRLF checkout must hash the same as the LF blob git stores. */
  const text = m[0][1].replace(/\r\n?/g, '\n');
  return 'sha256-' + crypto.createHash('sha256').update(text, 'utf8').digest('base64');
}
function readPolicy(html){
  const m = META.exec(html); if(!m) return null;
  const d = {};
  m[1].split(';').map(s => s.trim()).filter(Boolean).forEach(s => { const [k, ...v] = s.split(/\s+/); d[k.toLowerCase()] = v; });
  return d;
}
module.exports = { inlineScriptHash, readPolicy };
if(require.main === module){
  const file = path.join(__dirname, '..', 'index.html');
  const html = fs.readFileSync(file, 'utf8');
  const want = inlineScriptHash(html);
  const pol = readPolicy(html);
  if(!pol) { console.error('no CSP <meta> in index.html'); process.exit(1); }
  const have = (pol['script-src'] || []).filter(t => /^'sha256-/.test(t));
  if(process.argv.includes('--check')){
    if(have.length === 1 && have[0] === `'${want}'`){ console.log('CSP hash OK ' + want); process.exit(0); }
    console.error(`CSP hash stale: policy has ${have.join(' ') || 'none'}, script is '${want}'. Run: npm run csp:hash`); process.exit(1);
  }
  if(have.length !== 1) { console.error(`expected exactly one sha256 source in script-src, found ${have.length}`); process.exit(1); }
  const out = html.replace(META, (all) => all.replace(have[0], `'${want}'`));   // touches only the meta; line endings untouched
  if(out !== html) fs.writeFileSync(file, out);
  console.log((out !== html ? 'updated ' : 'unchanged ') + want);
}
```

### Chrome-verified test vector (pins the algorithm to an independent oracle)
```js
// Chrome 2026-10-02 reported this exact hash for this script body (served with CRLF):
const VECTOR = '\r\n  // 💪 emoji and CRLF line endings\r\n  window.x = "é";\r\n';
ok('CSP: hashing matches what Chrome computes (CRLF normalised, UTF-8)',
   inlineScriptHash('<script>' + VECTOR + '</script>') === 'sha256-FkXmCGIFCB9jt8LEY2DLQI+fJjqrioS0k5jyDB0+5gY=');
```

### Harness: feed `<meta name>` content to the stub (`test/harness.js`, near line 64)
```js
const metas = {};
for(const mm of src.matchAll(/<meta\s+name="([^"]+)"\s+content="([^"]*)"/g)) metas[mm[1]] = mm[2];
// in `doc`:
querySelector: sel => { const q = /^meta\[name="([^"]+)"\]$/.exec(sel); return q ? (q[1] in metas ? { content: metas[q[1]] } : null) : el(); },
```
(`src` is the full HTML string the harness already reads at `test/harness.js:46`.)

### Deploy job stamp and check (`.github/workflows/deploy.yml`, replacing lines 51-55)
```yaml
      # Stamp ONLY the <meta name="ppl-build"> attribute. It sits outside the inline <script>, so the
      # CSP hash covering that script is identical in the repo and in the published copy.
      - name: Stamp build
        run: |
          test "$(grep -c '__BUILD_STAMP__' index.html)" = 1
          sed -i "s/content=\"__BUILD_STAMP__\"/content=\"$(date -u +%Y-%m-%dT%H:%M:%SZ) ${GITHUB_SHA::7}\"/" index.html
          grep -q '<meta name="ppl-build" content="[0-9T:Z-]* [0-9a-f]\{7\}"' index.html
      - name: Use Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Check the published script still matches its CSP hash
        run: node scripts/csp-hash.js --check
```
This is a verification, not hash injection, so it stays inside REQUIREMENTS.md:125. Placing it in the CSP commit means reverting that commit removes it too.

### Property tests to add (sketch; reuse `rawHtml` from `test/app.test.js:107`)
```js
const { inlineScriptHash, readPolicy } = require('../scripts/csp-hash');
const pol = readPolicy(rawHtml) || {};
const head = rawHtml.slice(0, rawHtml.indexOf('</head>'));
const metaAt = rawHtml.search(/<meta http-equiv="Content-Security-Policy"/i);
ok('CSP-01: exactly one CSP <meta>, inside <head>, before every <script>, <style> and <link>',
   (rawHtml.match(/http-equiv="Content-Security-Policy"/gi) || []).length === 1 && metaAt > 0 && metaAt < head.length
   && ['<script', '<style', '<link'].every(t => rawHtml.indexOf(t) > metaAt));
ok('CSP-01: the policy\'s script hash matches the inline script (stale? run `npm run csp:hash`)',
   (pol['script-src'] || []).filter(t => /^'sha256-/.test(t)).join() === `'${inlineScriptHash(rawHtml)}'`);
// D-05: same hash from git's stored blob (git helper as in REPO-01; a missing git FAILS)
// D-07: every SDK <script src> starts with the single gstatic firebasejs/<v>/ path in script-src, same <v>
// CSP-03: connect-src ⊇ {identitytoolkit, securetoken, firestore .googleapis.com, api./geocoding-api.open-meteo.com};
//         and every literal fetch host in the inline script is in connect-src; frame-src covers https://<firebaseConfig.authDomain>/__/auth/
// CSP-04: style-src includes 'unsafe-inline'
// script-src never has 'unsafe-inline' 'unsafe-eval' 'unsafe-hashes' 'strict-dynamic' * https: data: 'self'
// D-02: default-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; no frame-ancestors/report-uri/sandbox
// D-01: manifest-src has blob:; worker-src has 'self'; img-src has 'self' and data:
// Landmine: replay the deploy sed on a copy; inlineScriptHash(copy) === inlineScriptHash(rawHtml), and BUILD shows the stamp
```

### CSP-05 probe (verified working this session; recreate in the session scratchpad, do not commit)
Usage: `node probe.js <siteDir> <port> <mobile 0|1> <waitMs> [jsExpr]`. It serves `<siteDir>`, drives headless Chrome over CDP, and prints violations, request hosts, exceptions and boot facts.
```js
const http=require('http'),fs=require('fs'),path=require('path'),{spawn}=require('child_process');
const [dir,port,mobile,wait,expr]=[process.argv[2],+process.argv[3],process.argv[4]==='1',+process.argv[5]||12000,process.argv[6]];
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(new URL(q.url,'http://x').pathname);if(p.endsWith('/'))p+='index.html';
  const f=path.join(dir,p);if(!fs.existsSync(f)){r.writeHead(404);return r.end();}
  r.writeHead(200,{'Content-Type':{'.html':'text/html; charset=utf-8','.js':'text/javascript'}[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(f).pipe(r);}).listen(port,'127.0.0.1');
const CHROME='C:/Program Files/Google/Chrome/Application/chrome.exe', dbg=port+1000;   // machine-specific path
const ch=spawn(CHROME,['--headless=new','--remote-debugging-port='+dbg,'--user-data-dir='+path.join(__dirname,'prof-'+port+'-'+Date.now()),'--no-first-run','about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{let ws;for(let i=0;i<50&&!ws;i++){await sleep(200);try{ws=(await(await fetch(`http://127.0.0.1:${dbg}/json`)).json()).find(t=>t.type==='page').webSocketDebuggerUrl;}catch(e){}}
  const s=new WebSocket(ws);await new Promise(r=>s.onopen=r);let id=0;const pend=new Map(),out={violations:[],security:[],exceptions:[],hosts:{}};
  s.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);return;}
    if(m.method==='Runtime.consoleAPICalled'){const t=m.params.args.map(a=>a.value??a.description).join(' ');if(t.startsWith('CSPV '))out.violations.push(t.slice(5));}
    if(m.method==='Log.entryAdded'&&m.params.entry.source==='security')out.security.push(m.params.entry.text.slice(0,400));
    if(m.method==='Runtime.exceptionThrown')out.exceptions.push(m.params.exceptionDetails.text);
    if(m.method==='Network.requestWillBeSent'){const u=m.params.request.url;const k=/^(data|blob):/.test(u)?u.slice(0,5):(()=>{const x=new URL(u);return x.origin+x.pathname.split('/').slice(0,3).join('/');})();out.hosts[k]=(out.hosts[k]||0)+1;}};
  const send=(method,params={})=>new Promise(r=>{const i=++id;pend.set(i,r);s.send(JSON.stringify({id:i,method,params}));});
  for(const d of['Runtime','Log','Network','Page'])await send(d+'.enable');
  if(mobile)await send('Emulation.setUserAgentOverride',{userAgent:'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36'});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:"document.addEventListener('securitypolicyviolation',e=>console.log('CSPV '+e.effectiveDirective+' '+e.blockedURI))"});
  await send('Page.navigate',{url:`http://127.0.0.1:${port}/index.html`});await sleep(wait);
  const ev=async x=>(await send('Runtime.evaluate',{expression:x,awaitPromise:true,returnByValue:true})).result.result.value;
  out.facts={booted:await ev("document.getElementById('app').innerHTML.length>100"),firebaseApps:await ev("window.firebase?firebase.apps.length:-1"),sw:await ev("JSON.stringify(window.SW_STATE)"),custom:expr?await ev(expr):undefined};
  console.log(JSON.stringify(out,null,1));s.close();ch.kill();srv.close();process.exit(0);})();
```
**Pass criteria:** `violations: []` and `security: []` with `mobile=0` **and** `mobile=1`. Also `booted: true`, `firebaseApps: 1`, `sw` contains `"ready":true`, and `hosts` lists only expected origins. Optional extra: pass `jsExpr` that `fetch`es both open-meteo URLs and `https://example.com/`. Expect 200, 200, and a blocked third (verified).

### CLAUDE.md wording (CSP-07; placement: "Before every push" + a Conventions bullet)
```markdown
If you edited the inline `<script>` in `index.html` at all (even whitespace), run `npm run csp:hash` first.
The Content-Security-Policy pins that script by sha256, and a stale hash makes the browser refuse to run it, so
the app renders a blank page everywhere, the phone included. `npm test` fails with the command name when the hash is stale.

- **Content-Security-Policy:** a `<meta>` CSP in `<head>`, hash-only `script-src`. `npm run csp:hash`
  rewrites the hash; `npm run csp:check` verifies it (the deploy job runs it after stamping). The
  build stamp lives in `<meta name="ppl-build">`, never in the script, because anything that rewrites
  the script after hashing kills the app. `style-src` keeps `'unsafe-inline'` on purpose (CSP-04;
  ~440 inline `style=` attributes). Changing the Firebase SDK version, enabling reCAPTCHA or
  Google sign-in in the Firebase console, or adding any new fetch host needs a policy change.
  Re-run the headless probe (desktop and Android user agent) after any of these.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Host allowlists for scripts | Hash/nonce + `'strict-dynamic'` | CSP3 | For a static single page with fixed third-party tags, hash + exact path allowlist is the fit. `'strict-dynamic'` would void D-07 |
| `script-src 'self'` (CONCERNS.md:102 recommendation) | Hash-based `script-src` (D-01) | This phase | `'self'` on `*.github.io` admits other repos of the same user and does nothing for an inline script |
| Report-Only soak | Local probe + DevTools, then live check | n/a for meta | Report-Only does not exist in meta [CITED: w3.org/TR/CSP3] |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Ian's devices are Chrome on Android and a Chromium browser on Windows | Pitfall 8, Validation | If the PC browser is Firefox: hash/path/`worker-src` all still supported; low risk |
| A2 | Real Android Chrome UAs (including the reduced UA) still contain "Android", so the phone takes the proactive gapi path the emulation took | Firebase inventory | Low. If not, the gapi allowance is merely unused |
| A3 | reCAPTCHA Enterprise is not enabled for email/password on project `ppl-tracker-a1d87` (sign-in works today without loading recaptcha) | Pitfall 6 | If it is enabled, sign-in under the policy fails. Only a fresh sign-in reveals it, not the D-06 round trip on already-signed-in devices |
| A4 | `ubuntu-latest` plus `actions/setup-node@v4` node 20 runs `scripts/csp-hash.js` (CommonJS, built-ins only) | Deploy check | Very low (the test job already does exactly this) |
| A5 | Email/password sign-in does not check Firebase "authorized domains", so a signed-in local pass on `http://localhost:<port>` would work | Open Question 2 | If wrong, the optional local signed-in pass fails; nothing ships broken |

## Open Questions (RESOLVED)

1. **Allow or block the mobile-only gapi script and auth iframe?**
   - Known: the SDK loads them on mobile, Safari and iOS. The failure is swallowed and auth init completes when blocked (verified). Allowing them narrowly is clean (verified).
   - Unclear: whether Ian wants `script-src` to name anything beyond D-01's "inline hash plus the Firebase path".
   - Recommendation: allow them, path-restricted (it is Firebase's own auth path, loaded by the Firebase SDK). If the planner wants Ian to confirm, keep it to one sentence. The alternative is a CSP error on every phone load.
   - **RESOLVED:** D-10. Allow them, path-restricted (07-04).
2. **Optional signed-in local pass before production (CSP-05+)?**
   - Known: the signed-out probe never reaches identitytoolkit, securetoken or Firestore.
   - Option: Ian signs in once on `http://localhost:<port>` in the browser pane with a **fresh profile** (no local data, so no first-link prompt), confirms "Synced", then signs out. The transactional union merge makes this safe, but it is a real device touching the real doc, so it needs a human gate.
   - Recommendation: offer it as a `checkpoint:human-verify`. D-06's live round trip remains the required proof either way.
   - **RESOLVED:** an optional signed-in pass in 07-05 Task 2, the pre-push human-action gate.
3. **Ship the stamp move in its own deploy before the CSP deploy?** Recommended, so that the CSP go-live changes one variable and Settings → This version is proven to work from the meta first. Same PR with separate commits is acceptable. Revert the CSP commit itself (`git revert <csp-sha>`), not the merge.
   - **RESOLVED:** D-09. The stamp ships first (07-01, 07-02), and the CSP follows in 07-04 and 07-05.
4. **A fresh sign-in during CSP-06?** The D-06 round trip on already-signed-in devices exercises token refresh, user reload and Firestore, but not `signInWithPassword`. Recommend a sign-out and sign-in on the PC as part of the CSP-06 check (low risk: same uid, so `firstLink` is false).
   - **RESOLVED:** a sign-out and sign-in on the PC in 07-05 Task 3's CSP-06 human check.

There is no fifth numbered question. The reCAPTCHA Enterprise risk (Pitfall 6, Assumption A3) is
**RESOLVED** by the CLAUDE.md CSP note in 07-04.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | hash tool, tests, probe | ✓ | v24.15.0 local, 20 in CI | — |
| Global `WebSocket`/`fetch` in Node | probe | ✓ (Node ≥22) | 24.15.0 | Not needed in CI. The probe is local only |
| Google Chrome | CSP-05 probe | ✓ | `C:/Program Files/Google/Chrome/Application/chrome.exe` | Edge at `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe` (same CDP) |
| Python | alternative static server | `py` ✓ (3.14.4). `python`/`python3` ✗ (Store stubs) | — | Node server inside the probe |
| git | D-05 blob hash test | ✓ | 2.56.0.windows.1 | none: missing git must FAIL (REPO-01 idiom) |
| Internet (gstatic, apis.google.com, open-meteo) | probe | ✓ (all fetched this session) | — | — |
| Browser pane (orchestrator) / Ian's phone | human DevTools pass, CSP-06 | orchestrator only; subagents have none | — | The probe covers the automated part. The phone has no practical DevTools, so rely on the Android-UA probe plus Settings tells |

**Missing dependencies with no fallback:** none.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Custom zero-dep runner `test/app.test.js` + `test/harness.js` (vm sandbox) |
| Config file | none (`package.json` `"test": "node test/app.test.js"`) |
| Quick run command | `npm test` (about 11 s locally. Baseline before this phase: `893 passed, 0 failed, 2 skipped`, from `TZ=America/Chicago npm test`) |
| Full suite command | `npm test`, plus `node scripts/csp-hash.js --check`, plus the scratch probe with mobile 0 and 1 |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CSP-01 | One CSP meta, in `<head>`, before every script/style/link; hash equals inline-script hash; hash algorithm equals the Chrome vector; blob hash equals working-tree hash; still exactly one inline script | unit (property) | `npm test` | ❌ new block in `test/app.test.js` |
| CSP-01 (landmine) | Deploy `sed` replay leaves the hash unchanged, the placeholder sits outside the script, and the stamped copy boots and shows its version | unit | `npm test` | ⚠ edit `test/app.test.js:3285-3317` |
| CSP-02 / D-07 | gstatic path version in the policy equals all three SDK `src` versions; no whole-host gstatic | unit | `npm test` | ❌ |
| CSP-03 | connect-src ⊇ hand inventory; every literal `fetch` host is covered; frame-src covers `authDomain/__/auth/` | unit | `npm test` | ❌ |
| CSP-03 (runtime) | No violations, desktop and Android UA; weather 200; foreign host blocked | smoke (headless) | `node <scratch>/probe.js <site> <port> 0 12000` and `… 1 15000` | scratch only |
| CSP-04 | style-src has `'unsafe-inline'`; script-src has none of the forbidden tokens | unit | `npm test` | ❌ |
| D-02 | default/object/base-uri/form-action `'none'`; no meta-ignored directives | unit | `npm test` | ❌ |
| CSP-05 | Zero violations locally before push | smoke + manual | probe (both UAs) + human DevTools pass in the browser pane | manual-only for the human leg |
| CSP-06 | Live round trip: weigh-in PC → phone, soft-delete syncs; live console clean; This version shows the CSP sha on both | manual | — (needs Ian's devices and account) | manual-only |
| CSP-07 | CLAUDE.md names `npm run csp:hash`; `package.json` defines it | unit (property: the script key exists and CLAUDE.md mentions the same script name) | `npm test` | ❌ |
| D-04 | `--check` exits 1 on a stale copy and 0 after a rewrite | unit (spawn `node scripts/csp-hash.js --check` on a temp copy, or call the exported functions) | `npm test` | ❌ |

### Sampling Rate
- **Per task commit:** `npm test`, plus `npm run csp:check` once the meta exists
- **Per wave merge:** `npm test` + probe (desktop and Android UA)
- **Phase gate:** suite green, probe clean on both UAs, human DevTools pass, then push; CSP-06 round trip before `/gsd-verify-work` closes

### Wave 0 Gaps
- [ ] `scripts/csp-hash.js`: shared hash/parse functions (the tests import it)
- [ ] `test/harness.js`: meta-content support for `querySelector('meta[name="…"]')`
- [ ] Scratch `probe.js` recreated from Code Examples (not committed)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (unchanged; Firebase email/password) | — |
| V3 Session Management | no | — |
| V4 Access Control | no (`firestore.rules`, untouched) | — |
| V5 Validation, Sanitization, Encoding | yes (defence in depth) | `esc()` remains the primary control. The CSP limits the blast radius of an escaping miss |
| V6 Cryptography | yes (minimal) | Node `crypto` sha256 for the hash-source. Never hand-roll |
| V14 Configuration (HTTP security headers / CSP) | yes | Meta CSP with hash-only script-src. ASVS 4.0.3 §14.4.3 calls for a CSP to mitigate XSS [ASSUMED: section number from memory] |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Injected `<script>` / inline handler through an unescaped user string | Tampering / EoP | Hash-only `script-src`, no `'unsafe-inline'`/`'unsafe-hashes'` (handlers are already gone after Phase 5) |
| Exfiltration of the DB via `fetch`/`XHR` to an attacker host | Information disclosure | `connect-src` allowlist (verified: foreign host blocked) |
| `<base href>` hijack of relative URLs (`./sw.js`) | Tampering | `base-uri 'none'` |
| Form-post exfiltration | Information disclosure | `form-action 'none'` (the app has 0 `<form>`) |
| Plugin content | EoP | `object-src 'none'` |
| Script gadget on an allow-listed host | Tampering | Path-restricted sources (`/firebasejs/10.14.1/`, `/js/api.js`, `/_/scs/abc-static/`), no whole-host Google sources, no `'self'` in script-src |
| CSS injection / dangling markup via `style` | Information disclosure (low) | **Accepted residual** (CSP-04, `'unsafe-inline'` styles). Inline-style removal is deferred |
| Exfiltration by top-level navigation (`<a>`/`location`) | Information disclosure | **Accepted residual.** No CSP directive governs navigation (`navigate-to` was dropped from CSP3) |
| Clickjacking | Tampering | **Not possible via meta** (`frame-ancestors` is ignored in meta). Accepted residual for a personal app |

## Sources

### Primary (verified by tool this session)
- Firebase JS SDK compat 10.14.1, the three files fetched from `https://www.gstatic.com/firebasejs/10.14.1/` and grepped: `apiHost`, `tokenApiHost`, Firestore `host`, `gapiScript`, `__/auth/iframe`, `_shouldInitProactively`, UA regexes, recaptcha script URLs, absence of `WebSocket`/`eval(`/`new Function`.
- Headless Chrome (CDP) probes on scratch copies: policy sketch (desktop clean, Android one violation), path-restricted policy (both clean), deploy-stamp simulation (app dead), meta-stamp end to end (both clean, stamp shown), CRLF/emoji hash oracle, `type="application/json"` exemption, weather 200 and foreign host blocked, unmodified baseline noise.
- Live site: `curl -sI` headers (no CSP header, `max-age=600`), and a byte-compare of the live `index.html` with git blob `e35f560` plus the deploy `sed`.
- Repo files read this session: `index.html` (lines cited), `.github/workflows/deploy.yml:32-61`, `sw.js:11-34`, `test/harness.js:46-64`, `test/app.test.js:96-109, 3285-3317`, `package.json`, `.gitattributes`, `.planning/REQUIREMENTS.md:86-127`, `.planning/codebase/CONCERNS.md:98-102`.

### Secondary (official docs, fetched)
- W3C CSP Level 3: https://www.w3.org/TR/CSP3/ (meta-ignored directives, Report-Only unsupported in meta, placement, worker-src fallback)
- WHATWG HTML, prepare the script element: https://html.spec.whatwg.org/multipage/scripting.html (data blocks return at step 13, before the CSP check at step 21)
- WHATWG HTML, preprocessing the input stream: https://html.spec.whatwg.org/multipage/parsing.html (newline normalisation)
- MDN `script-src`: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src (`'strict-dynamic'` ignores allowlists; whitespace-exact hashing)
- MDN `manifest-src`: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/manifest-src (falls back to default-src; Baseline since 2020)
- csp-evaluator JSONP bypass list: https://raw.githubusercontent.com/google/csp-evaluator/master/allowlist_bypasses/jsonp.ts (no exact `apis.google.com` or gstatic entry reported; the summary was produced by a fetch model, so MEDIUM)

### Tertiary
- A web search for Firebase CSP guidance returned no official Firebase page. The SDK source plus the browser probe replace it.
- Seam note: `gsd-tools classify-confidence --provider webfetch` returns LOW for fetched pages. Spec quotes above are tagged CITED, and the decisive claims rest on the tool-verified probes and SDK source, not on the fetched pages.

## Metadata

**Confidence breakdown:**
- Landmine diagnosis and fix: HIGH. Reproduced the failure and verified the fix end to end in Chrome, and byte-compared the live site.
- Firebase/endpoint inventory: HIGH for the signed-out boot (desktop and Android UA, measured). MEDIUM-HIGH for signed-in calls (hosts read from SDK source, not exercised; D-06 closes this).
- Hash algorithm: HIGH. Node output equals Chrome's reported hash on a CRLF + emoji vector.
- Directive semantics: HIGH (spec text plus behaviour observed in Chrome).
- Old-Safari `worker-src` fallback and iOS behaviour: MEDIUM (spec-based, not device-tested).

**Research date:** 2026-10-02
**Valid until:** 2026-11-01, or immediately on any Firebase SDK version bump or Firebase Auth console change (reCAPTCHA, providers).
