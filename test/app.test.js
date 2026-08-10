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

freezeRunnerClock();

let pass = 0, fail = 0;
const ok = (name, cond, extra) => { if(cond){ pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra!==undefined ? '  → ' + JSON.stringify(extra) : '')); } };

console.log('\n── the file itself ──');
const rawHtml = fs.readFileSync(APP_PATH, 'utf8');
const inline = [...rawHtml.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)];
ok('index.html holds exactly one inline script', inline.length === 1, inline.length);
ok('it compiles', (()=>{ try { new Function(inline[inline.length-1][1]); return true; } catch(e){ return 'SyntaxError: '+e.message; } })() === true,
   (()=>{ try { new Function(inline[inline.length-1][1]); return 'ok'; } catch(e){ return e.message; } })());

const app = loadApp(APP_PATH);
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
app.DB.draft = null;
app.DB.sessions = [ prSess('2026-07-20', [{w:'130',r:String(qRange.lo),skipped:false}]) ];
ok('an in-range set sets the baseline', (app.exercisePRs().find(p=>p.name==='Leg press')||{}).v === 130, app.exercisePRs());
app.DB.sessions.push(prSess('2026-07-27', [{w:'155',r:'3',skipped:false}]));
ok('a heavy 3-rep single below the range is NOT a PR', (app.exercisePRs().find(p=>p.name==='Leg press')||{}).v === 130, app.exercisePRs());
app.DB.sessions.push(prSess('2026-08-03', [{w:'135',r:String(qRange.lo),skipped:false},{w:'95',r:'4',skipped:false}]));
ok('an in-range PR survives an out-of-range backoff set', (app.exercisePRs().find(p=>p.name==='Leg press')||{}).v === 135, app.exercisePRs());
ok('the trophy marks agree with the PR list', (()=>{ const idx=app.prSetIndex(); const s=app.DB.sessions[2]; return idx.isPR(s,'Leg press',0) && !idx.isPR(s,'Leg press',1); })());
ok('a session whose program is unknown keeps its PR', (()=>{
  app.DB.sessions=[{ id:'legacy', workout:'MYSTERY DAY', date:'2026-07-01', endedAt:1, entries:[{name:'Leg press', sets:[{w:'200',r:'2',skipped:false}]}], extras:{} }];
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
ok('untouched sessions keep their original mtime (no false "newest")', (()=>{
  const d = JSON.parse(JSON.stringify(gobletV14()));
  d.sessions.push({ id:'other', workout:'PUSH 1', date:'2026-07-16', endedAt:1, mtime:42,
    entries:[{name:'Barbell bench press', sets:[{w:'135',r:'8',skipped:false}]}], extras:{} });
  return app.normalize(d).sessions[1].mtime === 42;
})());

console.log('\n── an older build must not write over a migrated one ──');
ok('a remote from a newer schema is refused', app.remoteTooNew({ _schema: app.SCHEMA + 1 }) === true);
ok('the same schema is fine', app.remoteTooNew({ _schema: app.SCHEMA }) === false);
ok('an older remote is fine (that is what migrations are for)', app.remoteTooNew({ _schema: app.SCHEMA - 1 }) === false);
ok('a remote with no schema at all is fine', app.remoteTooNew({}) === false && app.remoteTooNew(null) === false);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
