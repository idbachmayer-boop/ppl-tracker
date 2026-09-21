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
