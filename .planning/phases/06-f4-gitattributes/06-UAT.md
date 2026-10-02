---
status: complete
phase: 06-f4-gitattributes
source: [06-VERIFICATION.md]
started: 2026-10-01T00:00:00Z
updated: 2026-10-02T00:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. REPO-02 survives onto main — C1 is its own commit after a merge-commit merge
expected: After merging the phase PR with "Create a merge commit" (never squash or rebase), on an up-to-date main, `git diff-tree --no-commit-id --name-only -r "$(git log --diff-filter=A --format=%H -- .gitattributes)"` prints exactly `.gitattributes`, and the sha is 17b5a663ebb47ae2290d989c45fee950c9dfee61.
result: pass

### 2. CI runs the REPO-01 checks on Linux
expected: The CI run for the phase push or merge (Deploy to GitHub Pages, job `test`) is green, and its log contains `PASS  REPO-01: git resolves index.html to eol=lf` and `PASS  REPO-01: the indexed index.html blob holds no carriage return`.
result: pass

### 3. Other checkouts refreshed to LF
expected: After pulling main into the main checkout (C:/Users/idbac/Projects/ppl-tracker) and the other worktrees, running the guarded lf-refresh.sh from 06-01-SUMMARY.md § Follow-ups, then `git ls-files --eol | grep -v 'w/lf'`, prints nothing; uncommitted work (e.g. the main checkout's modified .planning/config.json) is restored unchanged.
result: pass
note: main checkout fast-forwarded to e35f560; all four checkouts report 0 non-LF text files; config.json edits preserved (already identical on main)

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
