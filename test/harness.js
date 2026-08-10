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
   temporal-dead-zone crash that killed the app on every device that had data to migrate. */
function loadApp(htmlPath, seed){
  const src = fs.readFileSync(htmlPath, 'utf8');
  const m = [...src.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)];
  if(!m.length) throw new Error('no inline <script> found in ' + htmlPath);
  const code = m[m.length-1][1];

  const store = {};
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
    addEventListener(){},
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
    fetch: () => Promise.reject(new Error('no network in the harness')),
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
  ];
  const api = vm.runInContext(`({
    ${names.map(n=>`${n}: (typeof ${n}!=='undefined' ? ${n} : undefined)`).join(',\n    ')},
    get DB(){ return DB; }, set DB(v){ DB = v; }
  })`, sandbox);
  api.__sandbox = sandbox;
  api.__src = code;
  api.__stored = () => { try{ return JSON.parse(store['ppl_tracker_v1']); }catch(e){ return null; } };
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

const APP_PATH = path.join(__dirname, '..', 'index.html');

module.exports = { loadApp, makeWx, freezeRunnerClock, FROZEN_MS, APP_PATH };
