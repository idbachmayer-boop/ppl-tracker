/* PPL Tracker — behaviour checks.
 *
 * Run: node test/app.test.js        (CI runs exactly this; a non-zero exit blocks the deploy)
 *
 * These assert BEHAVIOUR, not implementation: each one names something the app promises Ian, so a
 * failure reads as "the app stopped doing X" rather than "a function moved". Most exist because the
 * thing they describe was once broken in production — the comments say which.
 *
 * The clock is frozen to midday Fri 7 Aug 2026 (see harness.js). Set TZ=America/Chicago; the suite
 * checks that itself below, because half these rules are date- and hour-sensitive.
 */
const { loadApp, makeWx, freezeRunnerClock, APP_PATH } = require('./harness');
const fs = require('fs');
const path = require('path');

freezeRunnerClock();

let pass = 0, fail = 0, skip = 0;
const ok = (name, cond, extra) => { if(cond){ pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra!==undefined ? '  → ' + JSON.stringify(extra) : '')); } };
/* A skip is never a pass and never a fail: absent real data (REG-13's real-backup leg, local only
   per Ian's 2026-09-11 decision) must read as a loud, separate line and its own count — never
   silently folded into "0 failed" or counted toward "passed". */
const skipLine = msg => { skip++; console.log('  SKIP  ' + msg); };
const REAL_PATH = path.join(__dirname, 'local', 'real-db-snapshot.json');

/* Golden hashes of every synthetic differential case's LEGACY output (REG-13's permanent form,
   recorded ahead of REG-14's later deletion of the legacy functions). Recorded once from the still-
   present legacy code (WRITE_MERGE_GOLDEN=1), then checked against the derived code's output on
   every normal run, so the equivalence proof outlives the legacy code — a case with no recorded
   golden FAILS rather than silently passing. Never populated from real-backup output (see the
   real-backup block below): only hashes of synthetic fixtures are ever written here. */
const GOLDEN_PATH = path.join(__dirname, 'fixtures', 'merge-golden.json');
const WRITE = process.env.WRITE_MERGE_GOLDEN === '1';
const GOLDEN_IN = fs.existsSync(GOLDEN_PATH) ? JSON.parse(fs.readFileSync(GOLDEN_PATH, 'utf8')) : {};
const GOLDEN_OUT = {};

/* 32-bit FNV-1a over the string's UTF-16 code units — short, dependency-free, and collision-safe
   enough to catch any change in output without committing the (potentially large) text itself. */
function fnv1a(str){
  let h = 2166136261;
  for(let i = 0; i < str.length; i++){
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/* Records (WRITE mode) or checks (normal mode) one differential case's golden hash.
   WRITE: stores fnv1a(legacyText) — the legacy code's own output — under `label` in GOLDEN_OUT.
   Never WRITE: requires GOLDEN_IN[label] to equal fnv1a(derivedText), reporting "golden: " + label
   via ok() unless `opts.silent` is set. A missing label FAILS (extra: 'no golden recorded for this
   label'), a present-but-wrong hash FAILS (extra: 'hash differs') — so a new case must be recorded
   deliberately, never silently pass with nothing to check against. `opts.silent` is for the two
   batteries below (70 and 400 cases) that report one aggregated ok() instead of one per case. */
function golden(label, legacyText, derivedText, opts){
  if(WRITE){ GOLDEN_OUT[label] = fnv1a(legacyText); return true; }
  const hasGolden = Object.prototype.hasOwnProperty.call(GOLDEN_IN, label);
  const match = hasGolden && GOLDEN_IN[label] === fnv1a(derivedText);
  if(opts && opts.silent) return match;
  ok('golden: ' + label, match, hasGolden ? (match ? undefined : 'hash differs') : 'no golden recorded for this label');
  return match;
}

console.log("\n── the repo keeps Ian's real backup out of git (T-01-12) ──");
{
  const gitignorePath = path.join(__dirname, '..', '.gitignore');
  const lines = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8').split(/\r?\n/) : [];
  ok('gitignore: test/local/ is ignored', lines.includes('test/local/'));
  ok('gitignore: exported backups (ppl-backup-*.json) are ignored', lines.includes('ppl-backup-*.json'));
}

console.log('\n── the file itself ──');
const rawHtml = fs.readFileSync(APP_PATH, 'utf8');
const inline = [...rawHtml.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)];
ok('index.html holds exactly one inline script', inline.length === 1, inline.length);
ok('it compiles', (()=>{ try { new Function(inline[inline.length-1][1]); return true; } catch(e){ return 'SyntaxError: '+e.message; } })() === true,
   (()=>{ try { new Function(inline[inline.length-1][1]); return 'ok'; } catch(e){ return e.message; } })());

/* The worker is a real file now, and a typo in it should fail here rather than on the phone. It
   used to be a blob: URL that browsers silently refused to register. */
const swPath = APP_PATH.replace(/index\.html$/, 'sw.js');
ok('sw.js exists', fs.existsSync(swPath));
ok('  …and compiles', (()=>{ try{ new Function(fs.readFileSync(swPath,'utf8')); return true; }catch(e){ return e.message; } })() === true);
ok('  …with a versioned cache that drops old shells', /CACHE_VERSION/.test(fs.readFileSync(swPath,'utf8')) && /caches\.delete/.test(fs.readFileSync(swPath,'utf8')));
ok('index.html registers it as a real URL, not a blob', /register\('\.\/sw\.js'/.test(rawHtml) && !/register\(URL\.createObjectURL/.test(rawHtml));
ok('  …and does not swallow the failure', !/register\([^)]*\)\.catch\(\(\)=>\{\}\)/.test(rawHtml));

/* The security rules belong in the repo, not only in a web console. This cannot prove what is
   DEPLOYED — only Firebase knows that — it proves the repo still has a reviewable copy and that
   nobody has quietly relaxed the property the whole model rests on.

   These originally asserted the exact text of a DRAFT of firestore.rules rather than the security
   property, so reconciling the file with the real console rules on 2026-09-10 broke them both: one
   hard-coded the variable name `uid` (the console calls it `userId` — identical behaviour), and the
   other required a catch-all deny block that turned out to be unnecessary, since Firestore denies
   by default. Assert the property, never the wording. */
const rulesPath = APP_PATH.replace(/index\.html$/, 'firestore.rules');
ok('firestore.rules is in the repo', fs.existsSync(rulesPath));
if(fs.existsSync(rulesPath)){
  /* Strip comments: the file discusses rules it deliberately does NOT deploy, and a naive scan
     would read those as live. Only the real rule text counts. */
  const rules = fs.readFileSync(rulesPath, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
  ok('  …every allow is gated on the caller owning the document',
     (rules.match(/allow\b[^;]*:\s*if\b[^;]*;/g) || []).length > 0
     && (rules.match(/allow\b[^;]*:\s*if\b[^;]*;/g) || [])
          .every(a => /request\.auth\.uid\s*==\s*\w+/.test(a) || /\bif\s+false\b/.test(a)));
  ok('  …and nothing is granted unconditionally', !/allow\b[^;]*:\s*if\s+true\b/.test(rules));
  ok('  …the owner check survives a rename of the path variable',
     /match\s*\/users\/\{(\w+)\}[\s\S]*?request\.auth\.uid\s*==\s*\1/.test(rules));
}

const app = loadApp(APP_PATH);

console.log('\n── the harness exports what the suite calls ──');
/* A renamed or forgotten export comes back `undefined` from the harness (see harness.js's own
   comment) rather than throwing, so a test that only checks two `undefined`s are equal would
   silently "pass". Assert every name the suite below calls through `app` is actually exported. */
const REQUIRED_EXPORTS = ['COLLECTIONS','collectionProblems','MIGRATIONS','sessKey','todoKey','hobbyKey','cardioKey','ideaKey','sessionSort',
  'sessionRows','hobbyRows','journalRows','dayFlagRows','blank_legacy',
  'liveOf','liveSessions','liveCardio','liveIdeas','liveTodos','liveHobbyLog','softDelete',
  'liveSessions_legacy','liveWeights_legacy','livePetWeights_legacy','liveCardio_legacy','liveIdeas_legacy','liveTodos_legacy','liveHobbyLog_legacy',
  'validateBackup_legacy', 'mergeDB_legacy', 'mergeCollections', 'ensureCollectionDefaults',
  'sleepUid', 'addSleep', 'removeSleep', 'viewSleep',
  'mdEscape', 'mdCell', 'mdHeader', 'exportRows', 'buildMarkdownExport', 'exportMarkdown', 'downloadMarkdown'];
REQUIRED_EXPORTS.forEach(name => ok('exported: ' + name, app[name] !== undefined));

/* A snapshot of the registry's own fields, comparable across the whole suite run (REG-01: nothing
   may ever mutate COLLECTIONS). Function values are recorded by name, not by reference, so the
   snapshot is a plain, comparable string. */
function snapshotRegistry(reg){
  return JSON.stringify(Object.keys(reg).sort().reduce((out, name) => {
    const spec = reg[name];
    out[name] = Object.keys(spec).sort().reduce((s, field) => {
      const v = spec[field];
      s[field] = typeof v === 'function' ? 'fn:' + (v.name || 'anonymous') : v;
      return s;
    }, {});
    return out;
  }, {}));
}
const REGISTRY_AT_START = snapshotRegistry(app.COLLECTIONS);

const today = app.todayISO();
const dayOff = n => { const d = new Date(today+'T00:00'); d.setDate(d.getDate()+n); return d.toLocaleDateString('en-CA'); };

console.log('\n── the runner\'s clock (everything below depends on it) ──');
ok('today is frozen to 2026-08-07', today === '2026-08-07', today);
ok('  …which is summer, so the lawn rules are live', app.lawnSeason(new Date()) === 'summer', app.lawnSeason(new Date()));
ok('  …and an ODD calendar day, so sprinkling is allowed', new Date().getDate() % 2 === 1, new Date().getDate());
ok('  …at midday — set TZ=America/Chicago if this fails', new Date().getHours() === 12, new Date().getHours());

const setLog = (a, o) => { a.DB.lawnLog = {};
  if(o.mowedDaysAgo!=null)   (a.DB.lawnLog[dayOff(-o.mowedDaysAgo)]   = a.DB.lawnLog[dayOff(-o.mowedDaysAgo)]   || {}).mowed   = true;
  if(o.wateredDaysAgo!=null) (a.DB.lawnLog[dayOff(-o.wateredDaysAgo)] = a.DB.lawnLog[dayOff(-o.wateredDaysAgo)] || {}).watered = true; };
const setup = (a, o) => { a.DB.lawn = { lat:44.94, lon:-93.36, label:'St. Louis Park' };
  a.DB.wx = o.wx === null ? null : makeWx(Object.assign({ todayISO: today }, o.wx||{}));
  setLog(a, o); };

console.log('\n── mow forecast: when is the next mow? ──');
setup(app, { mowedDaysAgo: 3 });
let f = app.mowForecast();
ok('dry + mowed 3d ago → first mow at day 5', f.next && f.next.k === 5, f && f.next && f.next.k);
ok('days 0–1 blocked "soon"', f.days[0].blocked==='soon' && f.days[1].blocked==='soon', f.days.map(d=>d.blocked));
ok('days 2–4 blocked "wait" (≥5d but not due)', f.days.slice(2,5).every(d=>d.blocked==='wait'), f.days.map(d=>d.blocked));

setup(app, { mowedDaysAgo: 5, wx:{ precipByOffset:{ 0: 0.6 } } });
f = app.mowForecast();
ok('0.6" today → growth spike pulls the mow in to day 2', f.next && f.next.k === 2, f && f.next && f.next.k);
ok('today + tomorrow blocked wet by that rain', f.days[0].blocked==='wet' && f.days[1].blocked==='wet', f.days.map(d=>d.blocked));
ok('growthSpike flagged on the chosen day', f.days[2].growthSpike === true);
setup(app, { mowedDaysAgo: 5, wx:{} });
ok('same baseline WITHOUT the spike lands on day 3', app.mowForecast().next.k === 3, app.mowForecast().next.k);

setup(app, { mowedDaysAgo: 8, wx:{ precipByOffset:{ 0: 0.2 } } });
f = app.mowForecast();
/* 0.2" today blocks today AND tomorrow — the day after rain is still wet ground (the same
   P[prev] >= 0.1 rule the Today card uses), so the window opens on day 2. */
ok('raining today → today and tomorrow blocked, mow day 2', f.next && f.next.k === 2, f && f.next && f.next.k);
setup(app, { mowedDaysAgo: 8, wx:{ probByOffset:{ 0: 60 } } });
ok('60% chance of rain also blocks it', app.mowForecast().days[0].blocked === 'wet', app.mowForecast().days[0]);

setup(app, { mowedDaysAgo: 8, wx:{ hotFrom:{ 0: 8 } } });
f = app.mowForecast();
ok('hot from 8am → today blocked "hot"', f.days[0].blocked === 'hot', f.days[0]);
ok('  …and the next clear day is chosen instead', f.next && f.next.k === 1, f.next && f.next.k);
setup(app, { mowedDaysAgo: 8, wx:{ hotFrom:{ 0: 14 } } });
f = app.mowForecast();
ok('hot from 2pm → mowable, with a 2pm cutoff', f.days[0].ok && f.days[0].before === 14, f.days[0]);
ok('the expect line names the cutoff', /before 2pm/.test(app.mowExpectText(f)), app.mowExpectText(f));

setup(app, { mowedDaysAgo: 8, wx:{ precipByOffset:{ '-1':0.2, 0:0.2, 1:0.2, 2:0.2, 3:0.2, 4:0.2, 5:0.2, 6:0.2 } } });
f = app.mowForecast();
ok('rain every day → no window at all', f.next === null, f.days.map(d=>d.blocked));
ok('  …and the copy says so', /No clear mowing window/.test(app.mowExpectText(f)), app.mowExpectText(f));

setup(app, { mowedDaysAgo: 8, wx: null });
ok('no weather cached → no forecast', app.mowForecast() === null);
app.DB.lawn = null; app.DB.wx = makeWx({ todayISO: today });
ok('no location set → no forecast', app.mowForecast() === null);

/* Shipped broken 2026-08-05: with nothing ever logged the interval had no anchor, so every day read
   "overdue — mow today", forever. The fix assumes it's due AND asks for the last date. */
console.log('\n── no history: assume it is due, and ask for the date ──');
setup(app, { mowedDaysAgo: null, wx:{} });
let st = app.lawnStatus();
ok('never mowed → still recommends (silence was the bug)', st.mow.unknown === true && st.mow.recommend === true, st.mow);
ok('  …and the copy flags the guess', /this is a guess/i.test(st.mow.text), st.mow.text);
ok('never watered → recommends watering', st.water.unknown === true && st.water.recommend === true, st.water);
f = app.mowForecast();
ok('the forecast still projects, flagged unknown', f.unknown === true && f.days.length === 7 && f.next.k === 0, f && f.next);
ok('  …one mow day, then a cooldown (not a week of green)', f.days.filter(d=>d.ok).length === 1, f.days.map(d=>d.ok?'mow':d.blocked));
let card = app.cLawnCard();
ok('the card carries the recommendation AND the anchor buttons',
   /Mow today/.test(card) && /setLawnDaysAgo\('mowed',2\)/.test(card), card.replace(/<svg[\s\S]*?<\/svg>/g,'').slice(0,200));

console.log('\n── watering ──');
setup(app, { mowedDaysAgo: 1, wateredDaysAgo: 7, wx:{ precipByOffset:{ '-5': 1.41 } } });
st = app.lawnStatus();
ok('a week dry, no recent rain → water today', st.water.recommend === true, st.water.text);
ok('  …and it names the last time', /last 7 days ago/i.test(st.water.text), st.water.text);
setup(app, { mowedDaysAgo: 1, wateredDaysAgo: 7, wx:{ precipByOffset:{ 1: 0.6 } } });
st = app.lawnStatus();
ok('0.6" forecast tomorrow → hold off', st.water.recommend === false && st.water.hard === true, st.water.text);
ok('  …and the amount is named', /0\.60"/.test(st.water.text) && /tomorrow/.test(st.water.text), st.water.text);
setup(app, { mowedDaysAgo: 1, wateredDaysAgo: 7, wx:{ precipByOffset:{ 1: 0.2 } } });
ok('0.2" tomorrow is not enough to skip', app.lawnStatus().water.recommend === true, app.lawnStatus().water.text);
setup(app, { mowedDaysAgo: 1, wateredDaysAgo: 7, wx:{ precipByOffset:{ 3: 0.6 } } });
ok('rain 3 days out never suppresses', app.lawnStatus().water.recommend === true, app.lawnStatus().water.text);
setup(app, { mowedDaysAgo: 1, wateredDaysAgo: 1, wx:{} });
ok('watered yesterday, mild → hold off', app.lawnStatus().water.recommend === false && /hold off/.test(app.lawnStatus().water.text), app.lawnStatus().water.text);
setup(app, { mowedDaysAgo: 1, wateredDaysAgo: 1, wx:{ hiByOffset:{ 1: 95 } } });
st = app.lawnStatus();
ok('95°F tomorrow → daily watering', st.water.every === 1 && st.water.heat === true, { every:st.water.every, heat:st.water.heat });
ok('  …so watered-yesterday still recommends today', st.water.recommend === true, st.water.text);
ok('  …and the copy names the heat', /95°F tomorrow/.test(st.water.text), st.water.text);
setup(app, { mowedDaysAgo: 1, wateredDaysAgo: 1, wx:{ hiByOffset:{ 1: 95 }, precipByOffset:{ '-1': 0.5 } } });
ok('heat does not beat rain that already fell', app.lawnStatus().water.recommend === false, app.lawnStatus().water.text);
let dur = app.waterSession(2);
ok('every ~2 days → ~35 min (~0.29")', dur.minutes === 35 && Math.abs(dur.inches-0.2857) < 0.01, dur);
dur = app.waterSession(1);
ok('daily in heat → shorter sessions, same weekly inch', dur.minutes === 15 && Math.abs(dur.inches-0.143) < 0.01, dur);

console.log('\n── backdating a missed log ──');
setup(app, { mowedDaysAgo: null, wx:{} });
app.setLawnDaysAgo('mowed', 2);
ok('backdated mow lands on the right date', !!(app.DB.lawnLog[dayOff(-2)] || {}).mowed, app.DB.lawnLog);
st = app.lawnStatus();
ok('days-since picks it up', st.dsMow === 2, st.dsMow);
ok('the unknown state clears', st.mow.unknown === false && /too soon/.test(st.mow.text), st.mow.text);
ok('the next mow follows the interval from THAT mow', app.mowForecast().next.dsMow === 8, app.mowForecast().next);
app.toggleLawnLog('mowed', dayOff(-2));
ok('un-logging restores the unknown state', app.lawnStatus().mow.unknown === true, app.DB.lawnLog);
setup(app, { mowedDaysAgo: null, wx:{} });
app.setLawnLog(dayOff(-20), 'mowed', true);
ok('a date older than the 2-week list still counts', app.lawnStatus().dsMow === 20, app.lawnStatus().dsMow);
ok('a future date is refused', app.setLawnLog(dayOff(1), 'mowed', true) === false && !app.DB.lawnLog[dayOff(1)]);
/* Absence must never mean "off": the sync merge takes the whole day object from the newer side, so
   a deleted key would read as "never logged" on the other device. */
ok('un-logging stores an explicit false, not a deletion',
   (app.setLawnLog(dayOff(-3),'watered',true), app.setLawnLog(dayOff(-3),'watered',false), app.DB.lawnLog[dayOff(-3)].watered === false), app.DB.lawnLog[dayOff(-3)]);
ok('the history lists all 14 days, each tappable', (app.lawnHistory().match(/toggleLawnLog\('watered'/g)||[]).length === 14);
ok('  …plus a picker for older dates', /id="lawn-past-date"/.test(app.lawnHistory()));

console.log('\n── the strip assumes you actually mow on the mow day ──');
setup(app, { mowedDaysAgo: 6, wx:{} });
f = app.mowForecast();
ok('one target day, then a cooldown', f.days.filter(d=>d.ok).length === 1, f.days.map(d=>[d.k,d.ok?'mow':d.blocked]));
ok('days after it read "too soon"', f.days.slice(f.next.k+1).every(d=>d.blocked==='soon'), f.days.map(d=>d.blocked));
ok('the target is the first available day', f.next.k === 2 && f.next.dsMow === 8, {k:f.next.k, ds:f.next.dsMow});

/* "Overdue" used to be the same test as "due", so the first recommended day already shouted it. */
console.log('\n── "Overdue" has a grace window ──');
setup(app, { mowedDaysAgo: 8, wateredDaysAgo: 1, wx:{} });
ok('first due day says "Mow today"', app.lawnStatus().mow.text === 'Mow today (8am–9pm)', app.lawnStatus().mow.text);
setup(app, { mowedDaysAgo: 11, wateredDaysAgo: 1, wx:{} });
ok('genuinely late says "Overdue"', /^Overdue/.test(app.lawnStatus().mow.text), app.lawnStatus().mow.text);

/* The card used to hide any task that wasn't due, so on a rained-on day watering vanished with no
   explanation — and Care → Lawn called the same function, so it hid it there too. */
console.log('\n── both tasks stay on screen ──');
setup(app, { mowedDaysAgo: 9, wateredDaysAgo: 1, wx:{ precipByOffset:{ '-2':0.4 } } });
card = app.cLawnCard(); st = app.lawnStatus();
ok('mowing is due', st.mow.recommend === true, st.mow.text);
ok('watering is suppressed', st.water.recommend === false, st.water.text);
ok('  …and the card still says so, with a reason', /Watering:/.test(card) && /hold off/i.test(card), card.replace(/<svg[\s\S]*?<\/svg>/g,'').slice(0,240));
const fullCard = app.cLawnCard(true);
ok('Care → Lawn renders BOTH tasks in full', /Mark watered|Watered/.test(fullCard) && /Mark mowed|Mowed/.test(fullCard));
ok('  …without the "Lawn →" affordance', !/Lawn →/.test(fullCard));
setup(app, { mowedDaysAgo: 3, wx:{} });
app.setLawnLog(dayOff(-1), 'watered', true);
const nd = app.nextDueDay('water');
ok('next watering day is inside the forecast', nd === null || (nd.off>=1 && nd.off<=6), nd);
if(nd){ const d=new Date(); d.setDate(d.getDate()+nd.off);
  ok('  …and respects the odd/even sprinkling ordinance', d.getDate()%2===1, {off:nd.off, dom:d.getDate()}); }

/* The card's rain line reads the HOURLY forecast; the mow rule used to read the daily roll-up. A day
   with 0.09" over two afternoon hours said "rain ~1pm" and "mow today" on the same screen. */
console.log('\n── mow vs rain: one answer from one field ──');
setup(app, { mowedDaysAgo: 9, wateredDaysAgo: 1, wx:{ rainFrom:{ 0:{hour:12, perHour:0.03} } } });
ok('a wet afternoon blocks mowing', app.lawnStatus().mow.hard === true && /don’t mow/.test(app.lawnStatus().mow.text), app.lawnStatus().mow.text);
setup(app, { mowedDaysAgo: 9, wateredDaysAgo: 1, wx:{ rainFrom:{ 0:{hour:19, perHour:0.02} } } });
st = app.lawnStatus();
ok('a dry morning with evening rain mows, with a cutoff', st.mow.recommend === true && /before 7pm/.test(st.mow.text), st.mow.text);
ok('  …and the cutoff names the rain', /before the rain/.test(st.mow.text), st.mow.text);
setup(app, { mowedDaysAgo: 9, wateredDaysAgo: 1, wx:{ rainFrom:{ 0:{hour:8, perHour:0.02} } } });
ok('rain from 8am blocks the whole day', app.lawnStatus().mow.recommend === false, app.lawnStatus().mow.text);
setup(app, { mowedDaysAgo: 9, wateredDaysAgo: 1, wx:{ rainFrom:{ 0:{hour:19, perHour:0.02} }, hotFrom:{ 0:14 } } });
ok('heat at 2pm beats rain at 7pm — earliest cutoff wins', /before 2pm/.test(app.lawnStatus().mow.text) && /before the heat/.test(app.lawnStatus().mow.text), app.lawnStatus().mow.text);
setup(app, { mowedDaysAgo: 9, wateredDaysAgo: 1, wx:{ rainFrom:{ 0:{hour:13, perHour:0.03} } } });
ok('card says rain, rule agrees', !!app.rainTiming() && app.lawnStatus().mow.recommend === false,
   { card: app.rainTiming(), rule: app.lawnStatus().mow.text });

/* Wording snapshot. These are the exact strings on Ian's phone; if a refactor moves them, that's a
   decision to make on purpose, not a surprise. */
console.log('\n── lawn wording, fixed strings ──');
[
  { name:'dry, mowed 3d',       o:{mowedDaysAgo:3,  wateredDaysAgo:4, wx:{}},                              mow:'Last mowed 3 days ago — too soon' },
  { name:'dry, mowed 6d',       o:{mowedDaysAgo:6,  wateredDaysAgo:4, wx:{}},                              mow:'Last mowed 6 days ago — wait a day or two' },
  { name:'mowed 9d',            o:{mowedDaysAgo:9,  wateredDaysAgo:4, wx:{}},                              mow:'Mow today (8am–9pm)' },
  { name:'rain today',          o:{mowedDaysAgo:9,  wateredDaysAgo:4, wx:{precipByOffset:{0:0.3}}},        mow:'Wet conditions — don’t mow' },
  { name:'rain yesterday',      o:{mowedDaysAgo:9,  wateredDaysAgo:4, wx:{precipByOffset:{'-1':0.3}}},     mow:'Wet conditions — don’t mow' },
  { name:'60% chance',          o:{mowedDaysAgo:9,  wateredDaysAgo:4, wx:{probByOffset:{0:60}}},           mow:'Wet conditions — don’t mow' },
  { name:'hot all day',         o:{mowedDaysAgo:9,  wateredDaysAgo:4, wx:{hotFrom:{0:8}}},                 mow:'Too hot today — don’t mow' },
  { name:'hot from 2pm',        o:{mowedDaysAgo:9,  wateredDaysAgo:4, wx:{hotFrom:{0:14}}},                mow:'Mow before 2pm (before the heat)' },
  { name:'growth spike',        o:{mowedDaysAgo:6,  wateredDaysAgo:4, wx:{precipByOffset:{'-2':0.6}}},     mow:'Mow today (8am–9pm)' },
  { name:'watered today',       o:{mowedDaysAgo:6,  wateredDaysAgo:0, wx:{}},                              water:'Watered today — hold off' },
  { name:'no weather at all',   o:{mowedDaysAgo:6,  wateredDaysAgo:4, wx:null},                            mow:'Last mowed 6 days ago — wait a day or two' },
].forEach(c=>{
  setup(app, c.o); const s = app.lawnStatus();
  if(c.mow)   ok(`mow text — ${c.name}`,   s.mow.text === c.mow,     s.mow.text);
  if(c.water) ok(`water text — ${c.name}`, s.water.text === c.water, s.water.text);
});

console.log('\n── rep badge: progress beats the range marker ──');
/* A 15-rep lunge slot done at bodyweight: 7 reps then 8 reps BOTH read ↓, because the out-of-range
   arrow returned before the beat-last-time check ever ran. Progress looked like regression. */
const lungeSlot = app.PROGRAM['LEGS 1'].slots.findIndex(s=>s.examples.includes('Lunges'));
const slotNames = (workout, slotIdx, name) => app.PROGRAM[workout].slots.map((s,i)=> i===slotIdx ? name : s.examples[0]);
app.DB.sessions = [{ id:'t1', workout:'LEGS 1', date:'2026-07-29', endedAt:1, extras:{},
  entries: slotNames('LEGS 1', lungeSlot, 'Lunges').map((n,i)=>({ name:n, sets: i===lungeSlot ? [{w:'0',r:'7',skipped:false}] : [] })) }];
app.DB.draft = { workout:'LEGS 1', date:today, stairs:{seconds:'',skipped:false}, extras:{}, startedAt:Date.now(),
  entries: slotNames('LEGS 1', lungeSlot, 'Lunges').map((n,i)=>({ name:n, sets: i===lungeSlot ? [{w:'0',r:'8',skipped:false}] : [] })) };
let badge = app.setStatus(lungeSlot, 0);
ok('bodyweight lunges 7 → 8 reps reads ✓, not ↓', badge[0] === '✓', badge);
ok('  …still coloured as under-range', badge[1] === 'under', badge);
ok('  …and the tooltip explains both halves', /Beat last time/.test(badge[2]) && /under the 15/.test(badge[2]), badge[2]);
app.DB.draft.entries[lungeSlot].sets[0].r = '7';
ok('matching last time reads =', app.setStatus(lungeSlot,0)[0] === '=', app.setStatus(lungeSlot,0));
app.DB.draft.entries[lungeSlot].sets[0].r = '6';
ok('going backwards still reads ↓', app.setStatus(lungeSlot,0)[0] === '↓', app.setStatus(lungeSlot,0));

console.log('\n── a PR has to be real work ──');
const quadSlot = app.PROGRAM['LEGS 1'].slots.findIndex(s=>s.examples.includes('Leg press'));
const qRange = app.effRange(app.PROGRAM['LEGS 1'].slots[quadSlot], 'Leg press');
const prSess = (date, sets) => ({ id:'p'+date, workout:'LEGS 1', date, endedAt:1, extras:{},
  entries: slotNames('LEGS 1', quadSlot, 'Leg press').map((n,i)=>({ name:n, sets: i===quadSlot ? sets : [] })) });
/* Build the fixture the way the app does — through normalize(), so exercises get their identities
   exactly as a real device would. Asserting against hand-built rows would test a shape the app
   never actually holds. */
const withSessions = list => { app.DB = app.normalize(Object.assign(app.blank(), { _schema:16, sessions:list, draft:null })); };
app.DB.draft = null;
withSessions([ prSess('2026-07-20', [{w:'130',r:String(qRange.lo),skipped:false}]) ]);
ok('an in-range set sets the baseline', (app.exercisePRs().find(p=>p.name==='Leg press')||{}).v === 130, app.exercisePRs());
withSessions(app.DB.sessions.concat([prSess('2026-07-27', [{w:'155',r:'3',skipped:false}])]));
ok('a heavy 3-rep single below the range is NOT a PR', (app.exercisePRs().find(p=>p.name==='Leg press')||{}).v === 130, app.exercisePRs());
withSessions(app.DB.sessions.concat([prSess('2026-08-03', [{w:'135',r:String(qRange.lo),skipped:false},{w:'95',r:'4',skipped:false}])]));
ok('an in-range PR survives an out-of-range backoff set', (app.exercisePRs().find(p=>p.name==='Leg press')||{}).v === 135, app.exercisePRs());
ok('the trophy marks agree with the PR list', (()=>{ const idx=app.prSetIndex(); const s=app.DB.sessions[2]; return idx.isPR(s,'Leg press',0) && !idx.isPR(s,'Leg press',1); })());
ok('a session whose program is unknown keeps its PR', (()=>{
  withSessions([{ id:'legacy', workout:'MYSTERY DAY', date:'2026-07-01', endedAt:1, entries:[{name:'Leg press', sets:[{w:'200',r:'2',skipped:false}]}], extras:{} }]);
  return (app.exercisePRs().find(p=>p.name==='Leg press')||{}).v === 200; })(), app.exercisePRs());

console.log('\n── plate math ──');
app.DB.unit='lb';
ok('back squat 135 → 1×45 per side', /Per side: 1×45/.test(app.platesText(135,45,'straight')), app.platesText(135,45,'straight'));
ok('EZ-bar lifts use the 25 lb bar', app.barWeight('Skull crusher') === 25);
ok('leg press is plate-loaded with no bar', app.barWeight('Leg press') === 0);
ok('  …and 90 lb reads plates-only', /1×45/.test(app.platesText(90,0,'sled')) && /sled not counted/.test(app.platesText(90,0,'sled')), app.platesText(90,0,'sled'));
/* A landmine loads on ONE sleeve: 90 lb = 45 bar + one 45, not 45 + two 45s. */
ok('T-bar at 90 → one 45 on the sleeve', /On the sleeve: 1×45/.test(app.platesText(90,45,'landmine')), app.platesText(90,45,'landmine'));
ok('T-bar at 100 → 45 + 10', /On the sleeve: 1×45 \+ 1×10/.test(app.platesText(100,45,'landmine')), app.platesText(100,45,'landmine'));
ok('  …and it names the bar underneath', /45 lb bar/.test(app.platesText(100,45,'landmine')), app.platesText(100,45,'landmine'));
ok('landmine plates are never halved', app.plateBreakdown(90,45,'landmine').plates.join() === '45', app.plateBreakdown(90,45,'landmine'));
ok('typed variants resolve to landmine', ['T-bar row','T bar row','Tbar row','t-BAR ROW','Meadows row'].every(n=>app.barStyle(n)==='landmine'),
   ['T-bar row','T bar row','Tbar row','t-BAR ROW','Meadows row'].map(n=>[n,app.barStyle(n)]));
ok('a dumbbell lift has no bar at all', app.barWeight('Deficit sumo squat') === null);

console.log('\n── dead hangs are time-only ──');
app.DB.draft = { workout:'PULL 1', date:today, entries:[], stairs:{seconds:'',skipped:false},
  extras:{ deadhang:{ name:'Dead hang', sets:[{w:'',r:'30',skipped:false}] } } };
let hangCard = app.extraCard('deadhang');
ok('the collapsed card counts seconds, not reps', /\d+–\d+ sec/.test(hangCard), (hangCard.match(/range-badge[^<]*>[^<]*/)||[''])[0]);
app.accOpen.add('deadhang');
hangCard = app.extraCard('deadhang');
ok('no weight input is offered', !/ex-deadhang-w-/.test(hangCard));
ok('  …and no Weight column header', !/colhead">Weight/.test(hangCard));
ok('  …the seconds field is still there', /placeholder="sec"/.test(hangCard));
ok('abs still ask for weight', (()=>{ app.DB.draft.extras.abs={name:'Cable crunch', sets:[{w:'40',r:'12',skipped:false}]};
  app.accOpen.add('abs'); const c=app.extraCard('abs'); return /ex-abs-w-0/.test(c) && /colhead">Weight/.test(c); })());
ok('a hang never counts as a PR', (()=>{
  app.DB.draft=null;
  app.DB.sessions=[{ id:'h1', workout:'PULL 1', date:'2026-08-01', endedAt:1, entries:[], extras:{ deadhang:{name:'Dead hang', sets:[{w:'',r:'35',skipped:false}]} } }];
  return !app.exercisePRs().some(p=>p.name==='Dead hang'); })(), app.exercisePRs());

console.log('\n── weight change over the selected range ──');
ok('8.6 lb → a gallon of milk', app.weightEquivalent(-8.6,'lb') === 'a gallon of milk', app.weightEquivalent(-8.6,'lb'));
ok('17.2 lb → 2 gallons', /2× a gallon of milk/.test(app.weightEquivalent(-17.2,'lb')), app.weightEquivalent(-17.2,'lb'));
ok('a gain uses the same vocabulary', app.weightEquivalent(5,'lb') === 'a bag of flour', app.weightEquivalent(5,'lb'));
ok('under a pound → nothing to say', app.weightEquivalent(-0.4,'lb') === null);
ok('past 3× the biggest item it hedges', /^about /.test(app.weightEquivalent(-300,'lb')), app.weightEquivalent(-300,'lb'));
ok('kg converts before the lookup', app.weightEquivalent(-3.9,'kg') === 'a gallon of milk', app.weightEquivalent(-3.9,'kg'));
(()=>{
  app.DB = app.blank(); app.DB.unit='lb';
  const mk=(daysAgo,v)=>({date:dayOff(-daysAgo), value:v, mtime:1});
  app.DB.weights=[mk(60,205), mk(45,201), mk(20,197), mk(1,194)];
  app.setRange(9999);
  const all=app.rangeDelta();
  ok('all-time delta spans the whole log', all && Math.abs(all.lbs+11) < 0.01, all);
  ok('  …and reports the REAL span, not the window', all.span === 59 && all.from === dayOff(-60), {span:all.span, from:all.from});
  app.setRange(30);
  ok('30-day delta only sees the last 30 days', Math.abs(app.rangeDelta().lbs+3) < 0.01, app.rangeDelta());
  /* Picking 90d with 60 days of history must not claim 90 days. */
  app.setRange(90);
  const q=app.rangeDelta(), view90=app.viewWeight();
  ok('90d window, 60 days logged → says 59 days', q.span === 59 && /over 59 days/.test(view90) && !/90 days/.test(view90),
     (view90.match(/down over[^<]*/)||[''])[0]);
  ok('  …and names the first weigh-in date', view90.includes('since '+app.fmtDate(q.from)), (view90.match(/since [^—<]*/)||[''])[0]);
})();
[[1,'1 day'],[34,'34 days'],[74,'74 days'],[75,'2 months'],[120,'4 months'],[329,'11 months'],[365,'1 year'],[500,'1.4 years'],[1095,'3 years']]
  .forEach(([d,want])=> ok(`span wording: ${d} days → "${want}"`, app.spanLabel(d) === want, app.spanLabel(d)));

/* The 2026-07-25 incident: a stale device overwrote the cloud and four days of weigh-ins were lost,
   unrecoverably. Every rule below exists to make that impossible; none of them may regress. */
console.log('\n── sync merge: a stale device can never subtract ──');
const M = (remote, local, localWins) => app.mergeDB(remote, local, localWins);
const dbWith = (rows, updatedAt) => Object.assign(app.blank(), { petWeights: rows, updatedAt });
let merged = M(dbWith([{date:today, value:13.1, mtime:100}], 200), dbWith([{date:today, value:13.4, mtime:300}], 100));
ok('same-date collision resolves by mtime, not by side', merged.petWeights.length===1 && merged.petWeights[0].value===13.4, merged.petWeights);
merged = M(dbWith([{date:today, value:13.1, mtime:100}], 500), dbWith([{date:today, value:13.1, mtime:400, deletedAt:400}], 100));
ok('a delete is not resurrected by a newer-looking remote', !!merged.petWeights[0].deletedAt, merged.petWeights);
merged = M(dbWith([{date:today, value:13.1, mtime:100, deletedAt:100}], 900), dbWith([{date:today, value:13.9, mtime:800}], 100));
ok('delete here, re-add there → the re-add wins', !merged.petWeights[0].deletedAt && merged.petWeights[0].value===13.9, merged.petWeights);
merged = M(dbWith([{date:'2026-07-20', value:13.0, mtime:1}], 100), dbWith([{date:'2026-07-21', value:13.2, mtime:2}], 200));
ok('different dates union', merged.petWeights.length===2, merged.petWeights);
ok('rows stay date-sorted', merged.petWeights[0].date < merged.petWeights[1].date);

console.log('\n── storage & migrations ──');
app.DB = app.blank();
app.DB.petWeights.push(app.touch({date:today, value:13.1, at:Date.now()}));
app.DB.petWeights[0].deletedAt = Date.now();
ok('a soft-deleted row survives normalize (the tombstone matters)', app.normalize(JSON.parse(JSON.stringify(app.DB))).petWeights.length === 1);
const legacy = app.normalize({ _schema: 13, weights:[{date:'2026-01-01', value:190}], sessions:[] });
ok('an old backup gains the newer fields', Array.isArray(legacy.petWeights) && legacy.petName === 'Freddie');
ok('  …without touching the data already there', legacy.weights.length===1 && legacy.weights[0].value===190);
ok('  …and is stamped at the current schema', legacy._schema === app.SCHEMA, legacy._schema);
var gobletV14 = () => ({ _schema:14, gen:0, unit:'lb', weights:[], journal:{}, mobilityLog:{}, todos:[], cardio:[], ideas:[], hobbyLog:[], lawnLog:{}, lawn:null, wx:null,
  sessions:[{ id:'g1', workout:'LEGS 1', date:'2026-07-15', endedAt:1,
    entries:[{name:'Goblet squat', sets:[{w:'50',r:'12',skipped:false},{w:'50',r:'13',skipped:false}]},{name:'Leg press', sets:[]}], extras:{} }],
  draft:{ workout:'LEGS 1', date:'2026-08-08', entries:[{name:'Goblet squat', sets:[{w:'55',r:'',skipped:false}]}], extras:{}, stairs:{seconds:'',skipped:false} } });
const mig = app.normalize(gobletV14());
ok('goblet squats are renamed to the sumo squat', mig.sessions[0].entries[0].name === 'Deficit sumo squat', mig.sessions[0].entries[0].name);
ok('  …with weights and reps untouched', JSON.stringify(mig.sessions[0].entries[0].sets) === JSON.stringify([{w:'50',r:'12',skipped:false},{w:'50',r:'13',skipped:false}]));
ok('  …and other exercises left alone', mig.sessions[0].entries[1].name === 'Leg press');
ok('an in-progress workout is renamed too', mig.draft.entries[0].name === 'Deficit sumo squat', mig.draft.entries[0].name);
ok('migrations are idempotent', JSON.stringify(app.normalize(JSON.parse(JSON.stringify(mig)))) === JSON.stringify(mig));
ok('the strength history stays one line', (()=>{ app.DB = mig; app.DB.draft = null;
  return app.exercisePRs().some(p=>p.name==='Deficit sumo squat') && !app.exercisePRs().some(p=>p.name==='Goblet squat'); })(), app.exercisePRs().map(p=>p.name));
ok('the program no longer offers the old name', !JSON.stringify(app.PROGRAM).includes('Goblet squat'));

/* Canonical JSON text for deep-equality comparisons across this phase's differential blocks: object
   keys sorted recursively (key ORDER never matters — REG-06/07/08 compare by value, not by
   insertion order), array order kept (array order is meaningful — it's stored row order), and
   functions rendered as 'fn:' plus their name so a function-valued field is comparable at all. */
function canon(v){
  const walk = x => {
    if(typeof x === 'function') return 'fn:' + (x.name || 'anonymous');
    if(Array.isArray(x)) return x.map(walk);
    if(x && typeof x === 'object') return Object.keys(x).sort().reduce((o,k)=>{ o[k]=walk(x[k]); return o; }, {});
    return x;
  };
  return JSON.stringify(walk(v));
}
/* The legacy functions know exactly these ten; a collection declared later is exempt from legacy
   comparisons by construction, and is covered by its own tests. */
const LEGACY_COLLECTIONS = ['sessions','weights','petWeights','cardio','ideas','todos','hobbyLog','journal','mobilityLog','lawnLog'];

console.log('\n── blank() is derived from COLLECTIONS (REG-06) ──');
{
  const bl = app.blank_legacy();
  const bn = app.blank();
  const legacyKeys = Object.keys(bl);
  const diffKeys = legacyKeys.filter(k => canon(bl[k]) !== canon(bn[k]));
  ok('blank: every key the hand-written blank() had is unchanged', diffKeys.length === 0, diffKeys);
  /* Golden compares only the keys blank_legacy() actually has — bn (app.blank()) legitimately
     carries extra keys for collections declared after the legacy baseline (e.g. sleep, REG-16),
     which is exactly what the "every extra key…" check below already covers; comparing the whole
     object here would fail on that expected growth instead of on an actual divergence. */
  const legacyPortion = legacyKeys.reduce((o, k) => { o[k] = bn[k]; return o; }, {});
  golden('blank', canon(bl), canon(legacyPortion));

  const extraKeys = Object.keys(bn).filter(k => legacyKeys.indexOf(k) < 0);
  const badExtra = extraKeys.filter(name => {
    if(!(name in app.COLLECTIONS)) return true;
    const spec = app.COLLECTIONS[name], val = bn[name];
    return spec.kind === 'list'
      ? !(Array.isArray(val) && val.length === 0)
      : !(val && typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length === 0);
  });
  ok('blank: every extra key is a declared collection holding its kind\'s empty default', badExtra.length === 0, { extraKeys, badExtra });

  const shapeMismatch = Object.keys(app.COLLECTIONS).filter(name => {
    const spec = app.COLLECTIONS[name], val = bn[name];
    return spec.kind === 'list' ? !Array.isArray(val) : (!val || typeof val !== 'object' || Array.isArray(val));
  });
  ok('blank: every declared collection is present in its kind\'s shape', shapeMismatch.length === 0, shapeMismatch);
}
{
  const first = app.blank();
  first.sessions.push({ id:'x' });
  first.journal['2026-01-01'] = 'hi';
  first.hobbies.push('an extra hobby');
  const second = app.blank();
  ok('blank: returns fresh containers on every call',
     second.sessions.length === 0 && Object.keys(second.journal).length === 0 && second.hobbies.length === app.HOBBIES_DEFAULT.length,
     { sessions: second.sessions.length, journalKeys: Object.keys(second.journal).length, hobbies: second.hobbies.length });
}
{
  const bn = app.blank();
  ok('blank: scalar defaults unchanged',
     bn._schema === app.SCHEMA && bn.gen === 0 && bn.unit === 'lb' && bn.petName === 'Freddie'
     && bn.routineMode === '4day' && bn.draft === null && bn.lawn === null && bn.wx === null
     && bn.hobbySeedV2 === true && Array.isArray(bn.exercises) && bn.exercises.length === 0,
     { _schema: bn._schema, gen: bn.gen, unit: bn.unit, petName: bn.petName, routineMode: bn.routineMode,
       draft: bn.draft, lawn: bn.lawn, wx: bn.wx, hobbySeedV2: bn.hobbySeedV2, exercises: bn.exercises });
}
{
  const src = app.blank.toString().replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  ok('blank: reads only kind from the registry',
     /COLLECTIONS/.test(src) && /\bkind\b/.test(src)
     && !/\.key\b/.test(src) && !/\.sortBy\b/.test(src) && !/\.merge\b/.test(src) && !/\.columns\b/.test(src) && !/\.format\b/.test(src),
     src);
}

console.log('\n── the soft-delete filters are derived from COLLECTIONS (REG-07) ──');
const LIVE_WRAPPERS = [
  ['liveSessions','liveSessions_legacy','sessions'],
  ['liveWeights','liveWeights_legacy','weights'],
  ['livePetWeights','livePetWeights_legacy','petWeights'],
  ['liveCardio','liveCardio_legacy','cardio'],
  ['liveIdeas','liveIdeas_legacy','ideas'],
  ['liveTodos','liveTodos_legacy','todos'],
  ['liveHobbyLog','liveHobbyLog_legacy','hobbyLog'],
];
/* live, deletedAt truthy, deletedAt 0 (live), deletedAt null (live), a null entry, and a bare
   string — the same odd shapes a hand-edited backup or a stale migration could leave behind. */
const sixEntries = () => [ {n:1}, {n:2, deletedAt:5, mtime:5}, {n:3, deletedAt:0}, {n:4, deletedAt:null}, null, 'junk' ];
const liveApp = loadApp(APP_PATH);
liveApp.DB = liveApp.blank();
LIVE_WRAPPERS.forEach(([,,name]) => { liveApp.DB[name] = sixEntries(); });

LIVE_WRAPPERS.forEach(([wrapper, legacy]) => {
  const derived = liveApp[wrapper](), twin = liveApp[legacy]();
  ok('live: ' + wrapper + ' matches its hand-written twin', canon(derived) === canon(twin), { derived, twin });
  golden('live:' + wrapper, canon(twin), canon(derived));
});
LIVE_WRAPPERS.forEach(([wrapper, legacy]) => {
  const derived = liveApp[wrapper](), twin = liveApp[legacy]();
  const sameRefs = derived.length === twin.length && derived.every((row,i) => row === twin[i]);
  ok('live: ' + wrapper + ' returns the stored rows, not copies', sameRefs, { derivedLen: derived.length, twinLen: twin.length });
});

{
  liveApp.DB.cardio = undefined; liveApp.DB.ideas = null; liveApp.DB.todos = [];
  const cases = [['liveCardio','liveCardio_legacy'],['liveIdeas','liveIdeas_legacy'],['liveTodos','liveTodos_legacy']];
  const allEmpty = cases.every(([w,l]) => {
    const derived = liveApp[w](), twin = liveApp[l]();
    return Array.isArray(derived) && derived.length === 0 && canon(derived) === canon(twin);
  });
  ok('live: a missing, null or empty collection gives []', allEmpty);
  liveApp.DB.cardio = sixEntries(); liveApp.DB.ideas = sixEntries(); liveApp.DB.todos = sixEntries();
}
{
  const lenBefore = liveApp.DB.sessions.length;
  const first = liveApp.liveSessions(), second = liveApp.liveSessions();
  ok('live: calling a filter twice changes nothing', canon(first) === canon(second) && liveApp.DB.sessions.length === lenBefore);
}
{
  liveApp.DB.weights = [{ n:1, date:'2026-01-01' }, { n:2, date:'2026-01-02' }];
  const before = liveApp.liveWeights().length;
  liveApp.softDelete(liveApp.DB.weights, x => x && x.n === 1);
  const after = liveApp.liveWeights().length;
  ok('live: a delete between two reads shows on the next read', after === before - 1, { before, after });
}
Object.keys(liveApp.COLLECTIONS)
  .filter(name => liveApp.COLLECTIONS[name].kind === 'list' && liveApp.COLLECTIONS[name].soft === true)
  .forEach(name => {
    const a = loadApp(APP_PATH); a.DB = a.blank();
    a.DB[name] = [{ id:'live1' }, { id:'dead1', deletedAt: Date.now(), mtime: Date.now() }];
    ok('live: soft collection ' + name + ' hides a deleted row', a.liveOf(name).length === 1, a.liveOf(name));
  });
{
  let threwJournal = false, threwNope = false;
  try { liveApp.liveOf('journal'); } catch(e){ threwJournal = true; }
  try { liveApp.liveOf('nope'); } catch(e){ threwNope = true; }
  ok('live: liveOf refuses a name that is not a declared soft list', threwJournal && threwNope);
}
{
  const delegates = LIVE_WRAPPERS.every(([wrapper, , name]) => new RegExp("liveOf\\(\\s*'" + name + "'\\s*\\)").test(liveApp[wrapper].toString()));
  ok('live: every wrapper delegates to liveOf', delegates);
}
ok('live: no dynamically generated filters', !/(window|globalThis)\s*\[\s*['"`]live/.test(liveApp.__src));

/* The failure this whole workstream exists to prevent, replayed end to end.
   Migration 15 renamed rows in memory, nothing persisted them, the rows carried no `mtime`, and the
   next merge handed the stale names back — while `_schema` was stamped 15 anyway, so the migration
   could never run again. Six sessions in Ian's 2026-08-10 export still said "Goblet squat" at
   schema 15. If any of these five go red, that bug is back. */
console.log('\n── a migration must survive the next sync ──');
const migratedRows = () => {
  const d = app.normalize(gobletV14());
  return d.sessions[0];
};
ok('a rewritten row is stamped with a fresh mtime', typeof migratedRows().mtime === 'number', migratedRows().mtime);
ok('  …so the merge prefers it over the untouched copy', (()=>{
  const local = app.normalize(gobletV14());                      // this device: migrated, touched
  const stale = JSON.parse(JSON.stringify(gobletV14()));         // the other device: pre-migration, no mtime
  stale._schema = 15; stale.updatedAt = Date.now() + 60000;      // and it LOOKS newer, which is what used to decide it
  local.updatedAt = Date.now();
  const out = app.mergeDB(stale, local);
  return out.sessions[0].entries[0].name === 'Deficit sumo squat';
})(), 'the stale name won the merge');
ok('data already stamped at 15 with old names is still repaired', (()=>{
  const reverted = JSON.parse(JSON.stringify(gobletV14()));
  reverted._schema = 15;                                          // exactly the state of Ian's export
  return app.normalize(reverted).sessions[0].entries[0].name === 'Deficit sumo squat';
})());
ok('the hand-typed capitalisation is folded in too', (()=>{
  const typed = JSON.parse(JSON.stringify(gobletV14()));
  typed._schema = 15; typed.sessions[0].entries[0].name = 'Deficit Sumo Squat';
  return app.normalize(typed).sessions[0].entries[0].name === 'Deficit sumo squat';
})());
/* Migrations must settle. If a boot re-touches rows it already migrated, every open of the app
   would churn `mtime` and re-push the whole history to the other device forever. */
ok('a second run touches nothing (migrations settle)', (()=>{
  const once = app.normalize(gobletV14());
  const stamps = once.sessions.map(s=>s.mtime);
  const twice = app.normalize(JSON.parse(JSON.stringify(once)));
  return JSON.stringify(twice.sessions.map(s=>s.mtime)) === JSON.stringify(stamps);
})());

/* ── every sync incident, replayed: legacy merge vs current merge (REG-13) ──
 * Every rule CLAUDE.md's "Rules that exist because breaking them cost real data" section names is
 * replayed here as a synthetic two-device fixture, run through BOTH mergeDB_legacy and mergeDB.
 * At this point in the phase the two are still the same code (mergeDB_legacy is a verbatim copy),
 * so this block is a CHARACTERISATION BASELINE — proof the fixtures actually exercise the rule
 * they're named for. Plan 01-03 Task 2 must keep every one of these green after mergeDB is thinned
 * to call mergeCollections(); a break there means the derivation diverged from the frozen behaviour.
 */
console.log('\n── every sync incident, replayed: legacy merge vs current merge (REG-13) ──');

/* Deep-copies through JSON. Every merge call gets fresh inputs, because normalizeDraft mutates the
   newer side's draft object in place — reusing one fixture object across two merge calls would let
   the first call's repair leak into the second. */
function clone(x){ return x === null || x === undefined ? x : JSON.parse(JSON.stringify(x)); }

/* canon(out) after dropping every key that is a COLLECTIONS name NOT in LEGACY_COLLECTIONS. A
   collection declared after this phase's baseline is exempt, because mergeDB_legacy carries it
   wholesale (via blank_legacy()'s Object.assign) instead of unioning it — comparing it would only
   prove blank_legacy() and blank() disagree, which REG-06's own differential already covers. */
function legacyView(out){
  const copy = Object.assign({}, out);
  Object.keys(app.COLLECTIONS).forEach(name => { if(LEGACY_COLLECTIONS.indexOf(name) < 0) delete copy[name]; });
  return canon(copy);
}

/* Runs mergeDB_legacy and mergeDB on separate clones of the same inputs, asserts their legacyView()
   results are equal (ok labelled "merge parity: " + label), and returns the DERIVED output so the
   caller can make incident-specific assertions on it. On a mismatch, the extra lists only the
   differing top-level keys, not the whole (potentially huge) object. */
function sameMerge(label, remote, local, localWins){
  const legacyOut = app.mergeDB_legacy(clone(remote), clone(local), localWins);
  const derivedOut = app.mergeDB(clone(remote), clone(local), localWins);
  const a = legacyView(legacyOut), b = legacyView(derivedOut);
  if(a === b){
    ok('merge parity: ' + label, true);
  } else {
    const aObj = JSON.parse(a), bObj = JSON.parse(b);
    const diffKeys = Object.keys(aObj).filter(k => JSON.stringify(aObj[k]) !== JSON.stringify(bObj[k]));
    ok('merge parity: ' + label, false, diffKeys);
  }
  golden('merge:' + label, a, b);
  return derivedOut;
}

/* One row factory per legacy list, keyed by exactly the fields that list's key function uses, so
   two calls with the same tag collide on purpose and two calls with different tags never do. The
   extra fields (mtime, deletedAt, value, …) are merged in on top. */
const ROW_FOR = {
  sessions:   (tag, extra) => Object.assign({ id: tag, entries: [] }, extra),
  weights:    (tag, extra) => Object.assign({ date: tag }, extra),
  petWeights: (tag, extra) => Object.assign({ date: tag }, extra),
  cardio:     (tag, extra) => Object.assign({ id: tag }, extra),
  ideas:      (tag, extra) => Object.assign({ id: tag }, extra),
  todos:      (tag, extra) => Object.assign({ created: tag, text: tag }, extra),
  hobbyLog:   (tag, extra) => Object.assign({ date: tag, item: tag, cat: tag }, extra),
};
const LEGACY_LISTS = ['sessions','weights','petWeights','cardio','ideas','todos','hobbyLog'];
const LEGACY_MAPS = ['journal','mobilityLog','lawnLog'];
/* A local helper, NOT populatedDB() (declared later in the file) — one ROW_FOR row in every legacy
   list, one day in every legacy map, all tagged so two calls with different tags never collide. */
function populatedLegacyDB(tag, mtime){
  const d = app.blank();
  LEGACY_LISTS.forEach(name => { d[name] = [ROW_FOR[name](tag, { mtime })]; });
  LEGACY_MAPS.forEach(name => { d[name] = { [today]: name === 'journal' ? ('line-' + tag) : { flag: true } }; });
  return d;
}

{
  // "blind-write 2026-07-25": the stale device holds the NEWER wall-clock updatedAt (that's the bug).
  const dates3 = ['2026-07-20', '2026-07-21', '2026-07-22'];
  const dates7 = dates3.concat(['2026-07-23', '2026-07-24', '2026-07-25', '2026-07-26']);
  const staleRemote = Object.assign(app.blank(), { weights: dates3.map(d => ({ date: d, value: 190, mtime: 100 })), updatedAt: 900 });
  const freshLocal  = Object.assign(app.blank(), { weights: dates7.map(d => ({ date: d, value: 190, mtime: 100 })), updatedAt: 100 });
  const out = sameMerge('blind-write 2026-07-25', staleRemote, freshLocal, false);
  ok('merge incident: blind-write 2026-07-25 keeps all 7 dates', out.weights.length === 7, out.weights.map(w=>w.date));
}
{
  // "migration 15 replay": a pre-migration device (still schema 15, no mtime) meets the migrated one.
  const local = app.normalize(gobletV14());
  local.updatedAt = Date.now();
  const remote = JSON.parse(JSON.stringify(gobletV14()));
  remote._schema = 15;
  remote.updatedAt = Date.now() + 60000; // looks newer — exactly what fooled the old merge
  const out = sameMerge('migration 15 replay', remote, local, false);
  ok('merge incident: migration 15 replay keeps the renamed exercise', out.sessions[0].entries[0].name === 'Deficit sumo squat', out.sessions[0].entries[0].name);
}
['mobilityLog', 'lawnLog'].forEach(name => {
  // "explicit false beats an older true": the newer side's explicit false must win.
  const remoteNewer = Object.assign(app.blank(), { [name]: { [today]: { mowed: false } }, updatedAt: 900 });
  const localOlder  = Object.assign(app.blank(), { [name]: { [today]: { mowed: true } }, updatedAt: 100 });
  const out = sameMerge('explicit false beats an older true (' + name + ')', remoteNewer, localOlder, false);
  ok('merge incident: explicit false beats an older true (' + name + ')', out[name][today].mowed === false, out[name][today]);
});
['mobilityLog', 'lawnLog'].forEach(name => {
  // "absence cannot turn a flag off": the newer side simply never logged the day.
  const remoteNewer = Object.assign(app.blank(), { [name]: {}, updatedAt: 900 });
  const localOlder  = Object.assign(app.blank(), { [name]: { [today]: { mowed: true } }, updatedAt: 100 });
  const out = sameMerge('absence cannot turn a flag off (' + name + ')', remoteNewer, localOlder, false);
  ok('merge incident: absence cannot turn a flag off (' + name + ')', out[name][today].mowed === true, out[name][today]);
});
['mobilityLog', 'lawnLog'].forEach(name => {
  // "inner keys are never unioned": the whole newer object wins, not a per-key merge.
  const remoteNewer = Object.assign(app.blank(), { [name]: { [today]: { watered: true } }, updatedAt: 900 });
  const localOlder  = Object.assign(app.blank(), { [name]: { [today]: { mowed: true } }, updatedAt: 100 });
  const out = sameMerge('inner keys are never unioned (' + name + ')', remoteNewer, localOlder, false);
  ok('merge incident: inner keys are never unioned (' + name + ')', JSON.stringify(out[name][today]) === JSON.stringify({ watered: true }), out[name][today]);
});
{
  // "journal lines union, newer first": older day has "a\nb", newer day has "b\nc" → b, c, a.
  const remoteOlder = Object.assign(app.blank(), { journal: { [today]: 'a\nb' }, updatedAt: 100 });
  const localNewer  = Object.assign(app.blank(), { journal: { [today]: 'b\nc' }, updatedAt: 900 });
  const out = sameMerge('journal lines union, newer first', remoteOlder, localNewer, false);
  ok('merge incident: journal lines union, newer first', out.journal[today] === 'b\nc\na', out.journal[today]);
}
{
  // "Erase all data: the erased side wins wholesale", both argument positions.
  const erasedRemote = Object.assign(app.blank(), { gen: 1, updatedAt: 100 });
  const fullLocal = Object.assign(populatedLegacyDB('erase', 500), { gen: 0, updatedAt: 900 });
  const everyEmpty = out => LEGACY_LISTS.every(n => out[n].length === 0) && LEGACY_MAPS.every(n => Object.keys(out[n]).length === 0) && !('wx' in out);
  let out = sameMerge('Erase all data: the erased side wins wholesale', erasedRemote, fullLocal, false);
  ok('merge incident: Erase all data: the erased side wins wholesale', everyEmpty(out), out);
  out = sameMerge('Erase all data: the erased side wins wholesale (swapped)', fullLocal, erasedRemote, false);
  ok('merge incident: Erase all data: the erased side wins wholesale (swapped)', everyEmpty(out), out);
}
{
  // "Import→Replace: the replacing side wins wholesale": local's gen 2 rows entirely replace remote's gen 1 rows.
  const remoteOld = Object.assign(populatedLegacyDB('remote-old', 100), { gen: 1, updatedAt: 100 });
  const localNew  = Object.assign(populatedLegacyDB('local-new', 500), { gen: 2, updatedAt: 900 });
  const out = sameMerge('Import→Replace: the replacing side wins wholesale', remoteOld, localNew, false);
  ok('merge incident: Import→Replace: the replacing side wins wholesale',
     LEGACY_LISTS.every(n => JSON.stringify(out[n]) === JSON.stringify(localNew[n])), out);
}
LEGACY_LISTS.forEach(name => {
  // "a delete is never resurrected": the delete's device LOOKS stale (older updatedAt) but its
  // higher per-row mtime must still win.
  const deletedRow = ROW_FOR[name]('del-' + name, { mtime: 900, deletedAt: 900 });
  const liveRow    = ROW_FOR[name]('del-' + name, { mtime: 100 });
  const deviceWithDelete = Object.assign(app.blank(), { [name]: [deletedRow], updatedAt: 100 });
  const deviceWithLive   = Object.assign(app.blank(), { [name]: [liveRow], updatedAt: 900 });
  const out = sameMerge('a delete is never resurrected (' + name + ')', deviceWithLive, deviceWithDelete, false);
  ok('merge incident: a delete is never resurrected (' + name + ')', !!out[name][0].deletedAt, out[name]);
});
LEGACY_LISTS.forEach(name => {
  // "delete here, re-add there": the re-add's higher mtime wins over the earlier delete.
  const deletedRow = ROW_FOR[name]('readd-' + name, { mtime: 100, deletedAt: 100 });
  const liveRow    = ROW_FOR[name]('readd-' + name, { mtime: 800 });
  const deviceA = Object.assign(app.blank(), { [name]: [deletedRow], updatedAt: 100 });
  const deviceB = Object.assign(app.blank(), { [name]: [liveRow], updatedAt: 900 });
  const out = sameMerge('delete here, re-add there (' + name + ')', deviceA, deviceB, false);
  ok('merge incident: delete here, re-add there (' + name + ')', !out[name][0].deletedAt, out[name]);
});
LEGACY_LISTS.forEach(name => {
  // "equal mtime: the newer device decides": whole-DB updatedAt breaks the tie when mtimes match
  // exactly; with equal updatedAt too, localWins decides.
  const rowA = ROW_FOR[name]('tie-' + name, { mtime: 500, val: 'A' });
  const rowB = ROW_FOR[name]('tie-' + name, { mtime: 500, val: 'B' });
  const remote = Object.assign(app.blank(), { [name]: [rowA], updatedAt: 200 });
  const localNewer = Object.assign(app.blank(), { [name]: [rowB], updatedAt: 900 });
  let out = sameMerge('equal mtime: the newer device decides (' + name + ')', remote, localNewer, false);
  ok('merge incident: equal mtime: the newer device decides (' + name + ')', out[name][0].val === 'B', out[name]);

  const remoteTie = Object.assign(app.blank(), { [name]: [rowA], updatedAt: 500 });
  const localTie  = Object.assign(app.blank(), { [name]: [rowB], updatedAt: 500 });
  out = sameMerge('equal mtime, equal updatedAt, localWins true (' + name + ')', remoteTie, localTie, true);
  ok('merge incident: equal mtime, equal updatedAt, localWins true — local wins (' + name + ')', out[name][0].val === 'B', out[name]);
});
{
  // "pre-id sessions keep their identities" (Pitfall 3): sessKey's composite fallback must still
  // distinguish two id-less sessions that differ only by `skipped`, and collapse two identical ones.
  const sess1 = { date: today, workout: 'PUSH 1', endedAt: 1, skipped: false, entries: [], mtime: 100 };
  const sess2 = { date: today, workout: 'PUSH 1', endedAt: 1, skipped: true, entries: [], mtime: 100 };
  const remote1 = Object.assign(app.blank(), { sessions: [sess1], updatedAt: 100 });
  const local1  = Object.assign(app.blank(), { sessions: [sess2], updatedAt: 200 });
  const out1 = sameMerge('pre-id sessions keep their identities: skipped differs', remote1, local1, false);
  ok('merge incident: pre-id sessions keep their identities: skipped differs gives 2 rows', out1.sessions.length === 2, out1.sessions);

  const dup1 = { date: today, workout: 'PULL 1', endedAt: 2, skipped: false, entries: [], mtime: 100 };
  const dup2 = { date: today, workout: 'PULL 1', endedAt: 2, skipped: false, entries: [], mtime: 100 };
  const remote2 = Object.assign(app.blank(), { sessions: [dup1], updatedAt: 100 });
  const local2  = Object.assign(app.blank(), { sessions: [dup2], updatedAt: 200 });
  const out2 = sameMerge('pre-id sessions keep their identities: identical rows collapse', remote2, local2, false);
  ok('merge incident: pre-id sessions keep their identities: identical rows give 1 row', out2.sessions.length === 1, out2.sessions);
}
{
  // "a finished workout's null draft beats a stale draft": null must win over a stale non-null draft.
  const validDraft = { workout: 'PUSH 1', date: today, entries: [], extras: {}, stairs: { level: '', seconds: '', skipped: false, reason: '' } };
  const olderWithDraft = Object.assign(app.blank(), { draft: validDraft, updatedAt: 100 });
  const newerNullDraft = Object.assign(app.blank(), { draft: null, updatedAt: 900 });
  const out = sameMerge("a finished workout's null draft beats a stale draft", newerNullDraft, olderWithDraft, false);
  ok("merge incident: a finished workout's null draft beats a stale draft", out.draft === null, out.draft);
}
{
  // "the weather cache never syncs": neither side's wx may reach the output.
  const remote = Object.assign(app.blank(), { wx: { at: Date.now(), data: {} }, updatedAt: 100 });
  const local  = Object.assign(app.blank(), { wx: { at: Date.now(), data: {} }, updatedAt: 900 });
  const out = sameMerge('the weather cache never syncs', remote, local, false);
  ok('merge incident: the weather cache never syncs', !('wx' in out), Object.keys(out));
}
{
  // "empty inputs": (null, null), ({}, populated), (populated, {}) — every declared collection present.
  const populated = populatedLegacyDB('empty-pair', 100);
  [[null, null], [{}, populated], [populated, {}]].forEach(([remote, local], i) => {
    const out = sameMerge('empty inputs #' + (i + 1), remote, local, false);
    const allPresent = Object.keys(app.COLLECTIONS).every(name => name in out);
    ok('merge incident: empty inputs #' + (i + 1) + ' — every declared collection present', allPresent, Object.keys(out));
  });
}
{
  // "schema never goes backwards": the higher _schema always wins, merge path or wholesale path.
  const remote = Object.assign(app.blank(), { _schema: app.SCHEMA + 2, updatedAt: 900 });
  const local  = Object.assign(app.blank(), { _schema: app.SCHEMA, updatedAt: 100 });
  const out = sameMerge('schema never goes backwards', remote, local, false);
  ok('merge incident: schema never goes backwards', out._schema === app.SCHEMA + 2, out._schema);
}
{
  // "gen off by one": gens 3 vs 4 replace wholesale; gens 4 vs 4 union.
  const remote3 = Object.assign(populatedLegacyDB('gen3', 100), { gen: 3, updatedAt: 100 });
  const local4  = Object.assign(populatedLegacyDB('gen4', 500), { gen: 4, updatedAt: 900 });
  let out = sameMerge('gen off by one: 3 vs 4 replaces wholesale', remote3, local4, false);
  ok('merge incident: gen off by one: 3 vs 4 replaces wholesale', LEGACY_LISTS.every(n => JSON.stringify(out[n]) === JSON.stringify(local4[n])), out);

  const remote4a = Object.assign(populatedLegacyDB('gen4a', 100), { gen: 4, updatedAt: 100 });
  const remote4b = Object.assign(populatedLegacyDB('gen4b', 500), { gen: 4, updatedAt: 900 });
  out = sameMerge('gen off by one: 4 vs 4 unions', remote4a, remote4b, false);
  ok('merge incident: gen off by one: 4 vs 4 unions', LEGACY_LISTS.every(n => out[n].length === 2), out);
}
/* PITFALLS Pitfall 1's own hazard, named for exactly that hazard and asserted on app.mergeDB
   (never the legacy copy): the derived merge must still leave zero survivors from the losing side
   on a gen mismatch, in both directions, for Erase all data and Import→Replace alike. */
{
  const erasedRemote = Object.assign(app.blank(), { gen: 1, updatedAt: 100 });
  const fullLocal = Object.assign(populatedLegacyDB('hazard-erase', 500), { gen: 0, updatedAt: 900 });
  const erasedOut = app.mergeDB(clone(erasedRemote), clone(fullLocal), false);
  const erasedOk = LEGACY_LISTS.every(n => erasedOut[n].length === 0) && LEGACY_MAPS.every(n => Object.keys(erasedOut[n]).length === 0);

  const oldRemote = Object.assign(populatedLegacyDB('hazard-old', 100), { gen: 1, updatedAt: 100 });
  const newLocal  = Object.assign(populatedLegacyDB('hazard-new', 500), { gen: 2, updatedAt: 900 });
  const replaceOut = app.mergeDB(clone(oldRemote), clone(newLocal), false);
  const replaceOk = LEGACY_LISTS.every(n => JSON.stringify(replaceOut[n]) === JSON.stringify(newLocal[n]));

  ok('merge: derived mergeDB still short-circuits wholesale-replace on gen mismatch — Erase all and Import→Replace leave zero survivors',
     erasedOk && replaceOk, { erasedOut, replaceOut });
}

/* The gen-mismatch block copied verbatim from mergeDB itself (not mergeDB_legacy, which says
   blank_legacy) BEFORE Task 2's edit — the pre-phase text this phase's own diff must leave
   untouched, whitespace aside. */
const GEN_BLOCK = `const rG = +r.gen || 0, lG = +l.gen || 0;
  if(rG !== lG){
    const win = Object.assign({}, blank(), lG > rG ? l : r);
    win.gen = Math.max(rG, lG);
    win.updatedAt = Math.max(+r.updatedAt||0, +l.updatedAt||0);
    win._schema = Math.max(+r._schema||0, +l._schema||0, SCHEMA);
    delete win.wx;
    return win;
  }`;

console.log('\n── mergeDB() is derived from COLLECTIONS (REG-09/REG-10/REG-05) ──');
{
  const collapse = s => s.replace(/\s+/g, ' ').trim();
  ok('merge: the gen-mismatch block is byte-for-byte the pre-phase block',
     collapse(app.mergeDB.toString()).includes(collapse(GEN_BLOCK)));
}
{
  const src = app.mergeDB.toString();
  ok('merge: the gen early return comes before mergeCollections',
     src.indexOf('return win;') >= 0 && src.indexOf('mergeCollections(') >= 0 && src.indexOf('return win;') < src.indexOf('mergeCollections('));
}
{
  const src = app.mergeDB.toString();
  ok('merge: mergeDB delegates every per-collection merge', !src.includes('mergeUnion(') && !src.includes('mergeDateMap('));
}
{
  const inst = loadApp(APP_PATH);
  inst.COLLECTIONS.lawnLog.merge = 'bogus';
  let threw = null;
  try { inst.mergeDB(inst.blank(), inst.blank(), false); } catch(e){ threw = e; }
  ok('merge: an unrecognised map strategy throws, never defaults', !!threw && /lawnLog/.test(threw.message), threw && threw.message);
}
{
  const inst = loadApp(APP_PATH);
  inst.COLLECTIONS.cardio.merge = 'replace-whole';
  let threw = null;
  try { inst.mergeDB(inst.blank(), inst.blank(), false); } catch(e){ threw = e; }
  ok('merge: a list with a map strategy throws, never defaults', !!threw && /cardio/.test(threw.message), threw && threw.message);
}
{
  const shuffledA = Object.assign(app.blank(), {
    weights: [{ date:'2026-08-03', value:1, mtime:10 }, { date:'2026-08-01', value:2, mtime:10 }],
    petWeights: [{ date:'2026-08-02', value:1, mtime:10 }],
    sessions: [{ id:'z', date:'2026-08-05', endedAt:1, mtime:10, entries:[] }, { id:'a', date:'2026-08-01', endedAt:2, mtime:10, entries:[] }],
    cardio: [{ id:'c2', date:'2026-08-02', mtime:10 }, { id:'c1', date:'2026-08-01', mtime:10 }],
    updatedAt: 100,
  });
  const shuffledB = Object.assign(app.blank(), {
    weights: [{ date:'2026-08-02', value:3, mtime:10 }],
    petWeights: [{ date:'2026-08-04', value:2, mtime:10 }, { date:'2026-08-01', value:3, mtime:10 }],
    sessions: [{ id:'m', date:'2026-08-03', endedAt:1, mtime:10, entries:[] }],
    cardio: [{ id:'c3', date:'2026-08-03', mtime:10 }],
    updatedAt: 900,
  });
  const legacyOut = app.mergeDB_legacy(clone(shuffledA), clone(shuffledB), false);
  const derivedOut = app.mergeDB(clone(shuffledA), clone(shuffledB), false);
  const isSorted = (arr, cmp) => arr.every((v,i) => i===0 || cmp(arr[i-1], v) <= 0);
  const weightsSorted = isSorted(derivedOut.weights, (a,b)=>String(a.date).localeCompare(String(b.date)));
  const petWeightsSorted = isSorted(derivedOut.petWeights, (a,b)=>String(a.date).localeCompare(String(b.date)));
  const sessionsSorted = isSorted(derivedOut.sessions, app.sessionSort);
  const cardioMatchesLegacyOrder = JSON.stringify(derivedOut.cardio.map(c=>c.id)) === JSON.stringify(legacyOut.cardio.map(c=>c.id));
  ok('merge: declared sortBy is applied, undeclared lists keep merge order',
     weightsSorted && petWeightsSorted && sessionsSorted && cardioMatchesLegacyOrder,
     { weightsSorted, petWeightsSorted, sessionsSorted, derivedCardio: derivedOut.cardio.map(c=>c.id), legacyCardio: legacyOut.cardio.map(c=>c.id) });
}

/* ── a seeded random battery: legacy vs derived, and the merge laws (REG-13/REG-09) ──
 * PITFALLS Pitfall 5: property tests are written at the mergeDB(remote, local, localWins) level,
 * never at the raw mergeUnion/mergeDateMap level — only mergeDB owns recomputing which side is
 * newer. A law that fails identically on mergeDB_legacy is a pre-existing property of the frozen
 * merge, not a derivation bug (see the map-associativity check below).
 */
console.log('\n── a seeded random battery: legacy vs derived, and the merge laws (REG-13/REG-09) ──');

function mulberry32(seed){
  let a = seed >>> 0;
  return function(){
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const SEED = 20260911, N = 200;

const TAG_POOL = ['tagA', 'tagB', 'tagC', 'tagD'];
const MTIME_POOL = [undefined, 1, 2, 2];
const UPDATED_AT_POOL = [100, 100, 500, 900];
const JOURNAL_LINES = ['first line', 'second line', 'third line', 'fourth line'];
const RANDOM_MAP_DAYS = [dayOff(-1), dayOff(-2), dayOff(-3)];

/* 'laws' mode never repeats an mtime or an updatedAt anywhere in the battery, so idempotence,
   commutativity and associativity are never accidentally satisfied by a coincidental tie. */
let lawsMtimeSeq = 1, lawsUpdatedAtSeq = 1;

const PUSH1_DRAFT = () => ({ workout:'PUSH 1', date:today, entries:[], extras:{}, stairs:{level:'',seconds:'',skipped:false,reason:''} });
const PUSH1_DRAFT_NO_STAIRS = () => { const d = PUSH1_DRAFT(); delete d.stairs; return d; };

function genDevice(rand, mode){
  const d = app.blank();
  LEGACY_LISTS.forEach(name => {
    const rowCount = Math.floor(rand() * 5); // 0..4
    const pool = mode === 'laws' ? TAG_POOL.slice() : null; // drawn without replacement: distinct within one device
    const rows = [];
    for(let i = 0; i < rowCount; i++){
      const tag = mode === 'laws' ? pool.splice(Math.floor(rand() * pool.length), 1)[0]
                                   : TAG_POOL[Math.floor(rand() * TAG_POOL.length)];
      const mtime = mode === 'laws' ? lawsMtimeSeq++ : MTIME_POOL[Math.floor(rand() * MTIME_POOL.length)];
      const extra = { mtime };
      if(rand() < 0.2) extra.deletedAt = mtime !== undefined ? mtime : 1;
      rows.push(ROW_FOR[name](tag, extra));
    }
    d[name] = rows;
  });

  d.journal = {};
  RANDOM_MAP_DAYS.forEach(day => {
    const lineCount = 1 + Math.floor(rand() * 3);
    const lines = [];
    for(let i = 0; i < lineCount; i++) lines.push(JOURNAL_LINES[Math.floor(rand() * JOURNAL_LINES.length)]);
    d.journal[day] = lines.join('\n');
  });
  ['mobilityLog', 'lawnLog'].forEach(name => {
    d[name] = {};
    RANDOM_MAP_DAYS.forEach(day => {
      if(rand() < 0.2) return; // sometimes the day is absent
      d[name][day] = { mowed: rand() < 0.5, watered: rand() < 0.5 }; // explicit booleans, false included
    });
  });

  d.updatedAt = mode === 'laws' ? lawsUpdatedAtSeq++ : UPDATED_AT_POOL[Math.floor(rand() * UPDATED_AT_POOL.length)];
  d.gen = mode === 'laws' ? 0 : (rand() < 0.9 ? 0 : 1);
  if(mode === 'laws'){
    d.draft = null;
  } else {
    const r = rand();
    d.draft = r < 0.7 ? null : (r < 0.9 ? PUSH1_DRAFT() : PUSH1_DRAFT_NO_STAIRS());
  }
  if(rand() < 0.3) d.wx = { at: Date.now(), data: {} };
  return d;
}

/* Per legacy collection: lists by their COLLECTIONS key (tombstones included), replace-whole maps
   by day, journal by day as the sorted set of distinct trimmed non-empty lines. Content, never
   array order — REG-06/07/08 and this differential both compare by value. */
function contentOf(db){
  const out = {};
  LEGACY_LISTS.forEach(name => {
    const spec = app.COLLECTIONS[name];
    const keyOf = typeof spec.key === 'function' ? spec.key : (x => x[spec.key]);
    const map = {};
    (db[name] || []).forEach(row => { map[keyOf(row)] = canon(row); });
    out[name] = map;
  });
  ['mobilityLog', 'lawnLog'].forEach(name => {
    const map = {};
    Object.keys(db[name] || {}).forEach(day => { map[day] = canon(db[name][day]); });
    out[name] = map;
  });
  const journalMap = {};
  Object.keys(db.journal || {}).forEach(day => {
    const lines = String(db.journal[day] || '').split('\n').map(l => l.trim()).filter(Boolean);
    journalMap[day] = Array.from(new Set(lines)).sort();
  });
  out.journal = journalMap;
  return canon(out);
}
/* Associativity is checked on list collections only (map non-associativity is the documented finding
   below), so this restricts contentOf's comparison to just the list half. */
function contentOfLists(db){
  const out = {};
  LEGACY_LISTS.forEach(name => {
    const spec = app.COLLECTIONS[name];
    const keyOf = typeof spec.key === 'function' ? spec.key : (x => x[spec.key]);
    const map = {};
    (db[name] || []).forEach(row => { map[keyOf(row)] = canon(row); });
    out[name] = map;
  });
  return canon(out);
}

{
  const rand = mulberry32(SEED);
  let firstMismatch = null;
  let goldenMismatches = 0, firstGoldenMismatch = null;
  for(let i = 0; i < N; i++){
    const A = genDevice(rand, 'differential');
    const B = genDevice(rand, 'differential');
    [false, true].forEach(lw => {
      if(firstMismatch) return;
      const legacyOut = legacyView(app.mergeDB_legacy(clone(A), clone(B), lw));
      const derivedOut = legacyView(app.mergeDB(clone(A), clone(B), lw));
      if(legacyOut !== derivedOut){
        const aObj = JSON.parse(legacyOut), bObj = JSON.parse(derivedOut);
        const diffKeys = Object.keys(aObj).filter(k => JSON.stringify(aObj[k]) !== JSON.stringify(bObj[k]));
        firstMismatch = { index: i, localWins: lw, diffKeys };
      }
      const label = 'random:' + i + ':' + lw;
      const match = golden(label, legacyOut, derivedOut, { silent: true });
      if(!match){ goldenMismatches++; if(!firstGoldenMismatch) firstGoldenMismatch = label; }
    });
  }
  ok('random differential: 400 seeded merges, legacy and derived identical', !firstMismatch, firstMismatch);
  ok('golden: random battery — 400 derived merges match the recorded legacy merges',
     goldenMismatches === 0, { mismatches: goldenMismatches, first: firstGoldenMismatch });
}

{
  const rand = mulberry32(SEED + 1);
  let idempotenceFail = null, commutativityFail = null, associativityFail = null;
  for(let i = 0; i < N; i++){
    const A = genDevice(rand, 'laws');
    const B = genDevice(rand, 'laws');
    const C = genDevice(rand, 'laws');

    if(!idempotenceFail){
      const merged = contentOf(app.mergeDB(clone(A), clone(A), false));
      if(merged !== contentOf(A)) idempotenceFail = { index: i };
    }
    if(!commutativityFail){
      const ab = contentOf(app.mergeDB(clone(A), clone(B), false));
      const ba = contentOf(app.mergeDB(clone(B), clone(A), false));
      if(ab !== ba) commutativityFail = { index: i };
    }
    if(!associativityFail){
      const abThenC = app.mergeDB(app.mergeDB(clone(A), clone(B), false), clone(C), false);
      const aThenBC = app.mergeDB(clone(A), app.mergeDB(clone(B), clone(C), false), false);
      if(contentOfLists(abThenC) !== contentOfLists(aThenBC)) associativityFail = { index: i };
    }
  }
  ok('merge law: merging a device with itself changes nothing (idempotence)', !idempotenceFail, idempotenceFail);
  ok('merge law: argument order does not change the result (commutativity)', !commutativityFail, commutativityFail);
  ok('merge law: retried transactions converge for every list collection (associativity)', !associativityFail, associativityFail);
}

/* Map collections (journal aside) have no per-day mtime, only the whole-DB updatedAt — so which
   grouping a transaction retry happens to compute decides the winner on a three-way conflict. This
   is a pre-existing property of mergeDateMap (PITFALLS Pitfall 5's own warning: do not "fix" a law
   that fails identically on both merges), not something this phase changes. Fixed counterexample:
   A(updatedAt 1, day={mowed:true}), B(updatedAt 3, no day), C(updatedAt 2, day={mowed:false}).
   (A,B)then C keeps {mowed:true}; A then (B,C) gives {mowed:false} — legacy and derived agree on
   both wrong-looking-but-identical answers, because they run the exact same mergeDateMap code. */
{
  const day = RANDOM_MAP_DAYS[0];
  const A = Object.assign(app.blank(), { lawnLog: { [day]: { mowed: true } }, updatedAt: 1 });
  const B = Object.assign(app.blank(), { lawnLog: {}, updatedAt: 3 });
  const C = Object.assign(app.blank(), { lawnLog: { [day]: { mowed: false } }, updatedAt: 2 });
  const legacyGroup1 = legacyView(app.mergeDB_legacy(app.mergeDB_legacy(clone(A), clone(B), false), clone(C), false));
  const derivedGroup1 = legacyView(app.mergeDB(app.mergeDB(clone(A), clone(B), false), clone(C), false));
  const legacyGroup2 = legacyView(app.mergeDB_legacy(clone(A), app.mergeDB_legacy(clone(B), clone(C), false), false));
  const derivedGroup2 = legacyView(app.mergeDB(clone(A), app.mergeDB(clone(B), clone(C), false), false));
  ok('merge law: map collections are not associative today (no per-day mtime) — legacy and derived agree on the counterexample',
     legacyGroup1 === derivedGroup1 && legacyGroup2 === derivedGroup2,
     { legacyGroup1, derivedGroup1, legacyGroup2, derivedGroup2 });
}

console.log("\n── real backup: legacy vs derived over Ian's actual data (REG-13, local only) ──");
/* This block reads Ian's real journal, weights and notes, when the local-only fixture is present
   (see .gitignore and STATE.md's 2026-09-11 decision). An ok() extra here may only hold numbers,
   booleans, collection names or scenario names — never a row, a date, a note or a refusal message
   — because a FAIL prints its extra (T-01-13).

   No golden() call anywhere in this block, ever: the committed merge-golden.json holds hashes of
   synthetic fixtures only. Recording a hash derived from Ian's real data — even a hash, which
   reveals nothing about content — would still make this block's presence/absence and the file's
   own diff history a signal about when real data was tested, and goldens exist to be safely
   committed to a public repo without carrying that risk. */
if(!fs.existsSync(REAL_PATH)){
  skipLine('real-backup differential — test/local/real-db-snapshot.json is not present (local only, git-ignored; see .gitignore)');
} else {
  let rawText = null, parsed = null, parseError = null;
  try {
    rawText = fs.readFileSync(REAL_PATH, 'utf8');
    parsed = JSON.parse(rawText);
  } catch(e){ parseError = e; }
  ok('real backup: the file parses as JSON', !parseError, parseError ? 'unparseable' : undefined);

  if(!parseError){
    const derivedMsg = app.validateBackup(parsed), legacyMsg = app.validateBackup_legacy(parsed);
    const norm = m => m === null ? null : 'refused';
    ok('real backup: validateBackup and its legacy twin agree', derivedMsg === legacyMsg, { derived: norm(derivedMsg), legacy: norm(legacyMsg) });
    ok('real backup: it is a valid backup', derivedMsg === null, derivedMsg === null ? undefined : 'refused');

    let R = null, bootThrew = null;
    try { R = loadApp(APP_PATH, rawText); } catch(e){ bootThrew = e; }
    const shapeFails = [];
    if(!bootThrew){
      Object.keys(R.COLLECTIONS).forEach(name => {
        const spec = R.COLLECTIONS[name], val = R.DB[name];
        const shaped = spec.kind === 'list' ? Array.isArray(val) : (!!val && typeof val === 'object' && !Array.isArray(val));
        if(!shaped) shapeFails.push(name);
      });
    }
    ok('real backup: boots with every declared collection shaped', !bootThrew && shapeFails.length === 0, bootThrew ? [] : shapeFails);

    if(!bootThrew){
      LIVE_WRAPPERS.forEach(([wrapper, legacy]) => {
        const derived = R[wrapper](), twin = R[legacy]();
        ok('real backup: ' + wrapper + ' matches its twin', canon(derived) === canon(twin), derived.length);
      });

      const base = clone(R.DB);
      const realMerge = (label, a, b, lw) => {
        const legacyOut = legacyView(R.mergeDB_legacy(clone(a), clone(b), lw));
        const derivedOut = legacyView(R.mergeDB(clone(a), clone(b), lw));
        if(legacyOut === derivedOut){ ok('real backup: merge parity — ' + label, true); return; }
        const aObj = JSON.parse(legacyOut), bObj = JSON.parse(derivedOut);
        const diffKeys = Object.keys(aObj).filter(k => JSON.stringify(aObj[k]) !== JSON.stringify(bObj[k]));
        ok('real backup: merge parity — ' + label, false, diffKeys);
      };

      const staleRemote = clone(base);
      LEGACY_LISTS.forEach(name => (staleRemote[name] || []).forEach(row => { if(row && typeof row === 'object') delete row.mtime; }));
      staleRemote.updatedAt = (base.updatedAt || 0) - 86400000;

      const withDeletions = clone(base);
      LEGACY_LISTS.forEach(name => {
        (withDeletions[name] || []).forEach((row, i) => {
          if(row && typeof row === 'object' && i % 3 === 2){ row.deletedAt = Date.now() + 1; row.mtime = Date.now() + 1; }
        });
      });

      const freshDevice = Object.assign(R.blank(), { gen: base.gen || 0 });
      const eraseDevice = Object.assign(R.blank(), { gen: (base.gen || 0) + 1 });

      const scenarios = [
        ['self', clone(base), clone(base)],
        ['stale copy', staleRemote, clone(base)],
        ['stale copy (swapped)', clone(base), staleRemote],
        ['deletions elsewhere', withDeletions, clone(base)],
        ['fresh device', freshDevice, clone(base)],
        ['erase', eraseDevice, clone(base)],
      ];
      scenarios.forEach(([label, a, b]) => {
        [false, true].forEach(lw => { realMerge(label + ' (localWins ' + lw + ')', a, b, lw); });
      });

      const LEGACY_KEY = {
        sessions: R.sessKey, weights: w => w.date, petWeights: w => w.date,
        cardio: R.cardioKey, ideas: R.ideaKey, todos: R.todoKey, hobbyLog: R.hobbyKey,
      };
      Object.keys(LEGACY_KEY).forEach(name => {
        const spec = R.COLLECTIONS[name];
        const keyOf = typeof spec.key === 'function' ? spec.key : (x => x[spec.key]);
        const rows = R.DB[name] || [];
        const derivedCount = new Set(rows.map(keyOf)).size;
        const legacyCount = new Set(rows.map(LEGACY_KEY[name])).size;
        ok('real backup: ' + name + ' keeps the same number of distinct keys', derivedCount === legacyCount, derivedCount);
      });
    }
  }
}

console.log('\n── sleep: one declaration, SCHEMA 18, no row rewritten (SLEEP-01/SLEEP-06/REG-16) ──');

/* A populated schema-17 fixture: one row (carrying an mtime) in every legacy list, one day in
   every legacy map, the sleep key deleted, and _schema 17 — exactly the shape REG-16 must prove
   migration 18 leaves untouched. */
function sleepFixture17(tag, mtime){
  const d = populatedLegacyDB(tag, mtime);
  delete d.sleep;
  d._schema = 17;
  return d;
}

ok('sleep: blank() has an empty sleep list', Array.isArray(app.blank().sleep) && app.blank().sleep.length === 0, app.blank().sleep);

{
  const before = sleepFixture17('m18a', 42);
  const legacyBefore = {}; LEGACY_COLLECTIONS.forEach(name => { legacyBefore[name] = canon(before[name]); });
  const mtimesBefore = JSON.stringify(LEGACY_LISTS.reduce((acc, name) => acc.concat((before[name] || []).map(r => r.mtime)), []).sort());
  const after = app.normalize(clone(before));
  const legacyAfter = {}; LEGACY_COLLECTIONS.forEach(name => { legacyAfter[name] = canon(after[name]); });
  const mtimesAfter = JSON.stringify(LEGACY_LISTS.reduce((acc, name) => acc.concat((after[name] || []).map(r => r.mtime)), []).sort());
  const legacyUnchanged = LEGACY_COLLECTIONS.every(name => legacyBefore[name] === legacyAfter[name]);
  ok('sleep: migration 18 rewrites no existing row (REG-16 guards not triggered)',
     legacyUnchanged && mtimesBefore === mtimesAfter && Array.isArray(after.sleep) && after.sleep.length === 0 && after._schema === 18,
     { legacyUnchanged, mtimesBefore, mtimesAfter, sleepLen: after.sleep.length, schema: after._schema });
}

{
  const withSleep = sleepFixture17('m18b', 7);
  withSleep.sleep = [{ id:'sl-existing', date:'2026-08-01', hours:7, quality:4, note:'', mtime:99 }];
  const migrated = app.normalize(clone(withSleep));
  ok('sleep: migration 18 keeps an existing sleep list',
     canon(migrated.sleep) === canon(withSleep.sleep), { before: withSleep.sleep, after: migrated.sleep });
}

{
  const raw = sleepFixture17('m18c', 3);
  const once = app.normalize(clone(raw));
  const twice = app.normalize(clone(once));
  ok('sleep: migrations stay idempotent', JSON.stringify(once) === JSON.stringify(twice));
}

{
  const tooNew = Object.assign(app.blank(), { _schema: app.SCHEMA + 1 });
  const normKept = app.normalize(clone(tooNew))._schema === app.SCHEMA + 1;

  const s17 = Object.assign(app.blank(), { _schema:17, updatedAt:100 }); delete s17.sleep;
  const s18 = Object.assign(app.blank(), { _schema:18, updatedAt:200 });
  const mergeStamped = app.mergeDB(clone(s17), clone(s18), false)._schema === 18
    && app.mergeDB(clone(s18), clone(s17), false)._schema === 18;

  ok('sleep: _schema never goes down', normKept && mergeStamped, { normKept, mergeStamped });
}

{
  const oldSide = Object.assign(app.blank(), { _schema:17, updatedAt:500 }); delete oldSide.sleep;
  const newSide = Object.assign(app.blank(), { _schema:18, updatedAt:100, sleep:[{ id:'sl1', date:'2026-08-01', hours:7, quality:3, note:'', mtime:1 }] });
  const m1 = app.mergeDB(clone(oldSide), clone(newSide), false);
  const m2 = app.mergeDB(clone(newSide), clone(oldSide), false);
  ok('sleep: a schema-17 device merged with a schema-18 device keeps every sleep row',
     canon(m1.sleep) === canon(newSide.sleep) && canon(m2.sleep) === canon(newSide.sleep), { m1: m1.sleep, m2: m2.sleep });
}

{
  const a = Object.assign(app.blank(), { updatedAt:100, sleep:[{ id:'sl1', date:'2026-08-01', hours:7, quality:4, note:'', mtime:1 }] });
  const b = Object.assign(app.blank(), { updatedAt:100, sleep:[{ id:'sl2', date:'2026-08-01', hours:6, quality:3, note:'', mtime:1 }] });
  const merged = app.mergeDB(a, b, false);
  ok('sleep: two nights on the same date both survive (key is id)',
     merged.sleep.length === 2 && merged.sleep.some(s=>s.id==='sl1') && merged.sleep.some(s=>s.id==='sl2'), merged.sleep);
}

{
  const a = Object.assign(app.blank(), { updatedAt:100, sleep:[{ id:'sl3', date:'2026-08-03', hours:7, quality:4, note:'', mtime:1 }] });
  const b = Object.assign(app.blank(), { updatedAt:100, sleep:[{ id:'sl1', date:'2026-08-01', hours:7, quality:4, note:'', mtime:1 }, { id:'sl2', date:'2026-08-02', hours:7, quality:4, note:'', mtime:1 }] });
  const merged = app.mergeDB(a, b, false);
  ok('sleep: merged rows come back date-sorted',
     JSON.stringify(merged.sleep.map(s=>s.date)) === JSON.stringify(['2026-08-01','2026-08-02','2026-08-03']), merged.sleep.map(s=>s.date));
}

{
  const A = Object.assign(app.blank(), { updatedAt:100, sleep:[{ id:'sl1', date:'2026-08-01', hours:7, quality:4, note:'', deletedAt:900, mtime:900 }] });
  const B = Object.assign(app.blank(), { updatedAt:500, sleep:[{ id:'sl1', date:'2026-08-01', hours:7, quality:4, note:'', mtime:100 }] });
  const stillDeleted = r => { const row = r.sleep.find(s=>s.id==='sl1'); return !!row && !!row.deletedAt; };
  const results = [
    app.mergeDB(clone(A), clone(B), false),
    app.mergeDB(clone(B), clone(A), false),
    app.mergeDB(clone(A), clone(B), true),
    app.mergeDB(clone(B), clone(A), true),
  ];
  ok('sleep: a deleted night is not resurrected by a stale device (SLEEP-06)',
     results.every(stillDeleted), results.map(r=>r.sleep.find(s=>s.id==='sl1')));
}

{
  const A = Object.assign(app.blank(), { updatedAt:100, sleep:[{ id:'sl1', date:'2026-08-01', hours:7, quality:4, note:'', deletedAt:900, mtime:900 }] });
  const B = Object.assign(app.blank(), { updatedAt:500, sleep:[{ id:'sl1', date:'2026-08-01', hours:7, quality:4, note:'', mtime:100 }] });
  const first = app.mergeDB(clone(A), clone(B), false);
  const replay = app.mergeDB(clone(first), clone(B), false);
  const row = replay.sleep.find(s=>s.id==='sl1');
  ok('sleep: replaying the stale device again keeps it deleted', !!row && !!row.deletedAt, row);
}

{
  const older = Object.assign(app.blank(), { updatedAt:100, sleep:[{ id:'sl1', date:'2026-08-01', hours:7, quality:4, note:'old', mtime:500 }] });
  const newer = Object.assign(app.blank(), { updatedAt:900, sleep:[{ id:'sl1', date:'2026-08-01', hours:6, quality:2, note:'new', mtime:500 }] });
  const out1 = app.mergeDB(clone(older), clone(newer), false);
  const out2 = app.mergeDB(clone(newer), clone(older), false);
  ok('sleep: on an exact mtime tie the newer device decides',
     out1.sleep[0].note === 'new' && out2.sleep[0].note === 'new', { out1: out1.sleep, out2: out2.sleep });
}

{
  const A = Object.assign(app.blank(), { updatedAt:100, sleep:[{ id:'sl1', date:'2026-08-01', hours:7, quality:4, note:'', deletedAt:900, mtime:900 }] });
  const B = Object.assign(app.blank(), { updatedAt:500 }); delete B.sleep;
  const out1 = app.mergeDB(clone(A), clone(B), false);
  const out2 = app.mergeDB(clone(B), clone(A), false);
  const tombstoneKept = r => { const row = r.sleep.find(s=>s.id==='sl1'); return !!row && !!row.deletedAt; };
  ok('sleep: a device without any sleep list cannot resurrect or remove',
     tombstoneKept(out1) && tombstoneKept(out2), { out1: out1.sleep, out2: out2.sleep });
}

/* A minimal locally-built backup fixture (not `realBackup`, declared later in the file — using it
   here would hit its temporal-dead-zone before it is initialised). */
const sleepBackupBase = Object.assign(app.blank(), {
  sessions: [{ id:'x', workout:'PUSH 1', date:'2026-07-15', endedAt:1, extras:{}, entries:[] }],
  weights: [{ date:'2026-07-15', value:190 }],
});

{
  const copy = JSON.parse(JSON.stringify(sleepBackupBase));
  copy.sleep = 'x';
  ok('sleep: a damaged sleep section is refused',
     app.validateBackup(copy) === 'The sleep section is damaged (expected a list).', app.validateBackup(copy));
}

{
  const copy = JSON.parse(JSON.stringify(sleepBackupBase));
  delete copy.sleep;
  copy._schema = 12;
  ok('sleep: an older backup without sleep is accepted', app.validateBackup(copy) === null, app.validateBackup(copy));
}

console.log('\n── sleep: log, list and delete (SLEEP-02/SLEEP-03) ──');
/* Note: `populatedDB` is a hoisted function declaration (defined later in this file), so calling
   it here is safe. `SCREENS` is a `const` initialised later in file-execution order — referencing
   it here would hit its temporal dead zone, so the router check below reads app.TABS directly. */

{
  const S = loadApp(APP_PATH); S.DB = S.blank();
  const setVal = (id, v) => { S.__sandbox.document.getElementById(id).value = v; };
  setVal('sleep-date', '2026-08-06'); setVal('sleep-hours', '7.5'); setVal('sleep-quality', '4'); setVal('sleep-note', '  woke at 3  ');
  S.addSleep();
  const row = S.DB.sleep[0];
  ok('sleep: logging a night stores hours, quality and the trimmed note',
     S.DB.sleep.length === 1 && row.date === '2026-08-06' && row.hours === 7.5 && row.quality === 4 && row.note === 'woke at 3'
     && typeof row.id === 'string' && row.id.indexOf('sl') === 0 && typeof row.mtime === 'number'
     && S.__stored().sleep.length === 1,
     row);
}

{
  const S = loadApp(APP_PATH); S.DB = S.blank();
  const setVal = (id, v) => { S.__sandbox.document.getElementById(id).value = v; };
  ['', '25', '0'].forEach(h => {
    setVal('sleep-date', '2026-08-06'); setVal('sleep-hours', h); setVal('sleep-quality', '3'); setVal('sleep-note', '');
    S.addSleep();
  });
  ok('sleep: blank or impossible hours are refused', S.DB.sleep.length === 0, S.DB.sleep);
}

{
  const S = loadApp(APP_PATH); S.DB = S.blank();
  const setVal = (id, v) => { S.__sandbox.document.getElementById(id).value = v; };
  const qualityFor = q => { setVal('sleep-date','2026-08-06'); setVal('sleep-hours','7'); setVal('sleep-quality', q); setVal('sleep-note',''); S.addSleep(); return S.DB.sleep[S.DB.sleep.length-1].quality; };
  const results = { nine: qualityFor('9'), x: qualityFor('x'), zero: qualityFor('0') };
  ok('sleep: quality is clamped to 1–5', results.nine === 5 && results.x === 3 && results.zero === 1, results);
}

{
  const S = loadApp(APP_PATH); S.DB = S.blank();
  const setVal = (id, v) => { S.__sandbox.document.getElementById(id).value = v; };
  setVal('sleep-date', 'garbage'); setVal('sleep-hours', '7'); setVal('sleep-quality', '3'); setVal('sleep-note', '');
  S.addSleep();
  ok('sleep: a bad date falls back to today', S.DB.sleep[0].date === S.todayISO(), S.DB.sleep[0].date);
}

{
  const S = loadApp(APP_PATH); S.DB = populatedDB(S);
  const html = S.viewSleep();
  ok('sleep: the history lists live nights and hides deleted ones',
     html.indexOf("removeSleep('sl1')") >= 0 && html.indexOf("removeSleep('sl2')") < 0, html.length);
}

{
  const S = loadApp(APP_PATH); S.DB = populatedDB(S);
  ok('sleep: the note is escaped', !/<script>/i.test(S.viewSleep()));
}

{
  const S = loadApp(APP_PATH); S.DB = S.blank();
  ok('sleep: an empty log shows the empty state', /No sleep logged yet/.test(S.viewSleep()));
}

{
  const S = loadApp(APP_PATH); S.DB = populatedDB(S);
  S.removeSleep('sl1');
  const row = S.DB.sleep.find(s=>s.id==='sl1');
  ok('sleep: deleting a night is soft',
     !!row && !!row.deletedAt && !S.liveOf('sleep').some(s=>s.id==='sl1'), row);
}

{
  const S = loadApp(APP_PATH); S.DB = populatedDB(S);
  S.removeSleep('sl1');
  const row1 = S.DB.sleep.find(s=>s.id==='sl1');
  const mtimeAfterFirst = row1.mtime, deletedAtAfterFirst = row1.deletedAt;
  S.removeSleep('sl1');
  const row2 = S.DB.sleep.find(s=>s.id==='sl1');
  ok('sleep: deleting twice is a no-op', row2.mtime === mtimeAfterFirst && row2.deletedAt === deletedAtAfterFirst, row2);
}

{
  const S = loadApp(APP_PATH); S.DB = populatedDB(S);
  const before = canon(S.DB.sleep);
  S.removeSleep('nope');
  ok('sleep: an unknown id changes nothing', canon(S.DB.sleep) === before);
}

{
  const S = loadApp(APP_PATH); S.DB = S.blank();
  S.DB.sleep = [{ id:"a'b(c);", date:'2026-08-01', hours:7, quality:3, note:'', mtime:1 }];
  const html = S.viewSleep();
  ok('sleep: an id that could break out of the attribute gets no delete button',
     html.indexOf('7h') >= 0 && html.indexOf('removeSleep(') < 0, html);
}

{
  const care = app.TABS.find(t=>t.id==='care');
  ok('sleep: the router exposes Care → Sleep', !!care && (care.sub||[]).some(([k])=>k==='sleep'), care && care.sub);
}

console.log('\n── SLEEP-05: a collection declared in one line is picked up everywhere ──');
/* Existing devices get a new collection through the SCHEMA bump and a MIGRATIONS line (the
   CLAUDE.md schema rule shown in Task 1) — never through a derived consumer. That's why this
   proof boots a FRESH instance from a transformed source rather than migrating one: the point is
   that blank/liveOf/validateBackup/mergeDB/mergeCollections pick the two probes up from their
   declaration alone, with no line changed in any of the five. */
const PROBE_LIST_LINE = "  probeList:{ kind:'list', key:'id', sortBy:'date', merge:'union', soft:true, required:false, label:'Probe list', columns:[{field:'date',label:'date'},{field:'value',label:'value',unit:'mass'}] },";
const PROBE_MAP_LINE  = "  probeMap:{ kind:'map', merge:'replace-whole', soft:false, required:false, explicitFalse:true, label:'Probe map', columns:[{field:'date',label:'date'},{field:'item',label:'item'}], format:dayFlagRows },";
const probeTransform = code => code.replace('const COLLECTIONS = {', 'const COLLECTIONS = {\n' + PROBE_LIST_LINE + '\n' + PROBE_MAP_LINE);
const probe = loadApp(APP_PATH, null, { transform: probeTransform });

{
  const lineDiff = probe.__src.split('\n').length - app.__src.split('\n').length;
  const reconstructed = probe.__src.replace('\n' + PROBE_LIST_LINE + '\n' + PROBE_MAP_LINE, '');
  ok('SLEEP-05: the probe transform applied (two lines added, nothing else changed)',
     probe.__src !== app.__src && lineDiff === 2 && reconstructed === app.__src,
     { lineDiff, reconstructedMatchesApp: reconstructed === app.__src });
}

ok('SLEEP-05: the declaration is valid', probe.collectionProblems(probe.COLLECTIONS).length === 0, probe.collectionProblems(probe.COLLECTIONS));

{
  const blankProbe = probe.blank();
  ok('SLEEP-05: blank() creates the probes empty',
     Array.isArray(blankProbe.probeList) && blankProbe.probeList.length === 0 &&
     typeof blankProbe.probeMap === 'object' && !Array.isArray(blankProbe.probeMap) && Object.keys(blankProbe.probeMap).length === 0 &&
     Array.isArray(probe.DB.probeList) && probe.DB.probeList.length === 0 &&
     typeof probe.DB.probeMap === 'object' && !Array.isArray(probe.DB.probeMap) && Object.keys(probe.DB.probeMap).length === 0,
     { blankList: blankProbe.probeList, blankMap: blankProbe.probeMap, dbList: probe.DB.probeList, dbMap: probe.DB.probeMap });
}

{
  probe.DB = Object.assign(probe.blank(), { probeList: [
    { id:'p1', date:'2026-08-01', value:1, mtime:1 },
    { id:'p2', date:'2026-08-02', value:2, mtime:1, deletedAt:5 },
  ]});
  const live = probe.liveOf('probeList');
  ok('SLEEP-05: liveOf hides a deleted probe row', live.length === 1 && live[0].id === 'p1', live);
}

{
  const base = probe.blank();
  const withoutProbes = JSON.parse(JSON.stringify(base));
  delete withoutProbes.probeList; delete withoutProbes.probeMap;
  const badList = JSON.parse(JSON.stringify(base)); badList.probeList = 'x';
  const badMap = JSON.parse(JSON.stringify(base)); badMap.probeMap = [];
  const r1 = probe.validateBackup(withoutProbes), r2 = probe.validateBackup(badList), r3 = probe.validateBackup(badMap);
  ok('SLEEP-05: validateBackup checks the probes',
     r1 === null && r2 === 'The probeList section is damaged (expected a list).' && r3 === 'The probeMap section is damaged.',
     { r1, r2, r3 });
}

{
  const A = Object.assign(probe.blank(), { updatedAt:100, probeList:[
    { id:'p3', date:'2026-08-03', value:3, mtime:1 },
    { id:'p1', date:'2026-08-01', value:1, mtime:1 },
  ]});
  const B = Object.assign(probe.blank(), { updatedAt:100, probeList:[
    { id:'p2', date:'2026-08-02', value:2, mtime:1 },
  ]});
  const merged = probe.mergeDB(clone(A), clone(B), false);
  ok('SLEEP-05: mergeDB unions probe rows and sorts them by date',
     JSON.stringify(merged.probeList.map(r=>r.date)) === JSON.stringify(['2026-08-01','2026-08-02','2026-08-03']),
     merged.probeList.map(r=>r.date));
}

{
  const A = Object.assign(probe.blank(), { updatedAt:100, probeList:[{ id:'p1', date:'2026-08-01', value:1, deletedAt:900, mtime:900 }] });
  const B = Object.assign(probe.blank(), { updatedAt:500, probeList:[{ id:'p1', date:'2026-08-01', value:1, mtime:100 }] });
  const stillDeleted = r => { const row = r.probeList.find(x=>x.id==='p1'); return !!row && !!row.deletedAt; };
  const out1 = probe.mergeDB(clone(A), clone(B), false);
  const out2 = probe.mergeDB(clone(B), clone(A), false);
  ok('SLEEP-05: a deleted probe row survives a stale device', stillDeleted(out1) && stillDeleted(out2), { out1: out1.probeList, out2: out2.probeList });
}

{
  const day = '2026-08-01';
  const older = Object.assign(probe.blank(), { updatedAt:100, probeMap: { [day]: { a:true } } });
  const newer = Object.assign(probe.blank(), { updatedAt:900, probeMap: { [day]: { b:false } } });
  const out1 = probe.mergeDB(clone(older), clone(newer), false);
  const out2 = probe.mergeDB(clone(newer), clone(older), false);
  ok('SLEEP-05: the map probe replaces whole days and keeps explicit false',
     JSON.stringify(out1.probeMap[day]) === JSON.stringify({ b:false }) && JSON.stringify(out2.probeMap[day]) === JSON.stringify({ b:false }),
     { out1: out1.probeMap[day], out2: out2.probeMap[day] });
}

console.log('\n── SLEEP-04: sleep is added through its declaration alone ──');
{
  const stripComments = src => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const consumers = { blank: app.blank, liveOf: app.liveOf, validateBackup: app.validateBackup, mergeCollections: app.mergeCollections, mergeDB: app.mergeDB };
  const hits = Object.keys(consumers).filter(name => stripComments(consumers[name].toString()).indexOf('sleep') >= 0);
  ok('SLEEP-04: no derived consumer mentions sleep', hits.length === 0, hits);
}

ok('SLEEP-04: there is no liveSleep wrapper', !/function\s+liveSleep\s*\(/.test(app.__src));

ok("SLEEP-04: viewSleep reads through liveOf('sleep')", app.viewSleep.toString().indexOf("liveOf('sleep')") >= 0);

{
  const keys = Object.keys(app.COLLECTIONS);
  const sleepLineMatches = app.__src.match(/^\s*sleep:/gm) || [];
  ok('SLEEP-04: sleep is declared once, as the last entry',
     keys[keys.length-1] === 'sleep' && sleepLineMatches.length === 1,
     { lastKey: keys[keys.length-1], sleepLineCount: sleepLineMatches.length });
}

/* Identity. Ian's Aug 10 export had 37 spellings for ~30 movements — "Seated Fly" and "Seated Flys"
   were two lifts with two PR histories, and "Deficit Sumo Squat" missed the program's own 12–15
   range because the override is keyed by the canonical spelling. */
console.log('\n── an exercise is a thing, not a spelling ──');
const p1lo = String(app.effRange(app.PROGRAM['PUSH 1'].slots[0], 'x').lo);   // reps inside slot 0's range, so a PR can register
const twoSpellings = () => app.normalize(Object.assign(app.blank(), { _schema:16, draft:null, sessions:[
  { id:'a', workout:'PUSH 1', date:'2026-07-01', endedAt:1, extras:{}, entries:[{name:'Seated Fly',  sets:[{w:'95',r:p1lo,skipped:false}]}] },
  { id:'b', workout:'PUSH 1', date:'2026-07-08', endedAt:1, extras:{}, entries:[{name:'Seated Flys', sets:[{w:'100',r:p1lo,skipped:false}]}] },
]}));
app.DB = twoSpellings();
ok('a plural typo resolves to the same exercise', app.exKey(app.DB.sessions[0].entries[0]) === app.exKey(app.DB.sessions[1].entries[0]),
   [app.exKey(app.DB.sessions[0].entries[0]), app.exKey(app.DB.sessions[1].entries[0])]);
ok('  …so it is ONE history, not two', app.exerciseHistory(app.exIdByName('Seated Fly')).length === 2, app.exerciseHistory(app.exIdByName('Seated Fly')).length);
ok('  …and one PR entry', app.exercisePRs().filter(p=>/seated fly/i.test(p.name)).length === 1, app.exercisePRs());
ok('the label is the tidy spelling', app.exLabel(app.exIdByName('Seated Flys')) === 'Seated Fly', app.exLabel(app.exIdByName('Seated Flys')));
ok('case and spacing never split a lift', app.exKey('  BARBELL   bench Press ') === app.exKey('Barbell bench press'));
ok('ids are derived from the name, so two devices agree offline', app.exIdByName('Barbell bench press') === 'barbell-bench-press', app.exIdByName('Barbell bench press'));
ok('a hand-typed capitalisation still finds the program range', (()=>{
  const d = app.normalize(Object.assign(app.blank(), { _schema:16, draft:null, sessions:[
    { id:'c', workout:'LEGS 1', date:'2026-07-02', endedAt:1, extras:{},
      entries: slotNames('LEGS 1', app.PROGRAM['LEGS 1'].slots.findIndex(s=>s.examples.includes('Deficit sumo squat')), 'DEFICIT SUMO SQUAT')
        .map((n,i)=>({ name:n, sets: i===0 ? [{w:'50',r:'13',skipped:false}] : [] })) }]}));
  const s = d.sessions[0]; app.DB = d;
  const rng = app.sessionRanges(s).get(s.entries[0]);
  return rng && rng.lo === 12 && rng.hi === 15;
})(), 'the 12–15 override was missed');
app.DB = twoSpellings();
ok('merging two exercises keeps every set', (()=>{
  const keep = app.exIdByName('Seated Fly');
  app.exEnsure('Pec deck');
  app.DB.sessions.push({ id:'c', workout:'PUSH 1', date:'2026-07-15', endedAt:1, extras:{}, entries:[{name:'Pec deck', exId:'pec-deck', sets:[{w:'110',r:p1lo,skipped:false}]}] });
  app.exMerge('pec-deck', keep);
  return app.exerciseHistory(keep).length === 3 && !app.exRow('pec-deck');
})(), app.exerciseHistory(app.exIdByName('Seated Fly')));
ok('  …and the merged rows are touched so the merge survives a sync', app.DB.sessions.every(s=>typeof s.mtime === 'number'));
ok('"did you mean" spots a one-letter difference', (()=>{ const s = app.exSuggest('Seated Flyss'); return !!s && s.name === 'Seated Fly'; })(), app.exSuggest('Seated Flyss'));
ok('  …and stays quiet for a genuinely different lift', app.exSuggest('Hack squat') === null || app.exSuggest('Hack squat').name !== 'Seated Fly');
ok('the orphaned forearm sets get a name and become visible', (()=>{
  const d = app.normalize(Object.assign(app.blank(), { _schema:16, draft:null, sessions:[
    { id:'f', workout:'PUSH 1', date:'2026-06-29', endedAt:1, entries:[],
      extras:{ forearms:{ name:'', sets:[{w:'5',r:'12',skipped:false},{w:'5',r:'13',skipped:false}] } } }]}));
  app.DB = d;
  return d.sessions[0].extras.forearms.name === 'Wrist curls' && app.sessionExercises(d.sessions[0]).length === 1;
})(), 'still invisible');

/* Booting with data that needs migrating is a different code path from booting empty, and only the
   first one runs save() at startup. Skipping it hid a temporal-dead-zone crash that killed the app
   outright on every device that had anything to migrate — the tests were green and the app was
   dead. Boot a whole second instance from a seeded store to cover it. */
console.log('\n── booting with data that needs migrating ──');
const booted = loadApp(APP_PATH, Object.assign(app.blank(), { _schema:14, draft:null, sessions:[
  { id:'g1', workout:'LEGS 1', date:'2026-07-15', endedAt:1, extras:{},
    entries:[{name:'Goblet squat', sets:[{w:'50',r:'12',skipped:false}]}] }]}));
ok('the app boots at all (no dead-zone crash)', typeof booted.exKey === 'function' && typeof booted.exRows === 'function');
ok('  …the migration ran', booted.DB._schema === app.SCHEMA && booted.DB.sessions[0].entries[0].name === 'Deficit sumo squat',
   { schema: booted.DB._schema, name: booted.DB.sessions[0].entries[0].name });
ok('  …and was WRITTEN to storage, not just held in memory', (()=>{
  const s = booted.__stored();
  return s && s._schema === app.SCHEMA && s.sessions[0].entries[0].name === 'Deficit sumo squat';
})(), booted.__stored() && booted.__stored()._schema);
ok('  …with the identity stamped on the row', !!booted.__stored().sessions[0].entries[0].exId, booted.__stored().sessions[0].entries[0].exId);
ok('a fresh install still boots clean', (()=>{ const fresh = loadApp(APP_PATH); return fresh.DB._schema === app.SCHEMA && fresh.DB.sessions.length === 0; })());

/* The temporal-dead-zone trap COLLECTIONS must survive (see the placement comments on migrations
   13 and 17): a registry that throws, or that resolves a reference incorrectly, would be swallowed
   by normalize()'s silent try/catch while `_schema` still advances. Booting the REAL app from every
   schema version — not just the current one — is the only way to catch that. */
console.log('\n── every schema version boots, and every declared collection has its shape (REG-15) ──');
const INTRODUCED_AT = { sessions:0, weights:0, hobbyLog:1, journal:2, mobilityLog:5, todos:6, cardio:7, ideas:8, lawnLog:10, petWeights:14, sleep:18 };
Object.keys(app.COLLECTIONS).forEach(name => {
  ok('boot: introduced-at table knows ' + name, name in INTRODUCED_AT, name);
});

const shapeCheck = (DB, v) => {
  for(const name in app.COLLECTIONS){
    const spec = app.COLLECTIONS[name];
    const val = DB[name];
    if(spec.kind === 'list' && !Array.isArray(val)) return name + ' is not an array';
    if(spec.kind === 'map' && (!val || typeof val !== 'object' || Array.isArray(val))) return name + ' is not a map';
  }
  return true;
};

for(let v = 0; v <= app.SCHEMA; v++){
  let seed;
  if(v === app.SCHEMA){
    seed = Object.assign(app.blank(), {
      sessions: [{ id:'b'+v, workout:'PUSH 1', date:'2026-07-01', endedAt:1, extras:{},
        entries:[{ name:'Barbell bench press', sets:[{ w:'135', r:'8', skipped:false }] }] }],
      weights: [{ date:'2026-07-01', value:190 }],
    });
  } else {
    seed = {
      sessions: [{ id:'b'+v, workout:'PUSH 1', date:'2026-07-01', endedAt:1, extras:{},
        entries:[{ name:'Barbell bench press', sets:[{ w:'135', r:'8', skipped:false }] }] }],
      weights: [{ date:'2026-07-01', value:190 }],
    };
    Object.keys(app.COLLECTIONS).forEach(name => {
      if(name === 'sessions' || name === 'weights') return;
      if(INTRODUCED_AT[name] <= v) seed[name] = app.COLLECTIONS[name].kind === 'list' ? [] : {};
    });
    if(v > 0) seed._schema = v;
  }
  let booted, threw = null;
  try { booted = loadApp(APP_PATH, seed); } catch(e){ threw = e; }
  const result = (()=>{
    if(threw) return 'threw: ' + threw.message;
    const DB = booted.DB;
    if(DB._schema !== app.SCHEMA) return 'schema stuck at ' + DB._schema;
    const shape = shapeCheck(DB, v);
    if(shape !== true) return shape;
    if(!(DB.sessions || []).some(s => s.id === 'b' + v)) return 'seeded session missing';
    if(!(DB.weights || []).some(w => w.date === '2026-07-01')) return 'seeded weigh-in missing';
    if(v < app.SCHEMA){
      const stored = booted.__stored();
      if(!stored || stored._schema !== app.SCHEMA) return 'migration not persisted';
    }
    return true;
  })();
  ok('boot: schema ' + v + ' → every declared collection shaped', result === true, result);
}

[
  [null, 'empty store'],
  ['not json {', 'unparseable store'],
  ['{}', "'{}' store"],
].forEach(([seed, label]) => {
  let booted, threw = null;
  try { booted = loadApp(APP_PATH, seed); } catch(e){ threw = e; }
  const result = threw ? 'threw: ' + threw.message : shapeCheck(booted.DB);
  ok('boot: ' + label + ' → every declared collection shaped', result === true, result);
});

/* COLLECTIONS sits above `let DB = load()` textually, so a bad edit that moves it, or that
   introduces an arrow-function or forward-const value, must turn this suite red — not the phone. */
console.log('\n── COLLECTIONS sits where module-eval can reach it (REG-02/03/11) ──');
{
  const src = app.__src;
  const iSchema = src.indexOf('const SCHEMA');
  const iCollections = src.indexOf('const COLLECTIONS');
  const iMigrations = src.indexOf('const MIGRATIONS');
  const iLoad = src.indexOf('let DB = load()');
  ok('placement: COLLECTIONS sits after SCHEMA, before MIGRATIONS and before let DB = load()',
     iSchema >= 0 && iCollections > iSchema && iCollections < iMigrations && iMigrations < iLoad,
     { iSchema, iCollections, iMigrations, iLoad });

  const startIdx = src.indexOf('const COLLECTIONS = {');
  const rest = src.slice(startIdx);
  const endMatch = rest.match(/\r?\n\};\r?\n/);
  const literal = endMatch ? rest.slice(0, endMatch.index + endMatch[0].length) : rest;

  ok('placement: the COLLECTIONS literal holds no arrow functions', !literal.includes('=>'), literal.length);

  const idents = [...literal.matchAll(/:\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*[,}\n]/g)].map(m => m[1])
    .filter(id => id !== 'true' && id !== 'false' && id !== 'null');
  const badRefs = idents.filter(id => {
    const isFnDecl = new RegExp('function\\s+' + id + '\\s*\\(').test(src);
    const isConstLetVar = new RegExp('\\b(const|let|var)\\s+' + id + '\\b').test(src);
    return !isFnDecl || isConstLetVar;
  });
  ok('placement: every function value in COLLECTIONS is a hoisted function declaration', badRefs.length === 0, badRefs);

  ok('placement: COLLECTIONS never references MIGRATIONS', !literal.includes('MIGRATIONS'));

  ok('registry: the shipped COLLECTIONS has no problems', app.collectionProblems(app.COLLECTIONS).length === 0, app.collectionProblems(app.COLLECTIONS));

  ok('registry: entries are declared in the pre-phase order',
     JSON.stringify(Object.keys(app.COLLECTIONS).slice(0, 10)) === JSON.stringify(['sessions','weights','petWeights','cardio','ideas','todos','hobbyLog','journal','mobilityLog','lawnLog']),
     Object.keys(app.COLLECTIONS));
}

/* The registry's export metadata (REG-17), the merge-strategy refusal battery (REG-05), the promoted
   key functions' parity with their pre-phase bodies (REG-04), and the hand-written MIGRATIONS
   invariant (REG-11). Built with the object form of COLLECTIONS entries, copying real function
   references off `app` where a format or key function is needed — never re-declaring them here. */
console.log('\n── the registry refuses what would lose data (REG-05/REG-04/REG-17/REG-11) ──');
{
  const validListSpec = () => ({ kind:'list', key:'id', merge:'union', soft:true, required:false, label:'Thing', columns:[{field:'date',label:'date'}] });
  const validMapSpec = () => ({ kind:'map', merge:'line-union', soft:false, required:false, explicitFalse:false, label:'Thing', columns:[{field:'date',label:'date'},{field:'entry',label:'entry'}], format:app.journalRows });

  let spec = validMapSpec(); delete spec.merge;
  let problems = app.collectionProblems({ thing: spec });
  ok('registry: a map with no merge field is refused, naming the collection and "merge"',
     problems.length > 0 && problems.some(p=>p.includes('thing') && p.includes('merge')), problems);

  spec = validMapSpec(); spec.merge = null;
  problems = app.collectionProblems({ thing: spec });
  ok('registry: a map with merge null is refused, naming the collection and "merge"',
     problems.length > 0 && problems.some(p=>p.includes('thing') && p.includes('merge')), problems);

  spec = validMapSpec(); spec.merge = '';
  problems = app.collectionProblems({ thing: spec });
  ok('registry: a map with merge \'\' is refused, naming the collection and "merge"',
     problems.length > 0 && problems.some(p=>p.includes('thing') && p.includes('merge')), problems);

  spec = validMapSpec(); spec.merge = 'union';
  problems = app.collectionProblems({ thing: spec });
  ok('registry: a map declaring merge "union" (the key-union trap) is refused', problems.length > 0, problems);

  spec = validListSpec(); spec.merge = 'replace-whole';
  problems = app.collectionProblems({ thing: spec });
  ok('registry: a list declaring merge "replace-whole" is refused', problems.length > 0, problems);

  spec = validListSpec(); spec.merge = 'line-union';
  problems = app.collectionProblems({ thing: spec });
  ok('registry: a list declaring merge "line-union" is refused', problems.length > 0, problems);

  spec = validListSpec(); delete spec.soft;
  problems = app.collectionProblems({ thing: spec });
  ok('registry: an entry with soft missing is refused', problems.length > 0, problems);

  spec = validListSpec(); spec.sortby = 'date';
  problems = app.collectionProblems({ thing: spec });
  ok('registry: an unknown field "sortby" is refused and named', problems.some(p=>p.includes('sortby')), problems);

  problems = app.collectionProblems({
    a: (()=>{ const s = validListSpec(); delete s.merge; return s; })(),
    b: (()=>{ const s = validMapSpec(); s.merge = 'union'; return s; })(),
  });
  ok('registry: a registry with two bad entries yields problems naming both',
     problems.some(p=>p.startsWith('a:')) && problems.some(p=>p.startsWith('b:')), problems);

  ok('registry: {} yields a non-empty problem list and never throws', app.collectionProblems({}).length > 0);
  ok('registry: null yields a non-empty problem list and never throws', app.collectionProblems(null).length > 0);

  spec = validMapSpec(); spec.explicitFalse = true; // merge stays 'line-union'
  problems = app.collectionProblems({ thing: spec });
  ok('registry: a map with explicitFalse true and merge "line-union" is refused', problems.length > 0, problems);

  spec = validListSpec(); delete spec.columns;
  problems = app.collectionProblems({ thing: spec });
  ok('registry: missing columns is refused', problems.length > 0, problems);

  spec = validListSpec(); spec.columns = [];
  problems = app.collectionProblems({ thing: spec });
  ok('registry: an empty columns list is refused', problems.length > 0, problems);

  spec = validListSpec(); spec.columns = [{field:'date',label:'date'},{field:'date',label:'date'}];
  problems = app.collectionProblems({ thing: spec });
  ok('registry: a columns list with a duplicate is refused', problems.length > 0, problems);

  /* Task 2 (D-08/EXP-05): the column-object shape's own refusal rules, plus registry-level label
     uniqueness across collections. */
  spec = validListSpec(); spec.columns = ['date'];
  problems = app.collectionProblems({ thing: spec });
  ok('registry: a column that is not an object is refused', problems.length > 0, problems);

  spec = validListSpec(); spec.columns = [{label:'date'}];
  problems = app.collectionProblems({ thing: spec });
  ok('registry: a column with no field is refused', problems.length > 0, problems);

  spec = validListSpec(); spec.columns = [{field:'date'}];
  problems = app.collectionProblems({ thing: spec });
  ok('registry: a column with no label is refused', problems.length > 0, problems);

  ['id','mtime','deletedAt'].forEach(bad=>{
    spec = validListSpec(); spec.columns = [{field:bad, label:bad}];
    problems = app.collectionProblems({ thing: spec });
    ok('registry: a column declaring field '+bad+' is refused, naming it (EXP-05)',
       problems.length > 0 && problems.some(p=>p.includes(bad)), problems);
  });

  spec = validListSpec(); spec.columns = [{field:'date', label:'date', lable:'x'}];
  problems = app.collectionProblems({ thing: spec });
  ok('registry: an unknown column key is refused and named',
     problems.length > 0 && problems.some(p=>p.includes('lable')), problems);

  spec = validListSpec(); spec.columns = [{field:'date', label:'date', unit:''}];
  let unitProblems1 = app.collectionProblems({ thing: spec });
  spec = validListSpec(); spec.columns = [{field:'date', label:'date', unit:5}];
  let unitProblems2 = app.collectionProblems({ thing: spec });
  ok('registry: a column unit that is empty or not a string is refused',
     unitProblems1.length > 0 && unitProblems2.length > 0, { unitProblems1, unitProblems2 });

  spec = validListSpec(); spec.columns = [{field:'date', label:'date', zeroIsMissing:'yes'}];
  problems = app.collectionProblems({ thing: spec });
  ok('registry: a zeroIsMissing that is not a boolean is refused', problems.length > 0, problems);

  spec = validListSpec(); spec.columns = [{field:'date', label:'date', zeroIsMissing:true}];
  problems = app.collectionProblems({ thing: spec });
  ok('registry: zeroIsMissing true is accepted', problems.length === 0, problems);

  spec = validListSpec(); spec.label = 'A|B';
  let labelProblems1 = app.collectionProblems({ thing: spec });
  spec = validListSpec(); spec.columns = [{field:'date', label:'da\nte'}];
  let labelProblems2 = app.collectionProblems({ thing: spec });
  ok('registry: a label holding | or a line break is refused',
     labelProblems1.length > 0 && labelProblems2.length > 0, { labelProblems1, labelProblems2 });

  spec = validListSpec(); delete spec.label;
  problems = app.collectionProblems({ thing: spec });
  ok('registry: a collection with no label is refused', problems.length > 0, problems);

  spec = validListSpec(); spec.columns = [{field:'date', label:'date'},{field:'value', label:'date'}];
  problems = app.collectionProblems({ thing: spec });
  ok('registry: two columns repeating a label are refused', problems.length > 0, problems);

  problems = app.collectionProblems({
    a: (()=>{ const s = validListSpec(); s.label = 'Same'; return s; })(),
    b: (()=>{ const s = validMapSpec(); s.label = 'Same'; return s; })(),
  });
  ok('registry: two collections sharing a label are refused, naming both',
     problems.some(p=>p.startsWith('a:') && p.includes('Same')) && problems.some(p=>p.startsWith('b:') && p.includes('Same')),
     problems);

  spec = validMapSpec(); delete spec.format;
  problems = app.collectionProblems({ thing: spec });
  ok('registry: a map with no format is refused', problems.length > 0, problems);

  ok('registry: collectionProblems is idempotent — same input, same output twice',
     JSON.stringify(app.collectionProblems(app.COLLECTIONS)) === JSON.stringify(app.collectionProblems(app.COLLECTIONS)));

  /* The boot-refusal fixture: delete mobilityLog's merge field from the REAL source via a source
     transform, then boot that mutated copy and expect the module-eval throw. Assert the regex still
     matches BEFORE using it, so a reformatted registry fails loudly here instead of passing
     vacuously (the fixture silently no-op-ing and the boot "passing" for the wrong reason). */
  const mobilityMergeRe = /(mobilityLog:\{[^}]*?)merge:'replace-whole',\s*/;
  ok('registry: the refusal fixture still finds mobilityLog\'s merge field', mobilityMergeRe.test(app.__src));
  const transform = code => code.replace(mobilityMergeRe, '$1');
  let refusalThrew = null;
  try { loadApp(APP_PATH, null, { transform }); } catch(e){ refusalThrew = e; }
  ok('registry: boot refuses a map with no merge strategy',
     !!refusalThrew && /COLLECTIONS is invalid/.test(refusalThrew.message) && /mobilityLog/.test(refusalThrew.message),
     refusalThrew && refusalThrew.message);

  // ── REG-04: the promoted key functions, proven identical to their pre-phase bodies ──
  ok('keys: sessKey uses the stable id when present', app.sessKey({id:'x'}) === 'x', app.sessKey({id:'x'}));
  ok('keys: sessKey falls back to the composite key, skipped true ends "1"',
     app.sessKey({id:'', date:'2026-07-01', workout:'PUSH 1', endedAt:5, skipped:true}) === 'c_2026-07-01|PUSH 1|5|1',
     app.sessKey({id:'', date:'2026-07-01', workout:'PUSH 1', endedAt:5, skipped:true}));
  ok('keys:  …skipped false ends "0"',
     app.sessKey({id:'', date:'2026-07-01', workout:'PUSH 1', endedAt:5, skipped:false}) === 'c_2026-07-01|PUSH 1|5|0',
     app.sessKey({id:'', date:'2026-07-01', workout:'PUSH 1', endedAt:5, skipped:false}));
  ok('keys: todoKey({}) is "|"', app.todoKey({}) === '|', app.todoKey({}));
  ok('keys: cardioKey({}) is "||"', app.cardioKey({}) === '||', app.cardioKey({}));
  ok('keys: ideaKey({}) is "|"', app.ideaKey({}) === '|', app.ideaKey({}));
  ok('keys: hobbyKey({}) is "||"', app.hobbyKey({}) === '||', app.hobbyKey({}));
  ok('keys: hobbyKey falls back to hobby when item is absent',
     app.hobbyKey({date:'d', hobby:'h', cat:'c'}) === 'd|h|c', app.hobbyKey({date:'d', hobby:'h', cat:'c'}));
  ok('keys: todoKey joins created then text (field order)',
     app.todoKey({created:'a', text:'b'}) === 'a|b', app.todoKey({created:'a', text:'b'}));
  ok('keys: cardioKey joins date, type, minutes (field order)',
     app.cardioKey({date:'d', type:'t', minutes:5}) === 'd|t|5', app.cardioKey({date:'d', type:'t', minutes:5}));
  ok('keys: sessionSort orders by date first',
     app.sessionSort({date:'2026-07-01', endedAt:5}, {date:'2026-07-02', endedAt:1}) < 0);
  ok('keys:  …then by endedAt within the same date',
     app.sessionSort({date:'2026-07-01', endedAt:5}, {date:'2026-07-01', endedAt:1}) > 0);

  // ── REG-17: export rows match COLLECTIONS.<name>.columns exactly ──
  const sessionFixture = {
    date:'2026-07-01', workout:'PUSH 1',
    entries: [
      { name:'Barbell bench press', sets:[{w:'135',r:'8',skipped:false},{w:'135',r:'8',skipped:false}] },
      { name:'Incline press', sets:[{w:'50',r:'10',skipped:false}] },
    ],
    extras: { forearms: { name:'Wrist curls', sets:[{w:'0',r:'20',skipped:false}] } },
  };
  const sessRows = app.sessionRows(sessionFixture);
  ok('rows: sessionRows on two entries plus one extra gives 4 rows', sessRows.length === 4, sessRows.length);
  ok('rows: every row\'s keys equal the COLLECTIONS.sessions column fields, in order',
     sessRows.every(r => JSON.stringify(Object.keys(r)) === JSON.stringify(app.COLLECTIONS.sessions.columns.map(c=>c.field))),
     sessRows.map(r=>Object.keys(r)));
  ok('rows: set numbers are 1, 2, 1, 1 and the forearms row comes last',
     JSON.stringify(sessRows.map(r=>r.set)) === JSON.stringify([1,2,1,1]) && sessRows[3].exercise === 'Wrist curls',
     sessRows.map(r=>({set:r.set, exercise:r.exercise})));
  ok('rows: sessionRows({}) returns []', Array.isArray(app.sessionRows({})) && app.sessionRows({}).length === 0);
  ok('rows: sessionRows(null) returns []', Array.isArray(app.sessionRows(null)) && app.sessionRows(null).length === 0);
  ok('rows: sessionRows({entries:"x"}) returns []', Array.isArray(app.sessionRows({entries:'x'})) && app.sessionRows({entries:'x'}).length === 0);

  // ── D-04: a skipped workout day is exactly one "(skipped)" row, never silently absent ──
  const skippedFixture = { id:'k', date:'2026-08-02', workout:'PULL 1', skipped:true, reason:'slept in', entries:[] };
  ok('rows: a skipped session is one row — (skipped), no set, weight or reps (D-04)',
     JSON.stringify(app.sessionRows(skippedFixture)) === JSON.stringify([{date:'2026-08-02', workout:'PULL 1', exercise:'(skipped)', set:null, weight:null, reps:null}]),
     app.sessionRows(skippedFixture));
  const skippedWithEntry = { id:'k', date:'2026-08-02', workout:'PULL 1', skipped:true, reason:'slept in', entries:[{ name:'Back squat', sets:[{w:'185',r:'5'}] }] };
  ok('rows: a skipped session with entries is still one row (D-04)',
     app.sessionRows(skippedWithEntry).length === 1 && app.sessionRows(skippedWithEntry)[0].exercise === '(skipped)',
     app.sessionRows(skippedWithEntry));
  ok('rows: the skipped row\'s keys equal the sessions column fields',
     JSON.stringify(Object.keys(app.sessionRows(skippedFixture)[0])) === JSON.stringify(app.COLLECTIONS.sessions.columns.map(c=>c.field)),
     Object.keys(app.sessionRows(skippedFixture)[0]));

  ok('rows: journalRows(date, null) returns one row with entry ""',
     JSON.stringify(app.journalRows('2026-08-01', null)) === JSON.stringify([{date:'2026-08-01', entry:''}]),
     app.journalRows('2026-08-01', null));

  // ── D-05: dayFlagRows keeps only what Ian actually ticked — no bookkeeping keys, no done column ──
  ok('rows: dayFlagRows keeps only true flags, as date + item (D-05)',
     JSON.stringify(app.dayFlagRows('2026-08-01', {a:true, b:false})) === JSON.stringify([{date:'2026-08-01', item:'a'}]),
     app.dayFlagRows('2026-08-01', {a:true, b:false}));
  ok('rows: dayFlagRows drops __ keys such as __session (D-05)',
     JSON.stringify(app.dayFlagRows('d', {'Couch stretch':true, __session:'yoga'})) === JSON.stringify([{date:'d', item:'Couch stretch'}]),
     app.dayFlagRows('d', {'Couch stretch':true, __session:'yoga'}));
  ok('rows: dayFlagRows drops override keys and false flags (D-05)',
     JSON.stringify(app.dayFlagRows('d', {mowed:true, overrideMow:true, overrideWater:false, watered:false})) === JSON.stringify([{date:'d', item:'mowed'}]),
     app.dayFlagRows('d', {mowed:true, overrideMow:true, overrideWater:false, watered:false}));
  ok('rows: dayFlagRows ignores truthy values that are not true (D-05)',
     app.dayFlagRows('d', {a:'yes', b:1}).length === 0, app.dayFlagRows('d', {a:'yes', b:1}));
  ok('rows: dayFlagRows on an empty day returns []', app.dayFlagRows('d', {}).length === 0);
  ok('rows: dayFlagRows(date, "x") returns []', Array.isArray(app.dayFlagRows('2026-08-01', 'x')) && app.dayFlagRows('2026-08-01', 'x').length === 0);
  ok('rows: hobbyRows falls back to hobby when item is absent',
     app.hobbyRows({date:'d', hobby:'h', cat:'c'})[0].item === 'h', app.hobbyRows({date:'d', hobby:'h', cat:'c'}));

  // ── REG-11: MIGRATIONS stays hand-written, keys 1..SCHEMA with no gap ──
  const migKeys = Object.keys(app.MIGRATIONS).map(Number).sort((a,b)=>a-b);
  const expectedMigKeys = Array.from({length: app.SCHEMA}, (_,i)=>i+1);
  ok('migrations: MIGRATIONS keys are exactly 1..SCHEMA with no gap',
     JSON.stringify(migKeys) === JSON.stringify(expectedMigKeys), migKeys);
}

console.log('\n── an older build must not write over a migrated one ──');
ok('a remote from a newer schema is refused', app.remoteTooNew({ _schema: app.SCHEMA + 1 }) === true);
ok('the same schema is fine', app.remoteTooNew({ _schema: app.SCHEMA }) === false);
ok('an older remote is fine (that is what migrations are for)', app.remoteTooNew({ _schema: app.SCHEMA - 1 }) === false);
ok('a remote with no schema at all is fine', app.remoteTooNew({}) === false && app.remoteTooNew(null) === false);

/* Import is the only way a file you didn't write becomes your data. The old guard was "has a
   sessions array and a weights array", so a truncated download could sail through. */
console.log('\n── a bad backup is refused, and says why ──');
const realBackup = JSON.parse(JSON.stringify(Object.assign(app.blank(), {
  sessions:[{ id:'x', workout:'PUSH 1', date:'2026-07-15', endedAt:1, extras:{}, entries:[{name:'Barbell bench press', sets:[{w:'135',r:'8',skipped:false}]}] }],
  weights:[{ date:'2026-07-15', value:194.2 }] })));
ok('a good backup passes', app.validateBackup(realBackup) === null, app.validateBackup(realBackup));
const reject = (label, mutate, expect) => {
  const copy = JSON.parse(JSON.stringify(realBackup)); mutate(copy);
  const msg = app.validateBackup(copy);
  ok(label, typeof msg === 'string' && (!expect || expect.test(msg)), msg);
};
reject('a truncated file (no weights list) is refused', d=>{ delete d.weights; }, /weights/);
reject('  …and names what is missing', d=>{ delete d.sessions; }, /sessions/);
reject('a workout with no date is refused', d=>{ delete d.sessions[0].date; }, /date/);
reject('a workout with a mangled date is refused', d=>{ d.sessions[0].date = '15/07/2026'; }, /date/);
reject('a damaged set list is refused', d=>{ d.sessions[0].entries[0].sets = 'nope'; }, /set list/);
reject('a damaged exercise list is refused', d=>{ d.sessions[0].entries = 'nope'; }, /exercise list/);
reject('a non-numeric weigh-in is refused', d=>{ d.weights[0].value = 'heavy'; }, /number/);
reject('a backup from a NEWER app version is refused', d=>{ d._schema = app.SCHEMA + 3; }, /newer version/);
reject('a damaged journal is refused', d=>{ d.journal = []; }, /journal/);
ok('something that isn\'t a backup at all is refused', typeof app.validateBackup([1,2,3]) === 'string' && typeof app.validateBackup(null) === 'string');
ok('an OLDER backup is still accepted (that is what migrations are for)', (()=>{
  const old = JSON.parse(JSON.stringify(realBackup)); old._schema = 12; return app.validateBackup(old) === null; })());
ok('the real exported shape passes', app.validateBackup(app.normalize(JSON.parse(JSON.stringify(realBackup)))) === null);

console.log('\n── validateBackup() takes its shape checks from COLLECTIONS (REG-08) ──');
{
  const NAMED_MUTATIONS = [
    ['no weights list', d=>{ delete d.weights; }],
    ['no sessions list', d=>{ delete d.sessions; }],
    ['session missing date', d=>{ delete d.sessions[0].date; }],
    ['session mangled date', d=>{ d.sessions[0].date = '15/07/2026'; }],
    ['damaged set list', d=>{ d.sessions[0].entries[0].sets = 'nope'; }],
    ['damaged exercise list', d=>{ d.sessions[0].entries = 'nope'; }],
    ['non-numeric weigh-in', d=>{ d.weights[0].value = 'heavy'; }],
    ['newer app version', d=>{ d._schema = app.SCHEMA + 3; }],
    ['damaged journal', d=>{ d.journal = []; }],
    ['cardio set to a string', d=>{ d.cardio = 'x'; }],
    ['mobilityLog set to a list', d=>{ d.mobilityLog = []; }],
    ['lawnLog set to a number', d=>{ d.lawnLog = 3; }],
  ];
  NAMED_MUTATIONS.forEach(([label, mutate]) => {
    const copy = JSON.parse(JSON.stringify(realBackup)); mutate(copy);
    const derived = app.validateBackup(copy), legacy = app.validateBackup_legacy(copy);
    ok('validate: same message — ' + label, derived === legacy, [derived, legacy]);
    golden('validate:' + label, String(legacy), String(derived));
  });
}
{
  const DAMAGE_KINDS = [
    ['deleted', (d,name) => { delete d[name]; }],
    ['null', (d,name) => { d[name] = null; }],
    ['string', (d,name) => { d[name] = 'x'; }],
    ['number', (d,name) => { d[name] = 42; }],
    ['boolean', (d,name) => { d[name] = true; }],
    ['empty array', (d,name) => { d[name] = []; }],
    ['empty object', (d,name) => { d[name] = {}; }],
  ];
  let cases = 0, mismatch = null;
  let goldenMismatches = 0, firstGoldenMismatch = null;
  LEGACY_COLLECTIONS.forEach(name => {
    DAMAGE_KINDS.forEach(([kind, mutate]) => {
      const copy = JSON.parse(JSON.stringify(realBackup));
      mutate(copy, name);
      const derived = app.validateBackup(copy), legacy = app.validateBackup_legacy(copy);
      cases++;
      if(derived !== legacy && !mismatch) mismatch = { name, kind, derived, legacy };
      const label = 'validate:gen:' + name + ':' + kind;
      const match = golden(label, String(legacy), String(derived), { silent: true });
      if(!match){ goldenMismatches++; if(!firstGoldenMismatch) firstGoldenMismatch = label; }
    });
  });
  ok('validate: every legacy collection × every damage gives the same answer', !mismatch, { cases, mismatch });
  ok('golden: validate battery — derived answers match the recorded legacy answers',
     goldenMismatches === 0, { mismatches: goldenMismatches, first: firstGoldenMismatch });
}
{
  const twoFaultCases = [
    d=>{ d.cardio = 'x'; d.journal = []; },
    d=>{ delete d.sessions; d.petWeights = 'x'; },
    d=>{ d.todos = {}; d.lawnLog = []; },
  ];
  const results = twoFaultCases.map(mutate => {
    const copy = JSON.parse(JSON.stringify(realBackup)); mutate(copy);
    return [app.validateBackup(copy), app.validateBackup_legacy(copy)];
  });
  ok('validate: two faults report the same one first', results.every(([d,l]) => d === l), results);
}
{
  const derived = app.validateBackup({}), legacy = app.validateBackup_legacy({});
  ok('validate: an empty object is refused with the missing-sessions message',
     derived === legacy && typeof derived === 'string' && /sessions/.test(derived), [derived, legacy]);
}
{
  const copy = JSON.parse(JSON.stringify(realBackup));
  Object.keys(app.COLLECTIONS).forEach(name => { if(!app.COLLECTIONS[name].required) delete copy[name]; });
  const derived = app.validateBackup(copy), legacy = app.validateBackup_legacy(copy);
  ok('validate: a backup with no optional collections is accepted by both', derived === null && legacy === null, [derived, legacy]);
}
{
  const inputs = [[1,2,3], null, 'str', 5];
  const results = inputs.map(x => [app.validateBackup(x), app.validateBackup_legacy(x)]);
  ok('validate: a non-object is refused identically', results.every(([d,l]) => d === l && typeof d === 'string'), results);
}
{
  const src = app.validateBackup.toString();
  ok('validate: shape lists come from COLLECTIONS, per-row checks stay hand-written',
     /COLLECTIONS/.test(src) && /Workout /.test(src) && /Weigh-in on/.test(src) && !/'petWeights'\s*,\s*'cardio'/.test(src),
     src);
}

/* ─────────────────────────────────────────────────────────────────────────────────────────────
   Every screen still draws.

   render() catches anything a view throws and shows a friendly "Something broke on this screen"
   card. That is right for Ian mid-workout and wrong for this suite: until now an agent could break
   viewHistory() outright and every one of the 187 checks above would still pass, because none of
   them render anything. The failure would show up on the phone.

   So: seed one realistic database — every collection populated, plus the awkward states (a workout
   in progress, a first-run install with nothing logged) — then walk every tab and sub-tab. These
   assert only that a screen DRAWS. Behaviour is asserted above; this is the floor beneath it.
   ───────────────────────────────────────────────────────────────────────────────────────────── */
console.log('\n── every screen still draws ──');

function populatedDB(a){
  const d = a.blank();
  d.sessions = [
    { id:'s1', workout:'PUSH 1', date:dayOff(-9), endedAt:1, durationMin:52, extras:{},
      entries:[{ name:'Barbell bench press', sets:[{w:'135',r:'8',skipped:false},{w:'135',r:'7',skipped:false}] }] },
    { id:'s2', workout:'LEGS 1', date:dayOff(-7), endedAt:2, durationMin:61, extras:{},
      entries:[{ name:'Back squat', sets:[{w:'185',r:'6',skipped:false}] }], stairs:{ minutes:12 } },
    { id:'s3', workout:'PULL 1', date:dayOff(-5), endedAt:3, skipped:true, reason:'slept in', entries:[] },
    { id:'s4', workout:'PUSH 2', date:dayOff(-3), endedAt:4, extras:{},
      entries:[{ name:'Barbell bench press', sets:[{w:'140',r:'8',skipped:false}] }] },
    /* a soft-deleted row: every view must read through liveSessions() and never show this */
    { id:'s5', workout:'LEGS 2', date:dayOff(-2), endedAt:5, entries:[], deletedAt:Date.now(), mtime:Date.now() },
  ];
  d.weights    = [{ date:dayOff(-9), value:196.4 }, { date:dayOff(-4), value:195.1 }, { date:today, value:194.2 }];
  d.petWeights = [{ date:dayOff(-30), value:12.1 }, { date:today, value:12.6 }];
  d.cardio     = [{ id:'c1', date:dayOff(-6), kind:'run', minutes:28, miles:2.8 }];
  d.ideas      = [{ id:'i1', text:'A hostile <script> & "quotes" — must be escaped', at:Date.now() }];
  d.todos      = [{ text:'Order more creatine', created:dayOff(-4) }];
  d.hobbyLog   = [{ date:dayOff(-1), item:'🎨 Mini-painting', cat:'hobby' }];
  d.journal    = { [dayOff(-1)]: 'Felt strong.', [today]: '' };
  d.mobilityLog= { [today]: { 'Couch stretch': true } };
  d.lawnLog    = { [dayOff(-4)]: { mow:true }, [dayOff(-1)]: { water:true } };
  d.lawn       = { lat:41.88, lon:-87.63 };
  d.wx         = makeWx({ todayISO: today });
  d.sleep      = [
    { id:'sl1', date:dayOff(-1), hours:7.5, quality:4, note:'A hostile <script> note & "quotes"', mtime:1 },
    { id:'sl2', date:dayOff(-2), hours:6, quality:2, note:'', deletedAt:Date.now(), mtime:Date.now() },
  ];
  return d;
}

/* Each entry: [label, how to get there]. `sub` null means the tab has no sub-nav. */
const SCREENS = [];
(app.TABS || []).forEach(t => {
  if(t.sub) t.sub.forEach(([k, label]) => SCREENS.push([`${t.label} → ${label}`, t.id, k]));
  else SCREENS.push([t.label, t.id, null]);
});
ok('the router exposes every tab', SCREENS.length >= 7, SCREENS.map(s=>s[0]));

/* Drive the REAL router, exactly as a tap does: go(tab) → setSub(sub) → render(). Then read the
   container. render() never throws by design, so the tell is the error card's own wording. */
function drawEvery(a, stateLabel){
  const appEl = a.__sandbox.document.getElementById('app');
  SCREENS.forEach(([label, tab, sub]) => {
    appEl.innerHTML = '';
    let threw = null;
    try { a.go(tab); if(sub) a.setSub(sub); } catch(e){ threw = e; }
    const html = appEl.innerHTML || '';
    const broke = /Something broke on this screen/.test(html);
    const detail = broke ? (html.match(/<p class="muted"[^>]*>([^<]*)</) || [,'?'])[1] : (threw && threw.message);
    ok(`${stateLabel}: ${label}`, !threw && !broke && html.length > 0, detail);
  });
}

const uiFull = loadApp(APP_PATH);
uiFull.DB = populatedDB(uiFull);
drawEvery(uiFull, 'with data');

/* First run. Empty lists are where views divide by zero, index [-1], or read .value off undefined —
   and it is the one state Ian will never see again, so nothing else would catch it. */
const uiEmpty = loadApp(APP_PATH);
uiEmpty.DB = uiEmpty.blank();
drawEvery(uiEmpty, 'fresh install');

/* Mid-workout. viewPicker and viewActive are the same tab in two states; only one is ever on
   screen, so a break in the other stays invisible until Ian is standing at the rack. */
const draftFor = (a, workout) => ({
  workout, date:today, startedAt:Date.now(), sessionNote:'', extras:{},
  stairs:{ level:'', seconds:'', skipped:false, reason:'' },
  entries: a.PROGRAM[workout].slots.map(s => ({ name:s.examples[0], deload:false, sets:[{w:'',r:'',skipped:false}] })),
});
const uiDraft = loadApp(APP_PATH);
{
  const d = populatedDB(uiDraft);
  d.draft = draftFor(uiDraft, 'PUSH 1');
  uiDraft.DB = d;
  drawEvery(uiDraft, 'mid-workout');
}

/* ── a draft that did not come from startWorkout() ──
   Found by the smoke check above on its first run. viewActive walks .entries, .stairs and .extras
   blind, because startWorkout() always builds all three — but a draft synced from a device on an
   older schema, or restored from a hand-edited backup, can be short a field. mergeDB already nulled
   a draft whose `workout` was unknown for this exact reason; it was one field short, and the screen
   it takes out is the Log tab. normalizeDraft() now repairs what it can and nulls the rest, on both
   the boot path and the merge path (mergeDB's output does not pass back through normalize). */
console.log('\n── a malformed draft must not take out the Log tab ──');
{
  const a = loadApp(APP_PATH);
  const withDraft = mutate => { const d = populatedDB(a); d.draft = draftFor(a,'PUSH 1'); mutate(d.draft); return d; };
  const drawsLog = d => {
    a.DB = a.normalize(d);
    const appEl = a.__sandbox.document.getElementById('app');
    appEl.innerHTML = '';
    try { a.go('train'); a.setSub('log'); } catch(e){ return 'threw: ' + e.message; }
    return /Something broke on this screen/.test(appEl.innerHTML) ? 'error card' : true;
  };
  ok('a draft with no stairs still draws',      drawsLog(withDraft(k=>{ delete k.stairs; }))      === true, drawsLog(withDraft(k=>{ delete k.stairs; })));
  ok('a draft with no extras still draws',      drawsLog(withDraft(k=>{ delete k.extras; }))      === true);
  ok('a draft with no sessionNote still draws', drawsLog(withDraft(k=>{ delete k.sessionNote; })) === true);
  ok('  …and the repair fills the missing field rather than dropping the workout', (()=>{
    const d = a.normalize(withDraft(k=>{ delete k.stairs; }));
    return d.draft && d.draft.workout === 'PUSH 1' && d.draft.stairs && d.draft.stairs.seconds === '';
  })());
  ok('an unusable draft is dropped, not half-repaired', (()=>{
    const d = a.normalize(withDraft(k=>{ k.workout = 'NOT A WORKOUT'; }));
    return d.draft === null;
  })());
  ok('  …same for a draft with no entries list', a.normalize(withDraft(k=>{ delete k.entries; })).draft === null);
  ok('a null draft stays null', a.normalize(populatedDB(a)).draft === null);

  /* The merge path repairs too — mergeDB's output never passes back through normalize(). */
  ok('the sync merge repairs a malformed draft as well', (()=>{
    const remote = populatedDB(a); remote.draft = draftFor(a,'PUSH 1'); delete remote.draft.stairs;
    remote.updatedAt = Date.now();
    const local = populatedDB(a); local.updatedAt = Date.now() - 60000;
    const out = a.mergeDB(remote, local, false);
    return out.draft && out.draft.workout === 'PUSH 1' && !!out.draft.stairs;
  })());
  ok('  …and still drops one with an unknown workout (the 2026-07-25 guard)', (()=>{
    const remote = populatedDB(a); remote.draft = draftFor(a,'PUSH 1'); remote.draft.workout = 'GONE';
    remote.updatedAt = Date.now();
    const local = populatedDB(a); local.updatedAt = Date.now() - 60000;
    return a.mergeDB(remote, local, false).draft === null;
  })());
}

/* The escaping convention, checked on the one string in the seed that is trying to break out. */
{
  const appEl = uiFull.__sandbox.document.getElementById('app');
  appEl.innerHTML = ''; uiFull.go('today');
  const everyScreen = SCREENS.map(([, tab, sub]) => { appEl.innerHTML=''; uiFull.go(tab); if(sub) uiFull.setSub(sub); return appEl.innerHTML; }).join('');
  ok('a user string never reaches the page as live markup', !/<script>/i.test(everyScreen));
}

console.log('\n── export for Claude (EXP-01…EXP-08) ──');
/* mdCells splits one rendered table line the way a GFM parser does: a backslash consumes itself and
   the next character into the current cell, and an unconsumed `|` ends a cell. The blank text before
   the first pipe and after the last one is dropped. Escapes are kept raw (not decoded), since the
   point is to count cells and read exact text, not to re-render Markdown. */
function mdCells(line){
  const cells = [];
  let cur = '';
  for(let i=0;i<line.length;i++){
    const ch = line[i];
    if(ch==='\\' && i+1<line.length){ cur += ch+line[i+1]; i++; }
    else if(ch==='|'){ cells.push(cur); cur=''; }
    else cur += ch;
  }
  cells.push(cur);
  if(cells.length && cells[0].trim()==='') cells.shift();
  if(cells.length && cells[cells.length-1].trim()==='') cells.pop();
  return cells.map(c=>c.trim());
}
/* mdSections maps each "## " heading to { empty, header, rows }, reading the block that follows it
   exactly the way buildMarkdownExport() writes it: one blank line, then either "No entries" or a
   header line, a delimiter line, and one line per row, up to the next blank line. */
function mdSections(md){
  const lines = md.split('\n');
  const sections = {};
  let i = 0;
  while(i < lines.length){
    if(lines[i].startsWith('## ')){
      const heading = lines[i].slice(3).trim();
      let j = i+1;
      while(j < lines.length && lines[j].trim()==='') j++;
      if(j < lines.length && lines[j].trim()==='No entries'){
        sections[heading] = { empty:true, header:null, rows:[] };
        i = j+1; continue;
      }
      const header = mdCells(lines[j]);
      let k = j+2; // skip the header line and the delimiter line
      const rows = [];
      while(k < lines.length && lines[k].trim()!==''){ rows.push(mdCells(lines[k])); k++; }
      sections[heading] = { empty:false, header, rows };
      i = k; continue;
    }
    i++;
  }
  return sections;
}
const EXPORTER_FNS = ['mdEscape','mdCell','mdHeader','exportRows','buildMarkdownExport','exportMarkdown','downloadMarkdown'];

const X = loadApp(APP_PATH);
X.DB = populatedDB(X);
const xClicks = [];
X.__sandbox.document.createElement = () => {
  const node = { href:'', download:'', click(){ xClicks.push({ href: node.href, download: node.download }); } };
  return node;
};
const xBlobs = [];
X.__sandbox.Blob = function(parts, opts){ this.parts = parts; this.type = opts && opts.type; xBlobs.push(this); };

{
  const html = X.viewData();
  const jsonIdx = html.indexOf('Export backup (.json)');
  const claudeIdx = html.indexOf('Export for Claude (.md)');
  const importIdx = html.indexOf('Import backup');
  const jsonBtnEnd = jsonIdx >= 0 ? html.indexOf('</button>', jsonIdx) : -1;
  // Between the JSON button's close and the Claude button's own text sits exactly one <button — the
  // Claude button's own opening tag. A second one would mean another button sits in between.
  const between = jsonBtnEnd >= 0 && claudeIdx >= 0 ? html.slice(jsonBtnEnd, claudeIdx) : '';
  const buttonTagsBetween = (between.match(/<button/g) || []).length;
  const onclickCount = (X.__src.match(/onclick="exportMarkdown\(\)"/g) || []).length;
  ok('export: Settings shows Export for Claude (.md) directly below Export backup (.json) (D-02)',
     jsonIdx >= 0 && claudeIdx > jsonIdx && importIdx > claudeIdx && buttonTagsBetween === 1 && onclickCount === 1,
     { jsonIdx, claudeIdx, importIdx, buttonTagsBetween, onclickCount });
}

let exportResult;
{
  const before = xClicks.length;
  exportResult = X.exportMarkdown();
  const newClicks = xClicks.slice(before);
  const blob = xBlobs[xBlobs.length-1];
  ok('export: tapping it downloads ppl-export-2026-08-07.md as text/markdown (D-03/EXP-01)',
     exportResult==='download' && newClicks.length===1 && newClicks[0].download==='ppl-export-2026-08-07.md' && !!blob && blob.type==='text/markdown',
     { exportResult, newClicks, blobType: blob && blob.type });
}

{
  const blob = xBlobs[xBlobs.length-1];
  const downloadedText = blob && blob.parts && blob.parts[0];
  ok('export: the downloaded text is exactly buildMarkdownExport()', downloadedText === X.buildMarkdownExport(),
     downloadedText && downloadedText.slice(0, 80));
}

{
  const text = X.buildMarkdownExport();
  ok('export: the file opens with its title and a Generated timestamp',
     text.startsWith('# PPL Tracker export\n') && text.indexOf('\n- Generated: 2026-08-07T17:00:00.000Z\n') >= 0,
     text.slice(0, 120));
}

{
  const sections = mdSections(X.buildMarkdownExport());
  const workouts = sections['Workouts'];
  ok('export: Workouts header reads date | workout | exercise | set | weight (lb) | reps (D-08/D-10)',
     !!workouts && JSON.stringify(workouts.header) === JSON.stringify(['date','workout','exercise','set','weight (lb)','reps']),
     workouts && workouts.header);

  const cardio = sections['Cardio'];
  ok('export: Cardio header reads date | type | minutes | distance (km) | note (D-08)',
     !!cardio && JSON.stringify(cardio.header) === JSON.stringify(['date','type','minutes','distance (km)','note']),
     cardio && cardio.header);

  const weighins = sections['Weigh-ins'];
  const wRow = weighins && weighins.rows.find(r=>r[0]===dayOff(-9));
  ok('export: a live weigh-in reaches Weigh-ins through liveOf (EXP-04)',
     !!wRow && wRow[1]==='196.4', wRow);

  ok('export: the soft-deleted LEGS 2 session is absent (EXP-04)',
     !!workouts && !workouts.rows.some(r=>r[1]==='LEGS 2'), workouts && workouts.rows);

  const badRows = [];
  Object.keys(sections).forEach(label=>{
    const sec = sections[label];
    if(sec.empty) return;
    sec.rows.forEach((r,i)=>{ if(r.length !== sec.header.length) badRows.push(label+':'+i); });
  });
  ok('export: every table row has its header\'s cell count, even with the hostile idea text (EXP-07)',
     badRows.length===0, badRows);
}

{
  const before = xClicks.length;
  X.exportData();
  const newClicks = xClicks.slice(before);
  ok('export: the JSON backup still downloads ppl-backup-2026-08-07.json and records lastBackupAt (EXP-01)',
     newClicks.length===1 && newClicks[0].download==='ppl-backup-2026-08-07.json' && typeof X.DB.lastBackupAt==='number',
     { newClicks, lastBackupAt: X.DB.lastBackupAt });
}

/* Task 2 (EXP-02): a probe list and a probe map declared by source transform (the SLEEP-05 `probe`
   instance) each export their own section with no exporter edit. Set probe.DB explicitly so this
   proof does not depend on whatever the SLEEP-05 block last left it as. */
{
  probe.DB = Object.assign(probe.blank(), {
    probeList: [
      { id:'p1', date:'2026-08-01', value:1, mtime:1 },
      { id:'p2', date:'2026-08-02', value:2, mtime:1, deletedAt:5 },
    ],
    probeMap: { '2026-08-03': { a:true } },
  });
  const sections = mdSections(probe.buildMarkdownExport());
  const list = sections['Probe list'];
  const map = sections['Probe map'];
  ok('export: a probe collection declared in one line exports its own section with no exporter edit (EXP-02)',
     !!list && !list.empty && list.rows.length === 1 && JSON.stringify(list.rows[0]) === JSON.stringify(['2026-08-01','1']),
     list);
  ok('export: the probe\'s mass column is labelled from DB.unit and its deleted row is absent (EXP-02/EXP-04)',
     !!list && JSON.stringify(list.header) === JSON.stringify(['date','value (lb)']) && !list.rows.some(r=>r[0]==='2026-08-02'),
     list);
  ok('export: a probe map exports its own section (EXP-02)',
     !!map && !map.empty && map.rows.length === 1 && map.rows[0][0] === '2026-08-03',
     map);

  const headings = Object.keys(sections);
  const expectedOrder = Object.keys(probe.COLLECTIONS).map(n=>probe.COLLECTIONS[n].label);
  ok('export: sections follow COLLECTIONS order (D-12)',
     JSON.stringify(headings) === JSON.stringify(expectedOrder) && headings[0]==='Probe list' && headings[1]==='Probe map',
     headings);
}

{
  const fresh = loadApp(APP_PATH);
  fresh.DB = fresh.blank();
  let threw = null, text;
  try { text = fresh.buildMarkdownExport(); } catch(e){ threw = e; }
  const sections = threw ? {} : mdSections(text);
  const headings = Object.keys(sections);
  ok('export: a fresh install exports every section as No entries (D-06)',
     !threw && headings.length === Object.keys(app.COLLECTIONS).length && headings.every(h=>sections[h].empty),
     { threw: threw && threw.message, count: headings.length });
}

{
  const sections = mdSections(X.buildMarkdownExport());
  const mobility = sections['Mobility'];
  const lawn = sections['Lawn'];
  ok('export: Mobility and Lawn share dayFlagRows but export as two sections (EXP-02 adjacency)',
     !!mobility && !!lawn && mobility.rows.length === 1 && lawn.rows.length === 2,
     { mobility, lawn });
}

{
  const stripComments = src => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const collectionNames = Object.keys(app.COLLECTIONS);
  const liveWrappers = ['liveSessions','liveWeights','livePetWeights','liveCardio','liveIdeas','liveTodos','liveHobbyLog'];
  const bad = [];
  EXPORTER_FNS.forEach(name=>{
    const src = stripComments(app[name].toString());
    collectionNames.forEach(cn=>{ if(new RegExp('\\b'+cn+'\\b').test(src)) bad.push(name+':'+cn); });
    liveWrappers.forEach(w=>{ if(src.indexOf(w)>=0) bad.push(name+':'+w); });
    if(/['"]lb['"]/.test(src)) bad.push(name+':lb');
    if(/['"]kg['"]/.test(src)) bad.push(name+':kg');
    if(/['"]km['"]/.test(src)) bad.push(name+':km');
    if(/\bfmtDate\b/.test(src)) bad.push(name+':fmtDate');
    if(/\bkmToDisp\b/.test(src)) bad.push(name+':kmToDisp');
    if(/\besc\(/.test(src)) bad.push(name+':esc(');
  });
  ok('export: no exporter function names a collection, a unit, a live wrapper, fmtDate, kmToDisp or esc (EXP-02)',
     bad.length === 0, bad);
}

{
  const stripComments = src => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const forbidden = ['save(','saveLocal(','touch(','lastBackupAt','backupSnoozeAt','fetch(','firebase','pushNow','runTransaction'];
  const bad = [];
  EXPORTER_FNS.forEach(name=>{
    const src = stripComments(app[name].toString());
    forbidden.forEach(tok=>{ if(src.indexOf(tok)>=0) bad.push(name+':'+tok); });
  });
  ok('export: no exporter function persists, touches backup bookkeeping or reaches the network',
     bad.length === 0, bad);
}

{
  const stripComments = src => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  ok('export: exportRows reads lists through liveOf (EXP-04)',
     stripComments(app.exportRows.toString()).indexOf('liveOf(') >= 0);
}

/* Task 1 (D-04/D-05/EXP-03): the skipped-day row, the mobility/lawn bookkeeping filter, and the
   workout-flattening edges. Each fixture below is its own loadApp(APP_PATH) instance so a session
   shape mistake in one test can't bleed into another. */
{
  const sections = mdSections(X.buildMarkdownExport());
  const workouts = sections['Workouts'];
  const skippedRow = workouts && workouts.rows.find(r=>r[1]==='PULL 1' && r[0]===dayOff(-5));
  ok('export: a skipped workout day is one Workouts row (D-04)',
     !!skippedRow && JSON.stringify(skippedRow) === JSON.stringify([dayOff(-5),'PULL 1','(skipped)','—','—','—']) &&
     !workouts.rows.some(r=>r.some(c=>c==='slept in')),
     workouts && workouts.rows);

  const mobility = sections['Mobility'];
  const lawn = sections['Lawn'];
  ok('export: Mobility and Lawn export date + item only (D-05)',
     !!mobility && JSON.stringify(mobility.header) === JSON.stringify(['date','stretch']) &&
     !!lawn && JSON.stringify(lawn.header) === JSON.stringify(['date','task']) && lawn.rows.length === 2,
     { mobilityHeader: mobility && mobility.header, lawnHeader: lawn && lawn.header, lawnRows: lawn && lawn.rows });
}

{
  const a2 = loadApp(APP_PATH);
  a2.DB = Object.assign(a2.blank(), {
    sessions: [ { id:'e1', date:'2026-08-01', workout:'PUSH 1', endedAt:1, entries:[
      { name:'Exercise A', sets:[{w:'135',r:'8'},{w:'135',r:'8'}] },
    ], extras:{} } ],
  });
  const workouts = mdSections(a2.buildMarkdownExport())['Workouts'];
  ok('export: sets number from 1 within an exercise (EXP-03 boundary)',
     !!workouts && workouts.rows.length===2 && workouts.rows[0][3]==='1' && workouts.rows[1][3]==='2',
     workouts && workouts.rows);
  ok('export: two identical sets stay two rows (EXP-03 adjacency)',
     !!workouts && workouts.rows.length===2, workouts && workouts.rows);
}

{
  const a3 = loadApp(APP_PATH);
  a3.DB = Object.assign(a3.blank(), {
    sessions: [ { id:'e2', date:'2026-08-01', workout:'PUSH 1', endedAt:1, entries:[], extras:{} } ],
  });
  const workouts = mdSections(a3.buildMarkdownExport())['Workouts'];
  ok('export: a live session with no sets contributes no rows (EXP-03 boundary)',
     !!workouts && workouts.empty === true, workouts);
}

{
  const a4 = loadApp(APP_PATH);
  a4.DB = Object.assign(a4.blank(), {
    sessions: [ { id:'e3', date:'2026-08-01', workout:'PUSH 1', endedAt:1, entries:[
      { name:'Exercise A', sets:[{w:187.5,r:5},{w:'0',r:'12'},{w:'',r:''}] },
    ], extras:{} } ],
  });
  const rows = mdSections(a4.buildMarkdownExport())['Workouts'].rows;
  ok('export: weight and reps are written exactly as stored (EXP-03 precision)',
     rows[0][4]==='187.5' && rows[0][5]==='5' && rows[1][4]==='0' && rows[1][5]==='12',
     rows);
  ok('export: an unfilled set writes — for weight and reps (EXP-03 empty/D-09)',
     rows[2][4]==='—' && rows[2][5]==='—', rows);
}

{
  const a5 = loadApp(APP_PATH);
  a5.DB = Object.assign(a5.blank(), {
    sessions: [ { id:'e4', date:'2026-08-01', workout:'PUSH 1', endedAt:1,
      entries:[
        { name:'A', sets:[{w:'1',r:'1'},{w:'2',r:'2'}] },
        { name:'B', sets:[{w:'3',r:'3'}] },
      ],
      extras:{ forearms: { name:'C', sets:[{w:'4',r:'4'}] } },
    } ],
  });
  const rows = mdSections(a5.buildMarkdownExport())['Workouts'].rows;
  ok('export: rows keep entries-then-extras order, sets ascending (EXP-03 ordering)',
     JSON.stringify(rows.map(r=>r[2]+r[3])) === JSON.stringify(['A1','A2','B1','C1']),
     rows);
}

/* Task 2 (D-11/D-09/D-07): oldest-first stable order, cardio's zero-as-missing rule, and proof that
   deleted rows, internal ids and non-registry data never reach the file. */
{
  const a1 = loadApp(APP_PATH);
  a1.DB = Object.assign(a1.blank(), {
    ideas: [
      { id:'i3', date:'2026-08-05', text:'third' },
      { id:'i2', date:'2026-08-03', text:'second' },
      { id:'i1', date:'2026-08-01', text:'first' },
    ],
  });
  const ideasRows = mdSections(a1.buildMarkdownExport())['Ideas'].rows;
  ok('export: rows run oldest first (D-11)',
     JSON.stringify(ideasRows.map(r=>r[0])) === JSON.stringify(['2026-08-01','2026-08-03','2026-08-05']),
     ideasRows);
}

{
  const a2 = loadApp(APP_PATH);
  a2.DB = Object.assign(a2.blank(), {
    sessions: [
      { id:'p1', date:'2026-08-01', workout:'PUSH 1', endedAt:1, entries:[{name:'A', sets:[{w:'1',r:'1'}]}], extras:{} },
      { id:'p2', date:'2026-08-01', workout:'PULL 1', endedAt:2, entries:[{name:'B', sets:[{w:'2',r:'2'}]}], extras:{} },
    ],
  });
  const wRows = mdSections(a2.buildMarkdownExport())['Workouts'].rows;
  ok('export: equal dates keep stored order — sessions (D-11 stable)',
     wRows.length===2 && wRows[0][1]==='PUSH 1' && wRows[1][1]==='PULL 1', wRows);
}

{
  const a3 = loadApp(APP_PATH);
  a3.DB = Object.assign(a3.blank(), {
    ideas: [ { id:'x', date:'2026-08-01', text:'x' }, { id:'y', date:'2026-08-01', text:'y' } ],
  });
  const iRows = mdSections(a3.buildMarkdownExport())['Ideas'].rows;
  ok('export: equal dates keep stored order — ideas (D-11 stable)',
     iRows[0][1]==='x' && iRows[1][1]==='y', iRows);
}

{
  const a4 = loadApp(APP_PATH);
  a4.DB = Object.assign(a4.blank(), { journal: { '2026-08-05':'b', '2026-08-01':'a' } });
  const jRows = mdSections(a4.buildMarkdownExport())['Journal'].rows;
  ok('export: map days run oldest first (D-11)',
     jRows.map(r=>r[0]).join(',') === '2026-08-01,2026-08-05', jRows);
}

{
  const a5 = loadApp(APP_PATH);
  a5.DB = Object.assign(a5.blank(), {
    ideas: [ { id:'nodate', text:'no date idea' }, { id:'dated', date:'2026-08-01', text:'dated' } ],
  });
  const iRows = mdSections(a5.buildMarkdownExport())['Ideas'].rows;
  ok('export: a row with no date sorts first and writes — (D-11/D-09)',
     iRows[0][0]==='—' && iRows[1][0]==='2026-08-01', iRows);
}

{
  const a6 = loadApp(APP_PATH);
  a6.DB = Object.assign(a6.blank(), {
    weights: [ { date:'2026-08-01', value:190, deletedAt:5, mtime:5 }, { date:'2026-08-01', value:191 } ],
  });
  const wRows = mdSections(a6.buildMarkdownExport())['Weigh-ins'].rows;
  ok('export: a deleted row sharing a date with a live row leaves only the live row (EXP-04 adjacency)',
     wRows.length===1 && JSON.stringify(wRows[0]) === JSON.stringify(['2026-08-01','191']),
     wRows);
}

{
  const sleepBefore = mdSections(X.buildMarkdownExport())['Sleep'];
  X.softDelete(X.DB.sleep, s=>s.id==='sl1');
  const sleepAfter = mdSections(X.buildMarkdownExport())['Sleep'];
  ok('export: deleting a row and exporting again drops it (EXP-04)',
     !!sleepBefore && !sleepBefore.empty && sleepBefore.rows.length===1 &&
     !!sleepAfter && sleepAfter.empty === true,
     { sleepBefore, sleepAfter });
}

{
  const a7 = loadApp(APP_PATH);
  a7.DB = a7.blank();
  delete a7.DB.cardio;
  a7.DB.journal = 'x';
  a7.DB.lawnLog = null;
  let threw = null, sections = {};
  try { sections = mdSections(a7.buildMarkdownExport()); } catch(e){ threw = e; }
  ok('export: a missing list and a non-object or null map export No entries (EXP-04 empty)',
     !threw && !!sections['Cardio'] && sections['Cardio'].empty && !!sections['Journal'] && sections['Journal'].empty && !!sections['Lawn'] && sections['Lawn'].empty,
     { threw: threw && threw.message, sections });
}

{
  const a8 = loadApp(APP_PATH);
  const d = populatedDB(a8);
  d.cardio = [ { id:'c9', date:dayOff(-2), type:'Walk', minutes:20, distanceKm:1.5, note:'n', source:'manual', mtime:1 } ];
  a8.DB = d;
  const text = a8.buildMarkdownExport();
  const sections = mdSections(text);
  const badHeaderCell = Object.keys(sections).some(h => !sections[h].empty && sections[h].header.some(c=>['id','mtime','deletedAt','source'].includes(c)));
  const badRowCell = Object.keys(sections).some(h => !sections[h].empty && sections[h].rows.some(r=>r.some(c=>['s1','c9','i1','sl1'].includes(c))));
  ok('export: no id, mtime, deletedAt or source column or value leaks (EXP-05)',
     !badHeaderCell && !badRowCell && text.indexOf('deletedAt')<0 && text.indexOf('mtime')<0,
     { badHeaderCell, badRowCell });
}

{
  const a9 = loadApp(APP_PATH);
  const d = populatedDB(a9);
  d.petName = 'Rover-Unique-Pet';
  d.lawn = { lat:44.9412, lon:-93.3611, label:'Home-Label-Unique' };
  d.exercises = [ { id:'x1', name:'Unique Registry Lift' } ];
  d.draft = draftFor(a9, 'PUSH 1');
  d.draft.sessionNote = 'Draft-Note-Unique';
  a9.DB = d;
  const text = a9.buildMarkdownExport();
  const markers = ['Rover-Unique-Pet','44.9412','-93.3611','Home-Label-Unique','Unique Registry Lift','Draft-Note-Unique','🧊 Clean out the fridge'];
  const found = markers.filter(m=>text.indexOf(m)>=0);
  ok('export: nothing outside COLLECTIONS is exported (D-07)', found.length===0, found);
}

{
  const a10 = loadApp(APP_PATH);
  a10.DB = Object.assign(a10.blank(), {
    cardio: [
      { id:'c2', date:'2026-08-02', type:'Longboard', minutes:30, distanceKm:0, note:'' },
      { id:'c3', date:'2026-08-03', type:'Walk', minutes:0, distanceKm:3.2, note:'x' },
    ],
  });
  const rows = mdSections(a10.buildMarkdownExport())['Cardio'].rows;
  ok('export: cardio\'s blank minutes or distance writes — (D-09)',
     JSON.stringify(rows[0]) === JSON.stringify(['2026-08-02','Longboard','30','—','—']) &&
     JSON.stringify(rows[1]) === JSON.stringify(['2026-08-03','Walk','—','3.2','x']),
     rows);
}

{
  const a11 = loadApp(APP_PATH);
  a11.DB = Object.assign(a11.blank(), {
    sessions: [ { id:'z1', date:'2026-08-01', workout:'PUSH 1', endedAt:1, entries:[{name:'A', sets:[{w:0,r:10}]}], extras:{} } ],
  });
  const rows = mdSections(a11.buildMarkdownExport())['Workouts'].rows;
  ok('export: a column without zeroIsMissing still writes a real 0',
     rows[0][4]==='0', rows);
}

/* Plan 02-03 Task 1 (D-13/EXP-08): the header block — what the file is, when it was generated, the
   date range across sections, and a row count per section — plus the EXP-06/EXP-07 battery that
   pins the unit/ISO-date/escaping guarantees plan 02-01 already shipped. */
{
  const text = X.buildMarkdownExport();
  ok('export: the header says what the file is and when it was generated (EXP-08/D-13)',
     text.startsWith('# PPL Tracker export\n') &&
     text.indexOf('\nLogged data from PPL Tracker') >= 0 &&
     text.indexOf('\n- Generated: 2026-08-07T17:00:00.000Z\n') >= 0,
     text.slice(0, 200));

  ok('export: the header states the date range across sections (EXP-08/D-13)',
     text.indexOf('\n- Date range: 2026-07-08 to 2026-08-07\n') >= 0,
     text.split('\n').find(l=>l.startsWith('- Date range:')));
}

{
  const text = X.buildMarkdownExport();
  const headerLine = text.split('\n').find(l=>l.startsWith('- Rows per section: '));
  const entries = headerLine ? headerLine.slice('- Rows per section: '.length).split(' · ') : [];
  const labels = entries.map(e=>e.slice(0, e.lastIndexOf(': ')));
  const expectedLabels = Object.keys(X.COLLECTIONS).map(n=>X.COLLECTIONS[n].label);
  const formatOk = entries.every(e=>/: (\d+ rows?|0 entries)$/.test(e));
  ok('export: the header lists every section\'s row count in COLLECTIONS order (D-13)',
     !!headerLine && JSON.stringify(labels) === JSON.stringify(expectedLabels) && formatOk,
     { headerLine, labels });

  const sections = mdSections(text);
  const mismatches = [];
  entries.forEach(e=>{
    const idx = e.lastIndexOf(': ');
    const label = e.slice(0, idx);
    const countStr = e.slice(idx+2);
    const sec = sections[label];
    const actual = !sec || sec.empty ? 0 : sec.rows.length;
    const expectedCount = countStr === '0 entries' ? 0 : parseInt(countStr, 10);
    if(expectedCount !== actual) mismatches.push(label);
  });
  ok('export: every header count equals its table\'s rows (EXP-08)', mismatches.length===0, mismatches);
}

{
  const a16 = loadApp(APP_PATH);
  a16.DB = Object.assign(a16.blank(), { weights: [ { date:'2026-08-01', value:190 } ] });
  const text = a16.buildMarkdownExport();
  const headerLine = text.split('\n').find(l=>l.startsWith('- Rows per section: '));
  const otherLabels = Object.keys(a16.COLLECTIONS).filter(n=>n!=='weights').map(n=>a16.COLLECTIONS[n].label);
  const allOthersZero = otherLabels.every(label => headerLine.indexOf(label + ': 0 entries') >= 0);
  ok('export: one dated row gives a D to D range (EXP-08 adjacency)',
     text.indexOf('\n- Date range: 2026-08-01 to 2026-08-01\n') >= 0 &&
     headerLine.indexOf('Weigh-ins: 1 row') >= 0 && allOthersZero,
     headerLine);
}

{
  const a17 = loadApp(APP_PATH);
  a17.DB = a17.blank();
  const text = a17.buildMarkdownExport();
  const headerLine = text.split('\n').find(l=>l.startsWith('- Rows per section: '));
  const allZero = Object.keys(a17.COLLECTIONS).every(n=>headerLine.indexOf(a17.COLLECTIONS[n].label + ': 0 entries') >= 0);
  ok('export: an empty export says no dated entries and 0 entries everywhere (EXP-08 empty)',
     text.indexOf('\n- Date range: no dated entries\n') >= 0 && allZero,
     headerLine);
}

{
  const a18 = loadApp(APP_PATH);
  a18.DB = Object.assign(a18.blank(), { weights: [ { date:'Aug 1', value:1 }, { date:'2026-08-02', value:2 } ] });
  const text = a18.buildMarkdownExport();
  const headerLine = text.split('\n').find(l=>l.startsWith('- Rows per section: '));
  const rows = mdSections(text)['Weigh-ins'].rows;
  ok('export: a malformed date is exported but does not stretch the range (EXP-08 ordering)',
     text.indexOf('\n- Date range: 2026-08-02 to 2026-08-02\n') >= 0 &&
     headerLine.indexOf('Weigh-ins: 2 rows') >= 0 &&
     rows.length===2 && rows.some(r=>r[0]==='Aug 1'),
     { headerLine, rows });
}

{
  const weightLabels = ['Workouts','Weigh-ins','Pet weigh-ins'];
  X.DB.unit = 'lb';
  const secLb = mdSections(X.buildMarkdownExport());
  X.DB.unit = 'kg';
  const secKg = mdSections(X.buildMarkdownExport());
  X.DB.unit = 'lb'; // restore, so every test below and after keeps assuming the default unit
  const lbOk = weightLabels.every(l => secLb[l].header.includes('weight (lb)'));
  const kgOk = weightLabels.every(l => secKg[l].header.includes('weight (kg)'));
  const noCellSuffix = secLb['Weigh-ins'].rows.concat(secKg['Weigh-ins'].rows).every(r => !/\b(lb|kg)$/.test(r[1]));
  ok('export: weight headers follow DB.unit, lb then kg (EXP-06)',
     lbOk && kgOk && noCellSuffix,
     { lbHeaders: weightLabels.map(l=>secLb[l].header), kgHeaders: weightLabels.map(l=>secKg[l].header) });

  ok('export: distance stays km whatever DB.unit is (EXP-06)',
     secLb['Cardio'].header.includes('distance (km)') && secKg['Cardio'].header.includes('distance (km)'),
     { lb: secLb['Cardio'].header, kg: secKg['Cardio'].header });
}

{
  /* A fresh instance, not X: by this point in the file X's Sleep collection has been emptied by
     the earlier EXP-04 softDelete test, so re-seeding here (rather than reusing X) is what lets
     every one of the six required sections still carry a live, dated row. */
  const isoCheck = loadApp(APP_PATH);
  isoCheck.DB = populatedDB(isoCheck);
  const text = isoCheck.buildMarkdownExport();
  const sections = mdSections(text);
  const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
  const isoSeen = {};
  const bad = [];
  Object.keys(sections).forEach(label=>{
    const sec = sections[label];
    if(sec.empty) return;
    sec.rows.forEach(r=>{
      const cell = r[0];
      if(ISO_RE.test(cell)) isoSeen[label] = true;
      else if(cell !== '—') bad.push(label);
    });
  });
  const requiredLabels = ['Workouts','Weigh-ins','Cardio','Todos','Journal','Sleep'];
  const allHaveIso = requiredLabels.every(l=>isoSeen[l]);
  const noFmtDate = text.indexOf(isoCheck.fmtDate(dayOff(-9))) < 0;
  ok('export: dates are ISO, never display-formatted (EXP-06)',
     bad.length===0 && allHaveIso && noFmtDate, { bad, isoSeen, noFmtDate });
}

{
  const a19 = loadApp(APP_PATH);
  a19.DB = Object.assign(a19.blank(), {
    ideas: [
      { id:'e1', date:'2026-08-01', text:'line one\nline two | with pipe' },
      { id:'e2', date:'2026-08-02', text:'a\\|b' },
      { id:'e3', date:'2026-08-03', text:'ends with a backslash \\' },
      { id:'e4', date:'2026-08-04', text:'CRLF\r\nCR\rLF\nLS PS end' },
      { id:'e5', date:'2026-08-05', text:'  two\n\n  blank lines  ' },
      { id:'e6', date:'2026-08-06', text:'   ' },
      { id:'e7', date:'2026-08-07', text:'|edge pipes|' },
    ],
  });
  const ideasRows = mdSections(a19.buildMarkdownExport())['Ideas'].rows;
  const cellFor = date => { const r = ideasRows.find(r=>r[0]===date); return r && r[1]; };
  const expected = {
    '2026-08-01': 'line one<br>line two \\| with pipe',
    '2026-08-02': 'a\\\\\\|b',
    '2026-08-03': 'ends with a backslash \\',
    '2026-08-04': 'CRLF<br>CR<br>LF<br>LS<br>PS<br>end',
    '2026-08-05': 'two<br>blank lines',
    '2026-08-06': '—',
    '2026-08-07': '\\|edge pipes\\|',
  };
  const mismatches = Object.keys(expected).filter(d => cellFor(d) !== expected[d]);
  ok('export: pipes, backslashes and line breaks never change a row\'s width (EXP-07)',
     mismatches.length===0 && ideasRows.every(r=>r.length===3),
     { mismatches, cells: Object.keys(expected).map(d=>({ d, got: cellFor(d) })) });

  ok('export: CRLF, CR, LF, U+2028 and U+2029 become <br> (EXP-07)',
     cellFor('2026-08-04') === 'CRLF<br>CR<br>LF<br>LS<br>PS<br>end', cellFor('2026-08-04'));
}

{
  const a20 = loadApp(APP_PATH);
  a20.DB = Object.assign(a20.blank(), {
    ideas: [
      { id:'f1', date:'2026-08-01', text:'  padded text  ' },
      { id:'f2', date:'2026-08-02', text:'' },
      { id:'f3', date:'2026-08-03', text:null },
      { id:'f4', date:'2026-08-04', text:undefined },
      { id:'f5', date:'2026-08-05', text:'   ' },
    ],
  });
  const rows = mdSections(a20.buildMarkdownExport())['Ideas'].rows;
  const cellFor = date => { const r = rows.find(r=>r[0]===date); return r && r[1]; };
  ok('export: cells are trimmed and whitespace-only is — (EXP-07 empty)',
     cellFor('2026-08-01')==='padded text' && cellFor('2026-08-02')==='—' &&
     cellFor('2026-08-03')==='—' && cellFor('2026-08-04')==='—' && cellFor('2026-08-05')==='—',
     rows);
}

{
  const family = '\u{1F468}‍\u{1F469}‍\u{1F467}';
  const text = '🎨 Mini-painting ' + family + ' café';
  const a21 = loadApp(APP_PATH);
  a21.DB = Object.assign(a21.blank(), { ideas: [ { id:'g1', date:'2026-08-01', text } ] });
  const rows = mdSections(a21.buildMarkdownExport())['Ideas'].rows;
  ok('export: emoji and accented text survive unchanged (EXP-07 encoding)',
     rows[0][1] === text, rows[0]);
}

{
  const sections = mdSections(X.buildMarkdownExport());
  const text = X.buildMarkdownExport();
  const hostile = sections['Ideas'].rows.find(r=>r[1] && r[1].indexOf('<script>')>=0);
  ok('export: a hostile <script> idea is exported as typed, not HTML-escaped (EXP-07)',
     !!hostile && hostile[1].indexOf('<script>')>=0 && hostile[1].indexOf('&')>=0 &&
     hostile[1].indexOf('"quotes"')>=0 && text.indexOf('&lt;')<0 && text.indexOf('&quot;')<0,
     hostile);
}

{
  const a22 = loadApp(APP_PATH);
  a22.DB = Object.assign(a22.blank(), {
    sessions: [ { id:'w1', date:'2026-08-01', workout:'PUSH 1', endedAt:1, entries:[
      { name:'Odd data', sets:[ { w:{x:'a|b'}, r:'5' } ] },
    ], extras:{} } ],
  });
  const rows = mdSections(a22.buildMarkdownExport())['Workouts'].rows;
  ok('export: an object-valued weight exports as escaped JSON with the row intact (EXP-07)',
     rows.length===1 && rows[0].length===6 && rows[0][4]==='{"x":"a\\|b"}' && rows[0][5]==='5',
     rows);
}

console.log("\n── real backup: the Markdown export over Ian's actual data (EXP-08, local only) ──");
/* Counts only — never a row, a date or a note (T-01-13's real-backup rule). An ok() extra here may
   hold only numbers, booleans, or collection/section names. */
if(!fs.existsSync(REAL_PATH)){
  skipLine('Markdown export over the real backup — test/local/real-db-snapshot.json is not present (local only, git-ignored)');
} else {
  let R = null, bootThrew = null, realText = null, buildThrew = null;
  try { R = loadApp(APP_PATH, fs.readFileSync(REAL_PATH, 'utf8')); } catch(e){ bootThrew = e; }
  if(!bootThrew){
    try { realText = R.buildMarkdownExport(); } catch(e){ buildThrew = e; }
  }
  ok('real backup: the Markdown export builds without throwing', !bootThrew && !buildThrew);

  if(!bootThrew && !buildThrew){
    const sections = mdSections(realText);
    const collectionCount = Object.keys(R.COLLECTIONS).length;
    const headingCount = Object.keys(sections).length;
    ok('real backup: one section per declared collection', headingCount === collectionCount, headingCount);

    const headerLine = realText.split('\n').find(l=>l.startsWith('- Rows per section: '));
    const entries = headerLine ? headerLine.slice('- Rows per section: '.length).split(' · ') : [];
    const countMismatches = [];
    entries.forEach(e=>{
      const idx = e.lastIndexOf(': ');
      const label = e.slice(0, idx);
      const countStr = e.slice(idx+2);
      const sec = sections[label];
      const actual = !sec || sec.empty ? 0 : sec.rows.length;
      const expectedCount = countStr === '0 entries' ? 0 : parseInt(countStr, 10);
      if(expectedCount !== actual) countMismatches.push(label);
    });
    ok('real backup: every section count equals its table rows', countMismatches.length === 0, countMismatches.length);

    const widthFails = [];
    Object.keys(sections).forEach(label=>{
      const sec = sections[label];
      if(sec.empty) return;
      sec.rows.forEach(r=>{ if(r.length !== sec.header.length) widthFails.push(label); });
    });
    ok('real backup: every table row has its header\'s cell count', widthFails.length === 0, widthFails.length);
  }
}

/* REG-01: nothing in the whole suite run — boot, merge, render, the smoke-draw — may ever mutate
   COLLECTIONS. Recompute the same snapshot taken right after boot and diff it against
   REGISTRY_AT_START, naming only the collections that differ. */
{
  const endSnapshot = JSON.parse(snapshotRegistry(app.COLLECTIONS));
  const startSnapshot = JSON.parse(REGISTRY_AT_START);
  const diffNames = Object.keys(startSnapshot).filter(name => JSON.stringify(startSnapshot[name]) !== JSON.stringify(endSnapshot[name]));
  ok('registry: never mutated by boot, merge or render (REG-01)', diffNames.length === 0, diffNames);
}

if(WRITE){
  const dir = path.dirname(GOLDEN_PATH);
  if(!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const sorted = {};
  Object.keys(GOLDEN_OUT).sort().forEach(k => { sorted[k] = GOLDEN_OUT[k]; });
  const json = JSON.stringify(sorted, null, 2).replace(/\r\n/g, '\n') + '\n';
  fs.writeFileSync(GOLDEN_PATH, json);
  console.log(`\nWrote ${Object.keys(sorted).length} golden hashes to ${GOLDEN_PATH}`);
}

console.log(`\n${pass} passed, ${fail} failed, ${skip} skipped`);
process.exit(fail ? 1 : 0);
