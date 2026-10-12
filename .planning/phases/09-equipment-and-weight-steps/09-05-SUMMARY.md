---
phase: 09-equipment-and-weight-steps
plan: 05
subsystem: release
tags: [ship, deploy, schema-19, csp, rollback]
status: in-progress
waiting_on: "Ian at Task 2 (push, PR, merge with a merge commit, deploy)"
requires: [09-04, "09-REVIEW.md (iteration 3)", "09-REVIEW-FIX.md (iteration 2)"]
provides: [pre-flight record, Ian's ship and rollback commands]
affects: [main, GitHub Pages, the shared cloud copy (_schema 19 after the first sync)]
key-files:
  created: [.planning/phases/09-equipment-and-weight-steps/09-05-SUMMARY.md]
  modified: []
decisions:
  - "The review precondition counts as met: three review passes, the final verdict is nothing blocks shipping. WR-09, WR-06 and the info items stay open; Ian's push at Task 2 is his call to ship with them."
metrics:
  completed_tasks: 1
  total_tasks: 3
  date: 2026-10-12
---

# Phase 9 Plan 05: Ship Phase 9 Summary (IN PROGRESS: waiting on Ian at Task 2)

The pre-flight is green: the suite, the CSP check and SCHEMA 19 hold on the tip, merging into `main`
brings nothing the branch lacks, the push will fast-forward, and the live site is still Phase 8's
schema-18 build. Ian's commands, including the rollback and what it costs, are below.

## Task 1: pre-flight (done, read-only, no commit of its own)

| Check | Result |
|-------|--------|
| Review precondition | 09-REVIEW.md exists (iteration 3, `blocking_for_ship: 0`). 09-REVIEW-FIX.md: iteration 1 fixed CR-01 and WR-01..05, iteration 2 fixed WR-07, WR-08, IN-02 and IN-09 (10 in scope, 10 fixed, 0 skipped). |
| Still open, none blocking | WR-09 (new in iteration 3), WR-06 (Ian excluded it: kg only, he logs lb), IN-01, IN-03..06, IN-08, IN-10, IN-11 (the last two new in iteration 3). |
| `TZ=America/Chicago npm test` | 1136 passed, 0 failed, 2 skipped (09-04 and the iteration-2 fix report: 1136) |
| `npm run csp:check` | exit 0, `CSP hash OK sha256-c21XVzCcRwMep642eFzbjNWAsgtThZ09OcXShNXTUM8=` |
| `grep -c "^const SCHEMA = 19;" index.html` | 1 |
| MAIN0 (`git ls-remote origin refs/heads/main`) | `99e10c8b7e46b0fc507aced553c7dbb8dcbdafb4`, the PR #13 merge (Phase 8) |
| `git cat-file -e MAIN0^{commit}` | exit 0 |
| `git merge-tree --write-tree MAIN0 HEAD` | exit 0, tree `92806d6b0621ca8059b9dbb0c5a493dcfb1b3dec`, equal to `HEAD^{tree}` at 974d962 |
| `git diff --name-only MAIN0 HEAD` | CLAUDE.md, index.html, test/app.test.js, test/fixtures/merge-golden.json, test/harness.js, plus 26 `.planning/` paths. Nothing else. |
| BR / remote branch | `claude/gifted-goodall-706ad7` / `8221d92`, an ancestor of HEAD (`--is-ancestor` exit 0), 46 commits behind before this SUMMARY. `git push origin HEAD` fast-forwards. |
| Previous live build (what a revert returns to) | stamp `2026-10-10T12:42:16Z 99e10c8`, `const SCHEMA = 18;`, `node scripts/csp-hash.js --check` exit 0 (`sha256-vIizx9pDW8e7DQXXv28JrxiESnjc7wUnpzuz431d1vM=`). Downloaded to a fresh scratchpad directory, never committed. |
| Deploy workflow | job `test` (step "Run checks"), then job `deploy` with "Stamp build" and "Check the published script still matches its CSP hash" before "Deploy to GitHub Pages". |

These checks ran on 974d962. This SUMMARY's commit adds one `.planning/` file and changes no app file,
so the suite and CSP results carry over; merge-tree equality was re-run after the commit (see Self-Check).

**CLAUDE.md change in this phase:** the "Deletes are soft" rule gains a passage on the exercise
registry: it merges per row since Phase 9, `exMerge` tombstones the merged-away row and never splices it
out, a tombstone beats a live copy of the same id, and two live rows never share an alias (an `autoMerged`
tombstone is recomputed on every merge). It started as one sentence; iterations 1 and 2 rewrote it, and it
is now about six sentences in the same paragraph.

## Ian's commands (Windows PowerShell)

Run from the session worktree:

```powershell
cd C:\Users\idbac\Projects\ppl-tracker\.claude\worktrees\gifted-goodall-706ad7
git push origin HEAD

$body = @'
Phase 9: equipment types and weight steps (EQUIP-01..06).

- Every exercise gets one synced equipment type (barbell, EZ bar, dumbbell, machine, cable or bodyweight), defaulted from its name by migration 19 (SCHEMA 18 -> 19), changeable in Settings -> Exercises, and asked once for a brand-new name.
- Add weight, deload, warm-up and suggest steps follow the type: dumbbells 2.5 lb up to 60, then 5; cable 2.5; barbell, EZ bar and machine 5; bodyweight shows no number; kg is a flat 2.5.
- Preacher curl gets EZ-bar plate math.
- The exercise registry now merges per row, with an equipment clock and soft-deleted (tombstoned) merges.
- Merge with a merge commit only. Never squash or rebase: the whole phase must stay one revertable merge commit.

Rollback: git revert -m 1 <merge sha> on main, then push. Its cost: once this build has run on a device and synced, the cloud copy is at schema 19. A revert brings the old app back and keeps every device's logged data, but every device on the old build shows Update this device to sync and syncs nothing until a build at SCHEMA 19 or later ships. If the app comes up blank, the new script never ran, nothing migrated, and the revert is clean.

Checks on the tip: npm test 1136 passed, 0 failed, 2 skipped. csp:check OK. Code review ran three times; nothing blocks shipping (WR-09, WR-06 and the info items stay open).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
'@

gh pr create --base main --head claude/gifted-goodall-706ad7 --title "Phase 9: equipment types and weight steps (EQUIP-01..06)" --body $body
```

The `'@` that closes the here-string must sit at the very start of its line. The body has no double
quotes on purpose: Windows PowerShell mangles them when it passes an argument to `gh`.

Then, on GitHub: wait for the `test` job to go green, merge with **Create a merge commit** (never
squash, never rebase), and wait for the `deploy` job. Its step "Check the published script still
matches its CSP hash" must pass; if it fails, nothing was published.

The merge commit's sha (MERGE), once merged. Use the PR number `gh pr create` printed: this branch
also carries the merged PR #13, so a bare `gh pr view` could pick the wrong one.

```powershell
gh pr view <PR number> --json mergeCommit --jq .mergeCommit.oid
```

### Rollback, kept ready

```powershell
cd C:\Users\idbac\Projects\ppl-tracker\.claude\worktrees\gifted-goodall-706ad7
git switch main
git pull --ff-only
git revert -m 1 --no-edit <MERGE>
git push origin main
```

What it costs, in plain words: once the new build has opened on any device and synced, the cloud copy
is at schema 19. Reverting brings the old app back and keeps everything logged on every device, but
every device on the old build shows "Update this device to sync" and syncs nothing until a build at
schema 19 or later ships. If the app comes up blank (a CSP failure), the new code never ran, nothing
migrated, and the revert is clean.

## Task 2: Ian's push and merge (WAITING)

Checkpoint `checkpoint:human-action`, `gate="blocking-human"`, rated one-way. Resume signal: `deployed`,
`hold` (with the reason) or `deploy check failed`. Not yet replied.

## Task 3: live check and phone UAT (NOT STARTED)

Runs after `deployed`: MAIN must have two parents, the live page must pass `--check`, its stamp must end
with MAIN's sha7, and it must declare SCHEMA 19 and the four helpers. The phone workout and the
cross-device type change stay queued as end-of-phase UAT. EQUIP-01..06 are not ticked until Ian reports
the phone check passed.

## Deviations from Plan

None. Task 1 ran as written. One note: the plan expects no open finding "without Ian's call". WR-09,
IN-10 and IN-11 are new in iteration 3, so Ian has not ruled on them yet. The review marks all three
non-blocking, and Task 2's push is where Ian makes that call; the checkpoint message says so.

## Known Stubs

None. This plan changes no app file.

## Self-Check: PASSED

- This file exists; 974d962 (the checked tip) is in `git log`.
- After committing this file: `git merge-tree --write-tree MAIN0 HEAD` still equals `HEAD^{tree}`, the
  diff from MAIN0 still lists only the allowed paths, `index.html` is unchanged since 974d962, and the
  remote branch head is still an ancestor of HEAD.
