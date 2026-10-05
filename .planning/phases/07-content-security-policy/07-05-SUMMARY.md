REVERT NOW: git revert --no-edit ebc57234a496f73df95e828a57412c44ddb52031 on main, then push

---
phase: 07-content-security-policy
plan: 05
subsystem: deploy
tags: [csp, go-live, csp-05, csp-06, d-06, d-09, d-10]
status: failed
requires:
  - 07-02 stamp move live alone (main 58d8988, confirmed on both devices)
  - 07-04 revert target ebc57234a496f73df95e828a57412c44ddb52031
provides:
  - "the CSP on main through merge commit 443d781 (PR #11); live bytes pass --check and match CSP_SHA's policy"
  - "a live-URL violation (manifest-src) that Task 3's pass criteria treat as a failure: revert recommended"
affects:
  - end-of-phase UAT (the CSP-06 round trip is NOT queued while the revert is pending)
key-files:
  created: []
  modified: []
metrics:
  started: 2026-10-05T09:45Z
  task3_completed: 2026-10-05T11:47Z
actuals:
  tokens: 0        # no repo files changed; the plan is files_modified: []
  tasks: 2         # Tasks 1 and 2 passed; Task 3 failed its pass criteria
  commits: 2       # fb2f718 (Task 1 record) and this SUMMARY commit
---

# Phase 7 Plan 05: Take the CSP live (FAILED at Task 3: one CSP violation on the live URL)

> **Task 3 failed one pass criterion, so the plan's rule applies: revert CSP_SHA on `main` and
> diagnose afterwards.** The executor has not reverted anything. The command is above and under
> "Revert" in the Task 2 commands below.
>
> What passed: PR #11 merged with a merge commit (`443d781`, two parents); the deploy's CSP check
> step was green; the live bytes pass `node scripts/csp-hash.js --check`; the live policy equals
> CSP_SHA's exactly; the live stamp ends with `443d781`; there is exactly one CSP meta; headless
> Chrome on the live URL boots the app, has one Firebase app and a ready service worker, and shows
> `This version` ending `· 443d781`, on desktop and Android user agents alike.
>
> What failed: both live probes report **one violation**, `manifest-src
> https://idbachmayer-boop.github.io/ppl-tracker/`. Chrome tries to load the page's own URL as the
> web app manifest and the policy (`manifest-src blob:`) blocks it. The localhost probes in 07-04
> and Task 1, and Ian's localhost DevTools pass, never saw it. The diagnosis below suggests it is
> the `href="#"` placeholder and probably harmless, but the plan's pass criteria say
> `violations: []`, so this is reported as a failure and the decision goes to Ian.
>
> Nothing is ticked. CSP-05 stays open: its local check passed, but the live site has a violation
> that check missed, and a revert would take the policy off `main`. CSP-06 stays open.

## Task 3 results (2026-10-05T11:44Z to 11:47Z)

### Step 1: `main` is a merge commit and brings in nothing beyond CSP_SHA but planning docs

| Item | Value |
|------|-------|
| MAIN (`git ls-remote origin refs/heads/main`) | `443d781f10512567eb13886a9f75c6d9044a67c4` |
| MAIN's parents (`gh api .../commits/MAIN`) | 2: `58d8988e…` (the previous main) and `fb2f7185…` (this branch's tip) |
| MAIN's message | `Merge pull request #11 from idbachmayer-boop/claude/gifted-goodall-706ad7` |
| `compare/CSP_SHA...MAIN` files | `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`, `07-04-SUMMARY.md`, `07-05-SUMMARY.md`. Only `.planning/` paths. |
| PR #11 (`gh pr view 11`) | `MERGED` at 2026-10-05T11:42:59Z, mergeCommit `443d781`, head `fb2f718` |
| Deploy run 37304719155 | `success` on `443d781`. The `test` job passed, and in the `deploy` job the step "Check the published script still matches its CSP hash" passed. |

### Step 2: the live page is the CSP deploy

A cache-busted fetch at 11:44:45Z returned `X-Cache: MISS`, `Last-Modified: Mon, 05 Oct 2026
11:43:38 GMT`, and the stamp `2026-10-05T11:43:29Z 443d781`. The sha7 matches MAIN, so there was no
CDN lag to wait out.

### Step 3: `--check` on the live bytes

```
node scripts/csp-hash.js --check <L>/live.html
CSP hash OK sha256-Nw5jh/JeJpDSYItCr6FJJ52mvE7ySXo1646f8nZCpkU=      (exit 0)
```

### Step 4: the policy verdict

The `node -e` run took both paths and the sha7 from `process.argv`:

```json
{"policyEqual":true,"stamp":"2026-10-05T11:43:29Z 443d781","stampEndsWithMain":true,"cspMetas":1,"directives":11}
```

The live policy equals `git show CSP_SHA:index.html`'s, the stamp ends with `443d781`, and there is
one CSP meta. **Pass.**

### Step 5: headless Chrome on the live URL (FAIL: one violation)

These used the Task 1 probe in URL mode, signed out, with a new profile each run under
`C:/Users/idbac/AppData/Local/Temp/p7sw/t3{d,a}-<epoch>`. The expression was `buildLabel(BUILD)`.

Desktop, `node probe.js https://idbachmayer-boop.github.io/ppl-tracker/ 18801 0 15000 "buildLabel(BUILD)"`:

```json
{
 "violations": [
  "manifest-src https://idbachmayer-boop.github.io/ppl-tracker/"
 ],
 "security": [
  "Loading a manifest from 'https://idbachmayer-boop.github.io/ppl-tracker/' violates the following Content Security Policy directive: \"manifest-src blob:\". The action has been blocked."
 ],
 "exceptions": [],
 "hosts": {
  "https://idbachmayer-boop.github.io/ppl-tracker/": 2,
  "https://www.gstatic.com/firebasejs/10.14.1": 3,
  "blob:": 1,
  "https://idbachmayer-boop.github.io/favicon.ico": 1
 },
 "facts": {
  "booted": true,
  "firebaseApps": 1,
  "sw": "{\"supported\":true,\"ready\":true,\"error\":null}",
  "custom": "Updated Oct 5, 2026, 6:43 AM · 443d781"
 }
}
```

Android user agent, `node probe.js https://idbachmayer-boop.github.io/ppl-tracker/ 18803 1 18000 "buildLabel(BUILD)"`:

```json
{
 "violations": [
  "manifest-src https://idbachmayer-boop.github.io/ppl-tracker/"
 ],
 "security": [
  "Loading a manifest from 'https://idbachmayer-boop.github.io/ppl-tracker/' violates the following Content Security Policy directive: \"manifest-src blob:\". The action has been blocked."
 ],
 "exceptions": [],
 "hosts": {
  "https://idbachmayer-boop.github.io/ppl-tracker/": 2,
  "https://www.gstatic.com/firebasejs/10.14.1": 3,
  "blob:": 1,
  "https://idbachmayer-boop.github.io/favicon.ico": 1,
  "https://apis.google.com/js/api.js": 1,
  "https://apis.google.com/_/scs": 1,
  "https://ppl-tracker-a1d87.firebaseapp.com/__/auth": 1
 },
 "facts": {
  "booted": true,
  "firebaseApps": 1,
  "sw": "{\"supported\":true,\"ready\":true,\"error\":null}",
  "custom": "Updated Oct 5, 2026, 6:43 AM · 443d781"
 }
}
```

| Criterion | Desktop | Android |
|-----------|---------|---------|
| `violations: []` | **FAIL** (1: manifest-src) | **FAIL** (1: manifest-src) |
| `security: []` | **FAIL** (the same block) | **FAIL** (the same block) |
| `booted: true` | pass | pass |
| `firebaseApps: 1` | pass | pass |
| `"ready":true` | pass | pass |
| `custom` ends `· 443d781` | pass | pass |

The Android run loads the mobile redirect-auth path (`apis.google.com` and the `firebaseapp.com/__/auth`
iframe) with no violation, as it did on localhost. No Firebase host was blocked.

### Diagnosis (read-only, done after the failure, before reporting)

`index.html` line 12 declares `<link rel="manifest" href="#" id="manifest-placeholder" />`, and the
inline script (line 308) later swaps `href` for a `blob:` URL of the generated manifest. `href="#"`
resolves to the document's own URL. On the live site Chrome starts fetching that placeholder before
the swap, and `manifest-src blob:` blocks it. The violation's blocked URL is always the page's own
URL: `/ppl-tracker/` when the probe loads `/ppl-tracker/`, and `/ppl-tracker/index.html` when it
loads `/ppl-tracker/index.html`.

A diagnostic copy of the probe also reported CDP `Page.getAppManifest` (scratch only, signed out,
fresh profiles):

| Run | violations | effective manifest |
|-----|------------|--------------------|
| local `/index.html` (CSP_SHA's `index.html` + `sw.js`) | `[]` | `blob:http://127.0.0.1:18811/…`, data present |
| live `/ppl-tracker/` | `manifest-src …/ppl-tracker/` | `blob:https://idbachmayer-boop.github.io/…`, data present |
| live `/ppl-tracker/index.html` | `manifest-src …/ppl-tracker/index.html` | `blob:https://idbachmayer-boop.github.io/…`, data present |

On the live site the effective manifest is still the blob, and it parses. The only manifest error
in every run, local and live, is the existing `property 'start_url' ignored, URL is invalid`, the
"Manifest start_url warning" that Task 2 listed as known noise. So the blocked load is the bogus
`#` fetch, which would have fetched HTML as a manifest anyway. The evidence suggests installability
and sync are not affected. Signed-out probes cannot prove sync, though, and the plan's criteria
do not distinguish a harmless violation from a harmful one.

**Why every pre-push check missed it:** on localhost, Chrome does not fetch the placeholder before
the swap, so the violation never fires there. The localhost probes (07-04 and Task 1) and Ian's
DevTools pass, which the plan correctly put on a never-used localhost port, could not see it. Only
the live origin shows it. One run of the diagnostic probe against local `/` (a directory URL) did
not boot, so it proves nothing either way and is not cited as evidence.

**A likely fix, for after the revert and not applied:** drop the placeholder's `href="#"`. A
`<link rel="manifest">` with no `href` fetches nothing, and the script still sets the blob `href`.
The alternative is to create the link element in the script. The tag is outside the inline script,
so the script hash would not change. It would need a suite check that the manifest link carries no
`href` that resolves to a non-blob URL. Under D-06 this is a re-ship after the revert, never a
hotfix forward.

### Step 6: outcome

One pass criterion failed in step 5, so under the plan the SUMMARY's first line is the `REVERT NOW`
line and the task fails. The executor did not revert, push or merge anything.

### Step 7: CSP-06

The CSP-06 signed-in round trip is **not** queued while a revert is recommended. If Ian reverts, the
policy is off the live site and there is nothing to round-trip. If Ian keeps the policy live (his
call, against the plan's rule), the round trip in Task 3's `<human-check>` applies unchanged, with
both devices showing `This version` ending `· 443d781` first.

## Task 1 results (2026-10-05T09:45Z)

| Item | Value |
|------|-------|
| CSP_SHA (07-04 `Revert target (D-06)`) | `ebc57234a496f73df95e828a57412c44ddb52031` |
| TIP (HEAD at check time) | `d7ad9250643c6006c46d2fc3968e717a18e49111` |
| `main` (`git ls-remote origin refs/heads/main`) | `58d8988e44865115af28f914d0826552667d0e4b` (PR #10's merge commit, parents `e35f560` and `6f53654`) |
| `origin/claude/gifted-goodall-706ad7` before the push | `05ae16679e17320a4a8235ebb9bb6b9ea28d9118`, an ancestor of HEAD (19 commits behind), so `git push origin HEAD` fast-forwards |

### Precondition: the stamp-only build is still live

A cache-busted fetch of `https://idbachmayer-boop.github.io/ppl-tracker/index.html`:

- stamped ppl-build meta count: `1`, content `2026-10-05T09:16:51Z 58d8988`;
- `http-equiv="Content-Security-Policy"` count: `0`.

The precondition is met. Live is the stamp-only build, at `main`'s head.

### The CSP commit is intact

- `git merge-base --is-ancestor CSP_SHA HEAD`: exit 0.
- `git show --stat --format= CSP_SHA` lists exactly `.github/workflows/deploy.yml`, `CLAUDE.md`,
  `index.html`, `test/app.test.js` (4 files, 200 insertions).
- `git diff --name-only CSP_SHA HEAD` lists only `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`,
  `.planning/STATE.md` and `07-04-SUMMARY.md`.

### What the PR brings to `main`

`git diff --name-only 58d8988 HEAD` lists `.github/workflows/deploy.yml`, `CLAUDE.md`, `index.html`,
`package.json`, `scripts/csp-hash.js`, `test/app.test.js`, and 7 `.planning/` paths. That is 07-03's
hash tool, 07-04's CSP commit and the planning docs. Nothing else is included. All of 07-01 is
already on `main` through `6f53654`, which is the merge base.

`git merge-tree --write-tree 58d8988 HEAD` exits 0 with tree `c1501c98…`, the same as `HEAD^{tree}`.
The PR merges with no conflict, and the merged tree is byte-for-byte this branch's tree.

### Suite and hash check

```
TZ=America/Chicago npm test   ->  926 passed, 0 failed, 2 skipped   (exit 0)
npm run csp:check             ->  CSP hash OK sha256-Nw5jh/JeJpDSYItCr6FJJ52mvE7ySXo1646f8nZCpkU=   (exit 0)
```

The 2 skips are the same as 07-04's baseline. One is the local-only real-backup differential
(`test/local/real-db-snapshot.json` is git-ignored).

### Fresh headless probe of the tip

The probe was rebuilt in a fresh scratch directory, `<scratchpad>/p0705/probe-1791193559`, from the
07-RESEARCH probe as 07-04 used it, with the Chrome profile on a short path. Only one thing changed:
when the first argument starts with `https:`, the probe skips the local server and navigates to that
URL. The scratch site holds HEAD's `index.html` and `sw.js`, compared byte-for-byte with `cmp`. Each
run used a new profile under `C:/Users/idbac/AppData/Local/Temp/p7sw/t1-1791193559`, and the
expression was `buildLabel(BUILD)`.

Desktop, `node probe.js <site> 18781 0 12000`:

```json
{
 "violations": [],
 "security": [],
 "exceptions": [],
 "hosts": {
  "http://127.0.0.1:18781/index.html": 1,
  "https://www.gstatic.com/firebasejs/10.14.1": 3,
  "blob:": 1,
  "http://127.0.0.1:18781/favicon.ico": 1
 },
 "facts": {
  "booted": true,
  "firebaseApps": 1,
  "sw": "{\"supported\":true,\"ready\":true,\"error\":null}",
  "custom": "Local copy, not a deployed build"
 }
}
```

Android user agent, `node probe.js <site> 18783 1 15000`:

```json
{
 "violations": [],
 "security": [],
 "exceptions": [],
 "hosts": {
  "http://127.0.0.1:18783/index.html": 1,
  "https://www.gstatic.com/firebasejs/10.14.1": 3,
  "blob:": 1,
  "http://127.0.0.1:18783/favicon.ico": 1,
  "https://apis.google.com/js/api.js": 1,
  "https://apis.google.com/_/scs": 1,
  "https://ppl-tracker-a1d87.firebaseapp.com/__/auth": 1
 },
 "facts": {
  "booted": true,
  "firebaseApps": 1,
  "sw": "{\"supported\":true,\"ready\":true,\"error\":null}",
  "custom": "Local copy, not a deployed build"
 }
}
```

Both runs pass: `violations: []`, `security: []`, `booted: true`, `firebaseApps: 1`, `"ready":true`.
The Android run also loads the mobile redirect-auth path (`apis.google.com` and the
`firebaseapp.com/__/auth` iframe) with no violation.

The URL mode was also run once against the current live site (stamp-only, signed out, fresh
profile) so that Task 3 does not depend on an untested code path. It showed no violations, no
security entries, a booted app, one Firebase app and a ready service worker, with
`custom: "Updated Oct 5, 2026, 4:16 AM · 58d8988 | cspMetas=0"`.

Port 18790 had no listener when checked (`netstat`), and `py` is Python 3.14.4.

## Commands for Ian (Task 2)

Run every command from this checkout's root,
`C:\Users\idbac\Projects\ppl-tracker\.claude\worktrees\gifted-goodall-706ad7`.

1. Local server for the CSP-05 DevTools pass:
   ```
   py -m http.server 18790 --bind 127.0.0.1
   ```
   Then open `http://127.0.0.1:18790/index.html`.
2. Push. This is a fast-forward, because the remote branch `05ae166` is an ancestor of HEAD:
   ```
   git push origin HEAD
   ```
3. PR:
   ```
   gh pr create --base main --head claude/gifted-goodall-706ad7 --title "Phase 7: Content-Security-Policy (CSP-01..CSP-07)" --body "Ships a hash-based Content-Security-Policy meta plus the csp:hash/csp:check tool and the deploy-time hash check. Revert target if anything breaks after deploy: ebc57234a496f73df95e828a57412c44ddb52031 (git revert --no-edit ebc57234a496f73df95e828a57412c44ddb52031 on main, then push). Merge with a merge commit only, never squash or rebase."
   ```
4. Merge with **Create a merge commit** once CI's `test` job is green. Never squash, never rebase.
   (CLI equivalent: `gh pr merge <number> --merge`.) Then wait for the `deploy` job. Its step
   "Check the published script still matches its CSP hash" must pass.
5. Revert, kept ready. Run it only on a failure after the deploy, from an up-to-date `main`:
   ```
   git switch main
   git pull --ff-only
   git revert --no-edit ebc57234a496f73df95e828a57412c44ddb52031
   git push origin main
   ```
   Revert first and diagnose afterwards. Never hotfix forward, and never revert the stamp move.

## Task 2 result: `csp deployed`

- Ian ran the local CSP-05 DevTools pass on `http://127.0.0.1:18790/index.html` and reported no CSP
  lines. He then pushed, which the instructions allowed only after a clean pass.
- The optional local sign-in (RESEARCH open question 2) was **not** done.
- He pushed `fb2f718` as a fast-forward, opened **PR #11**, waited for CI to go green, and merged with
  `gh pr merge --merge` (a merge commit). `main` is now `443d781f10512567eb13886a9f75c6d9044a67c4`.
- Deploy run `37304719155` succeeded. Its step "Check the published script still matches its CSP
  hash" passed.

## Deviations from Plan

**1. [Rule 1 - Bug] The probe's URL-mode test is `startsWith("https:")`, not a regex**
- **Found during:** Task 1, step 3.
- **Issue:** The first patch wrote the URL check as a regex, `/^https:\/\//`. Shell quoting dropped
  its escapes, which left `/^https:///`, an invalid regex.
- **Fix:** Replaced it with `String(dir).startsWith("https:")`, which has nothing to escape.
  `node --check` passed, and the live URL-mode run proved the branch works.
- **Files modified:** scratch probe only (never committed).

**2. [Rule 2 - Verification] Extra pre-push checks**
- `git merge-tree` was run to prove the PR merges with no conflict and lands HEAD's exact tree.
- One URL-mode probe was run against the current live site, so Task 3's live probe runs on proven
  code. It was signed out on a fresh profile, a read-only GET.
- Neither changes the repo.

**3. [Rule 2 - Verification] Read-only diagnosis after the Task 3 failure**
- **Found during:** Task 3, step 5.
- **Issue:** The plan says to report a failure and revert, and does not ask for a diagnosis. A bare
  "one violation" would leave Ian choosing between a revert and keeping the policy without knowing
  what the violation is.
- **Fix:** A scratch copy of the probe added CDP `Page.getAppManifest` and an optional local path,
  then ran signed out on fresh profiles against local `/index.html`, live `/ppl-tracker/` and live
  `/ppl-tracker/index.html`. This found the `href="#"` placeholder as the cause and showed that the
  effective blob manifest still loads on live. Nothing was changed, reverted or pushed.
- **Files modified:** scratch only (`<scratchpad>/p0705/diag-1791200773`).

**4. [Plan output overridden by failure] CSP-05 not ticked; ROADMAP not marked complete**
- The plan's `<output>` says to tick CSP-05. It assumes Task 3 passes. Task 3 failed and a revert is
  recommended, so CSP-05, CSP-06 and the plan's roadmap entry stay open. CSP-07 was ticked by 07-04
  and is left as is.

## Known Stubs

None. This plan changes no repo files.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: dos-precheck-gap | index.html (`<link rel="manifest" href="#">`) | Localhost pre-push checks (headless and human) cannot reproduce live-origin manifest fetch timing, so a `manifest-src` violation reached production. Any re-ship needs a live-URL probe step that is allowed to fail fast, or a placeholder-free manifest link. |

## Revert (D-06), for Ian

From an up-to-date `main`:

```
git switch main
git pull --ff-only
git revert --no-edit ebc57234a496f73df95e828a57412c44ddb52031
git push origin main
```

07-04 rehearsed this and CI is green for it. Never revert the stamp move (`58d8988` and earlier), and
never hotfix forward.

## Self-Check: PASSED

- SUMMARY exists at the plan path; commits fb2f718, ebc5723 and 443d781 (MAIN, the merge commit; also confirmed via the GitHub API) all resolve. Nothing was fetched into this checkout.
- Task 3 itself FAILED its pass criteria (one live manifest-src violation); the self-check covers the record, not the outcome.
