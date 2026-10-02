---
phase: 6
slug: f4-gitattributes
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-10-01
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Hand-rolled `ok()`/`skipLine()` runner in `test/app.test.js` + `test/harness.js` (no dependencies) |
| **Config file** | none (`package.json` `"test": "node test/app.test.js"`) |
| **Quick run command** | `TZ=America/Chicago npm test` |
| **Full suite command** | `TZ=America/Chicago npm test` (CI runs `node test/app.test.js` with `TZ: America/Chicago`) |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `TZ=America/Chicago npm test`
- **After every plan wave:** Run the suite plus the REPO-02 `diff-tree` command below
- **Before `/gsd-verify-work`:** Full suite must be green and every verification command below must hold
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

Seeded from RESEARCH.md § Validation Architecture. Final task IDs are assigned by 06-01-PLAN.md and
06-02-PLAN.md. Every command runs from the repo root (`git rev-parse --show-toplevel`).

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 6-01-01 | 01 | 1 | REPO-01, REPO-02 | T-6-01, T-6-03 | C1 holds `.gitattributes` alone; uncommitted tracked paths are excluded from renormalize; the `index.html` blob is unchanged | tracer verification command | `test "$(git check-attr -z eol -- index.html \| tr '\0' '\n' \| sed -n 3p)" = lf && test "$(git show :index.html \| tr -cd '\r' \| wc -c)" -eq 0 && test "$(git diff-tree --no-commit-id --name-only -r "$(git log --diff-filter=A --format=%H -- .gitattributes)")" = .gitattributes && echo TRACER-OK`; `git ls-files --eol \| grep -E 'i/(crlf\|mixed)'` prints nothing | n/a | ⬜ pending |
| 6-01-02 | 01 | 1 | REPO-01 | T-6-02 | The refresh parks every uncommitted tracked change before emptying the index, and loses no tracked, untracked or ignored file | verification command + scratch-clone rehearsal (full, interrupted, contended, second run) | `test -z "$(git ls-files --eol \| grep -v 'w/lf')" && test "$(git hash-object --no-filters index.html)" = "$(git rev-parse :index.html)" && git diff --cached --quiet && TZ=America/Chicago npm test`; `lf-refresh.sh` prints only `PASS` lines | n/a | ⬜ pending |
| 6-02-01 | 02 | 2 | REPO-01 | T-6-05, T-6-06, T-6-07 | `execFileSync` with a literal argv and no shell; a missing git or repository is a FAIL, never a skip; the check never reads the attributes file | unit (in suite, CI-gated) | `TZ=America/Chicago npm test` → `PASS  REPO-01: git resolves index.html to eol=lf` and `PASS  REPO-01: the indexed index.html blob holds no carriage return`, `0 failed` | ❌ added by this task | ⬜ pending |
| 6-02-01 | 02 | 2 | REPO-01 | T-6-06, T-6-07 | Each check goes red for its own regression | red proof (scratch clone + archive extract) | `git rm -q .gitattributes` → only the eol label FAILs (`"unspecified"`); a CRLF blob via `git hash-object -w --no-filters` + `git update-index --cacheinfo` → only the CR label FAILs; a `git archive` extract with no repository → both FAIL with `not a git repository`, skip count unchanged; wording variant `* text=auto` + `*.html eol=lf` → 0 FAIL | n/a | ⬜ pending |
| 6-02-02 | 02 | 2 | REPO-01, REPO-02 | T-6-08, T-6-09 | Docs no longer teach `* -text`; C1 is still isolated after the test and docs commits | doc greps + suite | `TZ=America/Chicago npm test`; the absence greps in 06-02 Task 2 print `0`; the REPO-02 `diff-tree` command still prints exactly `.gitattributes` | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. The new suite check lands in the second commit, after `.gitattributes`, so it is green when added and REPO-02's isolated first commit stays intact.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Commit isolation survives onto `main` (06-02 Task 2, human check 1, post-merge) | REPO-02 | CI clones at depth 1, so the suite can't check history, and the merge strategy is a human choice | Merge the PR with a merge commit (never squash or rebase), then rerun the REPO-02 `diff-tree` command on `main`. The CI log shows both `PASS  REPO-01: …` lines |
| Other checkouts get LF working trees (06-02 Task 2, human check 2) | REPO-01 | Each checkout is local state the repo can't reach, and some carry uncommitted work (the main checkout's `.planning/config.json`). The list includes the checkout the phase merges into, if the executor ran elsewhere | In each checkout listed under Follow-ups in 06-01-SUMMARY.md, once it contains C1, run that SUMMARY's `lf-refresh.sh` with the checkout as its argument. It parks and restores uncommitted tracked changes. Then `git ls-files --eol \| grep -v 'w/lf'` prints nothing |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
