---
phase: 02
slug: export-for-claude
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-09-18
---

# Phase 02 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| stored DB → Markdown text | strings in DB may come from a hand-edited backup (`validateBackup` checks shape, not types) or from another device, and they land inside a structured table | Ian's full logged data — sensitive |
| developer edit → COLLECTIONS → export | a column declaration decides what leaves the app; a bad or leaky declaration reaches the phone unless the suite catches it | code |
| app → download / share sheet | the file leaves the app's storage for the device's file system, or for an OS-chosen share target | Ian's full logged data — sensitive |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-02-01 | Tampering | `mdEscape`/`mdCell` — a value holding a pipe, a backslash before a pipe, or a line break could split or forge table rows | medium | mitigate | `mdEscape` doubles the backslash run before every pipe and collapses line-break runs to `<br>`; EXP-07 battery | closed |
| T-02-02 | Information disclosure | a COLLECTIONS column for `id`/`mtime`/`deletedAt` would put internal ids in the file | medium | mitigate | `collectionProblems` refuses those fields; `exportRows` projects only declared fields (EXP-05) | closed |
| T-02-03 | Tampering | an exporter calling `save()` bumps `updatedAt`, making the exporting device look newest to sync (the CLAUDE.md incident class) | high | mitigate | no exporter calls `save`/`saveLocal`/`touch`; static forbidden-token test | closed |
| T-02-04 | Denial of service | module-eval registry validation: a malformed column object throws at boot and kills the app on the phone | high | mitigate | `COLLECTIONS is invalid` throw is exercised by every `loadApp()` test, so a bad registry turns CI red before deploy | closed |
| T-02-05 | Tampering | reusing `esc()` in the exporter would HTML-encode plain text in a file Claude reads as Markdown | low | mitigate | static check forbids `esc(` in every exporter function | closed |
| T-02-06 | Information disclosure | the export path transmitting data itself (network, Firestore) | medium | mitigate | static check forbids `fetch`, `firebase`, `pushNow`, `runTransaction` in every exporter function | closed |
| T-02-07 | Information disclosure | day-flag bookkeeping keys (`__session`, `override*`) leaking into Mobility/Lawn tables | medium | mitigate | `dayFlagRows` filters bookkeeping keys then keeps strictly-`true` values (D-05) | closed |
| T-02-08 | Information disclosure | soft-deleted rows reaching the file | medium | mitigate | `liveOf()` read path plus field projection and internal-field refusal (EXP-04) | closed |
| T-02-09 | Information disclosure | data outside COLLECTIONS (lawn location, pet name, exercise registry, draft, weather cache) reaching the file | high | mitigate | `buildMarkdownExport` iterates only `Object.keys(COLLECTIONS)`; marker test (D-07) | closed |
| T-02-10 | Tampering (integrity) | a skipped day or a "not entered" 0 misreported as real data | low | mitigate | one explicit `(skipped)` row (D-04); `zeroIsMissing` on cardio (D-09) | closed |
| T-02-11 | Denial of service | malformed stored rows reaching the shapers at export time | low | mitigate | `liveOf` empty-array fallback, map non-object guard, shaper guards — **incomplete: `sessionRows` guards the exercise item but not each individual set** | open — below high threshold (non-blocking) |
| T-02-12 | Tampering | an export path writing DB, localStorage or `lastBackupAt` | high | mitigate | no export path touches them; `exportShareFailed` is in the static check's function list (EXP-01) | closed |
| T-02-13 | Repudiation | header counts disagreeing with the tables, so a truncated file reads as complete | medium | mitigate | header and tables read one `sections` array computed once (EXP-08) | closed |
| T-02-14 | Tampering | hostile logged text (CRLF, U+2028/9, emoji, `<script>`) breaking a row | medium | mitigate | full EXP-07 battery over every separator and hostile-value case | closed |
| T-02-15 | Spoofing | the OS share sheet delivering the file to a target the app cannot verify | low | accept | see Accepted Risks Log | closed |
| T-02-16 | Denial of service | a build failure leaving a dead button | low | mitigate | `exportMarkdown` wraps the build in try/catch, shows a toast, shares and downloads nothing | closed |
| T-02-17 | Denial of service | an `await` before `navigator.share` losing the user-gesture context | low | mitigate | `exportMarkdown` is synchronous through the `canShare`/`share` call | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-02-01 | T-02-15 | The OS share sheet shows Ian the target he picks, and this app cannot choose or verify it. The alternative is not offering the share sheet at all, which is the feature. | Ian (02-03 plan decision D-01) | 2026-09-18 |

---

## Open, Tracked (non-blocking)

**T-02-11 — one malformed set aborts the whole export.** `sessionRows`'s `addItem` guards the
exercise item but never guards each `set` before reading `set.w`/`set.r`, so a `null` element
inside a session's `sets` array throws and aborts all eleven sections, not just the offending row.
Reachable only through a hand-edited backup, because `validateBackup` checks shape and not types —
a gap CLAUDE.md already records. `exportMarkdown`'s try/catch bounds the blast radius to a
"Couldn't build the export" toast, so it is not a crash or a dead button. This is the same finding
as `02-REVIEW.md` WR-01. Severity low, below the `high` block threshold.

Same latent pattern, surfaced by the audit and by the code review, not reachable with today's
registry: WR-02 (`collectionProblems` doesn't require a list collection to declare `soft: true`,
while `exportRows` assumes it) and WR-03 (the "`columns[0]` is the date" contract that sorting and
the date range depend on is never validated). Both would break a future collection, not this one.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-18 | 17 | 16 | 1 (low, non-blocking) | gsd-security-auditor |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-18
