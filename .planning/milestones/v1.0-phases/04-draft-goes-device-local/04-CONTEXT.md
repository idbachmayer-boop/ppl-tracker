# Phase 4: Draft Goes Device-Local - Context

**Gathered:** 2026-09-22
**Status:** Ready for planning

<domain>
## Phase Boundary

The in-progress workout (`DB.draft`) stops crossing the wire in both directions. It is persisted only on the
device that started it, never pushed, never adopted from the cloud, never carried by backups or snapshots.
Covers DRAFT-01..05. No new UI capability; the only visible change is that other devices no longer show a
"Workout in progress / Resume" card for a workout started elsewhere.

</domain>

<decisions>
## Implementation Decisions

### Cross-device handoff
- **D-01:** Ian never continues a workout on a second device. The draft lives only where it was started, so no handoff mechanism is needed.
- **D-02:** Other devices show nothing about a workout in progress elsewhere. No "in progress elsewhere" flag or hint: nothing draft-derived syncs.

### Cutover & legacy cloud draft
- **D-03:** A draft that exists only in the cloud doc is ignored, never adopted, including on the first boot after the change ships. Only a draft already in the device's own localStorage survives. A workout that is mid-set during the deploy survives on the phone logging it.
- **D-04:** The stale `draft` field is removed from the cloud doc by stripping `draft` from every merged/pushed blob (the same way `wx` is deleted in `mergeDB` / `snapPayload`), so the next ordinary merged write drops it. No separate one-off migration write. Remote `draft` values (legacy, malformed, absent) must never reach `DB.draft` through any merge path, **including the `gen`-mismatch wholesale-replace branch**, which currently copies the winning side wholesale.
- **D-05:** The local draft is always preserved across any remote merge. The merge result carries this device's own draft back in, just as `wx` is preserved in `adoptMerged` today [index.html:4278]. A remote Erase or Import→Replace arriving via `gen` bump does not clear this device's draft.

### Backups, snapshots, import
- **D-06:** The downloadable JSON backup excludes `draft`. `validateBackup()`/import ignores any `draft` in an imported file, so a hand-edited or old backup can never plant a draft.
- **D-07:** Auto-snapshots exclude `draft` (extend `snapPayload`). Restoring a snapshot never replaces the workout in progress.
- **D-08:** A local "Erase all data" clears the local draft. A local Import (Merge or Replace) keeps the local draft.

### Draft saves vs sync pushes
- **D-09:** Draft edits (set values, notes, stairs, extras, date/duration) persist locally only: written to this device immediately, with no `updatedAt` bump and no push. Syncing happens when Finish lands the session in `sessions` (the existing `save()` on finish). Starting and discarding a draft likewise causes no draft-bearing write. Persistence must still survive close/reopen exactly (DRAFT-05).

### Claude's Discretion
- Storage shape: keep `draft` inside the `DB` blob under `KEY` and strip it at every wire boundary, or move it to its own localStorage key. The planner picks, but the result must satisfy D-04..D-09 and the rule "Derived/device-only data uses `saveLocal()`".
- Whether `normalizeDraft()` stays in `mergeDB` (still harmless for the local draft) or moves to the local load path only. The Log tab must render when the remote draft is malformed or absent (DRAFT-03). Test this directly with a malformed remote `draft`.
- Schema/migration: only if the chosen storage shape needs one. If a migration rewrites rows, follow the CLAUDE.md migration rule (touch, persist immediately, stale-device replay test).
- Commit discipline: same as Phase 1. Don't delete any frozen `_legacy` differential function in the same commit that changes its live counterpart. If `mergeDB_legacy` differential tests assume draft follows recency, update the test's expectation explicitly rather than editing the frozen function.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/ROADMAP.md` § Phase 4: goal and 4 success criteria
- `.planning/REQUIREMENTS.md`: DRAFT-01..DRAFT-05
- `CLAUDE.md`: sync-is-union-merge, `saveLocal()` for derived data, migration rules, `npm test` before push

### Code history
- `.planning/codebase/CONCERNS.md`: "viewActive crashes on malformed draft (FIXED 2026-09-09)" and "Draft can become unguarded"
- `index.html` comment block in `mergeDB` at the `draft:` note (the 2026-07-25 resurrection-loop bug)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `wx` exclusion pattern: `snapPayload()` [index.html:772], `delete win.wx` / `delete out.wx` in both `mergeDB` branches [index.html:4142, 4163], wx re-carried in `adoptMerged` [index.html:4278, 4329].
- `saveLocal()` [index.html:792]: local persist with no `updatedAt` bump and no push. `save()` [index.html:801] does both.
- `normalizeDraft()` [~index.html:655]: repairs or nulls a short/unknown draft.

### Established Patterns
- Draft mutators all call `save()`: `setVal`, `setNote`, `setSessionNote`, `setDraftDate/Dur`, `stairVal`, `skipStairs`, `ex*` helpers, `startWorkout` [~1701], historical start [~1735], edit-past-session [~2208], `finishWorkout` [2028], `discardWorkout` [2034].
- A live-listener typing guard already checks `DB.draft` [index.html:4289].
- The frozen `mergeDB_legacy` / `blank_legacy` exist for the REG-13 differential. Don't edit them.

### Integration Points
- `mergeDB` (both the gen-mismatch and recency branches), `adoptMerged`, the push transaction, `snapPayload`, the export/backup builder, `validateBackup`/import, `wipe()`, `normalize()`/`load()`.
- Views that read the draft: `viewActive`, the Today "Resume" card [~1475], the glance pill [~1621], the rest timer [~3636].

</code_context>

<specifics>
## Specific Ideas

- Tests should replay: (a) a remote doc with a legacy non-null draft vs. a local null draft → local stays null; (b) a remote malformed draft → Log tab renders; (c) finish/discard → the pushed payload has no `draft` key; (d) close/reopen → the draft is identical; (e) a remote gen-bump replace → the local draft survives; (f) import of a backup containing `draft` → ignored.

</specifics>

<deferred>
## Deferred Ideas

None. Cross-device workout handoff was explicitly declined (D-01).

</deferred>
