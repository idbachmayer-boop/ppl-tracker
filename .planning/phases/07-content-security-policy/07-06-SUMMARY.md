---
phase: 07-content-security-policy
plan: 06
subsystem: security
tags: [csp, manifest, gap-closure, csp-01, csp-02, csp-03, csp-04, csp-05, csp-07, d-06, d-10]
status: complete
requires:
  - 07-04 red-proven CSP commit ebc5723 (patch-id 299764c8…)
  - 07-05 diagnosis (manifest href="#" races the inline script on the live site)
  - a122a2e (Ian's revert of ebc5723 on main), merged into this branch at 2aef531
provides:
  - "MANIFEST_SHA cbf17b5: the manifest link carries no href, plus 2 MANIFEST suite checks outside the CSP block"
  - "CSP_SHA2 643c628: the CSP re-applied, patch-identical to ebc5723 (the new revert target)"
  - "the hardened CSP-05 probe (split delivery, effective manifest, URL mode) in 07-RESEARCH.md"
affects:
  - 07-07 (go-live: its PR body and revert command use CSP_SHA2)
tech-stack:
  added: []
  patterns:
    - "split-delivery probe: serve every byte before the inline script, then the rest 3 s later, to see what the live site's streaming shows"
key-files:
  created:
    - .planning/phases/07-content-security-policy/07-06-SUMMARY.md
  modified:
    - index.html
    - test/app.test.js
    - .github/workflows/deploy.yml
    - CLAUDE.md
    - .planning/phases/07-content-security-policy/07-RESEARCH.md
key-decisions:
  - "The manifest fix removes the href rather than creating the link in script, so the hashed script stays byte-identical and the re-applied CSP is exactly ebc5723's patch"
  - "The manifest fix is its own commit before the CSP, so a future CSP revert leaves the fix and its guard in place"
  - "The tracer gate was run as an automated re-verify, not a human checkpoint: the plan is autonomous: true with no designed stops, and config human_verify_mode is end-of-phase"
metrics:
  started: 2026-10-07T12:17:33Z
  completed: 2026-10-07T12:30:00Z
  duration: 13min
actuals:
  tokens: 7065     # chars/4 over git diff 95ba901..2927c00 (code + RESEARCH; this SUMMARY excluded)
  tasks: 3
  commits: 3       # cbf17b5, 643c628, 2927c00 (plus this docs commit)
---

# Phase 7 Plan 06: Close the 07-05 manifest gap and re-apply the CSP

**The live-only `manifest-src` violation now reproduces on localhost with split delivery. The manifest link loses its `href="#"` in its own commit, guarded by two suite checks. The CSP is back as one commit patch-identical to the red-proven ebc5723. Chrome is clean under the policy on desktop and Android, at both delivery speeds, stamped and unstamped.**

## Manifest fix (stays on a revert)

MANIFEST_SHA = `cbf17b5529bc92cb86df7bfbd4c817bf8334595e`

`fix(07-06): the manifest link carries no href, so no page-URL manifest fetch races the inline script (07-05 live manifest-src violation)`. It changes `index.html` (one attribute) and `test/app.test.js` (the `── PWA manifest: no fetch can race the inline script ──` block). The markup is now `<link rel="manifest" id="manifest-placeholder" />`.

## Revert target (D-06)

CSP_SHA2 = `643c62864201dee00ab9cf53b87d4470894e85ad`

```
git revert --no-edit 643c62864201dee00ab9cf53b87d4470894e85ad
```

Reverting it leaves the manifest fix (its parent) in place. The rehearsal below confirms it. Never revert the stamp move, and never hotfix forward.

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 | `cbf17b5` | fix(07-06): the manifest link carries no href, so no page-URL manifest fetch races the inline script (07-05 live manifest-src violation) |
| 2 | `643c628` | feat(07-06): re-ship the hash-based Content-Security-Policy, ebc5723's patch again after the a122a2e revert (CSP-01..04, CSP-07; D-01, D-02, D-06, D-07, D-10) |
| 3 | `2927c00` | docs(07-06): record the hardened CSP-05 probe (split delivery, effective manifest, URL mode) |

## Baseline and suite counts

| Point | `TZ=America/Chicago npm test` |
|-------|------|
| BASE6 (95ba901, before any change) | `908 passed, 0 failed, 2 skipped` |
| MANIFEST block added, href still present (RED) | `909 passed, 1 failed, 2 skipped` |
| MANIFEST_SHA | `910 passed, 0 failed, 2 skipped` (BASE6 + 2) |
| CSP_SHA2 | `928 passed, 0 failed, 2 skipped` (BASE6 + 20) |
| CSP_SHA2 reverted (rehearsal) | `910 passed, 0 failed, 2 skipped` (BASE6 + 2) |

The RED suite line, before the fix:

```
  FAIL  MANIFEST: exactly one <link rel="manifest">, and it has no href, so nothing is fetched as a manifest before the inline script supplies one (07-05)  → ["<link rel=\"manifest\" href=\"#\" id=\"manifest-placeholder\" />"]
  PASS  MANIFEST: at boot the inline script gives that link a blob: URL
```

## Task 1: the live failure reproduced, then fixed

Probe P: 07-RESEARCH.md's CSP-05 probe with changes (a) to (f). It passed `node --check`. Every run used a fresh `PROFILE_ROOT` under `C:/Users/idbac/AppData/Local/Temp/p7sw/`. Chrome was `Chrome/154.0.8037.98` in every run.

### RED: ebc5723's page (site R, unstamped)

Normal speed, desktop (`R 18841 0 12000`). Clean, which is why every localhost check missed it:

```json
{"violations":[],"security":[],"exceptions":[],"hosts":{"http://127.0.0.1:18841/index.html":1,"https://www.gstatic.com/firebasejs/10.14.1":3,"blob:":1,"http://127.0.0.1:18841/favicon.ico":1},"chrome":"Chrome/154.0.8037.98","facts":{"booted":true,"firebaseApps":1,"sw":"{\"supported\":true,\"ready\":true,\"error\":null}"},"appManifest":{"url":"blob:http://127.0.0.1:18841/f5614bcf-4206-45ed-b85c-3d34d6355bfb","errors":[{"message":"property 'start_url' ignored, URL is invalid."}],"hasData":true}}
```

Split delivery, desktop (`SLOW_MS=3000`, `R 18843 0 15000`). This meets the RED criteria and matches the 07-05 live record: one `manifest-src` violation for the page URL, the page fetched twice, and the effective manifest still the blob.

```json
{"violations":["manifest-src http://127.0.0.1:18843/index.html"],"security":["Loading a manifest from 'http://127.0.0.1:18843/index.html' violates the following Content Security Policy directive: \"manifest-src blob:\". The action has been blocked."],"exceptions":[],"hosts":{"http://127.0.0.1:18843/index.html":2,"https://www.gstatic.com/firebasejs/10.14.1":3,"blob:":1,"http://127.0.0.1:18843/favicon.ico":1},"chrome":"Chrome/154.0.8037.98","facts":{"booted":true,"firebaseApps":1,"sw":"{\"supported\":true,\"ready\":true,\"error\":null}"},"appManifest":{"url":"blob:http://127.0.0.1:18843/307a2bea-2bdc-46c4-9d9d-c51b961ffa22","errors":[{"message":"property 'start_url' ignored, URL is invalid."}],"hasData":true}}
```

The first split run reproduced the failure, so the `SLOW_MS=6000` fallback was not needed.

### The fix and the hash

The edit removed ` href="#"` from the one manifest link and changed nothing else. `inlineScriptHash` of `git show HEAD:index.html` and of the working tree:

```
sha256-Nw5jh/JeJpDSYItCr6FJJ52mvE7ySXo1646f8nZCpkU=
sha256-Nw5jh/JeJpDSYItCr6FJJ52mvE7ySXo1646f8nZCpkU=
```

The two are equal, and both are ebc5723's token.

### GREEN: site G (R with the href removed)

G_BLOB = `5640c0f1b174343f030e4721579e4a278e835ad5`. The `node -e` edit threw unless the tag occurred exactly once. The only difference from R is line 12.

| Run | violations | security | exceptions | page URL count | manifest | booted / apps / SW ready |
|-----|-----------|----------|------------|----------------|----------|--------------------------|
| normal desktop (18847) | `[]` | `[]` | `[]` | 1 | blob:, data | true / 1 / true |
| normal Android (18849) | `[]` | `[]` | `[]` | 1 | blob:, data | true / 1 / true |
| split desktop (18851) | `[]` | `[]` | `[]` | 1 | blob:, data | true / 1 / true |
| split Android (18853) | `[]` | `[]` | `[]` | 1 | blob:, data | true / 1 / true |

```json
{"violations":[],"security":[],"exceptions":[],"hosts":{"http://127.0.0.1:18847/index.html":1,"https://www.gstatic.com/firebasejs/10.14.1":3,"blob:":1,"http://127.0.0.1:18847/favicon.ico":1},"chrome":"Chrome/154.0.8037.98","facts":{"booted":true,"firebaseApps":1,"sw":"{\"supported\":true,\"ready\":true,\"error\":null}"},"appManifest":{"url":"blob:http://127.0.0.1:18847/251cf1e0-f667-4a14-9421-b506ced821e2","errors":[{"message":"property 'start_url' ignored, URL is invalid."}],"hasData":true}}
{"violations":[],"security":[],"exceptions":[],"hosts":{"http://127.0.0.1:18849/index.html":1,"https://www.gstatic.com/firebasejs/10.14.1":3,"blob:":1,"http://127.0.0.1:18849/favicon.ico":1,"https://apis.google.com/js/api.js":1,"https://apis.google.com/_/scs":1,"https://ppl-tracker-a1d87.firebaseapp.com/__/auth":1},"chrome":"Chrome/154.0.8037.98","facts":{"booted":true,"firebaseApps":1,"sw":"{\"supported\":true,\"ready\":true,\"error\":null}"},"appManifest":{"url":"blob:http://127.0.0.1:18849/a48079d3-6882-4d59-bd55-47a46e174a73","errors":[{"message":"property 'start_url' ignored, URL is invalid."}],"hasData":true}}
{"violations":[],"security":[],"exceptions":[],"hosts":{"http://127.0.0.1:18851/index.html":1,"https://www.gstatic.com/firebasejs/10.14.1":3,"blob:":1,"http://127.0.0.1:18851/favicon.ico":1},"chrome":"Chrome/154.0.8037.98","facts":{"booted":true,"firebaseApps":1,"sw":"{\"supported\":true,\"ready\":true,\"error\":null}"},"appManifest":{"url":"blob:http://127.0.0.1:18851/e5db285c-e227-4507-9558-7cf9c34379ff","errors":[{"message":"property 'start_url' ignored, URL is invalid."}],"hasData":true}}
{"violations":[],"security":[],"exceptions":[],"hosts":{"http://127.0.0.1:18853/index.html":1,"https://www.gstatic.com/firebasejs/10.14.1":3,"blob:":1,"http://127.0.0.1:18853/favicon.ico":1,"https://apis.google.com/js/api.js":1,"https://apis.google.com/_/scs":1,"https://ppl-tracker-a1d87.firebaseapp.com/__/auth":1},"chrome":"Chrome/154.0.8037.98","facts":{"booted":true,"firebaseApps":1,"sw":"{\"supported\":true,\"ready\":true,\"error\":null}"},"appManifest":{"url":"blob:http://127.0.0.1:18853/289cfa1f-6b74-4e57-a85a-d3da48a9d11b","errors":[{"message":"property 'start_url' ignored, URL is invalid."}],"hasData":true}}
```

### Commit A and tracer gate

`git diff --cached --name-only` printed exactly `index.html` and `test/app.test.js`. The tracer's `<verify>` was then re-run end to end and exited 0: the suite was green, `PASS  MANIFEST:` counted 2, and the strict link-shape grep counted 1.

## Task 2: MANIFEST red proofs, then the CSP re-applied

### Mutation log (clone S1 at MANIFEST_SHA)

| Mutation | FAIL lines | Suite line |
|----------|-----------|------------|
| baseline | none | `910 passed, 0 failed, 2 skipped` |
| N1 `href="#"` | Label A → `["<link rel=\"manifest\" href=\"#\" id=\"manifest-placeholder\" />"]` | `909 passed, 1 failed` |
| N2 `href=""` | Label A → `["<link rel=\"manifest\" href=\"\" id=\"manifest-placeholder\" />"]` | `909 passed, 1 failed` |
| N3 `href="manifest.json"` | Label A → `["<link rel=\"manifest\" href=\"manifest.json\" id=\"manifest-placeholder\" />"]` | `909 passed, 1 failed` |
| N4 second link, id `manifest-second` | Label A → both tags listed | `909 passed, 1 failed` |
| N4b link deleted | Label A → `[]`; Label B → `{"id":null,"href":null}` | `908 passed, 2 failed, 2 skipped` (suite finished) |
| N5 id → `pwa-manifest` | Label B → `{"id":"pwa-manifest"}` (href undefined, dropped by JSON) | `909 passed, 1 failed` |
| N6 `rel="Manifest" href="#"` | Label A → `["<link rel=\"Manifest\" href=\"#\" id=\"manifest-placeholder\" />"]` | `909 passed, 1 failed` |

Every mutation failed exactly its named label, and no CSP label failed in any of them. No check was weak, so MANIFEST_SHA was not amended.

### The revert of a122a2e

`git revert --no-commit a122a2e` exited 0, with `Auto-merging index.html` and `Auto-merging test/app.test.js` and no conflict. It staged exactly `.github/workflows/deploy.yml`, `CLAUDE.md`, `index.html` and `test/app.test.js` (4 files, 200 insertions), which were committed as CSP_SHA2.

| Check | Result |
|-------|--------|
| `git diff ebc5723^ ebc5723 \| git patch-id --stable` | `299764c8e6b68a1b3782de405e69210c4010b70f` |
| `git diff CSP_SHA2^ CSP_SHA2 \| git patch-id --stable` | `299764c8e6b68a1b3782de405e69210c4010b70f` (equal) |
| `git rev-parse CSP_SHA2^` | `cbf17b5529bc92cb86df7bfbd4c817bf8334595e` = MANIFEST_SHA |
| `git hash-object index.html` | `5640c0f1b174343f030e4721579e4a278e835ad5` = G_BLOB |
| suite | `928 passed, 0 failed, 2 skipped` (BASE6 + 20) |
| `PASS  CSP` count | 27, equal to a clone at ebc5723 (27, `926 passed, 0 failed, 2 skipped`) |
| `PASS  MANIFEST:` count | 2 |
| `npm run csp:check` | `CSP hash OK sha256-Nw5jh/JeJpDSYItCr6FJJ52mvE7ySXo1646f8nZCpkU=` |

### C1 smoke (clone S2 at CSP_SHA2)

The baseline was `928 passed, 0 failed, 2 skipped` with no FAIL lines. C1 added one newline before the last `</script>`:

```
  FAIL  CSP-01: the policy's script hash matches the inline script (stale? run npm run csp:hash)  → {"policy":["'sha256-Nw5jh/JeJpDSYItCr6FJJ52mvE7ySXo1646f8nZCpkU='"],"script":"sha256-xAwzoGujYuC7by2hn5+RAicmAaLYwfPW0oEvfqGq7fs=","fix":"npm run csp:hash"}
  FAIL  CSP-01: a deploy-stamped copy keeps the policy and its hash (D-08)  → {"stampedHash":"sha256-xAwzoGujYuC7by2hn5+RAicmAaLYwfPW0oEvfqGq7fs=","policy":[...],"samePolicy":true}
926 passed, 2 failed, 2 skipped
```

These are exactly the script-hash and stamped-copy labels that 07-04's M1 failed. `node scripts/csp-hash.js --check` in S2 exited 1 with `CSP hash stale: … Run: npm run csp:hash`.

## Task 3: Chrome proofs at CSP_SHA2

### W: the committed tree (byte-identical to G)

| Run | violations | security | exceptions | page URL count | manifest | booted / apps / SW ready |
|-----|-----------|----------|------------|----------------|----------|--------------------------|
| normal desktop (18861) | `[]` | `[]` | `[]` | 1 | blob:, data | true / 1 / true |
| normal Android (18863) | `[]` | `[]` | `[]` | 1 | blob:, data | true / 1 / true |
| split desktop (18865) | `[]` | `[]` | `[]` | 1 | blob:, data | true / 1 / true |
| split Android (18867) | `[]` | `[]` | `[]` | 1 | blob:, data | true / 1 / true |

```json
{"violations":[],"security":[],"exceptions":[],"hosts":{"http://127.0.0.1:18861/index.html":1,"https://www.gstatic.com/firebasejs/10.14.1":3,"blob:":1,"http://127.0.0.1:18861/favicon.ico":1},"chrome":"Chrome/154.0.8037.98","facts":{"booted":true,"firebaseApps":1,"sw":"{\"supported\":true,\"ready\":true,\"error\":null}"},"appManifest":{"url":"blob:http://127.0.0.1:18861/0554a7a9-d570-46a7-b6f8-c189619c4e68","errors":[{"message":"property 'start_url' ignored, URL is invalid."}],"hasData":true}}
{"violations":[],"security":[],"exceptions":[],"hosts":{"http://127.0.0.1:18863/index.html":1,"https://www.gstatic.com/firebasejs/10.14.1":3,"blob:":1,"http://127.0.0.1:18863/favicon.ico":1,"https://apis.google.com/js/api.js":1,"https://apis.google.com/_/scs":1,"https://ppl-tracker-a1d87.firebaseapp.com/__/auth":1},"chrome":"Chrome/154.0.8037.98","facts":{"booted":true,"firebaseApps":1,"sw":"{\"supported\":true,\"ready\":true,\"error\":null}"},"appManifest":{"url":"blob:http://127.0.0.1:18863/bd6bcd5a-085f-4b89-b3ed-e3561b2eee35","errors":[{"message":"property 'start_url' ignored, URL is invalid."}],"hasData":true}}
{"violations":[],"security":[],"exceptions":[],"hosts":{"http://127.0.0.1:18865/index.html":1,"https://www.gstatic.com/firebasejs/10.14.1":3,"blob:":1,"http://127.0.0.1:18865/favicon.ico":1},"chrome":"Chrome/154.0.8037.98","facts":{"booted":true,"firebaseApps":1,"sw":"{\"supported\":true,\"ready\":true,\"error\":null}"},"appManifest":{"url":"blob:http://127.0.0.1:18865/6b11339b-c161-4fb7-9f03-e67d65f79bb9","errors":[{"message":"property 'start_url' ignored, URL is invalid."}],"hasData":true}}
{"violations":[],"security":[],"exceptions":[],"hosts":{"http://127.0.0.1:18867/index.html":1,"https://www.gstatic.com/firebasejs/10.14.1":3,"blob:":1,"http://127.0.0.1:18867/favicon.ico":1,"https://apis.google.com/js/api.js":1,"https://apis.google.com/_/scs":1,"https://ppl-tracker-a1d87.firebaseapp.com/__/auth":1},"chrome":"Chrome/154.0.8037.98","facts":{"booted":true,"firebaseApps":1,"sw":"{\"supported\":true,\"ready\":true,\"error\":null}"},"appManifest":{"url":"blob:http://127.0.0.1:18867/a034ccda-5066-4484-9101-5d02d150bc1b","errors":[{"message":"property 'start_url' ignored, URL is invalid."}],"hasData":true}}
```

### T: the deploy-stamped copy (D-08)

The Stamp build `run:` lines ran in Git Bash with `GITHUB_SHA=e50bb0b` plus 33 zeros (40 characters). The result was `<meta name="ppl-build" content="2026-10-07T12:24:34Z e50bb0b" />`. `node scripts/csp-hash.js --check "$T/index.html"` printed `CSP hash OK sha256-Nw5jh/…` and exited 0.

```json
{"violations":[],"security":[],"exceptions":[],"hosts":{"http://127.0.0.1:18869/index.html":1,"https://www.gstatic.com/firebasejs/10.14.1":3,"blob:":1,"http://127.0.0.1:18869/favicon.ico":1},"chrome":"Chrome/154.0.8037.98","facts":{"booted":true,"firebaseApps":1,"sw":"{\"supported\":true,\"ready\":true,\"error\":null}","custom":"Updated Oct 7, 2026, 7:24 AM · e50bb0b"},"appManifest":{"url":"blob:http://127.0.0.1:18869/e03b0331-192f-4f7e-8b36-24030a2ce2d3","errors":[{"message":"property 'start_url' ignored, URL is invalid."}],"hasData":true}}
{"violations":[],"security":[],"exceptions":[],"hosts":{"http://127.0.0.1:18871/index.html":1,"https://www.gstatic.com/firebasejs/10.14.1":3,"blob:":1,"http://127.0.0.1:18871/favicon.ico":1,"https://apis.google.com/js/api.js":1,"https://apis.google.com/_/scs":1,"https://ppl-tracker-a1d87.firebaseapp.com/__/auth":1},"chrome":"Chrome/154.0.8037.98","facts":{"booted":true,"firebaseApps":1,"sw":"{\"supported\":true,\"ready\":true,\"error\":null}","custom":"Updated Oct 7, 2026, 7:24 AM · e50bb0b"},"appManifest":{"url":"blob:http://127.0.0.1:18871/c2e004e5-47ac-41d6-9ee9-7e167d81c04f","errors":[{"message":"property 'start_url' ignored, URL is invalid."}],"hasData":true}}
```

The first run is normal-speed desktop (18869). The second is split-delivery Android (18871). Both meet the GREEN criteria, and `custom` ends `· e50bb0b`.

### Weather allowed, foreign host blocked (T, 18873, desktop)

The expression was 07-04-PLAN Task 2 step 3's three-fetch expression.

```json
{"violations":["connect-src https://example.com/"],"security":["Connecting to 'https://example.com/' violates the following Content Security Policy directive: \"connect-src https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com https://api.open-meteo.com https://geocoding-api.open-meteo.com\". The action has been blocked."],"exceptions":[],"hosts":{"http://127.0.0.1:18873/index.html":1,"https://www.gstatic.com/firebasejs/10.14.1":3,"blob:":1,"http://127.0.0.1:18873/favicon.ico":1,"https://api.open-meteo.com/v1/forecast":1,"https://geocoding-api.open-meteo.com/v1/search":1},"chrome":"Chrome/154.0.8037.98","facts":{"booted":true,"firebaseApps":1,"sw":"{\"supported\":true,\"ready\":true,\"error\":null}","custom":"200,200,blocked"},"appManifest":{"url":"blob:http://127.0.0.1:18873/c52be48e-ecc6-40a2-95f9-714a8b25d7ef","errors":[{"message":"property 'start_url' ignored, URL is invalid."}],"hasData":true}}
```

`custom` = `200,200,blocked`, with exactly one violation, connect-src for `https://example.com/`. The single `security` entry is that same block. Every other GREEN criterion holds.

### V: the guard's symptom in a real browser (W with N1's `href="#"` put back, split desktop, 18875)

```json
{"violations":["manifest-src http://127.0.0.1:18875/index.html"],"security":["Loading a manifest from 'http://127.0.0.1:18875/index.html' violates the following Content Security Policy directive: \"manifest-src blob:\". The action has been blocked."],"exceptions":[],"hosts":{"http://127.0.0.1:18875/index.html":2,"https://www.gstatic.com/firebasejs/10.14.1":3,"blob:":1,"http://127.0.0.1:18875/favicon.ico":1},"chrome":"Chrome/154.0.8037.98","facts":{"booted":true,"firebaseApps":1,"sw":"{\"supported\":true,\"ready\":true,\"error\":null}"},"appManifest":{"url":"blob:http://127.0.0.1:18875/fc840cc2-cf0f-4034-85fa-ce21213f257a","errors":[{"message":"property 'start_url' ignored, URL is invalid."}],"hasData":true}}
```

This meets the RED criteria. Label A refuses exactly the edit that breaks the live page.

### Revert rehearsal (clone R2 at 2927c00)

| Check | Result |
|-------|--------|
| `git revert --no-edit 643c628…` | exit 0, 4 files changed, 200 deletions |
| suite | `910 passed, 0 failed, 2 skipped` (BASE6 + 2), with `PASS  MANIFEST:` counting 2 |
| `git diff --quiet a122a2e -- .github/workflows/deploy.yml CLAUDE.md` | exit 0 |
| `git diff --quiet cbf17b5 -- index.html test/app.test.js` | exit 0 |
| `scripts/csp-hash.js` present | yes |
| `node scripts/csp-hash.js --check` | exit 1, `no CSP <meta http-equiv="Content-Security-Policy"> in …` |

X is the reverted page, with no policy:

```json
{"violations":[],"security":[],"exceptions":[],"hosts":{"http://127.0.0.1:18877/index.html":1,"https://www.gstatic.com/firebasejs/10.14.1":3,"blob:":1,"http://127.0.0.1:18877/favicon.ico":1},"chrome":"Chrome/154.0.8037.98","facts":{"booted":true,"firebaseApps":1,"sw":"{\"supported\":true,\"ready\":true,\"error\":null}"},"appManifest":{"url":"blob:http://127.0.0.1:18877/7670de2d-c9d8-40d9-be9e-71651a983340","errors":[{"message":"property 'start_url' ignored, URL is invalid."}],"hasData":true}}
{"violations":[],"security":[],"exceptions":[],"hosts":{"http://127.0.0.1:18879/index.html":1,"https://www.gstatic.com/firebasejs/10.14.1":3,"blob:":1,"http://127.0.0.1:18879/favicon.ico":1,"https://apis.google.com/js/api.js":1,"https://apis.google.com/_/scs":1,"https://ppl-tracker-a1d87.firebaseapp.com/__/auth":1},"chrome":"Chrome/154.0.8037.98","facts":{"booted":true,"firebaseApps":1,"sw":"{\"supported\":true,\"ready\":true,\"error\":null}"},"appManifest":{"url":"blob:http://127.0.0.1:18879/39d22389-5af8-4778-9916-9a17e4ab8533","errors":[{"message":"property 'start_url' ignored, URL is invalid."}],"hasData":true}}
```

The first run is normal desktop (18877), the second split Android (18879). Both meet the GREEN criteria. The manifest fix alone boots the app with a blob manifest, so it can stay live if the CSP is reverted again. One `Content-Security-Policy` string remains in X's `index.html`. It is the 07-02 comment inside the inline script, not a meta.

### The recorded probe

07-RESEARCH.md gained `### CSP-05 probe, hardened after the 07-05 live failure (use this one)` directly after the original probe's pass-criteria paragraph. The original subsection is untouched. The fenced `js` block is byte-identical to the scratch `probe.js` that produced every output above (checked with a `node -e` comparison). `git diff --name-only 643c628 HEAD` lists only that file.

## Deviations from Plan

None. The plan executed as written.

- The tracer feedback gate ran as an automated end-to-end re-verify, not an interactive human checkpoint. The plan is `autonomous: true` with "None planned" designed stops, and `workflow.human_verify_mode` is `end-of-phase`. Human DevTools verification of the re-ship is 07-07's job.
- The R2 revert used `git -c user.name=probe -c user.email=probe@local` in the scratch clone only, so it could commit. Nothing about the result depends on it.

## Known Stubs

None.

## Threat Flags

None. No new network endpoint, auth path or trust-boundary surface was added. The CSP is ebc5723's patch, and the manifest change removes a fetch.

## Still open (07-07)

- CSP-05: the human DevTools pass and the live-URL probe after deploy (URL mode, desktop and Android).
- CSP-06: the signed-in round trip. The signed-out probes cannot reach identitytoolkit, securetoken or Firestore.
- The push, PR and merge. Nothing here was pushed, and `main` was not touched.
