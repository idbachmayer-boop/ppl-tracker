---
phase: 10-log-page-history-and-skip
plan: 05
subsystem: ui
status: complete
gap_closure: true
gap_ids: [G-10-5]
tags: [log-tab, css, phosphor-icons, csp, layout, uat-gap]
requires:
  - phase: 10-04
    provides: "the Phase 10 Log card (skip icon D-12, history panel, skipped card) shipped as main 9a4e647"
provides:
  - "two-row Log card header: meta + right-pinned 32x32 skip/collapse pair, then badge + flag with flex-wrap"
  - ".ph display:inline-block, so no Phosphor icon inherits the charts' block svg"
  - "'lead' gaps on the nine icons the display fix left glued to their label"
  - "suite checks: .ph inline, charts keep block svg, controls pair, targets row, no glued icon on any screen"
  - "10-UI-SPEC.md S1, width check, spacing and icon rule corrected to what ships"
affects: [10-06]
tech-stack:
  added: []
  patterns:
    - "structure asserted by stack-scanning <div> tokens (divOpenAt/divElement), not by class or inline-style wording"
    - "spaced icon contexts derived from the parsed <style> (cssRules), never hard-coded"
key-files:
  created: []
  modified:
    - index.html
    - test/app.test.js
    - .planning/phases/10-log-page-history-and-skip/10-UI-SPEC.md
key-decisions:
  - "Kept the tracer gate autonomous (re-ran verify + the 380/412 probe) because the plan declares designed_stops: None; the human check is UAT test 5 in 10-06"
  - "The icon-gap check walks every SCREENS entry with data plus the mid-workout Log tab; the static shell is covered by the Chrome sweep, not the suite"
metrics:
  duration: "13 min"
  completed: 2026-10-30
  tasks: 3
  files: 3
estimate:
  tokens: 90000
  tasks: 3
actuals:
  tokens: 7100
  tasks: 3
  commits: 4
---

# Phase 10 Plan 05: Two-row Log card header and inline icons (G-10-5) Summary

The Log card header now has two rows. Row 1 holds the meta and how-to line, with a right-pinned 32×32 skip/collapse pair over the per-set column. Row 2 holds the rep-range badge with ⬆ Add weight beside it. `.ph` is `inline-block`, so every Phosphor icon in the app sits on its text line. Nine icons that this left glued to their word got `lead`. The charts did not change.

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 (tracer) | f55b9df | feat(10-05): two-row Log card header and inline Phosphor icons (G-10-5) |
| 2 | 70e402c | fix(10-05): give every glued icon its lead gap; refuse a glued icon in the suite (G-10-5) |
| 3 | 0e7deca | docs(10-05): correct 10-UI-SPEC to the shipped two-row header and inline icon rule (G-10-5) |

## Red, then green

Task 1, before the index.html change (suite `1246 passed, 3 failed, 2 skipped`):

```
FAIL  G-10-5: every Phosphor icon renders inline with its text, never as a block on its own line  → {"ph":{"width":"1.15em","height":"1.15em","vertical-align":"-.22em","flex":"0 0 auto"},"blockers":[]}
PASS  G-10-5: the weight, pet and strength charts keep their full-width block svg
PASS  D-12: the skip button shows only on a card with an unfinished set, first in the header column, ahead of the caret and the range badge
FAIL  G-10-5: the skip and collapse controls sit together as one pair in the card header, apart from the rep range and the Add weight flag  → {"live":{"same":true,"badge":true,"flag":false,"controls":["skipExercise","toggleExCollapse"]},"done":{"skip":-1,"controls":["toggleExCollapse"]}}
FAIL  G-10-5: the rep range and ⬆ Add weight share their own row under the header, with no forced line break  → {"flag":true,"row":695,"flagRow":695,"headEnd":1684,"sel":1693,"br":true}
```

After it: `1249 passed, 0 failed, 2 skipped`. The 1245 baseline gained four new checks, and the retargeted D-12 check still counts once. The D-12 test no longer contains `text-align:right`.

Task 2, before the `lead` fixes (suite `1249 passed, 1 failed, 2 skipped`):

```
FAIL  G-10-5: no icon is glued to the word after it, on any screen  → {"spaced":5,"glued":{"Train → History":["[icon]Add note","[icon]Add note","[icon]Add note","[icon]Edit note","[icon]Add note"],"mid-workout: Train → Log":["[icon]Warm-up","[icon]Warm-up ramp","[icon]Abs","[icon]skip stair stepper","[icon]Cool-down stretches"],"mid-workout: Train → History":[…same five note links…]}}
```

After them: **`1250 passed, 0 failed, 2 skipped`**, one more than Task 1.

## CSP

- Old hash: `sha256-YqyU1GkbjGfE6MvOw4GtpHimhDverzR/ZJysw4nOlO8=`
- After Task 1: `sha256-0uN7UigdWA9PHXLfLFAfIeQAhQ4rM6vos8Z0G4rxrv8=`
- **Final hash, after Task 2:** `sha256-rEEv9FykoHBjAb6rlYI/lb5nNl6tKlDgFr/EKI2vJ1s=`. `npm run csp:check` passes.

`SCHEMA` stays 19. `test/fixtures/merge-golden.json` and `test/harness.js` are byte-identical to `9a4e647` (`git diff --quiet` exits 0). No `data-action` name, `esc()` use or save/saveLocal path changed.

## Render table at 380 and 412px (Task 1)

The probe rendered the real `viewActive()` output (via `test/harness.js`, synthetic seeds only) with the real `<style>` block in headless Chrome. The cards sat in `.container` frames 380 and 412px wide, and the frame's 1px outline costs 2px, so the measured content is 316/348px. A 380px viewport gives 318/350px.

The four frames were:
- **F0:** PUSH 1, with the LAT slot at the top of its range (flag "→ 27.5 lb"), slot 0 with set 3 skipped, slot 1 all done (no skip button), and slot 2 skipped through `skipExercise`;
- **F1:** F0 with the history panel open on slot 0;
- **F2:** F0 with the flag text swapped to "(belt) or harder variation";
- **F3:** LEGS 1.

Every main card, in every frame, at both widths, measured the same:

| Measure | 380px | 412px | Tolerance | Result |
|---|---|---|---|---|
| how-to icon on its word's line (`<a>` has one rect, icon inside it) | 23/23 cards | 23/23 cards | all | ✅ |
| `.ex-head` height | 32px every card | 32px every card | max(32, meta) | ✅ |
| meta lines | 1 (PUSH 1 slots, LEGS 1 slots 1-5); 2 (LEGS 1 Back squat with the DB-only note) | same | (no tolerance) | ✅ |
| meta width | 248px (250 on a real 380 viewport) / 280px on the no-skip card | 280px / 312px | (no tolerance) | (recorded) |
| header caret glyph − per-set × glyph (x centre) | 0px (both −12px from the content edge) | 0px | ≤ 1px | ✅ |
| header skip glyph − per-set skip glyph | −3px (−44 vs −41) | −3px | ≤ 4px | ✅ |
| control boxes | 32×32 (and 32×32) | 32×32 | 32×32 | ✅ |
| caret x on the no-skip card (slot 1) vs a card with skip | 0px shift | 0px shift | equal | ✅ |
| targets row top − head bottom | 4px | 4px | 4±2px | ✅ |
| badge left − content left | 0px | 0px | 0 | ✅ |
| flag "→ 27.5 lb" | same line, 8px gap | same line, 8px gap | 8px or wrapped to the badge's left edge | ✅ |
| flag "(belt) or harder variation" | wrapped, 0px from the badge's left edge | same line, 8px gap | (as above) | ✅ |
| descendants of `.ex-head` / `.ex-targets` outside the card's border box | 0 | 0 | 0 | ✅ |
| controls left − meta right | 8px | 8px | ≥ 0 | ✅ |
| Last time caret | inline, end of the last text line, `.lasttime` 32px tall (was 46) | same | inside the last line | ✅ |
| per-set skip note "Set 3 skipped: elbow" | 1 line, icon inline | 1 line, icon inline | single line | ✅ |
| skipped card "DB fly · skipped: elbow" | 1 line, icon inline, 30px | same | single line | ✅ |
| history panel open (F1, slot 0) | rendered (`.exh` present), header unchanged | same | (no tolerance) | ✅ |

**Screenshot (viewed with Read).** In all eight frames, every card's row 1 reads "Chest · Horizontal push · how-to ↗", with the skip and caret glyphs tight at the right edge over the per-set skip/× column. Row 2 is the "5–8 reps" badge alone, or "15–20 reps" with "⬆ Add weight → 27.5 lb" beside it. The incline card has no skip glyph and its caret stays in place. The skipped "DB fly" card is one line with Undo. "Warm-up ramp" and the accessory "Warm-up" were visibly glued to their fire icons at this point, which Task 2 fixed.

## Icon inventory (Task 2)

Counts by grep:
- `(?<![\w.])ph\(` matches **100** times. 2 are comment text (the boot comment at L5687 and L5688), which leaves **98 call sites**.
- `data-ph=` matches **5** elements.
- Rows: 98 + 5 = **103**.

Classes:
- (a) flex/grid item or the only child of a flex container: renders as before;
- (b) inline and already spaced (`lead`, `.btn`/`h2`/`h3`/`.card-label`/`.sw-label` margin, or a literal space);
- (c) inline and glued to the following word, so it needs `lead`;
- (d) alone in an inline or inline-block wrapper;
- (e) a how-to link whose icon could orphan.

`.btn` is `inline-flex`, so every `.btn` icon is (a).

| # | Line | Site (by content) | Class | Verdict |
|---|------|-------------------|-------|---------|
| 1 | 1726 | tab bar icon (`.tab .ic`) | a | unchanged |
| 2 | 1735 | tab icon swap on select | a | unchanged |
| 3 | 1770 | `.btn` Export my data | a | unchanged |
| 4 | 1853 | `.btn` Something else | a | unchanged |
| 5 | 1853 | `.btn` I did it | a | unchanged |
| 6 | 1861 | calendar-blank "Review your week →" (tap-inline) | c | **`lead` added** |
| 7 | 1881 | weigh-in caret in `.muted` span | d | unchanged; inline now |
| 8 | 1925 | mobility caret in `.muted` span | d | unchanged; inline now |
| 9 | 1928 | `.btn` Yoga / full session logged | a | unchanged |
| 10 | 1928 | `.btn` Did yoga or a full mobility session | a | unchanged |
| 11 | 1945 | `.x-set` remove to-do | d | unchanged |
| 12 | 1952 | warning "This device is out of storage" | b (lead) | unchanged |
| 13 | 1954 | `.btn` Export now | a | unchanged |
| 14 | 1957 | warning "Back up your data" | b (lead) | unchanged; now on its line |
| 15 | 1959 | `.btn` Set up sync | a | unchanged |
| 16 | 1959 | `.btn` Export | a | unchanged |
| 17 | 2030 | picker card caret after "N exercises" (space before) | b (space) | unchanged |
| 18 | 2054 | `h2` How this program works | b (h2) | unchanged |
| 19 | 2056 | program guide rotating caret span | d | unchanged; no shift seen |
| 20 | 2117 | skipped card skip-forward | b (lead) | unchanged; now on its line |
| 21 | 2161 | Last time open cue caret | d | unchanged; ends its line now |
| 22 | 2179 | per-set "Set N skipped" skip-forward | b (lead) | unchanged; now on its line |
| 23 | 2186 | per-set `.skip-set` icon-only | d | unchanged; centres in its column |
| 24 | 2187 | per-set `.x-set` icon-only | d | unchanged; centres in its column |
| 25 | 2194 | main card how-to arrow | e | **`white-space:nowrap`** (Task 1) |
| 26 | 2195 | header skip (`.ex-controls`, inline-flex) | a | Task 1 |
| 27 | 2195 | header caret (`.ex-controls`, inline-flex) | a | Task 1 |
| 28 | 2211 | fire "Warm-up ramp" | c | **`lead` added** |
| 29 | 2229 | "Stair stepper skipped" | b (lead) | unchanged |
| 30 | 2233 | stairs "Stair Stepper" title | b (lead) | unchanged; now on its line |
| 31 | 2242 | skip-forward "skip stair stepper" | c | **`lead` added** |
| 32 | 2417 | skipNoteHTML "Skipped / Rest skipped" | b (lead) | unchanged |
| 33 | 2445 | "Full chart in Strength ›" (space before) | b (space) | unchanged; ends its line now |
| 34 | 2632 | history-week tag "skipped {workout}" | b (lead) | unchanged |
| 35 | 2639 | note-pencil "Edit note / Add note" | c | **`lead` added** |
| 36 | 2672 | `.btn` week back (icon-only) | a | unchanged |
| 37 | 2674 | `.btn` week forward (icon-only) | a | unchanged |
| 38 | 2721 | pencil-simple "Edit workout" | c | **`lead` added** |
| 39 | 2725 | history row "Skipped ⌄" (space before) | b (space) | unchanged; inline now |
| 40 | 2726 | history detail "Day skipped" | b (lead) | unchanged |
| 41 | 2728 | history row "… sets ⌄" (space before) | b (space) | unchanged; inline now |
| 42 | 2745 | history extras accessory icon + label | c | **`lead` added** |
| 43 | 2940 | `.btn` Back to workout | a | unchanged |
| 44 | 2953 | PR list selected caret-right | b (lead) | unchanged; now on its line |
| 45 | 3025 | `.x-set` remove weigh-in | d | unchanged |
| 46 | 3136 | `.x-set` remove pet weigh-in | d | unchanged |
| 47 | 3159 | "Offline ready" | b (lead) | unchanged |
| 48 | 3162 | "Offline unavailable" | b (lead) | unchanged |
| 49 | 3165 | "Setting up offline support…" | b (lead) | unchanged; now on its line |
| 50 | 3202 | `.btn` Rename | a | unchanged |
| 51 | 3319 | accItem rotating caret span | d | unchanged; no shift seen |
| 52 | 3404 | accessory card how-to arrow | e | **`white-space:nowrap`** |
| 53 | 3426 | `.x-set` remove accessory set | d | unchanged |
| 54 | 3429 | accessory card phase-title icon + label | c | **`lead` added** |
| 55 | 3429 | accessory card rotating caret span | d | unchanged; no shift seen |
| 56 | 3440 | fire "Warm-up" accItem title | c | **`lead` added** |
| 57 | 3443 | flower-lotus "Cool-down stretches" title | c | **`lead` added** |
| 58 | 3460 | stretch row rotating caret span | d | unchanged |
| 59 | 3479 | sun (span `display:flex`) | a | unchanged |
| 60 | 3480 | moon (span `display:flex`) | a | unchanged |
| 61 | 3482 | scissors "Neck care · shave days" (`.card-label`) | b (card-label) | unchanged; now on its line |
| 62 | 3547 | `.btn` Use my current location | a | unchanged |
| 63 | 3770 | tractor mow expectation | b (lead) | unchanged |
| 64 | 3834 | drop "Watering tomorrow" | b (lead) | unchanged |
| 65 | 3835 | tractor mow due | b (lead) | unchanged |
| 66 | 3840 | calendar-blank mow expect | b (lead) | unchanged |
| 67 | 3863 | lawn status icon (warning/check/pause) | b (lead) | unchanged; now on its line |
| 68 | 3866 | `.btn` lawn log done label | a | unchanged |
| 69 | 3867 | `.btn` Undo override | a | unchanged |
| 70 | 3924 | map-pin location label | b (lead) | unchanged; now on its line |
| 71 | 3953 | forecast card icon (span `display:flex`) | a | unchanged |
| 72 | 3959 | `.btn` refresh weather (icon-only) | a | unchanged |
| 73 | 3962 | snowflake Off-season | b (lead) | unchanged |
| 74 | 4007 | `.x-set` remove hobby | d | unchanged |
| 75 | 4013 | `.x-set` remove chore | d | unchanged |
| 76 | 4019 | `.btn` Export backup (.json) | a | unchanged |
| 77 | 4020 | `.btn` Export for Claude (.md) | a | unchanged |
| 78 | 4021 | `.btn` Import backup | a | unchanged |
| 79 | 4307 | `.sw-btn` play/pause (icon-only) | d | unchanged |
| 80 | 4468 | upload "Import — confirm & save" | b (lead) | unchanged |
| 81 | 4479 | `.x-set` remove cardio | d | unchanged |
| 82 | 4503 | `.btn` Choose Strava file | a | unchanged |
| 83 | 4538 | `.x-set` remove sleep | d | unchanged |
| 84 | 4545 | `h2` moon "Log a night" | b (h2 + lead) | unchanged; now on its line |
| 85 | 5314 | trash "Recently deleted" (closed) | b (lead) | unchanged; now on its line |
| 86 | 5316 | Recently deleted caret-down | d | unchanged |
| 87 | 5325 | trash "Recently deleted" (open) | b (lead) | unchanged |
| 88 | 5325 | Recently deleted caret-up | d | unchanged |
| 89 | 5340 | "Version history" (closed) | b (lead) | unchanged; now on its line |
| 90 | 5342 | Version history caret-down | d | unchanged |
| 91 | 5353 | "Version history" (open) | b (lead) | unchanged |
| 92 | 5353 | Version history caret-up | d | unchanged |
| 93 | 5372 | warning "Sync paused" | b (lead) | unchanged |
| 94 | 5374 | `.btn` Reload now | a | unchanged |
| 95 | 5377 | check-circle "Connected" | b (lead) | unchanged |
| 96 | 5434 | `.x-set` edit idea | d | unchanged |
| 97 | 5435 | `.x-set` remove idea | d | unchanged |
| 98 | 5689 | boot prepend for `data-ph` (one call, rows 99-103) | (per element) | unchanged |
| 99 | 297 | `data-ph="timer"` stopwatch "Rest" (`.sw-label`) | b (sw-label) | unchanged; now on its line |
| 100 | 300 | `data-ph="play"` `#sw-toggle` (icon-only `.sw-btn`) | d | unchanged |
| 101 | 308 | `data-ph="lightbulb"` FAB (`.fab` is flex) | a | unchanged |
| 102 | 311 | `data-ph="lightbulb"` `h2` Ideas & feedback | b (h2) | unchanged; now on its line |
| 103 | 314 | `data-ph="copy"` `.btn` Copy all | a | unchanged |

Totals:
- (c) **9** sites, all now `lead`. They match planner probe 6 exactly, and the inventory found no extra site.
- (e) **2** sites, both `nowrap`.
- (d) rotating-caret wrappers: no visible shift in the screenshots, so no `inline-flex` was added.

## Before/after sweep (Task 2)

"Before" is `git show 9a4e647:index.html`, loaded through `loadApp`. "After" is the working tree. Both rendered 15 frames at 380px from one synthetic populated DB with an active PUSH 1 draft:
- the 9 `SCREENS` entries;
- Log with a skipped set, an open history panel and a skipped card;
- Strength through the Log card's chart link (the back control);
- Progress → Freddie (pet chart);
- History with one row open (a session with an Abs extra);
- Settings with Recently deleted and Version history open;
- the static shell (stopwatch shown, ideas sheet `.show`).

Measured on "after":

| Frame | Icons (inline with text) | Off their text line | Gap < 2px | Icon size change | Charts before → after |
|---|---|---|---|---|---|
| Today | 10 (3) | 0 | 0 | none | (none) |
| Train → Log | 73 (14) | 0 | 0 | none | (none) |
| Train → History | 11 (9) | 0 | 0 | none | (none) |
| Train → Cardio | 2 (0) | 0 | 0 | none | (none) |
| Train → Progress | 3 (0) | 0 | 0 | none | `#chart` 314×150 at x33 → identical |
| Care → Skin | 3 (1) | 0 | 0 | none | (none) |
| Care → Lawn | 7 (4) | 0 | 0 | none | (none) |
| Care → Sleep | 2 (1) | 0 | 0 | none | (none) |
| Settings | 33 (3) | 0 | 0 | none | (none) |
| Log: skipped set + panel + skipped card | 65 (16) | 0 | 0 | none | (none) |
| Strength via Log (back control) | 2 (1) | 0 | 0 | none | `#schart` 314×150 at x33 → identical |
| History: one row open | 13 (11) | 0 | 0 | none | (none) |
| Progress: pet weight | 2 (0) | 0 | 0 | none | `#pchart` 314×150 at x33 → identical |
| Settings: deleted + versions open | 33 (3) | 0 | 0 | none | (none) |
| static shell | 5 (2) | 0 | 0 | none | (none) |

Off-line means the icon's centre is more than 6px from its text line's centre. Gap is measured from the icon to the following text. Every one of the 15 frames has zero icons off their line, zero gaps under 2px, unchanged icon widths and heights, and identical chart boxes. Before, 70 icon placements sat off their text line.

What the six before/after screenshots showed, per surface (all viewed with Read):
- **Last time caret:** before, it sat alone on a second line under "Last time (Jul 29): 135×8, 135×7". After, it ends that line, and the box is one line tall.
- **Per-set skip note:** before, the icon sat above "Set 3 skipped: elbow". After, it sits inline with the text.
- **Warm-up ramp:** before, the fire icon was on its own line above the label. After, it sits beside "Warm-up ramp" with a gap.
- **Accessory Warm-up and Cool-down:** before, the icon sat above "Warm-up" and "Cool-down stretches". After, it is inline with a gap. The Abs phase-title reads "⚡ Abs 8–15 reps".
- **Stopwatch Rest label:** measured inline after (it was off its line before). The ideas sheet covers the shell frame's tabbar in the screenshot, so the frame shows the sheet's "💡 Ideas & feedback" heading, which is now on one line.
- **Workout history rows:** "1 sets ⌄", "Skipped ⌄" and "52 min · 2 sets ⌃" now end their line instead of wrapping the caret under it. The open row's "⚡ Abs — Cable crunch" and "✎ Edit workout" are inline.
- **Progress back control:** "‹ Back to workout" is unchanged (a `.btn` flex item). The PR list's selected "› barbell bench press" is now on one line.
- **Settings Recently deleted / Version history:** the trash and history icons sit beside their titles, and the carets are unchanged at the right.
- **Today screen cards:** "⚠ Back up your data", "Watering:" and "Mowing:" now carry their icons inline, and each card is 13-47px shorter. Nothing is clipped or overlapping.
- **Week in review:** "✎ Add note" and "✎ Edit note" are inline.
- **Charts:** the boxes are identical. The harness stubs `getElementById`, so the chart content is not drawn in either version.

## UI-SPEC sections changed (Task 3)

All edits in `.planning/phases/10-log-page-history-and-skip/10-UI-SPEC.md` are scoped replacements. `status: approved` and the Checker Sign-Off block are unchanged.
- **Design System, icon row:** `.ph` is `display: inline-block`, the bare `svg` rule belongs to the charts, and an icon before text outside a button or heading takes `lead`.
- **Spacing Scale:** xs is now the row-1-to-row-2 gap and the targets row-gap, with no token between the abutting boxes. sm is now the badge-to-flag gap.
- **Spacing exceptions:** the 32×32 exception was reworded to the `.ex-controls .skip-set` box, and a −4px controls-pull exception was added with its reason.
- **Width check:** the paragraph was replaced with the measured two-row figures (318px content, about 250px meta, 1 line for every PUSH 1 slot, 2 for the Quads note, 32px rows, and the flag placement) and the four things the original check got wrong.
- **S1:** a "Revised 2026-10-22 (G-10-5)" note, the shipped four rules and two-row markup, and the pinned-group equivalent of the hide-S1 sentence. The "Shown only when" bullets are kept.
- **UI Considerations:** the overflow/S1 row was rewritten to the two-row result, and the phone backstop row now reads "skip and caret sit as a pair over the per-set skip/× column; the badge and ⬆ Add weight share the second row".

## Deviations from Plan

**1. [Tracer gate] Kept the run autonomous after the tracer**
- **Found during:** Task 1.
- **Issue:** the executor's tracer rule asks an interactive run to stop for a human check after the tracer. This plan declares `autonomous: true` and `designed_stops: None`, with the human check deferred to UAT test 5 in 10-06.
- **Fix:** I ran the tracer's automated verify again, plus the full 380/412px Chrome probe (every row within tolerance), as the gate, then continued.
- **Commit:** f55b9df.

**2. [Rule 1 - Bug] The test helper's tag regex missed `h2` and `h3`**
- **Found during:** Task 2.
- **Issue:** the first draft of the icon-gap check's context parser used `^[a-z]*`, which drops digit-bearing tag names. It derived 3 spaced contexts instead of 5 and flagged the `h2` "How this program works" icon as a false positive.
- **Fix:** the regex is now `^[a-z][a-z0-9]*`. Five contexts are derived, and only the true (c) sites fail.
- **Files modified:** test/app.test.js.
- **Commit:** 70e402c.

Otherwise the plan ran as written.

## Scratch

Probe and sweep scripts, pages, DOM dumps and screenshots are in `C:\Users\idbac\AppData\Local\Temp\claude\C--Users-idbac-Projects-ppl-tracker--claude-worktrees-bold-mcclintock-f1c7e4\83ccc31a-45bd-4228-a4d3-a9e8055c5877\scratchpad\g105-probe-1793362844` (gen.js, measure.js, sweep.js, sweep-measure.js, compose.js, after.png, cmp0-5.png). The data is synthetic only, and nothing from that directory is committed.

## Known Stubs

None.

## Threat Flags

None. The change is layout-only. No new interpolation of user-controlled values (T-10-40), the CSP hash was refreshed after each script edit (T-10-41), and no `data-action` or persistence path changed (T-10-42).
