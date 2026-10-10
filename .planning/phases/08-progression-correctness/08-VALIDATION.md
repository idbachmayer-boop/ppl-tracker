---
phase: 8
slug: progression-correctness
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-10
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Source: 08-RESEARCH.md § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Plain Node script (`test/app.test.js`) with its own `ok()` asserter. `test/harness.js` loads index.html in a vm sandbox with a frozen clock (2026-08-07T17:00Z, `TZ=America/Chicago`) |
| **Config file** | none |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` (CI runs exactly this) |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** `npm run csp:hash && npm test`
- **After every plan wave:** `npm test`
- **Before `/gsd-verify-work`:** the full suite green, plus the phone workout check
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

The planner fills in Task IDs. Each row below is a behaviour that must have an automated check.

| Behaviour | Requirement / Decision | Test Type | Automated Command | File Exists | Status |
|-----------|------------------------|-----------|-------------------|-------------|--------|
| 2 sets at the top + 1 skipped → no add weight | PROG-01 / D-01 | unit | `npm test` | ❌ W0 | ⬜ pending |
| 2 sets at the top + `blankSets` → no add weight; all at the top with no blanks → add weight | PROG-01 / D-01 | unit | `npm test` | ❌ W0 | ⬜ pending |
| An added set must reach the top; a removed set is not missing | D-01 | unit + draft flow | `npm test` | ❌ W0 | ⬜ pending |
| `finishWorkout` stamps `blankSets`; an edit and re-save keeps it; a stale-device merge keeps it | D-01 | integration | `npm test` | ❌ W0 | ⬜ pending |
| 30/30/25, all at the top → no add weight | D-02 | unit | `npm test` | ❌ W0 | ⬜ pending |
| Every set skipped or blank in the latest entry → no add weight | D-09 | unit | `npm test` | ❌ W0 | ⬜ pending |
| Heavier = progress; same weight +1 total rep = progress; same and same = flat | PROG-02 / D-03 | unit | `npm test` | ❌ W0 | ⬜ pending |
| Lateral raise replay (20/17/15 → 20/18/15 → 20/18/16 → 20/19/16) is not stalled | PROG-03 | unit | `npm test` | ❌ W0 | ⬜ pending |
| Baseline + 3 flat → stalled; + 2 flat → not; one progress clears it; no all-time-max comparison | PROG-03 / D-06 | unit | `npm test` | ❌ W0 | ⬜ pending |
| A lighter session restarts the comparison | D-03 | unit | `npm test` | ❌ W0 | ⬜ pending |
| A deload, a skipped day or a session with a skipped set pauses the streak | D-05 / D-10 | unit | `npm test` | ❌ W0 | ⬜ pending |
| Slots are independent | D-04 | unit | `npm test` | ❌ W0 | ⬜ pending |
| A rename, alias or merge keeps one streak (fixtures seeded at `_schema:16`) | PROG-04 | unit | `npm test` | ❌ W0 | ⬜ pending |
| Bodyweight stalls after 3 flat sessions; all at the top → "belt / harder variation" with no number | PROG-05 / D-08 | unit + render | `npm test` | ❌ W0 | ⬜ pending |
| No SCHEMA change; booting old data rewrites no session | D-07 | unit | `npm test` | ✅ partly | ⬜ pending |
| Garbage `w` / `blankSets` doesn't throw; the stall banner and flag escape the workout name and `DB.unit` | Security | unit + render | `npm test` | ❌ W0 | ⬜ pending |
| The `f2Stall` fixture is rewritten; `busyStalled` and the handler inventory still pass | Regression | existing | `npm test` | ✅ (edit) | ⬜ pending |
| The inline-script hash is current | CSP | existing | `npm run csp:check` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `test/app.test.js`: a new "progression: add weight and stall" section, with a slot-fixture builder seeded through `normalize` at `_schema:16`
- [ ] `test/app.test.js`: rewrite the `f2Stall` fixture (~L7177-7186) so it still stalls under the new rule
- [ ] Optional: export the new helper names in `test/harness.js`, or reach them through `a.__sandbox`

---

## Manual-Only Verifications

| Behaviour | Requirement | Why Manual | Test Instructions |
|-----------|-------------|------------|-------------------|
| A real workout on the phone gives the right advice | PROG-01..05 | Needs Ian's real history and device | Check Settings → This version shows the new build. The DB lateral raise shows no stall warning. Skip one set of an exercise, finish, then start that workout again: no ⬆ Add weight on it. A bodyweight exercise at the top shows "belt / harder variation". |

---

## Validation Sign-Off

- [ ] All tasks have an `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without an automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
