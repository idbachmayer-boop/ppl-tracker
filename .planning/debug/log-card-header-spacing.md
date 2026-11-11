---
status: diagnosed
trigger: "Phase 10 UAT test 5 (G-10-5): awkward spacing for the skip, history, and other buttons on the workout screen — wants them all on one line or on separate lines"
created: 2026-10-22T12:00:00Z
updated: 2026-10-22T12:00:00Z
goal: find_root_cause_only
---

## Current Focus

bug_class: Bohrbug (deterministic layout; reproduced headlessly card-for-card)
hypothesis: CONFIRMED — see Resolution.root_cause (4 contributing causes)
reasoning_checkpoint:
  hypothesis: "The how-to icon drops because svg{display:block} (219) is not reset by .ph (199); the gaps come from .ex-head space-between (94) + rigid nowrap right column (2189) + left-pinned glyph in the 32px .ex-skip box (84) + template whitespace; the flag line is the literal <br> (2192)."
  confirming_evidence:
    - "Computed display:block on every header svg; icon on its own line even with 282px free (not a width squeeze)"
    - "Probe 'current @ 412px' matches Ian's screenshot; pre-10 markup shows the same orphan + flag line"
    - "Measured glyph gaps 25px (skip->caret) vs 4px (caret->badge); 58px space-between slack @412"
  falsification_test: "Setting .ex-meta .ph{display:inline-block} with the <a> nowrap puts the icon back on the how-to line — done in optA/optB probe: orphan=false in all 16 cases"
  fix_rationale: "Restructure the header into deliberate rows/groups with explicit gap tokens instead of space-between + whitespace; make the icon inline"
  blind_spots: "Android uses Roboto + Droid Sans Mono, probe used Segoe UI + Consolas on Windows; widths differ by a few px. Not rendered inside the real app boot."
  candidate_causes:
    - "code/CSS: global svg rule leaking into .ph icons (confirmed)"
    - "code/markup: header structure (space-between, nowrap column, <br>) (confirmed)"
    - "environment: Android font metrics/text autosizing (ruled out as primary — reproduced on desktop Chrome)"
  and_gate: "yes — icon orphan, gaps and flag line are independent causes; fixing one leaves the others"
next_action: return ROOT CAUSE FOUND (goal: find_root_cause_only)

## Symptoms

expected: The Log-tab exercise card header reads cleanly at phone width (~380-412px); skip icon, open history panel and a skipped card fit with no overflow or clipping.
actual: "There is awkward spacing for the skip, history, and other buttons on the workout screen - can those be cleaned up so that they are all either on one line or separate lines?" Screenshot (Android Chrome PWA ~412px): "Biceps · Normal curl · how-to" with the chart/external-link icon wrapped alone onto line 2; skip icon floats mid-row with a large gap, then the collapse chevron, another gap, then the rep-range pill; on Barbell row card the "⬆ Add weight → 100 lb" badge wraps onto its own right-aligned line under the header.
errors: none
reproduction: 10-UAT.md test 5 — open Log tab on a phone with an in-progress workout
started: Discovered UAT 2026-10-22 after Phase 10 shipped (main 9a4e647); 10-01 added .ex-skip to the header.

## Eliminated

## Evidence

- timestamp: 2026-10-22T12:05:00Z
  checked: index.html:2187-2194 (viewActive Log card header template) and CSS 80-94, 120, 199, 206, 276
  found: .ex-head = flex, justify-content:space-between, align-items:flex-start, gap 8px, NO flex-wrap, children have no flex/min-width rules. Left child = bare <div> with .ex-meta text ending in `<a>how-to ${ph('arrow-square-out')}</a>` (a space between "how-to" and the svg = soft-wrap opportunity). Right child = inline style `text-align:right;white-space:nowrap` holding [button.skip-set.ex-skip (min-width/height 32px, margin-right 4px)] + whitespace + [button.skip-set caret, UA default padding] + whitespace + span.range-badge (font-mono) + `${flag?'<br>'+flag:''}`.
  implication: right column cannot shrink (nowrap => min-content = max-content), so flex shrinks only the left meta; the flag is forced onto a second line by a literal <br>, and when wider than line 1 it sets the right column's width.

- timestamp: 2026-10-22T12:06:00Z
  checked: git show 10a04d9 (10-01) and 10a04d9^ header markup
  found: 10-01 only inserted the .ex-skip button + .ex-skip rule; the nowrap right column, <br>+flag, and meta/how-to markup predate Phase 10 (56e2a5b / 2f9d84a).
  implication: Phase 10 added ~40px of rigid width to an already-rigid column; layout flaw is the header structure, the skip button tipped it.

- timestamp: 2026-10-22T12:07:00Z
  checked: 10-UI-SPEC.md lines 74-88, 209-224, 392, 399
  found: Spec width check at 380px: content ~318px, right column ~135px (skip 32+4, caret ~27, space, badge ~68 assumed), leaving ~175px "for the muscle/movement/how-to meta, which already wraps". Flag "sits on its own line in that column and is wider than the first row, so S1 adds no width". Populated-state backstop: "skip icon sits left of the caret without crowding the range badge or flag".
  implication: spec accepted meta wrapping and the <br> flag line; it did not consider that the wrap point is the space before the icon (orphaned icon) nor the visible gap sizes. Badge estimate ignored that .range-badge/.flag use --font-mono (line 276), which is wider.

- timestamp: 2026-10-22T12:20:00Z
  checked: headless Chrome 155 probe (scratchpad gen.js -> probe.html) using index.html's real <style> block + PH icons, header markup copied verbatim from 2187-2194, at 380 and 412px viewport; cases Biceps (no flag), Back+flag "→ 100 lb", Triceps+flag "(belt) or harder variation", Quads with s.note; plus pre-Phase-10 markup (no skip).
  found: (1) how-to icon is on its own line in EVERY case, including pre-10 and even when the left column has 282px free — not a width squeeze. (2) Biceps @412: left col 154px = its max-content, right col 130px, head 350px -> 58px of space-between free space sits between "how-to" and the skip button. (3) glyph-to-glyph gap skip->caret 25px vs caret->badge 4px (uneven). (4) flag line sits 28px below the badge (literal <br>); "(belt) or harder variation" flag is 254px nowrap -> left meta squeezed to 56px @380 = 5 lines, head 96px tall. (5) pre10 shows the same orphan icon and flag line -> both predate Phase 10.
  implication: icon orphaning is a display issue, not a wrap-at-width issue. Searched for svg rules.

- timestamp: 2026-10-22T12:25:00Z
  checked: grep svg CSS; git blame 199, 206, 219
  found: index.html:219 `svg { display: block; width: 100%; }` (original upload 2f9d84a, 2026-06-24, for the weight charts). index.html:199 `.ph { width:1.15em; height:1.15em; vertical-align:-.22em; flex:0 0 auto }` (b22b9f4, 2026-07-27) overrides width but never sets display, so every Phosphor icon is display:block. A block box inside the inline <a> (block-in-inline) is forced onto its own line.
  implication: ROOT CAUSE of the orphaned how-to icon. Same leak explains other icons on their own line in the screenshot: Last time caret (S3 open cue) under "Last time (Oct 9)…", fire icon above "Warm-up ramp", flame above "Warm-up", stopwatch above "Rest".

- timestamp: 2026-10-22T12:45:00Z
  checked: probe2 computed styles for the current header buttons (Biceps @380/@412) + screenshot scratchpad/shot.png
  found: every header svg computes display:block. Buttons have 0 padding. .ex-skip button 32x32 but its 15px glyph sits at the button's LEFT edge (svgL == btnL) because a block child is not centred by text-align, so 17px of dead tap box faces the caret; + margin-right 4px + one collapsed whitespace text node (~4px at the column's inherited 16px) = 25px glyph gap. Caret button is a bare 15x15 (no min size) followed by one whitespace (~4px) = 4px gap to the badge. Skip glyph top sits ~7px below meta top (32px line box, align-items:flex-start). Screenshot "current @ 412px" reproduces Ian's phone image card-for-card. Same probe: Last time caret on its own line (lasttime 46px tall), skip-note lead icon on its own line above "Set 2 skipped" (span 30px tall).
  implication: uneven gaps = space-between free space + left-pinned glyph in a 32px box + margin + template whitespace; none of it is a deliberate spacing token.

- timestamp: 2026-10-22T12:50:00Z
  checked: two candidate layouts rendered in the same probe with the how-to icon made inline-block and the <a> nowrap. (a) one line: meta flex:1 min-width:0 | [badge skip caret] tight flex group, flag moved to its own row under the header. (b) two lines: [meta ... skip caret] / [badge flag] flex-wrap row.
  found: (a) @412 one line for short metas, but @380 even "Biceps · Normal curl · how-to" wraps (168px left), and the flag can never share the line (145-254px) so it must move; header 32px. (b) meta gets 242px @380 / 274px @412, one line for every slot except the Quads note slot (wraps at a word, link kept whole); badge+flag row fits "→ 100 lb" on one row, "(belt)…" wraps under the badge @380 cleanly; no overflow in any case; adds one ~20px row per card.
  implication: (b) is the only layout that is the same shape for every card state at 380px; recommend (b).

- timestamp: 2026-10-22T12:52:00Z
  checked: test/app.test.js:9817-9824 (D-12 header order test)
  found: test pins the literal `<div style="text-align:right;white-space:nowrap">` and the order skipExercise < toggleExCollapse < range-badge within that column with no `</div>` between column start and caret.
  implication: any fix that restructures the column must retarget this test to the property (skip before caret, both in .ex-head; badge present) rather than the inline-style wording.

## Resolution

root_cause: Three CSS/markup causes together (AND-gate: the icon orphan comes from cause 1, the gaps from causes 2+3, the flag line from cause 4): (1) global `svg { display:block; width:100% }` (index.html:219, chart rule from the original upload) is never overridden for Phosphor icons — `.ph` (index.html:199) resets width/height but not display — so the how-to arrow-square-out svg inside the inline <a> (index.html:2188) is a block box and always gets its own line, at any width; (2) `.ex-head` (index.html:94) is `justify-content:space-between` with an un-grown left meta div (index.html:2188) and a rigid right column (index.html:2189 inline `text-align:right;white-space:nowrap`), so leftover row width (~58px @412) lands between "how-to" and the skip icon; (3) inside that column the spacing is incidental: `.ex-skip` 32px min box (index.html:84) with its block-display glyph pinned to the left edge + margin-right 4px + template whitespace text nodes, vs a bare 15px caret button — 25px vs 4px glyph gaps; (4) `${flag?'<br>'+flag:''}` (index.html:2192) forces the ⬆ Add weight flag onto a second line of that nowrap column; when wider than line 1 it sets the column width and squeezes the meta (the "(belt) or harder variation" flag, 254px, leaves the meta 56px = 5 lines @380). Causes 1, 2, 4 predate Phase 10; 10-01 added the 32px skip button to the rigid column, widening it by 40px and adding the largest gap.
fix: (diagnose-only — not applied)
verification:
files_changed: []
