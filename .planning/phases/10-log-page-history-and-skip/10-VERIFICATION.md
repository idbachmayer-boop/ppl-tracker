---
phase: 10-log-page-history-and-skip
verified: 2026-11-11T13:20:00Z
status: passed
score: 26/28 must-haves verified (2 phone backstop truths await Ian's re-run of UAT test 5)
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 12/17
  gaps_closed:

    - "G-10-5 (code side): the Log card header is two rows (meta + right-pinned 32x32 skip/collapse pair; rep-range badge + Add weight on row 2), .ph is inline-block app-wide, nine glued icons carry lead, and the fix is live as main 5375e10"
    - "Phone truths 13-16 (inline history, chart round-trip and scroll, skip surviving a PWA restart, history line and no Add weight next time): passed by Ian in 10-UAT.md tests 1-4"
    - "Judgment-tier prohibitions (WR-01/WR-02 bending lastAttemptEntry): accepted by Ian in 10-UAT.md test 6"
  gaps_remaining: []
  regressions: []
human_verification:

  - test: "UAT test 5 again on Ian's phone. Settings → This version must end with 5375e10 first (never judge on 9a4e647). On the Log tab mid-workout (or start one, look, Discard): look at a card with ⬆ Add weight, one without, and a LEGS card with the long DB-only note; tap Last time; skip one set with a reason; skip a whole card from its header and Undo; fill every set on one card."
    expected: "Each header is two rows: 'Muscle · Movement · how-to ↗' with the arrow on the same line and skip + collapse as a tight pair at the right edge over the per-set skip/× icons; then the rep-range badge with ⬆ Add weight beside it, or tucked under it when long, left-aligned. No icon alone on a line, nothing cut off. The Last time caret ends its line; 'Set N skipped: reason' is one line with its icon before the text and Undo at the right; a skipped card is one line with Undo; filling every set removes the skip icon and the collapse icon does not move."
    why_human: "Backstop truth (10-06). Only the Android PWA at 380-412px with Roboto/Droid Sans Mono and Ian's real exercise names can judge this layout. The suite and both headless probes (10-05's and this verifier's) use desktop fonts."

  - test: "On the same build, glance at the screens the global icon fix touched: the Warm-up ramp toggle, the stopwatch bar's Rest label, Workout history with one workout opened (Edit workout), Progress → Strength and the Weight chart, Settings (Recently deleted, Version history)."
    expected: "Every icon sits beside its label with a small gap, and the charts look as they did before."
    why_human: "Backstop truth (10-06). Visual judgment on the real device; the 10-05 sweep measured it in desktop Chrome only."
---

# Phase 10: Log Page — History and Skip Verification Report

**Phase Goal:** Mid-workout, Ian can see how an exercise went over its last 5 sessions without leaving the workout, and can skip a whole exercise (with an optional reason, and undo) in a way that correctly blocks adding weight next time.
**Verified:** 2026-11-11
**Status:** human_needed
**Re-verification:** Yes, after gap closure G-10-5 (plans 10-05 and 10-06)

The phase goal is met in the code and on the live site, and Ian has already confirmed on his phone
everything except the layout (UAT tests 1-4 and 6 passed). UAT test 5, the layout at phone width,
failed as G-10-5. The fix is built, tested, merged and live, and I checked it myself. Ian has not
re-run test 5 on the phone yet, so the status is `human_needed`, not `passed`.

## Evidence I produced myself (not from SUMMARYs)

- **Tree identity.** HEAD `67f4a95`. `git diff --stat 5375e10 HEAD -- . ':!.planning'` is empty, so
  the code I verified is exactly what `main` ships. `git ls-remote origin refs/heads/main` =
  `5375e101…`, parents `9a4e647` (old main) and `4624870` (branch tip): a merge commit.

- **Suite, run once:** `TZ=America/Chicago npm test` gives **1250 passed, 0 failed, 2 skipped**. The 2
  skips are the git-ignored `test/local/real-db-snapshot.json` checks. These pass by name: the three
  G-10-5 icon checks (inline `.ph`, charts keep block svg, no glued icon on any screen), the two G-10-5
  header checks (controls pair, targets row with no `<br>`), the retargeted D-12 header check, and the
  D-12 stale-tap check.

- **`npm run csp:check`:** `CSP hash OK sha256-rEEv9FykoHBjAb6rlYI/lb5nNl6tKlDgFr/EKI2vJ1s=`.
- **Live site** (signed-out GET with a cache-buster): stamp `2026-11-11T13:02:19Z 5375e10`.
  `node scripts/csp-hash.js --check` OK with the same hash. `const SCHEMA = 19;` ×1, the `.ph { display:
  inline-block` rule ×1, `class="ex-targets"` ×1 and `class="ex-controls"` ×1. With the `ppl-build`
  line removed, the **live bytes are identical to `git show 5375e10:index.html`**.

- **`gh pr view 16`:** MERGED, merge commit `5375e10`, head `4624870`. `gh run list --branch main`:
  run 43025439049 on `5375e10`, "Deploy to GitHub Pages", success.

- **The code, read:** `index.html:84-88` adds `.ex-head > .ex-meta`, `.ex-controls`,
  `.ex-controls .skip-set` and `.ex-targets`. `:98` leaves `.ex-head` unchanged for the stair stepper.
  `:205` makes `.ph` `display: inline-block`, and `:225` leaves `svg { display: block; width: 100% }`.
  In the template at `:2193-2197`, `.ex-head` holds exactly `.ex-meta` (how-to `<a>` with
  `white-space:nowrap`) and `.ex-controls` (conditional skip button, then the caret). Then comes
  `.ex-targets` with the badge followed by `${flag}`, and there is no `<br>`. The `.ex-skip` class is
  gone from index.html and the tests.

- **My own render probe** (scratchpad `v10probe`, synthetic data, never committed). It runs real
  `startWorkout` output for PUSH 1 and LEGS 1 through `test/harness.js`, with one set skipped, one card
  all done, and one card skipped via `skipExercise`. It renders with the real `<style>` in headless
  Chrome at 380px and 412px. Results, for all 12 main cards at each width (24 measurements):

  - `.ex-head` height 32px, and the targets row starts 4px below it;
  - the how-to `<a>` has 1 client rect, with the icon inside it;
  - meta right ≤ controls left, and 0 header/targets descendants sit outside the card box;
  - both controls are 32×32, and the caret glyph centre minus the per-set × glyph centre is 0px;
  - on the all-done cards only the caret renders, at the same x as on cards with skip (353 / 777);
  - no `<br>` in the head or the targets row.

  The probe seeded no history, so no card carried ⬆ Add weight. The suite's targets-row check covers
  the flag's placement, and so does the 10-05 render table (flag on the badge's row with an 8px gap,
  or wrapped to its left edge).

- **Diff scope** `9a4e647..5375e10`: index.html, test/app.test.js and `.planning/` only.
  test/harness.js, test/fixtures/merge-golden.json, sw.js and CLAUDE.md are unchanged. 0 changed lines
  in index.html mention `save(`, `saveLocal(`, `SCHEMA` or `MIGRATIONS`. Every `data-action` name in
  the diff appears once removed and once added, so none was renamed. No new `on*="` attribute and no
  `stopPropagation`. No TBD/FIXME/XXX/TODO/HACK was added in either file.

- **Regression check on the Phase 10 machinery:** `exUnfinished`, `skipExercise`, `unskipExercise`,
  `skipTailHTML`, `skipNoteHTML`, `exerciseRecent`, `exhRowHTML`, `exhPanelHTML`, `toggleExHist`,
  `openExerciseChart`, `backToWorkout` and `landingY` are each defined once and still referenced. The
  ACTIONS wrappers `skipExercise`, `unskipExercise`, `toggleExHist`, `openExChart`, `backToWorkout` and
  `toggleExCollapse` are present (index.html:5637-5650). Every LOG-01..05 check passes in my run.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1 / LOG-01: Last time opens the last 5 sessions inline; workout never left; sets unchanged | ✓ VERIFIED | Previous automated evidence holds (code equals main, LOG checks green). Phone half: 10-UAT test 1 **pass** |
| 2 | SC2 / LOG-02: inline history links to the Strength chart; returning finds the workout as it was | ✓ VERIFIED | Suite green. Phone half, including the Android scroll restore (A1): UAT test 2 **pass** |
| 3 | SC3 / LOG-03: skip button skips all unfinished sets with one optional reason; survives reload | ✓ VERIFIED | Suite green. Real PWA swipe-away and reopen: UAT test 3 **pass**. The header button keeps `data-action="skipExercise"` and is still gated on `exUnfinished(entry).length` (:2195) |
| 4 | SC4 / LOG-04: un-skip during the workout restores the sets | ✓ VERIFIED | Suite green. UAT test 3 (Undo restores exactly) **pass** |
| 5 | SC5 / LOG-05: session records the skip; next time no Add weight | ✓ VERIFIED | Suite green. UAT test 4 **pass** |
| 6 | 10-01 plan truths | ✓ VERIFIED (regression) | Untouched by the gap diff apart from the header markup. Checks green |
| 7 | 10-02 plan truths | ✓ VERIFIED (regression) | Untouched by the gap diff. Checks green |
| 8 | 10-03 plan truths | ✓ VERIFIED (regression) | Untouched by the gap diff, except that the Last time caret now sits inline (CSS only). Checks green |
| 9 | 10-04: review ran, suite and CSP green, scope limited, SCHEMA unchanged | ✓ VERIFIED (regression) | As before |
| 10 | 10-04: PR #15 merged with a merge commit | ✓ VERIFIED (regression) | `9a4e647` is the first parent of `5375e10` |
| 11 | 10-04: live page check | ✓ VERIFIED (superseded) | The live page is now `5375e10`. See truth 25 |
| 12 | 10-04: honest rollback | ✓ VERIFIED (regression) | As before |
| 13 | Phone: Last time on two cards, chart link and return, panel open, cards and sets unchanged | ✓ VERIFIED (human) | 10-UAT test 1 and test 2 pass (Ian, 2026-10-22) |
| 14 | Phone: both returns land at the same scroll spot | ✓ VERIFIED (human) | 10-UAT test 2 pass |
| 15 | Phone: skip survives a full PWA close/reopen; Undo and re-skip work | ✓ VERIFIED (human) | 10-UAT test 3 pass |
| 16 | Phone: history line, no ⬆ Add weight, Rest skipped note | ✓ VERIFIED (human) | 10-UAT test 4 pass |
| 17 | 10-05: at 380/412px every main card header is two deliberate rows (meta + how-to with its icon on the line, skip + collapse as a right-pinned pair; badge + flag on row 2, flex-wrap, no forced break) | ✓ VERIFIED (desktop render) | Code :84-88, :2193-2197. Suite G-10-5 pair and targets-row checks pass. My probe: 24/24 heads are 32px with the targets row 4px below, the how-to icon is on its line, and there is no `<br>`. The phone judgment is truth 27 |
| 18 | 10-05: controls are 32×32 with centred glyphs; caret over × within 1px; skip glyph within 4px of the per-set skip; no skip on a done card, and the caret does not move | ✓ VERIFIED | My probe: 32×32, caret − × = 0px, caret x the same with or without skip. The skip-glyph offset (−3px) comes from 10-05's table, and is consistent with my box positions (skip box right = caret box left, 32px pitch vs the 29px per-set pitch) |
| 19 | 10-05: no header/targets element outside its card; meta never overlaps the controls | ✓ VERIFIED | My probe: 0 outside and meta right ≤ controls left on all 24 |
| 20 | 10-05: every Phosphor icon renders inline across the app, none glued to the next word, charts unchanged | ✓ VERIFIED | `.ph` inline-block :205, bare `svg` rule unchanged :225. The suite's icon-inline, chart and no-glued-icon checks pass. 9 `lead` additions read in the diff. My grep for `ph('…')}<tag` without `lead` finds nothing. See WR-01 (warning): the glued-icon check cannot see an icon glued to text inside a following tag |
| 21 | 10-05: the suite asserts header and icon rule by property; `npm test` green; `csp:check` passes | ✓ VERIFIED | 1250/0/2. The D-12 test no longer matches `text-align:right`. CSP OK |
| 22 | 10-05: SCHEMA 19; no data shape, save path or data-action change; harness and merge-golden byte-identical | ✓ VERIFIED | See Diff scope above |
| 23 | 10-06: pre-flight (10-05 complete, green, merge equals HEAD's tree, scope limited) | ✓ VERIFIED | The merge commit's code tree equals the verified HEAD outside `.planning/`. Diff scope checked |
| 24 | 10-06: PR merged with a merge commit after green CI; the deploy CSP step passed | ✓ VERIFIED | `gh pr view 16` MERGED `5375e10` (2 parents). Deploy run 43025439049 success |
| 25 | 10-06: live index.html passes `--check`, stamp ends `5375e10`, SCHEMA 19, carries the fix | ✓ VERIFIED | Checked myself. The live bytes equal main's except the stamp |
| 26 | 10-06: rollback is honest (render-only; `git revert -m 1` restores the old layout with no data effect) | ✓ VERIFIED | The diff has no persistence, SCHEMA or migration lines. The revert command is recorded with the full MERGE sha |
| 27 | Phone: UAT test 5 passes on `5375e10` (two-row header, panel and skipped card fit, no clipping) | ? HUMAN (backstop) | Not run. Human item 1. This supersedes the original layout truth, which failed as G-10-5 |
| 28 | Phone: the screens the icon fix touched read cleanly; charts as before | ? HUMAN (backstop) | Not run. Human item 2 |

**Score:** 26/28 truths verified. None is present-but-behavior-unverified. 2 backstop truths need the phone.

The previous report's truth 17 (the phone layout) failed in UAT as G-10-5. Truths 17-26 above verify the
fix on the code side, and truth 27 re-poses the phone half against the new build.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `index.html` | `.ph` inline-block, the `.ex-controls`/`.ex-targets` rules, the two-row header, `lead` gaps, CSP hash | ✓ VERIFIED | Present (:84-88, :205, :2193-2197). Substantive. Wired (the classes are rendered by `viewActive()` and measured in Chrome). Data flows: the header is built from `DB.draft.entries` and `rangeText(rng)`/`flag` |
| `test/app.test.js` | D-12 retargeted; G-10-5 header, icon, chart and glued-icon checks | ✓ VERIFIED | 6 G-10-5/D-12 header and icon checks pass by name |
| `10-UI-SPEC.md` | S1 and the width check corrected to the two-row header and the inline icon rule | ✓ VERIFIED | `G-10-5` ×6, `ex-targets` ×3, `inline-block` ×1, `status: approved` kept |
| Phase 10 machinery from 10-01..10-04 | the helpers, ACTIONS wrappers and CSS | ✓ VERIFIED (regression) | All present and referenced |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `viewActive()` header markup (`ex-head`, `ex-meta`, `ex-controls`, `ex-targets`) | the `<style>` rules | class names. Measured in Chrome by my probe | ✓ WIRED |
| `.ph` display rule | every `ph()` call and `data-ph` element | `.ph` (0,1,0) beats bare `svg` (0,0,1). The suite's icon-inline check, plus my probe (the how-to icon sits inside its `<a>` line box) | ✓ WIRED |
| the inline `<script>` | CSP `script-src` sha256 | `npm run csp:hash`. `csp:check` OK locally and on the live bytes | ✓ WIRED |
| header skip button | `skipExercise(i)` | ACTIONS :5644; `data-i="${esc(i)}"` kept | ✓ WIRED |
| header caret | `toggleExCollapse(i)` | ACTIONS :5637 | ✓ WIRED |
| PR merge commit | revert command | `git revert -m 1 --no-edit 5375e10129803c3a7f6b41ba948839c224708afb` in 10-06-SUMMARY | ✓ WIRED |
| live index.html | `csp-hash.js --check` | run by this verifier | ✓ WIRED |

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real data | Status |
|----------|------|--------|-----------|--------|
| Card header row 1 | `s.muscle`, `s.movement`, `s.note`, `entry.name` | slot definition and `DB.draft.entries[i]` | Yes (probe rendered real PUSH 1 / LEGS 1 slots) | ✓ FLOWING |
| Header skip control | `exUnfinished(entry).length` | `DB.draft.entries[i].sets` | Yes (probe: absent on the all-done card, present elsewhere) | ✓ FLOWING |
| Targets row | `rangeText(rng)`, `flag` | `addWeightInfo` → `lastAttemptEntry` → `liveSessions()` | Yes (suite's targets-row check uses a top-of-range LAT card with the flag as positive control) | ✓ FLOWING |
| History panel, skip note, skipped card | as in the previous report | unchanged code | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full suite (run once) | `TZ=America/Chicago npm test` | 1250 passed, 0 failed, 2 skipped | ✓ PASS |
| CSP, working tree | `npm run csp:check` | OK `sha256-rEEv9Fyk…` | ✓ PASS |
| CSP, live bytes | `node scripts/csp-hash.js --check <live>` | OK, same hash | ✓ PASS |
| Live = main | `cmp` of the live file and `git show 5375e10:index.html`, stamp line removed | identical | ✓ PASS |
| Merge and deploy | `gh pr view 16`; `gh run list --branch main` | MERGED 5375e10; deploy success | ✓ PASS |
| Header geometry at 380/412px | verifier's headless-Chrome probe (scratch `v10probe`) | 24/24 cards within every tolerance measured | ✓ PASS |

### Probe Execution

No `scripts/*/tests/probe-*.sh` exists or is declared by the plans. There were no project probes to run
under Step 7c. The render probe above is this verifier's own. The 10-05 executor's probe directory no
longer holds its scripts (only `prof/` remains), so I did not rerun it. I wrote and ran my own instead.

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| LOG-01 | 10-03, 10-04, 10-05, 10-06 | Last time opens last 5 sessions inline | ✓ SATISFIED | Truth 1, UAT 1. The inline caret is fixed (10-05) |
| LOG-02 | 10-03, 10-04 | Inline history links to the Strength chart | ✓ SATISFIED | Truth 2, UAT 2 |
| LOG-03 | 10-01, 10-04, 10-05, 10-06 | Skip button, one optional reason | ✓ SATISFIED; layout re-check pending | Truth 3, UAT 3. The header control is restructured but keeps its behaviour |
| LOG-04 | 10-01, 10-02, 10-04, 10-05, 10-06 | Un-skip restores the sets | ✓ SATISFIED; layout re-check pending | Truth 4, UAT 3 |
| LOG-05 | 10-01, 10-02, 10-04 | Saved as skipped; blocks Add weight | ✓ SATISFIED | Truth 5, UAT 4 |

No orphaned requirements. REQUIREMENTS.md maps exactly LOG-01..05 to Phase 10, and every ID appears in
at least one plan's `requirements` field. REQUIREMENTS.md already marks all five `[x]` Complete. For
LOG-01, -02 and -05 the phone check now backs that. For LOG-03 and -04, function passed on the phone,
and only the cosmetic layout re-check is open.

### Prohibitions

- **10-01..10-04 judgment-tier rows** (previous report): Ian accepted them in 10-UAT test 6, including
  the two flagged rows (WR-01/WR-02 bending `lastAttemptEntry`). They are no longer flagged.

- **10-06 prohibitions** (judgment-tier, non-authoritative):

| Prohibition | Verdict | Evidence |
|-------------|---------|----------|
| Executor never pushes, merges or reverts `main` | held | 10-06-SUMMARY: the orchestrator pushed on Ian's "push it", and Ian merged. Nothing was reverted |
| Never squash or rebase merge | held | `5375e10` has 2 parents |
| Never merge `main` into the branch to pass pre-flight | held | Branch history shows no merge from main; merge-tree equality was used |
| No sign-in to Ian's account | held | All live checks are signed-out GETs, including mine |
| Phone check never judged on the old build | pending | Human item 1 starts with the 5375e10 stamp check |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | No TBD/FIXME/XXX/TODO/HACK added in the gap diff | — | No debt-marker blocker |
| index.html | 2745 | History extras fallback label `w.charAt(0).toUpperCase()+w.slice(1)` rendered without `esc()` on a line this diff touched (10-REVIEW WR-02) | ⚠️ Warning | Pre-existing, and outside the phase goal. A key not in `ACCESSORIES` from a hostile import or merge renders as markup. CSP blocks script execution, but HTML injection works. CLAUDE.md asks for escaping when a line is touched. A one-token fix, advisory |
| test/app.test.js | ~2662 | `gluedIcons()` accepts `</svg>` followed by `<`, so `${ph('x')}<strong>Word</strong>` passes (10-REVIEW WR-01) | ⚠️ Warning | No such site exists today (my grep finds none), but the check cannot catch the next one |
| test/app.test.js | various | IN-01..IN-05: stale D-12 name, an untestable "flag" clause, CSS-parse blind spots, a shadowed `ok`, no scan-count floor | ℹ️ Info | Advisory test-quality items |

### Human Verification Required

These are 10-06 Task 3's `<verify><human-check>`, harvested. First, Settings → This version must end
with **`5375e10`**. If it still shows `9a4e647` after 15 minutes and a full close and reopen, wait.

### 1. UAT test 5 again: the Log card at phone width

**Test:** On the Log tab, look at a card with ⬆ Add weight, one without it, and a LEGS card with the long DB-only note. Tap Last time. Skip one set with a reason. Skip a whole card from its header, then Undo. Fill every set on one card.
**Expected:** Two-row headers. The how-to arrow is on its word's line, and skip + collapse sit as a pair at the right edge over the per-set skip/× icons. The badge and ⬆ Add weight share row 2 (or the flag wraps neatly under the badge). The Last time caret ends its line. The set-skip note and the skipped card are each one line with Undo on the right. Filling every set hides the skip icon, and the collapse icon does not move. Nothing is clipped.
**Why human:** Android fonts and the real viewport. Every automated render here used desktop fonts.

### 2. Screens the global icon fix touched

**Test:** Look at the Warm-up ramp, the stopwatch Rest label, Workout history with a workout opened, Progress → Strength and the Weight chart, and Settings (Recently deleted, Version history).
**Expected:** Icons sit beside their labels with a small gap. The charts look as before.
**Why human:** Visual check on the device.

If something looks off but the app works, log it as a new cosmetic gap, not a revert. If the app is blank
or a workout breaks, run `git revert -m 1 --no-edit 5375e10129803c3a7f6b41ba948839c224708afb` from an
up-to-date `main` and push.

### Gaps Summary

There are no code gaps. G-10-5 is closed on the code side. All four diagnosed causes are gone, as read
in the code and measured in my own Chrome render at 380 and 412px:

- the `.ph` block leak;
- space-between on the header;
- the left-pinned glyph in a loose box;
- the `<br>` before the flag.

The fix is live as `5375e10`, byte-identical to `main` apart from the stamp, and passes the CSP check.
The rest of Phase 10 was already confirmed on Ian's phone (UAT 1-4 and 6).

Two advisory warnings from 10-REVIEW remain:

- WR-02: an unescaped extras label on a touched line;
- WR-01: a check weaker than its name.

Neither blocks the goal.

What remains is Ian's re-run of UAT test 5 on the phone. When it passes:

1. Flip 10-UAT test 5 to pass, and close the phase through `/gsd-verify-work 10`.
2. Write the deferred vault changelog entry (10-06 Follow-ups).

---

_Verified: 2026-11-11_
_Verifier: Claude (gsd-verifier)_
