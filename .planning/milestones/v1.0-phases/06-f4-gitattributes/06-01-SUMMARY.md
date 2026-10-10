---
phase: 06-f4-gitattributes
plan: 01
subsystem: repo
tags: [git, gitattributes, line-endings, core.autocrlf, REPO-01, REPO-02]
status: complete
requires: []
provides:
  - ".gitattributes with the single rule `* text=auto eol=lf`, committed alone in C1 17b5a663ebb47ae2290d989c45fee950c9dfee61"
  - "lf-refresh.sh: a guarded, lossless park/refresh/unpark procedure for every other checkout (below, under Follow-ups)"
  - "this checkout (gifted-goodall-706ad7) is LF on disk"
affects:
  - "06-02 (red proof relies on git check-attr answering lf for index.html; adds the REPO-01 suite checks)"
  - "every other checkout of the repo, which needs lf-refresh.sh once it contains C1"
tech-stack:
  added: []
  patterns:
    - "renormalize with one `:(exclude)<path>` pathspec per uncommitted tracked path, so a concurrent writer's file cannot ride into an isolated commit"
    - "park uncommitted tracked changes in a throwaway commit object (never `git stash`) before a destructive index rebuild, print the recovery block first, unpark with reset --soft + reset --"
key-files:
  created:
    - .gitattributes
  modified: []
decisions:
  - "C1 holds only .gitattributes. REPO-02's predicted whole-file diff never appeared, because every indexed blob was already LF (i/lf); git rev-parse :index.html is unchanged, so sw.js needs no CACHE_VERSION bump."
  - "The tracer gate took the autonomous branch: workflow.human_verify_mode is end-of-phase and the tracer verify is fully automated. The re-run printed TRACER-OK."
  - "lf-refresh.sh's recovery block is an if/else that also checks the WIP commit's parent equals PRE_HEAD, so pasting it anywhere is safe and it does nothing unless HEAD really is this run's WIP commit."
metrics:
  duration: "~15 min"
  completed: 2026-10-01
actuals:
  tokens: 5600
  tasks: 2
  commits: 2
---

# Phase 6 Plan 01: .gitattributes lands alone, and this checkout is LF on disk Summary

`* text=auto eol=lf` is now versioned in `.gitattributes`, committed alone as C1. Git answers
`eol=lf` for `index.html` whatever `core.autocrlf` says, the stored blob is unchanged and holds no
carriage return, and this checkout was refreshed to LF on disk without losing anything.

## Recorded values

| Name | Value |
|------|-------|
| BASE | `ce5822325bf807a8164f0abc946f178ee06776c2` |
| BASE_BLOB (`:index.html`) | `fa9059434b9657fb1db489ebf7dd0613b751b236` |
| **C1** | **`17b5a663ebb47ae2290d989c45fee950c9dfee61`**, `chore(06-01): add .gitattributes so git stores every text file as LF (REPO-01, REPO-02)` |
| `C1~1` | `ce5822325bf807a8164f0abc946f178ee06776c2` (= BASE) |
| `:index.html` after C1 | `fa9059434b9657fb1db489ebf7dd0613b751b236` (= BASE_BLOB) |
| Baseline suite (`TZ=America/Chicago npm test`) | `891 passed, 0 failed, 2 skipped` |
| Suite after C1 | `891 passed, 0 failed, 2 skipped` |
| Suite on the refreshed LF tree | `891 passed, 0 failed, 2 skipped` |
| `core.autocrlf` | `true`, from `C:/Program Files/Git/etc/gitconfig` |
| DIRTY (Task 1 step 2, and both real refresh runs) | `.planning/STATE.md` (the orchestrator's `state.begin-phase` edit) |
| EXCL | `:(exclude).planning/STATE.md` |
| Staged list at step 5 (pre-commit) | `.gitattributes` and nothing else |
| `git ls-files --eol \| grep -E 'i/(crlf\|mixed)'` (baseline) | empty, so nothing besides `.gitattributes` was allowed into C1 |
| Refreshed checkout | `C:/Users/idbac/Projects/ppl-tracker/.claude/worktrees/gifted-goodall-706ad7` |

## Task 1: .gitattributes lands alone (tracer)

- Before: `git check-attr -z eol -- index.html` gave `index.html`, `eol`, `unspecified`.
  `git ls-files --eol index.html` gave `i/lf w/crlf attr/`.
- `.gitattributes` holds one comment line and one rule, `* text=auto eol=lf`, with 0 CR bytes.
- `git add .gitattributes`, then `git add --renormalize -- . ':(exclude).planning/STATE.md'`. Staged:
  `.gitattributes` only.
- Post-commit: `git diff-tree --no-commit-id --name-only -r C1` gives `.gitattributes`.
  `git show --stat --format= C1` gives `.gitattributes | 2 ++` and `1 file changed, 2 insertions(+)`.
- **Tracer gate:** the `<verify>` printed `TRACER-OK` with exit 0. `git ls-files --eol index.html`
  gives `i/lf w/crlf attr/text=auto eol=lf` (still `w/crlf` before Task 2, as RESEARCH Pitfall 1
  predicts).
- Idempotency: a second `git add --renormalize -- . "${EXCL[@]}"` staged nothing.
- `git status --porcelain` afterwards: ` M .planning/STATE.md`, `?? .planning/research/.cache/`.
- **REPO-02 note:** the "resulting whole-file diff" REPO-02 predicted did not appear. Every indexed
  blob was already `i/lf` (D-01), so renormalize had nothing to rewrite and C1's file list is exactly
  `.gitattributes`.

## Task 2: refresh this checkout to LF without losing anything (D-03)

### Rehearsal, in a stale scratch clone R

R was `git clone --no-checkout` of this checkout, then `checkout --detach C1~1`, then
`checkout --detach C1`. Before the full run, `git -C R ls-files --eol index.html` gave
`i/lf w/crlf attr/text=auto eol=lf`, and 131 of 132 files were `w/crlf`.

**Full run.** STATE.md had a line appended, plus an untracked `.planning/research/.cache/probe.txt`
and an ignored `test/local/probe.json`. Exit 0:

```
parked 1 path(s) in 6ecb013
unparked
PASS  HEAD equals PRE_HEAD (17b5a663ebb47ae2290d989c45fee950c9dfee61)
PASS  uncommitted tracked paths unchanged (1)
PASS  content kept: .planning/STATE.md (ede2e9f422d11085024061c488b918c8b2a4ed9c)
PASS  untracked files unchanged
PASS  ignored files unchanged
PASS  nothing staged
PASS  every tracked file is LF on disk
PASS  index.html on disk is byte-identical to the stored blob
```

Afterwards: ` M .planning/STATE.md`, `?? .planning/research/.cache/`, `!! test/local/`.

**Interrupted run** (`LF_REFRESH_STOP_AFTER_RM=1`). STATE.md had a second line appended, giving
hash-before `039af208af01341625d71874c91cecc25a762bef`. Exit 3. Status listed 132 tracked paths as
`D `, and HEAD was the WIP commit. The script printed this block before parking. The clone path is
shortened to `<R>` here; it was run verbatim, extracted from the log by `sed`:

```
=== lf-refresh recovery: if this run dies before 'unparked', run this block ===
# PRE_HEAD=17b5a663ebb47ae2290d989c45fee950c9dfee61
# DIRTY: .planning/STATE.md
if [ "$(git -C <R> log -1 --format=%s)" = chore\(06-01\):\ park\ uncommitted\ tracked\ changes\ for\ the\ LF\ refresh\ \(undone\ below\) ] && [ "$(git -C <R> rev-parse HEAD~1)" = 17b5a663ebb47ae2290d989c45fee950c9dfee61 ]; then
  git -C <R> reset -q --hard
  git -C <R> reset -q --soft HEAD~1
  git -C <R> reset -q -- .planning/STATE.md
else
  echo 'HEAD is not the lf-refresh WIP commit: nothing was done' >&2
fi
=== end recovery ===
```

Post-recovery checks: recovery exit 0. `HEAD=17b5a663…` (= printed PRE_HEAD). hash-after
`039af208af01341625d71874c91cecc25a762bef` (unchanged). Status ` M .planning/STATE.md`, with the
untracked and ignored files intact. `log -1 %s` is C1's subject, not the WIP subject. 0 files are not
`w/lf`.

**Contended run.** With an empty `R/.git/index.lock` in place, `git -C R rm -r -q --cached .` exited
128 (`Unable to create '.../index.lock': File exists.`). `git -C R ls-files` was byte-identical before
and after (132 paths). R was abandoned there.

### Real run on this checkout

Before: 96 tracked files were not `w/lf`. Status: ` M .planning/STATE.md`,
`?? .planning/research/.cache/`, `!! .gsd/`. `bash lf-refresh.sh "$ROOT"` exited 0:

```
parked 1 path(s) in 4f1f0e6
unparked
PASS  HEAD equals PRE_HEAD (17b5a663ebb47ae2290d989c45fee950c9dfee61)
PASS  uncommitted tracked paths unchanged (1)
PASS  content kept: .planning/STATE.md (cbc260e5c663bd97690fd0e6dff94411e0ff64bc)
PASS  untracked files unchanged
PASS  ignored files unchanged
PASS  nothing staged
PASS  every tracked file is LF on disk
PASS  index.html on disk is byte-identical to the stored blob
```

Afterwards the status was identical to before. HEAD stayed C1, and
`git log --all --format=%s | grep -c "park uncommitted tracked changes"` gave `0`.

### Idempotency (second real run)

Exit 0 with the same eight `PASS` lines. Captures of `git ls-files --eol` and `git rev-parse HEAD`
taken before and after were byte-identical (`cmp`). The `git stash list` output was the same before
Task 1 and after Task 2 (empty both times).

### Task 2 verify

`test -z "$(git ls-files --eol | grep -v 'w/lf')"`, the `hash-object --no-filters` check, and
`git diff --cached --quiet` all held, and `TZ=America/Chicago npm test` gave
`891 passed, 0 failed, 2 skipped`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The rehearsal clone failed on a path that was too long**
- **Found during:** Task 2, step B
- **Issue:** `git clone` into the session scratchpad died with
  `failed to unlink '…/commit-graphs/graph-….graph': Filename too long`, because the scratchpad path
  plus git's internal paths exceeds Windows' 260-character limit.
- **Fix:** cloned again into a sibling directory (`R2`) with `git -c core.longpaths=true clone -c core.longpaths=true`.
  The failed partial clone `rehearsal-R` is left in place (probe 8: never `rm` a variable path). Real
  checkouts have short paths and are not affected.
- **Files modified:** none (scratchpad only)

**2. [Rule 2 - Safety] The recovery block refuses unless HEAD is this run's WIP commit**
- **Found during:** Task 2, step A
- **Issue:** the plan's recovery steps were a sequence "confirm the subject, do nothing if it
  differs". Pasted into an interactive shell, a bare `exit` would close it, and a check on the subject
  alone would also match a WIP commit left by an earlier run.
- **Fix:** the block is one `if … then … else … fi`. It also requires `HEAD~1` to equal the printed
  PRE_HEAD, and otherwise prints that nothing was done. The commands inside are the plan's, unchanged.
- **Files modified:** none (scratchpad script)

**3. [Convention] C1's message carries the session's `Co-Authored-By` trailer**
- The subject line is exactly the plan's. Adding the trailer meant a second `-m` paragraph and
  nothing else.

## Threat Flags

None. `.gitattributes` adds no endpoint, auth path or data surface (T-6-04 accepted).

## Follow-ups

1. **Merge the phase PR with a merge commit, never squash or rebase.** That keeps C1 its own commit
   on `main`. REPO-02 is ticked now, and whether it survives onto `main` is checked after the merge.
2. **Every other checkout needs `lf-refresh.sh` once it contains C1** (a merge or pull leaves its
   unchanged files CRLF on disk, RESEARCH Pitfall 1). This executor touched none of them. From
   `git worktree list` on 2026-10-01:
   - `C:/Users/idbac/Projects/ppl-tracker` (main checkout, branch `planning/milestone-collections`;
     it carries a modified `.planning/config.json`, which the script parks and restores)
   - `C:/Users/idbac/Projects/ppl-tracker/.claude/worktrees/elastic-nash-8dfd46` (`claude/elastic-nash-8dfd46`)
   - `C:/Users/idbac/Projects/ppl-tracker/.claude/worktrees/gsd-execute-phase-1-ff7d18` (`claude/gsd-execute-phase-1-ff7d18`)

   This checkout (`gifted-goodall-706ad7`) is already refreshed. A fresh clone at or after C1 is LF
   on disk and needs nothing. Run the script with nothing staged: it refuses otherwise. On an
   interruption, run the recovery block it printed.
3. `lf-refresh.sh`, verbatim:

```bash
#!/usr/bin/env bash
# lf-refresh.sh: make one checkout's files on disk equal the bytes git stores, after
# `.gitattributes` (`* text=auto eol=lf`, phase 06 C1) has arrived in it. Files that were
# stat-clean when the attribute arrived stay CRLF on disk while `git status` says clean; only
# `git rm -r --cached .` + `git reset --hard` rewrites them. This script parks every uncommitted
# tracked change in a temporary commit first, so that destructive pair can lose nothing, then
# unparks it and checks the result. It never uses `git stash` (shared across worktrees).
#
# Usage: bash lf-refresh.sh <checkout>
# Rehearsal only, never on a real checkout: LF_REFRESH_STOP_AFTER_RM=1 exits 3 right after
# `git rm -r --cached .`, to simulate an interrupted run.
set -euo pipefail

[ $# -eq 1 ] || { echo "usage: bash lf-refresh.sh <checkout>" >&2; exit 2; }
D=$(git -C "$1" rev-parse --show-toplevel)
WIP_SUBJECT='chore(06-01): park uncommitted tracked changes for the LF refresh (undone below)'
g() { git -C "$D" "$@"; }

# 1. Refuse if anything is staged: the park commit must hold exactly the unstaged changes.
if ! g diff --cached --quiet; then
  echo "REFUSE: something is staged in $D. Commit or unstage it, then re-run." >&2
  exit 1
fi

# 2. Record the state that must survive.
PRE_HEAD=$(g rev-parse HEAD)
mapfile -d '' -t DIRTY < <(g diff --name-only -z)
declare -A HASH=()
for p in "${DIRTY[@]}"; do
  if [ -e "$D/$p" ]; then HASH["$p"]=$(g hash-object -- "$p"); else HASH["$p"]=DELETED; fi
done
UNTRACKED=$(g ls-files --others --exclude-standard)
IGNORED=$(g ls-files --others --ignored --exclude-standard)

# 3. Print the recovery block before touching anything, then park.
QD=$(printf '%q' "$D")
echo "=== lf-refresh recovery: if this run dies before 'unparked', run this block ==="
echo "# PRE_HEAD=$PRE_HEAD"
if [ ${#DIRTY[@]} -gt 0 ]; then
  printf '# DIRTY:'; printf ' %q' "${DIRTY[@]}"; echo
  echo "if [ \"\$(git -C $QD log -1 --format=%s)\" = $(printf '%q' "$WIP_SUBJECT") ] && [ \"\$(git -C $QD rev-parse HEAD~1)\" = $PRE_HEAD ]; then"
  echo "  git -C $QD reset -q --hard"
  echo "  git -C $QD reset -q --soft HEAD~1"
  printf '  git -C %s reset -q --' "$QD"; printf ' %q' "${DIRTY[@]}"; echo
  echo "else"
  echo "  echo 'HEAD is not the lf-refresh WIP commit: nothing was done' >&2"
  echo "fi"
else
  echo "git -C $QD reset -q --hard"
fi
echo "=== end recovery ==="

PARKED=0
if [ ${#DIRTY[@]} -gt 0 ]; then
  g add -- "${DIRTY[@]}"
  g -c user.name=lf-refresh -c user.email=lf-refresh@invalid commit -q -m "$WIP_SUBJECT"
  PARKED=1
  echo "parked ${#DIRTY[@]} path(s) in $(g rev-parse --short HEAD)"
fi

unpark_hint() {
  if [ "$PARKED" = 1 ]; then
    echo "To unpark by hand:" >&2
    echo "  git -C $QD reset -q --soft $PRE_HEAD" >&2
    printf '  git -C %s reset -q --' "$QD" >&2; printf ' %q' "${DIRTY[@]}" >&2; echo >&2
  fi
}

# 4. Guard: no tracked change may be left outside the park commit.
LEFT=$(g status --porcelain --untracked-files=no)
if [ -n "$LEFT" ]; then
  echo "GUARD: tracked changes remain after parking; refusing to refresh:" >&2
  echo "$LEFT" >&2
  unpark_hint
  exit 1
fi

# 5. Refresh: the only commands that rewrite stat-clean CRLF files.
g rm -r -q --cached .
if [ "${LF_REFRESH_STOP_AFTER_RM:-0}" = 1 ]; then
  echo "REHEARSAL: stopping after 'git rm -r --cached .' (exit 3). Run the recovery block above."
  exit 3
fi
g reset -q --hard

# 6. Unpark.
if [ "$PARKED" = 1 ]; then
  if [ "$(g log -1 --format=%s)" != "$WIP_SUBJECT" ]; then
    echo "UNPARK: HEAD is not the WIP commit. Recover by hand with the block above." >&2
    exit 1
  fi
  g reset -q --soft "$PRE_HEAD"
  g reset -q -- "${DIRTY[@]}"
  echo "unparked"
fi

# 7. Checks.
FAILS=0
pass() { echo "PASS  $1"; }
fail() { echo "FAIL  $1"; FAILS=$((FAILS + 1)); }

[ "$(g rev-parse HEAD)" = "$PRE_HEAD" ] && pass "HEAD equals PRE_HEAD ($PRE_HEAD)" || fail "HEAD $(g rev-parse HEAD) is not PRE_HEAD $PRE_HEAD"

mapfile -d '' -t POST < <(g diff --name-only -z)
[ "$(printf '%q\n' "${POST[@]}")" = "$(printf '%q\n' "${DIRTY[@]}")" ] && pass "uncommitted tracked paths unchanged (${#DIRTY[@]})" || fail "uncommitted tracked paths changed: $(printf '%q ' "${POST[@]}")"

for p in "${DIRTY[@]}"; do
  if [ -e "$D/$p" ]; then now=$(g hash-object -- "$p"); else now=DELETED; fi
  [ "$now" = "${HASH[$p]}" ] && pass "content kept: $p (${HASH[$p]})" || fail "content changed: $p (${HASH[$p]} -> $now)"
done

[ "$(g ls-files --others --exclude-standard)" = "$UNTRACKED" ] && pass "untracked files unchanged" || fail "untracked file list changed"
[ "$(g ls-files --others --ignored --exclude-standard)" = "$IGNORED" ] && pass "ignored files unchanged" || fail "ignored file list changed"

g diff --cached --quiet && pass "nothing staged" || fail "something is staged"

NONLF=$(g ls-files --eol | grep -v 'w/lf' || true)
[ -z "$NONLF" ] && pass "every tracked file is LF on disk" || fail "not LF on disk: $NONLF"

[ "$(g hash-object --no-filters index.html)" = "$(g rev-parse :index.html)" ] && pass "index.html on disk is byte-identical to the stored blob" || fail "index.html on disk differs from the stored blob"

[ "$FAILS" -eq 0 ] || { echo "$FAILS check(s) failed" >&2; exit 1; }
echo "lf-refresh: done, $D is LF on disk"
```

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: `.gitattributes` (tracked; `git ls-files --error-unmatch .gitattributes` succeeds)
- FOUND: C1 `17b5a663ebb47ae2290d989c45fee950c9dfee61` in `git log`, file list exactly `.gitattributes`
- FOUND: `git rev-parse C1~1` = BASE, `:index.html` = BASE_BLOB
- Suite: `891 passed, 0 failed, 2 skipped` at baseline, after C1 and on the LF tree
