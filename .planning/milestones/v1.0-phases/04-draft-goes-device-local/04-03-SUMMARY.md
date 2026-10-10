---
phase: 04-draft-goes-device-local
plan: 03
subsystem: sync
tags: [sync, draft, device-local, saveLocal, allowlist, reopen]

requires:
  - phase: 04-draft-goes-device-local
    plan: 01
    provides: "stripDraft()/keepLocalDraft(), a merge with no draft, fakeCloud/spyPushes/fullDraft/asyncBlock"
  - phase: 04-draft-goes-device-local
    plan: 02
    provides: "the dbAssignLines tripwire, inbound doors that keep this device's draft"
provides:
  - "every draft-only function persists with saveLocal(): no updatedAt bump, no push"
  - "DRAFT_ONLY_MUTATORS (25-row table) and DRAFT_PUSHERS (structural allowlist of the 3 draft functions that still push)"
  - "close-and-reopen replays: scripted edits, edit-from-history with editRef, after a sync adoption"
  - "CLAUDE.md rule 'The in-progress workout never leaves the device.', kept honest by a names check"
affects: []

actuals:
  tokens: 4400
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Draft edits call saveLocal(); only a function that writes a synced collection may call save() from a draft path, and it must be listed in DRAFT_PUSHERS"
    - "Table tests call app functions through a.__sandbox[name] (top-level declarations are vm-global properties), so a row needs no harness export"

key-files:
  created: []
  modified:
    - index.html
    - test/app.test.js
    - CLAUDE.md
    - docs/adding-a-collection.md

key-decisions:
  - "The table clears the stored blob before each row, so a function that stores nothing fails as 'stored draft differs' rather than matching the previous row's copy"
  - "The structural check matches bare save() with a lookbehind (no word char, dot or $ before it), so saveLocal() and obj.save() never count"
  - "editSession switched to saveLocal() as the plan decided: opening a past workout to edit is starting a draft"

requirements-completed: [DRAFT-05]

coverage:
  - id: R1
    description: "All 25 draft-only functions store the draft locally with no updatedAt bump and no push"
    requirement: DRAFT-05
    verification:
      - kind: unit
        ref: "test/app.test.js#DRAFT-05: every draft-only edit is stored on this device with no updatedAt bump and no push"
        status: pass
    human_judgment: false
  - id: R2
    description: "Only pickEx, exPick and finishWorkout still call save() from a draft function"
    requirement: DRAFT-05
    verification:
      - kind: unit
        ref: "test/app.test.js#DRAFT-05: only pickEx, exPick and finishWorkout still push from a draft function"
        status: pass
    human_judgment: false
  - id: R3
    description: "A brand-new exercise picked mid-workout still reaches the cloud, with no draft in the pushed blob"
    requirement: DRAFT-05
    verification:
      - kind: integration
        ref: "test/app.test.js#DRAFT-05: picking a brand-new exercise mid-workout still pushes the new registry row"
        status: pass
    human_judgment: false
  - id: R4
    description: "The draft survives close and reopen: scripted edits, edit-from-history with editRef, and after a sync adoption"
    requirement: DRAFT-05
    verification:
      - kind: unit
        ref: "test/app.test.js#DRAFT-05: closing and reopening the app restores the draft exactly"
        status: pass
      - kind: unit
        ref: "test/app.test.js#DRAFT-05: a draft reopened for editing survives close and reopen with its editRef"
        status: pass
      - kind: integration
        ref: "test/app.test.js#DRAFT-05: a draft survives a sync adoption and then a reopen"
        status: pass
    human_judgment: false
  - id: R5
    description: "CLAUDE.md names keepLocalDraft and stripDraft, and both are functions in index.html"
    requirement: DRAFT-05
    verification:
      - kind: unit
        ref: "test/app.test.js#DRAFT rule: CLAUDE.md names the helpers the tests enforce, and both exist in index.html"
        status: pass
    human_judgment: false
  - id: R6
    description: "D-02 on real devices: a workout started on one signed-in device never shows as in progress on another"
    requirement: DRAFT-05
    verification:
      - kind: manual
        ref: "Task 2 human-check (two-device check), queued for end-of-phase verification"
        status: pending
    human_judgment: true

duration: 3min
completed: 2026-09-23
status: complete
---

# Phase 4 Plan 03: Draft Goes Device-Local (every edit stays, survives a reopen) Summary

**All 25 draft-only functions now store the workout on the device with `saveLocal()`, so no draft edit bumps `updatedAt` or pushes. Only `pickEx`, `exPick` and `finishWorkout` still push, because they write synced data, and a structural allowlist names any new function that joins them. The workout comes back exactly after a close and reopen, including an edit-from-history draft and one that lived through a sync. The rule is in `CLAUDE.md`.**

## Performance

- **Started:** 2026-09-23T11:28:54Z
- **Completed:** 2026-09-23T11:32:02Z (wall clock as reported by the system; task commits and the SUMMARY are later)
- **Tasks:** 2
- **Files modified:** 4

## BASE

`3ba38e3`. The acceptance checks compare against this commit.

## Accomplishments

- 23 functions switched from `save()` to `saveLocal()`, one word each: `deloadExercise`, `undeloadExercise`, `startWorkout`, `startBackdate`, `editSession`, `setDraftDate`, `setDraftDur`, `setNote`, `setSessionNote`, `rollWeight`, `addSet`, `rmSet`, `skipSet`, `unskipSet`, `stairVal`, `stairTimeSet`, `repCheck` (both calls), `skipStairs`, `unskipStairs`, `exSet`, `exRoll`, `exAddSet`, `exRmSet`. `setVal` and `discardWorkout` were already switched by 04-01, so all 25 now use `saveLocal()`. The edit was a bounded per-function rewrite, not a file-wide replace. It reported exactly 24 substitutions.
- `pickEx`, `exPick` and `finishWorkout` are untouched and still hold 5 `save();` calls between them.
- New test block `── DRAFT: every draft edit stays on this device and survives a reopen ──` with `DRAFT_ONLY_MUTATORS`, `DRAFT_PUSHERS`, the new-exercise push, three reopen replays and the `DRAFT rule:` names check.
- `CLAUDE.md` gets a new rule paragraph. `docs/adding-a-collection.md` now says `saveLocal()` is for device-local state. The two stale `setVal saves every keystroke` comments in `pushNow()` and `cloudVersion()` are reworded (comments only, verified by the strip-and-compare check).

## Task Commits

1. **Task 1:** `908a283` `feat(04-03): draft edits stay on this device`
2. **Task 2:** `8ac8eaf` `docs(04-03): record the device-local draft rule`

## RED gate observations (before any `index.html` edit)

**Table: 23 of 25 rows red**, all for the same reason, `pushes: 1, updatedAt: 1786122000000`: setNote, setSessionNote, setDraftDate, setDraftDur, rollWeight, addSet, rmSet, skipSet, unskipSet, deloadExercise, undeloadExercise, stairVal, stairTimeSet, repCheck, skipStairs, unskipStairs, exSet, exRoll, exAddSet, exRmSet, startWorkout, startBackdate, editSession. `setVal` and `discardWorkout` were green (04-01). No row threw, and every row's change was visible.

**Structural check: 26 names**, as predicted:
`addSet, deloadExercise, editSession, exAddSet, exPick, exRmSet, exRoll, exSet, finishWorkout, pickEx, repCheck, rmSet, rollWeight, setDraftDate, setDraftDur, setNote, setSessionNote, skipSet, skipStairs, stairTimeSet, stairVal, startBackdate, startWorkout, undeloadExercise, unskipSet, unskipStairs`

The new-exercise push check and the three reopen replays were already green before the edit. That was expected: `save()` also writes to localStorage, so a reopen worked before this plan too. These checks now guard the switch so it cannot lose the local write.

## Final counts

`npm test`: **786 passed, 0 failed, 2 skipped**, exit 0 (baseline 779/0/2; 7 checks added: 6 in Task 1, 1 in Task 2).

## Acceptance checks

- The `pickEx`/`exPick`/`finishWorkout` range holds `save();` **5** times.
- `git diff HEAD~1 -- index.html | grep -c "^+.*saveLocal()"` after the Task 1 commit gives **24**.
- `CLAUDE.md` contains "The in-progress workout never leaves the device." **1** time. `keepLocalDraft` and `stripDraft` each appear at least once.
- The Task 2 `index.html` change is **comments only**.
- All seven labels print a `PASS  ` line.

## Deviations from Plan

None. The plan was executed as written.

## Pending for end-of-phase verification (human)

`workflow.human_verify_mode` is `end-of-phase`, so this check was not raised mid-plan. It is queued for Ian:

- **Two-device check for D-02.** Serve this branch locally (for example `python -m http.server 8000`), open it on the desktop and sign in. On the phone, which is still on the live build, start a workout and log a set. Reload the desktop: Today shows no "Workout in progress" card, and Train → Log shows the picker, never the phone's workout. Start and discard a different workout on the desktop: the phone's workout and its set are unchanged. Finish on the phone: the session appears in the desktop's History. One "Synced from another device" toast on the desktop's first sync after loading the new build is expected (plan 04-01). A second one with no real change is not. If Firebase refuses sign-in on localhost, add localhost under Authentication → Settings → Authorized domains, or run the check against the deployed build after the merge.
- **Cutover note (carried from plan 04-02):** after the real deploy, if a second device shows a Resume card for a workout it did not start, **discard it there, never finish it**. Finishing would log a second, partial session.

## Flagged assumptions (carried, unresolved)

- Scalar recency now follows real edits only. A device with a workout open no longer wins `unit`, routine mode, hobbies or the `exercises` registry just because Ian typed a rep there. That is what the `saveLocal()` rule intends. The registry being taken whole from the newer side is pre-existing and out of scope.
- `editSession`'s id-assignment branch stores the id locally only. It is reachable only for a pre-migration row, and the id reaches the cloud with the next real save.

## Known Stubs

None.

## Threat Flags

None. T-4-11 is mitigated: `pickEx`/`exPick` still push, and the allowlist plus the new-exercise test enforce it. T-4-13 is mitigated by the `DRAFT rule:` check. T-4-12 remains accepted.

## After shipping

The CLAUDE.md "After shipping" step applies once the phase is merged and deployed: add a dated changelog entry in Ian's live vault (`C:\Main Vault\...\PPL Tracker App.md`).

## Self-Check: PASSED

- `index.html`, `test/app.test.js`, `CLAUDE.md`, `docs/adding-a-collection.md` and this SUMMARY are all present.
- Commits `908a283` and `8ac8eaf` are both in `git log`.
