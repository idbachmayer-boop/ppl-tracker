---
phase: 6
slug: f4-gitattributes
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-10-02
---

# Phase 6 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| working tree → index (C1) | Modified or staged paths could leak into the isolated commit | repo files (low) |
| refresh → local uncommitted state | `reset --hard` overwrites tracked files on disk | uncommitted work (high: unrecoverable if lost) |
| repo → GitHub Pages | Deploy uploads the repo root | `.gitattributes`, `index.html` blob (public) |
| test process → git binary | Suite spawns an external program every run | fixed argv, no user input |
| CI checkout → deploy gate | A green suite lets `main` deploy to the phone | line-ending property |
| phase PR → `main` history | Merge strategy decides whether C1 survives isolated | commit history |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-6-01 | Tampering / Repudiation | commit C1 | high | mitigate | `git diff-tree -r 17b5a66` lists exactly `.gitattributes` | closed |
| T-6-02 | Tampering (local data loss) | rm --cached + reset --hard | high | mitigate | Park-in-commit / unpark, no stash; 06-01-SUMMARY full run shows parked → unparked, untracked unchanged, index.html byte-identical | closed |
| T-6-03 | Tampering (served bytes) | `index.html` blob / `sw.js` cache | low | mitigate | `:index.html` after C1 = BASE_BLOB `fa90594…` (06-01-SUMMARY) | closed |
| T-6-04 | Information Disclosure | `.gitattributes` on Pages | low | accept | See accepted risks | closed |
| T-6-05 | Tampering / EoP | git spawn in `test/app.test.js` | low | mitigate | `execFileSync('git', [literal args], { cwd: root })` at test/app.test.js:97; no `shell: true` | closed |
| T-6-06 | Tampering (gate weakened) | REPO-01 when git/repo absent | high | mitigate | Errors caught into `err` and asserted via `ok(...)` — FAIL, never skip (test/app.test.js:98-106) | closed |
| T-6-07 | Tampering (check disabled) | check pinned to wording | low | mitigate | Check asks `git check-attr` / `git show`; never reads `.gitattributes` | closed |
| T-6-08 | Repudiation (hidden change on main) | phase PR merge strategy | high | mitigate | 06-UAT.md test 1 requires "Create a merge commit" and re-checks C1 = `.gitattributes` on main; PROJECT.md says never squash. Gate in place; outcome confirmed at merge time | closed |
| T-6-09 | Repudiation (docs drift) | CONCERNS/PROJECT/CLAUDE.md | low | mitigate | No stale `* -text` teaching remains (PROJECT.md mention is historical: "D-01 chose `* text=auto eol=lf`") | closed |
| T-6-SC | Tampering | package installs | low | accept | See accepted risks | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-6-01 | T-6-04 | One line-ending rule in a public repo reveals nothing (RESEARCH A2) | plan 06-01 | 2026-10-01 |
| AR-6-02 | T-6-SC | Nothing installed; `child_process` is Node stdlib | plans 06-01, 06-02 | 2026-10-01 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-10-02 | 10 | 10 | 0 | gsd-secure-phase (L1, orchestrator grep; auditor skipped per short-circuit) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-10-02
