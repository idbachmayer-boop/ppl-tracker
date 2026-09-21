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

## The registry contract, field by field

Each key below is one entry in the spec-key contract block above, in the same order.
`collectionProblems()` refuses any key not on that list as `unknown field "…"`, so this walkthrough
never grows a field the validator doesn't already know about.

- **`kind`** — required. `'list'` or `'map'`; anything else and the whole entry is refused before any
  other check runs.
- **`key`** — required for a list, as a non-empty string or a function — the field a row is
  merge-matched and deduplicated on. A map must not declare it at all; declaring one is refused.
- **`sortBy`** — optional, list-only, a string field name or a function. A map declaring `sortBy` is
  refused. `cardio`/`ideas`/`todos`/`hobbyLog` deliberately omit it too — the hand-written merge
  those replaced never sorted them, so declaring one now would change stored order.
- **`merge`** — required on every entry. A list must declare `merge:'union'`. A map must declare
  `'line-union'` or `'replace-whole'` — never `'union'`. That is the key-union trap: unioning a
  map's inner keys resurrects unchecked boxes forever instead of taking the whole day from whichever
  side is newer.
- **`soft`** — required, a boolean. A list sets it `true` for soft delete; a map must never set it
  `true` — a map has no per-row delete, only `replace-whole`/`line-union` at the whole-day level.
- **`required`** — optional, a boolean, list-only (a map setting it `true` is refused). `true` means
  `validateBackup()` refuses a backup where the list is missing entirely; `false` or absent means a
  missing list is tolerated, as an older backup predating the collection would be.
- **`explicitFalse`** — map-only, and required as a boolean the moment `kind:'map'`. `true` is
  allowed only when `merge:'replace-whole'` — it is the flag that lets a day store an explicit
  `false` instead of letting absence mean "off" (see `## Rules that exist because breaking them cost
  real data` in `CLAUDE.md`).
- **`label`** — required, a non-empty string with no `|` or line break (either would break a Markdown
  table row). It becomes the export's `##` section heading and must be unique across every
  collection — two collections sharing a `label` are both refused, by name, at boot, never silently
  merged into one section.
- **`columns`** — required, a non-empty array of column objects (see below). `columns[0]` is always
  treated as the row's ISO date: the export sorts by it and builds its date range from it.
- **`format`** — a function. Required the moment `kind:'map'` — a map has no natural flat row shape,
  so `format(date, obj)` builds one. Optional on a list whose rows are already flat, the way
  `sleep`'s are.

A column object (the column-key contract block above) carries only these four keys:
- **`field`** — required, non-empty string, the row's property name. `id`, `mtime` and `deletedAt`
  are internal and may never appear here — declaring one is refused. No two columns in one
  collection may share a `field`.
- **`label`** — required, the same non-empty/no-`|`/no-linebreak rule as the collection's own
  `label`. No two columns in one collection may share a `label` either.
- **`unit`** — optional. Either the kind `'mass'`, resolved to `DB.unit` when the export runs, or a
  literal unit string such as `'km'`.
- **`zeroIsMissing`** — optional boolean. Marks a column where a stored `0` means "not entered," not
  a real zero, so the export shows `—` instead of `0` (see `cardio`'s `minutes`/`distanceKm`).

## A copy-paste entry to start from

`sleep` is list-shaped, so it never exercised the map-only branches above. The entry below is
map-shaped instead — shaped like `mobilityLog` — so pasting it in and adjusting exercises the
branches a list-shaped copy would silently skip.

<!-- registry-contract: example entry -->
```js
{
  kind: 'map',
  merge: 'replace-whole',
  soft: false,
  required: false,
  explicitFalse: true,
  label: 'REPLACE ME',
  columns: [
    { field: 'date', label: 'date' },
    { field: 'item', label: 'item' }
  ],
  format: dayFlagRows
}
```
Rename `label` before using it — a duplicate is refused at boot, not merged into whichever
collection already owns that label.

## The worked example: how sleep was added

`sleep`'s actual edit list splits cleanly into two halves.

**Registry-derived** — needs no new logic, only a declaration:
1. One `COLLECTIONS` entry — the `sleep:` line in `index.html`.
2. `SCHEMA` bumped by one, 17 → 18.
3. One `MIGRATIONS` line: `18: d=>ensureCollectionDefaults(d)`.

The migration line is needed even though `ensureCollectionDefaults()` is itself derived from
`COLLECTIONS` — it creates every absent collection as its empty default — because an *existing*
device's stored blob does not gain the new key until `_schema` advances past 18. `blank()` only
helps a device booting fresh; every phone Ian already owns needs the migration line to run once.

**Hand-written** — this is what "sleep, plus its logging/viewing UI" meant when it shipped:
4. `sleepUid()` — a uid helper.
5. `addSleep()` — reads the form, validates and clamps, `touch()`s the row, then `save()`s.
6. `removeSleep(id)` — soft-deletes via `softDelete()`.
7. `viewSleep()` — history list, a 7-day summary, the add form, the safe-id gate on the delete
   button.
8. Router wiring — the Care tab's `sub` array and `view:` dispatcher.

A reader who stops after step 3 has a collection that is fully synced, fully validated and fully
exportable — and has no way to log to it or see it on the phone. That gap is exactly why step 3 in
`CLAUDE.md`'s spine exists and is never decomposed: it is the one step the registry cannot do for
you.

## The hand-written UI

Generalized from `sleep`'s pattern — five pieces, always named the same way:

- an **id helper** producing a collision-free row id;
- an **add function** that reads the form, validates and clamps the input, calls `touch()` on the
  row, then `save()` — `save()` is correct here; `saveLocal()` is for derived caches only, and
  `CLAUDE.md` records what happened when the weather cache used `save()` by mistake;
- a **remove function** that soft-deletes via `softDelete()` — never splice the row out of the
  array, the union merge would resurrect it from the cloud forever;
- a **view function** that reads its rows through `liveOf()` — never `DB[name]` directly — so a
  deleted row stays hidden from the view that renders it;
- **router wiring** — the tab's `sub` array gains an entry and its `view:` dispatcher gains a
  branch.

**Render the delete button only when the row id matches a safe-id pattern.** `sleep` uses
`/^[A-Za-z0-9_-]+$/` — letters, digits, underscore and hyphen — before rendering
`onclick="removeX('${id}')"` at all. The reason is in `CLAUDE.md` § Conventions: `esc()` does not
escape `'`, and a value interpolated into an attribute is not escaped at all, so an id placed inside
an inline handler's quotes can break out of the attribute. A naively copied delete button is the
single most likely place a future collection reintroduces that hole.

One harness mechanic, not an app requirement: a new function must be added to `test/harness.js`'s
exported-names list, or it comes back `undefined` in tests rather than throwing.

## The tests a new collection ships with

Every category below is named in `CLAUDE.md`'s step 4. Each is cited here by `ok()` label
substring, never a line number — run `grep -n "<the substring>" test/app.test.js` before trusting
any citation on this page; a substring that returns zero hits is itself the staleness check, one a
line number can never give you.

### Registry validity

`collectionProblems()` must return no problems for the shipped registry —
`"registry: the shipped COLLECTIONS has no problems"` is the one generic check every collection,
including yours, shares. Skip it and a typo in your entry (a swapped merge string, an empty
`columns` array) ships silently instead of throwing at boot the moment `collectionProblems()` runs.

### Migration correctness

Only needed if your migration does more than create an empty default. `ensureCollectionDefaults()`
alone needs no test of its own — sleep's version proves it rewrites nothing:
`"sleep: migration 18 rewrites no existing row (REG-16 guards not triggered)"`. If your migration
backfills a value or renames a field instead, ship the same three checks sleep's would have needed
had it not been trivial: `"sleep: migrations stay idempotent"` and
`"sleep: _schema never goes down"`. Skip any of the three and a migration that silently corrupts an
existing row, or runs twice and doubles a value, ships clean.

### A stale-device merge replay

The one category every collection ships with, list or map — it is the check that would have caught
the 2026-07-25 incident, where a stale device blind-wrote the cloud and destroyed four days of
weigh-ins. Build two DB fixtures — one where the row is deleted with a newer `mtime`, one where an
older device still carries the live row — and merge them in both directions.
`"sleep: a deleted night is not resurrected by a stale device (SLEEP-06)"` proves the delete wins
regardless of merge order; `"sleep: replaying the stale device again keeps it deleted"` proves
running the same stale merge a second time — the way a phone that never got the memo keeps trying —
doesn't undo the first merge's result. Without both, a soft-deleted row that looks "older" to
`mergeDB()` gets resurrected the next time the device that never saw the delete syncs again, which
is exactly how four days of weigh-ins were lost the first time.

### An explicit-`false` replay, for map collections

Only applies to a map-shaped collection — list-shaped collections like `sleep` never declare
`explicitFalse`, so `sleep` shipped no version of this test. Phase 3's Dry Run A proves the shape
for a throwaway map probe instead:
`"an explicit false survives the merge, and absence does not mean off"` — an inner key set to
`false` on the newer side must survive being merged with an older side that never had the key at
all, in both merge orders, and a key present on the older side but absent on the newer side must
not be resurrected. Skip this and a map collection repeats the exact `mobilityLog` hole named in
`CLAUDE.md` above: absence silently reading as "off" is not the same as an explicit "off."

### `validateBackup()` shape

Two checks — a damaged section (wrong type) is refused with a named message, and an older backup
predating the collection (the key absent entirely) is accepted rather than refused. `sleep`'s
versions: `"sleep: a damaged sleep section is refused"` and
`"sleep: an older backup without sleep is accepted"`. Without the first, a hand-edited or corrupted
backup silently imports garbage into the collection; without the second, every backup taken before
this collection existed becomes unimportable.

### UI behaviour

Only if you wrote a UI (see above). Cover form validation and clamping, that user text is escaped
in the rendered HTML, that delete is soft, and that the router exposes the screen. `sleep`'s
versions: `"sleep: logging a night stores hours, quality and the trimmed note"`,
`"sleep: blank or impossible hours are refused"`, `"sleep: the note is escaped"`,
`"sleep: deleting a night is soft"`,
`"sleep: an id that could break out of the attribute gets no delete button"`, and
`"sleep: the router exposes Care"`. Miss the escaping check and a user-typed note can carry a
`<script>` tag straight into the DOM; miss the safe-id check and a naively-copied delete button
reopens the attribute-escaping hole `esc()` was never meant to close on its own.

### A declaration-alone structural proof

Proves the whole point of the registry — that no derived consumer's source mentions your
collection by name. `sleep`'s versions: `"no derived consumer mentions sleep"` (source-scans
`blank`, `liveOf`, `validateBackup`, `mergeCollections` and `mergeDB` with comments stripped) and
`"sleep is declared once, as the last entry"` (the structural half of the ordering rule in
`CLAUDE.md` step 1). Without this, a future edit could quietly special-case your collection
somewhere derived code was supposed to be generic, and nothing would say so until the next
collection after yours broke in the same place.
