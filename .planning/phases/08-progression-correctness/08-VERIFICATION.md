---
phase: 08-progression-correctness
verified: 2026-10-10T13:30:00Z
status: passed
score: 17/18 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:

  - test: "Real workout on Ian's phone. First check that Settings → This version ends with 99e10c8. Then: (1) open the PUSH workout with the DB lateral raise and look at its card before logging; (2) do the workout, skip one set (or leave one set's reps blank) on one exercise, and finish; (3) start the same workout again, look at that exercise's card, then Discard; (4) if a bodyweight exercise hit the top of its range on every set last time, look at its card; (5) optionally, Edit a past workout and re-save it unchanged."
    expected: "(1) No ⚠ Stalled on the DB lateral raise. Any ⚠ Stalled card says 'no extra rep or weight for 3 sessions in a row' and offers Deload −10%. (3) No ⬆ Add weight on the exercise with the skipped or blank set, and Last time shows the sets actually done. (4) '⬆ Add weight (belt) or harder variation', with no number. (5) The sets are unchanged. No sync error on either device. On a blank app, wrong advice or a sync error: run git revert -m 1 --no-edit 99e10c8b7e46b0fc507aced553c7dbb8dcbdafb4 on main and push at once."
    why_human: "Needs Ian's real history, the deployed PWA on his phone, and a real workout. The suite replays the same cases on fixtures, and only the device shows the advice on his actual data. This is the phase's declared verification mode (backstop truth, 08-03 Task 3 human-check)."

  - test: "Product decision on WR-02 (left open on purpose in 08-REVIEW-FIX.md): the stall comparison uses total reps even when the number of worked sets changed between sessions."
    expected: "Ian decides whether a session with a set removed (rmSet) should read as flat and a session with a set added (+ Add set) should read as progress, as they do now. Either keep it, or extend D-03/D-10 in a later phase."
    why_human: "The behaviour matches PROG-02's wording ('total reps across all sets went up by at least 1'). Whether that is the right rule is a product call, and code can't settle it."
---

# Phase 8: Progression Correctness Verification Report

**Phase goal:** The add-weight and stall advice on each exercise card matches what Ian actually lifted.
Weight goes up only after a full session with every set at the top of the range. A stall means three
sessions in a row without progress, each against the session before it. That ends the false DB lateral
raise warning and the stalls that kept coming back.
**Verified:** 2026-10-10
**Status:** human_needed
**Re-verification:** No, this is the first verification

## Goal Achievement

The code and the suite carry the goal. Three things were checked directly:

- `index.html` at HEAD is byte-identical to the merged `99e10c8` (`git diff 99e10c8 HEAD -- index.html test/app.test.js` is empty).
- `TZ=America/Chicago npm test` gave `984 passed, 0 failed, 2 skipped` (exit 0). Both skips are the local-only real-backup checks.
- `npm run csp:check` gave `CSP hash OK sha256-vIizx9pDW8e7DQXXv28JrxiESnjc7wUnpzuz431d1vM=` (exit 0).

One item is still open: the end-of-phase phone workout.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1 / PROG-01: after a session with every planned set done at the working weight and at the top of the range, the next session suggests adding weight. Two sets at the top plus a skipped or missing set does not. | ✓ VERIFIED | `addWeightVerdict` (index.html:1113) blocks on any skipped set, `blankSets > 0` or no worked set. `addWeightInfo` is called from viewActive (L1879) and the startWorkout prefill (L1819). Tests that pass and drive the real flow (setVal → skipSet → finishWorkout → startWorkout → viewActive): "PROG-01: every set at the top earns ⬆ Add weight…" and "PROG-01: a skipped set means no ⬆ Add weight next time, and the prefill keeps last time's 25" |
| 2 | SC2 / PROG-02, PROG-03: progress is +1 total rep or more weight against the previous session. Extra reps on sets 2 and 3 count, so the DB lateral raise is not flagged. | ✓ VERIFIED | `sessionSummary` sums reps over every worked set and `compareSessions` (L1194-1205) applies the rule. Passing tests: "PROG-03: DB lateral raise at 25 lb, 20/17/15 → … → 20/19/16, is not stalled and its card shows no ⚠ Stalled", and "PROG-02: heavier is progress, the same weight with +1 total rep is progress…" |
| 3 | SC3 / PROG-03: ⚠ Stalled appears only after 3 flat sessions in a row, each against the one before and never against the all-time best. One session of progress clears it. | ✓ VERIFIED | `stallStreak` (L1216) resets to 0 on any non-flat comparison and `isStalledSlot` checks `>= 3`. `slotE1rmSeries` and `maxBefore` are gone (grep finds 0). Passing tests: "baseline plus 3 flat… stalled", "baseline plus 2 flats is not stalled", "D-06: one session of progress clears the warning", "D-06: never compared with the all-time best". The banner (L1897) says why and offers Deload −10% |
| 4 | SC4 / PROG-04: a renamed or merged exercise keeps its progress and stall history through `exKey`. | ✓ VERIFIED | `slotHistory` and `lastAttemptEntry` match on `exKey(e) === exKey(exName)` (L1103, L1207-1211). Passing tests: alias spellings, the same exId under an old display name, and `exMerge` joining two streaks |
| 5 | SC5 / PROG-05: bodyweight stalls after 3 sessions without +1 total rep. All sets at the top shows "add weight (belt) or harder variation" with no number. | ✓ VERIFIED | `setWeightNum` maps 0 or blank to 0, so W is 0 on both sides and the comparison falls back to reps. The flag wording is at L1881 (`hasLoad` false), and the prefill writes no bumped number (L1823). Passing tests: "PROG-05/D-08" for weight 0 and for a blank weight, covering both stall and flag. "bodyweight at 20, 20 and 19 gives no add-weight flag" also passes |
| 6 | D-01: a blank set at finish is stored as `blankSets`. It blocks add weight, survives editSession plus a re-save, and survives a stale-device merge replay. | ✓ VERIFIED | finishWorkout (L2122-2127) counts blanks on the copied rows. editSession (L2348-2352) restores them as blank rows, capped at 20. Passing tests: "D-01: a set left blank at finish…", "editSession shows the blank set again…", "a stale-device merge replay keeps blankSets 1…", "WR-01: a Finish that throws part-way…" |
| 7 | D-01: an added set must also reach the top. A set removed with rmSet is not missing. | ✓ VERIFIED | Passing tests: "+ Add set counts: four sets at the top earn → 30", "an added set below the top blocks", "a set removed with rmSet is not missing" |
| 8 | D-02: every worked set at the working weight. 30/30/25 gives no flag, 30/30/30 gives → 35. | ✓ VERIFIED | `allTop` requires `setWeightNum(x) === W` (L1119). Both D-02 tests pass. WR-03's `nearWeight` stops a reps-only added, unskipped or restored row from silently reading as BW (3 WR-03 tests pass) |
| 9 | D-09: when the latest entry has every set skipped or blank, there is no suggestion, and Last time plus the prefill still come from the last real attempt. | ✓ VERIFIED | `lastAttemptEntry` (L1102) accepts entries with sets or `blankSets`. `lastRealEntry` still feeds Last time (L1872) and the prefill (L1817). Three D-09 / D-07 tests pass, including the legacy `sets: []` case |
| 10 | D-07: nothing stored is rewritten. SCHEMA is unchanged, there is no migration, verdicts are computed at render time, and DRAFT_PUSHERS is unchanged. | ✓ VERIFIED | `SCHEMA = 18` (L481), and the phase diff (`39f69e5..HEAD`) has no SCHEMA, MIGRATIONS or added `save()` lines. `DRAFT_PUSHERS = ['exPick','finishWorkout','pickEx']`, and its check passes. Both D-07 "leaves every session unchanged" tests pass |
| 11 | D-03, D-05, D-10: a lighter session restarts the count. A deload, a skipped day, or a session with a skipped or blank set pauses it. | ✓ VERIFIED | `stallStreak` skips deloads, skipped sets and blankSets, and `slotHistory` skips skipped days. A `'lighter'` result resets the streak. All D-03, D-05 and D-10 tests pass (11 checks) |
| 12 | D-04: each workout and slot keeps its own streak. | ✓ VERIFIED | `slotHistory` filters by workout and slotIndex. "D-04: … PUSH 2's own slot is not stalled" passes |
| 13 | The F2 stalled-slot fixture still renders Deload, and the handler inventory still passes. | ✓ VERIFIED | `f2Stall` (test L7181). The check "DELEG-02: every active-workout control calls its function with exactly the arguments…" asserts `busyStalled === true` and passes |
| 14 | 08-03: pre-flight green, and the shipped diff touches only index.html, test/app.test.js, CLAUDE.md and .planning. | ✓ VERIFIED | `git diff --name-only f71c6e4 99e10c8` minus `.planning/` lists exactly CLAUDE.md, index.html and test/app.test.js. The suite and csp:check were re-run green here |
| 15 | 08-03: shipped as a merge-commit PR, with the deploy's CSP check passing. | ✓ VERIFIED | `git rev-list --parents -n1 99e10c8` shows 2 parents (f71c6e4, 8221d92). The live page passing csp-hash --check (row 16) confirms the deploy published a matching script |
| 16 | 08-03: the live index.html passes --check, its stamp ends with main's sha7, and it declares the new helpers. | ✓ VERIFIED | Fetched here, signed out and cache-busted: stamp `2026-10-10T12:42:16Z 99e10c8`, `node scripts/csp-hash.js --check` exit 0 with the same hash, and the helper grep count is 4 |
| 17 | 08-03 (backstop): on Ian's phone running 99e10c8, the DB lateral raise shows no ⚠ Stalled, a skipped or blank set blocks ⬆ Add weight, and bodyweight at the top shows the belt wording. | ? UNCERTAIN (human) | `verification: backstop`. This needs the real device and real data, so it goes to Human Verification item 1. The fixture equivalents of every clause pass (truths 1, 2 and 5) |
| 18 | 08-03: on any failure, the response is `git revert -m 1` of the merge, not a hotfix forward, and no data is lost. | ✓ VERIFIED | The revert command with the full MERGE sha is in 08-03-SUMMARY. With no SCHEMA change and `blankSets` purely additive (ignored by older builds), a revert loses no data |

**Score:** 17/18 truths verified (0 present-but-behavior-unverified; 1 backstop truth waiting on the phone check)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `index.html` | setWeightNum, workedSets, weightStep, lastAttemptEntry, addWeightVerdict, addWeightInfo(workout, slotIndex, name); blankSets at finish and in edit; the BW wording | ✓ VERIFIED | All are declared (L1095-1129), substantive, and called from viewActive and startWorkout |
| `index.html` | sessionSummary, compareSessions, slotHistory, stallStreak, isStalledSlot(name, workout, slotIndex); the reworded banner; the GUIDE copy | ✓ VERIFIED | L1194-1230; banner L1897; GUIDE L473 (see IN-01 below) |
| `test/app.test.js` | The PROG section with its own loadApp instance and the latSess/latRun/latCard builders | ✓ VERIFIED | L7716 onward. 61 PROG/D-xx/WR checks, all passing |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| viewActive flag | addWeightInfo | `addWeightInfo(name, i, entry.name)` | ✓ WIRED | L1879 |
| startWorkout prefill | addWeightInfo | `addWeightInfo(name, i, exName)` | ✓ WIRED | L1819, and the prefill uses `aw.allTop && aw.hasLoad` (L1823) |
| addWeightInfo | lastAttemptEntry + addWeightVerdict + weightStep | direct calls | ✓ WIRED | L1125-1128 |
| finishWorkout | stored entry | `blankSets` on the copy | ✓ WIRED | L2125, row built from `entries` (L2142) |
| weightStep | INCREMENT | the Phase 9 seam | ✓ WIRED | L1098 (`translateLoad` still reads INCREMENT directly, IN-04) |
| viewActive coach banner | isStalledSlot → stallStreak | `isStalledSlot(entry.name, name, i)` | ✓ WIRED | L1897 |
| stallStreak | slotHistory → liveSessions + exKey | per workout, slot and identity | ✓ WIRED | L1206-1218 |
| stallStreak | sessionSummary + compareSessions | each counted session against the one before | ✓ WIRED | L1221-1224 |
| f2Stall | busyStalled === true | fixture | ✓ WIRED | test L7331, L7396 |
| merge commit | revert command | MERGE sha | ✓ WIRED | 08-03-SUMMARY § Revert |
| live index.html | csp-hash --check | downloaded bytes | ✓ WIRED | Re-run here, exit 0 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| Add-weight flag | `aw` | `lastAttemptEntry` → `liveSessions()` (DB.sessions) | Yes, real session history | ✓ FLOWING |
| Stall banner | `isStalledSlot` result | `slotHistory` → `liveSessions()` | Yes | ✓ FLOWING |
| `blankSets` | entry field | counted from the draft's blank rows in finishWorkout | Yes, stored on the synced row | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full suite, run once | `TZ=America/Chicago npm test` | `984 passed, 0 failed, 2 skipped`, exit 0 | ✓ PASS |
| CSP hash matches the inline script | `npm run csp:check` | `CSP hash OK sha256-vIizx9…` | ✓ PASS |
| Live build carries the phase | signed-out GET + `node scripts/csp-hash.js --check` + helper grep | stamp `… 99e10c8`, exit 0, 4 helpers | ✓ PASS |
| Shipped code = verified code | `git diff --stat 99e10c8 HEAD -- index.html test/app.test.js` | empty | ✓ PASS |

### Probe Execution

Step 7c: SKIPPED. No `scripts/*/tests/probe-*.sh` exists, and no plan declares a probe.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PROG-01 | 08-01, 08-03 | Add weight only when every planned set was done and at the top at the working weight | ✓ SATISFIED | Truths 1, 6, 7, 8, 9 |
| PROG-02 | 08-02, 08-03 | Progress = +1 total rep or more weight against the previous session | ✓ SATISFIED | Truths 2, 11 (see WR-02) |
| PROG-03 | 08-02, 08-03 | Stalled only after 3 sessions in a row, never against the all-time best, and later-set reps count | ✓ SATISFIED | Truths 2, 3 |
| PROG-04 | 08-02, 08-03 | History follows exKey | ✓ SATISFIED | Truths 4, 12 |
| PROG-05 | 08-01, 08-02, 08-03 | Bodyweight stalls on reps, and the belt wording has no number | ✓ SATISFIED | Truth 5 |

Every Phase 8 ID in REQUIREMENTS.md (L166-170) is claimed by a plan. None is orphaned.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| index.html / test/app.test.js | none | TBD/FIXME/XXX/TODO/HACK in added lines | — | None found in `git diff 39f69e5 HEAD` |
| index.html | none | new inline on-event attribute or stopPropagation | — | None added |
| index.html | 1201-1205 | WR-02: total reps compared across different set counts | ⚠️ Warning | Removing a set reads as flat and adding one reads as progress. Consistent with PROG-02's wording, so this is a product decision (Human item 2), not a gap |
| index.html | 473 | IN-01: the guide still calls total reps a "Tiebreaker" when it is now the rule | ℹ️ Info | The copy is slightly contradictory. The rules it states are correct |
| index.html | 2346-2352 | IN-02: restored blank rows move to the end of the set list in editSession | ℹ️ Info | Cosmetic order change on edit |
| index.html | 2321-2343 | IN-05: an older-build device re-saving an edited session drops `blankSets` under a newer mtime | ℹ️ Info | One fewer add-weight block until both devices update. No data loss |

### Human Verification Required

#### 1. Real workout on Ian's phone (the phase's verification mode)

**Test:** Check that Settings → This version ends with `99e10c8`. Then do the 5 steps in the frontmatter: the lateral raise card, a skipped or blank set followed by restarting the workout, the bodyweight card, and an optional edit and re-save.
**Expected:** No false ⚠ Stalled on the DB lateral raise. No ⬆ Add weight after a skipped or blank set. The bodyweight card shows "(belt) or harder variation" with no number. No sync errors. On failure, revert `99e10c8` at once.
**Why human:** It needs the real device, the deployed PWA and Ian's actual training history.

#### 2. WR-02 product decision

**Test:** Decide whether a change in set count should still let total reps decide progress.
**Expected:** Either accept the current behaviour or schedule a follow-up that extends D-03 and D-10.
**Why human:** This is a product rule, not a defect against the written requirement.

### Gaps Summary

There are no blocking gaps. All five roadmap success criteria and every plan truth that the code can carry have passing behavioural tests on the real draft, finish and render flow. The shipped bytes are identical to the verified tree, and the live page carries them with a valid CSP hash. The status is `human_needed` for two reasons: the end-of-phase phone workout (the phase's declared verification mode) has not been run, and WR-02 is waiting on Ian's product call.

---

_Verified: 2026-10-10_
_Verifier: Claude (gsd-verifier)_
