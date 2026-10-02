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

Seeded from RESEARCH.md § Validation Architecture; the planner assigns final task IDs.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 6-01-01 | 01 | 1 | REPO-01, REPO-02 | — | N/A | verification command | `git diff-tree --no-commit-id --name-only -r $(git log --diff-filter=A --format=%H -- .gitattributes)` prints exactly `.gitattributes`; `git ls-files --eol \| grep -E 'i/(crlf\|mixed)'` prints nothing | n/a | ⬜ pending |
| 6-01-02 | 01 | 1 | REPO-01 | — | N/A | verification command | `test "$(git hash-object --no-filters index.html)" = "$(git rev-parse :index.html)"`; `git ls-files --eol \| grep -v w/lf` prints nothing; `git status --porcelain` still lists `?? .planning/research/.cache/` | n/a | ⬜ pending |
| 6-01-03 | 01 | 1 | REPO-01 | — | N/A | unit (in suite, CI-gated) | `TZ=America/Chicago npm test` → PASS for `git resolves index.html to eol=lf` and `indexed index.html holds no carriage return`; `0 failed` | ❌ added by this task | ⬜ pending |
| 6-01-03 | 01 | 1 | REPO-01 | — | N/A | red proof (scratch clone) | in a temp clone: remove `.gitattributes` → eol check FAILs; plant a CRLF blob via `git hash-object -w --no-filters` + `git update-index --cacheinfo` → CR check FAILs | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. The new suite check lands in the second commit, after `.gitattributes`, so it is green when added and REPO-02's isolated first commit stays intact.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Commit isolation survives onto `main` | REPO-02 | CI clones at depth 1, so history can't be checked in the suite; the merge strategy is a human choice | Merge the PR with a merge commit (never squash), then rerun the REPO-02 `diff-tree` command on `main` |
| Other checkouts get LF working trees | REPO-01 | Each checkout is local state the repo can't reach | In each checkout, after it has the commit and has no tracked changes: `git rm -r --cached -q . && git reset --hard`, then `git ls-files --eol \| grep -v w/lf` prints nothing |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
