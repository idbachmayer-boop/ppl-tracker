---
phase: 10-log-page-history-and-skip
verified: 2026-10-20T00:00:00Z
status: human_needed
score: 12/17 must-haves verified (5 phone backstop truths await Ian's real workout)
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Settings → This version ends with 9a4e647 on the phone before anything is judged. Tap Last time on one card, then on a second card, and read the rows."
    expected: "One panel at a time, directly under the line, up to 5 rows newest first, each with a date, a workout label such as PUSH 1, and the sets; deloads show ↓ deload, skips show skipped or skip, PRs show 🏆, notes sit on their own line. Every set already entered is unchanged."
    why_human: "Backstop truth (10-04). The vm harness renders strings; it cannot show the real Android layout, the real tap, or Ian's real history."
  - test: "Collapse another card, scroll so the open panel is mid-screen, tap Full chart in Strength, then Back to workout. Repeat, returning through Train → Log instead."
    expected: "Strength opens on that exercise with Back to workout at the top. Both returns land on the Log tab at the same scroll spot (not the top), the panel still open, the collapsed card still collapsed, every number unchanged."
    why_human: "Backstop truth (10-04; RESEARCH assumptions A1/A2). The suite stubs window.scrollTo and proves it is called with the recorded y; whether Android Chrome honours scrollTo right after render() is only visible on the phone."
  - test: "Log one set on an exercise, tap the header skip icon, type a reason. Swipe the installed PWA away, reopen it. Tap Undo, check the weights, skip again, finish."
    expected: "One line '{name} · {set} · rest skipped: {reason}' with Undo on the right; still that line after the full close and reopen; Undo brings back the logged set and the earlier weights; re-skip and finish save normally."
    why_human: "Backstop truth (10-04). Reload is proven against the stored blob in the harness and in this verifier's own probe, but a real PWA process kill and relaunch on Android is not reproducible here."
  - test: "After that workout, open Workout history; then start (or look at, then Discard) the next session of that workout."
    expected: "History reads '{name} — {set} · rest skipped: {reason}'. The next card shows no ⬆ Add weight, its Last time line keeps the last real numbers, with 'Rest skipped {date}: {reason}' under them."
    why_human: "Backstop truth (10-04). Logic verified by the suite and the probe on fixtures; the real-history outcome on the deployed build is Ian's check."
  - test: "Look at a card header on the phone at about 380px."
    expected: "The skip icon sits left of the caret without crowding the rep-range badge or the ⬆ Add weight flag; the history panel reads cleanly under Last time; a skipped card is one line with Undo on the right."
    why_human: "Visual layout at a real viewport width; no automated check can judge crowding."
  - test: "Read the judgment-tier prohibitions table in this report (non-authoritative LLM verdicts)."
    expected: "Ian agrees each listed prohibition held, or names the one that did not."
    why_human: "The PLAN prohibitions carry no verification tier, so they are judgment-tier. Several are enforced by suite tripwires (cited), the rest are this verifier's reading of the code: unverified-prohibition — human review recommended."
---

# Phase 10: Log Page — History and Skip Verification Report

**Phase Goal:** Mid-workout, Ian can see how an exercise went over its last 5 sessions without leaving the workout, and can skip a whole exercise (with an optional reason, and undo) in a way that correctly blocks adding weight next time.
**Verified:** 2026-10-20
**Status:** human_needed
**Re-verification:** No, initial verification

The roadmap names the phase's verification as "a real workout on Ian's phone, plus the automated
suite". I re-ran the automated half myself and probed the behaviour independently, and it holds. The
phone half has not been run, so it is listed under human verification and not claimed.

## Evidence I produced myself (not from SUMMARYs)

- `TZ=America/Chicago npm test` on HEAD `3b0e396`: **1245 passed, 0 failed, 2 skipped**. The 2 skips
  are the local-only real-backup checks (`test/local/real-db-snapshot.json` is git-ignored and absent).
  The LOG section (`── LOG: history and skip on the workout card (LOG-01..05) ──`) holds 104 passing
  checks, including the WR-01/02/03 regression checks.
- `npm run csp:check`: `CSP hash OK sha256-YqyU1GkbjGfE6MvOw4GtpHimhDverzR/ZJysw4nOlO8=`.
- Live site (signed-out GET of `https://idbachmayer-boop.github.io/ppl-tracker/index.html`): build stamp
  `2026-10-20T13:55:20Z 9a4e647`; `node scripts/csp-hash.js --check <live file>` prints the same hash,
  OK; `const SCHEMA = 19;` present; all 8 phase helpers present; the WR-01 `skipId` parameter and the
  WR-03 `st.exSkip=true` marker present, so the review fixes are live.
- `git ls-remote origin main` = `9a4e6471…`; `gh pr view 15`: MERGED, merge commit `9a4e647`, head
  `0c765f0` (which contains the WR-01..03 fix commits b22496b, e9f4caa, d410e44). `git diff 0c765f0 HEAD`
  touches only `.planning/` files, so the verified tree equals the shipped tree in code.
- An independent probe I wrote (scratchpad, not in the repo) drove the app through `ACTIONS` click
  wrappers in the harness. Results: Last time is a `toggleExHist` button; opening gives a 3-row panel
  with the stored blob, draft and `updatedAt` unchanged and the screen still `train/log`; the chart link
  goes to `train/progress` with Back to workout; returning lands on `train/log` with `scrollTo(0, 640)`
  (the recorded y), the panel still open and the draft unchanged; a skip after one set renders
  `DB lateral raise · 25×20 · rest skipped: shoulder` + Undo with `updatedAt` unchanged (saveLocal
  only), and the reason is stored trimmed; a fresh boot from the stored blob keeps the skipped card;
  Undo restores `[25,20],[27.5,''],[27.5,'']` exactly with no `skipped`/`reason`/`_preSkip` left; re-skip
  and finish write `skipped:true, reason:'shoulder'` with per-set skipped flags and no `"_` key anywhere
  in the session; the next PUSH 1 card has no `class="flag"`, keeps `Last time (Aug 7): <strong>25×20</strong>`
  and adds `Rest skipped Aug 7: <em>shoulder</em>`. The positive control showed the flag before the skip.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1 / LOG-01: tapping Last time opens the exercise's last 5 sessions inline; the workout is never left and every entered set is unchanged | ✓ VERIFIED (automated) | `viewActive` index.html:2153-2156 renders `<button class="lasttime tap" data-action="toggleExHist">`; panel `exhPanelHTML` :2440 via `exerciseRecent(exKey(entry), 5, DB.draft.editRef)` :2919 over `liveSessions()`; `toggleExHist` :2599 only flips `openExHist` and renders. Suite: LOG-01 tracer (a)(b), D-01 ×5, D-04, D-05, D-06 ×4 incl. "no tap writes the stored blob, the draft or updatedAt, pushes, or leaves Train → Log". Probe confirms. Phone half → human item 1 |
| 2 | SC2 / LOG-02: the inline history links to the exercise's full Strength chart, and returning to Log finds the workout exactly as it was | ✓ VERIFIED (automated) | `openExerciseChart` :2813 records `logReturn`, sets `selectedExercise=exKey(e)`, goes to progress/strength; `viewStrength` renders Back to workout only while `logReturn && DB.draft`; `go()`/`setSub()` end in `window.scrollTo(0, landingY())` :1732/:1736; `landingY` :1740 uses the point once. Suite: LOG-02 tracer (c)(d), D-19 ×3, D-20 ×3, D-21 ×4. Probe confirms y=640 restore. Real Android scroll → human item 2 |
| 3 | SC3 / LOG-03: each card has a skip button that skips all unfinished sets with one optional reason; the skip survives a reload | ✓ VERIFIED (automated) | Header button :2190 gated on `exUnfinished(entry).length`; `skipExercise` :2353 prompts, Cancel returns before any write, snapshots `_preSkip`, marks only unfinished sets, `saveLocal()` only. Suite: LOG-03 tracer (b)(c), D-12 ×2, D-10, D-08 ×2, D-13/LOG-04 reload check. Probe: fresh boot from stored blob keeps the skipped card. PWA close/reopen → human item 3 |
| 4 | SC4 / LOG-04: a skipped exercise can be un-skipped during the workout, restoring its sets | ✓ VERIFIED | `unskipExercise` :2375 restores from `_preSkip` exactly, or (re-edited session, no snapshot) un-skips only `exSkip` sets and restores a deload the skip cleared (WR-03). Suite: LOG-04 tracer (d), D-13/LOG-04 after reload, skip-Undo-skip, D-25 ×4, WR-03 ×2, LOG-04 no-op. Probe confirms exact restore after reload |
| 5 | SC5 / LOG-05: the finished session records the skip, and next time the app does not suggest adding weight | ✓ VERIFIED (automated) | `finishWorkout` :2521 strips every `_` key from entries and sets, keeps `skipped:true`/`reason`, drops a non-boolean marker; `addWeightVerdict` :1309 blocks on `sets.some(x=> x && x.skipped)`; `lastAttemptEntry` :1297 now counts a deload carrying the marker (WR-02). Suite: LOG-05 tracer (e)(f), D-09 older-build check, D-22/LOG-05, partial skip, WR-02 ×2, D-17 note checks. Probe: no flag next time, Last time keeps 25×20, note "Rest skipped Aug 7: shoulder". Real-history check → human item 4 |
| 6 | 10-01 plan truths (S1 button placement, stale-tap no-op, reason prompt, partial skip, D-22 deload, saveLocal-only + DRAFT-05 pin 27, S2 card shape, reload, Undo exact, D-25 fallback, multi-card, collapse, finish strip, older-build judgment, all-skipped workout, backup/merge/export, escaping, long text, CLAUDE.md `_` rule) | ✓ VERIFIED | 29 named 10-01 checks pass in my run; CLAUDE.md:61-62 states the `_` draft-only rule and names `_preSkip`; `const SCHEMA = 19;` index.html:492 |
| 7 | 10-02 plan truths (Workout history D-15 lines, next-card D-17 note under unchanged Last time, D-24 no-data line, editSession carries the marker with no `_preSkip`, no-snapshot Undo, hostile and mistyped values, long text, no `class="flag"`) | ✓ VERIFIED | `skipNoteHTML` :2410 appended after `lastLine`, never replacing it; `editSession` :2772 copies the marker only when `e.skipped === true`; 26 D-15/D-17/D-24/D-25/T-10-10/T-10-11/WR-01/WR-02 checks pass |
| 8 | 10-03 plan truths (S3 button shape, one panel at a time, nothing written, last 5 by exKey from any workout, markers, D-04/D-05 exclusions, labels, empty panel, D-07/D-24 non-tappable, panel follows slot, skipped/collapsed card hides panel, escaping, long text, no card opener in panel, chart link, Back to workout placement, return paths, return used once, resets, no save in new functions) | ✓ VERIFIED | 39 named 10-03 checks pass; `openExHist = -1; logReturn = null` reset at start and backdate (:2060, :2094), finishWorkout :2579, discardWorkout :2585 and editSession :2777; harness getters test/harness.js:167-168; none of `toggleExHist`, `openExerciseChart`, `backToWorkout`, `landingY`, `exerciseRecent`, `exhRowHTML`, `exhPanelHTML` calls `save()` or `saveLocal()` (read in full) |
| 9 | 10-04: code review ran, suite and csp:check green, diff scope limited, SCHEMA unchanged before push | ✓ VERIFIED | 10-REVIEW.md exists (0 critical, 3 warning, 4 info); `git diff --stat main 0c765f0` touches only index.html, test/app.test.js, test/harness.js, CLAUDE.md and `.planning/`; SCHEMA 19 |
| 10 | 10-04: PR merged with a merge commit after green CI | ✓ VERIFIED | `gh pr view 15`: MERGED, mergeCommit `9a4e647` = origin/main |
| 11 | 10-04: live index.html passes `csp-hash.js --check`, stamp ends with main's sha7, SCHEMA 19, helpers present | ✓ VERIFIED | Checked myself against the live bytes (see Evidence) |
| 12 | 10-04: rollback is honest (SCHEMA 19, `git revert -m 1`, the `_preSkip` caveat) | ✓ VERIFIED | 10-04-SUMMARY records the revert command and the caveat; SCHEMA unchanged so a revert needs no sync pause |
| 13 | Phone: Last time on two cards, chart link, Back to workout and Train → Log land with the panel open, collapsed cards collapsed, sets unchanged | ? HUMAN (backstop) | Not run. Human item 1 and 2 |
| 14 | Phone: Back to workout and Train → Log land at the same scroll spot | ? HUMAN (backstop) | Not run. Human item 2 |
| 15 | Phone: a skip after one set survives a full close and reopen of the installed PWA; Undo and re-skip work | ? HUMAN (backstop) | Not run. Human item 3 |
| 16 | Phone: Workout history line, no ⬆ Add weight next session, Rest skipped note under the real numbers | ? HUMAN (backstop) | Not run. Human item 4 |
| 17 | Phone at ~380px: header, panel and skipped card layout | ? HUMAN (backstop) | Not run. Human item 5 |

**Score:** 12/17 truths verified (0 present-but-behavior-unverified; 5 backstop truths need the phone)

Truths 1-5 are verified at the automated level. Each roadmap criterion also has a phone half, and that
half is truths 13-17. None of them is counted as passed.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `index.html` | exUnfinished, skipExercise, unskipExercise, skipTailHTML, skipNoteHTML, exerciseRecent, exhRowHTML, exhPanelHTML, toggleExHist, openExerciseChart, backToWorkout, landingY; S1/S2/S3/S4/S5 markup; finishWorkout strip; editSession carry; 5 ACTIONS; CSS rules | ✓ VERIFIED | All present (lines 1297-2945, 5641-5647); substantive (read in full); wired through ACTIONS and viewActive/viewStrength/viewHistory |
| `test/app.test.js` | LOG section, DRAFT-05 rows | ✓ VERIFIED | 104 LOG checks pass; DRAFT-05 checks pass |
| `test/harness.js` | read-only getters for openExHist and logReturn | ✓ VERIFIED | lines 167-168 |
| `CLAUDE.md` | the `_` draft-only rule naming `_preSkip` | ✓ VERIFIED | lines 61-62 |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| S1 button | skipExercise(i) | `skipExercise: { click: el => skipExercise(+el.dataset.i) }` :5641 | ✓ WIRED |
| S2 Undo | unskipExercise(i) | :5642 | ✓ WIRED |
| finishWorkout entries map | synced session | `stripDraftOnly` with `k.charAt(0) === '_'` :2537, marker checks :2541-2545 | ✓ WIRED |
| finished per-set skipped flags | addWeightVerdict blocked branch | `sets.some(x=> x && x.skipped)` :1313 via lastAttemptEntry → addWeightInfo | ✓ WIRED |
| viewActive slot card | skipNoteHTML(lastAttemptEntry(…)) | :2149 | ✓ WIRED |
| viewHistory entry line | skipTailHTML(e, k => prIdx.isPR(s, e, k)) | D-15 checks pass | ✓ WIRED |
| editSession | draft skipped/reason | `isSkip = e.skipped === true` :2791 | ✓ WIRED |
| S3 Last time button | toggleExHist(i) | :5645 | ✓ WIRED |
| S4 link | openExerciseChart(i) | :5646 | ✓ WIRED |
| S5 control | backToWorkout() | :5647 | ✓ WIRED |
| go() and setSub() | landingY() | `window.scrollTo(0, landingY())` :1732, :1736 | ✓ WIRED |
| exhPanelHTML | exerciseRecent over liveSessions(), excluding the edited session | `exerciseRecent(exKey(entry), 5, DB.draft.editRef)` :2441 | ✓ WIRED |
| PR merge commit | revert command | `git revert -m 1` in 10-04-SUMMARY | ✓ WIRED |
| live index.html | csp-hash.js --check | run by this verifier on the live bytes | ✓ WIRED |

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real data | Status |
|----------|------|--------|-----------|--------|
| History panel rows | `rows` | `exerciseRecent` → `liveSessions()` → `DB.sessions` | Yes (probe: 3 rows from 3 seeded sessions) | ✓ FLOWING |
| Skip note | `att` | `lastAttemptEntry` → `liveSessions()` | Yes (probe: note from the finished session) | ✓ FLOWING |
| Skipped card | `entry` | `DB.draft.entries[i]`, persisted by `saveLocal()` | Yes (probe: survives reboot from the stored blob) | ✓ FLOWING |
| Add weight flag | `aw.allTop` | `addWeightInfo` → `lastAttemptEntry` → `addWeightVerdict` | Yes (probe: true before the skip, false after) | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full suite | `TZ=America/Chicago npm test` (run once) | 1245 passed, 0 failed, 2 skipped (local-only) | ✓ PASS |
| CSP hash, working tree | `npm run csp:check` | OK | ✓ PASS |
| CSP hash, live bytes | `node scripts/csp-hash.js --check <downloaded live index.html>` | OK, same hash | ✓ PASS |
| Live build is the merge | `grep ppl-build` on the live file | `… 9a4e647` | ✓ PASS |
| End-to-end skip, reload, Undo, finish, next card; history open/close and chart round-trip | independent harness probe through ACTIONS wrappers | every assertion as expected (see Evidence) | ✓ PASS |

### Probe Execution

No `scripts/*/tests/probe-*.sh` exists or is declared by the plans. Step 7c: no project probes to run.
The harness probe above is this verifier's own.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| LOG-01 | 10-03, 10-04 | Last time opens the last 5 sessions inline; workout never left; draft unchanged | ✓ SATISFIED (automated); phone pending | Truth 1 |
| LOG-02 | 10-03, 10-04 | Inline history links to the full Strength chart | ✓ SATISFIED (automated); phone pending | Truth 2 |
| LOG-03 | 10-01, 10-04 | Skip button skips all of the exercise's sets, one optional reason, draft edit with saveLocal() | ✓ SATISFIED (automated); phone pending | Truth 3 |
| LOG-04 | 10-01, 10-02, 10-04 | Un-skip during the workout restores the sets | ✓ SATISFIED | Truth 4 |
| LOG-05 | 10-01, 10-02, 10-04 | Saved as skipped, blocks adding weight next time (PROG-01) | ✓ SATISFIED (automated); phone pending | Truth 5 |

No orphaned requirements: REQUIREMENTS.md maps exactly LOG-01..05 to Phase 10, and every one appears
in a plan's `requirements` field.

Note: REQUIREMENTS.md already marks LOG-01..05 `[x]` and "Complete". 10-01..10-03 set that before the
phone check, which 10-04 names as the gate. The 10-04 SUMMARY records this and leaves it alone. It is
not a code gap, but the traceability table claims more than has been checked until the phone UAT passes.

### Prohibitions (judgment-tier, non-authoritative unless a test is cited)

| Prohibition | Verdict | Evidence |
|-------------|---------|----------|
| Skip never throws away a set with reps (D-08) | held (test) | D-08/D-11 check; `exUnfinished` filters `st.r===''` |
| No skip/un-skip/history/chart function calls save() | held (test) | DRAFT-05 tripwire green; bodies read in full |
| No `_` field reaches a session, backup or export | held (test) | T-10-02, D-18/D-23 checks; probe found no `"_` key |
| No judgement reads the exercise-level marker | partly held, flagged | addWeightVerdict and stall use per-set flags (D-09 test). `lastAttemptEntry` now reads `e.skipped!==true` to decide whether a deload counts (WR-02 fix). An older build ignores that, and the per-set flags still block, so the D-09 intent (older builds judge correctly) holds, but the letter of the prohibition was relaxed by the review fix |
| exerciseHistory, lastRealEntry, lastAttemptEntry, addWeightVerdict, stallStreak not modified | not held, by design | `lastAttemptEntry` gained `skipId` (WR-01) and the deload exception (WR-02). Both were review fixes Ian took, and each has regression checks. Recorded here so it is not a silent pass |
| No SCHEMA bump, no migration, no row rewritten | held | `const SCHEMA = 19;` locally and live |
| Reason only ever escaped text, never in an attribute or JS | held (test) | T-10-01, T-10-10, T-10-20 checks |
| No inline on-event attribute, runtime action name, persisting wrapper, stopPropagation | held (test + diff) | suite's delegation checks green; 0 added `on*="` and 0 added `stopPropagation` in `git diff main 0c765f0` |
| No new `class="flag"`, no hard-coded hex in new CSS | held | new `.ex-skip`, `.skip-note`, `.exh*` rules use `var(--…)` only |
| No inline script edit committed without csp:hash | held | csp:check OK on the tree and the live bytes |
| 10-04: executor never pushed/merged/reverted; merge commit, not squash | held | PR 15 has a merge commit; 10-04-SUMMARY records Ian's merge |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | No TBD/FIXME/XXX/TODO/HACK added in the phase diff | — | — |
| index.html | 1323 | `addWeightInfo` calls `lastAttemptEntry` without `skipId`, so while editing a past session the Add weight flag still judges from that session | ℹ️ Info | Pre-existing self-reference the WR-01 fix report calls out of scope. It does not affect a live workout |
| index.html | skipTailHTML / exhPanelHTML | IN-01..IN-04 from 10-REVIEW.md | ℹ️ Info | Accepted by Ian, not fixed |

### Human Verification Required

These are the 10-04 Task 3 phone items, harvested from its `<verify><human-check>`. The 10-04 SUMMARY
says they were not run. First, Settings → This version must end with `9a4e647`. Never judge on the
older `8a20832` build.

### 1. Inline history on the phone
**Test:** Tap Last time on one card, then on a second card. Read the rows.
**Expected:** One panel at a time, up to 5 rows newest first, labelled by workout, with deload, skip, PR and note markers. Sets unchanged.
**Why human:** Real device, real history, real tap.

### 2. Chart link and return, including scroll
**Test:** Collapse another card, scroll the open panel mid-screen, tap Full chart in Strength, then Back to workout. Repeat, returning through Train → Log.
**Expected:** Strength opens on that exercise; both returns land at the same scroll spot with the panel open and collapsed cards collapsed.
**Why human:** The suite proves `scrollTo(0, y)` is called with the recorded y. Whether Android honours it right after render (RESEARCH A1) is only visible on the phone. If only the scroll lands at the top, that is a deferred-scroll follow-up, not a revert.

### 3. Skip survives a real PWA restart
**Test:** Log one set, skip the exercise with a reason, swipe the app away, reopen, Undo, re-skip, finish.
**Expected:** The one-line card survives the restart; Undo restores the logged set and weights; finishing saves normally.
**Why human:** A real process kill on Android.

### 4. After the workout
**Test:** Open Workout history, then the next session of that workout.
**Expected:** '{name} — {set} · rest skipped: {reason}'; no ⬆ Add weight; Last time keeps the real numbers with 'Rest skipped {date}: {reason}' under them.
**Why human:** Deployed build with real history.

### 5. Layout at ~380px
**Test:** Look at a card header, an open panel and a skipped card.
**Expected:** The skip icon sits left of the caret without crowding the range badge or the flag; the panel reads cleanly; the skipped card is one line with Undo on the right.
**Why human:** Visual.

### 6. Judgment-tier prohibitions
**Test:** Read the Prohibitions table above.
**Expected:** Ian accepts the two flagged rows. `lastAttemptEntry` was changed by the WR-01/WR-02 fixes he took, and one marker read was added for deloads.
**Why human:** Non-authoritative verifier verdicts.

### Gaps Summary

No code gaps. The phase goal is met in the codebase and on the live site. All five roadmap criteria
hold under the suite I re-ran and under my own probe, all key links are wired, the review fixes
shipped, and the CSP hash matches locally and live. What is left is the half the roadmap assigns to a
real workout on Ian's phone. The 10-04 SUMMARY says it has not been run, so the status is
`human_needed`, not `passed`. When it passes, close the phase through `/gsd-verify-work 10` and write
the vault changelog entry.

---

_Verified: 2026-10-20_
_Verifier: Claude (gsd-verifier)_
