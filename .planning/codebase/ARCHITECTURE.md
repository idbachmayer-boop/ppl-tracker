<!-- refreshed: 2026-09-09 -->
# Architecture

**Analysis Date:** 2026-09-09

## System Overview

This is a single-file Progressive Web App (PWA) with no build step, no dependencies, and no module system. All HTML, CSS, and JavaScript coexist in `index.html`, with a separate service worker in `sw.js` for offline support. The entire application runs in browser memory with localStorage persistence and optional Firebase cloud sync.

```text
┌──────────────────────────────────────────────────────────────┐
│                   UI Layer (Views)                            │
├──────────────────┬──────────────────┬───────────────────────┤
│   Workouts       │   Tracking       │   Lawn & Care         │
│  `viewToday()`   │  `viewWeight()`  │  `viewLawn()`         │
│  `viewActive()`  │  `viewCardio()`  │  `viewSkincare()`     │
│  `viewStrength()` │ `viewPetWeight()`│  `viewData()`         │
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │                  │                     │
         ▼                  ▼                     ▼
┌──────────────────────────────────────────────────────────────┐
│                 State & Business Logic                        │
│  Workouts: nextWorkout(), sessionRanges(), exercisePRs()     │
│  Lawn: lawnStatus(), mowForecast(), lawnRainWindow()         │
│  Data: mergeDB(), normalize(), touch()                       │
│  `DB` object (in-memory state)                               │
└────────┬────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│           Persistence & Sync Layer                            │
│  localStorage: `ppl_tracker_v1` (local state)                │
│  localStorage: `ppl_tracker_snaps_v1` (snapshots)            │
│  Firebase: Firestore + Auth (cross-device)                   │
│  Service Worker: `sw.js` (offline shell caching)             │
└──────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| UI Views | Render screens (Today, Workouts, Weight, Cardio, Lawn, Skincare, Data) | `index.html:1374-3650` |
| State/Logic | Core algorithms (workout progression, lawn scheduling, PR detection) | `index.html:533-3100` |
| Data Load/Save | localStorage I/O, schema migration, snapshots | `index.html:640-735` |
| Sync/Merge | Firebase listen, union merge, conflict resolution | `index.html:3644-3900` |
| Styling | Theme (Nocturne), components, responsive layout | `index.html:12-260` |
| PWA Bootstrap | Manifest creation, SW registration | `index.html:296-315` |
| Service Worker | Network-first fetch, cache versioning | `sw.js` |

## Pattern Overview

**Overall:** Single-file functional reactive architecture with localStorage-first persistence and optional cloud sync.

**Key Characteristics:**
- **No module system** — all code runs in global scope (intentional, keeps app installable)
- **Render-on-mutation** — `render()` rebuilds DOM whenever state changes
- **Soft deletes** — rows set `deletedAt` timestamp, never removed; filters use `isLive()`
- **Union-based sync** — remote and local changes merge via `mergeDB()`, not overwrite
- **Schema versioning** — migrations run idempotently at boot, `mtime` prevents stale data winning

## Layers

**View Layer:**
- Purpose: Generate HTML for each screen (tab or sub-view)
- Location: `index.html:1374-3650`
- Contains: `viewToday()`, `viewActive()`, `viewWeight()`, `viewStrength()`, `viewLawn()`, `viewSkincare()`, etc.
- Depends on: State layer (DB, business logic functions)
- Used by: `render()` (main router)

**State & Business Logic Layer:**
- Purpose: Compute derived state, enforce business rules, answer "what should happen?"
- Location: `index.html:533-1320`
- Contains: Workout progression (`nextWorkout()`, `sessionRanges()`), lawn scheduling (`mowForecast()`, `lawnStatus()`), PR detection (`exercisePRs()`), plate math (`plateBreakdown()`), weather logic (`rainTiming()`)
- Depends on: Core data (DB object, constants)
- Used by: Views, event handlers

**Data Layer:**
- Purpose: Persist state to localStorage, load at boot, normalize on migration
- Location: `index.html:473-735`
- Contains: Schema definition, migrations (MIGRATIONS), `load()`, `save()`, `saveLocal()`, snapshots
- Key state: `DB` (in-memory), `KEY` (localStorage key), `SCHEMA` (version number)
- Depends on: localStorage, Date
- Used by: Bootstrap, sync handlers, all state changes

**Sync Layer:**
- Purpose: Merge cloud and local state, handle conflicts, push changes
- Location: `index.html:3644-3900`
- Contains: `mergeDB()` (union merge), `mergeUnion()` (per-row logic), Firebase listeners, `adoptMerged()`, reconciliation on auth changes
- Depends on: Data layer, Firebase SDK
- Used by: Firebase callbacks, user actions that touch remote

**PWA & Offline Layer:**
- Purpose: Install to home screen, work without network
- Location: `index.html:296-315` (manifest + SW registration), `sw.js`
- Contains: Inline manifest blob, service worker registration with error handling, SW cache versioning
- Depends on: HTML5 Web APIs
- Used by: Browser (registration), network requests (SW intercept)

## Data Flow

### Primary Request Path (e.g., logging a set)

1. **User taps "Log set"** → `onpointerdown` or `onclick` event handler in HTML
2. **Handler calls business logic** → e.g., `setStatus()`, `addSet()` (modifies `DB` object in memory)
3. **Calls `save()`** → bumps `DB.updatedAt`, triggers Firebase push via `syncToCloud()` (if signed in)
4. **Calls `render()`** → re-evaluates `tabDef(TAB).render()` to regenerate HTML

### Lawn Scheduling (Weather-Driven)

1. **Boot** → `lawnStatus()` reads `DB.lawnLog`, `DB.lawn` (location), `DB.wx` (cached weather)
2. **`lawnStatus()` calls** `mowForecast()` → computes next 7 days, applies weather + time rules
3. **Weather cached at boot** from Firebase or Open-Meteo API (via cloud function)
4. **View renders** mow/water recommendations, user can log backdated actions
5. **Next sync** → `lawnLog` row is touched and merged with cloud (union-based)

### Cloud Sync (Firebase)

1. **User signs in** → Firebase auth, fetch remote DB snapshot
2. **`mergeDB(remoteDB, DB)`** → union merge, newer timestamps win, soft-deleted rows excluded
3. **Reconcile after login** → if local has newer data, re-merge with `localWins=true`
4. **Ongoing sync** → every local mutation → `save()` → `syncToCloud()` → Firebase `runTransaction()` re-reads and calls `mergeDB()` again (prevents stale overwrites)
5. **Remote listener** → `onSnapshot()` watches remote, calls `mergeDB()` if cloud changed

**State Management:**
- Single `DB` object holds all state (no Redux, Vuex, or equivalent)
- `DB.sessions`, `DB.weights`, `DB.cardio`, `DB.lawnLog`, `DB.ideas`, etc. are arrays/objects
- Mutations directly modify `DB`, then `save()` persists and `render()` redraws
- No action/reducer pattern; logic functions modify DB directly

## Key Abstractions

**Exercise (ex):**
- Purpose: Represents one movement in a workout slot (muscle, movement type, rep range)
- Examples: `ex("Chest","Horizontal push",3,5,8,...)`
- Pattern: Data-only tuple-like object, defined by `ex()` factory, grouped into PROGRAM

**Session:**
- Purpose: One complete workout (Push 1, Legs 2, Pull 1, etc.)
- Examples: `{ id:'s0_2026-09-09_h1', workout:'PUSH 1', date:'2026-09-09', entries:[{name:'Barbell bench press', sets:[{w:'185',r:8}, ...]}], endedAt:1694...}`
- Pattern: Captures sets and metadata, soft-deleted if `deletedAt` is present, stored in `DB.sessions`

**Workout Slot:**
- Purpose: One exercise position within a workout program
- Examples: Slot 0 = Chest Horizontal push, Slot 1 = Chest Incline push
- Pattern: Index into `PROGRAM[workoutName].slots[]`, used to track PR history per slot

**Lawn Day (in forecast):**
- Purpose: One day's mowing/watering status with decision rules applied
- Examples: `{ k:2, ok:true, blocked:null, growthSpike:false, iso:'2026-09-11', before:null, dsMow:8 }`
- Pattern: Returned by `mowForecast()`, carries all context to render the day's recommendation

## Entry Points

**Main Router:**
- Location: `index.html:1311-1322`
- Triggers: Tab bar clicks, deep links (URL hash), programmatic `go(tab)` calls
- Responsibilities: `go(id)` sets `TAB`, `goSub(id,sub)` sets subtab, `render()` invokes `tabDef(TAB).render()`

**Tab Definitions:**
- Location: `index.html:1282-1310`
- Each entry: `{ id, label, render, sub, subs }`
- Example: `{ id:'train', label:'Train', render:viewActive, sub:true, subs:[['session','Session'], ['upcoming','Next workout']] }`

**Bootstrap:**
- Location: `index.html:634-639` (inside `<script>`)
- Triggers: Page load
- Responsibilities: `load()` from localStorage, `normalize()` runs migrations, sets `DB`, triggers Firebase listeners

## Architectural Constraints

- **Threading:** Single-threaded event loop; no Web Workers or async handling except Firebase callbacks
- **Global state:** Single `DB` object in global scope, service layer functions also global. No lexical scope isolation.
- **Circular imports:** Not applicable (no module system)
- **Persistence:** localStorage-only at boot; Firebase sync optional and background
- **File size:** Entire app must stay <500KB (index.html ~330KB) to remain installable and fast
- **Offline-first:** App must be fully functional (logs, reads, edits) even if Firebase is unreachable

## Anti-Patterns

### Anti-Pattern: Overwrite Instead of Merge

**What happens:** If sync used `set()` instead of `runTransaction() + mergeDB()`, a stale device would blind-write the cloud, destroying remote edits.

**Why it's wrong:** Cloud and device can diverge legitimately (edits on different devices). Union merge is the only safe strategy.

**Do this instead:** Every remote write is a `runTransaction()` that re-reads and calls `mergeDB()`. See `syncToCloud()` in `index.html:3750-3780`.

### Anti-Pattern: Deleting Rows from Arrays

**What happens:** Splicing a workout session out of `DB.sessions` would resurrect it on every merge, because union merge re-adds anything it sees in the remote.

**Why it's wrong:** Soft delete is idempotent; hard delete is not. Merging a hard-deleted row back in silently.

**Do this instead:** Set `session.deletedAt = Date.now()`, filter via `isLive()`, and read through `liveSessions()`. See `index.html:651-659` and `CLAUDE.md` line 25.

### Anti-Pattern: Storing Absence as a Deleted Key

**What happens:** If lawn log day deleted the `watered` key instead of storing `false`, the merge would pick "never logged" from the newer device and never recover.

**Why it's wrong:** Union merge takes the whole day object from the newer side. A missing key is not the same as explicitly `false`.

**Do this instead:** `setLawnLog()` stores explicit `false` when un-logging. See `index.html:3084-3089` and `CLAUDE.md` line 30.

## Error Handling

**Strategy:** Try/catch at I/O boundaries (localStorage, Firebase, fetch); silent recovery with user alerts for quota failures; exceptions in views caught by `render()` wrapper.

**Patterns:**
- `load()` returns `blank()` if localStorage parse fails
- `syncToCloud()` catches Firebase errors and displays toast
- Views wrapped in try/catch in `render()` to show friendly "something broke" card instead of crash
- Quota failure shows banner in Settings, offers `clearSnaps()` to free space

## Cross-Cutting Concerns

**Logging:** No server logging; browser console only for development. Firebase events are metadata (timestamps, schema versions).

**Validation:** Minimal; `validateBackup()` checks *shape* of imported file, not values. Escaped user strings via `esc()` prevent XSS. Attribute values not escaped (known vulnerability in `CLAUDE.md` line 48).

**Authentication:** Firebase Auth only. Signed-out users see full app with local-only data. Sign-in triggers merge of remote snapshot into local. No permission system within app.

---

*Architecture analysis: 2026-09-09*
