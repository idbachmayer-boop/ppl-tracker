# API Coverage — Open-Meteo (forecast and geocoding)

> Full coverage by default. Opt-outs are explicit, reasoned decisions.

Phase 11 extends the app's existing Open-Meteo integration: the forecast call asks for 14 past days
instead of 3 (D-02), saves each finished day's rainfall (LAWN-02), and backs off on failure (LAWN-06).
The only other "API" in the phase text is 11-05's read-only `gh api` check of the merge commit, which is
release tooling, not an integration.

| capability | decision | reason |
|---|---|---|
| forecast-daily-variables (code, highs/lows, rain sum, rain chance, wind) | INTEGRATE | |
| forecast-hourly-variables (temperature_2m, precipitation) | INTEGRATE | |
| forecast-current-weather | INTEGRATE | |
| forecast-past-days | INTEGRATE | |
| forecast-days | INTEGRATE | |
| forecast-units-and-timezone (fahrenheit, mph, inch, timezone=auto) | INTEGRATE | |
| geocoding-search | INTEGRATE | |
| error-responses (non-OK status, malformed body, network failure) | INTEGRATE | |
| historical-weather-archive-api | OPT-OUT | not needed: past_days=14 covers the window D-02 chose, and a new host would need a CSP change |
| other-daily-variables (snowfall, gusts, UV, soil moisture, evapotranspiration) | OPT-OUT | explicitly out of scope: new capabilities beyond LAWN-01..07 |
| other-apis (air quality, marine, flood, ensemble, climate) | OPT-OUT | explicitly out of scope: no requirement uses them |
