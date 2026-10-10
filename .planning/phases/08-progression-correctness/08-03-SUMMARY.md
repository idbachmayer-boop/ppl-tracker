---
phase: 08-progression-correctness
plan: 03
status: complete
subsystem: release
tags: [ship, deploy, csp, merge-commit, revert-ready, uat]
requires: [08-01, 08-02, 08-REVIEW-FIX]
provides:
  - "Phase 8 live on main behind one revertable merge commit (MERGE 99e10c8, PR #13)"
  - "live-bytes verification record (stamp, CSP --check, helper grep)"
  - "the real-workout phone check, queued as the end-of-phase UAT item"
affects: [main, GitHub Pages deploy, both devices]
tech-stack:
  added: []
  patterns:
    - "Ship as a merge-commit PR that Ian pushes and merges; the executor only runs read-only checks before and after"
key-files:
  created: [.planning/phases/08-progression-correctness/08-03-SUMMARY.md]
  modified: []
decisions:
  - "Ian ran /gsd-code-review 8 before shipping and had WR-01, WR-03 and WR-04 fixed, which covered Task 2's optional `hold` for a review. WR-02 (total reps compared when the set count changes) stays open for his product call"
  - "Phase 8 shipped as PR #13, merged with a merge commit: MERGE = 99e10c8b7e46b0fc507aced553c7dbb8dcbdafb4. The revert is `git revert -m 1 --no-edit 99e10c8` on main"
  - "PROG-01..05 were already marked complete in REQUIREMENTS.md by 08-01/08-02, and they stay that way. The phone check is the phase's end-of-phase UAT item; it does not gate this plan"
metrics:
  duration: "~20 min (07:23 to 07:44 CDT 2026-10-10, including Ian's push, PR, CI and deploy)"
  completed: 2026-10-10
  tasks: 3
  files: 0
actuals:
  tokens: 3500
  tasks: 3
  commits: 2
---

# Phase 8 Plan 03: Ship Phase 8 Summary

Phase 8 is live. It went to `main` as PR #13, merged with a merge commit (`99e10c8`), and the deploy
passed its CSP check before publishing. The live page carries that build: its stamp ends `99e10c8`, its
inline script matches the CSP hash, and it declares all four new progression helpers. One thing is
left: the real workout on Ian's phone. It is queued below as the end-of-phase UAT item, with the
revert command ready.

## Task 1: pre-flight (done, read-only, commit 8221d92)

Run 2026-10-10 from the tip `76af74d` on `claude/gifted-goodall-706ad7`. No fetch, merge, push or stash.

| Check | Result |
|-------|--------|
| `TZ=America/Chicago npm test` | `984 passed, 0 failed, 2 skipped`, the post-review-fix count (08-02 ended at 980; the WR-01/03/04 fixes added 4) |
| `npm run csp:check` | exit 0, `CSP hash OK sha256-vIizx9pDW8e7DQXXv28JrxiESnjc7wUnpzuz431d1vM=` |
| MAIN0 (`git ls-remote origin refs/heads/main`) | `f71c6e4362803c8ebe4a6c939725bf94bcd6049b` (PR #12's merge commit), unchanged since plan time |
| `git cat-file -e "$MAIN0^{commit}"` | exit 0, present locally |
| `git merge-tree --write-tree MAIN0 HEAD` | exit 0, `ee822baad24ab88c3eace832a8df82dcb09f0f6f`, equal to `HEAD^{tree}`. Merging brings nothing the branch lacks |
| `git rev-list HEAD..MAIN0` | only `f71c6e4` itself (its tree is already on the branch, planner probe 1) |
| `git diff --name-only MAIN0 HEAD` | `CLAUDE.md`, `index.html`, `test/app.test.js`, plus 152 `.planning/` paths. Nothing else |
| Remote branch `refs/heads/claude/gifted-goodall-706ad7` | `bf0bc94`, an ancestor of HEAD (`merge-base --is-ancestor` exit 0), so the push fast-forwarded |
| Previous live page (signed-out GET, 2026-10-10T12:24Z) | ppl-build stamp `2026-10-09T12:45:12Z f71c6e4`. This is the build a revert returns to |
| `node scripts/csp-hash.js --check` on the previous live page | exit 0, `CSP hash OK sha256-Nw5jh/JeJpDSYItCr6FJJ52mvE7ySXo1646f8nZCpkU=` |
| New helpers in the previous live script | 0, as expected before the deploy |

## Task 2: Ian pushed, merged and deployed (checkpoint:human-action, gate blocking-human)

**Ian's reply: `deployed`.**

- Ian pushed the branch (`bf0bc94..8221d92`, a fast-forward) and opened
  [PR #13](https://github.com/idbachmayer-boop/ppl-tracker/pull/13) from `claude/gifted-goodall-706ad7`
  into `main`.
- CI's `test` job on the PR was green.
- Ian merged it with **Create a merge commit**, running
  `gh pr merge 13 --merge --match-head-commit 8221d92…` himself. The orchestrator's own attempt to merge
  was blocked by the permission classifier, which is how this plan wants it: the executor never pushes
  or merges on `main`.
- PR #13 state `MERGED` at 2026-10-10T12:41:51Z, merge commit
  `99e10c8b7e46b0fc507aced553c7dbb8dcbdafb4`.
- Deploy run [38052910368](https://github.com/idbachmayer-boop/ppl-tracker/actions/runs/38052910368) on
  `main` at `99e10c8`: `test` success, `deploy` success. The deploy job includes the step "Check the
  published script still matches its CSP hash", which runs after "Stamp build" and before anything is
  uploaded.
- Code review ran before the push: `/gsd-code-review 8`, with WR-01, WR-03 and WR-04 fixed in `08967bc`,
  `c6333ee` and `ccbd4d0` (see 08-REVIEW-FIX.md). **WR-02** stays open for Ian's decision: total reps
  are compared even when the set count changed, so removing a set reads as flat and adding one reads as
  progress. It did not block shipping.

## Task 3: the live site carries the build (done, read-only)

| Check | Result |
|-------|--------|
| MAIN (`git ls-remote origin refs/heads/main`) | `99e10c8b7e46b0fc507aced553c7dbb8dcbdafb4`, recorded as **MERGE** |
| `gh api repos/idbachmayer-boop/ppl-tracker/commits/$MAIN --jq '.parents\|length'` | `2`, a merge commit |
| Live ppl-build stamp (signed-out GET, cache-busted) | `2026-10-10T12:42:16Z 99e10c8`, ends with MAIN's sha7 |
| `node scripts/csp-hash.js --check live.html` | exit 0, `CSP hash OK sha256-vIizx9pDW8e7DQXXv28JrxiESnjc7wUnpzuz431d1vM=`, the same hash as the pre-flight tip |
| `grep -cE "^function (addWeightVerdict\|lastAttemptEntry\|stallStreak\|compareSessions)\(" live.html` | `4` |

The orchestrator collected these first. This executor re-ran the plan's `<automated>` verify once on a
fresh download, without polling, and got the same results: `--check` exit 0, grep count 4, stamp
`2026-10-10T12:42:16Z 99e10c8`. The downloaded pages sit in the session scratchpad and are not
committed. No check failed, so there is no `REVERT NOW` line.

## UAT item: the real workout on Ian's phone (pending, end-of-phase)

This is the phase's verification mode, and it is not done yet. It is the Task 3 `<human-check>`,
copied verbatim with MERGE's sha7 (`99e10c8`) filled in.

**Test:** A real workout on Ian's phone (the phase's verification mode). First, Settings → This version
must end with `99e10c8`, the sha7 Task 3 recorded for MERGE. If it still shows the older build after 15
minutes and a full close and reopen, wait, and never judge on the old build. Then:

1. Open the PUSH workout that holds the DB lateral raise and look at that card before logging anything.
2. Do the workout as usual. On one exercise, skip one set with the skip button, or leave one set's reps
   blank, and fill the others. Finish the workout.
3. Start that same workout again and look at that exercise's card, then Discard the draft.
4. If a bodyweight exercise (logged at 0 / BW) reached the top of its range on every set last time, look
   at its card.
5. Optional: open a past workout with Edit and re-save it unchanged; nothing about its sets should
   change.

**Expected:**

- (1) The DB lateral raise card shows no "⚠ Stalled" warning: the reps it gained on sets 2 and 3 now
  count. If any card does show "⚠ Stalled", it names 3 sessions in a row without an extra rep or more
  weight, and still offers Deload −10%.
- (3) The exercise with the skipped or blank set shows no "⬆ Add weight" tag. Its "Last time" line shows
  the sets actually done.
- (4) The bodyweight card shows "⬆ Add weight (belt) or harder variation" with no number.
- Settings shows no sync error on either device.
- If the app is blank, the advice is clearly wrong, or sync errors appear: from an up-to-date `main`, run
  `git revert -m 1 --no-edit 99e10c8b7e46b0fc507aced553c7dbb8dcbdafb4` and push to `main` at once, then
  diagnose. Never hotfix forward.

**Why human:** It needs Ian's real training history, his phone running the deployed PWA, and a real
workout. The suite replays the same cases on fixtures, but only the device proves the advice on his
actual data (backstop truth; 08-VALIDATION.md § Manual-Only Verifications).

The phone check also settles one planner reading from 08-02: that a blank set (`blankSets > 0`) pauses
the stall streak the same way a skipped set does (D-10 with D-01).

## Revert, kept ready

On a blank app, wrong advice or a sync error, push this at once and diagnose afterwards:

```bash
git switch main
git pull --ff-only
git revert -m 1 --no-edit 99e10c8b7e46b0fc507aced553c7dbb8dcbdafb4
git push origin main
```

Rows finished on the new build keep `blankSets`, which the reverted build ignores, so a revert loses no
data. There is no migration and no SCHEMA change.

## Follow-ups

- After the phone check passes: append a dated changelog entry to Ian's live vault note
  (`C:\Main Vault\50-59 Projects & Events\53. Software Projects\PPL Tracker App.md`, per CLAUDE.md
  § After shipping), covering the three points in this plan's `<output>`. Update Current Features if it
  describes the add-weight or stall advice. Not written yet, on purpose.
- WR-02 (set-count change in the stall comparison): Ian's product call.

## Deviations from Plan

None in the plan's own steps. Two notes:

- Task 2's optional `hold` for a review was already covered: the code review and its fixes ran before
  Task 1.
- PROG-01..05 were already ticked in REQUIREMENTS.md by 08-01 and 08-02, although this plan's `<output>`
  says to tick them only after the phone check. Per the orchestrator, they are left as they are. The
  phone check is still the UAT item that closes the phase.

## Self-Check: PASSED

- `.planning/phases/08-progression-correctness/08-03-SUMMARY.md` exists (this file).
- Commit `8221d92` (Task 1) exists on the branch. MERGE `99e10c8` is `main`'s head on origin, with 2
  parents.
- Live page re-verified once by this executor: stamp `99e10c8`, `--check` exit 0, helper grep 4.
