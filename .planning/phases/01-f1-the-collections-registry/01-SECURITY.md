---
phase: 01
slug: f1-the-collections-registry
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-09-15
---

# Phase 01 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| stored blob → boot | localStorage and the synced Firestore blob (possibly written by an older build) reach `normalize()` at module-eval time | Ian's full training/life data — sensitive, integrity-critical |
| developer edit → deployed app | a bad registry edit reaches the phone unless the suite catches it before CI deploys `main` | code |
| imported file → DB | a backup file, possibly hand-edited or truncated, reaches `validateBackup()` then `normalize()` / `mergeDB()` | untrusted structured input |
| stored rows → views | soft-deleted rows stay in the blob by design and must be filtered on every read | user data incl. deleted rows |
| cloud blob → local merge | every sync is a `runTransaction` that re-reads a remote blob (possibly from a stale or older device) and calls `mergeDB()` | user data — integrity-critical |
| deliberate replace → union engine | Erase all data and Import→Replace bump `gen` specifically to escape the union | control signal |
| working tree → public repo and live site | anything committed is public; the Pages job publishes the whole checkout | anything in git |
| test output → console and transcripts | a FAIL prints its extra; suite output gets pasted into chats and logs | potentially real data |
| imported or synced sleep rows → rendered HTML | a hand-edited backup or another device can put any string in note, hours, quality, date or id | untrusted strings |
| older cached build → shared cloud blob | a tab on the pre-sleep build can merge against a blob holding sleep rows | user data |
| phone → development machine | Ian's full export is copied onto the PC for the real-data differential | journal, weigh-ins, notes — sensitive |
| verification output → planning docs and chat | whatever the executor prints or writes can land in a committed SUMMARY or a transcript | potentially real data |
| frozen legacy code → derived code | the legacy twins are the only independent reference for spotting a divergent merge/filter/validator | code |
| synthetic test outputs → committed files | goldens are committed, so they must never contain real data | hashes |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-01-01 | Tampering | COLLECTIONS value referencing a later `const` → TDZ ReferenceError swallowed by MIGRATIONS try/catch while `_schema` advances | high | mitigate | Placement/no-arrow/hoisted-declaration checks and the boot loop over every schema 0→18 (`test/app.test.js`) | closed |
| T-01-02 | Tampering | Promoted key functions drift from their arrow bodies, orphaning or duplicating rows | high | mitigate | Key-parity tests (REG-04), re-proven through `mergeDB` by the 01-03 differential | closed |
| T-01-03 | Denial of service | Module-eval registry check throws on the phone if a bad registry ships | medium | mitigate | Suite boots the real app via `loadApp`; refusal tests fire in the suite, so CI turns red and blocks deploy (`needs: test`) | closed |
| T-01-04 | Tampering | Map collection declared with list-union semantics resurrects unchecked boxes | high | mitigate | `collectionProblems()` refuses `merge:'union'` on maps and requires `explicitFalse` (`index.html`) | closed |
| T-01-05 | Tampering | Derived `validateBackup()` accepts a malformed backup the legacy one refused (ASVS V5) | high | mitigate | String-identical differential: named battery, generated 10×7 damage battery, two-fault precedence, non-object inputs | closed |
| T-01-06 | Tampering | `liveOf` returns copies or skips the filter → delete silently no-ops or deleted row ghosts back | medium | mitigate | Per-wrapper reference-identity checks over every soft collection; existing soft-deleted-session smoke check | closed |
| T-01-07 | Tampering | Derived `blank()` shares one container across calls, aliasing state | medium | mitigate | "fresh containers on every call" test | closed |
| T-01-08 | Tampering | gen-mismatch replace folded into the loop → Erase all / Import→Replace silently undone | high | mitigate | Textual early-return and ordering checks; named zero-survivor tests in both argument positions | closed |
| T-01-09 | Tampering | Map collection merged by key-union resurrects unchecked boxes | high | mitigate | Declaration refused at boot; `mergeCollections()` throws "has no usable merge strategy"; explicit-false/absence/inner-key replays on both maps | closed |
| T-01-10 | Denial of service | `mergeCollections` throws inside a sync transaction on a bad strategy, aborting that push (local data untouched) | low | accept | See accepted risk AR-01 | closed |
| T-01-11 | Tampering | Key derivation drifts (string key vs hand-written arrow), orphaning or duplicating rows | high | mitigate | Per-list `ROW_FOR` replays, pre-id sessions replay, 400-merge seeded random battery, real-backup key-count parity | closed |
| T-01-12 | Information disclosure | Ian's real backup committed to the public repo or published by the Pages upload | high | mitigate | `.gitignore` (`test/local/`, `ppl-backup-*.json`); `git check-ignore` confirms; `git ls-files test/local` = 0; absent from every pushed commit (verified 2026-09-15 against `origin/main..HEAD`) | closed |
| T-01-13 | Information disclosure | A FAIL in the real-backup block prints rows/dates/notes | medium | mitigate | Extras restricted to numbers, booleans and names; `realMerge` reports differing top-level keys only | closed |
| T-01-14 | Repudiation | A skipped real-data run reported as green | low | mitigate | Separate skip counter, visible SKIP line, skipped count on the summary line; 01-06 required PASS lines | closed |
| T-01-15 | Tampering | `viewSleep` renders note/hours/quality/date from a hand-edited backup as live markup | medium | mitigate | `esc()` on `String(Number(hours))`, `String(Number(quality))`, note, and any non-ISO date; ISO dates go through `fmtDate` behind a regex guard | closed |
| T-01-16 | Tampering | Sleep id interpolated into the delete button's inline `onclick`, where `esc()` does not escape `'` | medium | mitigate | Delete button rendered only when `/^[A-Za-z0-9_-]+$/` matches the id (`index.html` `viewSleep`); quote-bearing id tested | closed |
| T-01-17 | Tampering | Older cached build carries `sleep` wholesale and drops rows | medium | mitigate | SCHEMA 18 + `remoteTooNew()` — an older build never pushes over a newer blob | closed |
| T-01-18 | Tampering | Migration 18 rewrites existing rows without the REG-16 guards (Migration-15 class) | high | mitigate | `ensureCollectionDefaults()` fills only null/undefined collections; no-rewrite test compares every legacy collection and every `mtime` before/after `normalize` | closed |
| T-01-19 | Information disclosure | Backup contents pasted into a SUMMARY, commit message or chat during verification | high | mitigate | Counts-only protocol; 01-06-SUMMARY holds the PASS line and counts only (row-field grep = 0); file never read into chat | closed |
| T-01-20 | Information disclosure | Backup file sent between devices over an insecure channel | low | accept | See accepted risk AR-02 | closed |
| T-01-21 | Tampering | Deleting legacy code removes the only baseline for spotting a divergent merge | medium | mitigate | 540 goldens committed first (`test/fixtures/merge-golden.json`) and checked every CI run; deletion not performed (deferred by Ian 2026-09-14); git history retains the twins | closed |
| T-01-22 | Tampering | Goldens regenerated from derived code, making every golden check tautological | medium | mitigate | Planned: `golden()` refuses WRITE mode once legacy is deleted — part of 01-07 Task 2, **deferred**. Not live today: with the legacy twins present, WRITE still records from legacy code. Must land in the same change that deletes the legacy functions | open — below high threshold (non-blocking) |
| T-01-23 | Information disclosure | Real-backup output recorded into committed goldens | medium | mitigate | Real-backup block makes no `golden()` call; golden file holds only `^[0-9a-f]{8}$` values (0 non-hash values) | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-01 | T-01-10 | A bad strategy can only reach `mergeCollections` through runtime mutation of the registry: `collectionProblems()` stops such a registry from booting, and the REG-01 snapshot test forbids mutation. If it did happen, the push aborts and local data is untouched. | Ian (plan 01-03 threat model) | 2026-09-11 |
| AR-02 | T-01-20 | Single user moving his own data between his own devices; the plan instructed a private channel he already uses. | Ian (plan 01-06 threat model) | 2026-09-11 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-15 | 23 | 22 | 1 (T-01-22, medium — non-blocking) | /gsd-secure-phase 1 (orchestrator, L1 grep-level; auditor skipped per short-circuit rule: threats_open 0, register authored at plan time, ASVS 1) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-15

**Carry-forward:** T-01-22 must be closed by the change that deletes the legacy functions (01-07 Task 2 / STATE.md Pending Todo): `golden()` must throw in WRITE mode once the legacy twins are gone, with a test.
