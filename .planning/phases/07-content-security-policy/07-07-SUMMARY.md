---
phase: 07-content-security-policy
plan: 07
subsystem: deploy
tags: [csp, go-live, re-ship, gap-closure, csp-05, csp-06, d-06, d-09, d-10]
status: checkpoint
requires:
  - "07-06 MANIFEST_SHA cbf17b5529bc92cb86df7bfbd4c817bf8334595e (manifest link without href)"
  - "07-06 CSP_SHA2 643c62864201dee00ab9cf53b87d4470894e85ad (the revert target)"
  - "a122a2e (Ian's revert of ebc5723 on main), the build live at Task 1"
provides:
  - "Task 1 pre-flight: the reverted build is live, main has not moved, the re-ship commits are intact, four tip probes are GREEN at both delivery speeds, URL mode proven on the live site"
  - "exact commands for Ian's Task 2 (DevTools pass with a throttled reload, push, PR, merge, revert kept ready)"
affects:
  - "Task 3 (live proof after the deploy), then the end-of-phase CSP-06 UAT"
key-files:
  created:
    - .planning/phases/07-content-security-policy/07-07-SUMMARY.md
  modified: []
metrics:
  started: 2026-10-07T12:31:37Z
  task1_completed: 2026-10-07T12:34:02Z
---

# Phase 7 Plan 07: Re-ship the CSP with the manifest fix (paused at Task 2)

**Task 1 passed. Everything checkable before the push was checked at 2026-10-07T12:31Z to 12:34Z: the
live site still serves the reverted build, `main` is still `a122a2e` and an ancestor of HEAD, the
merge lands exactly HEAD's tree, CSP_SHA2 is ebc5723's patch on top of MANIFEST_SHA, the suite is
`928 passed, 0 failed, 2 skipped` (BASE6 + 20), and four fresh headless probes of the tip are GREEN
at normal speed and with split delivery, on desktop and Android. The plan now waits on Ian (Task 2).**

## Identifiers

| Item | Value |
|------|-------|
| CSP_SHA2 (revert target, 07-06 `Revert target (D-06)`) | `643c62864201dee00ab9cf53b87d4470894e85ad` |
| MANIFEST_SHA (stays on a revert) | `cbf17b5529bc92cb86df7bfbd4c817bf8334595e` |
| HEAD at check time | `809a7ee1c013fee7df62d94f8370d9acc1cc8bff` |
| MAIN0 (`git ls-remote origin refs/heads/main`) | `a122a2ea540aad306b156fb84f9b0c03778b915c` (unchanged since planner probe 2) |
| Branch | `claude/gifted-goodall-706ad7` |
| Remote branch head | `fb2f7185299bb3662367778dc215d7c5ef6dd1ac`, an ancestor of HEAD (17 commits behind at check time), so `git push origin HEAD` fast-forwards |
| Previous PR | #11, merged. The re-ship is a new PR from the same branch. |

The Task 1 record commit that follows adds only this SUMMARY, so every check below still holds for
the pushed tip.

## Task 1 results

### Precondition: the reverted build is still live

A cache-busted GET of `https://idbachmayer-boop.github.io/ppl-tracker/index.html` (`cb=1791376297`):

- stamped ppl-build meta count `1`, content `2026-10-06T11:53:14Z a122a2e`;
- `http-equiv="Content-Security-Policy"` count `0`;
- manifest link `<link rel="manifest" href="#" id="manifest-placeholder" />` (the fix is not live yet).

### Step 1: the re-ship commits are intact

| Check | Result |
|-------|--------|
| `git merge-base --is-ancestor CSP_SHA2 HEAD` | exit 0 |
| `git rev-parse CSP_SHA2^` | `cbf17b5529bc92cb86df7bfbd4c817bf8334595e` = MANIFEST_SHA |
| `git show --stat --format= CSP_SHA2` | `.github/workflows/deploy.yml`, `CLAUDE.md`, `index.html`, `test/app.test.js` (4 files, 200 insertions) |
| `git show --stat --format= MANIFEST_SHA` | `index.html`, `test/app.test.js` (2 files, 28 insertions, 1 deletion) |
| patch-id of `ebc5723^..ebc5723` | `299764c8e6b68a1b3782de405e69210c4010b70f` |
| patch-id of `CSP_SHA2^..CSP_SHA2` | `299764c8e6b68a1b3782de405e69210c4010b70f` (equal) |
| `git diff --name-only CSP_SHA2 HEAD` | `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`, `07-06-SUMMARY.md`, `07-RESEARCH.md`. Only `.planning/` paths. |

### Step 2: `main` has not moved

| Check | Result |
|-------|--------|
| `git cat-file -e "$MAIN0^{commit}"` | exit 0 |
| `git merge-base --is-ancestor "$MAIN0" HEAD` | exit 0 |
| `git merge-tree --write-tree "$MAIN0" HEAD` | exit 0, tree `6b61e902465039a287c9690139d9210754038b37` |
| `git rev-parse "HEAD^{tree}"` | `6b61e902465039a287c9690139d9210754038b37` (equal) |
| `git diff --name-only "$MAIN0" HEAD` | `.github/workflows/deploy.yml`, `CLAUDE.md`, `index.html`, `test/app.test.js`, plus `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`, `07-05-SUMMARY.md`, `07-06-PLAN.md`, `07-06-SUMMARY.md`, `07-07-PLAN.md`, `07-RESEARCH.md` |

The PR brings exactly the four CSP files and planning docs. Nothing was fetched or merged to make
this pass.

### Step 3: the push fast-forwards

`git ls-remote origin refs/heads/claude/gifted-goodall-706ad7` = `fb2f718…`, and
`git merge-base --is-ancestor fb2f718 HEAD` exits 0.

### Step 4: suite and hash check

```
TZ=America/Chicago npm test   ->  928 passed, 0 failed, 2 skipped   (exit 0; BASE6 908 + 20)
npm run csp:check             ->  CSP hash OK sha256-Nw5jh/JeJpDSYItCr6FJJ52mvE7ySXo1646f8nZCpkU=   (exit 0)
```

### Step 5: fresh probes of the tip

The probe was extracted from 07-RESEARCH.md `### CSP-05 probe, hardened after the 07-05 live failure
(use this one)` into a fresh scratch directory (`<scratchpad>/p0707/probe-1791376332`). A `cmp`
against RESEARCH lines 493-523 showed it byte-identical, and `node --check` passed. Site W holds
`git show HEAD:index.html` and `git show HEAD:sw.js` (`cmp` equal; index blob
`5640c0f1b174343f030e4721579e4a278e835ad5` = 07-06's G_BLOB). Each run used a fresh `PROFILE_ROOT`
under `C:/Users/idbac/AppData/Local/Temp/p7sw/t7-*`, and the expression was `buildLabel(BUILD)`.
A scratch evaluator applied the subsection's GREEN criteria to each output, and all four returned
`green: true` with no failed criterion and no unexpected host.

| Run | violations | security | exceptions | page URL count | manifest | booted / apps / SW ready |
|-----|-----------|----------|------------|----------------|----------|--------------------------|
| normal desktop (18881, 0, 12000) | `[]` | `[]` | `[]` | 1 | blob:, data, start_url only | true / 1 / true |
| normal Android (18883, 1, 15000) | `[]` | `[]` | `[]` | 1 | blob:, data, start_url only | true / 1 / true |
| split desktop (`SLOW_MS=3000`, 18885, 0, 15000) | `[]` | `[]` | `[]` | 1 | blob:, data, start_url only | true / 1 / true |
| split Android (`SLOW_MS=3000`, 18887, 1, 18000) | `[]` | `[]` | `[]` | 1 | blob:, data, start_url only | true / 1 / true |

```json
{"violations":[],"security":[],"exceptions":[],"hosts":{"http://127.0.0.1:18881/index.html":1,"https://www.gstatic.com/firebasejs/10.14.1":3,"blob:":1,"http://127.0.0.1:18881/favicon.ico":1},"chrome":"Chrome/154.0.8037.98","facts":{"booted":true,"firebaseApps":1,"sw":"{\"supported\":true,\"ready\":true,\"error\":null}","custom":"Local copy, not a deployed build"},"appManifest":{"url":"blob:http://127.0.0.1:18881/f3c753d2-2529-4f07-90a8-ce5414d36e2d","errors":[{"message":"property 'start_url' ignored, URL is invalid.","critical":0,"line":0,"column":0}],"hasData":true}}
{"violations":[],"security":[],"exceptions":[],"hosts":{"http://127.0.0.1:18883/index.html":1,"https://www.gstatic.com/firebasejs/10.14.1":3,"blob:":1,"http://127.0.0.1:18883/favicon.ico":1,"https://apis.google.com/js/api.js":1,"https://apis.google.com/_/scs":1,"https://ppl-tracker-a1d87.firebaseapp.com/__/auth":1},"chrome":"Chrome/154.0.8037.98","facts":{"booted":true,"firebaseApps":1,"sw":"{\"supported\":true,\"ready\":true,\"error\":null}","custom":"Local copy, not a deployed build"},"appManifest":{"url":"blob:http://127.0.0.1:18883/91a9d7c3-d408-4ab5-aa3f-42aeeebdb5b5","errors":[{"message":"property 'start_url' ignored, URL is invalid.","critical":0,"line":0,"column":0}],"hasData":true}}
{"violations":[],"security":[],"exceptions":[],"hosts":{"http://127.0.0.1:18885/index.html":1,"https://www.gstatic.com/firebasejs/10.14.1":3,"blob:":1,"http://127.0.0.1:18885/favicon.ico":1},"chrome":"Chrome/154.0.8037.98","facts":{"booted":true,"firebaseApps":1,"sw":"{\"supported\":true,\"ready\":true,\"error\":null}","custom":"Local copy, not a deployed build"},"appManifest":{"url":"blob:http://127.0.0.1:18885/72c45a8a-c327-4b01-99f8-165d5ab55685","errors":[{"message":"property 'start_url' ignored, URL is invalid.","critical":0,"line":0,"column":0}],"hasData":true}}
{"violations":[],"security":[],"exceptions":[],"hosts":{"http://127.0.0.1:18887/index.html":1,"https://www.gstatic.com/firebasejs/10.14.1":3,"blob:":1,"http://127.0.0.1:18887/favicon.ico":1,"https://apis.google.com/js/api.js":1,"https://apis.google.com/_/scs":1,"https://ppl-tracker-a1d87.firebaseapp.com/__/auth":1},"chrome":"Chrome/154.0.8037.98","facts":{"booted":true,"firebaseApps":1,"sw":"{\"supported\":true,\"ready\":true,\"error\":null}","custom":"Local copy, not a deployed build"},"appManifest":{"url":"blob:http://127.0.0.1:18887/a7da54d7-1b87-407c-96fe-29cf0f1d384b","errors":[{"message":"property 'start_url' ignored, URL is invalid.","critical":0,"line":0,"column":0}],"hasData":true}}
```

### Step 6: URL mode proven on the current (reverted) live site

`node probe.js https://idbachmayer-boop.github.io/ppl-tracker/ 18889 0 15000 "buildLabel(BUILD)"`,
signed out on a fresh profile (a read-only GET):

```json
{"violations":[],"security":[],"exceptions":[],"hosts":{"https://idbachmayer-boop.github.io/ppl-tracker/":2,"https://www.gstatic.com/firebasejs/10.14.1":3,"blob:":1,"https://idbachmayer-boop.github.io/favicon.ico":1},"chrome":"Chrome/154.0.8037.98","facts":{"booted":true,"firebaseApps":1,"sw":"{\"supported\":true,\"ready\":true,\"error\":null}","custom":"Updated Oct 6, 2026, 6:53 AM · a122a2e"},"appManifest":{"url":"blob:https://idbachmayer-boop.github.io/e1f9b796-b8b5-4917-ac46-6877c6d23425","errors":[{"message":"property 'start_url' ignored, URL is invalid.","critical":0,"line":0,"column":0}],"hasData":true}}
```

`violations: []`, `booted: true`, `"ready":true`, and `custom` ends `· a122a2e` = `${MAIN0:0:7}`. The
page URL counts 2 because the live build still has `href="#"`, so Chrome still fetches the page as a
manifest. With no policy live that fetch is not blocked and not a criterion here, but it shows the
probe sees the 07-05 race on the live site. After the deploy, Task 3 requires that count to be 1.

Port 18796 had no listener (`netstat`), `py` is Python 3.14.4, and `gh` is 2.98.0.

## Commands for Ian (Task 2)

Run every command from this checkout's root,
`C:\Users\idbac\Projects\ppl-tracker\.claude\worktrees\gifted-goodall-706ad7`.

1. Local server for the CSP-05 DevTools pass:
   ```
   py -m http.server 18796 --bind 127.0.0.1
   ```
   Then open `http://127.0.0.1:18796/index.html`. Use 18796, never 18790 (07-05's origin may hold the
   old build's service worker or cache).
2. Push (a fast-forward of `fb2f718`):
   ```
   git push origin HEAD
   ```
3. PR:
   ```
   gh pr create --base main --head claude/gifted-goodall-706ad7 --title "Phase 7: re-ship the Content-Security-Policy with the manifest fix (CSP-01..CSP-07)" --body "Re-ships the hash-based Content-Security-Policy that a122a2e reverted after 07-05 found a live manifest-src violation. It sits on top of the manifest fix cbf17b5529bc92cb86df7bfbd4c817bf8334595e, which removes the manifest link's href so Chrome no longer fetches the page itself as a manifest before the inline script supplies the blob. Revert target if anything breaks after deploy: 643c62864201dee00ab9cf53b87d4470894e85ad (git revert --no-edit 643c62864201dee00ab9cf53b87d4470894e85ad on main, then push). The manifest fix and the stamp move stay. Merge with a merge commit only, never squash or rebase."
   ```
4. Merge with **Create a merge commit** once CI's `test` job is green. Never squash, never rebase.
   (CLI equivalent: `gh pr merge <number> --merge`.) Then wait for the `deploy` job. Its step
   "Check the published script still matches its CSP hash" must pass.
5. Revert, kept ready. Run it only on a failure after the deploy, from an up-to-date `main`:
   ```
   git switch main
   git pull --ff-only
   git revert --no-edit 643c62864201dee00ab9cf53b87d4470894e85ad
   git push origin main
   ```
   Revert first and diagnose afterwards. Never hotfix forward. Never revert the manifest fix
   (`cbf17b5`) or the stamp move.

## Task 2: awaiting Ian

Pending. Ian replies `csp deployed`, `hold`, or `deploy check failed`.

## Task 3: not started

Runs only after `csp deployed`.

## Deviations from Plan

**1. [Rule 2 - Verification] Mechanical GREEN evaluation**
- The four tip-probe outputs were checked by a scratch evaluator (`<scratchpad>/p0707/green.js`)
  against every GREEN criterion of the hardened subsection, rather than by eye. It changes nothing in
  the repo.

## Known Stubs

None. This plan changes no repo files.
