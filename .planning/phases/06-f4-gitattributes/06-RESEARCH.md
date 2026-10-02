# Phase 6: F4 — .gitattributes - Research

**Researched:** 2026-10-01
**Domain:** Git line-ending attributes (`.gitattributes`, `core.autocrlf`), commit isolation, a git-backed property check in a dependency-free Node test suite
**Confidence:** HIGH. Every load-bearing claim was reproduced this session in throwaway clones under the session scratchpad. The worktree's index, HEAD and working tree were left as found: index `ls-files -s` sha1 `20c1c781…` before and after, HEAD `984ee98`, status `?? .planning/research/.cache/` only, and the stash list untouched.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01 Scope:** a single rule, `* text=auto eol=lf`, covering all text files and not just index.html. It satisfies REPO-01 and also pins sw.js, the tests and the docs.
- **D-02 Commit isolation (REPO-02):** commit 1 contains `.gitattributes` plus whatever `git add --renormalize .` stages, and nothing else. Verify it with `git show --stat`.
- **D-03 Local checkout:** after the commit, refresh the working tree so the files on disk are LF (e.g. `git rm --cached -r . && git reset --hard`, or delete and re-checkout). This is a local step only and adds no commit. Do it in this worktree; the main checkout at `C:\Users\idbac\Projects\ppl-tracker` needs the same refresh after it pulls.
- **D-04 Test:** add a property check to `npm test` **in a separate, later commit** so REPO-02 holds. It asserts that `git check-attr eol index.html` resolves to `lf` and that the indexed blob of index.html (`git show :index.html`) contains no `\r`. It checks the property, never the exact wording of .gitattributes. CI must have git available, which actions/checkout provides.

### Claude's Discretion
(CONTEXT.md has no Claude's Discretion section. Open areas found in research: whether the git check fails or skips when git is unavailable (recommendation below: **fail**), where the check sits in `test/app.test.js`, and which docs get updated afterwards.)

### Deferred Ideas (OUT OF SCOPE)
None.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REPO-01 | A `.gitattributes` file makes git store `index.html` bytes exactly, ending `core.autocrlf` rewriting | `* text=auto eol=lf` resolves to `attr/text=auto eol=lf` on every tracked file. The `eol` attribute overrides `core.autocrlf`. After the D-03 refresh, the raw disk bytes of index.html hash to the same blob that git stores (`hash-object --no-filters` = `rev-parse :index.html`). Verified, see Pattern 3. |
| REPO-02 | `.gitattributes` and the resulting whole-file diff land in a commit containing nothing else | A dry run in a clone showed that `git add --renormalize .` stages **nothing**: every blob is already LF, so the resulting commit's file list is exactly `.gitattributes`. The index.html blob is identical before and after (`fa905943…`). Verify with `git diff-tree --no-commit-id --name-only -r <sha>`. This cannot be a suite test because CI clones with `--depth=1`. |
</phase_requirements>

## Summary

The repo already stores every text file as LF. `git ls-files --eol` (run 2026-10-01, 126 tracked files) reports `i/lf` for all 126. **None** are `i/crlf`, `i/mixed` or `i/-text`, because the repo tracks no binary files at all: the extensions are 115 `.md`, 4 `.json`, 3 `.js`, and one each of `.html`, `.yml`, `.rules` and `.gitignore`. In this worktree 96 files are `w/crlf` and 30 are `w/lf`. The 30 are files that tools wrote after checkout. The CRLF copies come from `core.autocrlf=true`, set system-wide in `C:/Program Files/Git/etc/gitconfig`. `attr/` is empty everywhere because no `.gitattributes` and no `info/attributes` exist. So `* text=auto eol=lf` changes **no blob**, and the "4,131-line diff" that REVIEW-2026-09-09.md and CONCERNS.md predicted applies only to the rejected `* -text` option. Under D-01 the isolated commit holds one file. [VERIFIED: git ls-files --eol, dry run in a clone]

The one trap is the working tree. After the attributes commit lands, by commit, pull or fast-forward, every checkout that predates it keeps its CRLF files, and `git status` reports a **clean** tree because the index stat data still matches. `git reset --hard`, `git checkout -- .`, `git restore --worktree .` and `git checkout-index -f -a` all leave those files CRLF. Only `git rm -r --cached .` followed by `git reset --hard` rewrote them to LF in testing, and it kept untracked files. A fresh clone gets LF directly. [VERIFIED: four refresh methods tested in clones]

Switching to LF changes no test result. The suite passes 891/0/2 (2 skips = the real-backup legs, local-only) on the CRLF worktree **and** on an LF-refreshed clone, and the PASS/FAIL/SKIP lines are identical. That fits the history: CI runs on ubuntu, where checkouts have always been LF. The golden hashes in `test/fixtures/merge-golden.json` cover canonicalised **data** output, never source text. [VERIFIED: ran `npm test` in both]

**Primary recommendation:** Commit 1: `git add .gitattributes && git add --renormalize .`, assert that the staged list is exactly `.gitattributes`, then commit. Next, the local refresh (guarded `git rm -r --cached . && git reset --hard`, no commit). Commit 2: the D-04 check, which spawns `git` through `execFileSync` with fixed arguments and `cwd` set to the repo root, and **fails** (never skips) when git or the repo is missing. Merge the PR with a merge commit, never a squash, or REPO-02's isolation is destroyed on `main`.

## Project Constraints (from CLAUDE.md)

- `index.html` stays a single file. No build step, no dependencies. The phase adds no package. [VERIFIED: CLAUDE.md]
- Run `npm test` before every push. A red suite blocks the deploy in CI. "Add checks for what you change." [VERIFIED: CLAUDE.md]
- Tests "assert the property, never the wording". The D-04 check must not read or pin the text of `.gitattributes`. [VERIFIED: CLAUDE.md, Conventions → Security rules bullet]
- After shipping, append a dated changelog entry to `C:\Main Vault\50-59 Projects & Events\56. Software Projects\PPL Tracker App.md`. **Never** use the old vault at `Documents\Obsidian Vaults\Ian's Valut`. [VERIFIED: CLAUDE.md]
- Git safety from the environment: the stash is shared across worktrees, so no bare `git stash`/`pop`. Prefer a WIP commit. [VERIFIED: session environment notes]
- No project skills exist (`.claude/skills/` and `.agents/skills/` are absent in the worktree and the main checkout). [VERIFIED: ls]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Line-ending policy (what bytes git stores and checks out) | Repo config (`.gitattributes`, versioned) | — | Attributes travel with the repo; `core.autocrlf` is per-machine config, which is the thing being overridden |
| Proof the policy holds | Test suite (`test/app.test.js`, runs in CI) | Developer machine | CI is the deploy gate; the check must run where the deploy is decided |
| Commit isolation (REPO-02) | Git history (verification-time command) | PR merge strategy | CI's depth-1 clone cannot see history, and a squash merge would collapse the isolation |
| Working-tree LF refresh | Each checkout or worktree, locally | — | The working tree and index are per-worktree (`git rev-parse --git-path index` → `.git/worktrees/<name>/index`); nothing about it is committed |
| Bytes served by Pages | CI deploy job (ubuntu checkout + stamp) | — | Unchanged: the index.html blob is identical before and after |

## Standard Stack

### Core
| Tool | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| git (local) | 2.56.0.windows.1 | `.gitattributes`, `add --renormalize`, `check-attr`, `show :path` | Built-in; nothing to install [VERIFIED: `git --version`] |
| git (CI) | 2.55.0 at `/usr/bin/git`, ubuntu-latest | Same commands inside the test | [VERIFIED: CI log of run 36567326826, "git version 2.55.0", `fetch --depth=1`] |
| Node `child_process.execFileSync` | Node 20 in CI, v24.15.0 locally | Spawns git from the test with no shell | Stdlib; the project forbids dependencies [VERIFIED: probe ran on Windows] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `* text=auto eol=lf` (D-01, locked) | `* -text` | Rejected in discussion. It would store CRLF working-tree bytes verbatim on the next `git add` and produce the whole-file diff. Recorded here only so the planner understands where the "4,131-line diff" wording came from |
| `git show :index.html` | `git cat-file blob :index.html` | Byte-identical output, 387,733 bytes with 0 CR from either [VERIFIED]. D-04 names `git show`, so keep it |
| Parsing `check-attr` text output (`index.html: eol: lf`) | `check-attr -z` (`index.html\0eol\0lf\0`) | `-z` avoids separator ambiguity; `split('\0')[2]` is the value [VERIFIED: od -c of the output] |

**Installation:** none. No package is installed in this phase.

## Package Legitimacy Audit

No external packages are installed, so no packages were checked. `child_process` is part of the Node stdlib.

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
 editor / Claude Edit tool writes file (LF or CRLF)
            │
            ▼
   git add ──► clean filter: text=auto detects text ──► eol=lf: CRLF→LF ──► blob in index (always LF)
            │                       │
            │                       └─ binary (NUL bytes) ──► stored byte-for-byte (i/-text)
            ▼
   commit ──► push ──► CI (ubuntu, depth-1 clone, git 2.55)
                          ├─ test job: node test/app.test.js
                          │     └─ D-04 check: git check-attr -z eol -- index.html == "lf"
                          │                    git show :index.html has no 0x0D byte
                          │        red ──► deploy blocked
                          └─ deploy job (main only): checkout (LF) ──► stamp BUILD ──► Pages
   checkout/pull ──► smudge: eol=lf ──► working tree LF (overrides core.autocrlf=true)
        └─ BUT files already on disk with matching stat are NOT rewritten ──► needs D-03 refresh
```

### Recommended Commit/Task Structure
```
commit 1  chore: add .gitattributes (text=auto, eol=lf)      ← .gitattributes ONLY (REPO-02)
(local)   refresh working tree to LF                         ← no commit (D-03)
commit 2  test: git stores index.html as LF (REPO-01)        ← test/app.test.js only (D-04)
commit 3  docs: …                                            ← CONCERNS/PROJECT/CLAUDE.md updates (optional, may ride in commit 2)
```
Planning-doc commits (SUMMARY, STATE) may come anywhere **except** inside commit 1.

### Pattern 1: Commit 1, isolated
**What:** Stage `.gitattributes` explicitly, then renormalize the tracked files, then check that the staged set is exactly what REPO-02 allows before committing.
**Example (verified in a clone):**
```bash
ROOT=$(git rev-parse --show-toplevel)
git -C "$ROOT" diff --cached --quiet || { echo "index not empty, stop"; exit 1; }   # nothing pre-staged
printf '%s\n' '# Store and check out every text file as LF, whatever core.autocrlf says (REPO-01).' \
              '* text=auto eol=lf' > "$ROOT/.gitattributes"
git -C "$ROOT" add .gitattributes          # renormalize does NOT add untracked files
git -C "$ROOT" add --renormalize .         # expected: stages nothing (all blobs already LF)
git -C "$ROOT" diff --cached --name-only   # expected output: exactly ".gitattributes"
git -C "$ROOT" commit -m "chore: add .gitattributes so git stores text as LF (REPO-01)"
git -C "$ROOT" show --stat --format=%H HEAD     # D-02 verification
```
`git add --renormalize .` **implies `-u`**: in the dry run it left `.gitattributes` untracked (`?? .gitattributes`) until it was added explicitly. [VERIFIED: clone dry run] The comment line is optional. Comments are legal in `.gitattributes`, and the D-04 test never reads the file's text.

### Pattern 2: D-03 working-tree refresh (guarded)
**What:** Rewrite every tracked file on disk through the new attributes without touching untracked files, other worktrees or the stash.
```bash
ROOT=$(git rev-parse --show-toplevel)
# Guard: reset --hard discards uncommitted TRACKED changes. Refuse if any exist.
test -z "$(git -C "$ROOT" status --porcelain --untracked-files=no)" \
  || { echo "tracked changes present: commit them (WIP commit) first"; exit 1; }
git -C "$ROOT" rm -r -q --cached .
git -C "$ROOT" reset -q --hard
git -C "$ROOT" ls-files --eol | grep -v 'w/lf' || echo "all tracked files are LF on disk"
git -C "$ROOT" status --porcelain           # expected: only pre-existing untracked entries
```
Facts verified in clones:
- `git reset --hard` alone, `git checkout -- .`, `git restore --worktree .` and `git checkout-index -f -a` **do not** rewrite stat-clean CRLF files (still 126 `w/crlf` afterwards). [VERIFIED]
- `rm -r --cached .` + `reset --hard` gives 127/127 `w/lf`. An untracked `.planning/research/.cache/x.txt` survived, and `status` showed only `?? .planning/research/.cache/`. [VERIFIED]
- Neither command touches `refs/stash`. In a linked worktree both act on that worktree's own index (`.git/worktrees/gifted-goodall-706ad7/index`) and working tree only. [VERIFIED: `git rev-parse --git-path index`]
- Ignored files (`test/local/`, `ppl-backup-*.json`) are untouched. `reset --hard` never removes untracked or ignored paths. [VERIFIED for untracked; ignored follows from the same rule, ASSUMED]

### Pattern 3: D-04 property check
**What:** A block in `test/app.test.js` that asks git about the property. It does not read `.gitattributes`.
**Where:** Next to the existing repo-hygiene block `console.log("\n── the repo keeps Ian's real backup out of git (T-01-12) ──")` (the `.gitignore` checks near the top of the file, before `loadApp`). The file's existing helpers are `ok(name, cond, extra)` and `skipLine(msg)`. [VERIFIED: test/app.test.js:18-24, quoted below]

```js
// verbatim, test/app.test.js:18-20, 24
let pass = 0, fail = 0, skip = 0;
const ok = (name, cond, extra) => { if(cond){ pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra!==undefined ? '  → ' + JSON.stringify(extra) : '')); } };
const skipLine = msg => { skip++; console.log('  SKIP  ' + msg); };
```

Recommended shape (each step was verified with a probe script; the exact names are the planner's choice):
```js
// at the top, beside `const fs = require('fs');`
const { execFileSync } = require('child_process');

console.log('\n── git stores index.html as LF, whatever core.autocrlf says (REPO-01) ──');
{
  /* Ask git for the property, never read .gitattributes' wording. Fixed argv, no shell. cwd is the
     repo root so the result doesn't depend on where `node` was started. A missing git or a non-repo
     checkout is a FAIL, never a skip: CI must prove this on every push. */
  const root = path.join(__dirname, '..');
  const git = args => execFileSync('git', args,
    { cwd: root, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  let eol = null, blob = null, err = null;
  try {
    eol  = git(['check-attr', '-z', 'eol', '--', 'index.html']).toString('utf8').split('\0')[2];
    blob = git(['show', ':index.html']);                 // a Buffer: the indexed blob, byte-exact
  } catch(e){ err = String((e && e.stderr && e.stderr.toString()) || (e && e.message) || e); }
  ok('repo: git resolves index.html to eol=lf', eol === 'lf', err || eol);
  ok('  …and the indexed index.html holds no carriage return',
     blob !== null && blob.indexOf(0x0d) === -1, err || (blob && blob.indexOf(0x0d)));
}
```
Probe results, using the same calls in a clone [VERIFIED]:

| State | `eol` | first CR offset | err |
|---|---|---|---|
| no `.gitattributes` | `"unspecified"` → FAIL | -1 | — |
| `* text=auto eol=lf` staged | `"lf"` → PASS | -1 → PASS | — |
| crafted CRLF blob forced into index (`hash-object -w --no-filters` + `update-index --cacheinfo`) | `"lf"` | 15 → FAIL | — |
| cwd not a repo | null → FAIL | null → FAIL | `fatal: not a git repository …` |

Do not pass the Buffer itself as `extra`. `ok()` calls `JSON.stringify(extra)`, which would print 388 KB.

### Anti-Patterns to Avoid
- **`git add .` / `git add -A` for commit 1.** This would sweep the untracked `.planning/research/.cache/` (and anything else lying around) into the isolated commit. Stage `.gitattributes` by name only.
- **Squash-merging the phase PR.** Commit 1 would fold into one commit with the test and docs, and REPO-02 would be false on `main`. The repo's last PR landed as "Merge pull request #8 …", a merge commit. [VERIFIED: `gh run list`]
- **Reading `.gitattributes` text in the test** (for example `/text=auto/`). It breaks the moment someone adds `*.png binary` or reorders lines. This is exactly the `firestore.rules` mistake recorded in CLAUDE.md.
- **Counting CRs with `od -c | grep '\\r'`.** This produced a false positive of 10,220 "matching lines" on a blob that has 0 CR bytes. Use `tr -cd '\r' | wc -c` or a Node Buffer. [VERIFIED]
- **Asserting the working tree is LF inside `npm test`.** That would turn red on every checkout that hasn't run the D-03 refresh (the main checkout, other worktrees), for a cosmetic reason. Keep that as a verification-time command (Validation Architecture).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Normalising line endings in the repo | A script that rewrites files with `sed`/`unix2dos` | `.gitattributes` + `git add --renormalize .` | Git applies it on every add/checkout on every machine; a script runs once |
| Knowing which files git treats as text | An extension list | `text=auto` | Detects binary by content (NUL bytes); a test PNG stayed `i/-text w/-text` [VERIFIED] |
| Proving the stored bytes equal the disk bytes | A diff tool | `git hash-object --no-filters index.html` vs `git rev-parse :index.html` | Equal after refresh (`fa905943…` both), different before (`6f4b565a…` on disk) [VERIFIED] |
| Spawning git from the test | `exec` with a shell string | `execFileSync('git', [fixed args])` | No shell, no quoting, no injection surface |

## Runtime State Inventory

This phase changes how every checkout materialises files, so the inventory applies.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None. App data lives in localStorage and Firestore, and line endings never touch it. The golden hashes in `merge-golden.json` cover canonicalised data output, not source text (`golden('blank', canon(bl), …)`, `golden('merge:'+label, a, b)`). [VERIFIED: grep of `golden(` call sites, identical results on LF and CRLF] | None |
| Live service config | GitHub Pages serves the deploy job's ubuntu checkout. Before and after, index.html is the same blob `fa9059434b9657fb1db489ebf7dd0613b751b236`, so the served bytes are unchanged. `.gitattributes` itself will be uploaded with the site because the deploy uploads `path: '.'`; harmless in a public repo. [VERIFIED blob; upload behaviour ASSUMED] | None. No `sw.js` `CACHE_VERSION` bump, since the shell bytes don't change |
| OS-registered state | `core.autocrlf=true` lives in `C:/Program Files/Git/etc/gitconfig` (system). It stays as is: the `eol` attribute overrides it for this repo. No `core.safecrlf` or `core.eol` is set. A global `filter.lfs.*` exists, but no attribute in the repo uses it. [VERIFIED: `git config --show-origin`] | None |
| Secrets/env vars | None | None |
| Build artifacts / checkouts | **Every existing working tree keeps CRLF files after it receives the commit, and `git status` says clean.** Known checkouts: main `C:\Users\idbac\Projects\ppl-tracker` (branch `planning/milestone-collections`, **dirty: ` M .planning/config.json`**, untracked `SESSION_LOG.md`, 13 `w/crlf`), worktrees `elastic-nash-8dfd46`, `gsd-execute-phase-1-ff7d18` and this one. [VERIFIED: `git worktree list`, read-only status] | Run the D-03 refresh in this worktree during the phase. Each other checkout runs it after it has the commit. **The main checkout must first commit or otherwise park its `.planning/config.json` change, because `reset --hard` would discard it.** The guard in Pattern 2 refuses in that state |

## Common Pitfalls

### Pitfall 1: "Status is clean, so the checkout is LF"
**What goes wrong:** After pulling commit 1, files stay CRLF on disk indefinitely.
**Why it happens:** Git rewrites a file only when its index stat data says it changed. A pull that doesn't touch `index.html`'s blob never rewrites it, and the usual "refresh" commands skip stat-clean files.
**How to avoid:** Use the guarded `rm -r --cached .` + `reset --hard` (Pattern 2), then check `git ls-files --eol | grep -v w/lf`.
**Warning signs:** `git ls-files --eol` still shows `w/crlf` next to `attr/text=auto eol=lf`.

### Pitfall 2: Renormalize doesn't stage the attributes file
**What goes wrong:** Commit 1 is created empty, or without `.gitattributes`.
**Why it happens:** `--renormalize` implies `-u` (tracked files only).
**How to avoid:** `git add .gitattributes` first. Assert that `git diff --cached --name-only` = `.gitattributes`.

### Pitfall 3: Commit 1 picks up stowaways
**What goes wrong:** REPO-02 fails because of the untracked `.planning/research/.cache/`, pre-staged planning docs, or a GSD auto-commit that bundles SUMMARY/STATE.
**How to avoid:** Start from `git diff --cached --quiet`, stage by name, and use plain `git commit` for commit 1 rather than a tool that stages a list of files. Verify with `git diff-tree --no-commit-id --name-only -r HEAD`.

### Pitfall 4: `reset --hard` destroys uncommitted work
**What goes wrong:** The main checkout loses its modified `.planning/config.json` (or a half-done edit anywhere).
**How to avoid:** Use the guard in Pattern 2. Park changes in a WIP commit, never a bare `git stash`, since the stash is shared across worktrees.

### Pitfall 5: The test's git call depends on cwd or a small buffer
**What goes wrong:** A false red when the suite is started from another directory, or `ENOBUFS` once index.html grows past the default `maxBuffer` (about 1 MiB; index.html is 387,733 bytes today).
**How to avoid:** Set `cwd` to `path.join(__dirname, '..')` and an explicit `maxBuffer` (Pattern 3).

### Pitfall 6: Mistaking `check-attr eol` = `lf` for "treated as text"
**What goes wrong:** `check-attr eol` reports `lf` even for a binary file that `text=auto` leaves alone (test PNG: `eol: lf`, but `i/-text`). [VERIFIED]
**How to avoid:** D-04 pairs it with the no-CR blob check, which is the byte-level proof for index.html. Don't drop either assertion.

### Pitfall 7: `safecrlf` warnings read as errors
**What goes wrong:** After commit 1, staging a still-CRLF file prints `warning: in the working copy of 'sw.js', CRLF will be replaced by LF the next time Git touches it`. [VERIFIED]
**How to avoid:** This is informational with default `core.safecrlf` (unset → warn). The blob is stored LF. The D-03 refresh makes it go away.

## Code Examples

All in Architecture Patterns 1–3 above, each exercised in a scratch clone. One more verification snippet for REPO-01 byte-exactness, run after the D-03 refresh:
```bash
ROOT=$(git rev-parse --show-toplevel)
test "$(git -C "$ROOT" hash-object --no-filters index.html)" = "$(git -C "$ROOT" rev-parse :index.html)" \
  && echo "git stores index.html's on-disk bytes exactly"
git -C "$ROOT" ls-files --eol index.html     # expect: i/lf  w/lf  attr/text=auto eol=lf  index.html
```

## Line-ending sensitivity of the suite (question 2, by idiom)

Grep over `test/app.test.js` and `test/harness.js`, with each idiom judged:

| Idiom | Sites (by identifier/context) | LF-safe? |
|---|---|---|
| Explicit `\r?\n` | `.gitignore` split in the T-01-12 block; `endMatch` (`/\r?\n\};\r?\n/`); the recipe fence match (`` /```text\r?\n…/ ``); `new RegExp('```'+lang+'\\r?\\n…')` | Yes. Already tolerant of both |
| `split('\n')` on source text | `lineDiff` (`probe.__src` vs `app.__src`, two sites) compares two sources with the same endings; `columnKeyLine` uses `.includes`; the `DB_ASSIGN` scan `.map(l=>l.trim())` strips `\r`; `scanInlineHandlers` in harness uses `^<script>` and `^function` (start-anchored) | Yes |
| `split('\n')` on app output | journal lines, export `md`/`text` headers (`'- Rows per section: '`) | Yes. Output strings are built in JS, not read from disk |
| `[^\n]*` comment strippers | `firestore.rules` strip; `app.blank.toString()` strip | Yes. A trailing `\r` is left inside a removed comment or harmlessly in code |
| Hashes | `fnv1a` goldens over `canon(...)` data | Yes. Data, not source |
| Template literals in index.html | n/a | Yes. ECMAScript normalises CRLF in template literals to LF [ASSUMED from spec knowledge; confirmed indirectly by identical results] |
| Fixture writer | `WRITE_MERGE_GOLDEN` path already does `.replace(/\r\n/g, '\n')` | Yes |
| child_process / byte offsets / line-count assertions on index.html | none found | — |

**Empirical proof:** `TZ=America/Chicago npm test` gives `891 passed, 0 failed, 2 skipped` on the CRLF worktree and on an LF-refreshed clone. `diff` of the PASS/FAIL/SKIP lines is empty. [VERIFIED]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| REVIEW F4: `* -text` ("store bytes exactly", 4,131-line diff) | D-01: `* text=auto eol=lf` (empty content diff) | 2026-10-01 discussion | Commit 1 is one file; the "whole-file diff" REPO-02 guards against does not materialise |
| Rely on `core.autocrlf` per machine | `eol` attribute in the repo | this phase | "If the `eol` attribute is unspecified … line endings in the working directory are determined by the `core.autocrlf` or `core.eol` configuration variable", so a specified `eol` wins [CITED: git-scm.com/docs/gitattributes] |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `reset --hard` leaves **ignored** files (`test/local/`) alone. Tested only with untracked files | Pattern 2 | Low. Documented git behaviour; worst case, the git-ignored real-backup snapshot would need restoring (it lives elsewhere too) |
| A2 | `upload-pages-artifact` publishes dotfiles such as `.gitattributes` | Runtime State Inventory | Negligible. The repo is public |
| A3 | Template-literal CRLF normalisation is per the ECMAScript spec | Sensitivity table | None. Identical suite results already prove LF-safety |
| A4 | Interpretation: REPO-01's "bytes exactly" is satisfied by D-01, because after the refresh the disk bytes and the stored blob are identical and autocrlf no longer rewrites anything. A CRLF-writing editor would be normalised to LF on add, which is not literally "bytes exactly" | Open Questions | Low. D-01 is locked and the discussion log rejected `-text` explicitly; the verifier should judge the property, not the REVIEW wording |

## Open Questions

1. **REPO-01/ROADMAP wording vs D-01.** "Store index.html bytes exactly" and "the resulting whole-file diff" were written for `* -text`.
   - What we know: under D-01 the diff is empty and the byte-equality check passes after the refresh.
   - Recommendation: the verifier uses the property checks (Validation Architecture), and SUMMARY notes that the expected whole-file diff did not materialise because the index was already LF.
2. **Which docs to update** (none needs to change for correctness):
   - `.planning/codebase/CONCERNS.md` "F4: Line endings are unmanaged (intentional)": now stale. Mark it resolved and drop the `* -text` / 4,131-line text.
   - `.planning/PROJECT.md` Key Decisions row "`.gitattributes` lands in its own commit, alone" (outcome `— Pending`): fill in the outcome.
   - `CLAUDE.md`: recommend adding a short Conventions bullet, because the stale-CRLF trap is invisible (`status` is clean). "`.gitattributes` pins text files to LF; a checkout that predates it must run `git rm -r --cached . && git reset --hard` from a clean tree." This is planner/Ian's call.
   - `REVIEW-2026-09-09.md`: a dated historical review. Leave it.
   - README, `docs/adding-a-collection.md`: no line-ending text. No change.
   - All doc edits go in commit 2 or later, never commit 1.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| git (local) | commits, refresh, D-04 | ✓ | 2.56.0.windows.1 | — |
| git (CI, ubuntu-latest) | D-04 in the deploy gate | ✓ | 2.55.0, real repo, `--depth=1` | none needed; the check fails loudly if it's ever absent |
| Node (local / CI) | `npm test` | ✓ | v24.15.0 / '20' (deploy.yml `node-version: '20'`) | — |
| gh CLI | merge-strategy check, CI log | ✓ | — | GitHub web UI |

From actions/checkout v4: "Only a single commit is fetched by default", and it "falls back to the REST API to download the files" (no local repo) only when Git 2.18+ isn't on PATH. [CITED: github.com/actions/checkout/blob/v4/README.md] The workflow's test job runs `node test/app.test.js` from the checkout root. [VERIFIED: .github/workflows/deploy.yml:24-36, quoted: `runs-on: ubuntu-latest`, `node-version: '20'`, `run: node test/app.test.js`]

**Fail vs skip when git is unavailable: FAIL.** CLAUDE.md says "the suite is the only thing standing between a refactor and two months of training data", and the suite's own rule is that "a skip is never a pass and never a fail". Skips exist for one reason only: Ian's decision to keep his real backup local. Git is present everywhere the suite legitimately runs: CI (verified) and Ian's machine. If CI ever lost its `.git` (the REST fallback), a skip would let the line-ending guard rot silently, which is exactly the drift this phase exists to prevent. A FAIL names the cause (the stderr is included as `extra`).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Hand-rolled `ok()`/`skipLine()` runner in `test/app.test.js` + `test/harness.js` (no dependencies) |
| Config file | none. `package.json` `"test": "node test/app.test.js"` [VERIFIED: package.json:6] |
| Quick run command | `TZ=America/Chicago npm test` (about 891 checks, seconds) |
| Full suite command | same; CI runs `node test/app.test.js` with `TZ: America/Chicago` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REPO-01 | git resolves `index.html` to `eol=lf` | unit (in suite, CI-gated) | `TZ=America/Chicago npm test` → PASS `repo: git resolves index.html to eol=lf` | ❌ commit 2 adds it |
| REPO-01 | indexed blob has no CR | unit (in suite, CI-gated) | same → PASS `…and the indexed index.html holds no carriage return` | ❌ commit 2 adds it |
| REPO-01 | both checks go red when the property breaks | red proof (scratch clone, one-off) | in a temp clone: delete `.gitattributes` → FAIL eol; force a CRLF blob via `git hash-object -w --no-filters` + `git update-index --cacheinfo 100644,<sha>,index.html` → FAIL CR | probe verified this session |
| REPO-01 | on-disk bytes = stored bytes, working tree LF | verification command (local, after D-03) | `test "$(git hash-object --no-filters index.html)" = "$(git rev-parse :index.html)"` and `git ls-files --eol \| grep -v w/lf` returns nothing | n/a |
| REPO-01 | every tracked text file is LF in the index | verification command | `git ls-files --eol \| grep -E 'i/(crlf\|mixed)'` returns nothing | n/a |
| REPO-02 | the commit adding `.gitattributes` contains nothing else | verification command (not in suite: CI depth-1 has no history) | `git diff-tree --no-commit-id --name-only -r $(git log --diff-filter=A --format=%H -- .gitattributes)` prints exactly `.gitattributes` | n/a |
| REPO-02 | isolation survives onto `main` | **manual-only** | PR merged with a merge commit (not squash); rerun the REPO-02 command on `main` after merge | n/a |
| D-03 | refresh kept untracked files | verification command | `git status --porcelain` still lists `?? .planning/research/.cache/` | n/a |
| — | no regression from LF working tree | full suite | `TZ=America/Chicago npm test` → `0 failed` | ✅ |

### Sampling Rate
- **Per task commit:** `TZ=America/Chicago npm test`
- **Per wave merge:** same + the REPO-02 `diff-tree` command
- **Phase gate:** suite green + all verification commands above, before `/gsd-verify-work`

### Wave 0 Gaps
- None. The existing runner covers it. The new check is added in commit 2 (not Wave 0, since it must come **after** commit 1 to stay green and keep REPO-02).

## Security Domain

`security_enforcement: true`, ASVS L1. This is a repo-config phase with no runtime app change.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | no (no new input) | — |
| V6 Cryptography | no | — |
| V14 Configuration / build integrity | yes | Versioned `.gitattributes`, a CI-gated property check, an isolated commit |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| A real change hidden inside a whole-file line-ending reformat diff | Tampering / Repudiation | REPO-02 isolated commit, plus `eol=lf` so future flips can't happen; merge without squash |
| Command injection through the test's git spawn | Tampering / Elevation | `execFileSync` with a literal argv and no shell; no user or env input reaches the arguments |
| The deploy gate silently weakened (check skipped when git is absent) | Tampering | FAIL, never skip (Environment Availability) |
| Information disclosure via the published `.gitattributes` | Info disclosure | None needed: one rule line, public repo |

## Sources

### Primary (HIGH confidence, reproduced this session)
- `git ls-files --eol`, `git check-attr`, `git config --show-origin`, `git worktree list`, `git rev-parse --git-path index` on this worktree (read-only)
- Throwaway clones under the session scratchpad: renormalize dry run, four refresh methods, a fast-forward pull into a stale checkout, binary detection, a safecrlf warning, a D-04 probe in four states, byte-exactness via `hash-object --no-filters`
- `TZ=America/Chicago npm test` on the CRLF worktree vs the LF clone (identical 891/0/2)
- CI log, run 36567326826 (`gh run view --log`): git 2.55.0, `fetch-depth: 1`
- Files read: `.github/workflows/deploy.yml`, `package.json`, `test/app.test.js` (helpers, the T-01-12 block, line-splitting sites, the golden writer), `test/harness.js` (`loadApp`, `scanInlineHandlers`), `.planning/codebase/CONCERNS.md`, `.planning/PROJECT.md`, `REVIEW-2026-09-09.md`, CLAUDE.md

### Secondary (MEDIUM, official docs)
- https://git-scm.com/docs/gitattributes: `text=auto`, `eol`, precedence over `core.autocrlf`, the renormalize recipe
- https://github.com/actions/checkout/blob/v4/README.md: default depth 1, REST fallback without Git 2.18+

## Metadata

**Confidence breakdown:**
- Commands / stack: HIGH. Every command executed in clones with measured results
- Architecture (commit order, refresh, test shape): HIGH. Probed end to end, including the red states
- Pitfalls: HIGH. Each was observed this session, except A1/A2 (low impact)

**Research date:** 2026-10-01
**Valid until:** 2026-11-01 (git semantics are stable; re-run `git ls-files --eol` if new files are added before execution, especially any binary)
