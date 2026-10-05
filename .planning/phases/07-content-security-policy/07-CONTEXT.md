# Phase 7: Content Security Policy - Context

**Gathered:** 2026-10-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Ship a `<meta http-equiv="Content-Security-Policy">` in `index.html` with a hash-based `script-src`
that blocks injected script while keeping the Firebase SDK scripts, Firebase runtime endpoints and the
weather API working. Removing inline styles is out of scope (CSP-04). Requirements: CSP-01 through CSP-07.

</domain>

<decisions>
## Implementation Decisions

### Policy strictness
- **D-01:** Full lockdown. Start from `default-src 'none'` and explicitly allow only what the app
  uses. The planner and researcher build the inventory by hand (CSP-03) and must cover at least:
  `script-src` (inline hash plus the Firebase path, see D-07), `connect-src` (Firebase Auth,
  Firestore and token endpoints; `api.open-meteo.com`; `geocoding-api.open-meteo.com`),
  `img-src` (`'self' data:`, for the SVG icons), `manifest-src` (`blob:`, since the inline manifest
  comes from `URL.createObjectURL`), `worker-src 'self'` (`./sw.js`), `frame-src` (whatever the
  Firebase/Google sign-in flow needs; check the `www.google.com` reference near index.html:2716),
  and `style-src 'self' 'unsafe-inline'` (CSP-04, documented as deliberate: 440 inline
  `style=` attributes). Also verify that `sw.js` is unaffected, since a meta CSP doesn't apply to
  the worker.
- **D-02:** Add the hardening directives `object-src 'none'`, `base-uri 'none'` and
  `form-action 'none'`. (`frame-ancestors` is ignored in a meta CSP, so leave it out.)

### Stale-hash guard
- **D-03:** `npm test` fails when the sha256 of the inline `<script>` doesn't match the hash in the
  meta tag. The failure message names the regeneration command. CI already blocks the deploy on a
  red suite.
- **D-04:** Add an npm script (e.g. `npm run csp:hash`) that recomputes the hash and rewrites the
  meta tag in place. It's run by hand, with no build step. CLAUDE.md documents it (CSP-07).
- **D-05:** The hash must be computed over the exact bytes git stores (LF; Phase 6's
  `.gitattributes`), so the hash on Windows matches the one on the deployed site.

### Rollout & sync check
- **D-06:** The CSP lands as its own commit so it can be reverted cleanly. Run the local
  static-server check first (CSP-05, zero violations in the console). After go-live, the proof of
  sync is a cross-device round trip: log a test weigh-in on the PC, see it appear on the phone
  (allow ~10 min for PWA update lag; Settings → This version shows the build), then soft-delete it
  and confirm the delete syncs. Also check the console on the live URL for violations. If sync is
  broken, revert the CSP commit immediately and diagnose afterwards; never hotfix forward.

### Firebase pinning
- **D-07:** Allow only the exact version path `https://www.gstatic.com/firebasejs/10.14.1/`, not
  the whole host. A test asserts that the version in the CSP matches the version in the three SDK
  `<script src>` tags, so an SDK bump that forgets the CSP fails `npm test`. — **Reversibility:**
  reversible.

### Claude's Discretion
- The exact Firebase endpoint list, how the test extracts the inline script, the npm script's
  implementation, and where the meta tag sits in `<head>` (it must come before any script).

</decisions>

<canonical_refs>
## Canonical References

- `.planning/ROADMAP.md` § Phase 7: goal and success criteria
- `.planning/REQUIREMENTS.md`: CSP-01 to CSP-07
- `.planning/STATE.md`: Phase 7 notes (no report-only mode for meta CSP; a blocked gstatic fails silently)
- `.planning/codebase/CONCERNS.md`: CSP / inline handler concern
- `CLAUDE.md`: test-before-push, line-endings convention, where the hash command gets documented
- `index.html` lines 268–270 (SDK scripts), 300 (inline script), ~2716 (google.com), ~2904/2924 (open-meteo)
- `sw.js`, `firestore.rules`

</canonical_refs>

<code_context>
## Existing Code Insights

- One inline `<script>` block and three deferred gstatic compat scripts (10.14.1). There are no
  inline event handlers left after Phase 5 (the suite already refuses new ones).
- Manifest is a `blob:` URL; icons are `data:image/svg+xml`; the service worker is a real file.
- Tests live in `test/` and run with `npm test`. Existing tests assert properties, not wording,
  and the new CSP tests should do the same.

</code_context>

<specifics>
## Specific Ideas

- Sync failures are silent (the app keeps running on localStorage), which is why D-06 asks for an
  active round trip and not "the app loads".

</specifics>

<deferred>
## Deferred Ideas

- Removing inline styles so `style-src` can drop `'unsafe-inline'`. This is out of scope for v1.

</deferred>
