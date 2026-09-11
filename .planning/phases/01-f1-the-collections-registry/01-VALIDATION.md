---
phase: 1
slug: f1-the-collections-registry
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-11
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Seeded from `01-RESEARCH.md` § Validation Architecture. Baseline measured 2026-09-11: 226 passed, 0 failed, ~1.1 s.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Custom zero-dependency Node harness — `test/harness.js` evaluates the real inline `<script>` of `index.html` in a `vm` with a stubbed DOM; no external runner |
| **Config file** | none — `npm test` runs `node test/app.test.js` |
| **Quick run command** | `cd /c/Users/idbac/Projects/ppl-tracker && TZ=America/Chicago node test/app.test.js` |
| **Full suite command** | `cd /c/Users/idbac/Projects/ppl-tracker && TZ=America/Chicago npm test` |
| **Estimated runtime** | ~1 second (measured 1113 ms on 2026-09-11) |

`TZ=America/Chicago` is mandatory — the clock is frozen to 2026-08-07 midday and the clock guard fails without it.

---

## Sampling Rate

- **After every task commit:** Run `TZ=America/Chicago node test/app.test.js`
- **After every plan wave:** Run `TZ=America/Chicago npm test` (the same single file — there is no separate full suite)
- **Before `/gsd-verify-work`:** Full suite must be green — `CLAUDE.md`: a red suite blocks the deploy
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

Task IDs are assigned by the planner; this table is completed as plans are written and executed.
Seed rows below map each requirement to its test signal (from `01-RESEARCH.md`).

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | REG-02/03/04 | — | App boots without a TDZ throw | boot-order regression | `TZ=America/Chicago npm test` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | REG-06 | — | N/A | characterization (`blank()` parity) | `TZ=America/Chicago npm test` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | REG-07 | — | Soft-deleted rows never shown | differential (`liveX()` legacy vs derived) | `TZ=America/Chicago npm test` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | REG-08 | — | Malformed backups still rejected | differential (existing malformed-backup battery through both validators) | `TZ=America/Chicago npm test` | ⚠️ partial | ⬜ pending |
| TBD | TBD | TBD | REG-09/REG-10 | — | Erase-all / Import→Replace still zero-survivor | differential + named-hazard test (`gen` short-circuit) | `TZ=America/Chicago npm test` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | REG-13 | — | Real data never committed | differential over synthetic per-incident fixtures (committed) + real backup (local only) | `TZ=America/Chicago npm test` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | REG-15 | — | Every collection shaped after boot | regression loop, schema 1→17 | `TZ=America/Chicago npm test` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | REG-05 | — | Map explicit-`false` survives merge | differential (`mergeDateMap` explicit-false vs absent) | `TZ=America/Chicago npm test` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SLEEP-05 | — | N/A | behavioural: a throwaway collection added inside the test is picked up by every derived consumer with no further code | `TZ=America/Chicago npm test` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SLEEP-06 | — | Deleted sleep row never resurrects | synthetic two-device stale replay | `TZ=America/Chicago npm test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `test/harness.js` `names` export array (~line 97) — gains every new function the tests call; an unlisted name silently returns `undefined` to tests
- [ ] `.gitignore` — created (none exists) with the local-only real-backup path
- [ ] Real-backup fixture — **LOCAL ONLY, git-ignored** (Ian, 2026-09-11: the repo and the live site are public). Ian exports it from the app; it is never committed. The real-data differential runs only when the file is present and **skips loudly** (a visible SKIP line, never a silent pass) when absent
- [ ] Synthetic per-incident two-device fixtures (committed) — one per incident recorded in `CLAUDE.md` / `01-RESEARCH.md`
- [ ] New test blocks: `gen`-mismatch-untouched (named for the hazard), `mergeDateMap()` explicit-false vs absent, boot-order 1→17, SLEEP-04 structural/behavioural assertion, SLEEP-06 replay
- [ ] `populatedDB()` fixture gains a `sleep` array so the screen smoke test draws the sleep view with data

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real-backup differential passes on Ian's machine | REG-13 | The real backup is git-ignored by decision, so CI never sees it | With the exported backup at the git-ignored path, run the full suite locally; confirm the real-data differential reports PASS, not SKIP |
| Sleep view looks and behaves like the other log screens on the phone | SLEEP-02, SLEEP-03 | No UI-SPEC (`--skip-ui`); visual fit cannot be asserted by the harness | On the deployed app: log a night (hours, quality 1–5, note), see it in the dated list, delete it, confirm it stays deleted after a sync |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
