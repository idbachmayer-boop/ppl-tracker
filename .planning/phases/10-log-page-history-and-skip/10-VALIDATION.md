---
phase: 10
slug: log-page-history-and-skip
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-13
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Seeded from `10-RESEARCH.md` § Validation Architecture. The per-task map is filled in when plans exist.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Plain Node script with `ok(name, cond, extra)`; the app loads into `vm` via `test/harness.js` `loadApp()` |
| **Config file** | none (`package.json` `"test": "node test/app.test.js"`) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm run csp:hash; npm test` (the hash step only when the inline script changed) |
| **Estimated runtime** | ~10 seconds |

Baseline at research time: `1136 passed, 0 failed, 2 skipped`.

---

## Sampling Rate

- **After every task commit:** `npm run csp:hash` if the inline script changed, then `npm test`
- **After every plan wave:** `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

Task-level map, from each plan's `<validation_map>`. Every code task runs `npm run csp:hash && npm run csp:check && TZ=America/Chicago npm test`.

| Task ID | Plan | Wave | Rows covered | Automated Command | Status |
|---------|------|------|--------------|-------------------|--------|
| 10-01-01 | 10-01 | 1 | LOG-03, D-08, D-10, D-14; D-14 DRAFT-05 rows + pin; LOG-05, D-09, D-16 | `npm test` | ⬜ pending |
| 10-01-02 | 10-01 | 1 | D-11, D-12; LOG-04, D-13; Security (reason in S2) | `npm test` | ⬜ pending |
| 10-01-03 | 10-01 | 1 | LOG-05, D-09, D-16; D-09 old build + sync; D-18 export | `npm test` | ⬜ pending |
| 10-02-01 | 10-02 | 2 | D-15, D-17 | `npm test` | ⬜ pending |
| 10-02-02 | 10-02 | 2 | D-15, D-17, D-24; Security (S6 + note) | `npm test` | ⬜ pending |
| 10-02-03 | 10-02 | 2 | LOG-04 via edit path (D-25) | `npm test` | ⬜ pending |
| 10-03-01 | 10-03 | 3 | LOG-01, D-06; LOG-02, D-19..D-21 | `npm test` | ⬜ pending |
| 10-03-02 | 10-03 | 3 | LOG-01, D-01..D-05; D-07; Security (S4) | `npm test` | ⬜ pending |
| 10-03-03 | 10-03 | 3 | LOG-02, D-19..D-21 (paths back, one-shot, resets) | `npm test` | ⬜ pending |
| 10-04-01 | 10-04 | 4 | CSP; full suite on the tip | `npm run csp:check && TZ=America/Chicago npm test` | ⬜ pending |
| 10-04-03 | 10-04 | 4 | Manual-Only Verifications (human check); live bytes | `node scripts/csp-hash.js --check` (live page) | ⬜ pending |

10-04-02 is the blocking push checkpoint and has no automated row.

Requirement-level map (from research):

| Req / Decision | Behavior | Test Type | Automated Command | File Exists | Status |
|----------------|----------|-----------|-------------------|-------------|--------|
| LOG-01, D-06 | Tapping Last time shows the panel; stored draft unchanged, no push; opening a second card closes the first | integration (dispatcher) | `npm test` | ❌ W0 | ⬜ pending |
| LOG-01, D-01..D-05 | Last 5 by `exKey`, newest first, labelled by workout; deload, skip and PR markers; deleted sessions, skipped days and the session being edited are excluded | unit + render | `npm test` | ❌ W0 | ⬜ pending |
| D-07 | No history → no toggle control; `lastAnywhere`-only → control present | render | `npm test` | ❌ W0 | ⬜ pending |
| LOG-02, D-19..D-21 | The chart link lands on Strength with the exercise selected; the back control returns to Log with scroll, open panel and collapsed cards intact; draft unchanged | integration (scrollTo spy) | `npm test` | ❌ W0 | ⬜ pending |
| LOG-03, D-08, D-10, D-14 | Skip marks only unfinished sets, stores the reason, Cancel is a no-op, persists via `saveLocal()` and survives a reload | integration | `npm test` | ❌ W0 | ⬜ pending |
| D-14 | DRAFT-05 table gains the skip/unskip rows; length pin updated | structural | `npm test` | ✅ (edit) | ⬜ pending |
| D-11, D-12 | Collapsed skip note with Undo; card keeps its `ex-card` opener; skip control hidden when every set has reps | render | `npm test` | ❌ W0 | ⬜ pending |
| LOG-04, D-13 | Undo after a reload restores sets exactly; no snapshot or marker left behind | integration | `npm test` | ❌ W0 | ⬜ pending |
| LOG-05, D-09, D-16 | Finished entry keeps per-set flags and the marker; no `_`-prefixed key on any finished entry or set; no Add weight next time; an all-skipped workout finishes | integration | `npm test` | ❌ W0 | ⬜ pending |
| D-09 (old build, sync) | Per-set flags alone still block Add weight and pause the stall; `validateBackup` and `mergeDB` keep the marker; `SCHEMA` unchanged | unit | `npm test` | ❌ W0 | ⬜ pending |
| D-15, D-17, D-18 | Workout history and the next Last time line show the skip note; the export runs and carries no draft-only field | render / unit | `npm test` | ❌ W0 | ⬜ pending |
| Security | A hostile reason built from ordinary characters renders escaped in every view; never in an attribute | render | `npm test` | ❌ W0 | ⬜ pending |
| CSP | `csp:check` passes after the script change | existing | `npm test` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `test/app.test.js`: a new LOG section (no existing test mentions `LOG-0`)
- [ ] `test/app.test.js`: DRAFT-05 table rows for the two new draft mutators, plus the updated length pin
- [ ] `test/harness.js`: optional getters for any new screen-only `let` state (a `let` is not exported to tests)

No framework install is needed.

---

## Manual-Only Verifications

Ian's end-of-phase UAT on the phone (`human_verify_mode: end-of-phase`), never executor checkpoints:

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| The phone runs the new build | all | PWA update lag | Settings → This version shows the new build |
| Inline history and round trip to the chart | LOG-01, LOG-02 | Real scroll and touch behaviour | Tap Last time on two cards (one panel at a time), read the rows, open the chart, go back: same scroll spot, panel open, collapsed cards still collapsed |
| Skip survives an app restart; Undo restores | LOG-03, LOG-04 | Real reload of the installed PWA | Do one set, skip with a reason, close and reopen the app, Undo, check the typed weights, skip again and finish |
| No Add weight next time | LOG-05 | End-to-end across sessions | Workout history shows "rest skipped: reason"; the next session of that workout shows no Add weight on that card, and Last time shows the last real numbers plus the skip note |
| Header fits at 380px | LOG-03 | Visual layout | The skip icon and the caret do not crowd the range badge |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
