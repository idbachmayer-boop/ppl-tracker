# Codebase Concerns

**Analysis Date:** 2026-09-09

> **Provenance — read before treating anything here as a second opinion.**
>
> The **F1–F5 items, the escaping hole, the open-signup and unreconciled-rules risks, and the CI
> publish note are restated from `REVIEW-2026-09-09.md`**, not independently derived. This mapper ran
> after that review was committed to the repo root and used it as a source, keeping its labels and
> much of its wording. Where this file and that review agree, that is **one opinion appearing twice** —
> not two findings corroborating each other. Weigh it accordingly.
>
> The rest of `.planning/codebase/` (`STACK`, `ARCHITECTURE`, `STRUCTURE`, `TESTING`, `INTEGRATIONS`)
> was derived from the code directly.
>
> **Line citations corrected 2026-09-09** against `index.html` at commit `08a8b37`. The originals were
> substantially wrong — `mergeDB()` was cited at 2750 (a chart legend; it is at 3644) and the escaping
> hole at 833 and 1644 (both bare `}`). If you move code, the numbers here go stale; trust the
> function names over the numbers.

## Tech Debt

**F1: Schema written in five places (highest leverage):**
- Issue: The rules for a "session", "weight", "cardio", or any tracked collection are implicit and distributed across `blank()`, `MIGRATIONS`, `mergeDB()`, `validateBackup()`, and `liveSessions()` / `liveWeights()` / etc. filter functions. Adding one new tracked thing requires editing all five places correctly. A missed edit in any one causes data loss in production.
- Files: `index.html` — `blank()` 641, the `MIGRATIONS` table 480 and its loop 625, `mergeDB()` 3644, `validateBackup()` 3300, the `liveX()` filters 653-659
- Impact: Each new collection re-learns the same lessons by failing in production. Sync merge rules get forgotten; soft-delete filters get skipped; fields assumed by views go unguarded on all paths but one. The bug history in `CLAUDE.md` is one bug repeated four times.
- Fix approach: Create a single `COLLECTIONS` declaration that describes every collection's merge rules, soft-delete behavior, explicit-false fields, and sort order. Derive the other five places from it at module-eval time, or generate them into the file at build time. **Constraint:** anything called from `normalize()` must not touch a `const` declared further down (temporal-dead-zone trap documented at 638, and again in the header of `normalizeDraft()` at 605).

**F2: Inline `onclick` forces 326 global functions:**
- Issue: Every event handler must be a `window` global because the HTML calls it by name (e.g., `onclick="startWorkout()"`). No namespacing, silent collisions on name overlap, and no CSP possible. Also the root of the escaping footgun: `esc()` does not escape `'`, so a user string inside inline handler quotes is unsafe.
- Files: `index.html` (throughout)
- Impact: Cannot adopt a Content Security Policy. Collisions between handler names and user input are undetectable. Event delegation is blocked, keeping the handler count at 326+ and making the code harder to audit.
- Fix approach: Use a single delegated listener on `#app` that reads `data-act` and `data-arg` attributes. Mechanical, testable, needs no build step. Unlocks CSP and closes the apostrophe footgun permanently.

**F3: `CLAUDE.md` gives war stories but not recipe:**
- Issue: `CLAUDE.md` is authoritative documentation of what breaks and why (mobilityLog merge rules, soft-delete filters, migrations must persist, etc.), but it reads as a bug report, not a procedure. A new agent can infer a recipe by pattern-matching against incident reports but will miss edge cases.
- Files: `CLAUDE.md` (whole file)
- Impact: Knowledge transfer is implicit; mistakes repeat; onboarding time is longer.
- Fix approach: Add a **Checklist: Adding a new tracked thing** section with numbered steps (create in blank(), add to SCHEMA, write migration if needed, add merge rule, add liveX filter, add validation in validateBackup()). Reference the war stories by incident name but give the recipe first.

**F4: Line endings are unmanaged (intentional):**
- Issue: `index.html` is CRLF on disk, tests are LF, no `.gitattributes`, and `core.autocrlf` rewrites on every touch. Adding `.gitattributes` with `* -text` would normalize but produce a 4,131-line diff.
- Files: `index.html`, `.gitattributes` (missing)
- Impact: Noisy diffs, inconsistent editor line-ending handling, potential confusion on Windows/Unix checkouts.
- Fix approach: Left untouched on purpose — it is a deliberate trade-off. F1–F3 yield more benefit than splitting the file.

## Known Bugs

**viewActive crashes on malformed draft (FIXED 2026-09-09):**
- Symptoms: Log tab becomes unclickable; "Something broke on this screen" card appears.
- Files: `index.html` — `viewActive()` 1664, the set rows it renders 1714-1715
- Trigger: Start a workout on one device while another syncs an older schema, or restore from a hand-edited backup that is missing the `stairs` or `extras` field.
- Fixed in: Commit e98b957 — added smoke test that catches unguarded field access.
- Notes: This was not new; `mergeDB` has a guard for a corrupt `workout` name (the guard is now `normalizeDraft(out)` at 3686; the original comment about crashing the `PROGRAM[name]` lookup is still there). The pattern was known but the second hole went unguarded.

**(Not a bug — an established rule.) `mobilityLog` / `lawnLog` are newer-wins, so absence never means "off":**
- Status: **Handled.** `CLAUDE.md` states this as a standing rule ("Absence never means 'off'… Store an explicit `false`"), and the merge is deliberately newer-wins — unioning the inner keys would resurrect unchecked boxes forever, which is the worse failure. This was miscategorized as an open bug in the first draft of this file.
- Files: `index.html` — the merge calls at 3675-3676, via `mergeDateMap()` 3632
- The actual constraint for new code: these two are date-keyed maps, not lists. The whole inner object comes from the newer side, so a **deleted key reads as "never logged" on the other device**. Any code writing to them must store an explicit `false` rather than removing the key. Note the fields differ — `lawnLog` holds `mow`/`water`, `mobilityLog` holds exercise names; an earlier draft of this file conflated the two.
- Residual risk: nothing enforces the explicit-`false` rule at write time, and `mergeDateMap()` has no direct test (see Test Coverage Gaps). Folding it into F1's `COLLECTIONS` declaration (`explicitFalse: true`) is what would make it structural rather than remembered.

**Migration 15 (goblet squat rename) was silently reverted in production:**
- Symptoms: The migration ran once, renamed rows, then the renamed rows reverted to the old name on the next sync.
- Files: `index.html` — `MIGRATIONS` 480, the migration loop in `normalize()` 625, `touch()` 652
- Cause: `normalize()` runs in memory at boot, never saved. The renamed rows had no `mtime` because the migration did not `touch()` them. On sync, the merge preferred the stale cloud copy (older mtime), then stamped the new `_schema` anyway, so the migration was marked as done but never persisted.
- Impact: Data was silently reverted; the migration could never run again.
- Workaround: Ran the rename by hand once; not expected to recur.
- Fix approach: Every migration that rewrites rows must `touch()` them to set `mtime`, and call `save()` immediately. Add a test that replays a stale-device merge post-migration to catch regressions.

**Soft-delete filter missed ghosts deleted rows back:**
- Symptoms: A deleted row re-appears after sync.
- Files: `index.html` — `isLive`/`touch` 651-652, the `liveX()` filters 653-659, `softDelete()` 661, `pruneDeleted()` 671
- Cause: A missed filter on one of the six live-row functions (liveSessions, liveWeights, etc.) lets a row with `deletedAt` through. Union merge resurrects it from the cloud forever.
- Impact: Unrecoverable data loss; ghosted rows pollute views.
- Workaround: None — must be caught in tests.
- Fix approach: Centralize the filter. See F1 above.

**Escaping has a second hole (attribute values):**
- Issue: The stated convention is "every user-controlled string goes through `esc()`", but `esc()` does not escape `'`, and values interpolated into attributes (e.g., `value="${st.w}"` in the set rows) are not escaped at all. `validateBackup()` checks the *shape* of an imported file, never the types inside it, so a hand-edited backup can put anything in a set's `w`.
- Files: `index.html` — `esc()` 836; the unescaped attribute values at 1714-1715 (main set rows) and 2688-2689 (accessory rows in `extraCard()`)
- Impact: Low today (only Ian imports backups) but the convention claims full coverage it does not have. The next agent will trust the convention and miss the hole.
- Fix approach: Escape attributes too when touching them. Strengthen `validateBackup()` to check types, not just structure. Pair with F2 (event delegation closes the inline-handler hole permanently).

## Security Considerations

**Open signup:**
- Risk: `createUserWithEmailAndPassword` is live on a public site with a public repo, so anyone can create an account in the Firebase project.
- Files: `firestore.rules` (lines 60–67)
- Current mitigation: Security rules isolate each user's data by `request.auth.uid`, so a signup by someone else cannot read Ian's data. But it is still Ian's quota, his billing, and an abuse surface for a feature exactly two people need.
- Recommendations: **Fix in the Firebase console, not in code:** Authentication → Settings → disable new sign-ups once both accounts exist. This is a one-click operation in the console. Alternatively, enable App Check for stricter token validation.

**Firestore rules not reconciled with deployment:**
- Risk: `firestore.rules` was written on 2026-09-09 from what the app's code does, but nobody has diffed it against the rules currently live in the Firebase console. Deploying a guess over a working configuration is how you turn a documentation gap into an outage.
- Files: `firestore.rules` (lines 1–20, 57–67)
- Current mitigation: Rules are now in git and reviewable. The file carries a prominent header warning against deploying without reconciliation.
- Recommendations: Open the Firebase console (Firestore → Rules), compare `firestore.rules` against the live rules, and reconcile any differences before deploying. Treat a deploy as a manual, deliberate operation (the CI has no step for it on purpose — it needs a service-account secret). Deploy by hand and document the change.

**No Content Security Policy:**
- Risk: Cannot adopt a CSP due to inline `onclick` handlers and inline `<script>`. CSP is a defense-in-depth layer against XSS and injection attacks.
- Files: `index.html` — the single inline `<script>` opens at 295, inline `onclick` handlers throughout
- Current mitigation: Escaping via `esc()` catches most XSS, but it is not a CSP and it has documented holes (see "Escaping has a second hole" above).
- Recommendations: Pair with F2 above — event delegation unlocks CSP. Once handlers are not inline, a CSP with `script-src 'self'` and `style-src 'self'` hardens the app significantly.

**CI publishes the whole repo:**
- Risk: `path: '.'` in `.github/workflows/deploy.yml` (line 53) uploads `test/`, `CLAUDE.md`, `REVIEW-2026-09-09.md`, `firestore.rules`, `sw.js`, and `package.json` to the live site alongside `index.html`.
- Files: `.github/workflows/deploy.yml` (line 53)
- Current mitigation: Nothing leaks — the repo is public — but the extra files are noise on the served surface and may confuse visitors. The important files (`index.html`, manifest, sw.js, `.wasm` if used) should be explicit.
- Recommendations: Change `path: '.'` to `path: 'dist/'` or similar, and build an explicit artifact with only the files meant to be served. Or list files explicitly: `path` can be a dir with selected files only. This is low-severity (no actual data leaks) but good hygiene.

## Performance Bottlenecks

**Single-file monolith at 332KB (acceptable as-is):**
- Problem: `index.html` is 332 KB (compressed ~100 KB over the wire).
- Files: `index.html`
- Cause: Inline CSS (no separate stylesheet), inline JS, inlined icon data (826 lines of PH map), inlined functions for every feature (workouts, bodyweight, cardio, lawn scheduler, hobby picker, journal, todos, weather).
- Current capacity: Loads and parses in ~1–2 seconds on modern hardware; remains snappy. Offline-first, no CDN, no build step — this is intentional.
- Scaling path: F5 (review's recommendation) says leave it as-is. F1–F3 buy more than splitting would. The trade-off is deliberate: buildless deployment (installable, offline) matters more than shaving 50KB off the uncompressed size.

**Weather API calls have no retry logic:**
- Problem: A `fetch()` to Open-Meteo or Geocoding times out or fails, and the cache is not updated. The lawn scheduler cannot know when the next rain is.
- Files: `index.html` — the Open-Meteo fetch in the lawn/weather section (banner at 2756)
- Cause: Calls are fire-and-forget; no retry, no exponential backoff, no queue.
- Impact: Low — weather is advisory only, and the lawn logic has fallbacks (no rain forecast = assume dry, delay mow). But multi-minute delays on a slow network can leave the forecast stale.
- Improvement path: Add retry-with-backoff. Queue failed requests in localStorage and retry on the next sync/boot. This is a nice-to-have, not a blocker.

**Snapshot ring has no quota enforcement at load time:**
- Problem: On `loadSnaps()`, if a quota failure happened and `snapRingDisabled` was set, old snapshots are never pruned. Quota stays hit forever.
- Files: `index.html` — `snapshotNow()` 691, `snapRingDisabled` 682, `saveLocal()` 710
- Impact: Low — once a device is full, it stops taking snapshots, and Ian can export/clear. But recovery is manual.
- Improvement path: Call `pruneDeleted()` at boot to free up space before trying to snapshot. Or add a "clear old snapshots" button in Settings.

## Fragile Areas

**Merge rules are fragile to omission:**
- Files: `index.html` — `mergeUnion()` 3597, `mergeDateMap()` 3632, `mergeDB()` 3644
- Why fragile: Each collection's merge behavior (union, union with explicit-false, newer-wins, etc.) is implicit. A new collection added without a merge rule silently uses the wrong behavior on the first two-device sync.
- Safe modification: See F1 above — centralize the schema declaration.
- Test coverage: Smoke test the render() path for each view after loading a stale merged DB; tests/app.test.js now does this (commit e98b957). But coverage of the merge logic itself is spotty — tests focus on the queries, not the sync side.

**Draft can become unguarded:**
- Files: `index.html` — `viewActive()` 1664, `normalizeDraft()` 605
- Why fragile: The `draft` object is built by `startWorkout()` with guaranteed fields (`entries`, `stairs`, `extras`), but can be restored from backup or synced from an older device. Views assume these fields exist and do not guard their access.
- Safe modification: Before rendering any draft-based view, call `normalizeDraft()` to fill in missing fields. Or add smoke tests for each view as done in commit e98b957.
- Test coverage: Tests now cover this (commit e98b957), but only for the main views. Accessories and custom exercises may still have gaps.

**Silent error catches hide real bugs:**
- Files: `index.html` — the migration loop 625, `load()` 640, `snapshotNow()` 691, `saveLocal()` 710, `handleQuotaFailure()` 712
- Why fragile: Many try-catch blocks swallow errors without logging or reporting them: `try { d = MIGRATIONS[v](d) || d; } catch(e) {}`. If a migration throws, the error is silent and the migration is skipped while `_schema` advances anyway (see the temporal-dead-zone note at 638).
- Safe modification: Log errors to the console or a telemetry endpoint. Let `render()` catch UI errors and show a friendly card, but let data-layer errors bubble or log.
- Test coverage: The suite now smoke-tests every view (commit e98b957) and catches crashes at render time. But silent failures in migrations, merge, or save are not detected until data loss surfaces.

**saveLocal() failure on quota is swallowed:**
- Files: `index.html` — `saveLocal()` 710, `handleQuotaFailure()` 712, the banner trigger 715
- Why fragile: If `localStorage.setItem()` fails due to quota, `saveLocal()` returns false, but most callers do not check the return value. A save() call that fails silently leaves the app's state out of sync with what the user thinks is saved.
- Safe modification: Audit every `save()` call and handle failures. Show a quota banner (already done at 715, inside `handleQuotaFailure()`). Or pre-check quota before unsafe operations.
- Test coverage: None — the suite does not simulate quota exhaustion.

## Missing Critical Features

**No recovery mechanism for quota exhaustion:**
- Problem: When localStorage quota is exceeded, snapshots stop being taken and data stops syncing. Ian must manually export and clear.
- Files: `index.html` — `saveLocal()` 710-718, `snapshotNow()` 691
- Blocks: Making the app resilient to quota limits; backing up weigh-ins and sessions automatically.

**No telemetry or error reporting:**
- Problem: Silent errors in migrations, merge logic, and saves are not reported. Data loss can happen without any signal to the app or Ian.
- Files: Throughout (try-catch blocks)
- Blocks: Detecting regressions in production before Ian notices.

## Test Coverage Gaps

**Merge logic — the core IS tested; the date-map path is not:**
- **Correction (2026-09-09):** the first draft of this file claimed the union merge was untested. That is wrong. Run the suite and look for `── sync merge: a stale device can never subtract ──` (5 checks, including the stale-device case this file said was missing) and `── a migration must survive the next sync ──` (5 more). Commit `e98b957` added 2 further merge checks around draft repair. Do not write these tests again.
- What genuinely is not tested: `mergeDateMap()` — the "newer-wins" path used by `lawnLog` and `mobilityLog` — has **no direct test** (`grep mergeDateMap test/app.test.js` returns nothing). The explicit-`false` rule that path depends on is therefore unenforced by anything.
- Files: `index.html` — `mergeDateMap()` 3632; `test/app.test.js`
- Risk: Moderate. The dangerous list-union path is covered; the uncovered path silently turns a logged "off" into "never logged" across devices.
- Priority: Medium. One test replaying a two-device newer-wins collision on `lawnLog` would close it.

**Quota failure scenarios:**
- What's not tested: `localStorage.setItem()` failing due to quota; `snapRingDisabled` flag being set; recovery after quota is cleared.
- Files: `index.html` — `snapshotNow()` 691, `saveLocal()` 710, `handleQuotaFailure()` 712
- Risk: Quota handling is ad-hoc; a bug could silently leave snapshots or data unsynced.
- Priority: Medium — this is a rare case but high-impact when it happens.

**Escaping and injection:**
- What's not tested: XSS injection via backup files; apostrophes in set notes or exercise names; user strings in attributes.
- Files: `index.html` — `esc()` 836, `validateBackup()` 3300, the attribute values at 1714-1715 and 2688-2689
- Risk: Even low (because only Ian imports backups), the holes documented above could be exploited by a malicious backup or a mistake in future code.
- Priority: Medium — add a few injection tests to the suite.

---

*Concerns audit: 2026-09-09*
