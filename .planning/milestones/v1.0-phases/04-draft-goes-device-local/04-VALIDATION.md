---
phase: 4
slug: draft-goes-device-local
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-22
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Custom, dependency-free harness (`test/app.test.js` + `test/harness.js`, plain `node`) |
| **Config file** | none — `package.json` `"test": "node test/app.test.js"` |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` (no quick/full split; the whole suite is one process) |
| **Golden regeneration** | `WRITE_MERGE_GOLDEN=1 node test/app.test.js` (after the `legacyView()` draft exclusion lands) |
| **Estimated runtime** | well under 60 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green, and `test/fixtures/merge-golden.json` regenerated and committed if the `legacyView()` change landed
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

Seeded at requirement level from RESEARCH.md § Validation Architecture; task IDs are filled once plans exist.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | DRAFT-01 | — | `mergeDB` output never carries `draft`; serialized push blob contains no `"draft"` | unit | `npm test` | ✅ extend / ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | DRAFT-02 | — | Remote draft (legacy / malformed / well-formed) never reaches local `DB.draft` via `adoptMerged`, gen-bump replace, or cloud-only sign-in choice | unit | `npm test` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | DRAFT-03 | — | Log tab renders with malformed / absent remote draft | smoke | `npm test` | ✅ existing | ⬜ pending |
| TBD | TBD | TBD | DRAFT-04 | — | `finishWorkout` / `discardWorkout` produce no draft-bearing write | unit | `npm test` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | DRAFT-05 | — | Local persist then reload preserves the draft exactly | unit | `npm test` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | D-06/D-08 | — | Import (Merge/Replace) ignores file `draft`, keeps local one | unit | `npm test` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | D-07 | — | `snapPayload` (local ring + cloud `versions`) excludes `draft` | unit | `npm test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `test/harness.js` `names` allowlist — export the functions the new tests call directly
- [ ] `test/app.test.js` `legacyView()` — exclude `draft` from the legacy-vs-derived comparison before `mergeDB` changes
- [ ] `test/fixtures/merge-golden.json` — regenerate after the `legacyView()` change
- [ ] Rewrite existing tests that assert draft follows recency through `mergeDB`
- [ ] Decide how import Merge/Replace becomes testable (pure helpers vs. stubbed `confirm`)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Other device shows no "Workout in progress / Resume" card for a workout started elsewhere | D-02 | Needs two real signed-in devices against live Firestore | Start a workout on the phone; open the app on a second device; confirm no Resume card appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
