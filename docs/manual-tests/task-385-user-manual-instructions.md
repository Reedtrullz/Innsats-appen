# Task 385 user-run checklist: iPhone Safari manual observations

These are the remaining checks I need from a **physical iPhone in Safari**. They are deliberately written so they can be run without Web Inspector, Terminal, or any developer tooling.

## Goal

Close the remaining non-automatable parts of Task 385:

- manual keyboard behavior
- Safari toolbar back/forward behavior
- physical rotation/orientation/safe-area behavior
- physical iPhone re-check of the `/kart` marker/drawing action-row fix
- optional: home-screen/standalone launch note, if you want Task 385 to include it instead of leaving it for Task 387
- optional but useful: quick Airplane Mode re-check on the current deployed SHA

## Test target

- URL: `https://innsats.reidar.tech`
- Expected deployed SHA at time of writing: `f27941907861db4d6d6696b3741bea76b101e589`
- Device: physical iPhone Safari. Chromium/mobile emulation is not accepted for this evidence.

If `/api/health` shows a different SHA, do **not** treat that as a blocker. Record the observed SHA in the result template and continue.

## Privacy rules

Use only sanitized exercise data. Do **not** enter or capture:

- names, initials, phone numbers, IDs, or other persondata
- patientdata
- private addresses or skjermede locations
- real Nødnett groups, samband tables, or operational plans
- real incident or resource positions

Suggested safe test strings:

- Mission title: `Manuell Safari test 2026-06-07`
- Location: `Øvelse`
- Map marker: `KO manuell`
- Search query: `tilfluktsrom`

## Evidence to send back

A screenshot is useful for each section below, but short notes are enough if screenshots are awkward. Please send back:

1. iPhone model, iOS version, and Safari/browser version if visible.
2. Observed SHA from `https://innsats.reidar.tech/api/health`.
3. Pass/fail/notes for each checklist section.
4. Any screenshots or screen recordings, with only sanitized test data visible.
5. A privacy confirmation: “No persondata/patientdata/private locations/sensitive samband captured.”

## 0. Start and SHA check

1. Open Safari on the iPhone.
2. Open `https://innsats.reidar.tech/api/health`.
3. Record the `version` value.
4. Go back to `https://innsats.reidar.tech`.

Expected:

- `/api/health` loads JSON.
- `status` is `healthy`.
- `version` is ideally `f27941907861db4d6d6696b3741bea76b101e589`, or otherwise recorded exactly.

Evidence to capture:

- Screenshot or note of the health JSON.

## 1. Keyboard behavior

### 1A — Search keyboard

1. Open `/hurtigkort` from the app or by entering `https://innsats.reidar.tech/hurtigkort`.
2. Tap the local search field.
3. Type `tilfluktsrom`.
4. Keep the keyboard open for a moment.
5. Dismiss the keyboard using the iPhone keyboard dismiss gesture/button or by tapping outside the field.

Expected:

- The keyboard appears normally.
- The search field stays visible or scrolls into view while typing.
- Search results remain reachable; they are not hidden behind the keyboard.
- No page-level horizontal scrolling appears.
- No blank page or crash.

Record:

- Pass/fail.
- If fail: what got hidden or clipped, and whether rotating/dismissing fixed it.

### 1B — Mission form keyboard

1. Open `/oppdrag/ny`.
2. Tap `Tittel` and enter `Manuell Safari test 2026-06-07`.
3. Select any safe role/phase/scenario values.
4. Tap `Sted/lokasjon` and enter `Øvelse`.
5. With the keyboard open, try scrolling to the `Lagre oppdrag` button.
6. Tap `Lagre oppdrag`.

Expected:

- Active input fields stay visible while typing or can be brought into view by normal scroll.
- The save button is reachable; it is not permanently covered by the keyboard or Safari toolbar.
- The mission saves and appears on `/oppdrag`.

Record:

- Pass/fail.
- Any field/button hidden by keyboard or toolbar.

## 2. Safari toolbar back/forward behavior

Run this with the normal Safari toolbar visible.

1. From the home page, tap app navigation to `/hurtigkort`.
2. Open the `Klargjør offentlig tilfluktsrom` card.
3. Use Safari’s toolbar Back button.
4. Use Safari’s toolbar Forward button.
5. Navigate to `/oppdrag`, then to `/kart`.
6. Use Safari toolbar Back and Forward again between those pages.

Expected:

- Back/forward returns to the expected previous/next page.
- Pages render with a visible heading, not a blank shell.
- The saved mission remains visible after navigation.
- No local data disappears unexpectedly.

Record:

- Pass/fail.
- Any page that renders blank, wrong, or loses local state.

## 3. Orientation and safe-area checks

Run this in both portrait and landscape. If rotation lock is enabled, disable it temporarily.

Check these pages:

- `/`
- `/hurtigkort` after typing `tilfluktsrom`
- `/oppdrag` with the saved mission visible
- `/kart`

For each page:

1. Hold the phone in portrait.
2. Rotate to landscape.
3. Rotate back to portrait.
4. Scroll a little at top and bottom of the page.

Expected:

- The main heading/content is not hidden under the notch/Dynamic Island/status bar.
- Important buttons are not hidden behind the bottom home indicator or Safari toolbar.
- No page-level horizontal scrolling.
- No obvious clipped cards, buttons, or text.
- The page recovers cleanly after rotating back to portrait.

Record:

- Pass/fail for each page.
- If fail: page, orientation, what is clipped/hidden, and screenshot if possible.

## 4. `/kart` action-row physical iPhone re-check

This specifically checks the fix deployed in SHA `f27941907861db4d6d6696b3741bea76b101e589`.

Prerequisite: an active local mission exists from section 1B.

1. Open `/kart`.
2. In `Markørtype`, select `IL-KO`.
3. In the marker label field, enter `KO manuell`.
4. Set `X 0-100` to `42`.
5. Set `Y 0-100` to `58`.
6. Tap `Legg til lokal markør`.
7. Find the marker row in the marker list.
8. Confirm these marker buttons are visible and tappable in portrait:
   - `Logg herfra KO manuell`
   - `Rediger KO manuell`
   - `Slett KO manuell`
9. Rotate to landscape and confirm the same buttons are still visible/tappable.
10. Tap `Lagre lokal tegning/sektor`.
11. Confirm the drawing/sector row also shows visible/tappable `Logg herfra`, `Rediger`, and `Slett` buttons.

Expected:

- The action buttons wrap/stack instead of clipping off the right side.
- The `Slett` button is visible; this was the previous physical iPhone issue.
- No horizontal page scrolling is needed to reach the buttons.

Record:

- Pass/fail.
- Screenshot of the marker action row in portrait is the most useful evidence.

## 5. Optional: home-screen / standalone launch

If you want to include this now, run it. If not, explicitly write: `Not tested — keep install-to-home-screen under Task 387`.

1. In Safari, open `https://innsats.reidar.tech`.
2. Tap Share.
3. Tap `Add to Home Screen` / `Legg til på Hjem-skjerm`.
4. Launch the new home-screen icon.
5. Check whether it opens as standalone app-like UI or normal Safari.
6. Visit `/`, `/hurtigkort`, `/oppdrag`, `/kart`, and `/data-pa-enheten` from the launched icon.

Expected if tested:

- The app launches from the icon.
- The app shell renders.
- Key routes remain reachable.
- If it opens in normal Safari rather than standalone, record that honestly.

Record:

- Pass/fail or owner-accepted caveat.
- Screenshot of launched app/home-screen icon if possible.

## 6. Optional: quick Airplane Mode re-check on the current SHA

We already have hardware Airplane Mode evidence from the previous deployed SHA. This optional check repeats the most important offline sanity path after the current deployed release.

1. While online, load `/`, `/oppdrag`, `/kart`, `/hurtigkort`, and `/offline` once.
2. Turn on Airplane Mode.
3. Confirm Wi-Fi and cellular are disconnected.
4. Reload `/oppdrag`.
5. Reload `/kart`.
6. Open `/hurtigkort` and search `tilfluktsrom`.
7. Open `/offline`.
8. Turn Airplane Mode off again when finished.

Expected:

- `/oppdrag` shows the local mission.
- `/kart` shows the local marker.
- `/hurtigkort` local search works.
- `/offline` shows `Beredskapsboka er frakoblet`.
- If any route fails offline, record exactly which route and what Safari showed.

## Copy/paste result template

```md
# Task 385 iPhone Safari user-run result

- Tester role/team alias or device-lab run ID:
- Date/time:
- URL tested: https://innsats.reidar.tech
- Observed `/api/health.version`:
- iPhone model:
- iOS version:
- Safari/browser version if known:
- Network used before offline tests: Wi-Fi / cellular / both:
- Browser-local data cleared after test: yes/no:
- Privacy confirmation: no persondata, patientdata, real Nødnett groups, private addresses, skjermede positions, sensitive samband or official operational plans were captured.

## Results

| Section | Result | Notes / screenshot names |
| --- | --- | --- |
| 0. SHA check | pass/fail | |
| 1A. `/hurtigkort` keyboard | pass/fail | |
| 1B. `/oppdrag/ny` keyboard/form save | pass/fail | |
| 2. Safari toolbar back/forward | pass/fail | |
| 3. Orientation/safe-area `/` | pass/fail | |
| 3. Orientation/safe-area `/hurtigkort` | pass/fail | |
| 3. Orientation/safe-area `/oppdrag` | pass/fail | |
| 3. Orientation/safe-area `/kart` | pass/fail | |
| 4. `/kart` action-row re-check | pass/fail | |
| 5. Home-screen/standalone launch | pass/fail/not tested; keep Task 387 | |
| 6. Airplane Mode current-SHA re-check | pass/fail/not tested | |

## Defects found

1. None / describe issue:
   - Page:
   - Orientation/network:
   - Steps:
   - Expected:
   - Actual:
   - Screenshot/video:
```

## Minimum evidence if time is short

If you only have 10–15 minutes, prioritize:

1. SHA check.
2. `/hurtigkort` keyboard.
3. `/oppdrag/ny` keyboard/save.
4. Safari toolbar back/forward between `/hurtigkort`, card detail, `/oppdrag`, and `/kart`.
5. `/kart` action-row re-check in portrait.
6. One rotate portrait → landscape → portrait check on `/kart`.

Send the filled result template back in chat and I can turn it into the formal Task 385 evidence entry.
