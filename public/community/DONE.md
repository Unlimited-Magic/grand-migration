# Community Divisions — done

## What's built

**`index.html` + `community.css` + `community.js`** — team-vs-team race demo.
- Setup panel: two editable team-name inputs (defaults "Temple Beth El" vs "Congregation Beth Shalom"), two columns of 10 editable roster inputs each, pre-filled with sample congregant-style names. "Fill sample roster" resets to the curated defaults; "🎲 Randomize" fills a team with `E.rosterFor(seed, 10)` duck-style names for fun.
- "🐤 TEAM RACE" builds a combined 20-name roster (deduped — a repeated name across teams gets " (2)" appended so the engine doesn't drop it), scores it with `E.dailyResult(todayKey, names, 0)` (fieldSize 0 = only these 20 race, no filler field), and separately drives a live `E.makeRace` + `E.step` loop on a `requestAnimationFrame` ticker for the canvas animation — same pattern as the main game's `js/app.js`. Skip fast-forwards by calling `E.step` synchronously to completion.
- Results: winner banner (sum of `E.pointsFor` across each team's 10 members), MVP card per team (best individual finish), full 20-row standings table color-coded by team, "Copy result" (clipboard text summary) and "Save card" (1200×630 PNG built on an offscreen canvas, downloaded client-side).
- ShopToDoGood tie-in panel with the required pull-quote copy, 3 canvas-drawn livery mockups (bronze/silver/golden beak, same duck-drawing code as the race sprites), and a button labeled exactly `Unlock liveries via giving — Preview, payments arm at launch`.
- State (team names + rosters) persists to `localStorage` under `gm_community_v1` so a reload doesn't lose edits.

**`crypto.html` + `crypto.js`** — the collectible/NFT concept explainer.
- Hero + 3-step "why this is provably fair" explainer.
- Live demo: type any name, click "Compute permanent record" → pulls the last 7 days' results via `E.dailyResult` (fieldSize 400, same as the main game) computed entirely client-side, no network calls — makes the "recomputed from the name alone" claim concrete rather than just asserted.
- Mint preview: name + tier (`<select>`), button labeled `Preview — payments arm at launch`. Renders a local token-card mockup (name, deterministic serial from `E.xmur3`, mint date) with an explicit "no wallet connected, no blockchain call made" note. No chain code anywhere.
- Soulbound trophy explainer (3 example badges) and an honesty block: no wagering / no yield / no floor price promises / identity only.

## How to test

```
cd .../duck_racing_league/spine/public
python3 -m http.server 8000
# then open:
#   http://localhost:8000/community/index.html
#   http://localhost:8000/community/crypto.html
```

Headless logic check (no browser needed):
```
node -e '
const E = require("./js/engine.js");
const names = [...]; // any 20 names
const d = E.dailyResult(E.todayKey(), names, 0);
console.log(d.results.length, d.results[0]);
'
```

`node --check community.js` and `node --check crypto.js` both pass.

Verified in a real headless browser: TEAM RACE → live canvas animation → Skip → results banner with real scores (e.g. `Temple Beth El 66 — 60`) → standings table all render; crypto.html's record lookup and mint preview both produce live output; zero console errors, zero 404s on either page.

## Caveats

- The "Randomize" buttons and default sample rosters can occasionally produce two identical names across teams (e.g. if a user randomizes both teams on the same day with unlucky draws); the race-builder auto-disambiguates with a `(2)` suffix so the engine doesn't silently drop a racer, but this is a display quirk worth knowing about.
- The mint preview and giving-tier unlock are pure visual mockups per the hard rules — no payment flow, no chain calls, honestly labeled as previews.
- `../css/style.css` and `../js/engine.js` are read-only dependencies from outside this directory; nothing here modifies them.
