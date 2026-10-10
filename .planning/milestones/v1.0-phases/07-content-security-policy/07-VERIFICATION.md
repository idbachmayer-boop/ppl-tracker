---
phase: 07-content-security-policy
verified: 2026-10-09T17:21:00Z
status: passed
score: 5/5 roadmap success criteria verified (7/7 requirements satisfied)
behavior_unverified: 0
overrides_applied: 0
re_verification: false
follow_ups:
  - id: WR-01
    source: 07-REVIEW.md
    note: "CSP checks assert minimum allowances but never cap them; an extra host, or a script-src-attr 'unsafe-inline' directive, keeps the suite green. Bound every directive from above (order-insensitive)."
  - id: WR-02
    source: 07-REVIEW.md
    note: "A second CSP <meta> written with single quotes or no quotes is invisible to csp-hash.js and the CSP-01 count. Count CSP metas regardless of quoting."
  - id: WR-03
    source: 07-REVIEW.md
    note: "The deploy-ordering check matches text, so a commented-out or `if: false` check step still passes. Parse the steps and assert the check step really runs."
  - id: IN-04
    source: 07-REVIEW.md
    note: "The phone auth-loader path (apis.google.com/_/scs/abc-static/) is Google-internal and can move with no deploy; add it to the CLAUDE.md CSP bullet's re-probe triggers."
---

# Phase 7: Content Security Policy Verification Report

**Phase Goal:** A hash-based Content-Security-Policy ships that blocks arbitrary injected script while
explicitly keeping the three Firebase SDK scripts and Firebase's runtime endpoints allowed, so
tightening security is never the thing that silently kills the app's only off-device backup.
**Verified:** 2026-10-09T17:21:00Z
**Status:** passed
**Re-verification:** No, initial verification. 07-05 failed at its Task 3 (a live `manifest-src`
violation) and was closed inside the phase by gap plans 07-06 and 07-07, so this report verifies the
state after that closure.

## Goal Achievement

The policy is in the codebase, and it is live. I fetched the published page myself
(`https://idbachmayer-boop.github.io/ppl-tracker/index.html`, cache-busted, 2026-10-09). The results:

- its stamp reads `2026-10-09T12:45:12Z f71c6e4`, and `f71c6e4` is `origin/main`;
- `node scripts/csp-hash.js --check live.html` exits 0 (`CSP hash OK sha256-Nw5jh/…`);
- its parsed policy equals HEAD's `readPolicy(index.html)`;
- with the stamp undone, the live file is byte-identical to HEAD's `index.html`;
- it has exactly one CSP meta, and its manifest link has no href.

`git diff f71c6e4 HEAD` outside `.planning/` is empty, so the code checked below is the code running in
production.

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A `<meta http-equiv="Content-Security-Policy">` ships with a hash-based `script-src` covering the inline script block, and `https://www.gstatic.com` is allow-listed so the three Firebase SDK scripts still load (CSP-01, CSP-02) | VERIFIED | `index.html:5`: one CSP meta directly after `<meta charset>`, before every `<script>`, `<style>` and `<link>`. `script-src` holds exactly one `'sha256-Nw5jh/…'` token, and `npm run csp:check` exits 0 on it. The gstatic source is path-pinned to `https://www.gstatic.com/firebasejs/10.14.1/`, the version all three SDK tags load (`index.html:270-272`). There is no `'unsafe-inline'`, `'unsafe-eval'`, `'self'`, wildcard or scheme in `script-src`, so injected inline script and handlers are blocked. Live bytes pass `--check` with the same policy. |
| 2 | `connect-src` covers Firebase's runtime endpoints and the weather API hosts, from a hand inventory rather than a grep, and `style-src` keeps `'unsafe-inline'` as a documented, deliberate decision (CSP-03, CSP-04) | VERIFIED | `connect-src` = identitytoolkit, securetoken and firestore on `googleapis.com`, plus `api.open-meteo.com` and `geocoding-api.open-meteo.com`. I traced both `fetch` sites (`index.html:2911` builds an `api.open-meteo.com` URL, `:2930` hits geocoding-api); both hosts are in the policy. `frame-src` is pinned to `https://ppl-tracker-a1d87.firebaseapp.com/__/auth/` (= `firebaseConfig.authDomain`). `style-src 'self' 'unsafe-inline'` is documented in CLAUDE.md (the CSP bullet, "on purpose … (CSP-04)") and in the test block comment. |
| 3 | Loading the app against a local static file server shows zero CSP violations in DevTools before the policy is pushed (CSP-05) | VERIFIED | Automated leg: 07-07 Task 1 recorded four headless-Chrome probes of the pushed tip (desktop and Android, normal and split delivery), each with `violations: []`, `security: []` and `exceptions: []`, a booted app, one Firebase app and a ready SW. Human leg: Ian pushed and merged only after the Task 2 DevTools instruction ("push only if no CSP line appeared"), and his 2026-10-09 report confirms a clean live console on a normal and a 3G-throttled reload. The 07-05 blind spot (split delivery) is now part of the documented probe (`07-RESEARCH.md:489`). |
| 4 | After the policy is live, cloud sync is confirmed working by an actual sync check, never assumed (CSP-06) | VERIFIED (human) | Ian's UAT report, 2026-10-09, on main `f71c6e4` with the CSP live: PC and phone both showed This version ending `f71c6e4`. After a sign-out and sign-in on the PC, a test weigh-in appeared on the phone and its deletion propagated. That round trip exercises identitytoolkit, securetoken and Firestore under the live policy, which also closes the `verification: backstop` truths in 07-04, 07-06 and 07-07 ("signed-in calls … succeed under the policy"). |
| 5 | `CLAUDE.md` documents the manual hash-regeneration command (CSP-07) | VERIFIED | `CLAUDE.md:18-19` (Before every push: "run `npm run csp:hash` first") and the `- **Content-Security-Policy:**` Conventions bullet at `:89-103`, which also lists the re-probe triggers (an SDK bump, a new fetch host, reCAPTCHA Enterprise or Google sign-in). `package.json` defines `csp:hash` = `node scripts/csp-hash.js`, and the test `CSP-07: CLAUDE.md names the regeneration command package.json defines` ties them together. |

**Score:** 5/5 truths verified (0 present, behavior-unverified)

### Plan-level must-haves (spot-checked against code)

| Plan | Must-have | Status | Evidence |
|------|-----------|--------|----------|
| 07-01 | Stamp lives in `<meta name="ppl-build">`, `__BUILD_STAMP__` appears once and never inside the inline script; `BUILD` reads the meta | VERIFIED | `grep -c __BUILD_STAMP__ index.html` = 1 (line 11), 0 inside the `<script>` block; `index.html:490` reads `querySelector('meta[name="ppl-build"]')`; deploy sed targets only `content="__BUILD_STAMP__"`; `test/app.test.js:3288 function deployStamp` replays it |
| 07-02 | Stamp move shipped alone, merge commit | VERIFIED | `58d8988` = merge of PR #10 (two parents) |
| 07-03 | `inlineScriptHash()` / `readPolicy()`, CRLF-normalised, refuses ambiguous input, pinned to Chrome's own vector | VERIFIED | `scripts/csp-hash.js` (substantive, 96 lines, no dependency); `test/app.test.js:16` requires it; `:3421` asserts `sha256-FkXmCGIFCB9jt8LEY2DLQI+fJjqrioS0k5jyDB0+5gY=` |
| 07-04 / 07-06 | Deploy job runs `--check` after stamping and before upload, never computes a hash | VERIFIED | `.github/workflows/deploy.yml`: Stamp build → Use Node → `node scripts/csp-hash.js --check` → Configure Pages → upload; deploy run 37932056099 had this step green (07-07-SUMMARY) |
| 07-06 | Manifest link carries no href; MANIFEST checks refuse it back; CSP_SHA2 patch-identical to ebc5723 | VERIFIED | `index.html:12` `<link rel="manifest" id="manifest-placeholder" />`; MANIFEST block at `test/app.test.js:3366-3383`; `git patch-id --stable` = `299764c8…` for both `ebc5723` and `643c628` (re-run by me) |
| 07-07 | Re-ship merged with a merge commit; live bytes pass `--check` | VERIFIED | `f71c6e4` parents `a122a2e`, `bf0bc94`; my own live fetch passes `--check` and matches HEAD byte-for-byte with the stamp undone |
| 07-05 | Go-live | FAILED in-phase, CLOSED | Live `manifest-src` violation; reverted as `a122a2e`; root cause fixed by `cbf17b5` and re-shipped by `643c628` → `f71c6e4`. Its must-haves are superseded by 07-07's, which hold. |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `index.html` | CSP meta after `<meta charset>`; ppl-build meta; manifest link without href | VERIFIED | Lines 4, 5, 11, 12 |
| `scripts/csp-hash.js` | `inlineScriptHash`, `readPolicy`, CLI `[--check] [file]` | VERIFIED | Exports both; CLI exits 0 on the repo and the live file |
| `package.json` | `csp:hash`, `csp:check` | VERIFIED | Both present, no dependencies |
| `test/app.test.js` | Build stamp, MANIFEST, CSP hash tool, and CSP (CSP-01..CSP-07) blocks | VERIFIED | Lines 3304, 3366, 3393, 3580; 18 `ok(...)` checks in the CSP block |
| `.github/workflows/deploy.yml` | setup-node plus `--check` between Stamp build and Configure Pages | VERIFIED | Present, in that order |
| `CLAUDE.md` | Before-every-push line plus CSP Conventions bullet | VERIFIED | Lines 18-19, 89-103 |
| `07-RESEARCH.md` | Hardened CSP-05 probe (`SLOW_MS`) | VERIFIED | Line 489 onward |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| CSP meta `script-src` sha256 | `inlineScriptHash()` | suite check + `csp:check` + deploy `--check` | WIRED (all three green) |
| CSP meta gstatic path | SDK `<script src>` tags | CSP-02 version-equality check | WIRED (10.14.1 = 10.14.1) |
| CSP meta `frame-src` | `firebaseConfig.authDomain` | CSP-03 frame-src check | WIRED |
| deploy `--check` step | stamped published `index.html` | runs after Stamp build, before upload | WIRED |
| manifest `<link>` (no href) | inline script `createObjectURL` assignment (`index.html:308`) | link id `manifest-placeholder` | WIRED (MANIFEST label B boots and reads a `blob:` href) |
| `test/app.test.js deployStamp()` | `deploy.yml` sed | replays the workflow's own sed | WIRED |

### Data-Flow Trace (Level 4)

Not applicable. The phase adds a policy and tooling, not rendered data. The one rendered value it
touches, `BUILD` → Settings → This version, reads from the stamped meta, and the live probe in 07-07
and Ian's UAT both showed `… · f71c6e4`.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full suite green (run once) | `npm test` | `928 passed, 0 failed, 2 skipped` | PASS |
| Committed hash matches the inline script | `npm run csp:check` | `CSP hash OK sha256-Nw5jh/JeJpDSYItCr6FJJ52mvE7ySXo1646f8nZCpkU=` | PASS |
| Live page carries the same policy and a valid hash | `curl` live `index.html` → `node scripts/csp-hash.js --check live.html`; `readPolicy` equality | exit 0; `policy equal: true`; unstamped live == HEAD `index.html` | PASS |
| Re-ship is the red-proven patch | `git show {ebc5723,643c628} \| git patch-id --stable` | both `299764c8e6b68a1b3782de405e69210c4010b70f` | PASS |
| Live deploy is this code | `git rev-parse origin/main`; `git diff f71c6e4 HEAD -- . ':!.planning'` | `f71c6e4…`; empty | PASS |

### Probe Execution

No `scripts/*/tests/probe-*.sh` exist in this repo. The phase's headless-Chrome probe is a
scratchpad recreation from `07-RESEARCH.md` that is deliberately never committed. I did not re-run it,
because it starts a local server and Chrome, which this verification must not do. Its role is covered
instead by the live-byte checks above and by Ian's live DevTools and sync UAT.

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|----------------|-------------|--------|----------|
| CSP-01 | 07-01, 07-03, 07-04, 07-06 | Meta CSP with hash-based `script-src` | SATISFIED | Truth 1 |
| CSP-02 | 07-04, 07-06 | gstatic allow-listed for the three SDK scripts | SATISFIED | Truth 1 (path-pinned to `firebasejs/10.14.1/`) |
| CSP-03 | 07-04, 07-06 | `connect-src` hand inventory | SATISFIED | Truth 2 |
| CSP-04 | 07-04, 07-06 | `style-src 'unsafe-inline'` documented | SATISFIED | Truth 2 |
| CSP-05 | 07-04, 07-05, 07-06, 07-07 | Local DevTools pass before push | SATISFIED | Truth 3 |
| CSP-06 | 07-01, 07-02, 07-05, 07-07 | Sync confirmed after go-live | SATISFIED (human) | Truth 4; ticked in REQUIREMENTS.md by this verification with the 2026-10-09 evidence note |
| CSP-07 | 07-03, 07-04, 07-06 | Hash command documented in CLAUDE.md | SATISFIED | Truth 5 |

All seven IDs from the plans' `requirements:` fields appear in REQUIREMENTS.md and map to Phase 7, and
REQUIREMENTS.md maps no other ID to Phase 7, so nothing is orphaned. This verification also set the
traceability row `CSP-01 … CSP-07` to Complete, since all seven are now ticked.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (phase diff `a122a2e..HEAD`, `scripts/csp-hash.js`, `deploy.yml`) | — | TBD / FIXME / XXX / TODO / HACK | none found | — |
| `index.html` | 12 | `<link rel="manifest">` without `href` (non-conforming HTML) | Info | A deliberate 07-06 trade-off that keeps the hashed script byte-identical (07-REVIEW IN-05) |

### Code Review Follow-ups (advisory, not gaps)

07-REVIEW.md: 0 critical, 3 warnings, 6 info. I checked each warning against the must-haves. None
defeats a requirement or a stated must-have: the shipped policy has none of the widenings described,
and every regression the 07-04 must-have names ("the check placed before the stamp", "a forbidden
script-src token", "a repeated directive", …) is still caught. They are weaknesses in future-proofing
the guards, and they are recorded as follow-ups in the frontmatter.

- **WR-01:** the CSP checks never cap allowances, so an extra host or `script-src-attr 'unsafe-inline'`
  stays green. This contradicts the test block's own comment ("a widened one must not [stay green]").
  It is the highest-value follow-up, because `script-src-attr 'unsafe-inline'` would quietly re-open
  the `esc()` injection hole the policy closes.
- **WR-02:** a second CSP meta that is single-quoted or unquoted goes undetected, and it could silently
  kill sync.
- **WR-03:** the deploy-check ordering test matches text, so a commented-out or `if: false` step
  passes.
- **IN-04:** the Google-internal auth-loader path can move without a deploy. Add it to the CLAUDE.md
  re-probe triggers.

### Human Verification Required

None outstanding. The one human item for this phase, the CSP-06 signed-in round trip on Ian's PC and
phone (07-07's end-of-phase UAT), was performed and reported passing by Ian on 2026-10-09.

### Gaps Summary

There are no gaps. The policy is in the repo, it is pinned by the suite and by the deploy's `--check`
step, and it is live on `f71c6e4`. The published bytes are identical to HEAD apart from the stamp, and
they pass the hash check. Sync was proven by a real cross-device round trip under the live policy. The
07-05 failure was closed inside the phase: the root cause was fixed in `cbf17b5`, the red-proven patch
was re-applied unchanged in `643c628`, and the re-ship went live clean. The three review warnings are
guard-hardening follow-ups for a later phase.

---

_Verified: 2026-10-09T17:21:00Z_
_Verifier: Claude (gsd-verifier)_
