---
phase: 06-f4-gitattributes
verified: 2026-10-01T00:00:00Z
status: human_needed
score: 12/12 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Merge the phase PR with 'Create a merge commit' (never squash or rebase). On an up-to-date main, run: git diff-tree --no-commit-id --name-only -r \"$(git log --diff-filter=A --format=%H -- .gitattributes)\""
    expected: "Prints exactly `.gitattributes`, and the sha is 17b5a663ebb47ae2290d989c45fee950c9dfee61, reachable from main as its own commit."
    why_human: "REPO-02 survival onto main depends on the merge strategy chosen in the GitHub UI after verification. A squash merge would fold C1 into a commit with ~750 lines of other changes."
  - test: "Open the CI run for the phase push or merge (Deploy to GitHub Pages, job `test`) and read the log."
    expected: "Job green; the log contains `PASS  REPO-01: git resolves index.html to eol=lf` and `PASS  REPO-01: the indexed index.html blob holds no carriage return`."
    why_human: "The phase commits are not pushed yet (origin/claude/gifted-goodall-706ad7 is at a0cb437, a Phase 5 commit), so no CI run has executed the new checks on ubuntu-latest."
  - test: "After pulling main into the main checkout (C:/Users/idbac/Projects/ppl-tracker) and the other worktrees, run the guarded lf-refresh.sh from 06-01-SUMMARY.md § Follow-ups, then `git ls-files --eol | grep -v 'w/lf'`."
    expected: "Nothing printed; uncommitted work (e.g. the main checkout's modified .planning/config.json) is restored unchanged."
    why_human: "A checkout made before C1 keeps CRLF copies on disk while git status reports clean. The refresh runs a destructive pair (rm --cached, reset --hard) in checkouts the executor was forbidden to touch."
---

# Phase 6: F4 — .gitattributes Verification Report

**Phase Goal:** Git stores `index.html`'s bytes exactly as written instead of letting `core.autocrlf` silently rewrite line endings, so a future line-ending flip can never disguise a real change inside a multi-thousand-line reformat diff.
**Verified:** 2026-10-01
**Status:** human_needed (all pre-merge checks pass; three post-merge or other-checkout items remain)
**Re-verification:** No. This is the initial verification.

## Interpretation: D-01 versus the literal REPO-01 wording

REQUIREMENTS.md and ROADMAP SC1 say "store `index.html` bytes exactly". Read literally, that means `-text`: no conversion at all. What shipped is `* text=auto eol=lf`, which normalizes CRLF to LF on add. That is a deterministic rewrite, but it no longer depends on `core.autocrlf`.

This was a recorded decision, not executor drift:
- `06-DISCUSSION-LOG.md` shows the Scope question offered three options: "all-text LF", "index.html only", and "index.html -text". The last of these is the literal reading. The chosen option was "All text, `* text=auto eol=lf`".
- `06-CONTEXT.md` D-01 records the choice and says it satisfies REPO-01.
- `PROJECT.md` line 107 records that the approach was "First argued for `* -text`; D-01 chose `* text=auto eol=lf`".

I judged the goal against D-01 and against the goal's stated purpose. The purpose is that a line-ending flip can never disguise a real change. The behavioral test below shows D-01 achieves that purpose more strongly than `-text` would. Under `-text`, a CRLF flip would be stored byte for byte and would itself produce the whole-file diff the goal is trying to prevent. Under D-01 the flip is absorbed and only the real change shows. The "ending `core.autocrlf` rewriting" half holds literally: the specified `eol` attribute overrides `core.autocrlf`.

The wording in REQUIREMENTS.md and ROADMAP.md still says "bytes exactly" and was never updated to match D-01. This is a documentation warning, not a gap.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1 / REPO-01: a `.gitattributes` file exists and makes git store `index.html` independent of `core.autocrlf` (under D-01) | VERIFIED | `.gitattributes` = comment + `* text=auto eol=lf`, no CR (`cat -A`). `git check-attr -z eol text -- index.html` → `eol=lf`, `text=auto`. `git ls-files --eol index.html` → `i/lf w/lf attr/text=auto eol=lf`. The system gitconfig still has `core.autocrlf=true`, and it no longer wins. |
| 2 | Goal purpose: a line-ending flip cannot disguise a real change | VERIFIED (behavioral) | In a scratch clone with `core.autocrlf=true`, I rewrote `index.html` with CRLF (4946 CR bytes) and appended one real line, then ran `git add`. The staged blob held 0 CR and `git diff --cached --stat` showed `index.html \| 1 +`. With `core.autocrlf=false`, a pure CRLF flip staged no change at all. A deleted file checked out under `autocrlf=true` came back with 0 CR on disk. |
| 3 | SC2 / REPO-02: the commit that adds `.gitattributes` contains nothing else | VERIFIED (pre-merge) | `git log --diff-filter=A -- .gitattributes` → `17b5a663…`. `git diff-tree --name-only -r` and `git show --stat` both list only `.gitattributes` (1 file, +2). Its parent is `ce58223`, the phase base. No other commit touches `.gitattributes`. Survival on `main` is a human item. |
| 4 | REPO-02 under D-01: the "resulting whole-file diff" is empty because every blob was already LF | VERIFIED | `git ls-files --eol \| grep -v i/lf` prints nothing. `git rev-parse :index.html` = `ce58223:index.html` = `HEAD:index.html` = `fa90594…`. |
| 5 | The `index.html` blob is unchanged, so `sw.js` needs no CACHE_VERSION bump | VERIFIED | Same blob sha as above. `git diff ce58223 HEAD -- index.html sw.js` is empty. |
| 6 | D-03: in this checkout, the bytes on disk are the bytes git stores | VERIFIED | `git ls-files --eol \| grep -v w/lf` prints nothing. `git hash-object --no-filters index.html` = `git rev-parse :index.html`. |
| 7 | The refresh lost nothing and left no residue (prohibitions: no stash, no WIP commit, no amend of C1) | VERIFIED | `git stash list` is empty. `git log --all --format=%s \| grep -c "park uncommitted"` → 0. C1's sha matches the one recorded and C1 is an ancestor of HEAD. `git status --porcelain` shows only `?? .planning/research/.cache/`. |
| 8 | `npm test` asks git about the property on every run, and both REPO-01 checks pass | VERIFIED | `TZ=America/Chicago npm test` (one full run) exited 0: `893 passed, 0 failed, 2 skipped`. Lines 11 and 12 are the two `PASS  REPO-01: …` lines. CI's `test` job runs `node test/app.test.js` on every push and PR after `actions/checkout@v4`. |
| 9 | Each check goes red for its own regression, and a missing git is a FAIL, never a skip | VERIFIED | I reproduced mutation A: after `git rm -q .gitattributes` in a scratch clone, `check-attr` → `unspecified`, which fails `eol === 'lf'`. For mutations B and C, the code shows `blob.indexOf(0x0d) === -1` and a `catch` that sets `err`, leaving `eol` and `blob` null so both `ok()` calls fail. No `skipLine` call is used. The SUMMARY's red-proof table agrees, and 06-REVIEW independently reproduced the no-git FAIL. |
| 10 | The check asserts the property, never the wording | VERIFIED | `test/app.test.js` never reads `.gitattributes` (the only hits are in a comment). It queries `check-attr` and `show :index.html`. |
| 11 | The check is in its own commit after C1, and calls git through execFileSync with literal argv, cwd at the root and a raised maxBuffer | VERIFIED | `7cc79fe` touches only `test/app.test.js` (+24). Line 97: `execFileSync('git', args, { cwd: root, maxBuffer: 64*1024*1024 })` with array args and no shell. |
| 12 | The docs state what shipped (CONCERNS F4 resolved, PROJECT decision row, CLAUDE.md Line endings bullet) | VERIFIED (with warning) | `7379d4d` updates all three. CONCERNS gives the real cause (Windows `core.autocrlf` working trees, an LF index) and the real fix. However, "every text file as LF" overclaims; see WR-02 under Anti-Patterns. |

**Score:** 12/12 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `.gitattributes` | One rule `* text=auto eol=lf`, optional comment, no CR | VERIFIED | 2 lines, LF only, and git resolves it for `index.html` |
| C1 `17b5a66` | Adds `.gitattributes` and nothing else | VERIFIED | 1 file, parent `ce58223` |
| `test/app.test.js` REPO-01 block (lines 86-107) | Two property checks that fail rather than skip | VERIFIED | Runs and passes. Wired into CI through `node test/app.test.js` |
| `CLAUDE.md` Line endings bullet | States the property and the guarded refresh | VERIFIED | Lines 77-83 |
| `lf-refresh.sh` | Lives in 06-01-SUMMARY § Follow-ups, never in the repo | VERIFIED | Present in the SUMMARY. Not tracked |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `.gitattributes` | index blob | attribute resolution → clean filter on add | WIRED | `check-attr` → `lf`. In the scratch clone, a CRLF add was normalized to 0 CR |
| `.gitattributes` | working tree | smudge on checkout overrides `core.autocrlf` | WIRED | A checkout under `autocrlf=true` came out with 0 CR |
| `test/app.test.js` | git | `execFileSync('git', …)` | WIRED | The PASS lines appear in suite output |
| Suite | CI gate | `.github/workflows/deploy.yml` job `test`; `deploy` needs `test` | WIRED | Runs on every push and pull_request |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| A CRLF flip plus one real line under autocrlf=true shows only the real line | scratch clone: CRLF-rewrite `index.html`, append a line, `git add`, `git diff --cached --stat` | `index.html \| 1 +`, 0 CR in the staged blob | PASS |
| A pure CRLF flip under autocrlf=false stages nothing | same, with `core.autocrlf=false` | empty `--cached` diff, 0 CR | PASS |
| A checkout under autocrlf=true writes LF | `rm index.html; git checkout -- index.html` | 0 CR on disk | PASS |
| Removing the attribute flips the answer | `git rm -q .gitattributes; git check-attr eol index.html` | `unspecified` | PASS (the check would go red) |
| Suite | `TZ=America/Chicago npm test` (run once) | `893 passed, 0 failed, 2 skipped`, both REPO-01 PASS | PASS |

### Probe Execution

None. The phase declares no `scripts/*/tests/probe-*.sh`, and none exist.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| REPO-01 | 06-01, 06-02 | `.gitattributes` makes git store `index.html` bytes exactly, ending `core.autocrlf` rewriting | SATISFIED (under D-01) | Truths 1, 2, 6, 8 |
| REPO-02 | 06-01, 06-02 | `.gitattributes` and the resulting whole-file diff land in a commit containing nothing else | SATISFIED pre-merge; survival on `main` is a human item | Truths 3, 4 |

No requirement is orphaned. REQUIREMENTS.md maps only REPO-01 and REPO-02 to Phase 6, and both plans claim both IDs. Minor inconsistency: the checkboxes are ticked, but the traceability table (line 145) still reads `REPO-01 … REPO-02 | Phase 6 | Pending`.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `.gitattributes`, `CLAUDE.md` | 1 / 77 | "every text file as LF" overclaims (06-REVIEW WR-02). `text=auto` leaves a path alone if its blob already reached the index with CRLF, for example via a web-UI edit. Only `index.html` is guarded by the suite | WARNING | It does not defeat the goal: `index.html`'s blob is LF and CI fails on any CR in it. The docs promise more than is enforced |
| `test/app.test.js` | 100 | Checks `eol` only. A later `index.html -text` override would still resolve `eol=lf` (06-REVIEW WR-01). The blob check catches it only after a CRLF commit | WARNING | A backstop exists; it just triggers late |
| `test/app.test.js` | 88-106 | Never checks the working-tree bytes, so a stale checkout passes green (06-REVIEW WR-03) | INFO | By design per 06-02 decision ("a not-yet-refreshed checkout would go red for a cosmetic reason"). CI always gets a fresh LF checkout |
| `REQUIREMENTS.md`, `ROADMAP.md` | 83 / 210, 215 | Still says "bytes exactly" while D-01 normalizes | INFO | Wording drift from a recorded decision. Consider rewording REPO-01 to "stores `index.html` as LF regardless of `core.autocrlf`" |

Debt-marker scan (TBD/FIXME/XXX/TODO/HACK on added lines of `.gitattributes`, `test/app.test.js`, `CLAUDE.md`): none.

### Human Verification Required

### 1. C1 survives onto main as its own commit

**Test:** Merge the phase PR with "Create a merge commit". On an up-to-date `main`, run `git diff-tree --no-commit-id --name-only -r "$(git log --diff-filter=A --format=%H -- .gitattributes)"`.
**Expected:** It prints exactly `.gitattributes`, and the sha is `17b5a66…`.
**Why human:** This depends on the merge strategy picked after verification. A squash would bundle C1 with the rest of the phase.

### 2. CI runs the REPO-01 checks green

**Test:** Open the Actions run for the phase branch push or the merge, job `test`.
**Expected:** The job is green, and the log contains both `PASS  REPO-01: …` lines.
**Why human:** The phase commits have not been pushed. The remote branch is still at Phase 5's `a0cb437`.

### 3. Refresh the other checkouts after they pull C1

**Test:** In the main checkout and the other worktrees, run `lf-refresh.sh` from 06-01-SUMMARY § Follow-ups, then `git ls-files --eol | grep -v 'w/lf'`.
**Expected:** Nothing is printed, and uncommitted work is restored unchanged.
**Why human:** These checkouts are outside the executor's permitted scope. Stale checkouts stay CRLF on disk while `git status` reports clean.

### Gaps Summary

No gaps. In this branch, git now stores `index.html` as LF whatever `core.autocrlf` says, and that was shown behaviorally: a CRLF flip combined with a one-line edit stages as a one-line diff. C1 holds only `.gitattributes`. The suite and CI assert the property on every run, and a missing git produces a FAIL. Three items remain: merging with a merge commit so REPO-02 survives on `main`, confirming the CI log, and refreshing the other checkouts. The three warnings are about docs and test coverage beyond `index.html`. None of them defeats the phase goal.

---

_Verified: 2026-10-01_
_Verifier: Claude (gsd-verifier)_
