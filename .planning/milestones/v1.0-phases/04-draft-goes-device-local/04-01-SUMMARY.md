---
phase: 04-draft-goes-device-local
plan: 01
subsystem: sync
tags: [sync, merge, firestore, draft, device-local, differential-testing]

requires:
  - phase: 01-registry
    provides: registry-derived mergeDB() with the frozen mergeDB_legacy differential and merge-golden.json
provides:
  - "stripDraft(x) and keepLocalDraft(next) helpers in index.html"
  - "mergeDB() returns no draft from either branch; adoptMerged() reattaches this device's draft"
  - "snapPayload() and exportData() exclude draft; setVal and discardWorkout persist with saveLocal()"
  - "async test support (pendingAsync/asyncBlock) and a fake Firestore (fakeCloud) for later plans"
  - "DRAFT_SHAPES, fullDraft(), spyPushes() test helpers"
affects: [04-02, 04-03]

actuals:
  tokens: 17400
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Device-local fields are deleted in mergeDB() beside wx and reattached in adoptMerged() before its equality check"
    - "Async suite checks run after the synchronous suite; the tail waits for all of them before the summary and exit"

key-files:
  created:
    - .planning/phases/04-draft-goes-device-local/deferred-items.md
  modified:
    - index.html
    - test/app.test.js
    - test/harness.js
    - test/fixtures/merge-golden.json

key-decisions:
  - "The harness fetch now never settles. A rejecting fetch spun an endless microtask loop (Lawn tab weather retry) once the event loop could turn."
  - "The mergeDB mutation test checks both directions (remote newer and local newer), not only the remote-newer case the plan named"
  - "The finish scenario's cloud holds a legacy PUSH 1 draft stamped newer than the device, so the ordering check has a draft to resurrect"

patterns-established:
  - "fakeCloud(a, remoteDB, opts): drive onSignedIn/pushNow/startLiveSync/cloudVersion against an in-memory Firestore"
  - "spyPushes(a): count schedulePush calls by overriding the vm global"

requirements-completed: [DRAFT-01, DRAFT-04]

coverage:
  - id: D1
    description: "A rep typed mid-workout is stored on the device with no updatedAt bump and no push"
    requirement: DRAFT-01
    verification:
      - kind: unit
        ref: "test/app.test.js#DRAFT tracer: a typed rep is stored on this device with no updatedAt bump and no push"
        status: pass
    human_judgment: false
  - id: D2
    description: "The sign-in push, through the real pushNow() transaction, writes a blob with no draft key"
    requirement: DRAFT-01
    verification:
      - kind: integration
        ref: "test/app.test.js#DRAFT-01: the sign-in push writes a blob with no draft key"
        status: pass
    human_judgment: false
  - id: D3
    description: "A newer cloud draft, at sign-in or on a live-listener tick, leaves this device's draft unchanged"
    requirement: DRAFT-02
    verification:
      - kind: integration
        ref: "test/app.test.js#DRAFT-02: a newer cloud draft does not replace this device's draft at sign-in"
        status: pass
      - kind: integration
        ref: "test/app.test.js#DRAFT-02: the live listener leaves this device's draft untouched"
        status: pass
    human_judgment: false
  - id: D4
    description: "mergeDB never returns a draft for any remote shape, branch or tie rule, and mutates neither input"
    requirement: DRAFT-01
    verification:
      - kind: unit
        ref: "test/app.test.js#DRAFT-01: mergeDB never returns a draft, for any remote shape, either branch, either tie rule"
        status: pass
      - kind: unit
        ref: "test/app.test.js#DRAFT-01: mergeDB leaves both inputs' draft objects unmutated"
        status: pass
    human_judgment: false
  - id: D5
    description: "Snapshot ring, cloud version and JSON backup carry no draft"
    requirement: DRAFT-01
    verification:
      - kind: unit
        ref: "test/app.test.js#DRAFT-01: the local snapshot ring stores no draft"
        status: pass
      - kind: integration
        ref: "test/app.test.js#DRAFT-01: a cloud version written mid-workout stores no draft"
        status: pass
      - kind: unit
        ref: "test/app.test.js#DRAFT-01: the downloaded JSON backup has no draft"
        status: pass
    human_judgment: false
  - id: D6
    description: "Finish still pushes the session with no draft, and discard stays on the device"
    requirement: DRAFT-04
    verification:
      - kind: integration
        ref: "test/app.test.js#DRAFT-04: finishing pushes the session with no draft key"
        status: pass
      - kind: integration
        ref: "test/app.test.js#DRAFT-04: the post-push reconciliation cannot bring the finished draft back"
        status: pass
      - kind: unit
        ref: "test/app.test.js#DRAFT-04: discarding stores null locally with no updatedAt bump and no push"
        status: pass
    human_judgment: false

duration: 17min
completed: 2026-09-23
status: complete
---

# Phase 4 Plan 01: Draft Goes Device-Local (outbound and merge) Summary

**The in-progress workout no longer crosses the wire. `mergeDB()` drops `draft` from both branches, `adoptMerged()` puts this device's own draft back, and the snapshot ring, cloud versions and JSON backup exclude it. All of this is proven through the real `onSignedIn`/`pushNow`/live-listener paths against a fake Firestore.**

## Performance

- **Duration:** about 17 min
- **Started:** 2026-09-23T09:29:35Z
- **Completed:** 2026-09-23T09:46:29Z
- **Tasks:** 2 (the tracer plus the expansion)
- **Files modified:** 4, plus 1 created

## BASE

`2b5718e4f0d75d33aecc3519061021b60ccf30cb`. The acceptance checks compare against this commit.

## Accomplishments

- A typed rep (`setVal`) persists with `saveLocal()`: stored on the device, no `updatedAt` bump, no push.
- `mergeDB()` deletes `draft` in the gen-mismatch branch (one added statement, so the REG-10 pin changed by exactly that line) and in the recency branch. The merge-output `normalizeDraft(out)` repair is removed, so merging no longer mutates either input.
- `adoptMerged()` builds `withWx` through `keepLocalDraft()`, before the equality check. The sign-in merge, the first-link merge, the live listener and the post-push reconciliation now all keep this device's draft.
- `snapPayload()` deletes `draft` beside `wx`. That one change covers both the local ring and `cloudVersion()`. `exportData()` serializes `stripDraft(Object.assign({}, DB))`. `discardWorkout()` uses `saveLocal()`. `finishWorkout()` is unchanged and still pushes the session.
- The frozen-legacy differential is kept: `legacyView()` drops `draft`, and `merge-golden.json` was regenerated from the frozen legacy merge. It still has 540 keys, and only the `merge:` and `random:` hashes changed.
- Test infrastructure for plans 04-02 and 04-03: `asyncBlock`, `fakeCloud`, `spyPushes`, `fullDraft`, `DRAFT_SHAPES`, plus harness exports and an `fbDb` accessor.

## Task Commits

1. **Task 1 step 1: differential prep (test-only):** `eed9e50` `test(04-01): exclude draft from the legacy merge comparison`
2. **Task 1 (tracer):** `27fd954` `feat(04-01): the in-progress draft never crosses the sync merge`
3. **Task 2:** `08b364b` `feat(04-01): snapshots, cloud versions, backups, finish and discard carry no draft`

## RED gate observations

**Task 1: all five red before any `index.html` edit**, each for the intended reason:

| Label | Red extra |
|---|---|
| `DRAFT tracer: a typed rep is stored on this device with no updatedAt bump and no push` | `{"updatedAt":1786122000000,"storedR":"8","pushes":1}` |
| `DRAFT-01: mergeDB leaves both inputs' draft objects unmutated` | `["remote newer: remote draft","local newer: local draft"]` |
| `DRAFT-01: the sign-in push writes a blob with no draft key` | `{"writes":1,"status":"Synced","draft":"PULL 1"}` |
| `DRAFT-02: a newer cloud draft does not replace this device's draft at sign-in` | `"PULL 1"` |
| `DRAFT-02: the live listener leaves this device's draft untouched` | `{"inMemory":"LEGS 1","stored":"LEGS 1"}` |

**Task 2: red before the Task 2 production edits:**

| Label | Before edit |
|---|---|
| `DRAFT-01: the local snapshot ring stores no draft` | RED (`draft: "PUSH 1"`) |
| `DRAFT-01: a cloud version written mid-workout stores no draft` | RED (`draft: "PUSH 1"`) |
| `DRAFT-01: the downloaded JSON backup has no draft` | RED (`draft: "PUSH 1"`) |
| `DRAFT-04: finishing writes a workout version with no draft key` | RED (the version carried `draft: null`) |
| `DRAFT-04: discarding stores null locally with no updatedAt bump and no push` | RED (`pushes: 1`, `updatedAt` bumped) |
| `DRAFT-01: mergeDB never returns a draft, for any remote shape, either branch, either tie rule` | already green (Task 1) |
| `DRAFT-04: finishing pushes the session with no draft key` | already green (Task 1) |
| `DRAFT-04: the post-push reconciliation cannot bring the finished draft back` | already green (Task 1) |

## Final counts

`npm test`: **760 passed, 0 failed, 2 skipped**, exit 0. The baseline was 748/0/2. Two old merge-repair tests were merged into one, and 13 checks were added.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Harness `fetch` changed from reject-at-once to never-settle**
- **Found during:** Task 1, step 5 (first run with an async block)
- **Issue:** When the suite ended with `process.exit` straight after the synchronous code, no promise callback ever ran. Once the tail waited for async blocks, instances left on the Care → Lawn screen with a stale weather cache went into `fetchWeather()` → rejected fetch → `render()` → `maybeFetchWeather()` → `fetchWeather()`, all in microtasks. The suite hung forever: no timer, no timeout and no exit could run.
- **Fix:** `test/harness.js` `fetch: () => new Promise(() => {})`, with a comment explaining why. No test observed fetch rejection before, because none could.
- **Files modified:** `test/harness.js`
- **Commit:** `27fd954`
- The possible app-side equivalent (a tight retry loop on the Lawn tab while offline) is out of scope. It is logged in `deferred-items.md`.

**2. [Scope note] The mutation test covers both directions**
- The plan's behaviour named only the remote-newer case. The test also runs local-newer, because the label promises "both inputs". Both directions were red before the fix.

### Tracer gate

The tracer's `<verify>` (`npm test`) was re-run after its commit and passed (752/0/2). Config has `human_verify_mode: end-of-phase` and the orchestrator asked for every task to run, so the interactive tracer checkpoint was not raised mid-plan. The human check stays at the end of the phase.

## Notes for plan 04-02

- `restoreSnapshot()` and `restoreCloudVersion()` now receive blobs with no `draft` key. Until 04-02 routes them through `keepLocalDraft()`, a restore leaves `DB.draft` undefined, so the workout in progress is cleared. Before this plan it was replaced by the snapshot's draft. Either way D-07 is not yet met, as planned.
- As the plan flagged, the first listener tick after the update reads as one change: key order moves `draft` to the end. That means one extra "Synced from another device" toast per device.

## Known Stubs

None.

## Threat Flags

None. No new endpoints or trust boundaries. Every change narrows what crosses an existing boundary.

## Self-Check: PASSED

- Files: `index.html`, `test/app.test.js`, `test/harness.js`, `test/fixtures/merge-golden.json` and `deferred-items.md` are all present.
- Commits `eed9e50`, `27fd954` and `08b364b` are all in `git log`.
- The golden check prints `540 540 merge,random`. `mergeDB_legacy` and `blank_legacy` are byte-identical to BASE. `grep -c "^function stripDraft(\|^function keepLocalDraft(" index.html` prints 2.
