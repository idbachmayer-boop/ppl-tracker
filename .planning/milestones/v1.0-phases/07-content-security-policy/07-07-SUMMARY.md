---
phase: 07-content-security-policy
plan: 07
subsystem: deploy
tags: [csp, go-live, re-ship, gap-closure, csp-05, csp-06, d-06, d-09, d-10]
status: complete
requires:
  - "07-06 MANIFEST_SHA cbf17b5529bc92cb86df7bfbd4c817bf8334595e (manifest link without href)"
  - "07-06 CSP_SHA2 643c62864201dee00ab9cf53b87d4470894e85ad (the revert target)"
  - "a122a2e (Ian's revert of ebc5723 on main), the build live at Task 1"
provides:
  - "the CSP live on main through merge commit f71c6e4 (PR #12), deployed with the --check step green"
  - "live proof: the published bytes pass --check, carry CSP_SHA2's exact policy and a manifest link without href, and headless Chrome on both live URLs is clean on desktop and Android with the page fetched once"
  - "the CSP-06 signed-in round trip, queued as the end-of-phase UAT item with its revert path"
affects:
  - "end-of-phase UAT (CSP-06 round trip on Ian's PC and phone)"
  - "phase-transition docs pass (CONCERNS.md CSP concern, vault changelog once CSP-06 passes)"
tech-stack:
  added: []
  patterns:
    - "live go-live proof: cache-busted GET + csp-hash --check + parsed-policy equality + URL-mode probes on both live URLs and both UAs"
key-files:
  created:
    - .planning/phases/07-content-security-policy/07-07-SUMMARY.md
  modified:
    - .planning/STATE.md
    - .planning/ROADMAP.md
    - .planning/REQUIREMENTS.md
key-decisions:
  - "Ian's push and merge after the DevTools pass is recorded as his implicit confirmation that the pass was clean, because Task 2 told him to push only if no CSP line appeared"
  - "CSP-05 is ticked on the live proof; CSP-06 stays open until Ian's signed-in round trip passes"
metrics:
  started: 2026-10-07T12:31:37Z
  task1_completed: 2026-10-07T12:34:02Z
  task2_resolved: 2026-10-09T12:44:43Z
  task3_started: 2026-10-09T12:45:55Z
  completed: 2026-10-09T12:52:00Z
  duration: "~9 min executor time (3 min Task 1, 6 min Task 3), spanning 2026-10-07..09 while waiting on Ian"
actuals:
  tokens: 9000     # chars/4 over this plan's realized diff (.planning docs only; no code changed)
  tasks: 3
  commits: 4
---

# Phase 7 Plan 07: Re-ship the CSP with the manifest fix Summary

**The hash-based Content-Security-Policy is live on the second attempt. PR #12 merged as merge commit
`f71c6e4` (parents `a122a2e`, `bf0bc94`), the deploy's `--check` step passed, the published page
passes `csp-hash --check` with exactly CSP_SHA2's policy and a manifest link with no href, and headless
Chrome on both live URLs, desktop and Android, shows zero violations, zero security entries, zero
exceptions, one page fetch, and a blob: manifest. The 07-05 manifest-src violation is gone in
production. CSP-06's signed-in round trip on Ian's devices is the one item left, queued as end-of-phase
UAT.**

No revert is needed. Every Task 3 criterion passed.

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
| Re-ship PR | #12, https://github.com/idbachmayer-boop/ppl-tracker/pull/12, merged 2026-10-09T12:44:43Z with a merge commit, head `bf0bc94fbdaee66d036a1f6922d8ac7d091aa607` |
| MAIN (after the merge, `git ls-remote origin refs/heads/main`) | `f71c6e4362803c8ebe4a6c939725bf94bcd6049b`, parents `a122a2ea540aad306b156fb84f9b0c03778b915c` and `bf0bc94fbdaee66d036a1f6922d8ac7d091aa607` |
| Deploy run | 37932056099 on `f71c6e4`: `test` success, `deploy` success, step "Check the published script still matches its CSP hash" success |

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

## Task 2: Ian's reply (verified by the orchestrator, 2026-10-09)

Ian merged PR #12 with a merge commit (`gh pr merge 12 --merge`), so the effective reply is
`csp deployed`. The orchestrator confirmed the deploy run on `f71c6e4`: `test` success, `deploy`
success, and the step "Check the published script still matches its CSP hash" success. This executor
re-checked all three through `gh pr view 12` and `gh run view 37932056099` (table above).

- **DevTools pass:** Ian did not report the result separately. Task 2 told him to push and merge only
  if no CSP line appeared in the normal, Android device-mode and throttled 3G reloads, and to reply
  `hold` otherwise. He pushed and merged, so this records his implicit confirmation that the pass was
  clean. The live probes below independently show what the throttled reload was meant to catch: the
  page fetched once and a blob: manifest.
- **Optional local sign-in:** not reported, so treated as not done. RESEARCH open question 2 stays
  open, and the CSP-06 round trip below includes a fresh sign-in on the PC, which covers the same
  ground (Assumption A3: reCAPTCHA Enterprise not enabled).

## Task 3 results: the live site (2026-10-09T12:45Z to 12:48Z)

All checks were read-only: `git ls-remote`, the GitHub API, cache-busted GETs, and signed-out headless
Chrome on fresh profiles. Nothing was fetched into the local repo, and nothing was pushed, merged or
reverted.

### Step 1: the merge commit

| Check | Result |
|-------|--------|
| MAIN = `git ls-remote origin refs/heads/main` | `f71c6e4362803c8ebe4a6c939725bf94bcd6049b` |
| `gh api .../commits/$MAIN --jq '.parents\|length'` | `2` (`a122a2e`, `bf0bc94`) |
| `gh api .../compare/$CSP_SHA2...$MAIN --jq '[.files[].filename]'` | `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`, `07-06-SUMMARY.md`, `07-07-SUMMARY.md`, `07-RESEARCH.md`. Only `.planning/` paths (status `ahead`, ahead_by 6, behind_by 0). |

The second parent, `bf0bc94`, is this branch's HEAD, so `main` received exactly the tip Task 1 checked
plus the Task 1 record commits.

### Step 2: the live page is the new build

Cache-busted GET (`cb=1791549981`) at 12:46Z: HTTP headers `Last-Modified: Fri, 09 Oct 2026 12:45:20 GMT`,
`Age: 0`, `X-Cache: MISS`. Stamp `2026-10-09T12:45:12Z f71c6e4`, which ends with `${MAIN:0:7}`, so no
CDN-lag checkpoint was needed. With the stamp normalised, the live page is byte-identical to
`git show 643c628:index.html` (both index blobs `5640c0f1b174343f030e4721579e4a278e835ad5`).

### Step 3: `csp-hash --check` on the live bytes

```
node scripts/csp-hash.js --check <scratch>/live.html
CSP hash OK sha256-Nw5jh/JeJpDSYItCr6FJJ52mvE7ySXo1646f8nZCpkU=     (exit 0)
```

The plan's `<verify><automated>` (mktemp, a fresh cache-busted curl, `--check`) was re-run at 12:48Z
and printed the same token, exit 0.

### Step 4: verdict

A `node -e` taking both paths through `process.argv`, using `readPolicy` and the MANIFEST Label A rule
(link tags, rel tokens, the href test) copied from `test/app.test.js`:

```json
{"policyEqual":true,"stamp":"2026-10-09T12:45:12Z f71c6e4","stampEndsWithMain":true,"cspMetas":1,"manifestLinks":1,"manifestWithHref":0}
```

The one live manifest link is `<link rel="manifest" id="manifest-placeholder" />`. In 07-05 it was
`href="#"`.

### Step 5: headless Chrome on both live URLs

Probe recreated from 07-RESEARCH.md `### CSP-05 probe, hardened after the 07-05 live failure (use this
one)` into a fresh scratch directory (`<scratchpad>/p0707t3-1791550002`). `cmp` against RESEARCH
lines 493-523 showed it byte-identical, and `node --check` passed. Each run used URL mode, the
expression `buildLabel(BUILD)`, and a fresh `PROFILE_ROOT` under
`C:/Users/idbac/AppData/Local/Temp/p7sw/t73-<port>-<epoch>`. A scratch evaluator applied every step 5
pass criterion to each output; all four returned `green: true` with no failed criterion and no
unexpected host.

| Run | violations | security | exceptions | page URL count | manifest | booted / apps / SW ready | custom |
|-----|-----------|----------|------------|----------------|----------|--------------------------|--------|
| `/ppl-tracker/` desktop (18891, 0, 15000) | `[]` | `[]` | `[]` | **1** | blob:https://idbachmayer-boop.github.io/, data, start_url only | true / 1 / true | `… · f71c6e4` |
| `/ppl-tracker/` Android (18893, 1, 18000) | `[]` | `[]` | `[]` | **1** | blob:https://idbachmayer-boop.github.io/, data, start_url only | true / 1 / true | `… · f71c6e4` |
| `/ppl-tracker/index.html` desktop (18895, 0, 15000) | `[]` | `[]` | `[]` | **1** | blob:https://idbachmayer-boop.github.io/, data, start_url only | true / 1 / true | `… · f71c6e4` |
| `/ppl-tracker/index.html` Android (18897, 1, 18000) | `[]` | `[]` | `[]` | **1** | blob:https://idbachmayer-boop.github.io/, data, start_url only | true / 1 / true | `… · f71c6e4` |

07-05's failing runs counted the page URL 2 and logged `manifest-src` against it. Task 1's URL-mode
run against the reverted build still counted 2 (the old `href="#"`). All four now count 1.

```json
{"violations":[],"security":[],"exceptions":[],"hosts":{"https://idbachmayer-boop.github.io/ppl-tracker/":1,"https://www.gstatic.com/firebasejs/10.14.1":3,"blob:":1,"https://idbachmayer-boop.github.io/favicon.ico":1},"chrome":"Chrome/154.0.8037.98","facts":{"booted":true,"firebaseApps":1,"sw":"{\"supported\":true,\"ready\":true,\"error\":null}","custom":"Updated Oct 9, 2026, 7:45 AM · f71c6e4"},"appManifest":{"url":"blob:https://idbachmayer-boop.github.io/d5cfdccc-6884-4c89-a5cd-acb580ccf353","errors":[{"message":"property 'start_url' ignored, URL is invalid.","critical":0,"line":0,"column":0}],"hasData":true}}
{"violations":[],"security":[],"exceptions":[],"hosts":{"https://idbachmayer-boop.github.io/ppl-tracker/":1,"https://www.gstatic.com/firebasejs/10.14.1":3,"blob:":1,"https://idbachmayer-boop.github.io/favicon.ico":1,"https://apis.google.com/js/api.js":1,"https://apis.google.com/_/scs":1,"https://ppl-tracker-a1d87.firebaseapp.com/__/auth":1},"chrome":"Chrome/154.0.8037.98","facts":{"booted":true,"firebaseApps":1,"sw":"{\"supported\":true,\"ready\":true,\"error\":null}","custom":"Updated Oct 9, 2026, 7:45 AM · f71c6e4"},"appManifest":{"url":"blob:https://idbachmayer-boop.github.io/201b246f-6ffb-4a18-8d40-77b6c1cf83ea","errors":[{"message":"property 'start_url' ignored, URL is invalid.","critical":0,"line":0,"column":0}],"hasData":true}}
{"violations":[],"security":[],"exceptions":[],"hosts":{"https://idbachmayer-boop.github.io/ppl-tracker/index.html":1,"https://www.gstatic.com/firebasejs/10.14.1":3,"blob:":1,"https://idbachmayer-boop.github.io/favicon.ico":1},"chrome":"Chrome/154.0.8037.98","facts":{"booted":true,"firebaseApps":1,"sw":"{\"supported\":true,\"ready\":true,\"error\":null}","custom":"Updated Oct 9, 2026, 7:45 AM · f71c6e4"},"appManifest":{"url":"blob:https://idbachmayer-boop.github.io/b34a7719-374c-4fab-a2bd-75ad16b9e065","errors":[{"message":"property 'start_url' ignored, URL is invalid.","critical":0,"line":0,"column":0}],"hasData":true}}
{"violations":[],"security":[],"exceptions":[],"hosts":{"https://idbachmayer-boop.github.io/ppl-tracker/index.html":1,"https://www.gstatic.com/firebasejs/10.14.1":3,"blob:":1,"https://idbachmayer-boop.github.io/favicon.ico":1,"https://apis.google.com/js/api.js":1,"https://apis.google.com/_/scs":1,"https://ppl-tracker-a1d87.firebaseapp.com/__/auth":1},"chrome":"Chrome/154.0.8037.98","facts":{"booted":true,"firebaseApps":1,"sw":"{\"supported\":true,\"ready\":true,\"error\":null}","custom":"Updated Oct 9, 2026, 7:45 AM · f71c6e4"},"appManifest":{"url":"blob:https://idbachmayer-boop.github.io/bd055c4f-b92e-407a-a5c6-ca5ba1ae6472","errors":[{"message":"property 'start_url' ignored, URL is invalid.","critical":0,"line":0,"column":0}],"hasData":true}}
```

### Step 6: revert decision

No revert. Steps 3 to 5 all passed. The revert command stays ready for the CSP-06 round trip below.

## CSP-06: end-of-phase UAT item (pending, Ian's devices)

CSP-06 is **not** ticked. The signed-out probes never reach identitytoolkit, securetoken or Firestore,
so only a real signed-in round trip proves sync survives the policy.

1. Settings → This version on the PC **and** the phone must both end with `f71c6e4`. If the phone
   still shows `a122a2e` or older after 15 minutes and a full close and reopen, wait. Never judge the
   round trip on a stale build.
2. On the PC: Settings → sign out, then sign in again with email and password.
3. On the PC: log a test weigh-in for today with a distinctive value such as 123.4.
4. On the phone: open the app and watch for it (expected within about a minute).
5. On the PC: delete that weigh-in. On the phone: watch it disappear.
6. On the PC: open https://idbachmayer-boop.github.io/ppl-tracker/ with DevTools Console open and
   reload, once normally and once with Network throttling set to 3G.

**Expected:** sign-in succeeds; Settings on both devices shows no "Cloud sync couldn't load",
"Offline — will sync…" or "Sync error"; the weigh-in and its deletion both reach the phone; neither
console reload shows a line containing "Content Security Policy".

**On any failure, or a blank app on either device**, revert at once from an up-to-date `main`, then
diagnose:

```
git switch main
git pull --ff-only
git revert --no-edit 643c62864201dee00ab9cf53b87d4470894e85ad
git push origin main
```

Never hotfix forward. Never revert the manifest fix (`cbf17b5`) or the stamp move.

## Follow-ups (once CSP-06 passes)

- Tick CSP-06 in REQUIREMENTS.md and close Phase 7.
- Append a dated changelog entry to Ian's live vault note,
  `C:\Main Vault\50-59 Projects & Events\56. Software Projects\PPL Tracker App.md`: the app now ships
  a Content-Security-Policy, on the second attempt. The first was reverted because the manifest link
  fetched the page itself as a manifest, which only the live site showed. A script edit needs
  `npm run csp:hash`, and Firebase console changes (reCAPTCHA, Google sign-in) need a policy change.
  Update the note's Current Features section, because the change is structural.
- In the phase-transition docs pass, mark `.planning/codebase/CONCERNS.md`'s CSP concern resolved,
  correcting its stale `script-src 'self'` recommendation to the hash-based policy that shipped.

## Deviations from Plan

**1. [Rule 2 - Verification] Mechanical GREEN evaluation (Task 1 and Task 3)**
- The four tip-probe outputs (Task 1) and the four live-probe outputs (Task 3) were checked by scratch
  evaluators against every GREEN / step 5 criterion, rather than by eye. Nothing in the repo changed.

**2. [Task 2 record] DevTools pass result inferred, not reported**
- Ian did not reply with an explicit DevTools-pass result. Because Task 2's instructions make the push
  conditional on a clean pass, his push and merge are recorded as implicit confirmation (orchestrator's
  instruction). The live probes cover the failure mode the throttled reload targeted.

**3. [Rule 2 - Verification] Extra live-vs-commit diff**
- Beyond the plan's parsed-policy equality, the live page was diffed against `git show 643c628:index.html`
  with the stamp normalised: byte-identical. This rules out any deploy rewrite outside the stamp.

## Known Stubs

None. This plan changes no repo files outside `.planning/`.

## Threat Flags

None. No new surface; every check was a read-only GET or a signed-out headless load.

## Self-Check: PASSED

- FOUND: `.planning/phases/07-content-security-policy/07-07-SUMMARY.md`
- FOUND (local): `bfa22f9`, `bf0bc94` (Task 1 records), `32795de` (Task 3 record), `643c628` (CSP_SHA2), `cbf17b5` (MANIFEST_SHA)
- FOUND (remote, `gh api`): `f71c6e4` (the merge commit on `main`; not fetched locally, by design)
- No `REVERT NOW` line: every Task 3 criterion passed.
