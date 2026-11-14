---
phase: 10
slug: log-page-history-and-skip
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-11-11
---

# Phase 10 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

Audited tree: HEAD 0775688, whose app files are identical to the live merge 5375e10 (PR #16).
The register was written at plan time in 10-01..10-06. It has 45 rows and 40 unique IDs, because T-10-SC appears in all six plans.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| prompt() → draft entry → card HTML | The skip reason is free text typed mid-workout | User text (low sensitivity), rendered as HTML |
| draft → finishWorkout → synced session and backups | Draft-only `_` fields must not leave the device | Workout data |
| imported backup / cloud blob / other device → views | Workout history, the Last time note, the history panel and the Log card header render data that is only shape-checked | Synced workout data, untrusted types |
| finished session → editSession → draft | Editing re-creates a draft from a stored session | Workout data |
| screen-only state (openExHist, logReturn) ↔ DB | UI state must never persist or push | None persisted |
| router (go, setSub → landingY) → tab arrival | Return-to-workout navigation | UI state |
| inline script ↔ CSP sha256 pin | A stale hash blanks the app everywhere | Executable code |
| branch → main → GitHub Pages → both devices | A merge reaches the PC and the phone within about 10 minutes | The whole app |
| new build → shared cloud copy | The first skipped session syncs the D-09 fields to older builds | Workout data |
| executor → network | Read-only GETs, ls-remote and the GitHub API, signed out | None |
| scratch probe → repo | Probe scripts and screenshots stay out of git | None |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-10-01 | Tampering→XSS | skip reason and name on the skipped card | medium | mitigate | esc() at index.html:2117 and skipTailHTML :2406. Test "T-10-01…" | closed |
| T-10-02 | Info disclosure / Integrity | `_preSkip`/`_cel` leaking into a session | medium | mitigate | finishWorkout strips draft-only fields (:2540-2544). Test "T-10-02…" | closed |
| T-10-03 | Elevation | skip/unskip calling save() | high | mitigate | saveLocal() only (:2369, :2396). DRAFT-05 suites | closed |
| T-10-04 | Tampering (type) | a marker that is not `true` or a reason that is not a string | low | mitigate | finishWorkout normalises (:2546-2549). Readers use `=== true`. Test "T-10-04…" | closed |
| T-10-05 | Tampering (action injection) | skip data-actions | low | mitigate | ACTIONS literal names (:5644-5645). DELEG-04, F2 | closed |
| T-10-06 | Integrity (progression) | a skip must block Add weight | high | mitigate | addWeightVerdict (:1318), deload clear (:2363-2366), lastAttemptEntry (:1310). Tests D-09, D-22/LOG-05, WR-02/D-22 | closed |
| T-10-07 | DoS | stale CSP hash (10-01) | high | mitigate | csp:check, CSP-01, CSP-TOOL | closed |
| T-10-08 | DoS (UI) | a very long reason | low | accept | Wraps, no cap (UI-SPEC). 300-character test | closed |
| T-10-10 | Tampering→XSS | the reason in Workout history and the Last time note | medium | mitigate | skipTailHTML :2406, skipNoteHTML :2417. Test "T-10-10…" | closed |
| T-10-11 | Tampering (type) | a stored `skipped` that is not `true` | low | mitigate | `=== true` at :2414, :2735, :2794. Tests T-10-11, T-10-11/D-25 | closed |
| T-10-12 | Integrity | the edit path re-creating `_preSkip` | low | mitigate | editSession builds explicit fields (:2794-2799). Test D-25 | closed |
| T-10-13 | Repudiation | the skip note hiding the last real numbers | low | mitigate | skipNote is appended after lastLine (:2155-2162). D-17 tracer test | closed |
| T-10-14 | DoS | stale CSP hash (10-02) | high | mitigate | as T-10-07 | closed |
| T-10-20 | Tampering→XSS | values in exhRowHTML | medium | mitigate | Every value esc()'d (:2431-2438). Test "T-10-20/LOG-01…" | closed |
| T-10-21 | Integrity (core) | history or link actions changing or pushing the draft | high | mitigate | No persistence in toggleExHist, openExerciseChart, backToWorkout or landingY. Tests D-06/D-21, D-06/LOG-01 | closed |
| T-10-22 | Integrity | a deleted session ghosting into the panel | medium | mitigate | exerciseRecent reads liveSessions() (:2924). Test D-04 | closed |
| T-10-23 | Tampering (action injection) | toggleExHist, openExChart, backToWorkout | low | mitigate | ACTIONS literal names (:5648-5650). DELEG-04, F2 | closed |
| T-10-24 | DoS (UI) | a stale openExHist or logReturn | low | mitigate | Reset at all five collapsedEx.clear() sites. D-21 tests | closed |
| T-10-25 | DoS (TDZ) | a new `let` read at boot | high | mitigate | `let openExHist` :2593 sits before the boot render :5697. The green suite boots the app | closed |
| T-10-26 | DoS | stale CSP hash (10-03) | high | mitigate | as T-10-07 | closed |
| T-10-27 | Repudiation | the panel hiding deloads or skips | low | mitigate | exhRowHTML :2426, :2436. Tests D-02/D-03 | closed |
| T-10-30 | DoS | a deploy with a stale CSP hash | high | mitigate | deploy.yml:67-68 checks before upload. Live `--check` passes | closed |
| T-10-31 | Tampering (logged data) | a bad build losing a workout | high | mitigate | SCHEMA 19 unchanged, no migration. DRAFT-05 suites. Revert recorded | closed |
| T-10-32 | Integrity | a revert leaking `_preSkip` | low | mitigate | operational: the rollback text says to Undo or finish a skipped exercise first (10-04-SUMMARY) | closed |
| T-10-33 | Repudiation | the phone judged on the old build | medium | mitigate | operational: UAT test 1 checked build 9a4e647 | closed |
| T-10-34 | Repudiation | a squash or rebase losing the revert target | medium | mitigate | operational: 9a4e647 has two parents | closed |
| T-10-35 | Elevation | an executor pushing to or reverting main | high | mitigate | Plan prohibitions. PR #15 was merged on the GitHub web | closed |
| T-10-36 | Tampering | unreviewed content, or main having moved | medium | mitigate | merge-tree equality and file-list check (10-04-SUMMARY). Re-verified | closed |
| T-10-40 | Tampering (XSS) | viewActive header and targets row | medium | mitigate | The diff only moves structure. Interpolations still use esc() and encodeURIComponent | closed |
| T-10-41 | DoS | CSP hash after the template edits | high | mitigate | csp:check, CSP suites, live `--check` | closed |
| T-10-42 | Tampering (draft) | skip and collapse controls | medium | mitigate | data-action names and save paths unchanged. DELEG-04, F2, DRAFT-05 | closed |
| T-10-43 | Repudiation | the probe using desktop fonts | low | mitigate | operational: UAT test 5 retested on Ian's Android on 5375e10 and passed | closed |
| T-10-44 | Info disclosure | scratch probe artifacts | low | mitigate | No probe or scratch file is tracked in git | closed |
| T-10-50 | DoS | a deploy with a stale CSP hash (G-10-5) | high | mitigate | deploy.yml check. Independent live `--check` passes | closed |
| T-10-51 | Repudiation | the phone judged on the old build | medium | mitigate | operational: live stamp 5375e10 equals main. UAT 5 retested on 5375e10 | closed |
| T-10-52 | Repudiation | a squash or rebase | medium | mitigate | operational: 5375e10 has two parents | closed |
| T-10-53 | Elevation | an executor pushing to or reverting main | high | mitigate | Plan prohibitions. PR #16 was merged on the GitHub web, with no revert | closed |
| T-10-54 | Tampering | main moved, or the PR carrying extra content | medium | mitigate | merge-tree equality and file list (10-06-SUMMARY). `git diff 4624870 5375e10` is empty | closed |
| T-10-55 | Integrity | a layout build breaking the workout | medium | mitigate | Render-only diff. SCHEMA 19. Suite 1250/0. Revert recorded | closed |
| T-10-SC | Tampering | npm/pip/cargo installs (all six plans) | low | accept | Nothing installed: no dependencies, no lockfile, package.json untouched | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-10-01 | T-10-08 | A very long skip reason has no length cap. It wraps inside the note span (UI-SPEC), and the 300-character test passes. | plan 10-01 (UI-SPEC) | 2026-11-11 |
| AR-10-02 | T-10-SC | No package installs. The app has zero dependencies, and package.json did not change in this phase. | plans 10-01..10-06 | 2026-11-11 |

*Accepted risks do not resurface in future audit runs.*

---

## Informational (outside the register, non-blocking)

- **10-REVIEW WR-02, index.html:2745:** the Workout history extras fallback label (`w.charAt(0).toUpperCase()+w.slice(1)`) renders a synced or imported `s.extras` key without esc(). It predates Phase 10 (8a20832:2574), and 10-05 only added `'lead'` to the line. The CSP blocks script execution, but HTML injection is still possible. It does not reopen T-10-10 or T-10-40. Fix with esc() and a hostile-key test (`/gsd-code-review 10 --fix`), or track it under VAL-02.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-11 | 45 (40 unique) | 45 | 0 | gsd-security-auditor (ASVS L1, block_on high) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-11
