# Forfeit Duels (/duel/)

## What it is
Head-to-head version of the daily river race. Two names, one forfeit picked from a
library of 12, DUEL button races just the two of you on today's deterministic river
(`E.dailyResult(dateKey, [nameA, nameB], 0)` — fieldSize 0, no roster). Loser gets
served a canvas-rendered "Official Forfeit Summons" card (legal-document parody,
dark navy + yellow double border, GUILTY OF LOSING / sentence / SO ORDERED / red
SERVED stamp). Card is downloadable as PNG. A "Copy challenge link" button produces
`?vs=NameA~NameB&f=forfeitId` — anyone opening that link today gets names and forfeit
pre-filled and, because the race is deterministic, replays the identical result.

## Files (all inside `/duel/`, nothing touched outside this directory)
- `index.html` — setup screen (names + forfeit grid), race screen (canvas), results
  screen (verdict + summons card + rematch + premium teaser).
- `css/duel.css` — overrides on top of the shared `/css/style.css` dark-water theme.
- `js/duel.js` — all logic: forfeit library, setup validation, challenge-link
  parsing, race animation (reuses the engine's step/course model, camera follows
  the leader), results computation, canvas card renderer, localStorage win/loss
  record, UTC-midnight rematch countdown. No inline `<script>` JS anywhere.

## How to test
```
cd /Users/defimagic/Desktop/Hive/Ventures/builds/duck_racing_league/spine/public
python3 -m http.server 8934
# browse http://localhost:8934/duel/
```
Headless check: `node --check js/duel.js` (passes). Engine determinism for the
2-racer case verified via `node -e` against `../js/engine.js` — same day + same two
names always produces the same order/time, and name order in the input array
doesn't change either racer's individual result.

Browser-tested end-to-end via Playwright: enter names → pick forfeit → DUEL →
animated race → Skip → results render (verdict, summons card with real drawn
pixels, Save card triggers a PNG download, Copy challenge link puts the right
`?vs=…&f=…` URL on the clipboard) → rematch countdown ticks toward next 00:00 UTC.
Also verified loading `?vs=Dan~Sam&f=l-card` directly pre-fills both names and the
forfeit and shows the "Challenge received" note.

One real bug was caught and fixed during testing: the fast-forward paths (`Skip`,
and the natural finish inside `tick()`) called `E.step()` in a loop but never
`E.runRace()`, so `race.results` stayed undefined and the results screen crashed.
Both paths now call `E.runRace(duel.race)` before finishing.

## Caveats
- The "Custom forfeit cards + duel history" premium panel is a static preview —
  button is disabled and labeled "Preview — payments arm at launch", no checkout.
- Win/loss record is tracked in `localStorage` per browser only, keyed to whatever
  name is typed in the "You" field (or the first name in a challenge link) — there's
  no account system, matching the main game's "career lives on your device" model.
- Rematch is a countdown to the next UTC day; clicking "Rematch" once unlocked just
  reloads the page (a fresh visit next day already gets a new river automatically).
- Forfeits are honor-system only — the card is a receipt, not an enforcement
  mechanism, by design (no money, no accounts, nothing to adjudicate server-side).
