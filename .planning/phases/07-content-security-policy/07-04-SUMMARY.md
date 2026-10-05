---
phase: 07-content-security-policy
plan: 04
subsystem: security / Content-Security-Policy
status: complete
tags: [csp, xss, deploy, tests, D-01, D-02, D-06, D-07, D-10]
requires:
  - phase: 07-01
    provides: "<meta name=\"ppl-build\"> stamp outside the inline script; deployStamp() replay helper"
  - phase: 07-03
    provides: "scripts/csp-hash.js (inlineScriptHash, readPolicy), npm run csp:hash / csp:check"
provides:
  - "The CSP meta in index.html, directly after <meta charset>"
  - "18 property checks in the `Content Security Policy (CSP-01..CSP-07)` block of test/app.test.js"
  - "The deploy job's `Use Node` and `node scripts/csp-hash.js --check` steps, between Stamp build and Configure Pages"
  - "CLAUDE.md: npm run csp:hash under Before every push, and a Content-Security-Policy Conventions bullet"
  - "CSP_SHA ebc57234a496f73df95e828a57412c44ddb52031, the one revertable commit (D-06)"
affects: [07-05]
actuals:
  tokens: 3725
  tasks: 2
  commits: 1
tech-stack:
  added: []
  patterns:
    - "Policy parsed into directives and asserted as properties, never compared as wording"
    - "Origin-drift check: every https origin the inline script names must be in connect-src or on a named navigation-only list"
key-files:
  created: []
  modified:
    - index.html
    - test/app.test.js
    - .github/workflows/deploy.yml
    - CLAUDE.md
key-decisions:
  - "The CSP ships exactly as RESEARCH's verified policy: hash-only script-src plus the SDK version path and the two mobile auth-loader paths; frame-src only the auth handler on authDomain"
  - "The placement check treats an absent <script>/<style>/<link> as nothing preceding the meta, so removing the manifest link later cannot fail it spuriously"
  - "The headless-Chrome service-worker abort is Windows path length in the Chrome profile, not CSP: a profile root of 212-214 characters aborts registration, a short one registers. Probes must put the profile on a short path"
requirements-completed: [CSP-01, CSP-02, CSP-03, CSP-04, CSP-07]
metrics:
  duration: "~12 min"
  completed: 2026-10-05
---

# Phase 7 Plan 04: Hash-based Content-Security-Policy Summary

One commit, `ebc5723`, turns the CSP on. It adds the `<meta>` policy built up from `default-src 'none'`, 18 checks on the parsed policy, a deploy step that checks the published hash without ever computing one, and the CLAUDE.md note. Chrome loads the working tree and a deploy-stamped copy with zero violations on desktop and Android user agents. Every guard fails against its own regression, and reverting the commit leaves the suite green at the 07-03 count. Nothing was pushed: shipping is 07-05.

## The policy (index.html line 5)

```
default-src 'none';
script-src 'sha256-Nw5jh/JeJpDSYItCr6FJJ52mvE7ySXo1646f8nZCpkU=' https://www.gstatic.com/firebasejs/10.14.1/ https://apis.google.com/js/api.js https://apis.google.com/_/scs/abc-static/;
connect-src https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://api.open-meteo.com https://geocoding-api.open-meteo.com;
frame-src https://ppl-tracker-a1d87.firebaseapp.com/__/auth/;
img-src 'self' data:; style-src 'self' 'unsafe-inline'; manifest-src blob:; worker-src 'self';
object-src 'none'; base-uri 'none'; form-action 'none'
```

`npm run csp:hash` printed `updated sha256-Nw5jh/JeJpDSYItCr6FJJ52mvE7ySXo1646f8nZCpkU=` and `npm run csp:check` printed `CSP hash OK sha256-Nw5jh/…` (exit 0).

## Suite

- BASE4 (before any change): `908 passed, 0 failed, 2 skipped`. `npm run csp:check` exited 1 (`no CSP <meta …>`), as expected.
- RED (checks written, no policy yet): `909 passed, 17 failed, 2 skipped`. All 17 FAIL lines were CSP checks. The 18th, the ignored-directive check, passed vacuously because there was no policy yet, which the plan predicted. Not committed.
- Final: `926 passed, 0 failed, 2 skipped` = BASE4 + 18. Each of the 18 labels prints exactly one `PASS` line (counted in the block: 18 PASS, 0 duplicates).

Acceptance greps: the CSP meta count is `1` and it is line 5. `scripts/csp-hash.js --check` appears `1` time in deploy.yml and `actions/setup-node@v4` appears `2` times. `npm run csp:hash` appears `2` times in CLAUDE.md, and `^- **Content-Security-Policy:**` `1` time.

## Tracer gate (Task 1): headless Chrome, automated, PASSED

The probe is RESEARCH's "CSP-05 probe" copied verbatim to `probe.js`. `probe-prof.js` is the same file with one change: the profile root comes from `PROFILE_ROOT` when that is set (see the next section). The site directory W held copies of the working tree's `index.html` and `sw.js`.

Desktop, `node probe-prof.js W 18761 0 12000`:
```json
{"violations":[],"security":[],"exceptions":[],
 "hosts":{"http://127.0.0.1:18761/index.html":1,"https://www.gstatic.com/firebasejs/10.14.1":3,"blob:":1,"http://127.0.0.1:18761/favicon.ico":1},
 "facts":{"booted":true,"firebaseApps":1,"sw":"{\"supported\":true,\"ready\":true,\"error\":null}"}}
```

Android, `node probe-prof.js W 18763 1 15000`:
```json
{"violations":[],"security":[],"exceptions":[],
 "hosts":{"http://127.0.0.1:18763/index.html":1,"https://www.gstatic.com/firebasejs/10.14.1":3,"blob:":1,"http://127.0.0.1:18763/favicon.ico":1,
          "https://apis.google.com/js/api.js":1,"https://apis.google.com/_/scs":1,"https://ppl-tracker-a1d87.firebaseapp.com/__/auth":1},
 "facts":{"booted":true,"firebaseApps":1,"sw":"{\"supported\":true,\"ready\":true,\"error\":null}"}}
```

Every host is on the expected list: 127.0.0.1, www.gstatic.com, blob:, and on Android apis.google.com and the authDomain. `sw.js` does not show up in `hosts` because the worker's script request belongs to the worker target, not the page target the probe listens to.

## The service-worker abort: cause found (Windows path length, not CSP)

The verbatim probe, run from this session's scratchpad, showed the same failure 07-01 saw: `"ready":false, "error":"Failed to register a ServiceWorker … Operation has been aborted"`. That run also had `violations: []` and `security: []`, and `sw.js` was never requested, so registration died before any network or policy step.

The only variable I changed was the Chrome `--user-data-dir`:

| Profile root (length incl. `prof-<port>-<ms>`) | Location | Result |
|---|---|---|
| `…/scratchpad/p0704-probe-1791192844/prof-…` (212 chars) | inside the scratchpad | `ready:false`, "Operation has been aborted" |
| `C:/Users/idbac/AppData/Local/Temp/p7sw/prof-…` (~60 chars) | outside the scratchpad, short | `ready:true`, `error:null` |
| `C:/Users/idbac/AppData/Local/Temp/p7sw/LLLL…(150 L)/prof-…` (214 chars) | outside the scratchpad, long | `ready:false`, "Operation has been aborted" |

So the cause is the profile path's length, not where it lives, and not the CSP. Chrome's Service Worker storage nests several levels deep inside the profile and runs past Windows' 260-character MAX_PATH. This worktree's scratchpad path alone is about 150 characters. RESEARCH most likely got `ready:true` because it ran from a shorter path.

**For 07-05:** pass a short `--user-data-dir`, for example under `C:/Users/idbac/AppData/Local/Temp/p7sw/`. `probe-prof.js` already does this with `PROFILE_ROOT`. With a short profile, `sw.ready: true` is reachable under the policy.

## Red proof (Task 2): scratch clone at ebc5723

Clone `p0704-mut-1791193007`, baseline `926 passed, 0 failed, 2 skipped` (0 FAIL lines). `PRE` = `703182119310ae120774f6d3110671abc596b98c`, the parent of `feat(07-01)`.

**M1, stale hash** (one extra newline before the inline script's `</script>`): `924 passed, 2 failed`
```
  FAIL  CSP-01: the policy's script hash matches the inline script (stale? run npm run csp:hash)  → {"policy":["'sha256-Nw5jh/…'"],"script":"sha256-xAwzoGujYuC7by2hn5+RAicmAaLYwfPW0oEvfqGq7fs=","fix":"npm run csp:hash"}
  FAIL  CSP-01: a deploy-stamped copy keeps the policy and its hash (D-08)  → {"stampedHash":"sha256-xAwzoGuj…","policy":["'sha256-Nw5jh/…'"],"samePolicy":true}
```
After that, `node scripts/csp-hash.js --check` exited 1 with `CSP hash stale: policy has 'sha256-Nw5jh/…', the inline script is 'sha256-xAwzoGuj…'. Run: npm run csp:hash`. Then `node scripts/csp-hash.js` printed `updated sha256-xAwzoGuj…`, and the rerun gave `926 passed, 0 failed`. The regeneration loop works end to end.

**M2, one SDK tag bumped** (auth to 10.14.2): `924 passed, 2 failed`
```
  FAIL  CSP-02: script-src allows the Firebase SDK only by the exact version path every SDK tag loads (D-07)  → {"policy":["https://www.gstatic.com/firebasejs/10.14.1/"],"tags":["10.14.1","10.14.2","10.14.1"]}
  FAIL  CSP-02: every external script the page loads is covered by script-src  → {"uncovered":[".../10.14.2/firebase-auth-compat.js"]}
```

**M3, every tag bumped, policy unchanged**: `924 passed, 2 failed`
```
  FAIL  CSP-02: script-src allows the Firebase SDK only by the exact version path every SDK tag loads (D-07)  → {"policy":[".../firebasejs/10.14.1/"],"tags":["10.14.2","10.14.2","10.14.2"]}
  FAIL  CSP-02: every external script the page loads is covered by script-src  → {"uncovered":[3 × .../10.14.2/…]}
```

**M4, bare gstatic host**: `924 passed, 2 failed`
```
  FAIL  CSP-02: script-src allows the Firebase SDK only by the exact version path every SDK tag loads (D-07)  → {"policy":["https://www.gstatic.com"],"tags":["10.14.1","10.14.1","10.14.1"]}
  FAIL  CSP-03: every URL source in script-src is path-restricted, and the mobile auth loader paths are allowed (D-10)  → {"unpathed":["https://www.gstatic.com"],"missing":[]}
```

**M5, a new fetch host** (`p7Probe` fetching `https://collector.example/x`, then rehashed): `925 passed, 1 failed`, the origin-drift check only
```
  FAIL  CSP-03: every https origin the inline script names is in connect-src, except the navigation-only search link  → {"drift":["https://collector.example"],…}
```

**M6, `'unsafe-inline'` in script-src**, and **M6b, `'strict-dynamic'`**: `925 passed, 1 failed` each
```
  FAIL  CSP: script-src has no unsafe keyword, no 'strict-dynamic', no 'self', no wildcard and no bare scheme  → ["'unsafe-inline'"]
  FAIL  CSP: script-src has no unsafe keyword, no 'strict-dynamic', no 'self', no wildcard and no bare scheme  → ["'strict-dynamic'"]
```

**M7, the check steps moved above Stamp build**: `925 passed, 1 failed`
```
  FAIL  CSP-01: the deploy job checks the published hash after stamping and before upload (D-04)  → {"sedAt":1551,"nodeAt":1260,"checkAt":1406,"uploadAt":1879}
```

**M8, the CSP meta moved to after the manifest link**: `925 passed, 1 failed`
```
  FAIL  CSP-01: the CSP meta sits in <head> before every <script>, <style> and <link>  → {"metaAt":482,"firstOf":[["<script",23258],["<style",1171],["<link",421]]}
```

**M9, authDomain drift** (`other-app.firebaseapp.com`, then rehashed): `925 passed, 1 failed`
```
  FAIL  CSP-03: frame-src allows only the auth handler path on firebaseConfig.authDomain (D-10)  → {"authDomain":"other-app.firebaseapp.com","frameSrc":["https://ppl-tracker-a1d87.firebaseapp.com/__/auth/"]}
```

**M10, the command left undocumented** (every `npm run csp:hash` in CLAUDE.md changed to `npm run hash`): `925 passed, 1 failed`
```
  FAIL  CSP-07: CLAUDE.md names the regeneration command package.json defines  → {"hashKey":"csp:hash"}
```

**M11, a repeated directive** (`; script-src 'none'` appended): `911 passed, 15 failed`. The parses check fails with `"repeated directive script-src"`. As the plan allowed, every other check that reads the policy fails with it, because the parse yields an empty policy. That covers the hash, stamped-copy, SDK-path, coverage, inventory, drift, frame-src, path-restricted, CSP-04, both forbidden-token checks, both D-02 checks and D-01.

**M12, the landmine** (ppl-build meta deleted, the pre-phase `const BUILD = '__BUILD_STAMP__';` and the pre-phase sed `sed -i "s/'__BUILD_STAMP__'/'$(date …) ${GITHUB_SHA::7}'/" index.html` restored, then rehashed): `921 passed, 5 failed`
```
  FAIL  BUILD: the stamp marker appears exactly once, as the ppl-build meta's content inside <head>  → {"hits":1}
  FAIL  BUILD: no inline script contains the stamp marker, so the deploy rewrite cannot reach hashed bytes (D-08)  → {"scripts":1}
  FAIL  BUILD: the deploy job holds exactly one stamp sed, and it rewrites the ppl-build meta  → {"stampedMetaAt":-1}
  FAIL  BUILD: the deploy stamp leaves the inline script byte-identical (D-08)  → "an inline script changed"
  FAIL  CSP-01: a deploy-stamped copy keeps the policy and its hash (D-08)  → {"stampedHash":"sha256-n3FHeAsu…","policy":["'sha256-1DMMyMtV…'"],"samePolicy":true}
```

Every mutation failed exactly the labels the plan named. No check needed strengthening.

## The stamped copy in Chrome (Task 2, step 2)

T held `git show HEAD:index.html` and `HEAD:sw.js`. The Stamp build `run:` block's three lines, copied out of deploy.yml, ran in Git Bash inside T with `GITHUB_SHA=e50bb0b` followed by 33 zeros (40 characters) and printed `STAMP_STEP_OK`. The diff against HEAD is line 11 only (`content="2026-10-05T09:38:59Z e50bb0b"`). Then `node scripts/csp-hash.js --check "$T/index.html"` printed `CSP hash OK sha256-Nw5jh/JeJpDSYItCr6FJJ52mvE7ySXo1646f8nZCpkU=` (exit 0). That is the deploy's new step, replayed.

Desktop, `node probe-prof.js T 18765 0 12000 "buildLabel(BUILD)"`:
```json
{"violations":[],"security":[],"exceptions":[],
 "hosts":{"http://127.0.0.1:18765/index.html":1,"https://www.gstatic.com/firebasejs/10.14.1":3,"blob:":1,"http://127.0.0.1:18765/favicon.ico":1},
 "facts":{"booted":true,"firebaseApps":1,"sw":"{\"supported\":true,\"ready\":true,\"error\":null}","custom":"Updated Oct 5, 2026, 4:38 AM · e50bb0b"}}
```

Android, `node probe-prof.js T 18767 1 15000 "buildLabel(BUILD)"`:
```json
{"violations":[],"security":[],"exceptions":[],
 "hosts":{"http://127.0.0.1:18767/index.html":1,"https://www.gstatic.com/firebasejs/10.14.1":3,"blob:":1,"http://127.0.0.1:18767/favicon.ico":1,
          "https://apis.google.com/js/api.js":1,"https://apis.google.com/_/scs":1,"https://ppl-tracker-a1d87.firebaseapp.com/__/auth":1},
 "facts":{"booted":true,"firebaseApps":1,"sw":"{\"supported\":true,\"ready\":true,\"error\":null}","custom":"Updated Oct 5, 2026, 4:38 AM · e50bb0b"}}
```

## Weather allowed, foreign host blocked (Task 2, step 3)

`node probe-prof.js T 18769 0 15000 "<three fetches>"`:
```json
{"violations":["connect-src https://example.com/"],
 "security":["Connecting to 'https://example.com/' violates the following Content Security Policy directive: \"connect-src https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://api.open-meteo.com https://geocoding-api.open-meteo.com\". The action has been blocked."],
 "exceptions":[],
 "hosts":{…,"https://api.open-meteo.com/v1/forecast":1,"https://geocoding-api.open-meteo.com/v1/search":1},
 "facts":{"booted":true,"firebaseApps":1,"sw":"{\"supported\":true,\"ready\":true,\"error\":null}","custom":"200,200,blocked"}}
```
Both weather hosts returned 200. Exactly one violation was logged, for connect-src and `https://example.com/`, and its single security-log line is that same block.

## Revert rehearsal (D-06)

In the fresh clone `p0704-revert-1791193208`, `git revert --no-edit ebc57234a496f73df95e828a57412c44ddb52031` gave `4 files changed, 200 deletions(-)`. After that:
- the suite ran `908 passed, 0 failed, 2 skipped` (exit 0), which equals BASE4;
- `grep -c 'http-equiv="Content-Security-Policy"' index.html` printed `0`;
- `grep -c "csp-hash" .github/workflows/deploy.yml` printed `0`;
- `grep -c '<meta name="ppl-build"' index.html` printed `2`, not the plan's `1`. The second hit is the inline script's own comment on line 481 ("The deploy job stamps <meta name="ppl-build"> in <head>"). The pre-CSP commit 8af735c gives the same `2`, and `grep -c '<meta name="ppl-build" content='` gives `1`. The meta tag is present once, so this is a loose grep in the plan, not a defect;
- `scripts/csp-hash.js` still exists.

## Revert target (D-06)

`ebc57234a496f73df95e828a57412c44ddb52031`

```
git revert --no-edit ebc57234a496f73df95e828a57412c44ddb52031
```

`git show --stat --format= ebc5723` lists exactly `.github/workflows/deploy.yml`, `CLAUDE.md`, `index.html` and `test/app.test.js`. Roll back by reverting this commit. Never revert the stamp move, and never hotfix forward when sync breaks.

## Deviations from Plan

**1. [Rule 3 - Blocking] The probe's Chrome profile goes on a short path**
- **Found during:** Task 1, step 7
- **Issue:** The verbatim probe puts the profile next to `probe.js`. Under this session's scratchpad, that path is 212 characters, and Chrome aborts service-worker registration, so `"ready":true` could never be met.
- **Fix:** `probe-prof.js` is the verbatim probe plus one change: the profile root comes from `PROFILE_ROOT`, here `C:/Users/idbac/AppData/Local/Temp/p7sw`. The diagnostic and control runs are in the table above. The profile directories stay there, uncleaned, per the never-`rm`-a-variable-path rule.
- **Files modified:** none in the repo (scratch only)

**2. The M12 driver's first two runs were wrong, and the recorded M12 is the third.** The first filtered out every line containing `<meta name="ppl-build"`. That deleted the inline script's comment opener on line 482, so the suite crashed at "it compiles". In the second run a shell sed swallowed a backslash, so the meta line was not deleted (`hits: 2`). The third run, from a standalone file, deletes only the head meta line (`meta lines left: 0`) and is the one recorded above. Neither bad run touched the repo.

**3. Plan line numbers are off by one.** The 07-01 meta pushed the SDK tags to lines 269-271 and authDomain to line 4286 before this plan started. The CSP meta then shifted everything down another line. No behaviour is affected.

No other deviations. Nothing calls `save()`, `saveLocal()` or `mergeDB()`. No inline style was edited. CI never computes a hash. Nothing was pushed, and no executor signed in to Firebase.

## Requirements

Ticked in REQUIREMENTS.md as the plan's output section directs: CSP-01, CSP-02, CSP-03, CSP-04 and CSP-07, each noted "(implemented in the repo by 07-04, `ebc5723`; live verification in 07-05)". CSP-05 (the human DevTools pass) and CSP-06 (the signed-in sync round trip) are left for 07-05, so the traceability row stays Pending, following Phase 6's REPO precedent.

## Known Stubs

None.

## Threat Flags

None. The commit adds no endpoint, auth path or data flow. It only narrows what the page may load and reach.

## Self-Check: PASSED

- FOUND: index.html, test/app.test.js, .github/workflows/deploy.yml, CLAUDE.md, this SUMMARY
- FOUND: ebc5723 feat(07-04): ship a hash-based Content-Security-Policy (exactly the four CSP files)
- `TZ=America/Chicago npm test`: 926 passed, 0 failed, 2 skipped; `npm run csp:check`: CSP hash OK
