---
status: testing
phase: 09-equipment-and-weight-steps
source: [09-VERIFICATION.md]
started: 2026-10-12T19:30:00Z
updated: 2026-10-12T19:30:00Z
---

## Current Test

number: 1
name: Real workout on Ian's phone, plus the cross-device equipment change
expected: |
  First, Settings → This version ends with 8a20832 on BOTH the phone and the PC (allow ~10 min and a full
  close/reopen after a deploy; never judge on the old build).
  (1) PUSH workout, DB lateral raise card before logging: a muted "dumbbell · +2.5" under the exercise
      select; any ⬆ Add weight number is last time + 2.5 (or the next rack weight from 60 up).
  (2) PULL workout, Preacher curl at 35: "🏋️ Per side: 1×5" under the sets; at 25 or less, no plate line.
  (3) Settings → Exercises: every logged exercise has an equipment dropdown under its name, already set
      (Preacher curl = EZ bar, Rear delt fly = dumbbell, Leg press = machine, Lunges = bodyweight).
  (4) On the PC change one exercise's type, wait for Synced, reopen Settings → Exercises on the phone:
      the new type shows. Change it back on either device: the revert shows on both.
  (5) Mid-workout "+ Custom…" with a never-seen name: a box asks "What equipment is “…”?" with six
      buttons, one highlighted; one tap and the box goes and the tag shows the choice (Discard if a test).
  (6) At ~380px: picker is 3 × 2, buttons ≥44px, guess highlighted; tag legible; Settings dropdown sits
      under the name, never beside Rename.
  (7) Finish the workout: it saves normally, no sync error on either device.
  On a blank app, wrong advice or a sync error: `git revert -m 1 --no-edit 8a20832d16d29f3dbb18f1373ed9c210a1a40b17`
  on main and push at once (after schema 19 has synced, older builds pause sync until a ≥19 build ships).
awaiting: user response

## Tests

### 1. Real workout on Ian's phone, plus the cross-device equipment change
expected: Steps (1)–(7) above all hold: the tag, the Preacher-curl plate line, the pre-set types in Settings, a type change crossing devices both ways, the first-time picker, the ~380px layout, and a normal finish with no sync error.
result: [pending]

## Summary

total: 1
passed: 0
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps
