# Phase 7: content-security-policy - Pattern Map

**Mapped:** 2026-10-02
**Files analyzed:** 7
**Analogs found:** 7 / 7 (scripts/csp-hash.js is role-match only; `scripts/` does not exist yet)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `index.html` (CSP meta, ppl-build meta, BUILD read) | config + app | static markup / request-response | `index.html:4-10` (head metas), `index.html:479-484` (BUILD) | exact |
| `scripts/csp-hash.js` (NEW) | utility / CLI | file-I/O, transform | `test/harness.js:45-49` (inline-script extraction), `test/app.test.js:96-104` (git helper) | role-match |
| `package.json` | config | n/a | `package.json` `scripts.test` | exact |
| `test/harness.js` | test utility | transform | `test/harness.js:62-70` (stub `doc`) | exact |
| `test/app.test.js` (BUILD retarget + new CSP block) | test | file-I/O, property assertions | `test/app.test.js:3284-3317` (Build stamp), `:109-112` (the file itself), `:131-145` (firestore.rules property tests), `:88-104` (REPO-01 git) | exact |
| `.github/workflows/deploy.yml` | config (CI) | batch | `deploy.yml` "Stamp build" step + `test` job's setup-node | exact |
| `CLAUDE.md` | docs | n/a | "Before every push" + Conventions bullets (firestore.rules, Line endings) | exact |

## Pattern Assignments

### `index.html`

**Head placement** (`index.html:3-10`): `<head>` then `<meta charset="UTF-8" />` at line 4, viewport/PWA metas 5-9, `<link rel="manifest">` at 10, `<style>` at 12, SDK tags 268-270, inline `<script>` opens at 300. Insert CSP meta as line 5 (right after charset). Self-closing ` />` style is the house convention:
```html
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

**Firebase SDK tags D-07 version must match** (`index.html:268-270`):
```html
  <script defer src="https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"></script>
  <script defer src="https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js"></script>
  <script defer src="https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js"></script>
```

**BUILD constant to retarget** (`index.html:479-484`) — rewrite comment + line to read `<meta name="ppl-build">` (RESEARCH option a). Consumer is `index.html:3380` `esc(buildLabel(BUILD))`:
```js
/* Which build is this? The deploy job swaps the placeholder below for "<ISO time> <short sha>" in the
   published copy only, ... The placeholder must appear exactly once
   in this file (a test enforces it); an unstamped copy is a local one, never a deploy. */
const BUILD = '__BUILD_STAMP__';
```
Note: BUILD sits right after `SCHEMA` (line 478) at module-eval time; a `document.querySelector` read there is fine in browser (head parsed before body script) and requires the harness change below.

---

### `scripts/csp-hash.js` (NEW, utility/CLI, file-I/O)

No existing `scripts/` dir. Copy conventions from the test files: CommonJS `require`, zero deps.

**Imports convention** (`test/app.test.js:12-15`):
```js
const { loadApp, makeWx, freezeRunnerClock, APP_PATH, scanInlineHandlers } = require('./harness');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
```

**Inline-script extraction — reuse this regex verbatim** (`test/harness.js:46-49`):
```js
  const src = fs.readFileSync(htmlPath, 'utf8');
  const m = [...src.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)];
  if(!m.length) throw new Error('no inline <script> found in ' + htmlPath);
  let code = m[m.length-1][1];
```
For the hash, require exactly one match (as `test/app.test.js:111` does), normalise `/\r\n?/g -> '\n'`, sha256, base64 (`crypto` builtin).

**Export convention** (`test/harness.js:263`): `module.exports = { ... };` — export `inlineScriptHash`, `readPolicy`; CLI body under `if (require.main === module)`. Path to index.html: `path.join(__dirname, '..', 'index.html')` (mirrors `test/app.test.js:96` `path.join(__dirname, '..')` root).

---

### `package.json`

Current (whole file):
```json
  "scripts": {
    "test": "node test/app.test.js"
  }
```
Add `"csp:hash": "node scripts/csp-hash.js"` and `"csp:check": "node scripts/csp-hash.js --check"`. Keep `private: true`, no dependencies.

---

### `test/harness.js`

**Stub to change** (`test/harness.js:62-70`):
```js
  const byId = new Map();
  const doc = {
    getElementById: id => { if(!byId.has(id)) byId.set(id, el()); return byId.get(id); },
    querySelector: () => el(),
    querySelectorAll: () => [],
```
`el()` (`:55-60`) has no `.content`, so `querySelector('meta[name="ppl-build"]').content` is `undefined`. Make `querySelector` match `/^meta\[name="([^"]+)"\]$/` and return `{ ...el(), content }` parsed from `src` (already in scope at `:46`), else `el()`. Keep `src` read before `opts.transform` so the stamped-temp-file replay still feeds the meta.

---

### `test/app.test.js`

**Existing Build-stamp block to retarget** (`test/app.test.js:3284-3317`). Section header style:
```js
console.log('\n── Build stamp ──');
{
  const src = fs.readFileSync(APP_PATH, 'utf8');
  const hits = src.split('__BUILD_STAMP__').length - 1;
  ok('BUILD: the placeholder appears exactly once, as the BUILD literal',
     hits === 1 && /const BUILD = '__BUILD_STAMP__';/.test(src), { hits });          // 3290-3292: rewrite to meta + "not inside inline script"
  const yml = fs.readFileSync(path.join(path.dirname(APP_PATH), '.github', 'workflows', 'deploy.yml'), 'utf8');
  const deployJob = yml.slice(yml.indexOf('\n  deploy:'));
  ok('BUILD: the deploy job stamps the placeholder before uploading the site',
     deployJob.indexOf('__BUILD_STAMP__') > 0 && deployJob.indexOf('__BUILD_STAMP__') < deployJob.indexOf('upload-pages-artifact'));  // unchanged; reuse for "csp --check after stamp, before upload"
  const a = loadApp(APP_PATH);
  ok('BUILD: an unstamped copy says it is local, never a deploy',
     a.BUILD === '__BUILD_STAMP__' && ...);                                          // holds once harness feeds meta
```
Deploy-replay (`:3307-3313`) — this is the landmine regression site; change the `replace` target to the meta form and add an assertion that `inlineScriptHash(stamped)` still equals the policy hash:
```js
  const os = require('os');
  const tmp = path.join(os.tmpdir(), `ppl-stamped-${process.pid}.html`);
  fs.writeFileSync(tmp, src.replace("'__BUILD_STAMP__'", "'2026-09-23T19:05:00Z e50bb0b'"));
  let html = '', threw = null;
  try{ html = loadApp(tmp).viewData(); }catch(e){ threw = e.message; }
  finally { try{ fs.unlinkSync(tmp); }catch(e){} }
```

**Reading index.html raw + inline count** (`test/app.test.js:109-112`) — the existing "exactly one inline script" invariant the CSP hash depends on:
```js
const rawHtml = fs.readFileSync(APP_PATH, 'utf8');
const inline = [...rawHtml.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)];
ok('index.html holds exactly one inline script', inline.length === 1, inline.length);
```

**Property-not-wording precedent** (`test/app.test.js:123-145`, firestore.rules): strip comments, parse, assert with `.every(...)`. Use the same for the CSP: parse `content` into `{directive: tokens[]}`, assert required/forbidden token sets, never compare the whole string. Comment block above the test explains *why* (copy that tone).

**Git helper for D-05 blob hash** (`test/app.test.js:96-104`) — fails, never skips:
```js
  const root = path.join(__dirname, '..');
  const git = args => execFileSync('git', args, { cwd: root, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  let eol = null, blob = null, err = null;
  try {
    eol = git(['check-attr', '-z', 'eol', '--', 'index.html']).toString('utf8').split('\0')[2];
    blob = git(['show', ':index.html']);
  } catch(e){
    err = String((e && e.stderr && e.stderr.toString()) || (e && e.message) || e);
  }
```
Assertion helper: `ok(name, cond, detail)` — the third arg is the failure detail; for the stale-hash test put the regeneration command (`npm run csp:hash`) in the name or detail (D-03). Test-name prefix convention: requirement id, e.g. `'CSP-02: ...'` (cf. `'REPO-01: ...'`, `'BUILD: ...'`, `'WR-02: ...'`).

---

### `.github/workflows/deploy.yml`

**Stamp step to retarget** (deploy job):
```yaml
      - name: Stamp build
        run: |
          test "$(grep -c "'__BUILD_STAMP__'" index.html)" = 1
          sed -i "s/'__BUILD_STAMP__'/'$(date -u +%Y-%m-%dT%H:%M:%SZ) ${GITHUB_SHA::7}'/" index.html
          grep -q "^const BUILD = '[0-9T:Z-]* [0-9a-f]\{7\}';" index.html
```
Keep the three-line shape (count == 1, sed, grep-verify), targeting `content="__BUILD_STAMP__"` in the meta. Then add a hash check step before `Configure Pages`/`upload-pages-artifact`; the deploy job has no Node yet — copy from the `test` job:
```yaml
      - name: Use Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
```
Comment style: a `#` block above the step explaining why it fails loudly.

---

### `CLAUDE.md`

- "Before every push" section: single `npm test` fenced block + prose — add the `npm run csp:hash` line for when the inline script changes.
- Conventions: model the new CSP bullet on the **Security rules** / **Line endings** bullets (bold lead, what the suite asserts as a property, the one command that fixes drift). Document `style-src 'unsafe-inline'` as deliberate (CSP-04).

## Shared Patterns

- **Property, not wording** — source: `test/app.test.js:123-145` and `:88-95` comments. Apply to every new CSP assertion.
- **Fail, never skip** — source: REPO-01 block `:88-104`. Apply to the git-blob hash check.
- **Single extraction regex** — source: `test/harness.js:47`. Apply in `scripts/csp-hash.js`; tests should import the script's function rather than re-derive (one hashing function).
- **Placeholder appears exactly once** — source: `deploy.yml` `grep -c ... = 1` and `test/app.test.js:3290`. Keep for the meta form.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `scripts/csp-hash.js` CLI in-place rewrite | utility | file-I/O | No script in the repo writes `index.html`; only the deploy `sed`. Use RESEARCH.md Pattern 2 + harness regex. |

## Metadata

**Analog search scope:** index.html, test/, package.json, .github/workflows/, CLAUDE.md
**Pattern extraction date:** 2026-10-02
