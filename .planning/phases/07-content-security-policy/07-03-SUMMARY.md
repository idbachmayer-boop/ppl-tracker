---
phase: 07-content-security-policy
plan: 03
subsystem: developer tooling / CSP hash
status: complete
tags: [csp, tooling, tests, D-03, D-04, D-05]
requires:
  - "07-01: build stamp lives outside the inline script (ppl-build meta)"
provides:
  - "scripts/csp-hash.js exporting inlineScriptHash(html) and readPolicy(html)"
  - "CLI node scripts/csp-hash.js [--check] [file]"
  - "npm scripts csp:hash and csp:check"
  - "test block `── CSP hash tool (D-03, D-04, D-05) ──` with 12 CSP-TOOL: labels"
affects: [07-04, 07-05]
tech-stack:
  added: []
  patterns:
    - "One hashing function shared by CLI and suite, anchored to a hash Chrome itself reported"
    - "Hash over LF-normalised script text (the HTML parser's own preprocessing), never raw CRLF bytes"
    - "In-place rewrite through replacer functions, scoped to one token in one directive, write-only-if-changed"
key-files:
  created:
    - scripts/csp-hash.js
  modified:
    - package.json
    - test/app.test.js
decisions:
  - "readPolicy counts http-equiv=\"Content-Security-Policy\" occurrences case-insensitively before parsing, so a second CSP meta in any spelling is refused rather than ignored"
  - "The CLI refuses any flag other than --check and more than one path, so a mistyped --check can never fall through to the rewrite"
  - "The rewrite refuses a file that does not round-trip through UTF-8, so it can never alter bytes it does not own"
  - "--check reports two sha256 tokens as ambiguous (found 2), not stale, because csp:hash refuses that page and pointing at it would be a dead end"
metrics:
  duration: "~10 min"
  completed: 2026-10-02
actuals:
  tokens: 4170
  tasks: 2
  commits: 4
---

# Phase 7 Plan 03: CSP hash tool Summary

`npm run csp:hash` rewrites the sha256 in the CSP meta's `script-src` to the current inline script's
hash, and `npm run csp:check` exits 1 on a stale one with a message naming `npm run csp:hash`. One
zero-dependency function computes the hash for both, and it matches the hash Chrome reported for a
CRLF, non-ASCII script. The tool ships inert: index.html has no policy until 07-04.

## What was built

- **`scripts/csp-hash.js`** (new `scripts/` directory). CommonJS, built-ins only (`fs`, `path`,
  `crypto`).
  - `inlineScriptHash(html)` uses the harness's inline-script regex verbatim, throws
    `expected exactly one inline <script>, found N` unless there is exactly one match, normalises
    `/\r\n?/g` to `\n`, and returns `sha256-<base64>`.
  - `readPolicy(html)` returns `null` without a CSP meta, throws on two CSP metas, on an unreadable
    meta, or on a repeated directive, and otherwise returns a null-prototype map of the lower-cased
    directive name to its tokens as written.
  - CLI `[--check] [file]`, file defaulting to the repo's `index.html`. `--check` prints
    `CSP hash OK sha256-…` (exit 0) or the stale message on stderr (exit 1). A rewrite prints
    `updated sha256-…` or `unchanged sha256-…` (exit 0). Every refusal is exit 1 with a reason that
    names what it found.
- **`package.json`**: `"csp:hash": "node scripts/csp-hash.js"`, `"csp:check": "node scripts/csp-hash.js --check"`.
  Still no dependencies.
- **`test/app.test.js`**: a top-level `require('../scripts/csp-hash')` and the
  `── CSP hash tool (D-03, D-04, D-05) ──` block right after the Build stamp block, with block-local
  `runTool(args)` (execFileSync of `process.execPath`, literal argv, no shell) and `tmpPage(name, text)`.
  Every page is a synthetic temp file removed in a `finally`. No check reads the real file's policy.

## Suite

- BASE3 (at `e9d1a30`): `896 passed, 0 failed, 2 skipped`
- After Task 1: `902 passed, 0 failed, 2 skipped` (+6)
- Final: `908 passed, 0 failed, 2 skipped` (+12), each of the 12 `CSP-TOOL:` labels printing one PASS line.

## Tracer gate (Task 1)

Autonomous branch, since `human_verify_mode` is `end-of-phase`. The tracer's `<verify>`
(`TZ=America/Chicago npm test`) was rerun after the feat commit: 902/0/2, all six Task 1 labels PASS.
Result: tracer verified end to end, expansion continued.

## `npm run csp:check` on today's index.html

```
> csp:check
> node scripts/csp-hash.js --check

no CSP <meta http-equiv="Content-Security-Policy"> in C:\Users\idbac\Projects\ppl-tracker\.claude\worktrees\gifted-goodall-706ad7\index.html
```

Exit 1, as expected until 07-04 adds the policy.

## Red proof (mutations against a scratch clone of `d300ccf`)

Each mutation was applied to `scripts/csp-hash.js` in a fresh clone under the session scratchpad,
with `git checkout -q -- .` before each one, and the suite run there.

**T1: CR/CRLF normalisation removed from `inlineScriptHash`** (905 passed, 3 failed)
```
FAIL  CSP-TOOL: the hash matches what Chrome computes for a CRLF, non-ASCII script  → "sha256-dwJuaNwqlSqoKw0MG/Tl90D64O245FnYjohsTJsATx4="
FAIL  CSP-TOOL: index.html hashes the same with LF or CRLF line endings, as git stores it and as Chrome reads it (D-05)  → ["sha256-Nw5jh/…","sha256-yK+Cf/…","sha256-Nw5jh/…"]
FAIL  CSP-TOOL: csp:hash on a CRLF copy keeps its CRLF and writes the LF hash (D-05)  → {"w":{"status":0,"stdout":"updated sha256-E9BEjffr…"}, "crlfBefore":12,"crlfAfter":12,"loneLf":false,…}
```

**T2: `--check` exits 0 unconditionally** (905 passed, 3 failed)
```
FAIL  CSP-TOOL: csp:check fails on a stale hash, names npm run csp:hash, and leaves the file alone (D-03)  → {"status":0,"stdout":"","stderr":""}
FAIL  CSP-TOOL: csp:hash writes the current hash, then csp:check passes (D-04)  → {…,"c":{"status":0,"stdout":"","stderr":""}}
FAIL  CSP-TOOL: every refusal exits 1, says why, and leaves the file byte-identical  → [{"label":"no CSP meta","mode":"--check","status":0,…},{"label":"two sha256 tokens","mode":"--check","status":0,…},…]
```

**T3: the rewrite normalises the whole file to LF before writing** (907 passed, 1 failed)
```
FAIL  CSP-TOOL: csp:hash on a CRLF copy keeps its CRLF and writes the LF hash (D-05)  → {"w":{"status":0,…},"crlfBefore":12,"crlfAfter":0,"loneLf":true,…}
```

**T4: `inlineScriptHash` hashes the last match instead of refusing two** (906 passed, 2 failed)
```
FAIL  CSP-TOOL: a page with no inline script, or two, is refused rather than hashed  → {"none":"expected exactly one inline <script>, found 0","two":"hashed: sha256-RBNvo1Wz…"}
FAIL  CSP-TOOL: every refusal exits 1, says why, and leaves the file byte-identical  → [{"label":"a second inline script","mode":"rewrite","status":0,"stdout":"updated sha256-sJkEDIbq…"},…]
```

Every mutation turned its named labels red on the first run, so no check needed strengthening.

## Acceptance checks

- `node -e "…inlineScriptHash('<script>\r\n  // \uD83D\uDCAA …</script>')"` prints `sha256-FkXmCGIFCB9jt8LEY2DLQI+fJjqrioS0k5jyDB0+5gY=`.
- `grep -oE "require\('[^']+'\)" scripts/csp-hash.js | sort -u` prints exactly `crypto`, `fs`, `path`.
- `grep -c "require('../scripts/csp-hash')" test/app.test.js` prints `1`; `grep -n "readPolicy(rawHtml" test/app.test.js` prints nothing.
- `git diff --stat e9d1a30..HEAD -- index.html .github/` prints nothing.
- `git ls-files --eol scripts/csp-hash.js` shows `i/lf w/lf eol=lf`.

## Deviations from Plan

### Auto-added

**1. [Rule 2 - Correctness] A mistyped flag is refused instead of falling through to the rewrite**
- **Found during:** Task 1
- **Issue:** with "`--check` plus an optional first non-flag path", `npm run csp:hash -- --chek` would ignore the typo and rewrite the file.
- **Fix:** the CLI exits 1 with a usage line on any flag other than `--check` or more than one path. Task 2's refusal label covers it as an extra case.
- **Files:** `scripts/csp-hash.js`, `test/app.test.js`. **Commits:** `d602994`, `9e54e6d`

**2. [Rule 2 - Correctness] The rewrite refuses a file that is not valid UTF-8**
- **Found during:** Task 1
- **Issue:** a utf8 decode/re-encode would replace invalid bytes with U+FFFD, changing bytes outside the token (T-7-10).
- **Fix:** before writing, the tool checks that the decoded text re-encodes to the exact bytes it read, and refuses otherwise.
- **Files:** `scripts/csp-hash.js`. **Commit:** `d602994`

**3. [Rule 1 - Bug] `--check` on two sha256 tokens said "stale. Run: npm run csp:hash", which csp:hash then refused**
- **Found during:** Task 2, reading the refusal messages
- **Fix:** `--check` now reports `expected exactly one 'sha256-…' source in script-src, found 2`. Still exit 1.
- **Files:** `scripts/csp-hash.js`. **Commit:** `d300ccf`

### Process notes

- Task 1's GREEN followed the plan's full spec for `readPolicy` (two metas, repeated directive) and for the scoped rewrite, so Task 2's six labels passed on their first run with no RED. The four mutations stand in for the missing RED: each shows the Task 2 labels can fail.
- The plan's own pre-commit allow-list (`agent-*` branches) does not match this checkout's `claude/gifted-goodall-706ad7`; the orchestrator directed normal commits on this branch, which is not a protected ref.

## TDD Gate Compliance

- Task 1: RED `1dbdb46` (suite crashed on the missing module, exit 1), GREEN `d602994`.
- Task 2: `test` commit `9e54e6d`, then `feat` commit `d300ccf`. RED did not fail (see Process notes); the red proof covers it.

## Threat model

T-7-10 to T-7-13 are mitigated as planned (replacer functions and one-token scope, Chrome vector, LF
normalisation, literal argv with no shell), and T1 to T4 are shown red. T-7-14 holds: nothing in CI calls
the tool. No new surface beyond the threat model.

## Known Stubs

None.

## Next

07-04 adds the policy to index.html, runs `npm run csp:hash` to fill it in, adds the property tests
against the real policy, and wires `node scripts/csp-hash.js --check` into the deploy job. CSP-01 and
CSP-07 stay unticked until then.
