# Coding Conventions

**Analysis Date:** 2026-09-09

## Naming Patterns

**Files:**
- Single file architecture: `index.html` (app), `sw.js` (service worker), test files in `test/`
- Descriptive names with underscores: `app.test.js`, `harness.js`

**Functions:**
- camelCase for all functions: `todayISO()`, `lawnStatus()`, `mowForecast()`, `exercisePRs()`
- Arrow functions for callbacks and small utilities
- Regular function declarations for core logic
- Descriptive action verbs: `setLawnLog()`, `toggleLawnLog()`, `validateBackup()`, `mergeDB()`

**Variables:**
- camelCase for all variables: `DB`, `draft`, `sessions`, `lawnLog`
- UPPER_CASE for constants: `SCHEMA`, `KEY`, `PROGRAM`, `SEQUENCE`, `MIGRATIONS`
- Boolean variables often prefixed with action or state: `isLive`, `deletedAt`, `snapRingDisabled`
- Single-letter loop variables in performance-critical code: `i`, `n`, `d` (but always scoped narrowly)

**Types/Objects:**
- Workout names in all caps with spaces: `"PUSH 1"`, `"LEGS 1"`, `"PULL 1"`
- Exercise names in title case: `"Barbell bench press"`, `"Deficit sumo squat"`
- ISO date strings: `"2026-08-07"` (YYYY-MM-DD local, no timezone)
- Database field names describe content, not type: `mtime` (modification timestamp), `updatedAt`, `deletedAt`

## Code Style

**Formatting:**
- Semicolons required (not optional)
- Spaces around operators: `a = b`, `x > y`
- No spaces inside parentheses: `foo(a, b)` not `foo ( a, b )`
- Object literals use shorthand when possible: `{ name, movement, sets }`
- Comments use `//` for inline, `/* */` for blocks and headers
- Section headers use ASCII dividers: `/* ─────────ClassName───────── */`

**Linting:**
- No linter detected; formatted by hand
- Strict equality (`===`, `!==`) throughout

**Indentation:**
- 2 spaces per level (consistently throughout the codebase)
- No tabs

## Import Organization

**Module system:**
- No build step, no module system
- Single-file script with everything in global scope (intentionally — offline-first PWA)
- Exports via function declarations and const statements in the script scope
- Test harness extracts named functions via vm context

**Order within index.html:**
1. External script tags (Firebase CDN) with `defer`
2. Inline `<script>` containing:
   - PWA setup (manifest, service worker registration)
   - Program definition and constants
   - Storage and migration logic
   - Helper functions
   - Main app logic and views
   - Event handlers and initialization

**Path aliases:**
- None (single file; no paths needed)

## Error Handling

**Patterns:**
- Silent catches for migrations: `try{ d = MIGRATIONS[v](d) || d; }catch(e){}`
  - Reason: A temporal-dead-zone ReferenceError in a migration would crash the boot but advance `_schema`, skipping that migration forever. Silent catch preserves data.
- Defensive initialization in normalize(): check types and provide fallbacks
  - Example: `if(typeof d.unit!=='string') d.unit='lb';`
- Try/catch around localStorage operations always return false on failure, never throw
  - Example: `function saveLocal(){ try{ localStorage.setItem(KEY, JSON.stringify(DB)); return true; }catch(e){ return handleQuotaFailure(); } }`
- Quota failure handling: clear snapshots, attempt one more save, show banner if needed
- Promise rejection swallowed where intentional: `.catch(() => {})`
  - Used in service worker cache operations and non-critical setup

**View rendering safety:**
- `render()` wraps each view in try/catch; shows "Something broke on this screen" instead of crashing
- Test suite calls views directly (catches are errors, not silent) to catch regressions

**Data validation:**
- `validateBackup()` checks shape, not types inside (hand-edited backups can have anything)
- Check array types: `Array.isArray(d.sessions)` before using array methods
- Check object types: `typeof d==='object'` before accessing properties
- Never assume migration results; check the result: `d = MIGRATIONS[v](d) || d`

## Logging

**Framework:** `console` (no logging library)

**Patterns:**
- Test suite logs with `console.log('  PASS  ' + name)` or `console.log('  FAIL  ' + name)`
- No logging in the app itself (PWA, offline use)
- Console output in test suite is structured with ASCII headers: `console.log('\n── mow forecast: when is the next mow? ──');`

## Comments

**When to comment:**
- Before complex logic explaining the "why": "the sync merge takes the whole day object from the newer side, so a deleted key would read as 'never logged' on the other device"
- Before data structures explaining their invariants: "Deletes are soft. Never splice a row out"
- Before migrations explaining the change: "Goblet squat → Deficit sumo squat: the same slot and the same 12–15 target, renamed"
- Before performance-critical code explaining the optimization
- Before known limitations or gotchas

**JSDoc/TSDoc:**
- Not used; comments are ad-hoc explanations before logic

**Comment style:**
- Multi-line comments in blocks with section headers: `/* ─── Soft delete ─── */`
- Inline comments explain non-obvious code: `if(!new.target) return new Real(fixedMs).toString(); // invoked as Date.now()`
- Comments explain production bugs the code prevents: "// On 2026-07-25 a stale device blind-wrote the cloud..."

## Function Design

**Size:**
- Prefer small, single-purpose functions (`todayISO()`, `isLive()`, `touch()`)
- Complex logic broken into helpers with clear names: `lastRealEntry()`, `effRange()`, `restTargetFor()`
- Large views (300+ lines) are acceptable when rendering requires lots of markup

**Parameters:**
- Keep to 3 or fewer; use object destructuring for multiple related params
- Optional params use object destructuring: `function ex(muscle,movement,sets,lo,hi,examples,note='',overrides=null)`

**Return values:**
- Return the object modified for chaining: `function touch(x){ if(x && typeof x==='object') x.mtime = Date.now(); return x; }`
- Return booleans for success/failure: `function softDelete(arr, pred){ const it = (arr||[]).find(...); if(!it) return false; ... return true; }`
- Return null for "not found" (not undefined)
- View functions return HTML strings

**Side effects:**
- Many functions modify `DB` directly (not pure)
- Functions that modify DB also call `save()` to persist: `setLawnLog()`, `setStatus()`
- Helpers that DON'T modify DB are prefixed with clear intent or named as queries: `isLive()`, `lastRealEntry()`, `effRange()`

## Module Design

**Exports:**
- All top-level function declarations are available globally
- Const definitions are available globally
- Test harness extracts specific named functions via vm context

**Barrel files:**
- Not applicable (single file)

**Scoping:**
- IIFE for PWA setup: `(function(){ ... })()`
- IIFE for date freezing in test harness: `function frozenDateClass(fixedMs){ const Real = Date; function Frozen(...) { ... } return Frozen; }`

## Escaping & Security

**User input handling:**
- Every user-controlled string rendered into HTML goes through `esc()` function
- **Critical exception:** `esc()` does NOT escape `'` (single quote), so never put a user string inside an inline handler's quotes
- **Attribute escaping:** Values interpolated into attributes (`value="${st.w}"`) are NOT escaped by `esc()` and need separate escaping
- Example from CLAUDE.md: "validateBackup() checks the *shape* of an imported file, never the types inside it, so a hand-edited backup can put anything in a set's `w`. Escape attributes too when you touch them."

**Theme & Icons:**
- Phosphor icons inlined in the `PH` map (no CDN, no web font — offline-first)
- CSS custom properties for all colors: `--bg`, `--text`, `--accent`, `--good`, `--bad`, etc.
- Never hard-code hex colors; always reference `:root` custom properties
- Emoji used only where they mark something logged, typed, or celebrated

**Security rules:**
- `firestore.rules` lives in this repo (not only in Firebase console)
- Read the header of `firestore.rules` before changing or deploying
- Rules have not yet been reconciled with what is actually live

## Data Integrity Patterns

**Sync union merge, never overwrite:**
- Every remote write is a `runTransaction` that re-reads and calls `mergeDB()`
- Never use `set()` (overwrites); always use merge
- Production lesson: On 2026-07-25 a stale device blind-wrote the cloud and destroyed four days of weigh-ins, unrecoverably

**Soft deletes over splice:**
- Never splice a row out of `sessions`/`weights`/`cardio`/`ideas`/`todos`/`hobbyLog`/`petWeights`
- Set `deletedAt`, call `touch()`, and read through `liveSessions()`, `liveWeights()`, etc.
- A missed filter ghosts a deleted row back into a view
- Production lesson: Hard deletes resurrected deleted rows from cloud merge forever

**Explicit false, never absence:**
- `mobilityLog` and `lawnLog` take the whole inner object from the newer side
- A deleted key reads as "never logged" on the other device
- Store an explicit `false` to mark "off"
- Example: `(app.setLawnLog(dayOff(-3),'watered',true), app.setLawnLog(dayOff(-3),'watered',false), app.DB.lawnLog[dayOff(-3)].watered === false)`

**Migrations must touch modified rows and persist immediately:**
- Migration 15 was silently reverted in production: `normalize()` runs at boot in memory, nothing saved it
- Rows without `mtime` were preferred as stale on merge, then stamped with new schema anyway
- Migration could never run again — fix: touch rows, save immediately, test with stale-device merge
- Helper: `renameLoggedExercise()` rewrites exercise names in sessions and draft, calls `touch()` on changed rows

**Derived data uses `saveLocal()`, not `save()`:**
- `save()` bumps `updatedAt` and triggers cloud push
- Weather cache using `save()` let a stale device look "newest" by being opened
- Use `saveLocal()` for cache, nag bookkeeping, etc.

---

*Convention analysis: 2026-09-09*
