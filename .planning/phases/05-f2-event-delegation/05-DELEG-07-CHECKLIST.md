# DELEG-07: the Log tab on your phone

Every button, box and switch in the app was rewired in Phase 5. They should all behave exactly as
before. This list covers a real workout on your phone, against the deployed build. Tick each line as
it works. If a line fails, keep going and write it down (see the end).

Run it after the Phase 5 PR is merged and GitHub Pages has published.

## 1. Pre-flight: is this the new build?

- [ ] Open Settings → **This version**. It shows the new build's date and short code from the merge.
- [ ] Still the old one? Open the site once with `/?v=fresh` added to the address, or wait about
      10 minutes and reopen the app. Don't start until it shows the new build.

## 2. Start

- [ ] Train → Log. Tap a program's name to open its preview, then tap it again to close it.
- [ ] Open a "How this program works" section, then close it.
- [ ] Tap **Start** on today's workout. The workout opens.

## 3. Log sets

- [ ] Type a weight in the first set. The badge and the plate text change while you type.
- [ ] Leave the weight box. The same weight fills the empty sets below.
- [ ] Type reps. Leave the box. The rest stopwatch starts.

## 4. Stopwatch

- [ ] Keyboard up (tap in a reps box first): tap play/pause. The keyboard stays up.
- [ ] Keyboard down: tap play/pause. The keyboard stays down.
- [ ] Tap **Clear**. The time goes back to 0:00.

## 5. Skip and unskip

- [ ] Tap skip on set 2. The prompt says "set 2" (not "set 12" or "set 21").
- [ ] Tap **Undo**. The set comes back.

## 6. Add and remove

- [ ] Tap **+ Add set**. A new empty set appears.
- [ ] Tap × on it. It goes away.

## 7. Warm-up

- [ ] On the first exercise, tap **Warm-up ramp**. The ramp shows. Tap it again. It hides.

## 8. Collapse

- [ ] Tap the caret on an exercise. It shrinks to one line.
- [ ] Tap that line. The exercise opens again.

## 9. Swap

- [ ] Pick another exercise from the dropdown. The name changes.
- [ ] Pick **+ Custom…**, then cancel. The prompt appeared once, not twice.

## 10. Notes

- [ ] Type an exercise note and a session note.
- [ ] Switch to another tab and back. Both notes are still there.

## 11. Extras

- [ ] Open the Warm-up and Cool-down sections at the top and bottom, then close them.
- [ ] Open an accessory (Abs, Forearms or Dead hang). Pick an exercise from its dropdown.
- [ ] Log reps (and a weight, where it has a weight box). Leaving the weight box fills the sets below.
- [ ] Add a set and remove one.

## 12. Stairs

- [ ] Type the level, minutes and seconds.
- [ ] Tap **skip stair stepper**, type a reason, then tap **Undo**.

## 13. Finish & save

- [ ] Tap **Finish & save workout**.
- [ ] The session shows in History.
- [ ] Sync shows it pushed (Settings → Cloud Sync).

## 14. Date and duration

- [ ] History → **Add a past workout**. Pick a workout.
- [ ] Set the date and the minutes.
- [ ] Tap **Discard** and confirm. (Keep it only if you really meant to log it.)

## 15. Regression sweep

- [ ] The tab bar and every sub-tab open.
- [ ] Today: type a weigh-in and press Enter. One weigh-in is logged, not two.
- [ ] Today: type a to-do and press Enter. One to-do is added.
- [ ] Care → Lawn: type a place in the location search and press Enter. It searches.

## What to report

For any line that failed:

- what you tapped,
- what you expected,
- what happened instead.

A screenshot helps. "Nothing happened" is useful too: it usually means a button lost its wiring.
