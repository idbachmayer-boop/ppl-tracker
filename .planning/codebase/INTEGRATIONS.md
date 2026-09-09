# External Integrations

**Analysis Date:** 2026-09-09

## APIs & External Services

**Weather & Location:**
- Open-Meteo (free) - Forecast data for lawn care logging
  - SDK/Client: Native fetch (no SDK)
  - Auth: None required
  - Endpoints:
    - `/v1/forecast` - Weather forecast, current conditions, historical daily/hourly data
    - `/v1/search` - Geocoding for location lookup
  - Used by: `fetchWeather()` and `geocodeTry()` in `index.html` (lines 2775–2795)
  - Data requested: Temperature, precipitation, wind speed, weather codes (Fahrenheit, mph, inches)
  - Timezone: Auto-detected from coordinates

**Strava Integration (File Import Only):**
- No API integration - Cardio import is manual file upload only
- User exports CSV from Strava; app parses locally in `importCardioBatch()` function
- No Strava auth, no webhooks, no API calls to Strava
- Located in: `index.html` lines 3413–3561 (cardio log section)

## Data Storage

**Databases:**
- Firebase Firestore (Google Cloud)
  - Connection: Email/password auth to Firebase project `ppl-tracker-a1d87`
  - Structure:
    - `users/{uid}` - Single JSON blob document (entire user DB)
    - `users/{uid}/versions/{id}` - Append-only snapshot history
  - Client: Firebase JavaScript SDK 10.14.1 (compat mode)
  - Read/Write: Only via authenticated `runTransaction()` for safe merge
  - Security: Rules in `firestore.rules` (UID-scoped, all other paths denied)

**Local Storage:**
- Browser localStorage
  - Holds complete DB while offline
  - Synced to Firestore only on explicit `save()` + `pushNow()`
  - All data keys live in `DB` object (persisted to localStorage at `lsKey`)

**File Storage:**
- None - No cloud file storage used
- Backups: Exported as JSON files (user download/import)

**Caching:**
- Weather cache: Stored locally as `DB.wx` (fetched on demand, expires when stale)
- Service Worker cache: App shell cached as `ppl-shell-{CACHE_VERSION}`

## Authentication & Identity

**Auth Provider:**
- Firebase Authentication (email/password)
  - Implementation: `syncSignIn()`, `syncSignOut()` functions in `index.html`
  - Sign-in flow:
    1. User provides email + password (6+ characters)
    2. `firebase.auth().signInWithEmailAndPassword()` or `.createUserWithEmailAndPassword()`
    3. On success: `SYNC.user` populated with auth state
    4. On failure: Error shown in UI via `SYNC.status`
  - Signup: Open by default (anyone can create account - NOT restricted to Ian)
  - WARNING: Signup must be disabled in Firebase console (Authentication → Settings) to prevent abuse

## Monitoring & Observability

**Error Tracking:**
- None - No error tracking service integrated
- Errors logged to browser console only

**Logs:**
- Console logging only
- Debug info available via `SYNC.status` shown in UI
- Last sync time: `SYNC.lastSyncAt` (user-visible in Settings)

## CI/CD & Deployment

**Hosting:**
- GitHub Pages (static site hosting)
- Repository: `idbachmayer-boop/ppl-tracker`
- URL: https://idbachmayer-boop.github.io/ppl-tracker/

**CI Pipeline:**
- GitHub Actions (`.github/workflows/deploy.yml`)
  - Trigger: Every push + pull request
  - Test gate: `npm test` (runs `node test/app.test.js`)
    - Environment: Ubuntu latest, Node 20, TZ=America/Chicago
    - Must pass before deploy (enforced at job level)
  - Deploy: Only on push to main branch (after test passes)
  - Deployment action: Upload artifact to GitHub Pages

## Environment Configuration

**Required env vars:**
- None - App is fully configured for deployment
- Firebase config inlined in `index.html` (not secret)
- Firebase private keys/service accounts: NOT in repo (manual console access required)

**Secrets location:**
- Firebase project settings: Web console only (not in repo)
- Firestore rules: `firestore.rules` (in repo, must be deployed manually)
- Service account key (if needed for Rules deploy): Local machine only (requires Firebase CLI auth)

## Webhooks & Callbacks

**Incoming:**
- None - No webhook endpoints

**Outgoing:**
- Open-Meteo requests: Fire on-demand when weather data is stale (user opens Lawn tab or app boots)
- Firebase Firestore transactions: Pushed to cloud on `save()` + `pushNow()`
- No outbound webhooks or callbacks

## Backup & Disaster Recovery

**Backup:**
- Manual JSON export: User can export full DB from Settings → Backup
- Cloud snapshots: `users/{uid}/versions/{id}` contains append-only history (pruned client-side to `CLOUD_VERSIONS_MAX`)
- Last backup timestamp: `DB.lastBackupAt` (tracked in app)

**Import/Restore:**
- JSON file import: Merge or Replace options
- Merge: Union joins backup data with current data (safe, union-based)
- Replace: Wipes current data, restores from backup file
- Validation: Shape checked but not types (backup can be hand-edited)

## Data Sync Pattern

**Push (Local → Cloud):**
- Triggered by `save()` function
- Uses `runTransaction()` for atomic read-modify-write
- Implements union merge: re-reads cloud copy, calls `mergeDB()`, writes merged result
- Prevents lost updates from concurrent edits on other devices

**Pull (Cloud → Device):**
- Triggered by `pushNow(false)` or UI "Check for updates" button
- Fetches latest cloud state, calls `mergeDB()`, re-renders
- Automatic push queued if local state is newer

**Merge Conflict Resolution:**
- Union merge strategy (timestamp-based per field): never an overwrite
- Soft deletes: `deletedAt` flag prevents resurrection from older copies
- Migration versioning: `_schema` ensures older devices defer sync until updated

---

*Integration audit: 2026-09-09*
