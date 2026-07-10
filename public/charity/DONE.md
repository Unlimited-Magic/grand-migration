# Fundraiser Generator (/charity/)

Self-serve demo: paste a donor list, brand it, get a live duck race + per-donor result cards. No signup, no payment, everything runs client-side against the shared `GMEngine`.

## Files
- `index.html` — page structure (setup form → live race preview → results/cards → pricing → contact)
- `charity.css` — overrides on top of `/css/style.css` (form fields, tier toggle, branded scope via `--brand` CSS var, pricing cards)
- `charity.js` — all logic: donor parsing, race build/animation (mirrors `js/app.js`'s tick/draw loop but recolors ducks to the org's brand color), results table, card canvas rendering, downloads, mailto CTAs

## How it works
- Donor names are parsed from the textarea (newline- or comma-separated), deduped case-insensitively, normalized via `E.normName`.
- Race uses `E.dailyResult(E.todayKey(), donors, 0)` / `E.makeRace(day, donors, 0)` — **fieldSize=0**, so the field is exactly the pasted donors, no filler names. Same day + same list = same result everywhere, which the UI explains up front.
- **FREE tier**: caps the field at 50 donors, keeps a "Powered by Grand Migration" line on the race and on cards. **EVENT ($199) tier**: no cap (soft safety ceiling at 500 to protect the browser), branding line removed. Both are just a client-side toggle in this demo — there's no real gate, since the page itself is the demo of the product.
- Sample donor card and single-card PNG download are fully functional (real `canvas.toDataURL` + anchor download) — this is the free showcase feature.
- "Download full card pack" (bulk, all donors) and the EVENT pricing CTA are the actual purchase-adjacent actions — both open a prefilled `mailto:dan.cohen@defimagic.io`, honestly labeled "Preview — payments arm at launch." No fake checkout anywhere.
- Sidebar/`<details>` at the top states the honest model: donations happen on the org's own page/rail, we never touch entry money.

## Test
```
cd /Users/defimagic/Desktop/Hive/Ventures/builds/duck_racing_league/spine/public
python3 -m http.server 8934
# browse http://localhost:8934/charity/
```
Headless engine sanity check:
```
node -e "const E=require('./js/engine.js'); console.log(E.dailyResult(E.todayKey(), ['A','B','C'], 0).results)"
```
`node --check charity.js` passes.

Verified end-to-end in a real (Playwright-driven) browser: form → load 60 sample donors → tier toggle → generate → live canvas race animates and finishes → skip → results table (50 rows capped correctly on FREE tier, overflow note shown for the other 10) → donor card dropdown re-renders canvas per donor → PNG download works → pricing/contact panels render, mailto link correct. Zero console errors, zero failed requests.

## Caveats
- Goal amount is display-only (shown in the header as text, no progress bar animated with fake numbers) — deliberately not faking a donation total, per the "never touch entry money" promise.
- FREE/EVENT toggle is a demo convenience, not a real paywall; actual monetization would need a backend gate, which is explicitly out of scope for this static demo per the "no server, no payments" build rule.
- Hard safety cap of 500 donors even in EVENT preview, to keep the canvas animation smooth in-browser; not mentioned as a real product limit.
