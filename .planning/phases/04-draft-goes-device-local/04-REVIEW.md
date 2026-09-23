---
phase: 04-draft-goes-device-local
reviewed: 2026-09-23T11:38:59Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - index.html
  - test/app.test.js
  - test/harness.js
  - CLAUDE.md
  - docs/adding-a-collection.md
findings:
  critical: 0
  warning: 6
  info: 5
  total: 11
status: issues_found
---

# Phase 4: Code Review Report

**Reviewed:** 2026-09-23T11:38:59Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Scope: `git diff 2b5718e..HEAD` over `index.html`, `test/app.test.js`, `test/harness.js`, `CLAUDE.md` and `docs/adding-a-collection.md`. The suite is green at 786/0/2.

**Can a foreign draft still reach `DB.draft`?** No. I traced every path:

- `mergeDB()` deletes `draft` in both branches (index.html:4166, 4182), and the output is a fresh object each time.
- `adoptMerged()` overwrites whatever it receives with `keepLocalDraft()` (4304), so every caller is covered: sign-in merge, first-link M, first-link C, the live listener and the post-push reconcile.
- The first-link C choice strips before `normalize()` (4353).
- `importMerge`, `importReplace`, `restoreSnapshot` and `restoreCloudVersion` all use `keepLocalDraft(normalize(stripDraft(raw)))`.
- The only other `DB =` sites are the boot `load()` and `wipe()`, which clears the draft by design (D-08).
- No `DB.draft = <foreign>` assignment exists.

The pushNow race that used to resurrect a finished workout is closed. The reconcile reattaches the draft as it is at that moment, not the in-flight snapshot's copy.

**Can the local draft still be dropped?** Only by Erase, Discard, Finish, a confirmed start or edit, or `normalizeDraft()` nulling an unknown workout. `stripDraft` and `keepLocalDraft` cover every path I found.

**Draft writers still calling `save()`:** only `pickEx`, `exPick` and `finishWorkout`, as the phase intended. `pickEx` and `exPick`, though, bump and push even when nothing synced changed (WR-03).

Two things are weaker than the phase claims:
- A truthy non-object local draft now crashes the Log tab, and nothing can clear it (WR-02). I reproduced this.
- A draft kept across restore, Replace or a remote Erase can finish with a dangling `exId` (WR-04).

**The deferred Lawn-tab loop is a real app bug**, and it is broader than `deferred-items.md` says (WR-01, reproduced). It also fires on the Today tab during lawn season, and online on any non-2xx response. The harness change hides it rather than detecting it (WR-05).

## Warnings

### WR-01: Weather fetch retries in an unbounded fetch→fail→render loop, on Today as well as Lawn (pre-existing, real)

**File:** `index.html:2867-2884` (fetchWeather / maybeFetchWeather), triggered from `index.html:1380` (Today `onRender`) and `index.html:1386` (Care → Lawn `onRender`)
**Issue:** The deferred item is a real app bug, not a harness artifact. When `fetchWeather()` fails, it sets `weatherFetching=false` and calls `render()`. That runs the tab's `onRender` → `maybeFetchWeather()`. The cache is still stale, so it calls `fetchWeather()` again, and nothing records the failure. I reproduced it in a scratch harness by overriding `a.__sandbox.fetch` after boot. With `DB.lawn` set and `DB.wx=null`, each case made about 20 fetches in 300 ms, with two full `render()`s per fetch:
- **Today tab, offline** (fetch rejects on a 1 ms timer). The Today `onRender` calls `maybeFetchWeather()` whenever `lawnSeason(now)` is set. So the landing screen spins, not just Lawn. `deferred-items.md` only names the Lawn tab.
- **Care → Lawn, offline:** the same loop.
- **Today tab, online, HTTP 429/5xx** (`{ok:false}`): `if(!r.ok) throw 0` feeds the same loop. It hammers open-meteo while the API is rate-limiting.

`sw.js:34` returns early for cross-origin requests, so the worker never intercepts. On a phone in airplane mode, `fetch` rejects within milliseconds and the loop runs as fast as the event loop allows. It drains the battery, and every `render()` rebuilds the DOM, which takes focus from any input on that screen. Offline-first is the app's core promise and Today is the landing screen. This predates Phase 4, so it does not block merging the phase, but it should be the next fix.
**Fix:** Record the failure and back off. Never retry from the render that reports the failure:
```js
let weatherFetching=false, weatherFailedAt=0;
async function fetchWeather(){
  if(!DB.lawn || DB.lawn.lat==null || weatherFetching) return;
  weatherFetching=true; render();
  try{ /* …unchanged… */ weatherFailedAt=0; }
  catch(e){ weatherFailedAt=Date.now(); }
  weatherFetching=false; render();
}
function maybeFetchWeather(){
  if(!DB.lawn || DB.lawn.lat==null || weatherFetching) return;
  if(Date.now()-weatherFailedAt < 10*60*1000) return;   // failed recently — wait, don't spin
  /* …stale check unchanged… */
}
```
Add a regression check that counts `fetch` calls: with a harness `fetch` that rejects on a macrotask, show Today with a stale cache in summer, wait, and assert at most one call.

### WR-02: A truthy non-object local draft crashes the Log tab, and no sync can clear it any more

**Resolved (2026-09-23):** `normalizeDraft` now nulls any non-object stored draft; test `WR-02: the Log tab draws when this device boots from any malformed stored draft` covers every DRAFT_SHAPES entry plus true/false/empty string.

**File:** `index.html:656-659` (`normalizeDraft`)
**Issue:** `normalizeDraft` returns early on `typeof k!=='object'`, so a stored draft of `"x"`, `42` or `true` survives `normalize()`. `DB.draft` is truthy, so Train → Log routes to `viewActive()`. `PROGRAM[undefined].group` throws there, and the Log tab shows "Something broke on this screen". The Discard button lives inside `viewActive()`, so it can't be reached. Today still shows a "Workout in progress" card, and its Resume button leads to the crashed tab.

Before Phase 4, the next newer remote write (draft `null`) replaced it. Now D-05 makes the local draft untouchable by any merge, so the bad state is permanent until Ian finds History → "log a past workout" or Erase all data. Verified in the harness: I booted from a seed with `draft:"x"` (then `42`, then `true`) and the Log tab broke. After `adoptMerged(mergeDB(newerRemoteWithNullDraft, DB))`, the draft was still `"x"`.

This can only happen on a device that already stored such a value. A pre-Phase-4 import of a hand-edited backup could do it, because `normalize()` never type-checked the draft, and so could a pre-Phase-4 sync of a malformed cloud doc. The new code comment ("a blob written by an older build … on this same device") names that exact source, but only handles short objects. The DRAFT-03 battery tests only malformed *remote* shapes. It never tests a malformed *local* one.
**Fix:**
```js
function normalizeDraft(d){
  const k = d && d.draft;
  if(k==null) return d;
  if(typeof k!=='object' || Array.isArray(k) || !PROGRAM[k.workout] || !Array.isArray(k.entries)){ d.draft = null; return d; }
  …
}
```
Add a test that boots from a stored blob holding each `DRAFT_SHAPES` value as the local draft, and asserts the Log tab draws.

### WR-03: `pickEx` / `exPick` bump `updatedAt` and push even when nothing synced changed

**File:** `index.html:1913-1921` (`pickEx`), `index.html:2729-2737` (`exPick`); the test at `test/app.test.js:3230` allowlists both
**Issue:** The allowlist is justified by "they can found an exercise-registry row". But `save()` runs unconditionally:
- when the picked name is already registered (`exEnsure` returns the existing id, so the registry is unchanged);
- when a custom-name `prompt()` is cancelled (`picked` is null, so nothing changed at all).

Both are draft-only edits, and both do what D-09 and the weather-cache rule forbid: they make a device with a workout open look newest. `exercises`, `unit`, `routineMode`, `hobbies` and `lawn` are taken whole from the newer side (`index.html:4172`). Example: Ian swaps to an existing lift mid-workout on an offline phone, then discards. The phone now outranks a registry rename or merge made at home.
**Fix:** Push only when the registry actually grew:
```js
const before = exRows().length;
e.name = sel.value; e.exId = exEnsure(sel.value);
if(exRows().length !== before) save(); else saveLocal();
render();
```
Apply the same guard to the `__custom` branch (`if(!picked){ return; }` before persisting). Then tighten the allowlist test: a pick of an existing exercise must not push.

### WR-04: A draft kept across restore, Replace or a remote Erase can land a session whose `exId` is in no registry

**File:** `index.html:2016-2017` (`finishWorkout`), with `keepLocalDraft` call sites at `index.html:3612, 3619, 4304, 4485, 4498`
**Issue:** `pickEx` and `exPick` stamp `e.exId` on draft entries. The draft now survives any operation that replaces the registry: restore a snapshot, restore a cloud version, Import Replace, or a remote Erase (gen bump). The whole point of D-05/D-07/D-08 is that the draft outlives these, and every one of them can drop the registry row that `exId` points at.

`finishWorkout` only calls `exEnsure` when `!e.exId`, so the dangling id is written into a synced session. `exLabel()` then shows the raw slug instead of the name, and `exKey()` groups the session under an id no registry row owns. If the slug had a collision suffix (`-2`), a later `exEnsure(name)` will not re-link it, and the history stays split permanently.

Before Phase 4 these operations replaced the draft along with the registry, so this state could not occur. Plan 04-02 flags it as "rare and visible, no data lost", but the result is synced into the cloud doc.
**Fix:** Re-resolve at finish, where it is cheap and covers every path:
```js
d.entries.forEach(e=>{ if(e.name && (!e.exId || !exRow(e.exId))) e.exId = exEnsure(e.name); });
Object.keys(x).forEach(w=>{ const e=x[w]; if(e && e.name && (!e.exId || !exRow(e.exId))) e.exId = exEnsure(e.name); });
```
Add a replay test: pickEx a new lift → Import Replace with an older backup → finish → the session's `exId` is in `DB.exercises`.

### WR-05: The never-settling harness `fetch` hides WR-01 and silently changes weather behaviour for every instance

**File:** `test/harness.js:80-85`
**Issue:** The change unblocks the suite, and the comment says so honestly. But its side effects hurt test reliability:
1. The loop is now structurally undetectable. No test can observe a second fetch, because the first one never resolves.
2. Any instance that ever enters `fetchWeather()` latches `weatherFetching=true` for the rest of its life. After that, `maybeFetchWeather()` is a no-op and the Lawn empty state always says "Loading weather…". A later weather or Lawn assertion on a shared instance (`app`) can pass or fail for the wrong reason.
3. A future test of `searchLocation()`/`geocodeTry()` hangs until the 10 s `asyncBlock` timeout, instead of exercising the offline branch the app actually has.

**Fix:** Make the stub observable and bounded rather than inert. Count calls and reject on a macrotask, so the event loop keeps turning and `process.exit` still runs:
```js
fetchCalls: 0,
fetch(){ sandbox.fetchCalls++; return new Promise((_, rej) => setTimeout(() => rej(new TypeError('offline (harness)')), 0)); },
```
Land it together with the WR-01 fix and a check that asserts a bounded `fetchCalls`. Until then, keep the never-settle stub, but add a TODO that points at WR-01 so the fix doesn't read as final.

### WR-06: Under a storage-quota failure the in-progress workout has no durable copy, and the banner says otherwise

**File:** `index.html:807-815` (`saveLocal` / `handleQuotaFailure`), `index.html:1605-1607` (quota banner), `index.html:3388` (`exportData`)
**Issue:** Draft edits now go through `saveLocal()`. If the write still fails after the snapshot ring is cleared, the draft exists only in memory. `handleQuotaFailure()`'s "get it to the cloud at least" `pushNow(true)` now carries no draft (it's stripped). The banner's "Export now" button excludes the draft (D-06). Its text, "make sure Cloud Sync is on so nothing is lost", is now false for the workout Ian is mid-set on: a reload loses it.

Separately, every `setVal` keystroke under quota failure still starts an un-debounced Firestore transaction, and that transaction now carries nothing the keystroke changed.
**Fix:** At minimum, reword the banner: "Your workout in progress can't be saved on this device — finish it before closing the app." Consider having `handleQuotaFailure` skip the direct `pushNow` when the caller was `saveLocal` (pass a flag), since no draft edit needs a push.

## Info

### IN-01: `stripDraft()` mutates its argument in place

**File:** `index.html:670-673`
**Issue:** Every current caller passes an owned object: a freshly parsed blob, or `Object.assign({},DB)` in `exportData`. The name reads as pure, though, and a future `stripDraft(DB)` (say, in a new export or share path) would silently delete the live workout.
**Fix:** Return a shallow copy (`const c=Object.assign({},x); delete c.draft; return c;`), or add "mutates; never pass DB" to the comment.

### IN-02: The `DB =` tripwire sanctions by substring, so a copy of an exempt line elsewhere passes

**File:** `test/app.test.js:3015-3035`
**Issue:** `sanctioned` accepts any line that is a substring of `String(wipe)` or `String(adoptMerged)`. A new `DB = normalize(withWx);` or `DB=blank();` line in any other function would pass. Any line merely *containing* `keepLocalDraft(` also passes (`DB = normalize(raw); keepLocalDraft(x);`). The scan also misses `Object.assign(DB, …)` and assignments to `DB.draft` from foreign data. None of these exist today.
**Fix:** Sanction by function membership: parse the enclosing function name, or check that the line occurs exactly once in the source and that occurrence is inside the named function. Also require `keepLocalDraft(` to wrap the right-hand side (`/DB\s*=\s*keepLocalDraft\(/`).

### IN-03: The pusher allowlist only sees direct `DB.draft` + `save()` in the same function body

**File:** `test/app.test.js:3297-3305`
**Issue:** It would miss a draft mutator that reaches the draft through an alias (`const d=DB.draft`), or one that calls a helper which itself calls `save()`. `finishWorkout` is only caught because of its trailing `DB.draft = null`. The behavioural table (`DRAFT_ONLY_MUTATORS`) is the stronger guard, but it only covers the 25 named functions.
**Fix:** Also flag functions whose source matches `/=\s*DB\.draft\b/`, or accept this limit in the comment.

### IN-04: `adoptMerged`'s equality guard is key-order-sensitive, so a spurious sync toast follows every Erase

**File:** `index.html:4304-4305`, `index.html:3624`
**Issue:** `keepLocalDraft` appends `draft` (and then `wx`) at the end of the object. `blank()` (used by `wipe()`) has both keys in the middle. After an Erase, the next listener tick serializes differently for identical content. The result is a snapshot, a render and a "Synced from another device" toast. Plan 04-01 already notes the one-off toast at cutover. The Erase case recurs.
**Fix:** Compare with the device-local keys removed from both sides (`JSON.stringify(stripDeviceLocal(withWx))` vs the same of `DB`), or delete and re-add `draft`/`wx` on `DB` in `wipe()` so the order is canonical.

### IN-05: The CLAUDE.md rule overstates "every path"

**File:** `CLAUDE.md:42-50`
**Issue:** "Every path that replaces `DB` keeps this device's draft through `keepLocalDraft()`" is contradicted by two sanctioned exceptions: `wipe()` (D-08, clears by design) and the boot `load()`. A reader who "fixes" `wipe()` to comply would break D-08. The rule is also silent on the cutover hazard. A second device that held a synced copy of a draft at update time keeps it, and finishing it there logs a duplicate partial session. Nothing in code mitigates this; it relies on Ian remembering the plan note.
**Fix:** Add "except a local Erase, which clears it" to the rule. Consider a one-line cutover note, or a guard that refuses to finish a draft whose `startedAt` predates the Phase 4 deploy and that already matches a synced session's date and workout.

---

_Reviewed: 2026-09-23T11:38:59Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
