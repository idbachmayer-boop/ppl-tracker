---
phase: 01-f1-the-collections-registry
reviewed: 2026-09-14T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - .gitignore
  - index.html
  - test/app.test.js
  - test/fixtures/merge-golden.json
  - test/harness.js
findings:
  critical: 0
  warning: 0
  info: 2
  total: 2
status: clean
---

# Phase 01: Code Review Report

**Reviewed:** 2026-09-14
**Depth:** standard
**Files Reviewed:** 5
**Status:** clean

## Summary

This phase introduces the `COLLECTIONS` registry (`index.html`), derives `blank()`, the `liveOf`/
`liveX()` soft-delete filters, `validateBackup()`'s shape checks, and `mergeCollections()` (called
from `mergeDB()`) from that single declaration, and adds a new Sleep feature (SLEEP-01..06) built
on top of it. The ten `*_legacy` functions are intentionally retained side-by-side per Ian's deferred-
deletion decision and were not flagged.

I traced the registry-derived code against its frozen `*_legacy` twin by hand for every collection
(sessions/weights/petWeights/cardio/ideas/todos/hobbyLog list unions; journal line-union; mobilityLog/
lawnLog replace-whole maps) and independently confirmed:

- `COLLECTIONS` is declared as literals/hoisted-function-references only, positioned after `SCHEMA`,
  before `MIGRATIONS`, before `let DB = load()` — no TDZ hazard.
- The gen-mismatch wholesale-replace in `mergeDB()` remains a hard early return, textually and
  functionally before the call to `mergeCollections()` — "Erase all data" / Import→Replace still work.
- `mobilityLog`/`lawnLog` use `mergeDateMap(..., null)` (replace-whole, no inner-key union) — absence
  still never turns a flag off, and an explicit `false` on the newer side still wins.
- `ensureCollectionDefaults` (migration 18) only assigns when `d[name]==null` — it never touches or
  rewrites an existing row, so none of the REG-16 (touch/persist/idempotent/stale-replay) guards a
  row-rewriting migration needs are triggered, and a test proves no existing row's `mtime` changes.
- `validateBackup()`'s new three-pass loop reproduces the legacy required-list / optional-list / map
  grouping and message wording (including the U+2019 character) exactly, verified against
  `validateBackup_legacy` byte-for-byte in the diff and via the differential test battery.
- The new Sleep feature (`addSleep`/`removeSleep`/`viewSleep`) uses `save()` (not `saveLocal()`) —
  correct, since sleep logs are real synced user data, not a derived cache. Hours are bounds-checked
  (`0 < hours <= 24`), quality is clamped to 1–5, and the delete button's `id` is validated against
  `/^[A-Za-z0-9_-]+$/` before being interpolated into an inline `onclick` handler, closing the
  attribute/inline-handler-quote escaping gap the project's `esc()` doesn't cover on its own.
- No hardcoded hex colors, no `console.log`/`debugger`/`TODO`/`FIXME` were introduced.
- `.gitignore` correctly excludes `test/local/` and `ppl-backup-*.json`, preventing Ian's real data
  or exported backups from being published via the GitHub Pages deploy job.
- `test/fixtures/merge-golden.json` is 540 entries, each a `label: 8-char-hex` pair — no real user
  data, consistent with the stated design (synthetic-fixture hashes only, real-backup block never
  calls `golden()`).
- `TZ=America/Chicago npm test` passes clean: 653 passed, 0 failed, 0 skipped (the real-backup local
  fixture is present in this environment and its block ran).

I did not find any BLOCKER or WARNING-level defect introduced by this diff. The differential test
suite (legacy-vs-derived parity across a 400-case seeded random battery, idempotence/commutativity/
associativity law checks, golden hashes, and an explicit boot-from-every-schema-version loop) is
unusually rigorous and its assertions are non-tautological — I independently re-derived the expected
sort/merge/validate behavior by hand rather than trusting the tests' framing, and did not find a case
where the tests could pass despite a real divergence.

## Info

### IN-01: Sleep row display renders "NaN" for non-numeric hours/quality from a malformed import

**File:** `index.html:3706` (`viewSleep`)
**Issue:** `${esc(String(Number(s.hours)))}h · quality ${esc(String(Number(s.quality)))}/5` will render
literal `"NaNh · quality NaN/5"` if `s.hours`/`s.quality` are non-numeric — which is reachable via a
hand-edited backup, since `validateBackup()` only does shape checks (list vs. not) for the `sleep`
collection, not per-row type checks on `hours`/`quality` (unlike the hand-written per-row checks for
`sessions`/`weights`). This matches the project's explicit "no validation DSL / deep per-row checks
stay hand-written, out of scope beyond sessions/weights" design note in the same function, so this is
not a defect against the stated scope — flagging only because it's a user-visible artifact of that
scope decision, in case Sleep's per-row validation is added in a later phase.
**Fix:** If/when Sleep gets hand-written per-row validation (mirroring the `sessions`/`weights` blocks
in `validateBackup()`), reject or coerce non-numeric `hours`/`quality` there rather than at render time.

### IN-02: sessionRows/hobbyRows/journalRows/dayFlagRows are not yet called from any UI/export path

**File:** `index.html:3745-3773` (row-shaper functions), referenced only via `COLLECTIONS.*.format`
**Issue:** These four functions are exercised by unit tests and wired into the registry's `format`
field, but nothing in `index.html` outside the registry declaration and the tests currently calls
them — they're inert until a future phase consumes `COLLECTIONS.<name>.format`. This is explicitly
called out in the code comments as "Phase 2's job," so it's intentional forward infrastructure, not
dead code left over from a removal — noting it only so the next phase doesn't lose track of wiring
them up.
**Fix:** None needed now; confirm a later phase's plan references these before considering them
complete.

---

_Reviewed: 2026-09-14T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
