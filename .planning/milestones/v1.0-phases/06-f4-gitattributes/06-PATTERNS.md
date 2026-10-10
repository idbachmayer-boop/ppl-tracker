# Phase 6: F4 — .gitattributes - Pattern Map

**Mapped:** 2026-10-01
**Files analyzed:** 5 (1 new, 4 modified)
**Analogs found:** 4 / 5

## File Classification

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `.gitattributes` (new, commit 1 alone) | config | n/a | `.gitignore` (repo-hygiene config) | partial (no existing attributes file) |
| `test/app.test.js` (modified, later commit) | test | request-response (shells out to git) | `.gitignore` block + `firestore.rules` block in the same file | role-match (no child_process precedent) |
| `.planning/codebase/CONCERNS.md` | doc | n/a | its own CRLF entry ("`index.html` is CRLF on disk … no `.gitattributes`") | exact (edit in place) |
| `.planning/PROJECT.md` | doc | n/a | its own F4 checkbox and Key Decisions row ("`.gitattributes` lands in its own commit, alone … — Pending") | exact |
| `CLAUDE.md` (optional) | doc | n/a | the `firestore.rules` bullet under Conventions | role-match |

## Pattern Assignments

### `.gitattributes`
No analog. Content per D-01: the single line `* text=auto eol=lf`. Stage it by name (never `git add .`, which would pick up the untracked `.planning/research/.cache/`), plus whatever `git add --renormalize .` stages.

### `test/app.test.js` (repo-hygiene property check)

**Placement analog:** the block opened by `console.log("\n── the repo keeps Ian's real backup out of git (T-01-12) ──");`, near the top and before `── the file itself ──`. Put the new block next to it. Sections are a `console.log('\n── <behaviour sentence> ──')` heading followed by a bare `{ … }` block that scopes its locals:
```js
console.log("\n── the repo keeps Ian's real backup out of git (T-01-12) ──");
{
  const gitignorePath = path.join(__dirname, '..', '.gitignore');
  const lines = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8').split(/\r?\n/) : [];
  ok('gitignore: test/local/ is ignored', lines.includes('test/local/'));
  ...
}
```
- Repo root is resolved as `path.join(__dirname, '..')`. The other idiom is `APP_PATH.replace(/index\.html$/, 'firestore.rules')`. Use the first one for git's `cwd`.
- Missing input reads as a FAIL, never a crash. The idiom is `fs.existsSync(x) ? read : []`. For git, use the same idea: wrap the calls in try/catch, leave the values `null`, and let `ok()` fail.

**Imports:** the head of the file is
```js
const { loadApp, makeWx, freezeRunnerClock, APP_PATH, scanInlineHandlers } = require('./harness');
const fs = require('fs');
const path = require('path');
```
Add `const { execFileSync } = require('child_process');` beside these. **No existing check uses `child_process`.** This is the first one.

**Property-not-wording precedent:** the `firestore.rules` block and its comment ("Assert the property, never the wording"). Mirror that in the new block's comment: ask git (`check-attr eol`, `show :index.html`) and never regex `.gitattributes`.

**`ok()` naming:** a lowercase behaviour sentence. Use an area prefix (`'gitignore: …'`) or put the subject first (`'firestore.rules is in the repo'`). A follow-up check is indented with `'  …'` (`'  …every allow is gated on the caller owning the document'`). Suggested names: `'repo: git resolves index.html to eol=lf'` and `'  …and the indexed index.html holds no carriage return'`. `extra` goes through `JSON.stringify`, so pass `err || eol` or the CR offset, never the blob Buffer.

**`skipLine()`:** use it only for local-only real data that is absent, never for a missing tool. Its own comment says it exists for REG-13's real-backup leg. Its two uses are `skipLine('real-backup differential — test/local/real-db-snapshot.json is not present …')` and the Markdown-export-over-real-backup one. A missing git or a non-repo checkout must be a FAIL (D-04: CI must prove the property), **not** a skip.

**Core code:** use RESEARCH.md § Pattern 3 verbatim. It covers `execFileSync('git', args, { cwd: root, maxBuffer: 64*1024*1024, stdio: ['ignore','pipe','pipe'] })`, `check-attr -z eol -- index.html` and `.split('\0')[2]`, and `blob.indexOf(0x0d) === -1`.

### Docs
- `CONCERNS.md`: mark the CRLF/no-`.gitattributes` issue resolved, and correct its premise. Every file was already `i/lf`; the CRLF came from `core.autocrlf` on the working tree; and the fix is `text=auto eol=lf`, not `* -text`.
- `PROJECT.md`: tick the F4 checkbox, and change that Key Decisions row's outcome from "— Pending" to a dated outcome. Its rationale about `* -text` making a 4,131-line diff was superseded, so the outcome should say so.
- `CLAUDE.md` (optional): add a one-line Conventions bullet saying that line endings are pinned by `.gitattributes` and checked by the suite as a property. Keep the tone of the `firestore.rules` bullet.

## Shared Patterns
- **Assert the property, never the wording.** Apply this to the test and to any CLAUDE.md wording.
- **FAIL, not skip, for absent infrastructure.** Apply this to the git calls.
- **Commit isolation.** Commit 1 holds only `.gitattributes` plus the renormalize output. The test and the docs go in later commits. Do not squash-merge.

## No Analog Found
| File | Reason |
|------|--------|
| `.gitattributes` | first attributes file in the repo; it is a single line from D-01 |
| child_process usage in the test | no precedent, so follow RESEARCH.md § Pattern 3 |

## Metadata
**Search scope:** `test/app.test.js`, `.planning/codebase/CONCERNS.md`, `.planning/PROJECT.md`, `CLAUDE.md`
