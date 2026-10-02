---
phase: 07-content-security-policy
plan: 02
subsystem: deploy
tags: [csp, build-stamp, deploy, d-08, d-09]
status: in-progress
requires:
  - 07-01 deployable unit 6f5365419670a8c0479e40e65ff3ca0c2f924e2c
provides:
  - "(pending) the stamp move live on main by itself, confirmed on PC and phone"
affects:
  - 07-05 (its precondition reads the live site this plan verifies)
key-files:
  created: []
  modified: []
---

# Phase 7 Plan 02: Ship the stamp move alone (in progress)

> **IN PROGRESS. Task 2 is waiting on Ian.** Task 1 is done. Task 2 (`checkpoint:human-action`,
> `gate="blocking-human"`) needs Ian to push, open the PR, merge it with a merge commit, and read
> Settings → This version on both devices. Task 3 (the live byte comparison) has not run. Nothing
> is ticked. No CSP code may be pushed until Ian replies `stamp live …` (D-09).

## Task 1 results (2026-10-02T12:40:59Z)

| Item | Value |
|------|-------|
| UNIT (07-01 `Deployable unit (D-09)`) | `6f5365419670a8c0479e40e65ff3ca0c2f924e2c` |
| TIP (HEAD at check time) | `af3a4069602ecc045fb18590784ae7306bef5aef` |
| Case | **UNIT**: TIP holds `scripts/` (1 path, `scripts/csp-hash.js` from 07-03), so TIP is not stamp-only |
| PUSH | `6f5365419670a8c0479e40e65ff3ca0c2f924e2c` |
| MAIN_BEFORE (`git ls-remote origin refs/heads/main`) | `e35f560b97d4725ded7ecdcb72302e9520b64e92` |
| `origin/phase-7-build-stamp` before the push | does not exist (`git ls-remote` returned nothing) |

Checks at TIP: CSP meta count `0`, `scripts/` count `1`. That `1` is what puts this in case UNIT.

Checks at PUSH:
- `<meta name="ppl-build" content="__BUILD_STAMP__" />` count: `1`
- `http-equiv="Content-Security-Policy"` count: `0`
- `^scripts/` count: `0`
- `git diff --name-only UNIT PUSH`: empty (PUSH is UNIT)
- `git merge-base --is-ancestor UNIT HEAD`: exit 0 (precondition met)

How the PR will merge: MAIN_BEFORE is not an ancestor of PUSH, but `git log PUSH..MAIN_BEFORE` lists only
the merge commits of PRs #7, #8 and #9, and `git diff PUSH...MAIN_BEFORE` is empty. The PR merges with
no content conflict, and the merge commit's only content change is the stamp move.

The plan's automated verify printed:

```
PUSH=6f5365419670a8c0479e40e65ff3ca0c2f924e2c ok
```

The suite was green at PUSH in a fresh scratch clone
(`<scratchpad>/0702-unit-clone-1790944821`, checked out at `6f53654…`, with no `scripts/` directory), run with
`TZ=America/Chicago node test/app.test.js`. Last line:

```
896 passed, 0 failed, 2 skipped
```

The two skips are the local-only real-backup checks, which need `test/local/real-db-snapshot.json`.
That file is git-ignored and never present in a clone. The total matches 07-01's final count.

## Commands for Ian (Task 2)

Run these from any checkout of this repo. The main checkout and this worktree share objects, so the sha
resolves in either one. They work in both bash and PowerShell.

```
git push origin 6f5365419670a8c0479e40e65ff3ca0c2f924e2c:refs/heads/phase-7-build-stamp
gh pr create --base main --head phase-7-build-stamp --title "Phase 7: the build stamp moves into a meta tag (D-08, D-09)" --body 'Moves the deploy build stamp out of the inline script and into the ppl-build meta tag, so the published script is byte-identical to the repo. Stamp move only: no Content-Security-Policy, no scripts/ directory, no CSP test. Merge with a merge commit (not squash, not rebase) so this unit stays separately revertable.'
gh pr checks phase-7-build-stamp --watch
gh pr merge phase-7-build-stamp --merge
```

- Merge only after CI's `test` job is green. Use **Create a merge commit**: `--merge` on the CLI, or the
  green button's merge-commit option on the web. Never squash or rebase (T-7-07).
- Then wait for the `deploy` job on `main` to go green. Wait about 10 minutes for Pages' 600 s cache. Reload
  the app on the PC, and fully close and reopen it on the phone.
- On each device, open Settings → This version. It should read `Updated <date, time> · <sha7>`, where sha7 is
  the first 7 characters of the merge commit now at the head of `main`.
- Resume signal: `stamp live <sha7 on PC> <sha7 on phone>`, or `stamp broken` with what each device shows.
  If a device still says `Local copy, not a deployed build` after 15 minutes and a reopen, reply
  `stamp broken` and push nothing else.

## Pending (filled in by the continuation agent)

- PR number:
- MAIN (merge commit on `main`) and its parent count:
- Compare PUSH...MAIN file list:
- Ian's readings (PC, phone):
- Live stamp X:
- Task 3 verdict JSON:

## Deviations from Plan

None so far. Task 1 ran as written.
