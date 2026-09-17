---
phase: 02-export-for-claude
reviewed: 2026-09-17T00:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - index.html
  - test/app.test.js
  - test/harness.js
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-09-17T00:00:00Z
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

Reviewed the Markdown export feature added in phase 02: the `COLLECTIONS` column-object schema
(`field`/`label`/`unit`/`zeroIsMissing`), `collectionProblems`'s new column/label validation,
`exportRows`/`buildMarkdownExport`/`downloadMarkdown`/`exportMarkdown`/`exportShareFailed`, the
`sessionRows`/`dayFlagRows` row shapers, and `mdEscape`/`mdCell`/`mdHeader`. The feature is
well defended against hostile *values* (pipes, backslashes, line separators, HTML, objects) and
correctly keeps sync-safety invariants (no `save`/`saveLocal`/`touch`, reads only through
`liveOf`). Test coverage for those paths is extensive and the assertions actually match the
implementation.

The gaps found are all in defense against malformed *shapes* rather than hostile *values*, and in
registry invariants that are documented only in comments, not enforced by `collectionProblems`.
None of them are reachable through the normal UI (`addSet`/`addCardio`/etc. always produce
well-shaped data); they require either a hand-edited backup (a risk class CLAUDE.md already
documents for `validateBackup`) or a future collection added to `COLLECTIONS` without following
the conventions the current nine happen to follow. I've verified each one against the running app
rather than by inspection alone (repro commands below).

## Warnings

### WR-01: A single malformed set entry (null/undefined) crashes the entire Markdown export, not just that row

**File:** `index.html:3944` (in `sessionRows`, called from `exportRows:3388`)
**Issue:** `sessionRows`'s `addItem` guards the exercise object and checks `Array.isArray(item.sets)`,
but never guards the individual `set` element before dereferencing it:
```js
item.sets.forEach((set,i)=>{ rows.push({ date:s.date, workout:s.workout, exercise:item.name, set:i+1, weight:set.w, reps:set.r }); });
```
If any session anywhere in `DB.sessions` has a `sets` array containing `null` or `undefined` (e.g.
`sets:[null]`), `set.w` throws `TypeError: Cannot read properties of null (reading 'w')`. This
happens inside `Object.keys(COLLECTIONS).map(...)` in `buildMarkdownExport` (index.html:3420),
which has no per-collection try/catch, so the exception aborts the *entire* export — every
collection, not just the offending session — and `exportMarkdown`'s outer try/catch (index.html:3480)
downgrades it to a generic "Couldn't build the export" toast with no indication of which row or
collection is at fault.

`validateBackup` (index.html:3540-3543) only checks that `e.sets` is an array when present; it never
checks the type of each element, so a hand-edited backup with a null set element passes import
validation and reaches this code path. CLAUDE.md already documents this exact risk class ("a
hand-edited backup can put anything in a set's `w`") — this is the same class of gap, one level up
(the set itself, not just `w`). Verified live against the harness:
```
$ node -e "... a.DB.sessions=[{...entries:[{name:'A',sets:[null,{w:'5',r:'5'}]}]}]; a.buildMarkdownExport()"
THREW: TypeError Cannot read properties of null (reading 'w')
exportMarkdown result: error
```
Every other defensive check in this phase's code (the `item`/`h`/`obj` guards in `sessionRows`,
`hobbyRows`, `dayFlagRows`) treats one malformed row as droppable, not fatal — this is the one place
that standard wasn't applied to the innermost loop variable.
**Fix:** Guard the set element the same way `addItem` guards `item`, and drop only that set rather
than aborting the whole session/export:
```js
item.sets.forEach((set,i)=>{
  if(!set || typeof set!=='object') return;
  rows.push({ date:s.date, workout:s.workout, exercise:item.name, set:i+1, weight:set.w, reps:set.r });
});
```

### WR-02: `collectionProblems` doesn't require a `list` collection to declare `soft:true`, but `exportRows` unconditionally routes every list through `liveOf`

**File:** `index.html:3382-3390` (`exportRows`), `index.html:4017` (`collectionProblems`'s only `soft` check)
**Issue:** `exportRows` calls `liveOf(name)` for every `kind:'list'` collection with no check of
`spec.soft`:
```js
if(spec.kind==='list'){
  liveOf(name).forEach(item=>{ ... });
```
`liveOf` throws for any list whose `soft !== true` (index.html:722-726: `"liveOf: " + name + " is not a
declared soft-delete list"`). But `collectionProblems` only requires `soft` to be a boolean
(index.html:4017) — it never requires a *list* to set it `true` (it only forbids a *map* from setting
it `true`, index.html:4026). So a future `kind:'list', soft:false` entry passes registry validation
today with zero problems reported:
```
$ node -e "...collectionProblems({...COLLECTIONS, badList:{kind:'list',key:'id',merge:'union',soft:false,required:false,label:'Bad',columns:[{field:'date',label:'date'}]}})"
problems: []
```
Adding such a collection would compile cleanly, pass the boot-time registry check
(index.html:517-519), and then break the *entire* Markdown export (all nine other sections too,
since `buildMarkdownExport`'s `sections` array is built eagerly via `.map` before any output is
produced) the first time `exportMarkdown` is invoked — again surfacing only as the same generic
"Couldn't build the export" toast.
**Fix:** Either have `collectionProblems` require `soft===true` for every `kind:'list'` entry, or have
`exportRows` fall back to `(DB[name]||[]).filter(isLive)` directly instead of routing through the
throwing `liveOf` wrapper when `spec.soft` isn't `true`.

### WR-03: The documented "column[0] is always the date" contract is enforced nowhere

**File:** `index.html:482-488` (comment establishing the contract), `index.html:3408`,`3424` (code that
assumes it), `index.html:3999-4072` (`collectionProblems`, which never checks it)
**Issue:** The block comment above `COLLECTIONS` states the contract plainly: *"`columns[0]` is
always the row's ISO date, which the export sorts by and builds its date range from."* Both
`exportRows`'s D-11 sort (`spec.columns[0].field`, index.html:3408) and `buildMarkdownExport`'s date-range
scan (`spec.columns[0].field`, index.html:3424) depend on it. But `collectionProblems` never checks
that `columns[0]` looks like a date column (by name, or by validating its values), so a spec that
violates the contract passes registry validation silently:
```
$ node -e "...collectionProblems({...COLLECTIONS, badList2:{kind:'list',...,columns:[{field:'text',label:'text'},{field:'date',label:'date'}]}})"
problems: []
```
A future collection declared with its date column anywhere but first would silently sort by the
wrong field and compute a meaningless (or wrong) date range in the export header, with no test
failure, no thrown error, and no validation message pointing at the mistake — it would only surface
as visibly wrong output in a shipped export.
**Fix:** Add a `collectionProblems` rule requiring `columns[0].field` to be a recognized date-like
field name (e.g. `'date'` or `'created'`), or document it as `columns[0].isDate:true` and validate
that flag exists exactly once and at index 0.

## Info

### IN-01: Label validation permits the "Rows per section" line's own delimiter

**File:** `index.html:4008` (`validLabel`), `index.html:3439` (the line that joins labels with `' · '`)
**Issue:** `validLabel` forbids `|` and line breaks in a label (correct — those would corrupt a table
row or a `## ` heading), but the header's "Rows per section" summary line uses `' · '` as its own
field separator between `label: count` entries:
```js
'- Rows per section: ' + sections.map(({spec, rows}) => mdEscape(spec.label) + ': ' + countText(rows.length)).join(' · '),
```
A label containing `' · '` would still pass `validLabel` and would make that one summary line
ambiguous to parse (though the `## ` section tables themselves stay well-formed, since they don't
use `·` as a delimiter). None of the nine current labels contain it, so this isn't live today, but
nothing stops a future label from doing so.
**Fix:** Either add `·` to the characters `validLabel` forbids, or don't escape/interpolate labels
directly into a `·`-joined line — build that summary as its own small table instead.

### IN-02: `downloadMarkdown`'s boolean return value is dead

**File:** `index.html:3453-3458`
**Issue:** `downloadMarkdown` always `return`s `true` unconditionally; no caller (`exportMarkdown`,
`exportShareFailed`) ever inspects the return value — both call it as a bare statement. It reads as
if it were meant to report success/failure (paralleling `exportShareFailed`'s real `true`/`false`
return), but it can't fail in a way that would ever produce `false`.
**Fix:** Either drop the return value (the function can be `void`), or, if a future caller might want
to distinguish outcomes, wrap the body in a try/catch and actually return `false` on failure.

---

_Reviewed: 2026-09-17T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
