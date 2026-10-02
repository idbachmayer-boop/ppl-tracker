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
const { loadApp, makeWx, freezeRunnerClock, APP_PATH, scanInlineHandlers } = require('./harness');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

freezeRunnerClock();

let pass = 0, fail = 0, skip = 0;
const ok = (name, cond, extra) => { if(cond){ pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra!==undefined ? '  → ' + JSON.stringify(extra) : '')); } };
/* A skip is never a pass and never a fail: absent real data (REG-13's real-backup leg, local only
   per Ian's 2026-09-11 decision) must read as a loud, separate line and its own count — never
   silently folded into "0 failed" or counted toward "passed". */
const skipLine = msg => { skip++; console.log('  SKIP  ' + msg); };
/* Async checks (the sync paths are async: onSignedIn, pushNow's transaction). Each block is queued
   here and starts only after the whole synchronous suite has run, so its output lands after the
   last synchronous line. The tail of this file waits for every one to settle before it prints the
   summary or exits. A block that throws or hangs past 10 seconds is a FAIL, never a silent skip. */
const pendingAsync = [];
function asyncBlock(label, fn){
  pendingAsync.push(new Promise(resolve => setImmediate(resolve)).then(() => {
    let timer = null;
    const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('timed out after 10s')), 10000); });
    return Promise.race([Promise.resolve().then(fn), timeout]).finally(() => clearTimeout(timer));
  }).catch(e => { ok(label + ': async block did not finish', false, String(e && e.stack || e)); }));
}
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

console.log('\n── git stores index.html as LF, whatever core.autocrlf says (REPO-01) ──');
{
  /* Windows working trees came out CRLF for months because nothing in the repo overrode each
     machine's core.autocrlf. The attributes file at the repo root now does. This asks git for the
     property it produces, and never reads that file's wording: the firestore.rules checks below
     broke the day they pinned wording instead of a property. A missing git or a missing repository
     is a FAIL, never a skip. CI has to prove this on every push, and skipLine is reserved for Ian's
     local-only real backup. cwd is pinned to the repo root so the answer does not depend on where
     node was started, and maxBuffer is raised because index.html would otherwise outgrow
     execFileSync's default buffer. */
  const root = path.join(__dirname, '..');
  const git = args => execFileSync('git', args, { cwd: root, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  let eol = null, blob = null, err = null;
  try {
    eol = git(['check-attr', '-z', 'eol', '--', 'index.html']).toString('utf8').split('\0')[2];
    blob = git(['show', ':index.html']);
  } catch(e){
    err = String((e && e.stderr && e.stderr.toString()) || (e && e.message) || e);
  }
  ok('REPO-01: git resolves index.html to eol=lf', eol === 'lf', err || eol);
  ok('REPO-01: the indexed index.html blob holds no carriage return', blob !== null && blob.indexOf(0x0d) === -1, err || (blob && blob.indexOf(0x0d)));
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
  'mdEscape', 'mdCell', 'mdHeader', 'exportRows', 'buildMarkdownExport', 'exportMarkdown', 'downloadMarkdown', 'exportShareFailed',
  'ACTIONS', 'dispatchAction'];
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
/* The anchor buttons are read as parsed controls (controlsIn, hoisted from the F2 section), never as
   handler text: "2 days ago" backdates a mow by exactly two days. The buttons render in label order
   (Today, Yesterday, 2 days ago, 3 days ago), so their day counts must read 0,1,2,3 in that order. */
ok('the card carries the recommendation AND the anchor buttons',
   /Mow today/.test(card) && controlsIn(card).some(c => c.data.action === 'setLawnDaysAgo' && c.data.which === 'mowed' && c.data.n === '2')
     && controlsIn(card).filter(c => c.data.action === 'setLawnDaysAgo' && c.data.which === 'mowed').map(c => c.data.n).join() === '0,1,2,3',
   { anchors: controlsIn(card).filter(c => c.data.action === 'setLawnDaysAgo').map(c => c.data), card: card.replace(/<svg[\s\S]*?<\/svg>/g,'').slice(0,200) });

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
{
  /* 14 is the product's two-week window. Each pill logs its OWN date, so the 14 dates are distinct. */
  const pills = controlsIn(app.lawnHistory()).filter(c => c.data.action === 'toggleLawnLog' && c.data.which === 'watered');
  ok('the history lists all 14 days, each tappable', pills.length === 14 && new Set(pills.map(c => c.data.iso)).size === 14, pills.map(c => c.data.iso));
}
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
   prove blank_legacy() and blank() disagree, which REG-06's own differential already covers.

   The `draft` key is dropped too. From Phase 4 the in-progress workout is device-local: the live
   mergeDB() never returns a draft, while the frozen mergeDB_legacy still carries one by recency.
   That divergence is intended, so the comparison leaves the draft out and the DRAFT block further
   down asserts the live behaviour directly. */
function legacyView(out){
  const copy = Object.assign({}, out);
  Object.keys(app.COLLECTIONS).forEach(name => { if(LEGACY_COLLECTIONS.indexOf(name) < 0) delete copy[name]; });
  delete copy.draft;
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
  // The safety property still holds, by a stronger mechanism: no draft leaves the merge at all (D-04).
  ok("merge incident: a finished workout's null draft beats a stale draft", !('draft' in out), out.draft);
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
   untouched, whitespace aside.
   Phase 4 adds exactly one statement to it, `delete win.draft;`: D-04 names this branch explicitly
   (an Erase or Import→Replace must not carry a draft across the wire either). REG-10's property —
   an early return before any per-collection merge — is still asserted by the ordering check below. */
const GEN_BLOCK = `const rG = +r.gen || 0, lG = +l.gen || 0;
  if(rG !== lG){
    const win = Object.assign({}, blank(), lG > rG ? l : r);
    win.gen = Math.max(rG, lG);
    win.updatedAt = Math.max(+r.updatedAt||0, +l.updatedAt||0);
    win._schema = Math.max(+r._schema||0, +l._schema||0, SCHEMA);
    delete win.wx;
    delete win.draft;
    return win;
  }`;

console.log('\n── mergeDB() is derived from COLLECTIONS (REG-09/REG-10/REG-05) ──');
{
  const collapse = s => s.replace(/\s+/g, ' ').trim();
  ok('merge: the gen-mismatch block is the pre-phase block plus the Phase 4 draft strip',
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
  /* Read the delete controls as parsed data (controlsIn, hoisted from the F2 section), never as
     handler text: the property is "a live night can be deleted, a deleted one is not listed". */
  const del = controlsIn(html).filter(c => c.data.action === 'removeSleep');
  ok('sleep: the history lists live nights and hides deleted ones',
     del.some(c => c.data.id === 'sl1') && !del.some(c => c.data.id === 'sl2'), del.map(c => c.data.id));
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
  /* The safeId gate is defence in depth behind esc(): an unsafe id gets no delete control at all,
     neither a delegated one nor an inline handler. Proven to bite by removing the gate (05-03). */
  const del = controlsIn(html).filter(c => c.data.action === 'removeSleep');
  ok('sleep: an id that could break out of the attribute gets no delete button',
     html.indexOf('7h') >= 0 && del.length === 0 && html.indexOf('removeSleep(') < 0, { del, html });
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

console.log('\n── DRY-RUN-A: a map-shaped collection declared in one line is picked up everywhere (DOC-04) ──');
/* DOC-04's data-layer rehearsal for the "adding a new tracked thing" recipe (CLAUDE.md /
   docs/adding-a-collection.md), proven for a collection that is NOT sleep. sleep is list-shaped, so
   SLEEP-05 above never exercised merge:'replace-whole', explicitFalse, or the six map-only branches
   of collectionProblems() — exactly the ones mobilityLog got wrong in production. This block injects
   a single map-shaped registry line the same way SLEEP-05 does (test/harness.js's opts.transform, no
   change to the harness or to index.html) and machine-proves the recipe's data-layer half end to end
   for it. */
const RECIPE_PROBE_MAP_LINE = "  recipeProbeMap:{ kind:'map', merge:'replace-whole', soft:false, required:false, explicitFalse:true, label:'Recipe probe map', columns:[{field:'date',label:'date'},{field:'item',label:'item'}], format:dayFlagRows },";
const recipeProbeTransform = code => code.replace('const COLLECTIONS = {', 'const COLLECTIONS = {\n' + RECIPE_PROBE_MAP_LINE);
const recipeProbe = loadApp(APP_PATH, null, { transform: recipeProbeTransform });

{
  const lineDiff = recipeProbe.__src.split('\n').length - app.__src.split('\n').length;
  const reconstructed = recipeProbe.__src.replace('\n' + RECIPE_PROBE_MAP_LINE, '');
  ok('DRY-RUN-A: the recipe probe transform applied (one line added, nothing else changed)',
     recipeProbe.__src !== app.__src && lineDiff === 1 && reconstructed === app.__src,
     { lineDiff, reconstructedMatchesApp: reconstructed === app.__src });
}

ok('DRY-RUN-A: the declaration is valid', recipeProbe.collectionProblems(recipeProbe.COLLECTIONS).length === 0, recipeProbe.collectionProblems(recipeProbe.COLLECTIONS));

{
  const blankProbe = recipeProbe.blank();
  ok('DRY-RUN-A: blank() creates the recipe probe empty',
     typeof blankProbe.recipeProbeMap === 'object' && !Array.isArray(blankProbe.recipeProbeMap) && Object.keys(blankProbe.recipeProbeMap).length === 0 &&
     typeof recipeProbe.DB.recipeProbeMap === 'object' && !Array.isArray(recipeProbe.DB.recipeProbeMap) && Object.keys(recipeProbe.DB.recipeProbeMap).length === 0,
     { blankMap: blankProbe.recipeProbeMap, dbMap: recipeProbe.DB.recipeProbeMap });
}

{
  let threw = null;
  try { recipeProbe.liveOf('recipeProbeMap'); } catch(e){ threw = e; }
  ok('DRY-RUN-A: liveOf refuses a map collection by name',
     !!threw && /recipeProbeMap/.test(threw.message), threw && threw.message);
}

{
  const base = recipeProbe.blank();
  const withoutProbe = JSON.parse(JSON.stringify(base));
  delete withoutProbe.recipeProbeMap;
  const badMap = JSON.parse(JSON.stringify(base)); badMap.recipeProbeMap = [];
  const r1 = recipeProbe.validateBackup(withoutProbe), r2 = recipeProbe.validateBackup(badMap);
  ok("DRY-RUN-A: validateBackup checks the recipe probe's shape",
     r1 === null && r2 === 'The recipeProbeMap section is damaged.',
     { r1, r2 });
}

{
  const day = '2026-08-01';
  const A = Object.assign(recipeProbe.blank(), { updatedAt:100, recipeProbeMap: { [day]: { a:'old' } } });
  const B = Object.assign(recipeProbe.blank(), { updatedAt:900, recipeProbeMap: { [day]: { b:'new' } } });
  const out1 = recipeProbe.mergeDB(clone(A), clone(B), false);
  const out2 = recipeProbe.mergeDB(clone(B), clone(A), false);
  ok('DRY-RUN-A: mergeDB replaces the whole day from the newer side',
     JSON.stringify(out1.recipeProbeMap[day]) === JSON.stringify({ b:'new' }) && JSON.stringify(out2.recipeProbeMap[day]) === JSON.stringify({ b:'new' }),
     { out1: out1.recipeProbeMap[day], out2: out2.recipeProbeMap[day] });
}

{
  const day = '2026-08-01';
  const olderTrue = Object.assign(recipeProbe.blank(), { updatedAt:100, recipeProbeMap: { [day]: { flag:true } } });
  const newerFalse = Object.assign(recipeProbe.blank(), { updatedAt:900, recipeProbeMap: { [day]: { flag:false } } });
  const falseOut1 = recipeProbe.mergeDB(clone(olderTrue), clone(newerFalse), false);
  const falseOut2 = recipeProbe.mergeDB(clone(newerFalse), clone(olderTrue), false);

  const olderHasKey = Object.assign(recipeProbe.blank(), { updatedAt:100, recipeProbeMap: { [day]: { flag:true } } });
  const newerOmits  = Object.assign(recipeProbe.blank(), { updatedAt:900, recipeProbeMap: { [day]: { other:true } } });
  const absentOut1 = recipeProbe.mergeDB(clone(olderHasKey), clone(newerOmits), false);
  const absentOut2 = recipeProbe.mergeDB(clone(newerOmits), clone(olderHasKey), false);

  ok('DRY-RUN-A: an explicit false survives the merge, and absence does not mean off',
     JSON.stringify(falseOut1.recipeProbeMap[day]) === JSON.stringify({ flag:false }) &&
     JSON.stringify(falseOut2.recipeProbeMap[day]) === JSON.stringify({ flag:false }) &&
     JSON.stringify(absentOut1.recipeProbeMap[day]) === JSON.stringify({ other:true }) &&
     JSON.stringify(absentOut2.recipeProbeMap[day]) === JSON.stringify({ other:true }),
     { falseOut1: falseOut1.recipeProbeMap[day], falseOut2: falseOut2.recipeProbeMap[day], absentOut1: absentOut1.recipeProbeMap[day], absentOut2: absentOut2.recipeProbeMap[day] });
}

{
  recipeProbe.DB = Object.assign(recipeProbe.blank(), { recipeProbeMap: { '2026-08-03': { flag:true } } });
  const sections = mdSections(recipeProbe.buildMarkdownExport());
  const sec = sections['Recipe probe map'];
  ok('DRY-RUN-A: the recipe probe exports its own section with no exporter edit',
     !!sec && !sec.empty && sec.rows.length === 1 && sec.rows[0][0] === '2026-08-03',
     sec);
}

{
  const stripComments = src => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const consumers = { blank: recipeProbe.blank, liveOf: recipeProbe.liveOf, validateBackup: recipeProbe.validateBackup, mergeCollections: recipeProbe.mergeCollections, mergeDB: recipeProbe.mergeDB, exportRows: recipeProbe.exportRows, buildMarkdownExport: recipeProbe.buildMarkdownExport };
  const hits = Object.keys(consumers).filter(name => stripComments(consumers[name].toString()).indexOf('recipeProbeMap') >= 0);
  ok('DRY-RUN-A: no derived consumer mentions recipeProbeMap', hits.length === 0, hits);
}

/* Dry Run A proves the recipe's data-layer half exhaustively for a map-shaped collection: a valid
   declaration, blank(), liveOf() refusal, validateBackup()'s shape check, mergeDB()'s replace-whole
   trap (including the explicit-false rule), and the export — all reached from one injected line with
   no change to any derived consumer. It cannot reach the hand-written logging/viewing UI step the
   recipe also describes; that is Dry Run B's job (plan 03-05). */

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

console.log('\n── the recipe quotes the placement rule verbatim (DOC-02) ──');
{
  /* This does not assert the placement rule says any particular thing — that would be the
     exact-wording trap CLAUDE.md's own firestore.rules note (§ Conventions) already warns against.
     It asserts only that CLAUDE.md's copy and the file its own marker names are the same text,
     whitespace-normalized. Either file may be rewritten freely; they may only not drift apart. */
  const claudeMdPath = APP_PATH.replace(/index\.html$/, 'CLAUDE.md');
  const repoRoot = path.dirname(APP_PATH);
  const claudeMdExists = fs.existsSync(claudeMdPath);
  const claudeMd = claudeMdExists ? fs.readFileSync(claudeMdPath, 'utf8') : '';

  const normWs = s => s.replace(/\s+/g, ' ').trim();

  const markerRe = /<!-- placement-rule: verbatim from (.+?) -->/g;
  const placementMarkers = [];
  let m;
  while((m = markerRe.exec(claudeMd))){
    const quoteSource = m[1].trim();
    const after = claudeMd.slice(m.index + m[0].length);
    const fenceMatch = after.match(/```text\r?\n([\s\S]*?)\r?\n[ \t]*```/);
    placementMarkers.push({ quoteSource, placementQuote: fenceMatch ? fenceMatch[1] : null });
  }

  ok('recipe: CLAUDE.md names at least one verbatim placement-rule source',
     placementMarkers.length > 0 && placementMarkers.every(p => p.placementQuote && normWs(p.placementQuote).length > 0),
     placementMarkers.map(p => p.quoteSource));

  if(placementMarkers.length > 0 && placementMarkers.every(p => p.placementQuote)){
    placementMarkers.forEach(p => {
      const srcPath = path.join(repoRoot, p.quoteSource);
      const srcExists = fs.existsSync(srcPath);
      const srcText = srcExists ? fs.readFileSync(srcPath, 'utf8') : '';
      const contains = srcExists && normWs(srcText).includes(normWs(p.placementQuote));
      ok('recipe: CLAUDE.md quotes the placement rule verbatim from the source it names',
         contains,
         { quoteSource: p.quoteSource, srcExists, quoteStart: normWs(p.placementQuote).slice(0, 80) });
    });

    const combinedQuote = placementMarkers.map(p => normWs(p.placementQuote)).join(' ');
    ok('recipe: the quoted placement rule is substantial, not a fragment',
       combinedQuote.length >= 200 && combinedQuote.includes('MIGRATIONS') && combinedQuote.includes('blank('),
       combinedQuote.length);
  }
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

console.log('\n── the recipe and the registry cannot silently diverge (DOC-03) ──');
{
  /* This block compares VALUES — a key set extracted from the companion doc against the key set
     collectionProblems() actually enforces — never prose. CLAUDE.md § Conventions already records
     why that matters: pinning the firestore.rules tests to exact wording broke them the moment the
     file matched what was actually deployed. Assert the property, never the wording. */
  const recipeDocPath = APP_PATH.replace(/index\.html$/, 'docs/adding-a-collection.md');
  const recipeDocExists = fs.existsSync(recipeDocPath);
  const recipeDoc = recipeDocExists ? fs.readFileSync(recipeDocPath, 'utf8') : '';

  /* `lang` picks the fence tag to look for. json (the default) parses the captured text as JSON,
     matching every pre-existing call site below unchanged; any other tag returns the raw captured
     text, which is what a `js` object-literal fixture (not valid JSON — unquoted keys, a bare
     function-reference value) needs. This is the file's only fenced-block extractor (Task 3, DOC-03/DOC-02). */
  function docBlock(doc, marker, lang){
    lang = lang || 'json';
    const idx = doc.indexOf(marker);
    if(idx < 0) return null;
    const after = doc.slice(idx + marker.length);
    const re = new RegExp('```' + lang + '\\r?\\n([\\s\\S]*?)\\r?\\n```');
    const m = after.match(re);
    if(!m) return null;
    if(lang === 'json'){
      try { return JSON.parse(m[1]); } catch(e){ return null; }
    }
    return m[1];
  }

  const docSpecKeysRaw = docBlock(recipeDoc, '<!-- registry-contract: spec keys -->');
  const docColumnKeysRaw = docBlock(recipeDoc, '<!-- registry-contract: column keys -->');
  const docSpecKeys = Array.isArray(docSpecKeysRaw) ? docSpecKeysRaw : [];
  const docColumnKeys = Array.isArray(docColumnKeysRaw) ? docColumnKeysRaw : [];

  const docBlocksOk = recipeDocExists
    && Array.isArray(docSpecKeysRaw) && docSpecKeysRaw.length > 0
    && Array.isArray(docColumnKeysRaw) && docColumnKeysRaw.length > 0;
  ok('recipe: docs/adding-a-collection.md exists and holds both registry-contract blocks',
     docBlocksOk, { recipeDocExists, docSpecKeysRaw, docColumnKeysRaw });

  /* Extracted straight out of index.html's own collectionProblems() — never transcribed from a
     planning document — so a restructure of the validator itself is what this anchor is guarding. */
  const allowedMatch = app.__src.match(/const ALLOWED = \[([^\]]*)\]/);
  const liveAllowed = allowedMatch
    ? allowedMatch[1].split(',').map(s => s.trim().replace(/^'|'$/g, '')).filter(Boolean)
    : [];
  ok('recipe: the live ALLOWED array anchor is found and yields more than one name',
     !!allowedMatch && liveAllowed.length > 1, liveAllowed);

  const columnKeyLine = app.__src.split('\n').find(l => l.includes('has unknown key'));
  const liveColumnKeys = columnKeyLine
    ? [...columnKeyLine.matchAll(/k!==\s*'([^']+)'/g)].map(m => m[1])
    : [];
  ok('recipe: the live column-key anchor is found and yields more than one name',
     !!columnKeyLine && liveColumnKeys.length > 1, liveColumnKeys);

  const sortedUnique = arr => JSON.stringify(Array.from(new Set(arr)).sort());

  if(docBlocksOk){
    ok('recipe: the documented spec-key list matches the live ALLOWED list',
       sortedUnique(docSpecKeys) === sortedUnique(liveAllowed),
       { docSpecKeys: Array.from(new Set(docSpecKeys)).sort(), liveAllowed: Array.from(new Set(liveAllowed)).sort() });

    ok('recipe: the documented column-key list matches the live column contract',
       sortedUnique(docColumnKeys) === sortedUnique(liveColumnKeys),
       { docColumnKeys: Array.from(new Set(docColumnKeys)).sort(), liveColumnKeys: Array.from(new Set(liveColumnKeys)).sort() });

    ok('recipe: the comparison is not vacuous — an extra field breaks it',
       sortedUnique(docSpecKeys.concat(['zzNotAField'])) !== sortedUnique(liveAllowed));

    /* Task 2: close the coverage and encoding gaps around the divergence check above. */

    // ── every key a live COLLECTIONS entry actually uses is named in the companion doc ──
    const usedSpecKeys = new Set();
    const usedColumnKeys = new Set();
    Object.keys(app.COLLECTIONS).forEach(name => {
      const spec = app.COLLECTIONS[name];
      Object.keys(spec).forEach(k => usedSpecKeys.add(k));
      (Array.isArray(spec.columns) ? spec.columns : []).forEach(col => {
        Object.keys(col).forEach(k => usedColumnKeys.add(k));
      });
    });
    const docSpecKeySet = new Set(docSpecKeys);
    const docColumnKeySet = new Set(docColumnKeys);
    const undocumentedSpecKeys = Array.from(usedSpecKeys).filter(k => !docSpecKeySet.has(k));
    const undocumentedColumnKeys = Array.from(usedColumnKeys).filter(k => !docColumnKeySet.has(k));
    ok('recipe: every key used by a live COLLECTIONS entry is documented',
       undocumentedSpecKeys.length === 0 && undocumentedColumnKeys.length === 0,
       { undocumentedSpecKeys, undocumentedColumnKeys });

    // ── behavioural cross-check: anchor the source-text extraction to live validator behaviour ──
    const validListSpec = () => ({ kind:'list', key:'id', merge:'union', soft:true, required:false, label:'Thing', columns:[{field:'date',label:'date'}] });

    const specKeyFalselyRefused = [];
    docSpecKeys.forEach(name => {
      const spec = validListSpec(); spec[name] = 'dummy';
      const problems = app.collectionProblems({ thing: spec });
      if(problems.some(p => p.includes('unknown field "' + name + '"'))) specKeyFalselyRefused.push(name);
    });
    const zzSpec = validListSpec(); zzSpec.zzNotAField = 'dummy';
    const zzSpecProblems = app.collectionProblems({ thing: zzSpec });
    const zzSpecRefused = zzSpecProblems.some(p => p.includes('unknown field "zzNotAField"'));
    ok('recipe: every documented spec key is accepted by collectionProblems, and a sentinel key is refused',
       specKeyFalselyRefused.length === 0 && zzSpecRefused,
       { specKeyFalselyRefused, zzSpecRefused });

    const columnKeyFalselyRefused = [];
    docColumnKeys.forEach(name => {
      const spec = validListSpec(); spec.columns = [Object.assign({field:'date', label:'date'}, {[name]: 'dummy'})];
      const problems = app.collectionProblems({ thing: spec });
      if(problems.some(p => p.includes('has unknown key "' + name + '"'))) columnKeyFalselyRefused.push(name);
    });
    const zzColSpec = validListSpec(); zzColSpec.columns = [{field:'date', label:'date', zzNotAColumnKey:'dummy'}];
    const zzColProblems = app.collectionProblems({ thing: zzColSpec });
    const zzColRefused = zzColProblems.some(p => p.includes('has unknown key "zzNotAColumnKey"'));
    ok('recipe: every documented column key is accepted by collectionProblems, and a sentinel column key is refused',
       columnKeyFalselyRefused.length === 0 && zzColRefused,
       { columnKeyFalselyRefused, zzColRefused });

    // ── encoding guard: a typographic quote or invisible character breaks the extractor unseen ──
    const ASCII_IDENT_RE = /^[A-Za-z][A-Za-z0-9]*$/;
    const nonAsciiNames = docSpecKeys.concat(docColumnKeys).filter(n => !ASCII_IDENT_RE.test(n));
    ok('recipe: the documented key names are plain ASCII identifiers',
       nonAsciiNames.length === 0, nonAsciiNames);

    // ── the copy-paste example entry round-trips through the live validator (DOC-03, Task 3) ──
    const exampleEntrySrc = docBlock(recipeDoc, '<!-- registry-contract: example entry -->', 'js');
    ok('recipe: docs/adding-a-collection.md holds the example-entry fenced block',
       typeof exampleEntrySrc === 'string' && exampleEntrySrc.trim().length > 0, exampleEntrySrc);

    let exampleEntry = null, exampleEntryError = null;
    if(typeof exampleEntrySrc === 'string'){
      try {
        // Only `dayFlagRows` is injected — any other identifier the fixture references throws here,
        // which is the point: the fixture is meant to be paste-able against the real file, and this
        // is what proves it references nothing else.
        exampleEntry = new Function('dayFlagRows', 'return (' + exampleEntrySrc + ');')(app.dayFlagRows);
      } catch(e){ exampleEntryError = e.message; }
    }
    ok('recipe: the copy-paste entry evaluates with only dayFlagRows injected',
       exampleEntry !== null && exampleEntryError === null, exampleEntryError);

    if(exampleEntry){
      const roundTripProblems = app.collectionProblems({ exampleEntry: exampleEntry });
      ok('recipe: the companion doc\'s copy-paste entry still passes the live validator',
         Array.isArray(roundTripProblems) && roundTripProblems.length === 0, roundTripProblems);

      ok('recipe: the copy-paste entry is map-shaped and exercises the explicitFalse branch',
         exampleEntry.kind === 'map' && exampleEntry.merge === 'replace-whole' && exampleEntry.explicitFalse === true,
         { kind: exampleEntry.kind, merge: exampleEntry.merge, explicitFalse: exampleEntry.explicitFalse });

      const missingFormat = Object.assign({}, exampleEntry);
      delete missingFormat.format;
      const missingFormatProblems = app.collectionProblems({ exampleEntry: missingFormat });
      ok('recipe: the round-trip is not vacuous — dropping format from the copy is refused',
         Array.isArray(missingFormatProblems) && missingFormatProblems.length > 0, missingFormatProblems);
    }
  }
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
   it takes out is the Log tab. normalizeDraft() repairs what it can and nulls the rest on the boot
   path; since Phase 4 the merge path no longer repairs a draft, it removes it — the merge never
   returns a draft at all, so nothing short a field can arrive that way. */
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

  /* The merge path removes instead of repairing: a newer remote draft, short a field or naming a
     workout that no longer exists, never comes out of mergeDB at all (D-04). */
  ok('the sync merge never returns a draft, whatever the remote holds', (()=>{
    const bad = [];
    [['no stairs', k=>{ delete k.stairs; }], ['unknown workout', k=>{ k.workout = 'GONE'; }]].forEach(([label, mutate]) => {
      const remote = populatedDB(a); remote.draft = draftFor(a,'PUSH 1'); mutate(remote.draft);
      remote.updatedAt = Date.now();
      const local = populatedDB(a); local.updatedAt = Date.now() - 60000;
      if('draft' in a.mergeDB(remote, local, false)) bad.push(label);
    });
    return bad.length === 0;
  })());
}

/* ── helpers for the DRAFT blocks below ──
   fullDraft() is the draft startWorkout() builds, extras included. draftFor() leaves `extras` empty,
   and viewActive() → ensureExtras() heals a missing accessory into DB.draft IN MEMORY without storing
   it, so after any render that reaches the Log tab the in-memory draft and its stored copy differ by
   that accessory — a deep-equality check would fail for the wrong reason. Use fullDraft() for every
   LOCAL draft; remote drafts may stay draftFor(), since they are stripped anyway. */
function fullDraft(a, workout){
  const d = draftFor(a, workout);
  d.extras = a.__sandbox.blankExtras(workout);
  return d;
}
/* Replaces the debounced push with a counter. save() looks schedulePush up on the vm global object
   at call time, so the override is what it calls; saveLocal() never calls it at all. */
function spyPushes(a){
  const spy = { n: 0 };
  a.__sandbox.schedulePush = () => { spy.n++; };
  return spy;
}
/* A fake Firestore just deep enough for onSignedIn(), startLiveSync(), pushNow()'s transaction and
   cloudVersion(). The remote blob is held as the JSON STRING the real doc stores, so every read
   parses a fresh copy and nothing a test holds can alias it. `writes` records every tx.set() doc
   (the thing pushNow() actually sends); `versions` records every versions-subcollection add().
   `fire(db)` replays a live-listener tick carrying `db`. With opts.signedIn it also wires SYNC as a
   reconciled, signed-in session so pushNow() and cloudVersion() run without going through sign-in.
   Every caller clears SYNC.docRef and SYNC.user before it returns. */
function fakeCloud(a, remoteDB, opts){
  opts = opts || {};
  let remote = remoteDB == null ? null : JSON.stringify(remoteDB);
  const writes = [], versions = [];
  let listener = null;
  const snapOf = () => ({ exists: remote !== null, data(){ return { blob: remote }; } });
  const versionsCol = {
    add: async doc => { versions.push(doc); return { id: 'v' + versions.length }; },
    orderBy(){ return versionsCol; },
    limit(){ return versionsCol; },
    get: async () => ({ docs: opts.versionDocs || [] }),
  };
  const docRef = {
    get: async () => snapOf(),                       // ignores {source:'server'}: there is only one copy
    onSnapshot(cb){ listener = cb; return () => {}; },
    collection(){ return versionsCol; },
  };
  a.fbDb = {
    runTransaction: async fn => fn({
      get: async () => snapOf(),
      set: (ref, doc) => { writes.push(doc); remote = doc.blob; },
    }),
    collection(){ return { doc(){ return docRef; } }; },
  };
  if(opts.signedIn){ a.SYNC.docRef = docRef; a.SYNC.reconciled = true; a.SYNC.user = { uid: 'draft-test' }; }
  return {
    writes, versions, docRef,
    fire(db){
      if(!listener) throw new Error('no live listener was installed');
      listener({ exists: true, data(){ return { blob: JSON.stringify(db) }; } });
    },
    setRemote(db){ remote = db == null ? null : JSON.stringify(db); },
  };
}

/* ── DRAFT: the in-progress workout stays on this device (Phase 4, D-04/D-05/D-09) ──
   The draft used to sync like any other field, and the merge picked it by recency. That is how a
   stale device could put an old workout back on Ian's phone mid-set, and how a malformed draft from
   an older build could reach the Log tab. From Phase 4 it lives only on the device that started it:
   typing a rep persists locally with no push, no merged blob carries it, and nothing arriving from
   the cloud can replace it. These drive the real paths — setVal(), onSignedIn(), the live listener,
   pushNow()'s transaction — never a hand-rolled imitation of them. */
console.log('\n── DRAFT: the in-progress workout stays on this device ──');
{
  const a = loadApp(APP_PATH);
  const spy = spyPushes(a);
  const d = populatedDB(a); d.draft = fullDraft(a, 'PUSH 1'); d.updatedAt = 1000;
  a.DB = d;
  a.setVal(0, 0, 'r', '8');
  const stored = a.__stored();
  const storedR = stored && stored.draft && stored.draft.entries[0].sets[0].r;
  ok('DRAFT tracer: a typed rep is stored on this device with no updatedAt bump and no push',
     a.DB.updatedAt === 1000 && storedR === '8' && spy.n === 0,
     { updatedAt: a.DB.updatedAt, storedR, pushes: spy.n });
}
asyncBlock('DRAFT sign-in and live listener', async () => {
  const a = loadApp(APP_PATH);
  spyPushes(a);
  try{
    const local = populatedDB(a);
    local.draft = fullDraft(a, 'PUSH 1');
    local.draft.entries[0].sets[0] = { w: '135', r: '8', skipped: false };
    local.updatedAt = 1000;
    a.DB = local; a.saveLocal();
    const before = canon(a.DB.draft);

    /* No ppl_synced_uid yet and local has sessions, so this is the first-link branch; the stubbed
       prompt() returns '' and the app reads that as "merge both". The cloud's draft is NEWER. */
    const remote = populatedDB(a); remote.draft = draftFor(a, 'PULL 1'); remote.updatedAt = 5000;
    const cloud = fakeCloud(a, remote);
    await a.onSignedIn({ uid: 'draft-test' });
    const last = cloud.writes.length ? JSON.parse(cloud.writes[cloud.writes.length - 1].blob) : null;
    ok('DRAFT-01: the sign-in push writes a blob with no draft key',
       !!last && !('draft' in last),
       { writes: cloud.writes.length, status: a.SYNC.status, draft: last && last.draft && last.draft.workout });
    ok("DRAFT-02: a newer cloud draft does not replace this device's draft at sign-in",
       canon(a.DB.draft) === before, a.DB.draft && a.DB.draft.workout);

    const tick = populatedDB(a); tick.draft = draftFor(a, 'LEGS 1'); tick.updatedAt = 9000;
    cloud.fire(tick);
    const stored = a.__stored();
    ok("DRAFT-02: the live listener leaves this device's draft untouched",
       canon(a.DB.draft) === before && !!stored && canon(stored.draft) === before,
       { inMemory: a.DB.draft && a.DB.draft.workout, stored: stored && stored.draft && stored.draft.workout });
  } finally { a.SYNC.docRef = null; a.SYNC.user = null; }
});
{
  /* The merge used to repair the NEWER side's draft in place — the output's draft was that input's
     own object — so merging mutated whichever blob the caller handed in. Both directions. */
  const a = loadApp(APP_PATH);
  const mutated = [];
  [false, true].forEach(localNewer => {
    const remote = populatedDB(a); remote.draft = draftFor(a, 'PUSH 1'); delete remote.draft.stairs;
    const local  = populatedDB(a); local.draft  = draftFor(a, 'PULL 1'); delete local.draft.stairs;
    remote.updatedAt = localNewer ? 1000 : 5000;
    local.updatedAt  = localNewer ? 5000 : 1000;
    const rBefore = canon(remote.draft), lBefore = canon(local.draft);
    a.mergeDB(remote, local, false);
    if(canon(remote.draft) !== rBefore) mutated.push((localNewer ? 'local newer' : 'remote newer') + ': remote draft');
    if(canon(local.draft)  !== lBefore) mutated.push((localNewer ? 'local newer' : 'remote newer') + ': local draft');
  });
  ok("DRAFT-01: mergeDB leaves both inputs' draft objects unmutated", mutated.length === 0, mutated);
}

/* Every shape a remote `draft` field can arrive in: what older builds wrote, what a hand-edited or
   damaged blob can hold, and the field missing altogether (the factory returns undefined, meaning
   "delete the key"). Each factory returns a fresh value. Kept at block scope: later DRAFT blocks
   reuse it. */
const DRAFT_SHAPES = [
  ['well-formed',          () => draftFor(app, 'PULL 1')],
  ['no stairs',            () => { const d = draftFor(app, 'PULL 1'); delete d.stairs; return d; }],
  ['unknown workout',      () => Object.assign(draftFor(app, 'PULL 1'), { workout: 'GONE' })],
  ['entries is a string',  () => Object.assign(draftFor(app, 'PULL 1'), { entries: 'x' })],
  ['a string',             () => 'x'],
  ['a number',             () => 42],
  ['an empty array',       () => []],
  ['an empty object',      () => ({})],
  ['null',                 () => null],
  ['absent',               () => undefined],
];
{
  /* Both mergeDB branches (gen equal → recency; gen higher or lower → wholesale replace), both tie
     rules, the remote newer and older, and a local side holding a draft, null, or no key at all
     (EDGE DRAFT-01/empty: absence and null are treated the same on the way out). */
  const LOCAL_DRAFTS = [['a draft', () => draftFor(app, 'PUSH 1')], ['null', () => null], ['no key', () => undefined]];
  const withDraft = (db, v) => { if(v === undefined) delete db.draft; else db.draft = v; return db; };
  let firstBad = null, runs = 0;
  DRAFT_SHAPES.forEach(([shape, remoteDraft]) => {
    [['gen equal', 1], ['remote gen higher', 2], ['remote gen lower', 0]].forEach(([genLabel, rGen]) => {
      [false, true].forEach(localWins => {
        [['remote newer', 5000], ['remote older', 500]].forEach(([ageLabel, rU]) => {
          LOCAL_DRAFTS.forEach(([localLabel, localDraft]) => {
            if(firstBad) return;
            const remote = withDraft(Object.assign(populatedLegacyDB('shape-r', 100), { gen: rGen, updatedAt: rU }), remoteDraft());
            const local  = withDraft(Object.assign(populatedLegacyDB('shape-l', 200), { gen: 1, updatedAt: 1000 }), localDraft());
            let out, threw = null;
            try { out = app.mergeDB(remote, local, localWins); } catch(e){ threw = e.message; }
            runs++;
            if(threw || !out || 'draft' in out){
              firstBad = { shape, gen: genLabel, localWins, age: ageLabel, local: localLabel, threw, draft: out && out.draft };
            }
          });
        });
      });
    });
  });
  ok('DRAFT-01: mergeDB never returns a draft, for any remote shape, either branch, either tie rule',
     !firstBad && runs === DRAFT_SHAPES.length * 3 * 2 * 2 * 3, firstBad || { runs });
}
{
  const a = loadApp(APP_PATH);
  spyPushes(a);
  const d = populatedDB(a); d.draft = fullDraft(a, 'PUSH 1'); a.DB = d;
  const before = canon(a.DB.draft);
  a.snapshotNow('draft-check');
  let ring = [];
  try { ring = JSON.parse(a.__sandbox.localStorage.getItem('ppl_tracker_snaps_v1')) || []; } catch(e){}
  const entry = ring.find(s => s.label === 'draft-check');
  const blob = entry ? JSON.parse(entry.blob) : null;
  ok('DRAFT-01: the local snapshot ring stores no draft',
     !!blob && !('draft' in blob) && canon(a.DB.draft) === before,
     { found: !!entry, draft: blob && blob.draft && blob.draft.workout, inMemory: a.DB.draft && a.DB.draft.workout });
}
asyncBlock('DRAFT cloud version', async () => {
  const a = loadApp(APP_PATH);
  spyPushes(a);
  try{
    const d = populatedDB(a); d.draft = fullDraft(a, 'PUSH 1'); a.DB = d;
    const cloud = fakeCloud(a, null, { signedIn: true });
    a.cloudVersion('weigh-in');
    await new Promise(resolve => setImmediate(resolve));
    const v = cloud.versions.find(x => x.label === 'weigh-in');
    const blob = v ? JSON.parse(v.blob) : null;
    ok('DRAFT-01: a cloud version written mid-workout stores no draft',
       !!blob && !('draft' in blob) && !!a.DB.draft,
       { versions: cloud.versions.length, draft: blob && blob.draft && blob.draft.workout });
  } finally { a.SYNC.docRef = null; a.SYNC.user = null; }
});
{
  const a = loadApp(APP_PATH);
  spyPushes(a);
  const d = populatedDB(a); d.draft = fullDraft(a, 'PUSH 1'); a.DB = d;
  const blobs = [];
  a.__sandbox.Blob = function(parts, opts){ this.parts = parts; this.type = opts && opts.type; blobs.push(this); };
  a.__sandbox.document.createElement = () => ({ href: '', download: '', click(){} });
  a.exportData();
  let parsed = null;
  try { parsed = JSON.parse(blobs[blobs.length - 1].parts.join('')); } catch(e){}
  ok('DRAFT-01: the downloaded JSON backup has no draft',
     !!parsed && !('draft' in parsed) && Array.isArray(parsed.sessions) && parsed.sessions.length > 0
       && !!a.DB.draft && a.DB.draft.workout === 'PUSH 1',
     { parsed: !!parsed, draft: parsed && parsed.draft && parsed.draft.workout, inMemory: a.DB.draft && a.DB.draft.workout });
}
asyncBlock('DRAFT finish', async () => {
  const a = loadApp(APP_PATH);
  const spy = spyPushes(a);
  try{
    const d = populatedDB(a);
    d.draft = fullDraft(a, 'PUSH 1');
    d.draft.entries[0].sets[0] = { w: '135', r: '8', skipped: false };
    d.updatedAt = 1000;
    a.DB = d;
    const knownIds = new Set(d.sessions.map(s => s.id));
    /* The cloud still holds a legacy copy of this same workout, stamped NEWER than anything this
       device writes — the shape that used to resurrect a finished workout (EDGE DRAFT-04/ordering). */
    const remote = populatedDB(a); remote.draft = draftFor(a, 'PUSH 1'); remote.updatedAt = Date.now() + 60000;
    const cloud = fakeCloud(a, remote, { signedIn: true });

    a.finishWorkout();
    const pushesAfterFinish = spy.n, draftAfterFinish = a.DB.draft;
    const wv = cloud.versions.find(v => v.label === 'workout');
    const wvBlob = wv ? JSON.parse(wv.blob) : null;
    ok('DRAFT-04: finishing writes a workout version with no draft key',
       !!wvBlob && !('draft' in wvBlob), { versions: cloud.versions.map(v => v.label), draft: wvBlob && wvBlob.draft });

    await a.pushNow(true);   // the spy replaced the debounced push, so stand in for its timer
    const last = cloud.writes.length ? JSON.parse(cloud.writes[cloud.writes.length - 1].blob) : null;
    const sess = last && (last.sessions || []).find(s => s.workout === 'PUSH 1' && s.date === today && !knownIds.has(s.id));
    ok('DRAFT-04: finishing pushes the session with no draft key',
       pushesAfterFinish >= 1 && draftAfterFinish === null && !!last && !('draft' in last) && !!sess,
       { pushesAfterFinish, draftAfterFinish, writes: cloud.writes.length, status: a.SYNC.status,
         draft: last && last.draft, session: !!sess });
    ok('DRAFT-04: the post-push reconciliation cannot bring the finished draft back',
       a.DB.draft === null, a.DB.draft && a.DB.draft.workout);
  } finally { a.SYNC.docRef = null; a.SYNC.user = null; }
});
{
  const a = loadApp(APP_PATH);
  const spy = spyPushes(a);
  const d = populatedDB(a); d.draft = fullDraft(a, 'PUSH 1'); d.updatedAt = 1000;
  a.DB = d; a.saveLocal();
  a.discardWorkout();   // the harness confirm() returns true
  const stored = a.__stored();
  ok('DRAFT-04: discarding stores null locally with no updatedAt bump and no push',
     spy.n === 0 && a.DB.updatedAt === 1000 && !!stored && stored.draft === null && a.DB.draft === null,
     { pushes: spy.n, updatedAt: a.DB.updatedAt, stored: stored && stored.draft });
}

/* ── DRAFT: restoring, importing and erasing handle the draft deliberately (Phase 4, D-06/D-07/D-08) ──
   Five places turn foreign data into DB without going through the sync merge: Import Merge, Import
   Replace, restoring a local snapshot, restoring a cloud version, and the "use the cloud copy only"
   choice at first link. Every one of them must keep the workout in progress, and none may let the
   foreign draft reach normalize(), where migration 17 would register its exercise names as synced
   registry rows. Only a local Erase all data clears the draft, because that is what Ian asked for. */
console.log('\n── DRAFT: restoring, importing and erasing handle the draft deliberately ──');
/* A blob the way an older build wrote it: a full database that carries its own in-progress draft. */
function legacyDraftDB(a){
  const d = populatedDB(a);
  delete d.wx;
  d.draft = draftFor(a, 'LEGS 1');
  return d;
}
/* A backup or cloud doc from before the exercise registry: `_schema` 16, no `exercises` list, and a
   draft whose only entry names a lift found nowhere else. Normalizing it runs migration 17, which
   stamps the draft's entries too, so an unstripped draft founds a registry row that then syncs. */
function oldDocWithDraftOnlyLift(a){
  const d = legacyDraftDB(a);
  delete d.exercises;
  d._schema = 16;
  d.draft.entries = [{ name: 'Draft Only Lift', deload: false, sets: [{ w: '100', r: '5', skipped: false }] }];
  return d;
}
const hasDraftOnlyLift = list => (Array.isArray(list) ? list : []).some(r => r && r.name === 'Draft Only Lift');
/* Runs a check whose subject may not exist yet (a helper this plan extracts), so a missing function
   reads as a FAIL with its message rather than a crash that stops the suite. */
const attempt = fn => { try { return fn(); } catch(e){ return { threw: e.message }; } };
{
  const r = attempt(() => {
    const a = loadApp(APP_PATH); spyPushes(a);
    const d = populatedDB(a); d.draft = fullDraft(a, 'PUSH 1'); d.updatedAt = 1000; delete d.lastBackupAt;
    a.DB = d;
    const before = canon(a.DB.draft);
    const backup = legacyDraftDB(a);
    backup.sessions.push({ id:'imp1', workout:'PULL 1', date:dayOff(-1), endedAt:9, extras:{},
      entries:[{ name:'Lat pulldown', sets:[{ w:'120', r:'10', skipped:false }] }] });
    a.importMerge(backup);
    return { same: canon(a.DB.draft) === before, imported: a.DB.sessions.some(s => s.id === 'imp1'),
             updatedAt: a.DB.updatedAt, lastBackupAt: a.DB.lastBackupAt, draft: a.DB.draft && a.DB.draft.workout };
  });
  ok("D-06: Import Merge ignores the file's draft and keeps this device's",
     r.same && r.imported && r.updatedAt !== 1000 && typeof r.lastBackupAt === 'number', r);
}
{
  const r = attempt(() => {
    const a = loadApp(APP_PATH); spyPushes(a);
    const d = populatedDB(a); d.draft = null; a.DB = d;
    a.importMerge(legacyDraftDB(a));
    return { draft: a.DB.draft };
  });
  ok('D-06: Import Merge on a device with no draft plants none', r.draft === null, r);
}
{
  const r = attempt(() => {
    const a = loadApp(APP_PATH); spyPushes(a);
    const d = populatedDB(a); d.draft = fullDraft(a, 'PUSH 1'); d.gen = 3; a.DB = d;
    const before = canon(a.DB.draft);
    const backup = legacyDraftDB(a);
    backup.sessions = backup.sessions.slice(0, 2).map(s => Object.assign({}, s, { id: 'rep-' + s.id }));
    const ids = backup.sessions.map(s => s.id);
    a.importReplace(backup);
    return { gen: a.DB.gen, ids: a.DB.sessions.map(s => s.id), want: ids, same: canon(a.DB.draft) === before,
             draft: a.DB.draft && a.DB.draft.workout };
  });
  ok("D-06: Import Replace ignores the file's draft and keeps this device's",
     r.gen === 4 && JSON.stringify(r.ids) === JSON.stringify(r.want) && r.same, r);
}
{
  const r = attempt(() => {
    const src = loadApp(APP_PATH); spyPushes(src);
    const s = populatedDB(src); s.draft = fullDraft(src, 'PULL 1'); src.DB = s;
    const blobs = [];
    src.__sandbox.Blob = function(parts){ this.parts = parts; blobs.push(this); };
    src.__sandbox.document.createElement = () => ({ href: '', download: '', click(){} });
    src.exportData();
    const text = blobs[blobs.length - 1].parts.join('');
    const dst = loadApp(APP_PATH); spyPushes(dst);
    const d = populatedDB(dst); d.sessions = []; d.draft = fullDraft(dst, 'PUSH 1'); dst.DB = d;
    const before = canon(dst.DB.draft);
    dst.importReplace(JSON.parse(text));
    return { same: canon(dst.DB.draft) === before, sessions: dst.DB.sessions.length, draft: dst.DB.draft && dst.DB.draft.workout };
  });
  ok("D-06: an exported backup re-imported with Replace keeps the importing device's draft",
     r.same && r.sessions > 0, r);
}
{
  const r = attempt(() => {
    const a = loadApp(APP_PATH); spyPushes(a);
    const d = populatedDB(a); d.draft = fullDraft(a, 'PUSH 1'); a.DB = d;
    const before = canon(a.DB.draft);
    const older = legacyDraftDB(a); older.weights = older.weights.slice(0, 1);
    a.__sandbox.localStorage.setItem('ppl_tracker_snaps_v1', JSON.stringify([
      { at: Date.now() - 3600000, label: 'older', blob: JSON.stringify(older), summary: { sessions: older.sessions.length, weights: 1 } },
    ]));
    a.restoreSnapshot(0);
    return { weights: a.DB.weights.length, same: canon(a.DB.draft) === before, draft: a.DB.draft === undefined ? 'undefined' : (a.DB.draft && a.DB.draft.workout) };
  });
  ok('D-07: restoring a local snapshot keeps the workout in progress', r.weights === 1 && r.same, r);
}
asyncBlock('DRAFT restore a cloud version', async () => {
  const a = loadApp(APP_PATH); spyPushes(a);
  try{
    const d = populatedDB(a); d.draft = fullDraft(a, 'PUSH 1'); a.DB = d;
    const before = canon(a.DB.draft);
    const older = legacyDraftDB(a); older.weights = older.weights.slice(0, 1);
    const doc = { id: 'v1', data(){ return { blob: JSON.stringify(older), label: 'push', at: Date.now() - 3600000,
                                             summary: { sessions: older.sessions.length, weights: 1 } }; } };
    fakeCloud(a, null, { signedIn: true, versionDocs: [doc] });
    a.loadCloudVersions();
    await new Promise(resolve => setTimeout(resolve, 0));   // the fake get() resolves on the next turn
    a.restoreCloudVersion('v1');
    ok('DRAFT-02: restoring a cloud version keeps the workout in progress',
       a.DB.weights.length === 1 && canon(a.DB.draft) === before,
       { weights: a.DB.weights.length, draft: a.DB.draft === undefined ? 'undefined' : (a.DB.draft && a.DB.draft.workout) });
  } finally { a.SYNC.docRef = null; a.SYNC.user = null; }
});
{
  const r = attempt(() => {
    const a = loadApp(APP_PATH); spyPushes(a);
    const d = populatedDB(a); d.draft = fullDraft(a, 'PUSH 1'); d.gen = 2; a.DB = d; a.saveLocal();
    a.wipe();   // the harness confirm() returns true
    const stored = a.__stored();
    return { draft: a.DB.draft, stored: stored && stored.draft, gen: a.DB.gen };
  });
  ok('D-08: a local Erase clears the draft', r.draft === null && r.stored === null && r.gen === 3, r);
}
{
  const r = attempt(() => {
    const out = {};
    /* Replace: the device's own draft is kept, and the file's never reaches the migrations. */
    const a = loadApp(APP_PATH); spyPushes(a);
    const d = populatedDB(a); d.draft = fullDraft(a, 'PUSH 1'); a.DB = d;
    a.importReplace(oldDocWithDraftOnlyLift(a));
    out.replace = hasDraftOnlyLift(a.DB.exercises);
    /* Merge: the backup must be NEWER. `exercises` is not a COLLECTIONS entry, so mergeDB() takes it
       whole from the newer side; an older backup's registry would be thrown away and the check would
       pass for the wrong reason. */
    const b = loadApp(APP_PATH); spyPushes(b);
    const e = populatedDB(b); e.draft = fullDraft(b, 'PUSH 1'); e.updatedAt = 1000; b.DB = e;
    const backup = oldDocWithDraftOnlyLift(b); backup.updatedAt = Date.now() + 60000;
    b.importMerge(backup);
    out.merge = hasDraftOnlyLift(b.DB.exercises);
    out.mergeRegistry = (b.DB.exercises || []).length;
    return out;
  });
  ok("D-06: an old backup's draft adds no exercise-registry row on import",
     r.replace === false && r.merge === false && r.mergeRegistry > 0, r);
}
/* THE RULE (CLAUDE.md, "the draft is device-local"): every statement that replaces DB wholesale
   puts this device's draft back with keepLocalDraft(). Five such sites were found by hand, and the
   research missed two of them, so hand-finding is not enough. This scans the app source for every
   assignment to DB itself and fails, naming the line, on any that neither calls keepLocalDraft() nor
   is one of three sanctioned exceptions: the boot load, the local Erase (D-08, clears by design), and
   adoptMerged()'s own line (its input was built by keepLocalDraft() a few lines up). */
const DB_ASSIGN = /(^|[^\w.$])DB\s*=(?!=)/;
function dbAssignLines(src){
  const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  return stripComments(src).split('\n').map(l => l.trim()).filter(l => DB_ASSIGN.test(l));
}
{
  const lines = dbAssignLines(app.__src);
  const wipeSrc = String(app.wipe), adoptSrc = String(app.adoptMerged);
  const sanctioned = l => l.includes('keepLocalDraft(') || l === 'let DB = load();'
    || (!!app.wipe && wipeSrc.includes(l)) || (!!app.adoptMerged && adoptSrc.includes(l));
  const offenders = lines.filter(l => !sanctioned(l));
  const exceptions = {
    boot:  lines.some(l => l === 'let DB = load();'),
    erase: !!app.wipe && lines.some(l => wipeSrc.includes(l)),
    adopt: !!app.adoptMerged && lines.some(l => adoptSrc.includes(l) && !l.includes('keepLocalDraft(')),
  };
  const synthetic = ['DB = normalize(raw);'].filter(l => DB_ASSIGN.test(l) && !sanctioned(l));
  ok("DRAFT-02: every statement that replaces DB keeps this device's draft",
     lines.length >= 7 && offenders.length === 0 && exceptions.boot && exceptions.erase && exceptions.adopt
       && synthetic.length === 1,
     { scanned: lines.length, offenders, exceptions, syntheticCaught: synthetic.length === 1 });
}

/* ── DRAFT: no cloud document can plant, clear or crash the workout in progress (Phase 4, DRAFT-02/03) ──
   Whatever the cloud doc holds — a legacy draft written by an older build, a malformed one, an Erase
   from another device, or the whole doc chosen at first link — this device's own draft is what
   remains, and the Log tab still draws. Each scenario is a fresh instance driven through the real
   onSignedIn(), live listener and pushNow(). */
console.log('\n── DRAFT: no cloud document can plant, clear or crash the workout in progress ──');
/* The existing drawsLog() pattern, generalized to any instance: drive the real router to the Log tab
   and read the container. render() never throws by design, so the tell is the error card's wording. */
function logTabDraws(a){
  const appEl = a.__sandbox.document.getElementById('app');
  appEl.innerHTML = '';
  try { a.go('train'); a.setSub('log'); } catch(e){ return false; }
  return !/Something broke on this screen/.test(appEl.innerHTML || '');
}
/* A cloud doc whose sessions are all different rows from populatedDB()'s, so an adopted cloud copy is
   distinguishable from a merge. */
function cloudOnlyDB(a, draft){
  const d = populatedDB(a);
  delete d.wx;
  d.sessions = d.sessions.map(s => Object.assign({}, s, { id: 'cloud-' + s.id }));
  if(draft === undefined) delete d.draft; else d.draft = draft;
  d.updatedAt = 5000;
  return d;
}
const lastWrite = cloud => cloud.writes.length ? JSON.parse(cloud.writes[cloud.writes.length - 1].blob) : null;
/* First link on a device holding data, with the stubbed prompt() answering C, "use the cloud copy only". */
async function signInChoosingCloud(a, localDraft, remote){
  const local = populatedDB(a); local.draft = localDraft; local.updatedAt = 1000;
  a.DB = local; a.saveLocal();
  a.__sandbox.prompt = () => 'C';
  const cloud = fakeCloud(a, remote);
  await a.onSignedIn({ uid: 'draft-test' });
  return cloud;
}
asyncBlock('DRAFT first boot with a legacy cloud draft', async () => {
  const a = loadApp(APP_PATH); spyPushes(a);
  try{
    /* Already linked, so sign-in takes the ordinary merge branch — what every device does on the first
       boot after this update. */
    a.__sandbox.localStorage.setItem('ppl_synced_uid', 'draft-test');
    const local = populatedDB(a); local.draft = null; local.updatedAt = 1000;
    a.DB = local; a.saveLocal();
    const remote = populatedDB(a); delete remote.wx; remote.draft = draftFor(app, 'PULL 1'); remote.updatedAt = 5000;
    const cloud = fakeCloud(a, remote);
    await a.onSignedIn({ uid: 'draft-test' });
    const todayHtml = a.viewToday();
    ok('DRAFT-02: a device with no draft shows no Workout in progress card after syncing a cloud draft',
       a.DB.draft === null && !/Workout in progress/.test(todayHtml),
       { draft: a.DB.draft && a.DB.draft.workout, card: /Workout in progress/.test(todayHtml) });
    const last = lastWrite(cloud);
    ok('DRAFT-02: the first ordinary write removes the legacy draft from the cloud doc',
       !!last && !('draft' in last), { writes: cloud.writes.length, status: a.SYNC.status, draft: last && last.draft });
  } finally { a.SYNC.docRef = null; a.SYNC.user = null; }
});
asyncBlock('DRAFT cloud-copy choice', async () => {
  const a = loadApp(APP_PATH); spyPushes(a);
  try{
    const mine = fullDraft(a, 'PUSH 1');
    const before = canon(mine);
    const remote = cloudOnlyDB(a, draftFor(app, 'PULL 1'));
    const localIds = populatedDB(a).sessions.map(s => s.id), cloudIds = remote.sessions.map(s => s.id);
    await signInChoosingCloud(a, mine, remote);
    const ids = new Set(a.DB.sessions.map(s => s.id));
    const adopted = cloudIds.every(id => ids.has(id)) && localIds.every(id => !ids.has(id));
    ok("DRAFT-02: Use the cloud copy only adopts the cloud's data and keeps this device's draft",
       adopted && canon(a.DB.draft) === before,
       { adopted, ids: [...ids], draft: a.DB.draft && a.DB.draft.workout });
  } finally { a.SYNC.docRef = null; a.SYNC.user = null; }
  const b = loadApp(APP_PATH); spyPushes(b);
  try{
    await signInChoosingCloud(b, null, cloudOnlyDB(b, draftFor(app, 'PULL 1')));
    ok('DRAFT-02: Use the cloud copy only on a device with no draft plants none',
       b.DB.draft === null, b.DB.draft && b.DB.draft.workout);
  } finally { b.SYNC.docRef = null; b.SYNC.user = null; }
});
asyncBlock('DRAFT remote Erase', async () => {
  const a = loadApp(APP_PATH); spyPushes(a);
  try{
    const local = populatedDB(a); local.gen = 0; local.draft = fullDraft(a, 'PUSH 1'); local.updatedAt = 1000;
    a.DB = local; a.saveLocal();
    const before = canon(a.DB.draft);
    const cloud = fakeCloud(a, null, { signedIn: true });
    a.startLiveSync();
    const erased = a.blank(); delete erased.wx; erased.gen = 1; erased.updatedAt = 5000;
    cloud.fire(erased);
    ok("DRAFT-02: a remote Erase keeps this device's draft",
       a.DB.gen === 1 && a.liveSessions().length === 0 && canon(a.DB.draft) === before,
       { gen: a.DB.gen, live: a.liveSessions().length, draft: a.DB.draft && a.DB.draft.workout });
  } finally { a.SYNC.docRef = null; a.SYNC.user = null; }
});
asyncBlock('DRAFT same workout, same date', async () => {
  const a = loadApp(APP_PATH); spyPushes(a);
  try{
    const local = populatedDB(a);
    local.draft = fullDraft(a, 'PUSH 1');
    local.draft.entries[0].sets[0] = { w: '135', r: '8', skipped: false };
    local.draft.sessionNote = 'local note';
    local.draft.stairs.seconds = '300';
    local.updatedAt = 1000;
    a.DB = local; a.saveLocal();
    const before = canon(a.DB.draft);
    const cloud = fakeCloud(a, null, { signedIn: true });
    a.startLiveSync();
    const remote = populatedDB(a); delete remote.wx;
    remote.draft = draftFor(app, 'PUSH 1');
    remote.draft.entries[0].sets[0] = { w: '225', r: '3', skipped: false };
    remote.draft.entries[1].sets.push({ w: '50', r: '12', skipped: false });
    remote.draft.sessionNote = 'cloud note';
    remote.draft.stairs.seconds = '900';
    remote.updatedAt = 5000;
    cloud.fire(remote);
    ok("DRAFT-02: a cloud draft for the same workout and date is never merged into this device's",
       canon(a.DB.draft) === before,
       { set: a.DB.draft && a.DB.draft.entries[0].sets[0], note: a.DB.draft && a.DB.draft.sessionNote,
         stairs: a.DB.draft && a.DB.draft.stairs.seconds });
  } finally { a.SYNC.docRef = null; a.SYNC.user = null; }
});
/* Every non-null shape a cloud draft can arrive in, on a device with no draft and on one mid-workout. */
const MALFORMED_CLOUD = DRAFT_SHAPES.filter(([shape]) => shape !== 'null' && shape !== 'absent');
asyncBlock('DRAFT malformed cloud drafts through the live listener', async () => {
  let drawFail = null, draftFail = null, runs = 0;
  for(const [shape, make] of MALFORMED_CLOUD){
    for(const [device, mineOf] of [['no draft', () => null], ['mid-workout', a => fullDraft(a, 'PUSH 1')]]){
      const a = loadApp(APP_PATH); spyPushes(a);
      try{
        const local = populatedDB(a); local.draft = mineOf(a); local.updatedAt = 1000;
        a.DB = local; a.saveLocal();
        const before = canon(a.DB.draft);
        const cloud = fakeCloud(a, null, { signedIn: true });
        a.startLiveSync();
        const remote = populatedDB(a); delete remote.wx; remote.draft = make(); remote.updatedAt = 5000;
        let threw = null;
        try { cloud.fire(remote); } catch(e){ threw = e.message; }
        if(!draftFail && (threw || canon(a.DB.draft) !== before))
          draftFail = { shape, device, threw, draft: a.DB.draft === undefined ? 'undefined' : a.DB.draft };
        let todayThrew = null;
        try { a.viewToday(); } catch(e){ todayThrew = e.message; }
        const logOk = logTabDraws(a);
        if(!drawFail && (!logOk || todayThrew)) drawFail = { shape, device, logOk, todayThrew };
        runs++;
      } finally { a.SYNC.docRef = null; a.SYNC.user = null; }
    }
  }
  ok('DRAFT-03: the Log tab draws for every malformed cloud draft',
     !drawFail && runs === MALFORMED_CLOUD.length * 2, drawFail || { runs });
  ok("DRAFT-03: this device's own draft is what remains after a malformed cloud draft arrives",
     !draftFail && runs === MALFORMED_CLOUD.length * 2, draftFail || { runs });
});
asyncBlock('DRAFT malformed cloud drafts through the cloud-copy choice', async () => {
  let firstBad = null, runs = 0;
  for(const [shape, make] of MALFORMED_CLOUD){
    const a = loadApp(APP_PATH); spyPushes(a);
    try{
      const mine = fullDraft(a, 'PUSH 1');
      const before = canon(mine);
      await signInChoosingCloud(a, mine, cloudOnlyDB(a, make()));
      const same = canon(a.DB.draft) === before;
      const adopted = a.DB.sessions.some(s => String(s.id).startsWith('cloud-'));
      const logOk = logTabDraws(a);
      if(!firstBad && (!same || !adopted || !logOk))
        firstBad = { shape, same, adopted, logOk, status: a.SYNC.status, draft: a.DB.draft && a.DB.draft.workout };
      runs++;
    } finally { a.SYNC.docRef = null; a.SYNC.user = null; }
  }
  ok('DRAFT-03: the cloud-copy choice survives every malformed cloud draft',
     !firstBad && runs === MALFORMED_CLOUD.length, firstBad || { runs });
});
asyncBlock('DRAFT old cloud doc through the cloud-copy choice', async () => {
  const a = loadApp(APP_PATH); spyPushes(a);
  try{
    const remote = oldDocWithDraftOnlyLift(a);
    remote.sessions = remote.sessions.map(s => Object.assign({}, s, { id: 'cloud-' + s.id }));
    remote.updatedAt = 5000;
    const cloud = await signInChoosingCloud(a, fullDraft(a, 'PUSH 1'), remote);
    const last = lastWrite(cloud);
    ok("DRAFT-02: an old cloud doc's draft adds no exercise-registry row through the cloud-copy choice",
       !hasDraftOnlyLift(a.DB.exercises) && !!last && !hasDraftOnlyLift(last.exercises)
         && a.DB.sessions.some(s => String(s.id).startsWith('cloud-')),
       { inMemory: hasDraftOnlyLift(a.DB.exercises), written: !!last && hasDraftOnlyLift(last.exercises),
         writes: cloud.writes.length, status: a.SYNC.status });
  } finally { a.SYNC.docRef = null; a.SYNC.user = null; }
});

/* WR-02: a malformed draft already STORED on this device (left by an older build) must not take the
   Log tab down. No merge can clear it any more, so the boot has to. */
{
  let firstBad = null, runs = 0;
  const LOCAL_SHAPES = DRAFT_SHAPES.concat([['true', () => true], ['false', () => false], ['empty string', () => '']]);
  for(const [shape, make] of LOCAL_SHAPES){
    const seedApp = loadApp(APP_PATH);
    const blob = seedApp.__stored() || JSON.parse(JSON.stringify(seedApp.DB));
    const d = make(); if(d === undefined) delete blob.draft; else blob.draft = d;
    let a = null, threw = null, todayThrew = null;
    try{ a = loadApp(APP_PATH, blob); }catch(e){ threw = e.message; }
    if(a){ try{ a.viewToday(); }catch(e){ todayThrew = e.message; } }
    const logOk = !!a && logTabDraws(a);
    const draftOk = !!a && (a.DB.draft == null || typeof a.DB.draft === 'object');
    if(!firstBad && (threw || todayThrew || !logOk || !draftOk))
      firstBad = { shape, threw, todayThrew, logOk, draft: a && a.DB.draft };
    runs++;
  }
  ok('WR-02: the Log tab draws when this device boots from any malformed stored draft',
     !firstBad && runs === LOCAL_SHAPES.length, firstBad || { runs });
}

/* Replay the deploy job's stamp on an HTML string. The replay reads the workflow's own sed, so the
   test and the deploy cannot drift apart: the old replay mirrored the sed by hand, and would have
   kept passing after the workflow changed. Anything it cannot model (shell syntax left over, a search
   text that is missing or doubled, more or fewer than one sed) throws instead of replaying wrongly. */
function deployStamp(html, iso, sha7){
  const yml = fs.readFileSync(path.join(path.dirname(APP_PATH), '.github', 'workflows', 'deploy.yml'), 'utf8');
  const job = yml.slice(yml.indexOf('\n  deploy:'));
  const seds = [...job.matchAll(/sed -i "s\/((?:[^\/\\]|\\.)*)\/((?:[^\/\\]|\\.)*)\/" index\.html/g)];
  if(seds.length !== 1) throw Error('expected one stamp sed in the deploy job, found ' + seds.length);
  const search = seds[0][1].replace(/\\"/g, '"');
  const repl = seds[0][2].replace(/\\"/g, '"')
    .replace(/\$\(date [^)]*\)/, () => iso)
    .split('${GITHUB_SHA::7}').join(sha7);
  for(const part of [search, repl])
    if(/[$\\]/.test(part)) throw Error('stamp sed holds shell syntax the replay does not model: ' + part);
  const n = html.split(search).length - 1;
  if(n !== 1) throw Error('stamp sed search text ' + JSON.stringify(search) + ' occurs ' + n + ' times, expected 1');
  return html.replace(search, () => repl);
}

/* ── Build stamp: Settings says which build this device is running ──
   The deploy job replaces the placeholder in the published copy. These checks keep the placeholder
   stampable (exactly one, in the ppl-build meta), keep the deploy step aimed at it, and boot a copy
   stamped the way the deploy stamps it. */
console.log('\n── Build stamp ──');
{
  const src = fs.readFileSync(APP_PATH, 'utf8');
  const hits = src.split('__BUILD_STAMP__').length - 1;
  const metaAt = src.indexOf('<meta name="ppl-build" content="__BUILD_STAMP__"');
  ok('BUILD: the stamp marker appears exactly once, as the ppl-build meta\'s content inside <head>',
     hits === 1 && metaAt >= 0 && metaAt < src.indexOf('</head>'), { hits });

  /* The deploy job rewrites the published copy after these tests run, so nothing ever tests the
     bytes it uploads. These three checks are the only thing standing between a future workflow edit
     and a hash-pinned script that production refuses to run: a blank page on the phone while every
     local check passes (D-08). */
  const inlineBodies = h => [...h.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map(mm => mm[1]);
  const srcScripts = inlineBodies(src);
  ok('BUILD: no inline script contains the stamp marker, so the deploy rewrite cannot reach hashed bytes (D-08)',
     srcScripts.length > 0 && srcScripts.every(b => !b.includes('__BUILD_STAMP__')), { scripts: srcScripts.length });
  let stamped = null, stampErr = null;
  try{ stamped = deployStamp(src, '2026-09-23T19:05:00Z', 'e50bb0b'); }catch(e){ stampErr = e.message; }
  const stampedMetaAt = stamped === null ? -1 : stamped.indexOf('<meta name="ppl-build" content="2026-09-23T19:05:00Z e50bb0b"');
  ok('BUILD: the deploy job holds exactly one stamp sed, and it rewrites the ppl-build meta',
     !stampErr && stampedMetaAt >= 0 && stampedMetaAt < stamped.indexOf('</head>'), stampErr || { stampedMetaAt });
  ok('BUILD: the deploy stamp leaves the inline script byte-identical (D-08)',
     !stampErr && stamped !== src && inlineBodies(stamped).join('\0') === srcScripts.join('\0'),
     stampErr || (stamped === src ? 'the replay changed nothing' : 'an inline script changed'));
  const yml = fs.readFileSync(path.join(path.dirname(APP_PATH), '.github', 'workflows', 'deploy.yml'), 'utf8');
  const deployJob = yml.slice(yml.indexOf('\n  deploy:'));
  ok('BUILD: the deploy job stamps the placeholder before uploading the site',
     deployJob.indexOf('__BUILD_STAMP__') > 0 && deployJob.indexOf('__BUILD_STAMP__') < deployJob.indexOf('upload-pages-artifact'));

  const a = loadApp(APP_PATH);
  ok('BUILD: an unstamped copy says it is local, never a deploy',
     a.BUILD === '__BUILD_STAMP__' && a.buildLabel(a.BUILD) === 'Local copy, not a deployed build', a.buildLabel(a.BUILD));
  const lbl = a.buildLabel('2026-09-23T19:05:00Z e50bb0b');
  ok('BUILD: a stamp reads as a local date, time and short commit',
     lbl === 'Updated Sep 23, 2026, 2:05 PM · e50bb0b', lbl);
  ok('BUILD: a malformed stamp falls back to the local label',
     ['', null, 'garbage', 'not-a-date e50bb0b', '2026-09-23T19:05:00Z <b>x</b>'].every(s => a.buildLabel(s) === 'Local copy, not a deployed build'));

  /* Replay the deploy: stamp a temp copy with the workflow's own sed (deployStamp), then boot it. */
  const os = require('os');
  const tmp = path.join(os.tmpdir(), `ppl-stamped-${process.pid}.html`);
  let html = '', threw = null;
  try{ fs.writeFileSync(tmp, deployStamp(src, '2026-09-23T19:05:00Z', 'e50bb0b')); html = loadApp(tmp).viewData(); }catch(e){ threw = e.message; }
  finally { try{ fs.unlinkSync(tmp); }catch(e){} }
  ok('BUILD: a stamped copy boots and Settings shows its version',
     !threw && html.includes('Updated Sep 23, 2026, 2:05 PM · e50bb0b') && html.includes('This version'), threw);
  ok('BUILD: an unstamped copy shows the local label in Settings',
     a.viewData().includes('Local copy, not a deployed build'));
}

/* ── DRAFT: every draft edit stays on this device and survives a reopen (Phase 4, DRAFT-05/D-09) ──
   Every tap mid-workout used to call save(), which bumps updatedAt and schedules a push. The push is
   harmless now that the wire strips the draft, but the bump is not: it made a device that merely
   had a workout open look newest to the merge (the weather-cache lesson in CLAUDE.md). From here a
   draft edit is stored with saveLocal() only. Three draft functions still push, each because it
   writes synced data: pickEx and exPick can found an exercise-registry row, and finishWorkout
   lands the session. The structural check below names any new function that reads DB.draft and
   calls save(), so a fourth pusher is a decision someone has to make out loud. */
console.log('\n── DRAFT: every draft edit stays on this device and survives a reopen ──');
const DRAFT_PUSHERS = ['exPick', 'finishWorkout', 'pickEx'];
/* [name, setup(DB), args(DB), changed(DB)]. Every row starts from populatedDB + fullDraft('PUSH 1')
   with updatedAt 1000 and a fresh push spy; setup adjusts that state before the call. */
const DRAFT_ONLY_MUTATORS = [
  ['setVal',           null, () => [0,0,'r','8'],       db => db.draft.entries[0].sets[0].r === '8'],
  ['setNote',          null, () => [0,'felt good'],     db => db.draft.entries[0].note === 'felt good'],
  ['setSessionNote',   null, () => ['solid'],           db => db.draft.sessionNote === 'solid'],
  ['setDraftDate',     null, () => ['2026-08-01'],      db => db.draft.date === '2026-08-01'],
  ['setDraftDur',      null, () => ['45'],              db => db.draft.durationMin === '45'],
  ['rollWeight',       null, () => [0,0,'100'],         db => db.draft.entries[0].sets[0].w === '100'],
  ['addSet',           null, () => [0],                 db => db.draft.entries[0].sets.length === 2],
  ['rmSet',            db => { db.draft.entries[0].sets.push({ w:'', r:'', skipped:false }); },
                             () => [0,1],             db => db.draft.entries[0].sets.length === 1],
  ['skipSet',          null, () => [0,0],               db => db.draft.entries[0].sets[0].skipped === true],
  ['unskipSet',        db => { db.draft.entries[0].sets[0].skipped = true; },
                             () => [0,0],             db => db.draft.entries[0].sets[0].skipped === false],
  ['deloadExercise',   null, () => [0],                 db => db.draft.entries[0].deload === true],
  ['undeloadExercise', db => { db.draft.entries[0].deload = true; },
                             () => [0],               db => db.draft.entries[0].deload === false],
  ['stairVal',         null, () => ['level','5'],       db => db.draft.stairs.level === '5'],
  ['stairTimeSet',     null, () => ['m','2'],           db => db.draft.stairs.seconds === '120'],
  /* The else branch: the top-of-range branch draws confetti on a canvas the harness stubs as null. */
  ['repCheck',         db => { const st = db.draft.entries[0].sets[0]; st.r = '1'; st._cel = true; },
                             () => [0,0],             db => db.draft.entries[0].sets[0]._cel === false],
  ['skipStairs',       null, () => [],                  db => db.draft.stairs.skipped === true],
  ['unskipStairs',     db => { db.draft.stairs.skipped = true; },
                             () => [],                db => db.draft.stairs.skipped === false],
  ['exSet',            null, () => ['abs',0,'r','12'],  db => db.draft.extras.abs.sets[0].r === '12'],
  ['exRoll',           null, () => ['abs',0,'40'],      db => db.draft.extras.abs.sets.length === 3 && db.draft.extras.abs.sets.every(s => s.w === '40')],
  ['exAddSet',         null, () => ['abs'],             db => db.draft.extras.abs.sets.length === 4],
  ['exRmSet',          null, () => ['abs',1],           db => db.draft.extras.abs.sets.length === 2],
  ['startWorkout',     db => { db.draft = null; },
                             () => ['PULL 1'],        db => !!db.draft && db.draft.workout === 'PULL 1'],
  ['startBackdate',    db => { db.draft = null; },
                             () => ['PULL 1'],        db => !!db.draft && db.draft.historical === true],
  /* s1's fixture extras are empty, which the Log tab would heal in memory without storing. */
  ['editSession',      (db, a) => { db.draft = null; db.sessions.find(s => s.id === 's1').extras = a.__sandbox.blankExtras('PUSH 1'); },
                             db => [db.sessions.findIndex(s => s.id === 's1')],
                                                      db => !!db.draft && db.draft.editRef === 's1'],
  ['discardWorkout',   null, () => [],                  db => db.draft === null],
];
{
  const a = loadApp(APP_PATH);
  const failing = [];
  DRAFT_ONLY_MUTATORS.forEach(([name, setup, args, changed]) => {
    const db = populatedDB(a); db.draft = fullDraft(a, 'PUSH 1'); db.updatedAt = 1000;
    if(setup) setup(db, a);
    a.DB = db;
    const spy = spyPushes(a);
    a.__sandbox.localStorage.removeItem('ppl_tracker_v1');   // a row that stores nothing reads as a mismatch
    const fn = a.__sandbox[name];
    if(typeof fn !== 'function'){ failing.push({ name, reason: 'not a function' }); return; }
    try{ fn.apply(null, args(a.DB)); }
    catch(e){ failing.push({ name, reason: 'threw: ' + (e && e.message) }); return; }
    const stored = a.__stored();
    const why = [];
    if(spy.n !== 0) why.push('pushes: ' + spy.n);
    if(a.DB.updatedAt !== 1000) why.push('updatedAt: ' + a.DB.updatedAt);
    if(!stored || canon(stored.draft) !== canon(a.DB.draft)) why.push('stored draft differs');
    if(!changed(a.DB)) why.push('no visible change');
    if(why.length) failing.push({ name, reason: why.join(', ') });
  });
  ok('DRAFT-05: every draft-only edit is stored on this device with no updatedAt bump and no push',
     failing.length === 0 && DRAFT_ONLY_MUTATORS.length === 25, failing);

  /* Every function the script declares, whose comment-stripped source reads DB.draft and calls bare
     save() (saveLocal() does not match). A new one fails here by name. */
  const stripComments = src => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const pushers = Object.keys(a.__sandbox).filter(k => {
    const f = a.__sandbox[k];
    if(typeof f !== 'function') return false;
    const src = stripComments(Function.prototype.toString.call(f));
    return /\bDB\.draft\b/.test(src) && /(?<![\w.$])save\(\)/.test(src);
  }).sort();
  ok('DRAFT-05: only pickEx, exPick and finishWorkout still push from a draft function',
     canon(pushers) === canon(DRAFT_PUSHERS), pushers);
}
{
  /* Close and reopen: a scripted run of edits, then a fresh boot from the stored blob alone. */
  const a = loadApp(APP_PATH);
  spyPushes(a);
  const d = populatedDB(a); d.draft = null; a.DB = d;
  a.__sandbox.startWorkout('PUSH 1');
  a.setVal(0, 0, 'w', '135');
  a.setVal(0, 0, 'r', '8');
  a.__sandbox.addSet(0);
  a.__sandbox.stairVal('level', '6');
  let reopened = null, threw = null;
  try{ reopened = loadApp(APP_PATH, a.__stored()); }catch(e){ threw = e; }
  const same = !!reopened && !!a.DB.draft && canon(reopened.DB.draft) === canon(a.DB.draft);
  ok('DRAFT-05: closing and reopening the app restores the draft exactly',
     same && a.DB.draft.entries[0].sets[0].r === '8' && a.DB.draft.stairs.level === '6',
     threw ? String(threw) : { before: a.DB.draft && a.DB.draft.entries[0], after: reopened && reopened.DB.draft && reopened.DB.draft.entries[0] });
}
{
  /* A past session reopened for editing: re-saving must still replace the original, so editRef has
     to come back with the draft. */
  const a = loadApp(APP_PATH);
  spyPushes(a);
  const d = populatedDB(a); d.draft = null;
  const idx = d.sessions.findIndex(s => s.id === 's1');
  d.sessions[idx].extras = a.__sandbox.blankExtras('PUSH 1');
  a.DB = d;
  a.__sandbox.editSession(idx);
  let reopened = null, threw = null;
  try{ reopened = loadApp(APP_PATH, a.__stored()); }catch(e){ threw = e; }
  const rd = reopened && reopened.DB.draft;
  ok('DRAFT-05: a draft reopened for editing survives close and reopen with its editRef',
     !!rd && canon(rd) === canon(a.DB.draft) && rd.editRef === 's1',
     threw ? String(threw) : { editRef: rd && rd.editRef, same: !!rd && canon(rd) === canon(a.DB.draft) });
}
{
  /* CLAUDE.md is where the next agent learns this rule. It must keep naming the two helpers the
     tripwire and the allowlist enforce, and they must still exist. Names only, never the wording. */
  const claudeMdPath = APP_PATH.replace(/index\.html$/, 'CLAUDE.md');
  const claudeMd = fs.existsSync(claudeMdPath) ? fs.readFileSync(claudeMdPath, 'utf8') : '';
  const named = ['keepLocalDraft', 'stripDraft'].map(n => ({ n, inDoc: claudeMd.includes(n), isFn: typeof app[n] === 'function' }));
  ok('DRAFT rule: CLAUDE.md names the helpers the tests enforce, and both exist in index.html',
     named.every(x => x.inDoc && x.isFn), named);
}
asyncBlock('DRAFT a brand-new exercise picked mid-workout', async () => {
  const a = loadApp(APP_PATH);
  const spy = spyPushes(a);
  try{
    const d = populatedDB(a); d.draft = fullDraft(a, 'PUSH 1'); d.updatedAt = 1000; a.DB = d;
    const hasZercher = rows => (rows || []).some(r => r && r.name === 'Zercher carry');
    a.__sandbox.pickEx(0, { value: 'Zercher carry' });
    const local = { row: hasZercher(a.DB.exercises), pushes: spy.n, updatedAt: a.DB.updatedAt };
    /* The cloud is OLDER than the frozen clock: `exercises` is not a COLLECTIONS entry, so mergeDB()
       takes the whole registry from the newer side. */
    const remote = populatedDB(a); remote.updatedAt = 1000;
    const cloud = fakeCloud(a, remote, { signedIn: true });
    await a.pushNow(true);
    const last = cloud.writes.length ? JSON.parse(cloud.writes[cloud.writes.length - 1].blob) : null;
    ok('DRAFT-05: picking a brand-new exercise mid-workout still pushes the new registry row',
       local.row && local.pushes === 1 && local.updatedAt !== 1000
         && !!last && hasZercher(last.exercises) && !('draft' in last),
       Object.assign(local, { writes: cloud.writes.length, written: !!last && hasZercher(last.exercises),
         draftKey: !!last && ('draft' in last), status: a.SYNC.status }));
  } finally { a.SYNC.docRef = null; a.SYNC.user = null; }
});
asyncBlock('DRAFT a draft through a sync adoption and a reopen', async () => {
  const a = loadApp(APP_PATH);
  spyPushes(a);
  try{
    const local = populatedDB(a);
    local.draft = fullDraft(a, 'PUSH 1');
    local.draft.entries[0].sets[0] = { w: '135', r: '8', skipped: false };
    local.updatedAt = 1000;
    a.DB = local; a.saveLocal();
    const before = canon(a.DB.draft);
    const cloud = fakeCloud(a, null, { signedIn: true });
    a.startLiveSync();
    /* A newer cloud doc from a device still on the old build: its own sessions, and its draft. */
    const tick = populatedDB(a);
    tick.sessions = tick.sessions.map(s => Object.assign({}, s, { id: 'cloud-' + s.id }));
    tick.draft = draftFor(a, 'LEGS 1'); tick.updatedAt = 9000;
    cloud.fire(tick);
    let reopened = null, threw = null;
    try{ reopened = loadApp(APP_PATH, a.__stored()); }catch(e){ threw = e; }
    const rd = reopened && reopened.DB.draft;
    const cloudSessions = !!reopened && reopened.DB.sessions.some(s => String(s.id).startsWith('cloud-'));
    ok('DRAFT-05: a draft survives a sync adoption and then a reopen',
       !!rd && canon(rd) === before && canon(a.DB.draft) === before && cloudSessions,
       threw ? String(threw) : { draft: rd && rd.workout, same: !!rd && canon(rd) === before, cloudSessions });
  } finally { a.SYNC.docRef = null; a.SYNC.user = null; }
});

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
const EXPORTER_FNS = ['mdEscape','mdCell','mdHeader','exportRows','buildMarkdownExport','exportMarkdown','downloadMarkdown','exportShareFailed'];

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
  /* Exactly one Settings control runs exportMarkdown, whatever the markup calls it (Phase 5 moved
     the call from an inline handler to a delegated action, Pitfall 8). */
  const xActions = X.ACTIONS || {};
  const exportControls = controlsIn(html).filter(c => {
    const own = Object.prototype.hasOwnProperty.call(xActions, c.data.action) && xActions[c.data.action];
    return !!own && typeof own.click === 'function' && Function.prototype.toString.call(own.click).includes('exportMarkdown(');
  }).length;
  ok('export: Settings shows Export for Claude (.md) directly below Export backup (.json) (D-02)',
     jsonIdx >= 0 && claudeIdx > jsonIdx && importIdx > claudeIdx && buttonTagsBetween === 1 && exportControls === 1,
     { jsonIdx, claudeIdx, importIdx, buttonTagsBetween, exportControls });
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

/* WR-01 / T-02-11: a hand-edited backup can leave null or a non-object inside sets. Before the guard
   in sessionRows' addItem, set.w threw out of buildMarkdownExport and killed every section's export,
   not just the bad row. The bad set is dropped, its neighbours keep their original set numbers, and
   the other collections still export. */
{
  const aNull = loadApp(APP_PATH);
  aNull.DB = Object.assign(aNull.blank(), {
    sessions: [ { id:'e5', date:'2026-08-01', workout:'PUSH 1', endedAt:1, entries:[
      { name:'A', sets:[{w:'1',r:'1'}, null, 'nonsense', {w:'3',r:'3'}] },
    ], extras:{} } ],
    ideas: [ { id:'i9', date:'2026-08-02', text:'still here' } ],
  });
  let md = null, threw = null;
  try { md = aNull.buildMarkdownExport(); } catch(e){ threw = String(e && e.message); }
  const sections = md === null ? {} : mdSections(md);
  const workouts = sections['Workouts'];
  ok('export: a malformed set is dropped instead of aborting the export (WR-01/T-02-11)',
     threw === null && !!workouts &&
     JSON.stringify(workouts.rows.map(r=>r[3]+':'+r[4])) === JSON.stringify(['1:1','4:3']),
     { threw, rows: workouts && workouts.rows });
  ok('export: one malformed set does not take the other collections down with it (WR-01/T-02-11)',
     threw === null && !!sections['Ideas'] && sections['Ideas'].rows.length === 1,
     { threw, ideas: sections['Ideas'] });
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

/* Plan 02-03 Task 2 (D-01/D-03): the share sheet in front of the download, with a download
   fallback everywhere else. Each scenario gets its own instance and its own navigator/File/Blob/
   anchor stubs — the default sandbox (no File, no share) is left alone so the smoke draw, the
   Task 1 tracer test above, and every other check keep the download-only environment they expect. */
function shareEnv(a, opts){
  opts = opts || {};
  const clicks = [];
  a.__sandbox.document.createElement = () => {
    const node = { href:'', download:'', click(){ clicks.push({ href: node.href, download: node.download }); } };
    return node;
  };
  const blobs = [];
  a.__sandbox.Blob = function Blob(parts, o){ this.parts = parts; this.type = o && o.type; blobs.push(this); };
  const files = [];
  if(opts.file !== false){
    a.__sandbox.File = function File(parts, name, o){ this.parts = parts; this.name = name; this.type = o && o.type; files.push(this); };
  } else {
    delete a.__sandbox.File;
  }
  const canShareCalls = [];
  const shareCalls = [];
  const nav = {};
  if(opts.canShareFn !== false){
    nav.canShare = data => { canShareCalls.push(data); return opts.canShare === true; };
  }
  if(opts.shareFn !== false){
    nav.share = data => {
      shareCalls.push(data);
      if(opts.shareThrows) throw opts.shareThrows;
      const rejection = opts.shareRejects;
      return {
        catch(fn){ if(rejection) fn(rejection); return this; },
        then(onOk, onBad){ if(rejection){ if(onBad) onBad(rejection); } else if(onOk) onOk(); return this; },
      };
    };
  }
  a.__sandbox.navigator = nav;
  return { clicks, blobs, files, canShareCalls, shareCalls };
}

{
  const b1 = loadApp(APP_PATH);
  b1.DB = populatedDB(b1);
  const env = shareEnv(b1, { canShare:true });
  const result = b1.exportMarkdown();
  const file = env.files[env.files.length-1];
  ok('export: with a file share sheet, tapping shares ppl-export-2026-08-07.md and downloads nothing (D-01/D-03)',
     result==='share' && env.shareCalls.length===1 && env.shareCalls[0].files[0]===file &&
     !!file && file.name==='ppl-export-2026-08-07.md' && file.type==='text/markdown' &&
     file.parts.join('')===b1.buildMarkdownExport() && env.clicks.length===0,
     { result, clicks: env.clicks.length, fileName: file && file.name });

  ok('export: canShare is asked about the same file that is shared (D-01)',
     env.canShareCalls.length===1 && env.canShareCalls[0].files[0]===file && env.shareCalls[0].files[0]===file,
     { canShareCalls: env.canShareCalls.length, shareCalls: env.shareCalls.length });
}

{
  const b2 = loadApp(APP_PATH);
  b2.DB = populatedDB(b2);
  const env = shareEnv(b2, { canShare:true, shareRejects:{ name:'AbortError' } });
  b2.exportMarkdown();
  const toastText = b2.__sandbox.document.getElementById('toast').textContent;
  ok('export: cancelling the share sheet downloads nothing and shows no error (D-01)',
     env.clicks.length===0 && toastText==='', { clicks: env.clicks.length, toastText });
}

{
  const b3 = loadApp(APP_PATH);
  b3.DB = populatedDB(b3);
  const env = shareEnv(b3, { canShare:true, shareRejects:{ name:'NotAllowedError' } });
  b3.exportMarkdown();
  ok('export: any other share failure falls back to the download (D-01)',
     env.clicks.length===1 && env.clicks[0].download==='ppl-export-2026-08-07.md',
     env.clicks);
}

{
  const b4 = loadApp(APP_PATH);
  b4.DB = populatedDB(b4);
  const env = shareEnv(b4, { canShare:true, shareThrows:new TypeError('nope') });
  b4.exportMarkdown();
  ok('export: a share call that throws falls back to the download (D-01)',
     env.clicks.length===1 && env.clicks[0].download==='ppl-export-2026-08-07.md',
     env.clicks);
}

{
  const b5 = loadApp(APP_PATH);
  b5.DB = populatedDB(b5);
  const env = shareEnv(b5, { canShare:false });
  const result = b5.exportMarkdown();
  ok('export: canShare false goes straight to the download (D-01)',
     result==='download' && env.shareCalls.length===0 && env.clicks.length===1,
     { result, shareCalls: env.shareCalls.length, clicks: env.clicks.length });
}

{
  const b6 = loadApp(APP_PATH);
  b6.DB = populatedDB(b6);
  const env = shareEnv(b6, { canShareFn:false });
  const result = b6.exportMarkdown();
  ok('export: no canShare goes straight to the download (D-01)',
     result==='download' && env.shareCalls.length===0 && env.clicks.length===1, result);
}

{
  const b7 = loadApp(APP_PATH);
  b7.DB = populatedDB(b7);
  const env = shareEnv(b7, { file:false, canShare:true });
  const result = b7.exportMarkdown();
  ok('export: no File constructor goes straight to the download (D-01)',
     result==='download' && env.shareCalls.length===0, { result, shareCalls: env.shareCalls.length });
}

{
  const scenarios = [
    ['download', { canShare:false }],
    ['share-success', { canShare:true }],
    ['AbortError', { canShare:true, shareRejects:{ name:'AbortError' } }],
    ['NotAllowedError', { canShare:true, shareRejects:{ name:'NotAllowedError' } }],
  ];
  const bad = [];
  scenarios.forEach(([label, opts])=>{
    const b = loadApp(APP_PATH);
    b.DB = populatedDB(b);
    b.__sandbox.localStorage.setItem('ppl_tracker_v1', JSON.stringify(b.DB));
    shareEnv(b, opts);
    const beforeDB = JSON.stringify(b.DB), beforeStored = JSON.stringify(b.__stored()), beforeBackup = b.DB.lastBackupAt;
    b.exportMarkdown();
    const afterDB = JSON.stringify(b.DB), afterStored = JSON.stringify(b.__stored()), afterBackup = b.DB.lastBackupAt;
    if(beforeDB!==afterDB || beforeStored!==afterStored || beforeBackup!==afterBackup) bad.push(label);
  });
  ok('export: no export path writes DB, localStorage or lastBackupAt (EXP-01)', bad.length===0, bad);
}

{
  const b9 = loadApp(APP_PATH);
  b9.DB = populatedDB(b9);
  const env = shareEnv(b9, { canShareFn:false });
  b9.exportMarkdown();
  b9.exportMarkdown();
  ok('export: two exports in a row produce identical files (EXP-01 concurrency)',
     env.blobs.length===2 && env.blobs[0].parts[0]===env.blobs[1].parts[0],
     env.blobs.length);
}

{
  const b10 = loadApp(APP_PATH);
  const env = shareEnv(b10, {});
  const r1 = b10.exportShareFailed({ name:'AbortError' }, 't', 'f.md');
  const clicksAfterAbort = env.clicks.length;
  const r2 = b10.exportShareFailed({ name:'DataError' }, 't', 'f.md');
  const clicksAfterDataError = env.clicks.length;
  const r3 = b10.exportShareFailed(undefined, 't', 'f.md');
  const clicksAfterUndefined = env.clicks.length;
  ok('export: exportShareFailed stays silent on AbortError and downloads otherwise (D-01)',
     r1===false && clicksAfterAbort===0 &&
     r2===true && clicksAfterDataError===1 && env.clicks[0].download==='f.md' &&
     r3===true && clicksAfterUndefined===2 && env.clicks[1].download==='f.md',
     { r1, r2, r3, clicks: env.clicks });
}

{
  const b11 = loadApp(APP_PATH);
  b11.DB = populatedDB(b11);
  Object.defineProperty(b11.DB, 'journal', { configurable:true, enumerable:true, get(){ throw new Error('boom'); } });
  const env = shareEnv(b11, { canShare:true });
  const result = b11.exportMarkdown();
  const toastText = b11.__sandbox.document.getElementById('toast').textContent;
  ok('export: a build failure shows a toast and neither shares nor downloads',
     result==='error' && toastText==="Couldn't build the export" && env.clicks.length===0 && env.shareCalls.length===0,
     { result, toastText, clicks: env.clicks.length, shareCalls: env.shareCalls.length });
}

console.log('\n── F2: every inline handler becomes a delegated action (DELEG-01…06) ──');
/* Phase 5 moves every inline on-event attribute to one delegated dispatcher: markup names an action
   (`data-action`), five document listeners hand the event to dispatchAction(), and the event-keyed
   ACTIONS registry calls the existing function. Delegation fails SILENTLY — a dropped call site, a
   string where a number was, or a double fire all look like "the button does nothing" on the
   phone, where the inline version would have worked or thrown. These checks are the phase.

   The helpers below are top-level function declarations, hoisted with their bodies, so checks
   earlier in the file may call them. They read only their arguments, never a const declared in
   this section (that would be a temporal-dead-zone error when called from earlier). */

/* One object per start tag in rendered `html` that carries a data-action attribute. */
function controlsIn(html){
  const out = [];
  const decode = v => String(v).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  const TAG = /<([a-zA-Z][\w-]*)((?:\s+[^\s=>\/"']+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>"']+))?)*)\s*\/?>/g;
  const ATTR = /([^\s=>\/"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"']+)))?/g;
  let m;
  while((m = TAG.exec(String(html || '')))){
    const attrs = {};
    let a;
    ATTR.lastIndex = 0;
    while((a = ATTR.exec(m[2]))){
      const name = a[1].toLowerCase();
      const val = a[2] !== undefined ? a[2] : a[3] !== undefined ? a[3] : a[4] !== undefined ? a[4] : null;
      if(!(name in attrs)) attrs[name] = val;
    }
    if(!('data-action' in attrs)) continue;
    const data = {};
    Object.keys(attrs).filter(k => k.startsWith('data-')).forEach(k => {
      data[k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = decode(attrs[k] === null ? '' : attrs[k]);
    });
    out.push({ tag: m[1].toLowerCase(), type: attrs.type ? decode(attrs.type) : '', cls: attrs.class ? decode(attrs.class) : '',
               disabled: 'disabled' in attrs, data });
  }
  return out;
}
/* A stand-in element: enough for dispatchAction (dataset, disabled, value, closest). */
function fakeEl(data, extra){
  const el = Object.assign({ dataset: Object.assign({}, data), disabled: false, value: '' }, extra);
  if(!('closest' in el)) el.closest = sel => sel === '[data-action]' ? el : null;
  return el;
}
function f2Event(type, el, more){
  return Object.assign({ type, target: el, key: undefined, defaultPrevented: false,
    preventDefault(){ this.defaultPrevented = true; } }, more);
}
/* Straight into the dispatcher. */
function fireAction(a, type, el, more){
  const ev = f2Event(type, el, more);
  if(typeof a.dispatchAction === 'function') a.dispatchAction(ev);
  return ev;
}
/* Through every listener the app itself registered on document for this event type, exactly as a
   real tap reaches the app. This proves the registration as well as the dispatch. */
function fireListener(a, type, el, more){
  const ev = f2Event(type, el, more);
  ((a.__listeners && a.__listeners[type]) || []).forEach(l => { if(typeof l.fn === 'function') l.fn(ev); });
  return ev;
}
/* Replace a function declaration on the vm global with a recorder of its argument lists. A wrapper
   resolves the name through the global at call time, so the override is what it calls. */
function spyOn(a, name){
  const calls = [];
  a.__sandbox[name] = (...args) => { calls.push(args); };
  return calls;
}
/* JS comments out, keeping `https://` (a `//` preceded by a colon is a URL, not a comment). */
function f2StripJs(s){
  return String(s).replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/.*$/gm, '$1');
}
/* The static markup: from <body> up to the first exact <script> (the inline app script). */
function f2Static(raw){
  const b = raw.indexOf('<body>'), s = raw.indexOf('<script>', b < 0 ? 0 : b);
  return b < 0 || s < 0 ? '' : raw.slice(b, s);
}

const F2_EVENTS = ['click','change','input','keydown','pointerdown'];
const F2_RAW = fs.readFileSync(APP_PATH, 'utf8');
const F2_INV_PATH = path.join(__dirname, 'fixtures', 'handler-inventory.json');
let F2_INV = [], F2_INV_ERR = null;
try { F2_INV = JSON.parse(fs.readFileSync(F2_INV_PATH, 'utf8')); }
catch(e){ F2_INV_ERR = String(e && e.message || e); F2_INV = []; }
if(!Array.isArray(F2_INV)){ F2_INV_ERR = F2_INV_ERR || 'not an array'; F2_INV = []; }
/* A fresh instance, so no earlier check's override of a sandbox function can hide a call site. */
const f2app = loadApp(APP_PATH);
const F2_A = f2app.ACTIONS || {};
const f2Own = name => typeof name === 'string' && Object.prototype.hasOwnProperty.call(F2_A, name);
const f2FnSrc = fn => fn === '(static markup)' ? f2Static(F2_RAW)
  : (typeof f2app.__sandbox[fn] === 'function' ? Function.prototype.toString.call(f2app.__sandbox[fn]) : '');
const f2HandlerSrc = (name, ev) => f2Own(name) && F2_A[name] && typeof F2_A[name][ev] === 'function'
  ? Function.prototype.toString.call(F2_A[name][ev]) : '';
const f2Names = r => Array.isArray(r.actions) ? r.actions : (r.action ? [r.action] : []);
const f2Count = (hay, needle) => needle ? hay.split(needle).length - 1 : 0;

ok('DELEG-01: the handler inventory exists and every row names its function, event, handler text and callees', (() => {
  if(F2_INV_ERR || !F2_INV.length) return false;
  const seen = new Set();
  return F2_INV.every(r => {
    if(!r || typeof r !== 'object') return false;
    const key = [r.fn, r.event, r.was, r.occurrence].join('|');
    if(seen.has(key)) return false;
    seen.add(key);
    const hasAction = 'action' in r, hasActions = 'actions' in r;
    return typeof r.fn === 'string' && r.fn.length > 0 && F2_EVENTS.includes(r.event)
      && typeof r.was === 'string' && r.was.length > 0 && Number.isInteger(r.occurrence) && r.occurrence >= 1
      && Array.isArray(r.calls) && r.calls.every(c => typeof c === 'string' && c.length > 0)
      && hasAction !== hasActions
      && (hasAction ? (r.action === null || typeof r.action === 'string')
                    : (Array.isArray(r.actions) && r.actions.every(x => typeof x === 'string' && x.length > 0)));
  });
})(), F2_INV_ERR || undefined);

/* DELEG-03, the ratchet. An unmapped row must still be inline, verbatim, in its function. A mapped
   row must be wired (`data-action`, or `data-action="enter"` + `data-enter` for Enter-to-submit) in
   the same function, to an action that handles its event, and that action must still call every
   function the original handler called. */
{
  const broken = [];
  F2_INV.forEach(r => {
    if(!r || typeof r !== 'object') return;
    const src = f2FnSrc(r.fn), names = f2Names(r);
    if(!names.length){
      if(f2Count(src, `on${r.event}="${r.was}"`) < r.occurrence) broken.push({ fn: r.fn, event: r.event, was: r.was, why: 'dropped without a mapping' });
      return;
    }
    const why = [];
    names.forEach(x => {
      if(r.event === 'keydown'){
        if(!f2HandlerSrc('enter', 'keydown')) why.push('no enter.keydown');
        if(!f2HandlerSrc(x, 'click')) why.push(x + ' has no click handler');
        if(!src.includes('data-action="enter"') || !src.includes(`data-enter="${x}"`)) why.push(x + ' not wired by data-enter');
      } else {
        if(!f2HandlerSrc(x, r.event)) why.push(x + ' has no ' + r.event + ' handler');
        if(!src.includes(`data-action="${x}"`)) why.push(x + ' not wired by data-action');
      }
    });
    const ran = names.map(x => f2HandlerSrc(x, r.event === 'keydown' ? 'click' : r.event)).join('\n');
    /* Whole identifier only: `goX` must not stand in for `go`. */
    (r.calls || []).forEach(c => {
      const tail = String(c).split('.').pop().replace(/\$/g, '\\$');
      if(!new RegExp('(?<![\\w$])' + tail + '(?![\\w$])').test(ran)) why.push('lost call ' + c);
    });
    if(why.length) broken.push({ fn: r.fn, event: r.event, was: r.was, why });
  });
  /* Per occurrence, not per name: two rows mapped to the same action in one function need two
     wiring sites, so one surviving sibling cannot hide a dropped control (05-03 mutation pass: the
     Load weather button lost its data-action while the refresh button kept the name present).
     Counted per event: one element whose action handles two events (the stopwatch's pointerdown and
     click, the weight box's input and change) is two rows but one wiring site, while two rows of the
     SAME event mapped to one action still need two sites (05-06). */
  const perEvent = {};
  F2_INV.forEach(r => {
    if(!r || typeof r !== 'object') return;
    f2Names(r).forEach(x => {
      const attr = r.event === 'keydown' ? `data-enter="${x}"` : `data-action="${x}"`;
      const k = r.fn + '\u0000' + attr + '\u0000' + r.event;
      perEvent[k] = (perEvent[k] || 0) + 1;
    });
  });
  const need = {};
  Object.keys(perEvent).forEach(k => {
    const key = k.split('\u0000').slice(0, 2).join('\u0000');
    need[key] = Math.max(need[key] || 0, perEvent[k]);
  });
  Object.keys(need).forEach(k => {
    const [fn, attr] = k.split('\u0000');
    const have = f2Count(f2FnSrc(fn), attr);
    if(have < need[k]) broken.push({ fn, why: `${attr} wired ${have}x, ${need[k]} inventory rows map to it` });
  });
  ok('DELEG-03: every inventoried call site is still inline, or is wired to an action that handles its event and keeps every call',
     !F2_INV_ERR && broken.length === 0, broken.slice(0, 5));
}

/* DELEG-04: no NEW inline handler. Every inline on-event attribute left in the file (any event, any
   quoting, comments included) must be an UNMAPPED inventory row, and no key may appear more often
   than the unmapped rows allow. */
{
  const scan = typeof scanInlineHandlers === 'function' ? scanInlineHandlers : null;
  const rows = scan ? scan(F2_RAW) : [];
  const budget = {};
  F2_INV.filter(r => r && !f2Names(r).length).forEach(r => { const k = [r.fn, r.event, r.was].join('|'); budget[k] = (budget[k] || 0) + 1; });
  const used = {}, offenders = [];
  rows.forEach(r => {
    const k = [r.fn, r.event, r.was].join('|');
    used[k] = (used[k] || 0) + 1;
    if(!F2_EVENTS.includes(r.event) || r.was === null || used[k] > (budget[k] || 0)) offenders.push({ fn: r.fn, event: r.event, tag: r.tag, was: r.was });
  });
  const synthetic = scan ? { attribute: scan('<b onclick="x()">').length, jsProperty: scan('r.onload=()=>1; const one = 2').length } : null;
  ok('DELEG-04: every inline handler left in index.html is an unconverted inventory row',
     !!scan && !F2_INV_ERR && offenders.length === 0 && synthetic.attribute === 1 && synthetic.jsProperty === 0,
     { offenders: offenders.slice(0, 5), synthetic });
}

/* DELEG-04: every action name in the source is a literal that names a registry entry. */
{
  const text = f2StripJs(f2app.__src || '') + '\n' + f2Static(F2_RAW);
  const unknown = [], built = [];
  for(const m of text.matchAll(/data-(action|enter)\s*=\s*("([^"]*)"|\S{0,24})/g)){
    const quoted = m[2][0] === '"', val = quoted ? m[3] : m[2];
    if(!quoted || val.includes('${')) built.push(m[0]);
    else if(!f2Own(val)) unknown.push(m[1] + '=' + val);
  }
  ok('DELEG-04: every data-action and data-enter names an ACTIONS entry, and no action name is built at runtime',
     unknown.length === 0 && built.length === 0, { unknown: unknown.slice(0, 5), built: built.slice(0, 5) });
}

/* DELEG-02: one document listener per delegated event, all dispatchAction, none passive (a passive
   pointerdown would silently drop swGuard's preventDefault and dismiss the keyboard mid-set). */
{
  const a = loadApp(APP_PATH);
  const wrong = F2_EVENTS.filter(t => {
    const ls = (a.__listeners && a.__listeners[t]) || [];
    if(ls.length !== 1 || typeof a.dispatchAction !== 'function' || ls[0].fn !== a.dispatchAction) return true;
    const o = ls[0].opts;
    return !!(o && typeof o === 'object' && o.passive);
  });
  ok('DELEG-02: document has one listener per delegated event, it is dispatchAction, and none is passive', wrong.length === 0, wrong);
}

/* The tracer: a tap on a tab reaches go() only through the listener the app registered, the
   dispatcher and the registry. */
{
  const a = loadApp(APP_PATH);
  let control = null, threw = null;
  try {
    if(typeof a.buildTabBar === 'function') a.buildTabBar();
    control = controlsIn(a.__sandbox.document.getElementById('tabbar').innerHTML).find(c => c.data.tab === 'train') || null;
    if(control) fireListener(a, 'click', fakeEl(control.data));
  } catch(e){ threw = e.message; }
  ok('DELEG tracer: a tap on a tab reaches go() through the document listener',
     !threw && !!control && control.tag === 'button' && control.data.action === 'go' && a.TAB === 'train',
     { threw, control, TAB: a.TAB });
}

/* Every numeric data-* key. A wrapper must read each one as `+el.dataset.key` or
   `Number(el.dataset.key)`: dataset values are always strings, and a string index fails silently
   (a Set lookup that never matches, `0 + "-1"`, "set 01"). A plan that needs another numeric key
   adds it here in the same commit. */
const NUMERIC_DATA = ['i','k','idx','n','d','range'];
/* Function names allowed to stop propagation, each added only after confirming it cannot starve the
   one document listener for that event. Empty: index.html had none when Phase 5 began. */
const REVIEWED_PROPAGATION = [];
/* Actions allowed on a non-button click target. The Ideas modal backdrop wraps interactive controls,
   so it cannot be a <button>; its keyboard path is the sheet's own Close button (D-08). */
const REVIEWED_NONBUTTON_CLICK = ['ideasBackdrop'];

/* Instance whose Today view throws, so render() shows the "Something broke" card. */
function f2ErrorCard(){
  const a = loadApp(APP_PATH);
  const t = a.TABS[0], view = t.view;
  t.view = () => { throw new Error('boom'); };
  try { a.go(t.id); } finally { t.view = view; }
  return { a, html: a.__sandbox.document.getElementById('app').innerHTML || '' };
}
/* Every rendered state the F2 checks look at: the static markup, every screen in three states, the
   tab bar and the error card. Computed once. */
function f2Corpus(){
  if(f2Corpus.cache) return f2Corpus.cache;
  const out = [];
  const raw = fs.readFileSync(APP_PATH, 'utf8');
  out.push({ label: 'static markup', html: f2Static(raw) });
  const states = [
    ['with data', a => { a.DB = populatedDB(a); }],
    ['fresh install', a => { a.DB = a.blank(); }],
    ['mid-workout', a => { const d = populatedDB(a); d.draft = fullDraft(a, 'PUSH 1'); a.DB = d; }],
  ];
  states.forEach(([state, seed]) => {
    const a = loadApp(APP_PATH);
    seed(a);
    const appEl = a.__sandbox.document.getElementById('app');
    SCREENS.forEach(([label, tab, sub]) => {
      appEl.innerHTML = '';
      try { a.go(tab); if(sub) a.setSub(sub); } catch(e){ /* drawEvery reports a screen that throws */ }
      out.push({ label: `${state}: ${label}`, html: appEl.innerHTML || '' });
    });
    a.buildTabBar();
    out.push({ label: `${state}: tab bar`, html: a.__sandbox.document.getElementById('tabbar').innerHTML || '' });
  });
  out.push({ label: 'error card', html: f2ErrorCard().html });
  /* States later plans add, to reach controls the default screens do not render: */
  /* 05-02: the Ideas list, which lives in static markup outside render(), with one idea being
     edited so both row forms (read and edit) are present. */
  {
    const a = loadApp(APP_PATH);
    a.DB = a.blank();
    a.DB.ideas = [{ id:'i1', text:'first', date:a.todayISO(), done:false, mtime:1 },
                  { id:'i2', text:'second', date:a.todayISO(), done:true, mtime:1 }];
    const list = () => a.__sandbox.document.getElementById('ideas-list').innerHTML || '';
    try {
      a.renderIdeasList();
      const edit = controlsIn(list()).find(c => c.data.action === 'startEditIdea' && c.data.id === 'i2');
      if(edit) fireAction(a, 'click', fakeEl(edit.data));
    } catch(e){ /* a throw leaves whatever rendered; the checks read it */ }
    out.push({ label: 'ideas list (one being edited)', html: list() });
  }
  /* 05-02: Settings with the cards the default states never open. The harness has no Firebase, so
     the sync card shows its buttons only once `firebase` is stubbed. */
  {
    const a = loadApp(APP_PATH);
    const appHtml = () => a.__sandbox.document.getElementById('app').innerHTML || '';
    a.__sandbox.firebase = {};
    a.DB = a.blank();
    a.DB.weights = [{ date: a.todayISO(), value: 190, deletedAt: Date.now(), mtime: Date.now() }];
    try {
      a.go('settings');
      out.push({ label: 'Settings: sync signed out', html: appHtml() });
      a.__sandbox.toggleTrash();
      out.push({ label: 'Settings: trash open (one deleted item)', html: appHtml() });
      a.__sandbox.toggleTrash();
      a.snapshotNow('f2');
      a.SYNC.user = { email: 't@example.com' };
      a.SYNC.needsUpdate = true;
      a.cloudVersionList = [{ _id: 'v1', at: Date.now(), label: 'cloud', summary: {} }];
      a.__sandbox.toggleVersions();
      out.push({ label: 'Settings: versions open (local + cloud), sync signed in and paused', html: appHtml() });
    } catch(e){ /* a throw leaves whatever rendered; the checks read it */ }
  }
  /* 05-03: Care → Skin on the shaving sub-tab with phase 0 expanded, which the default Skin screen
     (the routine) never renders. */
  {
    const a = loadApp(APP_PATH);
    a.DB = a.blank();
    try {
      a.go('care'); a.setSub('skin');
      a.__sandbox.skinSubTab('shaving');
      a.__sandbox.skinTogglePhase(0);
    } catch(e){ /* a throw leaves whatever rendered; the checks read it */ }
    out.push({ label: 'Care → Skin: shaving, phase 0 open', html: a.__sandbox.document.getElementById('app').innerHTML || '' });
  }
  /* 05-03: the Lawn states the default screens never reach. `lawnAt` places the location and a
     weather blob for the same spot, so the cache is not stale and no fetch starts. */
  {
    const lawnAt = (a, o) => {
      a.DB = a.blank();
      a.DB.lawn = { lat: 44.94, lon: -93.36, label: 'St. Louis Park' };
      a.DB.wx = o.wx === null ? null : Object.assign(makeWx(Object.assign({ todayISO: a.todayISO() }, o.wx || {})), { lat: 44.94, lon: -93.36 });
      a.DB.lawnLog = {};
      const day = n => { const d = new Date(a.todayISO() + 'T00:00'); d.setDate(d.getDate() - n); return d.toLocaleDateString('en-CA'); };
      if(o.mowedDaysAgo != null) (a.DB.lawnLog[day(o.mowedDaysAgo)] = a.DB.lawnLog[day(o.mowedDaysAgo)] || {}).mowed = true;
      if(o.wateredDaysAgo != null) (a.DB.lawnLog[day(o.wateredDaysAgo)] = a.DB.lawnLog[day(o.wateredDaysAgo)] || {}).watered = true;
    };
    const appHtml = a => a.__sandbox.document.getElementById('app').innerHTML || '';
    {
      const a = loadApp(APP_PATH);
      a.DB = a.blank();
      try { a.go('care'); a.setSub('lawn'); } catch(e){ /* the checks read whatever rendered */ }
      out.push({ label: 'Care → Lawn: no location (setup)', html: appHtml(a) });
    }
    {
      /* never watered, so the full card also shows the "Last done" anchor buttons */
      const a = loadApp(APP_PATH);
      lawnAt(a, { mowedDaysAgo: 9, wx: {} });
      try { a.go('care'); a.setSub('lawn'); } catch(e){ /* the checks read whatever rendered */ }
      out.push({ label: 'Care → Lawn: location and weather (full card, history, refresh)', html: appHtml(a) });
    }
    {
      /* viewLawn() directly: on the screen, onRender starts a fetch that the harness never settles,
         and the view then shows "Loading weather…" in place of the button. */
      const a = loadApp(APP_PATH);
      lawnAt(a, { wx: null });
      let html = '';
      try { html = a.__sandbox.viewLawn(); } catch(e){ /* the checks read whatever rendered */ }
      out.push({ label: 'Care → Lawn: location, no weather (Load weather)', html });
    }
    {
      const a = loadApp(APP_PATH);
      lawnAt(a, { mowedDaysAgo: 5, wateredDaysAgo: 1, wx: { precipByOffset: { 0: 0.6 } } });
      try { a.go('today'); } catch(e){ /* the checks read whatever rendered */ }
      out.push({ label: 'Today: lawn heads-up', html: appHtml(a) });
    }
  }
  /* 05-04: Train → History with the controls the default screen hides. The journal editor and the
     activity panel exclude each other (each opener closes the other), so they are two states. */
  {
    const appHtml = a => a.__sandbox.document.getElementById('app').innerHTML || '';
    const hist = () => { const a = loadApp(APP_PATH); a.DB = populatedDB(a); a.go('train'); a.setSub('history'); return a; };
    {
      const a = hist();
      try {
        a.__sandbox.toggleBackdate();
        a.__sandbox.toggleHist(3);
        a.__sandbox.editJournal(dayOff(-1));
      } catch(e){ /* a throw leaves whatever rendered; the checks read it */ }
      out.push({ label: 'Train → History: backdate picker, session row and journal editor open', html: appHtml(a) });
    }
    {
      const a = hist();
      try {
        a.__sandbox.toggleHist(2);
        a.__sandbox.openActivityAdd(dayOff(-1));
      } catch(e){ /* a throw leaves whatever rendered; the checks read it */ }
      out.push({ label: 'Train → History: skipped row open, activity panel with one logged activity', html: appHtml(a) });
    }
  }
  /* 05-04: Train → Progress on the strength and pet subs (populatedDB has pet weights), and Train →
     Cardio with two logged sessions. The pending-import card needs a parsed Strava file, so its Save
     and Discard are left to the static checks and the ratchet. */
  {
    const appHtml = a => a.__sandbox.document.getElementById('app').innerHTML || '';
    ['strength', 'pet'].forEach(sub => {
      const a = loadApp(APP_PATH);
      a.DB = populatedDB(a);
      try { a.go('train'); a.setSub('progress'); a.__sandbox.progSubTab(sub); } catch(e){ /* the checks read whatever rendered */ }
      out.push({ label: `Train → Progress: ${sub} sub`, html: appHtml(a) });
    });
    const a = loadApp(APP_PATH);
    a.DB = populatedDB(a);
    a.DB.cardio.push({ id:'c2', date:dayOff(-2), type:'Walk', minutes:30, distanceKm:1.2, note:'', source:'strava', mtime:1 });
    try { a.go('train'); a.setSub('cardio'); } catch(e){ /* the checks read whatever rendered */ }
    out.push({ label: 'Train → Cardio: two logged sessions', html: appHtml(a) });
  }
  /* 05-05: Today's workout card in each of its three variants. The frozen clock is a Friday, a
     workout day: populatedDB's next workout is LEGS 2 (the fixed card), 4-day mode after a Pull day
     reaches the Specialized options, and a draft shows Resume. */
  {
    const appHtml = a => a.__sandbox.document.getElementById('app').innerHTML || '';
    [['Today: workout in progress (Resume)', a => { a.DB.draft = fullDraft(a, 'PUSH 1'); }],
     ['Today: workout day, fixed next workout', null],
     ['Today: 4-day mode, Specialized next', a => f2SeedSpecialized(a)],
     ['Today: evening order (week card)', a => f2Evening(a)]].forEach(([label, seed]) => {
      const a = loadApp(APP_PATH);
      try { a.DB = populatedDB(a); if(seed) seed(a); a.go('today'); } catch(e){ /* the checks read whatever rendered */ }
      out.push({ label, html: appHtml(a) });
    });
  }
  /* 05-05: Today's weigh-in card open on a blank DB (both log rows), Today with a lawn location and
     fresh weather (the weather card), and Today with the mobility card open (its checkboxes). */
  {
    const appHtml = a => a.__sandbox.document.getElementById('app').innerHTML || '';
    [['Today: blank, weigh-in open (both log rows)', a => { a.DB = a.blank(); a.go('today'); a.toggleAcc('weighin'); }],
     ['Today: lawn location and weather (weather card)', a => { a.DB = a.blank(); setup(a, {}); a.go('today'); }],
     ['Today: mobility card open', a => { a.DB = a.blank(); a.go('today'); a.toggleAcc('mob-today'); }],
     /* 05-05 Task 3: more to-dos than the cap, expanded (every checkbox and × plus Show less) */
     ['Today: seven to-dos, list expanded', a => {
       a.DB = a.blank();
       a.DB.todos = Array.from({ length: 7 }, (_, k) => ({ text: 'task ' + k, created: dayOff(-k), mtime: 1 }));
       a.go('today'); a.toggleAcc('todos-all'); }],
     /* both banners: never backed up (the backup banner, signed out so Set up sync shows) and a
        quota failure on save (the storage banner) */
     ['Today: backup and storage banners', a => {
       a.DB = a.blank();
       const ls = a.__sandbox.localStorage, setItem = ls.setItem;
       ls.setItem = () => { throw new Error('QuotaExceededError'); };
       try { a.__sandbox.save(); } finally { ls.setItem = setItem; }
       a.go('today'); }]].forEach(([label, drive]) => {
      const a = loadApp(APP_PATH);
      try { drive(a); } catch(e){ /* the checks read whatever rendered */ }
      out.push({ label, html: appHtml(a) });
    });
  }
  /* 05-06: the Log tab's workout picker with a program preview and guide section 0 open, and the
     picker in 4-day mode (the Specialized cards, whose Skip names SPECIALIZED). */
  {
    const appHtml = a => a.__sandbox.document.getElementById('app').innerHTML || '';
    [['Train → Log: picker, PUSH 1 preview and guide section 0 open', a => {
       a.DB = populatedDB(a); a.go('train'); a.setSub('log');
       a.__sandbox.togglePreview('PUSH 1'); a.__sandbox.toggleGuide(0); }],
     ['Train → Log: picker in 4-day mode (Specialized cards)', a => {
       a.DB = populatedDB(a); a.DB.routineMode = '4day'; a.go('train'); a.setSub('log'); }]].forEach(([label, drive]) => {
      const a = loadApp(APP_PATH);
      try { drive(a); } catch(e){ /* the checks read whatever rendered */ }
      out.push({ label, html: appHtml(a) });
    });
  }
  /* 05-06: the active workout in the states the default mid-workout screen never shows. The first has
     slot 0 stalled (the coach's Deload button) with set 1 skipped (its Undo), slot 1 collapsed (the
     whole-card button) and slot 2 deloaded (the coach's undo); the warm-up ramp on slot 0 is open,
     which only changes the DOM box, so its button is what renders. The second is a backdated draft
     (the date and minutes inputs) with the stair stepper skipped (its Undo). */
  {
    const appHtml = a => a.__sandbox.document.getElementById('app').innerHTML || '';
    [['Train → Log: mid-workout, collapsed, skipped set, stalled and deloaded slots, warm-up open', (d, a) => f2MidBusy(d, a),
      a => { a.__sandbox.toggleExCollapse(1); a.__sandbox.toggleWarm(0); }],
     ['Train → Log: backdated draft, stair stepper skipped', d => f2MidPast(d), null],
     /* the warm-up and cool-down accordions and PUSH 1's abs extras card open (its boxes, select and
        set buttons) */
     ['Train → Log: warm-up, cool-down and the abs extras card open', () => {},
      a => { a.__sandbox.toggleAcc('warmup'); a.__sandbox.toggleAcc('stretch'); a.__sandbox.toggleAcc('abs'); }]].forEach(([label, seed, after]) => {
      const a = loadApp(APP_PATH);
      try {
        const d = populatedDB(a); d.draft = fullDraft(a, 'PUSH 1'); seed(d, a); a.DB = d;
        a.go('train'); a.setSub('log');
        if(after) after(a);
      } catch(e){ /* the checks read whatever rendered */ }
      out.push({ label, html: appHtml(a) });
    });
  }
  f2Corpus.cache = out;
  return out;
}

/* Every [name, event, source] in the registry. */
const f2Handlers = () => Object.keys(F2_A).flatMap(name => {
  const spec = F2_A[name];
  return spec && typeof spec === 'object'
    ? Object.keys(spec).filter(ev => typeof spec[ev] === 'function').map(ev => [name, ev, Function.prototype.toString.call(spec[ev])])
    : [];
});

{
  const a = loadApp(APP_PATH);
  a.go('train');
  const c = controlsIn(a.__sandbox.document.getElementById('app').innerHTML).find(x => x.data.action === 'setSub' && x.data.sub === 'history');
  let threw = null;
  try { if(c) fireAction(a, 'click', fakeEl(c.data)); } catch(e){ threw = e.message; }
  ok('DELEG-02: the section switcher changes the sub-view through the dispatcher',
     !!c && !threw && a.subState.train === 'history', { control: c || null, threw, sub: a.subState.train });
}
{
  const { a, html } = f2ErrorCard();
  const cs = controlsIn(html);
  const exp = cs.find(x => x.data.action === 'exportData'), rel = cs.find(x => x.data.action === 'reload');
  const exports = spyOn(a, 'exportData');
  let reloads = 0;
  a.__sandbox.location.reload = () => { reloads++; };
  let threw = null;
  try {
    if(exp) fireAction(a, 'click', fakeEl(exp.data));
    if(rel) fireAction(a, 'click', fakeEl(rel.data));
  } catch(e){ threw = e.message; }
  ok("DELEG-02: the error card's Export and Reload run through the dispatcher",
     /Something broke on this screen/.test(html) && !!exp && !!rel && !threw && exports.length === 1 && reloads === 1,
     { export: !!exp, reload: !!rel, threw, exports: exports.length, reloads });
}

ok('F2: every ACTIONS entry is keyed only by the five delegated events',
   !!f2app.ACTIONS && Object.keys(F2_A).every(name => {
     const spec = F2_A[name];
     return spec && typeof spec === 'object' && Object.keys(spec).length > 0
       && Object.keys(spec).every(ev => F2_EVENTS.includes(ev) && typeof spec[ev] === 'function');
   }),
   Object.keys(F2_A).filter(name => { const s = F2_A[name]; return !s || typeof s !== 'object' || !Object.keys(s).length
     || Object.keys(s).some(ev => !F2_EVENTS.includes(ev) || typeof s[ev] !== 'function'); }));

/* Enter on a focused button fires click natively; a keydown handler there would run it twice. */
ok('F2: only the Enter action listens to keydown',
   Object.keys(F2_A).filter(name => F2_A[name] && typeof F2_A[name].keydown === 'function').every(name => name === 'enter'),
   Object.keys(F2_A).filter(name => F2_A[name] && F2_A[name].keydown && name !== 'enter'));

{
  const bad = f2Handlers().filter(([, , src]) => { const s = f2StripJs(src); return /\bDB\b/.test(s) || /\bsave(Local)?\(/.test(s); })
    .map(([name, ev]) => name + '.' + ev);
  ok('F2: action wrappers never read DB and never persist', bad.length === 0, bad);
}
/* DRAFT-05's own scan walks sandbox function declarations only; ACTIONS' arrows are not among them.
   Apply the same property to every wrapper, so a wrapper can never read the draft and push. */
{
  const bad = f2Handlers().filter(([, , src]) => { const s = f2StripJs(src); return /\bDB\.draft\b/.test(s) && /(?<![\w.$])save\(\)/.test(s); })
    .map(([name, ev]) => name + '.' + ev);
  ok('DRAFT-05 (F2): no action wrapper reads the draft and pushes', bad.length === 0, bad);
}

/* Each `.dataset.<numeric key>` must sit right after `Number(` or a UNARY plus. A binary plus
   (`'x' + el.dataset.i`) is string concatenation, so a plus only counts after an operator, an
   opening bracket, an arrow or the start of the expression. */
function f2UndecodedNumeric(src, keys){
  const bad = [];
  const re = /([\w$]+(?:\.[\w$]+)*)\.dataset\.([A-Za-z_$][\w$]*)(?![\w$])/g;
  let m;
  while((m = re.exec(src))){
    if(!keys.includes(m[2])) continue;
    const before = src.slice(0, m.index).replace(/\s+$/, '');
    const numberCall = /(^|[^\w$.])Number\($/.test(before);
    const unary = /\+$/.test(before) && /(^|[(,=\[:?!&|{};>+\-*\/])$/.test(before.slice(0, -1).replace(/\s+$/, ''));
    if(!numberCall && !unary) bad.push(m[0]);
  }
  return bad;
}
{
  const bad = f2Handlers().flatMap(([name, ev, src]) => f2UndecodedNumeric(f2StripJs(src), NUMERIC_DATA).map(x => `${name}.${ev}: ${x}`));
  const synthetic = {
    caught: f2UndecodedNumeric('el => weekShift(el.dataset.d)', NUMERIC_DATA).length === 1,
    concatCaught: f2UndecodedNumeric("el => f('x' + el.dataset.i)", NUMERIC_DATA).length === 1,
    passes: f2UndecodedNumeric('el => weekShift(+el.dataset.d)', NUMERIC_DATA).length === 0
         && f2UndecodedNumeric('el => f(Number(el.dataset.i), +el.dataset.k)', NUMERIC_DATA).length === 0,
    wholeKey: f2UndecodedNumeric('el => f(el.dataset.dateEl)', NUMERIC_DATA).length === 0,
  };
  ok('F2: every numeric data-* is decoded with Number() or unary plus',
     bad.length === 0 && Object.values(synthetic).every(Boolean), { bad: bad.slice(0, 5), synthetic });
}

{
  const a = loadApp(APP_PATH);
  const cases = [
    ['no target', { target: null }],
    ['closest finds nothing', { target: { closest: () => null } }],
    ['no closest at all', { target: {} }],
    ['unknown action', { target: fakeEl({ action: 'nope', tab: 'care' }) }],
    ['constructor', { target: fakeEl({ action: 'constructor', tab: 'care' }) }],
    ['toString', { target: fakeEl({ action: 'toString', tab: 'care' }) }],
    ['__proto__', { target: fakeEl({ action: '__proto__', tab: 'care' }) }],
    ['disabled', { target: fakeEl({ action: 'go', tab: 'care' }, { disabled: true }) }],
    ['unhandled event', { type: 'keydown', target: fakeEl({ action: 'go', tab: 'care' }) }],
  ];
  const wrong = [];
  /* Poison the app's own Object.prototype with a click handler, so an inherited name that slipped
     past an own-key check would visibly run it instead of harmlessly finding nothing. */
  const proto = a.ACTIONS ? Object.getPrototypeOf(a.ACTIONS) : null;
  const inherited = [];
  if(proto) proto.click = () => { inherited.push('ran'); };
  try {
    cases.forEach(([label, ev]) => {
      try { fireAction(a, ev.type || 'click', ev.target, ev); if(a.TAB !== 'today') wrong.push(label + ': switched to ' + a.TAB); }
      catch(e){ wrong.push(label + ': threw ' + e.message); }
    });
  } finally { if(proto) delete proto.click; }
  if(inherited.length) wrong.push('an inherited name reached Object.prototype (' + inherited.length + 'x)');
  let textNode = null;
  try { fireAction(a, 'click', { nodeType: 3, parentElement: fakeEl({ action: 'go', tab: 'care' }) }); textNode = a.TAB; }
  catch(e){ textNode = 'threw ' + e.message; }
  ok('F2: the dispatcher ignores a tap on nothing, an unknown or inherited action, a disabled control and an event the action does not handle',
     typeof a.dispatchAction === 'function' && wrong.length === 0 && textNode === 'care', { wrong, textNode });
}

/* DELEG-05. One document listener per event means a stopPropagation anywhere below it silently kills
   every delegated control above that element. */
{
  const STOP = /\.(stopPropagation|stopImmediatePropagation)\s*\(|\bcancelBubble\s*=(?!=)/;
  const hits = [];
  Object.keys(f2app.__sandbox).forEach(k => {
    const f = f2app.__sandbox[k];
    if(typeof f === 'function' && STOP.test(f2StripJs(Function.prototype.toString.call(f)))) hits.push(k);
  });
  f2Handlers().forEach(([name, ev, src]) => { if(STOP.test(f2StripJs(src))) hits.push(`ACTIONS.${name}.${ev}`); });
  if(STOP.test(f2Static(F2_RAW))) hits.push('(static markup)');
  const unreviewed = hits.filter(h => !REVIEWED_PROPAGATION.includes(h));
  const synthetic = ['e.stopPropagation()', 'x.cancelBubble = true'].every(s => STOP.test(s))
    && !STOP.test('if(x.cancelBubble === true){}');
  ok('DELEG-05: nothing stops propagation without review', unreviewed.length === 0 && synthetic, { unreviewed, syntheticCaught: synthetic });
}

/* D-03: every interpolated data-* value goes through esc(). Walks each data-* attribute value to its
   closing quote and checks every top-level placeholder in it. data-action / data-enter are covered
   by the action-name check. */
function f2UnescapedData(text){
  const bad = [];
  const re = /data-([\w-]+)="/g;
  let m;
  while((m = re.exec(text))){
    if(m[1] === 'action' || m[1] === 'enter') continue;
    let i = m.index + m[0].length, depth = 0;
    while(i < text.length){
      if(text[i] === '$' && text[i + 1] === '{'){
        if(depth === 0 && !text.startsWith('esc(', i + 2)) { bad.push(text.slice(m.index, Math.min(text.length, i + 24))); }
        depth++; i += 2; continue;
      }
      if(depth && text[i] === '}'){ depth--; i++; continue; }
      if(!depth && text[i] === '"') break;
      i++;
    }
  }
  return bad;
}
{
  const bad = f2UnescapedData(f2StripJs(f2app.__src || '') + '\n' + f2Static(F2_RAW));
  const synthetic = { caught: f2UnescapedData('data-i="${i}"').length === 1, passes: f2UnescapedData('data-i="${esc(i)}"').length === 0,
                      laterCaught: f2UnescapedData('data-id="x-${esc(a)}-${b}"').length === 1 };
  ok('D-03: every interpolated data-* value goes through esc()', bad.length === 0 && Object.values(synthetic).every(Boolean),
     { bad: bad.slice(0, 5), synthetic });
}

/* Each rendered control's action may listen only to events its element fires once per gesture: a
   button's click (plus the stopwatch's pointerdown), a select's or checkbox's change, a text
   field's input/change/keydown. A flat or mismatched entry double-fires or never fires. */
{
  const offenders = [];
  f2Corpus().forEach(({ label, html }) => {
    controlsIn(html).forEach(c => {
      const name = c.data.action;
      if(!f2Own(name)) return;
      const keys = Object.keys(F2_A[name] || {});
      const within = allowed => keys.every(k => allowed.includes(k));
      const type = String(c.type || '').toLowerCase();
      let fine;
      if(c.tag === 'button') fine = within(['click', 'pointerdown']);
      else if(c.tag === 'select') fine = within(['change']);
      else if(c.tag === 'input' && ['checkbox', 'radio', 'file'].includes(type)) fine = within(['change']);
      else if(c.tag === 'input' || c.tag === 'textarea') fine = within(['input', 'change', 'keydown']);
      else if(c.tag === 'div') fine = within(['click']) && REVIEWED_NONBUTTON_CLICK.includes(name);
      else fine = false;
      if(!fine) offenders.push({ label, tag: c.tag, type, action: name, events: keys });
    });
  });
  ok("DELEG-02: every rendered control's action listens only to events its element fires once per gesture",
     offenders.length === 0, offenders.slice(0, 5));
}

/* The converted-button reset. A <button> that replaced a div, span or link must look exactly like
   it did: zero specificity (so .card, .row, .hist-item and .ex-body still win), and no colour of
   its own (the theme lives in the :root custom properties, CLAUDE.md). */
function f2CssRules(raw){
  const css = (String(raw).match(/<style[^>]*>([\s\S]*?)<\/style>/g) || []).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m => ({ selector: m[1].trim(), body: m[2] }));
}
function f2ColourProblems(body){
  const bad = [];
  if(/#[0-9a-fA-F]{3,8}\b/.test(body)) bad.push('hex colour');
  if(/\b(rgba?|hsla?)\(/.test(body)) bad.push('rgb()/hsl()');
  String(body).split(';').map(d => d.trim()).filter(Boolean).forEach(d => {
    const i = d.indexOf(':'); if(i < 0) return;
    const prop = d.slice(0, i).trim().toLowerCase(), val = d.slice(i + 1).trim().toLowerCase();
    if(/color$/.test(prop) || ['background', 'fill', 'stroke', 'box-shadow', 'text-shadow'].includes(prop)){
      if(!['inherit', 'none', 'transparent'].includes(val)) bad.push(prop + ':' + val);
    } else if(['border', 'outline'].includes(prop) || /^border-(top|right|bottom|left)$/.test(prop)){
      if(!/^(0|none)$/.test(val)) bad.push(prop + ':' + val);
    }
  });
  return bad;
}
{
  const rules = f2CssRules(F2_RAW);
  const found = {}, problems = {};
  [':where(button.tap)', ':where(button.tap-inline)'].forEach(sel => {
    const r = rules.filter(x => x.selector === sel);
    found[sel] = r.length;
    problems[sel] = r.flatMap(x => f2ColourProblems(x.body));
  });
  const synthetic = { hex: f2ColourProblems('color:#fff').length > 0, named: f2ColourProblems('background:red').length > 0,
                      clean: f2ColourProblems('background:none; border:0; color:inherit').length === 0 };
  ok('F2: the converted-button reset has zero specificity and no hard-coded colour',
     Object.values(found).every(n => n >= 1) && Object.values(problems).every(p => p.length === 0) && Object.values(synthetic).every(Boolean),
     { found, problems, synthetic });
}

/* Start tags in template SOURCE, walked to their closing `>` past any `${…}` (which may hold `>`). */
function f2SourceStartTags(text, names){
  const out = [];
  const re = new RegExp('<(' + names.join('|') + ')(?=[\\s>/])', 'g');
  let m;
  while((m = re.exec(text))){
    let i = m.index + m[0].length, depth = 0;
    while(i < text.length){
      const ch = text[i];
      if(ch === '$' && text[i + 1] === '{'){ depth++; i += 2; continue; }
      if(depth && ch === '{'){ depth++; i++; continue; }
      if(depth && ch === '}'){ depth--; i++; continue; }
      if(!depth && ch === '>') break;
      i++;
    }
    out.push({ tag: m[1], index: m.index, text: text.slice(m.index, i + 1) });
  }
  return out;
}
{
  const NONBUTTON = ['div', 'span', 'a', 'li', 'tr', 'td', 'label', 'p', 'section', 'img'];
  const clicks = name => f2Own(name) && F2_A[name] && typeof F2_A[name].click === 'function';
  const staticOffenders = text => f2SourceStartTags(text, NONBUTTON).flatMap(t => {
    const a = t.text.match(/data-action="([^"]*)"/);
    return a && clicks(a[1]) && !REVIEWED_NONBUTTON_CLICK.includes(a[1]) ? [t.tag + ' ' + a[1]] : [];
  });
  const stat = staticOffenders(f2StripJs(f2app.__src || '') + '\n' + f2Static(F2_RAW));
  const syntheticCaught = staticOffenders('<div class="row" data-action="go">').length === 1;
  const rendered = [];
  f2Corpus().forEach(({ label, html }) => controlsIn(html).forEach(c => {
    if(clicks(c.data.action) && c.tag !== 'button' && !REVIEWED_NONBUTTON_CLICK.includes(c.data.action)) rendered.push({ label, tag: c.tag, action: c.data.action });
  }));
  ok('DELEG-06: every control that acts on click is a button (the Ideas backdrop is the one reviewed exception)',
     stat.length === 0 && rendered.length === 0 && syntheticCaught,
     { static: stat.slice(0, 5), rendered: rendered.slice(0, 5), syntheticCaught });
}

/* D-11: a converted button's content stays valid phrasing content, so no <div> inside it, and any
   kicker() inside it is the block-span form. */
function f2TapRegions(text){
  const out = [];
  f2SourceStartTags(text, ['button']).forEach(t => {
    const cls = t.text.match(/\sclass="([^"]*)"/);
    const tokens = cls ? cls[1].split(/\s+/) : [];
    if(!tokens.includes('tap') && !tokens.includes('tap-inline')) return;
    const start = t.index, end = text.indexOf('</button>', start);
    out.push(text.slice(start, end < 0 ? text.length : end));
  });
  return out;
}
function f2TapRegionProblems(region){
  const bad = [];
  if(/<div[\s>]/.test(region)) bad.push('div inside');
  const re = /(?<![\w$.])kicker\(/g;
  let m;
  while((m = re.exec(region))){
    let i = m.index + m[0].length, depth = 1, argStart = i, lastArg = '';
    for(; i < region.length && depth; i++){
      const ch = region[i];
      if(ch === '(' || ch === '[' || ch === '{') depth++;
      else if(ch === ')' || ch === ']' || ch === '}'){ depth--; if(!depth){ lastArg = region.slice(argStart, i); break; } }
      else if(ch === ',' && depth === 1) argStart = i + 1;
    }
    if(!/^\s*(['"])span\1\s*$/.test(lastArg)) bad.push('kicker without span: ' + region.slice(m.index, i + 1));
  }
  return bad;
}
{
  const bad = f2TapRegions(F2_RAW).flatMap(f2TapRegionProblems);
  const synthetic = {
    divCaught: f2TapRegionProblems('<button class="tap"><div>x</div>').length === 1,
    kickerCaught: f2TapRegionProblems("<button class=\"tap\">${kicker('x')}").length === 1,
    spanPasses: f2TapRegionProblems("<button class=\"tap\">${kicker('x','span')}").length === 0,
    regionFound: f2TapRegions('<button class="card tap" data-action="go">a</button><button class="tapx">b</button>').length === 1,
  };
  ok('D-11: no converted button wraps a div, and every kicker inside one is the span form',
     bad.length === 0 && Object.values(synthetic).every(Boolean), { bad: bad.slice(0, 5), synthetic });
}

/* ── Plan 05-02: the Ideas sheet and Settings ── */
/* An id carrying every character that matters inside an attribute or an inline handler: a double
   quote, the single quote esc() does not escape, a tag opener and an ampersand. Ids arrive from sync
   or an imported backup, and validateBackup() never checks their type or content (T-5-02). Before
   Phase 5 such an id sat inside an inline handler's quotes. */
const HOSTILE = `i"1'<b>&x`;
const f2IdeasList = a => a.__sandbox.document.getElementById('ideas-list').innerHTML || '';

{
  const a = loadApp(APP_PATH);
  const cs = controlsIn(f2Static(F2_RAW));
  const names = ['openIdeas', 'closeIdeas', 'addIdea', 'copyIdeas'];
  const tags = {}, calls = {};
  names.forEach(n => { tags[n] = cs.filter(c => c.data.action === n).map(c => c.tag); calls[n] = spyOn(a, n); });
  let threw = null;
  try { names.forEach(n => { const c = cs.find(x => x.data.action === n); if(c) fireAction(a, 'click', fakeEl(c.data)); }); }
  catch(e){ threw = e.message; }
  ok('DELEG-02: the Ideas sheet opens, closes, adds and copies through the dispatcher',
     !threw && names.every(n => tags[n].length === 1 && tags[n][0] === 'button' && calls[n].length === 1 && calls[n][0].length === 0),
     { tags, calls, threw });
}
/* D-08: the backdrop wraps the sheet's controls, so it stays a div (no role, no tabindex) and its
   keyboard path is the sheet's Close button. dispatchAction resolves ANY tap inside the sheet that
   has no action of its own to the backdrop, so the wrapper's own `e.target === el` test is what
   keeps a tap on the textarea from closing the sheet (Pitfall 11: never contains()). */
{
  const a = loadApp(APP_PATH);
  const stat = f2Static(F2_RAW);
  const cs = controlsIn(stat).filter(c => c.data.action === 'ideasBackdrop');
  const startTag = (stat.match(/<[a-z]+\s[^>]*data-action="ideasBackdrop"[^>]*>/) || [''])[0];
  const closes = spyOn(a, 'closeIdeas');
  let threw = null, onSelf = -1, onChild = -1;
  try {
    const bd = fakeEl(cs[0] ? cs[0].data : { action: 'ideasBackdrop' });
    fireAction(a, 'click', bd);
    onSelf = closes.length;
    const child = fakeEl({}, { closest: sel => sel === '[data-action]' ? bd : null });
    fireAction(a, 'click', child);
    onChild = closes.length - onSelf;
  } catch(e){ threw = e.message; }
  ok('DELEG-06: the Ideas backdrop closes only on a tap on the backdrop itself',
     !threw && cs.length === 1 && cs[0].tag === 'div' && !/\s(tabindex|role)\s*=/.test(startTag) && onSelf === 1 && onChild === 0,
     { found: cs.length, tag: cs[0] && cs[0].tag, startTag, onSelf, onChild, threw });
}
{
  const a = loadApp(APP_PATH);
  a.DB = a.blank();
  a.DB.ideas = [{ id: HOSTILE, text:'hostile id', date: today, done:false, mtime:1 },
                { id:'i2', text:'plain', date: today, done:false, mtime:1 }];
  let threw = null, html = '', ctl = null;
  try {
    a.renderIdeasList();
    html = f2IdeasList(a);
    ctl = controlsIn(html).find(c => c.data.action === 'removeIdea' && c.data.id === HOSTILE) || null;
    if(ctl) fireAction(a, 'click', fakeEl(ctl.data));
  } catch(e){ threw = e.message; }
  const hostile = (a.DB.ideas || []).find(x => x.id === HOSTILE), plain = (a.DB.ideas || []).find(x => x.id === 'i2');
  ok('D-03: a hostile idea id round-trips through data-id and deletes the right idea',
     !threw && html.length > 0 && !html.includes('<b>') && !!ctl && !!hostile && !!hostile.deletedAt && !!plain && !plain.deletedAt,
     { threw, rawB: html.includes('<b>'), control: ctl, hostileDeleted: !!(hostile && hostile.deletedAt), plainDeleted: !!(plain && plain.deletedAt) });
}
/* A checkbox fires click, input and change for one tick. Only change may toggle, or one tick
   flips the idea three times (Pitfall 2). */
{
  const a = loadApp(APP_PATH);
  a.DB = a.blank();
  a.DB.ideas = [{ id:'i2', text:'plain', date: today, done:false, mtime:1 }];
  let threw = null, c = null, afterClick = null, afterInput = null, afterChange = null;
  try {
    a.renderIdeasList();
    c = controlsIn(f2IdeasList(a)).find(x => x.data.action === 'toggleIdeaDone') || null;
    if(c){
      fireAction(a, 'click', fakeEl(c.data));  afterClick = a.DB.ideas[0].done;
      fireAction(a, 'input', fakeEl(c.data));  afterInput = a.DB.ideas[0].done;
      fireAction(a, 'change', fakeEl(c.data)); afterChange = a.DB.ideas[0].done;
    }
  } catch(e){ threw = e.message; }
  ok('DELEG-02: ticking an idea done fires once per change, and a click on the checkbox does nothing',
     !threw && !!c && c.tag === 'input' && c.type === 'checkbox' && c.data.id === 'i2'
       && afterClick === false && afterInput === false && afterChange === true,
     { threw, control: c, afterClick, afterInput, afterChange });
}
{
  const a = loadApp(APP_PATH);
  a.DB = a.blank();
  a.DB.ideas = [{ id:'i1', text:'first', date: today, done:false, mtime:1 },
                { id:'i2', text:'plain', date: today, done:false, mtime:1 }];
  let threw = null, save = null, cancel = null;
  try {
    a.renderIdeasList();
    const start = controlsIn(f2IdeasList(a)).find(x => x.data.action === 'startEditIdea' && x.data.id === 'i2');
    if(start) fireAction(a, 'click', fakeEl(start.data));
    const cs = controlsIn(f2IdeasList(a));
    save = cs.find(x => x.data.action === 'saveEditIdea') || null;
    cancel = cs.find(x => x.data.action === 'cancelEditIdea') || null;
    a.__sandbox.document.getElementById('idea-edit-i2').value = 'reworded';
    if(save) fireAction(a, 'click', fakeEl(save.data));
  } catch(e){ threw = e.message; }
  const i2 = (a.DB.ideas || []).find(x => x.id === 'i2'), i1 = (a.DB.ideas || []).find(x => x.id === 'i1');
  ok('DELEG-02: rewording an idea saves through the dispatcher',
     !threw && !!save && !!cancel && save.data.id === 'i2' && cancel.data.id === 'i2'
       && !!i2 && i2.text === 'reworded' && !!i1 && i1.text === 'first',
     { threw, save, cancel, text: i2 && i2.text });
}

/* D-02: the old two-statement handler (`setPetName(this.value);render()`) is one action that runs
   the whole chain, in order, once per change. */
{
  const a = loadApp(APP_PATH);
  a.DB = populatedDB(a);
  const order = [];
  let threw = null, cs = [], events = [];
  try {
    cs = controlsIn(a.viewData()).filter(x => x.data.action === 'setPetName');
    events = a.ACTIONS && a.ACTIONS.setPetName ? Object.keys(a.ACTIONS.setPetName) : [];
    a.__sandbox.setPetName = (...args) => { order.push(['setPetName', args]); };
    a.__sandbox.render = (...args) => { order.push(['render', args]); };
    if(cs[0]){
      fireAction(a, 'input', fakeEl(cs[0].data, { value: 'Mochi' }));
      fireAction(a, 'change', fakeEl(cs[0].data, { value: 'Mochi' }));
    }
  } catch(e){ threw = e.message; }
  ok('DELEG-02: the pet name saves and redraws on change through one action (D-02 chain)',
     !threw && cs.length === 1 && cs[0].tag === 'input' && JSON.stringify(events) === '["change"]'
       && JSON.stringify(order) === JSON.stringify([['setPetName', ['Mochi']], ['render', []]]),
     { threw, found: cs.length, events, order });
}
/* Import is two controls: a button that opens the picker by clicking the hidden file input (inside
   the tap, so the tap's user activation carries over, Pitfall 12), and the input, whose change runs
   the import. The picker's synthesized click on the input also reaches the dispatcher, and must do
   nothing (Pitfall 2). */
{
  const a = loadApp(APP_PATH);
  a.DB = populatedDB(a);
  let threw = null, pick = null, imp = null, opened = 0, afterPick = null, afterChange = null, sameEl = false;
  const imports = spyOn(a, 'importData');
  a.__sandbox.document.getElementById('imp').click = () => { opened++; };
  try {
    const cs = controlsIn(a.viewData());
    pick = cs.find(x => x.data.action === 'pickImportFile') || null;
    imp = cs.find(x => x.data.action === 'importData') || null;
    if(pick) fireAction(a, 'click', fakeEl(pick.data));
    afterPick = { opened, imports: imports.length };
    if(imp){
      const input = fakeEl(imp.data);
      fireAction(a, 'change', input);
      afterChange = imports.length;
      sameEl = !!imports[0] && imports[0].length === 1 && imports[0][0] === input;
      fireAction(a, 'click', input);
    }
  } catch(e){ threw = e.message; }
  ok('DELEG-02: Import backup opens the file picker, and choosing a file runs importData once',
     !threw && !!pick && pick.tag === 'button' && !!imp && imp.tag === 'input' && imp.type === 'file'
       && afterPick.opened === 1 && afterPick.imports === 0 && afterChange === 1 && sameEl && imports.length === 1 && opened === 1,
     { threw, pick, imp, afterPick, afterChange, sameEl, imports: imports.length, opened });
}
{
  const a = loadApp(APP_PATH);
  a.DB = populatedDB(a);
  const cs = () => controlsIn(a.viewData());
  let threw = null, kg = null, d3 = null, rm = null;
  const hobbies = (a.DB.hobbies || []).slice(), prod = JSON.stringify(a.DB.productivity || []);
  try {
    kg = cs().find(x => x.data.action === 'setUnit' && x.data.unit === 'kg') || null;
    if(kg) fireAction(a, 'click', fakeEl(kg.data));
    d3 = cs().find(x => x.data.action === 'setRoutineMode' && x.data.mode === '3day') || null;
    if(d3) fireAction(a, 'click', fakeEl(d3.data));
    rm = cs().find(x => x.data.action === 'removeItem' && x.data.cat === 'hobby') || null;
    if(rm) fireAction(a, 'click', fakeEl(rm.data));
  } catch(e){ threw = e.message; }
  ok('DELEG-02: units, routine and list edits route through the dispatcher',
     !threw && hobbies.length >= 2 && !!kg && a.DB.unit === 'kg' && !!d3 && a.DB.routineMode === '3day'
       && !!rm && JSON.stringify(a.DB.hobbies) === JSON.stringify(hobbies.slice(1)) && JSON.stringify(a.DB.productivity || []) === prod,
     { threw, unit: a.DB.unit, routineMode: a.DB.routineMode, removeControl: rm, hobbiesBefore: hobbies.length, hobbiesAfter: (a.DB.hobbies || []).length });
}
{
  const a = loadApp(APP_PATH);
  a.DB = a.blank();
  /* Shaped as exEnsure() writes a row, and used by one session, because the card lists only
     exercises that have been logged. */
  a.DB.exercises = [a.touch({ id: HOSTILE, name: 'Hostile press', aliases: ['hostile press'] })];
  a.DB.sessions = [{ id:'s1', workout:'PUSH 1', date: today, endedAt:1, extras:{}, mtime:1,
                     entries:[{ name:'Hostile press', exId: HOSTILE, sets:[{ w:'100', r:'5', skipped:false }] }] }];
  const prompts = [];
  a.__sandbox.prompt = (...args) => { prompts.push(args); return ''; };
  let threw = null, html = '', ctl = null;
  try {
    html = a.viewData();
    ctl = controlsIn(html).find(x => x.data.action === 'renameExercise') || null;
    if(ctl) fireAction(a, 'click', fakeEl(ctl.data));
  } catch(e){ threw = e.message; }
  /* renameExercise prompts with a fixed message and the row's current name as the default. */
  ok('D-03: a hostile exercise id round-trips through data-id',
     !threw && html.includes('Hostile press') && !html.includes('<b>') && !!ctl && ctl.data.id === HOSTILE
       && prompts.length === 1 && prompts[0].some(x => String(x).includes('Hostile press')) && a.DB.exercises[0].name === 'Hostile press',
     { threw, rawB: html.includes('<b>'), control: ctl, prompts });
}

/* The Recently deleted and Version history headers were clickable divs. As buttons they take focus
   and toggle on Enter and Space natively; here each must open its card and, re-rendered, close it. */
const f2AppHtml = a => a.__sandbox.document.getElementById('app').innerHTML || '';
{
  const a = loadApp(APP_PATH);
  a.DB = a.blank();
  a.DB.weights = [{ date: today, value: 190, deletedAt: Date.now(), mtime: Date.now() }];
  const toggles = (name, note) => {
    const r = { before: f2AppHtml(a).includes(note) };
    const c1 = controlsIn(f2AppHtml(a)).find(x => x.data.action === name) || null;
    r.closedTag = c1 && c1.tag;
    if(c1) fireAction(a, 'click', fakeEl(c1.data));
    r.opened = f2AppHtml(a).includes(note);
    const c2 = controlsIn(f2AppHtml(a)).find(x => x.data.action === name) || null;
    r.openTag = c2 && c2.tag;
    if(c2) fireAction(a, 'click', fakeEl(c2.data));
    r.closed = !f2AppHtml(a).includes(note);
    r.ok = !r.before && r.closedTag === 'button' && r.opened && r.openTag === 'button' && r.closed;
    return r;
  };
  let threw = null, trash = null, versions = null;
  try {
    a.go('settings');
    trash = toggles('toggleTrash', 'Deleted items stay hidden here for 30 days');
    versions = toggles('toggleVersions', 'Restoring snapshots your current data first');
  } catch(e){ threw = e.message; }
  ok('DELEG-06: Recently deleted and Version history open and close from a button',
     !threw && !!trash && trash.ok && !!versions && versions.ok, { threw, trash, versions });
}
/* dataset values are strings; restoreSnapshot indexes an array and restoreDeleted compares kinds,
   so each must receive a NUMBER index (Pitfall 1). */
{
  const a = loadApp(APP_PATH);
  a.DB = a.blank();
  a.DB.weights = [{ date: dayOff(-1), value: 191, mtime: 1 },
                  { date: today, value: 190, deletedAt: Date.now(), mtime: Date.now() }];
  let threw = null, del = null, snap = null, snapped = false;
  const restoredDel = spyOn(a, 'restoreDeleted'), restoredSnap = spyOn(a, 'restoreSnapshot');
  try {
    a.go('settings');
    a.__sandbox.toggleTrash();
    del = controlsIn(f2AppHtml(a)).find(x => x.data.action === 'restoreDeleted') || null;
    if(del) fireAction(a, 'click', fakeEl(del.data));
    a.__sandbox.toggleTrash();
    snapped = a.snapshotNow('f2') !== false;
    a.__sandbox.toggleVersions();
    snap = controlsIn(f2AppHtml(a)).find(x => x.data.action === 'restoreSnapshot') || null;
    if(snap) fireAction(a, 'click', fakeEl(snap.data));
  } catch(e){ threw = e.message; }
  const d = restoredDel[0] || [], s = restoredSnap[0] || [];
  ok('DELEG-02: restoring a deleted item and a snapshot pass numeric indexes',
     !threw && !!del && restoredDel.length === 1 && d.length === 2 && d[0] === 'weight' && typeof d[1] === 'number' && d[1] === 1
       && snapped && !!snap && restoredSnap.length === 1 && s.length === 1 && typeof s[0] === 'number' && s[0] === 0,
     { threw, restoredDel, restoredSnap, snapped, del, snap });
}
{
  const a = loadApp(APP_PATH);
  a.DB = a.blank();
  let threw = null, html = '', ctl = null;
  const restored = spyOn(a, 'restoreCloudVersion');
  try {
    a.SYNC.user = { email: 't@example.com' };
    a.go('settings');
    a.__sandbox.toggleVersions();
    a.cloudVersionList = [{ _id: HOSTILE, at: Date.now(), label: 'hostile', summary: {} }];
    a.render();
    html = f2AppHtml(a);
    ctl = controlsIn(html).find(x => x.data.action === 'restoreCloudVersion') || null;
    if(ctl) fireAction(a, 'click', fakeEl(ctl.data));
  } catch(e){ threw = e.message; }
  finally { a.SYNC.user = null; a.cloudVersionList = null; }
  ok('D-03: a hostile cloud version id round-trips through data-id',
     !threw && html.includes('hostile') && !html.includes('<b>') && !!ctl && ctl.data.id === HOSTILE
       && restored.length === 1 && restored[0].length === 1 && restored[0][0] === HOSTILE,
     { threw, rawB: html.includes('<b>'), control: ctl, restored });
}
{
  const a = loadApp(APP_PATH);
  a.DB = a.blank();
  a.__sandbox.firebase = {};
  let threw = null, signedOut = [], signedIn = [], reloads = 0;
  const signIns = spyOn(a, 'syncSignIn'), pushes = spyOn(a, 'pushNow'), outs = spyOn(a, 'syncSignOut');
  a.__sandbox.location.reload = () => { reloads++; };
  const click = (cs, name) => { const c = cs.find(x => x.data.action === name); if(c) fireAction(a, 'click', fakeEl(c.data)); return c ? c.tag : null; };
  try {
    a.go('settings');
    let cs = controlsIn(f2AppHtml(a));
    signedOut = [click(cs, 'syncSignIn'), click(cs, 'syncCreateAccount')];
    a.SYNC.user = { email: 't@example.com' };
    a.SYNC.needsUpdate = true;
    a.render();
    cs = controlsIn(f2AppHtml(a));
    signedIn = [click(cs, 'pushNow'), click(cs, 'syncSignOut'), click(cs, 'reload')];
  } catch(e){ threw = e.message; }
  finally { a.SYNC.user = null; a.SYNC.needsUpdate = false; a.__sandbox.firebase = undefined; }
  ok('DELEG-02: every Cloud Sync button runs its sync call through the dispatcher',
     !threw && signedOut.concat(signedIn).every(t => t === 'button')
       && JSON.stringify(signIns) === '[[false],[true]]' && JSON.stringify(pushes) === '[[false]]'
       && JSON.stringify(outs) === '[[]]' && reloads === 1,
     { threw, signedOut, signedIn, signIns, pushes, outs, reloads });
}

/* ── Plan 05-03: Care (Skin, Lawn, Sleep) and the lawn card Today shows ── */
/* skinOpenPhases is a Set of NUMBERS. A string index from the dataset would add '0' on the first
   tap and never find it again, so the phase would open and never close (Pitfall 1). */
{
  const a = loadApp(APP_PATH);
  a.DB = a.blank();
  const r = {};
  let threw = null;
  const find = pred => controlsIn(f2AppHtml(a)).find(pred) || null;
  try {
    a.go('care'); a.setSub('skin');
    const tab = find(c => c.data.action === 'skinSubTab' && c.data.sub === 'shaving');
    r.tab = tab && tab.tag;
    if(tab) fireAction(a, 'click', fakeEl(tab.data));
    r.guide = /Shaving Guide/.test(f2AppHtml(a));
    r.bodyBefore = f2AppHtml(a).includes('phase-body');
    const p1 = find(c => c.data.action === 'skinTogglePhase' && c.data.i === '0');
    r.phase = p1 && p1.tag;
    if(p1) fireAction(a, 'click', fakeEl(p1.data));
    r.opened = f2AppHtml(a).includes('phase-body');
    const p2 = find(c => c.data.action === 'skinTogglePhase' && c.data.i === '0');
    if(p2) fireAction(a, 'click', fakeEl(p2.data));
    r.closed = !f2AppHtml(a).includes('phase-body');
  } catch(e){ threw = e.message; }
  ok('DELEG-02: a shaving phase opens and closes through the dispatcher (numeric index)',
     !threw && r.tab === 'button' && r.guide && !r.bodyBefore && r.phase === 'button' && r.opened && r.closed, { threw, r });
}
{
  const a = loadApp(APP_PATH);
  a.DB = a.blank();
  const r = {};
  let threw = null;
  const find = pred => controlsIn(f2AppHtml(a)).find(pred) || null;
  try {
    a.go('care'); a.setSub('skin');
    const wed0 = find(c => c.data.action === 'skinSelectDay' && c.data.day === 'Wed');
    r.before = wed0 && wed0.cls;
    if(wed0) fireAction(a, 'click', fakeEl(wed0.data));
    const wed1 = find(c => c.data.action === 'skinSelectDay' && c.data.day === 'Wed');
    r.after = wed1 && wed1.cls;
    r.tag = wed1 && wed1.tag;
    const shave = find(c => c.data.action === 'skinSubTab' && c.data.sub === 'shaving');
    if(shave) fireAction(a, 'click', fakeEl(shave.data));
    r.shaving = /Shaving Guide/.test(f2AppHtml(a));
    const routine = find(c => c.data.action === 'skinSubTab' && c.data.sub === 'routine');
    if(routine) fireAction(a, 'click', fakeEl(routine.data));
    r.routine = /<h1>Skincare<\/h1>/.test(f2AppHtml(a));
  } catch(e){ threw = e.message; }
  const tokens = s => String(s || '').split(/\s+/);
  ok("DELEG-02: Skin's day picker and sub-tabs switch through the dispatcher",
     !threw && r.before != null && !tokens(r.before).includes('active') && tokens(r.after).includes('active')
       && r.tag === 'button' && r.shaving && r.routine, { threw, r });
}
/* Enter-to-submit through the registry (RESEARCH Pattern 3, Pitfall 3). The box's action listens to
   keydown only and forwards Enter to searchLocation's click handler, so Enter searches exactly once,
   other keys and a click in the box do nothing, and the Find button still searches. Fired through
   the app's own document listeners, which proves the registration too. */
{
  const a = loadApp(APP_PATH);
  a.DB = a.blank();
  a.DB.lawn = null;
  const calls = spyOn(a, 'searchLocation');
  const r = {};
  let threw = null;
  try {
    a.go('care'); a.setSub('lawn');
    const cs = controlsIn(f2AppHtml(a));
    const box = cs.find(c => c.data.action === 'enter' && c.data.enter === 'searchLocation') || null;
    const find = cs.find(c => c.data.action === 'searchLocation') || null;
    r.box = box && box.tag; r.find = find && find.tag;
    if(box){
      const el = fakeEl(box.data, { tagName: 'INPUT' });
      fireListener(a, 'keydown', el, { key: 'Enter' }); r.enter = calls.length;
      fireListener(a, 'keydown', el, { key: 'a' });     r.otherKey = calls.length;
      fireListener(a, 'click', el);                      r.click = calls.length;
    }
    if(find) fireListener(a, 'click', fakeEl(find.data));
    r.button = calls.length;
  } catch(e){ threw = e.message; }
  ok('DELEG-02: Enter in the location box searches once, other keys do nothing, and a click in the box does nothing',
     !threw && r.box === 'input' && r.find === 'button' && r.enter === 1 && r.otherKey === 1 && r.click === 1 && r.button === 2
       && calls.every(c => c.length === 0), { threw, r, calls });
}
/* T-5-11: data-enter may only name an OWN registry entry. The app's Object.prototype carries a
   planted click handler for the duration, so an inherited name that slipped past the own-key check
   would visibly run it. */
{
  const a = loadApp(APP_PATH);
  const proto = a.ACTIONS ? Object.getPrototypeOf(a.ACTIONS) : null;
  const ran = [];
  let threw = null;
  if(proto) proto.click = () => { ran.push('inherited'); };
  try {
    ['__proto__', 'constructor', 'toString', 'hasOwnProperty', 'nope', 'enter'].forEach(n =>
      fireAction(a, 'keydown', fakeEl({ action: 'enter', enter: n }), { key: 'Enter' }));
  } catch(e){ threw = e.message; }
  finally { if(proto) delete proto.click; }
  ok('F2: Enter runs only an own registry entry named by data-enter', !!proto && !threw && ran.length === 0, { threw, ran });
}
/* The rest of Care → Lawn: each button reaches its function with the arguments the old handler
   passed, and each of the two weather buttons is wired on its own. */
{
  const a = loadApp(APP_PATH);
  const names = ['useMyLocation', 'changeLawnLoc', 'fetchWeather', 'logLawnPastDate', 'toggleLawnOverride'];
  const calls = {};
  names.forEach(n => { calls[n] = spyOn(a, n); });
  const r = {};
  let threw = null;
  const clickAll = (html, pred) => controlsIn(html).filter(pred).map(c => { fireAction(a, 'click', fakeEl(c.data)); return c.tag; });
  try {
    a.DB = a.blank();
    a.DB.lawn = null;
    r.setup = clickAll(a.__sandbox.viewLawn(), c => c.data.action === 'useMyLocation');
    setup(a, { mowedDaysAgo: 1, wateredDaysAgo: 7, wx: null });
    r.load = clickAll(a.__sandbox.viewLawn(), c => c.data.action === 'fetchWeather');
    setup(a, { mowedDaysAgo: 1, wateredDaysAgo: 7, wx: {} });
    const full = a.__sandbox.viewLawn();
    r.refresh = clickAll(full, c => c.data.action === 'fetchWeather');
    r.change = clickAll(full, c => c.data.action === 'changeLawnLoc');
    r.picker = clickAll(full, c => c.data.action === 'logLawnPastDate');
    r.override = clickAll(full, c => c.data.action === 'toggleLawnOverride');
  } catch(e){ threw = e.message; }
  const got = {};
  names.forEach(n => { got[n] = JSON.stringify(calls[n]); });
  ok('DELEG-02: location, weather, the date picker and overrides run through the dispatcher with their arguments',
     !threw && [r.setup, r.load, r.refresh, r.change, r.picker, r.override].every(t => t && t.length && t.every(x => x === 'button'))
       && r.load.length === 1 && r.refresh.length === 1
       && got.useMyLocation === '[[]]' && got.changeLawnLoc === '[[]]' && got.fetchWeather === '[[],[]]'
       && got.logLawnPastDate === '[["watered"],["mowed"]]' && got.toggleLawnOverride === '[["water"],["mow"]]',
     { threw, r, got });
}
/* toggleLawnLog(action, iso) logs `iso`, or TODAY when iso is absent. A pill must pass its own date
   and a card button must pass nothing, never an `undefined` second argument (T-5-12). */
{
  const a = loadApp(APP_PATH);
  a.DB = a.blank();
  setup(a, { mowedDaysAgo: 1, wateredDaysAgo: 7, wx:{} });
  const calls = spyOn(a, 'toggleLawnLog');
  const r = {};
  let threw = null;
  try {
    const pill = controlsIn(a.lawnHistory()).find(c => c.data.action === 'toggleLawnLog' && c.data.which === 'mowed' && c.data.iso === dayOff(-3)) || null;
    r.pill = pill && pill.data;
    if(pill) fireAction(a, 'click', fakeEl(pill.data));
    const btn = controlsIn(a.cLawnCard(true)).find(c => c.data.action === 'toggleLawnLog' && c.data.which === 'watered') || null;
    r.btn = btn && btn.data;
    if(btn) fireAction(a, 'click', fakeEl(btn.data));
  } catch(e){ threw = e.message; }
  ok('DELEG-02: a lawn history pill logs its own date, and a lawn card button logs today (arity preserved)',
     !threw && !!r.pill && !!r.btn && calls.length === 2
       && calls[0].length === 2 && calls[0][0] === 'mowed' && calls[0][1] === dayOff(-3)
       && calls[1].length === 1 && calls[1][0] === 'watered', { threw, r, calls });
}
/* The heads-up card and the compact card's header were clickable divs. As buttons they take focus
   and open Care → Lawn on Enter and Space natively (D-11 keeps their content block spans). */
{
  const a = loadApp(APP_PATH);
  a.DB = a.blank();
  const calls = spyOn(a, 'goSub');
  const r = {};
  let threw = null;
  const opener = html => controlsIn(html).filter(c => c.data.action === 'goSub');
  try {
    /* (a) mowing is due today: the compact card shows its header row */
    setup(a, { mowedDaysAgo: 9, wateredDaysAgo: 1, wx:{ precipByOffset:{ '-2':0.4 } } });
    r.mowDue = a.lawnStatus().mow.recommend === true;
    const compactHtml = a.cLawnCard();
    r.compactIsHeadsUp = /heads up/.test(compactHtml);
    const compact = opener(compactHtml);
    r.compact = compact.map(c => ({ tag: c.tag, cls: c.cls, tab: c.data.tab, sub: c.data.sub }));
    if(compact.length === 1) fireAction(a, 'click', fakeEl(compact[0].data));
    /* (b) nothing to do today (rain today pulls the mow in to day 2, and watering is recent): the
       whole card is the heads-up */
    setup(a, { mowedDaysAgo: 5, wateredDaysAgo: 1, wx:{ precipByOffset:{ 0:0.6 } } });
    const st = a.lawnStatus(), f = a.mowForecast();
    r.quietToday = !st.water.recommend && !st.mow.recommend && !st.water.unknown && !st.mow.unknown;
    r.nextMow = f && f.next && f.next.k;
    const headsHtml = a.cLawnCard();
    r.headsUp = /heads up/.test(headsHtml);
    const heads = opener(headsHtml);
    r.heads = heads.map(c => ({ tag: c.tag, cls: c.cls, tab: c.data.tab, sub: c.data.sub }));
    r.wholeCard = /^\s*<button class="card tap"/.test(headsHtml);
    if(heads.length === 1) fireAction(a, 'click', fakeEl(heads[0].data));
  } catch(e){ threw = e.message; }
  const isOpener = list => list.length === 1 && list[0].tag === 'button' && list[0].tab === 'care' && list[0].sub === 'lawn';
  ok("DELEG-06: the lawn heads-up card and the compact card's header open Care → Lawn from a button",
     !threw && r.mowDue && !r.compactIsHeadsUp && isOpener(r.compact)
       && r.quietToday && r.nextMow >= 1 && r.nextMow <= 3 && r.headsUp && isOpener(r.heads) && r.wholeCard
       && JSON.stringify(calls) === '[["care","lawn"],["care","lawn"]]', { threw, r, calls });
}
/* kicker(t) must stay byte-identical (every existing caller); kicker(t, 'span') is the same element
   as a block span, for use inside a converted button (D-11). */
{
  const a = loadApp(APP_PATH);
  a.DB = a.blank();
  setup(a, { mowedDaysAgo: 5, wateredDaysAgo: 1, wx:{ precipByOffset:{ 0:0.6 } } });
  const STYLE = 'font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px';
  const r = {
    div: a.viewSleep().includes(`<div class="muted" style="${STYLE}">Last 7 days</div>`),
    span: a.cLawnCard().includes(`<span class="muted" style="display:block;${STYLE}">Lawn · heads up</span>`),
  };
  ok("F2: kicker() without a tag is unchanged, and kicker(t, 'span') is the same element as a block span", r.div && r.span, r);
}

/* ── Plan 05-04: Train → History, Progress and Cardio ── */
/* A fresh instance with populatedDB on Train → History. `renderWeekReview` renders inside
   `viewHistory`, so the week review's controls are read from the History screen. */
function f2History(){
  const a = loadApp(APP_PATH);
  a.DB = populatedDB(a);
  a.go('train'); a.setSub('history');
  return a;
}
/* The start tag of the first control in `html` whose data-action is `name`, as source text. */
function f2StartTag(html, name){
  const m = String(html).match(new RegExp('<[a-zA-Z][^>]*data-action="' + name + '"[^>]*>'));
  return m ? m[0] : '';
}
/* Pitfalls 1 and 10: weekShift adds its argument to a number, so a string offset makes the title
   NaN. At offset 0 the next button is disabled, and the dispatcher must leave it inert. */
{
  const a = f2History();
  const r = {};
  let threw = null;
  const find = pred => controlsIn(f2AppHtml(a)).find(pred) || null;
  try {
    const next = find(c => c.data.action === 'weekShift' && c.data.d === '1');
    r.next = next && { tag: next.tag, disabled: next.disabled };
    if(next) fireAction(a, 'click', fakeEl(next.data, { disabled: next.disabled }));
    r.stillThisWeek = f2AppHtml(a).includes('>This week<');
    const back = find(c => c.data.action === 'weekShift' && c.data.d === '-1');
    r.back = back && back.tag;
    if(back) fireAction(a, 'click', fakeEl(back.data));
    r.lastWeek = f2AppHtml(a).includes('>Last week<');
    r.nan = /NaN/.test(f2AppHtml(a));
  } catch(e){ threw = e.message; }
  ok('DELEG-02: the week review steps back a week with a numeric offset, and the disabled next button does nothing',
     !threw && !!r.next && r.next.tag === 'button' && r.next.disabled === true && r.stillThisWeek
       && r.back === 'button' && r.lastWeek && !r.nan, { threw, r });
}
/* Pitfall 1: toggleHist compares openHist === i, so a string index opens a row that never closes. */
{
  const a = f2History();
  const r = {};
  let threw = null;
  const first = () => controlsIn(f2AppHtml(a)).find(c => c.data.action === 'toggleHist') || null;
  try {
    const c1 = first();
    r.tag = c1 && c1.tag; r.idx = c1 && c1.data.idx;
    r.before = f2AppHtml(a).includes('hist-detail');
    if(c1) fireAction(a, 'click', fakeEl(c1.data));
    r.opened = f2AppHtml(a).includes('hist-detail');
    const c2 = first();
    r.sameRow = !!c2 && c2.data.idx === r.idx;
    if(c2) fireAction(a, 'click', fakeEl(c2.data));
    r.closed = !f2AppHtml(a).includes('hist-detail');
  } catch(e){ threw = e.message; }
  ok('DELEG-02: a history row opens and closes again through the dispatcher (numeric index)',
     !threw && r.tag === 'button' && !r.before && r.opened && r.sameRow && r.closed, { threw, r });
}
{
  const a = f2History();
  const r = {};
  let threw = null;
  const iso = dayOff(-1);
  const find = pred => controlsIn(f2AppHtml(a)).find(pred) || null;
  try {
    const open = find(c => c.data.action === 'editJournal' && c.data.iso === iso);
    r.open = open && { tag: open.tag, cls: open.cls };
    if(open) fireAction(a, 'click', fakeEl(open.data));
    r.textarea = f2AppHtml(a).includes(`<textarea id="journal-edit-${iso}"`);
    const ta = find(c => c.data.action === 'saveJournalFor');
    r.ta = ta && { tag: ta.tag, iso: ta.data.iso };
    if(ta) fireAction(a, 'input', fakeEl(ta.data, { value: 'note text' }));
    r.saved = a.DB.journal[iso];
    const done = find(c => c.data.action === 'closeJournalEdit');
    r.done = done && done.tag;
    if(done) fireAction(a, 'click', fakeEl(done.data));
    r.closed = !f2AppHtml(a).includes('<textarea id="journal-edit-');
  } catch(e){ threw = e.message; }
  ok("DELEG-02: a day's journal note opens, saves with its date, and closes through the dispatcher",
     !threw && !!r.open && r.open.tag === 'button' && r.open.cls.split(/\s+/).includes('tap-inline') && r.textarea
       && !!r.ta && r.ta.tag === 'textarea' && r.ta.iso === iso && r.saved === 'note text' && r.done === 'button' && r.closed,
     { threw, r });
}
{
  const a = f2History();
  const r = {};
  let threw = null;
  const iso = dayOff(-1);
  const liveOn = () => a.DB.hobbyLog.filter(h => h.date === iso && !h.deletedAt).length;
  const find = pred => controlsIn(f2AppHtml(a)).find(pred) || null;
  try {
    const open = find(c => c.data.action === 'openActivityAdd' && c.data.iso === iso);
    r.open = open && { tag: open.tag, cls: open.cls };
    if(open) fireAction(a, 'click', fakeEl(open.data));
    r.panel = f2AppHtml(a).includes('id="act-item"');
    const cat = find(c => c.data.action === 'setActAddCat' && c.data.cat === 'hobby');
    r.cat = cat && cat.tag;
    const item = (a.DB.hobbies || []).find(h => !a.DB.hobbyLog.some(x => x.date === iso && x.item === h));
    r.item = item;
    a.__sandbox.document.getElementById('act-item').value = item;
    const before = liveOn();
    const add = find(c => c.data.action === 'addActivityFor' && c.data.iso === iso);
    r.add = add && add.tag;
    if(add) fireAction(a, 'click', fakeEl(add.data));
    r.added = liveOn() - before;
    r.newRow = a.DB.hobbyLog.some(h => h.date === iso && h.item === item && !h.deletedAt);
    const tag = f2StartTag(f2AppHtml(a), 'removeActivity');
    r.xTag = tag;
    const x = find(c => c.data.action === 'removeActivity');
    r.x = x && { tag: x.tag, idx: x.data.idx };
    if(x) fireAction(a, 'click', fakeEl(x.data));
    r.removed = !!x && !!a.DB.hobbyLog[+x.data.idx] && !!a.DB.hobbyLog[+x.data.idx].deletedAt;
    r.oneLeft = liveOn() === before;
  } catch(e){ threw = e.message; }
  ok("DELEG-02: logging and removing a day's activity goes through the dispatcher",
     !threw && !!r.open && r.open.tag === 'button' && r.open.cls.split(/\s+/).includes('tap-inline') && r.panel
       && r.cat === 'button' && !!r.item && r.add === 'button' && r.added === 1 && r.newRow
       && !!r.x && r.x.tag === 'button' && /^<button\b/.test(r.xTag) && /\saria-label="[^"]+"/.test(r.xTag)
       && r.removed && r.oneLeft, { threw, r });
}
/* Pitfall 5: the date input sits inside a <label>. A tap on the label clicks the input, so the action
   lives on the input's change alone and never on the label. */
{
  const a = f2History();
  const r = {};
  let threw = null;
  const find = pred => controlsIn(f2AppHtml(a)).find(pred) || null;
  const target = dayOff(-8);
  try {
    const row = find(c => c.data.action === 'toggleHist');
    if(row) fireAction(a, 'click', fakeEl(row.data));
    const html = f2AppHtml(a);
    r.labels = controlsIn(html).filter(c => c.tag === 'label').length;
    const d = find(c => c.data.action === 'changeSessionDate');
    r.d = d && { tag: d.tag, type: d.type, idx: d.data.idx };
    const s = d && a.DB.sessions[+d.data.idx];
    r.id = s && s.id;
    if(d) fireAction(a, 'change', fakeEl(d.data, { value: target }));
    r.moved = !!r.id && a.DB.sessions.find(x => x.id === r.id).date === target;
    /* Once per change, with a number: click and input on the same element do nothing. */
    const d2 = find(c => c.data.action === 'changeSessionDate');
    const calls = spyOn(a, 'changeSessionDate');
    if(d2){
      const el = fakeEl(d2.data, { value: dayOff(-10) });
      fireAction(a, 'click', el); fireAction(a, 'input', el);
      r.stray = calls.length;
      fireAction(a, 'change', el);
    }
    r.calls = calls;
  } catch(e){ threw = e.message; }
  ok("DELEG-02: a past session's date changes once, from the date input, not its label",
     !threw && r.labels === 0 && !!r.d && r.d.tag === 'input' && r.d.type === 'date' && r.moved
       && r.stray === 0 && r.calls.length === 1 && r.calls[0].length === 2 && typeof r.calls[0][0] === 'number'
       && r.calls[0][1] === dayOff(-10), { threw, r });
}
{
  const a = f2History();
  const r = {};
  let threw = null;
  const calls = spyOn(a, 'startBackdate');
  const find = pred => controlsIn(f2AppHtml(a)).find(pred) || null;
  try {
    r.before = controlsIn(f2AppHtml(a)).filter(c => c.data.action === 'startBackdate').length;
    const t = find(c => c.data.action === 'toggleBackdate');
    r.toggle = t && t.tag;
    if(t) fireAction(a, 'click', fakeEl(t.data));
    const picks = controlsIn(f2AppHtml(a)).filter(c => c.data.action === 'startBackdate');
    r.picks = picks.map(c => c.tag + ':' + c.data.name);
    const p = picks.find(c => c.data.name === 'PUSH 1');
    if(p) fireAction(a, 'click', fakeEl(p.data));
  } catch(e){ threw = e.message; }
  ok('DELEG-02: Add a past workout opens the picker and starts the chosen program',
     !threw && r.before === 0 && r.toggle === 'button' && r.picks.length > 0 && r.picks.every(x => x.startsWith('button:'))
       && JSON.stringify(calls) === '[["PUSH 1"]]', { threw, r, calls });
}
/* The rest of History: each control reaches its function with the arguments the old handler passed
   (a session's index as a number, the category as a string, nothing for Done). */
{
  const a = f2History();
  const names = ['editSession', 'deleteSession', 'setActAddCat', 'cancelActivityAdd'];
  const r = {};
  let threw = null;
  const clickAll = (pred) => controlsIn(f2AppHtml(a)).filter(pred).map(c => { fireAction(a, 'click', fakeEl(c.data)); return c.tag; });
  let calls = {};
  try {
    a.__sandbox.toggleHist(3);
    a.__sandbox.openActivityAdd(dayOff(-1));
    names.forEach(n => { calls[n] = spyOn(a, n); });
    r.edit = clickAll(c => c.data.action === 'editSession');
    r.del = clickAll(c => c.data.action === 'deleteSession');
    r.cat = clickAll(c => c.data.action === 'setActAddCat' && c.data.cat === 'productivity');
    r.cancel = clickAll(c => c.data.action === 'cancelActivityAdd');
  } catch(e){ threw = e.message; }
  const got = {};
  names.forEach(n => { got[n] = JSON.stringify(calls[n]); });
  ok('DELEG-02: editing, deleting, the activity category and Done in History run with their arguments',
     !threw && [r.edit, r.del, r.cat, r.cancel].every(t => t && t.length === 1 && t[0] === 'button')
       && got.editSession === '[[3]]' && got.deleteSession === '[[3]]'
       && got.setActAddCat === '[["productivity"]]' && got.cancelActivityAdd === '[[]]', { threw, r, got });
}
/* D-09: a session's date lands in the date input's value attribute. validateBackup() never checks a
   date's content, so a hand-edited backup can put a quote and a tag in it. */
{
  const a = f2History();
  const bad = '2026-08-01"><b>x';
  a.DB.sessions.push({ id: 'sh', workout: 'PUSH 1', date: bad, endedAt: 9, extras: {}, entries: [] });
  const r = {};
  let threw = null;
  try {
    a.__sandbox.toggleHist(a.DB.sessions.length - 1);
    const html = f2AppHtml(a);
    r.open = html.includes('data-action="changeSessionDate" data-idx="' + (a.DB.sessions.length - 1) + '"');
    r.rawB = html.includes('<b>x');
    r.escaped = html.includes('value="2026-08-01&quot;&gt;&lt;b&gt;x"');
  } catch(e){ threw = e.message; }
  ok("D-09: a hostile session date stays inside the date input's value attribute",
     !threw && r.open && !r.rawB && r.escaped, { threw, r });
}
/* A fresh instance with populatedDB on Train → Progress, on the body sub unless `sub` names another. */
function f2Progress(sub){
  const a = loadApp(APP_PATH);
  a.DB = populatedDB(a);
  a.go('train'); a.setSub('progress');
  if(sub) a.__sandbox.progSubTab(sub);
  return a;
}
/* setRange stores its argument and rangeSeg compares chartRange === 90, so a string range leaves
   every segment inactive. */
{
  const a = f2Progress();
  const r = {};
  let threw = null;
  const range = html => controlsIn(html).filter(c => c.data.action === 'setRange');
  try {
    const before = range(f2AppHtml(a));
    r.before = before.map(c => c.data.range + ':' + c.cls);
    const c90 = before.find(c => c.data.range === '90');
    if(c90) fireAction(a, 'click', fakeEl(c90.data));
    const after = range(a.__sandbox.viewWeight());
    r.after = after.map(c => c.data.range + ':' + c.cls);
    r.tags = after.map(c => c.tag);
  } catch(e){ threw = e.message; }
  const active = list => (list || []).filter(x => x.split(':')[1].split(/\s+/).includes('active')).map(x => x.split(':')[0]);
  ok('DELEG-02: a range button activates its own segment (numeric range)',
     !threw && r.before.length === 4 && JSON.stringify(active(r.before)) === '["30"]'
       && JSON.stringify(active(r.after)) === '["90"]' && r.tags.every(t => t === 'button'), { threw, r });
}
{
  const a = f2Progress();
  const r = {};
  let threw = null;
  const find = pred => controlsIn(f2AppHtml(a)).find(pred) || null;
  let weights = [], pets = [];
  try {
    const subs = controlsIn(f2AppHtml(a)).filter(c => c.data.action === 'progSubTab');
    r.subs = subs.map(c => c.tag + ':' + c.data.sub);
    const strength = subs.find(c => c.data.sub === 'strength');
    if(strength) fireAction(a, 'click', fakeEl(strength.data));
    const s2 = find(c => c.data.action === 'progSubTab' && c.data.sub === 'strength');
    r.strengthActive = !!s2 && s2.cls.split(/\s+/).includes('active');
    const body = find(c => c.data.action === 'progSubTab' && c.data.sub === 'body');
    if(body) fireAction(a, 'click', fakeEl(body.data));
    weights = spyOn(a, 'logWeight');
    pets = spyOn(a, 'logPetWeight');
    const log = find(c => c.data.action === 'logWeight');
    r.log = log && log.tag;
    if(log) fireAction(a, 'click', fakeEl(log.data));
    const pet = find(c => c.data.action === 'progSubTab' && c.data.sub === 'pet');
    if(pet) fireAction(a, 'click', fakeEl(pet.data));
    const plog = find(c => c.data.action === 'logPetWeight');
    r.plog = plog && { tag: plog.tag, data: plog.data };
    if(plog) fireAction(a, 'click', fakeEl(plog.data));
  } catch(e){ threw = e.message; }
  ok('DELEG-02: the Progress sub-tabs and both Log buttons route through the dispatcher',
     !threw && r.subs.length === 5 && r.subs.every(x => x.startsWith('button:')) && r.strengthActive
       && r.log === 'button' && JSON.stringify(weights) === '[[]]'
       && !!r.plog && r.plog.tag === 'button' && JSON.stringify(pets) === '[["pet-input","pet-date"]]', { threw, r, weights, pets });
}
/* logPetWeight(elId, dateElId) is shared with Today's weigh-in row (plan 05-05), whose control names
   only its input. A control with no data-date-el must pass exactly one argument, never an undefined
   second one. Today is not converted yet, so the element here is a stand-in with that shape. */
{
  const a = loadApp(APP_PATH);
  const calls = spyOn(a, 'logPetWeight');
  let threw = null;
  try {
    fireAction(a, 'click', fakeEl({ action: 'logPetWeight', input: 'today-pet' }));
    fireAction(a, 'click', fakeEl({ action: 'logPetWeight', input: 'pet-input', dateEl: 'pet-date' }));
  } catch(e){ threw = e.message; }
  ok('DELEG-02: the shared logPetWeight action passes one argument when the control names no date element',
     !threw && calls.length === 2 && calls[0].length === 1 && calls[0][0] === 'today-pet'
       && JSON.stringify(calls[1]) === '["pet-input","pet-date"]', { threw, calls });
}
{
  const a = f2Progress('strength');
  const r = {};
  let threw = null;
  const sels = spyOn(a, 'selectExercise');
  let prs = [];
  try {
    const html = f2AppHtml(a);
    const cs = controlsIn(html);
    const sel = cs.find(c => c.data.action === 'selectExercise');
    r.sel = sel && { tag: sel.tag, events: Object.keys(a.ACTIONS.selectExercise || {}) };
    const opts = [...html.matchAll(/<option value="([^"]*)"/g)].map(m => m[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
    r.value = opts[opts.length - 1];
    if(sel){
      const el = fakeEl(sel.data, { value: r.value });
      fireAction(a, 'click', el); fireAction(a, 'input', el);
      fireAction(a, 'change', el);
    }
    r.sels = JSON.stringify(sels);
    prs = spyOn(a, 'selectPR');
    const pr = cs.find(c => c.data.action === 'selectPR');
    r.pr = pr && pr.tag;
    if(pr) fireAction(a, 'click', fakeEl(pr.data));
  } catch(e){ threw = e.message; }
  ok('DELEG-02: picking an exercise and a PR row select through the dispatcher',
     !threw && !!r.sel && r.sel.tag === 'select' && JSON.stringify(r.sel.events) === '["change"]'
       && !!r.value && r.sels === JSON.stringify([[r.value]])
       && r.pr === 'button' && prs.length === 1 && prs[0].length === 1 && prs[0][0] === 0, { threw, r, prs });
}
{
  const a = f2Progress();
  const r = {};
  let threw = null;
  const rm = spyOn(a, 'rmWeight'), rmp = spyOn(a, 'rmPetWeight');
  try {
    const w = controlsIn(f2AppHtml(a)).find(c => c.data.action === 'rmWeight');
    r.w = w && w.tag;
    if(w) fireAction(a, 'click', fakeEl(w.data));
    a.__sandbox.progSubTab('pet');
    r.pets = a.DB.petWeights.filter(x => !x.deletedAt).length;
    const p = controlsIn(f2AppHtml(a)).find(c => c.data.action === 'rmPetWeight');
    r.p = p && p.tag;
    if(p) fireAction(a, 'click', fakeEl(p.data));
  } catch(e){ threw = e.message; }
  ok('DELEG-02: deleting a weigh-in passes a numeric index',
     !threw && r.w === 'button' && JSON.stringify(rm) === '[[2]]' && typeof rm[0][0] === 'number'
       && r.pets > 0 && r.p === 'button' && JSON.stringify(rmp) === '[[1]]' && typeof rmp[0][0] === 'number', { threw, r, rm, rmp });
}
/* T-5-02: a cardio id arrives from a Strava import, sync or a backup. It used to sit inside the
   inline handler's single quotes, where esc() does not reach. */
{
  const a = loadApp(APP_PATH);
  a.DB = a.blank();
  a.DB.cardio = [{ id: HOSTILE, date: dayOff(-1), type: 'Longboard', minutes: 20, distanceKm: 0, note: '', mtime: 1 },
                 { id: 'c2', date: dayOff(-2), type: 'Walk', minutes: 30, distanceKm: 0, note: '', mtime: 1 }];
  const r = {};
  let threw = null;
  try {
    a.go('train'); a.setSub('cardio');
    const html = a.__sandbox.viewCardio();
    r.rawB = html.includes('<b>');
    const del = controlsIn(html).filter(c => c.data.action === 'removeCardio');
    r.ids = del.map(c => c.data.id);
    const h = del.find(c => c.data.id === HOSTILE);
    r.tag = h && h.tag;
    if(h) fireAction(a, 'click', fakeEl(h.data));
    r.hostileDeleted = !!a.DB.cardio.find(c => c.id === HOSTILE).deletedAt;
    r.c2Live = !a.DB.cardio.find(c => c.id === 'c2').deletedAt;
  } catch(e){ threw = e.message; }
  ok('D-03: a hostile cardio id round-trips through data-id and deletes the right session',
     !threw && !r.rawB && r.ids.length === 2 && r.tag === 'button' && r.hostileDeleted && r.c2Live, { threw, r });
}
/* The picker button clicks the hidden file input inside the tap; the input acts on change alone, so
   the synthesized click does nothing and a chosen file imports once. */
{
  const a = loadApp(APP_PATH);
  a.DB = a.blank();
  const r = {};
  let threw = null;
  let picks = [], files = [], adds = [];
  try {
    a.go('train'); a.setSub('cardio');
    const cs = controlsIn(f2AppHtml(a));
    picks = spyOn(a, 'pickCardioFile'); files = spyOn(a, 'handleCardioFile'); adds = spyOn(a, 'addCardio');
    const pick = cs.find(c => c.data.action === 'pickCardioFile');
    const inp = cs.find(c => c.data.action === 'handleCardioFile');
    r.pick = pick && pick.tag; r.inp = inp && { tag: inp.tag, type: inp.type };
    if(pick) fireAction(a, 'click', fakeEl(pick.data));
    r.afterPick = [picks.length, files.length];
    if(inp){
      const el = fakeEl(inp.data);
      fireAction(a, 'change', el);
      r.sameEl = files.length === 1 && files[0].length === 1 && files[0][0] === el;
      fireAction(a, 'click', el);
    }
    r.after = [picks.length, files.length];
    const add = cs.find(c => c.data.action === 'addCardio');
    r.add = add && add.tag;
    if(add) fireAction(a, 'click', fakeEl(add.data));
  } catch(e){ threw = e.message; }
  ok('DELEG-02: the Strava file picker opens from its button, and choosing a file runs the handler once',
     !threw && r.pick === 'button' && !!r.inp && r.inp.tag === 'input' && r.inp.type === 'file'
       && JSON.stringify(r.afterPick) === '[1,0]' && r.sameEl && JSON.stringify(r.after) === '[1,1]'
       && r.add === 'button' && JSON.stringify(adds) === '[[]]', { threw, r, adds });
}

/* ── Plan 05-05: Today ── */
/* The frozen clock is Friday 12:00 Chicago: a workout day, and the afternoon card order (no week
   card; the weigh-in card is closed until toggled). populatedDB's last live session is PUSH 2, so
   the fixed next workout is LEGS 2. */
function f2Today(seed){
  const a = loadApp(APP_PATH);
  a.DB = populatedDB(a);
  if(seed) seed(a);
  a.go('today');
  return a;
}
/* 4-day mode with a Pull day last: nextWorkout() returns SPECIALIZED, so the card offers the five
   focus options. */
/* This instance's clock at 20:00 Chicago on the frozen calendar day (the evening card order). */
function f2Evening(a){
  const ms = Date.parse('2026-08-08T01:00:00Z'), Base = a.__sandbox.Date;
  function Evening(...args){
    if(!new.target) return new Base(ms).toString();
    return args.length ? new Base(...args) : new Base(ms);
  }
  Evening.prototype = Base.prototype;
  Evening.now = () => ms; Evening.parse = Base.parse; Evening.UTC = Base.UTC;
  a.__sandbox.Date = Evening;
}
function f2SeedSpecialized(a){
  a.DB.routineMode = '4day';
  a.DB.sessions.push({ id:'s6', workout:'PULL 1', date:dayOff(-1), endedAt:6, extras:{},
    entries:[{ name:'Barbell row', sets:[{ w:'135', r:'8', skipped:false }] }] });
}
{
  const r = {};
  let threw = null;
  let starts = [], skips = [], sStarts = [], sSkips = [];
  try {
    const a = f2Today();
    starts = spyOn(a, 'startWorkout'); skips = spyOn(a, 'skipDay');
    const cs = controlsIn(f2AppHtml(a));
    r.next = a.__sandbox.nextWorkout();
    const st = cs.filter(c => c.data.action === 'startWorkout'), sk = cs.filter(c => c.data.action === 'skipDay');
    r.fixed = { st: st.map(c => c.tag + ':' + c.data.name), sk: sk.map(c => c.tag + ':' + c.data.name) };
    st.forEach(c => fireAction(a, 'click', fakeEl(c.data)));
    sk.forEach(c => fireAction(a, 'click', fakeEl(c.data)));

    const b = f2Today(f2SeedSpecialized);
    sStarts = spyOn(b, 'startWorkout'); sSkips = spyOn(b, 'skipDay');
    const bs = controlsIn(f2AppHtml(b));
    r.sNext = b.__sandbox.nextWorkout();
    const opts = bs.filter(c => c.data.action === 'startWorkout');
    r.opts = opts.map(c => c.tag + ':' + c.data.name);
    opts.forEach(c => fireAction(b, 'click', fakeEl(c.data)));
    bs.filter(c => c.data.action === 'skipDay').forEach(c => fireAction(b, 'click', fakeEl(c.data)));
    r.PROGRAM = Object.keys(b.PROGRAM || {});
  } catch(e){ threw = e.message; }
  const inProgram = n => (r.PROGRAM || []).includes(n);
  const optNames = (r.opts || []).map(x => x.slice(x.indexOf(':') + 1));
  ok('DELEG-02: Start and Skip on Today pass the workout name through data-name',
     !threw && r.next === 'LEGS 2' && JSON.stringify(r.fixed.st) === '["button:LEGS 2"]' && JSON.stringify(r.fixed.sk) === '["button:LEGS 2"]'
       && JSON.stringify(starts) === '[["LEGS 2"]]' && JSON.stringify(skips) === '[["LEGS 2"]]' && inProgram('LEGS 2')
       && r.sNext === 'SPECIALIZED' && optNames.length === 5 && new Set(optNames).size === 5
       && optNames.every(n => n.indexOf('SPECIALIZED — ') === 0 && inProgram(n)) && r.opts.every(x => x.startsWith('button:'))
       && optNames.includes('SPECIALIZED — CHEST & TRICEPS')
       && JSON.stringify(sStarts) === JSON.stringify(optNames.map(n => [n])) && JSON.stringify(sSkips) === '[["SPECIALIZED"]]',
     { threw, r, starts, skips, sStarts, sSkips });
}
{
  const r = {};
  let threw = null;
  try {
    const a = f2Today(a => { a.DB.draft = fullDraft(a, 'PUSH 1'); });
    a.subState.train = 'history';   /* so "opens the Log sub" is not the default passing */
    r.before = a.TAB;
    const res =controlsIn(f2AppHtml(a)).filter(c => c.data.action === 'goSub' && c.data.tab === 'train' && c.data.sub === 'log');
    r.res = res.map(c => c.tag);
    if(res[0]) fireAction(a, 'click', fakeEl(res[0].data));
    r.tab = a.TAB; r.sub = a.subState.train;
  } catch(e){ threw = e.message; }
  ok('DELEG-02: with a workout in progress, Resume opens the Log tab',
     !threw && r.before === 'today' && JSON.stringify(r.res) === '["button"]' && r.tab === 'train' && r.sub === 'log', { threw, r });
}
{
  const r = {};
  let threw = null;
  let shuffles = [], dids = [], selects = [];
  try {
    const a = f2Today();
    const find = pred => controlsIn(f2AppHtml(a)).find(pred) || null;
    const prod = find(c => c.data.action === 'setPickCat' && c.data.cat === 'productivity');
    r.prodBefore = prod && prod.cls;
    if(prod) fireAction(a, 'click', fakeEl(prod.data));
    const prod2 = find(c => c.data.action === 'setPickCat' && c.data.cat === 'productivity');
    const hobby2 = find(c => c.data.action === 'setPickCat' && c.data.cat === 'hobby');
    r.prodAfter = prod2 && prod2.cls; r.hobbyAfter = hobby2 && hobby2.cls;
    r.segTags = [prod2 && prod2.tag, hobby2 && hobby2.tag];
    shuffles = spyOn(a, 'shufflePick'); dids = spyOn(a, 'didPick'); selects = spyOn(a, 'selectPick');
    const sh = find(c => c.data.action === 'shufflePick'), dn = find(c => c.data.action === 'didPick');
    const sel = find(c => c.data.action === 'selectPick');
    r.tags = [sh && sh.tag, dn && dn.tag, sel && sel.tag];
    if(sh) fireAction(a, 'click', fakeEl(sh.data));
    if(dn) fireAction(a, 'click', fakeEl(dn.data));
    if(sel){
      const el = fakeEl(sel.data, { value: 'Laundry' });
      fireAction(a, 'click', el); fireAction(a, 'input', el); fireAction(a, 'change', el);
    }
    r.selKeys = Object.keys((a.ACTIONS || {}).selectPick || {});
  } catch(e){ threw = e.message; }
  const active = s => String(s || '').split(/\s+/).includes('active');
  ok('DELEG-02: the pick-a-thing card routes category, shuffle, done and the selector through the dispatcher',
     !threw && r.prodBefore != null && !active(r.prodBefore) && active(r.prodAfter) && !active(r.hobbyAfter)
       && JSON.stringify(r.segTags) === '["button","button"]' && JSON.stringify(r.tags) === '["button","button","select"]'
       && JSON.stringify(shuffles) === '[[]]' && JSON.stringify(dids) === '[[]]'
       && JSON.stringify(selects) === '[["Laundry"]]' && JSON.stringify(r.selKeys) === '["change"]',
     { threw, r, shuffles, dids, selects });
}
{
  const r = {};
  let threw = null;
  try {
    const a = f2Today();
    const box = controlsIn(f2AppHtml(a)).filter(c => c.data.action === 'saveJournal');
    r.box = box.map(c => c.tag);
    if(box[0]){
      const el = fakeEl(box[0].data, { value: 'a good day' });
      fireAction(a, 'click', el);
      r.afterClick = a.DB.journal[a.todayISO()];
      fireAction(a, 'input', el);
    }
    r.saved = a.DB.journal[a.todayISO()];
  } catch(e){ threw = e.message; }
  ok('DELEG-02: the journal box saves on input through the dispatcher',
     !threw && JSON.stringify(r.box) === '["textarea"]' && r.afterClick === '' && r.saved === 'a good day', { threw, r });
}
/* The afternoon order has no week card, so the only train/history shortcut on Today is the link
   under the journal box. */
{
  const r = {};
  let threw = null;
  try {
    const a = f2Today();
    const links = controlsIn(f2AppHtml(a)).filter(c => c.data.action === 'goSub' && c.data.tab === 'train' && c.data.sub === 'history');
    r.links = links.map(c => c.tag + ':' + c.cls);
    if(links[0]) fireAction(a, 'click', fakeEl(links[0].data));
    r.tab = a.TAB; r.sub = a.subState.train;
  } catch(e){ threw = e.message; }
  ok('DELEG-06: the week link under the journal box is an inline button that opens History',
     !threw && JSON.stringify(r.links) === '["button:tap-inline"]' && r.tab === 'train' && r.sub === 'history', { threw, r });
}
/* The week card renders only in the evening order. Moves this instance's clock to 20:00 Chicago on
   the same calendar day; every other instance keeps the frozen midday. */
{
  const r = {};
  let threw = null;
  try {
    const a = f2Today(f2Evening);
    const cs = controlsIn(f2AppHtml(a)).filter(c => c.data.action === 'goSub' && c.data.tab === 'train' && c.data.sub === 'history');
    r.hist = cs.map(c => c.tag + ':' + c.cls);
    r.evening = /Good evening/.test(f2AppHtml(a));
    const card = cs.find(c => c.cls.split(/\s+/).includes('card')) || null;
    if(card) fireAction(a, 'click', fakeEl(card.data));
    r.tab = a.TAB; r.sub = a.subState.train;
  } catch(e){ threw = e.message; }
  ok("DELEG-06: Today's evening week card is a whole-card button that opens History",
     !threw && r.evening && r.hist.includes('button:card tap') && r.hist.includes('button:tap-inline') && r.hist.length === 2
       && r.tab === 'train' && r.sub === 'history', { threw, r });
}
/* A blank DB on Today: nobody has weighed in, and the afternoon card is closed until toggled, which
   renders both log rows. */
function f2TodayWeighIn(){
  const a = loadApp(APP_PATH);
  a.DB = a.blank();
  a.go('today');
  a.toggleAcc('weighin');
  return a;
}
/* The decoded value of `attr` on the <input> whose id is `id` in rendered `html`, or null. A value
   that broke out of its quotes ends the start tag early, so what is left no longer carries it. */
function f2InputAttr(html, id, attr){
  const tag = String(html || '').match(new RegExp('<input\\b[^>]*\\sid="' + id + '"[^>]*>'));
  const m = tag ? tag[0].match(new RegExp('\\s' + attr + '="([^"]*)"')) : null;
  return m ? m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&amp;/g, '&') : null;
}
/* Enter-to-log (RESEARCH Pitfall 3). The box's action is keydown-only and forwards Enter to the Log
   button's click handler; the button has no keydown handler, so Enter on the focused button (whose
   click the browser synthesizes) cannot log a second time. Fired through the app's own listeners. */
{
  const r = {};
  let threw = null;
  let calls = [];
  try {
    const a = f2TodayWeighIn();
    calls = spyOn(a, 'logWeight');
    const cs = controlsIn(f2AppHtml(a));
    const box = cs.find(c => c.data.action === 'enter' && c.data.enter === 'logWeight') || null;
    const btn = cs.find(c => c.data.action === 'logWeight') || null;
    r.box = box && box.tag; r.btn = btn && btn.tag;
    if(box){
      const el = fakeEl(box.data, { tagName: 'INPUT' });
      fireListener(a, 'keydown', el, { key: 'Enter' }); r.enter = calls.length;
      fireListener(a, 'keydown', el, { key: 'a' });     r.otherKey = calls.length;
      fireListener(a, 'click', el);                      r.clickBox = calls.length;
    }
    if(btn){
      const el = fakeEl(btn.data, { tagName: 'BUTTON' });
      fireListener(a, 'click', el);                      r.click = calls.length;
      fireListener(a, 'keydown', el, { key: 'Enter' }); r.enterOnButton = calls.length;
    }
  } catch(e){ threw = e.message; }
  ok('DELEG-02: Enter in the weigh-in box logs once, and the Log button logs once',
     !threw && r.box === 'input' && r.btn === 'button' && r.enter === 1 && r.otherKey === 1 && r.clickBox === 1
       && r.click === 2 && r.enterOnButton === 2 && calls.every(c => c.length === 0), { threw, r, calls });
}
{
  const r = {};
  let threw = null;
  let calls = [];
  try {
    const a = f2TodayWeighIn();
    calls = spyOn(a, 'logPetWeight');
    const html = f2AppHtml(a);
    const petHint = name => name + "'s weight (" + a.DB.unit + ')';
    r.hint = f2InputAttr(html, 'pet-input', 'placeholder') === petHint(a.DB.petName);
    r.doubled = /&amp;(#39|quot|lt|gt|amp);/.test(html);
    const cs = controlsIn(html);
    const box = cs.find(c => c.data.action === 'enter' && c.data.enter === 'logPetWeight') || null;
    const btn = cs.find(c => c.data.action === 'logPetWeight') || null;
    r.box = box && box.tag; r.btn = btn && btn.tag;
    if(box) fireListener(a, 'keydown', fakeEl(box.data, { tagName: 'INPUT' }), { key: 'Enter' });
    r.afterEnter = JSON.stringify(calls);
    if(btn) fireListener(a, 'click', fakeEl(btn.data, { tagName: 'BUTTON' }));
    /* T-5-02: the pet name reaches the placeholder escaped exactly once: it decodes back to itself. */
    a.DB.petName = 'Fr"><b>x';
    a.render();
    const hostile = f2AppHtml(a);
    r.hostileRaw = hostile.includes('<b>x'); r.hostileEsc = f2InputAttr(hostile, 'pet-input', 'placeholder') === petHint('Fr"><b>x');
  } catch(e){ threw = e.message; }
  ok("DELEG-02: Enter in Today's pet weigh-in box passes one argument, as before",
     !threw && r.hint && !r.doubled && r.box === 'input' && r.btn === 'button'
       && r.afterEnter === '[["pet-input"]]' && JSON.stringify(calls) === '[["pet-input"],["pet-input"]]'
       && !r.hostileRaw && r.hostileEsc, { threw, r, calls });
}
/* D-02: the old handler was two statements (set the Progress view, then navigate). One action runs
   the chain. */
{
  const r = {};
  let threw = null;
  try {
    const a = loadApp(APP_PATH);
    a.DB = a.blank();
    a.go('today');
    const chart = prog => controlsIn(f2AppHtml(a)).find(c => c.data.action === 'openChart' && c.data.prog === prog) || null;
    const pet = chart('pet');
    r.pet = pet && pet.tag;
    if(pet) fireAction(a, 'click', fakeEl(pet.data));
    r.petTab = a.TAB; r.petSub = a.subState.train;
    r.petShown = f2AppHtml(a).includes('id="pet-input"') && !f2AppHtml(a).includes('id="wt-input"');
    a.go('today');
    const body = chart('body');
    r.body = body && body.tag;
    if(body) fireAction(a, 'click', fakeEl(body.data));
    r.bodyTab = a.TAB; r.bodySub = a.subState.train;
    r.bodyShown = f2AppHtml(a).includes('id="wt-input"') && !f2AppHtml(a).includes('id="pet-input"');
  } catch(e){ threw = e.message; }
  ok('DELEG-02: a Chart button sets the Progress view and opens it (D-02 chain)',
     !threw && r.pet === 'button' && r.petTab === 'train' && r.petSub === 'progress' && r.petShown
       && r.body === 'button' && r.bodyTab === 'train' && r.bodySub === 'progress' && r.bodyShown, { threw, r });
}
/* Pitfall 5: the checkbox sits inside a <label>, and a tap on the label clicks the checkbox. The
   action is on the checkbox's change alone, so the forwarded click never toggles it a second time.
   CLAUDE.md: absence never means "off", so un-ticking stores an explicit false. */
{
  const r = {};
  let threw = null;
  try {
    const a = loadApp(APP_PATH);
    a.DB = a.blank();
    a.go('today');
    const t = a.todayISO();
    const head = controlsIn(f2AppHtml(a)).find(c => c.data.action === 'toggleAcc' && c.data.key === 'mob-today') || null;
    r.head = head && head.tag;
    r.closed = !controlsIn(f2AppHtml(a)).some(c => c.data.action === 'toggleMobility');
    if(head) fireAction(a, 'click', fakeEl(head.data));
    const cs = controlsIn(f2AppHtml(a));
    const box = cs.find(c => c.data.action === 'toggleMobility') || null;
    r.box = box && { tag: box.tag, type: box.type, i: box.data.i };
    r.labels = cs.filter(c => c.tag === 'label').length;
    r.before = JSON.stringify((a.DB.mobilityLog || {})[t] || null);
    if(box){
      const el = fakeEl(box.data);
      fireAction(a, 'click', el);
      r.afterClick = JSON.stringify((a.DB.mobilityLog || {})[t] || null);
      fireAction(a, 'change', el);
      const m1 = Object.assign({}, a.DB.mobilityLog[t]);
      r.on = Object.keys(m1).length === 1 && Object.values(m1)[0] === true;
      fireAction(a, 'change', el);
      const m2 = a.DB.mobilityLog[t];
      r.off = Object.keys(m2).length === 1 && Object.values(m2)[0] === false;
    }
  } catch(e){ threw = e.message; }
  ok("DELEG-02: a mobility checkbox toggles once per change, never on the label's forwarded click",
     !threw && r.head === 'button' && r.closed && !!r.box && r.box.tag === 'input' && r.box.type === 'checkbox'
       && r.labels === 0 && r.afterClick === r.before && r.on && r.off, { threw, r });
}
/* The session button: no argument, as before, and the real toggle logs 'yoga' then an explicit
   false (never a deleted key). */
{
  const r = {};
  let threw = null;
  let calls = [];
  try {
    const a = loadApp(APP_PATH);
    a.DB = a.blank();
    a.go('today');
    a.toggleAcc('mob-today');
    const t = a.todayISO();
    const find = () => controlsIn(f2AppHtml(a)).find(c => c.data.action === 'toggleMobSession') || null;
    const b1 = find();
    r.tag = b1 && b1.tag;
    if(b1) fireAction(a, 'click', fakeEl(b1.data));
    r.on = a.DB.mobilityLog && a.DB.mobilityLog[t] ? a.DB.mobilityLog[t].__session : undefined;
    const b2 = find();
    if(b2) fireAction(a, 'click', fakeEl(b2.data));
    r.off = a.DB.mobilityLog && a.DB.mobilityLog[t] && '__session' in a.DB.mobilityLog[t] ? a.DB.mobilityLog[t].__session : 'absent';
    calls = spyOn(a, 'toggleMobSession');
    const b3 = find();
    if(b3) fireAction(a, 'click', fakeEl(b3.data));
  } catch(e){ threw = e.message; }
  ok('DELEG-02: the mobility session button toggles through the dispatcher with no argument',
     !threw && r.tag === 'button' && r.on === 'yoga' && r.off === false && JSON.stringify(calls) === '[[]]', { threw, r, calls });
}
/* The shortcut cards and the two headers are real buttons (DELEG-06, D-11). Midday shows the
   weather and cardio cards; the week card renders only in the evening order. */
{
  const r = {};
  let threw = null;
  const tap = c => !!c && c.tag === 'button' && c.cls.split(/\s+/).includes('tap');
  try {
    const a = loadApp(APP_PATH);
    a.DB = a.blank();
    setup(a, {});
    a.go('today');
    const html = f2AppHtml(a), cs = controlsIn(html);
    r.weigh = tap(cs.find(c => c.data.action === 'toggleAcc' && c.data.key === 'weighin'));
    r.mob = tap(cs.find(c => c.data.action === 'toggleAcc' && c.data.key === 'mob-today'));
    const lawn = cs.filter(c => c.data.action === 'goSub' && c.data.tab === 'care' && c.data.sub === 'lawn');
    r.lawn = lawn.length >= 2 && lawn.every(tap);
    /* the weather card itself: a card button carrying the temperature */
    r.weather = (html.match(/<button class="card tap"[^>]*data-sub="lawn">[\s\S]*?<\/button>/g) || []).some(s => /°/.test(s) && /Lawn →/.test(s));
    const cardio = cs.filter(c => c.data.action === 'goSub' && c.data.tab === 'train' && c.data.sub === 'cardio');
    r.cardio = cardio.length === 1 && cardio.every(tap) && cardio[0].cls.split(/\s+/).includes('card');
    const b = loadApp(APP_PATH);
    b.DB = b.blank();
    f2Evening(b);
    b.go('today');
    const week = controlsIn(f2AppHtml(b)).filter(c => c.data.action === 'goSub' && c.data.tab === 'train' && c.data.sub === 'history'
      && c.cls.split(/\s+/).includes('card'));
    r.week = week.length === 1 && week.every(tap);
  } catch(e){ threw = e.message; }
  ok("DELEG-06: Today's weigh-in and mobility headers and the weather, week and cardio cards are buttons",
     !threw && r.weigh && r.mob && r.lawn && r.weather && r.cardio && r.week, { threw, r });
}

/* Enter-to-add on the to-do box: the box forwards Enter to addTodo's click, which reads the box's
   value itself. The harness's getElementById hands back the same element across renders, so the
   box is emptied by hand between steps (a real re-render gives a fresh, empty box). */
{
  const r = {};
  let threw = null;
  let dones = [], adds = [];
  try {
    const a = loadApp(APP_PATH);
    a.DB = a.blank();
    a.go('today');
    const inp = a.__sandbox.document.getElementById('todo-input');
    const texts = () => a.liveTodos().map(t => t.text);
    const cs0 = controlsIn(f2AppHtml(a));
    const box = cs0.find(c => c.data.action === 'enter' && c.data.enter === 'addTodo') || null;
    const add = cs0.find(c => c.data.action === 'addTodo') || null;
    r.box = box && box.tag; r.add = add && add.tag;
    if(box){
      const el = fakeEl(box.data, { tagName: 'INPUT' });
      inp.value = 'buy milk';
      fireListener(a, 'keydown', el, { key: 'a' });     r.otherKey = texts();
      fireListener(a, 'click', el);                      r.clickBox = texts();
      fireListener(a, 'keydown', el, { key: 'Enter' }); r.enter = texts();
      inp.value = '';
      fireListener(a, 'keydown', el, { key: 'Enter' }); r.empty = texts();
    }
    if(add){ inp.value = 'call the vet'; fireListener(a, 'click', fakeEl(add.data, { tagName: 'BUTTON' })); inp.value = ''; }
    r.added = texts();
    const cs = controlsIn(f2AppHtml(a));
    const done = cs.filter(c => c.data.action === 'doneTodo'), rm = cs.filter(c => c.data.action === 'removeTodo');
    r.done = done.map(c => c.tag + ':' + c.type + ':' + c.data.i); r.rm = rm.map(c => c.tag + ':' + c.data.i);
    if(done[0]){
      const el = fakeEl(done[0].data);
      fireAction(a, 'click', el); r.afterClick = texts();
      fireAction(a, 'change', el); r.afterChange = texts();
      r.journal = /buy milk/.test(a.DB.journal[a.todayISO()] || '');
    }
    const rm2 = controlsIn(f2AppHtml(a)).find(c => c.data.action === 'removeTodo') || null;
    if(rm2) fireAction(a, 'click', fakeEl(rm2.data));
    r.afterRemove = texts();
    r.soft = a.DB.todos.length === 2 && a.DB.todos.every(t => t.deletedAt);
    dones = spyOn(a, 'doneTodo');
    fireAction(a, 'change', fakeEl({ action: 'doneTodo', i: '0' }));
    /* addTodo reads the box itself and takes no argument, from either path */
    adds = spyOn(a, 'addTodo');
    if(add) fireListener(a, 'click', fakeEl(add.data, { tagName: 'BUTTON' }));
    if(box) fireListener(a, 'keydown', fakeEl(box.data, { tagName: 'INPUT' }), { key: 'Enter' });
  } catch(e){ threw = e.message; }
  const J = x => JSON.stringify(x);
  ok('DELEG-02: Enter in the to-do box adds one to-do, and ticking one fires once with a numeric index',
     !threw && r.box === 'input' && r.add === 'button' && J(r.otherKey) === '[]' && J(r.clickBox) === '[]'
       && J(r.enter) === '["buy milk"]' && J(r.empty) === '["buy milk"]' && J(r.added) === '["buy milk","call the vet"]'
       && J(r.done) === '["input:checkbox:0","input:checkbox:1"]' && J(r.rm) === '["button:0","button:1"]'
       && J(r.afterClick) === '["buy milk","call the vet"]' && J(r.afterChange) === '["call the vet"]' && r.journal
       && J(r.afterRemove) === '[]' && r.soft && J(dones) === '[[0]]' && typeof (dones[0] || [])[0] === 'number'
       && J(adds) === '[[],[]]',
     { threw, r, dones, adds });
}
{
  const r = {};
  let threw = null;
  try {
    const a = loadApp(APP_PATH);
    a.DB = a.blank();
    a.DB.todos = Array.from({ length: 7 }, (_, k) => ({ text: 'task ' + k, created: dayOff(-k), mtime: 1 }));
    a.go('today');
    const count = () => controlsIn(f2AppHtml(a)).filter(c => c.data.action === 'doneTodo').length;
    const more = () => controlsIn(f2AppHtml(a)).find(c => c.data.action === 'toggleAcc' && c.data.key === 'todos-all') || null;
    r.before = count();
    const m1 = more();
    r.tag = m1 && m1.tag;
    if(m1) fireAction(a, 'click', fakeEl(m1.data));
    r.expanded = count();
    const m2 = more();
    if(m2) fireAction(a, 'click', fakeEl(m2.data));
    r.collapsed = count();
  } catch(e){ threw = e.message; }
  ok('DELEG-02: Show more expands the to-do list through toggleAcc',
     !threw && r.tag === 'button' && r.before === 5 && r.expanded === 7 && r.collapsed === 5, { threw, r });
}
/* A blank DB has never been backed up, so the backup banner shows. The storage banner is reached the
   way a full device reaches it: localStorage.setItem throws a quota error, save() falls back to
   handleQuotaFailure(), and that re-renders with the banner. */
{
  const r = {};
  let threw = null;
  let exports = [], snoozes = [];
  try {
    const a = loadApp(APP_PATH);
    a.DB = a.blank();
    a.go('today');
    exports = spyOn(a, 'exportData'); snoozes = spyOn(a, 'snoozeBackup');
    const cs = controlsIn(f2AppHtml(a));
    r.banner = /Back up your data/.test(f2AppHtml(a));
    const exp = cs.filter(c => c.data.action === 'exportData'), later = cs.filter(c => c.data.action === 'snoozeBackup');
    const sync = cs.filter(c => c.data.action === 'go' && c.data.tab === 'settings');
    r.tags = [exp, later, sync].map(l => l.map(c => c.tag).join(','));
    exp.forEach(c => fireAction(a, 'click', fakeEl(c.data)));
    later.forEach(c => fireAction(a, 'click', fakeEl(c.data)));
    r.exports = exports.length; r.snoozes = snoozes.length;
    if(sync[0]) fireAction(a, 'click', fakeEl(sync[0].data));
    r.tab = a.TAB;

    const b = loadApp(APP_PATH);
    b.DB = b.blank();
    b.DB.lastBackupAt = Date.now();          /* only the storage banner, so its buttons are the only ones */
    b.go('today');
    const ls = b.__sandbox.localStorage, setItem = ls.setItem;
    ls.setItem = () => { const e = new Error('QuotaExceededError'); e.name = 'QuotaExceededError'; throw e; };
    try { b.__sandbox.save(); } finally { ls.setItem = setItem; }
    b.go('today');
    const bh = f2AppHtml(b), bs = controlsIn(bh);
    r.quota = /This device is out of storage/.test(bh) && !/Back up your data/.test(bh);
    const qExports = spyOn(b, 'exportData');
    const qExp = bs.filter(c => c.data.action === 'exportData'), qSet = bs.filter(c => c.data.action === 'go' && c.data.tab === 'settings');
    r.qTags = [qExp, qSet].map(l => l.map(c => c.tag).join(','));
    qExp.forEach(c => fireAction(b, 'click', fakeEl(c.data)));
    r.qExports = JSON.stringify(qExports);
    if(qSet[0]) fireAction(b, 'click', fakeEl(qSet[0].data));
    r.qTab = b.TAB;
  } catch(e){ threw = e.message; }
  ok("DELEG-02: the backup and storage banners' buttons route through the dispatcher",
     !threw && r.banner && JSON.stringify(r.tags) === '["button","button","button"]' && r.exports === 1 && r.snoozes === 1
       && JSON.stringify(exports) === '[[]]' && JSON.stringify(snoozes) === '[[]]' && r.tab === 'settings'
       && r.quota && JSON.stringify(r.qTags) === '["button","button"]' && r.qExports === '[[]]' && r.qTab === 'settings',
     { threw, r, exports, snoozes });
}

/* ── Plan 05-06: the Log tab ── */
/* The screen Ian is standing in front of mid-set. The stopwatch bar is static markup, so its controls
   are read from the file, and every tap goes through the listener the app registered. */
function f2StaticControl(name){
  return controlsIn(f2Static(F2_RAW)).find(c => c.data.action === name) || null;
}
/* Train → Log on a fresh instance. With no draft this is the picker. */
function f2Log(seed){
  const a = loadApp(APP_PATH);
  a.DB = populatedDB(a);
  if(seed) seed(a);
  a.go('train'); a.setSub('log');
  return a;
}
/* swGuard, through the app's own non-passive pointerdown listener: with the keyboard up the tap is
   preventDefault'ed, so focus stays in the weight or reps box; with it down, the focused element is
   blurred, so the keyboard stays down. */
{
  const r = {};
  let threw = null;
  try {
    ['swToggle', 'swClear'].forEach(name => {
      const c = f2StaticControl(name);
      r[name] = { tag: c && c.tag };
      if(!c) return;
      const a = loadApp(APP_PATH);
      let blurred = 0;
      a.__sandbox.document.activeElement = { blur(){ blurred++; } };
      a.__sandbox.visualViewport = { height: 400, offsetTop: 0 };
      const up = fireListener(a, 'pointerdown', fakeEl(c.data));
      r[name].up = up.defaultPrevented; r[name].blurUp = blurred;
      delete a.__sandbox.visualViewport;
      const down = fireListener(a, 'pointerdown', fakeEl(c.data));
      r[name].down = down.defaultPrevented; r[name].blurDown = blurred;
    });
  } catch(e){ threw = e.message; }
  ok('DELEG-02: the stopwatch holds focus with the keyboard up and lets it go with the keyboard down (swGuard through the dispatcher)',
     !threw && ['swToggle', 'swClear'].every(n => r[n] && r[n].tag === 'button' && r[n].up === true && r[n].blurUp === 0
       && r[n].down === false && r[n].blurDown === 1), { threw, r });
}
{
  const r = {};
  let threw = null;
  let toggles = [], clears = [];
  try {
    const a = loadApp(APP_PATH);
    toggles = spyOn(a, 'swToggle'); clears = spyOn(a, 'swClear');
    const t = f2StaticControl('swToggle'), c = f2StaticControl('swClear');
    r.found = [!!t, !!c];
    [t, c].forEach(x => { if(x) fireListener(a, 'pointerdown', fakeEl(x.data)); });
    r.afterPointerdown = [toggles.length, clears.length];
    if(t) fireListener(a, 'click', fakeEl(t.data));
    if(c) fireListener(a, 'click', fakeEl(c.data));
  } catch(e){ threw = e.message; }
  ok('DELEG-02: a stopwatch tap toggles once, and Clear clears once',
     !threw && JSON.stringify(r.found) === '[true,true]' && JSON.stringify(r.afterPointerdown) === '[0,0]'
       && JSON.stringify(toggles) === '[[]]' && JSON.stringify(clears) === '[[]]', { threw, r, toggles, clears });
}
{
  const r = {};
  let threw = null;
  try {
    const a = f2Log();
    const rows = a.__sandbox.previewRows('PUSH 1');
    const shown = () => f2AppHtml(a).includes(rows);
    const bodies = () => f2AppHtml(a).split('<div class="phase-body">').length - 1;
    const find = pred => controlsIn(f2AppHtml(a)).find(pred) || null;
    const pv = find(c => c.data.action === 'togglePreview' && c.data.name === 'PUSH 1');
    r.pv = pv && { tag: pv.tag, cls: pv.cls };
    r.preview = [shown()];
    if(pv){ fireListener(a, 'click', fakeEl(pv.data)); r.preview.push(shown()); fireListener(a, 'click', fakeEl(pv.data)); r.preview.push(shown()); }
    const gd = find(c => c.data.action === 'toggleGuide' && c.data.i === '0');
    r.gd = gd && gd.tag;
    r.guide = [bodies()];
    if(gd){ fireListener(a, 'click', fakeEl(gd.data)); r.guide.push(bodies()); fireListener(a, 'click', fakeEl(gd.data)); r.guide.push(bodies()); }
  } catch(e){ threw = e.message; }
  ok('DELEG-02: a program preview and a guide section open and close through the dispatcher',
     !threw && r.pv && r.pv.tag === 'button' && /(^|\s)tap(\s|$)/.test(r.pv.cls) && JSON.stringify(r.preview) === '[false,true,false]'
       && r.gd === 'button' && JSON.stringify(r.guide) === '[0,1,0]', { threw, r });
}
/* Every Start and Skip on the picker, in both routine modes, passes its own card's name: the fixed
   cards their workout, the Specialized options theirs, and every Specialized Skip SPECIALIZED.
   4-day is the default mode (blank() and migration 11), so the 3-day instance sets it explicitly. */
{
  const r = {};
  let threw = null;
  let starts = [], skips = [], sStarts = [], sSkips = [];
  try {
    const a = f2Log(a => { a.DB.routineMode = '3day'; });   /* the fixed cards alone */
    starts = spyOn(a, 'startWorkout'); skips = spyOn(a, 'skipDay');
    const cs = controlsIn(f2AppHtml(a));
    const st = cs.filter(c => c.data.action === 'startWorkout'), sk = cs.filter(c => c.data.action === 'skipDay');
    r.st = st.map(c => c.tag + ':' + c.data.name); r.sk = sk.map(c => c.tag + ':' + c.data.name);
    st.forEach(c => fireAction(a, 'click', fakeEl(c.data)));
    sk.forEach(c => fireAction(a, 'click', fakeEl(c.data)));

    const b = f2Log(b => { b.DB.routineMode = '4day'; });
    sStarts = spyOn(b, 'startWorkout'); sSkips = spyOn(b, 'skipDay');
    const bs = controlsIn(f2AppHtml(b));
    const sst = bs.filter(c => c.data.action === 'startWorkout' && c.data.name.indexOf('SPECIALIZED') === 0);
    const ssk = bs.filter(c => c.data.action === 'skipDay' && c.data.name.indexOf('SPECIALIZED') === 0);
    r.sst = sst.map(c => c.tag + ':' + c.data.name); r.ssk = ssk.map(c => c.tag + ':' + c.data.name);
    sst.forEach(c => fireAction(b, 'click', fakeEl(c.data)));
    ssk.forEach(c => fireAction(b, 'click', fakeEl(c.data)));
    r.PROGRAM = Object.keys(a.PROGRAM || {});
  } catch(e){ threw = e.message; }
  const names = l => (l || []).map(x => x.slice(x.indexOf(':') + 1));
  const FIXED = ['PUSH 1', 'LEGS 1', 'PULL 1', 'PUSH 2', 'LEGS 2', 'PULL 2'];
  const sNames = names(r.sst);
  ok("DELEG-02: Start and Skip on the Log picker reuse Today's actions",
     !threw && JSON.stringify(names(r.st)) === JSON.stringify(FIXED) && JSON.stringify(names(r.sk)) === JSON.stringify(FIXED)
       && [r.st, r.sk, r.sst, r.ssk].every(l => (l || []).length && l.every(x => x.startsWith('button:')))
       && JSON.stringify(starts) === JSON.stringify(FIXED.map(n => [n])) && JSON.stringify(skips) === JSON.stringify(FIXED.map(n => [n]))
       && starts[0][0] === 'PUSH 1' && skips[0][0] === 'PUSH 1'
       && sNames.length === 5 && new Set(sNames).size === 5 && sNames.every(n => r.PROGRAM.includes(n))
       && sNames.includes('SPECIALIZED — CHEST & TRICEPS')
       && JSON.stringify(sStarts) === JSON.stringify(sNames.map(n => [n]))
       && names(r.ssk).every(n => n === 'SPECIALIZED') && JSON.stringify(sSkips) === JSON.stringify(names(r.ssk).map(n => [n])),
     { threw, r, starts, skips, sStarts, sSkips });
}
/* The two documents the next agent learns from. CLAUDE.md must name the registry, the attribute and
   the dispatcher the suite enforces, and each must exist in index.html: names only, never wording
   (observation 18: two files agreeing on a name is a value comparison). The collection recipe is the
   page a new collection's UI is copied from, so it must prescribe the delegated pattern and carry no
   inline on-event attribute anywhere, scanned with the same scanner that guards index.html. */
{
  const claudeMdPath = APP_PATH.replace(/index\.html$/, 'CLAUDE.md');
  const claudeMd = fs.existsSync(claudeMdPath) ? fs.readFileSync(claudeMdPath, 'utf8') : '';
  const named = ['ACTIONS', 'data-action', 'dispatchAction'].map(n => ({ n, inDoc: claudeMd.includes(n) }));
  const live = { ACTIONS: !!f2app.ACTIONS && typeof f2app.ACTIONS === 'object', dispatchAction: typeof f2app.dispatchAction === 'function',
                 dataAction: F2_RAW.includes('data-action="') };
  ok('F2 rule: CLAUDE.md names the registry the suite enforces, and it exists in index.html',
     named.every(x => x.inDoc) && Object.values(live).every(Boolean), { named, live });
}
{
  const recipePath = APP_PATH.replace(/index\.html$/, 'docs/adding-a-collection.md');
  const recipe = fs.existsSync(recipePath) ? fs.readFileSync(recipePath, 'utf8') : '';
  const scan = typeof scanInlineHandlers === 'function' ? scanInlineHandlers : null;
  /* The scanner wants whitespace before `on`; in Markdown the attribute usually follows a backtick or a
     bracket, so a space goes in front of every `on<letters>=` that is not inside a longer word. */
  const loosen = t => String(t).replace(/(?<![\w$-])(?=on[A-Za-z]+\s*=)/g, ' ');
  const rows = scan ? scan(loosen(recipe)) : null;
  const synthetic = scan ? scan(loosen('a checkbox `onchange="toggleX(i)"`')).length === 1 && scan(loosen('(onclick="x()")')).length === 1
    && scan(loosen('button``data-action="x" and the phrase "on-event" and "reason="')).length === 0 : false;
  ok('F2 rule: the collection recipe prescribes no inline on-event attribute',
     recipe.length > 0 && Array.isArray(rows) && rows.length === 0 && recipe.includes('data-action') && synthetic,
     { rows: (rows || []).slice(0, 5).map(r => r.event + '=' + r.was), mentionsDataAction: recipe.includes('data-action'), synthetic });
}

/* The active workout. Every check starts from populatedDB with a full local draft of PUSH 1 and
   updatedAt 1000, on Train → Log. `seed(d, a)` edits the DB before it is installed. */
function f2Mid(seed){
  const a = loadApp(APP_PATH);
  const d = populatedDB(a);
  d.draft = fullDraft(a, 'PUSH 1');
  d.updatedAt = 1000;
  if(seed) seed(d, a);
  a.DB = d;
  a.go('train'); a.setSub('log');
  return a;
}
/* Four earlier PUSH 1 sessions whose slot-0 best never beats the first one: isStalledSlot() is true
   for slot 0, so the card offers the coach's Deload button. */
function f2Stall(d, a){
  const name = d.draft.entries[0].name;
  [[-40, '185', '8'], [-35, '135', '5'], [-30, '135', '5'], [-25, '135', '5']].forEach(([off, w, r], n) => {
    d.sessions.push({ id: 'st' + n, workout: 'PUSH 1', date: dayOff(off), endedAt: 10 + n, extras: {},
      entries: [{ name, sets: [{ w, r, skipped: false }] }] });
  });
  d.sessions.sort((x, y) => x.date < y.date ? -1 : x.date > y.date ? 1 : 0);
}
const f2Find = (a, pred) => controlsIn(f2AppHtml(a)).find(pred) || null;
const f2At = (action, i, k) => c => c.data.action === action && (i === undefined || c.data.i === String(i)) && (k === undefined || c.data.k === String(k));
{
  const r = {};
  let threw = null;
  try {
    const a = f2Mid();
    const spy = spyPushes(a);
    const w = f2Find(a, f2At('setWeight', 0, 0)), rp = f2Find(a, f2At('setReps', 0, 0));
    r.tags = [w && w.tag, rp && rp.tag];
    if(w) fireListener(a, 'input', fakeEl(w.data, { value: '100' }));
    if(rp) fireListener(a, 'input', fakeEl(rp.data, { value: '8' }));
    const st = a.__stored();
    r.stored = st && st.draft ? { w: st.draft.entries[0].sets[0].w, r: st.draft.entries[0].sets[0].r } : null;
    r.updatedAt = a.DB.updatedAt; r.pushes = spy.n;
  } catch(e){ threw = e.message; }
  ok('DELEG-02: typing a weight stores it on this device and pushes nothing',
     !threw && JSON.stringify(r.tags) === '["input","input"]' && r.stored && r.stored.w === '100' && r.stored.r === '8'
       && r.updatedAt === 1000 && r.pushes === 0, { threw, r });
}
{
  const r = {};
  let threw = null;
  const three = d => { d.draft.entries[0].sets = [0, 1, 2].map(() => ({ w: '', r: '', skipped: false, reason: '' })); };
  try {
    const a = f2Mid(three);
    const w = f2Find(a, f2At('setWeight', 0, 0));
    if(w) fireListener(a, 'input', fakeEl(w.data, { value: '100' }));
    r.afterInput = a.DB.draft.entries[0].sets.map(s => s.w);
    const b = f2Mid(three);
    const bw = f2Find(b, f2At('setWeight', 0, 0));
    if(bw) fireListener(b, 'change', fakeEl(bw.data, { value: '100' }));
    r.afterChange = b.DB.draft.entries[0].sets.map(s => s.w);
    r.found = !!w && !!bw;
  } catch(e){ threw = e.message; }
  ok('DELEG-02: leaving the weight box rolls the weight into the empty sets below',
     !threw && r.found && JSON.stringify(r.afterInput) === '["100","",""]' && JSON.stringify(r.afterChange) === '["100","100","100"]',
     { threw, r });
}
{
  const r = {};
  let threw = null;
  try {
    const a = f2Mid();
    const prompts = [];
    a.__sandbox.prompt = msg => { prompts.push(msg); return null; };
    const sel = f2Find(a, f2At('pickEx', 0));
    r.tag = sel && sel.tag;
    const before = a.DB.draft.entries[0].name;
    const other = a.PROGRAM['PUSH 1'].slots[0].examples.find(x => x !== before);
    if(sel){
      fireListener(a, 'input', fakeEl(sel.data, { value: other }));
      r.afterInput = a.DB.draft.entries[0].name;
      fireListener(a, 'change', fakeEl(sel.data, { value: other }));
      r.afterChange = a.DB.draft.entries[0].name;
      const sel2 = f2Find(a, f2At('pickEx', 0));
      fireListener(a, 'input', fakeEl(sel2.data, { value: '__custom' }));
      r.promptsAfterInput = prompts.length;
      fireListener(a, 'change', fakeEl(sel2.data, { value: '__custom' }));
      r.promptsAfterChange = prompts.length;
    }
    r.before = before; r.other = other;
  } catch(e){ threw = e.message; }
  ok('DELEG-02: swapping an exercise runs on change only, once',
     !threw && r.tag === 'select' && !!r.other && r.afterInput === r.before && r.afterChange === r.other
       && r.promptsAfterInput === 0 && r.promptsAfterChange === 1, { threw, r });
}
{
  const r = {};
  let threw = null;
  try {
    const a = f2Mid(d => { d.draft.entries[0].sets = [0, 1].map(() => ({ w: '', r: '', skipped: false, reason: '' })); });
    const prompts = [];
    a.__sandbox.prompt = msg => { prompts.push(msg); return 'tired'; };
    const sk = f2Find(a, f2At('skipSet', 0, 1));
    r.tag = sk && sk.tag;
    if(sk) fireListener(a, 'click', fakeEl(sk.data));
    r.prompts = prompts.slice();
    r.skipped = a.DB.draft.entries[0].sets.map(s => s.skipped);
    const un = f2Find(a, f2At('unskipSet', 0, 1));
    r.unTag = un && un.tag;
    if(un) fireListener(a, 'click', fakeEl(un.data));
    r.restored = a.DB.draft.entries[0].sets.map(s => s.skipped);
  } catch(e){ threw = e.message; }
  ok('DELEG-02: skipping a set asks about set 2, never set 11 (numeric index)',
     !threw && r.tag === 'button' && r.prompts.length === 1 && /set 2\b/.test(r.prompts[0]) && !/set 11/.test(r.prompts[0])
       && JSON.stringify(r.skipped) === '[false,true]' && r.unTag === 'button' && JSON.stringify(r.restored) === '[false,false]',
     { threw, r });
}
{
  const r = {};
  let threw = null;
  try {
    const a = f2Mid();
    const collapsedCard = () => f2Find(a, c => f2At('toggleExCollapse', 0)(c) && /(^|\s)tap(\s|$)/.test(c.cls));
    const head = f2Find(a, c => f2At('toggleExCollapse', 0)(c) && !/(^|\s)tap(\s|$)/.test(c.cls));
    r.head = head && head.tag;
    r.before = !!collapsedCard();
    if(head) fireListener(a, 'click', fakeEl(head.data));
    const card = collapsedCard();
    r.card = card && { tag: card.tag, cls: card.cls };
    r.summary = /▾ expand/.test(f2AppHtml(a));
    if(card) fireListener(a, 'click', fakeEl(card.data));
    r.after = !!collapsedCard();
    r.expanded = !!f2Find(a, f2At('setWeight', 0, 0));
  } catch(e){ threw = e.message; }
  ok('DELEG-02: a collapsed exercise expands and collapses again through the dispatcher',
     !threw && r.head === 'button' && r.before === false && r.card && r.card.tag === 'button' && /(^|\s)tap(\s|$)/.test(r.card.cls)
       && r.summary && r.after === false && r.expanded, { threw, r });
}
/* Every active-workout control, fired once, calls its function with exactly the arguments the inline
   handler passed: numbers where it passed numbers, the element where it passed `this`, nothing where
   it passed nothing. Two instances between them render every control: a stalled slot 0 with set 1
   skipped, slot 1 collapsed and slot 2 deloaded; then a backdated draft with the stair stepper skipped. */
const f2LogSpied = ['setVal', 'updTargetBadge', 'updPlates', 'rollWeight', 'repCheck', 'skipSet', 'rmSet', 'unskipSet',
  'toggleExCollapse', 'pickEx', 'addSet', 'toggleWarm', 'setNote', 'stairVal', 'stairTimeSet', 'unskipStairs', 'skipStairs',
  'setDraftDate', 'setDraftDur', 'setSessionNote', 'finishWorkout', 'discardWorkout', 'deloadExercise', 'undeloadExercise',
  'exSet', 'exRoll', 'exRmSet', 'exPick', 'exAddSet', 'toggleAcc'];
function f2MidBusy(d, a){
  f2Stall(d, a);
  d.draft.entries[0].sets = [{ w: '', r: '', skipped: false, reason: '' }, { w: '', r: '', skipped: true, reason: 'tired' }];
  d.draft.entries[2].deload = true;
}
function f2MidPast(d){
  d.draft.historical = true; d.draft.startedAt = null; d.draft.durationMin = '';
  d.draft.stairs.skipped = true; d.draft.stairs.reason = 'knees';
}
{
  const got = {}, missing = [];
  let threw = null, busyStalled = null;
  const run = (a, spies, label, pick, type, value) => {
    const c = f2Find(a, pick);
    if(!c){ missing.push(label); return; }
    Object.values(spies).forEach(l => { l.length = 0; });
    const el = fakeEl(c.data, { value: value === undefined ? '' : value });
    fireListener(a, type, el);
    const out = {};
    Object.keys(spies).forEach(n => { if(spies[n].length) out[n] = spies[n].map(args => args.map(x => x === el ? '<el>' : x)); });
    got[label] = { tag: c.tag, calls: out };
  };
  try {
    const a = f2Mid(f2MidBusy);
    busyStalled = a.__sandbox.isStalledSlot(a.DB.draft.entries[0].name, 'PUSH 1', 0);
    a.__sandbox.toggleExCollapse(1);   /* slot 1 collapsed, re-rendered before any spy goes in */
    const s = {}; f2LogSpied.forEach(n => { s[n] = spyOn(a, n); });
    run(a, s, 'weight input', f2At('setWeight', 0, 0), 'input', '100');
    run(a, s, 'weight change', f2At('setWeight', 0, 0), 'change', '100');
    run(a, s, 'weight click', f2At('setWeight', 0, 0), 'click', '100');
    run(a, s, 'reps input', f2At('setReps', 0, 0), 'input', '8');
    run(a, s, 'reps change', f2At('setReps', 0, 0), 'change', '8');
    run(a, s, 'skip set', f2At('skipSet', 0, 0), 'click');
    run(a, s, 'remove set', f2At('rmSet', 0, 0), 'click');
    run(a, s, 'undo skipped set', f2At('unskipSet', 0, 1), 'click');
    run(a, s, 'collapse header', c => f2At('toggleExCollapse', 0)(c) && !/(^|\s)tap(\s|$)/.test(c.cls), 'click');
    run(a, s, 'collapsed card', c => f2At('toggleExCollapse', 1)(c) && /(^|\s)tap(\s|$)/.test(c.cls), 'click');
    run(a, s, 'exercise select change', f2At('pickEx', 0), 'change', 'DB bench press');
    run(a, s, 'exercise select input', f2At('pickEx', 0), 'input', 'DB bench press');
    run(a, s, 'add set', f2At('addSet', 0), 'click');
    run(a, s, 'warm-up', f2At('toggleWarm', 0), 'click');
    run(a, s, 'exercise note', f2At('setNote', 0), 'input', 'felt good');
    run(a, s, 'deload', f2At('deloadExercise', 0), 'click');
    run(a, s, 'undo deload', f2At('undeloadExercise', 2), 'click');
    run(a, s, 'stairs level', c => c.data.action === 'stairVal' && c.data.field === 'level', 'input', '7');
    run(a, s, 'stairs minutes', c => c.data.action === 'stairTimeSet' && c.data.part === 'm', 'input', '3');
    run(a, s, 'stairs seconds', c => c.data.action === 'stairTimeSet' && c.data.part === 's', 'input', '20');
    run(a, s, 'skip stairs', f2At('skipStairs'), 'click');
    run(a, s, 'session note', f2At('setSessionNote'), 'input', 'solid');
    run(a, s, 'finish', f2At('finishWorkout'), 'click');
    run(a, s, 'discard', f2At('discardWorkout'), 'click');
    const b = f2Mid(f2MidPast);
    const t = {}; f2LogSpied.forEach(n => { t[n] = spyOn(b, n); });
    run(b, t, 'undo skipped stairs', f2At('unskipStairs'), 'click');
    run(b, t, 'backdated date', f2At('setDraftDate'), 'input', '2026-08-01');
    run(b, t, 'backdated minutes', f2At('setDraftDur'), 'input', '45');
  } catch(e){ threw = e.message; }
  const want = {
    'weight input': ['input', { setVal: [[0, 0, 'w', '100']], updTargetBadge: [[0, 0]], updPlates: [[0]] }],
    'weight change': ['input', { rollWeight: [[0, 0, '100']] }],
    'weight click': ['input', {}],
    'reps input': ['input', { setVal: [[0, 0, 'r', '8']], updTargetBadge: [[0, 0]] }],
    'reps change': ['input', { repCheck: [[0, 0]] }],
    'skip set': ['button', { skipSet: [[0, 0]] }],
    'remove set': ['button', { rmSet: [[0, 0]] }],
    'undo skipped set': ['button', { unskipSet: [[0, 1]] }],
    'collapse header': ['button', { toggleExCollapse: [[0]] }],
    'collapsed card': ['button', { toggleExCollapse: [[1]] }],
    'exercise select change': ['select', { pickEx: [[0, '<el>']] }],
    'exercise select input': ['select', {}],
    'add set': ['button', { addSet: [[0]] }],
    'warm-up': ['button', { toggleWarm: [[0]] }],
    'exercise note': ['input', { setNote: [[0, 'felt good']] }],
    'deload': ['button', { deloadExercise: [[0]] }],
    'undo deload': ['button', { undeloadExercise: [[2]] }],
    'stairs level': ['input', { stairVal: [['level', '7']] }],
    'stairs minutes': ['input', { stairTimeSet: [['m', '3']] }],
    'stairs seconds': ['input', { stairTimeSet: [['s', '20']] }],
    'skip stairs': ['button', { skipStairs: [[]] }],
    'session note': ['textarea', { setSessionNote: [['solid']] }],
    'finish': ['button', { finishWorkout: [[]] }],
    'discard': ['button', { discardWorkout: [[]] }],
    'undo skipped stairs': ['button', { unskipStairs: [[]] }],
    'backdated date': ['input', { setDraftDate: [['2026-08-01']] }],
    'backdated minutes': ['input', { setDraftDur: [['45']] }],
  };
  const wrong = Object.keys(want).filter(k => !got[k] || got[k].tag !== want[k][0] || JSON.stringify(got[k].calls) !== JSON.stringify(want[k][1]))
    .map(k => ({ control: k, want: want[k], got: got[k] || null }));
  ok('DELEG-02: every active-workout control calls its function with exactly the arguments the inline handler passed',
     !threw && busyStalled === true && missing.length === 0 && wrong.length === 0, { threw, busyStalled, missing, wrong: wrong.slice(0, 4) });
}
/* D-09. Built from ordinary characters so no escaping in this file can mask the payload. */
const EVIL = String.fromCharCode(34) + '><img src=x onerror=alert(1)>';
{
  const r = {};
  let threw = null;
  try {
    const a = f2Mid(d => {
      d.draft.entries[0].sets[0].w = EVIL; d.draft.entries[0].sets[0].r = EVIL;
      d.draft.stairs.level = EVIL;
      d.draft.historical = true; d.draft.date = EVIL; d.draft.durationMin = EVIL;
    });
    const html = a.viewActive();
    r.img = /<img/i.test(html);
    r.escaped = html.split('&quot;&gt;&lt;img').length - 1;
  } catch(e){ threw = e.message; }
  ok('D-09: a hostile set, stairs, date or duration value renders escaped in the Log tab',
     !threw && r.img === false && r.escaped >= 5, { threw, r });
}

/* The accessories. PUSH 1's assigned extra is `abs`, which is load-bearing (it has a weight column),
   so one card exercises both setExtraWeight and setExtraReps. */
{
  const r = {};
  let threw = null;
  try {
    const a = f2Mid();
    const spy = spyPushes(a);
    r.def = a.ACCESSORIES && a.ACCESSORIES.abs ? { days: a.ACCESSORIES.abs.days.includes('PUSH 1'), sec: a.ACCESSORIES.abs.unit === 'sec' } : null;
    const hdr = f2Find(a, c => c.data.action === 'toggleAcc' && c.data.key === 'abs');
    r.hdr = hdr && hdr.tag;
    r.closed = !f2Find(a, c => c.data.action === 'exPick' && c.data.id === 'abs');
    if(hdr) fireListener(a, 'click', fakeEl(hdr.data));
    const at = (action, k) => f2Find(a, c => c.data.action === action && c.data.id === 'abs' && (k === undefined || c.data.k === String(k)));
    const sel = at('exPick');
    r.sel = sel && sel.tag;
    const reps = at('setExtraReps', 0), wt = at('setExtraWeight', 0);
    r.inputs = [reps && reps.tag, wt && wt.tag];
    if(reps) fireListener(a, 'input', fakeEl(reps.data, { value: '12' }));
    if(wt){ fireListener(a, 'input', fakeEl(wt.data, { value: '50' })); fireListener(a, 'change', fakeEl(wt.data, { value: '50' })); }
    const st = a.__stored();
    r.stored = st && st.draft && st.draft.extras.abs ? st.draft.extras.abs.sets.map(s => s.w + '/' + s.r) : null;
    r.pushes = spy.n; r.updatedAt = a.DB.updatedAt;
    const n0 = a.DB.draft.extras.abs.sets.length;
    const add = at('exAddSet');
    if(add) fireListener(a, 'click', fakeEl(add.data));
    const n1 = a.DB.draft.extras.abs.sets.length;
    const rm = at('exRmSet', n1 - 1);
    if(rm) fireListener(a, 'click', fakeEl(rm.data));
    r.counts = [n0, n1, a.DB.draft.extras.abs.sets.length];
    const before = a.DB.draft.extras.abs.name;
    const other = a.ACCESSORIES.abs.examples.find(x => x !== before);
    const sel2 = at('exPick');
    if(sel2){
      fireListener(a, 'input', fakeEl(sel2.data, { value: other }));
      r.afterInput = a.DB.draft.extras.abs.name === before;
      fireListener(a, 'change', fakeEl(sel2.data, { value: other }));
      r.afterChange = a.DB.draft.extras.abs.name === other;
      r.pickEntry = Object.keys(a.ACTIONS.exPick || {});
    }
  } catch(e){ threw = e.message; }
  ok("DELEG-02: an accessory's weight, reps, exercise and set buttons route through the dispatcher",
     !threw && r.def && r.def.days && !r.def.sec && r.hdr === 'button' && r.closed && r.sel === 'select'
       && JSON.stringify(r.inputs) === '["input","input"]'
       && JSON.stringify(r.stored) === '["50/12","50/","50/"]' && r.pushes === 0 && r.updatedAt === 1000
       && JSON.stringify(r.counts) === '[3,4,3]' && r.afterInput && r.afterChange && JSON.stringify(r.pickEntry) === '["change"]',
     { threw, r });
}
/* Exact arguments for every accessory control: the accordion headers (accItem), the extras card's
   header, boxes, select and buttons. The id is a string key; the set index is a number. */
{
  const got = {}, missing = [];
  let threw = null;
  try {
    const a = f2Mid();
    a.__sandbox.toggleAcc('abs');
    const s = {}; f2LogSpied.forEach(n => { s[n] = spyOn(a, n); });
    const fire = (label, pick, type, value) => {
      const c = f2Find(a, pick);
      if(!c){ missing.push(label); return; }
      Object.values(s).forEach(l => { l.length = 0; });
      const el = fakeEl(c.data, { value: value === undefined ? '' : value });
      fireListener(a, type, el);
      const out = {};
      Object.keys(s).forEach(n => { if(s[n].length) out[n] = s[n].map(args => args.map(x => x === el ? '<el>' : x)); });
      got[label] = { tag: c.tag, calls: out };
    };
    const ex = (action, k) => c => c.data.action === action && c.data.id === 'abs' && (k === undefined || c.data.k === String(k));
    fire('warm-up accordion', c => c.data.action === 'toggleAcc' && c.data.key === 'warmup', 'click');
    fire('cool-down accordion', c => c.data.action === 'toggleAcc' && c.data.key === 'stretch', 'click');
    fire('extras header', c => c.data.action === 'toggleAcc' && c.data.key === 'abs', 'click');
    fire('extra weight input', ex('setExtraWeight', 1), 'input', '50');
    fire('extra weight change', ex('setExtraWeight', 1), 'change', '50');
    fire('extra reps input', ex('setExtraReps', 1), 'input', '12');
    fire('extra reps change', ex('setExtraReps', 1), 'change', '12');
    fire('extra remove set', ex('exRmSet', 1), 'click');
    fire('extra select change', ex('exPick'), 'change', 'Cable crunch');
    fire('extra select input', ex('exPick'), 'input', 'Cable crunch');
    fire('extra add set', ex('exAddSet'), 'click');
  } catch(e){ threw = e.message; }
  const want = {
    'warm-up accordion': ['button', { toggleAcc: [['warmup']] }],
    'cool-down accordion': ['button', { toggleAcc: [['stretch']] }],
    'extras header': ['button', { toggleAcc: [['abs']] }],
    'extra weight input': ['input', { exSet: [['abs', 1, 'w', '50']] }],
    'extra weight change': ['input', { exRoll: [['abs', 1, '50']] }],
    'extra reps input': ['input', { exSet: [['abs', 1, 'r', '12']] }],
    'extra reps change': ['input', {}],
    'extra remove set': ['button', { exRmSet: [['abs', 1]] }],
    'extra select change': ['select', { exPick: [['abs', '<el>']] }],
    'extra select input': ['select', {}],
    'extra add set': ['button', { exAddSet: [['abs']] }],
  };
  const wrong = Object.keys(want).filter(k => !got[k] || got[k].tag !== want[k][0] || JSON.stringify(got[k].calls) !== JSON.stringify(want[k][1]))
    .map(k => ({ control: k, want: want[k], got: got[k] || null }));
  ok('DELEG-02: every accessory control calls its function with exactly the arguments the inline handler passed',
     !threw && missing.length === 0 && wrong.length === 0, { threw, missing, wrong: wrong.slice(0, 4) });
}
{
  const r = {};
  let threw = null;
  try {
    const a = f2Mid(d => { d.draft.extras.abs.sets[0].w = EVIL; d.draft.extras.abs.sets[0].r = EVIL; });
    a.__sandbox.toggleAcc('abs');
    const html = a.viewActive();
    r.open = /data-action="exPick"/.test(html);
    r.img = /<img/i.test(html);
    r.escaped = html.split('&quot;&gt;&lt;img').length - 1;
  } catch(e){ threw = e.message; }
  ok('D-09: a hostile accessory value renders escaped', !threw && r.open && r.img === false && r.escaped >= 2, { threw, r });
}

/* ── Phase 5 code review (05-REVIEW.md) ── */
/* WR-01. Nothing constrains DB.unit: validateBackup() accepts any value and normalize() keeps it. It
   lands in the placeholder of every weigh-in box, on Today and on both Progress pages. A hostile unit
   must stay inside that attribute, and Today's boxes must keep their Enter-to-log action (a break-out
   pushes data-action out of the tag). */
{
  const r = {};
  let threw = null;
  try {
    const a = f2TodayWeighIn();
    a.DB.unit = EVIL;
    a.render();
    const holds = (html, id) => (f2InputAttr(html, id, 'placeholder') || '').includes(EVIL);
    const home = f2AppHtml(a), cs = controlsIn(home);
    r.todayWt = holds(home, 'wt-input'); r.todayPet = holds(home, 'pet-input');
    r.enterWt = !!cs.find(c => c.tag === 'input' && c.data.action === 'enter' && c.data.enter === 'logWeight');
    r.enterPet = !!cs.find(c => c.tag === 'input' && c.data.action === 'enter' && c.data.enter === 'logPetWeight');
    a.go('train'); a.setSub('progress'); a.__sandbox.progSubTab('body');
    r.body = holds(f2AppHtml(a), 'wt-input');
    a.__sandbox.progSubTab('pet');
    r.pet = holds(f2AppHtml(a), 'pet-input');
  } catch(e){ threw = e.message; }
  ok('D-09: a hostile weight unit stays inside every weigh-in placeholder, and Enter still logs from Today',
     !threw && Object.values(r).length === 6 && Object.values(r).every(v => v === true), { threw, r });
}
/* WR-02. A merged backup keeps any string in a logged set's w and r, in durationMin and in workout
   (validateBackup() checks shape, normalize() coerces none of them). fmtSet() returns them as they
   are, so every place its text is put into markup escapes it. The duration payload closes the History
   row's button, which would push the rest of the row out of the tap target. */
const CLOSER = '</button>' + EVIL;
function f2HostileSession(id, workout, date, name){
  return { id, workout, date, endedAt: 50, startedAt: 40, durationMin: CLOSER, extras: {},
    entries: [{ name, sets: [{ w: EVIL, r: EVIL, skipped: false }] }] };
}
{
  const r = {};
  let threw = null;
  try {
    const a = f2History();
    a.DB.sessions.push(f2HostileSession('hx', EVIL, dayOff(-1), 'Barbell bench press'));
    a.__sandbox.toggleHist(a.DB.sessions.length - 1);
    const html = f2AppHtml(a);
    r.open = html.includes('data-action="changeSessionDate" data-idx="' + (a.DB.sessions.length - 1) + '"');
    r.img = /<img/i.test(html);
    r.closer = html.split('&lt;/button&gt;').length - 1;
    r.escaped = html.split('&quot;&gt;&lt;img').length - 1;
  } catch(e){ threw = e.message; }
  ok('D-09: a hostile logged set, duration or workout name renders escaped in History',
     !threw && r.open && r.img === false && r.closer >= 2 && r.escaped >= 5, { threw, r });
}
{
  const r = {};
  let threw = null;
  try {
    const a = f2Log(a => {
      a.DB.sessions.push(f2HostileSession('px', 'PUSH 1', dayOff(-1), a.PROGRAM['PUSH 1'].slots[0].examples[0]));
    });
    a.__sandbox.togglePreview('PUSH 1');
    const html = f2AppHtml(a);
    r.open = /Last: /.test(html);
    r.img = /<img/i.test(html);
    r.escaped = html.split('&quot;&gt;&lt;img').length - 1;
  } catch(e){ threw = e.message; }
  ok("D-09: a hostile logged set renders escaped in the picker preview's last-time line",
     !threw && r.open && r.img === false && r.escaped >= 2, { threw, r });
}
{
  const r = {};
  let threw = null;
  try {
    /* Slot 0 has an exact match in PUSH 1; slot 1's exercise was last done in another workout, so its
       line takes the "elsewhere" branch. */
    const a = f2Mid(d => {
      d.sessions.push(f2HostileSession('ax', 'PUSH 1', dayOff(-1), d.draft.entries[0].name));
      d.sessions.push(f2HostileSession('bx', 'LEGS 1', dayOff(-1), d.draft.entries[1].name));
    });
    const html = a.viewActive();
    r.exact = /Last time \([^)]*\):/.test(html);
    r.elsewhere = /Last time \([^)]*· LEGS 1\):/.test(html);
    r.img = /<img/i.test(html);
    r.escaped = html.split('&quot;&gt;&lt;img').length - 1;
  } catch(e){ threw = e.message; }
  ok("D-09: a hostile logged set renders escaped in the active workout's last-time lines",
     !threw && r.exact && r.elsewhere && r.img === false && r.escaped >= 4, { threw, r });
}
/* WR-03. The converted-button reset gives button.tap width:100%. That is harmless on a button that is
   itself the card, the row or the list item, but when the button is a flex ITEM that width becomes its
   flex basis: it claims the whole row and squeezes its siblings to min-content (the Log picker's
   "Start ▶" wrapped onto two lines). The suite has no layout engine, so this resolves the basis the
   way the cascade does (inline style over the zero-specificity reset) for every tap button that is a
   direct child of a flex container, on every rendered screen. Which classes are flex containers is
   read from the app's own CSS. */
function f2Decls(body){
  const out = {};
  String(body || '').split(';').forEach(d => { const i = d.indexOf(':'); if(i > 0) out[d.slice(0, i).trim().toLowerCase()] = d.slice(i + 1).trim().toLowerCase(); });
  return out;
}
const F2_RULES = f2CssRules(F2_RAW);
const F2_FLEX_CLASSES = F2_RULES.filter(r => /^\.[\w-]+$/.test(r.selector) && /^(inline-)?flex$/.test(f2Decls(r.body).display || ''))
  .map(r => r.selector.slice(1));
const F2_TAP_WIDTH = (F2_RULES.filter(r => r.selector === ':where(button.tap)').map(r => f2Decls(r.body).width).pop()) || 'auto';
function f2FlexItemTapProblems(html){
  const VOID = /^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/i;
  const attr = (s, n) => { const m = s.match(new RegExp('\\s' + n + '="([^"]*)"')); return m ? m[1] : ''; };
  const stack = [], bad = [];
  const TAG = /<(\/?)([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
  let m;
  while((m = TAG.exec(String(html || '')))){
    const [, close, name, rest] = m, tag = name.toLowerCase();
    if(close){ const i = stack.map(x => x.tag).lastIndexOf(tag); if(i >= 0) stack.length = i; continue; }
    const cls = attr(rest, 'class').split(/\s+/).filter(Boolean), style = f2Decls(attr(rest, 'style'));
    const node = { tag, flex: /^(inline-)?flex$/.test(style.display || '') || cls.some(c => F2_FLEX_CLASSES.includes(c)) };
    const parent = stack[stack.length - 1];
    if(tag === 'button' && cls.includes('tap') && parent && parent.flex){
      const flex = (style.flex || '').split(/\s+/).filter(Boolean);
      const basis = style['flex-basis'] || (flex.length === 3 ? flex[2] : '') || style.width || F2_TAP_WIDTH;
      if(basis === '100%') bad.push(`<button class="${cls.join(' ')}" data-action="${attr(rest, 'data-action')}">`);
    }
    if(!VOID.test(tag) && !/\/\s*$/.test(rest)) stack.push(node);
  }
  return bad;
}
{
  const bad = [];
  f2Corpus().forEach(({ label, html }) => f2FlexItemTapProblems(html).forEach(b => bad.push(label + ': ' + b)));
  const picker = [];
  ['with data', 'fresh install'].forEach(state => {
    const shot = f2Corpus().find(c => c.label === `${state}: Train → Log`) || f2Corpus().find(c => c.label.startsWith(state + ':') && /togglePreview/.test(c.html));
    picker.push(!!shot && /data-action="togglePreview"/.test(shot.html));
  });
  const synthetic = {
    squeezed: f2FlexItemTapProblems('<div class="row"><button class="tap" data-action="x">a</button><div>b</div></div>').length === 1,
    inlineFlex: f2FlexItemTapProblems('<span style="display:flex"><button class="tap">a</button></span>').length === 1,
    contentWidth: f2FlexItemTapProblems('<div class="row"><button class="tap" style="width:auto">a</button></div>').length === 0,
    autoBasis: f2FlexItemTapProblems('<div class="row"><button class="tap" style="flex:1 1 auto">a</button></div>').length === 0,
    blockParent: f2FlexItemTapProblems('<div class="card"><button class="row tap">a</button></div>').length === 0,
  };
  ok('WR-03: no converted button that sits in a flex row takes the full-width reset as its flex basis (the Log picker keeps Start on one line)',
     F2_FLEX_CLASSES.includes('row') && F2_TAP_WIDTH === '100%' && picker.every(Boolean) && bad.length === 0 && Object.values(synthetic).every(Boolean),
     { bad: bad.slice(0, 5), picker, flexClasses: F2_FLEX_CLASSES.length, tapWidth: F2_TAP_WIDTH, synthetic });
}
/* WR-04. The dispatcher checks the action NAME as an own key of ACTIONS; the handler for the event
   must be an own key of that action too. With an event handler planted on the app's own
   Object.prototype, a click on a change-only control and a change on a click-only control must run
   nothing, fired through the app's own listeners. The real event still works alongside, so the check
   is not passing on a dead control. */
{
  const a = loadApp(APP_PATH);
  const proto = a.ACTIONS ? Object.getPrototypeOf(a.ACTIONS) : null;
  const planted = [];
  const r = {};
  let threw = null;
  const done = spyOn(a, 'toggleIdeaDone'), removed = spyOn(a, 'removeIdea');
  try {
    if(proto){ proto.click = () => { planted.push('click'); }; proto.change = () => { planted.push('change'); }; }
    const tick = fakeEl({ action: 'toggleIdeaDone', id: 'i1' }, { tagName: 'INPUT' });
    fireListener(a, 'click', tick);
    fireListener(a, 'change', tick);
    const rm = fakeEl({ action: 'removeIdea', id: 'i2' }, { tagName: 'BUTTON' });
    fireListener(a, 'change', rm);
    fireListener(a, 'click', rm);
  } catch(e){ threw = e.message; }
  finally { if(proto){ delete proto.click; delete proto.change; } }
  r.clean = !proto || (!Object.prototype.hasOwnProperty.call(proto, 'click') && !Object.prototype.hasOwnProperty.call(proto, 'change'));
  ok('F2: an event handler inherited through Object.prototype never runs, even on a control whose action exists',
     !threw && !!proto && planted.length === 0 && JSON.stringify(done) === '[["i1"]]' && JSON.stringify(removed) === '[["i2"]]' && r.clean,
     { threw, planted, done, removed, r });
}

/* The phase's two closing properties, stated with no count. Every inventoried call site is an
   action, and nothing in index.html (any event, any quoting, comments included) is an inline
   on-event attribute any more. The synthetic line proves the scanner still sees one. */
{
  const unmapped = F2_INV.filter(r => !(r && (r.action || (Array.isArray(r.actions) && r.actions.length))));
  ok('DELEG-02: every inventoried call site is now a delegated action',
     !F2_INV_ERR && F2_INV.length > 0 && unmapped.length === 0,
     unmapped.slice(0, 5).map(r => r && [r.fn, r.event, r.was].join(' | ')));
}
{
  const scan = typeof scanInlineHandlers === 'function' ? scanInlineHandlers : null;
  const rows = scan ? scan(F2_RAW) : null;
  const synthetic = scan ? scan('<b onmouseover="x()">').length === 1 : false;
  ok('DELEG-04: index.html has no inline on-event attribute left',
     Array.isArray(rows) && rows.length === 0 && synthetic,
     { rows: (rows || []).slice(0, 5).map(r => [r.fn, r.event, r.was].join(' | ')), synthetic });
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

/* Every async block must settle before the summary prints or the process exits; asyncBlock()
   already turns a throw or a timeout into a FAIL, so Promise.all here never rejects. */
Promise.all(pendingAsync).then(() => {
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
});
