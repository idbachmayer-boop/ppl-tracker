---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 07
current_phase_name: content-security-policy
status: executing
stopped_at: 07-05 Task 3 failed (live manifest-src violation); revert of ebc5723 recommended, awaiting Ian
last_updated: "2026-10-05T11:49:19.094Z"
last_activity: 2026-10-05
last_activity_desc: 07-05 Task 3 failed (live manifest-src CSP violation), revert of ebc5723 recommended
progress:
  total_phases: 7
  completed_phases: 6
  total_plans: 31
  completed_plans: 30
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-09-22)

**Core value:** The data Ian has already logged must never be lost, corrupted, or resurrected after deletion — every other feature can fail before that one does.
**Current focus:** Phase 07 — content-security-policy

## Current Position

Phase: 07 (content-security-policy) — EXECUTING
Plan: 5 of 5
Status: Gaps — CSP reverted on main 2026-10-06 (a122a2e) after a live manifest-src violation; needs gap-closure plan before re-ship
Last activity: 2026-10-06 — CSP reverted on main (a122a2e); stamp move stays live

Progress: [██████████] 97%

## Performance Metrics

**Velocity:**

- Total plans completed: 24
- Average duration: - min
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 7 | - | - |
| 02 | 3 | - | - |
| 03 | 5 | - | - |
| 04 | 3 | - | - |
| 05 | 6 | - | - |

**Recent Trend:**

- Last 5 plans: none yet
- Trend: N/A

*Updated after each plan completion*
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 01 P01 | 65min | 2 tasks | 3 files |
| Phase 01 P02 | 15min | 3 tasks | 3 files |
| Phase 01 P03 | ~20min | 2 tasks | 3 files |
| Phase 01 P04 | ~50min | 2 tasks | 2 files |
| Phase 01 P05 | ~50min | 3 tasks | 3 files |
| Phase 01 P06 | ~10min | 2 tasks | 0 files |
| Phase 02 P01 | 22min | 2 tasks | 3 files |
| Phase 02 P02 | ~3min (commit-to-commit) | 2 tasks | 2 files |
| Phase 02 P03 | ~5.5min (commit-to-commit) | 2 tasks | 3 files |
| Phase 03 P01 | ~15min | 2 tasks | 3 files |
| Phase 03 P02 | ~10min | 2 tasks | 1 files |
| Phase 03 P03 | ~9min | 3 tasks | 2 files |
| Phase 03 P04 | ~15min | 2 tasks | 2 files |
| Phase 03 P05 | ~20min | 3 tasks | 2 files |
| Phase 04 P01 | 17min | 2 tasks | 5 files |
| Phase 04 P02 | 97min | 2 tasks | 3 files |
| Phase 04 P03 | 3min | 2 tasks | 4 files |
| Phase 05 P01 | 15min | 3 tasks | 7 files |
| Phase 05 P02 | 16min | 3 tasks | 4 files |
| Phase 05 P03 | 16min | 2 tasks | 4 files |
| Phase 05 P04 | 19min | 2 tasks | 3 files |
| Phase 05 P05 | 27min | 3 tasks | 3 files |
| Phase 05 P06 | 26min | 3 tasks | 7 files |
| Phase 06 P01 | 15min | 2 tasks | 1 files |
| Phase 06 P02 | 12min | 2 tasks | 4 files |
| Phase 07 P01 | 5min | 2 tasks | 4 files |
| Phase 07 P03 | 10 min | 2 tasks | 3 files |
| Phase 07 P02 | ~15min executor (spans 2026-10-02..05, waiting on Ian) | 3 tasks | 0 files |
| Phase 07 P04 | 12 min | 2 tasks | 4 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Phase 1]: `COLLECTIONS` declared before `let DB = load()`, adjacent to `SCHEMA`/`KEY`, before `MIGRATIONS` — values must be literals or hoisted-function references only, never a `const` arrow or a forward `const` reference (TDZ contract from research/SUMMARY.md).
- [Phase 1]: Each hand-written function replaced by the registry (`mergeDB_v0` etc.) is kept renamed and differential-tested against its replacement over a real exported backup plus per-incident synthetic fixtures; legacy is deleted only in a later commit, never the same one.
- [Phase 1]: The `gen`-mismatch wholesale-replace stays a hard early `return` in `mergeDB()`, untouched by the derived per-collection loop — folding it in silently disables "Erase all data" and Import→Replace.
- [Phase 1]: `merge` is an explicit required field on every collection; map collections (`journal`, `mobilityLog`, `lawnLog`) take the whole inner object from the newer side, never a union of inner keys.
- [Phase 1]: A row rewrite is permitted only with all four guards — `touch()`, persist immediately, idempotent, stale-device merge replay test.
- [Phase 1]: The real-backup fixture (REG-13) stays LOCAL ONLY in a git-ignored folder — the repo and the live site are public, so a committed backup would publish Ian's journal, weights and notes. Committed tests use synthetic per-incident fixtures; the real-data differential runs only when the local file is present and skips loudly, never silently, when it is absent. (Ian, 2026-09-11)
- [Phase 1]: Planned without CONTEXT.md and without a UI-SPEC (`--skip-ui`) — the sleep view copies an existing log screen rather than a written design contract. (Ian, 2026-09-11)
- [Phase 7]: Meta CSP has no report-only mode; local DevTools verification against a static file server is the only pre-production check, and cloud sync must be actively confirmed working after the policy goes live, not assumed.
- [Phase 1, plan 01-01]: COLLECTIONS is declared as dead data only in this plan — no consumer (blank, liveX, validateBackup, mergeDB) reads it yet; migration happens one collection per commit in plans 01-02 and 01-03.
- [Phase 1, plan 01-01]: cardio, ideas, todos and hobbyLog deliberately declare no sortBy in COLLECTIONS — the hand-written merge never sorted them, so declaring one would change stored order.
- [Phase 1, plan 01-01]: columns/format validation was deliberately deferred from Task 1 to Task 2 so the module-eval placement contract and merge-strategy refusal could land first, independently of REG-17's export metadata.
- [Phase ?]: REG-08 shape prologue kept as three ordered COLLECTIONS passes (required lists, optional lists, maps) rather than one combined loop, to guarantee legacy fault-precedence regardless of registry declaration order
- [Phase ?]: liveOf(name) throws on an undeclared/non-soft-list name instead of defaulting to permissive behavior, closing the gap Pitfall 6 warned about
- [Phase ?]: [Phase 1, plan 01-03]: mergeDB_legacy copies the pre-phase mergeDB verbatim (comments included) with the single sanctioned edit blank() -> blank_legacy(), preserving the exact historical code the incidents were fixed against.
- [Phase ?]: [Phase 1, plan 01-03]: Sort invariants (weights/petWeights by date, sessions via sessionSort) moved into mergeCollections, dispatched from each COLLECTIONS entry's declared sortBy, rather than staying hand-written in mergeDB -- a deliberate departure from 01-PATTERNS.md so plan 01-05's sleep collection needs no mergeDB edit.
- [Phase ?]: [Phase 1, plan 01-03]: ROW_FOR's row factories are keyed by exactly the fields each list's real key function reads, so the REG-13 fixtures exercise the actual sessKey/cardioKey/ideaKey/todoKey/hobbyKey composite-key logic rather than bypassing it.
- [Phase ?]: [Phase 1, plan 01-04]: Property tests for the merge (idempotence/commutativity/associativity) are written at the mergeDB() level, never on raw mergeUnion/mergeDateMap — per PITFALLS Pitfall 5, only mergeDB owns recomputing which side is newer.
- [Phase ?]: [Phase 1, plan 01-04]: Map collections (mobilityLog, lawnLog) are not associative today because a map day carries no per-day mtime; documented via a fixed counterexample rather than patched, per PITFALLS Pitfall 5 and the plan's explicit prohibition.
- [Phase ?]: [Phase 1, plan 01-05]: sleep is declared last in COLLECTIONS on one line, keeping every existing collection's validation precedence and merge order unchanged, verified by a structural test rather than only by placement.
- [Phase ?]: [Phase 1, plan 01-05]: SLEEP-02 confirmed by Ian, 2026-09-12 — the sleep form conventions (date defaults to today, hours 0-24 in 0.25 steps, quality integer 1-5 default 3, optional trimmed note, multiple entries per date via id key) are no longer an open flagged assumption.
- [Phase ?]: [Phase 1, plan 01-05]: SLEEP-05's proof boots a fresh probe instance via test/harness.js's opts.transform rather than adding a permanent fixture collection to the real registry, since existing devices only ever gain a collection through the SCHEMA/MIGRATIONS ritual, never through a derived consumer.
- [Phase 1, plan 01-06]: REG-13's real-backup differential ran to completion over Ian's actual exported backup (225602 bytes, _schema 17) on 2026-09-14 — 30 real-backup PASS lines, 0 FAIL, suite at 653 passed / 0 failed / 0 skipped. Plan 01-07's legacy-function deletion precondition is now met.
- [Phase 1, plan 01-05]: SLEEP-02's form conventions (date defaults to today; hours >0 and <=24 in 0.25 steps; quality 1–5 default 3; note optional and trimmed; multiple entries per date) confirmed by Ian at the Task 2 visual checkpoint. (Ian, 2026-09-12)
- [Phase 1, plan 01-07]: Legacy-function deletion (REG-14, Task 2) DEFERRED — "keep for now". The precondition is met, but the ten `_legacy` twins stay until SCHEMA 18 has shipped and run on the phone for a few days. Task 1's 540 goldens are committed, so the differential outlives the legacy code whenever it goes. REG-14 holds: nothing was deleted early. (Ian, 2026-09-14)
- [Phase ?]: [Phase 2, plan 02-01]: COLLECTIONS.columns promoted in place to {field,label,unit}[] rather than a parallel label/unit map (D-08); Task 1's collectionProblems() rewrite already satisfied every Task 2 behavior bullet, so Task 2 landed as test-only coverage.
- [Phase ?]: [Phase 2, plan 02-02]: dayFlagRows' bookkeeping-key filter and strict-true filter are two chained .filter() calls, never folded into one condition (RESEARCH Pitfall 3)
- [Phase ?]: [Phase 2, plan 02-02]: COLLECTIONS.cardio's columns array is reformatted across multiple lines (unlike every other one-line entry) so each zeroIsMissing:true declaration is independently greppable
- [Phase ?]: [Phase 2, plan 02-03]: buildMarkdownExport() computes every section's {spec,rows} exactly once; both the header's date-range/row-count line and the tables read from that same array (EXP-08 concurrency)
- [Phase ?]: [Phase 2, plan 02-03]: exportMarkdown() returns 'share' as soon as navigator.share() is called, regardless of eventual resolution; exportShareFailed() is the single funnel for every non-cancel outcome (D-01)
- [Phase ?]: [Phase 3, plan 03-01]: docs/adding-a-collection.md states no field count in prose (03-RESEARCH.md's '9 items; 10 array entries' note was a miscount); the divergence test compares sets, so no number is needed.
- [Phase ?]: [Phase 3, plan 03-01]: CLAUDE.md's new 'Adding a new tracked thing' section carries only step 1 in this plan; remaining numbered steps deferred to plan 03-03 per the plan's explicit scope boundary.
- [Phase ?]: [Phase 3, plan 03-02]: recipeProbeMap is its own independent Dry Run A probe (separate transform/line/instance from SLEEP-05's probe/probeList/probeMap), preserving SLEEP-05's own 'two lines added' reconstruction assertion.
- [Phase ?]: [Phase 3, plan 03-02]: Dry Run A's mergeDB() fixtures vary a top-level updatedAt, not a per-day mtime, matching how mergeDateMap()'s replace-whole branch is actually driven; DOC-04's data-layer half is proven, Dry Run B (plan 03-05) covers the remaining UI step.
- [Phase ?]: [Phase 3, plan 03-03]: CLAUDE.md's step 4 required-test categories and docs/adding-a-collection.md's test-walkthrough subheadings are matched one-for-one, in order, so the spine and companion doc cannot silently drift into different category counts.
- [Phase ?]: [Phase 3, plan 03-03]: the copy-paste example registry entry uses placeholder label 'REPLACE ME' rather than a plausible real collection name, to avoid implying a decision Ian hasn't made.
- [Phase ?]: [Phase 3, plan 03-04]: Task 1 decision (Ian, 2026-09-21) — option-a: CLAUDE.md quotes index.html's own COLLECTIONS registry comment block verbatim (source path index.html), trimmed to the placement/TDZ sentences only; no looseness note needed since option-a already reads 'after SCHEMA/KEY'.
- [Phase ?]: [Phase 3, plan 03-04]: docBlock() generalized to take a fence language tag rather than adding a second fenced-block extractor for the js-fenced copy-paste registry entry.
- [Phase ?]: [Phase 3, plan 03-05]: Dry Run B's cold walk found 8 recipe gaps — most consequential: bumping SCHEMA silently stales the committed merge-golden.json fixture and the INTRODUCED_AT boot table, and the hand-written-UI pattern (generalized from sleep) was wrong for a map collection. All closed in CLAUDE.md/docs/adding-a-collection.md; npm test stayed at the 748/0/2 baseline throughout.
- [Phase ?]: [Phase 3, plan 03-05]: RESEARCH.md Q1 (preserve scratch-branch diff vs. narrative record) left at its default — narrative record — per the plan; surfaced for Ian rather than decided silently.
- [Phase ?]: [Phase 4, plan 04-01]: the draft is removed from every mergeDB result and reattached from this device in adoptMerged(); snapshots, cloud versions and backups exclude it
- [Phase ?]: [Phase 4, plan 04-01]: test harness fetch never settles, because a rejecting fetch spun an endless Lawn-tab weather retry in microtasks once async checks existed
- [Phase ?]: 04-02: every site turning foreign data into DB reads keepLocalDraft(normalize(stripDraft(raw))); a dbAssignLines tripwire fails the suite on any unsanctioned DB assignment
- [Phase ?]: 04-03: every draft-only function uses saveLocal(); only pickEx, exPick and finishWorkout still save() from a draft path, pinned by the DRAFT_PUSHERS allowlist
- [Phase ?]: 05-01: ACTIONS is event-keyed (name -> {event: wrapper}); dispatchAction uses an own-key lookup; five non-passive document listeners; no boot-time validator
- [Phase ?]: 05-01: the inventory ratchet matches callees as whole identifiers, and the dispatcher test poisons Object.prototype, because the mutation pass showed the substring and inherited-name forms passed vacuously
- [Phase ?]: 05-01: F2 source checks read a fresh loadApp instance (f2app); f2Corpus() is cached on the function so later plans append states without a TDZ risk
- [Phase ?]: 05-02: Settings and Ideas delegated; idea/exercise/cloud-version ids travel as data-id="${esc(id)}" and a hostile-id test proves each inert. The export-placement test counts controls whose action calls exportMarkdown instead of matching markup text
- [Phase ?]: 05-02: the Ideas backdrop keeps its div exception with the e.target===el guard in its wrapper; trash and versions headers are <button class="row tap"> with block spans
- [Phase ?]: 05-03: the enter action runs data-enter's target only if both the entry and its click are OWN properties (the plan's form read click through the prototype)
- [Phase ?]: 05-03: the DELEG-03 ratchet counts wiring sites per mapped row, so a surviving same-name sibling cannot hide a dropped control
- [Phase ?]: 05-04: a shared action whose other consumer lands in a later plan gets a stand-in-element check for that consumer's call shape (logPetWeight with no data-date-el)
- [Phase ?]: 05-04: attribute values outside data-* that a plan escapes (D-09) get a hostile-value check; the D-03 check reads data-* only
- [Phase ?]: 05-05: rows sharing handler text in one function convert in the same task, because the DELEG-03 ratchet counts inline occurrences (the week link and the evening week card)
- [Phase ?]: 05-05: evening-only Today markup is reached with a per-instance clock (f2Evening), never by moving the shared frozen clock
- [Phase ?]: 05-06: the DELEG-03 ratchet counts wiring sites per event (max over events), so one element whose action handles two events (stopwatch pointerdown+click, weight input+change) is one site
- [Phase ?]: 05-06: every Log-tab and accessory control is pinned by an exact-arguments sweep (spy every callee, fire each rendered control once, compare the full call map)
- [Phase ?]: 06-01: .gitattributes (* text=auto eol=lf) committed alone as C1 17b5a66; no whole-file diff because every blob was already LF; index.html blob unchanged so no sw.js bump
- [Phase ?]: 06-01: other checkouts refresh to LF with lf-refresh.sh (park in a commit object, never git stash); script is in 06-01-SUMMARY.md Follow-ups
- [Phase ?]: 06-02: the REPO-01 suite check asks git (check-attr eol, show :index.html) and never reads .gitattributes; a missing git or repository is a FAIL, never a skip
- [Phase 07]: 07-01: the build stamp lives in <meta name="ppl-build"> in <head>; BUILD reads it at boot, so the deploy sed never touches the hashed inline script (D-08)
- [Phase 07]: 07-01: deployStamp() replays the deploy job's own sed and throws on anything it cannot model, so a workflow edit fails the suite instead of drifting
- [Phase 07]: 07-01: deployable unit (D-09) is 6f5365419670a8c0479e40e65ff3ca0c2f924e2c, stamp move only, no CSP code
- [Phase 07]: 07-03: csp-hash CLI refuses any flag but --check, so a typo never falls through to the rewrite
- [Phase 07]: 07-03: --check reports two sha256 tokens as ambiguous (found 2), not stale, since csp:hash refuses that page
- [Phase 07]: 07-02: stamp move shipped alone as merge commit 58d8988 (PR #10); PC and phone read 58d8988; live inline script byte-identical to repo, so the D-09 gate is passed and CSP code may be pushed
- [Phase 7, plan 07-04]: the CSP ships as one commit ebc5723 (revert target); policy exactly as RESEARCH verified, with hash-only script-src plus exact SDK and mobile auth-loader paths
- [Phase 7, plan 07-04]: the headless-Chrome service-worker abort is Windows path length in the Chrome profile (212+ chars aborts), not CSP; probes need a short --user-data-dir

### Pending Todos

- [Phase 1, plan 01-07 Task 2]: Delete the ten legacy data-layer functions once SCHEMA 18 has shipped and been used on the phone for a few days (Ian's call, 2026-09-14). Precondition already met (01-06 PASS). Follow 01-07-PLAN.md Task 2 exactly: own commit, retarget synthetic differentials to the goldens, make golden() refuse regeneration, convert the real-backup block to invariants, add the "legacy scaffolding is gone" check.

### Blockers/Concerns

- [Phase 1]: Highest-risk phase in the milestone — the only one touching the merge/soft-delete/migration code paths that already caused the 2026-07-25 blind-write and Migration-15 incidents. Do not relax the differential-test-before-delete discipline under time pressure.
- [Phase 1]: The planner's two flagged items are resolved — SLEEP-02 confirmed (2026-09-12), REG-14 deletion deferred by Ian (2026-09-14; see Decisions and Pending Todos). The planner also documented a pre-existing gap: the three date-keyed map collections are not order-independent across three devices, because a day carries no timestamp of its own. Plan 01-04 records it and does not change behaviour.
- [Phase 1]: Shipping SCHEMA 18 is one-way — the cloud copy is stamped 18 and older builds refuse to sync. No plan pushes to `main`; the code goes through a PR after the phase.
- [Phase 7]: A CSP that blocks `gstatic.com` fails silently — the app keeps working on localStorage with cloud sync dead and no visible error. Verify sync explicitly after the policy ships.
- [Phase 7]: 2026-10-05 the live CSP blocked the early fetch of `<link rel="manifest" href="#">` (manifest-src blob: only); localhost checks never saw it. Reverted 2026-10-06. Re-ship must fix the placeholder and probe the live URL before judging go-live.
- 07-05 Task 3 FAILED: live URL shows one CSP violation (manifest-src blocks the <link rel=manifest href="#"> placeholder fetch of the page URL). Bytes/policy/stamp checks pass; app boots, SW ready. Plan rule: revert ebc5723 on main (git revert --no-edit ebc57234a496f73df95e828a57412c44ddb52031, push). Ian decides; executor reverted nothing.

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| Validation | VAL-01, VAL-02 (backup type checks; attribute escaping) | Deferred to v2 | 2026-09-10 |
| Export | EXP-09 (recent-detail-plus-aggregate windowing) | Deferred to v2 | 2026-09-10 |
| Deploy | DEPLOY-01 (CI publishes served surface only) | Deferred to v2 | 2026-09-10 |

## Session Continuity

Last session: 2026-10-05T11:49:19.069Z
Stopped at: 07-05 Task 3 failed (live manifest-src violation); revert of ebc5723 recommended, awaiting Ian
Resume file: .planning/phases/07-content-security-policy/07-05-SUMMARY.md
