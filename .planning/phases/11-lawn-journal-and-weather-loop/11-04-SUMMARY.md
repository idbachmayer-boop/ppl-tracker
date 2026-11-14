---
phase: 11-lawn-journal-and-weather-loop
plan: 04
subsystem: lawn journal / Week in Review
status: complete
tags: [lawn, rain, week-in-review, LAWN-03, LAWN-05]
requires:
  - "11-02: rainLog (synced, soft), RAIN_SANE_MAX_IN"
  - "11-03: LW3_TRACTOR / LW3_DROP test glyphs, the Lawn outlook pair cells (probed here)"
provides:
  - "rainByDate(): the one rain reader, Map<date, inches> from liveOf('rainLog'), finite 0..RAIN_SANE_MAX_IN only"
  - "RAIN_MARK_IN (0.1) and RAIN_GLYPH (rain cloud + emoji selector)"
  - "Week in Review: Mowed, Watered and rain tags after the existing tags, all year"
  - "Lawn history: the rain amount beside the date, the row layout, and the estimate note"
  - "harness names rainByDate, RAIN_MARK_IN, RAIN_GLYPH, renderWeekReview"
  - "test helpers lwWeekRows, lwHistRows, lw4Set, lw4HistMark, lw4RainTag; lw4A instance"
affects: [index.html, test/harness.js, test/app.test.js]
tech-stack:
  added: []
  patterns: ["one reader per synced display collection, built once per render, never writing"]
key-files:
  created: []
  modified: [index.html, test/harness.js, test/app.test.js]
decisions:
  - "Every rain display reads through rainByDate(), which reads liveOf('rainLog') and keeps only a string date and a finite amount from 0 to 40, so deleted and junk rows never show"
  - "The 0.1 inch mark is decided on the stored number before toFixed(2), so 0.096 and 0.099 never show as 0.10"
  - "Lawn tags read lawnLog[day].mowed / .watered === true only: a stored string or number, an explicit false and the override keys render nothing"
metrics:
  duration: "~15 min"
  completed: 2026-11-13
estimate:
  tokens: 105000
actuals:
  tokens: 5900
  tasks: 3
  commits: 3
---

# Phase 11 Plan 04: Rain, Mowing and Watering in Week in Review and Lawn History Summary

Week in Review now shows 🚜 Mowed, 💧 Watered and the day's saved rain after the existing tags, all year.
Lawn history shows the rain amount beside each past day's date at 0.1 inch or more, with a one-sentence
note that the figure is the weather service's estimate. Both surfaces read rain through one reader,
`rainByDate()`, which reads only live rows with sane amounts.

## Suite lines and CSP

- Pre-plan: `1390 passed, 0 failed, 2 skipped` (CSP `sha256-4Qugf6I+C/pWn8WRDGyIoeq73RsQ1zH3xDUGRMzYEzA=`).
- After Task 1: `1391 passed, 0 failed, 2 skipped`.
- After Task 2: `1424 passed, 0 failed, 2 skipped`; after the strict-read check: `1425 passed, 0 failed, 2 skipped`.
- Post-plan: `1425 passed, 0 failed, 2 skipped`. `npm run csp:check` reports
  `CSP hash OK sha256-pYmhSj4nspYrG1QuJ5CXqDrhQ7nzhL2P5EiK/uF7yFE=`.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (tracer) | rainLog → rainByDate → Week in Review tags | 00761e5 | index.html, test/harness.js, test/app.test.js |
| 2 | Lawn history mark, layout and note; every edge on both surfaces | 593679b, 113c62f | index.html, test/app.test.js |
| 3 | Render probe at 320, 360, 380 and 412px | none (no fix needed) | scratch only |

## RED lines

Task 1. `renderWeekReview` was added to the harness names first, so RED was the missing tags and not a
missing export:

```
FAIL  LAWN-05 tracer: a logged mow, a watering and a saved rain row show in Week in Review  → {"rows":7,"iM":-1,"iW":-1,"iR":-1,"wedHas":[]}
```

Task 2 (10 FAILs before the lawnHistory edit; the boundary rows show Week in Review already right and
the history not):

```
FAIL  LAWN-03: Lawn history shows 0.42" beside yesterday in an 11px, var(--text-2), nowrap span titled Estimated rainfall
FAIL  LAWN-03: a day of exactly 0.1" shows 0.10"
FAIL  LAWN-03: the source note renders exactly once, directly under the intro paragraph  → {"count":0,"introEnd":346,"noteAt":-1}
FAIL  LAWN-03: each history row has gap:8px, a wrapping left group (date and mark) and a flex:none pills group  → {"rows":14,"bad":[0,...,13]}
FAIL  LAWN-03: the mark sits in the left group, before the pills
FAIL  LAWN-03: history rows stay newest first, each mark in its own day's row  → "00000000000000"
FAIL  LAWN-03: 0.1" is marked 0.10" in Lawn history and Week in Review  → {"hist":false,"week":true,"histAmt":false,"weekAmt":true}
FAIL  LAWN-03: 0.11" is marked 0.11" in Lawn history and Week in Review  → {"hist":false,"week":true,"histAmt":false,"weekAmt":true}
FAIL  LAWN-05: a rain row and a mow that arrive by sync show on the next render  → {"mowed":true,"tag":true,"mark":false}
FAIL  D-04: Week in Review and Lawn history read rain only through rainByDate(), which reads liveOf('rainLog')
```

## Mutation tables

Every mutation was applied to the committed state by `mutrun.js` in the scratchpad. It asserts the
anchor matches exactly once, runs the suite, restores from a scratchpad copy and compares the bytes.
`restored: true` held every time. Each mutated run also shows the two expected `CSP-01` stale-hash
FAILs, which are left out below.

**Task 1**

| Mutation | Check that went red | Mishandled input |
|----------|---------------------|------------------|
| `ld.mowed === true` → `ld.mowed` | `LAWN-05 tracer: …` → `{"iM":156,"iW":200,"iR":246,"wedHas":[" Mowed"]}` | `mowed: 'false'`, a stored string |

**Task 2**

| Mutation | Check that went red | Mishandled input |
|----------|---------------------|------------------|
| History compares `+rv.toFixed(2) >= RAIN_MARK_IN` | `LAWN-03: 0.096" shows no mark …` and `0.099"` → `{"hist":true,"week":false}` | 0.096, rounding to 0.10 |
| Week in Review compares `+rv.toFixed(2) >= RAIN_MARK_IN` | the same two checks → `{"hist":false,"week":true}` | 0.096 and 0.099 |
| rainByDate reads `(DB.rainLog\|\|[])` instead of `liveOf('rainLog')` | `D-04: a soft-deleted rain row at 0.5" shows no mark …`; `D-04: … read rain only through rainByDate() …` | a row with `deletedAt: 5` |
| rainByDate drops the finite and range test | `D-13: a rain amount of Infinity …` and `… of 41 …` → `{"hist":true,"week":true}` | Infinity, 41 |
| The source note renders unconditionally | `LAWN-03: a 0.05" row is kept but unmarked, and with no mark there is no source note` → `{"note":true}`, plus 8 more no-mark checks | no mark showing |
| Today's history row can be marked (`rv=rain.get(iso)`) | `LAWN-03: a row dated today at 0.5" never marks today's history row` | a row dated today |
| `ld.watered === true` → `ld.watered` | first run: nothing went red (see Deviation 1). After 113c62f: `D-13: stored strings and numbers renders no Mowed or Watered tag` | `watered: 1` |
| `ld.mowed === true` → `ld.mowed` (re-run after 113c62f) | the tracer and `D-13: stored strings and numbers …` | `mowed: 'false'` |
| Future days get tags (`if(true)`) | `D-13: a future day with a mow, a watering and 0.5" of rain shows no tag` | dayOff(1) data |
| The rain tag loses its title | the tracer, both boundary-marked checks, the ordering, D-11 and sync checks (6) | any marked day |

## Render probe (Task 3)

Rendered from the app's own `mowOutlookHTML()`, `lawnHistory()`, `renderWeekReview()` and `viewLawn()`
through `test/harness.js` (frozen clock, Fri 7 Aug 2026), with synthetic data only. Each output went in a
`.container` frame of the given width (border-box, so card content is 314px at 380px) with the real
`<style>` block, and no CSP meta. Measured in headless Chrome. Every row meets its check, and no fix was
needed.

| Surface | Check | 320 | 360 | 380 | 412 |
|---------|-------|-----|-----|-----|-----|
| S1 🚜💧, ☔💧, 🔥💧 and lone 💧 strips | every cell one height | 65px all | 65px all | 65px all | 65px all |
| S1 | pair span has one client rect (width) | 1 (33px) | 1 (33px) | 1 (33px) | 1 (33px) |
| S1 | cell children outside the cell | 0 | 0 | 0 | 0 |
| S1 | strip scroll (scrollWidth/clientWidth, inherited) | 312/254 | 312/294 | 314/314 | 346/346 |
| S3 Lawn history (5 marks, one 12.34) | mark intersects the pills group | 0 of 5 | 0 of 5 | 0 of 5 | 0 of 5 |
| S3 | marks wrapped under the date | 5 | 2 (the long dates) | 0 | 0 |
| S3 | horizontal clearance, mark to pills (px) | 47, 41, 39, 47, 47 | 15, 81, 79, 15, 15 | 35, 24, 28, 35, 35 | 67, 56, 60, 67, 67 |
| S3 | row height, marked / plain | 61 / 52, 51 | 52 and 61 / 52, 51 | 52 / 52, 51 | 52 / 52, 51 |
| S3 | descendants outside the card | 0 | 0 | 0 | 0 |
| S3 | source note lines | 3 | 2 | 2 | 2 |
| S4 Week in Review (Thu: PUSH 1, 🎲, ⚖️, 🧎, 🏆, 🚜, 💧, 🌧️) | tags outside the card horizontally | 0 | 0 | 0 | 0 |
| S4 | the eight-tag row's lines | 3 | 2 | 2 | 2 |
| S5 offline note, today (`11:00 AM`) and earlier (`Wed 12:00 PM`) | one line; text right edge ≤ refresh left | 1; 197 and 221 ≤ 249 | 1; 197 and 221 ≤ 289 | 1; 197 and 221 ≤ 309 | 1; 197 and 221 ≤ 341 |
| S5 | header row height | 76px | 76px | 76px | 76px |
| S6 no cache, one failure | body lines; Retry weather inside the block | 2; yes | 2; yes | 2; yes | 2; yes |
| S6 | block height | 150px | 150px | 150px | 150px |

UI-SPEC agreement: the strip, the 61px wrapped history row, the 76px header and the 150px S6 block match
its table. The Week in Review tag row wraps to fewer lines than the UI-SPEC's static estimate (3 and 2
against 4 and 3), because this day's hobby name is shorter. That is not a regression.

**Screenshot.** The 380px page was too tall for one readable image, so each surface was shot separately
at 380×1100. Lawn history: the 🌧️ amount sits on the date's line in a lighter grey, about 25–35px clear
of the Watered pill, including "Wed, Aug 5 🌧️ 12.34"". The note is two lines of small muted text under
the intro, and the starred override pill is unchanged. Week in Review, Thu 8/6: the PUSH 1 pill, 🎲, ⚖️,
🧎 session and 🏆 PR on the first line, then 🚜 Mowed, 💧 Watered and 🌧️ 12.34" on the second, all inside
the card. The outlook strips show the 🚜💧, ☔💧 and 🔥💧 pairs side by side in the cell, with no clipping. The
offline note reads "Offline — weather from 11:00 AM" under the condition line, left of ↻.

Invocation (from the probe directory, a fresh scratchpad directory; nothing from it is committed):

```bash
P="$SCRATCHPAD/probe-1104"; cd "$P"
timeout 60 node gen.js
"C:/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --no-first-run \
  --user-data-dir=C:/Temp/p1104/prof --dump-dom "file:///$P/probe.html" > dom.html
node -e "const s=require('fs').readFileSync('dom.html','utf8');const M='PROBE'+'_JSON:';const i=s.indexOf(M);
  const j=s.slice(i+M.length,s.indexOf('</pre>',i)).replace(/&quot;/g,'\"').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
  JSON.parse(j).forEach(r=>console.log(JSON.stringify(r)))"
# Screenshot: WIDTHS=380 PAGE=probe-380.html node gen.js, then hide all but one surface group with an
# injected <style>, and chrome --headless=new --screenshot=shot.png --window-size=380,1100 file:///…
```

The browser profile sits on a short path (`C:/Temp/p1104`), never under the scratchpad.

`gen.js`:

```js
// 11-04 render probe generator. Synthetic data only. Renders through the app's own view functions,
// wraps each output in .container frames of 320/360/380/412px with the real <style> block, appends
// measure.js, writes probe.html. Ends with process.exit(0): loadApp leaves timers running.
const fs = require('fs'), path = require('path');
const ROOT = 'C:/Users/idbac/Projects/ppl-tracker/.claude/worktrees/bold-mcclintock-f1c7e4';
const { loadApp, makeWx, APP_PATH, FROZEN_MS } = require(ROOT + '/test/harness.js');
const OUT = __dirname;

const a = loadApp(APP_PATH);
const today = a.todayISO();
const dayOff = n => { const d = new Date(today + 'T00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const setup = (o) => {
  a.DB = a.blank();
  a.DB.lawn = { lat: 44.94, lon: -93.36, label: 'St. Louis Park' };
  a.DB.wx = o.wx === null ? null : makeWx(Object.assign({ todayISO: today }, o.wx || {}));
  if(o.mowedDaysAgo != null) (a.DB.lawnLog[dayOff(-o.mowedDaysAgo)] = a.DB.lawnLog[dayOff(-o.mowedDaysAgo)] || {}).mowed = true;
  if(o.wateredDaysAgo != null) (a.DB.lawnLog[dayOff(-o.wateredDaysAgo)] = a.DB.lawnLog[dayOff(-o.wateredDaysAgo)] || {}).watered = true;
};
const cases = [];

// S1: three pair strips (11-03's fixtures) and one with a lone droplet.
[['s1-tractor-drop', {}], ['s1-umbrella-drop', { probByOffset: { 2: 55 } }], ['s1-fire-drop', { hotFrom: { 2: 8 } }]].forEach(([id, wx]) => {
  setup({ mowedDaysAgo: 6, wateredDaysAgo: 0, wx });
  cases.push([id, a.mowOutlookHTML(), { next: a.nextWaterDay(), mow: a.mowForecast().next && a.mowForecast().next.k }]);
});
setup({ mowedDaysAgo: 3, wateredDaysAgo: 7, wx: { hiByOffset: { 0: 54 } } });
cases.push(['s1-lone-drop', a.mowOutlookHTML(), { next: a.nextWaterDay() }]);

// S3: Lawn history with marks on several days, one at 12.34, and both pills on marked days.
setup({ wx: {} });
[[-1, 0.42], [-2, 12.34], [-3, 0.1], [-5, 1.5], [-9, 0.05], [-12, 0.77]].forEach(([k, v]) => a.DB.rainLog.push({ date: dayOff(k), inches: v, mtime: 1 }));
[-1, -2, -5, -12].forEach(k => { a.DB.lawnLog[dayOff(k)] = { mowed: true, watered: true }; });
a.DB.lawnLog[dayOff(-3)] = { watered: true, overrideWater: true };
cases.push(['s3-history', a.lawnHistory(), {}]);

// S4: Week in Review, populated, with one day (Thu, yesterday) carrying every tag at once.
a.DB = a.blank();
a.DB.sessions = [
  { id: 's1', workout: 'PUSH 1', date: dayOff(-8), endedAt: 1, extras: {}, entries: [{ name: 'Barbell bench press', sets: [{ w: '135', r: '8', skipped: false }] }] },
  { id: 's2', workout: 'PUSH 1', date: dayOff(-1), endedAt: 2, extras: {}, entries: [{ name: 'Barbell bench press', sets: [{ w: '145', r: '8', skipped: false }] }] },
  { id: 's3', workout: 'PULL 1', date: dayOff(-3), endedAt: 3, skipped: true, reason: 'slept in', entries: [] },
];
a.DB.hobbyLog = [{ date: dayOff(-1), item: 'Mini-painting', cat: 'hobby' }, { date: dayOff(-2), item: 'Chess', cat: 'hobby' }];
a.DB.weights = [{ date: dayOff(-1), value: 194.2 }, { date: dayOff(-4), value: 195.1 }];
a.DB.mobilityLog = { [dayOff(-1)]: { __session: true } };
a.DB.lawnLog = { [dayOff(-1)]: { mowed: true, watered: true }, [dayOff(-3)]: { watered: true } };
a.DB.rainLog = [{ date: dayOff(-1), inches: 12.34, mtime: 1 }, { date: dayOff(-2), inches: 0.42, mtime: 1 }];
a.DB.journal = { [dayOff(-1)]: 'Felt strong.' };
cases.push(['s4-week', a.renderWeekReview(), {}]);

// S5: viewLawn with a usable cache and one failure, fetched today and on an earlier day.
setup({ mowedDaysAgo: 3, wateredDaysAgo: 2, wx: {} });
a.WXFAIL.n = 1; a.WXFAIL.retryAt = FROZEN_MS + 300000;
a.DB.wx.at = FROZEN_MS - 3600000; // the frozen app clock: 11 AM today
cases.push(['s5-today', a.viewLawn(), {}]);
a.DB.wx.at = FROZEN_MS - 2 * 86400000;
cases.push(['s5-earlier', a.viewLawn(), {}]);

// S6: no cache and one failure.
setup({ mowedDaysAgo: 3, wx: null });
a.WXFAIL.n = 1;
cases.push(['s6-nocache', a.viewLawn(), {}]);
a.WXFAIL.n = 0; a.WXFAIL.retryAt = 0;

const src = fs.readFileSync(APP_PATH, 'utf8');
const style = src.match(/<style>[\s\S]*?<\/style>/)[0];
const measure = fs.readFileSync(path.join(OUT, 'measure.js'), 'utf8');
const WIDTHS = process.env.WIDTHS ? process.env.WIDTHS.split(',').map(Number) : [320, 360, 380, 412];
const frames = WIDTHS.map(w => cases.map(([id, html]) =>
  `<div class="container" data-case="${id}" data-w="${w}" style="width:${w}px;max-width:${w}px;margin:0 0 40px;box-sizing:border-box">${html}</div>`
).join('\n')).join('\n');
const page = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">${style}</head>
<body>${frames}<pre id="out"></pre><script>${measure}</script></body></html>`;
fs.writeFileSync(path.join(OUT, process.env.PAGE || 'probe.html'), page);
console.log('cases', cases.map(c => c[0] + ' ' + JSON.stringify(c[2])).join(' | '));
process.exit(0);
```

`measure.js`:

```js
// 11-04 render probe measurements. Runs in the probe page; writes JSON after a marker built by
// concatenation, so the marker never appears in this source.
(function(){
  const EPS = 0.5;
  const R = el => el.getBoundingClientRect();
  const inside = (r, box) => r.left >= box.left - EPS && r.right <= box.right + EPS && r.top >= box.top - EPS && r.bottom <= box.bottom + EPS;
  const insideX = (r, box) => r.left >= box.left - EPS && r.right <= box.right + EPS;
  const meets = (a, b) => !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
  const lines = el => { const rg = document.createRange(); rg.selectNodeContents(el);
    return new Set([...rg.getClientRects()].filter(r => r.width > 0).map(r => Math.round(r.top))).size; };
  const textRect = el => { const rg = document.createRange(); rg.selectNodeContents(el); return rg.getBoundingClientRect(); };
  const visible = el => { const r = R(el); return r.width > 0 || r.height > 0; };
  // Lines of a wrapped flex row: a child starts a new line when its top is below the current line's bottom.
  const rowLines = kids => { let n = 0, bottom = -Infinity;
    kids.map(R).sort((x, y) => x.top - y.top).forEach(r => { if(r.top >= bottom - 1){ n++; bottom = r.bottom; } else bottom = Math.max(bottom, r.bottom); });
    return n; };
  const out = [];
  document.querySelectorAll('.container[data-case]').forEach(fr => {
    const id = fr.dataset.case, w = +fr.dataset.w, res = { id, w };
    if(id.startsWith('s1')){
      const cells = [...fr.querySelectorAll('div[style*="min-width:42px"][style*="padding:6px 2px"]')];
      const hs = cells.map(c => Math.round(R(c).height));
      const pairs = [...fr.querySelectorAll('span[style*="white-space:nowrap"][style*="font-size:12px"]')];
      const strip = cells[0] && cells[0].parentElement;
      let outChildren = 0;
      cells.forEach(c => { const cr = R(c); c.querySelectorAll('*').forEach(d => { if(visible(d) && !inside(R(d), cr)) outChildren++; }); });
      Object.assign(res, { cells: cells.length, heights: [...new Set(hs)], pairs: pairs.length,
        pairRects: pairs.map(p => p.getClientRects().length), pairW: pairs.map(p => Math.round(R(p).width)),
        cellW: cells.map(c => Math.round(R(c).width))[0], outChildren,
        stripScroll: strip ? strip.scrollWidth + '/' + strip.clientWidth : null });
    }
    if(id.startsWith('s3')){
      const card = fr.querySelector('.card'), cb = R(card);
      const rows = [...card.querySelectorAll('.hist-item')];
      const marked = rows.filter(r => r.querySelector('span[title="Estimated rainfall"]'));
      const overlaps = marked.filter(r => meets(R(r.querySelector('span[title="Estimated rainfall"]')), R(r.lastElementChild))).length;
      const clear = marked.map(r => Math.round(R(r.lastElementChild).left - R(r.querySelector('span[title="Estimated rainfall"]')).right));
      const wrapped = marked.filter(r => { const d = R(r.firstElementChild.firstElementChild), m = R(r.querySelector('span[title="Estimated rainfall"]')); return m.top > d.top + 4; }).length;
      let outside = 0; card.querySelectorAll('*').forEach(d => { if(visible(d) && !inside(R(d), cb)) outside++; });
      const note = [...card.querySelectorAll('p')].find(p => p.textContent.includes('is each day'));
      Object.assign(res, { rows: rows.length, marked: marked.length, overlaps, wrapped, clearPx: clear,
        hMarked: [...new Set(marked.map(r => Math.round(R(r).height)))],
        hPlain: [...new Set(rows.filter(r => !marked.includes(r)).map(r => Math.round(R(r).height)))],
        outside, noteLines: note ? lines(note) : 0,
        pillsW: [...new Set(rows.map(r => Math.round(R(r.lastElementChild).width)))] });
    }
    if(id.startsWith('s4')){
      const card = fr.querySelector('.card'), cb = R(card);
      const tagRows = [...card.querySelectorAll('div[style*="flex-wrap:wrap"][style*="margin-top:5px"]')];
      let outTags = 0; tagRows.forEach(tr => [...tr.children].forEach(t => { if(!insideX(R(t), cb)) outTags++; }));
      const full = tagRows.find(tr => tr.textContent.includes('Mowed') && tr.textContent.includes('Watered'));
      const tops = full ? rowLines([...full.children]) : 0;
      Object.assign(res, { tagRows: tagRows.length, outTags, rowsInside: tagRows.every(tr => insideX(R(tr), cb)), fullRowTags: full ? full.children.length : 0, fullRowLines: tops,
        cardScroll: card.scrollWidth <= card.clientWidth });
    }
    if(id.startsWith('s5')){
      const note = [...fr.querySelectorAll('div.muted')].find(d => d.textContent.includes('Offline'));
      const btn = fr.querySelector('button[aria-label="Refresh weather"]');
      const tr = note ? textRect(note) : null;
      Object.assign(res, { text: note ? note.textContent : null, lines: note ? lines(note) : 0,
        textRight: tr ? Math.round(tr.right) : null, btnLeft: btn ? Math.round(R(btn).left) : null,
        leftOfBtn: !!(tr && btn && tr.right <= R(btn).left + EPS),
        headerH: Math.round(R(btn.closest('.row')).height) });
    }
    if(id.startsWith('s6')){
      const box = fr.querySelector('.empty'), bb = R(box);
      const body = [...box.querySelectorAll('div.muted')].find(d => d.textContent.includes('Check your connection'));
      const btn = [...box.querySelectorAll('button')].find(b => b.textContent.includes('Retry weather'));
      Object.assign(res, { bodyLines: body ? lines(body) : 0, btnInside: !!(btn && inside(R(btn), bb)),
        btnInFrame: !!(btn && inside(R(btn), R(fr))), blockH: Math.round(bb.height) });
    }
    out.push(res);
  });
  document.getElementById('out').textContent = 'PROBE' + '_JSON:' + JSON.stringify(out);
})();
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing check] The strict watered read was not mutation-proved by the planned checks**
- **Found during:** Task 2 mutations
- **Issue:** Changing `ld.watered === true` to a truthy read left the suite green. The planned D-13 inputs
  (`false`, the override keys, `'x'`, a missing day) are all falsy for `watered`, so they can't tell a
  strict read from a truthy one. The plan's must-have names strict reads (D-13).
- **Fix:** Added the case `{ mowed: 'false', watered: 1 }` to the D-13 list. Both strict-read mutations
  now go red by name.
- **Files modified:** test/app.test.js
- **Commit:** 113c62f

**2. [Rule 3 - Blocking] The Write tool decoded `\uFE0F` into the literal selector**
- **Found during:** Task 1, the tracer's `LW4_RAIN` constant
- **Issue:** The braced `\u{1F327}` survived, but the four-hex `\uFE0F` landed as the literal glyph.
- **Fix:** A scratchpad script rewrote it on that one line, because line 9245 already holds a literal U+FE0F
  that must stay. Every later edit wrote placeholders (`@@U+FE0F@@`) that the applying node script
  expanded with a runtime-built backslash. The greps confirm each escape: `\u{1F327}\uFE0F` (index.html
  RAIN_GLYPH and the test LW4_RAIN), `\u{1F69C}`, `\u{1F4A7}`, `\u2019` (index.html note and LW4_NOTE),
  `\u2696`.
- **Commit:** 00761e5, 593679b

**3. [Acceptance wording] A comment named rainByDate()**
- In renderWeekReview, the comment first said "rainByDate(), built once here", so the acceptance grep
  counted 2. I reworded it ("the one rain reader") before the Task 1 commit, and the grep reads 1.

### Notes

- The tracer gate: `workflow.auto_advance` is false, but the plan has no designed stops and the phase's
  `human_verify_mode` is `end-of-phase`, as in 11-01 to 11-03. The tracer's verify was re-run end to end
  (`1391 passed, 0 failed`, CSP OK) before expansion. 11-05 owns the phone check (Android emoji font).
- `rainByDate` coerces with `+r.inches` as the plan says, so a stored `'0.5'` or `true` reads as 0.5 or 1.
  Either one renders only as `esc(n.toFixed(2))` of a checked number, so it can't inject markup.
- The S5 "today" fixture first used the probe process's real clock. The app's clock is frozen, so that
  fixture rendered the earlier-day variant. It was re-stamped from the harness's `FROZEN_MS` before the
  recorded run (logged as a skill observation).

## Threat model

- T-11-30 (hostile amount or date): rainByDate's string-date and finite 0..40 test, plus
  `esc(v.toFixed(2))`. The date is never rendered. EVIL, NaN, Infinity, -1, 41 and an EVIL date are
  checked, and the range test is mutation-proved.
- T-11-31 (deleted row in view): one reader through `liveOf('rainLog')`, mutation-proved.
- T-11-32 (tag as a control): the controlsIn counts match with and without the data, and the 14 watered
  pills are unchanged.
- T-11-33 (estimate read as gauge): the note shows whenever a mark does. The unconditional-note mutation
  is proved red, and the note never shows without a mark.
- T-11-34: the probe used synthetic data in the scratchpad, and `git status` shows no untracked file.
- T-11-02: every script-editing commit ran `npm run csp:hash` first, and `csp:check` is OK at HEAD.
- No new surface: no data-action, CSS class, colour token or icon, and no hex in the new styles.

## Known Stubs

None.

## Self-Check: PASSED
