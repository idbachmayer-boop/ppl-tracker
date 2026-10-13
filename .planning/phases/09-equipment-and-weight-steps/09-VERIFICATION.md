---
phase: 09-equipment-and-weight-steps
verified: 2026-10-12T21:00:00Z
status: passed
score: 5/5 roadmap success criteria verified by automated evidence; 56/58 plan truths verified, 2 backstop truths await the phone UAT
behavior_unverified: 0
overrides_applied: 0
human_verification:

  - test: "On Ian's phone, with Settings → This version ending in 8a20832 on BOTH the phone and the PC, open the PUSH workout with DB lateral raise and look at the card before logging."
    expected: "A muted 'dumbbell · +2.5' under the exercise select. Any ⬆ Add weight number is last time + 2.5 (or the next rack weight from 60 up)."
    why_human: "Real device, real stored data after migration 19 ran on Ian's actual blob; the suite uses fixtures."

  - test: "Open the PULL workout with Preacher curl, type 35 as the working weight."
    expected: "'🏋️ Per side: 1×5' under the sets. At 25 or less, no plate line."
    why_human: "Rendered on the phone against Ian's real registry row."

  - test: "Open Settings → Exercises."
    expected: "Every logged exercise listed with an equipment dropdown under its name, already set: Preacher curl = EZ bar, Rear delt fly = dumbbell, Leg press = machine, Lunges = bodyweight."
    why_human: "Depends on the migrated stored blob on Ian's devices."

  - test: "On the PC, change one exercise's type, wait for 'Synced', then reopen Settings → Exercises on the phone. Change it back on either device."
    expected: "The phone shows the PC's new type after sync, and the revert shows on both."
    why_human: "Real Firestore runTransaction and the live listener between two signed-in devices. The suite drives the same mergeDB path through a mocked transaction only."

  - test: "Mid-workout, '+ Custom…' with a name the app has never seen; look at the card, tap one type; Discard the draft if it was only a test."
    expected: "A box asks 'What equipment is “…”?' with six buttons, one highlighted. After the tap the box goes and the tag shows the choice."
    why_human: "Touch interaction on the installed PWA."

  - test: "Layout backstop at about 380px on Ian's Android PWA."
    expected: "Picker is 3 × 2 with every button at least 44px tall and the guess highlighted; the tag is legible under the select; Settings rows stack the dropdown under the name, never beside Rename."
    why_human: "Visual layout on the physical device (09-05 truth with verification: backstop)."

  - test: "Do the workout as usual and finish it."
    expected: "It saves normally, and Settings shows no sync error on either device."
    why_human: "End-to-end on the real device with the schema-19 cloud doc."
---

# Phase 9: Equipment and Weight Steps Verification Report

**Phase Goal:** Every exercise knows its equipment, so suggestions, deloads, warm-ups and plate math move in steps Ian can actually load (2.5 lb for dumbbells, 5 lb for everything else, as amended by EQUIP-04/D-08), and a deload always makes the weight lighter.
**Verified:** 2026-10-12
**Status:** human_needed
**Re-verification:** No. This is the initial verification.

## Evidence run in this verification

| Command | Result |
|---------|--------|
| `npm test` (run once, on HEAD 957329b) | `1136 passed, 0 failed, 2 skipped`, exit 0. The two skips need the git-ignored `test/local/real-db-snapshot.json`, which predates this phase. |
| `npm run csp:check` | `CSP hash OK sha256-c21XVzCcRwMep642eFzbjNWAsgtThZ09OcXShNXTUM8=` |
| Signed-out GET of the live `index.html` | Stamp `2026-10-12T18:58:25Z 8a20832`; `const SCHEMA = 19;` present; 6 phase functions present; `scripts/csp-hash.js --check` exit 0 on the live bytes. `diff` against HEAD's `index.html` differs only in the stamp line, so what was verified here is what is live. |
| Independent export cross-check (script in scratchpad, export read-only, nothing copied) | All 38 exercise names in Ian's 2026-10-10 export have their own row in `EQUIP_DEFAULTS`, and each maps to the type locked in D-01, D-02, D-03 and D-06. The 39th value, `(skipped)`, is the skipped-day marker, not an exercise. |

## Goal Achievement

### Roadmap Success Criteria (the contract)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Settings → Exercises shows each exercise's one type. Ian can change it there, and the change shows on his other device after sync (EQUIP-01, EQUIP-03). | ✓ VERIFIED (real devices pending UAT) | `exercisesCardHTML` (index.html:2964-2992) renders one `<select data-action="setExEquip">` per row with a registry row, `cur` from the row's valid `equip` else `equipGuess`, labels from `EQUIP_LABEL`, values through `esc()`. `ACTIONS.setExEquip` (5306) calls `setExerciseEquip` (3009), which refuses non-enum types or unknown ids, sets `equipAt = Date.now()`, `touch()`, `save()`. `mergeDB` assigns `out.exercises = mergeExercises(r, l, localNewer)` (4741), so the registry merges per row with the `equipAt` field clock. Tests: "EQUIP-03 tracer" ×4, including "the blob written to the cloud past the newer device says dumbbell for Preacher curl" and "the same push keeps the other device's weigh-in". |
| 2 | Every existing exercise has a type defaulted from its name, and syncing with an older un-migrated device twice keeps every type (EQUIP-02). | ✓ VERIFIED | `SCHEMA = 19` (485), `19:d=>stampEquipment(d)` (644). `stampEquipment` (721) skips tombstones and already-typed rows (idempotent), sets `equip` from `equipGuess`, `equipAt` 0, `mtime` old + 1 (D-14). `if(migrationRan) save();` (5474) persists at boot. Tests: "a schema-18 device boots into schema 19, and every STORED registry row carries a valid equip, mtime old + 1 and equipAt 0", "merging the stale un-migrated device in both orders, then replaying it again, leaves every exercise's type in place", "a rename on the un-migrated device with a later mtime wins its name AND keeps a valid type, in both orders, replayed twice", idempotence, never-downgrade, empty registry. |
| 3 | Add-weight moves by the exercise's own step: dumbbell +2.5 up to 60 (+5 above), cable +2.5, barbell/EZ/machine +5. No dumbbell suggestion at 60 or under jumps a flat 5 (EQUIP-04, amended). | ✓ VERIFIED | `weightStep` (1230): bodyweight → null, kg → 2.5, dumbbell `w >= 60 ? 5 : 2.5`, cable 2.5, else 5. `addWeightInfo` (1309) returns `loadFloor + ladderStep`, so an off-ladder weight snaps to the next loadable one (WR-04); the flag (2110) and the prefill (2051) both read `newW`. Tests: DB lateral raise 25 → 27.5 with prefill, 57.5 → 60, 60 → 65, 65 → 70, cable 25 → 27.5, barbell 155 → 160, kg flat 2.5, bodyweight no number. At exactly 60 the step is +5 (60 → 65); D-08 and D-17 give that example in Ian's own words, so "at 60 lb or under" is read as "a suggestion landing at or under 60". |
| 4 | Deloads and warm-ups round to the exercise's own step, so a 15 lb dumbbell deload suggests 12.5 (EQUIP-05). | ✓ VERIFIED | `deloadExercise` (1425) uses `deloadPlan` (1270) → `loadFloor` (1241); no `round5` remains in index.html. `warmRampHTML` (2335) uses `loadNearest`, clamps to the bar and to the working weight, and writes a per-type note. Tests: "a stalled 15 lb DB lateral raise's Deload −10% fills 12.5 into every unskipped set", "15 DB → 12.5, 10 DB → 7.5, 135 BB → 120, 70 DB → 60 (0.9×70 float drift), 65 DB → 57.5", and the D-12 warm-up checks for DB, cable, machine, barbell and kg. |
| 5 | Plate math follows the type, and Preacher curl, as an EZ bar exercise, shows plate math against a 25 lb bar (EQUIP-06). | ✓ VERIFIED | `barStyle` (1130) branches on `equipOf`: ez → 'ez' (bar 25), barbell → straight or landmine, machine → sled only for `BAR_FOR` sled names, others → null. `platesText`'s EZ branch is silent at or under the bar or when the plates can't make the total. Tests: "Preacher curl is an EZ-bar lift — barStyle ez, a 25 lb bar", "the Preacher curl card last logged at 35 shows 'Per side: 1×5'", and "changing Preacher curl to dumbbell in Settings removes its plate line, and changing it back to EZ bar restores it". |

The goal clause "a deload always makes the weight lighter" holds wherever a lighter loadable weight exists. `loadFloor(0.9 × lastW)` is strictly below `lastW`, and the bar clamp only lifts it to a bar that is itself lighter. There are two documented exceptions, and in both nothing lighter can be loaded: the empty bar (D-15, "Already at the empty bar — cut a set or reps instead.") and the lightest step (WR-03, "Already at the lightest weight — cut a set or reps instead."). In both cases the card tells Ian why. Neither case writes a heavier weight.

**Score:** 5/5 roadmap success criteria verified by automated evidence (0 present-but-behaviour-unverified). The real-device confirmation is the UAT below.

### Plan must-haves

| Plan | Truths | Result | Notes |
|------|--------|--------|-------|
| 09-01 (EQUIP-01/02/04) | 13 | 13 ✓ | Default table, rule order, normalisation, prototype-safe lookup, migration 19 (mtime + 1, equipAt 0, idempotent, sessions untouched, D-03), `exEnsure` stamps `equip`, D-17 steps, kg, bodyweight. All have a named passing test (EQUIP section, lines 1089-1118 of the run). |
| 09-02 (EQUIP-01/02/03) | 12 | 12 ✓ | `mergeExercises` per-row union with the `equipAt` clock, survives a newer unrelated save, rename + choice both survive, `exMerge` tombstones, `exRow` live-only, `setExerciseEquip` refusals, `DRAFT_PUSHERS` still exactly `exPick, finishWorkout, pickEx` (app.test.js:3737). Commutativity and replays are tested. Associativity is tested for the generator's cases only; see WR-09. |
| 09-03 (EQUIP-05/06) | 11 | 9 ✓, 2 ✓ as amended | Two truths were deliberately amended after the plan by WR-02/WR-03 (09-REVIEW-FIX.md): (a) "an EZ preset bar logged at 20 stays 20" is now 20 → 15, because under the bar a lighter preset exists; (b) "at or below the bar … stays at the bar" now applies only *at* the bar, and under the bar it steps down. Both changes make the goal's "always lighter" hold in more cases, and tests assert the amended behaviour ("a 20 lb preset bar deloads to 15 (WR-02: lighter, never atBar)"). No override is needed for the roadmap contract. If you want the plan wording formally retired, see "Superseded plan wording" below. |
| 09-04 (EQUIP-01/03/04) | 16 | 16 ✓ | Picker only for names `equipKnown` can't place and that had no row (`exEnsureAsk`, 2252), `equipAsk` an in-memory `Set` never stored (T-9-27), tag via `equipTagText` built from `EQUIP_LABEL` plus a numeric step, live update in `updPlates`, hidden while the picker shows, Settings states and the hostile-name sweep. The 380px layout facts are asserted structurally (auto-fit 88px, 44px buttons). The visual result is in the UAT. |
| 09-05 (ship) | 6 | 4 ✓, 2 backstop → human | Suite and CSP green on the tip. The live bytes equal HEAD apart from the stamp, the stamp ends `8a20832`, and the live CSP check passes (re-checked here, not taken from the SUMMARY). The rollback note is in 09-05-SUMMARY. The two `verification: backstop` truths (the phone workout and the 380px layout) are human items. |

#### Superseded plan wording (optional record)

If Ian wants the two amended 09-03 truths formally accepted in this file, add:

```yaml
overrides:

  - must_have: "A deload is never heavier than the last working weight: an EZ preset bar logged at 20 stays 20"
    reason: "WR-02 (09-REVIEW-FIX): under the bar a lighter preset exists, so it steps down the type's ladder (20 → 15). Still never heavier."
    accepted_by: "Ian"
    accepted_at: "<ISO timestamp>"

  - must_have: "at or below the bar on a barbell/EZ lift the weight stays at the bar"
    reason: "WR-02: only AT the bar stays (D-15); under the bar steps down. WR-03 adds 'Already at the lightest weight' at the lightest step."
    accepted_by: "Ian"
    accepted_at: "<ISO timestamp>"
```

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `index.html` | EQUIP_TYPES/LABEL/DEFAULTS, equipGuess, equipKnown above MIGRATIONS; SCHEMA 19; stampEquipment; equipOf; weightStep; ladder helpers; deloadPlan; warmRampHTML; translateLoad by name; barStyle by type; mergeExercises; setExerciseEquip; picker, tag, Settings select | ✓ VERIFIED | All present (lines 485-5474) and substantive. The defaults block sits above `const MIGRATIONS` (601), and `equipGuess`/`stampEquipment` are hoisted `function` declarations that read only consts declared above MIGRATIONS (the TDZ rule). |
| `test/app.test.js` | EQUIP sections | ✓ VERIFIED | Three EQUIP sections plus merge, rounding, plate, WR and IN checks, all passing. |
| `test/harness.js` | exports EQUIP_TYPES, EQUIP_LABEL, EQUIP_DEFAULTS, equipAsk | ✓ VERIFIED | Lines 157-159. |
| `test/fixtures/merge-golden.json` | regenerated for SCHEMA 19 | ✓ VERIFIED | The golden and parity checks pass at SCHEMA 19. |
| `CLAUDE.md` | soft-delete rule names the exercise registry and exMerge | ✓ VERIFIED | CLAUDE.md:33-36. |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `MIGRATIONS[19]` | `stampEquipment → equipGuess → EQUIP_DEFAULTS` | `19:d=>stampEquipment(d)` (644) | ✓ WIRED |
| boot `if(migrationRan) save();` | stored blob | 5474; `migrationRan` set at 793 | ✓ WIRED (boot test reads the STORED blob) |
| `addWeightInfo` | `weightStep(eq, v.lastW)` → `equipOf` | 1316-1320 (`eq = who \|\| name`, IN-09: keyed by the entry's exId) | ✓ WIRED. The plan's literal pattern `weightStep(name, v.lastW)` was changed deliberately by IN-09. |
| prefill / flag | `aw.newW != null` | 2051, 2110 | ✓ WIRED |
| `mergeDB` | `mergeExercises` | `out.exercises = mergeExercises(r, l, localNewer)` (4741) | ✓ WIRED |
| Settings select | `setExerciseEquip` | `setExEquip: { change: … }` (5306) | ✓ WIRED |
| picker button | `setExerciseEquip` | `pickExEquip: { click: … }` (5436) | ✓ WIRED |
| `setExerciseEquip` | `equipAsk.delete(id)`, `save()` | 3016-3018 | ✓ WIRED |
| `deloadExercise` / coach line | `deloadPlan(...)` with `atBar` / `atFloor` at render | 1427, 2128-2133 | ✓ WIRED. Nothing is stored on the draft entry. |
| `barStyle` | `equipOf(name)` | 1131 | ✓ WIRED |
| suggest line | `translateLoad(best.w, best.r, rng.lo, entry)` | 2120 (the entry, not `entry.name`, IN-09) | ✓ WIRED |
| `pickEx` / `exPick` / `resolveTypedName` | `exEnsureAsk` | 2247, 2265, 3161 | ✓ WIRED |
| `updPlates` | `#equip-tag-{i}` textContent | 1210-1211, before the plate early return | ✓ WIRED |

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real data | Status |
|----------|------|--------|-----------|--------|
| Card tag | `equipTagText(entry, cardTopWeight(entry.sets))` | registry row via `equipOf` (exId first, else the name guess) plus live set weights | yes | ✓ FLOWING |
| Settings select | `cur` | `exRow(r.id).equip` validated against `EQUIP_TYPES`, else `equipGuess` | yes | ✓ FLOWING |
| ⬆ Add weight | `aw.newW` | `lastAttemptEntry` history → `loadFloor` + `ladderStep` by type | yes | ✓ FLOWING |
| Deload coach line | `dp.atBar` / `dp.atFloor` | `deloadBaseW` from history, computed at render | yes | ✓ FLOWING |

### Behavioral Spot-Checks

The full suite was run once, as the evidence for every behaviour-dependent truth (state transitions: migration on boot, merge replays, deload writes, picker answer → `equipAsk` cleared). Each transition has a named passing test, cited in the tables above. No truth stays present-but-unverified.

### Probe Execution

Step 7c: SKIPPED. There are no `scripts/*/tests/probe-*.sh`, and no phase artifact declares a probe. The `csp:check` and live-bytes checks above stand in for the ship probes.

### Requirements Coverage

| Requirement | Source plans | Description | Status | Evidence |
|-------------|--------------|-------------|--------|----------|
| EQUIP-01 | 09-01, 09-02, 09-04, 09-05 | One type per exercise, on the synced registry row | ✓ SATISFIED | `equip` on registry rows (migration, `exEnsure`, `setExerciseEquip`); `equipOf` read everywhere |
| EQUIP-02 | 09-01, 09-02, 09-05 | Defaulted by migration; SCHEMA bump, touch, persist, idempotent, never downgrade; stale replay twice | ✓ SATISFIED | SC 2 evidence |
| EQUIP-03 | 09-02, 09-04, 09-05 | Change in Settings → Exercises; syncs | ✓ SATISFIED (real-device sync → UAT) | SC 1 evidence |
| EQUIP-04 (amended 2026-10-10) | 09-01, 09-04, 09-05 | 5 lb barbell/EZ/machine; 2.5 cable; dumbbell 2.5 to 60, 5 above | ✓ SATISFIED | SC 3 evidence |
| EQUIP-05 | 09-03, 09-05 | Deloads and warm-ups round to own step; 15 DB → 12.5 | ✓ SATISFIED | SC 4 evidence |
| EQUIP-06 | 09-03, 09-05 | Plate math follows type; Preacher curl on the 25 lb EZ bar | ✓ SATISFIED | SC 5 evidence |

All six IDs are claimed by at least one plan and map to Phase 9 in REQUIREMENTS.md (lines 173-178). There are no orphaned requirements and no unknown IDs.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| index.html, test/*.js, CLAUDE.md | — | TBD / FIXME / XXX / TODO / HACK in added lines | none found | — |
| index.html | 1020-1024 | `translateLoad` can suggest a weight below the bar on a bar lift (IN-03, open) | ⚠️ Warning | Display-only "→ suggest" line. It only appears when history comes from another slot and translates under 45 lb, for example "25 lb" on Barbell bench press: a number Ian can't load on the bar. It is never prefilled. This is the one place a suggestion can still be unloadable. |
| index.html | 4607-4712 | WR-09: conflicting concurrent merges of one exercise are order-dependent | ⚠️ Warning | It needs the same exercise merged two different ways on two devices before either syncs. No set is lost, and devices converge through the cloud doc. Post-ship fix. |
| index.html | 2354 | WR-06: kg warm-up prints "Empty bar — 45 kg" | ℹ️ Info | Ian logs only in lb (D-10). He excluded this from the fixes. |
| index.html | 586-592, 1129 | IN-05: name rules misfile some plausible unseen names ("Hang clean" → bodyweight, "Straight bar curl" → landmine) | ℹ️ Info | Defaults only. The D-05 tag makes a wrong type visible and Settings fixes it. None of Ian's 38 names is affected. |
| index.html | 1135 | `BAR_FOR[n] === 'sled'` is an exact-case name match | ℹ️ Info | A card or entry whose name is spelled differently from "Leg press" or "Hack squat" (for example "Leg Press") gets no sled plate line. Ian's export uses "Leg press", so his data is unaffected. Noted for the record; not a phase regression. |
| .planning/ROADMAP.md | 39 | Phase 9 checkbox still `[ ]` while its Plans read 5/5 complete | ℹ️ Info | Bookkeeping, normally ticked when the phase closes after UAT. |

### Human Verification Required

These come from the 09-05 Task 3 `<human-check>` (end-of-phase mode) and its two `verification: backstop` truths. Judge them only on a build whose Settings → This version ends in `8a20832`, on both devices.

1. **DB lateral raise tag.** Open PUSH and look at the card before logging. Expected: "dumbbell · +2.5"; any ⬆ Add weight is + 2.5 (the next rack weight from 60 up).
2. **Preacher curl plates.** Type 35 on PULL. Expected: "🏋️ Per side: 1×5"; nothing at 25 or under.
3. **Settings → Exercises.** Expected: every logged exercise with a dropdown under its name, already set (Preacher curl EZ bar, Rear delt fly dumbbell, Leg press machine, Lunges bodyweight).
4. **Cross-device type change.** Change a type on the PC, wait for "Synced", reopen Settings on the phone. Expected: the phone shows it, and changing it back shows on both.
5. **First-time picker.** "+ Custom…" with a never-seen name. Expected: six buttons with one highlighted, and the tap stores the choice and swaps in the tag.
6. **380px layout.** Expected: the picker is 3 × 2 with buttons at least 44px tall, the tag is legible, and Settings rows stack the dropdown under the name.
7. **Finish the workout.** Expected: it saves, with no sync error on either device.

### Gaps Summary

No blocking gaps. All five roadmap success criteria and all six EQUIP requirements are present and wired in the shipped code, with passing behavioural tests. The live site runs exactly this tree. I checked the export mapping independently against Ian's real exercise list.

Status is `human_needed` because the phase's declared verification mode is a real workout on Ian's phone plus a cross-device type change. The suite exercises the merge and push paths through a mocked transaction, not two signed-in devices on real Firestore, and it cannot see the 380px layout. Two non-blocking warnings stay open for later: IN-03 (the display-only suggest line can name an under-bar weight on a bar lift) and WR-09 (merge-order dependence when the same exercise is merged two ways at once).

---

_Verified: 2026-10-12_
_Verifier: Claude (gsd-verifier)_
