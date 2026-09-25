---
status: testing
phase: 05-f2-event-delegation
source: [05-VERIFICATION.md]
started: 2026-09-25T00:00:00Z
updated: 2026-09-25T00:00:00Z
---

## Current Test

number: 1
name: DELEG-06 keyboard-only desktop pass
expected: |
  Serve locally (`py -m http.server 8080`), don't sign in. Tab through every screen: every control
  takes focus with the accent ring and responds to Enter and Space. Steps in 05-06-SUMMARY.md.
awaiting: user response

## Tests

### 1. DELEG-06 keyboard-only desktop pass
expected: every control focusable with the accent ring; Enter/Space activate it (05-06 human-check). Run before deploy.
result: [pending]

### 2. Settings and Ideas browser check
expected: steps in 05-02-SUMMARY.md: cards look right, headers work by keyboard, the backdrop closes the sheet, Copy all works, Import opens the file chooser.
result: [pending]

### 3. Care and Today lawn card check
expected: steps in 05-03-SUMMARY.md: Enter in the location box searches once, lawn cards match the live app, sleep add/delete works.
result: [pending]

### 4. Train (History and Progress) check
expected: steps in 05-04-SUMMARY.md: keyboard and visual pass of History and Progress.
result: [pending]

### 5. Today card-by-card check
expected: steps in 05-05-SUMMARY.md: cards look as before; Enter/Space work.
result: [pending]

### 6. DELEG-07 real workout on Ian's phone (after deploy)
expected: work through 05-DELEG-07-CHECKLIST.md during a real workout, starting with Settings → This version and the picker row layout.
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
