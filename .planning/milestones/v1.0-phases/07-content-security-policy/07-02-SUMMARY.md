---
phase: 07-content-security-policy
plan: 02
subsystem: deploy
tags: [csp, build-stamp, deploy, d-08, d-09]
status: complete
requires:
  - 07-01 deployable unit 6f5365419670a8c0479e40e65ff3ca0c2f924e2c
provides:
  - "The stamp move is live on main by itself (merge commit 58d8988), and Ian confirmed it on the PC and the phone"
  - "Proof from production that the deploy rewrites only the ppl-build meta: the published inline script is byte-identical to the repo's"
affects:
  - 07-05 (its precondition reads the live site this plan verified)
tech-stack:
  added: []
  patterns:
    - "Live byte-compare: the published page equals the deployed commit's index.html with the one stamp marker replaced, checked with a replacer function and strict equality"
key-files:
  created: []
  modified: []
decisions:
  - "Case UNIT applied: Ian pushed 07-01's deployable unit 6f53654 to its own branch, because the worktree tip already held 07-03's scripts/csp-hash.js"
  - "D-09 gate passed: CSP code may now be pushed. Both devices read 58d8988, which is main's head"
metrics:
  duration: "Task 1 2026-10-02T12:40Z; Ian's deploy and readings 2026-10-05; Task 3 2026-10-05T09:27Z. Most of the wall time was waiting on Ian"
  completed: 2026-10-05
actuals:
  tokens: 2100
  tasks: 3
  commits: 2
---

# Phase 7 Plan 02: Ship the stamp move alone Summary

**The build stamp now lives in a `ppl-build` meta tag on the live site. It went out by itself as merge
commit 58d8988, Ian read it on the PC and the phone, and the published inline script is byte-identical
to the repo's. A CSP hash computed from the repo will therefore match what the browser runs in production.**

D-09's first step is done: the stamp move reached production alone, so the CSP go-live changes exactly
one variable. D-08 is proven in production, not only in tests: the deploy's Stamp build step now
touches the meta's `content` and nothing inside the script.

## Task 1 results (2026-10-02T12:40:59Z)

| Item | Value |
|------|-------|
| UNIT (07-01 `Deployable unit (D-09)`) | `6f5365419670a8c0479e40e65ff3ca0c2f924e2c` |
| TIP (HEAD at check time) | `af3a4069602ecc045fb18590784ae7306bef5aef` |
| Case | **UNIT**: TIP holds `scripts/` (1 path, `scripts/csp-hash.js` from 07-03), so TIP is not stamp-only |
| PUSH | `6f5365419670a8c0479e40e65ff3ca0c2f924e2c` |
| MAIN_BEFORE (`git ls-remote origin refs/heads/main`) | `e35f560b97d4725ded7ecdcb72302e9520b64e92` |
| `origin/phase-7-build-stamp` before the push | did not exist (`git ls-remote` returned nothing) |

Checks at TIP: CSP meta count `0`, `scripts/` count `1`. That `1` is what put this in case UNIT.

Checks at PUSH:
- `<meta name="ppl-build" content="__BUILD_STAMP__" />` count: `1`
- `http-equiv="Content-Security-Policy"` count: `0`
- `^scripts/` count: `0`
- `git diff --name-only UNIT PUSH`: empty (PUSH is UNIT)
- `git merge-base --is-ancestor UNIT HEAD`: exit 0 (precondition met)

How the PR would merge: MAIN_BEFORE was not an ancestor of PUSH, but `git log PUSH..MAIN_BEFORE` listed
only the merge commits of PRs #7, #8 and #9, and `git diff PUSH...MAIN_BEFORE` was empty. So the PR could
merge with no content conflict, and the merge commit's only content change would be the stamp move.

The plan's automated verify printed:

```
PUSH=6f5365419670a8c0479e40e65ff3ca0c2f924e2c ok
```

The suite was green at PUSH in a fresh scratch clone (`<scratchpad>/0702-unit-clone-1790944821`, checked
out at `6f53654…`, with no `scripts/` directory), run with `TZ=America/Chicago node test/app.test.js`.
Last line:

```
896 passed, 0 failed, 2 skipped
```

The two skips are the local-only real-backup checks. They need `test/local/real-db-snapshot.json`, which
is git-ignored and never present in a clone. The total matches 07-01's final count.

## Commands Ian ran (Task 2)

```
git push origin 6f5365419670a8c0479e40e65ff3ca0c2f924e2c:refs/heads/phase-7-build-stamp
gh pr create --base main --head phase-7-build-stamp --title "Phase 7: the build stamp moves into a meta tag (D-08, D-09)" --body '…stamp move only, no CSP…'
gh pr checks phase-7-build-stamp --watch
gh pr merge phase-7-build-stamp --merge
```

## Task 2 outcome (Ian, 2026-10-05)

| Item | Value |
|------|-------|
| PR | [#10](https://github.com/idbachmayer-boop/ppl-tracker/pull/10), `phase-7-build-stamp` → `main`, head `6f53654…`, state `MERGED` |
| Merge strategy | merge commit (`gh pr merge --merge`), merged 2026-10-05T09:16:22Z |
| CI | test job green before the merge |
| Deploy run on `main` | `Deploy to GitHub Pages` run 37288941430, head `58d8988…`, `success` |
| Resume signal | `stamp live 58d8988 58d8988` |
| PC reading (Settings → This version) | `58d8988` |
| Phone reading (Settings → This version) | `58d8988` |

## Task 3: live byte comparison (2026-10-05T09:27Z)

**MAIN** (`git ls-remote origin refs/heads/main`): `58d8988e44865115af28f914d0826552667d0e4b`

| Check | Result |
|-------|--------|
| MAIN's parents (`gh api …/commits/$MAIN`) | **2**: `e35f560…` (MAIN_BEFORE) and `6f53654…` (PUSH). Message: "Merge pull request #10 from idbachmayer-boop/phase-7-build-stamp" |
| `gh api …/compare/$PUSH...$MAIN` | status `ahead`, ahead_by 4, behind_by 0, **files `[]`**. MAIN's tree is PUSH's tree, and the merge brought in nothing beyond the unit |
| `gh pr view 10` mergeCommit | `58d8988e44865115af28f914d0826552667d0e4b`, which is MAIN |
| Ian's sha7 values vs `${MAIN:0:7}` | PC `58d8988` = phone `58d8988` = `58d8988` |
| Live response headers | `Last-Modified: Mon, 05 Oct 2026 09:17:06 GMT`, `Cache-Control: max-age=600`, `X-Cache: MISS`, no CSP header |
| CDN lag | none. The live stamp already named MAIN, so no checkpoint was needed |

**Live stamp X:** `2026-10-05T09:16:51Z 58d8988`

Files fetched into a fresh scratch directory (`<scratchpad>/0702-live-1791192445`):
- `live.html` from `https://idbachmayer-boop.github.io/ppl-tracker/index.html?cb=<epoch>` (388139 bytes)
- `src.html` from `https://raw.githubusercontent.com/idbachmayer-boop/ppl-tracker/58d8988e…/index.html` (388126 bytes)
- `push.html` from `git show 6f53654:index.html`, as an extra cross-check

The 13-byte difference is exactly the stamp: `__BUILD_STAMP__` is 15 characters and X is 28.

Verdict from `node verdict.js 58d8988`, run with `cwd` set to the scratch directory and relative paths
only. The script extracts inline scripts with the harness regex
`/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g` and replaces the marker with a replacer function:

```json
{"ok":true,"stampOk":true,"noCsp":true,"pageEqual":true,"scriptEqual":true,"X":"2026-10-05T09:16:51Z 58d8988","markerCount":1,"liveInlineScripts":1,"srcInlineScripts":1,"liveChars":382529,"srcChars":382516,"liveCR":0,"srcEqualsPushBlob":true,"scriptHash":"sha256-Nw5jh/JeJpDSYItCr6FJJ52mvE7ySXo1646f8nZCpkU="}
```

What each field means:
- `stampOk`: exactly one `ppl-build` meta in `live.html`. Its content matches `^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ [0-9a-f]{7}$` and ends with ` 58d8988`.
- `noCsp`: `live.html` has no `http-equiv="Content-Security-Policy"`.
- `pageEqual`: `src.html` has the marker exactly once, and replacing it with X gives a page strictly equal to `live.html`.
- `scriptEqual`: one inline script in each copy, and the two are strictly equal.
- `srcEqualsPushBlob`: the raw copy at MAIN is byte-identical to PUSH's `index.html` blob, which agrees with the empty compare.
- `scriptHash`: the SHA-256 of the live inline script. It is recorded here for reference only, because 07-04's CSP commit changes the script and so its hash.

The plan's automated verify (`curl … | grep -cE '<meta name="ppl-build" content="[0-9T:Z-]+ [0-9a-f]{7}"'`)
printed `1`.

## Deviations from Plan

None. The plan ran as written. Task 3 added two read-only cross-checks the plan did not ask for: the live
response headers, and a comparison of the raw copy with the local PUSH blob. Neither changed any result.

## Requirements

None ticked, per the plan's output section. CSP-01 and CSP-06 stay open until the policy itself ships.

## Next

The D-09 gate has passed, so CSP code may now be pushed. 07-05's precondition reads this live site.

## Self-Check: PASSED

- Commit `71a139c` (Task 1 record) exists in history.
- No repo files were created or modified by this plan, so there is nothing to check on disk beyond this SUMMARY.
- MAIN `58d8988`, PR #10 and deploy run 37288941430 were each read back from GitHub in Task 3.
