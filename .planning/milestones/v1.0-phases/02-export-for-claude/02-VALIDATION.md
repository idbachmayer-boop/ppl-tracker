---
phase: 2
slug: export-for-claude
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-16
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js native `vm`-based harness (`test/harness.js`), no external runner |
| **Config file** | none — `npm test` runs `node test/app.test.js` |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-T1 | 02-01 | 1 | EXP-01, EXP-02, EXP-04, EXP-06 (D-02, D-03, D-06, D-08, D-09, D-10, D-12) | T-02-01, T-02-04 | Export builds from COLLECTIONS + liveOf; registry boot survives the column-shape change | tracer (end-to-end) | `TZ=America/Chicago node test/app.test.js` (`PASS  export: ` ≥ 10) | ✅ test/app.test.js | ⬜ pending |
| 02-01-T2 | 02-01 | 1 | EXP-02, EXP-05 (declaration side) | T-02-02, T-02-03, T-02-05, T-02-06 | Internal-id columns refused; exporter never persists, never reaches the network, names no collection | unit + static | `TZ=America/Chicago node test/app.test.js` (`PASS  export: ` ≥ 19) | ✅ | ⬜ pending |
| 02-02-T1 | 02-02 | 2 | EXP-03 (D-04, D-05) | T-02-07 | Bookkeeping keys and explicit false never exported as logged items | unit | `TZ=America/Chicago node test/app.test.js` | ✅ | ⬜ pending |
| 02-02-T2 | 02-02 | 2 | EXP-04, EXP-05, EXP-06 (D-07, D-09, D-11) | T-02-08, T-02-09, T-02-11 | Deleted rows, ids and non-registry data (home location) absent | unit | `TZ=America/Chicago node test/app.test.js` | ✅ | ⬜ pending |
| 02-03-T1 | 02-03 | 3 | EXP-06, EXP-07, EXP-08 (D-13) | T-02-13, T-02-14 | Header counts equal table rows; no value can change a row's width | unit + local-only real backup (SKIP when absent) | `TZ=America/Chicago node test/app.test.js` | ✅ | ⬜ pending |
| 02-03-T2 | 02-03 | 3 | EXP-01 (D-01, D-03) | T-02-12, T-02-16, T-02-17 | No export path writes DB, localStorage or lastBackupAt; cancel is silent | unit (stubbed File/navigator per instance) | `TZ=America/Chicago node test/app.test.js` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `test/harness.js` — add new exporter function names to the exported `names` array
- [ ] `test/harness.js` — `navigator.share` / `navigator.canShare` stubs if the share/download branch is tested
- [ ] `test/app.test.js` — `REQUIRED_EXPORTS` entries for new functions
- [ ] `test/app.test.js` — update the `columns`-shape assertions in the same commit as the shape change

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Share sheet opens with the `.md` file on the phone; cancelling does nothing | EXP-01 (D-01) | Web Share API needs a real device, a user gesture and a secure context | On the installed PWA: Settings → export Markdown → confirm the share sheet lists the file; cancel → no download, no error |
| Which path Ian's phone takes for a `.md` file | EXP-01 (D-01, D-03) | MDN's shareable-file-types list (Chromium's allowlist) has no `.md`/`text/markdown`; Android Chrome likely reports `canShare` false and downloads instead, iOS Safari is expected to share | On the phone: tap "Export for Claude (.md)"; note whether the share sheet opens or the file downloads. A download is D-01's fallback working, not a bug; if Ian wants the share sheet on Android, D-03's filename is his to revisit |
| The file reads correctly in the Claude app | EXP-08 (D-13) | Only the real target app shows how the tables and header render | Share (or attach) the file to a Claude conversation; confirm the header's date range and "Rows per section" line are present and the Workouts table is one row per set |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
