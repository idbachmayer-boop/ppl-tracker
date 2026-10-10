---
phase: 07-content-security-policy
plan: 01
subsystem: deploy / build stamp
status: complete
tags: [csp, deploy, build-stamp, tests, D-08, D-09]
requires: []
provides:
  - "<meta name=\"ppl-build\"> in index.html <head>, read by BUILD at boot"
  - "deployStamp(html, iso, sha7) in test/app.test.js (replays the deploy job's own sed)"
  - "meta-aware doc.querySelector in test/harness.js"
  - "deployable-unit sha 6f5365419670a8c0479e40e65ff3ca0c2f924e2c for 07-02"
affects: [07-02, 07-04, 07-05]
tech-stack:
  added: []
  patterns:
    - "Deploy-time data lives in a <head> meta attribute, never inside the hashed inline script"
    - "Tests replay the workflow's own shell line instead of mirroring it by hand"
key-files:
  created: []
  modified:
    - index.html
    - test/harness.js
    - test/app.test.js
    - .github/workflows/deploy.yml
decisions:
  - "The build stamp lives in <meta name=\"ppl-build\" content=\"...\"> right after theme-color; BUILD reads it with document.querySelector at module-eval time (D-08)"
  - "deployStamp() reads the sed out of deploy.yml and throws on anything it cannot model (0 or 2+ seds, leftover $ or backslash, search text missing or doubled), so a workflow edit fails the suite instead of drifting"
  - "Harness meta lookup uses hasOwnProperty rather than `in`, so a selector like meta[name=\"constructor\"] returns null as the real DOM would"
metrics:
  duration: "~5 min"
  completed: 2026-10-02
actuals:
  tokens: 2830
  tasks: 2
  commits: 2
---

# Phase 7 Plan 01: Build stamp moves into a ppl-build meta tag Summary

The deploy job now stamps `<meta name="ppl-build">` in `<head>`, not a string inside the inline script. `BUILD` reads the meta at boot. Three new guards replay the workflow's own sed and fail if the stamp could ever touch the inline script's bytes again, and each guard was shown to fail against its own regression.

## What changed

- **index.html**: added `<meta name="ppl-build" content="__BUILD_STAMP__" />` at line 10, after `theme-color` and before the manifest link. `const BUILD = (document.querySelector('meta[name="ppl-build"]') || {}).content || '';` replaces the literal, and its comment now explains why the stamp sits outside the script. `buildLabel()` and the Settings consumer (`esc(buildLabel(BUILD))`) are unchanged.
- **test/harness.js**: `loadApp()` builds a `metas` map from the loaded file's `<meta name content>` tags. `doc.querySelector('meta[name="X"]')` returns `Object.assign(el(), { content })`, or `null` when there is no such meta. Every other selector still gets `el()`.
- **.github/workflows/deploy.yml**: the Stamp build step keeps its three guards (count is 1, one sed, then a grep for the stamped form) and now targets `content="__BUILD_STAMP__"` in the meta. No step was added.
- **test/app.test.js**: added a top-level `deployStamp(html, iso, sha7)`. The exactly-once check now looks for the meta inside `<head>`, and the stamped-copy boot uses `deployStamp`. Three D-08 guards were added (Task 2).

## Suite

- BASE (before Task 1): `893 passed, 0 failed, 2 skipped`
- After Task 1: `893 passed, 0 failed, 2 skipped` (checks retargeted, none added)
- Final: `896 passed, 0 failed, 2 skipped` (BASE + 3)

## Tracer gate (Task 1): headless Chrome, automated, PASSED

S1 was stamped by running the three `run:` lines copied out of deploy.yml in Git Bash, with `GITHUB_SHA=e50bb0b` followed by 33 zeros. The step's own `test` and `grep -q` passed (`STAMP_STEP_OK`). After stamping, `diff S0 S1` differs only on line 10, the meta, so the inline script is untouched.

S1 (stamped), `node probe.js S1 18741 0 12000 "buildLabel(BUILD)"`:
```json
{"facts":{"booted":true,"firebaseApps":1,"sw":"{\"supported\":true,\"ready\":false,\"error\":\"Failed to register a ServiceWorker for scope ('http://127.0.0.1:18741/') with script ('http://127.0.0.1:18741/sw.js'): Operation has been aborted\"}","custom":"Updated Oct 2, 2026, 7:22 AM · e50bb0b"},"exceptions":[]}
```

S0 (unstamped), `node probe.js S0 18743 0 12000 "buildLabel(BUILD)"`:
```json
{"facts":{"booted":true,"firebaseApps":1,"sw":"{\"supported\":true,\"ready\":false,\"error\":\"Failed to register a ServiceWorker for scope ('http://127.0.0.1:18743/') with script ('http://127.0.0.1:18743/sw.js'): Operation has been aborted\"}","custom":"Local copy, not a deployed build"}, "exceptions":[]}
```

Both copies booted with no exceptions. S1 reads `Updated … · e50bb0b` and S0 reads the local label. The service-worker registration error comes from the environment and is not a regression: the unmodified pre-phase `index.html` (`git show 7031821:index.html`, served the same way on port 18745) gives the identical `Operation has been aborted` error. It is not one of this plan's pass criteria. 07-05's probe needs `sw.ready: true`, so that run should check the scratch path or profile directory first.

## Red proof (Task 2): scratch clone at 6f53654, baseline 0 FAIL (`896 passed, 0 failed, 2 skipped`)

`<pre>` = `703182119310ae120774f6d3110671abc596b98c` (the parent of Task 1's commit).

**M1**: a `// __BUILD_STAMP__` line added as the first line of the inline script
```
  FAIL  BUILD: the stamp marker appears exactly once, as the ppl-build meta's content inside <head>  → {"hits":2}
  FAIL  BUILD: no inline script contains the stamp marker, so the deploy rewrite cannot reach hashed bytes (D-08)  → {"scripts":1}
894 passed, 2 failed, 2 skipped
```

**M2**: the sed's search part changed to the pre-phase `'__BUILD_STAMP__'`
```
  FAIL  BUILD: the deploy job holds exactly one stamp sed, and it rewrites the ppl-build meta  → "stamp sed search text \"'__BUILD_STAMP__'\" occurs 0 times, expected 1"
  FAIL  BUILD: the deploy stamp leaves the inline script byte-identical (D-08)  → "stamp sed search text \"'__BUILD_STAMP__'\" occurs 0 times, expected 1"
  FAIL  BUILD: a stamped copy boots and Settings shows its version  → "stamp sed search text \"'__BUILD_STAMP__'\" occurs 0 times, expected 1"
893 passed, 3 failed, 2 skipped
```

**M3**: the sed line duplicated in deploy.yml
```
  FAIL  BUILD: the deploy job holds exactly one stamp sed, and it rewrites the ppl-build meta  → "expected one stamp sed in the deploy job, found 2"
  FAIL  BUILD: the deploy stamp leaves the inline script byte-identical (D-08)  → "expected one stamp sed in the deploy job, found 2"
  FAIL  BUILD: a stamped copy boots and Settings shows its version  → "expected one stamp sed in the deploy job, found 2"
893 passed, 3 failed, 2 skipped
```

**M4**, the landmine itself: `git checkout <pre> -- index.html .github/workflows/deploy.yml`
```
  FAIL  BUILD: the stamp marker appears exactly once, as the ppl-build meta's content inside <head>  → {"hits":1}
  FAIL  BUILD: no inline script contains the stamp marker, so the deploy rewrite cannot reach hashed bytes (D-08)  → {"scripts":1}
  FAIL  BUILD: the deploy job holds exactly one stamp sed, and it rewrites the ppl-build meta  → {"stampedMetaAt":-1}
  FAIL  BUILD: the deploy stamp leaves the inline script byte-identical (D-08)  → "an inline script changed"
892 passed, 4 failed, 2 skipped
  PASS  BUILD: an unstamped copy says it is local, never a deploy
  PASS  BUILD: a stamped copy boots and Settings shows its version
```

Every mutation failed exactly the set the plan predicted, so no check needed fixing. In M4 the old form still boots and shows its stamp, which is why the landmine was invisible before. Only the new D-08 guards catch it.

## Deployable unit (D-09)

`6f5365419670a8c0479e40e65ff3ca0c2f924e2c`

At this sha, `git show HEAD:index.html | grep -c 'http-equiv="Content-Security-Policy"'` prints `0` and `git ls-tree -r --name-only HEAD | grep -c '^scripts/'` prints `0`, so the unit has no CSP meta and no `scripts/` directory. The stamp move ships alone. Shipping and confirming it on both devices is Ian's step, in 07-02.

## TDD Gate Compliance

Task 2 is `tdd="true"`, but what it guards was already built in Task 1, so its three checks passed the first time they ran. The plan expects this ("PASS on the branch"). The RED evidence comes from the M1-M4 mutations above, each run in a scratch clone after the `test(07-01)` commit. Gate sequence in git: `feat(07-01)` 1653c49 and then `test(07-01)` 6f53654. The plan fixed that order: Task 1 is a tracer that has to ship working code before the guards exist.

## Deviations from Plan

**1. [Rule 1 - Bug] The harness meta lookup uses `hasOwnProperty`, not `in`**
- **Found during:** Task 1, step 4
- **Issue:** `q[1] in metas` is true for inherited keys such as `constructor`, so `meta[name="constructor"]` would have returned an element where the real DOM returns `null`.
- **Fix:** `Object.prototype.hasOwnProperty.call(metas, q[1])`. Behaviour for every real meta name is the same.
- **Files modified:** test/harness.js
- **Commit:** 1653c49

**2. Wording only.** The Build stamp block's header comment said the placeholder lives "in the BUILD literal". It now says "in the ppl-build meta", because the old comment would have described the code wrongly.

No other deviations. CI computes no hash, there is no second inline script, nothing calls `save()` or `saveLocal()`, and no requirement was ticked (CSP-01 and CSP-06 close in later plans).

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: index.html (ppl-build meta at line 10, before `</head>` at line 272), test/harness.js, test/app.test.js, .github/workflows/deploy.yml
- FOUND: 1653c49 feat(07-01): the build stamp moves into a ppl-build meta tag (D-08)
- FOUND: 6f53654 test(07-01): the deploy stamp can never reach the inline script again (D-08)
- `git show --stat` of 1653c49 lists exactly the four planned files, and of 6f53654 only test/app.test.js
