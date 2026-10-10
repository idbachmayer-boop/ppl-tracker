# Project Milestones: PPL Tracker

[Entries in reverse chronological order, newest first]

## v1.0 Collections & lockdown (Shipped: 2026-10-09)

**Delivered:** Every collection's sync, delete and validation rules now live in one declared
registry, a Markdown export for Claude and a documented recipe are built on it, the in-progress
workout stays on the device, and the app runs under a hash-based Content-Security-Policy with no
inline handlers left.

**Phases completed:** 1-7 (33 plans, 72 tasks)

**Key accomplishments:**

- **One `COLLECTIONS` registry.** `blank()`, the `liveX()` filters, `validateBackup()` and
  `mergeDB()` all derive from one declaration. Each replaced function was differential-tested
  against its frozen twin, over every past sync incident, a seeded random merge battery and Ian's
  real exported backup. `sleep` joined as the eleventh collection with one registry entry (SCHEMA 18).
- **Export for Claude.** A Markdown snapshot built from the same registry and the same live views
  as the app. It opens with a header giving the date range and row counts, omits deleted rows and
  internal ids, and goes through the share sheet with a download fallback.
- **The add-a-collection recipe.** Six numbered steps in `CLAUDE.md` plus
  `docs/adding-a-collection.md`, with tests that fail if either drifts from the registry contract or
  the placement rule's source. A cold walk-through for `supplements` found 8 gaps, and all 8 were
  closed.
- **The draft is device-local.** The in-progress workout never syncs. Every path that replaces `DB`
  keeps this device's draft and drops a foreign one, draft edits persist with `saveLocal()`, and
  tripwires fail the suite on a new unsanctioned path.
- **Event delegation.** All 175 inline handler attributes became `data-action` controls behind one
  dispatcher. Hostile ids and stored values are proven inert, and the Log tab passed a real workout
  on the phone.
- **LF line endings and a live CSP.** `.gitattributes` (`* text=auto eol=lf`) landed alone
  (`17b5a66`). A hash-based Content-Security-Policy went live as `f71c6e4`, with `npm run
  csp:hash` / `csp:check`, a deploy-time check, and a signed-in sync round trip confirmed on the PC and
  the phone.

**Stats:**

- 12 files changed outside `.planning/` (+11,541 / −518 lines)
- `index.html` 4,951 lines; test suite 928 passed, 0 failed, 2 skipped (226 checks at the start)
- 7 phases, 33 plans, 72 tasks, 225 commits
- 30 days from start to ship (2026-09-10 → 2026-10-09)

**Git range:** `15bf8a8` (docs: initialize project) → `dab9f79` (docs: v1.1 brief)

**Closeout:** `override_closeout`. All 7 phases verified `passed` and 56/56 requirements are
satisfied. The milestone audit (`milestones/v1.0-MILESTONE-AUDIT.md`) returned `tech_debt` with 0
gaps, and Ian accepted the debt on 2026-10-09. Known deferred items: 15 audit-open lines
acknowledged (see STATE.md Deferred Items). They come from three entries in the phase 4 and 5
`deferred-items.md` files. Two were already fixed in the Phase 5 review fix. One is open: the
offline weather retry loop, which is scheduled for v1.1 phase 4.

**What's next:** v1.1, defined by `.planning/v1.1-BRIEF.md`: progression correctness, equipment
steps, Log-page history and skip, lawn rain history and journal marks, a Today sleep card, and a
strength index with a poor-sleep lighter-workout offer. Start with `/gsd-new-milestone`.

---
