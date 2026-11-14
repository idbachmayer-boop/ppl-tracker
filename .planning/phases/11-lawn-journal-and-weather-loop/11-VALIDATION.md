---
phase: 11
slug: lawn-journal-and-weather-loop
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-11-11
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Plain Node script, `ok(name, cond, extra)`; app loads into a `vm` via `test/harness.js` `loadApp()` |
| **Config file** | none (`package.json`: `"test": "node test/app.test.js"`) |
| **Quick run command** | `TZ=America/Chicago node test/app.test.js \| grep -E "FAIL\|LAWN"` |
| **Full suite command** | `npm run csp:hash && npm run csp:check && TZ=America/Chicago npm test` |
| **Estimated runtime** | ~10 seconds (baseline 1250 passed, 0 failed, 2 skipped) |

The runner has no name filter: every new `ok()` label carries its requirement ID (`LAWN-01: …`) so the quick command isolates this phase.

---

## Sampling Rate

- **After every task commit:** Run the full suite command (every code task edits the inline script, so the CSP hash must be refreshed each time)
- **After every plan wave:** Run the full suite command
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

Filled in by the planner/executor against the PLAN.md task IDs. Requirement → behaviour map from RESEARCH.md:

| Req ID | Behavior | Test Type | Automated Command | File Exists | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| LAWN-01 | High 54°F → water held (hard), text names the high; 60°F exactly → scheduled as before; `null` high is not a cool day; Override still waters | unit | `npm test` (`LAWN-01:`) | ❌ W0 | ⬜ pending |
| LAWN-02 | `rainLog` declared last, unused label, `collectionProblems()` clean; migration 20 creates `[]`, rewrites no row, idempotent, never downgrades; stale-device delete replay both directions + replay-again; `validateBackup` refuses damaged, accepts older; declaration-alone proof; export section derives | unit | `npm test` (`LAWN-02:`) | ❌ W0 | ⬜ pending |
| LAWN-02 | Fetch adds one row per finished day, never today; unchanged amount writes nothing / no push; changed amount updates + re-stamps; tombstone not revived; `DB.updatedAt` unchanged; push count 1 for changed batch, 0 for none; never `save()` | integration (`opts.fetch`) | `npm test` (`LAWN-02:`) | ❌ W0 | ⬜ pending |
| LAWN-02 | Pushed blob carries rows; stale device does not flip a `lawnLog` day; no `set()` outside the transaction | integration (`fakeCloud`) | `npm test` (`LAWN-02:`) | ❌ W0 | ⬜ pending |
| LAWN-03 | 0.42 → "🌧 0.42"", 0.1 → shown, 0.099 → no mark but row kept, today never marked; off-season Lawn history hidden | unit (HTML) | `npm test` (`LAWN-03:`) | ❌ W0 | ⬜ pending |
| LAWN-04 | 💧 on exactly one day (first allowed due day); skips chance ≥ 60 and own rain ≥ `rainSkip` (0.3 summer / 0.5 spring); skips wrong parity; none if no day qualifies; ☔ vs 💧/🚜 sharing a cell; Today card + heads-up agree with strip | unit (HTML + `nextWaterDay`) | `npm test` (`LAWN-04:`) | ❌ W0 | ⬜ pending |
| LAWN-05 | Week in Review tags 🚜 Mowed, 💧 Watered, 🌧 0.42" on the right days; explicit `false` / `overrideWater` don't render; soft-deleted rain row doesn't render; all year | unit (HTML) | `npm test` (`LAWN-05:`) | ❌ W0 | ⬜ pending |
| LAWN-06 | Offline: Lawn and Today each make exactly one fetch over 40 ticks; fail→render doesn't re-fire; `WXFAIL.retryAt = 0` allows one more; success resets; non-OK backs off; ↻ and Retry bypass; off-season Today fetches; last forecast kept with "Offline — weather from …"; no cache → "Couldn't load weather" + Retry; today-missing cache shows no mislabeled day | async | `npm test` (`LAWN-06:`) | ❌ W0 | ⬜ pending |
| LAWN-07 | Harness `fetch` settles (rejects on a macrotask), counts calls, accepts `opts.fetch`; no instance in the run exceeds the call cap | harness + backstop | `npm test` (`LAWN-07:`) | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `test/harness.js` — counting, macrotask-rejecting `fetch`; `opts.fetch` injection; `__fetchCalls`/`__fetchUrls`; `makeWx({ pastDays })` (default 3); exports for `WXFAIL` and each new function; rewrite the stale stub comment
- [ ] `test/app.test.js` — `rainLog:20` in `INTRODUCED_AT`; retarget the "last entry" check from `sleep`; replace the three hard-coded `19` schema literals; new names in `REQUIRED_EXPORTS`; suite-tail assertion on the fetch-call backstop
- [ ] `test/fixtures/merge-golden.json` — regenerate with `WRITE_MERGE_GOLDEN=1 node test/app.test.js` after the SCHEMA bump, then run `npm test` plain
- [ ] New `LAWN-xx` test blocks as mapped above

No framework install needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Rain marks on real recent days | LAWN-03, LAWN-05 | Live weather data, real device | Open Week in Review (Train → History): 🌧 on recent wet days with two decimals, none on dry days |
| Offline backoff on the phone | LAWN-06 | Android `online` event can't be simulated in the harness | Airplane mode → open Today and Care → Lawn: no spinning, "Offline — weather from …" on Lawn; reconnect and confirm it refreshes |
| Rain rows reach the other device | LAWN-02 | Real cloud sync across two devices | Settings → Cloud Sync on the second device, then Week in Review there |
| 💧 outlook and cool-day hold | LAWN-01, LAWN-04 | Lawn season is off in November | Covered by automated tests; a live look needs a temporary season override (out of scope) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
