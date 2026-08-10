# CLAUDE.md — ppl-tracker

Single-file PWA. `index.html` is the whole app: HTML + CSS + inline JS, no build step, no
dependencies. Keep it that way — it's what makes the app installable and offline-first.

Live: https://idbachmayer-boop.github.io/ppl-tracker/ · Deploy: push to `main`, Actions publishes.

## Before every push

```bash
npm test
```

A red suite blocks the deploy in CI. Run it locally first anyway — the feedback is instant and the
failure names the behaviour that broke. Add checks for what you change; the suite is the only thing
standing between a refactor and two months of training data.

## Rules that exist because breaking them cost real data

**Sync is a union merge, never an overwrite.** On 2026-07-25 a stale device blind-wrote the cloud and
destroyed four days of weigh-ins, unrecoverably. Every remote write is a `runTransaction` that
re-reads and calls `mergeDB()`. Never `set()`. Never resolve a conflict by "more data wins" — edits
legitimately remove sets.

**Deletes are soft.** Never splice a row out of `sessions`/`weights`/`cardio`/`ideas`/`todos`/
`hobbyLog`/`petWeights` — the union merge would resurrect it from the cloud forever. Set `deletedAt`,
call `touch()`, and read through `liveSessions()` / `liveWeights()` / etc. A missed filter ghosts a
deleted row back into a view.

**Absence never means "off".** `mobilityLog` and `lawnLog` take the whole inner object from the newer
side, so a deleted key reads as "never logged" on the other device. Store an explicit `false`.

**A migration that rewrites rows must `touch()` them and be persisted immediately.** Migration 15
(the goblet-squat rename) was silently reverted in production: `normalize()` runs at boot in memory,
nothing saved it, and the un-migrated rows had no `mtime`, so the merge preferred the stale copy —
then stamped the new schema anyway, so the migration could never run again. If you rewrite existing
rows: stamp `mtime`, save immediately, and add a test that replays a stale-device merge.

**Derived data uses `saveLocal()`.** `save()` bumps `updatedAt` and triggers a push. The weather cache
using `save()` is what let a stale device look "newest" merely by being opened.

## Conventions

- **Escaping:** every user-controlled string rendered into HTML goes through `esc()`. Note `esc()`
  does **not** escape `'` — never put a user string inside an inline handler's quotes.
- **Icons:** Phosphor, inlined in the `PH` map. No CDN, no web font — offline-first. Emoji stay where
  they mark something logged, typed or celebrated.
- **Theme:** "Nocturne". Colours come from the `:root` custom properties; don't hard-code hex.
- **Schema:** bump `SCHEMA` and add an entry to `MIGRATIONS`. Migrations must be idempotent and must
  never downgrade `_schema`.

## After shipping

Append a dated entry to the changelog in Ian's vault at
`C:\Users\idbac\Documents\Obsidian Vaults\Ian's Valut\10-19 Personal\19. Projects\PPL Tracker App.md`,
and update its **Current Features** section when the change is structural. Write for a human skimming
later: what changed and why it matters, not how the code does it.
