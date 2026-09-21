# Adding a new tracked thing — the worked example

This is the companion to `CLAUDE.md` § "Adding a new tracked thing". `CLAUDE.md` carries the spine —
the short numbered checklist — and this file carries the worked example: the annotated entry, the
fixtures, and the reference the checklist points at instead of repeating.

## The registry contract

The two lists below are read straight out of `collectionProblems()` in `index.html`, never
transcribed by hand. `npm test` compares them against the live validator's own key lists and fails
loudly if either drifts.

<!-- registry-contract: spec keys -->
```json
["kind","key","sortBy","merge","soft","required","explicitFalse","label","columns","format"]
```

<!-- registry-contract: column keys -->
```json
["field","label","unit","zeroIsMissing"]
```
