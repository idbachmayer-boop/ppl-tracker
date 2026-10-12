---
phase: 09
slug: equipment-and-weight-steps
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-12
---

# Phase 09 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Hand-rolled `ok()` assertions in `test/app.test.js`, plus `test/harness.js` (node `vm` sandbox, frozen clock) |
| **Config file** | none (`package.json` `"test": "node test/app.test.js"`) |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` and `npm run csp:check` |
| **Golden regeneration** | `WRITE_MERGE_GOLDEN=1 node test/app.test.js`, then `npm test`, in the same commit as the SCHEMA bump |
| **Estimated runtime** | ~6 seconds |

---

## Sampling Rate

- **After every task commit:** `npm run csp:hash` (if the inline script changed), then `npm test`
- **After every plan wave:** `npm test` and `npm run csp:check`
- **Before `/gsd-verify-work`:** full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

Requirement-level map from RESEARCH.md § Validation Architecture. The planner assigns task IDs.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | EQUIP-01 | — | `equipOf` falls back to the guess for a missing or hostile value | unit + render | `npm test` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | EQUIP-02 | — | migration stores `equip` on every row (TDZ catcher), is idempotent, never downgrades; stale-device replay ×2 keeps it; a rename on the other device survives (D-14) | integration | `npm test` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | EQUIP-03 | — | per-row registry merge: an edit survives the other device's newer save, both orders, ×2; `exMerge` tombstone not resurrected; merge laws hold | unit | `npm test` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | EQUIP-03 | — | equipment controls go through `dispatchAction`, invalid types refused, `save()` used, not a draft pusher | integration | `npm test` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | EQUIP-04 | — | `weightStep` per type and rack (D-08/D-17); Phase 8 +5 assertions retargeted | unit + render | `npm test` | partial | ⬜ pending |
| TBD | TBD | TBD | EQUIP-05 | — | deload down to step and ≥1 step lighter, empty-bar exception (D-15); warm-ups nearest; `translateLoad` floors, `DB.unit` escaped | unit + render | `npm test` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | EQUIP-06 | — | plate math for Preacher curl vs 25 lb bar; silent at or below the bar; sled and landmine kept | unit + render | `npm test` | partial | ⬜ pending |
| TBD | TBD | TBD | D-04/D-05/D-16 | — | first-time picker only for unknown names; card tag text | integration + render | `npm test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Add new consts and function names the suite reads via `app.X` to the harness `names` list (`test/harness.js`) and to `REQUIRED_EXPORTS` (`test/app.test.js`)
- [ ] A shared schema-18 registry seed helper (rows without `equip`, fixed `mtime`) for the boot, replay and late-migration tests
- [ ] Retarget the Phase 8 +5 assertions and the `_schema === 18` literals in the same plan as the code change

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real workout on the phone with the new steps, the tag, the picker and the Preacher-curl plate line; an equipment change in Settings shows on the second device | EQUIP-01..06 | Needs Ian's real data, the deployed PWA on Android and two signed-in devices | After the deploy, Settings → This version must end with the merge sha7. Then log a workout and check the cards, and change one exercise's type on the PC and see it on the phone |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
