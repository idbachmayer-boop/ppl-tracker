# Feature Research

**Domain:** Personal single-user tracker — LLM-consumable data export, and a manual sleep log added via a new declarative collection registry
**Researched:** 2026-09-10
**Confidence:** MEDIUM (cross-checked web sources; no official vendor docs apply — this is applied domain knowledge, not an SDK)

## Scope note

This is a subsequent-milestone research pass on exactly two features already decided in `PROJECT.md`:
an "export for Claude" as Markdown tables, and a `sleep` collection `{ id, date, hours, quality, note }`.
Both schemas and the export format are **already chosen** (see PROJECT.md Key Decisions). This document
exists to pressure-test those choices against what's actually known about LLM data consumption and
manual sleep logging, and — per the downstream consumer's priority — to draw a hard line around what
NOT to build next, because "keeps absorbing things" is the standing risk this whole milestone is
trying to close.

---

## Part 1: Export for Claude — format research

### What actually works when a human pastes personal time-series data into a chat LLM

**Markdown tables beat CSV and JSON on both cost and accuracy, and this app's current export sits on
the wrong side of both.**

- **Token cost:** Markdown tables run roughly 30–40% fewer tokens than equivalent JSON for the same
  data (JSON's per-row overhead — repeated keys, quotes, braces — doesn't exist in a Markdown table,
  where the schema is stated once in the header row). CSV is nearly as token-cheap as Markdown, but —
  see below — cheap tokens don't help if the model reads the data wrong.
- **Accuracy:** in a benchmark comparing 11 input formats for LLM comprehension, a Markdown-style
  format led with ~61% task accuracy; CSV — the format most people reach for by default — placed near
  the bottom at ~44%. Markdown is the format LLMs saw the most of in training (READMEs, docs sites,
  GitHub-flavored tables), so it's closer to their "native register" than a spreadsheet dump.
- **Why CSV specifically breaks down:** no inline type or unit information (a bare `185` column could
  be pounds, kilograms, or a rep count — CSV has nowhere to say which), no comment/note capability
  alongside a data row, and it degrades badly once the data isn't perfectly flat — a workout has
  sessions containing entries containing sets, and CSV has no native way to express that nesting
  without either duplicating parent fields on every row (which the flattening recommendation below
  does deliberately) or losing the relationship entirely.
- **Why JSON specifically breaks down for this use case:** it's precise and lossless, which is exactly
  why the *current* export is painful — every session, entry and set repeats its full key set, `id`
  and `deletedAt` sit inline with real data, and the model must first mentally parse and filter
  structure before it can reason about the numbers. JSON is the right format for a machine to
  re-import; it is the wrong format for a human to skim before pasting and for a model to reason over
  without a scratchpad step.
- **Wide tables break down too.** A table with one row per *session* and one column per exercise (or
  per set number) grows a new column every time the program changes and produces sparse,
  hard-to-scan rows. The fix is the one already decided: **one row per atomic observation** — one row
  per *set*, not per session — with the session's date and exercise repeated on every row. This is
  the same "tidy data" principle used in data analysis generally, and it's also just a flat Markdown
  table, which is the format that scores best.
- **Mixed units are a silent failure mode, not a crash.** If human weigh-ins and pet weigh-ins share a
  column header with no unit, or if any value in the file switches units row-to-row, the model will
  compute trends against the numbers as if they were consistent — it has no way to notice the switch.
  Put the unit in the column header once (`Weight (lb)`), not per cell.

### How much data before a single file stops being practical

There's no hard cliff, but the practical failure modes are: (1) token cost scaling linearly with row
count — irrelevant at this app's volume — and (2) models sampling or skimming rather than reading
every row once a table runs into the high hundreds to low thousands of rows, which matters for "did I
hit a PR in every session" style questions that require exhaustive scanning. At this app's actual
scale — one person, ~47 days of real use, a handful of sets per session — a full-history flat export
is nowhere near that range (low thousands of rows even after a year of daily lifting). **Windowing is
a solved-later problem, not a v1 requirement.** When it does become one, the standard convention is
recent detail plus older aggregates (e.g., full rows for the last N weeks, then a weekly or monthly
rollup table for anything older) — but that convention is fundamentally *not* generic: "aggregate a
workout" and "aggregate a weigh-in" mean different things (best set vs. average), so it cannot be
derived automatically from the `COLLECTIONS` declaration the way flattening and stripping can. That's
a reason to defer it, not a reason to skip planning for it later.

### Conventions that reduce ambiguity (apply to every table)

- **ISO dates (`YYYY-MM-DD`) everywhere.** Unambiguous, sorts correctly as plain text, and it's what
  the app already stores internally — no conversion needed.
- **Units in the header, once.** `Weight (lb)`, `Duration (min)` — not in every cell.
- **One row per atomic observation, not nested groupings.** A set is a row; a session is what the date
  + exercise columns reconstruct when you group by eye. This is a direct, low-cost win.
- **A consistent, visible missing-value marker** (e.g. `—`) — never an empty cell (breaks column
  alignment in raw Markdown source) and never `0` standing in for "not logged." This is the exact
  "absence never means off" lesson the app already learned the hard way in `mergeDB()` — it applies
  again here, in the export, for the same reason: a reader (human or model) cannot distinguish "logged
  a zero" from "didn't log" unless the file says so explicitly.
- **A short header block**: what the file is, when it was generated, and the date range / row counts
  covered. This costs a handful of tokens once and directly serves the "eyeballable before pasting"
  rationale already in PROJECT.md — a human can glance at "247 sets, 2026-07-25 to 2026-09-10" and
  know at a glance whether the file looks right before pasting it in. It also stops the model from
  silently assuming a partial file is the complete history.

### Anti-patterns — what makes an export *worse* than the raw JSON it replaces

- **Leaving internal ids or `deletedAt` in the output.** Not just token waste — a model given an
  `id` field sometimes treats it as meaningful and reasons about it. Soft-deleted rows must be
  filtered before serialization, not flagged and left for the model to ignore (asking the model to
  ignore data in-context is a standing instruction that burns tokens every conversation, which is the
  exact problem this feature exists to remove).
- **JSON-in-Markdown.** Putting a set list as a JSON array inside a single table cell is strictly
  worse than the current plain JSON export — it combines Markdown's poor support for nested structure
  with JSON's verbosity, in the worst possible place.
- **Silent truncation.** If the export caps row count without saying so in the header block, the model
  reasons on a partial history believing it's complete and gives a wrong answer with full confidence
  (e.g. "you've lost 5 lbs since June" when June was cut off). This is worse than the current export,
  which is at least complete.
- **Losing sort order.** If rows aren't sorted by date, the model has to re-sort mentally before any
  trend question, which is exactly the "burns effort every conversation" problem this feature is
  meant to remove.
- **A second hand-written serializer per collection.** Already flagged as a Key Decision in
  PROJECT.md, and worth restating here from the format-research side: a bespoke exporter per
  collection is how the original `blank()`/`mergeDB()`/`liveX()` problem re-appears in a sixth place.
  The export must read the same `COLLECTIONS` declaration that everything else derives from.

---

## Part 2: Sleep as a manual log — field research

### What sleep trackers record, and what a typed, self-reported log should keep

The research instrument to compare against is the **Consensus Sleep Diary (CSD)** — the standardized,
validated tool sleep researchers converged on for prospective self-monitoring. Its **Core** version
(the fields deemed essential, as opposed to its optional expanded fields) asks: bedtime, sleep-onset
latency, number and duration of awakenings, final wake time, and a single **sleep quality rating on a
5-point scale** ("very poor" to "very good"). Commercial wearables (Oura, Whoop, Fitbit-class devices)
additionally report sleep stages, heart rate, HRV, respiratory rate and a composite "sleep score" —
all sensor-derived, and **structurally impossible to self-report honestly**. None of that belongs in a
typed log; a human guessing at their own REM percentage is fabricating data, not recording it.

Within the CSD's own core fields, self-report reliability is not uniform. **Total sleep duration and a
global next-morning quality rating are the two fields people can report with reasonable accuracy** —
sleep-onset latency ("how long did it take you to fall asleep") and awakening counts are notoriously
unreliable self-reports, because a person trying to fall asleep has no clock and poor time perception,
and recall the next morning is fuzzy. This is exactly why `{ hours, quality }` is the right minimal
pair for a manual log, not `{ bedtime, waketime, latency, awakenings }` — the fields being asked for
are the ones people can actually answer honestly at low effort, and the fields being skipped are the
ones with the worst self-report validity anyway. **The existing schema decision is well-supported by
the research, not just convenient.**

### Quality scale: numeric 1–5 vs named states

The validated instruments (CSD, and the related Pittsburgh Sleep Quality Index) standardize on a
**5-point Likert scale**, and that scale is consistently anchored to "very poor" ↔ "very good"
language. Two implementation notes follow from that:

- **Store the integer, label the UI.** A numeric `quality: 1–5` field sorts, aggregates and plots
  natively — it's the form that makes the *export* a clean Markdown column and lets Claude compute a
  weekly average without a lookup table. A named-state string (`"Good"`, `"Poor"`) would need a
  mapping step before any of that works. The UI can (and should, for 11pm usability) present the
  named anchors as the label on a 1–5 picker — store the number, show the word.
  This is consistent with how `hobbyLog` and similar picker-style entries already work in this app.
- **Don't invent a different scale.** A 1–10 or unbounded scale produces noisier self-report data with
  no compensating benefit — the research literature converges on 5 points for exactly this kind of
  single-item global rating, and a wider scale just adds indecision at the point of typing it in half
  asleep.

### `note`: scope it narrowly

The app already has a `journal` collection. Sleep's `note` should be a one-line contextual tag on that
specific night ("up with the dog," "late meal," "too hot") — not a second journal. If it starts
growing paragraphs, that's a sign it's drifting into `journal`'s territory, not evidence sleep needs a
richer field.

### Correlations people actually look at — and where that reasoning should happen

Given this app already tracks workouts and body weight, the natural questions are: *did sleep hours/
quality the night before affect today's training* (did a PR session follow a good night?), *does
weight trend track sleep trend* (poor sleep associated with weight fluctuation), and *simple rolling
averages* (7-day sleep trend). **None of these require the app to compute anything new.** They are
exactly the kind of cross-collection reasoning the Markdown export exists to hand off to Claude
Desktop. This is the direct link between the two features in this research: sleep's analytical payoff
is realized entirely through the export, not through an in-app chart — which is itself a reason not to
build one (see Anti-Features below).

---

## Feature Landscape

### Table Stakes (the export/sleep log is useless without these)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Export: one flat Markdown table per list-shaped collection, one row per atomic observation (per *set*, not per session) | This is the entire point of the feature — "flat rows: date, exercise, set, weight, reps" is stated in the milestone context | LOW | Straightforward flatten of `sessions → entries → sets`, driven by the `COLLECTIONS` declaration |
| Export: weigh-ins / pet weigh-ins as a simple date+value series | Simplest possible time series; already list-shaped in the data model | LOW | Two or three columns: date, weight, (species/note if applicable) |
| Export: strip internal ids and non-live (soft-deleted) rows | Directly named in the milestone context; also the single biggest token/accuracy win per the format research above | LOW | Filter through the same `liveX()` pattern already used everywhere else, then drop the `id` field before serializing |
| Export: ISO dates and explicit units in every column header | Removes the single most common source of a model misreading the data | LOW | One-time formatting decision applied uniformly |
| Export: consistent missing-value marker, never a blank cell or a silent `0` | Same "absence never means off" lesson the app already paid for once in `mergeDB()` | LOW | A literal `—` or `n/a`, chosen once and applied everywhere |
| Export: short header block (what/when/row-range) | Supports the "eyeballable before pasting" rationale already decided; also prevents a partial file being mistaken for the complete history | LOW | A few lines of static text plus counts already available from the data |
| Export: derived from the `COLLECTIONS` declaration, not a second hand-written serializer | Already a Key Decision in PROJECT.md; the format research reinforces *why* — a bespoke exporter is a sixth place the schema could drift | MEDIUM | This is the real work of the feature; everything above is formatting once this exists |
| Sleep: `date`, `hours`, `quality`, `note` fields | Matches validated sleep-diary research on what a person can self-report accurately at low nightly effort | LOW | Already the decided schema; this research confirms rather than changes it |
| Sleep: numeric 1–5 quality, stored as an integer | Standard scale in validated sleep instruments; numeric form is what makes the export column usable without a mapping step | LOW | UI may show named labels on the same 1–5 picker |
| Sleep: soft-deletable, sorted by date, list-shaped | Required to exercise the `COLLECTIONS` registry as the acceptance test F1 is validated against | LOW (assuming F1 lands first) | This is the point of choosing `sleep` as the 11th collection — it must behave exactly like the other seven list collections, no special-casing |

### Differentiators (worth doing, not essential)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Recent-detail-plus-older-aggregate windowing in the export | Keeps the file practical if/when total row count grows into the range where a model starts sampling rather than reading every row | HIGH | Not generic — "aggregate a workout" and "aggregate a weigh-in" mean different things, so it can't be derived automatically from `COLLECTIONS` the way flattening can. Defer until actual row counts approach the low thousands; at 47 days of one-person use this is nowhere close |
| A stated date-range cutoff in the header when one is applied | Small trust/clarity improvement once any windowing exists | LOW | Only relevant once windowing (above) exists — no independent value before then |

### Anti-Features (deliberately do NOT build)

| Feature | Why It's Tempting | Why It's Wrong Here | Alternative |
|---------|--------------------|-----------------------|-------------|
| In-app sleep/training/weight correlation charts | "Since we're tracking sleep now, why not show the trend line" — the natural next absorption | This is exactly the pattern the milestone is trying to stop: a stats engine is bespoke logic per collection pair, the opposite of the one-declaration discipline `COLLECTIONS` exists to enforce. It's also redundant — the export was built specifically so this reasoning happens in Claude Desktop instead | Ask Claude the question in the conversation where the export was pasted; it already has hours, quality, workout sets and weigh-ins in one file |
| Automatic summarization/rollup engine in the export (weekly averages, PR-since-date, etc.) | Feels like a natural export enhancement, and the question of windowing invites it | Not derivable from a single generic declaration — every collection's "sensible aggregate" is different, so this is a second hand-written thing per collection, the exact anti-pattern F1 was built to close. Also unneeded at current data volume | Let Claude compute it from the raw flat rows already in the file — that's the actual value of handing it clean data instead of doing the arithmetic in-app first |
| Sleep stages, HR, HRV, or any sensor-style field | Looks like "a real sleep tracker has this" | Impossible to self-report honestly; a human guessing their REM% is fabricated data, not a log entry. This app has no wearable integration and isn't getting one | None needed — `hours` + `quality` are the two fields with actually-reliable self-report validity per the sleep-diary research above |
| Separate `bedtime` / `wake time` fields instead of `hours` | Feels more "complete" than a single duration number | Doubles nightly input burden (two time pickers at whatever hour someone is finally logging sleep) for data whose only reliably self-reportable signal is already captured by `hours` + `quality`; sleep-onset latency and precise clock times are the CSD fields with the *worst* self-report reliability | Keep `hours` as a single typed number, exactly as already decided |
| Structured "reasons for poor sleep" tag picker (noise/pet/stress/alcohol, etc.) | This is what the CSD's own *expanded* (non-core) diary adds, so it reads as the obvious next step | Overkill for a one-person log; a picker UI adds a screen for zero analytical gain over what a one-line `note` already gives Claude to reason about in the export | The existing free-text `note` field already covers this at negligible cost |
| An export configuration screen (pick collections / date range / format via UI) | Feels like it respects the user's control over their own data | Adds UI surface to a single-user personal app for a workflow that is, per the milestone context, "paste the whole file into a conversation." No evidence this app's one user wants partial exports | One export, everything current, every time — matches actual usage |
| Making the export round-trippable / re-importable | "Why not one file that both a human reads and the app can reload" | Blends two different jobs — the whole reason this feature exists is to strip ids and soft-delete markers that a *re-importable* format would need to keep. The app already has a working JSON backup/import pair for that job | Keep the Markdown export strictly one-way (write-only), and leave backup/import as the JSON-based, round-trippable path it already is |
| Live/automatic delivery of the export (API push to Claude, scheduled email, MCP connector) | Sounds like it removes the manual paste step entirely | Requires new dependencies, auth, or a build step — directly against this app's stated constraints (no dependencies, no build step, offline-first, single file) | A generated file the user copies or downloads manually, same as the existing backup export today |
| Reminder/notification to log sleep nightly | Common feature in sleep-tracking products | Not evidenced as needed — 47 days of real usage show established logging habits across ten other collections without reminders; adding notification infrastructure for one more collection is disproportionate | None — rely on the same self-driven logging pattern already working for everything else |

## Feature Dependencies

```
COLLECTIONS declaration (F1, already in progress)
    └──requires──> Export for Claude (reads the same declaration to know shape/sort/soft-delete per collection)
    └──requires──> sleep collection (is the acceptance test that F1 actually generalizes)

sleep collection ──enhances──> Export for Claude
    (adding sleep should require zero export-code changes if F1 + export are both
     properly declaration-driven — this is itself a useful acceptance check)

Export for Claude ──conflicts with──> round-trippable/importable export format
    (stripping ids and deletedAt, which the export requires, is incompatible with
     re-import, which needs them — keep the two paths separate, per Anti-Features)

Recent-detail-plus-aggregate windowing ──requires──> per-collection aggregate rules
    (deferred; not derivable from COLLECTIONS the way flattening is)
```

### Dependency Notes

- **Export requires the `COLLECTIONS` declaration:** already established as a Key Decision in
  PROJECT.md. The format research here doesn't change that dependency, it explains why skipping it
  (hand-writing the export instead) recreates the exact multi-place-schema problem the milestone
  exists to close.
- **The `sleep` collection is F1's acceptance test, not an independent feature:** its value is proving
  the declaration works for a real, new, list-shaped, soft-deletable collection — this research
  confirms the chosen shape is also domain-correct, which means the acceptance test isn't secretly
  testing a bad schema.
- **Sleep enhances the export, not the other way round:** once both exist, sleep's entire analytical
  payoff (correlating with training and weight) happens through the export in a Claude Desktop
  conversation, not through any in-app feature — which is the direct argument against the in-app
  charts anti-feature above.
- **Windowing conflicts with the "everything derives from one declaration" principle** as currently
  scoped, because aggregation rules are inherently per-collection. It's listed as a differentiator,
  not table stakes, specifically because building it now would require the same kind of bespoke,
  per-collection logic F1 is trying to eliminate — better to defer until actual data volume forces
  the question, at which point it can be designed on its own terms rather than jammed into the F1
  pattern.

## MVP Definition

### Launch With (v1)

- [ ] Export: flat Markdown table per list-shaped collection, one row per atomic observation — the export is not useful without this
- [ ] Export: live rows only, ids and `deletedAt` stripped — otherwise it's the same noisy file it replaces
- [ ] Export: ISO dates, units in headers, consistent missing-value marker — otherwise ambiguity re-enters exactly where the current export is fine (raw values are at least unambiguous types)
- [ ] Export: short header block — cheap, and directly requested via the "eyeballable" rationale
- [ ] Export: derived from `COLLECTIONS` — this is the architectural point, not an add-on
- [ ] Sleep: `{ id, date, hours, quality, note }`, soft-deletable, sorted by date — the decided schema, confirmed by this research
- [ ] Sleep: quality stored as integer 1–5 with labeled UI — matches validated instrument convention and keeps the export column clean

### Add After Validation (v1.x)

- [ ] Windowing/aggregation in the export — only once row counts approach a range where a model plausibly starts sampling rather than reading every row (rule of thumb from the research: roughly the high hundreds to low thousands of rows in a single table; this app is nowhere near that after 47 days)

### Future Consideration (v2+)

- Nothing else is recommended. The anti-features table above is the substantive output of this
  research: the correct answer to "what else could sleep or the export grow into" is, deliberately,
  "nothing" — nothing here should be revisited without new evidence of actual need, the same standard
  applied to every item already in PROJECT.md's Out of Scope list.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|----------------------|----------|
| Export: flat tables, stripped ids/deletedAt, derived from `COLLECTIONS` | HIGH | MEDIUM | P1 |
| Export: header block, ISO dates, units, missing-value convention | HIGH | LOW | P1 |
| Sleep: `{ date, hours, quality, note }` list collection | HIGH | LOW | P1 |
| Sleep: numeric 1–5 quality with labeled UI | MEDIUM | LOW | P1 |
| Export windowing/aggregation | LOW (today) / MEDIUM (later) | HIGH | P3 |
| In-app sleep correlation charts | LOW | HIGH | Do not build |
| Sleep stages / sensor fields | LOW (no device) | N/A | Do not build |
| Structured sleep-disruption tag picker | LOW | MEDIUM | Do not build |

**Priority key:**
- P1: Must have for this milestone
- P3: Nice to have, future consideration, only if data volume actually forces it
- "Do not build": anti-feature, see table above for reasoning

## Sources

- [Which Table Format Do LLMs Understand Best? (11-format benchmark)](https://www.improvingagents.com/blog/best-input-data-format-for-llms/) — MEDIUM confidence (independent benchmark, corroborated by community discussion)
- [Discussion of the above benchmark](https://news.ycombinator.com/item?id=45458455) — MEDIUM confidence (practitioner cross-check)
- [Data in CSV Format Isn't Always the Best for LLMs](https://www.anup.io/data-in-csv-format-isnt-always-the-best-for-llms/) — MEDIUM confidence
- [Markdown: A Smarter Choice for Embeddings Than JSON or XML](https://medium.com/@kanishk.khatter/markdown-a-smarter-choice-for-embeddings-than-json-or-xml-70791ece24df) — LOW-MEDIUM confidence (blog, directionally consistent with the benchmark above)
- [The Context Format Decision Most Teams Make Accidentally: JSON vs Markdown vs Plain Text](https://tianpan.co/blog/2026-05-07-context-format-decision-agent-reasoning-json-markdown-plain-text) — MEDIUM confidence
- [The Consensus Sleep Diary: Standardizing Prospective Sleep Self-Monitoring (PubMed)](https://pubmed.ncbi.nlm.nih.gov/22294820/) — HIGH confidence (peer-reviewed, standardized research instrument)
- [Consensus Sleep Diary PDF](https://drcolleencarney.com/wp-content/uploads/2013/05/CSD.pdf) — HIGH confidence (primary instrument document)
- [Pittsburgh Sleep Quality Index (PSQI)](https://www.med.upenn.edu/cbti/assets/user-content/documents/Pittsburgh%20Sleep%20Quality%20Index%20(PSQI).pdf) — HIGH confidence (validated clinical instrument)
- [Content validity of a sleep numerical rating scale and sleep diary (PMC)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7683746/) — HIGH confidence (peer-reviewed)
- `C:/Users/idbac/Projects/ppl-tracker/.planning/PROJECT.md` — project constraints and already-decided schemas
- `C:/Users/idbac/Projects/ppl-tracker/.planning/codebase/ARCHITECTURE.md` — existing collection/view patterns this research must stay consistent with

---
*Feature research for: personal-tracker LLM export + manual sleep log*
*Researched: 2026-09-10*
