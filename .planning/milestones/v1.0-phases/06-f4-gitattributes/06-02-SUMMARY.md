---
phase: 06-f4-gitattributes
plan: 02
subsystem: repo
tags: [git, gitattributes, line-endings, core.autocrlf, test, REPO-01, REPO-02]
status: complete
requires:
  - "06-01: .gitattributes (`* text=auto eol=lf`) committed alone as C1 17b5a66"
provides:
  - "a CI-gated suite block that asks git whether index.html resolves to eol=lf and whether its indexed blob holds a carriage return; it fails, never skips, when git or the repository is missing"
  - "CLAUDE.md § Conventions **Line endings** bullet (the property, and the guarded refresh for stale checkouts)"
  - "CONCERNS.md F4 marked RESOLVED with the corrected premise; PROJECT.md's .gitattributes decision row records C1"
affects:
  - "every future `npm test` run, local and CI (two more PASS lines)"
  - "the phase PR's merge strategy (merge commit only, checked after merge)"
tech-stack:
  added: []
  patterns:
    - "ask git for a repo property through execFileSync with a literal argv, cwd pinned to the repo root and a raised maxBuffer; a missing git is a FAIL"
    - "red proof by mutation in scratch clones outside the repo (git rm the attributes file, force a CRLF blob with hash-object --no-filters + update-index --cacheinfo, run from a git-archive extract with no repository)"
key-files:
  created: []
  modified:
    - test/app.test.js
    - CLAUDE.md
    - .planning/codebase/CONCERNS.md
    - .planning/PROJECT.md
decisions:
  - "The REPO-01 check asks git (check-attr eol + show :index.html) and never reads .gitattributes, so a rewording such as `* text=auto` + `*.html eol=lf` stays green"
  - "A missing git or missing repository is a FAIL naming git's stderr, never a skip; skipLine stays reserved for the local-only real backup"
  - "No suite check asserts working-tree line endings; a not-yet-refreshed checkout would go red for a cosmetic reason"
metrics:
  duration: "~12 min"
  completed: 2026-10-01
actuals:
  tokens: 3100
  tasks: 2
  commits: 3
---

# Phase 6 Plan 02: The suite holds REPO-01, and the docs state what shipped Summary

`npm test` now asks git, on every run and in CI, whether `index.html` resolves to `eol=lf` and
whether its stored blob holds a carriage return, failing (never skipping) when git cannot answer.
Each check was shown to go red for exactly its own regression in scratch clones, and CLAUDE.md,
CONCERNS.md and PROJECT.md now describe the shipped rule instead of the rejected `* -text` premise.

## Recorded values

| Name | Value |
|------|-------|
| C1 (06-01) | `17b5a663ebb47ae2290d989c45fee950c9dfee61`, `.gitattributes` alone |
| Commit 2 (Task 1) | `7cc79fe` `test(06-02): the suite asks git whether index.html is stored as LF (REPO-01, D-04)`, `test/app.test.js` only |
| Commit 3 (Task 2) | `7379d4d` `docs(06-02): line endings are pinned and checked; record the F4 outcome`, `.planning/PROJECT.md`, `.planning/codebase/CONCERNS.md`, `CLAUDE.md` |
| BASE2 (`TZ=America/Chicago npm test`, before Task 1) | `891 passed, 0 failed, 2 skipped` |
| After Task 1 | `893 passed, 0 failed, 2 skipped` (+2 passed, skipped unchanged) |
| After Task 2 (final) | `893 passed, 0 failed, 2 skipped` |
| C1 file list after both commits | `.gitattributes` (`git diff-tree --no-commit-id --name-only -r C1`) |
| `git log --format='%h %s' C1..HEAD` | `7379d4d docs(06-02)…`, `7cc79fe test(06-02)…`, `0201440 docs(06-01)…` |
| `git ls-files --eol \| grep -E 'i/(crlf\|mixed)'` | empty |

## Task 1: the suite asks git (D-04)

- `const { execFileSync } = require('child_process');` sits beside the `fs`/`path` requires (line 15,
  the only `child_process` line). `grep -cE "shell:\s*true"` gives 0, and no string literal names
  `.gitattributes`.
- The block opens at line 86, between the T-01-12 heading (78) and `── the file itself ──` (109). It
  has block-local `root`, a `git` wrapper (`cwd: root`, `maxBuffer: 64 MiB`, stdio piped), and one
  try/catch that sets `eol` from the third NUL field of `check-attr -z eol -- index.html` and `blob`
  from `show :index.html`. The extra is git's stderr, the eol value or the first CR offset, never the
  Buffer.
- On the branch:
  ```
  ── git stores index.html as LF, whatever core.autocrlf says (REPO-01) ──
    PASS  REPO-01: git resolves index.html to eol=lf
    PASS  REPO-01: the indexed index.html blob holds no carriage return
  893 passed, 0 failed, 2 skipped
  ```

### Red proof (scratchpad, outside the repo; this checkout was never mutated)

Clone `rp2-clone` = `git -c core.longpaths=true clone` of this checkout at `0201440`, with the edited
`test/app.test.js` copied over (the clone's `core.autocrlf` is `true`, from the system config).
Logs are left in the scratchpad as `rp2-*.log`. `grep -c '^  FAIL  '` gave 0, 0, 1, 1 and 2 for
the five scenarios below, in order.

| Scenario | Setup | FAIL lines | Summary line |
|----------|-------|-----------------------|--------------|
| Baseline | clone as is | none | `893 passed, 0 failed, 2 skipped` |
| Wording variant | `.gitattributes` = `* text=auto` + `*.html eol=lf` (check-attr still `lf`) | none | `893 passed, 0 failed, 2 skipped` |
| Mutation A | `git rm -q .gitattributes` (index and tree; check-attr `unspecified`) | `FAIL  REPO-01: git resolves index.html to eol=lf  → "unspecified"` | `892 passed, 1 failed, 2 skipped` |
| Mutation B | CRLF copy forced into the index (`hash-object -w --no-filters` → `6f4b565`, `update-index --cacheinfo`; 4945 CR bytes in `:index.html`) | `FAIL  REPO-01: the indexed index.html blob holds no carriage return  → 15` (the eol label PASSed) | `892 passed, 1 failed, 2 skipped` |
| Mutation C | `git archive HEAD \| tar -x` into `rp2-norepo` (`rev-parse --git-dir` exits 128) | `FAIL  REPO-01: git resolves index.html to eol=lf  → "fatal: not a git repository (or any of the parent directories): .git\n"` and `FAIL  REPO-01: the indexed index.html blob holds no carriage return  → "fatal: not a git repository (or any of the parent directories): .git\n"` | `891 passed, 2 failed, 2 skipped` |

Skipped stays at 2 in every scenario, equal to the clone baseline, so a missing repository is a
FAIL and never a skip. Each mutation was restored with `git checkout -q HEAD -- .gitattributes`
before the next one.

## Task 2: the docs state what shipped

- **CONCERNS.md F4:** heading `**F4: Line endings were unmanaged (RESOLVED 2026-10-01, Phase 6):**`.
  The Issue now says the index was already LF and the CRLF lived only in Windows working trees under
  the system `core.autocrlf=true`. The `* -text` prediction is gone. Files point at `.gitattributes`
  and `test/app.test.js`, and a `Resolved:` line replaces the "Left untouched on purpose" fix line,
  naming `* text=auto eol=lf`, C1 `17b5a66`, the never-existing reformat diff and the suite check.
- **PROJECT.md Key Decisions:** the `.gitattributes` row keeps its decision cell. The rationale no
  longer claims a 4,131-line diff, and `— Pending` became a `✓ Good` outcome naming Phase 6, C1
  `17b5a66`, `.gitattributes` alone, the empty diff and "merge commit, never a squash". The F4 line
  under Active is untouched.
- **CLAUDE.md:** one `- **Line endings:**` bullet after the `firestore.rules` bullet and before
  **Icons**, saying the property, that the suite asserts it (never the wording, and a missing git
  fails), and the stale-checkout trap with `git rm -r --cached -q . && git reset -q --hard` from a
  tree with no tracked changes, parking work in a commit, never the shared stash.
- All Task 2 acceptance greps gave the expected counts, and the suite stayed at
  `893 passed, 0 failed, 2 skipped`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Scratch clone needs long-path support on Windows**
- **Found during:** Task 1, step 5
- **Issue:** 06-01 hit `Filename too long` cloning into the session scratchpad.
- **Fix:** cloned with `git -c core.longpaths=true clone -c core.longpaths=true` from the start.
- **Files modified:** none (scratchpad only)

**2. [Convention] Both commits carry the session's `Co-Authored-By` trailer**
- Subjects are exactly the plan's; the trailer is a second `-m` paragraph and nothing else.

## Pending human checks (end of phase)

1. **REPO-02 on `main` (post-merge).** Merge the phase PR with "Create a merge commit", never
   "Squash and merge" or "Rebase and merge". Then, on an up-to-date `main`, run
   `git diff-tree --no-commit-id --name-only -r "$(git log --diff-filter=A --format=%H -- .gitattributes)"`
   and open the CI run for the merge. Expected: the command prints exactly `.gitattributes`, the CI
   test job is green, and its log shows both `PASS  REPO-01: …` lines. Only possible after the merge,
   because CI's depth-1 clone cannot see history.
2. **Refresh every other checkout.** For each checkout listed under Follow-ups in
   `06-01-SUMMARY.md`, once it contains C1, run that SUMMARY's `lf-refresh.sh` with the checkout as
   its argument. Expected: only `PASS` lines; `git ls-files --eol | grep -v 'w/lf'` prints nothing
   there; any previously uncommitted change (for example the main checkout's `.planning/config.json`)
   is still present, unstaged. Those checkouts belong to Ian's other sessions, so the executor did not
   touch them.

## Follow-ups

- After shipping, append a dated changelog entry to Ian's live vault note named in CLAUDE.md
  § After shipping (`C:\Main Vault\50-59 Projects & Events\56. Software Projects\PPL Tracker App.md`).
  Say there that git now pins line endings to LF on every machine, that `npm test` checks it, and
  that a checkout made before the change needs the one-time refresh (`lf-refresh.sh`).

## Threat Flags

None beyond the plan's register. The only new surface is the suite spawning `git`, which is T-6-05
(literal argv, no shell, fixed cwd) and is mitigated as planned.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: `test/app.test.js` holds the REPO-01 block and the `child_process` import
- FOUND: commits `7cc79fe` and `7379d4d` in `git log`; C1 `17b5a66` still lists only `.gitattributes`
- FOUND: CLAUDE.md `Line endings` bullet, CONCERNS.md `RESOLVED` F4 heading, PROJECT.md `17b5a66`
- Suite: `893 passed, 0 failed, 2 skipped`
