# Requirements: PPL Tracker — Declarative Data Layer

**Defined:** 2026-09-10
**Core Value:** The data Ian has already logged must never be lost, corrupted, or resurrected after deletion — every other feature can fail before that one does.

## v1 Requirements

Requirements for this milestone. Each maps to exactly one roadmap phase.

### Registry (REG)

The one declaration the rest of the data layer derives from.

- [x] **REG-01**: A `COLLECTIONS` object declares every collection's `kind`, identity key, sort order, merge strategy and soft-delete behaviour in one place
- [x] **REG-02**: `COLLECTIONS` is declared textually before `let DB = load()`, adjacent to `SCHEMA`/`KEY` and before `MIGRATIONS`
- [x] **REG-03**: Every value inside `COLLECTIONS` is a literal or a reference to a hoisted `function` declaration — never a `const` arrow, never a reference to a `const` declared later
- [x] **REG-04**: The existing composite-key arrows (`sessKey`, `todoKey`, `hobbyKey`, and the inline `cardio`/`ideas` key arrows) are promoted to `function` declarations before being referenced from `COLLECTIONS`
- [x] **REG-05**: `merge` is an explicit required field on every collection with no inferred default; a map-shaped collection that omits it fails loudly at declaration rather than defaulting to list semantics
- [x] **REG-06**: `blank()` is derived from `COLLECTIONS` and produces a database with a correctly-shaped key for every declared collection
- [x] **REG-07**: The `liveX()` soft-delete filters are derived from `COLLECTIONS`, so a new collection cannot ship without its filter
- [x] **REG-08**: `validateBackup()`'s shape checks are derived from `COLLECTIONS` and accept and reject exactly what the hand-written version does — strict behavioural parity
- [x] **REG-09**: `mergeDB()`'s per-collection merging is derived from `COLLECTIONS`
- [x] **REG-10**: The `gen`-mismatch wholesale-replace stays a hard early `return` before any per-collection merging, untouched by the derived loop
- [x] **REG-11**: `MIGRATIONS` stays hand-written and is not derived from `COLLECTIONS`; it may read `COLLECTIONS` one-way
- [x] **REG-12**: Each hand-written consumer is replaced in its own commit, cheapest-first and `mergeDB()` last, with the app shippable at every commit
- [x] **REG-13**: Every replaced function is kept renamed (not deleted) and differential-tested against its derived replacement over a real exported backup plus per-incident synthetic two-device fixtures
- [x] **REG-14**: The renamed legacy functions are deleted only in a later commit than the one that introduced their replacement, never the same one
- [x] **REG-15**: A boot-order regression test asserts the app boots without throwing for every schema version from 1 to current, and that every declared collection exists with the right shape afterward
- [x] **REG-16**: If any row rewrite is introduced, it stamps `mtime` via `touch()`, persists immediately, is idempotent, never downgrades `_schema`, and ships with a stale-device merge replay test — all four, or the rewrite does not ship
- [x] **REG-17**: `COLLECTIONS` carries the column/format metadata the Markdown export needs, settled in this phase so the export phase does not reopen the registry

### Sleep (SLEEP)

The eleventh collection — the proof that REG paid off.

- [x] **SLEEP-01**: A `sleep` collection is added to `COLLECTIONS` as `{ kind:'list', key:'id', soft:true, sortBy:'date' }`
- [x] **SLEEP-02**: Ian can log a night's sleep with hours slept, a 1–5 quality rating, and an optional note
- [x] **SLEEP-03**: Ian can see his logged sleep as a dated series and can delete an entry
- [x] **SLEEP-04**: Adding `sleep` required one entry in `COLLECTIONS` plus its view — no edits to `blank()`, `mergeDB()`, the filter family, `validateBackup()` or the exporter
- [x] **SLEEP-05**: A test asserts SLEEP-04 — that the declaration alone caused every derived consumer to pick the collection up
- [x] **SLEEP-06**: A deleted sleep entry survives a stale-device merge replay without resurrecting

### Export (EXP)

Clean data out of the app and into Claude Desktop.

- [ ] **EXP-01**: Ian can export a Markdown file separate from, and alongside, the existing JSON backup
- [ ] **EXP-02**: The export is derived from `COLLECTIONS`, not hand-written per collection
- [ ] **EXP-03**: Workouts export as flat rows — one row per set, carrying date, workout, exercise, set number, weight and reps — not nested
- [ ] **EXP-04**: Every collection's rows are read through the same `liveX()` path the views use, never raw `DB[key]`
- [ ] **EXP-05**: Soft-deleted rows and internal ids are absent from the export
- [ ] **EXP-06**: Dates are ISO format, units appear once in the column header (read from `DB.unit`, not hardcoded), and missing values use one consistent explicit marker rather than a blank or a silent zero
- [ ] **EXP-07**: Cell values are escaped for Markdown tables — pipes escaped, embedded newlines replaced, whitespace trimmed — so no logged text can break the table
- [ ] **EXP-08**: The file opens with a short header block stating what it is, when it was generated, and the date range covered, so a truncated file cannot be mistaken for complete history

### Documentation (DOC)

- [ ] **DOC-01**: `CLAUDE.md` gains a numbered "adding a new tracked thing" recipe, written against the shipped `COLLECTIONS` declaration
- [ ] **DOC-02**: The recipe states the module-eval-time placement rule and what may appear as a value in `COLLECTIONS`
- [ ] **DOC-03**: The recipe names the tests a new collection must ship with, including the stale-device merge replay
- [ ] **DOC-04**: The recipe is verified by following it end to end for a collection that is not `sleep`, on paper or in a scratch branch

### Draft (DRAFT)

- [ ] **DRAFT-01**: The in-progress workout `draft` is excluded from cloud sync, following the pattern already used for the `wx` weather cache
- [ ] **DRAFT-02**: A stale cloud document still carrying a legacy `draft` field cannot reintroduce one onto a device
- [ ] **DRAFT-03**: The Log tab renders correctly when a cloud document carries a malformed legacy `draft`
- [ ] **DRAFT-04**: Finishing or discarding a workout no longer writes draft state across the wire
- [ ] **DRAFT-05**: Ian's in-progress workout survives closing and reopening the app on the same device

### Delegation (DELEG)

- [ ] **DELEG-01**: A static inventory of all 172 inline handler attributes is captured before any are changed
- [ ] **DELEG-02**: Inline `onclick`, `onchange`, `oninput`, `onkeydown` and `onpointerdown` attributes are replaced by delegated listeners reading `data-*` attributes
- [ ] **DELEG-03**: A static completeness check cross-references the pre-change inventory against the dispatcher, so a dropped call site fails the suite rather than the phone
- [ ] **DELEG-04**: No handler is left reachable only through a global function called by name from markup
- [ ] **DELEG-05**: Any `stopPropagation()` call that would break delegation is found and resolved
- [ ] **DELEG-06**: Controls converted to delegation remain keyboard-operable
- [ ] **DELEG-07**: The Log tab is manually verified end to end, being the screen Ian uses mid-workout

### Repository (REPO)

- [ ] **REPO-01**: A `.gitattributes` file makes git store `index.html` bytes exactly, ending `core.autocrlf` rewriting
- [ ] **REPO-02**: `.gitattributes` and the resulting whole-file diff land in a commit containing nothing else

### Content Security Policy (CSP)

- [ ] **CSP-01**: A `<meta http-equiv="Content-Security-Policy">` policy ships, using a hash-based `script-src` for the inline script block
- [ ] **CSP-02**: The policy allow-lists `https://www.gstatic.com` so the three Firebase SDK scripts keep loading
- [ ] **CSP-03**: `connect-src` covers Firebase's runtime endpoints and the weather API hosts, inventoried by hand rather than by grepping `index.html` — they are internal to the SDK and to `fetch` calls and do not appear in the file
- [ ] **CSP-04**: `style-src` retains `'unsafe-inline'` as a documented, deliberate decision, because inline-style removal is out of scope
- [ ] **CSP-05**: The policy is verified locally against a static file server with the DevTools console clean of violations before it is pushed — meta CSP has no report-only mode, so this local pass is the only pre-production check available
- [ ] **CSP-06**: Cloud sync is confirmed working after the policy is live, not assumed — a blocked Firebase script fails silently while the app keeps working on localStorage
- [ ] **CSP-07**: The hash-regeneration step is documented as a manual command in `CLAUDE.md`, so a future edit to the inline script does not silently break the policy

## v2 Requirements

Acknowledged, deferred, not in this roadmap.

### Validation (VAL)

- **VAL-01**: `validateBackup()` checks the *types* inside an imported file, not only its shape — a hand-edited backup can currently put anything in a set's `w`
- **VAL-02**: Values interpolated into HTML *attributes* are escaped; `esc()` currently covers element content only and does not escape `'`

### Export (EXP)

- **EXP-09**: Recent-detail-plus-older-aggregate windowing in the export — aggregation rules are inherently per-collection and so resist deriving from `COLLECTIONS`; irrelevant at current data volume regardless

### Deploy (DEPLOY)

- **DEPLOY-01**: CI publishes only the served surface rather than the whole repo — `path: '.'` currently uploads `test/`, `CLAUDE.md` and the review docs to the live site. Noise, not a leak; the repo is public

## Out of Scope

Explicitly excluded. Each was decided, not overlooked.

| Feature | Reason |
|---------|--------|
| Rewriting or removing cloud sync | Works, is tested, and is the only automatic off-device backup. Rewriting it is real data risk for near-zero payoff on a single device. (Answer 1) |
| Deleting or trimming any feature, lawn scheduler included | 47 days of usage data show nothing is abandoned. The problem was never feature count. (Answers 3, 4) |
| Anything about localStorage capacity | Measured at ~1.3% of budget, reaching half around 2035. (Answer 5) |
| Switching auth providers | Data is keyed to the current auth uid; a Google login means a hand migration of `users/{uid}`. Closing signup already solved the real risk. (Answer 6) |
| Navigation or layout changes | Emphasis, not a complaint. Nothing in the usage data suggests the app feels wrong. (Answer 8) |
| Splitting `index.html` into modules | Splitting means a build step, which is the thing that makes the app editable without a toolchain. (F5) |
| Automated CSP hash injection in GitHub Actions | Borders on a build step, which is ruled out. The manual documented command is the chosen alternative. (Research: STACK.md flagged this against itself) |
| Field-level validators inside `COLLECTIONS` | A validation DSL is a new abstraction solving a problem that is not producing incidents. Rejected by both ARCHITECTURE.md and PITFALLS.md. |
| A Content-Security-Policy-Report-Only soak | Report-only is header-only and has no `<meta>` equivalent; this app has no server to set headers. A report-only meta tag would silently do nothing. Local DevTools verification replaces it. |
| In-app correlation charts between sleep, training and weight | Anti-feature. The whole point of the export is that Claude does this reasoning, not the app. |
| Sensor-style sleep fields, separate bedtime/waketime, disruption tag pickers, sleep reminders | Anti-features. The Consensus Sleep Diary finds these are the least reliably self-reported fields. |
| A round-trippable or re-importable Markdown export | The JSON backup is the round-trip format. Two round-trip formats means two schemas to keep in step. |
| An export configuration screen | Recreates the "schema lives in a sixth place" pattern this milestone exists to end. |

## Traceability

Populated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| REG-01 … REG-17 | Phase 1 | Pending |
| SLEEP-01 … SLEEP-06 | Phase 1 | Pending |
| EXP-01 … EXP-08 | Phase 2 | Pending |
| DOC-01 … DOC-04 | Phase 3 | Pending |
| DRAFT-01 … DRAFT-05 | Phase 4 | Pending |
| DELEG-01 … DELEG-07 | Phase 5 | Pending |
| REPO-01 … REPO-02 | Phase 6 | Pending |
| CSP-01 … CSP-07 | Phase 7 | Pending |

**Coverage:**

- v1 requirements: 56 total
- Mapped to phases: 56
- Unmapped: 0

---
*Requirements defined: 2026-09-10*
*Last updated: 2026-09-10 after initialization*
