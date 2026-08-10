# ppl-tracker

Ian's workout and daily-life PWA. Workout logging, strength and bodyweight trends, cardio, skincare,
and a weather-driven lawn scheduler. Installs to the home screen, works offline, data lives on the
device with optional Firebase sync.

**Live:** https://idbachmayer-boop.github.io/ppl-tracker/

## The shape of it

`index.html` **is** the app — HTML, CSS and JavaScript in one file, no build step, no dependencies.
That is deliberate: it's what keeps the thing installable, offline-capable and editable without a
toolchain. `sw.js` is the service worker. Everything else is tests.

## Running the checks

```bash
npm test
```

(or `node test/app.test.js` — there are no dependencies to install.)

The suite loads the real `index.html` into a stubbed DOM and asserts behaviour: mowing and watering
rules, plate math, PR detection, the sync merge, migrations. It runs on every push and **a failure
blocks the deploy**.

The clock is frozen to midday, Friday 7 August 2026, so date-sensitive rules behave the same in
January as in July. Set `TZ=America/Chicago` if your machine is elsewhere; the suite tells you if
that's the problem.

## Deploying

Push to `main`. GitHub Actions runs the checks, then publishes to Pages. Fully close and reopen the
app on the phone to pick up an update.
