---
phase: 3
slug: f3-adding-a-new-tracked-thing-recipe
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-20
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Seeded from `03-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js native, custom harness — no external test runner |
| **Config file** | none — `test/harness.js` is the harness, `test/app.test.js` is the suite |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` (this repo has one suite; there is no split unit/integration invocation) |
| **Estimated runtime** | ~2 seconds (721 passed / 0 failed / 2 skipped at research time, 2026-09-20) |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm test` (same suite — no separate full-suite invocation exists)
- **Before `/gsd-verify-work`:** Full suite must be green, per `CLAUDE.md` § "Before every push"
- **Max feedback latency:** ~2 seconds

---

## Per-Task Verification Map

*Seeded as draft — the planner fills task IDs, and `/gsd-validate-phase` sets final status.*

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | DOC-01 | — | N/A | structural (partial) | `npm test` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | DOC-02 | — | N/A | human-judgment | — (reviewer checks the quote against `index.html`'s comment block) | n/a | ⬜ pending |
| TBD | TBD | TBD | DOC-03 | — | N/A | structural + human-judgment | `npm test` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | DOC-04 | T-3-01 | Safe-id gate carried into the recipe's UI step | structural + manual | `npm test` (Dry run A) | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] A new `test/app.test.js` block asserting DOC-03's docs-match-registry field coverage (D-03's
      core deliverable — Shape A and/or Shape B from `03-RESEARCH.md` § Q2). Does not exist yet.
- [ ] A `test/harness.js` / `test/app.test.js` extension for Dry run A — a new map-shaped probe
      under a name distinct from SLEEP-05's existing `probeMap`, if the planner adopts the § Q3
      recommendation to keep a permanent probe-based dry run alongside the one-time walkthrough.
- [ ] No framework install needed — `node test/app.test.js` already runs with zero setup.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| The placement rule is stated **verbatim** in `CLAUDE.md` | DOC-02 | A test cannot assert prose equals prose without the exact-wording trap D-03 forbids — the `firestore.rules` lesson in `CLAUDE.md` § Conventions records what happens when a test pins wording | Reviewer diffs the recipe's quoted placement rule against `index.html`'s own `COLLECTIONS` comment block. They must match character for character; any deviation is a defect in the recipe, not the code. |
| The recipe's test list actually *names* the required categories (as opposed to merely covering the registry's fields) | DOC-03 | The structural test covers field coverage; whether a human reading the list understands which tests to write is a comprehension claim | Reviewer confirms the spine's test list names each category, including the stale-device merge replay, in language a reader can act on without opening `test/app.test.js`. |
| Dry run B — a human follows the recipe cold for a non-`sleep` collection | DOC-04 | Inherently a human-comprehension claim about prose. `npm test` passing proves the *resulting code* is correct, not that the *recipe text* got the human there without outside knowledge. Deliberately never merged, so it cannot be automated by definition. | Follow only what is written in `CLAUDE.md` + `docs/adding-a-collection.md`, on a scratch branch, for a map-shaped collection. Note **every** place you had to guess or open `index.html` directly. Each such place is a gap in the recipe. Run `npm test` at the end — necessary but not sufficient evidence. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

---

## Note on DOC-04's ceiling

A test proves the *data layer* claim exhaustively — "every derived consumer picks up a map-shaped
collection from its declaration alone" is exactly what SLEEP-05's existing probe pattern
machine-verifies, with no human judgment involved. A test **cannot** prove "the recipe, read cold by
someone who didn't write it, produces the correct result with no step missing, wrong, or requiring
outside knowledge." The manual-only row above is the honest ceiling, not a gap to be closed later.
