---
phase: 06-f4-gitattributes
reviewed: 2026-10-01T00:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - .gitattributes
  - CLAUDE.md
  - test/app.test.js
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 6: Code Review Report

**Reviewed:** 2026-10-01
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

Scope: the `ce58223..HEAD` diff for `.gitattributes` (new, `* text=auto eol=lf`), the REPO-01 block in
`test/app.test.js` (lines 15 and 86-107), and the new **Line endings** bullet in `CLAUDE.md` (lines 77-83).

What holds up, checked by running it:
- The suite is green locally (893 passed, 0 failed, 2 skipped). Both REPO-01 lines pass.
- With git removed from `PATH`, both REPO-01 lines FAIL with `"spawnSync git ENOENT"` and the exit
  code is non-zero. The test does not skip silently.
- `git check-attr -z` output (`path\0attr\0value\0`) is parsed correctly at index `[2]`.
- `git show :index.html` returns raw index bytes. No textconv or smudge runs on it.
- `maxBuffer` is large enough (index.html is 387,733 bytes).
- The test is portable to CI: `ubuntu-latest` with `actions/checkout@v4` has git and a real
  repository, and `execFileSync('git')` resolves `git.exe` on Windows.
- All 134 tracked files are `i/lf`. None is binary.

The problems: the assertions are proxies that can pass while the property they name is broken, and
the test does not look at the files on disk, which is where the original symptom showed up. I
reproduced both proxy gaps in a scratch repository (results below). There are no blockers: in CI the
blob check is a backstop for `index.html` itself.

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: `eol=lf` resolving does not mean git normalizes `index.html`. A `-text` or `binary` override passes the first assertion

**File:** `test/app.test.js:99,103`
**Issue:** The first assertion checks only that the `eol` attribute resolves to `lf`. In git's
conversion logic, `eol` applies only when `text` is set, auto, or unspecified. When `text` is unset
(`index.html -text`, or the `binary` macro, which expands to `-diff -merge -text`), git does no
conversion at all, but `check-attr eol` still reports `lf`. I reproduced this in a scratch repo:

```
.gitattributes:  * text=auto eol=lf
                 idx.html -text
git check-attr -z eol -- idx.html   ->  idx.html|eol|lf|      (assertion 1 would PASS)
git ls-files --eol idx.html         ->  i/crlf  w/crlf  attr/-text   (CRLF stored)
```

Someone could add a `-text` line for `index.html` today, or a broader pattern that matches it, and
the suite would stay green. The second assertion (no CR in the blob) only catches this after a CRLF
commit has already landed. So "git resolves `eol=lf`" does not prove "git normalizes to LF", which is
what the test's own header says it asks.
**Fix:** Also assert the `text` attribute, so the check covers what git will actually do:
```js
const attrs = git(['check-attr', '-z', 'text', 'eol', '--', 'index.html']).toString('utf8').split('\0');
// [path, 'text', value, path, 'eol', value, '']
const text = attrs[2], eol = attrs[5];
ok('REPO-01: git treats index.html as text (not -text/binary)', text === 'auto' || text === 'set', err || text);
ok('REPO-01: git resolves index.html to eol=lf', eol === 'lf', err || eol);
```

### WR-02: `text=auto` never renormalizes a file that already reached the index as CRLF, so "every text file as LF" is an overclaim and the suite covers only `index.html`

**File:** `.gitattributes:1-2`, `CLAUDE.md:77-79`, `test/app.test.js:104`
**Issue:** The `.gitattributes` comment says "Git stores and checks out every text file as LF" and
the CLAUDE.md bullet says "store and check out every text file as LF". Under `text=auto`, git
exempts any path whose index blob already contains CRLF: later `git add` does not normalize it, and
`eol=lf` does not rewrite it on checkout. I reproduced this in a scratch repo. With a CRLF blob
already committed, then `* text=auto eol=lf` added, then the file edited and `git add`ed, the result
is `i/crlf w/crlf attr/text=auto eol=lf`. CRLF can reach the index without passing through local
attributes, for example through a GitHub web-UI upload or edit, or any tool that writes objects
directly. Once there, it stays. The suite catches this only for `index.html`. `firestore.rules`,
`test/*.js`, `sw.js`, `manifest.json` and the docs are not covered.
**Fix:** Pick one of these:
- Use `* text eol=lf` instead of `text=auto`. This always normalizes on the next add. No binary files
  are tracked today; add explicit `*.png binary` lines if any arrive.
- Or keep `text=auto` and widen the blob check to the whole tree:
  ```js
  const bad = git(['ls-files', '--eol', '-z']).toString('utf8').split('\0')
    .filter(l => /^i\/(crlf|mixed)\b/.test(l));
  ok('REPO-01: no tracked text file is stored with CR', bad.length === 0, err || bad);
  ```
- At minimum, make the `.gitattributes` comment and the CLAUDE.md bullet say what is actually
  guaranteed: files git normalizes itself, with `index.html` the only file the suite asserts.

### WR-03: The suite never looks at the file on disk, so the documented stale-checkout trap passes green

**File:** `test/app.test.js:88-106`, `CLAUDE.md:81-82`
**Issue:** The test header says the defect was that "Windows working trees came out CRLF". Both
assertions read git metadata (attributes and the index blob), never the working-tree bytes. CLAUDE.md
itself documents the case where the two differ: "A checkout made before the file landed keeps CRLF
copies while `git status` reports clean." In that state the REPO-01 lines PASS, while every
`fs.readFileSync(APP_PATH)` in the rest of the suite reads a CRLF file. Nothing tells the developer
that their checkout needs the refresh. The suite cannot detect the symptom this phase exists to fix.
CI is unaffected: a fresh Linux checkout is always LF. That is why a working-tree check costs
nothing in CI and catches the trap only on stale local checkouts, which is where it is needed.
**Fix:** Add a third assertion on the bytes the suite actually loads, and put the remedy in the
FAIL detail:
```js
const disk = fs.readFileSync(APP_PATH);
ok('REPO-01: index.html on disk holds no carriage return (stale checkout? see CLAUDE.md, Line endings)',
   disk.indexOf(0x0d) === -1,
   'first CR at byte ' + disk.indexOf(0x0d) + ': run `git rm -r --cached -q :/ && git reset -q --hard` from a clean tree');
```

## Info

### IN-01: `check-attr` does not prove the repo-root file is where the answer comes from

**File:** `test/app.test.js:87-89,99`
**Issue:** The comment says "The attributes file at the repo root now does." But `git check-attr`
also reads `core.attributesFile` (global) and `$GIT_DIR/info/attributes`, which takes priority over
`.gitattributes`. On a developer machine, a global `* eol=lf` would make the check pass with the
repo file deleted, and an `info/attributes` override would make it fail in a way CI cannot
reproduce. The CI gate is still sound, because a runner has no such files.
**Fix:** Run the attribute query with `-c core.attributesFile=<an empty file>` and
`GIT_ATTR_NOSYSTEM=1`, or note in the comment that only CI proves the repo file is the source.

### IN-02: Inherited `GIT_DIR` / `GIT_INDEX_FILE` / `GIT_WORK_TREE` override the pinned `cwd`

**File:** `test/app.test.js:95-96`
**Issue:** The comment says pinning `cwd` means "the answer does not depend on where node was
started". That is false when the parent process exports `GIT_DIR`, `GIT_WORK_TREE` or
`GIT_INDEX_FILE`, which happens when the suite runs from a git hook or under some git-driving tools.
Git then reads that repository or index, not the one at `root`.
**Fix:** Pass a scrubbed environment:
```js
const env = { ...process.env }; delete env.GIT_DIR; delete env.GIT_WORK_TREE; delete env.GIT_INDEX_FILE;
const git = args => execFileSync('git', args, { cwd: root, env, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
```
(Keeping `GIT_INDEX_FILE` in a pre-commit hook is arguably what you want, so decide on purpose.)

### IN-03: The CLAUDE.md remedy depends on the current directory and leaves out the guard from the vetted script

**File:** `CLAUDE.md:81-83`
**Issue:** The pathspec `.` in `git rm -r --cached -q .` is relative to the current directory. Run
from `test/`, the pair refreshes only that subtree and reports success. The bullet also says "the
only rewrite that works", which is stronger than anything the phase tested. The guarded, lossless
procedure (`lf-refresh.sh`, which refuses when anything is staged and parks then unparks
uncommitted work) exists only inside `.planning/phases/06-f4-gitattributes/06-01-SUMMARY.md`. That
location is not where a future reader of CLAUDE.md will look.
**Fix:** Use the root-anchored pathspec `git rm -r --cached -q :/ && git reset -q --hard`, or say
"from the repo root". Point to the script, or ship it, for example as `scripts/lf-refresh.sh`. Soften
"the only rewrite that works" to "the rewrite that works".

---

Note outside the reviewed files: the REPO-01 text in `.planning/REQUIREMENTS.md:83` ("store
`index.html` bytes exactly") does not match what shipped. `text=auto eol=lf` normalizes CRLF to LF;
it does not store bytes exactly. The requirement is ticked anyway. Consider rewording it to the
property that is actually asserted.

---

_Reviewed: 2026-10-01_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
