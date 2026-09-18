# Project Research Summary

**Project:** ppl-tracker -- declarative collection registry milestone
**Domain:** Single-file, no-build, offline-first PWA; sync-backed personal data layer refactor
**Researched:** 2026-09-10
**Confidence:** HIGH overall -- the highest-stakes findings (TDZ placement, merge-law hazards, CSP scope) are grounded directly in this repos own code and incident history, not general best practice.

## Executive Summary

The four research passes agree on the shape of the work and converge on one non-negotiable finding: F1s real risk is not writing COLLECTIONS, its deleting the hand-written functions it replaces before proving byte-identical behavior against real production data. mergeDB()s gen-mismatch wholesale-replace short-circuit, the map-collection "absence never means off" rule, and per-collection key/identity fallbacks are all currently correct by virtue of hand-written special-casing that a naive declarative loop will not reproduce by default -- each has already caused a real incident once. The prevention is the same in every case: keep the old functions renamed (mergeDB_v0, etc.), run a differential test against a real exported-data fixture and a battery of synthetic two-device fixtures, and only delete the old code once that test has been green through a review cycle -- never in the same commit that introduces the new capability.

The second load-bearing finding is mechanical rather than architectural: COLLECTIONS must be a pure-literal object declared before let DB = load() (next to SCHEMA), because normalize() runs synchronously at module-eval time and any value referencing a not-yet-initialized const throws a silent, catch-swallowed ReferenceError that still advances _schema -- this is exactly how Migration 15 was lost. Every value inside the object must be a literal or a reference to a hoisted function declaration, never a const arrow or another const.

The third finding reframes what "CSP" can mean on this app: because GitHub Pages only supports meta-based CSP (no headers, no report-only mode, no frame-ancestors/report-uri), and because the app loads three Firebase SDK scripts from gstatic.com and carries hundreds of inline style attributes that are explicitly out of scope to remove, the realistic end state is a hash-based script-src (after F2 removes inline handlers) with gstatic.com explicitly allow-listed and style-src unsafe-inline kept permanently. A CSP that blocks Firebase fails silently -- the app keeps working on localStorage with no visible error -- which is the single most dangerous failure mode in this milestone given cloud sync is the only off-device backup.

## Key Findings

### Recommended Stack

Every recommendation is browser-native with zero dependencies: a plain-object COLLECTIONS registry, hash-based CSP via meta tag, native event delegation (addEventListener + closest() + dataset), and a hand-written ~20-line Markdown table builder. Libraries considered and explicitly rejected: Zod/Valibot/Standard Schema (npm artifacts requiring vendoring or a build step, both against PROJECT.md), markdown-table (trivial to hand-write for ~10 collections), DOMPurify (existing esc() convention already covers this, out of scope for this milestone).

Core technologies:
- const COLLECTIONS = {...} -- single source of truth for blank(), mergeDB(), liveX(), validateBackup(), and the exporter -- data-only, so it is immune to TDZ if declared correctly
- Hash-based CSP (sha256-... in script-src) -- the only CSP mechanism compatible with GitHub Pages static hosting and this apps single inline script tag
- closest('[data-action]') delegation -- one listener per bubbling event type, covers all 172 inline handler attributes (140 onclick, 14 onchange, 13 oninput, 3 onkeydown, 2 onpointerdown -- all bubble)
- Second localStorage key or excluded top-level field for draft -- same pattern already used for wx (weather cache), no new API needed

### Expected Features

Must have (table stakes):
- Export: one flat Markdown table per list-shaped collection, one row per atomic observation (a set, not a session), driven by COLLECTIONS
- Export: live rows only (soft-deleted filtered via the same liveX() path views use -- never raw DB[key]), ids and deletedAt stripped
- Export: ISO dates, units in column headers once, a consistent missing-value marker (never a blank cell or a silent 0)
- Export: short header block (what/when/row-range) -- supports "eyeballable before pasting" and prevents a partial file being mistaken for complete history
- Sleep: { id, date, hours, quality, note }, soft-deletable, sorted by date -- confirmed against the Consensus Sleep Diary as the two fields people can actually self-report accurately; quality stored as integer 1-5, labeled in UI

Should have (competitive): none flagged -- this milestones scope is intentionally narrow and the researchers found nothing worth adding beyond what PROJECT.md already decided.

Defer (v2+):
- Recent-detail-plus-aggregate windowing in the export -- not derivable from COLLECTIONS the way flattening is (aggregation rules are inherently per-collection); irrelevant at 47 days of one-person data volume anyway

Explicit anti-features (do not build, and would conflict with PROJECT.md if proposed): in-app sleep/training/weight correlation charts, an automatic summarization/rollup engine in the export, sleep sensor fields (HR/HRV/stages), separate bedtime/waketime fields, a structured sleep-disruption tag picker, an export configuration screen, a round-trippable/re-importable export format, live/automatic export delivery (API push, scheduled email, MCP connector), and sleep-logging reminders. All of these would either recreate the "sixth place the schema lives" bug pattern or add scope PROJECT.mds Out of Scope list already rejects (see Flags section below).

### Architecture Approach

F1 derives four of the five places a collections rules currently live -- blank(), mergeDB(), the liveX() family, validateBackup() -- from one COLLECTIONS declaration; MIGRATIONS stays deliberately hand-written (it describes historical transformations, not steady-state shape, and trying to derive it would either constrain future migrations or bloat the registry with one-time fields). The registry uses strings for the common case (key: 'id', sortBy: 'date') with a named-function-reference escape hatch for composites (cardioKey, sessionSort), and a small merge: 'union-by-key' | 'replace-whole' | 'line-union' string enum resolved through a STRATEGIES lookup table -- chosen specifically because the actual production bug this milestone exists to prevent (mobilityLog forgetting its merge rule) was an omission problem, and a named enum makes omission visible in a grep, where an inline bespoke function does not.

Major components:
1. COLLECTIONS (new, pure-literal, declared before MIGRATIONS) -- the one declaration of kind/key/sortBy/merge/soft/required per collection
2. Strategy functions (existing + promoted to function declarations) -- the actual merge/identity/sort algorithms, unchanged behavior
3. Derived consumers (blank(), liveOf() + thin named wrappers, mergeCollections(), validateBackup()s shape prologue, toMarkdown()) -- each a small function reading COLLECTIONS at call time, never at module-eval time except where explicitly proven safe

Migration order (strangler-fig, one consumer per commit, each independently shippable): COLLECTIONS as dead data -> blank() -> liveX() -> validateBackup() shape prologue -> mergeCollections() (highest risk, side-by-side with mergeDB_legacy for one commit) -> delete legacy. This order is deliberately cheapest-first, riskiest-last.

### Critical Pitfalls

1. The gen-mismatch wholesale-replace short-circuit gets folded into the generic per-collection loop -- silently disables Erase-All-Data and Import->Replace, which already happened once in this exact codebase before gen existed. Prevention: keep the gen check as an explicit early return, untouched by the COLLECTIONS-driven loop; test with a fixture that simulates a fresh Erase and asserts zero unioned survivors from the losing side.
2. Map-shaped collections (journal, mobilityLog, lawnLog) default to union-of-keys instead of whole-object-newer-wins -- resurrects "off" forever, undetectable on one device, only surfaces on a two-device sync weeks later. Prevention: make mergeStrategy an explicit required field with no inferred default; throw at eval time if a map collection omits it; test explicit-false vs. absent-key merge both directions.
3. Deleting the hand-written merge/validate/filter functions before proving equivalence -- the single highest-leverage prevention in the whole research set; a green test suite after deletion proves the new code does not repeat documented incidents, not that it is behaviorally identical on the long tail of real data. Prevention: golden test against a real exported-data fixture, differential test old-vs-new (renamed _v0) over synthetic two-device fixtures per known incident, delete only after a review cycle.
4. CSP rollout silently kills the only off-device backup -- a script-src 'self' policy blocks all three gstatic.com Firebase scripts with zero visible error; the app keeps working perfectly on localStorage while sync silently dies. Prevention: build the CSP host list from a grep of the actual file plus Firebases own runtime endpoints, not a template; soak in Report-Only mode first if at all achievable (note: meta CSP has no report-only mode -- see Disagreement below); keep style-src: unsafe-inline as a deliberate, documented decision.
5. Mechanical onclick to delegation conversion silently drops call sites -- the existing test harness is DOM-light and cannot detect a dead button; stopPropagation() breaks delegation with zero signal. Prevention: build a static inventory of all 172 handler attributes before touching anything, then a static completeness cross-check (inventory vs. dispatcher) after -- no DOM simulation needed -- plus a stopPropagation() grep and manual UAT prioritizing the Log tab.

## Module-Eval-Time / TDZ Rule -- concrete placement contract

This is stated identically and independently by STACK.md and ARCHITECTURE.md, cross-verified against the codebases own Migration-15 incident and the MIGRATIONS[13]/migrationRan/SNAP_KEY comments already in index.html.

Where: const COLLECTIONS = {...} must be declared textually before let DB = load() -- specifically, immediately next to SCHEMA/KEY, around index.html:479, before MIGRATIONS. Not "somewhere in the file" -- before the first line that can synchronously reach it.

What may appear as a value inside it: a string, a number, a boolean, or a reference to a function declaration (hoisted). Never a const arrow function, never a reference to another const that has not executed yet.

What may not: any value that closes over or calls a const declared later in the file; any computed/derived value evaluated inline. The existing composite-key arrow consts (sessKey, todoKey, hobbyKey, and cardio/ideas inline arrows) must be promoted from const name = x=>... to function name(x){...} before being referenced from inside COLLECTIONS -- they are currently safe only by accident of file order, and that accident stops being reliable once an eval-time object depends on them.

Why it is safe despite forward references: MIGRATIONS, blank(), and every derived consumer may reference COLLECTIONS freely regardless of where they are textually declared, because function bodies do not execute until called, and nothing calls them before the point in the file normalize() is already called today. blank() only needs spec.kind at eval time -- narrow that surface deliberately rather than making the whole registry earn eval-time safety for consumers (mergeCollections, liveOf, validateBackup) that never run during boot at all.

Verification: add one boot-order regression test asserting loadApp() does not throw for every schema version 1 through current, and that DB[name] exists with the right shape for every name in COLLECTIONS after boot -- this is the mechanical proof the placement rule held, for every future edit, including ones made without a debugger attached.

## What a CSP Can Realistically Be Here

Given the verified facts (three gstatic.com script tags, 419 inline style attributes, GitHub Pages static-only hosting):

- Mechanism: meta http-equiv Content-Security-Policy only -- GitHub Pages has no custom-header support, so nonce-based CSP is not achievable "full stop" (all four researchers agree on this).
- script-src: hash-based (sha256-... of the inline script block), computed manually before each push (recommended default) rather than automated in the deploy workflow (which borders on a build step). Must explicitly allow-list www.gstatic.com for the three Firebase compat SDK scripts, or sync dies silently. connect-src must also cover Firebases runtime endpoints (*.googleapis.com, *.firebaseio.com, identitytoolkit.googleapis.com) and the two Open-Meteo weather hosts -- none of these show up in a static grep of index.html since they are internal to the SDK/fetch calls, so the host inventory must be built by hand, not derived from tooling.
- style-src: must stay unsafe-inline permanently -- inline-style removal is explicitly out of scope, and 419 attributes make hash-per-value impractical. This is a deliberate, documented decision, not an oversight.
- What meta cannot do regardless of policy content: frame-ancestors, report-uri/report-to, sandbox are all silently ignored inside meta; there is no report-only mode via meta (see Disagreement below -- PITFALLS.mds Report-Only recommendation needs reconciling with this fact); coverage starts only at the tags position in head.
- Ordering constraint: hash-based script-src cannot exclude the 172 inline handler attributes without either unsafe-inline (no real XSS protection) or the fragile, Safari-inconsistent unsafe-hashes extension. F2 (event delegation) must land before CSP is meaningfully tightened -- this is exactly why the phase order has CSP depend on F2, not the reverse.

## Disagreements Between Researchers

CSP rollout strategy -- Report-Only soak vs. no report-only mode exists. PITFALLS.mds primary CSP prevention (Pitfall 10) is: ship Content-Security-Policy-Report-Only before Content-Security-Policy, for at least several days of real use. STACK.md states flatly, and correctly per the CSP spec, that meta does not support a report-only mode at all -- Content-Security-Policy-Report-Only is a header-only directive with no meta-tag equivalent, and this app has no server to set headers. These two claims cannot both be followed as written.

Which side is better supported: STACK.mds spec-level claim is correct and directly falsifiable against the CSP spec (confirmed HIGH confidence, cross-checked against MDN/OWASP). PITFALLS.mds underlying concern -- verify the policy does not silently kill sync before it is live in production -- is exactly right and should not be discarded, but the mechanism proposed does not exist for this hosting setup. Resolution for the roadmapper: the actual available substitute is what STACK.md separately recommends: build the CSP directive from a grep-based host inventory (not a template), test locally with a static file server and DevTools console (which prints every violation pre-enforcement, achieving the same goal as Report-Only without the actual Report-Only mechanism), and only push the enforcing meta tag once that local pass is clean. Flag this explicitly in Phase 5 planning so nobody tries to implement a Report-Only meta tag that silently does nothing.

## Recommendations From Research That PROJECT.md Forbids -- Do Not Act On

None of the four researchers recommended anything that crosses PROJECT.mds Out of Scope list outright, but two items are worth flagging so the roadmapper does not drift toward them mid-phase:

- STACK.mds "automated hash injection in GitHub Actions" alternative for CSP hash maintenance -- STACK.md itself flags this as "bordering on a build step," which PROJECT.md explicitly rules out ("Splitting index.html into modules... splitting means a build step"). STACK.mds own recommendation is the manual terminal-command alternative; treat the GitHub Actions option as declined, not a live option, unless raised with Ian directly first.
- PITFALLS.mds Pitfall 6 suggestion of a "generated test per declared collection" implies growing the test suite structurally in step with COLLECTIONS -- this is sound and should be built, but stop short of anything resembling PITFALLS.mds explicitly-rejected "validation DSL for validateBackup()" (Anti-Pattern in ARCHITECTURE.md) -- field-level validators do not belong in COLLECTIONS, full stop, per both ARCHITECTURE.md and PROJECT.mds rejection of "anything not already producing incidents."

No researcher proposed touching sync rewrite, feature removal, auth, layout, or index.html splitting -- all four stayed inside PROJECT.mds fence.

## Implications for Roadmap

The milestones phase order is already fixed by PROJECT.md and confirmed correct by ARCHITECTURE.mds dependency analysis -- no reordering is suggested by any researcher. What follows maps research findings onto that existing order rather than proposing a new one.

### Phase 1: F1 -- COLLECTIONS declaration + derived consumers + sleep
Rationale: Everything else in scope either depends on it directly (export, CLAUDE.md recipe) or is independent of it (draft, delegation, .gitattributes) -- confirmed by ARCHITECTURE.mds dependency graph.
Delivers: COLLECTIONS object; derived blank(), liveX() family, mergeCollections(), validateBackup() shape prologue; the sleep collection as acceptance test.
Addresses: the sleep table-stakes schema from FEATURES.md; the "one line to add a tracked thing" goal.
Avoids: Pitfalls 1-8, 11, 12, 14 -- this phase carries essentially the entire critical-pitfall list. Must include: the gen-mismatch short-circuit staying untouched; explicit required mergeStrategy/soft fields with no default; the golden+differential test methodology (real exported-data fixture + renamed _v0 functions) before any deletion; property tests written at mergeDB() level, never raw mergeUnion(); a go/no-migration decision recorded explicitly if any stored-row reshaping is required; the sleep acceptance test including a synthetic two-device merge round-trip, not just rendering.
Scope note from ARCHITECTURE.md: add the columns/format extension point to COLLECTIONS now, even though toMarkdown() is not built until Phase 2 -- otherwise Phase 2 becomes "extend the registry, then write the exporter" instead of purely the latter.

### Phase 2: Export for Claude
Rationale: Depends on F1s COLLECTIONS (including the columns/format field) to avoid becoming a second hand-written serializer -- the exact anti-pattern this milestone exists to close.
Delivers: toMarkdown(), one table per live collection, ISO dates, units in headers, consistent missing-value marker, short header block.
Addresses: the format-research findings -- Markdown beats CSV/JSON on both token cost and LLM accuracy for this data shape; flat one-row-per-set tables, not wide/nested.
Avoids: Pitfall 13 -- export must route through the same liveX()-equivalent filter views use, never raw DB[key], or soft-deleted rows leak into an LLM-facing document.

### Phase 3: F3 -- CLAUDE.md recipe
Rationale: Depends on F1 and benefits from the export existing, since the recipe documents the registrys final shape including the exports columns field.
Delivers: a documented "add one line to COLLECTIONS, one line to MIGRATIONS, one optional columns line" checklist.
Addresses: F3s stated purpose directly; low research risk -- this is documentation, not code.

### Phase 4: draft becomes device-local
Rationale: No dependency on the registry in either direction (it is a scalar DB field, not a COLLECTIONS entry) -- but has a hard dependency on Phase 1s mergeDB derivation being proven, not just shipped, since this phase edits the merge boundary again.
Delivers: draft excluded from sync (same pattern as wx), with normalizeDraft()s repair guard kept as backstop for at least one migration cycle, plus a one-time cleanup of any stale draft field already sitting in the cloud document.
Avoids: Pitfall 7 -- the "stop syncing forward" mental model ignoring the fields existing footprint in a system designed to union everything it sees; the PWA service-worker caveat (old code may still push draft writes for a window after deploy until the phone is restarted).

### Phase 5: F2 -- event delegation + CSP
Rationale: Independent of the registry; positioned late per PROJECT.mds own ordering, which ARCHITECTURE.md confirms is about risk/diff-size sequencing, not data flow.
Delivers: delegated listener(s) replacing all 172 inline handler attributes; hash-based CSP with gstatic.com allow-listed and style-src: unsafe-inline kept.
Avoids: Pitfall 9 (static inventory-then-completeness-check methodology, closest() not direct event.target reads, stopPropagation() audit) and Pitfall 10 (CSP silently killing the only off-device backup -- build the host allow-list from a grep-based inventory, verify locally with DevTools console before enforcing, since true Report-Only mode is not available here -- see Disagreements above).
Highest-risk half of this phase: the CSP rollout, not the delegation refactor -- a missed handler is annoying; a silently dead sync connection risks the Core Value directly.

### Phase 6: F4 -- .gitattributes
Rationale: Fully independent; alone in its own commit specifically so a 4,131-line reformat diff does not hide a real change. No research risk.

### Research Flags

Needs deeper research during planning: none of the six phases -- all four researchers converged with HIGH confidence on the mechanics for every phase, grounded directly in this codebases own incident history rather than general best practice. The one area flagged MEDIUM (Safaris unsafe-hashes support) is moot given the recommended approach avoids relying on it entirely.

Phases with standard, already-fully-specified patterns: all six. Phase 1 and Phase 5 carry the highest implementation risk (not research risk) -- the testing discipline (golden/differential fixtures for Phase 1, static completeness checks for Phase 5) should be planned as explicit plan steps, not left implicit.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Browser/spec facts verified against MDN/OWASP/GitHub community sources; TDZ mechanics are direct ECMA-262 application, not judgment |
| Features | MEDIUM-HIGH | Export format claims backed by an independent 11-format benchmark (MEDIUM, corroborated); sleep-field research backed by peer-reviewed/validated clinical instruments (HIGH) |
| Architecture | HIGH | Grounded directly in read index.html line numbers, existing test harness, and this repos own incident-history comments |
| Pitfalls | HIGH (codebase-specific) / MEDIUM (general offline-first/CRDT findings) | Every critical pitfall is either a documented past incident in this repo or a directly-reasoned consequence of one; general CRDT/event-delegation claims cross-checked across multiple sources but not project-verified |

Overall confidence: HIGH.

### Gaps to Address

- CSP Report-Only substitute mechanism -- resolved above (Disagreements section) but the roadmapper should carry the resolution (grep-based inventory + local DevTools verification, not a Report-Only meta tag) explicitly into Phase 5s plan rather than let PITFALLS.mds original wording stand unchallenged.
- Whether Phase 1 requires any stored-row reshaping -- PITFALLS.md (Pitfall 8) flags this as a go/no-go decision that must be made explicitly during Phase 1 scoping, before code is written; none of the four researchers could determine this in advance since it depends on the exact COLLECTIONS shape chosen for sessions composite key. Phase 1s plan should state the answer and the check that proved it, not assume "no migration needed."
- iOS Safaris unsafe-hashes support -- noted MEDIUM confidence and explicitly irrelevant to the recommended path (event delegation removes any need for it), but worth a one-line note in Phase 5 planning in case someone is tempted to shortcut F2.
- validateBackup() parity scope -- Pitfall 11 / Phase 1 requires an explicit decision (not an assumption) about whether deep per-row field validation gets ported into COLLECTIONS or stays hand-written alongside the derived shape checks. Either is acceptable; only an unstated gap is not.

## Sources

### Primary (HIGH confidence)
- C:/Users/idbac/Projects/ppl-tracker/index.html -- direct line-level verification of MIGRATIONS, blank(), mergeDB(), mergeUnion()/mergeDateMap(), soft-delete primitives, validateBackup(), Firebase script tags, SCHEMA
- C:/Users/idbac/Projects/ppl-tracker/CLAUDE.md -- incident history (2026-07-25 blind write, Migration 15 silent revert, mobilityLog absence-as-off, escaping holes)
- C:/Users/idbac/Projects/ppl-tracker/.planning/PROJECT.md -- milestone scope, fixed phase order, Out of Scope list, Key Decisions
- C:/Users/idbac/Projects/ppl-tracker/test/harness.js -- existing vm-based test rig, boot path
- MDN -- Content Security Policy (developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP) -- HIGH
- OWASP CSP Cheat Sheet (cheatsheetseries.owasp.org) -- HIGH
- GitHub community discussion -- CSP on GitHub Pages (github.com/orgs/community/discussions/49832) -- HIGH, primary-source confirmation of no custom-header support
- Consensus Sleep Diary (pubmed.ncbi.nlm.nih.gov/22294820) and CSD instrument PDF -- HIGH, validated clinical instrument

### Secondary (MEDIUM confidence)
- Which Table Format Do LLMs Understand Best? (improvingagents.com) -- independent 11-format benchmark, corroborated by community discussion
- javascript.info -- Event delegation -- HIGH on mechanics, standard reference
- CSP hash/meta-tag guides (centralcsp.com, content-security-policy.com) -- third-party summaries, cross-checked against MDN

### Tertiary (LOW-MEDIUM confidence)
- Blog-level sources on Markdown-vs-JSON for LLM embeddings -- directionally consistent with the benchmark above but not independently verified

---
Research completed: 2026-09-10
Ready for roadmap: yes
