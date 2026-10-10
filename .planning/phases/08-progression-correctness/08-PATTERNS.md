# Phase 8: Progression Correctness - Pattern Map

**Mapped:** 2026-10-10
**Files analyzed:** 3 (all modified, none created)
**Analogs found:** 3 / 3 (all in-file: this phase rewrites existing helpers in place)

Line numbers as of commit 6852613; re-grep before editing.

## File Classification

| Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------|------|-----------|----------------|---------------|
| `index.html` — progression helpers (`addWeightInfo`, `slotE1rmSeries`, `isStalledSlot`, new per-slot comparison helper) | utility (pure) | transform (history -> verdict) | the same functions, L1090-1098, L1147-1165 | exact (rewrite in place) |
| `index.html` — `finishWorkout` blank-set marker (D-01) | service | CRUD (write on save) | `exId` stamp in `finishWorkout` L2041-2045 | exact |
| `index.html` — `editSession` carries the new field | service | CRUD (round-trip) | `deload:!!e.deload` in `editSession` L2259 | exact |
| `index.html` — `viewActive` flag + stall coach lines | component (template) | request-response (render) | L1813-1815, L1830-1831 | exact |
| `test/app.test.js` — new "progression" section + `f2Stall` rewrite | test | — | REG-04 block L2136-2158; `f2Stall` L7177-7186; RESEARCH.md prototype L540-556 | exact |
| `test/harness.js` (optional) — export new helper names | config | — | export list L117-156 | exact |

## Pattern Assignments

### Progression helpers (index.html L1090-1098, L1147-1165)

**Current code to replace:**
```js
const INCREMENT = { lb:5, kg:2.5 };
function addWeightInfo(slot, ref, name){
  if(!ref) return null;
  const rng=effRange(slot, name), real=ref.entry.sets.filter(x=>!x.skipped && x.r!=='');
  if(!real.length) return null;
  const lastW=Math.max(0, ...real.map(x=> x.w===''?0:+x.w));
  return { allTop: real.every(x=> +x.r >= rng.hi), lastW, newW: lastW+(INCREMENT[DB.unit]||5), hasLoad: lastW>0 };
}
```
```js
function slotE1rmSeries(name, workout, slotIndex){
  const v=[];
  liveSessions().forEach(s=>{ if(s.skipped || s.workout!==workout || !s.entries) return;
    const e=s.entries[slotIndex]; if(!e || e.deload || e.name!==name) return;   // name match -> exKey (D-04)
    let best=0; e.sets.forEach(x=>{ if(!x.skipped){ const val=e1rm(x.w,x.r); if(val>best) best=val; } });
    if(best>0) v.push(best); });                                                  // drops BW (D-08 bug)
  return v;
}
function isStalledSlot(name, workout, slotIndex){ ... maxBefore ... }           // all-time best goes (D-06)
```
Conventions to keep: `function` declarations (hoisted, reachable as `a.__sandbox.x`), read history only
through `liveSessions()`, identity via `exKey(e)===exKey(name)` (L1208-1212), weight via existing
`setLoad` (L1283), range via `effRange(slot,name)` (L868). Keep the `isStalledSlot(name, workout, slotIndex)`
signature so the render site and test caller keep working; delete `slotE1rmSeries`. Replace the comment
block L1147-1151 with one describing the new rule. Put the INCREMENT read behind one seam for Phase 9.
`addWeightInfo` must judge the latest non-deload entry on the card (D-09), not `lastRealEntry`'s ref.

### finishWorkout blank-set marker (index.html L2041-2045)

**Analog — save-time stamp in the same function:**
```js
  // keep skipped sets (they carry a reason); drop sets with no reps (incl. pre-filled-weight-only)
  d.entries.forEach(e=>{ e.sets = e.sets.filter(s=> s.skipped || s.r!==''); e.sets.forEach(s=>delete s._cel); });
  d.entries.forEach(e=>{ if(e.name && !e.exId) e.exId = exEnsure(e.name); });
```
Count blanks before the filter line (e.g. `e.blankSets = n` only when n>0, matching the prototype's
`o.blankSets`). Additive field, no migration, `finishWorkout` already `save()`s.

### editSession round-trip (index.html L2259)

```js
return e ? { name:e.name, note:e.note||'', deload:!!e.deload, sets:(e.sets||[]).map(x=>({w:x.w,r:x.r,skipped:!!x.skipped,reason:x.reason||''})) }
```
Add the new field next to `deload` or it is lost on edit (RESEARCH Pitfall 2).

### Render sites (index.html L1813-1815, L1830-1831)

```js
const aw = addWeightInfo(s, ref, entry.name);
flag = (aw && aw.allTop) ? `<span class="flag">⬆ Add weight${aw.hasLoad?` → ${aw.newW} ${DB.unit}`:''}</span>` : '';
...
else if(isStalledSlot(entry.name, name, i)) coachHint = `<div class="coach stall">⚠ Stalled — no new best for this exercise on ${name} in 3 sessions. <button class="coach-btn" data-action="deloadExercise" data-i="${esc(i)}">Deload −10%</button> or swap the exercise above.</div>`;
```
Pattern: attributes via `data-action` + `data-i="${esc(i)}"`; wrap `DB.unit` in `esc()` on the touched
line; BW branch (D-08) shows "add weight (belt) or harder variation" with no number. Update the stall
wording (discretion).

### Tests (test/app.test.js)

**Section/assert style** (L2136-2140):
```js
  // ── REG-04: the promoted key functions, proven identical to their pre-phase bodies ──
  ok('keys: sessKey uses the stable id when present', app.sessKey({id:'x'}) === 'x', app.sessKey({id:'x'}));
```
Use `// ── PROG-0x: ... ──` headings and `ok(name, cond, detail)`. Lift the fixture builder
`latSess`/`latRun` verbatim from 08-RESEARCH.md L540-556 (seeds via `normalize` at `_schema:16`).

**Fixture to rewrite** (L7177-7186): `f2Stall` pushes `185x8` then three `135x5` — a *lighter* session
under D-03, so it restarts and is no longer a stall. Rewrite to baseline + 3 equal-weight flats with the
last 4 real PUSH 1 slot-0 sessions (watch `populatedDB`'s `s1` at L2515). Caller at L7329
(`busyStalled = a.__sandbox.isStalledSlot(...)`) must stay true.

Draft rule check `DRAFT_PUSHERS` (L3736): do not add `save()` to any new draft-reading function.

## Shared Patterns

- **Escaping:** `esc()` on every interpolated value, double-quoted attributes only (CLAUDE.md).
- **CSP:** any inline-script change -> `npm run csp:hash` then `npm test`.
- **Soft deletes:** history only via `liveSessions()`.
- **No stored verdicts:** stall/add-weight computed at render (D-07); no migration, `SCHEMA` unchanged.

## No Analog Found

None.

## Metadata

**Analog search scope:** index.html, test/app.test.js, test/harness.js, 08-RESEARCH.md
**Pattern extraction date:** 2026-10-10
