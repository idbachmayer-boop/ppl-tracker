# Phase 6: F4 — .gitattributes — Context

**Gathered:** 2026-10-01
**Status:** Ready for planning

<domain>
Git stores and checks out `index.html` (and every other text file) as LF regardless of a machine's `core.autocrlf`. Requirements: REPO-01, REPO-02.
</domain>

<observed_state>
- `git ls-files --eol` (2026-10-01): all 124 tracked files are `i/lf`. 96 show `w/crlf` purely because this machine has `core.autocrlf=true`.
- So the index needs no rewrite: renormalization is expected to produce an **empty content diff**. The "whole-file diff" REPO-02 guards against most likely never materialises. If `git add --renormalize .` does stage anything, that output belongs in the same isolated commit.
</observed_state>

<decisions>
- **D-01 Scope:** a single rule, `* text=auto eol=lf`, covering all text files and not just index.html. It satisfies REPO-01 and also pins sw.js, the tests and the docs.
- **D-02 Commit isolation (REPO-02):** commit 1 contains `.gitattributes` plus whatever `git add --renormalize .` stages, and nothing else. Verify it with `git show --stat`.
- **D-03 Local checkout:** after the commit, refresh the working tree so the files on disk are LF (e.g. `git rm --cached -r . && git reset --hard`, or delete and re-checkout). This is a local step only and adds no commit. Do it in this worktree; the main checkout at `C:\Users\idbac\Projects\ppl-tracker` needs the same refresh after it pulls.
- **D-04 Test:** add a property check to `npm test` **in a separate, later commit** so REPO-02 holds. It asserts that `git check-attr eol index.html` resolves to `lf` and that the indexed blob of index.html (`git show :index.html`) contains no `\r`. It checks the property, never the exact wording of .gitattributes. CI must have git available, which actions/checkout provides.
</decisions>

<canonical_refs>
- .planning/ROADMAP.md (Phase 6)
- .planning/REQUIREMENTS.md (REPO-01, REPO-02)
- CLAUDE.md (run `npm test` before pushing; tests assert the property, not the wording)
- .github/workflows/ (CI that runs the suite)
</canonical_refs>

<deferred>
None.
</deferred>
