---
phase: 03
slug: f3-adding-a-new-tracked-thing-recipe
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-09-22
---

# Phase 03 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Register authored at plan time (all five plans carry a `<threat_model>`); verified at ASVS L1 (grep depth).

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| recipe docs → future authors | `CLAUDE.md` and `docs/adding-a-collection.md` are copied by whoever adds the next collection | Code patterns (escaping, delete, save); a wrong pattern propagates into `index.html` |
| repo → public site | The repo and the Pages site are public | Anything written into docs/fixtures, so no real user data may land there |
| test harness → `index.html` source | Test transforms rewrite the inline script in memory | Source text only, test process only |
| scratch branch → `main` | Dry Run B wrote a real `SCHEMA` bump on a throwaway branch | Schema number (one-way if shipped) |
| shared git stash → other worktrees | The stash stack is shared across worktrees | Uncommitted work |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-3-01 | Tampering | recipe UI step: a copied inline delete handler | high | mitigate | The doc states the safe-id gate as a bolded rule, with the reason (`docs/adding-a-collection.md:142-144`). The map pattern notes the gate doesn't apply (:163). | closed |
| T-3-02 | Information Disclosure | sample rows, fixtures, rehearsal record | medium | mitigate | Only synthetic or placeholder examples; no backup rows in the doc. Probe values are invented (`test/app.test.js:1609`, `:1681`). | closed |
| T-3-03 | Tampering (integrity) | a copy-pasted entry reusing a `label` | low | accept | `collectionProblems()` refuses duplicate labels at boot (`index.html:4074`) | closed |
| T-3-04 | Tampering | the fenced-block extractor (`docBlock`) | medium | mitigate | A single shared extractor (`test/app.test.js:2171`). A missing marker fails explicitly. | closed |
| T-3-05 | Tampering | non-ASCII characters in the contract blocks | medium | mitigate | ASCII-identifier assertion (`test/app.test.js:2276-2278`) | closed |
| T-3-06 | Tampering | `recipeProbeTransform` rewriting the inline script | medium | mitigate | Byte-exact reconstruction check (`test/app.test.js:1614-1617`). `recipeProbeMap` appears 0 times in `index.html`. | closed |
| T-3-07 | Tampering | cross-block instance mutation | medium | mitigate | `recipeProbe.DB` is set explicitly before the export read (`:1681`). SLEEP-05 and EXP-02 PASS lines are still green (748/0). | closed |
| T-3-08 | DoS (data integrity) | a map merge that unions inner keys | high | mitigate | Explicit-false and absent-key replays, run in both merge orderings (Dry Run A block; `:741-744`) | closed |
| T-3-09 | Tampering | the recipe teaching a hard delete or a blind write | high | mitigate | The doc says to soft-delete via `softDelete()` and never splice (:112, :135). It also says `save()` versus `saveLocal()` (:133). | closed |
| T-3-10 | Spoofing | a quote that claims to be verbatim but isn't | high | mitigate | Marker-sourced containment check, with a 200-char floor and required `MIGRATIONS` and `blank(` (`test/app.test.js:1886-1913`) | closed |
| T-3-11 | Elevation of Privilege | `new Function` on a doc block | medium | mitigate | Confined to a single `return (…)` expression with one injected identifier, in the test process only (`test/app.test.js:2292`). Never loaded by the app. | closed |
| T-3-12 | Tampering | rehearsal `SCHEMA` bump reaching a shipped branch | high | mitigate | No `dry-run-b` branch remains (local or remote). No surviving commit mentions `supplements`. SHA-256 byte-identity was recorded in 03-05-SUMMARY. | closed |
| T-3-13 | Tampering | `git stash` colliding with another worktree | medium | mitigate | Plans forbid stash; the stash list is empty | closed |
| T-3-SC | Tampering | package installs | high | accept | `package.json` declares no dependencies; no install task in any plan | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-3-01 | T-3-03 | Boot-time label-uniqueness check already refuses the mistake loudly; the recipe names the rule | plan 03-03 (plan-time) | 2026-09-21 |
| AR-3-02 | T-3-SC | Zero-dependency project; no install path exists in this phase | plans 03-01..05 (plan-time) | 2026-09-21 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-22 | 14 | 14 | 0 | gsd-secure-phase orchestrator (L1 grep evidence; auditor skipped per short-circuit rule) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-22
