---
status: testing
phase: 03-f3-adding-a-new-tracked-thing-recipe
source: [03-VERIFICATION.md]
started: 2026-09-21T00:00:00Z
updated: 2026-09-21T00:00:00Z
---

## Current Test

number: 1
name: Cold-reader comprehension check
expected: |
  Reading CLAUDE.md § Adding a new tracked thing, then docs/adding-a-collection.md, against the
  gap log in 03-05-SUMMARY.md, the recipe reads clean: every gap Dry Run B found is closed, and no
  step needs knowledge from outside the two files.
awaiting: user response

## Tests

### 1. Cold-reader comprehension check
expected: Reading the CLAUDE.md spine and the companion doc against 03-05-SUMMARY.md's gap log, the recipe reads clean. Every logged gap is closed, and no step needs knowledge from outside the two files.
result: [pending]

### 2. Rehearsal-evidence sufficiency (RESEARCH Q1)
expected: A decision on whether the narrative record (03-05-SUMMARY.md plus the companion doc's "Rehearsal record" section) is enough evidence that the recipe was rehearsed. The alternative is preserving the scratch-branch diff, which has already been deleted as the plan required.
result: [pending]

### 3. WR-01 disposition
expected: A decision on the code review's open advisory. Dry Run A injects its probe as the *first* COLLECTIONS entry, while the recipe tells a real author to put it *last*. No live order-dependence was found. Choose between accepting it as is and doing a follow-up that moves the injection to the end.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
