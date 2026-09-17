---
status: testing
phase: 02-export-for-claude
source: [02-VERIFICATION.md]
started: 2026-09-17T13:41:55Z
updated: 2026-09-17T13:41:55Z
---

## Current Test

number: 1
name: Share sheet opens on Ian's real phone
expected: |
  On the installed PWA (HTTPS, real tap): Settings → Backup → tap "Export for Claude (.md)".
  The OS share sheet opens listing the .md file (iOS Safari expected to share it); tapping a
  target such as the Claude app delivers the file.
awaiting: user response

## Tests

### 1. Share sheet opens on Ian's real phone
expected: The OS share sheet opens listing the .md file; tapping a target such as the Claude app delivers the file
result: [pending]

### 2. Cancelling the share sheet is silent
expected: Nothing downloads and no toast or error appears (exportShareFailed's AbortError branch)
result: [pending]

### 3. Android Chrome behaviour for .md files
expected: canShare likely returns false for .md/text/markdown, so the file downloads directly instead of opening the share sheet — confirm which path occurs and whether the download fallback is acceptable on Android
result: [pending]

### 4. The file reads correctly in the Claude app
expected: The header (title, Generated, Date range, Rows per section) is visible, each "## " section renders as a table, Workouts is one row per set, and Claude can read the content as intended
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
