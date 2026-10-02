---
phase: 05
slug: f2-event-delegation
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-10-01
---

# Phase 05 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> The register was written at plan time: all six plans carry a `<threat_model>`. Verified at ASVS L1 by gsd-security-auditor against the code, not the summaries. Suite at audit: 891 passed, 0 failed, 2 skipped.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| stored data → HTML | Ids, names and values from `DB` (which can come from an imported backup that `validateBackup()` checks for shape only) are interpolated into markup | Strings into `data-*`, `value=` and text positions |
| DOM event → `ACTIONS` | One delegated listener per event resolves `data-action` to a registry entry | Action name and `data-*` arguments |
| draft → sync | Log-tab wrappers sit next to the device-local draft | Must never push the draft or bump `updatedAt` |
| desktop UAT → Ian's account | The keyboard pass ran against the live app code | Must not sync a test workout |

---

## Threat Register

T-5-02 is declared in five plans, each covering its own batch of screens. It is gated at the highest severity any plan gave it (high).

| Threat ID | Category | Component | Severity | Disposition | Mitigation (evidence) | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-5-01 | Tampering/Elevation | `dispatchAction` action-name lookup | medium | mitigate | Own-key check on the action name (`index.html:4729`), and an own-property check on the handler (`:4733`, review fix WR-04). All 127 action values are literals. Tests `test/app.test.js:5002`, `:4594`, `:7260` | closed |
| T-5-02 | Tampering (XSS) | every `data-*` interpolation, across all batches | high | mitigate | All 77 `data-*` interpolations are double-quoted `${esc(...)}`. `esc` (`index.html:946`) escapes `& < > "`. Hostile-id round trips: `:5252`, `:5387`, `:5464`, `:6059`. Static check with a synthetic proof: `:5049`. Pet hint is escaped once at the sink: `:6331` | closed |
| T-5-03 | Repudiation/DoS | a dropped call site or a lost `confirm()` | medium | mitigate | DELEG-03 ratchet (`:4561`), with 175/175 rows mapped (`:7270`). `confirm`/`prompt` count per function unchanged (22 → 22) | closed |
| T-5-04 | DoS | a malformed `ACTIONS` entry at boot | medium | mitigate | `ACTIONS` is read only at event time (4729, 4732, 4796). Shape is checked by tests `:4917` and `:4927` | closed |
| T-5-05 | Tampering | a wrapper that writes `DB` or pushes the draft | high | mitigate | The `ACTIONS` block has no `DB`, `save(` or `saveLocal(`. Tests `:4934`, `:4941`. DRAFT tables (`:3305`) byte-identical to the base | closed |
| T-5-06 | Tampering (test oracle) | editing the inventory to hide a dropped site | medium | mitigate | CAPTURE `3a64173` touched only the fixture and the harness. Rescanning `3a64173^` gives 175 rows, and HEAD identity fields have 0 differences from it | closed |
| T-5-07 | DoS (UX) | a passive or duplicated listener | medium | mitigate | Five `{passive:false}` `dispatchAction` listeners (`index.html:4923-4927`), and no `stopPropagation`. Tests `:4608`, `:5075`, `:5020` | closed |
| T-5-08 | DoS (data) | Import, Erase or restore losing its confirm or firing twice | medium | mitigate | The wrapped functions own their confirms, and Import acts on change only (4769). Test `:5346` | closed |
| T-5-09 | DoS (UX) | Copy all, Import or Export losing user activation | low | mitigate | Nothing asynchronous in `ACTIONS`, and the pickers and clipboard calls run synchronously. `:5346`, UAT 2 | closed |
| T-5-10 | Spoofing (UI) | the Ideas backdrop | low | mitigate | `e.target === el` (`index.html:4748`). Test `:5235` | closed |
| T-5-11 | Elevation | the `enter` action reaching an arbitrary entry | low | mitigate | Requires an own entry with an own `click` (`index.html:4794-4796`). Test `:5592` | closed |
| T-5-12 | DoS (data) | a lawn log with the wrong date | medium | mitigate | Arity-preserving wrapper (`index.html:4831`). Test `:5643` | closed |
| T-5-13 | DoS (data) | a string index hitting the wrong row | medium | mitigate | `NUMERIC_DATA` (`:4630`) and the decode check `:4969`. Number arrival proven at `:6034`, `:5847`, `:5892` | closed |
| T-5-14 | DoS (data) | a double log from Enter plus a click | medium | mitigate | Only `enter` handles keydown (4794). Tests `:4927`, `:6303`, `:6506` | closed |
| T-5-15 | DoS (data) | a mobility toggle doubled by label forwarding | medium | mitigate | The action sits on the checkbox and handles change only (2796, 4815). Test `:6394` | closed |
| T-5-16 | Tampering (XSS) | Log-tab `value=` attributes | high | mitigate | Set rows, note, stairs, date, duration and extras all go through `esc()` (1834-1900, 2817-2818). Tests `:6980`, `:7093`, `:7143`, `:7159`, `:7178` | closed |
| T-5-17 | Tampering (data integrity) | a Log-tab wrapper pushing the draft | high | mitigate | Thin-wrapper tests `:4934` and `:4941`. Typing pushes nothing (`:6772`). DRAFT-05 tables unchanged | closed |
| T-5-18 | DoS (a workout) | stopwatch, double prompts, wrong set skipped | medium | mitigate | `swGuard` (3683-3686) is wired at 4876-4877. Tests `:6621`, `:6819`, `:6840`. UAT 6 passed on the phone (build 286fbee) | closed |
| T-5-19 | Tampering (real data) | the desktop keyboard pass syncing a test workout | medium | mitigate | Procedural: the human-check forbids signing in and ends with Discard (`05-06-PLAN.md:48`, `:366`). UAT 1 passed. That the procedure was followed rests on Ian's report | closed |
| T-5-20 | Repudiation (docs drift) | the recipe teaching a refused pattern | low | mitigate | Tests `:6716` and `:6729`. `docs/adding-a-collection.md` teaches `data-action` | closed |
| T-5-SC | Tampering | npm/pip/cargo installs | high | accept | See AR-5-01 | closed |

---

## Accepted Risks

| ID | Threat | Rationale | Accepted |
|----|--------|-----------|----------|
| AR-5-01 | T-5-SC | Zero-dependency project. No install path exists in this phase, and `package.json` is unchanged. | plans 05-01..06 (plan-time) |

---

## Incidental (not registered; for VAL-02)

- `${DB.unit}` is rendered raw as element text in about 22 places, for example `index.html:1562`, `:2017-2024` and `:4548`. This predates the phase (24 sites before, none added), and it is not an attribute.
- `${DB.draft.workout}` is rendered raw as text at 1511, 1512 and 1660. This is the device's own draft.
- The suite does not pin the inventory's identity fields. T-5-06 relies on the per-plan CAPTURE comparison, and an audit re-ran it.

---

## Security Audit 2026-10-01

| Metric | Count |
|--------|-------|
| Threats found | 21 |
| Closed | 21 |
| Open | 0 |

Auditor verdict: SECURED (gsd-security-auditor, ASVS L1, block_on high).
