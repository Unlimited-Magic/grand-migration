# Paste-a-Race — DONE

## What I built

`/paste/` — paste any list of names (classmates, coworkers, fantasy league, wedding tables) and race
**only those names** down today's Grand Migration river (`fieldSize: 0`, no filler roster).

Files (all inside this directory, nothing touched outside it):
- `index.html` — enter/race/results views, links `/css/style.css` (shared) + `paste.css` (overrides), loads `/js/engine.js` then `paste.js`.
- `paste.css` — overrides only; inherits the dark-water palette/vars from the shared stylesheet.
- `paste.js` — all logic, plain script (no build step, no template-literal HTML `<script>`).

### Flow
1. **Paste** — big textarea, one name per line or comma-separated. Live counter parses + dedupes
   (case-insensitive) and caps at 200, with a warning if the pasted list is longer.
2. **RACE** — `E.dailyResult(dateKey, names, 0)` computes the authoritative, deterministic result
   instantly; a second `E.makeRace` + `E.step` loop drives the live canvas animation (leader-cam,
   ticker lines, minimap, deterministic per-name hue so racers are visually distinct in a big field).
   Animation auto-finishes once the top ~10 have crossed (so a 200-name list doesn't sit waiting on
   a straggler) — the results table always reflects the full, already-computed authoritative result,
   not just who's finished animating.
3. **Results** — full table: position, name, time (or DNF), distance sailed (×ratio), 🌊 Water Worked
   badge. Every row has a **card** button → downloads a 1200×630 canvas-rendered PNG (position, name,
   beat X%, date, site host/path — no hardcoded external domain, so it stays correct if the deploy
   host changes).
4. **Share** — `Share this race` / `Copy link` encode the current name list + date into `?n=...&d=...`
   (names joined with `~`, URL-encoded via `URLSearchParams`). If embedding the full list would push
   the URL past ~1900 chars, it trims from the end and shows a visible warning that the link only
   carries the first N of the raced names (the race itself still used the full list — only the
   *shareable link* is capped).
5. **`?d=YYYY-MM-DD`** reruns any list against a past river (same names → same result, replay-labeled).
   **`?n=...&d=...`** (from a shared link) pre-fills the textarea and auto-plays the race on load.
6. **Race Night Pro** teaser panel — "$9.99/event, your logo on every card, up to 2,000 names" — button
   is disabled and labeled "Preview — payments arm at launch", no fake checkout.

F2P: races are unlimited, no account, no gate.

## How to test

```bash
cd /Users/defimagic/Desktop/Hive/Ventures/builds/duck_racing_league/spine/public
python3 -m http.server 8934
# then browse http://localhost:8934/paste/
```

- Paste a handful of names (or a big pasted CSV-ish blob with commas/newlines mixed) → RACE → watch
  the live animation → check the results table + a card download.
- Reload with `?d=2026-01-01` to confirm a past date replays deterministically.
- Race the same list twice (rewatch / fresh reload) and confirm the finish order is identical — that's
  the core product magic.
- Use Share → Copy link, then open that URL in a new tab and confirm it reproduces the same list,
  date, and (once you hit RACE — or the auto-race on load if `?n=` was in the URL) the same result.
- Headless logic check (used during build, no DOM needed):
  ```bash
  node -e '
  const E = require("../js/engine.js");
  const names = ["Alex Chen","Priya Patel","Jordan Smith"];
  const d1 = E.dailyResult("2026-07-10", names, 0);
  const d2 = E.dailyResult("2026-07-10", names, 0);
  console.log(JSON.stringify(d1.results.map(r=>r.name)) === JSON.stringify(d2.results.map(r=>r.name)));
  '
  ```
- `node --check paste.js` passes (plain script, no inline template-literal JS anywhere).

## Caveats

- Names containing `~` have that character stripped during parsing (it's the URL-share delimiter);
  everything else `E.normName` already handles (trim, collapse whitespace, 28-char cap).
- With very large lists (150–200 names) the live canvas animation is intentionally allowed to end
  early once the leaders finish — this is a UX choice (nobody wants to wait for straggler #187 to
  drift into a DNF), not a data bug; the results table is always the full authoritative set.
- Card PNG branding line uses `location.host + location.pathname` rather than a hardcoded domain, so
  it stays accurate under any custom domain the spine is deployed to (currently
  `migration.defimagic.io`, per the repo README).
- No backend/global-layer integration (unlike the main game's `/api` claim/standings) — this concept
  is deliberately self-contained and local-only, per the brief.
