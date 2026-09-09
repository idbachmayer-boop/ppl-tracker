# Technology Stack

**Analysis Date:** 2026-09-09

## Languages

**Primary:**
- JavaScript - All application code, inline in `index.html`

**Test/Utilities:**
- JavaScript (Node.js) - Test suite in `test/app.test.js` and `test/harness.js`

## Runtime

**Environment:**
- Browser (modern HTML5-capable, ES2020+)
- Node.js 20+ (for testing)

**Package Manager:**
- npm
- Lockfile: Not used (zero production dependencies)

## Frameworks

**Core:**
- None - Single-file PWA. HTML + CSS + vanilla JavaScript only, no framework

**Testing:**
- Node.js built-ins - Custom test harness in `test/harness.js`
- No external test framework (console.log assertions in `test/app.test.js`)

**Build/Dev:**
- No build step - `index.html` is the complete app
- Service Worker - `sw.js` handles offline caching

## Key Dependencies

**Critical:**
- Firebase JavaScript SDK 10.14.1 (compat mode) - Cross-device sync and authentication
  - `firebase-app-compat.js` - Core Firebase initialization
  - `firebase-auth-compat.js` - Email/password authentication
  - `firebase-firestore-compat.js` - Cloud data sync via Firestore
- Loaded deferred from CDN (non-blocking): `https://www.gstatic.com/firebasejs/10.14.1/`

**Infrastructure:**
- Open-Meteo API (free, no API key) - Weather data for lawn care logging
  - Endpoint: `https://api.open-meteo.com/v1/forecast`
  - Geocoding: `https://geocoding-api.open-meteo.com/v1/search`

## Configuration

**Environment:**
- No `.env` file - Firebase config is inlined in `index.html` (line 3702):
  ```
  const firebaseConfig = {
    apiKey: ...,
    authDomain: "ppl-tracker-a1d87.firebaseapp.com",
    projectId: "ppl-tracker-a1d87",
    storageBucket: "ppl-tracker-a1d87.firebasestorage.app",
    messagingSenderId: ...,
    appId: ...
  }
  ```

**Build:**
- No build configuration - Source is single-file HTML/CSS/JS
- Service Worker cache versioning: `CACHE_VERSION` in `sw.js` (currently `v2-2026-08-10`)

## Platform Requirements

**Development:**
- Text editor (no IDE required)
- Node.js 20+ (testing only)
- npm (for running `npm test`)
- Timezone: America/Chicago (test suite is frozen to this TZ)

**Production:**
- Deployment: GitHub Pages (auto-deployed on push to main via `/.github/workflows/deploy.yml`)
- Hosting: Static site served from https://idbachmayer-boop.github.io/ppl-tracker/
- Browser support: Modern browsers with localStorage, Service Workers, ES2020 support
- Network: Requires internet for Firebase sync; offline reads from localStorage

## Version & Schema

**App Versioning:**
- Schema version tracked in DB at `_schema` (currently SCHEMA constant in code)
- Migration system: `MIGRATIONS` object for schema upgrades
- Client-side migrations are idempotent and run at boot via `normalize()`

**Offline Support:**
- Service Worker caches app shell (`./index.html`)
- All data stored in localStorage (syncs to Firestore when online)
- No offline transaction support - conflicts resolved via union merge on next sync

---

*Stack analysis: 2026-09-09*
