/* Test harness for the single-file app.
 *
 * The app is one HTML file with one inline <script>. There's no build step and no module system —
 * on purpose, it's what keeps the app installable and offline-first. So the harness evaluates that
 * script inside a `vm` context with a stubbed DOM, then hands back the internals to assert against.
 * Nothing in index.html changes to make this work.
 *
 * The clock is FROZEN. Half this app is date logic (mowing intervals, watering ordinances by
 * odd/even day, rolling averages, seasons) and a suite that passes in August and fails in November
 * is worse than no suite at all — it trains you to ignore red. Every run pretends it is midday on
 * Fri 7 Aug 2026: summer, an odd calendar day, before the afternoon.
 */
const fs = require('fs'), vm = require('vm'), path = require('path');

/* Midday Chicago on an odd summer day. Chosen so the calendar date is the same in every timezone
   from UTC-12 to UTC+6; TZ is pinned to America/Chicago as well (see run-tests / CI env) because
   rainTiming() compares against the current HOUR, not just the date. */
const FROZEN_MS = Date.parse('2026-08-07T17:00:00Z');

function frozenDateClass(fixedMs){
  const Real = Date;
  function Frozen(...args){
    if(!new.target) return new Real(fixedMs).toString();
    return args.length ? new Real(...args) : new Real(fixedMs);
  }
  Frozen.prototype = Real.prototype;
  Frozen.now = () => fixedMs;
  Frozen.parse = Real.parse;
  Frozen.UTC = Real.UTC;
  return Frozen;
}
const FrozenDate = frozenDateClass(FROZEN_MS);

/* The test file does its own date arithmetic ("three days ago"), so its clock has to agree with the
   app's or every relative fixture drifts by a day. Freezing the runner's global Date keeps one
   definition of "today" across both sides. */
function freezeRunnerClock(){ global.Date = FrozenDate; }

/* `seed` puts a blob in localStorage BEFORE the app script runs, so boot takes the same path a real
   device does — including migrating and saving. Booting only from an empty store hid a
   temporal-dead-zone crash that killed the app on every device that had data to migrate.
   `opts.transform(code)`, when given, rewrites the extracted inline-script text before it runs —
   used to build refusal fixtures (e.g. a registry entry with a field deleted) without maintaining a
   second copy of index.html. */
function loadApp(htmlPath, seed, opts){
  const src = fs.readFileSync(htmlPath, 'utf8');
  const m = [...src.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)];
  if(!m.length) throw new Error('no inline <script> found in ' + htmlPath);
  let code = m[m.length-1][1];
  if(opts && typeof opts.transform === 'function') code = opts.transform(code);

  const store = {};
  /* document.addEventListener records { fn, opts } per event type, so a test can assert which
     delegated listeners the app registered and fire the very listener a tap would reach. */
  const listeners = {};
  if(seed) store['ppl_tracker_v1'] = typeof seed === 'string' ? seed : JSON.stringify(seed);
  const el = () => ({ innerHTML:'', textContent:'', value:'', style:{}, dataset:{},
    classList:{ add(){}, remove(){}, toggle(){} }, querySelector:()=>null, querySelectorAll:()=>[],
    addEventListener(){}, removeEventListener(){}, appendChild(){}, remove(){}, focus(){}, click(){},
    setAttribute(){}, getAttribute(){ return ''; }, getContext(){ return null; } });
  const byId = new Map();
  const doc = {
    getElementById: id => { if(!byId.has(id)) byId.set(id, el()); return byId.get(id); },
    querySelector: () => el(),
    querySelectorAll: () => [],
    createElement: el,
    body: el(),
    documentElement: el(),
    addEventListener(type, fn, opts){ (listeners[type] = listeners[type] || []).push({ fn, opts }); },
    head: el(),
  };
  const sandbox = {
    console,
    Date: FrozenDate,
    document: doc,
    localStorage: {
      getItem: k => (k in store ? store[k] : null),
      setItem: (k,v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; },
    },
    navigator: { serviceWorker:{ register(){ return Promise.resolve(); } }, geolocation:{ getCurrentPosition(){} } },
    location: { reload(){}, href:'http://localhost/' },
    /* No network: a request never settles. It used to reject at once, which was harmless only while
       the suite exited before any promise ran. Once async checks let the event loop turn, a rejecting
       fetch spins forever on any instance left on the Lawn tab with a stale weather cache:
       fetchWeather() → fails → render() → maybeFetchWeather() → fetchWeather() → … all in
       microtasks, so no timer, no timeout and no exit ever runs again. */
    fetch: () => new Promise(() => {}),
    setTimeout, clearTimeout, setInterval, clearInterval,
    requestAnimationFrame: () => 0,
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    matchMedia: () => ({ matches:false, addEventListener(){}, addListener(){} }),
    alert(){}, confirm: () => true, prompt: () => '',
    URL: { createObjectURL: () => 'blob:stub', revokeObjectURL(){} },
    Blob: function Blob(){}, FileReader: function FileReader(){},
    innerWidth: 400, innerHeight: 800,
    firebase: undefined,
    addEventListener(){}, removeEventListener(){}, scrollTo(){},
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: htmlPath });

  /* `let DB` / `const fn = …` live in the context's global LEXICAL scope, not on the sandbox object.
     A second script in the same context can still see them, so export what the tests need. Anything
     missing comes back undefined rather than throwing, so a renamed function fails as a readable
     assertion instead of a crash. */
  const names = [
    'todayISO','esc','fmtDate','effRange','PROGRAM','blank','normalize','touch','SCHEMA',
    'lawnSeason','lawnStatus','mowVerdict','mowForecast','mowExpectText','mowMark','mowOutlookHTML',
    'lawnHeatWindow','lawnRainWindow','daysSinceLawn','nextDueDay','waterSession','rainTiming',
    'setLawnLog','toggleLawnLog','setLawnDaysAgo','lawnHistory','cLawnCard','viewLawn','SPRINKLER_IN_PER_HR',
    'mergeDB','mergeUnion','liveWeights','livePetWeights','rollingAvgSeries','petName','latestPetWeight',
    'petMonthDelta','rangeDelta','spanLabel','weightEquivalent','setRange','viewWeight','viewPetWeight',
    'setStatus','badgeState','exercisePRs','prSetIndex','sessionRanges','sessionExercises',
    'platesText','plateBreakdown','barWeight','barStyle','isBarbell','extraCard','ACCESSORIES',
    'accOpen','toggleAcc','viewToday','remoteTooNew','renameLoggedExercise',
    'validateBackup','exKey','exLabel','exRow','exRows','exEnsure','exMerge','exUsage','exSuggest','exIdByName','normEx','exercisesWithData','exerciseHistory','viewStrength','selectExercise',
    /* Every screen, plus the router that reaches them. render() wraps each view in a try/catch and
       shows Ian a friendly "something broke" card instead of crashing — right for the gym, wrong for
       a test suite, because a view an agent broke stays silent and the suite stays green. Exporting
       the views lets the smoke check call them directly, where a throw is a throw. */
    'TABS','tabDef','render','go','setSub','subState',
    'viewActive','viewCardio','viewCardioTrend','viewData','viewHistory','viewPicker','viewSkincare','viewVolume',
    'COLLECTIONS','collectionProblems','MIGRATIONS','sessKey','todoKey','hobbyKey','cardioKey','ideaKey','sessionSort',
    'sessionRows','hobbyRows','journalRows','dayFlagRows',
    'blank_legacy','HOBBIES_DEFAULT',
    'liveOf','liveSessions','liveCardio','liveIdeas','liveTodos','liveHobbyLog','softDelete',
    'liveSessions_legacy','liveWeights_legacy','livePetWeights_legacy','liveCardio_legacy','liveIdeas_legacy','liveTodos_legacy','liveHobbyLog_legacy',
    'validateBackup_legacy', 'mergeDB_legacy', 'mergeCollections', 'ensureCollectionDefaults',
    'sleepUid', 'addSleep', 'removeSleep', 'viewSleep',
    'mdEscape', 'mdCell', 'mdHeader', 'exportRows', 'buildMarkdownExport', 'exportMarkdown', 'downloadMarkdown', 'exportData', 'exportShareFailed',
    /* Sync and the in-progress draft (Phase 4). SYNC is a const object: exporting the reference is
       enough, because tests only mutate its properties. fbDb is a `let`, so it gets an accessor
       below instead. */
    'SYNC', 'pushNow', 'startLiveSync', 'onSignedIn', 'adoptMerged', 'keepLocalDraft', 'stripDraft',
    'saveLocal', 'snapshotNow', 'cloudVersion',
    'setVal', 'finishWorkout', 'discardWorkout',
    /* Every other path that replaces DB wholesale (Phase 4, plan 04-02). */
    'importMerge', 'importReplace', 'restoreSnapshot', 'restoreCloudVersion', 'loadCloudVersions', 'wipe',
    /* Which build a device is running (Settings → This version). */
    'BUILD', 'buildLabel',
    /* Event delegation (Phase 5). ACTIONS is a const, reachable only through this export. */
    'ACTIONS', 'dispatchAction', 'buildTabBar',
  ];
  const api = vm.runInContext(`({
    ${names.map(n=>`${n}: (typeof ${n}!=='undefined' ? ${n} : undefined)`).join(',\n    ')},
    get DB(){ return DB; }, set DB(v){ DB = v; },
    get TAB(){ return TAB; },
    get fbDb(){ return fbDb; }, set fbDb(v){ fbDb = v; }
  })`, sandbox);
  api.__sandbox = sandbox;
  api.__src = code;
  api.__stored = () => { try{ return JSON.parse(store['ppl_tracker_v1']); }catch(e){ return null; } };
  api.__listeners = listeners;
  return api;
}

/* Build a weather blob shaped like Open-Meteo's: daily arrays start 3 days BEFORE today (past_days=3)
   and run 6 days forward, with matching hourly series.
   Options are all keyed by day offset from today:
     precipByOffset {0: 0.4}          daily precipitation totals, inches
     probByOffset   {0: 60}           daily max chance of rain, %
     hiByOffset     {1: 95}           daily high, °F (default 75)
     hotFrom        {0: 14}           hourly temps hit 90°F from this hour
     rainFrom       {0:{hour,perHour}} hourly precipitation from this hour to 9pm            */
function makeWx(opts){
  const { todayISO, precipByOffset = {}, probByOffset = {}, hotFrom = {}, hiByOffset = {}, rainFrom = {} } = opts;
  const base = new Date(todayISO + 'T00:00');
  const iso = n => { const d = new Date(base); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
  const time = [], precipitation_sum = [], precipitation_probability_max = [],
        temperature_2m_max = [], temperature_2m_min = [], weathercode = [];
  for(let n=-3; n<=6; n++){
    time.push(iso(n));
    precipitation_sum.push(precipByOffset[n] || 0);
    precipitation_probability_max.push(probByOffset[n] || 0);
    temperature_2m_max.push(hiByOffset[n] != null ? hiByOffset[n] : 75);
    temperature_2m_min.push(55);
    weathercode.push(0);
  }
  const hTime = [], hTemp = [], hPrecip = [];
  for(let n=-3; n<=6; n++){
    for(let hr=0; hr<24; hr++){
      hTime.push(`${iso(n)}T${String(hr).padStart(2,'0')}:00`);
      const hot = hotFrom[n];
      hTemp.push(hot != null && hr >= hot ? 90 : 70);
      const r = rainFrom[n];
      hPrecip.push(r && hr >= r.hour && hr <= 21 ? r.perHour : 0);
    }
  }
  return { at: Date.now(), data: {
    current_weather: { temperature:75, weathercode:0 },
    daily: { time, precipitation_sum, precipitation_probability_max, temperature_2m_max, temperature_2m_min, weathercode },
    hourly: { time: hTime, temperature_2m: hTemp, precipitation: hPrecip },
  }};
}

/* Every inline on-event attribute in `raw`, in file order (Phase 5, DELEG-01). The same function
   produced test/fixtures/handler-inventory.json from index.html before any handler was converted,
   and the suite runs it over the live file, so the snapshot and the scan cannot disagree by
   algorithm. Deliberately broad: any `on<letters>=` with any quoting, because Phase 7's CSP blocks
   every inline handler, not only the five events the app uses today.
     fn          the nearest column-0 `function NAME` / `async function NAME` above the match, or
                 '(static markup)' when the scan reaches the `<script>` line first
     event       the attribute's event name, lower-cased
     tag         the last `<tagname` opening in the 400 characters before the attribute
     was         the handler text for a double-quoted attribute (walking `${…}` nesting to the
                 closing quote); null for any other quoting, which no inventory row can match
     occurrence  1-based count per (fn, event, was)
     calls       every dotted identifier followed by `(` inside `was`, except `if`, in order */
function scanInlineHandlers(raw){
  const lines = raw.split('\n');
  const lineStarts = [0];
  for(let i = 0; i < raw.length; i++) if(raw[i] === '\n') lineStarts.push(i + 1);
  const lineOf = idx => {
    let lo = 0, hi = lineStarts.length - 1;
    while(lo < hi){ const mid = (lo + hi + 1) >> 1; if(lineStarts[mid] <= idx) lo = mid; else hi = mid - 1; }
    return lo;
  };
  const enclosing = ln => {
    for(let k = ln; k >= 0; k--){
      const m = lines[k].match(/^(?:async\s+)?function\s+([A-Za-z0-9_$]+)/);
      if(m) return m[1];
      if(/^<script>/.test(lines[k])) break;
    }
    return '(static markup)';
  };
  const re = /\son([A-Za-z]+)\s*=\s*(["'`]|\$)/g, rows = [], seen = {};
  let m;
  while((m = re.exec(raw))){
    const at = m.index + 1;                       // the `o` of `on`, past the leading whitespace
    const event = m[1].toLowerCase(), opener = m[2];
    let was = null;
    if(opener === '"'){
      const start = m.index + m[0].length;
      let i = start, depth = 0;
      while(i < raw.length){
        if(raw[i] === '$' && raw[i+1] === '{'){ depth++; i += 2; continue; }
        if(depth && raw[i] === '}'){ depth--; i++; continue; }
        if(!depth && raw[i] === '"') break;
        i++;
      }
      was = raw.slice(start, i);
    }
    const fn = enclosing(lineOf(at));
    const key = fn + '|' + event + '|' + was;
    seen[key] = (seen[key] || 0) + 1;
    const tag = ([...raw.slice(Math.max(0, at - 400), at).matchAll(/<([a-zA-Z]+)[\s>]/g)].pop() || [])[1] || null;
    const calls = was === null ? []
      : [...was.matchAll(/([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\(/g)].map(x => x[1]).filter(n => n !== 'if');
    rows.push({ fn, event, tag, was, occurrence: seen[key], calls });
  }
  return rows;
}

const APP_PATH = path.join(__dirname, '..', 'index.html');

module.exports = { loadApp, makeWx, freezeRunnerClock, FROZEN_MS, APP_PATH, scanInlineHandlers };
