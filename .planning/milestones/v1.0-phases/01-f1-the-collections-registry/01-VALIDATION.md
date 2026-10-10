---
phase: 1
slug: f1-the-collections-registry
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: false
wave_0_complete: true
created: 2026-09-11
validated: 2026-09-16
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Seeded from `01-RESEARCH.md` § Validation Architecture. Baseline measured 2026-09-11: 226 passed, 0 failed, ~1.1 s.
> Audited 2026-09-16 after execution: 653 passed, 0 failed, 0 skipped.

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

Audited 2026-09-16 against the executed phase. Each requirement points at the named block in
`test/app.test.js` that proves it (or the out-of-suite command, where the requirement is about git
history rather than behaviour).

| Requirement | Plan(s) | Secure Behavior | Test | Automated Command | File Exists | Status |
|-------------|---------|-----------------|------|-------------------|-------------|--------|
| REG-01 | 01-01 | Registry never mutated | `registry: never mutated by boot, merge or render (REG-01)`; `placement:` checks | `TZ=America/Chicago npm test` | ✅ | ✅ green |
| REG-02/03/11 | 01-01 | App boots without a TDZ throw | `COLLECTIONS sits where module-eval can reach it (REG-02/03/11)`; `REG-11: MIGRATIONS stays hand-written` | `TZ=America/Chicago npm test` | ✅ | ✅ green |
| REG-04 | 01-01 | N/A | `REG-04: the promoted key functions, proven identical to their pre-phase bodies` | `TZ=America/Chicago npm test` | ✅ | ✅ green |
| REG-05 | 01-01, 01-03 | A map with no merge strategy is refused; explicit `false` survives merge | `the registry refuses what would lose data`; `mergeDB() is derived from COLLECTIONS` (dispatch-throw) | `TZ=America/Chicago npm test` | ✅ | ✅ green |
| REG-06 | 01-02 | Fresh containers on every blank() | `blank() is derived from COLLECTIONS (REG-06)` + golden | `TZ=America/Chicago npm test` | ✅ | ✅ green |
| REG-07 | 01-02 | Soft-deleted rows never shown | `the soft-delete filters are derived from COLLECTIONS (REG-07)` + 7 goldens | `TZ=America/Chicago npm test` | ✅ | ✅ green |
| REG-08 | 01-02 | Malformed backups still refused, same wording | `validateBackup() takes its shape checks from COLLECTIONS (REG-08)` — named, 70 generated, two-fault | `TZ=America/Chicago npm test` | ✅ | ✅ green |
| REG-09 | 01-03, 01-04 | Derived merge matches legacy; merge laws hold | `mergeDB() is derived…`; seeded random battery (400 merges; idempotence, commutativity, associativity) | `TZ=America/Chicago npm test` | ✅ | ✅ green |
| REG-10 | 01-03 | Erase-all / Import→Replace leave zero survivors | gen-mismatch block byte-identical; gen early return before `mergeCollections`; zero-survivor incidents | `TZ=America/Chicago npm test` | ✅ | ✅ green |
| REG-12 | 01-02, 01-03 | App shippable at every commit | commit sequence (git history, not the suite) | `git log --reverse --format=%s \| grep -o 'REG-12 step [0-9]/4'` → 1/4…4/4 in order | ✅ | ✅ green |
| REG-13 | 01-03, 01-04, 01-06, 01-07 | Real data never committed or printed | `every sync incident, replayed`; random battery; 72 goldens; `.gitignore` checks; real-backup block (local only — see Manual-Only) | `TZ=America/Chicago npm test` | ✅ | ✅ green |
| REG-14 | 01-07 | Legacy deleted only after its replacement, never in the same commit | holds because nothing was deleted — deletion deferred by Ian (see Manual-Only) | `grep -cE '_legacy\(' index.html` → 12 | ✅ | ✅ green (deletion deferred) |
| REG-15 | 01-01, 01-05 | Every collection shaped after boot | `every schema version boots, and every declared collection has its shape (REG-15)` | `TZ=America/Chicago npm test` | ✅ | ✅ green |
| REG-16 | 01-05 | Migration 18 rewrites no row | `sleep: one declaration, SCHEMA 18, no row rewritten` | `TZ=America/Chicago npm test` | ✅ | ✅ green |
| REG-17 | 01-01 | N/A | `REG-17: export rows match COLLECTIONS.<name>.columns exactly` | `TZ=America/Chicago npm test` | ✅ | ✅ green |
| SLEEP-01/06 | 01-05 | Deleted sleep row never resurrects | `sleep: one declaration, SCHEMA 18…` — stale-device replay, both orders, retried transaction | `TZ=America/Chicago npm test` | ✅ | ✅ green |
| SLEEP-02/03 | 01-05 | Note escaped; unsafe id gets no delete button; delete is soft | `sleep: log, list and delete`; `every screen still draws` (Care → Sleep ×3 states) | `TZ=America/Chicago npm test` | ✅ | ✅ green (visual fit manual) |
| SLEEP-04 | 01-05 | N/A | `SLEEP-04: sleep is added through its declaration alone` | `TZ=America/Chicago npm test` | ✅ | ✅ green |
| SLEEP-05 | 01-05 | N/A | `SLEEP-05: a collection declared in one line is picked up everywhere` (probe transform) | `TZ=America/Chicago npm test` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky · ⏸ deferred*

---

### Planned task map (planner, 2026-09-11)

The requirement table above is the audited view. This table maps each planned task to its test signal. Every task's `<verify>` runs the suite. The only exception is 01-06 Task 1, a human checkpoint whose verification is a pair of read-only git checks.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|--------|
| 01-01-T1 | 01 | 1 | REG-01/02/03/04/15 | T-01-01, T-01-03 | App boots without a TDZ throw from every schema | boot-order regression + placement scan (tracer) | `TZ=America/Chicago node test/app.test.js` | ✅ green |
| 01-01-T2 | 01 | 1 | REG-04/05/11/17 | T-01-02, T-01-04 | A map with no merge strategy is refused at boot | contract tests + transform-booted refusal | `TZ=America/Chicago node test/app.test.js` | ✅ green |
| 01-02-T1 | 02 | 2 | REG-06, REG-12 | T-01-07 | Fresh containers on every blank() | parity vs blank_legacy | `TZ=America/Chicago node test/app.test.js` | ✅ green |
| 01-02-T2 | 02 | 2 | REG-07, REG-12 | T-01-06 | Soft-deleted rows never shown; deletes mutate stored rows | differential vs 7 twins + per-soft-collection loop | `TZ=America/Chicago node test/app.test.js` | ✅ green |
| 01-02-T3 | 02 | 2 | REG-08, REG-12 | T-01-05 | Malformed backups still refused, same wording | string-parity differential (named + generated + two-fault) | `TZ=America/Chicago node test/app.test.js` | ✅ green |
| 01-03-T1 | 03 | 3 | REG-13, REG-10 | T-01-08 | Erase / Import→Replace leave zero survivors | per-incident two-device replay (characterisation) | `TZ=America/Chicago node test/app.test.js` | ✅ green |
| 01-03-T2 | 03 | 3 | REG-09/10/05/12 | T-01-08, T-01-09, T-01-11 | Gen block untouched; explicit false survives; no default strategy | differential + textual + dispatch-throw | `TZ=America/Chicago node test/app.test.js` | ✅ green |
| 01-04-T1 | 04 | 4 | REG-13, REG-09 | T-01-11 | N/A | seeded random differential + mergeDB-level merge laws | `TZ=America/Chicago node test/app.test.js` | ✅ green |
| 01-04-T2 | 04 | 4 | REG-13 | T-01-12, T-01-13, T-01-14 | Real data never committed or printed; a skip is loud | real-backup differential (local only) + .gitignore checks | `TZ=America/Chicago node test/app.test.js` | ✅ green |
| 01-05-T1 | 05 | 5 | SLEEP-01/06, REG-15/16 | T-01-17, T-01-18 | Deleted sleep row never resurrects; no row rewritten | synthetic stale replay + no-rewrite + boot 0..18 | `TZ=America/Chicago node test/app.test.js` | ✅ green |
| 01-05-T2 | 05 | 5 | SLEEP-02/03 | T-01-15, T-01-16 | Note escaped; unsafe id gets no delete button | behaviour + every-screen smoke (+ human-check) | `TZ=America/Chicago node test/app.test.js` | ✅ green |
| 01-05-T3 | 05 | 5 | SLEEP-04/05 | — | N/A | probe collection via source transform + structural | `TZ=America/Chicago node test/app.test.js` | ✅ green |
| 01-06-T1 | 06 | 5 | REG-13 | T-01-19 | Backup stays local and untracked | checkpoint:human-action | `git check-ignore -q test/local/real-db-snapshot.json` | ✅ green |
| 01-06-T2 | 06 | 5 | REG-13 | T-01-19 | Real-data PASS recorded counts-only | real-backup differential run (must PASS, not SKIP) | `TZ=America/Chicago node test/app.test.js` | ✅ green |
| 01-07-T1 | 07 | 6 | REG-13 | T-01-23 | Goldens hold hashes of synthetic data only | golden capture | `TZ=America/Chicago node test/app.test.js` | ✅ green |
| 01-07-T2 | 07 | 6 | REG-14 | T-01-21, T-01-22 | Legacy deleted only after the real-data PASS | golden + invariant + source check | `TZ=America/Chicago node test/app.test.js` | ⏸ deferred (Ian, 2026-09-14) |

Wave 0 items are created inside the tasks, not in a separate wave:
- harness exports and REQUIRED_EXPORTS: 01-01-T1, extended by each later task
- .gitignore: 01-04-T2
- the real-backup fixture: 01-06-T1
- synthetic per-incident fixtures: 01-03-T1
- the gen, explicit-false, boot-order, SLEEP-04/05 and SLEEP-06 blocks: 01-01, 01-03, 01-05
- populatedDB sleep rows: 01-05-T2

## Wave 0 Requirements

- [x] `test/harness.js` `names` export array (~line 97) — gains every new function the tests call; an unlisted name silently returns `undefined` to tests
- [x] `.gitignore` — created (none exists) with the local-only real-backup path
- [x] Real-backup fixture — **LOCAL ONLY, git-ignored** (Ian, 2026-09-11: the repo and the live site are public). Ian exports it from the app; it is never committed. The real-data differential runs only when the file is present and **skips loudly** (a visible SKIP line, never a silent pass) when absent
- [x] Synthetic per-incident two-device fixtures (committed) — one per incident recorded in `CLAUDE.md` / `01-RESEARCH.md`
- [x] New test blocks: `gen`-mismatch-untouched (named for the hazard), `mergeDateMap()` explicit-false vs absent, boot-order 1→17, SLEEP-04 structural/behavioural assertion, SLEEP-06 replay
- [x] `populatedDB()` fixture gains a `sleep` array so the screen smoke test draws the sleep view with data

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real-backup differential passes on Ian's machine | REG-13 | The real backup is git-ignored by decision, so CI never sees it. **Last confirmed 2026-09-16: 0 skipped, real-backup checks PASS** | With the exported backup at the git-ignored path, run the full suite locally; confirm the real-data differential reports PASS, not SKIP |
| Sleep view looks and behaves like the other log screens on the phone | SLEEP-02, SLEEP-03 | No UI-SPEC (`--skip-ui`); visual fit cannot be asserted by the harness | On the deployed app: log a night (hours, quality 1–5, note), see it in the dated list, delete it, confirm it stays deleted after a sync |
| Legacy scaffolding deleted (01-07 Task 2) | REG-14 | Deferred by Ian on 2026-09-14 until SCHEMA 18 has run on the phone for a few days. The "legacy is gone" check cannot exist before the deletion does | When resumed: delete the ten `_legacy` functions in their own commit, retarget the synthetic differentials to `test/fixtures/merge-golden.json`, convert the real-backup block to invariants, add the "REG-14: the legacy scaffolding is gone" check |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter — held at `false`: three items are manual-only by environment or by decision, not by missing tests

**Approval:** validated (partial) 2026-09-16 — Ian accepted the three manual-only items

---

## Validation Audit 2026-09-16

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
| Manual-only | 3 |

Suite: 653 passed, 0 failed, 0 skipped (local real backup present). The out-of-suite commands for REG-12, REG-14 and the `.gitignore` checks were re-run and pass. No auditor was spawned because nothing automatable was missing.
