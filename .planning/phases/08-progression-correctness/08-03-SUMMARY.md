---
phase: 08-progression-correctness
plan: 03
status: in-progress
subsystem: release
tags: [ship, deploy, csp, merge-commit, revert-ready, uat]
requires: [08-01, 08-02, 08-REVIEW-FIX]
provides: [pre-flight record, Ian's push/PR/merge/revert commands]
affects: [main, GitHub Pages deploy, both devices]
key-files:
  created: [.planning/phases/08-progression-correctness/08-03-SUMMARY.md]
  modified: []
decisions:
  - "Ian already had /gsd-code-review 8 and chose to fix WR-01, WR-03 and WR-04 before shipping, so Task 2's optional `hold` for a review is already satisfied. WR-02 stays open, deferred to his decision."
---

# Phase 8 Plan 03: Ship Phase 8 Summary (IN PROGRESS)

**Waiting on Ian at Task 2.** Task 1 (pre-flight) is done and green. Tasks 2 and 3 are pending. Nothing
has been pushed, merged or ticked. PROG-01..05 stay pending until the phone check passes in UAT.

## Task 1: pre-flight (done, read-only)

Run 2026-10-10 from the tip `76af74d` on `claude/gifted-goodall-706ad7`. No fetch, merge, push or stash.

| Check | Result |
|-------|--------|
| `TZ=America/Chicago npm test` | `984 passed, 0 failed, 2 skipped`, equal to the post-review-fix count (08-02 ended at 980; the WR-01/03/04 fixes added 4) |
| `npm run csp:check` | exit 0, `CSP hash OK sha256-vIizx9pDW8e7DQXXv28JrxiESnjc7wUnpzuz431d1vM=` |
| MAIN0 (`git ls-remote origin refs/heads/main`) | `f71c6e4362803c8ebe4a6c939725bf94bcd6049b` (PR #12's merge commit), unchanged since plan time |
| `git cat-file -e "$MAIN0^{commit}"` | exit 0, present locally |
| `git merge-tree --write-tree MAIN0 HEAD` | exit 0, `ee822baad24ab88c3eace832a8df82dcb09f0f6f`, equal to `HEAD^{tree}`. Merging brings nothing the branch lacks |
| `git rev-list HEAD..MAIN0` | only `f71c6e4` itself (its tree is already on the branch, planner probe 1) |
| `git diff --name-only MAIN0 HEAD` | `CLAUDE.md`, `index.html`, `test/app.test.js`, plus 152 `.planning/` paths. Nothing else |
| Remote branch `refs/heads/claude/gifted-goodall-706ad7` | `bf0bc94`, an ancestor of HEAD (`merge-base --is-ancestor` exit 0), so the push fast-forwards |
| Live page (signed-out GET, 2026-10-10T12:24Z) | ppl-build stamp `2026-10-09T12:45:12Z f71c6e4`, the current `main`. This is the build a revert returns to |
| `node scripts/csp-hash.js --check` on the live page | exit 0, `CSP hash OK sha256-Nw5jh/JeJpDSYItCr6FJJ52mvE7ySXo1646f8nZCpkU=` |
| New helpers in the live script (`addWeightVerdict`, `lastAttemptEntry`, `stallStreak`, `compareSessions`) | 0, as expected before the deploy. Task 3 expects 4 after it |

The downloaded page sits in the session scratchpad (`live-preflight-0803-1791635071/live.html`) and is
not committed.

## Commands for Ian (Task 2)

Run from this worktree, `C:\Users\idbac\Projects\ppl-tracker\.claude\worktrees\gifted-goodall-706ad7`.

1. Review: already done. `/gsd-code-review 8` ran, and WR-01, WR-03 and WR-04 are fixed
   (`08967bc`, `c6333ee`, `ccbd4d0`, see 08-REVIEW-FIX.md). One review item stays open: **WR-02**
   (total reps compared when the set count changed, so removing a set reads as flat and adding one
   reads as progress). It is deferred to your product call and does not block shipping.
2. Push and open the PR:

   ```bash
   git push origin HEAD
   gh pr create --base main --head claude/gifted-goodall-706ad7 --title "Phase 8: add-weight and stall advice follow what was lifted (PROG-01..05)" --body '- Add weight now needs every set done at the working weight and at the top of the rep range. A skipped or blank set blocks it.
   - Stall means 3 sessions in a row without +1 total rep or more weight, each compared with the one before, per workout and slot by exercise identity, bodyweight included.
   - Sessions finished from now on carry an additive blankSets count. There is no migration and no SCHEMA change.
   - Merge with a merge commit only. The revert if anything breaks is git revert -m 1 --no-edit <MERGE> on main, then push.

   🤖 Generated with [Claude Code](https://claude.com/claude-code)'
   ```

3. When CI's `test` job is green, merge with **Create a merge commit**. Never squash or rebase.
4. Wait for the `deploy` job. Its step **"Check the published script still matches its CSP hash"** must
   pass (it runs after "Stamp build" and before anything is uploaded). If it fails, nothing was
   published: reply `deploy check failed`.
5. Reply `deployed`.

**Revert, kept ready** (on a blank app, wrong advice or a sync error, push it at once and diagnose
afterwards, never hotfix forward). MERGE is the PR's merge commit sha:

```bash
git switch main
git pull --ff-only
git revert -m 1 --no-edit <MERGE>
git push origin main
```

Rows finished on the new build keep `blankSets`, which the reverted build ignores, so a revert loses no
data.

## Pending

- **Task 2** (`checkpoint:human-action`, `gate="blocking-human"`): Ian pushes, opens the PR, merges with
  a merge commit and waits for the deploy. Resume signal: `deployed`, `hold` (with the reason) or
  `deploy check failed`.
- **Task 3** (after `deployed`): confirm MAIN has two parents and record it as MERGE; download the live
  page; its stamp ends with MAIN's sha7, `--check` exits 0 and the helper grep prints 4; record the
  phone workout (the lateral-raise card, a skipped or blank set, bodyweight at the top) as the
  end-of-phase UAT item.

## Deviations from Plan

None. Task 1 ran as written. The orchestrator's note that the code review already happened replaces the
"reply `hold` for a review" option with the WR-02 note above.

## Self-Check: PASSED

- `.planning/phases/08-progression-correctness/08-03-SUMMARY.md` exists (this file).
- Tip `76af74d` and MAIN0 `f71c6e4` both exist locally.
