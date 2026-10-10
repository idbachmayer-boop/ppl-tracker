---
phase: 04-draft-goes-device-local
plan: 02
subsystem: sync
tags: [sync, import, restore, draft, device-local, tripwire]

requires:
  - phase: 04-draft-goes-device-local
    plan: 01
    provides: "stripDraft()/keepLocalDraft(), a merge that never returns a draft, fakeCloud/asyncBlock/fullDraft/DRAFT_SHAPES test helpers"
provides:
  - "importMerge(raw) and importReplace(raw), extracted from importData(), each stripping the file's draft before normalize() and keeping this device's"
  - "restoreSnapshot() and restoreCloudVersion() keep the workout in progress"
  - "the 'use the cloud copy only' branch of onSignedIn() strips the cloud's draft before normalize()"
  - "a dbAssignLines tripwire: any statement assigning DB without keepLocalDraft(), other than three sanctioned exceptions, fails the suite by line"
  - "logTabDraws(a), legacyDraftDB(a), oldDocWithDraftOnlyLift(a), cloudOnlyDB(a, draft), signInChoosingCloud() test helpers"
affects: [04-03]

actuals:
  tokens: 5900
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Every site that turns foreign data into DB reads: DB = keepLocalDraft(normalize(stripDraft(raw))). Strip before normalize, reattach after"
    - "UI orchestration (FileReader, confirm, toast, render) stays in importData(); the data change lives in a testable helper the button calls"

key-files:
  created: []
  modified:
    - index.html
    - test/app.test.js
    - test/harness.js

key-decisions:
  - "The tripwire sanctions the Erase and adopt lines by checking that the line appears in wipe.toString() / adoptMerged.toString(). It does not match on wording, so a rename of either function breaks the exception check loudly instead of silently widening it"
  - "Import tests use an attempt() wrapper, so a helper that does not exist yet reports as a FAIL with its message rather than crashing the suite"

requirements-completed: [DRAFT-02, DRAFT-03]

coverage:
  - id: I1
    description: "Import Merge and Import Replace ignore the file's draft and keep this device's, including an export → Replace round trip"
    requirement: DRAFT-02
    verification:
      - kind: unit
        ref: "test/app.test.js#D-06: Import Merge ignores the file's draft and keeps this device's"
        status: pass
      - kind: unit
        ref: "test/app.test.js#D-06: Import Merge on a device with no draft plants none"
        status: pass
      - kind: unit
        ref: "test/app.test.js#D-06: Import Replace ignores the file's draft and keeps this device's"
        status: pass
      - kind: unit
        ref: "test/app.test.js#D-06: an exported backup re-imported with Replace keeps the importing device's draft"
        status: pass
    human_judgment: false
  - id: I2
    description: "Restoring a local snapshot or a cloud version keeps the workout in progress"
    requirement: DRAFT-02
    verification:
      - kind: unit
        ref: "test/app.test.js#D-07: restoring a local snapshot keeps the workout in progress"
        status: pass
      - kind: integration
        ref: "test/app.test.js#DRAFT-02: restoring a cloud version keeps the workout in progress"
        status: pass
    human_judgment: false
  - id: I3
    description: "A local Erase clears the draft in memory and in storage"
    requirement: DRAFT-02
    verification:
      - kind: unit
        ref: "test/app.test.js#D-08: a local Erase clears the draft"
        status: pass
    human_judgment: false
  - id: I4
    description: "No foreign draft reaches normalize(): an old backup or old cloud doc adds no exercise-registry row"
    requirement: DRAFT-02
    verification:
      - kind: unit
        ref: "test/app.test.js#D-06: an old backup's draft adds no exercise-registry row on import"
        status: pass
      - kind: integration
        ref: "test/app.test.js#DRAFT-02: an old cloud doc's draft adds no exercise-registry row through the cloud-copy choice"
        status: pass
    human_judgment: false
  - id: I5
    description: "Every statement that replaces DB keeps this device's draft (tripwire)"
    requirement: DRAFT-02
    verification:
      - kind: unit
        ref: "test/app.test.js#DRAFT-02: every statement that replaces DB keeps this device's draft"
        status: pass
    human_judgment: false
  - id: I6
    description: "A legacy cloud draft, the cloud-copy choice, a remote Erase and a same-workout collision never plant, clear or merge into the local draft"
    requirement: DRAFT-02
    verification:
      - kind: integration
        ref: "test/app.test.js#DRAFT-02: a device with no draft shows no Workout in progress card after syncing a cloud draft"
        status: pass
      - kind: integration
        ref: "test/app.test.js#DRAFT-02: the first ordinary write removes the legacy draft from the cloud doc"
        status: pass
      - kind: integration
        ref: "test/app.test.js#DRAFT-02: Use the cloud copy only adopts the cloud's data and keeps this device's draft"
        status: pass
      - kind: integration
        ref: "test/app.test.js#DRAFT-02: Use the cloud copy only on a device with no draft plants none"
        status: pass
      - kind: integration
        ref: "test/app.test.js#DRAFT-02: a remote Erase keeps this device's draft"
        status: pass
      - kind: integration
        ref: "test/app.test.js#DRAFT-02: a cloud draft for the same workout and date is never merged into this device's"
        status: pass
    human_judgment: false
  - id: I7
    description: "The Log tab and Today draw for every malformed cloud draft shape, on two devices, through the listener and the cloud-copy choice"
    requirement: DRAFT-03
    verification:
      - kind: integration
        ref: "test/app.test.js#DRAFT-03: the Log tab draws for every malformed cloud draft"
        status: pass
      - kind: integration
        ref: "test/app.test.js#DRAFT-03: this device's own draft is what remains after a malformed cloud draft arrives"
        status: pass
      - kind: integration
        ref: "test/app.test.js#DRAFT-03: the cloud-copy choice survives every malformed cloud draft"
        status: pass
    human_judgment: false

duration: 97min
completed: 2026-09-23
status: complete
---

# Phase 4 Plan 02: Draft Goes Device-Local (inbound doors) Summary

**Import Merge, Import Replace, both restores and the "use the cloud copy only" choice now drop the foreign draft before `normalize()` and keep this device's own. A local Erase is the only thing that clears it. A tripwire fails the suite, naming the line, if a future statement replaces `DB` without `keepLocalDraft()`.**

## Performance

- **Duration:** about 97 min wall clock
- **Started:** 2026-09-23T09:49:43Z
- **Completed:** 2026-09-23T11:26:33Z
- **Tasks:** 2
- **Files modified:** 3

## BASE

`a5c43b575f52a23150901524504e5069a3bd797c`. The `wipe()` acceptance check compares against this commit, and `wipe()` is byte-identical to it.

## Accomplishments

- `importMerge(raw)` and `importReplace(raw)` are now function declarations directly after `importData()`. They hold the data-changing statements in their original order. `importData()` keeps the FileReader, `validateBackup()`, both `confirm()` prompts, the toasts, `render()` and the `finally`, and calls the helpers. So the tests run the same code the button runs.
- The `DB` assignment in both import helpers and both restore functions now goes through `keepLocalDraft(... normalize(stripDraft(raw)) ...)`. The `wx` capture and reattach are unchanged.
- In `onSignedIn()`, the `'C'` branch passes `normalize(stripDraft(remoteDB))`. `adoptMerged()` already reattached the local draft (plan 04-01). The strip matters for a different reason: an old cloud doc's draft could otherwise reach migration 17 and found a registry row that then syncs.
- The tripwire scans the app source and found exactly 7 `DB` assignments: boot, Import Merge, Import Replace, Erase, adopt, and the two restores. Four call `keepLocalDraft(` and three are sanctioned exceptions. A synthetic `DB = normalize(raw);` is caught.
- Harness `names` now also exports `importMerge`, `importReplace`, `restoreSnapshot`, `restoreCloudVersion`, `loadCloudVersions` and `wipe`.

## Task Commits

1. **Task 1:** `c7f9fed` `feat(04-02): import, restore and erase handle the draft deliberately`
2. **Task 2:** `d277872` `feat(04-02): no cloud document can plant, clear or crash the workout in progress`

## RED gate observations

**Task 1: red before any `index.html` edit**

| Label | Before edit |
|---|---|
| `D-06: Import Merge ignores the file's draft and keeps this device's` | RED (`a.importMerge is not a function`) |
| `D-06: Import Merge on a device with no draft plants none` | RED (helper missing) |
| `D-06: Import Replace ignores the file's draft and keeps this device's` | RED (helper missing) |
| `D-06: an exported backup re-imported with Replace keeps the importing device's draft` | RED (helper missing) |
| `D-07: restoring a local snapshot keeps the workout in progress` | RED (`draft: "LEGS 1"`, the snapshot's legacy draft was adopted) |
| `DRAFT-02: restoring a cloud version keeps the workout in progress` | RED (`draft: "LEGS 1"`) |
| `D-08: a local Erase clears the draft` | already green (`blank()` sets `draft: null`, so no change was needed, as planned) |
| `D-06: an old backup's draft adds no exercise-registry row on import` | RED (helper missing) |
| `DRAFT-02: every statement that replaces DB keeps this device's draft` | RED (4 offenders: both import lines, both restore lines) |

The old-backup registry check could not go red for its own reason before the helpers existed. So I ran a scratch mutation separately: a copy of the fixed `index.html` with `stripDraft()` removed, loaded in the harness, where `importReplace()` of the old backup **does** register `Draft Only Lift`. The strip is load-bearing and the test catches its removal.

**Task 2: red before the `onSignedIn` edit**

| Label | Before edit |
|---|---|
| `DRAFT-02: a device with no draft shows no Workout in progress card after syncing a cloud draft` | already green (plan 04-01's merge) |
| `DRAFT-02: the first ordinary write removes the legacy draft from the cloud doc` | already green (plan 04-01) |
| `DRAFT-02: Use the cloud copy only adopts the cloud's data and keeps this device's draft` | already green (`adoptMerged()` reattaches, plan 04-01) |
| `DRAFT-02: Use the cloud copy only on a device with no draft plants none` | already green |
| `DRAFT-02: a remote Erase keeps this device's draft` | already green |
| `DRAFT-02: a cloud draft for the same workout and date is never merged into this device's` | already green |
| `DRAFT-03: the Log tab draws for every malformed cloud draft` | already green |
| `DRAFT-03: this device's own draft is what remains after a malformed cloud draft arrives` | already green |
| `DRAFT-03: the cloud-copy choice survives every malformed cloud draft` | already green |
| `DRAFT-02: an old cloud doc's draft adds no exercise-registry row through the cloud-copy choice` | **RED** (`inMemory: true, written: true`: the row was registered and pushed to the cloud) |

The plan predicted this: the draft-value assertions on the cloud-copy branch pass after 04-01, and only the registry assertion is red until `onSignedIn` strips before normalizing. The red result also showed the leaked row reaching the written cloud blob, not only memory.

## Final counts

`npm test`: **779 passed, 0 failed, 2 skipped**, exit 0 (baseline 760/0/2; 19 checks added: 9 in Task 1, 10 in Task 2). The whole suite runs in about 2.6 s, so the async batteries are nowhere near the 10 s block timeout.

## Deviations from Plan

None. The plan was executed as written.

One small addition inside scope: the malformed-shape battery also checks that each device on the cloud-copy choice actually adopted the cloud's sessions. Without that, a sign-in that errored before adopting would keep the local draft trivially and pass for the wrong reason.

## Flagged for Ian (carried from the plan, unresolved)

- **Cutover:** a second device that holds a synced copy of an in-progress draft at the moment it takes the update keeps that draft as its own (D-03 as written). Discard there is safe. Finish would log a duplicate partial session. Plan 04-03's end-of-phase two-device check covers the visible symptom.
- A Replace import or a restore done mid-workout can leave the kept draft pointing at an exercise id the restored registry lacks. The entry then shows by its id. This is rare and visible, and no data is lost.

## Known Stubs

None.

## Threat Flags

None. No new endpoints or trust boundaries. T-4-06, T-4-07, T-4-08 and T-4-09 are mitigated as the threat register planned. T-4-10 remains accepted.

## Self-Check: PASSED

- `index.html`, `test/app.test.js` and `test/harness.js` are all present and modified.
- Commits `c7f9fed` and `d277872` are both in `git log`.
- `grep -c "^function importMerge(\|^function importReplace(" index.html` prints 2. The `importData()` range holds both helper calls, `new FileReader()` and both `confirm(`. Both restore ranges hold `keepLocalDraft(normalize(stripDraft(raw)))`. `onSignedIn` holds `normalize(stripDraft(remoteDB))` once. `wipe()` is unchanged from BASE.
