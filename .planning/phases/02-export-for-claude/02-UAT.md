---
status: complete
phase: 02-export-for-claude
source: [02-VERIFICATION.md]
started: 2026-09-17T13:41:55Z
updated: 2026-09-18T09:51:38Z
---

## Current Test

[testing complete]

## Tests

### 1. Share sheet opens on Ian's real phone
expected: The OS share sheet opens listing the .md file; tapping a target such as the Claude app delivers the file
result: skipped
reason: "The share sheet does not open on Ian's phone — Chrome's shareable-type list has no .md entry, so canShare returns false and the download fallback runs (see test 3). Needs an iOS device to test the share path."

### 2. Cancelling the share sheet is silent
expected: Nothing downloads and no toast or error appears (exportShareFailed's AbortError branch)
result: skipped
reason: "Not reachable on this device: the share sheet never opens, so there is nothing to cancel. Needs an iOS device."

### 3. Android Chrome behaviour for .md files
expected: canShare likely returns false for .md/text/markdown, so the file downloads directly instead of opening the share sheet — confirm which path occurs and whether the download fallback is acceptable on Android
result: pass
reason: "Confirmed on Ian's Android phone 2026-09-18: tapping the button downloaded the file directly, no share sheet. Ian accepts the download fallback as the Android experience."

### 4. The file reads correctly in the Claude app
expected: The header (title, Generated, Date range, Rows per section) is visible, each "## " section renders as a table, Workouts is one row per set, and Claude can read the content as intended
result: pass
reason: "Ian exported on the phone and attached ppl-export-2026-09-18.md 2026-09-18. It reads as valid Markdown: header with date range and per-section counts, one table per collection, Workouts one row per set. All ten section counts matched the actual table rows; no ids, mtime, deletedAt or bookkeeping keys present; 7 skipped days shown as (skipped) rows; multi-line journal entries collapsed to <br> with every row keeping its column count."

## Summary

total: 4
passed: 2
issues: 0
pending: 0
skipped: 2
blocked: 0

## Gaps

## Closing note

Ian accepted the download fallback as the Android experience on 2026-09-18, so the share sheet is
no longer part of what this phase had to deliver. Tests 1 and 2 stay skipped, not passed: the share
path ships unproven on any device. The phase was marked complete on that basis.

## Deferred Follow-Ups

- test: 1
  idea: "Share sheet on iOS — untested; Ian's phone is Android, where the sheet is not offered for .md. If the share path matters later, sharing the same text as .txt / text/plain is the route, which changes D-03's locked .md filename."
  deferred_at: 2026-09-18
