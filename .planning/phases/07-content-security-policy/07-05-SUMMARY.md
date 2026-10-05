---
phase: 07-content-security-policy
plan: 05
subsystem: deploy
tags: [csp, go-live, csp-05, csp-06, d-06, d-09, d-10]
status: in-progress
requires:
  - 07-02 stamp move live alone (main 58d8988, confirmed on both devices)
  - 07-04 revert target ebc57234a496f73df95e828a57412c44ddb52031
provides:
  - "(pending) the CSP on main through a merge commit, the live bytes checked, the live URL probed clean"
affects:
  - end-of-phase UAT (the CSP-06 signed-in round trip)
key-files:
  created: []
  modified: []
---

# Phase 7 Plan 05: Take the CSP live (in progress)

> **IN PROGRESS. Task 2 is waiting on Ian.** Task 1 is done, and every pre-push check passed.
> Task 2 (`checkpoint:human-action`, `gate="blocking-human"`) needs Ian to run the CSP-05 DevTools
> pass on localhost and then push, open the PR, merge it with a merge commit and wait for the
> deploy. Task 3 (the live checks) has not run. Nothing is ticked.

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

## Task 2: waiting on Ian

Resume signal: `csp deployed` (say whether the optional local sign-in was done), `hold` with what
was seen, or `deploy check failed`.

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
