---
status: testing
phase: 08-progression-correctness
source: [08-VERIFICATION.md]
started: 2026-10-10T13:00:00Z
updated: 2026-10-10T13:00:00Z
---

## Current Test

number: 1
name: Real workout on Ian's phone
expected: |
  First, Settings → This version ends with 99e10c8 (if it still shows the older build after 15 minutes
  and a full close and reopen, wait; never judge on the old build).
  (1) Open the PUSH workout with the DB lateral raise and look at its card before logging: no ⚠ Stalled.
      Any ⚠ Stalled card says "no extra rep or weight for 3 sessions in a row" and offers Deload −10%.
  (2) Do the workout; on one exercise skip one set (or leave one set's reps blank); finish.
  (3) Start the same workout again and look at that exercise's card, then Discard: no ⬆ Add weight,
      and Last time shows the sets actually done.
  (4) If a bodyweight exercise hit the top of its range on every set last time, its card reads
      "⬆ Add weight (belt) or harder variation", with no number.
  (5) Optional: Edit a past workout and re-save it unchanged; the sets are unchanged.
  No sync error on either device.
  On a blank app, wrong advice or a sync error: `git revert -m 1 --no-edit 99e10c8b7e46b0fc507aced553c7dbb8dcbdafb4`
  on main and push at once.
awaiting: user response

## Tests

### 1. Real workout on Ian's phone
expected: As in Current Test above — no false Stalled on the DB lateral raise; no Add weight after a skipped or blank set; bodyweight shows the belt wording with no number; edits preserve sets; no sync error on either device.
result: [pending]

### 2. Product decision on WR-02 (stall count when the number of sets changes)
expected: Ian decides whether a session with a set removed should read as flat and a session with a set added should read as progress (current behaviour, matches PROG-02's wording), or whether a set-count change should pause the streak in a later phase.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
