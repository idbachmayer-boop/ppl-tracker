# Phase 11: Lawn, Journal and Weather Loop - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-11-11
**Phase:** 11-lawn-journal-and-weather-loop
**Areas discussed:** Rain saving & sync, Watering outlook & rules, Rain marks in history & journal, Offline weather behaviour

---

## Rain saving & sync

| Option | Description | Selected |
|--------|-------------|----------|
| Quiet push | Rain saves on the device right away and is sent to the cloud by a merge that doesn't bump updatedAt | ✓ |
| Ride along | Saved on the device only, and pushed with the next real save | |
| You decide | Least code that keeps the hole closed | |

| Option | Description | Selected |
|--------|-------------|----------|
| Fetch about 2 weeks back | past_days around 14, same host, no CSP change | ✓ |
| Keep 3 days, accept gaps | No fetch change | |
| Fetch further (30 days) | A bigger backfill and a bigger download | |

| Option | Description | Selected |
|--------|-------------|----------|
| Latest reading wins | Update a changed amount; no write when it's unchanged | ✓ |
| First saved is final | A saved day never changes | |
| You decide | Researcher checks how much past data moves | |

| Option | Description | Selected |
|--------|-------------|----------|
| Read-only | Rain only from Open-Meteo, no edit UI | ✓ |
| Tap to remove | Soft-delete from Lawn history | |
| Edit amount | Manual gauge reading (new capability) | |

**Ian's choices:** a quiet push, a 2-week lookback, the latest reading wins, read-only.

---

## Watering outlook & rules

| Option | Description | Selected |
|--------|-------------|----------|
| Lawn outlook strip | Merge water into the mow strip; wet becomes ☔ | ✓ |
| On the weather strip | 💧 under the top forecast | |
| Own small card | A separate watering strip | |

| Option | Description | Selected |
|--------|-------------|----------|
| Next day only | One 💧, on the next due day | ✓ |
| Every projected day | Re-project the interval across the week | |

| Option | Description | Selected |
|--------|-------------|----------|
| One shared verdict | The card, the heads-up, "next" and the strip use the same rules | ✓ |
| Outlook only | The 60% rule applies only to the strip | |

| Option | Description | Selected |
|--------|-------------|----------|
| Hold off, Override still works | A hard hold below a 60°F high | ✓ |
| Soft note only | Recommend, with a note | |

**Ian's choices:** a Lawn outlook strip, the next watering day only, one shared verdict, a hard cool-day hold that Override can still beat.

---

## Rain marks in history & journal

| Option | Description | Selected |
|--------|-------------|----------|
| Icon + amount | 🌧 0.42" as plain text | ✓ |
| Icon only | Just 🌧 | |

| Option | Description | Selected |
|--------|-------------|----------|
| Year-round | Save and show all year; Lawn history stays hidden off-season | ✓ |
| Lawn season only | Apr–Oct only | |

| Option | Description | Selected |
|--------|-------------|----------|
| Today fetches year-round | When a location is set, still at most hourly | ✓ |
| Only Care → Lawn in winter | Keep Today's season gate | |

| Option | Description | Selected |
|--------|-------------|----------|
| Display only | Plain tags in Week in Review | ✓ |
| Tappable | Toggle a lawn log from the journal | |

**Ian's choices:** the icon with the amount, year-round, Today fetches all year, display-only tags.

---

## Offline weather behaviour

| Option | Description | Selected |
|--------|-------------|----------|
| Wait, then back off | About 5 → 15 → 60 min; ↻ or coming back online retries right away | ✓ |
| Only when you tap refresh | No automatic retry | |
| You decide | Timings left to planning | |

| Option | Description | Selected |
|--------|-------------|----------|
| Last forecast + note | "Offline — weather from 3:40pm"; Retry when nothing is cached | ✓ |
| Silent | Keep the old forecast with no note | |

**Ian's choices:** wait and back off; show the last forecast with a note.

---

## Claude's Discretion

- The collection's name, label, shape and field names.
- The exact backoff steps and where the backoff state is stored (device-local).
- The precedence order inside the watering verdict, and the hold-message copy.
- How the quiet push is wired.

## Deferred Ideas

- Manual rain-gauge entry or correction (backlog).
