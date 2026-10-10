# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — Collections & lockdown

**Shipped:** 2026-10-09
**Phases:** 7 | **Plans:** 33 (72 tasks) | **Commits:** 225 over 30 days (2026-09-10 → 2026-10-09)

### What Was Built

- One `COLLECTIONS` registry that `blank()`, `liveX()`, `validateBackup()` and `mergeDB()` derive
  from, proven by adding `sleep` as the eleventh collection with one entry.
- A Markdown "Export for Claude", derived from the same registry and live views.
- A test-pinned add-a-collection recipe in `CLAUDE.md` plus `docs/adding-a-collection.md`.
- A device-local draft: the in-progress workout never syncs.
- Event delegation: 175 inline handlers became `data-action` behind one dispatcher.
- `.gitattributes` LF in its own commit, and a hash-based CSP live as `f71c6e4`.

### What Worked

- **Differential tests before deletion.** Every replaced data-layer function stayed as a frozen
  `_legacy` twin. The derived version was checked against it over the past incidents, a seeded random
  battery and Ian's real backup (kept local-only). Phase 1, the riskiest phase, shipped with no data
  incident.
- **Tracer-first plans.** Each phase opened with a thin end-to-end slice (a dead-data registry, one
  delegated tab, the stamp move alone), so later waves widened something already working.
- **Red-proven guards.** Tripwires on `DB` replacement, a draft-pusher allowlist, the delegation
  ratchet and the CSP hash check were each shown to fail before being trusted. Several first drafts
  passed vacuously until a mutation pass caught them.
- **One revertable unit per risky change.** The stamp move shipped alone before the CSP, and the CSP
  shipped as a single commit. When 07-05 failed live, the revert was clean and the re-ship was
  patch-identical.
- **Cold rehearsal of documentation.** Dry Run B walked the recipe for a real `supplements`
  collection and found 8 gaps that the machine-verified probe could not see.

### What Was Inefficient

- **A live-only CSP failure.** 07-05 passed every localhost check, then hit a `manifest-src` violation
  on the live URL. Localhost delivered the page in one write and hid a fetch that raced the inline
  script. Two extra gap plans (07-06, 07-07) and a revert followed.
- **Windows path length.** It broke a rehearsal clone (06-01, 06-02) and the headless-Chrome probe
  profile (07-04) before the cause was recognised each time.
- **Human-gated plans spanned days.** 07-02 and 07-07 waited on Ian's pushes and device checks, and
  phase 6's UAT result sat unrecorded for a week.
- **Bookkeeping drift.** Several SUMMARY files lack `requirements-completed`, five of seven phases
  never ran Nyquist validation, phases 4 and 7 have no SECURITY.md, and the phase-6 verification
  needed canonicalising after UAT.
- **A test harness that hid a real bug.** The never-settling `fetch` added in 04-01 fixed the suite
  but masked the offline weather retry loop, which is still in the app.

### Patterns Established

- A rule that cost data goes into `CLAUDE.md` together with a structural test that asserts the
  property, never the wording.
- Every statement that replaces `DB` reads `keepLocalDraft(normalize(stripDraft(raw)))`, and a
  tripwire names any new one.
- Controls carry `data-action` plus escaped `data-*`, and a hostile-value test proves each new id
  inert.
- CSP probes run on desktop and Android user agents at both delivery speeds (`SLOW_MS=3000`), with a
  short `--user-data-dir`.
- Revert risky changes on `main`, never hotfix forward. Name the revert target in STATE.

### Key Lessons

1. Test the delivery conditions production actually has. A one-write localhost hides races that a
   split, slow delivery exposes.
2. When a test harness stub fixes a hang, log the app bug it hides as debt right away and schedule
   the real fix. The stub is not the fix.
3. Record human UAT results and requirement credit in the same sitting as the check, or the
   milestone audit has to reconstruct them.
4. A probe that passes is not proof that documentation is complete. Only a cold walk-through by
   someone without the context finds the missing steps.
5. Keep Windows path length in mind for any scratch clone or browser profile. Default to short
   paths.

### Cost Observations

- Model mix: not tracked this milestone
- Sessions: not tracked; human-gated plans (07-02, 07-07) spanned 2-3 days each
- Notable: most plans ran 3-30 minutes of executor time. The outliers were 01-01 (65 min, the
  registry tracer) and 04-02 (97 min, the inbound-path battery).

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | — | 7 | First GSD milestone: tracer-first plans, differential tests before deletion, red-proven structural guards |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | 928 passed / 0 failed / 2 skipped (from 226) | not measured | 1 (`scripts/csp-hash.js`, zero-dependency) |

### Top Lessons (Verified Across Milestones)

1. (To be confirmed by v1.1) Differential-test a replacement against its frozen predecessor before
   deleting anything that touches merge or migration code.
2. (To be confirmed by v1.1) Ship each risky change as one revertable unit and rehearse the revert.
