---
phase: 10-log-page-history-and-skip
plan: 04
subsystem: release
tags: [ship, deploy, schema-19, csp, rollback]
status: complete
uat_pending: "The real workout on Ian's phone (history, chart and return, skip through a restart, no Add weight next time, the ~380px header). LOG-01..05 close at UAT."
requires: [10-03, "10-REVIEW.md", "10-REVIEW-FIX.md (all_fixed: WR-01..03)"]
provides: [Phase 10 live on main as PR #15, merge commit 9a4e647, live build verified, phone UAT queued]
affects: [main, GitHub Pages, the shared cloud copy (skip fields in synced sessions once a skipped workout is finished)]
tech-stack:
  added: []
  patterns: []
key-files:
  created: [.planning/phases/10-log-page-history-and-skip/10-04-SUMMARY.md]
  modified: [.planning/ROADMAP.md, .planning/STATE.md]
decisions:
  - "Phase 10 shipped as PR #15, merge commit 9a4e647 on main. Revert: git revert -m 1 --no-edit 9a4e647; SCHEMA stays 19, so there is no sync pause and no logged row is lost, but Undo or finish any open skipped exercise first."
  - "The phone workout is not claimed. It is queued as the end-of-phase UAT item (human_verify_mode: end-of-phase); LOG-01..05 close there."
metrics:
  duration: "~17 min (incl. Ian's push, PR, CI, deploy)"
  completed: 2026-10-20
  completed_tasks: 3
  total_tasks: 3
actuals:
  tokens: 5000
  tasks: 3
  commits: 1
---

# Phase 10 Plan 04: Ship Phase 10 Summary

Phase 10 is live on `main` as PR #15, merge commit `9a4e647`. The published page carries the build
stamp `2026-10-20T13:55:20Z 9a4e647`, passes the CSP check with the same hash as the branch tip,
declares SCHEMA 19 and contains all six of the phase's marker functions. The real workout on Ian's
phone is queued as the end-of-phase UAT, with the revert and its one caveat below. It has not been
run, and nothing here claims it passed.

## Task 1: pre-flight (done, read-only, no commit of its own)

| Check | Result |
|-------|--------|
| Review precondition | 10-REVIEW.md exists (e2bc23a). 10-REVIEW-FIX.md: status `all_fixed`, 3 fixed, 0 skipped (WR-01 b22496b, WR-02 e9f4caa, WR-03 d410e44; report 0c765f0). |
| Still open, none blocking | IN-01..04, accepted by Ian. Ian also approved keeping WR-03's `exSkip` / `skipClearedDeload` entry fields. |
| Tip | 0c765f0, clean tree |
| `TZ=America/Chicago npm test` | 1245 passed, 0 failed, 2 skipped (10-03 ended at 1240) |
| `npm run csp:check` | exit 0, `CSP hash OK sha256-YqyU1GkbjGfE6MvOw4GtpHimhDverzR/ZJysw4nOlO8=` |
| `grep -c "^const SCHEMA = 19;" index.html` | 1 |
| MAIN0 (`git ls-remote origin refs/heads/main`) | `8a20832d16d29f3dbb18f1373ed9c210a1a40b17`, the PR #14 merge (Phase 9) |
| `git cat-file -e MAIN0^{commit}` | exit 0 |
| `git merge-tree --write-tree MAIN0 HEAD` | tree `74db6ab8b837d99801d267fcbc93951d362d172f`, equal to `HEAD^{tree}`. MAIN0 is not an ancestor of HEAD (expected, planner probe 1); the branch was 31 commits ahead. |
| `git diff --name-only MAIN0 HEAD` | CLAUDE.md, index.html, test/app.test.js, test/harness.js, plus 25 `.planning/` paths. `test/fixtures/merge-golden.json` absent. |
| BR / remote branch | `claude/bold-mcclintock-f1c7e4`, not on the remote yet (the push created it); no existing PR. |
| Previous live build (what a revert returns to) | stamp `2026-10-12T18:58:25Z 8a20832`, `const SCHEMA = 19;` (line 485), `node scripts/csp-hash.js --check` exit 0 (`sha256-c21XVzCcRwMep642eFzbjNWAsgtThZ09OcXShNXTUM8=`), phase-helper grep 0 (tip: 6). Downloaded to a fresh scratchpad directory, never committed. |

## Ian's commands, as handed over at Task 2

```bash
git push origin HEAD
gh pr create --base main --head claude/bold-mcclintock-f1c7e4 \
  --title "Phase 10: log page history and skip (LOG-01..05)" --body "<five points below>"
```

The PR body as it landed on #15:

- Tapping an exercise's Last time line shows its last 5 sessions from any workout, with deload, skip
  and PR markers, and a link to its Strength chart.
- Back to workout, or Train -> Log, returns to the same scroll spot with the panel still open.
- Each card has a skip button for the whole exercise, with an optional reason and an exact Undo that
  survives a reload.
- A skipped exercise is saved as skipped, so the next card offers no Add weight, and Workout history
  and the next Last time line say why.
- SCHEMA stays 19. Merge with "Create a merge commit" only, never squash or rebase. The rollback and
  its caveat follow.

Then: wait for CI's `test` job to go green, merge with **Create a merge commit** (never squash, never
rebase), and wait for the `deploy` job. Its step "Check the published script still matches its CSP
hash" must pass; if it fails, nothing was published.

### Rollback, kept ready (MERGE = 9a4e647)

```bash
git switch main
git pull --ff-only
git revert -m 1 --no-edit 9a4e6471ad7901317b4be095e4aea17e2b3e9571
git push origin main
```

What it costs, in plain words:

- **No sync pause, and every logged row stays.** SCHEMA is still 19, so a reverted build keeps syncing.
- **Finished skips keep their fields.** A session already finished with a skipped exercise keeps
  `skipped` and `reason` (and WR-03's `exSkip` / `skipClearedDeload`). The Phase 9 app ignores them,
  shows each skipped set as "skip", and still holds back ⬆ Add weight through the per-set flags.
- **Undo or finish any skipped exercise in an open workout before reverting.** Otherwise the old app's
  finishWorkout copies the draft-only `_preSkip` snapshot into that session when it is finished:
  harmless and read by nothing, but permanent.

Revert from an up-to-date `main`, push at once, then diagnose. Never hotfix forward in a panic.

## Task 2: Ian's push and merge (done)

Ian's reply: `deployed`.

- The branch was pushed and PR #15 opened, https://github.com/idbachmayer-boop/ppl-tracker/pull/15
  (created 2026-10-20T13:45:33Z, head `0c765f0`).
- CI's `test` job went green, and Ian merged with a merge commit (`gh pr merge 15 --merge`) at
  2026-10-20T13:54:49Z.
- `gh pr view 15` shows MERGED with merge commit `9a4e6471ad7901317b4be095e4aea17e2b3e9571`, parents
  `8a20832` (old `main`) and `0c765f0` (the branch tip).
- Deploy run 39434541054 on `9a4e647` concluded success: job `test` success, job `deploy` success.
  Its "Stamp build", "Check the published script still matches its CSP hash" and "Deploy to GitHub
  Pages" steps all passed, so the CSP check ran before anything was published.

## Task 3: live check (done) and phone UAT (queued)

Run once at 2026-10-20T13:57Z, without polling, into a fresh scratchpad directory
(`10-04-task3-live-*`, never committed). A signed-out GET with a cache-buster.

| Check | Result |
|-------|--------|
| MAIN (`git ls-remote origin refs/heads/main`) | `9a4e6471ad7901317b4be095e4aea17e2b3e9571` = MERGE |
| `gh api …/commits/MAIN` parents | `2`: `8a20832d…`, `0c765f0e…` (a merge commit) |
| Live ppl-build stamp | `2026-10-20T13:55:20Z 9a4e647`, ends with MAIN's sha7 `9a4e647` |
| `node scripts/csp-hash.js --check live.html` | exit 0, `CSP hash OK sha256-YqyU1GkbjGfE6MvOw4GtpHimhDverzR/ZJysw4nOlO8=` (the same hash as the branch tip) |
| `grep -c '^const SCHEMA = 19;'` | `1` (line 492) |
| `grep -cE '^function (skipExercise\|unskipExercise\|skipNoteHTML\|exerciseRecent\|openExerciseChart\|landingY)\('` | `6` |

No check failed, so there is no REVERT NOW line.

### UAT item (pending, end of phase): a real workout on Ian's phone

Not run. It needs Ian's real training history, the deployed PWA on his Android phone, a real close
and reopen of the installed app, a real scroll position and a ~380px screen.

**Before anything else:** Settings → This version must end with `9a4e647`. If it still shows the
older build (`8a20832`) after 15 minutes and a full close and reopen, wait. Never judge on the old
build.

| # | Step | Expected |
|---|------|----------|
| 1 | Tap the "Last time" line on one exercise, then on a second one. Read the rows. | A panel opens under the line with up to 5 rows, newest first, each with a date, a workout name such as "PUSH 1" and the sets. Deloads show "↓ deload", skips show "skipped" or "skip", PRs show 🏆, notes sit on their own line. Opening the second card's history closes the first. |
| 2 | Collapse one other card with its caret. Scroll so the card with the open history is mid-screen, and tap "Full chart in Strength". | Strength opens with that exercise already chosen, and "Back to workout" sits at the top. |
| 3 | Tap "Back to workout". | Back on the Log tab at the same scroll spot, that panel still open, the collapsed card still collapsed, every number unchanged. |
| 4 | Repeat step 2, then come back with Train → Log instead. | The same as step 3. |
| 5 | On one exercise, log one set, tap the skip icon in its header (left of the caret), and type a reason. | The card shrinks to one line: "{name} · {your set} · rest skipped: {reason}", with Undo on the right. |
| 6 | Fully close the app (swipe it away) and reopen it. | The card is still that one line. |
| 7 | Tap Undo on that card, check the weights, then skip it again with the same reason. | The card comes back with the set you logged and the weights that were there before. Skipping again gives the same one line. |
| 8 | Finish the workout, then open it in Workout history. | It saves normally. Workout history shows "{name} — {set} · rest skipped: {reason}". |
| 9 | The next time that workout comes up (or start it now, look, and Discard), look at that exercise's card. | No ⬆ Add weight on that card. The Last time line shows the last real numbers, with "Rest skipped {date}: {reason}" under them. |
| 10 | Look at a card header on the phone. | The skip icon and the caret sit side by side without crowding the rep-range badge or the ⬆ Add weight flag. |

**If only the scroll in step 3 or 4 lands at the top,** note it: that is RESEARCH assumption A1, and
the follow-up is a deferred scroll, not a revert.

**On failure** (a blank app, a lost workout, or sync errors): first Undo or finish any skipped exercise
in an open workout, then run the revert above from an up-to-date `main` and push at once, then
diagnose. Sync keeps working after the revert, and logged data stays on each device.

**On pass:** close Phase 10 through `/gsd-verify-work 10`, then write the vault follow-ups below.

## Follow-ups (after the phone check passes, not before)

Append a dated changelog entry to Ian's live vault note
`C:\Main Vault\50-59 Projects & Events\53. Software Projects\PPL Tracker App.md`, written for a
human skimming later:

- tapping an exercise's "Last time" line shows its last 5 sessions right on the card, from any
  workout, with deloads, skips and PRs marked, and a link to its Strength chart that brings you back
  to the same spot;
- a whole exercise can be skipped from its card header with an optional reason, and Undo puts it back
  exactly, even after closing the app;
- a skipped exercise is saved as skipped, so the app does not suggest adding weight to it next time,
  and Workout history and the next Last time line say why.

Update that note's Current Features section with the inline history and the whole-exercise skip,
because both change how the workout card works. Not written in this plan, by instruction.

## Deviations from Plan

1. **Task 2 as relayed by the orchestrator.** The push, PR #15 and CI result are recorded as the
   orchestrator reported them; the merge was Ian's, with `gh pr merge 15 --merge`, a merge commit as
   required. Every fact above was re-checked read-only (`git ls-remote`, `gh pr view`, `gh run view`,
   `gh api`). This executor pushed, merged and reverted nothing.
2. **REQUIREMENTS.md not touched.** The plan says to tick LOG-01..05 only after the phone check.
   10-01..10-03 had already marked all five complete (checkboxes and traceability rows). They stay as
   they are, and the phone check remains the UAT gate for Phase 10, as in 09-05.
3. **A first Task 3 command aborted before downloading anything.** A `gh api --jq` expression mixed a
   number and an array in one output and errored, which short-circuited the `&&` chain before the
   `curl`. It was rerun once with a corrected expression; every result above is from that rerun. No
   polling, and the fetch is still a single signed-out GET.

## Known Stubs

None. This plan changes no app file.

## Self-Check: PASSED

- This file exists. 0c765f0 (the checked and merged tip) and 9a4e647 (MERGE) are both known:
  0c765f0 is in local `git log`, and 9a4e647 is `main` on the remote with parents 8a20832 and 0c765f0.
- PR #15 is MERGED with merge commit 9a4e647; deploy run 39434541054 is green (test and deploy jobs).
- The live page passes `--check` with stamp `… 9a4e647`, SCHEMA 19 and the 6 functions.
- The phone workout is recorded as pending UAT, not as passed.
