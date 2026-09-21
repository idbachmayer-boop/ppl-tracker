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

- **Escaping:** every user-controlled string rendered into HTML goes through `esc()`. Two holes to
  know about: `esc()` does **not** escape `'`, so never put a user string inside an inline handler's
  quotes; and values interpolated into an **attribute** (`value="${st.w}"` in the set rows) are not
  escaped at all. `validateBackup()` checks the *shape* of an imported file, never the types inside
  it, so a hand-edited backup can put anything in a set's `w`. Escape attributes too when you touch
  them.
- **Security rules live in `firestore.rules`**, in this repo — not only in the Firebase console.
  **Reconciled 2026-09-10: the file matches what is deployed.** Keep it that way — change the console
  and the file in the same sitting, in either direction. A rules file that has silently drifted is
  worse than none, because it reads as authoritative. The suite asserts the security *property* (every
  `allow` gated on the caller owning the document, nothing granted unconditionally), never the exact
  wording — an earlier version pinned the variable name and broke the moment the file matched reality.
- **Icons:** Phosphor, inlined in the `PH` map. No CDN, no web font — offline-first. Emoji stay where
  they mark something logged, typed or celebrated.
- **Theme:** "Nocturne". Colours come from the `:root` custom properties; don't hard-code hex.
- **Schema:** bump `SCHEMA` and add an entry to `MIGRATIONS`. Migrations must be idempotent and must
  never downgrade `_schema`.

## Adding a new tracked thing

Every tracked thing is one `COLLECTIONS` entry — the same registry `blank()`, `mergeDB()`, the
`liveX()` filters and `validateBackup()` already derive from.

1. Add exactly one entry to `COLLECTIONS` in `index.html`. It goes **last** — never inserted among
   the existing entries, because entry order fixes validation precedence and merge order — and its
   `label` must be unused by every other collection: the label becomes the export's section heading,
   and a duplicate is refused loudly at boot, never silently merged into that collection.

   This is the rule the boot enforces about where that entry may live — a paraphrase of a
   temporal-dead-zone rule is how the boot died once already.

   <!-- placement-rule: verbatim from index.html -->
   ```text
   Declared before DB boots via load() a few dozen lines down, after SCHEMA/KEY, before MIGRATIONS;
   every value is a literal or a reference to a hoisted `function` declaration — never a const
   arrow, never a forward const. blank() may read only `kind` at module-eval time (see the placement
   comments on migration 13 and migration 17 above, and the one on `let migrationRan` below — this
   is the same trap). Everything else here (`key`, `sortBy`, `merge`, `label`, `columns`, `format`)
   is read later, by code that runs after boot, never during it.
   ```
2. Bump `SCHEMA` and add a `MIGRATIONS` entry — see the **Schema** bullet under Conventions above. An
   existing device's stored blob does not gain the new key until `_schema` advances past the new
   number; `blank()` only helps a fresh boot.
3. If the collection is logged or viewed, write its UI by hand. This step is never derived from the
   registry — it is the one step the declaration cannot do for you. See `docs/adding-a-collection.md`
   § "The hand-written UI" for the worked pattern.
4. Add the tests this collection must ship with:
   - registry validity — the shipped registry still has no problems;
   - migration correctness, only if the collection needs a non-empty default — the migration stays
     idempotent and never downgrades `_schema`;
   - **a stale-device merge replay** — a deleted row must not be resurrected by an older device, and
     replaying the stale device again must keep it deleted;
   - for a map collection, an explicit-`false` replay — a day storing `false` must survive the merge,
     and an absent key must not be resurrected from the older side;
   - `validateBackup()` shape — a damaged section is refused, an older backup without the section is
     accepted;
   - UI behaviour, only if a UI was written — form validation, escaping, soft delete, and the router
     exposing the screen;
   - a declaration-alone structural proof — no derived consumer's source mentions the collection by
     name.

   Like the `firestore.rules` checks under Conventions, these assert the property, never the wording.
5. Run `npm test`. `collectionProblems()` validates the registry at module-eval time, so a broken
   declaration throws at boot and a red suite names which rule was broken.
6. Do not touch the exporter. `buildMarkdownExport()` derives every section from `COLLECTIONS`, so a
   new collection exports itself — no export step is needed.

See `docs/adding-a-collection.md` for the worked example: an annotated entry, the field-by-field
contract, the hand-written UI pattern, and the test walkthrough.

## After shipping

Append a dated entry to the changelog in Ian's vault at
`C:\Main Vault\50-59 Projects & Events\56. Software Projects\PPL Tracker App.md`,
and update its **Current Features** section when the change is structural. Write for a human skimming
later: what changed and why it matters, not how the code does it.

> **`C:\Main Vault` is the live vault.** There is a second, pre-rebuild vault at
> `C:\Users\idbac\Documents\Obsidian Vaults\Ian's Valut` — this file pointed at it until 2026-09-09,
> so every changelog entry written before then landed in a vault Ian doesn't open. Don't put it back.
