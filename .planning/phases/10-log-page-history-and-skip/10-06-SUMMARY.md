---
phase: 10-log-page-history-and-skip
plan: 06
subsystem: release
tags: [ship, deploy, gap-closure, G-10-5, csp, rollback]
status: complete
uat_pending: "UAT test 5 again on Ian's phone (the two-row Log card header, the open history panel, a skipped card, and the screens the global icon fix touched). G-10-5 and Phase 10 close when it passes."
requires: [10-05]
provides: [G-10-5 live on main as PR #16, merge commit 5375e10, live build verified, phone re-check of UAT test 5 queued]
affects: [main, GitHub Pages (render only; no data, no SCHEMA, no sync path)]
tech-stack:
  added: []
  patterns: []
key-files:
  created: [.planning/phases/10-log-page-history-and-skip/10-06-SUMMARY.md]
  modified: [.planning/ROADMAP.md, .planning/STATE.md]
decisions:
  - "G-10-5 shipped as PR #16, merge commit 5375e10 on main. Revert: git revert -m 1 --no-edit 5375e10129803c3a7f6b41ba948839c224708afb. Render-only: the old header and icon layout come back exactly, with no data change, no sync pause and nothing to do first in an open workout."
  - "The phone re-check of UAT test 5 is not claimed. It is queued as the end-of-phase human verification; the vault changelog waits for it."
metrics:
  duration: "~10 min executor (spans 2026-10-31..2026-11-11, waiting on Ian's merge)"
  completed: 2026-11-11
  completed_tasks: 3
  total_tasks: 3
actuals:
  tokens: 4000
  tasks: 3
  commits: 1
---

# Phase 10 Plan 06: Ship G-10-5 Summary

The G-10-5 fix (two-row Log card header, Phosphor icons inline app-wide) is live on `main` as PR #16,
merge commit `5375e10`. The published page carries the stamp `2026-11-11T13:02:19Z 5375e10`, passes
the CSP check with the branch tip's hash, declares SCHEMA 19, and carries both parts of the fix: the
`.ph` inline-block rule and the `ex-targets` row. UAT test 5 on Ian's phone is queued as the
end-of-phase human verification. It has not been run, and nothing here claims it passed.

## Task 1: pre-flight (done, read-only, no commit of its own)

Run on tip `4624870`, clean tree.

| Check | Result |
|-------|--------|
| Precondition | 10-05-SUMMARY.md exists, self-check passed, with the 380/412px render table and the every-screen icon sweep inside tolerance. |
| `TZ=America/Chicago npm test` | 1250 passed, 0 failed, 2 skipped (10-05's final count: 1250) |
| `npm run csp:check` | exit 0, `CSP hash OK sha256-rEEv9FykoHBjAb6rlYI/lb5nNl6tKlDgFr/EKI2vJ1s=` |
| `grep -c "^const SCHEMA = 19;" index.html` | 1 |
| MAIN0 (`git ls-remote origin refs/heads/main`) | `9a4e6471ad7901317b4be095e4aea17e2b3e9571`, the PR #15 merge (Phase 10) |
| `git cat-file -e MAIN0^{commit}` | exit 0 |
| `git merge-tree --write-tree MAIN0 HEAD` | `d8d6c2da614097ad967ee777db6892827102d31e`, equal to `HEAD^{tree}` |
| `git diff --name-only MAIN0 HEAD` | index.html, test/app.test.js, and 10 `.planning/` paths only. No test/harness.js, merge-golden.json, sw.js or CLAUDE.md. |
| BR / remote branch | `claude/bold-mcclintock-f1c7e4`; remote head `c6a157d` is an ancestor of HEAD, so the push fast-forwarded. |
| Previous live build (what a revert returns to) | stamp `2026-10-20T13:55:20Z 9a4e647`, `const SCHEMA = 19;`, `node scripts/csp-hash.js --check` exit 0 (`sha256-YqyU1GkbjGfE6MvOw4GtpHimhDverzR/ZJysw4nOlO8=`). |

## Ian's commands, as handed over at Task 2

```bash
git push origin HEAD
gh pr create --base main --head claude/bold-mcclintock-f1c7e4 \
  --title "Phase 10 gap G-10-5: two-row Log card header, icons inline" --body "<four points below>"
```

The PR body as it landed on #16:

- Each Log card header is now two rows: the muscle / movement / how-to line with skip and collapse as
  a pair at the right edge, over the per-set skip and × icons; and the rep-range badge with
  ⬆ Add weight beside it.
- Icons across the app now sit inline beside their labels instead of on a line of their own. The
  charts are unchanged.
- A layout fix only. SCHEMA stays 19, and no data changes.
- Merge with a merge commit only, never squash or rebase. The rollback follows.

Then: wait for CI's `test` job, merge with **Create a merge commit**, and wait for the `deploy` job,
whose step "Check the published script still matches its CSP hash" must pass.

### Rollback, kept ready (MERGE = 5375e10)

```bash
git switch main
git pull --ff-only
git revert -m 1 --no-edit 5375e10129803c3a7f6b41ba948839c224708afb
git push origin main
```

In plain words: it puts back the previous header and icon layout exactly (build `9a4e647`'s). No data
changes, sync never pauses, and there is nothing to do first in an open workout. Revert from an
up-to-date `main`, push at once, then diagnose. Never hotfix forward in a panic.

## Task 2: push, PR, merge, deploy (done)

- On Ian's "push it", the orchestrator ran `git push origin HEAD` (`c6a157d..4624870`) and opened
  PR #16, https://github.com/idbachmayer-boop/ppl-tracker/pull/16 (created 2026-10-31T14:20:48Z,
  head `4624870`). CI's `test` job passed.
- Ian merged with a merge commit at 2026-11-11T13:01:44Z. His reply: "ok I think I did it".
- `gh pr view 16`: MERGED, merge commit `5375e10129803c3a7f6b41ba948839c224708afb`, parents `9a4e647`
  (old `main`) and `4624870` (the branch tip).
- Deploy run 43025439049 on `5375e10`: success. Job `test` success (Run checks); job `deploy` success,
  with "Stamp build", "Check the published script still matches its CSP hash" and "Deploy to GitHub
  Pages" all passing, so the CSP check ran before anything was published.

## Task 3: live check (done) and phone re-check (queued)

Run once at 2026-11-11T13:05Z, without polling: a signed-out GET with a cache-buster into a fresh
scratchpad directory (`live-10-06-t3-*`, never committed). The orchestrator's earlier run got the same
results.

| Check | Result |
|-------|--------|
| MAIN (`git ls-remote origin refs/heads/main`) | `5375e10129803c3a7f6b41ba948839c224708afb` = MERGE |
| `gh api …/commits/MAIN --jq '.parents\|length'` | `2` (a merge commit) |
| Live ppl-build stamp | `2026-11-11T13:02:19Z 5375e10`, ends with MAIN's sha7 |
| `node scripts/csp-hash.js --check live.html` | exit 0, `CSP hash OK sha256-rEEv9FykoHBjAb6rlYI/lb5nNl6tKlDgFr/EKI2vJ1s=` (the tip's hash) |
| `grep -c '^const SCHEMA = 19;'` | `1` (line 498) |
| `grep -cE '^\s*\.ph \{[^}]*display: *inline-block'` | `1` |
| `grep -c 'class="ex-targets"'` | `1` |

No check failed, so there is no REVERT NOW line.

### UAT item (pending, end of phase): UAT test 5 again on Ian's phone

Not run. Only Ian's Android PWA at about 380-412px, with its own fonts and his real exercise names,
can judge this layout.

**Before anything else:** Settings → This version must end with `5375e10`. If it still shows
`9a4e647` after 15 minutes and a full close and reopen, wait. Never judge on the old build.

Then, on the Log tab during a workout (or start one, look, and Discard):

| # | Step | Expected |
|---|------|----------|
| 1 | Look at three card headers: one showing ⬆ Add weight, one without it, and a LEGS card with the long "DB-only" note if that workout is handy. | Each header is two rows. Row 1 is "Muscle · Movement · how-to" with its arrow icon on the same line, and skip + collapse as a pair at the right edge, above the per-set skip and × icons. Row 2 is the rep-range badge with "⬆ Add weight …" beside it, or tucked neatly under it when long, left-aligned. No icon alone on a line; nothing cut off. |
| 2 | Tap "Last time" on one card. | The history panel opens under the line; the caret sits at the end of the Last time text. |
| 3 | Skip one set with a reason. | "Set N skipped: reason" has its icon right before the text, on one line with Undo on the right. |
| 4 | Tap the header skip icon on another card, then Undo. | The skipped card is one line with Undo on the right; Undo brings back the full two-row card. |
| 5 | Fill in every set on one card. | The skip icon disappears; the collapse icon stays exactly where it was. |
| 6 | Glance at the Warm-up ramp toggle, the stopwatch "Rest" label, Workout history with one workout opened (Edit workout), Progress → Strength and the Weight chart, and Settings (Recently deleted, Version history). | Every icon sits beside its label with a small gap; the charts look as before. |

**If something looks off but the app works:** note it as a new cosmetic issue for another gap closure,
not a revert. **If the app is blank or a workout is broken:** run the rollback above from an
up-to-date `main` and push at once, then diagnose.

**On pass:** UAT test 5 flips to pass, then close Phase 10 through `/gsd-verify-work 10` and write the
follow-ups below.

## Follow-ups (after the phone check passes, not before)

Append one dated changelog entry to Ian's live vault note
`C:\Main Vault\50-59 Projects & Events\53. Software Projects\PPL Tracker App.md`, written for a human
skimming later. Phase 10's own entry was deferred in 10-04, so it covers:

- tapping an exercise's "Last time" line shows its last 5 sessions right on the card, from any
  workout, with deloads, skips and PRs marked, and a link to its Strength chart that brings you back
  to the same spot;
- a whole exercise can be skipped from its card header with an optional reason, and Undo puts it back
  exactly, even after closing the app;
- a skipped exercise is saved as skipped, so the app does not suggest adding weight to it next time;
- the workout card header is tidier, in two rows, with skip and collapse paired over the set
  controls, and icons across the app now sit beside their labels.

Update that note's Current Features section with the inline history and the whole-exercise skip. Not
written in this plan, by instruction.

## Deviations from Plan

1. **Task 2 relayed by the orchestrator.** The push and PR #16 were the orchestrator's, on Ian's
   "push it"; the merge was Ian's. His reply was "ok I think I did it" rather than `deployed`, so it
   was treated as `deployed` only after the merge commit (2 parents), the green deploy run and the
   live stamp were each checked read-only. This executor pushed, merged and reverted nothing.
2. **REQUIREMENTS.md not touched.** LOG-01, LOG-03 and LOG-04 were already marked complete by
   10-01..10-03 (as in 10-04's deviation 2). They stay as they are; the phone check remains the UAT
   gate.

## Known Stubs

None. This plan changes no app file.

## Self-Check: PASSED

- This file exists. `4624870` (the checked and merged tip) is in local `git log`; `5375e10` (MERGE) is
  `main` on the remote with parents `9a4e647` and `4624870`.
- PR #16 is MERGED with merge commit `5375e10`; deploy run 43025439049 is green (test and deploy jobs,
  CSP check step included).
- The live page passes `--check` with stamp `… 5375e10`, SCHEMA 19, the `.ph` inline-block rule and
  the targets row.
- The phone re-check of UAT test 5 is recorded as pending, not as passed.
