---
phase: 09-equipment-and-weight-steps
plan: 05
subsystem: release
tags: [ship, deploy, schema-19, csp, rollback]
status: complete
uat_pending: "The real workout on Ian's phone, the cross-device equipment change, and the ~380px layout backstop (below). EQUIP-01..06 close at UAT."
requires: [09-04, "09-REVIEW.md (iteration 3)", "09-REVIEW-FIX.md (iteration 2)"]
provides: [Phase 9 live on main as PR #14, merge commit 8a20832, live build verified, phone UAT queued]
affects: [main, GitHub Pages, the shared cloud copy (_schema 19 after the first sync)]
tech-stack:
  added: []
  patterns: []
key-files:
  created: [.planning/phases/09-equipment-and-weight-steps/09-05-SUMMARY.md]
  modified: [.planning/ROADMAP.md, .planning/STATE.md]
decisions:
  - "The review precondition counts as met: three review passes, the final verdict is nothing blocks shipping. WR-09, WR-06 and the info items stay open; Ian shipped with them open."
  - "Phase 9 shipped as PR #14, merge commit 8a20832 on main. Revert: git revert -m 1 --no-edit 8a20832; after schema 19 reaches the cloud, that keeps all data but pauses sync until a 19+ build ships."
metrics:
  duration: "~25 min (incl. Ian's push, PR, CI, deploy)"
  completed: 2026-10-12
  completed_tasks: 3
  total_tasks: 3
actuals:
  tokens: 4500
  tasks: 3
  commits: 2
---

# Phase 9 Plan 05: Ship Phase 9 Summary

Phase 9 is live on `main` as PR #14, merge commit `8a20832`. The published page carries the build
stamp `2026-10-12T18:58:25Z 8a20832`, passes the CSP check, declares SCHEMA 19 and contains the four
new functions. The real workout on Ian's phone and the cross-device equipment change are queued as
the end-of-phase UAT, with the revert and its schema-19 cost below.

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

## Ian's commands (Windows PowerShell), as handed over at Task 2

At Ian's request the orchestrator ran the equivalent of these (Task 2). They stay here for the record.

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

### Rollback, kept ready (MERGE = 8a20832)

```powershell
cd C:\Users\idbac\Projects\ppl-tracker\.claude\worktrees\gifted-goodall-706ad7
git switch main
git pull --ff-only
git revert -m 1 --no-edit 8a20832d16d29f3dbb18f1373ed9c210a1a40b17
git push origin main
```

What it costs, in plain words: once the new build has opened on any device and synced, the cloud copy
is at schema 19. Reverting brings the old app back and keeps everything logged on every device, but
every device on the old build shows "Update this device to sync" and syncs nothing until a build at
schema 19 or later ships. If the app comes up blank (a CSP failure), the new code never ran, nothing
migrated, and the revert is clean. Revert from an up-to-date `main`, push at once, then diagnose.
Never hotfix forward in a panic.

## Task 2: Ian's push and merge (done)

Ian's reply amounted to `deployed`. At his request the orchestrator ran the commands for him:

- pushed the branch, `8221d92..297bb34` (a fast-forward, as the pre-flight predicted);
- opened PR #14, https://github.com/idbachmayer-boop/ppl-tracker/pull/14;
- waited for the `test` job to go green;
- merged with a merge commit, `gh pr merge 14 --merge --match-head-commit 297bb34…`, at
  2026-10-12T18:57:53Z.

`gh pr view 14` shows MERGED with merge commit `8a20832d16d29f3dbb18f1373ed9c210a1a40b17`.
`gh run list --branch main --limit 1` shows run 38294448470 ("Deploy to GitHub Pages", Merge pull
request #14) completed with success. Its test and deploy jobs both succeeded, so the deploy's
"Check the published script still matches its CSP hash" step passed before anything was published.

## Task 3: live check (done) and phone UAT (queued)

Run once, without polling, into a fresh scratchpad directory (`live-0905-task3-*`, never committed):

| Check | Result |
|-------|--------|
| MAIN (`git ls-remote origin refs/heads/main`) | `8a20832d16d29f3dbb18f1373ed9c210a1a40b17` = MERGE |
| `gh api …/commits/MAIN --jq '.parents\|length'` | `2` (a merge commit) |
| Live ppl-build stamp | `2026-10-12T18:58:25Z 8a20832`, ends with MAIN's sha7 |
| `node scripts/csp-hash.js --check live.html` | exit 0, `CSP hash OK sha256-c21XVzCcRwMep642eFzbjNWAsgtThZ09OcXShNXTUM8=` (the same hash as the branch tip) |
| `grep -c '^const SCHEMA = 19;'` | `1` |
| `grep -cE '^function (stampEquipment\|mergeExercises\|deloadPlan\|equipPickerHTML)\('` | `4` |

No check failed, so there is no REVERT NOW line.

### UAT item (pending, end of phase): the real workout on Ian's phone

**Before anything else:** on BOTH the phone and the PC, Settings → This version must end with
`8a20832`. If either still shows the older build (`99e10c8`) after 15 minutes and a full close and
reopen, wait. Never judge on the old build. The PC must be signed in too.

| # | Step | Expected |
|---|------|----------|
| 1 | Open the PUSH workout that holds the DB lateral raise and look at that card before logging anything. | Under the exercise name, a small muted "dumbbell · +2.5". If it shows ⬆ Add weight, the number is last time + 2.5 (or + 5 at 60 lb and up). |
| 2 | Open the PULL workout with Preacher curl, type a working weight of 35, and look under the sets. | A plate line reads "🏋️ Per side: 1×5". At 25 lb or less it shows nothing. |
| 3 | Open Settings → Exercises. | Every logged exercise is listed, each with an equipment dropdown under its name, already set (Preacher curl = EZ bar, Rear delt fly = dumbbell, Leg press = machine, Lunges = bodyweight). |
| 4 | On the PC, change one exercise's type in Settings → Exercises, wait for "Synced", then reopen Settings → Exercises on the phone. | The phone shows the PC's new type after the sync. |
| 5 | Change it back on either device. | It goes back on both. |
| 6 | Mid-workout, pick "+ Custom…" on any card and type a name the app has never seen. Look at the card, tap one type, then Discard the draft if this was only a test. | A box asks "What equipment is “…”?" with six buttons in 3 rows of 2 or 2 rows of 3, each easy to tap, one highlighted. After the tap the box disappears and the muted tag shows the choice. |
| 7 | Do the workout as usual and finish it. | It saves normally. Settings shows no sync error on either device. |

**Layout backstop (09-UI-SPEC § UI Considerations, at about 380px on Ian's Android PWA):** the picker
shows 3 × 2 with each button at least 44px tall, the guess highlighted, and the tag legible under the
select. Settings rows stack the dropdown under the name, never squeezed beside Rename.

**On failure** (a blank app, advice that is clearly wrong, or sync errors): run the revert above from
an up-to-date `main` and push at once, then diagnose. After a revert, sync stays paused on every device
until a fixed schema-19 build ships; logged data stays on each device.

**On pass:** tick nothing in REQUIREMENTS.md here (EQUIP-01..06 were all marked complete before this plan),
close Phase 9 through `/gsd-verify-work 9`, and write the vault changelog entry below.

## Follow-ups (after the phone check passes, not before)

Append a dated changelog entry to Ian's live vault note
`C:\Main Vault\50-59 Projects & Events\53. Software Projects\PPL Tracker App.md`, written for a
human skimming later:

- every exercise now has an equipment type (barbell, EZ bar, dumbbell, machine, cable or bodyweight),
  set from its name and changeable in Settings → Exercises, and it syncs between devices;
- suggestions, deloads and warm-ups move in steps the gym can load: dumbbells 2.5 lb up to 60 and 5 lb
  above, cable 2.5, everything else 5, and a 15 lb dumbbell deload is now 12.5;
- Preacher curl shows EZ-bar plate math;
- a brand-new exercise asks for its type once, and each card shows a small "dumbbell · +2.5"-style tag.

Update that note's Current Features section with the equipment types and their steps, because this
change is structural. Not written in this plan, by instruction.

## Deviations from Plan

1. **The orchestrator ran Ian's commands at his request.** The plan has Ian run the push, PR and merge
   himself. Ian asked the orchestrator to run them, and it did. The merge was still a merge commit,
   guarded by `--match-head-commit 297bb34…`, and nothing else changed. This executor pushed, merged
   and reverted nothing.
2. **Review findings Ian hadn't ruled on.** The plan expects no open finding "without Ian's call".
   WR-09, IN-10 and IN-11 were new in iteration 3. The review marks all three non-blocking, the
   checkpoint listed them, and Ian's go-ahead to ship was his call on them.
3. **REQUIREMENTS.md not touched.** The plan says to tick EQUIP-01..06 only after the phone check.
   EQUIP-02, 05 and 06 were already complete, and 09-04 marked 01, 03 and 04. By the orchestrator's
   instruction they stay as they are, and the phone check remains the UAT gate for Phase 9.

## Known Stubs

None. This plan changes no app file.

## Self-Check: PASSED

- This file exists; 974d962 (the checked tip) and 297bb34 (the pushed head) are in `git log`.
- After the Task 1 commit: `git merge-tree --write-tree MAIN0 HEAD` still equalled `HEAD^{tree}`, the
  diff from MAIN0 still listed only the allowed paths, `index.html` was unchanged since 974d962, and the
  remote branch head was still an ancestor of HEAD.
- Task 3: MERGE 8a20832 has 2 parents, PR #14 is MERGED with that merge commit, the latest `main` run is
  green, and the live page passes `--check` with stamp `… 8a20832`, SCHEMA 19 and the 4 functions.
