# Testing Patterns

**Analysis Date:** 2026-09-09

## Test Framework

**Runner:**
- Node.js native (no external test runner)
- Run: `npm test` or `node test/app.test.js`
- Exit code 0 = pass, non-zero = fail (blocks CI deploy)

**Custom harness:**
- `test/harness.js` — loads the inline script from `index.html` into a `vm` context with a stubbed DOM
- No modifications to `index.html` required for testing
- Extracted API returns functions and state for assertions

**Assertion library:**
- Custom `ok(name, condition, extra)` function
  - Logs `PASS` or `FAIL` to console
  - Tracks pass/fail counts
  - `extra` parameter prints details on failure (usually `JSON.stringify()` output)

**Run Commands:**
```bash
npm test              # Run all tests (blocking on CI)
node test/app.test.js # Same; direct invocation
TZ=America/Chicago npm test  # Set timezone (some tests are hour-sensitive)
```

**Exit behavior:**
```
pass = 0, fail = 0;
// tests run...
// process.exit(fail ? 1 : 0) is implicit (test harness checks this at runtime)
```

## Test File Organization

**Location:**
- `test/app.test.js` — behavior tests (~600 lines)
- `test/harness.js` — vm-based test harness (~170 lines)

**Naming:**
- Functions starting with lowercase: `loadApp()`, `makeWx()`, `freezeRunnerClock()`
- Test groups marked with console headers: `console.log('\n── the file itself ──');`

**Structure:**
```
test/
├── app.test.js       # Behavior assertions (one test file)
└── harness.js        # VM harness, fixture builders, stubs
```

## Test Structure

**Suite organization:**
```javascript
const ok = (name, cond, extra) => {
  if(cond){ pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra!==undefined ? '  → ' + JSON.stringify(extra) : '')); }
};

console.log('\n── the file itself ──');
ok('index.html holds exactly one inline script', inline.length === 1, inline.length);

console.log('\n── mow forecast: when is the next mow? ──');
setup(app, { mowedDaysAgo: 3 });
let f = app.mowForecast();
ok('dry + mowed 3d ago → first mow at day 5', f.next && f.next.k === 5, f && f.next && f.next.k);
```

**Patterns:**
- **Setup:** `setup()` function mutates `app.DB` with test conditions
  - `setup(app, { mowedDaysAgo: 3, wx:{ precipByOffset:{ 0: 0.6 } } })`
  - Returns the app object with modified `DB`
- **Fixtures:** Helper builders like `makeWx()`, `populatedDB()`, `dayOff()`, `setLog()`
- **Assertions:** `ok()` function with clear names that read as behavior
  - Example: `ok('dry + mowed 3d ago → first mow at day 5', ...)`
- **Teardown:** Mutations accumulate; each test's setup overwrites previous state

## Mocking

**Framework:** Custom vm-based sandbox (`test/harness.js`)

**DOM mocks:**
```javascript
const el = () => ({
  innerHTML:'', textContent:'', value:'', style:{},
  dataset:{},
  classList:{ add(){}, remove(){}, toggle(){} },
  querySelector:()=>null, querySelectorAll:()=>[],
  addEventListener(){}, removeEventListener(){},
  appendChild(){}, remove(){}, focus(){}, click(){},
  setAttribute(){}, getAttribute(){ return ''; },
  getContext(){ return null; }
});
const doc = {
  getElementById: id => { if(!byId.has(id)) byId.set(id, el()); return byId.get(id); },
  querySelector: () => el(),
  querySelectorAll: () => [],
  createElement: el,
  body: el(),
  documentElement: el(),
  addEventListener(){},
  head: el(),
};
```

**Date mocking:**
- Global `Date` replaced with a frozen class
- Frozen to midday Chicago time on 2026-08-07 (summer, odd calendar day, before afternoon)
- All date logic uses this frozen value
- Test setup: `freezeRunnerClock()` sets `global.Date = FrozenDate`

**Weather mocking:**
```javascript
function makeWx(opts){
  const { todayISO, precipByOffset = {}, probByOffset = {}, hotFrom = {}, hiByOffset = {}, rainFrom = {} } = opts;
  // Returns Open-Meteo-shaped blob with 3-day past + 6-day future
}
```
Options keyed by day offset from today:
- `precipByOffset {0: 0.4}` — daily precipitation totals, inches
- `probByOffset {0: 60}` — daily max chance of rain, %
- `hiByOffset {1: 95}` — daily high, °F (default 75)
- `hotFrom {0: 14}` — hourly temps hit 90°F from this hour
- `rainFrom {0:{hour,perHour}}` — hourly precipitation from this hour to 9pm

**localStorage mocking:**
```javascript
const store = {};
if(seed) store['ppl_tracker_v1'] = typeof seed === 'string' ? seed : JSON.stringify(seed);
const localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k,v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; },
};
```
Seeds database before app boot so the app migrates real data at startup.

**Firebase API:**
- Set to undefined in sandbox: `firebase: undefined`
- Network access throws: `fetch: () => Promise.reject(new Error('no network in the harness'))`

**Other globals:**
- Navigator, geolocation, service worker registration all stubbed
- `requestAnimationFrame` returns 0
- `getComputedStyle`, `matchMedia` return empty/false

## Fixtures and Factories

**Test data builders:**

```javascript
// Helper to backdate log entries
const dayOff = n => {
  const d = new Date(today+'T00:00');
  d.setDate(d.getDate()+n);
  return d.toLocaleDateString('en-CA');
};

// Setup lawn state for a test
const setLog = (a, o) => {
  a.DB.lawnLog = {};
  if(o.mowedDaysAgo!=null)
    (a.DB.lawnLog[dayOff(-o.mowedDaysAgo)] = a.DB.lawnLog[dayOff(-o.mowedDaysAgo)] || {}).mowed = true;
  if(o.wateredDaysAgo!=null)
    (a.DB.lawnLog[dayOff(-o.wateredDaysAgo)] = a.DB.lawnLog[dayOff(-o.wateredDaysAgo)] || {}).watered = true;
};

// Setup complete lawn context (location + weather + history)
const setup = (a, o) => {
  a.DB.lawn = { lat:44.94, lon:-93.36, label:'St. Louis Park' };
  a.DB.wx = o.wx === null ? null : makeWx(Object.assign({ todayISO: today }, o.wx||{}));
  setLog(a, o);
};
```

**Realistic database:**
```javascript
function populatedDB(a){
  const d = a.blank();
  d.sessions = [
    { id:'s1', workout:'PUSH 1', date:dayOff(-9), endedAt:1, durationMin:52, extras:{},
      entries:[{ name:'Barbell bench press', sets:[{w:'135',r:'8',skipped:false}] }] },
    // more sessions...
  ];
  d.weights    = [{ date:dayOff(-9), value:196.4 }, ...];
  d.petWeights = [{ date:dayOff(-30), value:12.1 }, ...];
  d.cardio     = [{ id:'c1', date:dayOff(-6), kind:'run', minutes:28, miles:2.8 }];
  d.ideas      = [{ id:'i1', text:'A hostile <script> & "quotes" — must be escaped', at:Date.now() }];
  d.todos      = [{ text:'Order more creatine', created:dayOff(-4) }];
  d.hobbyLog   = [{ date:dayOff(-1), item:'🎨 Mini-painting', cat:'hobby' }];
  d.journal    = { [dayOff(-1)]: 'Felt strong.', [today]: '' };
  d.mobilityLog= { [today]: { 'Couch stretch': true } };
  d.lawnLog    = { [dayOff(-4)]: { mow:true }, [dayOff(-1)]: { water:true } };
  d.lawn       = { lat:41.88, lon:-87.63 };
  d.wx         = makeWx({ todayISO: today });
  return d;
}
```

**Location:** Fixtures are defined in `test/app.test.js` inline (no separate factory files)

## Coverage

**Requirements:** No coverage metric enforced

**View coverage:**
```javascript
console.log('\n── every screen still draws ──');
// walk every tab and sub-tab, assert no exceptions thrown
```

## Test Types

**Unit tests:** Not explicitly separated; tests mix unit and integration

**Behavior tests (primary):**
- Assert "the app promises Ian" things (CLAUDE.md phrasing)
- Each test names a feature or regression
- Example: `ok('dry + mowed 3d ago → first mow at day 5', f.next && f.next.k === 5, f && f.next && f.next.k);`
- Many tests exist because the thing they describe was broken in production (comments explain which)

**Integration tests:**
- Tests that mutate `DB`, call functions, and assert side effects
- Example: Backup/restore cycle, migration with sync merge

**E2E tests:**
- "Every screen still draws" section (500+ lines) seeds a realistic DB and calls every view
- Asserts no exceptions thrown; behavior is tested above

**Smoke tests:**
- File validation: `index.html` holds one inline script, it compiles
- Service worker: `sw.js` exists, compiles, has versioned cache
- Security rules: `firestore.rules` exists, checks access control

## Common Patterns

**Async testing:**
Not used in this test suite (no async operations in the app logic itself; sync data, no promises).

**Error testing:**
```javascript
ok('a truncated file (no weights list) is refused', app.validateBackup(copy) === null);
reject('a truncated file (no weights list) is refused', d=>{ delete d.weights; }, /weights/);

// Helper:
const reject = (label, mutate, expect) => {
  const copy = JSON.parse(JSON.stringify(realBackup));
  mutate(copy);
  const msg = app.validateBackup(copy);
  ok(label, typeof msg === 'string' && (!expect || expect.test(msg)), msg);
};
```

**Testing data transformations:**
```javascript
ok('an in-range set sets the baseline',
   (app.exercisePRs().find(p=>p.name==='Leg press')||{}).v === 130,
   app.exercisePRs());
```

**Testing string output (wording):**
```javascript
[
  { name:'dry, mowed 3d',  o:{mowedDaysAgo:3, ...}, mow:'Last mowed 3 days ago — too soon' },
  { name:'dry, mowed 6d',  o:{mowedDaysAgo:6, ...}, mow:'Last mowed 6 days ago — wait a day or two' },
].forEach(c=>{
  setup(app, c.o);
  const s = app.lawnStatus();
  if(c.mow) ok(`mow text — ${c.name}`, s.mow.text === c.mow, s.mow.text);
});
```
Wording snapshots: exact strings on Ian's phone; refactors that move them are decisions to make on purpose, not surprises.

**Testing with migrations:**
```javascript
const booted = loadApp(APP_PATH, Object.assign(app.blank(), {
  _schema:14, draft:null, sessions:[
    { id:'g1', workout:'LEGS 1', date:'2026-07-15', endedAt:1, extras:{},
      entries:[{name:'Goblet squat', sets:[{w:'50',r:'12',skipped:false}]}] }
  ]
}));
ok('the app boots at all (no dead-zone crash)', typeof booted.exKey === 'function' && typeof booted.exRows === 'function');
ok('  …the migration ran', booted.DB._schema === app.SCHEMA && booted.DB.sessions[0].entries[0].name === 'Deficit sumo squat', ...);
ok('  …was WRITTEN to storage, not just held in memory', (()=>{ const s = booted.__stored(); return s && s._schema === app.SCHEMA; })(), ...);
```
Each test stage demonstrates a requirement: boot succeeds, migration applies, persistence works.

**Testing secondary instances:**
```javascript
// Boot with data that needs migrating — only this path runs save() at startup
// Skipping it hid a temporal-dead-zone crash that killed the app outright on every device with data
const booted = loadApp(APP_PATH, seedData);
ok('the app boots at all (no dead-zone crash)', typeof booted.exKey === 'function');
```
Comment explains why this test exists: a production bug only visible on this code path.

## Test Comments

Every test group starts with a console.log header:
```javascript
console.log('\n── mow forecast: when is the next mow? ──');
console.log('\n── the strip assumes you actually mow on the mow day ──');
console.log('\n── "Overdue" has a grace window ──');
console.log('\n── every screen still draws ──');
```

Many tests include production-bug context:
```javascript
/* Shipped broken 2026-08-05: with nothing ever logged the interval had no anchor, so every day read
   "overdue — mow today", forever. The fix assumes it's due AND asks for the last date. */
```

This documents *why* each test exists: what broke in production and why we can't regress it.

---

*Testing analysis: 2026-09-09*
