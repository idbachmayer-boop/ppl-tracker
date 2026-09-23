---
phase: 04-draft-goes-device-local
verified: 2026-09-23T12:30:00Z
status: human_needed
score: 34/35 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Two-device check for D-02 (harvested from 04-03-PLAN.md Task 2 <human-check>). Serve this branch locally (e.g. `python -m http.server 8000`), open it on the desktop and sign in to Ian's account. On the phone, which is still on the live build, start a workout and log one set. Reload the desktop and look at Today and at Train, then Log. On the desktop, start a different workout and discard it. Let the phone sync, then check its workout. Finish the workout on the phone and look at the desktop's History."
    expected: "The desktop never shows a 'Workout in progress' card on Today; Train, then Log shows the workout picker, never the phone's workout. Starting and discarding on the desktop leaves the phone's workout and its set unchanged. The finished session appears in the desktop's History. One 'Synced from another device' toast on the desktop's first sync after loading the new build is expected; a second with no real change is not. If Firebase refuses sign-in on localhost, add localhost under Authentication > Settings > Authorized domains, or run against the deployed build after merge."
    why_human: "Needs two real signed-in devices against live Firestore. The suite fakes the transaction and cannot show what a second device renders. This is also the plan 04-03 `verification: backstop` truth (D-02 on real devices)."
  - test: "Decide on WR-02 before shipping: a stored local draft that is a truthy non-object (\"x\", 42, true) survives normalize(), crashes the Log tab, and can no longer be cleared by any sync."
    expected: "Either accept the residual risk (such a value can only be pre-Phase-4 residue: a malformed cloud draft adopted by an older build, or an old hand-edited backup import), or land the one-line normalizeDraft fix plus a boot-from-stored-blob test for every DRAFT_SHAPES value before merge."
    why_human: "DRAFT-03 is met as written (it is about a cloud document), so this is not a gap against the contract. But Phase 4 removed the only automatic recovery path for this state, and whether that trade is acceptable is a product call."
---

# Phase 4: Draft Goes Device-Local Verification Report

**Phase Goal:** The in-progress workout stops crossing the wire at all, so a crash or a malformed legacy `draft` field arriving from another device can never corrupt or clear the workout Ian is mid-set on, at the rack, right now.
**Verified:** 2026-09-23
**Status:** human_needed
**Re-verification:** No, initial verification

Evidence base: code read directly from `index.html` at HEAD `e9f4fb0`, diffed against the pre-phase commit `2b5718e`; one full `npm test` run (786 passed, 0 failed, 2 skipped, both skips are the git-ignored real-backup checks); two scratch spot-check scripts run against `test/harness.js` (not committed, no source modified).

## Goal Achievement

### Roadmap Success Criteria

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC1 | Finishing or discarding a workout produces no cloud write containing `draft` state, following the `wx` exclusion pattern (DRAFT-01, DRAFT-04) | VERIFIED | `mergeDB()` does `delete win.draft` next to `delete win.wx` in the gen-mismatch branch (index.html:4165-4166) and `delete out.draft` next to `delete out.wx` in the recency branch (4181-4182). `pushNow()` serializes the merge result, so the wire is covered. `snapPayload()` strips it for the snapshot ring and `cloudVersion()` (787). `discardWorkout` now uses `saveLocal()`, so no push at all. Tests: "DRAFT-04: finishing pushes the session with no draft key", "finishing writes a workout version with no draft key", "the post-push reconciliation cannot bring the finished draft back", "discarding stores null locally with no updatedAt bump and no push". All drive the real `pushNow()` transaction through `fakeCloud()` and inspect `tx.set` payloads. |
| SC2 | A cloud document still carrying a legacy `draft` cannot reintroduce a draft onto a device (DRAFT-02) | VERIFIED | `adoptMerged()` wraps every merged result in `keepLocalDraft()` before the equality check and before `normalize()` (4304-4307). It is shared by sign-in merge, first-link merge, the live listener and post-push reconcile. The cloud-copy choice strips before normalize (4353). Import/restore paths use `keepLocalDraft(normalize(stripDraft(raw)))` (3612, 3619, 4485, 4498). Tests: "a device with no draft shows no Workout in progress card after syncing a cloud draft", "a newer cloud draft does not replace this device's draft at sign-in", "the live listener leaves this device's draft untouched", "a remote Erase keeps this device's draft", plus the `dbAssignLines` tripwire over every `DB =` statement. |
| SC3 | The Log tab renders without error when the cloud document's legacy `draft` is malformed or absent (DRAFT-03) | VERIFIED (as written; see WR-02 note) | Tests "DRAFT-03: the Log tab draws for every malformed cloud draft" (8 shapes × {no draft, mid-workout}, via the real live listener, then `go('train'); setSub('log')` and a check for the error card) and "the cloud-copy choice survives every malformed cloud draft". The battery excludes `null`/`absent`, so I ran a spot check: a mid-workout device adopting a newer cloud doc with the `draft` key absent, and then with `null`, keeps its draft and the Log tab draws (`ok`). |
| SC4 | Closing and reopening the app on the same device preserves the in-progress workout exactly (DRAFT-05) | VERIFIED | 23 draft functions switched `save()` to `saveLocal()` (diff confirmed), which writes to localStorage immediately. Tests: "closing and reopening the app restores the draft exactly", "a draft reopened for editing survives close and reopen with its editRef", "a draft survives a sync adoption and then a reopen". Spot check: `startWorkout('PUSH 1')`, `setVal`, then boot a fresh instance from the stored blob. The draft is deep-equal and the Log tab draws. |

### Plan must-haves (merged)

| Plan | Truths | Verified | Notes |
|------|--------|----------|-------|
| 04-01 | 13 | 13 | Tracer (setVal: stored, no `updatedAt` bump, no push); pushed blob has no `draft` via the real transaction; newer cloud draft ignored at sign-in and by the listener; `mergeDB` returns no draft for 10 shapes × 3 gen relations × 2 tie rules × 2 ages × 3 local states (360 runs, asserted count); inputs unmutated; REG-10 block test passes; snapshot/version/backup have no draft; finish/discard behaviour; golden fixture has 540 keys and the 400-case battery passes; `mergeDB_legacy`/`blank_legacy` byte-identical to `2b5718e` (checked by diff); EDGE empty and ordering. |
| 04-02 | 11 | 11 | `importMerge`/`importReplace` extracted and called by `importData()`; both restores; Erase clears; cloud-copy choice keeps local draft; remote Erase; no Resume card on a draftless device; malformed battery; `dbAssignLines` tripwire; same-workout, same-date adjacency; non-object encoding shapes. |
| 04-03 | 7 | 6 + 1 human | `DRAFT_ONLY_MUTATORS` behavioural table (25 functions: no bump, no push); `DRAFT_PUSHERS` allowlist is exactly pickEx/exPick/finishWorkout; new-exercise pick still pushes the registry row with no draft; reopen replays; CLAUDE.md rule present at lines 42-50, names both helpers, and is test-enforced; editRef edge. The `verification: backstop` truth "D-02 on real devices" needs the human check. |

**Score:** 34/35 truths verified (4 roadmap SCs + 31 plan truths). The remaining 1 is the backstop real-device truth, routed to human verification. 0 are present but behaviour-unverified: every behaviour-dependent truth (no push, no bump, draft kept across adoption, reopen) has a named passing test that drives the real code path.

### DRAFT-03 and WR-02: explicit judgment

**DRAFT-03 as written ("The Log tab renders correctly when a cloud document carries a malformed legacy `draft`") is MET.** A cloud document's `draft` can no longer reach `DB.draft` by any path. It is deleted in both `mergeDB` branches, overwritten by `keepLocalDraft()` in `adoptMerged()`, and stripped before `normalize()` on the cloud-copy, import and restore paths. The Log tab is drawn after every malformed cloud shape in the test battery.

**WR-02 is real, and I reproduced it.** I booted from a stored blob with `draft: "x"`, `42` and `true`. Each time the Log tab showed "Something broke on this screen". After adopting a newer remote with `draft: null`, `DB.draft` was still `"x"` / `42` / `true`. The cause is that `normalizeDraft()` returns early on `typeof k !== 'object'` (index.html:658), which is unchanged from before the phase.

Why this does not fail DRAFT-03: the bad value is a *local stored* draft, not a cloud document. After Phase 4, no path can create one. Import, restore, cloud choice and merge all strip foreign drafts, and local draft writers only build objects. The only source is residue from before Phase 4. For example, an older build's merge adopted a string draft from the cloud (the pre-phase `normalizeDraft(out)` let strings through), or an old hand-edited backup was imported. So the state originated in a cloud document before the change, not from one arriving after it.

Why it still matters: before Phase 4, the next newer remote write with `draft: null` cleared that state. D-05 now makes the local draft untouchable by sync, so the crash is permanent until Erase or a History → backdate start. The Discard button lives inside the crashed `viewActive()`. Phase 4 did not introduce the crash, but it removed the recovery. The phase goal ("a malformed legacy draft arriving from another device can never corrupt ... the workout") is met for arrivals after the change. The residue case is a WARNING and a human decision, not a BLOCKER. The fix is small: extend the early return in `normalizeDraft` to null non-object and array drafts, and add a boot-from-stored-blob test over `DRAFT_SHAPES`.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `index.html` `stripDraft()` / `keepLocalDraft()` | Helpers after `normalizeDraft()` | VERIFIED | Lines 670-678; 9 call sites; function declarations (hoisted), not called from normalize/load/migrations |
| `index.html` `mergeDB()` draft removal | Both branches | VERIFIED | 4166, 4182; merge-output `normalizeDraft(out)` repair removed |
| `index.html` `snapPayload()`, `exportData()` | Exclude draft | VERIFIED | 787; 3388 (copies before stripping, so `DB.draft` is untouched) |
| `index.html` `importMerge`/`importReplace` | Extracted, called by `importData()` | VERIFIED | Present; `importData()` delegates |
| `index.html` restore paths, cloud-copy choice | strip → normalize → keep | VERIFIED | 4485, 4498, 4353 |
| `index.html` 23 draft functions → `saveLocal()` | D-09 | VERIFIED | Diff shows each switch; `pickEx`, `exPick`, `finishWorkout` keep `save()` |
| `test/harness.js` | names + `fbDb` accessor | VERIFIED | Present; `fetch` changed to never settle (see WR-05) |
| `test/app.test.js` | DRAFT blocks, fakeCloud, tripwire, mutator table | VERIFIED | All present and passing; assertions check run counts, so they cannot pass vacuously |
| `test/fixtures/merge-golden.json` | 540 keys | VERIFIED | 540 |
| `CLAUDE.md` | Draft rule paragraph | VERIFIED | Lines 42-50 |
| `docs/adding-a-collection.md` | saveLocal sentence corrected | VERIFIED | 3-line diff |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `mergeDB()` draft delete | Firestore `tx.set` | `pushNow()` → `JSON.stringify(merged)` | WIRED (tests read the fake `tx.set` payload) |
| `keepLocalDraft()` | sign-in, first-link, listener, reconcile | single `adoptMerged()` path, before the equality check | WIRED (4304-4305) |
| `snapPayload()` | `snapshotNow()` + `cloudVersion()` | shared payload builder | WIRED |
| `stripDraft()` before `normalize()` | migrations (17) | import/restore/cloud-copy | WIRED (tests: no draft-only registry row via import or cloud-copy) |
| `save()` → `schedulePush()` | draft functions | 25 now `saveLocal()` | WIRED (spy table) |
| CLAUDE.md rule | `dbAssignLines` + `DRAFT_PUSHERS` | test checks names in CLAUDE.md and functions in index.html | WIRED |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full suite | `npm test` (run once) | 786 passed, 0 failed, 2 skipped | PASS |
| Absent/null cloud draft on a mid-workout device | scratch `spot2.js` via harness | draft kept = true; Log tab `ok` (both) | PASS |
| Reopen from stored blob | scratch `spot2.js` | draft deep-equal = true; Log tab `ok` | PASS |
| WR-02 reproduction (local truthy non-object draft) | scratch `spot.js` via harness | Log tab `ERROR CARD` for "x", 42, true; still present after a newer remote null draft | CONFIRMED (warning) |
| Frozen legacy functions | awk-extract + diff vs `2b5718e` | identical | PASS |

### Probe Execution

Not applicable: the phase declares no probes and `scripts/*/tests/probe-*.sh` does not exist.

### Requirements Coverage

| Requirement | Source Plan | Status | Evidence |
|-------------|------------|--------|----------|
| DRAFT-01 | 04-01 | SATISFIED | SC1; mergeDB shape battery; sign-in push has no draft key |
| DRAFT-02 | 04-01, 04-02 | SATISFIED | SC2; all inbound doors plus the tripwire |
| DRAFT-03 | 04-02 | SATISFIED as written | SC3; see the WR-02 judgment above |
| DRAFT-04 | 04-01 | SATISFIED | finish and discard tests through the real transaction |
| DRAFT-05 | 04-03 | SATISFIED | reopen replays; mutator table |

REQUIREMENTS.md maps only DRAFT-01..05 to Phase 4, and each is claimed by at least one plan. No orphans.

### Prohibitions (judgment tier)

All were checked against the diff; none is violated. No new `set()` outside the transaction and no one-off cleanup write. `SCHEMA` is still 18, with no new `MIGRATIONS` entry and no dependency. `_legacy` functions are byte-identical. Non-draft sync is unchanged: `pickEx`, `exPick` and `finishWorkout` still push, and the new-exercise test confirms it. No draft-derived signal goes on the wire. Fixtures use synthetic `populatedDB()` data, and the real-backup tests are skipped and git-ignored.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (phase diff) | — | TBD/FIXME/XXX/TODO | none found | — |
| `index.html` | 658 | `normalizeDraft` lets truthy non-object drafts through (WR-02) | WARNING | Permanent Log tab crash for pre-phase residue; sync can no longer clear it |
| `index.html` | 807-815, 1605 | Quota failure: the draft now has no durable copy and the banner says cloud sync protects it (WR-06) | WARNING | Under quota failure, a crash or reload loses the workout, which cuts against the "crash can never clear" goal wording in that edge case |
| `index.html` | 1913, 2729 | `pickEx`/`exPick` bump and push even when the registry did not change (WR-03) | WARNING | A mid-workout device can look "newest" for whole-field scalars |
| `index.html` | 2016 | Dangling `exId` after restore/Replace/remote Erase (WR-04) | WARNING | Synced session with an id that no registry row owns |
| `index.html` / `test/harness.js` | 2867; 80 | Weather fetch loop, which predates the phase (WR-01); the harness never-settle `fetch` hides it (WR-05) | WARNING | Not a Phase 4 goal item; no later roadmap phase covers it |

### Human Verification Required

#### 1. Two-device check for D-02

**Test:** Serve this branch locally and sign in on the desktop. On the phone, still on the live build, start a workout and log a set. Reload the desktop and check Today and Train → Log. Start and discard a different workout on the desktop. Finish on the phone.
**Expected:** The desktop shows no Resume card and never shows the phone's workout. The phone's workout is unchanged by the desktop's start/discard. The finished session appears in the desktop History. There is at most one "Synced from another device" toast at cutover.
**Why human:** It needs two real devices against live Firestore.

Cutover note carried from plans 04-02/04-03: after deploy, a second device showing a Resume card for a workout it did not start should be discarded there, never finished. Finishing it would log a duplicate partial session (IN-05).

#### 2. Decide on WR-02

**Test:** Choose between accepting the residue-only risk and landing the `normalizeDraft` type guard with a stored-blob boot test before merge.
**Expected:** A recorded decision.
**Why human:** The contract (DRAFT-03) is met; the recovery trade-off is a product call.

### Gaps Summary

No blocking gaps. Every roadmap success criterion and every plan truth that can be automated has direct evidence in the code and a named passing test that drives the real path (`pushNow` transaction, live listener, `onSignedIn`, router). DRAFT-03 is met as written. WR-02 is a real, reproduced recoverability regression for pre-phase local residue. Phase 4 did not create the crash, but it removed the only automatic way out, so it is raised as a human decision rather than a gap. The status is `human_needed` because of the deferred two-device check (the plan's backstop truth) and the WR-02 decision.

---

_Verified: 2026-09-23_
_Verifier: Claude (gsd-verifier)_
