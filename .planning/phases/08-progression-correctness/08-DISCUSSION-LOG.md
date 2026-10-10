# Phase 8: Progression Correctness - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 08-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-10
**Phase:** 08-progression-correctness
**Areas discussed:** What "every planned set" means, Mixed or lower weights, Which sessions count toward a stall, History transition

The rules themselves were settled earlier in the 2026-10-09 grilling session (`.planning/v1.1-BRIEF.md`).
This discussion covered only the edge cases.

---

## What "every planned set" means

| Option | Description | Selected |
|--------|-------------|----------|
| Sets on the card | The sets on the card at finish. An added set must hit the top; a deliberately removed set doesn't count as missing. | ✓ |
| The program's set count | The slot's programmed number. Fewer done means blocked; extra sets are ignored. | |
| Program count, extras must also hit | The programmed number at the top, plus any extra sets. | |

**Follow-up: one set lighter than the rest (30/30/25, all at the top)**

| Option | Selected |
|--------|----------|
| Don't add weight; every set must be at the working weight | ✓ |
| Add weight; top reps is enough | |

## Mixed or lower weights

| Option | Description | Selected |
|--------|-------------|----------|
| Working weight = heaviest set | Heavier = progress. Same = compare total reps. Lighter = restart the comparison, not a failure. | ✓ |
| Compare set by set | Match set N to set N. | |
| Lighter counts as no progress | It counts toward a stall. | |

## Which sessions count toward a stall

| Option | Description | Selected |
|--------|-------------|----------|
| Per slot, skips and deloads pause | Separate streak per slot; skipped days and deloads neither count nor break the streak. | ✓ |
| Across all slots | One streak per exercise everywhere. | |
| Per slot, deload resets | A deload clears the streak. | |

## History transition

| Option | Description | Selected |
|--------|-------------|----------|
| Re-judge all history | Apply the new rule to every past session immediately; it's computed, so no data changes. | ✓ |
| Only count new sessions | Wait for 3 sessions after the update. | |

## Claude's Discretion
- Code shape of the stall and progress rule.
- Banner wording.
- How blank-set information is stored, within the CLAUDE.md data rules.

## Deferred Ideas
None.
